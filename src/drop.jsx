import React from "react";
import { useDroppable } from "@dnd-kit/core";

const Drop = (props) => {
  const { isOver, setNodeRef } = useDroppable({
    id: "droppable",
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        width: "100vw",
        height: "100vh",
        backgroundColor: "#f5f5f5",
        backgroundImage:
          "linear-gradient(#ddd 1px, transparent 1px), linear-gradient(90deg, #ddd 1px, transparent 1px)",
        backgroundSize: "20px 20px",
        position: "relative",
        overflow: "hidden",
        border: isOver ? "2px solid #4CAF50" : "2px solid #ddd",
        transition: "border-color 0.2s ease",
      }}
    >
      {props.children}
    </div>
  );
};

export default Drop;
