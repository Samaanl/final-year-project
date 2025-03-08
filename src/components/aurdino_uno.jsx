import React, { useState, useEffect } from "react";
import { useDraggable } from "@dnd-kit/core";
import { Handle, Position } from "@xyflow/react";
import Tooltip from "./Tooltip.jsx";
import "./Tooltip.css";
import PropTypes from "prop-types";
import "@xyflow/react/dist/style.css";
import CustomHandle from "./CustomHandle.jsx";

export function ArduinoUnoR3(props) {
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: props.id,
  });

  const style = {
    transform: `translate(${props.pos.x}px, ${props.pos.y}px)`,
    width: "503px",
  };

  const [isDeleted, setIsDeleted] = useState(false); // State to hide the component

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest(".arduino-uno-r3")) {
        // Remove the line that sets showDelete
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []); // Only re-run when showDelete changes

  const PinNode = ({
    children,
    top,
    left,
    width = 30,
    height = 30,
    className = "",
    pinId,
  }) => (
    <div
      className={`absolute bg-[#f8f8f8] text-black border-black border-2 rounded-full flex justify-center items-center font-bold cursor-pointer ${className}`}
      style={{
        top: `${top}px`,
        left: `${left}px`,
        width: `${width}px`,
        height: `${height}px`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      title={`Pin ${pinId}`}
    >
      {/* Single handle that can act as both source and target */}
      <CustomHandle
        type="source"
        position={Position.Right}
        id={`handle-source-${pinId}`}
        className="w-2 h-2 rounded-full"
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 1,
        }}
      />
      <CustomHandle
        type="target"
        position={Position.Right}
        id={`handle-target-${pinId}`}
        className="w-2 h-2 rounded-full"
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 1,
        }}
      />
      {children}
    </div>
  );
  // Pin configurations with 4px spacing
  const digitalPins = [
    { id: 0, top: 30, left: 260 },
    { id: 1, top: 30, left: 294 },
    { id: 2, top: 30, left: 328 },
    { id: 3, top: 30, left: 362 },
    { id: 4, top: 30, left: 396 },
    { id: 5, top: 30, left: 430 },
    { id: 6, top: 30, left: 464 },
    { id: 7, top: 64, left: 260 },
    { id: 8, top: 64, left: 294 },
    { id: 9, top: 64, left: 328 },
    { id: 10, top: 64, left: 362 },
    { id: 11, top: 64, left: 396 },
    { id: 12, top: 64, left: 430 },
    { id: 13, top: 64, left: 464 },
  ];

  const powerPins = [
    { id: "3.3V", left: 60, top: 200 },
    { id: "5V", left: 94, top: 200 },
    { id: "GND1", left: 128, top: 200 },
    { id: "GND2", left: 162, top: 200 },
    { id: "VIN", left: 196, top: 200 },
  ];

  const analogPins = [
    { id: "A0", left: 294, top: 250 },
    { id: "A1", left: 328, top: 250 },
    { id: "A2", left: 362, top: 250 },
    { id: "A3", left: 396, top: 250 },
    { id: "A4", left: 430, top: 250 },
    { id: "A5", left: 464, top: 250 },
  ];

  // Combine all pins
  const allPins = [
    ...digitalPins.map((pin) => ({
      ...pin,
      type: "digital",
      label: pin.id.toString(),
    })),
    ...powerPins.map((pin) => ({
      ...pin,
      type: "power",
      label: pin.id,
    })),
    ...analogPins.map((pin) => ({
      ...pin,
      type: "analog",
      label: pin.id,
    })),
  ];

  if (isDeleted) return null; // Return null if the component is deleted

  return (
    <Tooltip text="Arduino Uno R3: A microcontroller board based on the ATmega328P. It has 14 digital input/output pins, 6 analog inputs, a 16 MHz quartz crystal, a USB connection, a power jack, an ICSP header, and a reset button.">
      <div className="arduino-uno-r3" style={style}>
        <div
          ref={setNodeRef}
          style={style}
          {...listeners}
          {...attributes}
          className="relative cursor-pointer transition-all duration-300 hover:shadow-2xl"
        >
          <style>{`
        .react-flow__node {
          z-index: -1 !important;
        }
      `}</style>
          <div
            id="board"
            className="relative w-[503px] h-[281px] bg-[#007acc] rounded-lg shadow-lg"
          >
            {/* USB Connector */}
            <div className="absolute top-[20px] left-[20px] w-[80px] h-[20px] bg-[#232222] text-white flex justify-center items-center">
              USB
            </div>

            {/* Power Jack */}
            <div className="absolute top-[20px] left-[120px] w-[60px] h-[20px] bg-[#232222] text-white flex justify-center items-center">
              Power
            </div>

            {/* Reset Button */}
            <div className="absolute top-[60px] left-[60px] w-[37px] h-[30px] bg-[#232222] text-white flex justify-center items-center">
              Reset
            </div>

            {/* ICSP Header */}
            <div className="absolute top-[130px] left-[90px] w-[50px] h-[30px] bg-[#232222] text-white flex justify-center items-center">
              ICSP
            </div>

            {/* Microcontroller */}
            <div className="absolute top-[120px] left-[250px] w-[93px] h-[50px] bg-[#232222] text-white flex justify-center items-center">
              ATmega328P
            </div>

            {/* LEDs */}
            <div className="absolute top-[60px] left-[200px] w-[15px] h-[15px] bg-red-500"></div>
            <div className="absolute top-[60px] left-[220px] w-[15px] h-[15px] bg-green-500"></div>
            <div className="absolute top-[60px] left-[240px] w-[15px] h-[15px] bg-green-500"></div>

            {/* Crystal Oscillator */}
            <div className="absolute top-[160px] left-[150px] w-[57px] h-[20px] bg-[#232222] text-white flex justify-center items-center">
              16 MHz
            </div>

            {/* Render Nodes for All Pins */}
            {allPins.map((pin) => (
              <PinNode
                key={`pin-${pin.type}-${pin.label}`}
                top={pin.top}
                left={pin.left}
                className={pin.type === "power" ? "text-xs" : ""}
                pinId={`${pin.type}-${pin.label}`}
              >
                {pin.label}
              </PinNode>
            ))}
          </div>
        </div>
      </div>
    </Tooltip>
  );
}
ArduinoUnoR3.propTypes = {
  id: PropTypes.string.isRequired,
  pos: PropTypes.shape({
    x: PropTypes.number.isRequired,
    y: PropTypes.number.isRequired,
  }).isRequired,
};

export default ArduinoUnoR3;
