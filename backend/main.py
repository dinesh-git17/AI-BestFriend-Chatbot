from pydantic import BaseModel
from backend.chatbot_gpt import Chatbot

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

app = FastAPI()

# ✅ Update CORS to allow the correct frontend URL
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://10.248.0.131:3000"
    ],  # Update this to match your frontend URL
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods
    allow_headers=["*"],  # Allow all headers
)


# ✅ Handle OPTIONS requests properly for preflight
@app.options("/{full_path:path}")
async def preflight_handler():
    return JSONResponse(content={}, status_code=200)


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
