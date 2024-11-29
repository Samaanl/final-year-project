import React, { useState } from "react";
import { useDraggable } from "@dnd-kit/core";

export function LED(props) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: props.id,
  });

  const [size, setSize] = useState({ width: 48, height: 64 }); // Initial smaller size

  // When the drag ends, reset the size to its original dimensions
  const handleDragEnd = () => {
    setSize({ width: 48, height: 64 }); // Reset size to original when dropped
  };

  const style = {
    transform: `translate(${props.pos.x}px, ${props.pos.y}px)`, // Fix the transform syntax
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onDragEnd={handleDragEnd}
      className="relative flex flex-col items-center justify-center cursor-pointer transition-all duration-300 hover:shadow-2xl mx-4 w-3"
    >
      {/* LED Bulb Body */}
      <div
        className="bg-green-600 rounded-t-full shadow-md"
        style={{
          width: `${size.width}px`,
          height: `${size.height}px`,
        }}
      />

      {/* Positive Pin (Anode) */}
      <div
        className="absolute left-[-6px] w-2 h-14 bg-red-600 rounded-tl-lg"
        style={{
          bottom: -53, // Adjust this value to position the anode correctly
        }}
      />

      {/* Negative Pin (Cathode) */}
      <div
        className="absolute right-[-6px] w-2 h-10 bg-black rounded-tr-lg"
        style={{
          bottom: `-${size.height / 2 + 7}px`, // Adjust this value to position the cathode correctly
        }}
      />
    </div>
  );
}
