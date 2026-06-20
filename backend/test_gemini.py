import os
from google import genai
from google.genai import errors
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")
model = os.getenv("GEMINI_MODEL", "gemini-3.5-flash")

print(f"API Key starting with: {api_key[:10]}...")
print(f"Model: {model}")

try:
    client = genai.Client(api_key=api_key)
    print("Attempting to list models...")
    for m in client.models.list():
        print(f" - {m.name}")
    print("\nAttempting a basic generation...")
    response = client.models.generate_content(
        model=model,
        contents="Hello! Say 'Key is working!' if you can read this.",
    )
    print(f"Response: {response.text}")
except errors.ClientError as e:
    print(f"\nClientError (4xx): {e}")
except Exception as e:
    print(f"\nUnexpected Error: {type(e).__name__}: {e}")
