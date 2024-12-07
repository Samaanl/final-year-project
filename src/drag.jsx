import React from "react";
import { useDraggable } from "@dnd-kit/core";

const Drag = ({ children, pos, dragStart, id }) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: id,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x + pos.x}px, ${
          transform.y + pos.y
        }px, 0)`,
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
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      {children}
    </div>
  );
};

export default Drag;
