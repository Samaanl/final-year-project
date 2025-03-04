import React, { useState, useEffect, useRef } from "react";
import { Handle, Position } from "@xyflow/react";
import Tooltip from "./Tooltip.jsx";
import "./Tooltip.css";

const LED = ({ id, pos, onDelete, brightness, ledStateRef }) => {
  const [size] = useState({ width: 48, height: 64 }); // Fixed size for the LED
  const [color, setColor] = useState(localStorage.getItem(`ledColor-${id}`) || "yellow");
  const [showInput, setShowInput] = useState(false); // Toggle input visibility
  const inputRef = useRef(null); // Reference for the input field
  const bulbRef = useRef(null); // Reference for the LED bulb body
  const [brightnessState, setBrightness] = useState(brightness); // Default brightness
  const [ledState, setLedState] = useState(ledStateRef.current);

  // Effect to handle clicks outside the input or LED bulb body
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        showInput &&
        inputRef.current &&
        !inputRef.current.contains(event.target) &&
        bulbRef.current &&
        !bulbRef.current.contains(event.target)
      ) {
        setShowInput(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showInput]); // Only re-run when showInput changes

  useEffect(() => {
    const interval = setInterval(() => {
      setLedState(ledStateRef.current);
    }, 100); // Check for changes every 100ms

    return () => clearInterval(interval);
  }, [ledStateRef]);

  const handleClick = () => {
    setShowInput(true); // Show the input field when the LED is clicked
  };

  const handleColorChange = (e) => {
    setColor(e.target.value);
    localStorage.setItem(`ledColor-${id}`, e.target.value); // Store with unique key
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      setShowInput(false);
    }
  };

  const style = {
    transform: `translate(${pos.x}px, ${pos.y}px)`, // Using props for position
    boxShadow: ledState ? `0 0 64px 21px ${color}` : `0 0 0px 0px ${color}`, // Dynamic box-shadow
  };

  return (
    <Tooltip text="LED: A Light Emitting Diode (LED) is a semiconductor device that emits light when an electric current passes through it.">
      <div
        className="relative flex flex-col items-center justify-center cursor-pointer transition-all duration-300 hover:shadow-2xl mx-4 w-3"
        style={style}
        ref={bulbRef} // Add reference to LED bulb body
        onClick={handleClick} // Handle click event
      >
        {/* Anode Handle (Positive Pin) */}
        <Handle
          type="target"
          position={Position.Left}
          id="anode-target"
          className="w-4 h-4 bg-red-500 rounded-full"
          style={{
            left: "-2px",
            top: "116px",
            zIndex: 10,
          }}
        />
        <Handle
          type="source"
          position={Position.Left}
          id="anode-source"
          className="w-4 h-4 bg-red-500 rounded-full"
          style={{
            left: "-2px",
            top: "116px",
            zIndex: 10,
          }}
        />

        {/* Cathode Handle (Negative Pin) */}
        <Handle
          type="target"
          position={Position.Right}
          id="cathode-target"
          className="w-4 h-4 bg-black rounded-full"
          style={{
            right: "-2px",
            top: "100px",
            zIndex: 10,
          }}
        />
        <Handle
          type="source"
          position={Position.Right}
          id="cathode-source"
          className="w-4 h-4 bg-black rounded-full"
          style={{
            right: "-2px",
            top: "100px",
            zIndex: 10,
          }}
        />

        {/* LED Bulb Body */}
        <div
          className="rounded-t-full shadow-md"
          style={{
            width: `${size.width}px`,
            height: `${size.height}px`,
            backgroundColor: color,
            position: "relative",
            zIndex: 10,
          }}
          ref={bulbRef}
          onClick={handleClick}
        />

        {/* Color Picker */}
        {showInput && (
          <input
            ref={inputRef} // Add reference to input field
            type="color"
            autoFocus
            value={color}
            className="absolute w-24 p-0.5 text-center bg-white border border-gray-300 rounded shadow-md"
            style={{
              top: `${size.height / 2 + 10}px`,
              zIndex: 11,
              height: '24px' // Set a smaller height for the input field
            }}
            onChange={handleColorChange}
            onKeyDown={handleKeyDown}
          />
        )}

        {/* Positive Pin (Anode) */}
        <div
          className="absolute left-[-6px] w-2 h-14 bg-red-600 rounded-tl-lg"
          style={{
            bottom: -53, // Adjust this value to position the anode correctly
            zIndex: 5, // Ensure the pin is behind the LED bulb
          }}
        />

        {/* Negative Pin (Cathode) */}
        <div
          className="absolute right-[-6px] w-2 h-10 bg-black rounded-tr-lg"
          style={{
            bottom: `-${size.height / 2 + 7}px`, // Adjust this value to position the cathode correctly
            zIndex: 5, // Ensure the pin is behind the LED bulb
          }}
        />
      </div>
    </Tooltip>
  );
};

export { LED };

