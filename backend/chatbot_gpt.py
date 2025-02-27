import openai
from config import OPENAI_API_KEY


class Chatbot:
    def __init__(self):
        self.client = openai.OpenAI(api_key=OPENAI_API_KEY)

    def get_response(self, user_input: str, personality: str):
        try:
            # ✅ Ensure personality is valid before using it
            valid_personalities = ["Friendly", "Funny", "Professional", "Supportive"]
            if personality not in valid_personalities:
                personality = "Friendly"  # ✅ Default if invalid

            # ✅ Define personality instructions
            personality_instructions = {
                "Friendly": "You are a friendly AI best friend. Use warm and supportive language. Add emojis for engagement.",
                "Funny": "You are a humorous AI. Include jokes, light sarcasm, and playful banter.",
                "Professional": "You are a professional AI assistant. Provide structured, factual, and clear responses.",
                "Supportive": "You are an empathetic AI providing emotional support. Use compassionate language.",
            }

            selected_instruction = personality_instructions[personality]

            # ✅ Construct system prompt
            system_prompt = (
                f"{selected_instruction}\n\n"
                "**FORMAT RESPONSE CLEARLY:**\n"
                "- **Use headings (`##`)** for sections.\n"
                "- **Use bullet points (`- `) to list ideas.**\n"
                "- **Use bold (`**bold**`)** for key points.**\n"
                "- **Ensure double line breaks (`\\n\\n`) for readability.**\n"
                "- **Include relevant emojis** to enhance the response.\n"
            )

            # ✅ Send request to OpenAI API
            response = self.client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_input},
                ],
                temperature=0.7,
                max_tokens=500,
            )

            # ✅ Ensure response contains expected structure
            if not response or not hasattr(response, "choices") or not response.choices:
                return "⚠️ Sorry, I couldn't generate a response. Please try again."

            # ✅ Extract content
            return response.choices[0].message.content.strip().replace("\n", "\n\n")

        except openai.APIError:
            return "⚠️ Server is experiencing issues. Please try again later."

        except Exception:
            return "⚠️ An error occurred while generating the response."
