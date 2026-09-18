"""Repair an answer's Markdown and LaTeX so the renderer can display it.

The output rules in ``prompts.py`` tell the model what the frontend's
remark-math + KaTeX pipeline accepts, but no model follows them every time,
and the failures are not cosmetic: an unclosed ``$$`` swallows the rest of the
answer, and a Khmer word inside ``\\text{...}`` renders as a row of boxes. A
student sees raw LaTeX instead of an explanation.

``sanitize_answer`` is the last step before an answer is sent. It fixes what
can be fixed unambiguously and leaves everything else alone -- a repair that
guesses would corrupt correct answers, which is worse than the broken
rendering it set out to fix.

What it repairs:

* ``\\(...\\)`` and ``\\[...\\]`` become ``$...$`` and ``$$...$$``.
* ``\\displaystyle`` and ``\\qquad`` are dropped; ``\\operatorname{cis}`` is
  written out as ``\\cos...+i\\sin...``.
* Khmer inside math is lifted out of the formula, keeping the words.
* A ``$$`` that opens mid-sentence is moved onto its own line, with a blank
  line around the block.
* An unclosed ``$$`` or ``$`` is closed at the end.
* ``---`` rules are removed, ``##Heading`` gains its space, and a heading or
  list item that was run onto the end of another line starts a new one.
"""
from __future__ import annotations

import re

KHMER = r"\u1780-\u17FF\u19E0-\u19FF"
_HAS_KHMER = re.compile(f"[{KHMER}]")

# $$...$$ first, so an inline match cannot start inside a display block.
_MATH = re.compile(r"(?s)(\$\$.*?\$\$|(?<!\$)\$(?!\$)(?:\\.|[^$\\])*?\$(?!\$))")

_BANNED_COMMANDS = (
    (re.compile(r"\\displaystyle\s*"), ""),
    (re.compile(r"\\qquad\s*"), " "),
    (re.compile(r"\\limits\b"), ""),
)

# \operatorname{cis}\theta, \operatorname{cis}(30^\circ), \mathrm{cis}{x}, cis 45
_CIS_HEAD = re.compile(r"(?:\\(?:operatorname|mathrm|text)\s*\{\s*cis\s*\}|\\cis\b)\s*")
_ARGUMENT_STOP = set(" \t+-*/=,)]}")

_TEXT_COMMAND = re.compile(r"\\(?:text|mathrm|mathbf|textbf|textit)\s*\{([^{}]*)\}")
# A run of Khmer sitting bare in a formula, with any spacing macros around it.
_BARE_KHMER = re.compile(f"(?:\\\\[,;:!]|\\\\quad|\\s)*[{KHMER}][{KHMER}\\s\u200b]*")


def _strip_braces(argument: str) -> str:
    if argument.startswith("{") and argument.endswith("}"):
        return argument[1:-1].strip()
    if argument.startswith("(") and argument.endswith(")"):
        return argument[1:-1].strip()
    return argument.strip()


def _read_argument(text: str, start: int) -> tuple[str, int]:
    """The single argument beginning at ``start``, respecting brace depth.

    ``30^{\\circ})`` must come back as ``30^{\\circ}`` and not stop at the
    first brace, or the rewritten formula loses a delimiter and stops parsing.
    """
    index = start
    if index < len(text) and text[index] in "{(":
        opening, closing = text[index], "}" if text[index] == "{" else ")"
        depth = 0
        while index < len(text):
            if text[index] == opening:
                depth += 1
            elif text[index] == closing:
                depth -= 1
                if depth == 0:
                    return text[start : index + 1], index + 1
            index += 1
        return text[start:], len(text)

    depth = 0
    while index < len(text):
        char = text[index]
        if char == "{":
            depth += 1
        elif char == "}":
            if depth == 0:
                break
            depth -= 1
        elif depth == 0 and char in _ARGUMENT_STOP:
            break
        index += 1
    return text[start:index], index


def _expand_cis(math: str) -> str:
    """cis is not a KaTeX command; write the definition instead."""
    out: list[str] = []
    position = 0
    while True:
        match = _CIS_HEAD.search(math, position)
        if match is None:
            out.append(math[position:])
            return "".join(out)
        angle, end = _read_argument(math, match.end())
        angle = _strip_braces(angle)
        out.append(math[position : match.start()])
        if angle:
            out.append(f"(\\cos {angle} + i\\sin {angle})")
        else:
            out.append(match.group(0))
        position = end


def _lift_khmer(math: str) -> tuple[str, list[str]]:
    """Remove Khmer from a formula, returning it to be placed beside the math.

    KaTeX has no Khmer font, so these words render as boxes wherever they sit
    in the formula. Order is kept, which is what a reader needs; the exact
    position inside the expression cannot be preserved outside it.
    """
    lifted: list[str] = []

    def take_text_command(match: re.Match[str]) -> str:
        inner = match.group(1)
        if not _HAS_KHMER.search(inner):
            return match.group(0)
        word = inner.strip()
        if word:
            lifted.append(word)
        return " "

    math = _TEXT_COMMAND.sub(take_text_command, math)

    def take_bare(match: re.Match[str]) -> str:
        word = match.group(0).strip()
        for macro in ("\\,", "\\;", "\\:", "\\!", "\\quad"):
            word = word.replace(macro, "")
        word = word.strip()
        if word:
            lifted.append(word)
        return " "

    math = _BARE_KHMER.sub(take_bare, math)
    return math, lifted


