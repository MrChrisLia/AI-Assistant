import requests

response = requests.post(
    "http://localhost:11434/api/generate",
    json={
        "model": "qwen3.5:4b",
        "prompt": "Explain SQL injection simply"
    }
)

print(response.json()["response"])
