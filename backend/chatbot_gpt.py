import openai
from backend.config import OPENAI_API_KEY


class Chatbot:
    def __init__(self):
        self.client = openai.OpenAI(api_key=OPENAI_API_KEY)

    def get_response(self, user_input):
        response = self.client.chat.completions.create(
            model="gpt-4o",  # Use GPT-4o instead of gpt-4
            messages=[
                {
                    "role": "system",
                    "content": "You are a friendly AI best friend who provides emotional support.",
                },
                {"role": "user", "content": user_input},
            ],
        )
        return response.choices[0].message.content
