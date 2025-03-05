import React, { useState, useEffect, useRef, useLayoutEffect, useCallback, useMemo } from "react";
import { Handle, Position } from "@xyflow/react";
import { createPortal } from 'react-dom';
import Tooltip from "./Tooltip.jsx";
import "./Tooltip.css";

const ColorPicker = ({ id, color, onChange, onClose, position }) => {
  const pickerRef = useRef(null);
  const [canClose, setCanClose] = useState(false);
  const [currentColor, setCurrentColor] = useState(color);
  
  // Set up the delayed ability to close
  useEffect(() => {
    const timer = setTimeout(() => {
      setCanClose(true);
    }, 500); // Wait 500ms before allowing close

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!canClose) return; // Don't close if we're not ready
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        onChange(currentColor); // Apply the current color when closing
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [canClose, onClose, onChange, currentColor]);

  const handleColorChange = (e) => {
    const newColor = e.target.value;
    setCurrentColor(newColor);
    onChange(newColor);
  };

  return createPortal(
    <div
      ref={pickerRef}
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        zIndex: 9999,
        backgroundColor: 'white',
        padding: '10px',
        borderRadius: '8px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        border: '1px solid #ccc',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <input
        type="color"
        value={currentColor}
        style={{
          width: '120px',
          height: '50px',
          padding: '0',
          border: 'none',
          cursor: 'pointer',
          backgroundColor: 'transparent'
        }}
        onChange={handleColorChange}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      />
      <div style={{ 
        fontSize: '12px', 
        color: '#666',
        textAlign: 'center',
        userSelect: 'none'
      }}>
        Click outside to apply
      </div>
    </div>,
    document.body
  );
};

const LED = ({ id, pos, onDelete, brightness, pinState, shouldBlink = false, isConnected = false, pin, pinStateVersion, realPinStatesRef }) => {
  const [size] = useState({ width: 48, height: 64 });
  const [color, setColor] = useState(localStorage.getItem(`ledColor-${id}`) || "yellow");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [pickerPosition, setPickerPosition] = useState({ x: 0, y: 0 });
  const bulbRef = useRef(null);
  const [ledState, setLedState] = useState(false);
  const [isBlinking, setIsBlinking] = useState(false);
  const blinkIntervalRef = useRef(null);
  const prevPinState = useRef(false);
  
  // Critical fix: Use layout effect to ensure hardware pin state is checked before painting
  useLayoutEffect(() => {
    if (!isConnected || pin === undefined) return;

    const hardwarePinState = realPinStatesRef?.current?.[pin] || false;
    
    if (prevPinState.current !== hardwarePinState) {
      prevPinState.current = hardwarePinState;
      setLedState(hardwarePinState);
      
      if (hardwarePinState && !isBlinking) {
        startBlinking();
      } else if (!hardwarePinState && isBlinking) {
        stopBlinking();
      }
    }
  }, [pin, isConnected, realPinStatesRef?.current]);
  
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
  const startBlinking = useCallback(() => {
    setIsBlinking(true);
    if (blinkIntervalRef.current) {
      clearInterval(blinkIntervalRef.current);
    }
    
    const activeColor = color;
    const dimColor = color === 'yellow' ? '#ffeb3b' : color;
    
    blinkIntervalRef.current = setInterval(() => {
      setColor(prev => prev === activeColor ? dimColor : activeColor);
    }, 200);
  }, [color]);
  
  // Function to stop blinking
  const stopBlinking = () => {
    console.log(`LED ${id} stopping blink effect`);
    setIsBlinking(false);
    
    // Clear blink interval
    if (blinkIntervalRef.current) {
      clearInterval(blinkIntervalRef.current);
      blinkIntervalRef.current = null;
    }
  };

  // Handle right-click on LED body
  const handleContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Calculate position for color picker
    const rect = e.currentTarget.getBoundingClientRect();
    setPickerPosition({
      x: rect.left + window.scrollX,
      y: rect.bottom + window.scrollY + 10
    });
    setShowColorPicker(true);
  };

  // Handle color change
  const handleColorChange = (newColor) => {
    console.log(`LED ${id} color changed to ${newColor}`);
    setColor(newColor);
    localStorage.setItem(`ledColor-${id}`, newColor);
    
    // If currently blinking, restart the blink effect with new color
    if (isBlinking) {
      clearInterval(blinkIntervalRef.current);
      startBlinking();
    }
  };
  // Get the real hardware pin state for this render
  const hardwarePinState = isConnected && pin !== undefined && realPinStatesRef && realPinStatesRef.current ? 
    realPinStatesRef.current[pin] || false : 
    (pinState && pinState[pin]) || false;
  // Memoize style calculations
  const style = useMemo(() => ({
    transform: `translate(${pos.x}px, ${pos.y}px)`,
    boxShadow: isConnected && prevPinState.current ? `0 0 80px 40px ${color}` : 'none',
    transition: 'box-shadow 0.2s ease-in-out',
    position: 'relative',
    zIndex: 5
  }), [pos.x, pos.y, isConnected, color, prevPinState.current]);

  // Additional style for the bulb to make it glow - use hardware pin state and current color
  const bulbStyle = {
    width: `${size.width}px`,
    height: `${size.height}px`,
    backgroundColor: color,
    opacity: isConnected && hardwarePinState ? 1 : 0.8,
    position: "relative",
    zIndex: 10,
    transition: "all 0.2s ease-in-out",
    filter: isConnected && hardwarePinState ? 'brightness(1.8) contrast(1.2)' : 'brightness(0.8)',
    borderRadius: '50% 50% 0 0',
    cursor: 'pointer'
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
          className="rounded-t-full shadow-md"
          style={{
            ...bulbStyle,
            pointerEvents: 'all',
            cursor: 'pointer'
          }}
          onContextMenu={handleContextMenu}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
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