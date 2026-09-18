# FastAPI RAG server (src/api.py) for Render or any Docker host.
FROM ghcr.io/astral-sh/uv:python3.11-bookworm-slim

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PROJECT_ENVIRONMENT=/opt/venv \
    HF_HOME=/opt/hf-cache \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Dependencies first so code changes don't reinstall torch.
# --extra cpu is required, not optional: torch and torchvision resolve from the
# CPU index only through that extra. Without it they come from PyPI, whose Linux
# wheel bundles ~2.5 GB of CUDA libraries and will not fit the free instance.
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project --extra cpu

# Bake the embedding model into the image so a cold start warms it from disk
# instead of pulling ~470 MB from HuggingFace on the first question -- and so a
# HuggingFace outage cannot stop the server booting. Drop this line if you
# switch back to EMBEDDING_BACKEND=hashing, which loads no model at all.
RUN uv run --frozen --no-dev --extra cpu python -c \
    "from sentence_transformers import SentenceTransformer; SentenceTransformer('intfloat/multilingual-e5-small')"

COPY . .

EXPOSE 8000
# Render sets PORT; default to 8000 elsewhere.
CMD ["sh", "-c", "uv run --frozen --no-dev --extra cpu uvicorn src.api:app --host 0.0.0.0 --port ${PORT:-8000}"]
