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

# Surya 2, installed but off like Kiri: IMAGE_OCR_ENGINES in render.yaml leaves
# it out, and it only starts when listed there. surya-ocr pins transformers,
# huggingface-hub and openai to versions this project cannot share, so it gets
# its own venv (SURYA_PYTHON=/opt/surya/bin/python), with CPU torch for the same
# reason as above. It serves its model with llama.cpp's llama-server, which
# links against OpenMP (libgomp1). The GGUF model (~1.5 GB) is baked in and
# pointed at directly, so the first photo does not download it.
ARG LLAMA_CPP_BUILD=b11192
ARG SURYA_OCR_VERSION=0.22.1
ENV SURYA_GGUF_LOCAL_MODEL_PATH=/opt/surya-models/surya-2.gguf \
    SURYA_GGUF_LOCAL_MMPROJ_PATH=/opt/surya-models/surya-2-mmproj.gguf
RUN apt-get update \
    && apt-get install -y --no-install-recommends libgomp1 libstdc++6 \
    && rm -rf /var/lib/apt/lists/*
ADD https://github.com/ggml-org/llama.cpp/releases/download/${LLAMA_CPP_BUILD}/llama-${LLAMA_CPP_BUILD}-bin-ubuntu-x64.tar.gz /tmp/llama.tar.gz
RUN mkdir -p /opt/llama.cpp \
    && tar -xzf /tmp/llama.tar.gz -C /opt/llama.cpp --strip-components=1 \
    && rm /tmp/llama.tar.gz \
    && /opt/llama.cpp/llama-server --version
RUN uv venv --python 3.11 /opt/surya \
    && uv pip install --python /opt/surya/bin/python --no-cache \
        --index-url https://download.pytorch.org/whl/cpu "torch>=2.7" "torchvision>=0.20" \
    && uv pip install --python /opt/surya/bin/python --no-cache "surya-ocr==${SURYA_OCR_VERSION}" \
    && /opt/surya/bin/python -c \
        "from huggingface_hub import hf_hub_download as get; [get('datalab-to/surya-ocr-2-gguf', f, local_dir='/opt/surya-models') for f in ('surya-2.gguf', 'surya-2-mmproj.gguf')]" \
    && rm -rf /opt/surya-models/.cache

COPY . .

EXPOSE 8000
# Render sets PORT; default to 8000 elsewhere.
CMD ["sh", "-c", "uv run --frozen --no-dev --extra cpu uvicorn src.api:app --host 0.0.0.0 --port ${PORT:-8000}"]
