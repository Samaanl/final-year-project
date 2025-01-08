import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  reconnectEdge,
  useEdgesState,
  addEdge,
} from "@xyflow/react";
import { LED } from "./components/LED.jsx";
import { Resistor } from "./components/resistor.jsx";
import { Breadboard } from "./components/breadboard.jsx";
import { ArduinoUnoR3 } from "./components/aurdino_uno.jsx";
import "@xyflow/react/dist/style.css";


export default function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [idCounter, setIdCounter] = useState(1);
  const [selectedNode, setSelectedNode] = useState(null);
  const edgeReconnectSuccessful = useRef(true);
  const [resistorValues, setResistorValues] = useState({});

  const onReconnectStart = useCallback(() => {
    edgeReconnectSuccessful.current = false;
  }, []);

  const onReconnect = useCallback((oldEdge, newConnection) => {
    edgeReconnectSuccessful.current = true;
    setEdges((els) => reconnectEdge(oldEdge, newConnection, els));
  }, []);

  const onReconnectEnd = useCallback((_, edge) => {
    if (!edgeReconnectSuccessful.current) {
      setEdges((eds) => eds.filter((e) => e.id !== edge.id));
    }
    edgeReconnectSuccessful.current = true;
  }, []);

  const onConnect = useCallback(
    (params) => setEdges((els) => addEdge(params, els)),
    []
  );

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.ctrlKey && event.key.toLowerCase() === "d" && selectedNode) {
        event.preventDefault();
        setNodes((nds) => nds.filter((node) => node.id !== selectedNode));
        setEdges((eds) => eds.filter((edge) => edge.source !== selectedNode && edge.target !== selectedNode));
        setSelectedNode(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedNode]);

  const CustomNode = ({ data, id, onResistorValueChange, onDelete }) => {
    const [showDelete, setShowDelete] = useState(false); // State to toggle delete button
    const [isDeleted, setIsDeleted] = useState(false); // State to hide the component

    const handleClick = (e) => {
      e.stopPropagation();
      setSelectedNode((prevSelectedNode) => (prevSelectedNode === id ? null : id));
      // setShowDelete(true); // Remove this line to prevent showing the delete button when the node is clicked
    };

    const handleDelete = (e) => {
      e.stopPropagation();
      setIsDeleted(true); // Hide the component
      onDelete(id);
    };

    useEffect(() => {
      const handleClickOutside = (event) => {
        if (
          showDelete && // Only close if delete button is visible
          !event.target.closest('.react-flow__node')
        ) {
          setShowDelete(false);
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, [showDelete]); // Only re-run when showDelete changes

    if (isDeleted) return null; // Return null if the component is deleted

    return (
      <>
        {React.cloneElement(data.component, { onClick: handleClick, style: { zIndex: 1 }, onDelete })}
        {selectedNode === id && (
          <>
            {data.component.type === Resistor && (
              <div
                style={{
                  position: "absolute",
                  top: "-25px",
                  right: "30px",
                  backgroundColor: "white",
                  padding: "2px 5px",
                  borderRadius: "3px",
                  boxShadow: "0px 2px 5px rgba(0,0,0,0.1)",
                  zIndex: 10,
                }}
              >
                {data.resistance || 'N/A'} Ω
              </div>
            )}
            {showDelete && (
              <button
                onClick={handleDelete}
                style={{
                  position: "absolute",
                  top: "-25px",
                  right: "5px",
                  backgroundColor: "red",
                  color: "white",
                  border: "none",
                  borderRadius: "50%",
                  width: "20px",
                  height: "20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  zIndex: 10,
                }}
              >
                x
              </button>
            )}
          </>
        )}
      </>
    );
  };

  const addNode = (Component, width, height, initialData = {}) => {
    const position = { x: 100, y: 100 };
    const newNode = {
      id: `${idCounter}`,
      type: "custom",
      position,
      data: {
        component: <Component id={`component-${idCounter}`} pos={position} onDelete={handleDeleteNode} />,
        width,
        height,
        ...initialData,
      },
      style: {
        width,
        height
      }
    };
    setNodes((nds) => [...nds, newNode]);
    setIdCounter((prev) => prev + 1);
  };

  const handleResistorValueChange = (id, value) => {
    setResistorValues((prev) => {
      const updatedValues = { ...prev, [id]: value };
      localStorage.setItem('resistorValues', JSON.stringify(updatedValues));
      return updatedValues;
    });
  };

  const handleDeleteNode = (id) => {
    setNodes((nds) => nds.filter((node) => node.id !== id));
    setEdges((eds) => eds.filter((edge) => edge.source !== id && edge.target !== id));
  };

  useEffect(() => {
    const storedValues = JSON.parse(localStorage.getItem('resistorValues')) || {};
    setResistorValues(storedValues);
  }, []);

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <div
        style={{
          width: "100%",
          height: "50px",
          backgroundColor: "white",
          display: "flex",
          alignItems: "center",
          padding: "0 20px",
          boxShadow: "0px 2px 5px rgba(0,0,0,0.1)",
        }}
      >
        <h3 style={{ margin: "0", color: "#333" }}>Toolbar</h3>
      </div>

      <div style={{ display: "flex", height: "calc(100% - 50px)" }}>
        <div style={{ width: "200px", backgroundColor: "#f4f4f4", padding: "10px" }}>
          <h3>Components</h3>
          <button
            onClick={() => addNode(LED, 100, 100)}
            style={{ margin: "5px", padding: "5px 10px", cursor: "pointer" }}
          >
            Add LED
          </button>
          <button
            onClick={() => addNode(Resistor, 100, 50, { resistance: resistorValues[idCounter] || '' })}
            style={{ margin: "5px", padding: "5px 10px", cursor: "pointer" }}
          >
            Add Resistor
          </button>
          <button
            onClick={() => addNode(Breadboard, 1000, 250)}
            style={{ margin: "5px", padding: "5px 10px", cursor: "pointer" }}
          >
            Add Breadboard
          </button>
          <button
            onClick={() => addNode(ArduinoUnoR3, 200, 150)}
            style={{ margin: "5px", padding: "5px 10px", cursor: "pointer" }}
          >
            Add Arduino Uno
          </button>
        </div>

        <div style={{ flex: 1 }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={{
              custom: (props) => <CustomNode {...props} onResistorValueChange={handleResistorValueChange} onDelete={handleDeleteNode} />,
            }}
            onPaneClick={() => setSelectedNode(null)}
            proOptions={{
              hideAttribution: true,
            }}
            snapToGrid
            onReconnect={onReconnect}
            onReconnectStart={onReconnectStart}
            onReconnectEnd={onReconnectEnd}
            fitView
            style={{ backgroundColor: "#F7F9FB" }}
          >
            <Controls />
            <MiniMap />
            <Background variant="dots" gap={12} size={1} />
          </ReactFlow>
        </div>
      </div>
    </div>
  );
}