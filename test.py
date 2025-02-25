import openai
from backend.config import OPENAI_API_KEY

openai.api_key = OPENAI_API_KEY

try:
    models = openai.models.list()
    print("✅ Your API key is working! Available models:", [m.id for m in models.data])
except openai.OpenAIError as e:
    print("❌ Error:", e)
