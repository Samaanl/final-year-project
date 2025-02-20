import React, { useState, useEffect, useRef } from "react";
import { Handle, Position } from "@xyflow/react";
import Tooltip from "./Tooltip.jsx";
import "./Tooltip.css";

const LED = ({ id, pos, onDelete, brightness, ledStateRef, shouldBlink, isConnected }) => {
  const [size] = useState({ width: 48, height: 64 });
  const [color, setColor] = useState(localStorage.getItem(`ledColor-${id}`) || "yellow");
  const [showInput, setShowInput] = useState(false);
  const inputRef = useRef(null);
  const bulbRef = useRef(null);
  const [brightnessState, setBrightness] = useState(brightness);
  const [ledState, setLedState] = useState(ledStateRef.current);

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
  }, [showInput]);

  useEffect(() => {
    if (shouldBlink && isConnected) {
      const interval = setInterval(() => {
        setLedState(ledStateRef.current);
      }, 100);

      return () => clearInterval(interval);
    } else {
      setLedState(false);
    }
  }, [ledStateRef, shouldBlink, isConnected]);

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
    boxShadow: (ledState && isConnected) ? `0 0 64px 21px ${color}` : `0 0 0px 0px ${color}`,
  };

  return (
    <Tooltip text="LED: A Light Emitting Diode (LED) is a semiconductor device that emits light when an electric current passes through it.">
      <div
        className="relative flex flex-col items-center justify-center cursor-pointer transition-all duration-300 hover:shadow-2xl mx-4 w-3"
        style={style}
        ref={bulbRef}
        onClick={handleClick}
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