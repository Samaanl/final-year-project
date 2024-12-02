import React, { useState } from "react";
import { DndContext } from "@dnd-kit/core";
import { createSnapModifier } from "@dnd-kit/modifiers";
import Drag from "./drag.jsx";
import Drop from "./drop.jsx";
import { LED } from "./components/LED.jsx"; // Import the LED component
import { Resistor } from "./components/resistor.jsx"; // Import the Resistor component

function Comb() {
  const [elements, setElements] = useState([]);
  const [dragStart, setDragStart] = useState(0);

  // Define source elements
  const sourceElements = [
    {
      id: "resistor",
      label: "Resistor",
      position: { x: window.innerWidth - 130, y: 20 },
    },
    {
      id: "led",
      label: "LED",
      component: <LED id="led-source" pos={{ x: 0, y: 0 }} />,
      position: { x: window.innerWidth - 130, y: 80 },
    },
    {
      id: "breadboard",
      label: "Breadboard",
      position: { x: window.innerWidth - 130, y: 140 },
    },
  ];

  const gridSize = 20;
  const snapToGridModifier = createSnapModifier(gridSize);

  const handleDragEnd = (event) => {
    setDragStart(0);
    const { delta, active } = event;

    if (delta) {
      const sourceElement = sourceElements.find((el) => el.id === active.id);
      if (sourceElement) {
        // Create new element when dragging from source
        setElements((prev) => [
          ...prev,
          {
            id: `${sourceElement.id}-${Date.now()}`,
            type: sourceElement.id,
            label: sourceElement.label,
            position: {
              x: sourceElement.position.x + delta.x,
              y: sourceElement.position.y + delta.y,
            },
          },
        ]);
      } else {
        // Update position for existing elements
        setElements((prev) =>
          prev.map((el) =>
            el.id === active.id
              ? {
                  ...el,
                  position: {
                    x: el.position.x + delta.x,
                    y: el.position.y + delta.y,
                  },
                }
              : el
          )
        );
      }
    }
  };

  return (
    <DndContext
      onDragStart={() => setDragStart(1)}
      onDragEnd={handleDragEnd}
      modifiers={[snapToGridModifier]}
    >
      <Drop>
        {/* Source elements (Draggable items) */}
        {sourceElements.map((source) => (
          <Drag
            key={source.id}
            id={source.id}
            pos={source.position}
            dragStart={dragStart}
          >
            {source.label}
          </Drag>
        ))}

        {/* Render dragged elements */}
        {elements.map((element) => {
          // Conditionally render different components based on element type
          if (element.type === "led") {
            return (
              <LED
                key={element.id}
                id={element.id}
                pos={element.position}
              />
            );
          }
          if (element.type === "resistor") {
            return (
              <Resistor
                key={element.id}
                id={element.id}
                pos={element.position}
              />
            );
          }
          // Handle other types of elements (e.g., breadboard)
          return (
            <Drag
              key={element.id}
              id={element.id}
              pos={element.position}
              dragStart={dragStart}
            >
              {element.label}
            </Drag>
          );
        })}
      </Drop>
    </DndContext>
  );
}

export default Comb;
