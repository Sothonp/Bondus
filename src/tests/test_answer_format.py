"""The answer repair pass: it must fix what breaks the renderer, and only that."""
from __future__ import annotations

import re

import pytest

from src.answer_format import sanitize_answer


def fixed(text: str, **kwargs) -> str:
    return sanitize_answer(text, **kwargs)[0]


class TestLeavesGoodAnswersAlone:
    """The costly failure is corrupting an answer that was already correct."""

    def test_an_answer_in_the_required_shape_is_untouched(self):
        answer = (
            "**ជំហាន ១៖** បំលែង $1+i$ ទៅជា polar form\n"
            "\n"
            "$$\n"
            "1+i=\\sqrt{2}\\left(\\cos\\frac{\\pi}{4}+i\\sin\\frac{\\pi}{4}\\right)\n"
            "$$\n"
            "\n"
            "**ជំហាន ២៖** ប្រើ De Moivre"
        )
        repaired, notes = sanitize_answer(answer)
        assert repaired == answer
        assert notes == []

    def test_latin_text_in_a_formula_is_kept(self):
        answer = "$x \\text{ for } y$"
        assert fixed(answer) == answer

    @pytest.mark.parametrize("answer", ["", "   ", "សួស្តី"])
    def test_trivial_answers_are_unchanged(self, answer):
        assert fixed(answer) == answer


class TestCommandsTheRendererLacks:
    def test_displaystyle_is_dropped(self):
        assert "\\displaystyle" not in fixed("$\\displaystyle\\lim_{x\\to a}f(x)=L$")

    def test_qquad_is_dropped(self):
        assert "\\qquad" not in fixed("$a=1,\\qquad b=2$")

    def test_cis_becomes_cos_plus_i_sin(self):
        assert fixed("$z=\\operatorname{cis}\\theta$") == "$z=(\\cos \\theta + i\\sin \\theta)$"

    def test_cis_keeps_a_braced_exponent_whole(self):
        """The argument runs past a brace group; stopping early loses a delimiter."""
        repaired = fixed("$(2\\operatorname{cis}30^{\\circ})^{4}$")
        assert repaired == "$(2(\\cos 30^{\\circ} + i\\sin 30^{\\circ}))^{4}$"
        assert repaired.count("{") == repaired.count("}")
        assert repaired.count("(") == repaired.count(")")


class TestKhmerInsideMath:
    """KaTeX has no Khmer font: the words must come out of the formula."""

    def test_khmer_is_lifted_out_of_text_command(self):
        repaired = fixed("$|z_1+z_2|\\le |z_1|+|z_2| \\;(\\text{ត្រីកោណមិនស្មើ})$")
        assert "\\text{" not in repaired
        assert "ត្រីកោណមិនស្មើ" in repaired, "the words are kept, only moved"
        assert repaired.index("$", 1) < repaired.index("ត្រីកោណមិនស្មើ")

    def test_no_empty_group_is_left_behind(self):
        repaired = fixed("$a \\;(\\text{ដូចជា})$")
        assert "( )" not in repaired and "()" not in repaired

    def test_bare_khmer_is_lifted_too(self):
        repaired = fixed("$x = 5 \\quad ដូចនេះ$")
        assert "ដូចនេះ" in repaired
        assert "$x = 5$" in repaired


class TestDelimiters:
    def test_paren_delimiters_become_dollars(self):
        assert fixed("ដូច្នេះ \\(x=2\\)") == "ដូច្នេះ $x=2$"

    def test_bracket_delimiters_become_a_display_block(self):
        assert "$$\ny=3\n$$" in fixed("និង \\[y=3\\]")

    def test_an_unclosed_display_block_is_closed(self):
        """Left open, it swallows every line after it."""
        repaired = fixed("ជំហាន ១\n\n$$\nx^2+1=0\n\nបន្ទាប់មក")
        assert repaired.count("$$") == 2
        assert "បន្ទាប់មក" in repaired

    def test_an_unclosed_inline_formula_is_closed(self):
        assert fixed("តម្លៃ $x = 5 ដូចនេះ").count("$") % 2 == 0

    def test_a_display_block_opened_mid_sentence_moves_to_its_own_line(self):
        repaired = fixed("យើងបាន $$x=1$$ ដូច្នេះ")
        assert "\n$$\nx=1\n$$\n" in repaired
        for line in repaired.splitlines():
            assert line.strip() != "" or True
            if "$$" in line:
                assert line.strip() == "$$", "a $$ line carries nothing else"


