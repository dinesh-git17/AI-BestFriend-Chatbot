import re
import redis
import uuid
import openai
from chatbot_gpt import Chatbot
from fastapi import FastAPI, HTTPException, Request, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from textblob import TextBlob
from config_redis import REDIS_HOST, REDIS_PORT, REDIS_PASSWORD, REDIS_SSL
from config import OPENAI_API_KEY  # Ensure API key is securely imported

# ✅ Initialize Redis client with Upstash authentication
try:
    redis_client = redis.Redis(
        host=REDIS_HOST,
        port=int(REDIS_PORT),
        password=REDIS_PASSWORD,
        ssl=REDIS_SSL,
        decode_responses=True,
        socket_timeout=5,  # ✅ Timeout to prevent long waits if Redis is down
    )
    redis_client.ping()  # ✅ Test if Redis is reachable
except redis.RedisError as e:
    print("⚠️ Redis Connection Failed:", e)
    redis_client = None  # ✅ Fallback to no caching

app = FastAPI()
client = openai.OpenAI(api_key=OPENAI_API_KEY)

# ✅ Rate Limiter (3 requests per second per user)
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

# ✅ Register Rate Limit Exception Handler
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ✅ Allow frontend URLs
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://ai-best-friend-chatbot.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ✅ Define request models
class ChatRequest(BaseModel):
    user_input: str
    personality: str = "Friendly"


class TitleRequest(BaseModel):
    messages: list


bot = Chatbot()


@app.get("/")
def home():
    return {"message": "AI Best Friend Chatbot API"}


# ✅ Helper function: Sanitize Redis Keys
def sanitize_key(key: str) -> str:
    """Ensure Redis key is valid by removing special characters."""
    return re.sub(r"[^a-zA-Z0-9:_-]", "_", key)


@app.post("/chat/")
@limiter.limit("3 per second")
async def chat(request: Request, user_id: str = Header(default=str(uuid.uuid4()))):
    try:
        json_data = await request.json()

        if "user_input" not in json_data or "personality" not in json_data:
            raise HTTPException(
                status_code=400,
                detail="Missing `user_input` or `personality` in request.",
            )

        user_input = json_data["user_input"].strip()
        personality = json_data.get("personality", "Friendly").strip()

        if not user_input:
            raise HTTPException(status_code=400, detail="User input cannot be empty.")

        valid_personalities = ["Friendly", "Funny", "Professional", "Supportive"]
        if personality not in valid_personalities:
            personality = "Friendly"

        cache_key = sanitize_key(f"{user_id}:{personality}:{user_input.lower()}")

        if redis_client:
            cached_response = redis_client.get(cache_key)
            if cached_response:
                return {"response": cached_response}

        # ✅ Sentiment Analysis to Adjust Response Tone
        sentiment_score = TextBlob(user_input).sentiment.polarity
        if sentiment_score < -0.5:
            personality = "Supportive"

        response_chunks = []
        async for chunk in bot.get_response_stream(user_input, personality, user_id):
            if chunk:
                response_chunks.append(chunk)

        full_response = "".join(response_chunks).strip()
        if not full_response:
            full_response = "⚠️ Sorry, I couldn't generate a response. Please try again."

        if redis_client:
            redis_client.setex(cache_key, 3600, full_response)

        return {"response": full_response}

    except Exception:
        raise HTTPException(
            status_code=500,
            detail="⚠️ An unexpected error occurred. Please try again later.",
        )


# ✅ NEW ENDPOINT: Generate a Chat Title Based on Messages
@app.post("/generate-chat-title/")
async def generate_chat_title(request: TitleRequest):
    try:
        if not OPENAI_API_KEY:
            raise HTTPException(status_code=500, detail="Missing OpenAI API Key.")

        messages = request.messages
        if not messages or len(messages) == 0:
            raise HTTPException(status_code=400, detail="No messages provided.")

        # ✅ Filter only user messages
        user_messages = [msg for msg in messages if msg.get("sender") == "You"]

        # ✅ If fewer than 2 user messages, return default title
        if len(user_messages) < 2:
            return {"title": "New Chat"}

        # ✅ Take the first two user messages for title generation
        selected_messages = user_messages[:2]

        # ✅ Use Redis caching for title generation
        chat_key = sanitize_key(f"chat_title:{hash(str(selected_messages))}")

        if redis_client:
            cached_title = redis_client.get(chat_key)
            if cached_title:
                return {"title": cached_title}

        system_prompt = (
            "Generate a short, engaging chat title based on the first two user messages. "
            "Avoid generic titles and keep it under 5 words."
        )

        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "system", "content": system_prompt}]
            + [
                {"role": "user", "content": msg.get("text", "")}
                for msg in selected_messages
            ],
            temperature=0.5,
            max_tokens=10,
        )

        chat_title = (
            response.choices[0].message.content.strip()
            if response.choices[0].message.content
            else "New Chat"
        )

        if redis_client:
            redis_client.setex(chat_key, 86400, chat_title)

        return {"title": chat_title}

    except openai.OpenAIError as e:
        print("OpenAI API Error:", str(e))
        raise HTTPException(
            status_code=500, detail="⚠️ OpenAI API Error. Try again later."
        )

    except Exception as e:
        print("Error generating chat title:", str(e))
        raise HTTPException(status_code=500, detail="Failed to generate chat title.")
