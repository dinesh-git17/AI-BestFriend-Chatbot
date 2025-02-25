"use client";
export const dynamic = "force-dynamic"; // Ensure SSR for dynamic updates

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { FaPaperPlane, FaRobot } from "react-icons/fa";

export default function Home() {
  const [messages, setMessages] = useState<{ sender: string; text: string }[]>(
    () => {
      // Load messages from localStorage or start with a welcome message
      if (typeof window !== "undefined") {
        const savedMessages = localStorage.getItem("chatHistory");
        return savedMessages
          ? JSON.parse(savedMessages)
          : [
              {
                sender: "Echo",
                text: "Hey there! 😊 I'm Echo, your AI best friend. I'm here to chat, listen, and support you anytime! 💙",
              },
            ];
      }
      return [];
    }
  );

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest message smoothly
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("chatHistory", JSON.stringify(messages));
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { sender: "You", text: input };
    setMessages([...messages, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("http://10.248.0.131:8000/chat/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_input: input }),
      });

      const data = await response.json();
      setMessages((prev) => [...prev, { sender: "Echo", text: data.response }]);
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((prev) => [
        ...prev,
        { sender: "Echo", text: "Oops! Something went wrong." },
      ]);
    }

    setLoading(false);
  };

  // Function to manually reset chat (if needed)
  const clearChat = () => {
    setMessages([
      {
        sender: "Echo",
        text: "Hey there! 😊 I'm Echo, your AI best friend. I'm here to chat, listen, and support you anytime! 💙",
      },
    ]);
    localStorage.removeItem("chatHistory");
  };

  return (
    <section className="relative w-full h-screen flex flex-col bg-[#0F0F1A] text-white font-poppins overflow-hidden">
      {/* Fixed Header (Welcoming & Subtle) */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full bg-[#181824] py-4 px-6 text-center fixed top-0 z-50 shadow-md"
      >
        <h1 className="text-3xl md:text-4xl font-bold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-[#a78bfa] via-[#f472b6] to-[#3b82f6] animate-subtle-glow flex items-center justify-center gap-2">
          <FaRobot className="text-4xl md:text-5xl text-blue-400" /> Welcome to
          Echo
        </h1>
        <p className="text-base md:text-lg text-gray-300 mt-2">
          Your AI companion, always here to chat 💙
        </p>
      </motion.div>

      {/* Chatbox Wrapper as a Card (No Overlap) */}
      <div className="flex flex-col flex-grow pt-32 items-center pb-6">
        <div className="w-full max-w-2xl bg-[#1e1e2e] p-6 rounded-xl shadow-lg flex flex-col flex-grow mt-6">
          {/* Chat Messages (Scrollable & No Overflow) */}
          <div
            ref={chatContainerRef}
            className="flex-grow h-[calc(100vh-20rem)] overflow-y-auto overflow-x-hidden space-y-3 scrollbar-thin scrollbar-track-[#1e1e2e] scrollbar-thumb-[#6a11cb] scrollbar-thumb-rounded-full p-2 pr-3"
          >
            {messages.map((msg, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className={`flex ${
                  msg.sender === "You" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`px-4 py-2 rounded-2xl shadow-lg max-w-[75%] text-base leading-relaxed ${
                    msg.sender === "You"
                      ? "bg-gradient-to-r from-[#6a11cb] to-[#2575fc] text-white self-end"
                      : "bg-[#252532] text-gray-300 self-start"
                  }`}
                >
                  <p>
                    <span className="font-semibold">{msg.sender}:</span>{" "}
                    {msg.text}
                  </p>
                </div>
              </motion.div>
            ))}
            {loading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ repeat: Infinity, duration: 1 }}
                className="text-gray-400 text-base mt-2"
              >
                Echo is typing<span className="animate-pulse">...</span>
              </motion.div>
            )}
          </div>

          {/* Chat Input Inside the Chatbox (More Bottom Padding) */}
          <div className="w-full mt-4 pb-2">
            <div className="flex w-full items-center bg-[#252532] rounded-lg shadow-md border border-gray-600 px-3 py-2">
              <input
                type="text"
                className="flex-grow p-3 text-white bg-transparent outline-none text-base placeholder-gray-400"
                placeholder="Type a message..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              />
              <motion.button
                onClick={sendMessage}
                className="bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 text-white p-3 rounded-full shadow-md flex items-center justify-center transition-all duration-200 hover:scale-110 hover:shadow-lg active:scale-95"
              >
                <FaPaperPlane className="text-lg" />
              </motion.button>
            </div>
            <button
              onClick={clearChat}
              className="mt-3 text-sm text-gray-400 hover:text-white transition"
            >
              Start a new chat
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
