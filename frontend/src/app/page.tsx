"use client";
export const dynamic = "force-dynamic"; // Ensure SSR for dynamic updates

import { useState, useEffect, useRef } from "react";
import PersonalitySelector from "@/components/PersonalitySelector";
import { motion } from "framer-motion";
import {
  FaPaperPlane,
  FaRobot,
  FaMicrophone,
  FaSun,
  FaMoon,
} from "react-icons/fa";

import { FiEdit, FiTrash, FiCheck } from "react-icons/fi";

// Voice Recognition Support
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }

  const SpeechRecognition: {
    prototype: SpeechRecognition;
    new (): SpeechRecognition;
  };

  const webkitSpeechRecognition: {
    prototype: SpeechRecognition;
    new (): SpeechRecognition;
  };

  interface SpeechRecognition {
    lang: string;
    interimResults: boolean;
    maxAlternatives: number;
    start(): void;
    stop(): void;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  }

  interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList;
  }

  interface SpeechRecognitionErrorEvent extends Event {
    error: string;
  }
}

export const startVoiceRecognition = (
  setInput: (value: string) => void,
  currentInput: string
) => {
  if (typeof window !== "undefined") {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Voice recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;

      // Fix: Concatenate transcript with current input and update it
      setInput(currentInput + " " + transcript);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error("Speech recognition error:", event.error);
    };

    recognition.start();
  } else {
    alert("Voice recognition is not supported in this browser.");
  }
};

