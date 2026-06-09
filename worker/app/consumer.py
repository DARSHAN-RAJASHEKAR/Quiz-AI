"""
RabbitMQ consumer — two queues, two roles
─────────────────────────────────────────
quiz.generation  (coordinator)
  Receives one message per quiz.

  PDF source:
    → compute_workers(pages, questions) to get N workers
    → split PDF pages into N equal groups
    → publish N messages to quiz.chunks (parallel, each has unique pages)

  Text / Topic source:
    → run a simple for loop here in the coordinator
    → save questions after each batch (SSE streams them progressively)
    → no RabbitMQ messages — sequential by nature, no fake parallelism

quiz.chunks  (chunk worker)
  Each message = one PDF section.
  If q_count ≤ 20: single AI call.
  If q_count > 20: internal for loop with context (avoid duplicates within section).
  Saves questions immediately after each batch → SSE picks them up.
  The LAST worker to finish sets status = completed.

Worker formula:
  pages ≤ 20         → 1 worker  (for loop in coordinator, same content)
  20 < pages ≤ 40    → 3 workers (~13 pages each)
  pages > 40         → min(pages // 20, MAX_WORKERS)
  + cap by questions → min(workers, questions // MIN_Q_PER_WORKER)
"""
import asyncio
import json
import math
import uuid
from datetime import datetime, timezone

import aio_pika
import structlog

from app.config import get_settings
from app.db.repositories import (
    complete_chunk,
    save_questions,
    set_chunks_total,
    update_quiz_status,
)
from app.db.session import AsyncSessionLocal
from app.extractors.pdf_extractor import extract_pdf_pages, split_pages_into_chunks
from app.extractors.text_extractor import extract_text
from app.extractors.topic_extractor import extract_topic
from app.processor import process_single_chunk

settings = get_settings()
logger   = structlog.get_logger(__name__)

# ── Topology constants ──────────────────────────────────────────────────────
EXCHANGE_NAME  = "quiz_exchange"
QUEUE_MAIN     = "quiz.generation"
QUEUE_CHUNKS   = "quiz.chunks"
DLX_NAME       = "quiz_dlx"
DLQ_NAME       = "quiz.dead"
RK_GENERATE    = "quiz.generate"
RK_CHUNK       = "quiz.chunk"
RK_DEAD        = "quiz.dead"

RETRY_DELAYS = {1: 0, 2: 5, 3: 15}

# ── Worker formula constants ────────────────────────────────────────────────
MAX_WORKERS      = 10   # hard cap on parallel PDF workers
MAX_Q_PER_CALL   = 20   # AI output token limit per single call
MIN_Q_PER_WORKER = 5    # minimum questions per worker (not worth splitting for fewer)


# ── Worker count formula ────────────────────────────────────────────────────

