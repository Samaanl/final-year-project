import React, { useState, useEffect, useRef, useLayoutEffect } from "react";
import { Handle, Position } from "@xyflow/react";
import Tooltip from "./Tooltip.jsx";
import "./Tooltip.css";

const LED = ({ id, pos, onDelete, brightness, pinState, shouldBlink = false, isConnected = false, pin, pinStateVersion, realPinStatesRef }) => {
  const [size] = useState({ width: 48, height: 64 });
  const [color, setColor] = useState(localStorage.getItem(`ledColor-${id}`) || "yellow");
  const [showInput, setShowInput] = useState(false);
  const inputRef = useRef(null);
  const bulbRef = useRef(null);
  const [ledState, setLedState] = useState(false);
  const [isBlinking, setIsBlinking] = useState(false);
  const blinkIntervalRef = useRef(null);
  const prevPinState = useRef(false);
  
  // Critical fix: Use layout effect to ensure hardware pin state is checked before painting
  useLayoutEffect(() => {
    if (isConnected && pin !== undefined) {
      // Get state directly from hardware reference
      const hardwarePinState = realPinStatesRef && realPinStatesRef.current ? 
        realPinStatesRef.current[pin] || false : 
        (pinState && pinState[pin]) || false;
      
      // Only log changes to avoid console spam
      if (prevPinState.current !== hardwarePinState) {
        console.log(`LED ${id} DIRECT HARDWARE CHECK: pin ${pin}:`, hardwarePinState);
        prevPinState.current = hardwarePinState;
      }
      
      // Always update LED state based on hardware state
      if (ledState !== hardwarePinState) {
        console.log(`LED ${id} updating LED state to match hardware: ${hardwarePinState}`);
        setLedState(hardwarePinState);
      }
      
      // Start or stop blinking immediately based on hardware state
      if (hardwarePinState) {
        if (!isBlinking) {
          startBlinking();
        }
      } else if (isBlinking) {
        stopBlinking();
      }
    }
  });
  
  // Force update based on hardware state changes
  useEffect(() => {
    if (isConnected && pin !== undefined) {
      // Check both React pinState and hardware reference
      const reactPinState = pinState && typeof pinState[pin] !== 'undefined' ? pinState[pin] : false;
      const hardwarePinState = realPinStatesRef && realPinStatesRef.current ? 
        realPinStatesRef.current[pin] || false : 
        reactPinState;
      
      console.log(`LED ${id} PIN STATE CHECK:`);
      console.log(`  - React pinState[${pin}]:`, reactPinState);
      console.log(`  - Hardware state[${pin}]:`, hardwarePinState);
      
      // Use hardware state as source of truth
      if (ledState !== hardwarePinState) {
        console.log(`LED ${id} updating LED state to match hardware: ${hardwarePinState}`);
        setLedState(hardwarePinState);
        
        // Start or stop blinking based on hardware state
        if (hardwarePinState) {
          console.log(`LED ${id} HARDWARE PIN IS HIGH - STARTING BLINK EFFECT`);
          startBlinking();
        } else {
          stopBlinking();
        }
      }
    }
  }, [pinState, pinStateVersion, isConnected, pin, id]);
  
  // Log when component mounts and check hardware state immediately
  useEffect(() => {
    console.log(`LED ${id} mounted, pin: ${pin}, isConnected: ${isConnected}`);
    console.log(`LED ${id} initial hardware check:`, 
      realPinStatesRef ? realPinStatesRef.current : 'No hardware reference');
    
    // Check hardware state immediately on mount if connected to a pin
    if (isConnected && pin !== undefined) {
      const hardwarePinState = realPinStatesRef && realPinStatesRef.current ? 
        realPinStatesRef.current[pin] || false : 
        (pinState && pinState[pin]) || false;
        
      console.log(`LED ${id} initial hardware pin ${pin} state:`, hardwarePinState);
      setLedState(hardwarePinState);
      
      if (hardwarePinState) {
        startBlinking();
      }
    }
    
    // Cleanup any intervals on unmount
    return () => {
      if (blinkIntervalRef.current) {
        clearInterval(blinkIntervalRef.current);
      }
    };
  }, [id, pin, isConnected]);

  // Function to start blinking
  const startBlinking = () => {
    console.log(`LED ${id} starting blink effect`);
    setIsBlinking(true);
    
    // Clear any existing interval
    if (blinkIntervalRef.current) {
      clearInterval(blinkIntervalRef.current);
    }
    
    // Set initial active color - use bright red for better visibility
    setColor('#ff0000');
    
    // Create new blink interval with faster toggle for better visibility
    blinkIntervalRef.current = setInterval(() => {
      setColor(prevColor => prevColor === '#ff0000' ? '#ff9900' : '#ff0000');
    }, 200); // Even faster blinking for better visibility
  };
  
  // Function to stop blinking
  const stopBlinking = () => {
    console.log(`LED ${id} stopping blink effect`);
    setIsBlinking(false);
    
    // Clear blink interval
    if (blinkIntervalRef.current) {
      clearInterval(blinkIntervalRef.current);
      blinkIntervalRef.current = null;
    }
    
    // Reset to default color
    setColor('yellow');
  };

  const handleClick = () => {
    console.log(`LED ${id} clicked`);
    setShowInput(true);
  };

  // Get the real hardware pin state for this render
  const hardwarePinState = isConnected && pin !== undefined && realPinStatesRef && realPinStatesRef.current ? 
    realPinStatesRef.current[pin] || false : 
    (pinState && pinState[pin]) || false;
  
  // Calculate style with shadow based on hardware pin state
  const style = {
    transform: `translate(${pos.x}px, ${pos.y}px)`,
    boxShadow: isConnected && hardwarePinState ? `0 0 80px 40px ${color}` : 'none',
    transition: 'box-shadow 0.2s ease-in-out',
    position: 'relative',
    zIndex: 5
  };

  // Additional style for the bulb to make it glow - use hardware pin state
  const bulbStyle = {
    width: `${size.width}px`,
    height: `${size.height}px`,
    backgroundColor: isConnected && hardwarePinState ? color : 'rgba(255,255,0,0.6)',
    position: "relative",
    zIndex: 10,
    transition: "background-color 0.2s ease-in-out, filter 0.2s ease-in-out",
    filter: isConnected && hardwarePinState ? 'brightness(1.8) contrast(1.2)' : 'brightness(0.8)'
  };

  console.log(`LED ${id} rendering with style:`, style);
  console.log(`LED ${id} current state - isConnected: ${isConnected}, ledState: ${ledState}, hardwarePinState: ${hardwarePinState}, pin: ${pin}`);
  
  // Extra debug for hardware state at render time
  if (pin !== undefined && realPinStatesRef && realPinStatesRef.current) {
    console.log(`LED ${id} HARDWARE STATE CHECK - pin ${pin}:`, realPinStatesRef.current[pin]);
  }

  return (
    <Tooltip text="LED: A Light Emitting Diode (LED) is a semiconductor device that emits light when an electric current passes through it.">
      <div
        className={`relative flex flex-col items-center justify-center cursor-pointer transition-all duration-300 hover:shadow-2xl mx-4 w-3 ${isConnected && hardwarePinState ? 'active' : ''}`}
        style={style}
        ref={bulbRef}
        onClick={() => {
          console.log(`LED ${id} bulb clicked`);
          if (!isConnected) {
            setColor(color === 'yellow' ? 'red' : 'yellow');
          }
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
          style={bulbStyle}
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
            onChange={(e) => {
              const newColor = e.target.value;
              console.log(`LED ${id} color changed to ${newColor}`);
              setColor(newColor);
              localStorage.setItem(`ledColor-${id}`, newColor);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setShowInput(false);
              }
            }}
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