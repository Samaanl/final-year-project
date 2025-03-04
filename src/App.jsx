import React, { useState, useCallback, useRef, useEffect } from "react";
import { Button, Drawer, Modal, TextInput } from "flowbite-react";
import { v4 as uuidv4 } from "uuid";
import { parse } from "intel-hex";
import { Buffer } from "buffer";
import Editor from "@monaco-editor/react";
// import Model from "./model.jsx";
import {
  avrInstruction,
  AVRIOPort,
  AVRTimer,
  CPU,
  PinState,
  portDConfig,
  portBConfig,
  timer0Config,
} from "avr8js";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  reconnectEdge,
  useEdgesState,
  addEdge,
  MarkerType,
} from "@xyflow/react";
import { LED } from "./components/LED.jsx";
import { Resistor } from "./components/resistor.jsx";
import { Breadboard } from "./components/breadboard.jsx";
import { ArduinoUnoR3 } from "./components/aurdino_uno.jsx";
import {
  FaTrash,
  FaLightbulb,
  FaMicrochip,
  FaBreadSlice,
} from "react-icons/fa"; // Import Font Awesome icons
import { MdNoteAdd } from "react-icons/md";
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
import "react-tabs/style/react-tabs.css";
import "@xyflow/react/dist/style.css";
import Tooltip from "./components/Tooltip.jsx";
import "./components/Tooltip.css";
import "./Toolbar.css";
import "./Modal.css";
import "./components/ComponentsSection.css";
import { arduinoLanguageConfig } from "./editorSyntax.js";

// Add CSS for edge hover effect
import './edge-styles.css';

// Add styles for resize handle
const resizeStyles = `
  .resize-handle {
    transition: background-color 0.2s;
  }

  .resize-handle:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }
  
  .resize-active {
    background-color: rgba(0, 120, 215, 0.5) !important;
  }
`;

window.Buffer = window.Buffer || Buffer;

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
        !event.target.closest(".react-flow__node")
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
      {React.cloneElement(data.component, {
        onClick: handleClick,
        style: { zIndex: 1 },
        onDelete,
      })}
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

let ArduinoCode = `void setup() {
  pinMode(13, OUTPUT);
}

void loop() {
  digitalWrite(13, HIGH);  
  delay(1000);                      
  digitalWrite(13, LOW);   
  delay(1000);                      
}
  `;

const beforeMount = (monaco) => {
  monaco.languages.register({ id: "arduino" });
  monaco.languages.setLanguageConfiguration("arduino", {
    brackets: [
      ["{", "}"],
      ["[", "]"],
      ["(", ")"],
    ],
    autoClosingPairs: [
      { open: "{", close: "}" },
      { open: "[", close: "]" },
      { open: "(", close: ")" },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
    ],
  });

  monaco.languages.registerCompletionItemProvider("arduino", {
    provideCompletionItems: () => {
      const suggestions = [
        ...arduinoLanguageConfig.keywords.map((keyword) => ({
          label: keyword,
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: keyword,
        })),
        ...arduinoLanguageConfig.functions,
      ];
      return { suggestions };
    },
  });
};

