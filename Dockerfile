FROM python:3.11-slim

# Evita que o Python gere arquivos .pyc e força o log em tempo real
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

WORKDIR /app

# Instala ferramentas essenciais do sistema
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copia o arquivo de requisitos
COPY requirements.txt .

# Instala as bibliotecas FORÇANDO a instalação global
RUN pip install --upgrade pip
RUN pip install --no-cache-dir uvicorn fastapi[all] sqlalchemy
RUN pip install --no-cache-dir -r requirements.txt

# Copia todo o resto do projeto
COPY . .

EXPOSE 8000

# Usa o caminho absoluto para o interpretador do container
CMD ["python3", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]