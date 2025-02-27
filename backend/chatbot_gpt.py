import openai
from config import OPENAI_API_KEY


class Chatbot:
    def __init__(self):
        """Initializes OpenAI API client and conversation history."""
        self.client = openai.OpenAI(api_key=OPENAI_API_KEY)

        # Define valid personalities
        self.valid_personalities = ["Friendly", "Funny", "Professional", "Supportive"]

        # Define personality instructions
        self.personality_instructions = {
            "Friendly": "You are a friendly AI best friend. Use warm and supportive language. Add emojis for engagement.",
            "Funny": "You are a humorous AI. Include jokes, light sarcasm, and playful banter.",
            "Professional": "You are a professional AI assistant. Provide structured, factual, and clear responses.",
            "Supportive": "You are an empathetic AI providing emotional support. Use compassionate language.",
        }

        # Store conversation history for each user
        self.conversations = {}

    def get_personality_instruction(self, personality: str) -> str:
        """Returns the instruction set for the given personality."""
        return self.personality_instructions.get(
            personality, self.personality_instructions["Friendly"]
        )

    def construct_prompt(self, personality: str) -> str:
        """Constructs a system prompt with formatting instructions for better readability."""
        instruction = self.get_personality_instruction(personality)
        return (
            f"{instruction}\n\n"
            "**FORMAT RESPONSE CLEARLY:**\n"
            "- **Use headings (`##`)** for sections.\n"
            "- **Use bullet points (`- `) to list ideas.**\n"
            "- **Use bold (`**bold**`)** for key points.**\n"
            "- **Ensure double line breaks (`\\n\\n`) for readability.**\n"
            "- **Include relevant emojis** to enhance the response.\n"
        )

    async def get_response_stream(
        self, user_input: str, personality: str, user_id: str
    ):
        """Fetches a response from OpenAI's Chat API using streaming and keeps conversation history."""
        try:
            # Ensure personality is valid
            if personality not in self.valid_personalities:
                personality = "Friendly"  # Default if invalid

            system_prompt = self.construct_prompt(personality)

            # Retrieve conversation history
            history = self.conversations.get(user_id, [])

            # Append new user input to history
            history.append({"role": "user", "content": user_input})

            # Keep only the last 10 messages to avoid exceeding token limits
            history = history[-10:]

            # Update stored history for the user
            self.conversations[user_id] = history

            response = self.client.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "system", "content": system_prompt}] + history,
                temperature=0.7,
                max_tokens=500,
                stream=True,  # Enables Streaming
            )

            # Stream the response chunk by chunk
            full_response = []
            for chunk in response:
                if hasattr(chunk, "choices") and chunk.choices:
                    first_choice = chunk.choices[0]
                    if hasattr(first_choice, "delta") and hasattr(
                        first_choice.delta, "content"
                    ):
                        content = first_choice.delta.content
                        if content:  # Filter out None values
                            full_response.append(content)
                            yield content

            # Store AI's response in history
            final_response = "".join(full_response).strip()
            if final_response:
                self.conversations[user_id].append(
                    {"role": "assistant", "content": final_response}
                )

        except openai.APIError:
            yield "⚠️ OpenAI API Error. Please try again later."

        except Exception:
            yield "⚠️ An error occurred while generating the response."
