import React, { useState } from "react";
import { Position } from "@xyflow/react";
import PropTypes from 'prop-types';
import '@xyflow/react/dist/style.css';
import Tooltip from "./Tooltip.jsx";
import BreadboardHandle from "./breadboardHandle.jsx";
import "./Tooltip.css";

export function Breadboard(props) {
  const [isDeleted, setIsDeleted] = useState(false); // State to hide the component

  const style = {
    width: "1000px", // Restored original width
    height: "250px", // Restored original height
    fontFamily: "Arial, sans-serif",
    backgroundColor: "#f4f4f4",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "11px",
    position: "absolute",
    border: "2px solid #ccc",
    borderRadius: "4px",
    boxShadow: "0px 2px 5px rgba(0, 0, 0, 0.1)",
    cursor: "pointer",
    transform: `translate(${props.pos.x}px, ${props.pos.y}px)`, // Using props for position
  };

  const generateRailHoles = (railType, section) =>
    Array.from({ length: 30 }).map((_, index) => (
      <div
        key={index}
        className="hole-container"
        style={{ position: 'relative', display: 'inline-block', margin: '4px', padding: '4px' }}
      >
        <span key={`hole-${index}`} className="hole"></span>
        <BreadboardHandle
          type="source"
          position={Position.Left}
          id={`handle-source-${section}-${railType}-rail-hole-${index}`}
          className="w-2 h-2 bg-black-500 rounded-full absolute"
          style={{
            top: '50%',
            left: '100%',
            transform: 'translate(2px, -50%)',
          }}
        />
        <BreadboardHandle
          type="target"
          position={Position.Left}
          id={`handle-target-${section}-${railType}-rail-hole-${index}`}
          className="w-2 h-2 bg-black-500 rounded-full absolute"
          style={{
            top: '50%',
            left: '100%',
            transform: 'translate(2px, -50%)',
          }}
        />
      </div>
    ));

  const generateStripRows = () =>
    Array.from({ length: 10 }).map((_, rowIndex) => (
      <div key={rowIndex} className="row" style={{ display: 'flex' }}>
        {Array.from({ length: 30 }).map((_, colIndex) => (
          <div
            key={`hole-${rowIndex}-${colIndex}`}
            className="hole-container"
            style={{ position: 'relative', margin: '4px', padding: '4px' }}
          >
            <span className="hole"></span>
            <BreadboardHandle
              type="source"
              position={Position.Left}
              id={`handle-source-main-hole-${rowIndex}-${colIndex}`}
              className="w-2 h-2 bg-black-500 rounded-full absolute"
              style={{
                top: '50%',
                left: '100%',
                transform: 'translate(2px, -50%)',
              }}
            />
            <BreadboardHandle
              type="target"
              position={Position.Left}
              id={`handle-target-main-hole-${rowIndex}-${colIndex}`}
              className="w-2 h-2 bg-black-500 rounded-full absolute"
              style={{
                top: '50%',
                left: '100%',
                transform: 'translate(2px, -50%)',
              }}
            />
          </div>
        ))}
      </div>
    ));

  const generateColumnLabels = () =>
    Array.from({ length: 30 }).map((_, index) => (
      <div key={index} className="column-label">
        {index + 1}
      </div>
    ));

  if (isDeleted) return null; // Return null if the component is deleted

  return (
    <Tooltip text="Breadboard: Used to prototype electronic circuits. Red rails (+) for positive voltage, blue rails (-) for ground. Middle section contains tie points for connecting components.">
      <div className="breadboard" style={style}>
        <style>{`
          .hole {
            width: 4px;
            height: 4px;
            background-color: #333;
            border-radius: 50%;
            display: none;
          }

          .hole-container {
            position: relative;
            margin: 4px;
            padding: 4px;
            cursor: pointer;
          }

          .row {
            display: flex;
            justify-content: space-between;
          }

          .breadboard {
            width: 980px;
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

          .react-flow__node {
            z-index: -1 !important;
          }
        `}</style>

        <div className="breadboard">
          {/* Top Power Rails */}
          <div
            className="power-rails-top"
            style={{ display: "flex", flexDirection: "column", marginBottom: "4px" }}
          >
            <div
              className="rail red"
              style={{
                width: "100%",
                backgroundColor: "#eee",
                border: "1px solid #ccc",
                display: "flex",
                flexDirection: "column",
                padding: "2px",
                marginBottom: "2px",
                borderLeft: "3px solid red",
              }}
            >
              <div
                className="label"
                style={{ textAlign: "center", fontSize: "8px", marginBottom: "2px" }}
              >
                +
              </div>
              <div className="row">{generateRailHoles("red", "top")}</div>
            </div>
            <div
              className="rail blue"
              style={{
                width: "100%",
                backgroundColor: "#eee",
                border: "1px solid #ccc",
                display: "flex",
                flexDirection: "column",
                padding: "2px",
                borderLeft: "3px solid blue",
              }}
            >
              <div
                className="label"
                style={{ textAlign: "center", fontSize: "8px", marginBottom: "2px" }}
              >
                -
              </div>
              <div className="row">{generateRailHoles("blue", "top")}</div>
            </div>
          </div>

          {/* Column Labels */}
          <div
            className="column-labels"
            style={{ display: "flex", justifyContent: "space-around", marginBottom: "2px" }}
          >
            {generateColumnLabels()}
          </div>

          {/* Main Board */}
          <div className="main-board" style={{ display: "flex" }}>
            <div
              className="terminal-strip"
              style={{ flex: 1, display: "flex", flexDirection: "column" }}
            >
              {generateStripRows()}
            </div>
          </div>

          {/* Bottom Power Rails */}
          <div
            className="power-rails-bottom"
            style={{ display: "flex", flexDirection: "column", marginTop: "4px" }}
          >
            <div
              className="rail red"
              style={{
                width: "100%",
                backgroundColor: "#eee",
                border: "1px solid #ccc",
                display: "flex",
                flexDirection: "column",
                padding: "2px",
                marginBottom: "2px",
                borderLeft: "3px solid red",
              }}
            >
              <div
                className="label"
                style={{ textAlign: "center", fontSize: "8px", marginBottom: "2px" }}
              >
                +
              </div>
              <div className="row">{generateRailHoles("red", "bottom")}</div>
            </div>
            <div
              className="rail blue"
              style={{
                width: "100%",
                backgroundColor: "#eee",
                border: "1px solid #ccc",
                display: "flex",
                flexDirection: "column",
                padding: "2px",
                borderLeft: "3px solid blue",
              }}
            >
              <div
                className="label"
                style={{ textAlign: "center", fontSize: "8px", marginBottom: "2px" }}
              >
                -
              </div>
              <div className="row">{generateRailHoles("blue", "bottom")}</div>
            </div>
          </div>
        </div>
      </div>
    </Tooltip>
  );
}
Breadboard.propTypes = {
  pos: PropTypes.shape({
    x: PropTypes.number.isRequired,
    y: PropTypes.number.isRequired
  }).isRequired,
};

export default Breadboard;