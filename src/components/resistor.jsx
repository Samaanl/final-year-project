import React, { useState } from "react";
import { Handle, Position } from '@xyflow/react';
import { useDraggable } from "@dnd-kit/core";
import Tooltip from "./Tooltip.jsx";
import "./Tooltip.css";
import PropTypes from 'prop-types';


export function Resistor(props) {
  const { attributes, listeners, setNodeRef} = useDraggable({
    id: props.id,
  });

  const [size] = useState({ width: 120, height: 20 }); // Resistor dimensions

  // When the drag ends, reset the size to its original dimensions
  const handleDragEnd = () => {
    setSize({ width: 120, height: 20 }); // Reset size to original when dropped
  };

  const style = {
    transform: `translate(${props.pos.x}px, ${props.pos.y}px)`, // Adjust position
    width: 3
  };

  return (
    <Tooltip text="Resistor: An electronic component that limits current flow. Color bands indicate resistance value (Yellow-Red-Yellow-Gold = 47kΩ ±5%).">
    <div
      className="resistor"
      style={style}
    >
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onDragEnd={handleDragEnd}
      className="relative flex items-center justify-center cursor-pointer transition-all duration-300 hover:shadow-2xl"
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
          transform: 'translateY(-50%)'
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
          transform: 'translateY(-50%)'
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
          transform: 'translateY(-50%)'
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
          transform: 'translateY(-50%)'
        }} 
      />

      {/* Left Lead */}
      <div
        className="w-10 h-1 bg-gray-600"
        style={{
          position: "absolute",
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
          position: "absolute",
          right: `-${size.width / 2 + 10}px`,
        }}
      />
      </div>
    </div>
    </Tooltip> 
  );
}

Resistor.propTypes = {
  id: PropTypes.string.isRequired,
  pos: PropTypes.shape({
    x: PropTypes.number.isRequired,
    y: PropTypes.number.isRequired
  }).isRequired
};

export default Resistor;