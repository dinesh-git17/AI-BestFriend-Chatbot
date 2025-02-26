"use client";
import { useState, useEffect, useRef } from "react";
import { FaChevronDown } from "react-icons/fa";

interface PersonalitySelectorProps {
  personality: string;
  setPersonality: (value: string) => void;
}

export default function PersonalitySelector({
  personality,
  setPersonality,
}: PersonalitySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setOpenUpward(spaceBelow < 150); // If less than 150px space, open above
    }
  }, [isOpen]);

  const options = [
    { value: "Friendly", label: "😊 Friendly" },
    { value: "Funny", label: "😂 Funny" },
    { value: "Professional", label: "💼 Professional" },
    { value: "Supportive", label: "💙 Supportive" },
  ];

  return (
    <div className="relative w-full max-w-[250px]" ref={dropdownRef}>
      {/* Dropdown Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center bg-[#252532] border border-gray-700 text-white text-sm rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 transition cursor-pointer hover:bg-[#2e2e3a]"
      >
        {options.find((opt) => opt.value === personality)?.label}
        <FaChevronDown
          className={`ml-2 transition ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown Menu (Dynamically Positioned & Aligned) */}
      {isOpen && (
        <div
          className={`absolute left-0 w-full bg-[#1e1e2e] border border-gray-700 rounded-lg shadow-lg z-50 overflow-hidden transition-all ${
            openUpward ? "bottom-full mb-2" : "mt-2"
          }`}
          style={{ maxHeight: "180px", overflowY: "auto" }} // Prevent overflow
        >
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                setPersonality(option.value);
                setIsOpen(false);
              }}
              className="w-full text-left px-4 py-3 text-white hover:bg-purple-600 transition flex items-center"
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
