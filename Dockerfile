# FastAPI RAG server (src/api.py) for Render or any Docker host.
FROM ghcr.io/astral-sh/uv:python3.11-bookworm-slim

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PROJECT_ENVIRONMENT=/opt/venv \
    HF_HOME=/opt/hf-cache \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Dependencies first so code changes don't reinstall torch.
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

COPY . .

# No model is downloaded here: EMBEDDING_BACKEND=hashing needs none. When using
# sentence-transformers instead, pre-fetch it so cold starts don't:
#   RUN uv run --frozen --no-dev python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('intfloat/multilingual-e5-small')"

EXPOSE 8000
# Render sets PORT; default to 8000 elsewhere.
CMD ["sh", "-c", "uv run --frozen --no-dev uvicorn src.api:app --host 0.0.0.0 --port ${PORT:-8000}"]