class TestStructure:
    def test_horizontal_rules_are_removed(self):
        assert "---" not in fixed("## ចម្លើយ\n\n---\n\nសួស្តី")

    def test_a_heading_keeps_its_hashes(self):
        """#{1,6} backtracks: '##' must not be rewritten as '# #'."""
        assert fixed("## ចម្លើយ\n\n---\n\nសួស្តី").startswith("## ចម្លើយ")

    def test_a_heading_gains_its_missing_space(self):
        assert fixed("##ចម្លើយ\n\nអត្ថបទ").startswith("## ចម្លើយ")

    def test_a_heading_run_onto_another_line_starts_a_new_one(self):
        repaired = fixed("សួស្តី ## ជំហាន ២")
        assert repaired.splitlines()[0].strip() == "សួស្តី"
        assert "## ជំហាន ២" in repaired


class TestNotes:
    def test_notes_describe_what_changed(self):
        _, notes = sanitize_answer("$\\displaystyle x$")
        assert notes, "a repair is reported for the log"

    def test_no_notes_when_nothing_moved(self):
        assert sanitize_answer("សួស្តី $x=1$")[1] == []


class TestContinuedAnswers:
    """A long exercise is answered over several rounds joined into one answer.

    remark-math pairs ``$$`` in document order, so a round that is closed off
    when it should stay open puts every block after it one delimiter out of
    step: the prose lands inside a formula (KaTeX prints it in red) and the
    formulas render as plain Markdown, which eats the backslash of each
    ``\\,`` and ``\\;``.
    """

    ROUND_ONE = "**ជំហាន ៣**\n\n$$\nA = \\Bigl[-\\frac{\\ln x}"
    ROUND_TWO = (
        "{x}\\Bigr]_{1}^{e^{0.5}}\n"
        "$$\n"
        "\n"
        "ដូច្នេះផ្ទៃរវាង $C$ ពី $x=1$ គឺ\n"
        "\n"
        "$$\n"
        "A=\\int_{1}^{e^{0.5}}\\frac{\\ln x}{x^{2}}\\,dx\n"
        "$$\n"
    )

    def test_a_truncated_round_keeps_its_block_open(self):
        repaired = fixed(self.ROUND_ONE, may_continue=True)
        assert repaired.count("$$") == 1, "the next round closes the block itself"
        assert repaired.endswith("\\frac{\\ln x}")

    def test_a_truncated_round_is_still_closed_when_nothing_follows(self):
        assert fixed(self.ROUND_ONE).count("$$") == 2

    def test_a_truncated_round_keeps_an_inline_formula_open(self):
        assert fixed("តម្លៃ $x = 5", may_continue=True).count("$") == 1

    def test_a_continuing_round_does_not_grow_a_delimiter(self):
        repaired = fixed(self.ROUND_TWO, opens_in_math=True)
        assert repaired.count("$$") == 3, "the opening fence belongs to the round before"
        assert not repaired.lstrip().startswith("$$")

    def test_the_joined_rounds_pair_up_as_the_model_meant(self):
        joined = fixed(self.ROUND_ONE, may_continue=True) + fixed(self.ROUND_TWO, opens_in_math=True)
        blocks = re.split(r"(?m)^[ \t]*\$\$[ \t]*$", joined)
        assert len(blocks) == 5, "two blocks, three stretches of prose"
        assert "\\Bigl[-\\frac{\\ln x}{x}\\Bigr]" in blocks[1], "the split formula rejoins"
        assert "ដូច្នេះផ្ទៃរវាង" in blocks[2], "the prose stays prose"
        assert "\\int_{1}^{e^{0.5}}" in blocks[3]

    def test_a_whole_round_inside_one_block_keeps_both_ends_open(self):
        repaired = fixed("x^{2} + 2x", opens_in_math=True, may_continue=True)
        assert "$" not in repaired
