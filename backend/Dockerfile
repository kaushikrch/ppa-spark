FROM python:3.11-slim
WORKDIR /app
COPY app /app/app
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r /app/requirements.txt
EXPOSE 8080
CMD ["bash","-lc","uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080}"]