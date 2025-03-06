import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { Button, Drawer } from "flowbite-react";
import { parse } from "intel-hex";
import { Buffer } from "buffer";
import Editor from "@monaco-editor/react";
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
  FaSave,
  FaFolder,
} from "react-icons/fa";
import { MdNoteAdd } from "react-icons/md";
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
import "react-tabs/style/react-tabs.css";
import "@xyflow/react/dist/style.css";
import Tooltip from "./components/Tooltip.jsx";
import "./components/Tooltip.css";
import "./Toolbar.css"; // Import the new CSS file
import "./components/ComponentsSection.css";
import "./components/ProjectBrowser.css";
import { arduinoLanguageConfig } from "./editorSyntax.js";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

window.Buffer = window.Buffer || Buffer;

// CustomNode component to handle custom nodes with delete functionality
const CustomNode = ({ data, id, onResistorValueChange, onDelete }) => {
  const [showDelete, setShowDelete] = useState(false); // State to toggle delete button
  const [isDeleted, setIsDeleted] = useState(false); // State to hide the component

  const handleClick = (e) => {
    // Only show delete button if clicking on the node container itself, not its children
    if (e.target === e.currentTarget) {
      e.stopPropagation();
      setShowDelete(true);
    }
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
    <div onClick={handleClick} style={{ position: 'relative' }}>
      {React.cloneElement(data.component, {
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
    </div>
  );
};

let ArduinoCode = `// Arduino code to blink two LEDs alternately
// Connect one LED to pin 12 and another to pin 13

int led1 = 12;  // First LED connected to digital pin 12
int led2 = 13;  // Second LED connected to digital pin 13
int delayTime = 50;  // Delay in milliseconds

void setup() {
  // Initialize both digital pins as outputs
  pinMode(led1, OUTPUT);
  pinMode(led2, OUTPUT);
}

void loop() {
  // Turn on first LED, turn off second LED
  digitalWrite(led1, HIGH);
  digitalWrite(led2, LOW);
  delay(delayTime);
  
  // Turn off first LED, turn on second LED
  digitalWrite(led1, LOW);
  digitalWrite(led2, HIGH);
  delay(delayTime);
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
  const [pinState, setPinState] = useState({
    0: false,
    1: false,
    2: false,
    3: false,
    4: false,
    5: false,
    6: false,
    7: false,
    8: false,
    9: false,
    10: false,
    11: false,
    12: false,
    13: false, 
  }); 
  // Add a version counter to force re-renders when pin states change
  const [pinStateVersion, setPinStateVersion] = useState(0);
  // Add a ref to hold real-time hardware pin states that can be accessed directly by components
  const realPinStatesRef = useRef({
    0: false, 1: false, 2: false, 3: false, 4: false, 5: false, 6: false, 7: false,
    8: false, 9: false, 10: false, 11: false, 12: false, 13: false
  });
  const [pages, setPages] = useState([]); 
  const [pageCounter, setPageCounter] = useState(1); 
  const ledStateRef = useRef(false); 
  const [defaultCode, setDefaultCode] = useState(ArduinoCode);
  const [resultOfHex, setresultOfHex] = useState("nothing");
  const [allProjNames, setallProjNames] = useState([]);
  // Added a state to track the selected tab
  const [selectedTabIndex, setSelectedTabIndex] = useState(0);
  // Add state to manage the modal visibility and input value
  const [modalKey, setModalKey] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPageName, setNewPageName] = useState("");
  const [isEditorVisible, setIsEditorVisible] = useState(false); // Control editor visibility
  const [editorWidth, setEditorWidth] = useState(40); // Editor width as percentage
  const [isResizing, setIsResizing] = useState(false); // Track resize state


  const [isProjectBrowserVisible, setIsProjectBrowserVisible] = useState(false);
  const [projectBrowserWidth, setProjectBrowserWidth] = useState(20);
  const [isProjectBrowserResizing, setIsProjectBrowserResizing] = useState(false);

  const [projectViewMode, setProjectViewMode] = useState('grid');
  const [projectSearchQuery, setProjectSearchQuery] = useState('');

  const [showWelcomeScreen, setShowWelcomeScreen] = useState(true);
  const [fetchData, setfetchData] = useState([]);

  // Add this state near your other state declarations
  const [projectStates, setProjectStates] = useState({});

  // Add this state near your other state declarations
  const [isRunning, setIsRunning] = useState(false);
  const cpuLoopRef = useRef(null);
  const [ledState, setLedState] = useState(true); // Set initial state to true
  const [isActive, setIsActive] = useState(false); // Add isActive state variable

  // Memoize the Page component to prevent re-rendering on code changes
  const MemoizedPage = useMemo(() => {
    return ({ pageId, removePage }) => {
      const [nodes, setNodes, onNodesChange] = useNodesState([]);
      const [edges, setEdges, onEdgesChange] = useEdgesState([]);
      const [idCounter, setIdCounter] = useState(1);
      const [selectedNode, setSelectedNode] = useState(null);
      const edgeReconnectSuccessful = useRef(true);
      const [resistorValues, setResistorValues] = useState({});

      useEffect(() => {
        console.log("Page component rendered");
      });

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
        (params) => {
          // Get the source and target nodes
          const sourceNode = nodes.find(node => node.id === params.source);
          const targetNode = nodes.find(node => node.id === params.target);

          if (sourceNode && targetNode) {
            // Get component types and handle names
            const sourceType = sourceNode.type;
            const targetType = targetNode.type;
            const sourceHandle = params.sourceHandle;
            const targetHandle = params.targetHandle;

            // Create a notification message
            let notificationMessage = `Connected ${sourceType} (${sourceHandle}) to ${targetType} (${targetHandle})`;

            // Add specific component notifications
            if ((sourceType === 'led' && targetType === 'arduinoUno') || 
                (targetType === 'led' && sourceType === 'arduinoUno')) {
              const led = sourceType === 'led' ? sourceNode : targetNode;
              const arduino = sourceType === 'arduinoUno' ? sourceNode : targetNode;
              const pin = sourceType === 'arduinoUno' ? sourceHandle : targetHandle;
              notificationMessage = `LED ${sourceType === 'led' ? sourceHandle : targetHandle} connected to Arduino Uno ${pin}`;
              toast.info(notificationMessage, {
                icon: "💡"
              });
            } else if ((sourceType === 'resistor' || targetType === 'resistor')) {
              const resistor = sourceType === 'resistor' ? sourceNode : targetNode;
              const otherComponent = sourceType === 'resistor' ? targetNode : sourceNode;
              notificationMessage = `Resistor ${sourceType === 'resistor' ? sourceHandle : targetHandle} connected to ${otherComponent.type} ${sourceType === 'resistor' ? targetHandle : sourceHandle}`;
              toast.info(notificationMessage, {
                icon: "⚡"
              });
            } else if ((sourceType === 'breadboard' || targetType === 'breadboard')) {
              const breadboard = sourceType === 'breadboard' ? sourceNode : targetNode;
              const otherComponent = sourceType === 'breadboard' ? targetNode : sourceNode;
              notificationMessage = `Breadboard ${sourceType === 'breadboard' ? sourceHandle : targetHandle} connected to ${otherComponent.type} ${sourceType === 'breadboard' ? targetHandle : sourceHandle}`;
              toast.info(notificationMessage, {
                icon: "🔌"
              });
            } else {
              toast.info(notificationMessage, {
                icon: "🔗"
              });
            }
          }

          // Create the edge connection
          setEdges((eds) => addEdge(params, eds));
        },
        [nodes]
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

      const addNode = (Component, width, height, initialData = {}, shouldBlink = false) => {
        const position = { x: 100, y: 100 };
        const isLEDComponent = Component.name === "LED";
        
        // Create component with all necessary props
        const component = (
          <Component
            id={`component-${idCounter}`}
            pos={position}
            onDelete={handleDeleteNode}
            pinState={pinState}
            shouldBlink={shouldBlink}
            isConnected={false}
            pin={undefined}
            realPinStatesRef={isLEDComponent ? realPinStatesRef : undefined}
            style={{ pointerEvents: 'all' }}
            {...initialData}
          />
        );
        
        const newNode = {
          id: `${idCounter}`,
          type: "custom",
          position,
          data: {
            component,
            width,
            height,
            ...initialData,
          },
          style: {
            width,
            height,
            pointerEvents: 'all'
          },
        };
        
        setNodes((nds) => [...nds, newNode]);
        setIdCounter((prev) => prev + 1);
        console.log("Node added:", newNode);
      };

      const [successNotificationShown, setSuccessNotificationShown] = useState({});

      useEffect(() => {
        console.log("Pin state updated in MemoizedPage:", pinState);
        console.log("Pin state version:", pinStateVersion); // Log version changes
        
        setNodes((nds) =>
          nds.map((node) => {
            if (node.data.component.type.name === "LED") {
              const arduinoNode = nodes.find(n => n.data.component.type.name === "ArduinoUnoR3");
              const resistors = nodes.filter(n => n.data.component.type.name === "Resistor");
              if (!resistors.length) return node;
              
              // Find the resistor that's connected to this LED
              const connectedResistor = resistors.find(resistor => {
                const ledToResistor = edges.find(
                  edge => 
                    ((edge.source === node.id && edge.target === resistor.id &&
                      edge.sourceHandle === "anode-source" && 
                      (edge.targetHandle === "left-target" || edge.targetHandle === "right-target")) ||
                    (edge.source === resistor.id && edge.target === node.id &&
                      (edge.sourceHandle === "left-source" || edge.sourceHandle === "right-source") && 
                      edge.targetHandle === "anode-target"))
                );
                
                if (!ledToResistor) return false;

                // Check if resistor is connected to any digital pin
                const resistorToArduino = edges.find(
                  edge =>
                    ((edge.source === resistor.id && edge.target === arduinoNode?.id &&
                      (edge.sourceHandle === "left-source" || edge.sourceHandle === "right-source") && 
                      edge.targetHandle.includes("handle-target-digital-")) ||
                    (edge.source === arduinoNode?.id && edge.target === resistor.id &&
                      edge.sourceHandle.includes("handle-source-digital-") && 
                      (edge.targetHandle === "left-target" || edge.targetHandle === "right-target")))
                );

                return Boolean(resistorToArduino);
              });

              // Check if cathode is connected to GND
              const isCathodeConnectedToGND = Boolean(
                edges.find(edge => 
                  (edge.source === node.id && 
                    edge.target === arduinoNode?.id && 
                    edge.sourceHandle === "cathode-source" && 
                    (edge.targetHandle === "handle-target-power-GND1" || 
                     edge.targetHandle === "handle-target-power-GND2")) ||
                  (edge.source === arduinoNode?.id && 
                    edge.target === node.id && 
                    (edge.sourceHandle === "handle-source-power-GND1" || 
                     edge.sourceHandle === "handle-source-power-GND2") && 
                     edge.targetHandle === "cathode-target")
                )
              );

              // Find which digital pin the LED is connected to (via resistor)
              const pinConnections = edges.filter(edge => 
                (edge.source === arduinoNode?.id && 
                  resistors.some(resistor => 
                    edge.target === resistor.id && 
                    edge.sourceHandle.includes('digital') && 
                    edges.some(e => (e.source === resistor.id && e.target === node.id) || (e.source === node.id && e.target === resistor.id))
                  )
                ) ||
                (edge.target === arduinoNode?.id && 
                  resistors.some(resistor => 
                    edge.source === resistor.id && 
                    edge.targetHandle.includes('digital') && 
                    edges.some(e => (e.source === resistor.id && e.target === node.id) || (e.source === node.id && e.target === resistor.id))
                  )
                )
              );

              const pinNumber = parseInt(
                pinConnections.find(edge => edge.source === arduinoNode?.id)?.sourceHandle?.match(/\d+/)?.[0] || 
                pinConnections.find(edge => edge.target === arduinoNode?.id)?.targetHandle?.match(/\d+/)?.[0]
              );

              const isProperlyConnected = Boolean(connectedResistor) && isCathodeConnectedToGND && !isNaN(pinNumber);

              // Debug logs
              console.log(`LED ${node.id} connection check:`, {
                hasConnectedResistor: Boolean(connectedResistor),
                isCathodeConnectedToGND,
                pinNumber,
                isProperlyConnected,
                pinState: isProperlyConnected ? pinState[pinNumber] : undefined
              });

              // CRITICAL FIX: Force LED to acknowledge pin state on every update
              const newPinState = {...pinState};
              const actualPinState = pinNumber !== undefined ? pinState[pinNumber] : false;
              
              // Force recreation of component to ensure it gets the latest props
              const clonedProps = {
                ...node.data.component.props,
                isConnected: isProperlyConnected,
                shouldBlink: isProperlyConnected && actualPinState,
                pinState: newPinState,
                pin: pinNumber,
                pinStateVersion: pinStateVersion, // Add version to force updates
                forceUpdate: Date.now(), // Add timestamp to force re-render
                key: `led-${node.id}-${Date.now()}-${pinStateVersion}`, // Include version in key
                realPinStatesRef: realPinStatesRef, // Pass direct hardware pin states ref
              };
              
              // Create new component with fresh props
              const newComponent = React.createElement(
                node.data.component.type,
                clonedProps
              );
              
              console.log(`RECREATING LED ${node.id} with pin ${pinNumber}, state:`, 
                actualPinState ? "HIGH" : "LOW");

              // Create a new component instance with updated props
              return {
                ...node,
                data: {
                  ...node.data,
                  component: newComponent
                },
              };
            }
            return node;
          })
        );
      }, [edges, nodes, pinState, pinStateVersion]);

      const handleResistorValueChange = (id, value) => {
        setResistorValues((prev) => {
          const updatedValues = { ...prev, [id]: value };
          localStorage.setItem("resistorValues", JSON.stringify(updatedValues));
          return updatedValues;
        });
      };

      return (
        <div style={{ display: "flex", height: "100%", width: "100%" }}>
          <div className="components-section">
            <h3 className="components-header">Components</h3>
            <button
              onClick={() => addNode(LED, 100, 100, {}, true)}
              className="component-button"
            >
              <FaLightbulb style={{ marginRight: "5px" }} />
              Add LED
            </button>
            <button
              onClick={() => addNode(Resistor, 100, 50, { resistance: "" })}
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
                custom: (props) => (
                  <CustomNode
                    {...props}
                    onResistorValueChange={handleResistorValueChange}
                    onDelete={handleDeleteNode}
                  />
                ),
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
              style={{
                backgroundColor: "#F7F9FB",
                border: "2px solid #003366",
                borderRadius: "10px",
              }} // Add border and border-radius
            >
              <Controls style={{ left: 10, right: "auto" }} />{" "}
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
              <Background variant="lines" gap={16} size={1} color="#b5deb5" />{" "}
              {/* Use lines background */}
            </ReactFlow>
          </div>
        </div>
      );
    };
  }, []);

  // Function to handle the creation of a new page
  const handleNewPageClick = () => {
    // const newPageId = `page-${pageCounter}`; // Generate a new page ID
    // setPages([...pages, newPageId]); // Add the new page ID to the list of pages
    // setPageCounter(pageCounter + 1); // Increment the page counter
    setModalKey((prev) => prev + 1);
    setNewPageName("");
    setIsModalOpen(true); // Show the modal
  };

  // Function to handle the submission of the new page name
  const handleNewPageSubmit = () => {
    // const newPageId = `page-${pageCounter}`; // Generate a new page ID
    // const newPageId = `${newPageName}`;
    if (!newPageName.trim()) {
      alert("Please enter a project name");
      return;
    }
    setPages([newPageName, ...pages]); // Add the new page ID to the list of pages
    setPageCounter(pageCounter + 1); // Increment the page counter
    setIsModalOpen(false); // Hide the modal
    // setNewPageName(""); // Clear the input value
    setShowWelcomeScreen(false);
  };

  const handleNewPageSubmitExsistingProject = (proj) => {
    // const newPageId = `page-${pageCounter}`; // Generate a new page ID
    // const newPageId = `${newPageName}`;
    setPages([proj, ...pages]); // Add the new page ID to the list of pages

    setPageCounter((prev) => prev + 1); // Increment the page counter
    setIsModalOpen(false); // Hide the modal
    // setNewPageName(""); // Clear the input value
    setShowWelcomeScreen(false);
  };
  console.log("all pages", pages);
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
    if (isRunning) {
      console.log("Stopping code execution");
      setIsRunning(false);
      if (cpuLoopRef.current) {
        clearInterval(cpuLoopRef.current);
        cpuLoopRef.current = null;
      }
      
      // Reset all pin states to LOW when stopping
      const resetPinState = {};
      for (let pin = 0; pin <= 13; pin++) {
        resetPinState[pin] = false;
      }
      setPinState(resetPinState);
      setPinStateVersion(v => v + 1);
      
      return;
    }
    
    console.log("Starting code execution");
    setIsRunning(true);

    try {
      const response = await fetch("http://localhost:3512/compile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: defaultCode }),
      });

      const result = await response.json();
      console.log("Compilation result:", result);
      setresultOfHex(result.hex);
      
      const { data } = parse(result.hex);
      const progData = new Uint8Array(data);
      const data16 = new Uint16Array(progData.buffer);

      const cpu = new CPU(data16);
      const portD = new AVRIOPort(cpu, portDConfig);
      const portB = new AVRIOPort(cpu, portBConfig);
      const timer = new AVRTimer(cpu, timer0Config);

      // CRITICAL FIX: Direct pin state update function
      const directUpdatePinStates = () => {
        // Create a fresh state object
        const newPinStates = {};
        
        // Read all pin states directly from hardware
        for (let pin = 0; pin <= 7; pin++) {
          newPinStates[pin] = portD.pinState(pin) === PinState.High;
        }
        
        for (let pin = 0; pin <= 5; pin++) {
          newPinStates[pin + 8] = portB.pinState(pin) === PinState.High;
        }
        
        // CRITICAL: Update the real-time ref with hardware pin states FIRST
        realPinStatesRef.current = {...newPinStates};
        
        // CRITICAL: Force React state update with NO COMPARISON
        setPinState(() => ({...newPinStates}));
        setPinStateVersion(v => v + 1);
      };
      
      // Run initialization cycles
      for (let i = 0; i < 500000; i++) {  // Reduced initialization cycles
        avrInstruction(cpu);
        cpu.tick();
      }
      
      // Initialize pin states
      directUpdatePinStates();

      // Add direct port listeners
      portD.addListener(() => {
        console.log("**PORT D CHANGED - DIRECT UPDATE**");
        directUpdatePinStates();
      });
      
      portB.addListener(() => {
        console.log("**PORT B CHANGED - DIRECT UPDATE**");
        directUpdatePinStates();
      });

      console.log("Starting CPU execution loop");
      
      // Main execution loop with optimized timing
      cpuLoopRef.current = setInterval(() => {
        // Run a smaller batch of instructions for more responsive updates
        for (let i = 0; i < 50000; i++) {  // Reduced from 5,000 to 1,000 for more accurate timing
          avrInstruction(cpu);
          cpu.tick();
        }
        
        // Always force pin state updates
        directUpdatePinStates();
        
      }, 1); // Reduced from 15ms to 1ms for more precise timing
        
    } catch (error) {
      console.error("Error running code:", error);
      setIsRunning(false);
    }
  };

  console.log(`the hex is ${resultOfHex}`);
  console.log("is running", isRunning);

  // Add state management and effect to make the LED blink based on the pin state changes
  const [ledBlinkState, setLedBlinkState] = useState(false);
  useEffect(() => {
    const interval = setInterval(() => {
      setLedBlinkState(prevState => !prevState); // Toggle LED state
    }, 5); // Change this interval as needed

    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
      <div className="toolbar">
        <Tooltip text="New Page (Ctrl+N)">
          {" "}
          {/* Add Tooltip component */}
          <button
            onClick={() => {
              handleNewPageClick();
              setShowWelcomeScreen(false);
            }}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 
              focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors flex items-center"
          >
            <MdNoteAdd className="mr-1" /> New Project
          </button>
        </Tooltip>
        {/* <Button onClick={() => setIsDrawerOpen(true)}>Show drawer</Button> */}
      </div>

      <Tabs style={{ height: "calc(100% - 40px)" }}>
        {" "}
        {/* Tabs component to manage multiple pages */}
        <TabList>
          {" "}
          {/* TabList component to display the list of tabs */}
          {pages.map((pageId, index) => (
            <Tab key={pageId}>
              {" "}
              {/* Tab component for each page */}
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
          <TabPanel key={pageId} style={{ height: "100%", width: "100%" }}>
            {/* TabPanel component for each page */}
            <MemoizedPage pageId={pageId} removePage={handleRemovePage} />{" "}
            {/* Render the MemoizedPage component */}
          </TabPanel>
        ))}
        {/* <textarea
          rows={30}
          style={{ width: "100%" }}
          value={defaultCode}
          onChange={(e) => setDefaultCode(e.target.value)}
        ></textarea> */}
        {/* <Editor language="jsx" value={defaultCode} onUpdate={setDefaultCode} /> */}
        <Editor
          height="50vh"
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
        {/* <button onClick={() => RunCode()}>RUN</button> */}
        <button
          onClick={() => RunCode()}
          style={{
            backgroundColor: isRunning ? "#ff4444" : "#4CAF50",
            color: "white",
            padding: "10px 20px",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          {isRunning ? "STOP" : "RUN"}
        </button>
      </Tabs>
    </div>
    );
  }
