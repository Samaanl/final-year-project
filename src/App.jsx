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
import { FaTrash, FaLightbulb, FaMicrochip, FaBreadSlice } from "react-icons/fa"; // Import Font Awesome icons
import { MdNoteAdd } from 'react-icons/md';
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
import "react-tabs/style/react-tabs.css";
import "@xyflow/react/dist/style.css";
import Tooltip from "./components/Tooltip.jsx";
import "./components/Tooltip.css";
import "./Toolbar.css"; // Import the new CSS file
import "./components/ComponentsSection.css"; 

// CustomNode component to handle custom nodes with delete functionality
const CustomNode = ({ data, id, onResistorValueChange, onDelete }) => {
  const [showDelete, setShowDelete] = useState(false); // State to toggle delete button
  const [isDeleted, setIsDeleted] = useState(false); // State to hide the component

  const handleClick = (e) => {
    e.stopPropagation();
    setShowDelete(true);
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
          <FaTrash />
        </button>
      )}
    </>
  );
};

// Page component to handle each individual page
const Page = ({ pageId, removePage }) => {
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

  const handleDeleteNode = (id) => {
    setNodes((nds) => nds.filter((node) => node.id !== id));
    setEdges((eds) => eds.filter((edge) => edge.source !== id && edge.target !== id));
  };

  useEffect(() => {
    const storedValues = JSON.parse(localStorage.getItem('resistorValues')) || {};
    setResistorValues(storedValues);
  }, []);

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

  return (
    <div style={{ display: "flex", height: "100%", width: "100%" }}>
      <div className="components-section">
        <h3 className="components-header">Components</h3>
        <button
          onClick={() => addNode(LED, 100, 100)}
          className="component-button"
        >
          <FaLightbulb style={{ marginRight: "5px" }} />
          Add LED
        </button>
        <button
          onClick={() => addNode(Resistor, 100, 50, { resistance: '' })}
          className="component-button"
        >
          <FaMicrochip style={{ marginRight: "5px" }} />
          Add Resistor
        </button>
        <button
          onClick={() => addNode(Breadboard, 1000, 250)}
          className="component-button"
        >
          <FaBreadSlice style={{ marginRight: "5px" }} />
          Add Breadboard
        </button>
        <button
          onClick={() => addNode(ArduinoUnoR3, 200, 150)}
          className="component-button"
        >
          <FaMicrochip style={{ marginRight: "5px" }} />
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
          style={{ backgroundColor: "#F7F9FB", border: "2px solid #003366", borderRadius: "10px" }} // Add border and border-radius
        >
          <Controls style={{ left: 10, right: 'auto' }} /> {/* Position controls on the left */}
          <MiniMap nodeColor={(node) => {
            switch (node.type) {
              case 'input': return 'blue';
              case 'output': return 'green';
              default: return '#eee';
            }
          }} />
          <Background variant="lines" gap={16} size={1} color="#b5deb5" /> {/* Use lines background */}
        </ReactFlow>
      </div>
    </div>
  );
};

// Main App component
export default function App() {
  const [pages, setPages] = useState([]); // State to manage the list of pages
  const [pageCounter, setPageCounter] = useState(1); // Counter to generate unique page IDs

  // Function to handle the creation of a new page
  const handleNewPageClick = () => {
    const newPageId = `page-${pageCounter}`; // Generate a new page ID
    setPages([...pages, newPageId]); // Add the new page ID to the list of pages
    setPageCounter(pageCounter + 1); // Increment the page counter
  };

  // Function to handle the removal of a page
  const handleRemovePage = (pageId) => {
    setPages(pages.filter((id) => id !== pageId)); // Remove the page ID from the list of pages
  };

  // Add event listener for Ctrl+N shortcut
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.ctrlKey && event.key === 'n') {
        event.preventDefault();
        handleNewPageClick();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleNewPageClick]);

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <div className="toolbar">
        <Tooltip text="New Page (Ctrl+N)"> {/* Add Tooltip component */}
          <button
            onClick={handleNewPageClick} // Call handleNewPageClick when the button is clicked
            className="toolbar-button"
          >
            <MdNoteAdd style={{ marginRight: "5px" }} /> {/* Display a plus icon with margin */}
            New Page
          </button>
        </Tooltip>
      </div>

      <Tabs style={{ height: "calc(100% - 40px)" }}> {/* Tabs component to manage multiple pages */}
        <TabList> {/* TabList component to display the list of tabs */}
          {pages.map((pageId, index) => (
            <Tab key={pageId}> {/* Tab component for each page */}
              Page {index + 1} {/* Display the page number */}
              <button
                onClick={(e) => {
                  e.stopPropagation(); // Prevent the click event from propagating to the tab
                  handleRemovePage(pageId); // Call handleRemovePage when the button is clicked
                }}
                style={{
                  marginLeft: "10px",
                  color: "red",
                  borderRadius: "50%",
                  border: "none",
                  width: "20px",
                  height: "20px",
                  cursor: "pointer",
                }}
              >
                <FaTrash /> {/* Display a trash icon */}
              </button>
            </Tab>
          ))}
        </TabList>

        {pages.map((pageId) => (
          <TabPanel key={pageId} style={{ height: "100%", width: "100%" }}> {/* TabPanel component for each page */}
            <Page pageId={pageId} removePage={handleRemovePage} /> {/* Render the Page component */}
          </TabPanel>
        ))}
      </Tabs>
    </div>
  );
}