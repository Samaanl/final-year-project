import React, { useState, useEffect, useRef, useLayoutEffect, useCallback, useMemo } from "react";
import { Handle, Position } from "@xyflow/react";
import { createPortal } from 'react-dom';
import Tooltip from "./Tooltip.jsx";
import "./Tooltip.css";

const ColorPicker = ({ id, color, onChange, onClose, position }) => {
  const pickerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  return createPortal(
    <div
      ref={pickerRef}
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        zIndex: 99999,
        backgroundColor: '#2d3748',
        padding: '12px',
        borderRadius: '8px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        border: '1px solid #4a5568',
        transform: 'translate(-50%, 10px)'
      }}
    >
      <input
        type="color"
        value={color}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100px',
          height: '40px',
          padding: '0',
          border: 'none',
          cursor: 'pointer',
          backgroundColor: 'transparent'
        }}
      />
    </div>,
    document.body
  );
};

const LED = ({ id, pos, onDelete, brightness, pinState, shouldBlink = false, isConnected = false, pin, pinStateVersion, realPinStatesRef }) => {
  const [size] = useState({ width: 48, height: 64 });
  const [color, setColor] = useState(localStorage.getItem(`ledColor-${id}`) || "green");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [pickerPosition, setPickerPosition] = useState({ x: 0, y: 0 });
  const bulbRef = useRef(null);
  const [ledState, setLedState] = useState(false);
  const [isBlinking, setIsBlinking] = useState(false);
  const blinkIntervalRef = useRef(null);
  const prevPinState = useRef(false);
  
  // Critical fix: Use layout effect to ensure hardware pin state is checked before painting
  useLayoutEffect(() => {
    if (!isConnected || pin === undefined) {
      // If LED is disconnected, make sure it doesn't blink
      if (isBlinking) {
        stopBlinking();
        setLedState(false);
      }
      prevPinState.current = false;
      return;
    }

    // Strong pin number validation
    if (typeof pin !== 'number' || isNaN(pin)) {
      console.error(`LED ${id}: Invalid pin number:`, pin);
      stopBlinking();
      setLedState(false);
      prevPinState.current = false;
      return;
    }

    // IMPORTANT: Only check the hardware state for this specific pin, ignore all others
    const thisLEDPinState = realPinStatesRef?.current?.[pin] || false;
    
    console.log(`LED ${id} checking hardware state ONLY for pin ${pin}: ${thisLEDPinState}`);
    
    if (prevPinState.current !== thisLEDPinState) {
      prevPinState.current = thisLEDPinState;
      setLedState(thisLEDPinState);
      
      if (thisLEDPinState && !isBlinking) {
        console.log(`LED ${id} pin ${pin} is HIGH - starting blink`);
        startBlinking();
      } else if (!thisLEDPinState && isBlinking) {
        console.log(`LED ${id} pin ${pin} is LOW - stopping blink`);
        stopBlinking();
      }
    }
  }, [pin, isConnected, pinStateVersion]);
  
  // Force cleanup when component unmounts or connection changes
  useEffect(() => {
    return () => {
      console.log(`LED ${id} cleaning up blinking state`);
      if (blinkIntervalRef.current) {
        clearInterval(blinkIntervalRef.current);
        blinkIntervalRef.current = null;
      }
    };
  }, [id]);
  
  // Extra cleanup when isConnected changes
  useEffect(() => {
    if (!isConnected) {
      console.log(`LED ${id} is disconnected - cleaning up state`);
      if (isBlinking) {
        stopBlinking();
      }
      setLedState(false);
      prevPinState.current = false;
    } else {
      console.log(`LED ${id} is connected to pin ${pin}, checking initial state`);
    }
  }, [isConnected, id, pin]);
  
  // Clean up and reset when the pin changes
  useEffect(() => {
    // Function to handle pin changes
    const handlePinChange = () => {
      console.log(`LED ${id} pin changed to ${pin}`);
      
      // Reset blinking state
      if (isBlinking) {
        stopBlinking();
      }
      
      // If disconnected or no pin, reset state
      if (!isConnected || pin === undefined) {
        setLedState(false);
        prevPinState.current = false;
        return;
      }
      
      // ONLY get the state for THIS specific pin
      const thisPinState = pin !== undefined ? (realPinStatesRef?.current?.[pin] || false) : false;
      console.log(`LED ${id} new pin ${pin} state: ${thisPinState} (ISOLATED)`);
      
      // Update component state
      setLedState(thisPinState);
      prevPinState.current = thisPinState;
      
      // Start blinking if THIS pin is HIGH
      if (thisPinState) {
        startBlinking();
      }
    };
    
    // Call the handler
    handlePinChange();
    
  }, [pin, id, isConnected, isBlinking, realPinStatesRef]);

  // Function to start blinking
  const startBlinking = useCallback(() => {
    setIsBlinking(true);
    if (blinkIntervalRef.current) {
      clearInterval(blinkIntervalRef.current);
    }
    
    const activeColor = color;
    const dimColor = color === 'yellow' ? '#ffeb3b' : color;
    
    // Create a pin-specific blinking interval
    console.log(`LED ${id} starting blink for pin ${pin} only`);
    
    // Use a consistent interval tied to the pin state
    blinkIntervalRef.current = setInterval(() => {
      // Only blink if we're still connected and the pin is HIGH
      if (isConnected && pin !== undefined && realPinStatesRef?.current?.[pin]) {
        setColor(prev => prev === activeColor ? dimColor : activeColor);
      } else {
        // Stop blinking if pin state changes
        stopBlinking();
      }
    }, 200);
  }, [color, isConnected, pin, realPinStatesRef, id]);
  
  // Function to stop blinking
  const stopBlinking = () => {
    console.log(`LED ${id} stopping blink effect`);
    setIsBlinking(false);
    
    // Clear blink interval
    if (blinkIntervalRef.current) {
      clearInterval(blinkIntervalRef.current);
      blinkIntervalRef.current = null;
    }
    
    // Reset back to original saved color when stopped
    const originalColor = localStorage.getItem(`ledColor-${id}`) || "yellow";
    if (color !== originalColor) {
      setColor(originalColor);
    }
  };

  // Handle right-click on LED body
  const handleContextMenu = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const rect = e.currentTarget.getBoundingClientRect();
    setPickerPosition({
      x: rect.left + (rect.width / 2) + window.scrollX,
      y: rect.bottom + window.scrollY
    });
    setShowColorPicker(true);
  }, []);

  // Handle left-click to also show color picker
  const handleClick = (e) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    setPickerPosition({
      x: rect.left + (rect.width / 2) + window.scrollX,
      y: rect.bottom + window.scrollY
    });
    setShowColorPicker(prev => !prev);
  };

  // Handle color change
  const handleColorChange = (newColor) => {
    setColor(newColor);
    localStorage.setItem(`ledColor-${id}`, newColor);
    
    // If currently blinking, restart the blink effect with new color
    if (isBlinking) {
      clearInterval(blinkIntervalRef.current);
      startBlinking();
    }
  };
  // Get the real hardware pin state for this specific LED only
  const thisPinHardwareState = isConnected && pin !== undefined && 
    realPinStatesRef && realPinStatesRef.current ? 
    realPinStatesRef.current[pin] || false : false;
    
  // Ensure we never use pinState from props, only use the hardware state reference for THIS pin
  const hardwarePinState = thisPinHardwareState;
  
  // Add an effect to check pin state changes independently on each render
  useEffect(() => {
    // Skip if not connected or no pin
    if (!isConnected || pin === undefined) return;
    
    console.log(`LED ${id} pin ${pin} hardware state is now: ${hardwarePinState}`);
    
    // Start or stop blinking based on current hardware state
    if (hardwarePinState && !isBlinking) {
      startBlinking();
    } else if (!hardwarePinState && isBlinking) {
      stopBlinking();
    }
    
    // Cleanup on unmount or pin change
    return () => {
      if (isBlinking) {
        console.log(`LED ${id} cleaning up blinking on pin change/unmount`);
        stopBlinking();
      }
    };
  }, [hardwarePinState, isConnected, pin, id, isBlinking, startBlinking]);
  
  // Memoize style calculations with strict pin isolation
  const style = useMemo(() => ({
    transform: `translate(${pos.x}px, ${pos.y}px)`,
    boxShadow: isConnected && thisPinHardwareState ? `0 0 80px 40px ${color}` : 'none',
    transition: 'box-shadow 0.2s ease-in-out',
    position: 'relative',
    zIndex: 5
  }), [pos.x, pos.y, isConnected, color, thisPinHardwareState]);

  // Additional style for the bulb with strict pin isolation
  const bulbStyle = {
    width: `${size.width}px`,
    height: `${size.height}px`,
    backgroundColor: color,
    opacity: isConnected && thisPinHardwareState ? 1 : 0.8,
    position: "relative",
    zIndex: 10,
    transition: "all 0.2s ease-in-out",
    filter: isConnected && thisPinHardwareState ? 'brightness(1.8) contrast(1.2)' : 'brightness(0.8)',
    borderRadius: '50% 50% 0 0',
    cursor: 'pointer'
  };
  console.log(`LED ${id} rendering with style:`, style);
  console.log(`LED ${id} current state - isConnected: ${isConnected}, ledState: ${ledState}, hardwarePinState: ${hardwarePinState}, pin: ${pin}`);
  
  // Extra debug for hardware state at render time
  if (pin !== undefined && realPinStatesRef && realPinStatesRef.current) {
    console.log(`LED ${id} HARDWARE STATE CHECK - pin ${pin}:`, realPinStatesRef.current[pin]);
  }

  // Cancel blinking when component unmounts
  useEffect(() => {
    return () => {
      console.log(`LED ${id} unmounting - cleanup`);
      if (blinkIntervalRef.current) {
        clearInterval(blinkIntervalRef.current);
        blinkIntervalRef.current = null;
      }
    };
  }, [id]);

  return (
    <Tooltip text="LED: A Light Emitting Diode (LED) is a semiconductor device that emits light when an electric current passes through it.">
      <div
        className={`relative flex flex-col items-center justify-center transition-all duration-300 hover:shadow-2xl mx-4 w-3 ${isConnected && hardwarePinState ? 'active' : ''}`}
        style={style}
        ref={bulbRef}
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
          className="rounded-t-full shadow-md led-bulb"
          style={{
            ...bulbStyle,
            pointerEvents: 'all',
            cursor: 'pointer'
          }}
          onContextMenu={handleContextMenu}
          onClick={handleClick}
        />

        {showColorPicker && (
          <ColorPicker
            id={id}
            color={color}
            onChange={handleColorChange}
            onClose={() => setShowColorPicker(false)}
            position={pickerPosition}
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