def _clean_math(body: str) -> tuple[str, list[str]]:
    """Fix the inside of one formula. ``body`` excludes the $ delimiters."""
    for pattern, replacement in _BANNED_COMMANDS:
        body = pattern.sub(replacement, body)
    body = _expand_cis(body)
    body, lifted = _lift_khmer(body)
    if lifted:
        # "\\;(\\text{...})" leaves "\\;( )" behind once the word is gone.
        body = re.sub(r"\(\s*\)|\{\s*\}|\[\s*\]", "", body)
        body = re.sub(r"(?:\\[,;:!]|\\quad)+\s*$", "", body)
        body = re.sub(r"^\s*(?:\\[,;:!]|\\quad)+", "", body)
    body = re.sub(r"[ \t]{2,}", " ", body)
    return body.strip(), lifted


def _balance_dollars(text: str) -> tuple[str, list[str]]:
    """Close a display or inline block the model left open.

    An unclosed block hides every line after it, so closing it at the end is
    always better than leaving it: the worst case is one formula rendered
    oddly, instead of the rest of the answer disappearing.
    """
    notes: list[str] = []
    if text.count("$$") % 2:
        text = text.rstrip() + "\n$$"
        notes.append("closed an unclosed $$ block")
    # Count inline $ only outside display blocks.
    outside = re.sub(r"(?s)\$\$.*?\$\$", "", text)
    if outside.count("$") % 2:
        text = text.rstrip() + "$"
        notes.append("closed an unclosed $")
    return text, notes


def _normalise_delimiters(text: str) -> tuple[str, list[str]]:
    notes: list[str] = []
    if "\\(" in text or "\\)" in text:
        text = text.replace("\\(", "$").replace("\\)", "$")
        notes.append("rewrote \\( \\) as $")
    if "\\[" in text or "\\]" in text:
        text = text.replace("\\[", "\n$$\n").replace("\\]", "\n$$\n")
        notes.append("rewrote \\[ \\] as $$")
    return text, notes


def _fix_structure(text: str) -> tuple[str, list[str]]:
    """Markdown blocks that must start a line, and rules that must not exist."""
    notes: list[str] = []

    without_rules = re.sub(r"(?m)^[ \t]*-{3,}[ \t]*$\n?", "", text)
    if without_rules != text:
        notes.append("removed --- rules")
        text = without_rules

    spaced = re.sub(r"(?m)^(#{1,6})(?=[^#\s])", r"\1 ", text)
    if spaced != text:
        notes.append("added the space after ##")
        text = spaced

    # A heading that was run onto the end of a previous line.
    split_headings = re.sub(r"(?<=[^#\s])[ \t]+(#{1,6}[ \t]+\S)", r"\n\n\1", text)
    if split_headings != text:
        notes.append("moved a heading onto its own line")
        text = split_headings

    return text, notes


def _fix_display_blocks(text: str) -> tuple[str, list[str]]:
    """Put every $$ alone on its own line with a blank line around the block."""
    notes: list[str] = []

    def block(match: re.Match[str]) -> str:
        body = match.group(1).strip()
        return f"\n\n$$\n{body}\n$$\n\n"

    fixed = re.sub(r"(?s)\$\$(.*?)\$\$", block, text)
    if fixed != text:
        notes.append("put $$ on its own line")
        text = fixed
    return re.sub(r"\n{3,}", "\n\n", text).strip(), notes


def sanitize_answer(text: str) -> tuple[str, list[str]]:
    """Return the answer with its formatting repaired, plus what was changed.

    The notes are for logging, not for the student: an answer that needed
    repair is a sign the prompt is drifting from what the renderer accepts.
    """
    if not text or not text.strip():
        return text, []

    original = text
    notes: list[str] = []
    text, delimiter_notes = _normalise_delimiters(text)
    notes.extend(delimiter_notes)
    text, balance_notes = _balance_dollars(text)
    notes.extend(balance_notes)

    pieces: list[str] = []
    stripped_commands = False
    lifted_khmer = False
    for index, piece in enumerate(_MATH.split(text)):
        if index % 2 == 0:  # outside math
            pieces.append(piece)
            continue
        display = piece.startswith("$$")
        body = piece[2:-2] if display else piece[1:-1]
        before = body
        body, lifted = _clean_math(body)
        if body != before:
            stripped_commands = True
        if not body:
            # The formula was nothing but the lifted words.
            pieces.append(" ".join(lifted))
            lifted_khmer = lifted_khmer or bool(lifted)
            continue
        rebuilt = f"$$\n{body}\n$$" if display else f"${body}$"
        if lifted:
            lifted_khmer = True
            words = " ".join(lifted)
            rebuilt = f"{rebuilt}\n\n{words}" if display else f"{rebuilt} {words}"
        pieces.append(rebuilt)

    if stripped_commands:
        notes.append("removed commands the renderer does not have")
    if lifted_khmer:
        notes.append("moved Khmer out of a formula")

    text = "".join(pieces)
    text, structure_notes = _fix_structure(text)
    notes.extend(structure_notes)
    text, display_notes = _fix_display_blocks(text)
    notes.extend(display_notes)
    # Normalising whitespace inside a formula can report a change that leaves
    # the answer identical; only report what actually moved.
    if text == original:
        return text, []
    return text, notes
