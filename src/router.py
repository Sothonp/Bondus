"""Which tier of model a question needs: simple or advanced.

A simple question -- a greeting, a short definition or an introduction to a
topic ("តើលីមីតជាអ្វី?", "what is an acid?") -- is answered well by the cheap
models, so it goes to them first. Everything that takes real work goes to the
frontier models first: solving, calculating or proving, explaining a concept in
any subject, an essay, a long question, a photo of an exercise, or a follow-up
to any of those. When in doubt the question is advanced: a weak answer to a hard
question costs more than a strong answer to an easy one.

No model is asked: the rules below cost nothing and take microseconds.
"""
from __future__ import annotations

import re
from typing import Literal

Tier = Literal["simple", "advanced"]

# Longer than this is rarely a one-line definition.
SIMPLE_MAX_CHARS = 160

_FORMULA = re.compile(r"\$|\\[A-Za-z]+|[=^√∫∑]|\d\s*[-+*/×÷]\s*\d|[a-zA-Z]\s*\^|\d[a-zA-Z]\b")
_NUMBERS = re.compile(r"[0-9០-៩]+(?:[.,][0-9០-៩]+)?")
_ADVANCED_WORDS = re.compile(
    r"ដោះស្រាយ|គណនា|ស្រាយបញ្ជាក់|បង្ហាញថា|ពន្យល់|ហេតុអ្វី|ហេតុដូចម្ដេច|ហេតុដូចម្តេច|បកស្រាយ|វិភាគ|"
    r"ប្រៀបធៀប|តែងសេចក្ដី|តែងសេចក្តី|ប្រធាន|លំហាត់|វិញ្ញាសា|សិក្សាអថេរភាព|ដេរីវេ|អាំងតេក្រាល|"
    r"ប្រូបាប|សមីការ|វិសមីការ|ចំនួនកុំផ្លិច|"
    r"\b(?:solve|calculate|compute|prove|show that|derive|explain|why|how does|how do|analy[sz]e|"
    r"compare|essay|exercise|evaluate|integrate|differentiate|find the|step by step)\b",
    re.IGNORECASE,
)


def answer_tier(
    question: str,
    *,
    previous_question: str = "",
    has_images: bool = False,
    continues: bool = False,
) -> Tier:
    """``simple`` only for a short, formula-free question asking for no work;
    ``advanced`` otherwise. A follow-up is judged together with the question
    it follows, so "បន្ត" after a hard exercise stays advanced."""
    if has_images or continues:
        return "advanced"
    text = f"{previous_question}\n{question}".strip()
    if not text:
        return "simple"
    if len(question.strip()) > SIMPLE_MAX_CHARS:
        return "advanced"
    if _FORMULA.search(text) or len(_NUMBERS.findall(text)) >= 2:
        return "advanced"
    if _ADVANCED_WORDS.search(text):
        return "advanced"
    return "simple"
