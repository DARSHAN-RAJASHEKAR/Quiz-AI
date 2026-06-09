from openai import AsyncOpenAI
from tenacity import retry, stop_after_attempt, wait_exponential

from app.config import get_settings

settings = get_settings()

# OpenRouter is OpenAI-API-compatible — just point the base_url at it
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"

# ── Model selection ────────────────────────────────────────────────────────
# google/gemini-2.5-flash  → ~$0.15/M in · $0.60/M out  ← current pick
# anthropic/claude-3-haiku → ~$0.25/M in · $1.25/M out  (Claude alternative)
# openai/gpt-4o-mini       → ~$0.15/M in · $0.60/M out
MODEL = "deepseek/deepseek-v4-flash:nitro"

_async_client: AsyncOpenAI | None = None


def get_async_client() -> AsyncOpenAI:
    global _async_client
    if _async_client is None:
        _async_client = AsyncOpenAI(
            api_key=settings.openrouter_key,
            base_url=OPENROUTER_BASE_URL,
        )
    return _async_client


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=4, max=30),
    reraise=True,
)
async def generate_questions(system_prompt: str, user_prompt: str) -> str:
    """Call AI via OpenRouter asynchronously with retry logic. Returns raw text response."""
    client = get_async_client()
    response = await client.chat.completions.create(
        model=MODEL,
        max_tokens=8192,
        temperature=0.7,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        extra_headers={
            "HTTP-Referer": "https://github.com/ai-quiz",   # optional but good practice
            "X-Title": "AI Quiz Generator",
        },
    )
    content = response.choices[0].message.content
    if content is None:
        raise ValueError(
            "AI returned null content — possible content filter or transient API error."
        )
    return content
