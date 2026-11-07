"""Characterises conftest.py's autouse fixture: the one that keeps the suite's own Settings() calls from
picking up whatever AUTH_VERIFY_URL, CORS_ORIGINS, API keys, etc. the shell running pytest happens to
export -- which is exactly what Render's own production shell does, since those are its real settings.
Run with:  uv run pytest src/tests/test_conftest.py"""
from src.tests.conftest import _SETTINGS_ENV_NAMES


def test_the_two_variables_that_broke_in_renders_own_shell_are_covered():
    # Breaks if: this set stops covering AUTH_VERIFY_URL or CORS_ORIGINS, and the suite goes back to
    # passing on a laptop with a clean shell while failing the moment it runs on Render, for reasons that
    # have nothing to do with the code (31 failures were exactly this, on 2026-11-07).
    assert "AUTH_VERIFY_URL" in _SETTINGS_ENV_NAMES
    assert "CORS_ORIGINS" in _SETTINGS_ENV_NAMES


def test_every_field_on_settings_is_covered_by_name_not_a_hand_picked_list():
    # Breaks if: the fixture goes back to a hard-coded list of "risky" variables, so a brand-new Settings
    # field (an API key, say) is forgotten and leaks from the real environment the next time this is run
    # somewhere that has it set.
    from src.config import Settings

    assert _SETTINGS_ENV_NAMES == {name.upper() for name in Settings.model_fields}
    assert len(_SETTINGS_ENV_NAMES) > 20  # sanity: Settings has many fields; this isn't an empty set
