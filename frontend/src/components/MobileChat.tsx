"use client";

import { useState, useEffect, useRef } from "react";
import { FaPaperPlane, FaMicrophone, FaRobot } from "react-icons/fa";
import { FiEdit, FiTrash, FiCheck } from "react-icons/fi";
import PersonalitySelector from "@/components/PersonalitySelector";
import { motion } from "framer-motion";

interface MobileChatProps {
  messages: { sender: string; text: string }[];
  setMessages: React.Dispatch<
    React.SetStateAction<{ sender: string; text: string }[]>
  >;
  input: string;
  setInput: React.Dispatch<React.SetStateAction<string>>;
  sendMessage: () => void;
  clearChat: () => void;
  personality: string;
  setPersonality: (personality: string) => void;
  startVoiceRecognition: (
    setInput: (value: string) => void,
    currentInput: string
  ) => void;
  editingMessageId: string | null;
  setEditingMessageId: React.Dispatch<React.SetStateAction<string | null>>;
  editedMessage: string;
  setEditedMessage: React.Dispatch<React.SetStateAction<string>>;
  handleEditMessage: (index: number) => void;
  handleSaveEdit: (index: number) => void;
  handleDeleteMessage: (index: number) => void;
  typing: boolean;
}

export default function MobileChat({
  messages,
  setMessages,
  input,
  setInput,
  sendMessage,
  clearChat,
  personality,
  setPersonality,
  startVoiceRecognition,
  editingMessageId,
  setEditingMessageId,
  editedMessage,
  setEditedMessage,
  handleEditMessage,
  handleSaveEdit,
  handleDeleteMessage,
  typing,
}: MobileChatProps) {
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  return (
    <section className="relative w-full h-dvh max-w-screen flex flex-col bg-[#0F0F1A] text-white font-poppins overflow-hidden pt-[env(safe-area-inset-top)]">
      {/* Mobile Chat UI */}
      <div className="flex flex-col flex-grow w-full h-full max-w-[450px] bg-custom p-4 rounded-t-xl shadow-lg border border-purple-500/50 mx-auto pb-[env(safe-area-inset-bottom)]">
        {/* Title Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center w-full py-3 bg-[#181824] shadow-md rounded-t-xl"
        >
          <h1 className="text-xl font-bold flex items-center justify-center gap-2">
            <FaRobot className="text-blue-400 text-2xl animate-pulse" />
            Echo Chat
          </h1>
        </motion.div>

        {/* Chat Messages (Only This Section Should Scroll) */}
        <div
          ref={chatContainerRef}
          className="flex flex-col flex-grow overflow-y-auto space-y-2 p-3 scrollbar-thin scrollbar-thumb-[#6a11cb] scrollbar-thumb-rounded-full"
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
              {/* Buttons for Editing & Deleting Messages */}
              {msg.sender === "You" && (
                <div className="flex items-center gap-1 opacity-0 hover:opacity-100 transition-opacity duration-300">
                  {editingMessageId === index.toString() ? (
                    <motion.button
                      onClick={() => {
                        if (editedMessage.trim()) {
                          handleSaveEdit(index);
                        }
                      }}
                      whileHover={{ scale: 1.15 }}
                      whileTap={{ scale: 0.9 }}
                      className="p-1 rounded-lg"
                    >
                      <FiCheck className="text-green-400" size={14} />
                    </motion.button>
                  ) : (
                    <motion.button
                      onClick={() => {
                        setEditingMessageId(index.toString());
                        setEditedMessage(messages[index].text);
                      }}
                      whileHover={{ scale: 1.15 }}
                      whileTap={{ scale: 0.9 }}
                      className="p-1 rounded-lg"
                    >
                      <FiEdit className="text-yellow-400" size={14} />
                    </motion.button>
                  )}
                  <motion.button
                    onClick={() => handleDeleteMessage(index)}
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.9 }}
                    className="p-1 rounded-lg"
                  >
                    <FiTrash className="text-red-400" size={14} />
                  </motion.button>
                </div>
              )}

              {/* Message Bubble */}
              <div
                className={`px-3 py-2 rounded-2xl max-w-[85%] text-base leading-relaxed ${
                  msg.sender === "You"
                    ? "bg-gradient-to-r from-[#6a11cb] to-[#2575fc] text-white"
                    : "bg-[#252532] text-gray-300"
                }`}
              >
                <p>{msg.text}</p>
              </div>
            </motion.div>
          ))}

          {/* Echo is Typing Indicator */}
          {typing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{
                duration: 0.5,
                repeat: Infinity,
                repeatType: "reverse",
              }}
              className="text-gray-400 italic self-start"
            >
              Echo is typing...
            </motion.div>
          )}
        </div>

        {/* Chat Input */}
        <div className="w-full flex items-center bg-[#252532] p-3 rounded-b-xl">
          <button
            onClick={() => startVoiceRecognition(setInput, input)}
            className="p-3 bg-gray-700 rounded-full mr-2 hover:bg-gray-600"
          >
            <FaMicrophone className="text-white" />
          </button>
          <input
            ref={inputRef}
            type="text"
            className="flex-grow p-2 text-white bg-transparent outline-none text-lg placeholder-gray-400"
            placeholder="Type a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                sendMessage();
                (e.target as HTMLInputElement).blur();
              }
            }}
          />
          <button
            onClick={() => sendMessage()}
            className="bg-purple-500 p-3 rounded-full hover:scale-110"
          >
            <FaPaperPlane className="text-lg text-white" />
          </button>
        </div>

        {/* ✅ Bottom Controls - "Clear Chat" Button Restored */}
        <div className="flex justify-between items-center mt-2">
          <PersonalitySelector
            personality={personality}
            setPersonality={setPersonality}
          />
          <motion.span
            onClick={clearChat}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="text-xs text-gray-400 cursor-pointer hover:underline"
          >
            Clear Chat
          </motion.span>
        </div>
      </div>
    </section>
  );
}
