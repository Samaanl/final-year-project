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
  const [brightnessState, setBrightness] = useState(brightness);
  const [ledState, setLedState] = useState(false);

  useEffect(() => {
    if (ledState) {
      console.log("LED is active");
    } else {
      console.log("LED is inactive");
    }
  }, [ledState]);

  useEffect(() => {
    console.log("Current pinState:", pinState); // Debugging line
    console.log("PinState updated from:", pinState); // Additional debugging log
    setLedState(pinState); // Update ledState based on pinState
  }, [pinState]);

  useEffect(() => {
    console.log("Previous pinState:", pinState); // Additional debugging log
    console.log("PinState updated to:", pinState); // Additional debugging log
  }, [pinState]);

  useEffect(() => {
    if (isConnected) {
      console.log(`LED state updated:`, ledState);
    }
  }, [isConnected, ledState]);

  useEffect(() => {
    if (pinState[pin]) {
      setLedState(true);
    }
  }, [pinState, pin]);

  useEffect(() => {
    console.log(`ledState updated to: ${ledState}`); // Debug log
  }, [ledState]);

  useEffect(() => {
    const interval = setInterval(() => {
      console.log(`LED State: ${ledState}, Should Blink: ${shouldBlink}`); // Debug log
      if (ledState && shouldBlink) {
        console.log("LED is blinking");
        setColor(prevColor => prevColor === 'yellow' ? 'red' : 'yellow'); // Toggle color for blinking effect
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [ledState, shouldBlink]);

  const handleClick = () => {
    setShowInput(true);
  };

  const handleColorChange = (e) => {
    setColor(e.target.value);
    localStorage.setItem(`ledColor-${id}`, e.target.value);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      setShowInput(false);
    }
  };

  const style = {
    transform: `translate(${pos.x}px, ${pos.y}px)`,
    boxShadow: ledState ? `0 0 64px 21px ${color}` : 'none',
  };

  return (
    <Tooltip text="LED: A Light Emitting Diode (LED) is a semiconductor device that emits light when an electric current passes through it.">
      <div
        className={`relative flex flex-col items-center justify-center cursor-pointer transition-all duration-300 hover:shadow-2xl mx-4 w-3 ${ledState ? 'active' : ''}`}
        style={style}
        ref={bulbRef}
        onClick={() => setLedState(!ledState)}
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