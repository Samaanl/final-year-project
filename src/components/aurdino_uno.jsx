import React, { useState } from "react";
import { useDraggable } from "@dnd-kit/core";

export function ArduinoUnoR3(props) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: props.id,
  });

  const style = {
    transform: `translate(${props.pos.x}px, ${props.pos.y}px)`, // Fix the transform syntax
    width: "503px",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="relative cursor-pointer transition-all duration-300 hover:shadow-2xl"
    >
      <div id="board" className="relative w-[503px] h-[270px] bg-[#007acc] rounded-lg shadow-lg">
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

        {/* Digital Pins */}
        {[
          { id: 0, top: 40, left: 270 },
          { id: 1, top: 40, left: 300 },
          { id: 2, top: 40, left: 330 },
          { id: 3, top: 40, left: 360 },
          { id: 4, top: 40, left: 390 },
          { id: 5, top: 40, left: 420 },
          { id: 6, top: 40, left: 450 },
          { id: 7, top: 70, left: 270 },
          { id: 8, top: 70, left: 300 },
          { id: 9, top: 70, left: 330 },
          { id: 10, top: 70, left: 360 },
          { id: 11, top: 70, left: 390 },
          { id: 12, top: 70, left: 420 },
          { id: 13, top: 70, left: 450 },
        ].map((pin) => (
          <div
            key={`digital-pin-${pin.id}`}
            className="absolute bg-[#f8f8f8] text-black border-black border-2 rounded-full w-[30px] h-[30px] flex justify-center items-center font-bold cursor-pointer"
            style={{
              top: `${pin.top}px`,
              left: `${pin.left}px`,
            }}
          >
            {pin.id}
          </div>
        ))}

        {/* Power Pins */}
        <div className="absolute top-[240px] left-[70px] bg-[#f8f8f8] text-black border-black border-2 rounded-full w-[30px] h-[30px] flex justify-center items-center font-bold cursor-pointer text-xs">
          3.3V
        </div>
        <div className="absolute top-[240px] left-[100px] bg-[#f8f8f8] text-black border-black border-2 rounded-full w-[30px] h-[30px] flex justify-center items-center font-bold cursor-pointer text-xs">
          5V
        </div>
        <div className="absolute top-[240px] left-[130px] bg-[#f8f8f8] text-black border-black border-2 rounded-full w-[30px] h-[30px] flex justify-center items-center font-bold cursor-pointer text-xs">
          GND
        </div>
        <div className="absolute top-[240px] left-[160px] bg-[#f8f8f8] text-black border-black border-2 rounded-full w-[30px] h-[30px] flex justify-center items-center font-bold cursor-pointer text-xs">
          GND
        </div>
        <div className="absolute top-[240px] left-[190px] bg-[#f8f8f8] text-black border-black border-2 rounded-full w-[30px] h-[30px] flex justify-center items-center font-bold cursor-pointer text-xs">
          VIN
        </div>

        {/* Analog Pins */}
        {[
          { id: "A0", left: 300 },
          { id: "A1", left: 330 },
          { id: "A2", left: 360 },
          { id: "A3", left: 390 },
          { id: "A4", left: 420 },
          { id: "A5", left: 450 },
        ].map((pin) => (
          <div
            key={`analog-pin-${pin.id}`}
            className="absolute bg-[#f8f8f8] text-black border-black border-2 rounded-full w-[30px] h-[30px] flex justify-center items-center font-bold cursor-pointer"
            style={{
              top: "180px",
              left: `${pin.left}px`,
            }}
          >
            {pin.id}
          </div>
        ))}
      </div>
    </div>
  );
}
