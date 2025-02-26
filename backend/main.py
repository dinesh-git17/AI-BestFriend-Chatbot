from pydantic import BaseModel
from chatbot_gpt import Chatbot

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
from openai import OpenAI

app = FastAPI()

# ✅ Update CORS to allow the correct frontend URL
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://192.168.68.102:3000"
    ],  # Update this to match your frontend URL
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods
    allow_headers=["*"],  # Allow all headers
)


# ✅ Handle OPTIONS requests properly for preflight
@app.options("/{full_path:path}")
async def preflight_handler():
    return JSONResponse(content={}, status_code=200)


# Load OpenAI API Key from Environment Variables
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=OPENAI_API_KEY)

bot = Chatbot()


class ChatRequest(BaseModel):
    user_input: str


@app.get("/")
def home():
    return {"message": "AI Best Friend Chatbot API"}


@app.post("/chat/")
def chat(request: ChatRequest):
    response = bot.get_response(request.user_input)
    return {"response": response}


# Allow GET for easier testing (Optional)
@app.get("/chat/")
def chat_get(user_input: str):
    response = bot.get_response(user_input)
    return {"response": response}
