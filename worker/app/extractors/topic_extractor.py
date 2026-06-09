def extract_topic(topic: str) -> str:
    """
    For topic-based quiz generation, we pass the topic directly.
    The Claude prompt is designed to generate questions about a topic
    without requiring a full content body.
    """
    return topic.strip()
