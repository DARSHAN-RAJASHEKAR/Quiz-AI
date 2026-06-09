import json
import uuid
from datetime import datetime, timezone

import aio_pika
from aio_pika import ExchangeType, Message

from app.config import get_settings

settings = get_settings()

EXCHANGE_NAME = "quiz_exchange"
QUEUE_NAME = "quiz.generation"
DLX_NAME = "quiz_dlx"
DLQ_NAME = "quiz.dead"
ROUTING_KEY = "quiz.generate"
DL_ROUTING_KEY = "quiz.dead"


async def get_rabbitmq_connection() -> aio_pika.abc.AbstractRobustConnection:
    return await aio_pika.connect_robust(settings.rabbitmq_url)


async def declare_topology(channel: aio_pika.abc.AbstractChannel) -> aio_pika.abc.AbstractExchange:
    """Declare all exchanges and queues (idempotent)."""
    # Main exchange
    exchange = await channel.declare_exchange(
        EXCHANGE_NAME, ExchangeType.DIRECT, durable=True
    )

    # Dead letter exchange
    dlx = await channel.declare_exchange(
        DLX_NAME, ExchangeType.DIRECT, durable=True
    )

    # Dead letter queue
    dlq = await channel.declare_queue(DLQ_NAME, durable=True)
    await dlq.bind(dlx, routing_key=DL_ROUTING_KEY)

    # Main work queue with DLQ config
    queue = await channel.declare_queue(
        QUEUE_NAME,
        durable=True,
        arguments={
            "x-dead-letter-exchange": DLX_NAME,
            "x-dead-letter-routing-key": DL_ROUTING_KEY,
            "x-message-ttl": 600_000,  # 10 minutes
        },
    )
    await queue.bind(exchange, routing_key=ROUTING_KEY)

    return exchange


async def publish_quiz_job(
    channel: aio_pika.abc.AbstractChannel,
    quiz_id: uuid.UUID,
    user_id: uuid.UUID,
    task: dict,
) -> None:
    """Publish a quiz generation job to RabbitMQ."""
    exchange = await declare_topology(channel)

    message_body = {
        "version": "1.0",
        "message_id": str(uuid.uuid4()),
        "quiz_id": str(quiz_id),
        "user_id": str(user_id),
        "task": task,
        "attempt": 1,
        "max_attempts": 3,
        "published_at": datetime.now(timezone.utc).isoformat(),
    }

    message = Message(
        body=json.dumps(message_body).encode(),
        content_type="application/json",
        delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
    )

    await exchange.publish(message, routing_key=ROUTING_KEY)
