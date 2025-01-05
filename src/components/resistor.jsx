import React, { useState, useEffect, useRef } from "react";
import { Handle, Position } from '@xyflow/react';
import { useDraggable } from "@dnd-kit/core";
import Tooltip from "./Tooltip.jsx";
import "./Tooltip.css";
import PropTypes from 'prop-types';

export function Resistor(props) {
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: props.id,
  });

  const [size] = useState({ width: 120, height: 20 }); // Resistor dimensions
  const [resistance, setResistance] = useState(localStorage.getItem(`resistor-${props.id}`) || '');
  const [showInput, setShowInput] = useState(false); // State to toggle input field
  const [showResistance, setShowResistance] = useState(false); // State to toggle resistance display
  const inputRef = useRef(null); // Reference for the input field
  const resistorRef = useRef(null); // Reference for the resistor body

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        showInput && // Only close if input is visible
        inputRef.current && !inputRef.current.contains(event.target) &&
        resistorRef.current && !resistorRef.current.contains(event.target)
      ) {
        setShowInput(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showInput]); // Only re-run when showInput changes

  const handleClick = () => {
    setShowInput(true); // Show the input field when the resistor is clicked
  };

  const handleInputChange = (e) => {
    setResistance(e.target.value);
  };

  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter' && e.target.value) {
      setResistance(e.target.value);
      localStorage.setItem(`resistor-${props.id}`, e.target.value); // Store in localStorage
      setShowInput(false);
    }
  };

  const style = {
    transform: `translate(${props.pos.x}px, ${props.pos.y}px)`, // Adjust position
    width: 3,
  };

  return (
    <Tooltip text="Resistor: A resistor is a passive electrical component that limits or regulates the flow of electrical current in an electronic circuit.">
      <div
        className="resistor"
        style={style}
        ref={resistorRef} // Add reference to resistor body
        onClick={handleClick} // Handle click to show input field
        onMouseEnter={() => setShowResistance(true)} // Show resistance value on hover
        onMouseLeave={() => setShowResistance(false)} // Hide resistance value when not hovering
      >
        <div
          ref={setNodeRef}
          style={style}
          {...listeners}
          {...attributes}
          className="relative flex items-center justify-center cursor-pointer transition-all duration-300"
        >
          {/* Left Handle */}
          <Handle
            type="target"
            position={Position.Left}
            id="left-target"
            className="w-4 h-4 bg-blue-500 rounded-full"
            style={{
              left: `-${size.width / 2 + 15}px`,
              top: '50%',
              transform: 'translateY(-50%)',
            }}
          />
          <Handle
            type="source"
            position={Position.Left}
            id="left-source"
            className="w-4 h-4 bg-blue-500 rounded-full"
            style={{
              left: `-${size.width / 2 + 15}px`,
              top: '50%',
              transform: 'translateY(-50%)',
            }}
          />

          {/* Right Handle */}
          <Handle
            type="target"
            position={Position.Right}
            id="right-target"
            className="w-4 h-4 bg-red-500 rounded-full"
            style={{
              right: `-${size.width / 2 + 15}px`,
              top: '50%',
              transform: 'translateY(-50%)',
            }}
          />
          <Handle
            type="source"
            position={Position.Right}
            id="right-source"
            className="w-4 h-4 bg-red-500 rounded-full"
            style={{
              right: `-${size.width / 2 + 15}px`,
              top: '50%',
              transform: 'translateY(-50%)',
            }}
          />

          {/* Left Lead */}
          <div
            className="w-10 h-1 bg-gray-600"
            style={{
              position: 'absolute',
              left: `-${size.width / 2 + 10}px`,
            }}
          />

          {/* Resistor Body */}
          <div
            className="h-4 bg-neutral-800 rounded-md shadow-md flex items-center justify-center"
            style={{
              width: `${size.width}px`,
              height: `${size.height}px`,
            }}
          >
            {/* Resistor Color Bands */}
            <div
              className="w-4 h-full bg-yellow-800 rounded"
              style={{ marginLeft: '10%' }}
            />
            <div
              className="w-4 h-full bg-red-600 rounded"
              style={{ marginLeft: '20%' }}
            />
            <div
              className="w-4 h-full bg-yellow-800 rounded"
              style={{ marginLeft: '20%' }}
            />
            <div
              className="w-4 h-full bg-yellow-600 rounded"
              style={{ marginLeft: '20%' }}
            />
          </div>

          {/* Right Lead */}
          <div
            className="w-10 h-1 bg-gray-600"
            style={{
              position: 'absolute',
              right: `-${size.width / 2 + 10}px`,
            }}
          />
          {showInput && (
            <input
              ref={inputRef} // Add reference to input field
              type="text"
              value={resistance}
              onChange={handleInputChange}
              onKeyDown={handleInputKeyDown} // Hide input field when Enter is pressed
              style={{
                position: 'absolute',
                top: '-25px',
                width: '60px',
                textAlign: 'center',
              }}
            />
          )}
          {!showInput && showResistance && (
            <div
              style={{
                position: 'absolute',
                top: '-25px', // Same position as input field
                width: '60px',
                textAlign: 'center',
                backgroundColor: 'white',
                padding: '2px 5px',
                borderRadius: '3px',
                boxShadow: '0px 2px 5px rgba(0,0,0,0.1)',
              }}
            >
              {resistance} Ω
            </div>
          )}
        </div>
      </div>
    </Tooltip>
  );
}

Resistor.propTypes = {
  id: PropTypes.string.isRequired,
  pos: PropTypes.shape({
    x: PropTypes.number.isRequired,
    y: PropTypes.number.isRequired,
  }).isRequired,
  data: PropTypes.shape({
    resistance: PropTypes.string,
  }),
  onResistorValueChange: PropTypes.func.isRequired,
};

export default Resistor;