// Main App component
export default function App() {
  const [pages, setPages] = useState([]); // State to manage the list of pages
  const [pageCounter, setPageCounter] = useState(1); // Counter to generate unique page IDs
  const ledState13Ref = useRef(false); // Use useRef instead of useState
  const [defaultCode, setDefaultCode] = useState(ArduinoCode);
  const [resultOfHex, setresultOfHex] = useState("nothing");
  const [isEditorVisible, setIsEditorVisible] = useState(false); // Add state for editor visibility
  const [editorWidth, setEditorWidth] = useState(40); // Track editor width as percentage
  const [isResizing, setIsResizing] = useState(false); // Track if currently resizing

  // Add state to manage the modal visibility and input value
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPageName, setNewPageName] = useState("");

  const [fetchData, setfetchData] = useState([]);

  // Add this state near your other state declarations
  const [isRunning, setIsRunning] = useState(false);
  const cpuLoopRef = useRef(null);

  // Resize handlers for the editor
  const handleResizeStart = (e) => {
    setIsResizing(true);
    e.preventDefault();
  };
  
  const handleResizeMove = (e) => {
    if (!isResizing) return;
    
    // Calculate width based on window width and mouse position
    const windowWidth = window.innerWidth;
    const mouseX = e.clientX;
    
    // Convert to percentage of window width
    const newWidth = ((windowWidth - mouseX) / windowWidth) * 100;
    
    // Constrain width between 20% and 70%
    if (newWidth >= 20 && newWidth <= 70) {
      setEditorWidth(newWidth);
    }
  };
  
  const handleResizeEnd = () => {
    setIsResizing(false);
  };
  
  // Add event listeners for resize
  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleResizeMove);
      window.addEventListener('mouseup', handleResizeEnd);
    }
    
    return () => {
      window.removeEventListener('mousemove', handleResizeMove);
      window.removeEventListener('mouseup', handleResizeEnd);
    };
  }, [isResizing]);

  // Page component to handle each individual page
  const Page = ({ pageId, removePage }) => {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [idCounter, setIdCounter] = useState(1);
    const [selectedNode, setSelectedNode] = useState(null);
    const edgeReconnectSuccessful = useRef(true);
    const [resistorValues, setResistorValues] = useState({});
    const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);

    const [selectedEdge, setSelectedEdge] = useState(null);
    const [colorPickerPosition, setColorPickerPosition] = useState({ x: 0, y: 0 });

    const getActiveNodesCount = () => nodes.length;

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
      setEdges((eds) =>
        eds.filter((edge) => edge.source !== id && edge.target !== id)
      );
    };

    useEffect(() => {
      const storedValues =
        JSON.parse(localStorage.getItem("resistorValues")) || {};
      setResistorValues(storedValues);
    }, []);

    const addNode = (Component, width, height, pos, initialData = {}) => {
      const position = { x: pos.x, y: pos.y };
      const isLEDComponent = Component.name === "LED";
      const uniqueId = uuidv4(); // Generate a unique ID using uuid

      const newNode = {
        id: uniqueId,
        type: "custom",
        position,
        data: {
          component: (
            <Component
              id={`component-${idCounter}`}
              pos={position}
              onDelete={handleDeleteNode}
              {...(isLEDComponent && { brightness: ledState13Ref.current })}
              {...(isLEDComponent && { ledStateRef: ledState13Ref })}
            />
          ),
          width,
          height,
          ...initialData,
        },
        style: {
          width,
          height,
        },
      };
      setNodes((nds) => [...nds, newNode]);
      setIdCounter((prev) => prev + 1);
    };

    const handleResistorValueChange = (id, value) => {
      setResistorValues((prev) => {
        const updatedValues = { ...prev, [id]: value };
        localStorage.setItem("resistorValues", JSON.stringify(updatedValues));
        return updatedValues;
      });
    };
    function autoled(data) {
      for (let i in data) {
        switch (data[i].name) {
          case "LED":
            addNode(LED, 100, 100, { x: data[i].x, y: data[i].y });
            break;
          case "Resistor":
            addNode(
              Resistor,
              100,
              50,
              { x: data[i].x, y: data[i].y },
              { resistance: "" }
            );
            break;
          case "Breadboard":
            addNode(Breadboard, 1000, 50, { x: data[i].x, y: data[i].y });
            break;
        }
      }

      // switch (data[0].name) {
      //   case "LED":
      //     addNode(LED, 100, 100,{ x: 100, y: 20 })
      //     break;
      //     case "Resistor":
      //     addNode(Resistor, 100, 50,{ x: 100, y: 20 })
      //     break;
      //     default:
      //     addNode(Breadboard, 100, 100,{ x: 100, y: 20 })
      // }
    }

    //fetch data from db
    useEffect(() => {
      if (nodes.length === 0) {
        // Ensures it runs only if no nodes exist
        fetch("http://127.0.0.1:3512/getData")
          .then((res) => res.json())
          .then((data) => {
            // setfetchData(data.data);
            // autoled();
            console.log("autoled i have fetched data from db", data.data);
            autoled(data.data);
          });
        // console.log("autoled i have fetched data from db");
      }
    }, []);

    // console.log("fetchData", fetchData);

    const defaultEdgeOptions = {
      style: {
        strokeWidth: 3,
        stroke: '#666',
      },
      type: 'smoothstep',
      animated: false,
    };

    const connectionLineStyle = {
      strokeWidth: 3,
      stroke: '#666',
    };

    // Add this new edge click handler
    const onEdgeClick = useCallback((event, edge) => {
      event.stopPropagation();

      // Remove 'selected' class from all edges
      document.querySelectorAll('.react-flow__edge').forEach(el => {
        el.classList.remove('selected');
      });

      // Get edge element and calculate center position
      const edgeElement = document.querySelector(`[data-testid="rf__edge-${edge.id}"]`);
      if (edgeElement) {
        // Add 'selected' class to the clicked edge
        edgeElement.classList.add('selected');

        const rect = edgeElement.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;

        setColorPickerPosition({ x, y });
        setSelectedEdge(edge);
      }
    }, []);

    // Add cleanup function to the useEffect
    useEffect(() => {
      return () => {
        // Clean up 'selected' class from all edges when component unmounts
        document.querySelectorAll('.react-flow__edge').forEach(el => {
          el.classList.remove('selected');
        });
      };
    }, []);

    // Update color change handler to the simpler version
    const handleColorChange = useCallback((color) => {
      setEdges((eds) =>
        eds.map((ed) => {
          if (ed.id === selectedEdge.id) {
            return {
              ...ed,
              style: { ...ed.style, stroke: color },
            };
          }
          return ed;
        })
      );
    }, [selectedEdge, setEdges]);

    // Add click outside handler
    useEffect(() => {
      const handleClickOutside = (event) => {
        if (!event.target.closest('.color-picker-container') &&
          !event.target.closest('.react-flow__edge')) {
          setSelectedEdge(null);
          // Remove selected class from all edges
          document.querySelectorAll('.react-flow__edge').forEach(el => {
            el.classList.remove('selected');
          });
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Update ColorPicker component to remove the color preset buttons
    const ColorPicker = () => {
      if (!selectedEdge) return null;

      return (
        <div
          className="color-picker-container"
          style={{
            position: 'fixed',
            left: `${colorPickerPosition.x}px`,
            top: `${colorPickerPosition.y}px`,
            transform: 'translate(-50%, -50%)',
            background: 'white',
            padding: '8px',
            borderRadius: '4px',
            boxShadow: '0 0 5px rgba(0,0,0,0.3)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}
        >

          <input
            type="color"
            value={selectedEdge?.style?.stroke || '#666'}
            onChange={(e) => handleColorChange(e.target.value)}
            style={{
              width: '24px',
              height: '24px',
              padding: 0,
              border: 'none',
              cursor: 'pointer'
            }}
          />
        </div>
      );
    };

    return (
      <div style={{ display: "flex", height: "100%", width: "100%" }}>
        {/* Save button */}
        <button
          className="save-button"
          onClick={() => {
            let project = [];
            let nodeName = [];
            let x = [];
            let y = [];
            for (let i in nodes) {
              alert(
                `$node name: ${nodes[i].data.component.type.name} and its position x is ${nodes[i].position.x} and its position y is ${nodes[i].position.y}`
              );

              nodeName.push(nodes[i].data.component.type.name);
              x.push(nodes[i].position.x);
              y.push(nodes[i].position.y);
            }
            project.push(newPageName);
            console.log("project name is", newPageName);
            console.log("x", x);
            console.log("y", y);
            fetch("http://localhost:3512/insert", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                proj: project,
                nodeName: nodeName,
                x: x,
                y: y,
              }),
            }).then((response) => {
              if (response.ok) {
                alert("Data saved successfully");
              } else {
                alert("Failed to save data");
              }
            });
          }}
        >
          SAVE
        </button>

        {/* Fixed Component Panel */}
        <div className={`components-section ${isPanelCollapsed ? 'collapsed' : ''}`}>
          <button
            className="collapse-button"
            onClick={() => setIsPanelCollapsed(!isPanelCollapsed)}
          >
            {isPanelCollapsed ? '→' : '←'}
          </button>
          <h3 className="components-header">Components</h3>
          <button
            onClick={() => addNode(LED, 100, 100, { x: 0, y: 0 })}
            className="component-button"
          >
            <FaLightbulb style={{ marginRight: "5px" }} />
            {!isPanelCollapsed && <span>Add LED</span>}
          </button>
          <button
            onClick={() =>
              addNode(Resistor, 100, 50, { x: 100, y: 100 }, { resistance: "" })
            }
            className="component-button"
          >
            <FaMicrochip style={{ marginRight: "5px" }} />
            {!isPanelCollapsed && <span>Add Resistor</span>}
          </button>
          <button
            onClick={() => addNode(Breadboard, 1000, 250, { x: 100, y: 100 })}
            className="component-button"
          >
            <FaBreadSlice style={{ marginRight: "5px" }} />
            {!isPanelCollapsed && <span>Add Breadboard</span>}
          </button>
          <button
            onClick={() => addNode(ArduinoUnoR3, 200, 150, { x: 100, y: 100 })}
            className="component-button"
          >
            <FaMicrochip style={{ marginRight: "5px" }} />
            {!isPanelCollapsed && <span>Add Arduino Uno</span>}
          </button>
        </div>

        <div style={{ flex: 1 }}>
          <p>Active Nodes: {getActiveNodesCount()}</p>
          <p>display name: { }</p>

          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            defaultEdgeOptions={defaultEdgeOptions}
            connectionLineStyle={connectionLineStyle}
            connectionLineType="smoothstep"
            fitView
            nodeTypes={{
              custom: (props) => (
                <CustomNode
                  {...props}
                  onResistorValueChange={handleResistorValueChange}
                  onDelete={handleDeleteNode}
                />
              ),
            }}
            onPaneClick={() => {
              setSelectedNode(null);
              setSelectedEdge(null);
              // Remove selected class from all edges
              document.querySelectorAll('.react-flow__edge').forEach(el => {
                el.classList.remove('selected');
              });
            }}
            proOptions={{
              hideAttribution: true,
            }}
            snapToGrid
            onReconnect={onReconnect}
            onReconnectStart={onReconnectStart}
            onReconnectEnd={onReconnectEnd}
            onEdgeClick={onEdgeClick}
            style={{
              backgroundColor: "#F7F9FB",
              border: "1px solid #003366",
              borderRadius: "none",
            }} // Add border and border-radius
          >
            <Controls />{" "}
            {/* Position controls on the left */}
            <MiniMap
              nodeColor={(node) => {
                switch (node.type) {
                  case "input":
                    return "blue";
                  case "output":
                    return "green";
                  default:
                    return "#eee";
                }
              }}
            />
            <Background variant="dots" gap={16} size={2} color="#b5deb5" />{" "}
            {/* Use lines background */}
            <ColorPicker />
          </ReactFlow>
        </div>
      </div>
    );
  };

  // Function to handle the creation of a new page
  const handleNewPageClick = () => {
    // const newPageId = `page-${pageCounter}`; // Generate a new page ID
    // setPages([...pages, newPageId]); // Add the new page ID to the list of pages
    // setPageCounter(pageCounter + 1); // Increment the page counter
    setIsModalOpen(true); // Show the modal
  };

  // Function to handle the submission of the new page name
  const handleNewPageSubmit = () => {
    // const newPageId = `page-${pageCounter}`; // Generate a new page ID
    const newPageId = `${newPageName}`;
    setPages([...pages, newPageId]); // Add the new page ID to the list of pages
    setPageCounter(pageCounter + 1); // Increment the page counter
    setIsModalOpen(false); // Hide the modal
    // setNewPageName(""); // Clear the input value
  };

  // Function to handle the removal of a page
  const handleRemovePage = (pageId) => {
    setPages(pages.filter((id) => id !== pageId)); // Remove the page ID from the list of pages
  };

  // Add event listener for Ctrl+N shortcut
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.ctrlKey && event.key === "n") {
        event.preventDefault();
        handleNewPageClick();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleNewPageClick]);

  console.log("project name is now ", newPageName);
  const RunCode = async () => {
    // // If it's running, clicking the button will stop it
    // if (isRunning) {
    //   setIsRunning(false);
    //   return;
    // }
    // setIsRunning(true);

    //compile the source code to arduino redable hex
    const response = await fetch("http://localhost:3512/compile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: defaultCode }),
    });

    // const result = await response.json();
    // ledState13Ref.current = result.hex;
    // load the hex file to the ardunio cpu
    const result = await response.json();
    const { data } = parse(result.hex);
    const progData = new Uint8Array(data);
    const data16 = new Uint16Array(progData.buffer);
    if (response.ok) {
      console.log("Compiled Hex File:", result.hex);
    } else {
      const error = await response.json();
      console.error("Compilation error:", error.error);
    }
    // console.log("Program Memory:", data16);

    const cpu = new CPU(data16);
    console.log("CPU Initialized:", cpu);

    //attach the virtual hardware
    const port = new AVRIOPort(cpu, portDConfig);
    const portB = new AVRIOPort(cpu, portBConfig);

    console.log("Attaching listener to port...");

    // portB.addListener(() => {
    //   const turnon = portB.pinState(5) === PinState.High;
    //   ledState13Ref.current = turnon;
    // });
    portB.addListener(() => {
      const turnon = portB.pinState(5) === PinState.High;
      console.log("LED on pin 13 is", turnon);
      ledState13Ref.current = turnon;
    });

    // Add a manual state check to verify port state directly
    // console.log("Initial pin state:", port.pinState(7));
    const timer = new AVRTimer(cpu, timer0Config);

    //run the instaruction one by one
    while (true) {
      for (let i = 0; i < 500000; i++) {
        avrInstruction(cpu);
        cpu.tick();
        // cpu.maxInterrupt;
      }
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  };

  console.log(`the hex is ${resultOfHex}`);
  console.log("is running", isRunning);
  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <style>{resizeStyles}</style>
      <div className="toolbar">
        <Tooltip text="New Page (Ctrl+N)">
          {" "}
          {/* Add Tooltip component */}
          <button
            onClick={handleNewPageClick} // Call handleNewPageClick when the button is clicked
            className="toolbar-button"
          >
            <MdNoteAdd style={{ marginRight: "5px" }} />{" "}
            {/* Display a plus icon with margin */}
            New Page
          </button>
        </Tooltip>

        {/* <Button onClick={() => setIsDrawerOpen(true)}>Show drawer</Button> */}
      </div>

      <div style={{ height: "calc(100% - 40px)", position: "relative" }}>
        <div style={{ height: "100%", overflow: "auto" }}>
          <Tabs style={{ height: "100%" }}>
            {" "}
            {/* Tabs component to manage multiple pages */}
            <TabList>
              {" "}
              {/* TabList component to display the list of tabs */}
              {pages.map((pageId) => (
                <Tab key={pageId}>
                  {" "}
                  {/* Tab component for each page */}
                  {pageId} {/* Display the page number */}
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
              <button 
                onClick={() => setIsEditorVisible(!isEditorVisible)}
                style={{
                  marginLeft: "15px",
                  backgroundColor: "#4CAF50",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  padding: "5px 10px",
                  cursor: "pointer",
                }}
              >
                {isEditorVisible ? "Hide Code Editor" : "Show Code Editor"}
              </button>
            </TabList>
            {pages.map((pageId) => (
              <TabPanel key={pageId} style={{ height: "100%", width: "100%" }}>
                {/* TabPanel component for each page */}
                <Page pageId={pageId} removePage={handleRemovePage} />{" "}
                {/* Render the Page component */}
              </TabPanel>
            ))}
          </Tabs>
        </div>
        
        {isEditorVisible && (
          <div style={{ 
            position: "absolute",
            top: "0",
            right: "0",
            width: `${editorWidth}%`, 
            height: "100%",
            display: "flex", 
            flexDirection: "column", 
            padding: "10px",
            background: "#2d2d2d",
            boxShadow: "-5px 0 15px rgba(0, 0, 0, 0.2)",
            zIndex: 100
          }}>
            <div 
              style={{
                position: "absolute",
                left: "0",
                top: "0",
                width: "8px",
                height: "100%",
                cursor: "ew-resize",
                zIndex: 101
              }}
              onMouseDown={handleResizeStart}
              className={`resize-handle ${isResizing ? "resize-active" : ""}`}
            />
            <h3 style={{ color: "white", marginBottom: "10px" }}>Code Editor</h3>
            <Editor
              height="calc(100% - 80px)"
              defaultLanguage="cpp"
              defaultValue={defaultCode}
              theme="vs-dark"
              onChange={(value) => setDefaultCode(value)}
              beforeMount={beforeMount}
              options={{
                minimap: { enabled: true },
                fontSize: 14,
                suggestOnTriggerCharacters: true,
                quickSuggestions: true,
                snippetSuggestions: "inline",
              }}
            />
            <button
              onClick={() => RunCode()}
              style={{
                backgroundColor: isRunning ? "#ff4444" : "#4CAF50",
                color: "white",
                padding: "10px 20px",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                marginTop: "10px",
              }}
            >
              {isRunning ? "STOP" : "RUN"}
            </button>
          </div>
        )}
      </div>

      {/* Modal for entering the new page name */}
      <Modal show={isModalOpen} onClose={() => setIsModalOpen(false)} className="modal-overlay">
        <Modal.Header className="modal-header">Enter Project Name</Modal.Header>
        <Modal.Body className="modal-body">
          <TextInput
            value={newPageName}
            onChange={(e) => setNewPageName(e.target.value)}
            placeholder="Project Name"
            className="text-input"
          />
        </Modal.Body>
        <Modal.Footer className="modal-footer">
          <Button color="gray" onClick={handleNewPageSubmit} className="modal-button">
            Submit
          </Button>
          <Button color="gray" onClick={() => setIsModalOpen(false)} className="modal-button">
            Cancel
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
