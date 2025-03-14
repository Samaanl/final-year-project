import React, { useState, useCallback, useRef, useEffect,useMemo } from "react";
import { Button, Drawer, Modal, TextInput } from "flowbite-react";

import { v4 as uuidv4 } from "uuid";
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
  const [pages, setPages] = useState([]); // State to manage the list of pages
  const [pageCounter, setPageCounter] = useState(1); // Counter to generate unique page IDs
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
  const [isProjectBrowserResizing, setIsProjectBrowserResizing] =
    useState(false);

  const [projectViewMode, setProjectViewMode] = useState("grid");
  const [projectSearchQuery, setProjectSearchQuery] = useState("");

  const [showWelcomeScreen, setShowWelcomeScreen] = useState(true);
  const [fetchData, setfetchData] = useState([]);

  // Add this state near your other state declarations
  const [projectStates, setProjectStates] = useState({});

  // Add this state near your other state declarations
  const [isRunning, setIsRunning] = useState(false);
  const cpuLoopRef = useRef(null);
  const [ledState, setLedState] = useState(true); // Set initial state to true
  const [isActive, setIsActive] = useState(false); // Add isActive state variable

  // Reference to the root element for CSS variable manipulation
  const rootRef = useRef(null);

  // Improved resize handlers for the editor
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

  const handleProjectBrowserResizeStart = (e) => {
    setIsProjectBrowserResizing(true);
    e.preventDefault();
  };

  const handleProjectBrowserResizeMove = (e) => {
    if (!isProjectBrowserResizing) return;

    // Calculate width based on mouse position
    const mouseX = e.clientX;
    const windowWidth = window.innerWidth;

    // Convert to percentage of window width
    const newWidth = (mouseX / windowWidth) * 100;

    // Constrain width between 15% and 40%
    if (newWidth >= 15 && newWidth <= 40) {
      setProjectBrowserWidth(newWidth);
    }
  };

  const handleProjectBrowserResizeEnd = () => {
    setIsProjectBrowserResizing(false);
  };

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedState, setLastSavedState] = useState({
    nodes: [],
    edges: [],
  });

  // Add event listeners for resize
  useEffect(() => {
    if (isResizing) {
      window.addEventListener("mousemove", handleResizeMove);
      window.addEventListener("mouseup", handleResizeEnd);
    }

    return () => {
      window.removeEventListener("mousemove", handleResizeMove);
      window.removeEventListener("mouseup", handleResizeEnd);
    };
  }, [isResizing]);

  useEffect(() => {
    if (isProjectBrowserResizing) {
      window.addEventListener("mousemove", handleProjectBrowserResizeMove);
      window.addEventListener("mouseup", handleProjectBrowserResizeEnd);
    }

    return () => {
      window.removeEventListener("mousemove", handleProjectBrowserResizeMove);
      window.removeEventListener("mouseup", handleProjectBrowserResizeEnd);
    };
  }, [isProjectBrowserResizing]);

  const handleDeleteProject = async (projectName) => {
    if (!projectName || projectName.trim() === "") {
      console.error("No project name provided for deletion");
      return;
    }

    if (window.confirm(`Are you sure you want to delete ${projectName}?`)) {
      try {
        const response = await fetch(
          `http://localhost:3512/deleteProject/${encodeURIComponent(
            projectName
          )}`,
          {
            method: "DELETE",
          }
        );

        if (response.ok) {
          // Remove from local state
          setallProjNames((prevProjects) =>
            prevProjects.filter((proj) => proj !== projectName)
          );
          // Remove from pages if it's open
          setPages((prevPages) =>
            prevPages.filter((page) => page !== projectName)
          );
        } else {
          console.error("Failed to delete project");
        }
      } catch (error) {
        console.error("Error deleting project:", error);
      }
    }
  };

  useEffect(() => {
    // Fetch all projects when the app loads
    fetch("http://localhost:3512/getAllProjects")
      .then((res) => res.json())
      .then((data) => {
        if (data.projects && data.projects.length > 0) {
          setallProjNames(data.projects);
          console.log("Project names loaded:", data.projects);
        }
      })
      .catch((error) => {
        console.error("Error fetching project names:", error);
      });
  }, []);

  // Page component to handle each individual page
  const Page = useMemo(() => {
    return ({ pageId, removePage }) => {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [idCounter, setIdCounter] = useState(1);
    const [selectedNode, setSelectedNode] = useState(null);
    const edgeReconnectSuccessful = useRef(true);
    const [resistorValues, setResistorValues] = useState({});
    const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);

    const [selectedEdge, setSelectedEdge] = useState(null);
    const [colorPickerPosition, setColorPickerPosition] = useState({
      x: 0,
      y: 0,
    });

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

          // Add specific component notifications and validations
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
            const breadboardHandle = sourceType === 'breadboard' ? sourceHandle : targetHandle;
            const otherHandle = sourceType === 'breadboard' ? targetHandle : sourceHandle;

            // Validate breadboard connections
            if (breadboardHandle.includes('power')) {
              // Power rail connections
              if (otherComponent.type === 'arduinoUno') {
                if (breadboardHandle.includes('red') && otherHandle.includes('5V')) {
                  notificationMessage = `Breadboard power rail (+) connected to Arduino 5V`;
                  toast.success(notificationMessage, { icon: "🔌" });
                } else if (breadboardHandle.includes('blue') && otherHandle.includes('GND')) {
                  notificationMessage = `Breadboard ground rail (-) connected to Arduino GND`;
                  toast.success(notificationMessage, { icon: "🔌" });
                } else {
                  toast.error("Invalid power connection! Connect red rail to 5V and blue rail to GND", { icon: "⚠️" });
                  return;
                }
              } else {
                toast.error("Power rails can only be connected to Arduino power pins", { icon: "⚠️" });
                return;
              }
            } else if (breadboardHandle.includes('main')) {
              // Main breadboard area connections
              if (otherComponent.type === 'led' || otherComponent.type === 'resistor') {
                // Check if this component is connected to Arduino through breadboard
                const existingEdges = edges.filter(edge => 
                  (edge.source === otherComponent.id || edge.target === otherComponent.id) &&
                  (edge.source === breadboard.id || edge.target === breadboard.id)
                );

                // Find Arduino connection through breadboard
                const arduinoConnection = edges.find(edge => 
                  (edge.source === breadboard.id || edge.target === breadboard.id) &&
                  (edge.source === nodes.find(n => n.type === 'arduinoUno')?.id || 
                   edge.target === nodes.find(n => n.type === 'arduinoUno')?.id)
                );

                if (arduinoConnection) {
                  const arduinoNode = nodes.find(n => n.id === arduinoConnection.source || n.id === arduinoConnection.target);
                  const arduinoPin = arduinoConnection.source === arduinoNode.id ? 
                    arduinoConnection.sourceHandle : arduinoConnection.targetHandle;
                  
                  if (arduinoPin.includes('digital') || arduinoPin.includes('analog')) {
                    notificationMessage = `Component connected to Arduino ${arduinoPin} through breadboard`;
                    toast.info(notificationMessage, { icon: "🔌" });
                  }
                } else {
                  notificationMessage = `Component connected to breadboard at ${breadboardHandle}`;
                  toast.info(notificationMessage, { icon: "🔌" });
                }
              } else if (otherComponent.type === 'arduinoUno') {
                if (otherHandle.includes('digital') || otherHandle.includes('analog')) {
                  notificationMessage = `Arduino pin ${otherHandle} connected to breadboard`;
                  toast.info(notificationMessage, { icon: "🔌" });
                } else {
                  toast.error("Invalid connection! Only digital/analog pins can connect to main breadboard area", { icon: "⚠️" });
                  return;
                }
              } else {
                toast.error("Invalid connection! Main breadboard area can only connect to components or Arduino pins", { icon: "⚠️" });
                return;
              }
            } else {
              toast.error("Invalid breadboard connection!", { icon: "⚠️" });
              return;
            }
          } else {
            toast.info(notificationMessage, {
              icon: "🔗"
            });
          }
        }

        // Create the edge connection
        setEdges((eds) => addEdge(params, eds));
      },
      [nodes, edges]
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

    const addNode = (Component, width, height, pos, initialData = {}, shouldBlink = false) => {
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
              pinState={pinState}
              shouldBlink={shouldBlink}
              isConnected={false}
              pin={undefined}
              realPinStatesRef={isLEDComponent ? realPinStatesRef : undefined}
              style={{ pointerEvents: 'all' }}
              {...initialData}
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
      console.log("Node added:", newNode);
    };
    

    const [successNotificationShown, setSuccessNotificationShown] = useState({});

      useEffect(() => {
        console.log("Pin state updated in MemoizedPage:", pinState);
        console.log("Pin state version:", pinStateVersion);
        
        // First, identify breadboard power rail connections to Arduino pins
        const breadboardNode = nodes.find(n => n.data.component.type.name === "Breadboard");
        const arduinoNode = nodes.find(n => n.data.component.type.name === "ArduinoUnoR3");
        
        // Create maps to track which rail is connected to which Arduino pin
        const breadboardRailConnections = {
          'top-red': null,
          'top-blue': null,
          'bottom-red': null,
          'bottom-blue': null
        };
        
        // If both breadboard and Arduino exist, check for connections between them
        if (breadboardNode && arduinoNode) {
          // Find all connections between Arduino and breadboard
          const breadboardToArduinoEdges = edges.filter(edge => 
            (edge.source === breadboardNode.id && edge.target === arduinoNode.id) ||
            (edge.source === arduinoNode.id && edge.target === breadboardNode.id)
          );
          
          // Map connections to determine which rails are connected to which Arduino pins
          breadboardToArduinoEdges.forEach(edge => {
            const breadboardHandle = edge.source === breadboardNode.id ? 
              edge.sourceHandle : edge.targetHandle;
            const arduinoHandle = edge.source === arduinoNode.id ? 
              edge.sourceHandle : edge.targetHandle;
            
            // Extract pin number from Arduino handle
            const pinMatch = arduinoHandle.match(/\d+/);
            const pinNumber = pinMatch ? parseInt(pinMatch[0]) : null;
            
            // Determine which rail is connected based on the handle ID
            if (breadboardHandle?.includes('rail')) {
              // Identify which rail is connected
              if (breadboardHandle.includes('top') && breadboardHandle.includes('red')) {
                breadboardRailConnections['top-red'] = pinNumber;
              } else if (breadboardHandle.includes('top') && breadboardHandle.includes('blue')) {
                breadboardRailConnections['top-blue'] = pinNumber;
              } else if (breadboardHandle.includes('bottom') && breadboardHandle.includes('red')) {
                breadboardRailConnections['bottom-red'] = pinNumber;
              } else if (breadboardHandle.includes('bottom') && breadboardHandle.includes('blue')) {
                breadboardRailConnections['bottom-blue'] = pinNumber;
              }
            }
          });
        }
        
        console.log("Breadboard rail connections:", breadboardRailConnections);
        
        setNodes((nds) =>
          nds.map((node) => {
            if (node.data.component.type.name === "LED") {
              const arduinoNode = nodes.find(n => n.data.component.type.name === "ArduinoUnoR3");
              const resistors = nodes.filter(n => n.data.component.type.name === "Resistor");
              const breadboardNode = nodes.find(n => n.data.component.type.name === "Breadboard");
              
              // Find all connections for this LED
              const ledConnections = edges.filter(edge => 
                edge.source === node.id || edge.target === node.id
              );

              // Find resistor connection
              const connectedResistor = resistors.find(resistor => {
                return ledConnections.some(edge => 
                  (edge.source === node.id && edge.target === resistor.id && 
                   edge.sourceHandle === "anode-source" && 
                   (edge.targetHandle === "left-target" || edge.targetHandle === "right-target")) ||
                  (edge.source === resistor.id && edge.target === node.id &&
                   (edge.sourceHandle === "left-source" || edge.sourceHandle === "right-source") && 
                   edge.targetHandle === "anode-target")
                );
              });

              // Find breadboard connection if exists
              const breadboardConnection = ledConnections.find(edge => {
                const otherNode = edge.source === node.id ? 
                  nodes.find(n => n.id === edge.target) : 
                  nodes.find(n => n.id === edge.source);
                return otherNode?.data.component.type.name === "Breadboard";
              });

              // Find Arduino connection through breadboard or resistor
              let pinNumber = undefined;
              
              if (arduinoNode) {
                // First try direct connection
                const directArduinoConnection = ledConnections.find(edge => 
                  (edge.source === arduinoNode.id && edge.target === node.id && 
                   edge.sourceHandle.includes('digital')) ||
                  (edge.source === node.id && edge.target === arduinoNode.id && 
                   edge.targetHandle.includes('digital'))
                );

                if (directArduinoConnection) {
                  pinNumber = parseInt(
                    directArduinoConnection.sourceHandle?.match(/\d+/)?.[0] || 
                    directArduinoConnection.targetHandle?.match(/\d+/)?.[0]
                  );
                } else if (breadboardConnection) {
                  // Check if LED is connected to a breadboard rail
                  const breadboardHandle = breadboardConnection.source === breadboardNode.id ? 
                    breadboardConnection.sourceHandle : 
                    breadboardConnection.targetHandle;
                  
                  // Check if this handle is part of a rail
                  if (breadboardHandle?.includes('rail')) {
                    // Determine which rail this LED is connected to
                    if (breadboardHandle.includes('top') && breadboardHandle.includes('red')) {
                      pinNumber = breadboardRailConnections['top-red'];
                    } else if (breadboardHandle.includes('top') && breadboardHandle.includes('blue')) {
                      pinNumber = breadboardRailConnections['top-blue'];
                    } else if (breadboardHandle.includes('bottom') && breadboardHandle.includes('red')) {
                      pinNumber = breadboardRailConnections['bottom-red'];
                    } else if (breadboardHandle.includes('bottom') && breadboardHandle.includes('blue')) {
                      pinNumber = breadboardRailConnections['bottom-blue'];
                    }
                  } else {
                    // For non-rail connections, check direct connections to the breadboard itself
                    const breadboardToArduino = edges.find(edge => 
                      (edge.source === breadboardNode.id && edge.target === arduinoNode.id) ||
                      (edge.source === arduinoNode.id && edge.target === breadboardNode.id)
                    );

                    if (breadboardToArduino) {
                      pinNumber = parseInt(
                        breadboardToArduino.sourceHandle?.match(/\d+/)?.[0] || 
                        breadboardToArduino.targetHandle?.match(/\d+/)?.[0]
                      );
                    }
                  }
                } else if (connectedResistor) {
                  // Resistor could be connected to Arduino directly or through breadboard
                  const resistorConnections = edges.filter(edge => 
                    edge.source === connectedResistor.id || edge.target === connectedResistor.id
                  );
                  
                  // Check direct resistor to Arduino connection
                  const resistorToArduino = resistorConnections.find(edge => 
                    (edge.source === connectedResistor.id && edge.target === arduinoNode.id) ||
                    (edge.source === arduinoNode.id && edge.target === connectedResistor.id)
                  );

                  if (resistorToArduino) {
                    pinNumber = parseInt(
                      resistorToArduino.sourceHandle?.match(/\d+/)?.[0] || 
                      resistorToArduino.targetHandle?.match(/\d+/)?.[0]
                    );
                  } else {
                    // Check resistor to breadboard connection
                    const resistorToBreadboard = resistorConnections.find(edge => 
                      (edge.source === connectedResistor.id && edge.target === breadboardNode?.id) ||
                      (edge.source === breadboardNode?.id && edge.target === connectedResistor.id)
                    );
                    
                    if (resistorToBreadboard && breadboardNode) {
                      const breadboardHandle = resistorToBreadboard.source === breadboardNode.id ? 
                        resistorToBreadboard.sourceHandle : 
                        resistorToBreadboard.targetHandle;
                      
                      // Check if resistor is connected to a breadboard rail
                      if (breadboardHandle?.includes('rail')) {
                        // Determine which rail this resistor is connected to
                        if (breadboardHandle.includes('top') && breadboardHandle.includes('red')) {
                          pinNumber = breadboardRailConnections['top-red'];
                        } else if (breadboardHandle.includes('top') && breadboardHandle.includes('blue')) {
                          pinNumber = breadboardRailConnections['top-blue'];
                        } else if (breadboardHandle.includes('bottom') && breadboardHandle.includes('red')) {
                          pinNumber = breadboardRailConnections['bottom-red'];
                        } else if (breadboardHandle.includes('bottom') && breadboardHandle.includes('blue')) {
                          pinNumber = breadboardRailConnections['bottom-blue'];
                        }
                      }
                    }
                  }
                }
              }

              // Check if cathode is connected to GND
              const isCathodeConnectedToGND = Boolean(
                ledConnections.find(edge => 
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
              
              // Cathode could also be connected to a blue rail (GND)
              if (!isCathodeConnectedToGND && breadboardNode) {
                const cathodeToBreadboard = ledConnections.find(edge => 
                  (edge.source === node.id && 
                   edge.target === breadboardNode.id && 
                   edge.sourceHandle === "cathode-source") ||
                  (edge.source === breadboardNode.id && 
                   edge.target === node.id && 
                   edge.targetHandle === "cathode-target")
                );
                
                if (cathodeToBreadboard) {
                  const breadboardHandle = cathodeToBreadboard.source === breadboardNode.id ? 
                    cathodeToBreadboard.sourceHandle : 
                    cathodeToBreadboard.targetHandle;
                  
                  // Check if cathode is connected to a blue rail (GND)
                  if (breadboardHandle?.includes('blue')) {
                    // Check if this blue rail is connected to Arduino GND
                    const railConnectedToGND = 
                      (breadboardHandle.includes('top') && breadboardRailConnections['top-blue'] === 0) ||
                      (breadboardHandle.includes('bottom') && breadboardRailConnections['bottom-blue'] === 0);
                    
                    if (railConnectedToGND) {
                      isCathodeConnectedToGND = true;
                    }
                  }
                }
              }

              const isProperlyConnected = Boolean(connectedResistor) && isCathodeConnectedToGND && !isNaN(pinNumber);

              // Debug logs
              console.log(`LED ${node.id} connection check:`, {
                hasConnectedResistor: Boolean(connectedResistor),
                isCathodeConnectedToGND,
                pinNumber,
                isProperlyConnected,
                pinState: isProperlyConnected ? pinState[pinNumber] : undefined
              });

              // Force LED to acknowledge pin state on every update
              const newPinState = {...pinState};
              const actualPinState = pinNumber !== undefined ? pinState[pinNumber] : false;
              
              // Force recreation of component to ensure it gets the latest props
              const clonedProps = {
                ...node.data.component.props,
                isConnected: isProperlyConnected,
                shouldBlink: isProperlyConnected && actualPinState,
                pinState: newPinState,
                pin: pinNumber,
                pinStateVersion: pinStateVersion,
                forceUpdate: Date.now(),
                key: `led-${node.id}-${Date.now()}-${pinStateVersion}`,
                realPinStatesRef: realPinStatesRef,
              };
              
              // Create new component with fresh props
              const newComponent = React.createElement(
                node.data.component.type,
                clonedProps
              );
              
              console.log(`RECREATING LED ${node.id} with pin ${pinNumber}, state:`, 
                actualPinState ? "HIGH" : "LOW");

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
          case "ArduinoUnoR3":
            addNode(ArduinoUnoR3, 1000, 50, { x: data[i].x, y: data[i].y });
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

    console.log("all the project  names displayed in array", allProjNames);
    //fetch data from db
    useEffect(() => {
      if (nodes.length === 0 && newPageName) {
        // Ensures it runs only if no nodes exist
        fetch(`http://127.0.0.1:3512/getData/${newPageName}`)
          .then((res) => res.json())
          .then((data) => {
            console.log("Fetched data from db", data.data);
            autoled(data.data);
          })
          .catch((err) => {
            console.error("Error fetching data:", err);
          });
      }
    }, [newPageName]);

    const defaultEdgeOptions = {
      style: {
        strokeWidth: 3,
        stroke: "#666",
      },
      type: "smoothstep",
      animated: false,
    };

    const connectionLineStyle = {
      strokeWidth: 3,
      stroke: "#666",
    };

    // Add this new edge click handler
    const onEdgeClick = useCallback((event, edge) => {
      event.stopPropagation();

      // Remove 'selected' class from all edges
      document.querySelectorAll(".react-flow__edge").forEach((el) => {
        el.classList.remove("selected");
      });

      // Get edge element and calculate center position
      const edgeElement = document.querySelector(
        `[data-testid="rf__edge-${edge.id}"]`
      );
      if (edgeElement) {
        // Add 'selected' class to the clicked edge
        edgeElement.classList.add("selected");

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
        document.querySelectorAll(".react-flow__edge").forEach((el) => {
          el.classList.remove("selected");
        });
      };
    }, []);

    // Update color change handler to the simpler version
    const handleColorChange = useCallback(
      (color) => {
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
      },
      [selectedEdge, setEdges]
    );

    useEffect(() => {
      // Skip the initial render
      if (nodes.length === 0 && edges.length === 0) return;

      // Check if current state is different from last saved state
      const currentState = {
        nodes: nodes.map(node => ({ ...node, data: { ...node.data, component: null } })),
        edges: edges.map(edge => ({ ...edge }))
      };
      const savedState = {
        nodes: lastSavedState.nodes.map(node => ({ ...node, data: { ...node.data, component: null } })),
        edges: lastSavedState.edges.map(edge => ({ ...edge }))
      };

      if (JSON.stringify(currentState) !== JSON.stringify(savedState)) {
        setHasUnsavedChanges(true);
      }
    }, [nodes, edges]);

    // Add click outside handler
    useEffect(() => {
      const handleClickOutside = (event) => {
        if (
          !event.target.closest(".color-picker-container") &&
          !event.target.closest(".react-flow__edge")
        ) {
          setSelectedEdge(null);
          // Remove selected class from all edges
          document.querySelectorAll(".react-flow__edge").forEach((el) => {
            el.classList.remove("selected");
          });
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Update ColorPicker component to remove the color preset buttons
    const ColorPicker = () => {
      if (!selectedEdge) return null;

      return (
        <div
          className="color-picker-container"
          style={{
            position: "fixed",
            left: `${colorPickerPosition.x}px`,
            top: `${colorPickerPosition.y}px`,
            transform: "translate(-50%, -50%)",
            background: "white",
            padding: "8px",
            borderRadius: "4px",
            boxShadow: "0 0 5px rgba(0,0,0,0.3)",
            zIndex: 1000,
            display: "flex",
            flexDirection: "column",
            gap: "4px",
          }}
        >
          <input
            type="color"
            value={selectedEdge?.style?.stroke || "#666"}
            onChange={(e) => handleColorChange(e.target.value)}
            style={{
              width: "24px",
              height: "24px",
              padding: 0,
              border: "none",
              cursor: "pointer",
            }}
          />
        </div>
      );
    };

    // console.log("fetchData", fetchData);
    return (
      <div style={{ display: "flex", height: "100%", width: "100%" }}>
        <div
          className={`components-section ${
            isPanelCollapsed ? "collapsed" : ""
          }`}
        >
          <button
            className="collapse-button"
            onClick={() => setIsPanelCollapsed(!isPanelCollapsed)}
          >
            {isPanelCollapsed ? "→" : "←"}
          </button>
          <h3 className="components-header">Components</h3>
          <button
            onClick={() => addNode(LED, 100, 100, { x: 0, y: 0 },true)}
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
          <button
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
                  setLastSavedState({ nodes: [...nodes], edges: [...edges] });
                  setHasUnsavedChanges(false);
                } else {
                  alert("Failed to save data");
                }
              });
            }}
            className="component-button bg-emerald-600 hover:bg-emerald-700 transition-colors"
            style={{ backgroundColor: "rgb(5, 150, 105)" }}
          >
            <FaSave style={{ marginRight: "5px" }} />
            {!isPanelCollapsed && <span>SAVE</span>}
          </button>
        </div>
        <div style={{ flex: 1 }}>
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
              document.querySelectorAll(".react-flow__edge").forEach((el) => {
                el.classList.remove("selected");
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
              border: "2px solid #003366",
              borderRadius: "10px",
            }}
          >
            <Controls style={{ left: 10, right: "auto" }} />
            <MiniMap
              nodeColor={(node) => {
                switch (node.type) {
                  case "input":
                    return "blue";
                  case "output":
                    return "green";
                  default:
                    return "#4f46e5";
                }
              }}
              style={{
                border: "2px solid #4B5563",
                backgroundColor: "#1f2937",
                borderRadius: "4px",
              }}
              position="bottom-right"
            />
            <Background variant="lines" gap={16} size={1} color="#b5deb5" />
            <ColorPicker />
          </ReactFlow>
          <p>Active Nodes: {getActiveNodesCount()}</p>
          <p>display name: {}</p>
        </div>
      </div>
    );
  };
}, []);

  // Function to handle the creation of a new page
  const handleNewPageClick = () => {
    // Check if there are unsaved changes
    if (hasUnsavedChanges && pages.length > 0) {
      const currentPageName = pages[selectedTabIndex];

      if (
        window.confirm(
          `You have unsaved changes in "${currentPageName}". Save before creating a new project?`
        )
      ) {
        // User chose to save - trigger save action
        const saveButton = document.querySelector(
          ".component-button.bg-emerald-600"
        );
        if (saveButton) {
          saveButton.click();

          // After saving, proceed with creating a new page
          setTimeout(() => {
            setModalKey((prev) => prev + 1);
            setNewPageName("");
            setIsModalOpen(true); // Show the modal
          }, 100); // Small delay to allow save operation to complete
        }
      }
      return;
    }

    // If no unsaved changes or user confirmed, proceed with creating a new page
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
    // // If it's running, clicking the button will stop it
    // if (isRunning) {
    //   setIsRunning(false);
    //   return;
    // }
    // setIsRunning(true);

    //compile the source code to arduino redable hex
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
      {showWelcomeScreen ? (
        <div
          className="welcome-screen"
          style={{
            height: "100%",
            backgroundColor: "#1f2937",
            display: "flex",
            flexDirection: "column",
            padding: "20px",
          }}
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-white">
              Offline-Cad Project Manager
            </h1>
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
          </div>

          {/* Search */}
          <div className="mb-6 relative w-1/3">
            <input
              type="text"
              placeholder="Search projects..."
              className="project-filter w-full"
              value={projectSearchQuery}
              onChange={(e) => setProjectSearchQuery(e.target.value)}
            />
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              fill="currentColor"
              className="absolute top-3 right-3 text-gray-400"
              viewBox="0 0 16 16"
            >
              <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z" />
            </svg>
          </div>

          {/* View Toggle */}
          <div className="flex mb-6 space-x-2">
            <button
              onClick={() => setProjectViewMode("grid")}
              className={`p-2 rounded ${
                projectViewMode === "grid" ? "bg-indigo-600" : "bg-gray-700"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                fill="currentColor"
                className="text-white"
                viewBox="0 0 16 16"
              >
                <path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5v-3zm8 0A1.5 1.5 0 0 1 10.5 1h3A1.5 1.5 0 0 1 15 2.5v3A1.5 1.5 0 0 1 13.5 7h-3A1.5 1.5 0 0 1 9 5.5v-3zm-8 8A1.5 1.5 0 0 1 2.5 9h3A1.5 1.5 0 0 1 7 10.5v3A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5v-3zm8 0A1.5 1.5 0 0 1 10.5 9h3a.5.5 0 0 1 1.5 1.5v3a.5.5 0 0 1-1.5 1.5h-3a1.5 1.5 0 0 1-1.5-1.5v-3z" />
              </svg>
            </button>
            <button
              onClick={() => setProjectViewMode("list")}
              className={`p-2 rounded ${
                projectViewMode === "list" ? "bg-indigo-600" : "bg-gray-700"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                fill="currentColor"
                className="text-white"
                viewBox="0 0 16 16"
              >
                <path
                  fillRule="evenodd"
                  d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5z"
                />
              </svg>
            </button>
          </div>

          {/* Projects List */}
          <div className="flex-1 overflow-y-auto">
            {projectViewMode === "grid" ? (
              <div className="grid-view">
                {allProjNames
                  .filter(
                    (proj) =>
                      proj &&
                      proj.trim() !== "" &&
                      (!projectSearchQuery ||
                        proj
                          .toLowerCase()
                          .includes(projectSearchQuery.toLowerCase()))
                  )
                  .map((proj) => (
                    <div
                      key={proj}
                      className="project-grid-item group cursor-pointer"
                      onClick={() => {
                        setNewPageName(proj);
                        handleNewPageSubmitExsistingProject(proj);
                        setShowWelcomeScreen(false);
                      }}
                    >
                      <div className="project-thumbnail">
                        <div className="w-full h-full flex items-center justify-center bg-gray-800">
                          <FaMicrochip size={32} className="text-indigo-500" />
                        </div>
                      </div>
                      <div className="project-info">
                        <div className="project-name">{proj}</div>
                        <div className="project-date">
                          {new Date().toLocaleDateString()}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteProject(proj);
                        }}
                        className="delete-button"
                      >
                        <FaTrash size={12} />
                      </button>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="list-view">
                {allProjNames
                  .filter(
                    (proj) =>
                      proj &&
                      proj.trim() !== "" &&
                      (!projectSearchQuery ||
                        proj
                          .toLowerCase()
                          .includes(projectSearchQuery.toLowerCase()))
                  )
                  .map((proj) => (
                    <div
                      key={proj}
                      className="project-list-item cursor-pointer"
                      onClick={() => {
                        setNewPageName(proj);
                        handleNewPageSubmitExsistingProject(proj);
                        setShowWelcomeScreen(false);
                      }}
                    >
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gray-800 rounded flex items-center justify-center mr-3">
                          <FaMicrochip className="text-indigo-500" />
                        </div>
                        <div>
                          <div className="project-name">{proj}</div>
                          <div className="project-date">
                            {new Date().toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteProject(proj);
                        }}
                        className="text-red-500 hover:text-red-700 focus:outline-none"
                      >
                        <FaTrash size={12} />
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{ width: "100vw", height: "100vh" }}>
          <div className="toolbar">
            <div className="flex items-center gap-2">
              <button
                onClick={handleNewPageClick}
                className="px-3 py-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 
              focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors flex items-center"
              >
                <MdNoteAdd className="mr-1" /> New Page
              </button>

              <button
                onClick={() =>
                  setIsProjectBrowserVisible(!isProjectBrowserVisible)
                }
                className="px-3 py-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 
                focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors flex items-center"
              >
                <FaFolder className="mr-1" />{" "}
                {isProjectBrowserVisible ? "Hide Projects" : "Projects"}
              </button>

              <button
                onClick={() => setIsEditorVisible(!isEditorVisible)}
                className="px-3 py-1 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 
        focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors flex items-center"
              >
                {isEditorVisible ? "Hide Editor" : "Show Editor"}
              </button>
            </div>
          </div>

          <div
            style={{
              height: "calc(100% - 40px)",
              position: "relative",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{ height: "100%", overflow: "auto", position: "relative" }}
            >
              <Tabs
                style={{ height: "100%" }}
                selectedTabClassName="bg-gray-600 text-white border-none"
                selectedIndex={selectedTabIndex}
                onSelect={(index) => {
                  // This will only be called if our click handler above doesn't prevent the default
                  if (!hasUnsavedChanges || index === selectedTabIndex) {
                    setSelectedTabIndex(index);
                    console.log(`Tab clicked: ${pages[index]}`);
                    setNewPageName(pages[index]);
                  }
                }}
              >
                <TabList className="flex border-b border-gray-700">
                  {pages.map((pageId, index) => (
                    <Tab
                      key={pageId}
                      className={`px-4 py-2 border-t border-r border-l border-gray-700 
                      bg-gray-700 
                      focus:outline-none hover:bg-gray-600 
                      transition-colors rounded-t-md mb-[-1px]
                    ${
                      index === selectedTabIndex
                        ? "bg-gray-600 text-white border-b-0 border-t-indigo-500 border-t-2"
                        : "bg-gray-700 text-gray-300 border-b border-gray-500 opacity-80"
                    }`}
                      onClick={(e) => {
                        // If there are unsaved changes, show confirmation dialog
                        if (hasUnsavedChanges && index !== selectedTabIndex) {
                          e.preventDefault(); // Prevent the default tab switch behavior

                          const currentPageName = pages[selectedTabIndex];
                          const targetPageName = pageId;

                          if (
                            window.confirm(
                              `You have unsaved changes in "${currentPageName}". Save before switching to "${targetPageName}"?`
                            )
                          ) {
                            // User chose to save - trigger save action
                            const saveButton = document.querySelector(
                              ".component-button.bg-emerald-600"
                            );
                            if (saveButton) {
                              saveButton.click();

                              // After saving, manually switch to the desired tab
                              setTimeout(() => {
                                setSelectedTabIndex(index);
                                setNewPageName(pageId);
                              }, 100); // Small delay to allow save operation to complete
                            }
                          }
                          return;
                        }
                        // If no unsaved changes, tab switch will proceed normally
                      }}
                    >
                      {pageId}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (hasUnsavedChanges && index === selectedTabIndex) {
                            if (
                              !window.confirm(
                                `This page "${pageId}" has unsaved changes. Are you sure you want to remove it?`
                              )
                            ) {
                              return;
                            }
                          }
                          handleRemovePage(pageId);
                        }}
                        className="ml-2 text-red-500 hover:text-red-700 focus:outline-none"
                      >
                        <FaTrash size={12} />
                      </button>
                    </Tab>
                  ))}
                  <div className="flex items-center ml-auto"></div>
                </TabList>
                {pages.map((page) => (
                  <TabPanel
                    key={page.Id}
                    style={{
                      height: "100%",
                      width: "100%",
                      paddingBottom: "70px",
                    }}
                  >
                    <Page pageId={page.Id} removePage={handleRemovePage} />
                  </TabPanel>
                ))}
              </Tabs>
            </div>

            {isProjectBrowserVisible && (
              <div
                style={{
                  position: "absolute",
                  top: "0",
                  left: "0",
                  width: `${projectBrowserWidth}%`,
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  padding: "10px",
                  background: "#374151",
                  boxShadow: "5px 0 15px rgba(0, 0, 0, 0.1)",
                  zIndex: 100,
                  border: "1px solid #4B5563",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    right: "0",
                    top: "0",
                    width: "8px",
                    height: "100%",
                    cursor: "ew-resize",
                    zIndex: 101,
                  }}
                  onMouseDown={handleProjectBrowserResizeStart}
                  className={`resize-handle ${
                    isProjectBrowserResizing ? "resize-active" : ""
                  }`}
                />

                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <h3
                    style={{ color: "white" }}
                    className="text-xl font-semibold"
                  >
                    Projects
                  </h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setProjectViewMode("grid")}
                      className={`p-2 rounded ${
                        projectViewMode === "grid"
                          ? "bg-indigo-600"
                          : "bg-gray-700"
                      }`}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        fill="currentColor"
                        className="text-white"
                        viewBox="0 0 16 16"
                      >
                        <path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5v-3zm8 0A1.5 1.5 0 0 1 10.5 1h3A1.5 1.5 0 0 1 15 2.5v3A1.5 1.5 0 0 1 13.5 7h-3A1.5 1.5 0 0 1 9 5.5v-3zm-8 8A1.5 1.5 0 0 1 2.5 9h3A1.5 1.5 0 0 1 7 10.5v3A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5v-3zm8 0A1.5 1.5 0 0 1 10.5 9h3a.5.5 0 0 1 1.5 1.5v3a.5.5 0 0 1-1.5 1.5h-3a1.5 1.5 0 0 1-1.5-1.5v-3z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setProjectViewMode("list")}
                      className={`p-2 rounded ${
                        projectViewMode === "list"
                          ? "bg-indigo-600"
                          : "bg-gray-700"
                      }`}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        fill="currentColor"
                        className="text-white"
                        viewBox="0 0 16 16"
                      >
                        <path
                          fillRule="evenodd"
                          d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5z"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={() => setIsProjectBrowserVisible(false)}
                      className="p-2 rounded bg-gray-700 hover:bg-gray-600"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-gray-400"
                      >
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Search */}
                <div className="mb-4 relative">
                  <input
                    type="text"
                    placeholder="Search projects..."
                    className="project-filter"
                    value={projectSearchQuery}
                    onChange={(e) => setProjectSearchQuery(e.target.value)}
                  />
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    fill="currentColor"
                    className="absolute top-3 right-3 text-gray-400"
                    viewBox="0 0 16 16"
                  >
                    <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z" />
                  </svg>
                </div>

                {/* Project List */}
                <div className="overflow-y-auto flex-1">
                  {projectViewMode === "grid" ? (
                    <div className="grid-view">
                      {allProjNames
                        .filter(
                          (proj) =>
                            proj &&
                            proj.trim() !== "" &&
                            (!projectSearchQuery ||
                              proj
                                .toLowerCase()
                                .includes(projectSearchQuery.toLowerCase()))
                        )
                        .map((proj) => (
                          <div
                            key={proj}
                            className="project-grid-item group"
                            onClick={() => {
                              setNewPageName(proj);
                              handleNewPageSubmitExsistingProject(proj);
                            }}
                          >
                            <div className="project-thumbnail">
                              <div className="w-full h-full flex items-center justify-center bg-gray-800">
                                <FaMicrochip
                                  size={32}
                                  className="text-indigo-500"
                                />
                              </div>
                            </div>
                            <div className="project-info">
                              <div className="project-name">{proj}</div>
                              <div className="project-date">
                                {new Date().toLocaleDateString()}
                              </div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteProject(proj);
                              }}
                              className="delete-button"
                            >
                              <FaTrash size={12} />
                            </button>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="list-view">
                      {allProjNames
                        .filter(
                          (proj) =>
                            proj &&
                            proj.trim() !== "" &&
                            (!projectSearchQuery ||
                              proj
                                .toLowerCase()
                                .includes(projectSearchQuery.toLowerCase()))
                        )
                        .map((proj) => (
                          <div
                            key={proj}
                            className="project-list-item"
                            onClick={() => {
                              setNewPageName(proj);
                              handleNewPageSubmitExsistingProject(proj);
                            }}
                          >
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-gray-800 rounded flex items-center justify-center mr-3">
                                <FaMicrochip className="text-indigo-500" />
                              </div>
                              <div>
                                <div className="project-name">{proj}</div>
                                <div className="project-date">
                                  {new Date().toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteProject(proj);
                              }}
                              className="text-red-500 hover:text-red-700 focus:outline-none"
                            >
                              <FaTrash size={12} />
                            </button>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {isEditorVisible && (
              <div
                style={{
                  position: "absolute",
                  top: "0",
                  right: "0",
                  width: `${editorWidth}%`,
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  padding: "10px",
                  background: "#374151",
                  boxShadow: "-5px 0 15px rgba(0, 0, 0, 0.1)",
                  zIndex: 100,
                  border: "1px solid #4B5563",
                }}
                className="dark:bg-gray-800 dark:border-gray-700"
              >
                <div
                  style={{
                    position: "absolute",
                    left: "0",
                    top: "0",
                    width: "8px",
                    height: "100%",
                    cursor: "ew-resize",
                    zIndex: 101,
                  }}
                  onMouseDown={handleResizeStart}
                  className={`resize-handle ${
                    isResizing ? "resize-active" : ""
                  }`}
                />
                <h3 style={{ color: "white", marginBottom: "10px" }}>
                  Code Editor
                </h3>
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
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 
        focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors mt-2"
                >
                  {isRunning ? "STOP" : "RUN"}
                </button>
              </div>
            )}
          </div>

          {isModalOpen && (
            <div className="fixed inset-0 flex items-center justify-center z-50">
              <div
                className="absolute inset-0 bg-black opacity-60"
                onClick={() => setIsModalOpen(false)}
              ></div>
              <div
                className="bg-gray-800 rounded-md shadow-lg z-10 overflow-hidden border border-gray-700"
                style={{ width: "380px", maxWidth: "95%" }}
                key={`modal-${modalKey}`}
              >
                <div className="border-b border-gray-700 px-5 py-4">
                  <h3 className="text-lg font-semibold text-gray-200">
                    New Project
                  </h3>
                </div>

                <div className="p-5">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Project Name
                  </label>
                  <input
                    key={`input-${modalKey}`}
                    type="text"
                    className="w-full px-3 py-2 border border-gray-600 rounded-md 
              bg-gray-700 text-gray-100
              focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    value={newPageName}
                    onChange={(e) => setNewPageName(e.target.value)}
                    placeholder="Enter project name"
                    autoFocus
                  />
                </div>

                <div className="bg-gray-900 px-5 py-4 flex justify-end gap-3">
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 bg-gray-700 border border-gray-600
              text-gray-200 rounded-md hover:bg-gray-600 
              focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (!newPageName.trim()) {
                        alert("Please enter a project name");
                        return;
                      }
                      handleNewPageSubmit();
                    }}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700
              focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                  >
                    Create Project
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