export default function Home() {
  const [messages, setMessages] = useState<{ sender: string; text: string }[]>(
    []
  );

  const getGreeting = () => {
    const hour = new Date().getHours();
    return hour < 12
      ? "Good morning!"
      : hour < 18
      ? "Good afternoon!"
      : "Good evening!";
  };

  // Ensure localStorage is only accessed on the client
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("chatHistory");

      setMessages(
        saved
          ? JSON.parse(saved)
          : [
              {
                sender: "Echo",
                text: `${getGreeting()} 😊 I'm Echo, your AI best friend. I'm here to chat, listen, and support you anytime! 💙`,
              },
            ]
      );
    }
  }, []);

  const [input, setInput] = useState("");
  const [darkMode, setDarkMode] = useState(true);
  const [personality, setPersonality] = useState("Friendly");
  const chatContainerRef = useRef<HTMLDivElement>(null); // ✅ Add error state for network errors
  const inputRef = useRef<HTMLInputElement>(null);
  const [typing, setTyping] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editedMessage, setEditedMessage] = useState("");
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // ✅ Place this function inside Home() (below useEffect)
  const startVoiceRecognition = (
    setInput: (value: string) => void,
    currentInput: string
  ) => {
    if (!isClient) return; // Prevents SSR issues

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Voice recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      setInput(currentInput + " " + transcript);
    };

    // ✅ Type guard to check if event is a SpeechRecognitionErrorEvent
    function isSpeechRecognitionErrorEvent(
      event: Event
    ): event is SpeechRecognitionErrorEvent {
      return "error" in event;
    }

    recognition.onerror = (event: Event) => {
      if (isSpeechRecognitionErrorEvent(event)) {
        if (event.error === "aborted") {
          return; // ✅ Ignore aborted errors
        }
        console.error("Speech recognition error:", event.error);
      } else {
        console.error("Unknown speech recognition error:", event);
      }
    };

    recognition.start();
  };

  // Auto-scroll to latest message smoothly
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages.length]);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("chatHistory", JSON.stringify(messages));
    }
  }, [messages]);

  // Toggle dark mode
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute(
        "data-theme",
        darkMode ? "dark" : "light"
      );
    }
  }, [darkMode]);

  const sendMessage = async (presetText?: string) => {
    const textToSend = presetText || input.trim();
    if (!textToSend) return;

    setMessages((prev) => [...prev, { sender: "You", text: textToSend }]);
    setInput("");
    setTyping(true); // ✅ Show "Echo is typing..." before fetching

    // ✅ Prevent multiple error messages by checking the last Echo message
    const lastMessage = messages[messages.length - 1]?.text || "";
    const alreadyHasError = lastMessage.includes("⚠️");

    // ✅ Check if the user is offline and immediately show ONE error message
    if (!navigator.onLine) {
      setTyping(false); // ✅ Remove typing indicator
      if (!alreadyHasError) {
        setMessages((prev) => [
          ...prev,
          {
            sender: "Echo",
            text: "⚠️ No internet connection. Please check your network.",
          },
        ]);
      }
      return;
    }

    let timeoutTriggered = false; // ✅ Track if timeout already added an error
    const controller = new AbortController(); // ✅ Create an AbortController
    const timeout = setTimeout(() => {
      timeoutTriggered = true;
      controller.abort(); // ✅ Cancel the request if it's taking too long
      setTyping(false); // ✅ Remove typing indicator
      if (!alreadyHasError) {
        setMessages((prev) => [
          ...prev,
          {
            sender: "Echo",
            text: "⚠️ Server is not responding. Try again later.",
          },
        ]);
      }
    }, 3000); // ✅ Faster timeout (3 seconds)

    try {
      const response = await fetch(`${API_URL}/chat/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_input: textToSend, personality }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch response");
      }

      clearTimeout(timeout); // ✅ Clear timeout if response arrives in time

      const data = await response.json();
      setTyping(false); // ✅ Remove typing indicator
      setMessages((prev) => [...prev, { sender: "Echo", text: data.response }]);
    } catch (error) {
      console.error("Error sending message:", error);

      setTyping(false); // ✅ Remove typing indicator
      // ✅ Ensure only ONE error message appears & avoid sending both timeout and fetch errors
      if (!alreadyHasError && !timeoutTriggered) {
        setMessages((prev) => [
          ...prev,
          { sender: "Echo", text: "⚠️ Unable to connect. Please try again." },
        ]);
      }

      clearTimeout(timeout); // ✅ Ensure timeout doesn't trigger after fetch fails
    }
  };

  const clearChat = () => {
    const greetingMessage = `${getGreeting()} 😊 I'm Echo, your AI best friend. I'm here to chat, listen, and support you anytime! 💙`;

    console.log("Clearing chat with greeting:", greetingMessage); // ✅ Debugging log

    setMessages([
      {
        sender: "Echo",
        text: greetingMessage,
      },
    ]);

    localStorage.removeItem("chatHistory");
  };

  const handleEditMessage = (index: number) => {
    setEditingMessageId(index.toString()); // Store the message ID being edited
    setEditedMessage(messages[index].text); // Pre-fill input with existing message text
  };

  const handleSaveEdit = (index: number) => {
    if (!editedMessage.trim()) return; // Prevent empty messages

    setMessages((prev) =>
      prev.map((msg, i) =>
        i === index ? { ...msg, text: editedMessage } : msg
      )
    );

    setEditingMessageId(null); // Exit edit mode
    setEditedMessage("");
  };

  const handleDeleteMessage = (index: number) => {
    setMessages((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <section className="relative w-full h-screen flex flex-col items-center justify-center bg-[#0F0F1A] text-white font-poppins overflow-hidden">
      {/* Dark Mode Toggle */}
      <button
        onClick={() => setDarkMode((prev) => !prev)}
        className="fixed top-6 right-6 z-[60] bg-gray-800 p-1 rounded-full hover:bg-gray-700 transition shadow-lg"
        style={{ transform: "translateY(15px)" }} // ✅ Moves it slightly down
      >
        {darkMode ? (
          <FaSun className="text-yellow-400 text-m" />
        ) : (
          <FaMoon className="text-gray-300 text-m" />
        )}
      </button>

      {/* Title Section - Reduced Size */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full text-center fixed top-0 z-50 py-4 bg-[#181824] shadow-md"
      >
        <motion.h1
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="text-3xl md:text-4xl font-extrabold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-[#a78bfa] via-[#f472b6] to-[#3b82f6] flex items-center justify-center gap-2"
        >
          <FaRobot className="text-4xl md:text-5xl text-blue-400 animate-pulse" />
          Welcome to <span className="text-white">Echo</span>
        </motion.h1>
        <p className="text-base md:text-lg text-gray-300 mt-1 tracking-wide">
          Your friendly AI companion, always here for you 💙
        </p>
      </motion.div>

      {/* Chatbox Wrapper - Adjusted to Fit More Space */}
      <div
        className="w-full max-w-5xl bg-custom bg-opacity-80 backdrop-blur-lg p-6 rounded-xl shadow-lg flex flex-col border border-purple-500/50 hover:border-purple-600 transition mx-auto"
        style={{
          height: "calc(100vh - 6rem)", // ✅ Adjusted dynamically to match the smaller title
          maxHeight: "80vh", // ✅ Prevents overflow
          minHeight: "600px", // ✅ Ensures proper structure
          marginTop: "6rem", // ✅ Moves the chatbox higher
        }}
      >
        {/* Chat Messages - Prevents Overflow & Keeps Messages Inside */}
        <div
          ref={chatContainerRef}
          className="flex flex-col justify-start flex-grow overflow-y-auto space-y-3 p-3 scrollbar-thin scrollbar-track-[#1e1e2e] scrollbar-thumb-[#6a11cb] scrollbar-thumb-rounded-full w-full"
          style={{ maxHeight: "100%" }} // ✅ Ensures messages don't push outside the card
        >
          {messages.map((msg, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.9 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className={`flex gap-2 items-center ${
                msg.sender === "You" ? "justify-end" : "justify-start"
              }`}
            >
              {/* Buttons for User Messages - Only if Sender is "You" */}
              {msg.sender === "You" && (
                <div className="flex items-center gap-1 opacity-0 hover:opacity-100 transition-opacity duration-300">
                  {editingMessageId === index.toString() ? (
                    <motion.button
                      onClick={() => handleSaveEdit(index)}
                      whileHover={{ scale: 1.15 }}
                      whileTap={{ scale: 0.9 }}
                      className="p-1.5 rounded-lg transition duration-300"
                    >
                      <FiCheck
                        className="text-gray-400 hover:text-green-400 transition duration-300"
                        size={16}
                      />
                    </motion.button>
                  ) : (
                    <motion.button
                      onClick={() => handleEditMessage(index)}
                      whileHover={{ scale: 1.15 }}
                      whileTap={{ scale: 0.9 }}
                      className="p-1.5 rounded-lg transition duration-300"
                    >
                      <FiEdit
                        className="text-gray-400 hover:text-yellow-400 transition duration-300"
                        size={16}
                      />
                    </motion.button>
                  )}
                  <motion.button
                    onClick={() => handleDeleteMessage(index)}
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.9 }}
                    className="p-1.5 rounded-lg transition duration-300"
                  >
                    <FiTrash
                      className="text-gray-400 hover:text-red-400 transition duration-300"
                      size={16}
                    />
                  </motion.button>
                </div>
              )}

              {/* AI Avatar (Only for Echo) */}
              {msg.sender !== "You" && (
                <div className="w-8 h-8 flex items-center justify-center rounded-full bg-[#3b82f6] text-white text-lg">
                  🤖
                </div>
              )}

              {/* Message Bubble */}
              <div
                className={`px-4 py-3 rounded-2xl shadow-lg max-w-[75%] text-base leading-relaxed ${
                  msg.sender === "You"
                    ? "bg-gradient-to-r from-[#6a11cb] to-[#2575fc] text-white"
                    : "bg-[#252532] text-gray-300 shadow-lg shadow-blue-500/10"
                }`}
              >
                {editingMessageId === index.toString() ? (
                  <input
                    type="text"
                    value={editedMessage}
                    onChange={(e) => setEditedMessage(e.target.value)}
                    className="w-full bg-transparent text-white outline-none border-b border-gray-400 p-1"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveEdit(index);
                    }}
                  />
                ) : (
                  <p>{msg.text}</p>
                )}
              </div>
            </motion.div>
          ))}

          {/* ✅ Echo is Typing Animation */}
          {typing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{
                duration: 0.5,
                repeat: Infinity,
                repeatType: "reverse",
              }}
              className="flex items-center gap-2 text-gray-400 italic self-start"
            >
              {/* AI Avatar */}
              <div className="w-8 h-8 flex items-center justify-center rounded-full bg-[#3b82f6] text-white text-lg">
                🤖
              </div>

              {/* Typing Indicator */}
              <div className="px-4 py-2 rounded-2xl shadow-lg max-w-fit bg-[#252532] text-gray-300">
                Echo is typing...
              </div>
            </motion.div>
          )}
        </div>

        {/* Chat Input Section */}
        <div className="w-full mt-4 pb-2 flex items-center bg-[#252532] rounded-lg shadow-md border border-gray-600 px-3 py-2">
          <button
            onClick={() => startVoiceRecognition(setInput, input)}
            className="p-3 bg-gray-700 rounded-full mr-2 hover:bg-gray-600"
          >
            <FaMicrophone className="text-white" />
          </button>
          <input
            ref={inputRef}
            type="text"
            className="flex-grow p-3 text-white bg-transparent outline-none text-base placeholder-gray-400"
            placeholder="Type a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                sendMessage();
              }
            }}
          />
          <motion.button
            onClick={() => sendMessage()}
            className="bg-purple-500 p-3 rounded-full shadow-md hover:scale-110"
          >
            <FaPaperPlane className="text-lg text-white" />
          </motion.button>
        </div>
        <div className="flex items-center w-full px-3 mt-4">
          {/* ✅ Move Personality Selector Further Left */}
          <div className="w-[30%] transform -translate-x-4">
            <PersonalitySelector
              personality={personality}
              setPersonality={(newPersonality: string) => {
                setPersonality(
                  newPersonality as
                    | "Friendly"
                    | "Funny"
                    | "Professional"
                    | "Supportive"
                );

                const personalityResponses: Record<string, string> = {
                  Friendly:
                    "😊 I'm feeling extra warm and welcoming! Let's have a fun, friendly chat with lots of positive vibes. 💙",
                  Funny:
                    "😂 Get ready for some jokes and witty comebacks! I'll keep the chat lighthearted and fun. 😆",
                  Professional:
                    "💼 I'm now in professional mode! Expect clear, concise, and informative responses—like a reliable assistant at your service. 📊",
                  Supportive:
                    "💙 I'm here to listen, encourage, and support you! Whatever you're going through, I'm here to help. 🤗",
                };

                if (
                  personalityResponses[
                    newPersonality as keyof typeof personalityResponses
                  ]
                ) {
                  setMessages((prev) => [
                    ...prev,
                    {
                      sender: "Echo",
                      text: `✨ You've switched to ${newPersonality} mode! ${
                        personalityResponses[
                          newPersonality as keyof typeof personalityResponses
                        ]
                      }`,
                    },
                  ]);
                }
              }}
            />
          </div>

          <motion.span
            onClick={clearChat}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="text-xs text-gray-400 cursor-pointer opacity-80 hover:underline transition-all"
            style={{
              marginLeft: "auto", // Aligns to the right
            }}
          >
            Clear Chat
          </motion.span>
        </div>
      </div>
    </section>
  );
}
