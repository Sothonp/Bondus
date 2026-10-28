"""BAC II subjects, and which subject an indexed document belongs to.

The Science track sits seven papers: Mathematics, Physics, Chemistry, Biology,
Khmer Literature, History and one foreign language, English or French, which
the student picks. Retrieval keeps English and French apart, so a student who
sits French is never shown English papers.

The corpus is laid out ``<Track>/<subject>/<year>.pdf`` (``Science/physics/2019.pdf``),
so a document's subject is normally its folder. Files outside that layout
fall back to a subject word in the file name (``science-physics-2019.pdf``,
``Physic_Science_2011.pdf``) and then to the Khmer subject name in its catalog
title. Nothing is stored in the index, so a subject filter works on an index
built before subjects existed.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import PurePosixPath


@dataclass(frozen=True)
class Subject:
    id: str
    en: str
    km: str
    aliases: tuple[str, ...]  # file-name words that name this subject
    km_names: tuple[str, ...]  # Khmer names that appear in catalog titles


SUBJECTS: tuple[Subject, ...] = (
    Subject("mathematics", "Mathematics", "គណិតវិទ្យា", ("math", "maths", "mathematics"), ("គណិតវិទ្យា",)),
    Subject("physics", "Physics", "រូបវិទ្យា", ("physic", "physics"), ("រូបវិទ្យា",)),
    Subject("chemistry", "Chemistry", "គីមីវិទ្យា", ("chemistry", "chem"), ("គីមីវិទ្យា",)),
    Subject("biology", "Biology", "ជីវវិទ្យា", ("biology", "bio"), ("ជីវវិទ្យា",)),
    Subject(
        "khmer_literature", "Khmer Literature", "អក្សរសាស្ត្រខ្មែរ",
        ("literature",), ("អក្សរសាស្ត្រ", "អក្សរសាស្រ្ត"),
    ),
    Subject("history", "History", "ប្រវត្តិវិទ្យា", ("history",), ("ប្រវត្តិវិទ្យា",)),
    Subject("english", "English", "ភាសាអង់គ្លេស", ("english",), ("អង់គ្លេស",)),
    # "Fance" is how one of the 2018 papers is spelled on disk.
    Subject("french", "French", "ភាសាបារាំង", ("french", "france", "fance"), ("បារាំង",)),
    # Social-track and retired Science-track papers, kept so they can be filtered too.
    Subject("geography", "Geography", "ភូមិវិទ្យា", ("geography",), ("ភូមិវិទ្យា",)),
    Subject("earth_science", "Earth Science", "ផែនដីវិទ្យា", ("earth",), ("ផែនដីវិទ្យា",)),
    Subject("morality", "Morality", "សីលធម៌ពលរដ្ឋវិទ្យា", ("morality",), ("សីលធម៌",)),
)

SUBJECT_IDS: frozenset[str] = frozenset(subject.id for subject in SUBJECTS)

# The seven Science-track papers; "english"/"french" share the language slot.
SCIENCE_SUBJECTS: tuple[str, ...] = (
    "mathematics", "physics", "chemistry", "biology", "khmer_literature", "history", "foreign_language",
)
FOREIGN_LANGUAGES: tuple[str, ...] = ("english", "french")

_BY_ID = {subject.id: subject for subject in SUBJECTS}
_BY_ALIAS = {alias: subject.id for subject in SUBJECTS for alias in subject.aliases}
_WORD = re.compile(r"[a-z]+")


def subject_of(source: str, title: str = "") -> str | None:
    """The subject id of an indexed document, or None when nothing names one."""
    path = PurePosixPath(source.lower())
    for folder in path.parts[:-1]:
        if folder in _BY_ID:
            return folder
    for word in _WORD.findall(path.stem):
        if word in _BY_ALIAS:
            return _BY_ALIAS[word]
    for subject in SUBJECTS:
        if any(name in title for name in subject.km_names):
            return subject.id
    return None


# Other ways students name a subject in a question; titles never use these.
_QUESTION_KM_NAMES: dict[str, tuple[str, ...]] = {
    "mathematics": ("គណិត",),
    "history": ("ប្រវត្តិសាស្ត្រ", "ប្រវត្តិសាស្រ្ត"),
    "khmer_literature": ("អក្សរសិល្ប៍",),
}
# "Answer in English" asks for a language, not about the English subject.
_IN_LANGUAGE = re.compile(r"ជាភាសា(?:អង់គ្លេស|បារាំង)|\bin (?:english|french)\b", re.IGNORECASE)


def subject_named_in(question: str) -> str | None:
    """The one subject a question names ("បង្កើតវិញ្ញាសាប្រវត្តិវិទ្យា", "a physics
    exercise"), or None when it names none or several."""
    text = _IN_LANGUAGE.sub(" ", question)
    words = set(_WORD.findall(text.lower()))
    named = {
        subject.id
        for subject in SUBJECTS
        if any(name in text for name in (*subject.km_names, *_QUESTION_KM_NAMES.get(subject.id, ())))
        or words & {*subject.aliases, subject.en.lower()}
    }
    return named.pop() if len(named) == 1 else None


def get_subject(subject_id: str) -> Subject:
    return _BY_ID[subject_id]
