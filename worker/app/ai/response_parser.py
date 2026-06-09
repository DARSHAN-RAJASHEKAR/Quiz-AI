import json
import re

from pydantic import BaseModel, ValidationError


class ParsedQuestion(BaseModel):
    question_number: int
    question_type: str
    question_text: str
    options: list[dict] | None
    correct_answer: str
    explanation: str


def parse_claude_response(raw: str) -> list[dict]:
    """
    Parse Claude's JSON response into a list of validated question dicts.
    Handles accidental markdown fences.
    """
    text = raw.strip()

    # Strip markdown code fences if Claude includes them
    if text.startswith("```"):
        # Remove ```json or ``` at start
        text = re.sub(r"^```[a-z]*\n?", "", text)
        # Remove trailing ```
        text = re.sub(r"\n?```$", "", text.rstrip())

    try:
        data = json.loads(text)
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON from Claude: {e}\nRaw: {text[:500]}")

    if not isinstance(data, list):
        raise ValueError(f"Expected JSON array, got {type(data).__name__}")

    questions = []
    for i, item in enumerate(data):
        try:
            q = ParsedQuestion.model_validate(item)
            questions.append(q.model_dump())
        except ValidationError as e:
            raise ValueError(f"Question {i+1} failed validation: {e}")

    return questions


def merge_and_renumber(question_groups: list[list[dict]]) -> list[dict]:
    """Merge multiple question lists and renumber sequentially."""
    merged = []
    num = 1
    for group in question_groups:
        for q in group:
            q["question_number"] = num
            merged.append(q)
            num += 1
    return merged
