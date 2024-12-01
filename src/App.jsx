import React from "react";
import Ex from "./Ex.jsx";
import { UndoRedoProvider } from "./UndoRedoContext.jsx";
import { FaUndo, FaRedo } from "react-icons/fa"; // Importing undo/redo icons from react-icons

export default function App() {
  return (
    <UndoRedoProvider>
      <div className="h-screen flex flex-col">
        {/* Header with Undo and Redo Buttons */} 
        <div className="bg-white h-12 flex justify-start items-center px-4 gap-2">
          <button
            onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "z", ctrlKey: true }))} // Undo action
            className="flex items-center gap-1 px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded"
          >
            <FaUndo />
          </button>
          <button
            onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "y", ctrlKey: true }))} // Redo action
            className="flex items-center gap-1 px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded"
          >
            <FaRedo />
          </button>
        </div>
        {/* Main Content */}
        <Ex />
      </div>
    </UndoRedoProvider>
  );
}
