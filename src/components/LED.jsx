import React, { useState, useEffect, useRef } from "react";
import { Handle, Position } from "@xyflow/react";
import Tooltip from "./Tooltip.jsx";
import "./Tooltip.css";

const LED = ({ id, pos, onDelete, brightness, pinState, shouldBlink = false, isConnected = false, pin }) => {
  const [size] = useState({ width: 48, height: 64 });
  const [color, setColor] = useState(localStorage.getItem(`ledColor-${id}`) || "yellow");
  const [showInput, setShowInput] = useState(false);
  const inputRef = useRef(null);
  const bulbRef = useRef(null);
  const [ledState, setLedState] = useState(false);

  // Log when component mounts
  useEffect(() => {
    console.log(`LED ${id} mounted, pin: ${pin}, isConnected: ${isConnected}`);
    console.log(`LED ${id} initial pinState:`, pinState);
  }, []);

  // Log when props change
  useEffect(() => {
    console.log(`LED ${id} props updated - pin: ${pin}, isConnected: ${isConnected}, shouldBlink: ${shouldBlink}`);
    if (pin !== undefined) {
      console.log(`LED ${id} pin ${pin} state in pinState:`, pinState[pin]);
    }
  }, [id, pin, isConnected, shouldBlink, pinState]);

  // Handle pin state changes
  useEffect(() => {
    if (isConnected && pin !== undefined) {
      const newState = pinState[pin];
      console.log(`LED ${id} pin ${pin} state changed to:`, newState);
      console.log(`LED ${id} pinState object:`, pinState);
      setLedState(newState);
    } else {
      console.log(`LED ${id} not connected or no pin assigned - isConnected: ${isConnected}, pin: ${pin}`);
    }
  }, [isConnected, pin, pinState]);

  // Blinking effect
  useEffect(() => {
    console.log(`LED ${id} blink effect - shouldBlink: ${shouldBlink}, ledState: ${ledState}, isConnected: ${isConnected}`);
    
    if (!shouldBlink || !isConnected) {
      console.log(`LED ${id} not blinking - conditions not met:`, {
        shouldBlink,
        isConnected
      });
      return;
    }
    
    // If the LED is connected and the pin state is HIGH, start blinking
    // If the pin state is LOW, don't blink
    if (!ledState) {
      console.log(`LED ${id} not blinking - pin state is LOW`);
      setColor("yellow"); // Reset to default color when pin is LOW
      return;
    }

    console.log(`LED ${id} starting blink interval`);
    const blinkInterval = setInterval(() => {
      console.log(`LED ${id} changing color in blink interval`);
      setColor(prevColor => {
        const newColor = prevColor === 'yellow' ? 'red' : 'yellow';
        console.log(`LED ${id} color changed from ${prevColor} to ${newColor}`);
        return newColor;
      });
    }, 1000);

    return () => {
      console.log(`LED ${id} cleaning up blink interval`);
      clearInterval(blinkInterval);
    };
  }, [id, shouldBlink, isConnected, ledState]);

  const handleClick = () => {
    console.log(`LED ${id} clicked`);
    setShowInput(true);
  };

  const handleColorChange = (e) => {
    const newColor = e.target.value;
    console.log(`LED ${id} color changed to ${newColor}`);
    setColor(newColor);
    localStorage.setItem(`ledColor-${id}`, newColor);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      setShowInput(false);
    }
  };

  // Calculate style with shadow based on LED state
  const style = {
    transform: `translate(${pos.x}px, ${pos.y}px)`,
    boxShadow: isConnected && ledState ? `0 0 64px 21px ${color}` : 'none',
  };

  console.log(`LED ${id} rendering with style:`, style);
  console.log(`LED ${id} current state - isConnected: ${isConnected}, ledState: ${ledState}, pin: ${pin}`);

  return (
    <Tooltip text="LED: A Light Emitting Diode (LED) is a semiconductor device that emits light when an electric current passes through it.">
      <div
        className={`relative flex flex-col items-center justify-center cursor-pointer transition-all duration-300 hover:shadow-2xl mx-4 w-3 ${isConnected && ledState ? 'active' : ''}`}
        style={style}
        ref={bulbRef}
        onClick={() => {
          console.log(`LED ${id} bulb clicked`);
          setColor(isConnected && ledState ? 'yellow' : 'red');
        }}
      >
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

        {showInput && (
          <input
            ref={inputRef}
            type="color"
            autoFocus
            value={color}
            className="absolute w-24 p-0.5 text-center bg-white border border-gray-300 rounded shadow-md"
            style={{
              top: `${size.height / 2 + 10}px`,
              zIndex: 11,
              height: '24px'
            }}
            onChange={handleColorChange}
            onKeyDown={handleKeyDown}
          />
        )}

        <div
          className="absolute left-[-6px] w-2 h-14 bg-red-600 rounded-tl-lg"
          style={{
            bottom: -53,
            zIndex: 5,
          }}
        />

        <div
          className="absolute right-[-6px] w-2 h-10 bg-black rounded-tr-lg"
          style={{
            bottom: `-${size.height / 2 + 7}px`,
            zIndex: 5,
          }}
        />
      </div>
    </Tooltip>
  );
};

export { LED };