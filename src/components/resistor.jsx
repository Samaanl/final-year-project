import React, { useState } from "react";
import { useDraggable } from "@dnd-kit/core";

export function Resistor(props) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: props.id,
  });

  const [size, setSize] = useState({ width: 120, height: 20 }); // Resistor dimensions

  // When the drag ends, reset the size to its original dimensions
  const handleDragEnd = () => {
    setSize({ width: 120, height: 20 }); // Reset size to original when dropped
  };

  const style = {
    transform: `translate(${props.pos.x}px, ${props.pos.y}px)`, // Adjust position
    width: 3
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onDragEnd={handleDragEnd}
      className="relative flex items-center justify-center cursor-pointer transition-all duration-300 hover:shadow-2xl"
    >
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
  );
}

export default Resistor;