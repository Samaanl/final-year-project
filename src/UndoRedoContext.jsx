import React, { createContext, useState, useContext } from "react";

const UndoRedoContext = createContext();

export const useUndoRedo = () => useContext(UndoRedoContext);

export const UndoRedoProvider = ({ children }) => {
  const [history, setHistory] = useState([]);
  const [future, setFuture] = useState([]);
  const [currentState, setCurrentState] = useState([]);

  const saveState = (newState) => {
    setHistory((prev) => [...prev, currentState]);
    setFuture([]);
    setCurrentState(newState);
  };

  const undo = () => {
    if (history.length === 0) return;
    const previousState = history[history.length - 1];
    setHistory((prev) => prev.slice(0, prev.length - 1));
    setFuture((prev) => [currentState, ...prev]);
    setCurrentState(previousState);
  };

  const redo = () => {
    if (future.length === 0) return;
  
    const nextState = future[0];
    setFuture((prev) => prev.slice(1));
    setHistory((prev) => [...prev, currentState]);
    setCurrentState(nextState);
  };
  

  return (
    <UndoRedoContext.Provider
      value={{ currentState, saveState, undo, redo }}
    >
      {children}
    </UndoRedoContext.Provider>
  );
};
