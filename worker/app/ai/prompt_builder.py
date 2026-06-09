SYSTEM_PROMPT = """You are an expert educator and professional quiz designer.
Your task is to generate high-quality quiz questions from the provided content or topic.
You MUST respond with valid JSON only — no markdown fences, no preamble, no trailing text.
The JSON must exactly match the schema provided in the user message."""

# Injected into every PDF prompt so the AI skips front-matter and spreads
# questions evenly across all sections of the document.
_PDF_RULES = """
IMPORTANT — before generating questions, apply these rules:
1. SKIP front-matter: ignore table of contents, index pages, preface,
   foreword, acknowledgements, copyright notices, and any page that is
   purely navigational (lists of figures, bibliography, glossary).
2. SPREAD questions across the ENTIRE document — do not cluster all
   questions in the first few pages. If the content has multiple
   chapters or sections, take at least one question from each major section.
3. Focus only on actual lesson content: definitions, concepts, facts,
   processes, examples, and conclusions that appear in the body chapters.
"""


def _difficulty_guide(difficulty: str) -> str:
    return {
        "easy":   "easy: factual recall, direct answers found in the content",
        "medium": "medium: requires understanding relationships, implications, or context",
        "hard":   "hard: requires synthesis, inference, application, or cross-concept reasoning",
    }.get(difficulty, "medium: requires understanding relationships and context")


def _existing_block(existing_questions: list[str], num_new: int) -> str:
    """
    Build the 'already generated' context block injected into every prompt.
    Accepts num_new directly so we never call .format() on question text that
    might contain literal { } braces (e.g. code snippets, math expressions).
    """
    if not existing_questions:
        return ""
    lines = "\n".join(f"{i + 1}. {q}" for i, q in enumerate(existing_questions))
    return (
        f"\nALREADY GENERATED — you MUST NOT repeat, rephrase, or closely paraphrase "
        f"any of these {len(existing_questions)} questions:\n"
        f"{lines}\n\n"
        f"Generate {num_new} DIFFERENT questions covering new concepts not tested above.\n"
    )


def build_mcq_prompt(
    content: str,
    num_questions: int,
    difficulty: str,
    is_topic: bool = False,
    is_pdf: bool = False,
    existing_questions: list[str] | None = None,
) -> str:
    content_label = "topic" if is_topic else "content"
    extra_rules = _PDF_RULES if is_pdf else ""
    existing_block = _existing_block(existing_questions or [], num_questions)

    return f"""Generate exactly {num_questions} multiple-choice questions from the {content_label} below.

Difficulty: {_difficulty_guide(difficulty)}
{extra_rules}{existing_block}
{"Topic: " if is_topic else "Content:"}
<content>
{content}
</content>

Return a JSON array. Each object must match this EXACT schema:
{{
  "question_number": <integer 1 through {num_questions}>,
  "question_type": "mcq",
  "question_text": "<clear, self-contained question — no references to paragraph numbers>",
  "options": [
    {{"label": "A", "text": "<option text>"}},
    {{"label": "B", "text": "<option text>"}},
    {{"label": "C", "text": "<option text>"}},
    {{"label": "D", "text": "<option text>"}}
  ],
  "correct_answer": "<A|B|C|D>",
  "explanation": "<2-3 sentences explaining why the answer is correct and why distractors are wrong>"
}}

Rules:
- Exactly {num_questions} questions, numbered 1 to {num_questions}
- Distractors must be plausible, not obviously wrong
- No "All of the above" or "None of the above" options
- Each question tests a distinct concept
- Correct answer must be definitively supported by the content/topic
"""


def build_true_false_prompt(
    content: str,
    num_questions: int,
    difficulty: str,
    is_topic: bool = False,
    is_pdf: bool = False,
    existing_questions: list[str] | None = None,
) -> str:
    content_label = "topic" if is_topic else "content"
    extra_rules = _PDF_RULES if is_pdf else ""
    existing_block = _existing_block(existing_questions or [], num_questions)

    return f"""Generate exactly {num_questions} true/false questions from the {content_label} below.

Difficulty: {_difficulty_guide(difficulty)}
{extra_rules}{existing_block}
{"Topic: " if is_topic else "Content:"}
<content>
{content}
</content>

Return a JSON array. Each object must match this EXACT schema:
{{
  "question_number": <integer 1 through {num_questions}>,
  "question_type": "true_false",
  "question_text": "<declarative statement that is clearly true or false>",
  "options": [
    {{"label": "True", "text": "True"}},
    {{"label": "False", "text": "False"}}
  ],
  "correct_answer": "<True|False>",
  "explanation": "<explanation of why the statement is true or false>"
}}

Rules:
- Exactly {num_questions} questions, numbered 1 to {num_questions}
- Balance roughly 50% true and 50% false answers
- Avoid absolute qualifiers like "always" or "never" unless definitively supported
- Each statement must be unambiguously true or false
- Avoid double negatives that make parsing confusing
"""


def build_short_answer_prompt(
    content: str,
    num_questions: int,
    difficulty: str,
    is_topic: bool = False,
    is_pdf: bool = False,
    existing_questions: list[str] | None = None,
) -> str:
    content_label = "topic" if is_topic else "content"
    extra_rules = _PDF_RULES if is_pdf else ""
    existing_block = _existing_block(existing_questions or [], num_questions)

    return f"""Generate exactly {num_questions} short-answer questions from the {content_label} below.

Difficulty: {_difficulty_guide(difficulty)}
{extra_rules}{existing_block}
- easy difficulty: single-concept answers (1-5 words)
- medium difficulty: brief explanation (1-2 sentences)
- hard difficulty: multi-step or synthesis answer

{"Topic: " if is_topic else "Content:"}
<content>
{content}
</content>

Return a JSON array. Each object must match this EXACT schema:
{{
  "question_number": <integer 1 through {num_questions}>,
  "question_type": "short_answer",
  "question_text": "<question requiring a brief written response>",
  "options": null,
  "correct_answer": "<the ideal answer — include key terms that must appear in a correct response>",
  "explanation": "<full explanation including all key concepts that define a correct answer>"
}}

Rules:
- Exactly {num_questions} questions, numbered 1 to {num_questions}
- Questions must have objectively verifiable answers (not opinion-based)
- correct_answer should be concise but include all essential terms
"""


def distribute_mixed(num_questions: int) -> dict[str, int]:
    """Distribute questions across types for a mixed quiz."""
    mcq = round(num_questions * 0.5)
    tf  = round(num_questions * 0.3)
    sa  = num_questions - mcq - tf
    return {"mcq": mcq, "true_false": tf, "short_answer": sa}
