import React from "react";
import { useDraggable } from "@dnd-kit/core";

const Drag = ({ children, pos, dragStart, id, isSelected, onSelect, onDelete }) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id });

  const style = transform
    ? {
        transform: `translate3d(${transform.x + pos.x}px, ${transform.y + pos.y}px, 0)`,
        position: "absolute",
        padding: "8px",
        backgroundColor: id === "source" ? "#4CAF50" : "gray",
        display: "inline-block",
        cursor: dragStart ? "grabbing" : "grab",
      }
    : {
        transform: `translate3d(${pos.x}px, ${pos.y}px, 0)`,
        position: "absolute",
        padding: "8px",
        backgroundColor: id === "source" ? "#4CAF50" : "gray",
        display: "inline-block",
        cursor: dragStart ? "grabbing" : "grab",
      };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onSelect}
    >
      {children}
      {isSelected && (
        <button
          onClick={(e) => {
            e.stopPropagation(); // Prevent click from selecting again
            onDelete();
          }}
          style={{
            position: "absolute",
            top: "-10px",
            right: "-10px",
            backgroundColor: "red",
            color: "white",
            borderRadius: "50%",
            border: "none",
            width: "20px",
            height: "20px",
            cursor: "pointer",
          }}
        >
          &times;
        </button>
      )}
    </div>
  );
};

export default Drag;
