import React, { useState, useCallback } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
} from '@xyflow/react';
import { LED } from "./components/LED.jsx";
import { Resistor } from "./components/resistor.jsx";
import { Breadboard } from "./components/breadboard.jsx";
import { ArduinoUnoR3 } from "./components/aurdino_uno.jsx";
import '@xyflow/react/dist/style.css';

export default function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [idCounter, setIdCounter] = useState(1); // Unique ID counter for new nodes

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  // Custom node type to ensure precise positioning
  const CustomNode = ({ data }) => {
    return (
      <div
        style={{
          width: `${data.width}px`,
          height: `${data.height}px`,
          position: 'relative',
          overflow: 'visible',
        }}
      >
        {data.component}
      </div>
    );
  };

  // Add a new node dynamically
  const addNode = (Component, width, height) => {
    const newNode = {
      id: `${idCounter}`,
      type: 'custom',
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
    <div style={{ display: 'flex', width: '100vw', height: '100vh' }}>
      {/* Sidebar for component labels */}
      <div style={{ width: '200px', backgroundColor: '#f4f4f4', padding: '10px'}}>
        <h3>Components</h3>
        <button
          onClick={() => addNode(LED, 100, 100)}
          style={{ margin: '5px', padding: '5px 10px', cursor: 'pointer' }}
        >
          Add LED
        </button>
        <button
          onClick={() => addNode(Resistor, 100, 50)}
          style={{ margin: '5px', padding: '5px 10px', cursor: 'pointer' }}
        >
          Add Resistor
        </button>
        <button
          onClick={() => addNode(Breadboard, 200, 100)}
          style={{ margin: '5px', padding: '5px 10px', cursor: 'pointer' }}
        >
          Add Breadboard
        </button>
        <button
          onClick={() => addNode(ArduinoUnoR3, 200, 150)}
          style={{ margin: '5px', padding: '5px 10px', cursor: 'pointer' }}
        >
          Add Arduino Uno R3
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
          proOptions={{
            hideAttribution: true,
          }}
        >
          <Controls />
          <MiniMap />
          <Background variant="dots" gap={12} size={1} />
        </ReactFlow>
      </div>
    </div>
  );
}
