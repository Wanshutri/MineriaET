FROM python:3.10.17-alpine3.21

WORKDIR /app

COPY requirements.txt .

RUN apk add --no-cache gcc g++ musl-dev linux-headers libffi-dev

RUN pip install -r requirements.txt --no-cache-dir

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]