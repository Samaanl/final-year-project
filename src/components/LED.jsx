import React, { useState } from "react";
import { Handle, Position } from "@xyflow/react";

export function LED(props) {
  const [size] = useState({ width: 48, height: 64 }); // Fixed size for the LED

  const style = {
    transform: `translate(${props.pos.x}px, ${props.pos.y}px)`, // Using props for position
  };

  return (
    <div
      className="relative flex flex-col items-center justify-center cursor-pointer transition-all duration-300 hover:shadow-2xl mx-4 w-3"
      style={style}
    >
      {/* Anode Handle (Positive Pin) */}
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

      {/* Cathode Handle (Negative Pin) */}
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

      {/* LED Bulb Body */}
      <div
        className="bg-yellow-600 rounded-t-full shadow-md"
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
