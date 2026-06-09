import uuid

import structlog

from app.ai.claude_client import generate_questions
from app.ai.prompt_builder import (
    SYSTEM_PROMPT,
    build_mcq_prompt,
    build_short_answer_prompt,
    build_true_false_prompt,
    distribute_mixed,
)
from app.ai.response_parser import merge_and_renumber, parse_claude_response
from app.extractors.pdf_extractor import extract_pdf_chunks
from app.extractors.text_extractor import extract_text
from app.extractors.topic_extractor import extract_topic

logger = structlog.get_logger(__name__)

_PROMPT_FNS = {
    "mcq":          build_mcq_prompt,
    "true_false":   build_true_false_prompt,
    "short_answer": build_short_answer_prompt,
}


async def process_quiz(task: dict, quiz_id: uuid.UUID) -> list[dict]:
    """
    Used for text/topic sources — returns all questions in one shot.
    PDF sources are handled by the coordinator + chunk workers in consumer.py.
    """
    source_type   = task["source_type"]
    quiz_type     = task["quiz_type"]
    num_questions = task["num_questions"]
    difficulty    = task["difficulty"]

    logger.info("extracting_content", source_type=source_type, quiz_id=str(quiz_id))

    is_topic = False
    if source_type == "text":
        content = extract_text(task["source_content"])
    elif source_type == "topic":
        content = extract_topic(task["source_content"])
        is_topic = True
    else:
        raise ValueError(f"process_quiz called with unsupported source_type: {source_type}")

    if not content.strip():
        raise ValueError("No content could be extracted")

    logger.info("content_extracted", chars=len(content), quiz_id=str(quiz_id))
    logger.info("calling_ai", quiz_type=quiz_type, num_questions=num_questions, quiz_id=str(quiz_id))

    questions = await _call_ai(content, quiz_type, num_questions, difficulty,
                               is_topic=is_topic, is_pdf=False)
    logger.info("questions_generated", count=len(questions), quiz_id=str(quiz_id))
    return questions


async def process_single_chunk(
    chunk_text: str,
    quiz_type: str,
    num_questions: int,
    difficulty: str,
    chunk_index: int,
    chunks_total: int,
    is_pdf: bool = True,
    is_topic: bool = False,
    existing_questions: list[str] | None = None,
) -> list[dict]:
    """
    Process one chunk / batch — called by the chunk worker for all source types.

    PDF sources:   is_pdf=True,  is_topic=False
    Text sources:  is_pdf=False, is_topic=False
    Topic sources: is_pdf=False, is_topic=True

    existing_questions: question texts already saved for this quiz.
    Passed to the prompt so the AI generates non-duplicate questions.
    """
    logger.info(
        "processing_chunk",
        chunk=chunk_index + 1,
        of=chunks_total,
        questions=num_questions,
        quiz_type=quiz_type,
        is_pdf=is_pdf,
        is_topic=is_topic,
        existing=len(existing_questions) if existing_questions else 0,
    )
    return await _call_ai(
        chunk_text, quiz_type, num_questions, difficulty,
        is_topic=is_topic, is_pdf=is_pdf,
        existing_questions=existing_questions or [],
    )


# ── Internal helpers ────────────────────────────────────────────────────────

async def _call_ai(
    content: str,
    quiz_type: str,
    num_questions: int,
    difficulty: str,
    is_topic: bool,
    is_pdf: bool,
    existing_questions: list[str] | None = None,
) -> list[dict]:
    existing_questions = existing_questions or []

    if quiz_type == "mixed":
        return await _call_mixed(content, num_questions, difficulty,
                                 is_topic, is_pdf, existing_questions)

    prompt_fn = _PROMPT_FNS.get(quiz_type)
    if not prompt_fn:
        raise ValueError(f"Unknown quiz_type: {quiz_type}")

    user_prompt = prompt_fn(
        content, num_questions, difficulty,
        is_topic=is_topic, is_pdf=is_pdf,
        existing_questions=existing_questions,
    )
    raw = await generate_questions(SYSTEM_PROMPT, user_prompt)
    return parse_claude_response(raw)


async def _call_mixed(
    content: str,
    num_questions: int,
    difficulty: str,
    is_topic: bool,
    is_pdf: bool,
    existing_questions: list[str] | None = None,
) -> list[dict]:
    existing_questions = existing_questions or []
    distribution = distribute_mixed(num_questions)
    groups: list[list[dict]] = []

    for qtype, count in distribution.items():
        if count == 0:
            continue
        prompt_fn = _PROMPT_FNS[qtype]
        user_prompt = prompt_fn(
            content, count, difficulty,
            is_topic=is_topic, is_pdf=is_pdf,
            existing_questions=existing_questions,
        )
        raw = await generate_questions(SYSTEM_PROMPT, user_prompt)
        groups.append(parse_claude_response(raw))

    return merge_and_renumber(groups)
