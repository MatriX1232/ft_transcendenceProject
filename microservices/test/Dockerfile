FROM python:3.9-slim

RUN pip install requests

COPY test_service.py /app/test_service.py

CMD ["tail", "-f", "/dev/null"]

# CMD ["python", "/app/test_service.py"]