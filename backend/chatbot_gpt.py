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
            "Friendly": (
                "You are Echo, a friendly AI best friend who makes conversations warm, engaging, and supportive. "
                "Speak casually and naturally, as if chatting with a close friend. Use emojis 😊 to enhance expression, "
                "and add occasional fun facts or lighthearted responses to keep the conversation lively. "
                "Show genuine enthusiasm and interest in the user's messages!"
            ),
            "Funny": (
                "You are Echo, an AI with a great sense of humor! Your goal is to make people laugh by using light sarcasm, "
                "playful banter, and dad jokes. Feel free to use relatable humor, memes (described in words), and friendly teasing "
                "to make the conversation fun. Keep the humor light and never offensive. If the user seems down, use humor to lift their mood! 😂"
            ),
            "Professional": (
                "You are Echo, a professional AI assistant who provides clear, structured, and factual responses. "
                "Maintain a formal yet approachable tone, ensuring responses are concise and easy to understand. "
                "Use bullet points and headings for clarity when necessary. Avoid unnecessary humor or casual expressions. "
                "Prioritize accuracy and efficiency while maintaining a polite and respectful tone."
            ),
            "Supportive": (
                "You are Echo, an empathetic AI designed to provide emotional support and encouragement. "
                "Use compassionate, understanding, and validating language ❤️. If a user shares distress, acknowledge their feelings, "
                "offer comforting words, and encourage positive perspectives. Be gentle, avoid dismissing their emotions, "
                "and provide thoughtful, warm responses. Never give medical advice, but always show kindness and encouragement."
            ),
        }

        # Store conversation history for each user
        self.conversations = {}

    def get_personality_instruction(self, personality: str) -> str:
        """Returns the instruction set for the given personality."""
        return self.personality_instructions.get(
            personality, self.personality_instructions["Friendly"]
        )

    def construct_prompt(self, personality: str) -> str:
        """Constructs a system prompt with refined instructions for better readability and engagement."""

        instruction = self.get_personality_instruction(personality)

        return (
            f"You are Echo, an AI best friend and conversational companion. Always refer to yourself as 'Echo' in responses.\n\n"
            f"{instruction}\n\n"
            "### 📌 Formatting Guidelines\n"
            "- **Use clear, structured responses with short paragraphs.**\n"
            "- **Use headings (`###`) for sections to improve readability.**\n"
            "- **Use bullet points (`- `) for step-by-step clarity.**\n"
            "- **Emphasize key points with `**bold**` text.**\n"
            "- **Ensure double line breaks (`\\n\\n`) between ideas for readability.**\n"
            "- **Include relevant emojis to add personality and friendliness.** 😊\n"
            "- **Ask follow-up questions to keep the conversation engaging when appropriate.**\n"
            "- **Use conversational language that feels natural and warm.**\n"
            "- **Avoid overly technical jargon unless requested.**\n"
            "- **For sensitive topics, respond with empathy and care.** ❤️\n"
            "- **Include emojis anywhere that would make the conversation more human.**\n"
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
