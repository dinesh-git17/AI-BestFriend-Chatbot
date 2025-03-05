"use client";
export const dynamic = "force-dynamic"; // Ensure SSR for dynamic updates

import { useState, useEffect, useRef, useCallback } from "react";
import PersonalitySelector from "@/components/PersonalitySelector";
import { motion } from "framer-motion";
import { FaPaperPlane, FaRobot, FaMicrophone, FaUserCircle, FaUserAstronaut } from "react-icons/fa";
import { FiPlus } from "react-icons/fi";
import MobileChat from "@/components/MobileChat";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { dracula } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useRouter } from "next/navigation";
import { User } from "@supabase/auth-helpers-nextjs";
import Image from "next/image";
import { supabase } from "../lib/supabaseClient";

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
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null); // ✅ Ensure user state is updated
    router.replace("/"); // ✅ Redirect to chat page instead of login
  };

  const router = useRouter();
  const [loading, setLoading] = useState(true); // ✅ Track auth check state
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null); // ✅ Separate state for displayName

  useEffect(() => {
    const checkAuth = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error("Error fetching session:", error);
      }

      const sessionUser = data.session?.user || null;
      setUser(sessionUser);
      setLoading(false);

      if (sessionUser) {
        const displayName =
          sessionUser.user_metadata?.full_name || sessionUser.user_metadata?.name || "Anonymous";

        setUser((prevUser) => (prevUser ? { ...prevUser, displayName } : null));
      }
    };

    checkAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const displayName =
          session.user.user_metadata?.full_name || session.user.user_metadata?.name || "Anonymous";

        setUser((prevUser) => (prevUser ? { ...prevUser, displayName } : null));
      } else {
        setUser(null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // useEffect(() => {
  //   if (!loading) {
  //     if (user) {
  //       router.replace("/"); // ✅ Redirect only if user is authenticated
  //     } else {
  //       router.replace("/auth/login"); // ✅ Redirect only if NOT logged in
  //     }
  //   }
  // }, [loading, user, router]);

  useEffect(() => {
    const checkAuth = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error("Error fetching session:", error);
      }

      const sessionUser = data.session?.user || null;
      setUser(sessionUser);

      if (sessionUser) {
        // ✅ Extract display name safely
        const name =
          sessionUser.user_metadata?.full_name || sessionUser.user_metadata?.name || "Anonymous";
        setDisplayName(name);
      } else {
        setDisplayName(null);
      }

      setLoading(false);
    };

    checkAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const name =
          session.user.user_metadata?.full_name || session.user.user_metadata?.name || "Anonymous";
        setUser(session.user);
        setDisplayName(name);
      } else {
        setUser(null);
        setDisplayName(null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const [messages, setMessages] = useState<{ sender: string; text: string }[]>([]); // ✅ Default to empty array

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

  const [input, setInput] = useState("");
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

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };

  // Auto-scroll when messages update
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-scroll when switching chats
  useEffect(() => {
    scrollToBottom();
  }, [currentChatId]);

  // Auto-scroll on page load for all chats
  useEffect(() => {
    setTimeout(scrollToBottom, 200); // Small delay to ensure full rendering
  }, [chats]);

  // Ensure new messages always scroll down
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages.length]);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("chatHistory", JSON.stringify(messages));
    }
  }, [messages]);

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
    if (!currentChatId) return; // ✅ Ensure a chat exists before sending a message

    const textToSend = presetText || input.trim();
    if (!textToSend) return;

    setMessages((prev) => [...prev, { sender: "You", text: textToSend }]);
    setInput("");
    setTyping(true); // ✅ Show "Echo is typing..." before fetching

    // ✅ Add message to the current chat
    const updatedMessages = [
      ...(chats[currentChatId]?.messages || []),
      { sender: "You", text: textToSend },
    ];

    // ✅ Update state immediately for smooth UI
    setChats((prevChats) => ({
      ...prevChats,
      [currentChatId]: { ...prevChats[currentChatId], messages: updatedMessages },
    }));

    setTyping(true);

    // ✅ Reset textarea height after sending
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }

    // ✅ Ensure chat title is generated
    updateChatTitle(currentChatId);

    // ✅ Get the latest personality state
    const latestPersonality = personality;
    console.log(`🧠 Sending request with personality: ${latestPersonality}`);

    // ✅ Handle responses to "What is your name?"
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

      // ✅ Store this response
      if (user) {
        await supabase
          .from("chats")
          .update({ messages: [...updatedMessages, responseMessage] })
          .eq("id", currentChatId)
          .eq("user_id", user.id);
      } else {
        console.log("👤 Guest chat in memory. Messages will disappear on refresh.");
      }

      setChats((prevChats) => ({
        ...prevChats,
        [currentChatId]: {
          ...prevChats[currentChatId],
          messages: [...updatedMessages, responseMessage],
        },
      }));

      return;
    }

    // ✅ Prevent multiple error messages by checking the last Echo message
    const lastMessage = chats[currentChatId]?.messages.slice(-1)[0]?.text || "";
    const alreadyHasError = lastMessage.includes("⚠️");

    // ✅ Handle offline users
    if (!navigator.onLine) {
      setTyping(false);
      if (!alreadyHasError) {
        const offlineMessage = {
          sender: "Echo",
          text: "⚠️ No internet connection. Please check your network.",
        };

        if (user) {
          await supabase
            .from("chats")
            .update({ messages: [...updatedMessages, offlineMessage] })
            .eq("id", currentChatId)
            .eq("user_id", user.id);
        } else {
          const guestChats = JSON.parse(localStorage.getItem("guestChats") || "{}");
          guestChats[currentChatId] = {
            ...guestChats[currentChatId],
            messages: [...updatedMessages, offlineMessage],
          };
          localStorage.setItem("guestChats", JSON.stringify(guestChats));
        }

        setChats((prevChats) => ({
          ...prevChats,
          [currentChatId]: {
            ...prevChats[currentChatId],
            messages: [...updatedMessages, offlineMessage],
          },
        }));
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

        if (user) {
          supabase
            .from("chats")
            .update({ messages: [...updatedMessages, timeoutMessage] })
            .eq("id", currentChatId)
            .eq("user_id", user.id);
        } else {
          const guestChats = JSON.parse(localStorage.getItem("guestChats") || "{}");
          guestChats[currentChatId] = {
            ...guestChats[currentChatId],
            messages: [...updatedMessages, timeoutMessage],
          };
          localStorage.setItem("guestChats", JSON.stringify(guestChats));
        }

        setChats((prevChats) => ({
          ...prevChats,
          [currentChatId]: {
            ...prevChats[currentChatId],
            messages: [...updatedMessages, timeoutMessage],
          },
        }));
      }
    }, 30000); // ✅ Timeout after 30 seconds

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

      const responseMessage = { sender: "Echo", text: data.response };

      // ✅ Store AI Response
      if (user) {
        await supabase
          .from("chats")
          .update({ messages: [...updatedMessages, responseMessage] })
          .eq("id", currentChatId)
          .eq("user_id", user.id);
      } else {
        const guestChats = JSON.parse(localStorage.getItem("guestChats") || "{}");
        guestChats[currentChatId] = {
          ...guestChats[currentChatId],
          messages: [...updatedMessages, responseMessage],
        };
        localStorage.setItem("guestChats", JSON.stringify(guestChats));
      }

      setChats((prevChats) => ({
        ...prevChats,
        [currentChatId]: {
          ...prevChats[currentChatId],
          messages: [...updatedMessages, responseMessage],
        },
      }));

      updateChatTitle(currentChatId);
    } catch (error) {
      console.error("Error sending message:", error);
      setTyping(false);

      if (!alreadyHasError && !timeoutTriggered) {
        const errorMessage = { sender: "Echo", text: "⚠️ Unable to connect. Please try again." };

        if (user) {
          await supabase
            .from("chats")
            .update({ messages: [...updatedMessages, errorMessage] })
            .eq("id", currentChatId)
            .eq("user_id", user.id);
        } else {
          const guestChats = JSON.parse(localStorage.getItem("guestChats") || "{}");
          guestChats[currentChatId] = {
            ...guestChats[currentChatId],
            messages: [...updatedMessages, errorMessage],
          };
          localStorage.setItem("guestChats", JSON.stringify(guestChats));
        }

        setChats((prevChats) => ({
          ...prevChats,
          [currentChatId]: {
            ...prevChats[currentChatId],
            messages: [...updatedMessages, errorMessage],
          },
        }));
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
  const chatFetchedRef = useRef(false); // ✅ Prevent multiple fetches
  const chatCreatedRef = useRef(false); // ✅ Prevent multiple chat creations

  const createNewChat = useCallback(async () => {
    if (chatCreatedRef.current) return;
    chatCreatedRef.current = true;

    console.log("🆕 Creating a new chat...");

    const newChatId = user ? `user-${Date.now()}` : `guest-${Date.now()}`;
    const newChatName = "New Chat";

    const newChat = {
      name: newChatName,
      display_name: newChatName,
      messages: [{ sender: "Echo", text: "Hi there! 😊 I'm **Echo**, your AI best friend." }],
      user_id: user ? user.id : null,
      user_display_name: displayName || "Anonymous", // ✅ Use separate displayName state
    };

    if (user) {
      try {
        const { data, error } = await supabase.from("chats").insert([newChat]).select();
        if (error) throw new Error(JSON.stringify(error, null, 2));

        if (data && data.length > 0) {
          const newChatId = data[0].id;
          setChats((prevChats) => ({
            ...prevChats,
            [newChatId]: {
              name: newChatName,
              display_name: newChatName,
              messages: newChat.messages,
              user_display_name: displayName, // ✅ Ensure displayName is stored correctly
            },
          }));
          setCurrentChatId(newChatId);
        }
      } catch (error) {
        console.error("❌ Error creating chat:", error);
      }
    } else {
      let guestChats = JSON.parse(localStorage.getItem("guestChats") || "{}");

      guestChats = { ...guestChats, [newChatId]: newChat };
      localStorage.setItem("guestChats", JSON.stringify(guestChats));

      setChats(guestChats);
      setCurrentChatId(newChatId);
      localStorage.setItem("lastGuestChatId", newChatId);
    }

    setTimeout(() => {
      chatCreatedRef.current = false;
    }, 500);
  }, [user, displayName]); // ✅ Include displayName in dependencies

  useEffect(() => {
    if (chatFetchedRef.current) return; // ✅ Prevent multiple fetches
    chatFetchedRef.current = true; // ✅ Mark fetch as completed

    const fetchChats = async () => {
      if (user) {
        console.log("🔍 Fetching chats for user:", user.id);

        const { data: chatData, error: chatError } = await supabase
          .from("chats")
          .select("id, name, display_name, messages, user_display_name")
          .eq("user_id", user.id);

        if (chatError) {
          console.error("❌ Error fetching chats:", chatError.message);
          return;
        }

        if (chatData.length > 0) {
          const chatsData = Object.fromEntries(
            chatData.map((chat) => [
              chat.id,
              {
                name: chat.name,
                display_name: chat.display_name,
                messages: chat.messages,
                user_display_name: chat.user_display_name || "Anonymous", // ✅ Fetch and store display name
              },
            ]),
          );
          setChats(chatsData);
          setCurrentChatId(chatData[0].id);
        } else {
          console.log("⚠️ No chats found. Creating a new chat...");
          createNewChat();
        }
      } else {
        console.log("👤 Guest detected. Checking localStorage for chats...");

        const storedChats = JSON.parse(localStorage.getItem("guestChats") || "{}");
        const lastGuestChatId = localStorage.getItem("lastGuestChatId");

        if (Object.keys(storedChats).length > 0) {
          setChats(storedChats);
          setCurrentChatId(lastGuestChatId || Object.keys(storedChats)[0]);
        } else {
          console.log("⚠️ No guest chats found. Creating a new one...");
          createNewChat();
        }
      }
    };

    fetchChats();
  }, [user, createNewChat]);

  const updateChatTitle = async (chatId: string) => {
    if (!user) return;

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

      // ✅ Store updated title in Supabase
      const { error } = await supabase
        .from("chats")
        .update({ last_chat_id: chatId }) // ✅ Update the correct table
        .eq("user_id", user.id); // ✅ Ensure it updates the correct user

      if (error) {
        console.error("Error updating lastChatId in Supabase:", error.message || error);
      } else {
        console.log("✅ Successfully updated lastChatId:", chatId);
      }

      // ✅ Update local state with new title
      setChats((prevChats) => ({
        ...prevChats,
        [chatId]: { ...prevChats[chatId], name: chatTitle },
      }));
    } catch (error) {
      console.error("Error updating chat title:", error);
    }
  };

  useEffect(() => {
    if (!user) return; // Ensure user is available

    const fetchChats = async () => {
      console.log("🔍 Fetching chats for user:", user.id);

      const { data, error } = await supabase
        .from("chats")
        .select("id, name, messages")
        .eq("user_id", user.id);

      if (error) {
        console.error("❌ Error fetching chats:", error.message);
        return;
      }

      console.log("✅ Fetched chats:", data);

      if (data.length > 0) {
        const chatsData = Object.fromEntries(
          data.map((chat) => [chat.id, { name: chat.name, messages: chat.messages }]),
        );
        setChats(chatsData);
        setCurrentChatId(data[0].id); // Set first chat as default
      } else {
        console.log("⚠️ No chats found. Creating new chat...");
        createNewChat();
      }
    };

    fetchChats();
  }, [user, createNewChat]); // ✅ Runs when user logs in

  const switchChat = async (chatId: string) => {
    if (chatId === currentChatId) return; // ✅ Prevent redundant updates
    setCurrentChatId(chatId);

    if (user) {
      // ✅ Store last active chat in the user's profile (not chats)
      console.log("🔍 Updating last_chat_id in profile for user:", user.id, "with chatId:", chatId);

      const { error } = await supabase
        .from("chats") // ✅ Ensure this matches your database schema
        .update({ last_chat_id: chatId })
        .eq("id", user.id);

      if (error) {
        console.error("❌ Error updating last_chat_id in Supabase:", error.message || error);
      } else {
        console.log("✅ Successfully updated last_chat_id:", chatId);
      }
    } else {
      // ✅ Store last active chat in localStorage for guests
      console.log("👤 Storing last active chat for guest:", chatId);
      localStorage.setItem("lastGuestChatId", chatId);
    }
  };

  const deleteChat = async (chatId: string) => {
    if (user) {
      const { error } = await supabase
        .from("chats")
        .delete()
        .eq("id", chatId)
        .eq("user_id", user.id);
      if (error) {
        console.error("❌ Error deleting chat from Supabase:", error);
        return;
      }
    } else {
      console.log("👤 Guest chat deleted. Removing from localStorage...");
      const guestChats = JSON.parse(localStorage.getItem("guestChats") || "{}");
      delete guestChats[chatId];
      localStorage.setItem("guestChats", JSON.stringify(guestChats));
    }

    setChats((prevChats) => {
      const updatedChats = { ...prevChats };
      delete updatedChats[chatId];
      return updatedChats;
    });

    setTimeout(() => {
      const remainingChats = Object.keys(chats).filter((id) => id !== chatId);

      if (remainingChats.length > 0) {
        setCurrentChatId(remainingChats[0]);
        localStorage.setItem("lastGuestChatId", remainingChats[0]);
      } else {
        console.log("⚠️ No chats left. Ensuring new chat creation...");
        chatCreatedRef.current = false; // ✅ Reset before calling createNewChat()
        createNewChat();
      }
    }, 500);
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

  // ✅ State to store user profile pic
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [profilePic, setProfilePic] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setProfilePic(user?.user_metadata?.avatar_url || null);
    }
  }, [user]);

  // ✅ Close dropdown if clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (user) {
      setProfilePic(user?.user_metadata?.avatar_url || null);
    }
  }, [user]);

  if (loading) {
    return (
      <div className="w-full h-screen flex justify-center items-center text-white">Loading...</div>
    );
  }

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
      <div className="fixed left-0 top-0 w-64 h-screen backdrop-blur-lg bg-black/50 px-3 pt-4 pb-5 shadow-lg z-40 overflow-y-auto border-r border-gray-700 flex flex-col rounded-r-xl transition-all">
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
            onClick={() => {
              chatCreatedRef.current = false; // ✅ Allow manual chat creation
              createNewChat();
            }}
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
              className={`relative flex justify-between items-center px-3 py-3 rounded-xl cursor-pointer font-medium transition-all ${
                chatId === currentChatId
                  ? "bg-gradient-to-r from-[#6a11cb] to-[#2575fc] text-white shadow-lg w-full rounded-2xl"
                  : "bg-gray-800/50 hover:bg-gray-700/60 text-gray-300 hover:text-white transition rounded-xl"
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
        {/* 🔥 User Profile Icon / Login Button */}
        <div className="absolute top-4 right-4 z-[60]" ref={dropdownRef}>
          {user ? (
            // ✅ Show user avatar & logout when logged in
            <>
              <button
                onClick={() => setIsDropdownOpen((prev) => !prev)}
                className="hover:opacity-80 transition-opacity"
              >
                {profilePic ? (
                  <Image
                    src={profilePic}
                    alt="User Avatar"
                    width={28}
                    height={28}
                    className="rounded-full border border-gray-500"
                    priority
                  />
                ) : (
                  <FaUserCircle className="text-white text-sm" />
                )}
              </button>

              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-[#1e1e2e]/90 backdrop-blur-md rounded-lg shadow-xl border border-gray-700">
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2 text-left text-red-400 hover:bg-[#343541] hover:text-white transition flex items-center gap-2"
                  >
                    🚪 Logout
                  </button>
                </div>
              )}
            </>
          ) : (
            // ✅ Show login button when not logged in
            <motion.button
              onClick={() => router.push("/auth/login")}
              whileHover={{ scale: 1.05, boxShadow: "0px 0px 12px rgba(255, 255, 255, 0.2)" }}
              whileTap={{ scale: 0.95 }}
              className="px-5 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-full shadow-md transition-all"
            >
              Log In
            </motion.button>
          )}
        </div>

        {/* 🔥 Chatbox 💜 */}
        <div
          className="flex flex-col flex-grow w-full h-full bg-custom bg-opacity-80 backdrop-blur-lg p-8 rounded-none shadow-lg transition"
          style={{ minHeight: "90vh", maxHeight: "95vh", height: "calc(100vh - 3rem)" }}
        >
          {/* 🔥 Chat Messages 💜 */}
          <div
            ref={chatContainerRef}
            className="flex flex-col justify-start flex-grow overflow-y-auto space-y-3 p-3"
            style={{ maxHeight: "calc(100vh - 100px)", paddingBottom: "120px" }}
          >
            {currentChatId &&
              (chats[currentChatId]?.messages || []).map((msg, index) => (
                <motion.div
                  key={index}
                  className={`flex ${msg.sender === "You" ? "justify-end" : "justify-start"} mb-2`}
                >
                  <div
                    className={`relative text-[15px] leading-relaxed shadow-xl px-4 py-2 ${
                      msg.sender === "You"
                        ? "bg-gradient-to-br from-blue-500 to-indigo-500 text-white rounded-2xl shadow-lg shadow-blue-900/40 inline-block max-w-[60%]"
                        : "bg-gray-800/50 border border-gray-600 text-gray-200 rounded-2xl shadow-md inline-block max-w-[60%]"
                    }`}
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

          {/* 🔥 Chat Input Section - Modernized 💜 */}
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 w-[70%] max-w-3xl flex items-center px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-full shadow-lg focus-within:ring-2 focus-within:ring-blue-500 transition-all z-10">
            {/* Personality Selector inside Input Box */}
            {/* Personality Selector inside Input Box */}
            <div className="relative group mr-2">
              {/* 🎭 Icon Button */}
              <button className="p-2 rounded-full bg-gray-700 hover:bg-gray-600 transition">
                {/* <span className="text-white text-lg">🎭</span>{" "} */}
                {/* Alternatively, use an icon below */}
                <FaUserAstronaut className="text-white text-lg" />
              </button>

              {/* Personality Selector Dropdown (Hidden by default, shows on hover) */}
              {/* Personality Selector Dropdown (Hidden by default, shows on hover) */}
              <div className="absolute bottom-full mb-2 w-48 bg-gray-800 border border-gray-600 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50">
                <PersonalitySelector personality={personality} setPersonality={setPersonality} />
              </div>
            </div>
            {/* Microphone Button */}
            <button
              onClick={() => startVoiceRecognition(setInput, input)}
              className="p-3 bg-gray-700 rounded-full hover:bg-gray-600 transition-transform hover:scale-110"
            >
              <FaMicrophone className="text-white" />
            </button>
            {/* Input Field */}
            <textarea
              ref={inputRef}
              className="flex-grow p-3 text-white bg-transparent outline-none text-base placeholder-gray-400 resize-none overflow-hidden"
              placeholder="Type a message..."
              value={input || ""}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              autoFocus
              rows={1}
            />
            {/* Send Button */}
            <motion.button
              onClick={() => sendMessage()}
              whileHover={{ scale: 1.1, boxShadow: "0px 0px 10px rgba(255, 255, 255, 0.4)" }}
              whileTap={{ scale: 0.95 }}
              className="bg-gradient-to-br from-blue-500 to-indigo-500 p-3 rounded-full shadow-md transition-transform"
            >
              <FaPaperPlane className="text-lg text-white" />
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
}
