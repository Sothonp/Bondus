"""Write a Key-Points Sheet for each literary work in the index.

Gemini reads the whole OCR'd text of a work (every indexed chunk of its novel,
and of its summary when there is one) and fills the standard sheet: metadata,
every character, themes, influence and the plot. The sheet is checked against
the text: each character name it lists must appear in the book, and names that
do not are reported for a person to check -- an OCR misreading, or a guess.

Sheets are written to data/<folder>/key_points/<work>.md and added to the
catalog as "ចំណុចសំខាន់ៗ៖ រឿង<work> — អក្សរសាស្ត្រខ្មែរ". Review them, then run
ingest_corpus.py to index them; a question that names the work then gets the
whole sheet in front of its passages (src/retrieval/retriever.py).

    uv run python scripts/build_key_points.py                    # every work
    uv run python scripts/build_key_points.py --work ភូមិតិរច្ឆាន   # one work
    uv run python scripts/build_key_points.py --notes notes.txt   # raw notes too
"""
from __future__ import annotations

import argparse
import json
import logging
import re
import sys
import time
from collections import defaultdict
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from src.config import get_settings  # noqa: E402
from src.ingestion.khmer_segment import strip_word_boundaries  # noqa: E402
from src.retrieval.retriever import is_key_points, normalize_khmer, work_name  # noqa: E402

logger = logging.getLogger("build_key_points")

FOLDER = "Khmer_Literature_Novel_Book"

INSTRUCTIONS = """Act as an expert Khmer Literature Curriculum Specialist and Educational AI Assistant.

Your task is to analyze the full text below and write a standardized, highly
structured Key-Points Sheet for the Grade 12 Khmer Literature work «{name}».

Rules:
1. Write in formal academic Khmer, clear and concise, for educational reference.
2. Take every fact from the text below. The text was read from a scan by OCR, so
   a name may be misspelled in places: use the spelling the text uses most often,
   and the corrections in the notes when they are given. Never invent a character,
   event, date or quotation. If the text does not give an item (for example the
   publication date), write "មិនមានក្នុងអត្ថបទ" for it.
3. Fix missing or incomplete character profiles: list EVERY named character who
   matters to the plot -- heroes, villains, colonial and historical figures, and
   supporting characters -- with background and role. Mark real historical figures
   with "(តួអង្គប្រវត្តិសាស្ត្រ)". Put each character's name in **bold** at the
   start of their line, exactly as spelled in the book. Leave out the list numbers
   and page numbers the scan mixed into names ("ជួន ១១" is ជួន).
4. Notes given below are rough and may come from outside the book: use a note only
   where the text agrees with it.
5. Output only the sheet, in exactly this Markdown structure:

# ចំណុចសំខាន់ៗ៖ រឿង{name} (Key-Points Sheet: <English name>)

## ១. ព័ត៌មានទូទៅ និងប្រវត្តិ
- **អ្នកនិពន្ធ៖** ...
- **កាលបរិច្ឆេទ និងប្រភពប្រវត្តិសាស្ត្រ៖** (the period the story is set in, when it was written, when published)
- **ប្រភេទ និងចលនាអក្សរសិល្ប៍៖** ...

## ២. តួអង្គ
### តួឯក ឬវីរបុរស
- **<name>៖** background, role in the story
### តួប្រឆាំង ឬអ្នកជិះជាន់
- **<name>៖** role, actions
### តួរង
- **<name>៖** relationship, part in the plot

## ៣. ប្រធានបទ និងគោលបំណង
- **<theme>៖** short explanation (three or four themes)
- **គោលបំណងរបស់អ្នកនិពន្ធ៖** ...

## ៤. ឥទ្ធិពលលើសង្គម និងវប្បធម៌
- **ឥទ្ធិពលប្រវត្តិសាស្ត្រ៖** ...
- **សារៈសំខាន់សម្រាប់សិស្សថ្នាក់ទី១២៖** ...

## ៥. សាច់រឿងសង្ខេប
- **ការចាប់ផ្តើមរឿង៖** ...
- **ចំណុចរបត់ និងទំនាស់៖** the major events in order
- **ដំណោះស្រាយ និងមេរៀនសីលធម៌៖** ...
"""

# OCR misreadings found by hand, corrected in the sheet (and its name check).
CORRECTIONS: dict[str, dict[str, str]] = {
    "ភូមិតិរច្ឆាន": {"ឌៀក អ័": "ឌឿក អំ", "បូដ្ធាំង": "បូដ្វាំង"},
}

# Thai, Lao, Chinese, Japanese, Korean or Cyrillic in a Khmer sheet is a model slip.
_FOREIGN_SCRIPT = re.compile(r"[\u0E00-\u0EFF\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF\u0400-\u04FF]+")
_BOLD_NAME = re.compile(r"^\s*-\s*\*\*([^*៖:]+)[៖:]?\*\*", re.MULTILINE)
_TITLES = ("លោកស្រី", "លោក", "នាង", "អ្នកស្រី", "អ្នក", "ព្រះបាទ", "ព្រះ", "មេឃុំ", "ចៅ", "តា", "យាយ")


