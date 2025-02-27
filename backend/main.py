import re
import redis
import uuid
from chatbot_gpt import Chatbot
from fastapi import FastAPI, HTTPException, Request, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from textblob import TextBlob
import os

app = FastAPI()

# ✅ Get Redis URL from Render environment variables
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")  # Default fallback
redis_client = redis.Redis.from_url(REDIS_URL, decode_responses=True)

# ✅ Rate Limiter (3 requests per second per user)
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

# ✅ Register Rate Limit Exception Handler
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ✅ Redis Cache Setup
redis_client = redis.Redis(host="localhost", port=6379, db=0, decode_responses=True)

# ✅ Allow frontend URLs
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://192.168.68.102:3000",
        "https://ai-best-friend-chatbot.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods
    allow_headers=["*"],  # Allow all headers
)


# ✅ Define request model
class ChatRequest(BaseModel):
    user_input: str
    personality: str = "Friendly"


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
        # ✅ Read JSON body safely
        json_data = await request.json()

        # ✅ Validate request fields
        if "user_input" not in json_data or "personality" not in json_data:
            raise HTTPException(
                status_code=400,
                detail="Missing `user_input` or `personality` in request.",
            )

        # ✅ Extract values
        user_input = json_data["user_input"].strip()
        personality = json_data.get("personality", "Friendly").strip()

        # ✅ Ensure `user_input` is not empty
        if not user_input:
            raise HTTPException(status_code=400, detail="User input cannot be empty.")

        # ✅ Validate personality
        valid_personalities = ["Friendly", "Funny", "Professional", "Supportive"]
        if personality not in valid_personalities:
            personality = "Friendly"  # ✅ Default if invalid

        # ✅ Sanitize Redis Key
        cache_key = sanitize_key(f"{user_id}:{personality}:{user_input.lower()}")

        # ✅ Check Redis Cache
        cached_response = redis_client.get(cache_key)
        if cached_response:
            return {"response": cached_response}

        # ✅ Sentiment Analysis to Adjust Response Tone
        sentiment_score = TextBlob(user_input).sentiment.polarity
        if sentiment_score < -0.5:
            personality = "Supportive"  # ✅ Switch if user is sad

        # ✅ Get response via streaming
        response_chunks = []
        async for chunk in bot.get_response_stream(user_input, personality, user_id):
            if chunk:
                response_chunks.append(chunk)

        # ✅ Combine response chunks
        full_response = "".join(response_chunks).strip()

        # ✅ Handle empty responses
        if not full_response:
            full_response = "⚠️ Sorry, I couldn't generate a response. Please try again."

        # ✅ Cache response (1 hour)
        redis_client.setex(cache_key, 3600, full_response)

        return {"response": full_response}

    except Exception:
        raise HTTPException(
            status_code=500,
            detail="⚠️ An unexpected error occurred. Please try again later.",
        )