def compute_workers(num_pages: int, num_questions: int) -> int:
    """
    Return the number of parallel workers for a PDF quiz.

    Decision table:
      pages ≤ 20         → 1  (coordinator for loop, same content)
      20 < pages ≤ 40    → 3  (~13 pages each — enough context for quality)
      pages > 40         → pages // 20, capped at MAX_WORKERS

    Always capped so each worker has at least MIN_Q_PER_WORKER questions.
    """
    if num_pages <= 20:
        workers = 1
    elif num_pages <= 40:
        workers = 3
    else:
        workers = min(num_pages // 20, MAX_WORKERS)

    # Don't create more workers than questions allow
    workers = min(workers, max(1, num_questions // MIN_Q_PER_WORKER))
    return max(1, workers)


# ── Topology setup ──────────────────────────────────────────────────────────

async def declare_topology(channel: aio_pika.abc.AbstractChannel):
    exchange = await channel.declare_exchange(
        EXCHANGE_NAME, aio_pika.ExchangeType.DIRECT, durable=True
    )
    dlx = await channel.declare_exchange(
        DLX_NAME, aio_pika.ExchangeType.DIRECT, durable=True
    )
    dlq = await channel.declare_queue(DLQ_NAME, durable=True)
    await dlq.bind(dlx, routing_key=RK_DEAD)

    q_main = await channel.declare_queue(
        QUEUE_MAIN, durable=True,
        arguments={
            "x-dead-letter-exchange":    DLX_NAME,
            "x-dead-letter-routing-key": RK_DEAD,
            "x-message-ttl":             600_000,
        },
    )
    await q_main.bind(exchange, routing_key=RK_GENERATE)

    q_chunks = await channel.declare_queue(
        QUEUE_CHUNKS, durable=True,
        arguments={
            "x-dead-letter-exchange":    DLX_NAME,
            "x-dead-letter-routing-key": RK_DEAD,
        },
    )
    await q_chunks.bind(exchange, routing_key=RK_CHUNK)

    return q_main, q_chunks, exchange


async def _publish(exchange, routing_key: str, body: dict) -> None:
    msg = aio_pika.Message(
        body=json.dumps(body).encode(),
        content_type="application/json",
        delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
    )
    await exchange.publish(msg, routing_key=routing_key)


# ── Coordinator: handles quiz.generation messages ───────────────────────────

async def handle_quiz_message(
    message: aio_pika.abc.AbstractIncomingMessage,
    exchange: aio_pika.abc.AbstractExchange,
) -> None:
    async with message.process(requeue=False):
        try:
            body = json.loads(message.body.decode())
        except Exception as e:
            logger.error("invalid_message", error=str(e))
            return

        quiz_id_str  = body.get("quiz_id")
        attempt      = body.get("attempt", 1)
        max_attempts = body.get("max_attempts", 3)
        task         = body.get("task", {})

        if not quiz_id_str:
            logger.error("missing_quiz_id")
            return

        quiz_id       = uuid.UUID(quiz_id_str)
        source_type   = task.get("source_type")
        quiz_type     = task.get("quiz_type", "mcq")
        num_questions = task.get("num_questions", 10)
        difficulty    = task.get("difficulty", "medium")

        log = logger.bind(quiz_id=quiz_id_str, attempt=attempt)

        delay = RETRY_DELAYS.get(attempt, 15)
        if delay > 0:
            log.info("retry_backoff", delay_seconds=delay)
            await asyncio.sleep(delay)

        async with AsyncSessionLocal() as db:
            await update_quiz_status(db, quiz_id, "processing")

        log.info("coordinator_started", source=source_type, questions=num_questions)

        try:
            if source_type == "pdf":
                await _handle_pdf(
                    exchange, log, task,
                    quiz_id, quiz_id_str,
                    quiz_type, num_questions, difficulty,
                )
            else:
                await _handle_text_topic(
                    log, task,
                    quiz_id,
                    source_type, quiz_type, num_questions, difficulty,
                )

        except Exception as e:
            log.error("coordinator_failed", error=str(e), exc_info=True)
            if attempt < max_attempts:
                body["attempt"] += 1
                body["published_at"] = datetime.now(timezone.utc).isoformat()
                await _publish(exchange, RK_GENERATE, body)
            else:
                log.error("max_retries_exceeded")
                async with AsyncSessionLocal() as db:
                    await update_quiz_status(db, quiz_id, "failed", error_message=str(e))


async def _handle_pdf(
    exchange, log, task,
    quiz_id, quiz_id_str,
    quiz_type, num_questions, difficulty,
) -> None:
    """
    PDF path: split by pages, publish N parallel chunk messages.
    Each worker gets unique pages → no duplicates → true parallelism.
    """
    page_texts, num_pages = extract_pdf_pages(task["file_path"])
    n = compute_workers(num_pages, num_questions)

    log.info("pdf_analyzed", pages=num_pages, workers=n,
             pages_per_worker=round(num_pages / n, 1))

    chunks = split_pages_into_chunks(page_texts, n)
    n = len(chunks)  # actual chunk count (may differ if PDF has fewer pages than workers)

    # Distribute questions evenly; first (extras) workers get 1 extra question
    base   = num_questions // n
    extras = num_questions % n
    q_counts = [base + (1 if i < extras else 0) for i in range(n)]

    # Pre-compute global question offsets so parallel workers don't collide on numbering
    offsets = [sum(q_counts[:i]) for i in range(n)]

    async with AsyncSessionLocal() as db:
        await set_chunks_total(db, quiz_id, n)

    for idx, (chunk_text, q_count, offset) in enumerate(zip(chunks, q_counts, offsets)):
        chunk_msg = {
            "quiz_id":          quiz_id_str,
            "chunk_index":      idx,
            "chunks_total":     n,
            "chunk_text":       chunk_text,
            "q_count":          q_count,
            "question_offset":  offset,
            "quiz_type":        quiz_type,
            "is_pdf":           True,
            "is_topic":         False,
            "difficulty":       difficulty,
            "task":             task,
            "published_at":     datetime.now(timezone.utc).isoformat(),
        }
        await _publish(exchange, RK_CHUNK, chunk_msg)
        log.info("chunk_published", chunk=idx + 1, of=n,
                 q_count=q_count, offset=offset)


async def _handle_text_topic(
    log, task,
    quiz_id,
    source_type, quiz_type, num_questions, difficulty,
) -> None:
    """
    Text / Topic path: coordinator runs a simple for loop.
    No RabbitMQ messages — sequential batches with context passing.
    Saves questions after each batch so SSE streams them progressively.
    """
    if source_type == "text":
        content  = extract_text(task["source_content"])
        is_topic = False
    else:
        content  = extract_topic(task["source_content"])
        is_topic = True

    if not content.strip():
        raise ValueError("No content could be extracted")

    num_batches = math.ceil(num_questions / MAX_Q_PER_CALL)
    log.info("text_batched", batches=num_batches, source=source_type)

    async with AsyncSessionLocal() as db:
        await set_chunks_total(db, quiz_id, num_batches)

    existing_q_texts: list[str] = []
    questions_saved = 0

    for batch_idx in range(num_batches):
        batch_size = min(MAX_Q_PER_CALL, num_questions - questions_saved)

        questions = await process_single_chunk(
            chunk_text         = content,
            quiz_type          = quiz_type,
            num_questions      = batch_size,
            difficulty         = difficulty,
            chunk_index        = batch_idx,
            chunks_total       = num_batches,
            is_pdf             = False,
            is_topic           = is_topic,
            existing_questions = existing_q_texts,
        )

        async with AsyncSessionLocal() as db:
            await save_questions(db, quiz_id, questions,
                                 question_offset=questions_saved)
            await complete_chunk(db, quiz_id, num_batches)

        existing_q_texts += [q["question_text"] for q in questions]
        questions_saved  += len(questions)
        log.info("text_batch_done", batch=batch_idx + 1, of=num_batches,
                 saved=questions_saved)

    async with AsyncSessionLocal() as db:
        await update_quiz_status(db, quiz_id, "completed")

    log.info("coordinator_completed", total_questions=questions_saved)


# ── Chunk worker: handles quiz.chunks messages ──────────────────────────────

async def handle_chunk_message(
    message: aio_pika.abc.AbstractIncomingMessage,
) -> None:
    async with message.process(requeue=False):
        try:
            body = json.loads(message.body.decode())
        except Exception as e:
            logger.error("invalid_chunk_message", error=str(e))
            return

        quiz_id_str     = body.get("quiz_id")
        chunk_index     = body.get("chunk_index", 0)
        chunks_total    = body.get("chunks_total", 1)
        chunk_text      = body.get("chunk_text", "")
        q_count         = body.get("q_count", 10)
        question_offset = body.get("question_offset", 0)
        quiz_type       = body.get("quiz_type", "mcq")
        is_pdf          = body.get("is_pdf", True)
        is_topic        = body.get("is_topic", False)
        difficulty      = body.get("difficulty") or body.get("task", {}).get("difficulty", "medium")
        task            = body.get("task", {})

        quiz_id = uuid.UUID(quiz_id_str)
        num_batches = math.ceil(q_count / MAX_Q_PER_CALL)

        log = logger.bind(
            quiz_id=quiz_id_str,
            chunk=chunk_index + 1,
            of=chunks_total,
            q_count=q_count,
            batches=num_batches,
            offset=question_offset,
        )
        log.info("chunk_started")

        try:
            existing_q_texts: list[str] = []
            questions_saved_here = 0

            for batch_idx in range(num_batches):
                batch_size = min(MAX_Q_PER_CALL, q_count - questions_saved_here)

                questions = await process_single_chunk(
                    chunk_text         = chunk_text,
                    quiz_type          = quiz_type,
                    num_questions      = batch_size,
                    difficulty         = difficulty,
                    chunk_index        = chunk_index,
                    chunks_total       = chunks_total,
                    is_pdf             = is_pdf,
                    is_topic           = is_topic,
                    existing_questions = existing_q_texts,
                )

                # Global offset = pre-assigned section offset + questions saved so far in this worker
                batch_offset = question_offset + questions_saved_here
                async with AsyncSessionLocal() as db:
                    await save_questions(db, quiz_id, questions,
                                         question_offset=batch_offset)

                existing_q_texts     += [q["question_text"] for q in questions]
                questions_saved_here += len(questions)

                if num_batches > 1:
                    log.info("internal_batch_done",
                             batch=batch_idx + 1, of=num_batches,
                             saved=questions_saved_here)

            # Mark this chunk complete — if it's the last, set quiz to completed
            async with AsyncSessionLocal() as db:
                is_last = await complete_chunk(db, quiz_id, chunks_total)
                if is_last:
                    await update_quiz_status(db, quiz_id, "completed")
                    log.info("all_chunks_done", total_questions=question_offset + questions_saved_here)

            log.info("chunk_done", questions_saved=questions_saved_here)

        except Exception as e:
            log.error("chunk_failed", error=str(e), exc_info=True)
            async with AsyncSessionLocal() as db:
                await update_quiz_status(db, quiz_id, "failed", error_message=str(e))


# ── Main consumer loop ──────────────────────────────────────────────────────

async def run_consumer() -> None:
    logger.info("worker_starting", rabbitmq_url=settings.rabbitmq_url)

    while True:
        try:
            connection = await aio_pika.connect_robust(
                settings.rabbitmq_url, reconnect_interval=5
            )
            logger.info("rabbitmq_connected")

            async with connection:
                # ── Two separate channels with different QoS ───────────────
                # Main channel: prefetch=1 — coordinator handles one quiz at a time
                ch_main = await connection.channel()
                await ch_main.set_qos(prefetch_count=1)

                # Chunks channel: prefetch=MAX_WORKERS — all chunk messages
                # delivered at once so they can run as concurrent asyncio tasks
                ch_chunks = await connection.channel()
                await ch_chunks.set_qos(prefetch_count=MAX_WORKERS)

                # Declare topology on both channels
                # declare_topology returns (q_main, q_chunks, exchange)
                q_main, _, exchange = await declare_topology(ch_main)
                _, q_chunks, _      = await declare_topology(ch_chunks)
                logger.info("topology_declared")

                async def consume_main():
                    async with q_main.iterator() as it:
                        async for msg in it:
                            # Coordinator: process one quiz at a time (sequential is fine)
                            await handle_quiz_message(msg, exchange)

                async def consume_chunks():
                    async with q_chunks.iterator() as it:
                        async for msg in it:
                            # Chunk worker: fire as concurrent task — don't await!
                            # All chunk messages for a quiz run in parallel.
                            asyncio.create_task(handle_chunk_message(msg))

                await asyncio.gather(consume_main(), consume_chunks())

        except Exception as e:
            logger.error("consumer_error", error=str(e), exc_info=True)
            await asyncio.sleep(5)
