"use client";
export const dynamic = "force-dynamic"; // Ensure SSR for dynamic updates

import { useState, useEffect, useRef } from "react";
import PersonalitySelector from "@/components/PersonalitySelector";
import { motion } from "framer-motion";
import { FaPaperPlane, FaRobot, FaMicrophone, FaSun, FaMoon } from "react-icons/fa";
import { FiPlus } from "react-icons/fi";
import MobileChat from "@/components/MobileChat";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { dracula } from "react-syntax-highlighter/dist/esm/styles/prism";

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

export default function Home() {
  const [messages, setMessages] = useState<{ sender: string; text: string }[]>([]);

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkScreenSize(); // Run on mount
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  // ✅ Place this function inside Home() (below useEffect)
  const startVoiceRecognition = (setInput: (value: string) => void, currentInput: string) => {
    if (!isClient) return; // Prevents SSR issues

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

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
    function isSpeechRecognitionErrorEvent(event: Event): event is SpeechRecognitionErrorEvent {
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

  const getGreeting = () => {
    const hour = new Date().getHours();
    return hour < 12 ? "Good morning!" : hour < 18 ? "Good afternoon!" : "Good evening!";
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
                text: `## 👋 Welcome to Echo!\n\nHi there! 😊 I'm **Echo**, your AI best friend. I'm here to chat, listen, and support you anytime. 💙\n\nHow can I help you today?`,
              },
            ],
      );
    }
  }, []);

  const [input, setInput] = useState("");
  const [darkMode, setDarkMode] = useState(true);
  const [personality, setPersonality] = useState("Friendly");
  const chatContainerRef = useRef<HTMLDivElement>(null); // ✅ Add error state for network errors
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [typing, setTyping] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editedMessage, setEditedMessage] = useState("");
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);

  const [renamingChatId, setRenamingChatId] = useState<string | null>(null);
  const [newChatName, setNewChatName] = useState("");

  const toggleDropdown = (chatId: string) => {
    setDropdownOpen((prev) => (prev === chatId ? null : chatId));
  };

  const [chats, setChats] = useState<{
    [key: string]: { name: string; messages: { sender: string; text: string }[] };
  }>({});
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // ✅ Load chats from localStorage on startup
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedChats = localStorage.getItem("chats");
      if (savedChats) {
        setChats(JSON.parse(savedChats));
      }

      const lastChat = localStorage.getItem("lastChatId");
      if (lastChat && JSON.parse(savedChats || "{}")[lastChat]) {
        setCurrentChatId(lastChat);
      } else {
        createNewChat();
      }
    }
  }, []);

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
      document.documentElement.setAttribute("data-theme", darkMode ? "dark" : "light");
    }
  }, [darkMode]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownOpen &&
        event.target instanceof HTMLElement && // ✅ Ensure event.target is an HTMLElement
        !event.target.closest(".dropdown-menu")
      ) {
        setDropdownOpen(null);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [dropdownOpen]);

  const sendMessage = async (presetText?: string) => {
    if (!currentChatId) return;

    const textToSend = presetText || input.trim();
    if (!textToSend) return;

    setMessages((prev) => [...prev, { sender: "You", text: textToSend }]);
    setInput("");
    setTyping(true); // ✅ Show "Echo is typing..." before fetching

    // ✅ Add message to the current chat
    const updatedChats = {
      ...chats,
      [currentChatId]: {
        ...chats[currentChatId],
        messages: [...(chats[currentChatId]?.messages || []), { sender: "You", text: textToSend }],
      },
    };

    setChats(updatedChats);
    setInput("");
    setTyping(true);

    // ✅ Reset textarea height after sending
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }

    localStorage.setItem("chats", JSON.stringify(updatedChats));

    // ✅ Ensure chat title is generated regardless of cache usage
    updateChatTitle(currentChatId);

    // ✅ Get the latest personality state
    const latestPersonality = personality;
    console.log(`🧠 Sending request with personality: ${latestPersonality}`);

    // ✅ Check if the user is asking Echo's name
    const lowerCaseText = textToSend.toLowerCase();
    if (
      lowerCaseText.includes("what is your name") ||
      lowerCaseText.includes("who are you") ||
      lowerCaseText.includes("your name")
    ) {
      setTyping(false);
      const responseMessage = {
        sender: "Echo",
        text: "I'm Echo! Your friendly AI best friend. 😊",
      };

      setChats((prevChats) => ({
        ...prevChats,
        [currentChatId]: {
          ...prevChats[currentChatId],
          messages: [...prevChats[currentChatId].messages, responseMessage],
        },
      }));

      localStorage.setItem("chats", JSON.stringify(updatedChats));
      return;
    }

    // ✅ Prevent multiple error messages by checking the last Echo message
    const lastMessage = chats[currentChatId]?.messages.slice(-1)[0]?.text || "";
    const alreadyHasError = lastMessage.includes("⚠️");

    // ✅ Check if the user is offline and immediately show ONE error message
    if (!navigator.onLine) {
      setTyping(false);
      if (!alreadyHasError) {
        const offlineMessage = {
          sender: "Echo",
          text: "⚠️ No internet connection. Please check your network.",
        };

        setChats((prevChats) => ({
          ...prevChats,
          [currentChatId]: {
            ...prevChats[currentChatId],
            messages: [...prevChats[currentChatId].messages, offlineMessage],
          },
        }));

        localStorage.setItem("chats", JSON.stringify(updatedChats));
      }
      return;
    }

    let timeoutTriggered = false;
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      timeoutTriggered = true;
      controller.abort();
      setTyping(false);
      if (!alreadyHasError) {
        const timeoutMessage = {
          sender: "Echo",
          text: "⚠️ Server is not responding. Try again later.",
        };

        setChats((prevChats) => ({
          ...prevChats,
          [currentChatId]: {
            ...prevChats[currentChatId],
            messages: [...prevChats[currentChatId].messages, timeoutMessage],
          },
        }));

        localStorage.setItem("chats", JSON.stringify(updatedChats));
      }
    }, 30000); // ✅ Faster timeout (30 seconds)

    try {
      const response = await fetch(`${API_URL}/chat/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_input: textToSend, personality: latestPersonality }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error("Failed to fetch response");
      }

      clearTimeout(timeout);
      const data = await response.json();
      setTyping(false);

      // ✅ Add AI response to the correct chat
      const responseMessage = { sender: "Echo", text: data.response };
      setChats((prevChats) => ({
        ...prevChats,
        [currentChatId]: {
          ...prevChats[currentChatId],
          messages: [...prevChats[currentChatId].messages, responseMessage],
        },
      }));

      localStorage.setItem("chats", JSON.stringify(updatedChats));

      // ✅ If the response was cached, still trigger title generation
      updateChatTitle(currentChatId);
    } catch (error) {
      console.error("Error sending message:", error);

      setTyping(false);
      if (!alreadyHasError && !timeoutTriggered) {
        const errorMessage = { sender: "Echo", text: "⚠️ Unable to connect. Please try again." };

        setChats((prevChats) => ({
          ...prevChats,
          [currentChatId]: {
            ...prevChats[currentChatId],
            messages: [...prevChats[currentChatId].messages, errorMessage],
          },
        }));

        localStorage.setItem("chats", JSON.stringify(updatedChats));
      }

      clearTimeout(timeout);
    }
  };

  const handleEditMessage = (index: number) => {
    setEditingMessageId(index.toString()); // Store the message ID being edited
    setEditedMessage(messages[index].text); // Pre-fill input with existing message text
  };

  const handleSaveEdit = (index: number) => {
    if (!editedMessage.trim()) return; // Prevent empty messages

    setMessages((prev) =>
      prev.map((msg, i) => (i === index ? { ...msg, text: editedMessage } : msg)),
    );

    setEditingMessageId(null); // Exit edit mode
    setEditedMessage("");
  };

  const handleDeleteMessage = (index: number) => {
    setMessages((prev) => prev.filter((_, i) => i !== index));
  };

  // ✅ Create a new chat with smart naming
  const createNewChat = async () => {
    const newChatId = `chat-${Date.now()}`;
    const newChat = {
      name: "New Chat",
      messages: [
        {
          sender: "Echo",
          text: `## Hi there! 😊 I'm **Echo**, your AI best friend.\n\n I'm here to chat, listen, and support you anytime. 💙\n\nHow can I help you today?`,
        },
      ],
    };

    setChats((prevChats) => {
      const updatedChats = { ...prevChats, [newChatId]: newChat };
      localStorage.setItem("chats", JSON.stringify(updatedChats));
      return updatedChats;
    });

    setCurrentChatId(newChatId);
    localStorage.setItem("lastChatId", newChatId);
  };

  const updateChatTitle = async (chatId: string) => {
    const chatMessages = chats[chatId]?.messages || [];
    const userMessages = chatMessages.filter((msg) => msg.sender === "You").slice(0, 2);

    if (userMessages.length < 2 || chats[chatId]?.name !== "New Chat") return;

    try {
      const response = await fetch(`${API_URL}/generate-chat-title/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: userMessages }),
      });

      if (!response.ok) throw new Error("Failed to generate chat title");

      const data = await response.json();
      const chatTitle = data.title?.trim() || "New Chat";

      setChats((prevChats) => ({
        ...prevChats,
        [chatId]: { ...prevChats[chatId], name: chatTitle },
      }));

      localStorage.setItem(
        "chats",
        JSON.stringify({ ...chats, [chatId]: { ...chats[chatId], name: chatTitle } }),
      );
    } catch (error) {
      console.error("Error updating chat title:", error);
    }
  };

  const switchChat = (chatId: string) => {
    setCurrentChatId(chatId);
    localStorage.setItem("lastChatId", chatId);
  };

  const deleteChat = (chatId: string) => {
    const updatedChats = { ...chats };
    delete updatedChats[chatId];

    if (Object.keys(updatedChats).length === 0) {
      // ✅ If all chats are deleted, reset to Chat 1 with a welcome message
      const newChatId = "chat-1";
      updatedChats[newChatId] = {
        name: "New Chat",
        messages: [
          {
            sender: "Echo",
            text: `## Hi there! 😊 I'm **Echo**, your AI best friend.\n\n I'm here to chat, listen, and support you anytime. 💙\n\nHow can I help you today?`,
          },
        ],
      };
      setCurrentChatId(newChatId);
    } else {
      // ✅ Ensure `setCurrentChatId` only receives a string
      const firstChatId = Object.keys(updatedChats)[0] || "chat-1";
      setCurrentChatId(firstChatId);
    }

    setChats(updatedChats);
    localStorage.setItem("chats", JSON.stringify(updatedChats));
    localStorage.setItem("lastChatId", currentChatId || "chat-1"); // ✅ Ensure `string`
  };

  const clearChat = () => {
    if (!currentChatId) return;

    const greetingMessage = `${getGreeting()} 😊 I'm Echo, your AI best friend. I'm here to chat, listen, and support you anytime! 💙`;

    console.log("Clearing chat with greeting:", greetingMessage); // ✅ Debugging log

    // Update the chat messages for the current chat
    const updatedChats = {
      ...chats,
      [currentChatId]: {
        ...chats[currentChatId],
        messages: [{ sender: "Echo", text: greetingMessage }],
      },
    };

    setChats(updatedChats);
    localStorage.setItem("chats", JSON.stringify(updatedChats));
  };

  const handleRenameChat = (chatId: string) => {
    if (!newChatName.trim()) return;

    const updatedChats = {
      ...chats,
      [chatId]: { ...chats[chatId], name: newChatName.trim() },
    };

    setChats(updatedChats);
    setRenamingChatId(null);
    localStorage.setItem("chats", JSON.stringify(updatedChats));
  };

  return isMobile ? (
    <MobileChat
      messages={messages}
      setMessages={setMessages}
      input={input}
      setInput={setInput}
      sendMessage={sendMessage}
      clearChat={clearChat}
      personality={personality}
      setPersonality={setPersonality}
      startVoiceRecognition={startVoiceRecognition}
      editingMessageId={editingMessageId}
      setEditingMessageId={setEditingMessageId}
      editedMessage={editedMessage}
      setEditedMessage={setEditedMessage}
      handleEditMessage={handleEditMessage}
      handleSaveEdit={handleSaveEdit}
      handleDeleteMessage={handleDeleteMessage}
      typing={typing}
    />
  ) : (
    <div className="relative w-full h-screen flex bg-[#0F0F1A] text-white font-poppins">
      {/* 🔥 Sidebar - Adjusted for Proper Chat List Positioning */}
      <div className="fixed left-0 top-0 w-64 h-screen bg-[#15151e] px-3 pt-4 pb-5 shadow-lg z-40 overflow-y-auto border-r border-gray-700 flex flex-col">
        {/* 🔥 Branding - Properly Adjusted */}
        <div className="flex items-center justify-between px-2 py-3">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ y: [0, -6, 0] }} // Bouncing Animation
              transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
            >
              <FaRobot className="text-3xl text-[#ffffff]" />
            </motion.div>
            <h1 className="text-xl font-semibold tracking-wide text-white">Echo</h1>
          </div>

          {/* 🔥 Right-Aligned Minimalist New Chat Icon */}
          <motion.button
            onClick={createNewChat}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="p-2 rounded-md text-gray-300 hover:text-white transition-all"
          >
            <FiPlus size={18} />
          </motion.button>
        </div>

        {/* 🔥 Chat List Title - Lowered for More Space */}
        <h2 className="text-gray-400 text-sm font-medium uppercase tracking-wide px-2 mt-8 mb-4">
          Recent Chats
        </h2>

        {/* 🔥 Chat List */}
        <ul className="flex-grow space-y-2 px-2 overflow-y-auto pb-6 relative z-[1]">
          {Object.entries(chats).map(([chatId, chat]) => (
            <motion.li
              key={chatId}
              whileHover={dropdownOpen === chatId ? {} : { backgroundColor: "#2d2f3a" }} // ✅ No hover effect when dropdown is open
              className={`relative flex justify-between items-center px-2 py-3 rounded-lg cursor-pointer font-medium transition-all ${
                chatId === currentChatId
                  ? "bg-gradient-to-r from-[#6a11cb] to-[#2575fc] text-white shadow-lg w-full rounded-2xl"
                  : dropdownOpen === chatId
                  ? "text-gray-300" // ✅ Stops hover color when dropdown is open
                  : "hover:bg-[#2d2f3a] text-gray-300 hover:text-white transition rounded-lg"
              }`}
              onClick={(e) => {
                if (!(e.target as HTMLElement).closest(".dropdown-menu")) {
                  switchChat(chatId); // ✅ Prevents switching if clicking inside dropdown
                }
              }}
            >
              {/* 🔥 Chat Name */}
              {renamingChatId === chatId ? (
                <input
                  type="text"
                  value={newChatName}
                  onChange={(e) => setNewChatName(e.target.value)}
                  onBlur={() => handleRenameChat(chatId)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRenameChat(chatId);
                    if (e.key === "Escape") setRenamingChatId(null);
                  }}
                  autoFocus
                  className="flex-1 bg-transparent text-white border border-gray-600 focus:border-blue-400 rounded-md px-2 py-1 outline-none transition-all w-full"
                />
              ) : (
                <span className="flex-1 truncate px-2 py-1">{chat.name}</span>
              )}

              {/* 🔥 Dropdown Menu Trigger */}
              <div className="relative">
                <motion.button
                  onClick={(e) => {
                    e.stopPropagation(); // ✅ Prevents chat switching
                    toggleDropdown(chatId);
                  }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="ml-2 p-1 rounded-full text-gray-400 hover:text-gray-100 transition-opacity"
                >
                  •••
                </motion.button>

                {/* 🔥 Floating Dropdown - Now Above Hover Effect */}
                {dropdownOpen === chatId && (
                  <div
                    className="absolute right-0 top-full mt-2 w-36 bg-[#1e1e2e]/90 backdrop-blur-md rounded-xl shadow-xl border border-gray-700 dropdown-menu"
                    style={{
                      pointerEvents: "auto", // ✅ Ensures dropdown is interactive
                      zIndex: 10000, // ✅ Forces dropdown to be on top
                      position: "absolute",
                    }}
                    onClick={(e) => e.stopPropagation()} // ✅ Prevents unintended interactions
                  >
                    <button
                      onClick={() => {
                        setRenamingChatId(chatId);
                        setNewChatName(chats[chatId].name);
                        setDropdownOpen(null);
                      }}
                      className="w-full px-4 py-2 text-left text-gray-300 hover:bg-[#343541] hover:text-white transition flex items-center gap-2"
                    >
                      ✏️ Rename
                    </button>

                    <button
                      onClick={() => {
                        deleteChat(chatId);
                        setDropdownOpen(null);
                      }}
                      className="w-full px-4 py-2 text-left text-red-400 hover:bg-[#343541] hover:text-white transition flex items-center gap-2"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                )}
              </div>
            </motion.li>
          ))}
        </ul>
      </div>

      {/* 🔥 Main Chat Section - Adjusted for Wider Sidebar */}
      <div className="flex-grow flex flex-col items-center justify-center ml-64">
        {/* 🔥 Dark Mode Toggle */}
        <button
          onClick={() => setDarkMode((prev) => !prev)}
          className="fixed top-6 right-6 z-[60] bg-gray-800 p-1 rounded-full hover:bg-gray-700 transition shadow-lg"
          style={{ transform: "translateY(15px)" }}
        >
          {darkMode ? (
            <FaSun className="text-yellow-400 text-m" />
          ) : (
            <FaMoon className="text-gray-300 text-m" />
          )}
        </button>

        {/* 🔥 Chatbox Wrapper - Fullscreen Like ChatGPT with No Border */}
        {/* 🔥 Chatbox Wrapper - Increased Bottom Height */}
        <div
          className="flex flex-col flex-grow w-full h-full bg-custom bg-opacity-80 backdrop-blur-lg p-8 rounded-none shadow-lg transition"
          style={{
            minHeight: "90vh", // ✅ Increased height
            maxHeight: "95vh", // ✅ Allows chat to expand lower
            height: "calc(100vh - 3rem)", // ✅ Extends chat downwards
          }}
        >
          {/* 🔥 Chat Messages */}
          <div
            ref={chatContainerRef}
            className="flex flex-col justify-start flex-grow overflow-y-auto space-y-3 p-3 scrollbar-thin scrollbar-track-[#1e1e2e] scrollbar-thumb-[#6a11cb] scrollbar-thumb-rounded-full w-full"
          >
            {currentChatId &&
              chats[currentChatId]?.messages.map((msg, index) => (
                <motion.div
                  key={index}
                  className={`flex ${msg.sender === "You" ? "justify-end" : "justify-start"} mb-2`}
                >
                  <div
                    className={`relative text-[15px] leading-relaxed shadow-md px-4 py-3 ${
                      msg.sender === "You"
                        ? "bg-gradient-to-r from-[#6a11cb] to-[#2575fc] text-white"
                        : "bg-[#252532] text-gray-300"
                    }`}
                    style={{
                      maxWidth: "70%",
                      borderRadius:
                        msg.sender === "You" ? "20px 20px 5px 20px" : "20px 20px 20px 5px",
                    }}
                  >
                    <ReactMarkdown
                      rehypePlugins={[rehypeRaw]}
                      remarkPlugins={[remarkGfm, remarkBreaks]}
                      components={{
                        h1: ({ children }) => (
                          <h1 className="text-lg font-bold mt-2">{children}</h1>
                        ),
                        h2: ({ children }) => (
                          <h2 className="text-md font-semibold mt-2">{children}</h2>
                        ),
                        p: ({ children }) => <p className="mb-1">{children}</p>,
                        ul: ({ children }) => (
                          <ul className="list-disc list-inside ml-4">{children}</ul>
                        ),
                        ol: ({ children }) => (
                          <ol className="list-decimal list-inside ml-4">{children}</ol>
                        ),
                        li: ({ children }) => <li className="mb-1">{children}</li>,
                        blockquote: ({ children }) => (
                          <blockquote className="border-l-4 border-blue-400 pl-4 italic text-gray-400">
                            {children}
                          </blockquote>
                        ),
                        pre: ({ children }) => (
                          <div className="bg-[#1e1e2e] p-3 rounded-lg overflow-x-auto my-2">
                            {children}
                          </div>
                        ),
                        code: ({ className, children }) => {
                          const match = /language-(\w+)/.exec(className || "");
                          return match ? (
                            <SyntaxHighlighter style={dracula} language={match[1]} PreTag="div">
                              {String(children).replace(/\n$/, "")}
                            </SyntaxHighlighter>
                          ) : (
                            <code className="bg-gray-800 px-2 py-1 rounded text-sm">
                              {children}
                            </code>
                          );
                        },
                      }}
                    >
                      {msg.text}
                    </ReactMarkdown>
                  </div>
                </motion.div>
              ))}

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
                <div className="w-8 h-8 flex items-center justify-center rounded-full bg-[#3b82f6] text-white text-lg">
                  🤖
                </div>
                <div className="px-4 py-2 rounded-2xl shadow-lg max-w-fit bg-[#252532] text-gray-300">
                  Echo is typing...
                </div>
              </motion.div>
            )}
          </div>

          {/* 🔥 Chat Input Section */}
          <div className="w-full mt-4 pb-2 flex items-center bg-[#252532] rounded-lg shadow-md border border-gray-600 px-3 py-2 min-h-[3rem] md:min-h-[4rem]">
            <button
              onClick={() => startVoiceRecognition(setInput, input)}
              className="p-3 bg-gray-700 rounded-full mr-2 hover:bg-gray-600"
            >
              <FaMicrophone className="text-white" />
            </button>
            <textarea
              ref={inputRef}
              className="flex-grow p-3 text-white bg-transparent outline-none text-base placeholder-gray-400 resize-none overflow-hidden"
              placeholder="Type a message..."
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                if (inputRef.current) {
                  inputRef.current.style.height = "auto";
                  inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              rows={1}
            />
            <motion.button
              onClick={() => sendMessage()}
              className="bg-purple-500 p-3 rounded-full shadow-md hover:scale-110"
            >
              <FaPaperPlane className="text-lg text-white" />
            </motion.button>
          </div>

          {/* 🔥 Bottom Section - Personality Selector & Clear Chat */}
          <div className="flex items-center w-full px-3 mt-4">
            <div className="w-[30%] transform -translate-x-4">
              <PersonalitySelector personality={personality} setPersonality={setPersonality} />
            </div>
            <motion.button
              onClick={clearChat}
              whileHover={{ textShadow: "0px 0px 8px rgba(255, 76, 76, 0.8)" }} // Subtle glow effect
              whileTap={{ scale: 0.95 }}
              className="ml-auto text-sm text-gray-400 hover:text-white transition-all underline"
            >
              Clear Chat
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
}
