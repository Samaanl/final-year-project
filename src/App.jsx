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
  const [idCounter, setIdCounter] = useState(1); // Unique ID counter for new nodes
  const [selectedNode, setSelectedNode] = useState(null); // Track selected node
  const edgeReconnectSuccessful = useRef(true);

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

  const deleteNode = useCallback((nodeId) => {
    setNodes((nds) => nds.filter((node) => node.id !== nodeId));
    setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
    setSelectedNode(null); // Reset selection after deletion
  }, []);

  // Handle keypress for delete shortcut
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.ctrlKey && event.key.toLowerCase() === "d" && selectedNode) {
        deleteNode(selectedNode);
        event.preventDefault(); // Prevent default browser behavior for Ctrl+D
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedNode, deleteNode]);

  const CustomNode = ({ data, id }) => {
    const handleClick = (e) => {
      e.stopPropagation(); // Prevent click from affecting parent elements
      setSelectedNode((prevSelectedNode) => (prevSelectedNode === id ? null : id)); // Toggle selection
    };

    return (
      <div
        onClick={handleClick}
        style={{
          width: `${data.width}px`,
          height: `${data.height}px`,
          position: "relative",
          overflow: "visible",
          cursor: "pointer",
        }}
      >
        {data.component}
        {selectedNode === id && (
          <button
            style={{
              position: "absolute",
              top: "-15px",
              right: "-15px",
              background: "red",
              color: "white",
              border: "none",
              borderRadius: "50%",
              width: "40px",
              height: "40px",
              cursor: "pointer",
              fontSize: "18px",
              zIndex: 10,
            }}
            onClick={(e) => {
              e.stopPropagation(); // Prevent triggering node selection
              deleteNode(id);
            }}
          >
            &times;
          </button>
        )}
      </div>
    );
  };

  const addNode = (Component, width, height) => {
    const newNode = {
      id: `${idCounter}`,
      type: "custom",
      position: { x: 100, y: 100 }, // Default position for new nodes
      data: {
        component: <Component id={`component-${idCounter}`} pos={{ x: 100, y: 100 }} />,
        width: width,
        height: height,
      },
    };
    setNodes((nds) => [...nds, newNode]);
    setIdCounter((prev) => prev + 1); // Increment ID counter
  };

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      {/* Toolbar */}
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
        {/* Sidebar for components */}
        <div style={{ width: "200px", backgroundColor: "#f4f4f4", padding: "10px" }}>
          <h3>Components</h3>
          <button
            onClick={() => addNode(LED, 100, 100)}
            style={{ margin: "5px", padding: "5px 10px", cursor: "pointer" }}
          >
            Add LED
          </button>
          <button
            onClick={() => addNode(Resistor, 100, 50)}
            style={{ margin: "5px", padding: "5px 10px", cursor: "pointer" }}
          >
            Add Resistor
          </button>
          <button
            onClick={() => addNode(Breadboard, 200, 100)}
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

        {/* ReactFlow canvas */}
        <div style={{ flex: 1 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={{
            custom: CustomNode,
          }}
          onPaneClick={() => setSelectedNode(null)} // Deselect all nodes on background click
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
