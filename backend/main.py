from pydantic import BaseModel
from chatbot_gpt import Chatbot
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
from openai import OpenAI

app = FastAPI()

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


# ✅ Handle OPTIONS requests properly for preflight
@app.options("/{full_path:path}")
async def preflight_handler():
    return JSONResponse(content={}, status_code=200)


# Load OpenAI API Key
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=OPENAI_API_KEY)

bot = Chatbot()


# ✅ Define request model with default personality
class ChatRequest(BaseModel):
    user_input: str
    personality: str = "Friendly"


@app.get("/")
def home():
    return {"message": "AI Best Friend Chatbot API"}


# ✅ POST /chat/ endpoint (Main Chatbot API)
@app.post("/chat/")
def chat(request: ChatRequest):
    try:
        valid_personalities = ["Friendly", "Funny", "Professional", "Supportive"]
        if request.personality not in valid_personalities:
            request.personality = "Friendly"  # ✅ Default if invalid

        response = bot.get_response(request.user_input, request.personality)
        return {"response": response}

    except Exception:
        raise HTTPException(status_code=500, detail="Internal Server Error")


# ✅ GET /chat/ for testing (Optional)
@app.get("/chat/")
def chat_get(user_input: str, personality: str = "Friendly"):
    try:
        valid_personalities = ["Friendly", "Funny", "Professional", "Supportive"]
        if personality not in valid_personalities:
            personality = "Friendly"

        response = bot.get_response(user_input, personality)
        return {"response": response}

    except Exception:
        raise HTTPException(status_code=500, detail="Internal Server Error")
