import React, { useState } from "react";
import { DndContext, useDraggable } from "@dnd-kit/core";

export function Breadboard(props) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: props.id,
  });

  const style = {
    transform: `translate(${props.pos.x}px, ${props.pos.y}px)`,
    width: "401px", // Reduced from 600px
    height: "200px", // Reduced from 400px
    fontFamily: "Arial, sans-serif",
    backgroundColor: "#f4f4f4",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
    border: "2px solid #ccc",
    borderRadius: "4px", // Reduced from 8px
    boxShadow: "0px 2px 5px rgba(0, 0, 0, 0.1)", // Reduced shadow
    touchAction: "none",
    cursor: "grab",
  };

  const generateRailHoles = () => Array.from({ length: 8 }).map((_, index) => <span key={index} className="hole"></span>);
  const generateStripRows = () => Array.from({ length: 8 }).map((_, rowIndex) => (
    <div key={rowIndex} className="row">
      {Array.from({ length: 8 }).map((_, colIndex) => <span key={colIndex} className="hole"></span>)}
    </div>
  ));
  const generateColumnLabels = () => Array.from({ length: 8 }).map((_, index) => <div key={index} className="column-label">{index + 1}</div>);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="transition-all duration-300 hover:shadow-xl"
    >
      <style>{`
        .hole {
          width: 4px;
          height: 4px;
          background-color: black;
          border-radius: 50%;
          display: inline-block;
          margin: 1px;
        }

        .row {
          display: flex;
          justify-content: space-between;
        }

        .breadboard {
          width: 401px;
          background-color: #fff;
          border: 1px solid #ccc;
          display: flex;
          flex-direction: column;
          padding: 4px;
          box-shadow: 0px 2px 5px rgba(0, 0, 0, 0.1);
        }

        .rail {
          padding: 2px;
        }

        .column-label {
          font-size: 8px;
        }
      `}</style>

      <div className="breadboard">
        {/* Top Power Rails */}
        <div className="power-rails-top" style={{ display: "flex", flexDirection: "column", marginBottom: "4px" }}>
          <div className="rail red" style={{ width: "100%", backgroundColor: "#eee", border: "1px solid #ccc", display: "flex", flexDirection: "column", padding: "2px", marginBottom: "2px", borderLeft: "3px solid red" }}>
            <div className="label" style={{ textAlign: "center", fontSize: "8px", marginBottom: "2px" }}>+</div>
            <div className="row">{generateRailHoles()}</div>
          </div>
          <div className="rail blue" style={{ width: "100%", backgroundColor: "#eee", border: "1px solid #ccc", display: "flex", flexDirection: "column", padding: "2px", borderLeft: "3px solid blue" }}>
            <div className="label" style={{ textAlign: "center", fontSize: "8px", marginBottom: "2px" }}>-</div>
            <div className="row">{generateRailHoles()}</div>
          </div>
        </div>

        {/* Column Labels */}
        <div className="column-labels" style={{ display: "flex", justifyContent: "space-around", marginBottom: "2px" }}>
          {generateColumnLabels()}
        </div>

        {/* Main Board */}
        <div className="main-board" style={{ display: "flex" }}>
          <div className="terminal-strip" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            {generateStripRows()}
          </div>
        </div>

        {/* Bottom Power Rails */}
        <div className="power-rails-bottom" style={{ display: "flex", flexDirection: "column", marginTop: "4px" }}>
          <div className="rail red" style={{ width: "100%", backgroundColor: "#eee", border: "1px solid #ccc", display: "flex", flexDirection: "column", padding: "2px", marginBottom: "2px", borderLeft: "3px solid red" }}>
            <div className="label" style={{ textAlign: "center", fontSize: "8px", marginBottom: "2px" }}>+</div>
            <div className="row">{generateRailHoles()}</div>
          </div>
          <div className="rail blue" style={{ width: "100%", backgroundColor: "#eee", border: "1px solid #ccc", display: "flex", flexDirection: "column", padding: "2px", borderLeft: "3px solid blue" }}>
            <div className="label" style={{ textAlign: "center", fontSize: "8px", marginBottom: "2px" }}>-</div>
            <div className="row">{generateRailHoles()}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function App() {
  const [items, setItems] = useState({
    breadboard: { id: 'breadboard', pos: { x: 0, y: 0 } }
  });

  function handleDragEnd(event) {
    const { active, delta } = event;
    
    setItems(prevItems => {
      const currentItem = prevItems[active.id];
      return {
        ...prevItems,
        [active.id]: {
          ...currentItem,
          pos: {
            x: currentItem.pos.x + delta.x,
            y: currentItem.pos.y + delta.y,
          },
        },
      };
    });
  }

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
        <Breadboard 
          id="breadboard" 
          pos={items.breadboard.pos}
        />
      </div>
    </DndContext>
  );
}

export default App;