import React, { useState, useEffect, useRef } from "react";
import { Handle, Position } from "@xyflow/react";

export function LED(props) {
  const [size] = useState({ width: 48, height: 64 }); // Fixed size for the LED
  const [color, setColor] = useState(localStorage.getItem('ledColor') || 'yellow');
  const [showInput, setShowInput] = useState(false); // Toggle input visibility
  const inputRef = useRef(null); // Reference for the input field
  const bulbRef = useRef(null); // Reference for the LED bulb body

  // Effect to handle clicks outside the input or LED bulb body
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        !showInput && // Only close if input is not already hidden
        inputRef.current && !inputRef.current.contains(event.target) &&
        bulbRef.current && !bulbRef.current.contains(event.target)
      ) {
        // If user clicks outside and doesn't enter a new color, reset to yellow
        if (!inputRef.current.value) { 
          setColor("yellow"); 
        }
        setShowInput(false);
      }
    };
  
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showInput]); // Only re-run when showInput changes

  const handleBodyClick = () => {
    setShowInput(true); // Show the input field when the body is clicked
  };

  const handleColorChange = (e) => {
    if (e.key === "Enter" && e.target.value) {
      setColor(e.target.value); 
      localStorage.setItem("ledColor", e.target.value); // Store in localStorage
      setShowInput(false);
    }
  };

  const style = {
    transform: `translate(${props.pos.x}px, ${props.pos.y}px)`, // Using props for position
  };

  return (
    <div
      className="relative flex flex-col items-center justify-center cursor-pointer transition-all duration-300 hover:shadow-2xl mx-4 w-3"
      style={style}
      ref={bulbRef} // Add reference to LED bulb body
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
        }}
      />

      {/* LED Bulb Body */}
      <div
        onClick={handleBodyClick} // Trigger input field toggle on click
        className="rounded-t-full shadow-md"
        style={{
          width: `${size.width}px`,
          height: `${size.height}px`,
          backgroundColor: color, // Use dynamic color
          position: "relative", // Ensure the LED bulb is positioned relative
          zIndex: 10, // Place the LED bulb in front of the pins
        }}
      />

      {/* Input Field */}
      {showInput && (
        <input
          ref={inputRef} // Add reference to input field
          type="text"
          autoFocus
          placeholder="Enter color"
          className="absolute w-24 p-1 text-center bg-white border border-gray-300 rounded shadow-md"
          style={{
            top: `${size.height / 2 + 10}px`,
            zIndex: 11
          }}
          onKeyDown={handleColorChange}
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
  );
}
