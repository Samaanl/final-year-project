import React, { useEffect } from "react";
import { useState } from "react";
import { DndContext } from "@dnd-kit/core";
import { createSnapModifier } from "@dnd-kit/modifiers";
import Drag from "./drag.jsx";
import Drop from "./drop.jsx";
import { useUndoRedo } from "./UndoRedoContext.jsx";

function Comb() {
  const { currentState, saveState, undo, redo } = useUndoRedo();
  const [elements, setElements] = useState(currentState || []);
  const [dragStart, setDragStart] = useState(0);

  useEffect(() => {
    // Update `elements` whenever `currentState` changes
    setElements(currentState);
  }, [currentState]);

  // Define source elements
  const sourceElements = [
    { id: "motor", label: "Motor", position: { x: window.innerWidth - 130, y: 20 } },
    { id: "led", label: "LED", position: { x: window.innerWidth - 130, y: 80 } },
    { id: "breadboard", label: "Breadboard", position: { x: window.innerWidth - 130, y: 140 } },
  ];

  const gridSize = 20;
  const snapToGridModifier = createSnapModifier(gridSize);

  const handleDragEnd = (event) => {
    setDragStart(0);
    const { delta, active } = event;

    if (delta) {
      const sourceElement = sourceElements.find((el) => el.id === active.id);
      let newElements;

      if (sourceElement) {
        // Create new element when dragging from source
        newElements = [
          ...elements,
          {
            id: `${sourceElement.id}-${Date.now()}`,
            type: sourceElement.id,
            label: sourceElement.label,
            position: {
              x: sourceElement.position.x + delta.x,
              y: sourceElement.position.y + delta.y,
            },
          },
        ];
      } else {
        // Update position for existing elements
        newElements = elements.map((el) =>
          el.id === active.id
            ? {
                ...el,
                position: {
                  x: el.position.x + delta.x,
                  y: el.position.y + delta.y,
                },
              }
            : el
        );
      }

      setElements(newElements);
      saveState(newElements); // Save state only on new actions
    }
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.ctrlKey && event.key === "z") undo();
      if (event.ctrlKey && event.key === "y") redo();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo]);

  return (
    <DndContext
      onDragStart={() => setDragStart(1)}
      onDragEnd={handleDragEnd}
      modifiers={[snapToGridModifier]}
    >
      <Drop>
        {/* Source elements */}
        {sourceElements.map((source) => (
          <Drag key={source.id} id={source.id} pos={source.position} dragStart={dragStart}>
            {source.label}
          </Drag>
        ))}

        {/* Dragged elements */}
        {elements.map((element) => (
          <Drag key={element.id} id={element.id} pos={element.position} dragStart={dragStart}>
            {element.label}
          </Drag>
        ))}
      </Drop>
    </DndContext>
  );
}

export default Comb;
