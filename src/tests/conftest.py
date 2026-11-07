"""A test's `Settings(...)` is meant to mean exactly what the test wrote. Render's own process
environment sets real production values (AUTH_VERIFY_URL, CORS_ORIGINS, API keys, ...) for the live
coach server; pydantic-settings reads those from os.environ no matter what `_env_file` a test passes,
so a test that builds Settings() without a field explicitly overridden would silently pick up whatever
the shell happens to export instead of the test's own default. Before this fixture, that meant the
suite could pass on a laptop with a clean shell and fail -- for reasons that have nothing to do with the
code -- the moment it was run in Render's own shell, where those variables are set on purpose.

This clears every environment variable that names a Settings field before each test and puts it back
after, so the suite behaves the same wherever it runs: a laptop, CI, or Render's own shell.
"""
import os

import pytest

from src.config import Settings

_SETTINGS_ENV_NAMES = {name.upper() for name in Settings.model_fields}


@pytest.fixture(autouse=True)
def _no_ambient_settings_env(monkeypatch):
    for name in list(os.environ):
        if name.upper() in _SETTINGS_ENV_NAMES:
            monkeypatch.delenv(name, raising=False)