def load_works(index_dir: Path) -> dict[str, list[tuple[str, int, str]]]:
    """Each work's text chunks as (source, chunk index, text), sheets left out."""
    archive = np.load(index_dir / "index.npz")
    records = json.loads(archive["records"].tobytes().decode("utf-8"))
    works: dict[str, list[tuple[str, int, str]]] = defaultdict(list)
    for record in records:
        title = (record.get("metadata") or {}).get("title") or ""
        if not record["source"].startswith(FOLDER + "/") or is_key_points(title):
            continue
        name = work_name(title)
        if name:
            works[name].append((record["source"], record["chunk_index"], strip_word_boundaries(record["text"])))
    return {name: sorted(chunks) for name, chunks in works.items()}


def book_text(chunks: list[tuple[str, int, str]]) -> str:
    parts, current = [], None
    for source, _, text in chunks:
        if source != current:
            parts.append(f"\n\n===== {source} =====\n")
            current = source
        parts.append(text)
    return "\n".join(parts)


def character_names(sheet: str) -> list[str]:
    """The bold names leading the lines of section ២ (the characters)."""
    match = re.search(r"^## ២\..*?(?=^## ៣\.|\Z)", sheet, re.MULTILINE | re.DOTALL)
    return [name.strip() for name in _BOLD_NAME.findall(match.group(0))] if match else []


def unverified(names: list[str], text: str) -> list[str]:
    """Names that appear nowhere in the book, with or without a title such as នាង."""
    text = normalize_khmer(text)
    missing = []
    for name in names:
        bare = normalize_khmer(name.split("(")[0].strip())
        for title in _TITLES:
            if bare.startswith(title) and len(bare) > len(title) + 1:
                bare = bare[len(title):].strip()
                break
        if bare and bare not in text:
            missing.append(name)
    return missing


def generate(client, model: str, prompt: str, attempts: int = 5) -> str:
    from google.genai import errors, types

    for attempt in range(1, attempts + 1):
        try:
            response = client.models.generate_content(
                model=model,
                contents=prompt,
                config=types.GenerateContentConfig(temperature=0.2, max_output_tokens=16000),
            )
            return response.text or ""
        except errors.APIError as exc:
            if attempt == attempts or exc.code not in (429, 500, 503):
                raise
            wait = 20 * attempt
            logger.warning("%s busy (%s); retrying in %d s", model, exc.code, wait)
            time.sleep(wait)
    return ""


def main(argv: list[str] | None = None) -> int:
    settings = get_settings()
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--work", action="append", help="only this work (repeatable)")
    parser.add_argument("--notes", type=Path, help="raw notes to give the model (applied to every --work)")
    parser.add_argument("--model", default="gemini-3.5-flash")
    parser.add_argument("--data-dir", type=Path, default=settings.data_dir)
    parser.add_argument("--force", action="store_true", help="overwrite sheets that already exist")
    args = parser.parse_args(argv)
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

    if settings.gemini_api_key is None:
        logger.error("GEMINI_API_KEY is not set")
        return 2
    from google import genai

    client = genai.Client(api_key=settings.gemini_api_key.get_secret_value())
    works = load_works(settings.vector_store_path)
    wanted = [normalize_khmer(name) for name in args.work] if args.work else sorted(works)
    out_dir = args.data_dir / FOLDER / "key_points"
    out_dir.mkdir(parents=True, exist_ok=True)
    catalog_path = args.data_dir / "catalog.json"
    catalog = json.loads(catalog_path.read_text(encoding="utf-8")) if catalog_path.exists() else {}
    notes = args.notes.read_text(encoding="utf-8") if args.notes else ""

    report = []
    for name in wanted:
        if name not in works:
            logger.error("No indexed work named %s (have: %s)", name, ", ".join(sorted(works)))
            continue
        path = out_dir / f"{name}.md"
        if path.exists() and not args.force:
            logger.info("%s exists; --force to rewrite it", path)
            continue
        text = book_text(works[name])
        corrections = CORRECTIONS.get(name, {})
        note_block = "\n".join(
            [f"- OCR misreading: «{wrong}» is «{right}»." for wrong, right in corrections.items()]
            + ([notes] if notes else [])
        )
        prompt = (
            INSTRUCTIONS.format(name=name)
            + (f"\nNotes:\n{note_block}\n" if note_block else "")
            + f"\nFull text of the work ({len(works[name])} chunks):\n{text}"
        )
        logger.info("%s: %d chunks, %d characters of text", name, len(works[name]), len(text))
        sheet = generate(client, args.model, prompt).strip()
        for wrong, right in corrections.items():
            sheet = sheet.replace(wrong, right)
        names = character_names(sheet)
        missing = unverified(names, "\n".join([text, *corrections.values()]))
        foreign = sorted(set(_FOREIGN_SCRIPT.findall(sheet)))
        path.write_text(sheet + "\n", encoding="utf-8")
        catalog[f"{FOLDER}/key_points/{path.name}"] = f"ចំណុចសំខាន់ៗ៖ រឿង{name} — អក្សរសាស្ត្រខ្មែរ"
        report.append((name, len(names), missing, foreign, path))
        logger.info("%s: %d characters listed, %d not found in the text -> %s", name, len(names), len(missing), path)

    catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=2), encoding="utf-8")
    for name, count, missing, foreign, path in report:
        print(json.dumps(
            {"work": name, "characters": count, "not_in_text": missing, "foreign_script": foreign,
             "sheet": str(path)},
            ensure_ascii=False,
        ))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
