import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
} from "react";
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
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

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
  const [editorWidth, setEditorWidth] = useState(35); // Editor width as percentage
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
    return ({ pageId, removePage, newPageName }) => {
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

      const [breadboardRailConnections, setBreadboardRailConnections] =
        useState({
          "top-red": null,
          "top-blue": null,
          "bottom-red": null,
          "bottom-blue": null,
        });

      // Track which Arduino pins are connected to which breadboard columns
      const [breadboardColumnConnections, setBreadboardColumnConnections] =
        useState({});

      // Add dedicated function to update rail connections
      const updateBreadboardRailConnections = useCallback(() => {
        console.log("Updating breadboard rail connections...");
        const breadboardNode = nodes.find(
          (n) => n.data.component.type.name === "Breadboard"
        );
        const arduinoNode = nodes.find(
          (n) => n.data.component.type.name === "ArduinoUnoR3"
        );
        const resistors = nodes.filter(
          (n) => n.data.component.type.name === "Resistor"
        );
        
        // Skip if key components are missing
        if (!breadboardNode || !arduinoNode) return;
        
        // Create a new object for rail connections
        const newRailConnections = {
          "top-red": null,
          "top-blue": null,
          "bottom-red": null,
          "bottom-blue": null,
        };
        
        // FIRST: Check direct Arduino to breadboard rail connections
        edges.forEach(edge => {
          if ((edge.source === arduinoNode.id && edge.target === breadboardNode.id) ||
              (edge.source === breadboardNode.id && edge.target === arduinoNode.id)) {
              
            const breadboardHandle = edge.source === breadboardNode.id ? 
              edge.sourceHandle : edge.targetHandle;
            const arduinoHandle = edge.source === arduinoNode.id ? 
              edge.sourceHandle : edge.targetHandle;
              
            if (breadboardHandle?.includes("rail")) {
              if (breadboardHandle.includes("top-red") && arduinoHandle.includes("digital")) {
                const pinMatch = arduinoHandle.match(/\d+/);
                if (pinMatch) {
                  newRailConnections["top-red"] = parseInt(pinMatch[0]);
                  console.log(`Direct rail connection: top-red to pin ${newRailConnections["top-red"]}`);
                }
              } else if (breadboardHandle.includes("bottom-red") && arduinoHandle.includes("digital")) {
                const pinMatch = arduinoHandle.match(/\d+/);
                if (pinMatch) {
                  newRailConnections["bottom-red"] = parseInt(pinMatch[0]);
                  console.log(`Direct rail connection: bottom-red to pin ${newRailConnections["bottom-red"]}`);
                }
              } else if (breadboardHandle.includes("top-blue") && arduinoHandle.includes("GND")) {
                newRailConnections["top-blue"] = "GND";
              } else if (breadboardHandle.includes("bottom-blue") && arduinoHandle.includes("GND")) {
                newRailConnections["bottom-blue"] = "GND";
              }
            }
          }
        });
        
        // SECOND: Check Arduino -> resistor -> rail connections
        resistors.forEach(resistor => {
          const resistorConnections = edges.filter(edge => 
            edge.source === resistor.id || edge.target === resistor.id);
          
          // Find connection to Arduino
          const arduinoConnection = resistorConnections.find(edge => {
            const otherNodeId = edge.source === resistor.id ? edge.target : edge.source;
            return otherNodeId === arduinoNode.id;
          });
          
          if (arduinoConnection) {
            const arduinoHandle = arduinoConnection.source === arduinoNode.id ? 
              arduinoConnection.sourceHandle : arduinoConnection.targetHandle;
              
            if (arduinoHandle.includes("digital")) {
              const pinMatch = arduinoHandle.match(/\d+/);
              if (pinMatch) {
                const pinNumber = parseInt(pinMatch[0]);
                
                // Find breadboard connection for this resistor
                resistorConnections.forEach(edge => {
                  const otherNodeId = edge.source === resistor.id ? edge.target : edge.source;
                  const otherNode = nodes.find(n => n.id === otherNodeId);
                  
                  if (otherNode?.data.component.type.name === "Breadboard") {
                    const handle = edge.source === otherNodeId ? 
                      edge.sourceHandle : edge.targetHandle;
                      
                    if (handle?.includes("rail")) {
                      if (handle.includes("top-red")) {
                        newRailConnections["top-red"] = pinNumber;
                        console.log(`Arduino -> resistor -> top-red rail: pin ${pinNumber}`);
                      } else if (handle.includes("bottom-red")) {
                        newRailConnections["bottom-red"] = pinNumber;
                        console.log(`Arduino -> resistor -> bottom-red rail: pin ${pinNumber}`);
                      }
                    }
                  }
                });
              }
            }
          }
        });
        
        // THIRD: Check complex paths: Arduino -> breadboard -> resistor -> rail
        resistors.forEach(resistor => {
          // Get all connections for this resistor
          const resistorConns = edges.filter(edge => 
            edge.source === resistor.id || edge.target === resistor.id);
            
          // Find connection to any rail
          const railConn = resistorConns.find(edge => {
            const breadboardId = edge.source === resistor.id ? edge.target : edge.source;
            if (breadboardId === breadboardNode.id) {
              const handle = edge.source === breadboardId ? 
                edge.sourceHandle : edge.targetHandle;
              return handle?.includes("rail");
            }
            return false;
          });
          
          // Find connection to main breadboard (not rail)
          const mainBreadboardConn = resistorConns.find(edge => {
            const breadboardId = edge.source === resistor.id ? edge.target : edge.source;
            if (breadboardId === breadboardNode.id) {
              const handle = edge.source === breadboardId ? 
                edge.sourceHandle : edge.targetHandle;
              return handle?.includes("main-hole");
            }
            return false;
          });
          
          if (railConn && mainBreadboardConn) {
            const railHandle = railConn.source === breadboardNode.id ? 
              railConn.sourceHandle : railConn.targetHandle;
              
            const mainHandle = mainBreadboardConn.source === breadboardNode.id ? 
              mainBreadboardConn.sourceHandle : mainBreadboardConn.targetHandle;
              
            if (mainHandle) {
              const mainColMatch = mainHandle.match(/main-hole-\d+-(\d+)/);
              
              if (mainColMatch) {
                const column = parseInt(mainColMatch[1]);
                
                // Find Arduino connection to this column
                const arduinoToBreadboard = edges.find(edge => {
                  if ((edge.source === arduinoNode.id && edge.target === breadboardNode.id) ||
                      (edge.source === breadboardNode.id && edge.target === arduinoNode.id)) {
                      
                    const bbHandle = edge.source === breadboardNode.id ? 
                      edge.sourceHandle : edge.targetHandle;
                      
                    if (bbHandle?.includes("main-hole")) {
                      const bbColMatch = bbHandle.match(/main-hole-\d+-(\d+)/);
                      return bbColMatch && parseInt(bbColMatch[1]) === column;
                    }
                  }
                  return false;
                });
                
                if (arduinoToBreadboard) {
                  const arduinoHandle = arduinoToBreadboard.source === arduinoNode.id ? 
                    arduinoToBreadboard.sourceHandle : arduinoToBreadboard.targetHandle;
                    
                  if (arduinoHandle?.includes("digital")) {
                    const pinMatch = arduinoHandle.match(/\d+/);
                    if (pinMatch) {
                      const pin = parseInt(pinMatch[0]);
                      
                      if (railHandle?.includes("top-red")) {
                        newRailConnections["top-red"] = pin;
                        console.log(`Complex path found: Arduino -> breadboard -> resistor -> top-red rail: pin ${pin}`);
                      } else if (railHandle?.includes("bottom-red")) {
                        newRailConnections["bottom-red"] = pin;
                        console.log(`Complex path found: Arduino -> breadboard -> resistor -> bottom-red rail: pin ${pin}`);
                      }
                    }
                  }
                }
              }
            }
          }
        });
        
        // Update the state with new rail connections
        setBreadboardRailConnections(prev => {
          if (JSON.stringify(prev) !== JSON.stringify(newRailConnections)) {
            console.log("Updating rail connections:", newRailConnections);
            return newRailConnections;
          }
          return prev;
        });
      }, [nodes, edges]);

      // Function to update the breadboard column to Arduino pin mapping
      const updateBreadboardColumnConnections = useCallback(() => {
        const newColumnConnections = {};
        const breadboardNode = nodes.find(
          (n) => n.data.component.type.name === "Breadboard"
        );
        const arduinoNode = nodes.find(
          (n) => n.data.component.type.name === "ArduinoUnoR3"
        );

        if (!breadboardNode || !arduinoNode) return;

        // Add diagnostics for all components and their connections
        console.log("DIAGNOSTICS: Component Connection Check", {
          nodes: nodes.map((n) => ({
            id: n.id,
            type: n.data.component.type.name,
          })),
          breadboardColumnConnections: { ...breadboardColumnConnections },
        });

        // Find all direct connections between Arduino and breadboard
        const breadboardToArduinoEdges = edges.filter(
          (edge) =>
            (edge.source === breadboardNode.id &&
              edge.target === arduinoNode.id) ||
            (edge.source === arduinoNode.id &&
              edge.target === breadboardNode.id)
        );

        breadboardToArduinoEdges.forEach((edge) => {
          const breadboardHandle =
            edge.source === breadboardNode.id
              ? edge.sourceHandle
              : edge.targetHandle;
          const arduinoHandle =
            edge.source === arduinoNode.id
              ? edge.sourceHandle
              : edge.targetHandle;

          // Only process main hole connections (not rails)
          if (breadboardHandle && breadboardHandle.includes("main-hole")) {
            // Extract column number from breadboard handle
            const colMatch = breadboardHandle.match(/main-hole-\d+-(\d+)/);
            if (colMatch) {
              const columnIndex = parseInt(colMatch[1]);

              // Extract pin number from Arduino handle
              if (
                arduinoHandle.includes("digital") ||
                arduinoHandle.includes("analog")
              ) {
                const pinMatch = arduinoHandle.match(/\d+/);
                const pinNumber = pinMatch ? parseInt(pinMatch[0]) : null;

                if (pinNumber !== null) {
                  console.log(
                    `Mapping breadboard column ${columnIndex} to Arduino pin ${pinNumber}`
                  );
                  newColumnConnections[columnIndex] = {
                    pin: pinNumber,
                    type: arduinoHandle.includes("digital")
                      ? "digital"
                      : "analog",
                  };
                }
              }
            }
          }
        });

        // Find connections through resistors
        const resistors = nodes.filter(
          (n) => n.data.component.type.name === "Resistor"
        );

        // Log all resistors found
        console.log(
          `RESISTOR-PIN-TRACE: Found ${resistors.length} resistors`,
          resistors.map((r) => r.id)
        );

        // For each resistor, check if it connects Arduino to breadboard
        resistors.forEach((resistor) => {
          // Get all connections to this resistor
          const resistorConnections = edges.filter(
            (edge) => edge.source === resistor.id || edge.target === resistor.id
          );

          console.log(
            `RESISTOR-PIN-TRACE: Resistor ${resistor.id} has ${resistorConnections.length} connections`
          );

          // Find Arduino connection
          const resistorToArduino = resistorConnections.find(
            (edge) =>
              (edge.source === resistor.id && edge.target === arduinoNode.id) ||
              (edge.source === arduinoNode.id && edge.target === resistor.id)
          );

          // Find breadboard connection
          const resistorToBreadboard = resistorConnections.find(
            (edge) =>
              (edge.source === resistor.id &&
                edge.target === breadboardNode.id) ||
              (edge.source === breadboardNode.id && edge.target === resistor.id)
          );

          // Log connection status
          console.log(
            `RESISTOR-PIN-TRACE: Connection status for ${resistor.id}:`,
            {
              hasArduinoConnection: Boolean(resistorToArduino),
              hasBreadboardConnection: Boolean(resistorToBreadboard),
            }
          );

          // If resistor connects both Arduino and breadboard
          if (resistorToArduino && resistorToBreadboard) {
            console.log(
              `CRITICAL PATH: Found resistor ${resistor.id} connecting Arduino to breadboard`
            );

            // Get Arduino pin number
            const arduinoHandle =
              resistorToArduino.source === arduinoNode.id
                ? resistorToArduino.sourceHandle
                : resistorToArduino.targetHandle;

            // Get breadboard column
            const breadboardHandle =
              resistorToBreadboard.source === breadboardNode.id
                ? resistorToBreadboard.sourceHandle
                : resistorToBreadboard.targetHandle;

            console.log(
              `CRITICAL PATH: Resistor-Arduino-Breadboard connection details:`,
              {
                arduinoHandle,
                breadboardHandle,
              }
            );

            // If Arduino handle is a digital/analog pin and not GND
            if (
              (arduinoHandle.includes("digital") ||
                arduinoHandle.includes("analog")) &&
              !arduinoHandle.includes("GND")
            ) {
              const pinMatch = arduinoHandle.match(/\d+/);
              const pinNumber = pinMatch ? parseInt(pinMatch[0]) : null;

              console.log(`CRITICAL PATH: Arduino pin detected: ${pinNumber}`);

              // If breadboard handle is a main hole (VERTICAL connection)
              if (
                breadboardHandle &&
                breadboardHandle.includes("main-hole") &&
                pinNumber !== null
              ) {
                // Extract column number
                const colMatch = breadboardHandle.match(/main-hole-\d+-(\d+)/);
                if (colMatch) {
                  const columnIndex = parseInt(colMatch[1]);
                  console.log(
                    `CRITICAL PATH: Mapping breadboard column ${columnIndex} to Arduino pin ${pinNumber} via resistor`
                  );

                  newColumnConnections[columnIndex] = {
                    pin: pinNumber,
                    type: arduinoHandle.includes("digital")
                      ? "digital"
                      : "analog",
                  };

                  // CORRECTED BEHAVIOR: Breadboard main holes are connected VERTICALLY in columns
                  // Extract the row information too
                  const rowColMatch = breadboardHandle.match(
                    /main-hole-(\d+)-(\d+)/
                  );
                  if (rowColMatch) {
                    const rowIndex = parseInt(rowColMatch[1]);
                    const colIndex = parseInt(rowColMatch[2]);
                    console.log(
                      `CRITICAL PATH: Resistor connects to breadboard at row ${rowIndex}, column ${colIndex}`
                    );

                    // CORRECTED BEHAVIOR: Do NOT map the entire row, only map the exact column
                    // Main breadboard holes are connected VERTICALLY in columns, not horizontally in rows
                    console.log(
                      `CRITICAL PATH: Only mapping column ${colIndex} to pin ${pinNumber} - breadboard main holes are only connected vertically`
                    );
                  }
                }
              }
              // If breadboard handle is a rail (HORIZONTAL connection)
              else if (
                breadboardHandle &&
                breadboardHandle.includes("rail") &&
                pinNumber !== null
              ) {
                // Rails are connected horizontally, so handle accordingly
                if (breadboardHandle.includes("top-red")) {
                  console.log(
                    `CRITICAL PATH: Mapping top-red rail to Arduino pin ${pinNumber} via resistor`
                  );
                  breadboardRailConnections["top-red"] = pinNumber;
                } else if (breadboardHandle.includes("bottom-red")) {
                  console.log(
                    `CRITICAL PATH: Mapping bottom-red rail to Arduino pin ${pinNumber} via resistor`
                  );
                  breadboardRailConnections["bottom-red"] = pinNumber;
                } else if (breadboardHandle.includes("top-blue")) {
                  console.log(
                    `CRITICAL PATH: Mapping top-blue rail to GND via resistor`
                  );
                  breadboardRailConnections["top-blue"] = "GND";
                } else if (breadboardHandle.includes("bottom-blue")) {
                  console.log(
                    `CRITICAL PATH: Mapping bottom-blue rail to GND via resistor`
                  );
                  breadboardRailConnections["bottom-blue"] = "GND";
                }
              }
            }
          }
        });

        // Update state with new mappings
        setBreadboardColumnConnections(newColumnConnections);
        // CRITICAL FIX: Update the rail connections state too
        setBreadboardRailConnections({...breadboardRailConnections});
        console.log("Updated breadboard rail connections:", breadboardRailConnections);
        console.log(
          "Updated breadboard column connections:",
          newColumnConnections
        );
      }, [nodes, edges]);

      // Run this effect whenever edges or nodes change
      useEffect(() => {
        updateBreadboardColumnConnections();
        // CRITICAL FIX: Also update rail connections when edges or nodes change
        updateBreadboardRailConnections();
      }, [edges, nodes, updateBreadboardColumnConnections, updateBreadboardRailConnections]);

      const onConnect = useCallback(
        (params) => {
          // Get the source and target nodes
          const sourceNode = nodes.find((node) => node.id === params.source);
          const targetNode = nodes.find((node) => node.id === params.target);

          if (sourceNode && targetNode) {
            // Get component types and handle names
            const sourceType = sourceNode.type;
            const targetType = targetNode.type;
            const sourceHandle = params.sourceHandle;
            const targetHandle = params.targetHandle;

            // Create a notification message
            let notificationMessage = `Connected ${sourceType} (${sourceHandle}) to ${targetType} (${targetHandle})`;

            // Add specific component notifications and validations
            if (
              (sourceType === "led" && targetType === "arduinoUno") ||
              (targetType === "led" && sourceType === "arduinoUno")
            ) {
              const led = sourceType === "led" ? sourceNode : targetNode;
              const arduino =
                sourceType === "arduinoUno" ? sourceNode : targetNode;
              const pin =
                sourceType === "arduinoUno" ? sourceHandle : targetHandle;
              notificationMessage = `LED ${
                sourceType === "led" ? sourceHandle : targetHandle
              } connected to Arduino Uno ${pin}`;
              toast.info(notificationMessage, {
                icon: "💡",
              });
            } else if (sourceType === "resistor" || targetType === "resistor") {
              const resistor =
                sourceType === "resistor" ? sourceNode : targetNode;
              const otherComponent =
                sourceType === "resistor" ? targetNode : sourceNode;
              notificationMessage = `Resistor ${
                sourceType === "resistor" ? sourceHandle : targetHandle
              } connected to ${otherComponent.type} ${
                sourceType === "resistor" ? targetHandle : sourceHandle
              }`;
              toast.info(notificationMessage, {
                icon: "⚡",
              });
            } else if (
              sourceType === "breadboard" ||
              targetType === "breadboard"
            ) {
              const breadboard =
                sourceType === "breadboard" ? sourceNode : targetNode;
              const otherComponent =
                sourceType === "breadboard" ? targetNode : sourceNode;
              const breadboardHandle =
                sourceType === "breadboard" ? sourceHandle : targetHandle;
              const otherHandle =
                sourceType === "breadboard" ? targetHandle : sourceHandle;

              // Validate breadboard connections
              if (breadboardHandle.includes("power")) {
                // Power rail connections
                if (otherComponent.type === "arduinoUno") {
                  if (
                    breadboardHandle.includes("red") &&
                    otherHandle.includes("5V")
                  ) {
                    notificationMessage = `Breadboard power rail (+) connected to Arduino 5V`;
                    toast.success(notificationMessage, { icon: "🔌" });
                  } else if (
                    breadboardHandle.includes("blue") &&
                    otherHandle.includes("GND")
                  ) {
                    notificationMessage = `Breadboard ground rail (-) connected to Arduino GND`;
                    toast.success(notificationMessage, { icon: "🔌" });
                  } else {
                    toast.error(
                      "Invalid power connection! Connect red rail to 5V and blue rail to GND",
                      { icon: "⚠️" }
                    );
                    return;
                  }
                } else {
                  toast.error(
                    "Power rails can only be connected to Arduino power pins",
                    { icon: "⚠️" }
                  );
                  return;
                }
              } else if (breadboardHandle.includes("main")) {
                // Main breadboard area connections
                if (
                  otherComponent.type === "led" ||
                  otherComponent.type === "resistor"
                ) {
                  // Check if this component is connected to Arduino through breadboard
                  const existingEdges = edges.filter(
                    (edge) =>
                      (edge.source === otherComponent.id ||
                        edge.target === otherComponent.id) &&
                      (edge.source === breadboard.id ||
                        edge.target === breadboard.id)
                  );

                  // Find Arduino connection through breadboard
                  const arduinoConnection = edges.find(
                    (edge) =>
                      (edge.source === breadboard.id ||
                        edge.target === breadboard.id) &&
                      (edge.source ===
                        nodes.find((n) => n.type === "arduinoUno")?.id ||
                        edge.target ===
                          nodes.find((n) => n.type === "arduinoUno")?.id)
                  );

                  if (arduinoConnection) {
                    const arduinoNode = nodes.find(
                      (n) =>
                        n.id === arduinoConnection.source ||
                        n.id === arduinoConnection.target
                    );
                    const arduinoPin =
                      arduinoConnection.source === arduinoNode.id
                        ? arduinoConnection.sourceHandle
                        : arduinoConnection.targetHandle;

                    if (
                      arduinoPin.includes("digital") ||
                      arduinoPin.includes("analog")
                    ) {
                      notificationMessage = `Component connected to Arduino ${arduinoPin} through breadboard`;
                      toast.info(notificationMessage, { icon: "🔌" });
                    }
                  } else {
                    notificationMessage = `Component connected to breadboard at ${breadboardHandle}`;
                    toast.info(notificationMessage, { icon: "🔌" });
                  }
                } else if (otherComponent.type === "arduinoUno") {
                  if (
                    otherHandle.includes("digital") ||
                    otherHandle.includes("analog")
                  ) {
                    notificationMessage = `Arduino pin ${otherHandle} connected to breadboard`;
                    toast.info(notificationMessage, { icon: "🔌" });
                  } else {
                    toast.error(
                      "Invalid connection! Only digital/analog pins can connect to main breadboard area",
                      { icon: "⚠️" }
                    );
                    return;
                  }
                } else {
                  toast.error(
                    "Invalid connection! Main breadboard area can only connect to components or Arduino pins",
                    { icon: "⚠️" }
                  );
                  return;
                }
              } else {
                toast.error("Invalid breadboard connection!", { icon: "⚠️" });
                return;
              }
            } else {
              toast.info(notificationMessage, {
                icon: "🔗",
              });
            }
            
            // Add validation for complex circuit paths
            // This handles the case: Arduino -> breadboard -> resistor -> breadboard -> LED
            if ((sourceType === "led" && targetType === "breadboard") || 
                (sourceType === "breadboard" && targetType === "led")) {
              
              const led = sourceType === "led" ? sourceNode : targetNode;
              const breadboard = sourceType === "breadboard" ? sourceNode : targetNode;
              const ledHandle = sourceType === "led" ? sourceHandle : targetHandle;
              
              // Check if this is an anode connection
              if (ledHandle === "anode-source" || ledHandle === "anode-target") {
                console.log("LED anode connected to breadboard, checking for valid circuit path");
                
                // 1. Find resistors connected to the breadboard
                const resistorsToBreadboard = edges.filter(edge => {
                  const edgeSource = nodes.find(n => n.id === edge.source);
                  const edgeTarget = nodes.find(n => n.id === edge.target);
                  
                  return (edgeSource && edgeSource.type === "resistor" && edgeTarget && edgeTarget.type === "breadboard") ||
                         (edgeSource && edgeSource.type === "breadboard" && edgeTarget && edgeTarget.type === "resistor");
                });
                
                if (resistorsToBreadboard.length > 0) {
                  console.log(`Found ${resistorsToBreadboard.length} resistors connected to breadboard`);
                  
                  // 2. Find Arduino connections to breadboard
                  const arduinoToBreadboard = edges.filter(edge => {
                    const edgeSource = nodes.find(n => n.id === edge.source);
                    const edgeTarget = nodes.find(n => n.id === edge.target);
                    
                    return (edgeSource && edgeSource.type === "arduinoUno" && edgeTarget && edgeTarget.type === "breadboard") ||
                           (edgeSource && edgeSource.type === "breadboard" && edgeTarget && edgeTarget.type === "arduinoUno");
                  });
                  
                  if (arduinoToBreadboard.length > 0) {
                    console.log("Complete circuit path found: Arduino -> breadboard -> resistor -> breadboard -> LED");
                    toast.success("Valid circuit path detected! Arduino -> breadboard -> resistor -> LED", {
                      icon: "✅",
                    });
                  }
                }
              }
            }
          }

          // Create the edge connection
          setEdges((eds) => addEdge(params, eds));

          // Update column mappings whenever a new connection is made
          setTimeout(() => {
            updateBreadboardColumnConnections();
          }, 0);
        },
        [nodes, edges, updateBreadboardColumnConnections]
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

      const addNode = (
        Component,
        width,
        height,
        pos,
        initialData = {},
        shouldBlink = false
      ) => {
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
                style={{ pointerEvents: "all" }}
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

      const [successNotificationShown, setSuccessNotificationShown] = useState(
        {}
      );

      useEffect(() => {
        console.log("Pin state updated in MemoizedPage:", pinState);
        console.log("Pin state version:", pinStateVersion);

        // First, identify breadboard power rail connections to Arduino pins
        const breadboardNode = nodes.find(
          (n) => n.data.component.type.name === "Breadboard"
        );
        const arduinoNode = nodes.find(
          (n) => n.data.component.type.name === "ArduinoUnoR3"
        );

        // CRITICAL FIX: Remove local breadboardRailConnections object 
        // and use the state variable instead
        
        // If both breadboard and Arduino exist, check for connections between them
        if (breadboardNode && arduinoNode) {
          // Find all connections between Arduino and breadboard
          const breadboardToArduinoEdges = edges.filter(
            (edge) =>
              (edge.source === breadboardNode.id &&
                edge.target === arduinoNode.id) ||
              (edge.source === arduinoNode.id &&
                edge.target === breadboardNode.id)
          );

          // Map connections to determine which rails are connected to which Arduino pins
          breadboardToArduinoEdges.forEach((edge) => {
            const breadboardHandle =
              edge.source === breadboardNode.id
                ? edge.sourceHandle
                : edge.targetHandle;
            const arduinoHandle =
              edge.source === arduinoNode.id
                ? edge.sourceHandle
                : edge.targetHandle;

            // Extract pin number from Arduino handle
            const pinMatch = arduinoHandle.match(/\d+/);
            const pinNumber = pinMatch ? parseInt(pinMatch[0]) : null;

            // Determine which rail is connected based on the handle ID
            if (breadboardHandle?.includes("rail")) {
              // Identify which rail is connected
              if (
                breadboardHandle.includes("top") &&
                breadboardHandle.includes("red")
              ) {
                // Update the state object directly
                setBreadboardRailConnections(prev => ({
                  ...prev,
                  "top-red": pinNumber
                }));
              } else if (
                breadboardHandle.includes("top") &&
                breadboardHandle.includes("blue")
              ) {
                // For blue rail, check if it's connected to any GND pin
                if (arduinoHandle.includes("GND")) {
                  setBreadboardRailConnections(prev => ({
                    ...prev,
                    "top-blue": "GND"
                  }));
                }
              } else if (
                breadboardHandle.includes("bottom") &&
                breadboardHandle.includes("red")
              ) {
                setBreadboardRailConnections(prev => ({
                  ...prev,
                  "bottom-red": pinNumber
                }));
              } else if (
                breadboardHandle.includes("bottom") &&
                breadboardHandle.includes("blue")
              ) {
                // For blue rail, check if it's connected to any GND pin
                if (arduinoHandle.includes("GND")) {
                  setBreadboardRailConnections(prev => ({
                    ...prev,
                    "bottom-blue": "GND"
                  }));
                }
              }
            }
          });
        }

        console.log("Breadboard rail connections:", breadboardRailConnections);

        setNodes((nds) =>
          nds.map((node) => {
            if (node.data.component.type.name === "LED") {
              const arduinoNode = nodes.find(
                (n) => n.data.component.type.name === "ArduinoUnoR3"
              );
              const resistors = nodes.filter(
                (n) => n.data.component.type.name === "Resistor"
              );
              const breadboardNode = nodes.find(
                (n) => n.data.component.type.name === "Breadboard"
              );

              // Find all connections for this LED
              const ledConnections = edges.filter(
                (edge) => edge.source === node.id || edge.target === node.id
              );

              // Find resistor connection
              const connectedResistor = resistors.find((resistor) => {
                // Check for direct LED-resistor connections
                const directConnection = ledConnections.some(
                  (edge) =>
                    (edge.source === node.id &&
                      edge.target === resistor.id &&
                      edge.sourceHandle === "anode-source" &&
                      (edge.targetHandle === "left-target" ||
                        edge.targetHandle === "right-target")) ||
                    (edge.source === resistor.id &&
                      edge.target === node.id &&
                      (edge.sourceHandle === "left-source" ||
                        edge.sourceHandle === "right-source") &&
                      edge.targetHandle === "anode-target")
                );

                // If direct connection exists, return immediately
                if (directConnection) {
                  console.log(
                    `LED ${node.id} has direct connection to resistor ${resistor.id}`
                  );
                  return true;
                }

                // Check for connections through the same breadboard hole
                if (breadboardNode) {
                  // Find LED anode connection to breadboard
                  const ledAnodeToBreadboard = edges.find(
                    (edge) =>
                      (edge.source === node.id &&
                        edge.target === breadboardNode.id &&
                        edge.sourceHandle === "anode-source") ||
                      (edge.source === breadboardNode.id &&
                        edge.target === node.id &&
                        edge.targetHandle === "anode-target")
                  );

                  // Find resistor connections to breadboard
                  const resistorToBreadboard = edges.filter(
                    (edge) =>
                      (edge.source === resistor.id &&
                        edge.target === breadboardNode.id) ||
                      (edge.source === breadboardNode.id &&
                        edge.target === resistor.id)
                  );

                  // Find resistor connections to Arduino (important for checking full path)
                  const resistorToArduino = edges.find(
                    (edge) =>
                      (edge.source === resistor.id &&
                        edge.target === arduinoNode?.id) ||
                      (edge.source === arduinoNode?.id &&
                        edge.target === resistor.id)
                  );

                  // If both LED anode and resistor are connected to breadboard
                  if (ledAnodeToBreadboard && resistorToBreadboard.length > 0) {
                    // Get LED breadboard connection handle
                    const ledBreadboardHandle =
                      ledAnodeToBreadboard.source === breadboardNode.id
                        ? ledAnodeToBreadboard.sourceHandle
                        : ledAnodeToBreadboard.targetHandle;

                    console.log(
                      `LED ${node.id} breadboard connection handle: ${ledBreadboardHandle}`
                    );

                    // FIRST: Check for connections to rails (which are connected horizontally)
                    if (
                      ledBreadboardHandle &&
                      ledBreadboardHandle.includes("rail")
                    ) {
                      // Rails are connected horizontally, so we need to check if resistor is on the same rail
                      for (const resistorConn of resistorToBreadboard) {
                        const resistorBreadboardHandle =
                          resistorConn.source === breadboardNode.id
                            ? resistorConn.sourceHandle
                            : resistorConn.targetHandle;

                        // If both are connected to the same rail type
                        if (
                          resistorBreadboardHandle &&
                          resistorBreadboardHandle.includes("rail")
                        ) {
                          // Check rail section matches (top-red, top-blue, bottom-red, bottom-blue)
                          if (
                            (ledBreadboardHandle.includes("top-red") &&
                              resistorBreadboardHandle.includes("top-red")) ||
                            (ledBreadboardHandle.includes("top-blue") &&
                              resistorBreadboardHandle.includes("top-blue")) ||
                            (ledBreadboardHandle.includes("bottom-red") &&
                              resistorBreadboardHandle.includes(
                                "bottom-red"
                              )) ||
                            (ledBreadboardHandle.includes("bottom-blue") &&
                              resistorBreadboardHandle.includes("bottom-blue"))
                          ) {
                            console.log(
                              `LED ${node.id} and resistor ${resistor.id} connected through same breadboard rail`
                            );
                            return true;
                          }
                        }
                      }
                    }
                    // SECOND: Check for connections in the main area (middle holes - connected VERTICALLY by column)
                    else if (
                      ledBreadboardHandle &&
                      ledBreadboardHandle.includes("main-hole")
                    ) {
                      // Extract column from LED handle
                      const ledRowColMatch = ledBreadboardHandle.match(
                        /main-hole-(\d+)-(\d+)/
                      );

                      if (ledRowColMatch) {
                        const ledRow = parseInt(ledRowColMatch[1]);
                        const ledCol = parseInt(ledRowColMatch[2]);

                        console.log(
                          `LED anode connected to breadboard at row ${ledRow}, col ${ledCol}`
                        );

                        // Check each resistor-breadboard connection
                        for (const resistorConn of resistorToBreadboard) {
                          const resistorBreadboardHandle =
                            resistorConn.source === breadboardNode.id
                              ? resistorConn.sourceHandle
                              : resistorConn.targetHandle;

                          // Check if resistor is connected to main hole (not rail)
                          if (
                            resistorBreadboardHandle &&
                            resistorBreadboardHandle.includes("main-hole")
                          ) {
                            const resistorRowColMatch =
                              resistorBreadboardHandle.match(
                                /main-hole-(\d+)-(\d+)/
                              );

                            if (resistorRowColMatch) {
                              const resistorRow = parseInt(
                                resistorRowColMatch[1]
                              );
                              const resistorCol = parseInt(
                                resistorRowColMatch[2]
                              );

                              console.log(
                                `Resistor connected to breadboard at row ${resistorRow}, col ${resistorCol}`
                              );

                              // ENHANCED CIRCUIT PATH DETECTION
                              // Check if the resistor connects to Arduino directly or through breadboard
                              // This supports: Arduino -> breadboard -> resistor -> breadboard -> LED
                              const isConnectedToArduino = edges.some(edge => {
                                // Direct resistor to Arduino connection
                                if ((edge.source === resistor.id && edge.target === arduinoNode?.id) ||
                                    (edge.source === arduinoNode?.id && edge.target === resistor.id)) {
                                  return true;
                                }
                                
                                // Resistor to breadboard to Arduino connection
                                if (edge.source === resistor.id || edge.target === resistor.id) {
                                  const otherNodeId = edge.source === resistor.id ? edge.target : edge.source;
                                  const otherNode = nodes.find(n => n.id === otherNodeId);
                                          
                                  if (otherNode?.type === "breadboard") {
                                    // Check if this breadboard is connected to Arduino
                                    return edges.some(e => 
                                      (e.source === otherNodeId && e.target === arduinoNode?.id) ||
                                      (e.source === arduinoNode?.id && e.target === otherNodeId)
                                    );
                                  }
                                }
                                return false;
                              });
                              
                              if (isConnectedToArduino) {
                                console.log("ENHANCED PATH DETECTED: Arduino -> breadboard -> resistor -> breadboard -> LED");
                                
                                // Find the Arduino pin through any path
                                const arduinoPin = edges.find(edge => {
                                  if (edge.source === arduinoNode?.id || edge.target === arduinoNode?.id) {
                                    const handle = edge.source === arduinoNode?.id ? edge.sourceHandle : edge.targetHandle;
                                    return handle.includes("digital") && !handle.includes("GND");
                                  }
                                  return false;
                                });
                                        
                                if (arduinoPin) {
                                  const pinHandle = arduinoPin.source === arduinoNode?.id ? 
                                    arduinoPin.sourceHandle : arduinoPin.targetHandle;
                                            
                                  const extractedPin = parseInt(pinHandle.match(/\d+/)?.[0]);
                                  if (!isNaN(extractedPin)) {
                                    pinNumber = extractedPin;
                                    console.log(`ENHANCED PATH: Set pin number to ${pinNumber} from complex path`);
                                  }
                                }
                              }

                              // Existing column connection check  
                              // =========== CRITICAL CHECK ============
                              // Check if the resistor connects to Arduino (needed for the full circuit)
                              // This is VERY important for the Arduino -> Resistor -> Breadboard -> LED path
                              if (resistorToArduino) {
                                console.log(
                                  `Resistor ${resistor.id} also connected to Arduino - checking for full path`
                                );

                                // Check if Arduino handle is a digital pin
                                const arduinoHandle =
                                  resistorToArduino.source === arduinoNode.id
                                    ? resistorToArduino.sourceHandle
                                    : resistorToArduino.targetHandle;

                                if (
                                  arduinoHandle &&
                                  arduinoHandle.includes("digital")
                                ) {
                                  // This is a valid Arduino -> Resistor -> Breadboard -> LED path
                                  console.log(
                                    `FULL PATH DETECTED: Arduino -> Resistor -> Breadboard -> LED`
                                  );

                                  // Check for same COLUMN (vertical) connection or exact same hole
                                  if (ledCol === resistorCol) {
                                    console.log(
                                      `LED ${node.id} and resistor ${resistor.id} connected through same breadboard COLUMN ${ledCol}`
                                    );
                                    return true;
                                  }
                                }
                              }

                              // Check for same COLUMN (vertical) connection - CORRECTED BREADBOARD BEHAVIOR
                              if (ledCol === resistorCol) {
                                console.log(
                                  `LED ${node.id} and resistor ${resistor.id} connected through same breadboard COLUMN ${ledCol}`
                                );
                                return true;
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }

                // No connection found
                return false;
              });

              // Find resistor connections for debugging
              const ledToResistorConnection = connectedResistor
                ? ledConnections.find(
                    (edge) =>
                      (edge.source === node.id &&
                        edge.target === connectedResistor.id) ||
                      (edge.source === connectedResistor.id &&
                        edge.target === node.id)
                  )
                : null;

              console.log(`LED ${node.id} resistor connection:`, {
                hasResistor: Boolean(connectedResistor),
                resistorId: connectedResistor?.id,
                connection: ledToResistorConnection,
              });

              // Find breadboard connection if exists
              const breadboardConnection = ledConnections.find((edge) => {
                const otherNode =
                  edge.source === node.id
                    ? nodes.find((n) => n.id === edge.target)
                    : nodes.find((n) => n.id === edge.source);
                return otherNode?.data.component.type.name === "Breadboard";
              });
              
              // Find Arduino connection through breadboard or resistor
              let pinNumber = undefined;
              
              // Track which connections we've processed for debugging
              const connectionPath = [];
              
              // ADD ENHANCED CIRCUIT PATH DETECTION 
              // This detects Arduino -> Breadboard -> Resistor -> Breadboard -> LED connections
              // where the LED and resistor aren't directly connected but both connect to breadboard
              if (breadboardConnection && !pinNumber && breadboardNode) {
                console.log("ENHANCED PATH DETECTION: Checking for complex circuit path from Arduino to LED");
                
                // Get breadboard handle that LED connects to
                const ledBreadboardHandle = 
                  breadboardConnection.source === breadboardNode.id
                    ? breadboardConnection.sourceHandle
                    : breadboardConnection.targetHandle;
                    
                // Only proceed if this is an anode connection
                const isAnodeConnection =
                  breadboardConnection.sourceHandle === "anode-source" ||
                  breadboardConnection.targetHandle === "anode-target";
                  
                if (isAnodeConnection) {
                  // 1. Find all resistors connected to breadboard
                  const allResistorsToBreadboard = edges.filter(edge => {
                    const sourceNode = nodes.find(n => n.id === edge.source);
                    const targetNode = nodes.find(n => n.id === edge.target);
                    return (sourceNode?.data.component.type.name === "Resistor" && targetNode?.id === breadboardNode.id) ||
                           (targetNode?.data.component.type.name === "Resistor" && sourceNode?.id === breadboardNode.id);
                  });
                  
                  if (allResistorsToBreadboard.length > 0) {
                    console.log(`Found ${allResistorsToBreadboard.length} resistors connected to breadboard`);
                    
                    // 2. Find any resistor connected to Arduino directly or through breadboard
                    for (const resistorEdge of allResistorsToBreadboard) {
                      const resistorId = resistorEdge.source === breadboardNode.id ? resistorEdge.target : resistorEdge.source;
                      const resistorNode = nodes.find(n => n.id === resistorId);
                      
                      if (resistorNode) {
                        // Check if this resistor connects to Arduino
                        const resistorToArduino = edges.find(edge => 
                          (edge.source === resistorId && edge.target === arduinoNode?.id) ||
                          (edge.source === arduinoNode?.id && edge.target === resistorId)
                        );
                        
                        if (resistorToArduino) {
                          const arduinoHandle = resistorToArduino.source === arduinoNode.id
                            ? resistorToArduino.sourceHandle
                            : resistorToArduino.targetHandle;
                            
                          // Only use digital pins
                          if (arduinoHandle.includes("digital") && !arduinoHandle.includes("GND")) {
                            pinNumber = parseInt(arduinoHandle.match(/\d+/)?.[0]);
                            console.log(`ENHANCED PATH COMPLETE: Arduino -> resistor -> breadboard -> LED pin ${pinNumber}`);
                            break;
                          }
                        }
                      }
                    }
                  }
                }
              }

              if (arduinoNode) {
                connectionPath.push("Checking direct Arduino connection");
                // First try direct connection
                const directArduinoConnection = ledConnections.find(
                  (edge) =>
                    (edge.source === arduinoNode.id &&
                      edge.target === node.id &&
                      edge.sourceHandle.includes("digital") &&
                      edge.targetHandle === "anode-target") ||
                    (edge.source === node.id &&
                      edge.target === arduinoNode.id &&
                      edge.targetHandle.includes("digital") &&
                      edge.sourceHandle === "anode-source")
                );

                if (directArduinoConnection) {
                  connectionPath.push("Found direct Arduino connection");
                  const arduinoHandle =
                    directArduinoConnection.source === arduinoNode.id
                      ? directArduinoConnection.sourceHandle
                      : directArduinoConnection.targetHandle;

                  // Only use digital pins, not GND pins
                  if (
                    arduinoHandle.includes("digital") &&
                    !arduinoHandle.includes("GND")
                  ) {
                    pinNumber = parseInt(arduinoHandle.match(/\d+/)?.[0]);
                    connectionPath.push(
                      `Set pin number to ${pinNumber} from direct Arduino connection`
                    );
                  }
                } else if (breadboardConnection) {
                  connectionPath.push("Checking breadboard connection");
                  // We need to figure out if this is an anode or cathode connection
                  const isAnodeConnection =
                    breadboardConnection.sourceHandle === "anode-source" ||
                    breadboardConnection.targetHandle === "anode-target";

                  const isCathodeConnection =
                    breadboardConnection.sourceHandle === "cathode-source" ||
                    breadboardConnection.targetHandle === "cathode-target";

                  connectionPath.push(
                    `Breadboard connection - isAnode: ${isAnodeConnection}, isCathode: ${isCathodeConnection}`
                  );

                  // Get the breadboard handle for this connection
                  const breadboardHandle =
                    breadboardConnection.source === breadboardNode.id
                      ? breadboardConnection.sourceHandle
                      : breadboardConnection.targetHandle;

                  connectionPath.push(`Breadboard handle: ${breadboardHandle}`);

                  // Only set pin number from anode connections
                  if (isAnodeConnection) {
                    if (breadboardHandle?.includes("rail")) {
                      connectionPath.push("Anode connected to rail");
                      // Determine which rail this LED is connected to
                      if (
                        breadboardHandle.includes("top") &&
                        breadboardHandle.includes("red")
                      ) {
                        // CRITICAL FIX: Log and assign the pin number properly
                        pinNumber = breadboardRailConnections["top-red"];
                        console.log(`LED ${node.id} is connected to top red rail with Arduino pin ${pinNumber}`);
                        connectionPath.push(
                          `Set pin number to ${pinNumber} from top red rail`
                        );
                      } else if (
                        breadboardHandle.includes("bottom") &&
                        breadboardHandle.includes("red")
                      ) {
                        // CRITICAL FIX: Log and assign the pin number properly
                        pinNumber = breadboardRailConnections["bottom-red"];
                        console.log(`LED ${node.id} is connected to bottom red rail with Arduino pin ${pinNumber}`);
                        connectionPath.push(
                          `Set pin number to ${pinNumber} from bottom red rail`
                        );
                      }
                    } else if (breadboardHandle?.includes("main-hole")) {
                      // Extract column from breadboard handle for main holes
                      const colMatch =
                        breadboardHandle.match(/main-hole-\d+-(\d+)/);
                      if (colMatch) {
                        const columnIndex = parseInt(colMatch[1]);
                        connectionPath.push(
                          `Anode connected to breadboard column ${columnIndex}`
                        );

                        // Check if this column is directly connected to an Arduino pin
                        if (breadboardColumnConnections[columnIndex]) {
                          pinNumber =
                            breadboardColumnConnections[columnIndex].pin;
                          connectionPath.push(
                            `Set pin number to ${pinNumber} from column ${columnIndex} mapping`
                          );
                        } else {
                          // If not directly connected, check connections in this column
                          const mainAreaToArduino = edges.find((edge) => {
                            // Extract handle and check if it's in the same column
                            const handleToCheck =
                              edge.source === breadboardNode.id
                                ? edge.sourceHandle
                                : edge.targetHandle;

                            const sameColMatch =
                              handleToCheck?.match(/main-hole-\d+-(\d+)/);
                            const sameCol = sameColMatch
                              ? parseInt(sameColMatch[1]) === columnIndex
                              : false;

                            return (
                              sameCol &&
                              ((edge.source === breadboardNode.id &&
                                edge.target === arduinoNode.id) ||
                                (edge.source === arduinoNode.id &&
                                  edge.target === breadboardNode.id))
                            );
                          });

                          if (mainAreaToArduino) {
                            const arduinoHandle =
                              mainAreaToArduino.source === arduinoNode.id
                                ? mainAreaToArduino.sourceHandle
                                : mainAreaToArduino.targetHandle;

                            if (
                              arduinoHandle.includes("digital") &&
                              !arduinoHandle.includes("GND")
                            ) {
                              pinNumber = parseInt(
                                arduinoHandle.match(/\d+/)?.[0]
                              );
                              connectionPath.push(
                                `Set pin number to ${pinNumber} from column Arduino connection`
                              );
                            }
                          }
                        }
                      }
                    }
                  }
                } else if (connectedResistor) {
                  connectionPath.push("Checking resistor connection");
                  // Resistor could be connected to Arduino directly or through breadboard
                  const resistorConnections = edges.filter(
                    (edge) =>
                      edge.source === connectedResistor.id ||
                      edge.target === connectedResistor.id
                  );

                  connectionPath.push(
                    `Found ${resistorConnections.length} resistor connections`
                  );

                  // Check direct resistor to Arduino connection
                  const resistorToArduino = resistorConnections.find(
                    (edge) =>
                      (edge.source === connectedResistor.id &&
                        edge.target === arduinoNode.id) ||
                      (edge.source === arduinoNode.id &&
                        edge.target === connectedResistor.id)
                  );

                  if (resistorToArduino) {
                    connectionPath.push("Found resistor to Arduino connection");
                    const arduinoHandle =
                      resistorToArduino.source === arduinoNode.id
                        ? resistorToArduino.sourceHandle
                        : resistorToArduino.targetHandle;

                    // Only use digital pins, not GND pins
                    if (
                      arduinoHandle.includes("digital") &&
                      !arduinoHandle.includes("GND")
                    ) {
                      pinNumber = parseInt(arduinoHandle.match(/\d+/)?.[0]);
                      connectionPath.push(
                        `Set pin number to ${pinNumber} from resistor to Arduino`
                      );
                    }
                  } else {
                    connectionPath.push(
                      "Checking resistor to breadboard connection"
                    );
                    // Check resistor to breadboard connection
                    const resistorToBreadboard = resistorConnections.find(
                      (edge) =>
                        (edge.source === connectedResistor.id &&
                          edge.target === breadboardNode?.id) ||
                        (edge.source === breadboardNode?.id &&
                          edge.target === connectedResistor.id)
                    );

                    if (resistorToBreadboard && breadboardNode) {
                      connectionPath.push(
                        "Found resistor to breadboard connection"
                      );
                      const breadboardHandle =
                        resistorToBreadboard.source === breadboardNode.id
                          ? resistorToBreadboard.sourceHandle
                          : resistorToBreadboard.targetHandle;

                      connectionPath.push(
                        `Resistor to breadboard handle: ${breadboardHandle}`
                      );

                      // Check if resistor is connected to a breadboard rail
                      if (breadboardHandle?.includes("rail")) {
                        connectionPath.push("Resistor connected to a rail");
                        // Determine which rail this resistor is connected to
                        if (
                          breadboardHandle.includes("top") &&
                          breadboardHandle.includes("red")
                        ) {
                          pinNumber = breadboardRailConnections["top-red"];
                          connectionPath.push(
                            `Set pin number to ${pinNumber} from top red rail via resistor`
                          );
                          console.log(
                            "Setting pin from resistor-breadboard top red connection:",
                            pinNumber
                          );
                        } else if (
                          breadboardHandle.includes("top") &&
                          breadboardHandle.includes("blue")
                        ) {
                          // Don't set pin from blue rail (GND)
                          // But don't clear it either - pinNumber unchanged
                          connectionPath.push(
                            "Resistor connected to top blue rail - not setting pin number"
                          );
                        } else if (
                          breadboardHandle.includes("bottom") &&
                          breadboardHandle.includes("red")
                        ) {
                          pinNumber = breadboardRailConnections["bottom-red"];
                          connectionPath.push(
                            `Set pin number to ${pinNumber} from bottom red rail via resistor`
                          );
                          console.log(
                            "Setting pin from resistor-breadboard bottom red connection:",
                            pinNumber
                          );
                        } else if (
                          breadboardHandle.includes("bottom") &&
                          breadboardHandle.includes("blue")
                        ) {
                          // Don't set pin from blue rail (GND)
                          // But don't clear it either - pinNumber unchanged
                          connectionPath.push(
                            "Resistor connected to bottom blue rail - not setting pin number"
                          );
                        }
                      } else {
                        // Resistor connected to main area of breadboard
                        console.log(
                          "Resistor connected to main area of breadboard"
                        );

                        // Extract column from breadboard handle
                        const colMatch =
                          breadboardHandle.match(/main-hole-\d+-(\d+)/);
                        if (colMatch) {
                          const columnIndex = parseInt(colMatch[1]);
                          console.log(
                            `Resistor connected to breadboard column ${columnIndex}`
                          );

                          // Check if this column is connected to an Arduino pin
                          if (breadboardColumnConnections[columnIndex]) {
                            pinNumber =
                              breadboardColumnConnections[columnIndex].pin;
                            console.log(
                              `Using pin ${pinNumber} from column ${columnIndex} mapping`
                            );
                          } else {
                            // Follow connections through the main area to find Arduino pin
                            // For any hole in the same column
                            const sameColumnToArduino = edges.find((edge) => {
                              // Only consider breadboard-arduino connections
                              if (
                                !(
                                  (edge.source === breadboardNode.id &&
                                    edge.target === arduinoNode.id) ||
                                  (edge.source === arduinoNode.id &&
                                    edge.target === breadboardNode.id)
                                )
                              ) {
                                return false;
                              }

                              // Check if the breadboard handle is in the same column
                              const handleToCheck =
                                edge.source === breadboardNode.id
                                  ? edge.sourceHandle
                                  : edge.targetHandle;

                              if (
                                !handleToCheck ||
                                !handleToCheck.includes("main-hole")
                              ) {
                                return false;
                              }

                              const sameColMatch =
                                handleToCheck.match(/main-hole-\d+-(\d+)/);
                              return (
                                sameColMatch &&
                                parseInt(sameColMatch[1]) === columnIndex
                              );
                            });

                            if (sameColumnToArduino) {
                              const arduinoHandle =
                                sameColumnToArduino.source === arduinoNode.id
                                  ? sameColumnToArduino.sourceHandle
                                  : sameColumnToArduino.targetHandle;

                              if (
                                arduinoHandle.includes("digital") &&
                                !arduinoHandle.includes("GND")
                              ) {
                                pinNumber = parseInt(
                                  arduinoHandle.match(/\d+/)?.[0]
                                );
                                console.log(
                                  `Setting pin ${pinNumber} from column ${columnIndex} via Arduino connection`
                                );
                              }
                            } else {
                              // If no connection in the column, fall back to the original row-based logic
                              // Extract row and column from the breadboard handle
                              const rowColMatch = breadboardHandle.match(
                                /main-hole-(\d+)-(\d+)/
                              );
                              if (rowColMatch) {
                                const row = parseInt(rowColMatch[1]);

                                console.log(
                                  `Resistor connected to breadboard row ${row}, col ${columnIndex}`
                                );

                                // Find other connections in the same row
                                const sameRowConnections = edges.filter(
                                  (edge) => {
                                    const handleToCheck =
                                      edge.source === breadboardNode.id
                                        ? edge.sourceHandle
                                        : edge.targetHandle;

                                    return (
                                      handleToCheck &&
                                      handleToCheck.includes(
                                        `main-hole-${row}-`
                                      )
                                    );
                                  }
                                );

                                console.log(
                                  "Same row connections:",
                                  sameRowConnections
                                );

                                // Check if any of these connections lead to Arduino
                                for (const rowConn of sameRowConnections) {
                                  const otherNodeId =
                                    rowConn.source === breadboardNode.id
                                      ? rowConn.target
                                      : rowConn.source;

                                  if (otherNodeId === arduinoNode.id) {
                                    const arduinoHandle =
                                      rowConn.source === arduinoNode.id
                                        ? rowConn.sourceHandle
                                        : rowConn.targetHandle;

                                    if (
                                      arduinoHandle.includes("digital") &&
                                      !arduinoHandle.includes("GND")
                                    ) {
                                      pinNumber = parseInt(
                                        arduinoHandle.match(/\d+/)?.[0]
                                      );
                                      console.log(
                                        `LED ${node.id} - Set pin number to ${pinNumber} from same COLUMN connection - vertical connection`
                                      );
                                      break;
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }

              // Check if cathode is connected to GND
              let isCathodeConnectedToGND = Boolean(
                ledConnections.find(
                  (edge) =>
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

              console.log(`LED ${node.id} detailed connection info:`, {
                ledConnections,
                breadboardNode: Boolean(breadboardNode),
                breadboardRailConnections,
                resistors: Boolean(resistors.length),
                connectedResistor: Boolean(connectedResistor),
                pinNumberBeforeGND: pinNumber,
              });

              // Store the pin number determined before checking GND connections
              // This prevents breadboard GND connections from affecting pin assignments
              const pinNumberBeforeGNDCheck = pinNumber;

              // Cathode could also be connected to a blue rail (GND)
              if (!isCathodeConnectedToGND && breadboardNode) {
                const cathodeToBreadboard = ledConnections.find(
                  (edge) =>
                    (edge.source === node.id &&
                      edge.target === breadboardNode.id &&
                      edge.sourceHandle === "cathode-source") ||
                    (edge.source === breadboardNode.id &&
                      edge.target === node.id &&
                      edge.targetHandle === "cathode-target")
                );

                if (cathodeToBreadboard) {
                  const breadboardHandle =
                    cathodeToBreadboard.source === breadboardNode.id
                      ? cathodeToBreadboard.sourceHandle
                      : cathodeToBreadboard.targetHandle;

                  // Check if cathode is connected to a blue rail (GND)
                  if (breadboardHandle?.includes("blue")) {
                    // Check if this blue rail is connected to Arduino GND
                    const railConnectedToGND =
                      (breadboardHandle.includes("top") &&
                        breadboardRailConnections["top-blue"] === "GND") ||
                      (breadboardHandle.includes("bottom") &&
                        breadboardRailConnections["bottom-blue"] === "GND");

                    console.log(
                      `LED ${node.id} cathode-breadboard connection:`,
                      {
                        breadboardHandle,
                        railConnectedToGND,
                        breadboardRailConnections,
                      }
                    );

                    if (railConnectedToGND) {
                      isCathodeConnectedToGND = true;
                      // GND connections NEVER affect pin number
                    }
                  } else if (breadboardHandle?.includes("main-hole")) {
                    // Check if this is in a column connected to GND
                    const colMatch =
                      breadboardHandle.match(/main-hole-\d+-(\d+)/);
                    if (colMatch) {
                      const columnIndex = parseInt(colMatch[1]);
                      console.log(
                        `Cathode connected to breadboard column ${columnIndex}`
                      );

                      // Check if any hole in this column is connected to GND
                      const columnGNDConnection = edges.find((edge) => {
                        // Only consider breadboard-arduino connections
                        if (
                          !(
                            (edge.source === breadboardNode.id &&
                              edge.target === arduinoNode.id) ||
                            (edge.source === arduinoNode.id &&
                              edge.target === breadboardNode.id)
                          )
                        ) {
                          return false;
                        }

                        // Check if the breadboard handle is in the same column
                        const handleToCheck =
                          edge.source === breadboardNode.id
                            ? edge.sourceHandle
                            : edge.targetHandle;

                        if (
                          !handleToCheck ||
                          !handleToCheck.includes("main-hole")
                        ) {
                          return false;
                        }

                        const sameColMatch =
                          handleToCheck.match(/main-hole-\d+-(\d+)/);
                        const sameCol =
                          sameColMatch &&
                          parseInt(sameColMatch[1]) === columnIndex;

                        // Check if Arduino end is connected to GND
                        const arduinoHandle =
                          edge.source === arduinoNode.id
                            ? edge.sourceHandle
                            : edge.targetHandle;

                        return (
                          sameCol &&
                          arduinoHandle &&
                          arduinoHandle.includes("GND")
                        );
                      });

                      if (columnGNDConnection) {
                        console.log(
                          `Column ${columnIndex} is connected to GND - cathode connection valid`
                        );
                        isCathodeConnectedToGND = true;
                        // Column GND connections NEVER affect pin number
                      }
                    }
                  }
                }
              }

              // Additional trace logic for resistor-breadboard-LED connections
              if (
                pinNumber === undefined &&
                connectedResistor &&
                breadboardNode
              ) {
                console.log(
                  `LED ${node.id} - Attempting to trace connection through breadboard rows`
                );

                // Get the anode connection to breadboard
                const anodeToBreadboard = ledConnections.find(
                  (edge) =>
                    (edge.source === node.id &&
                      edge.target === breadboardNode.id &&
                      edge.sourceHandle === "anode-source") ||
                    (edge.source === breadboardNode.id &&
                      edge.target === node.id &&
                      edge.targetHandle === "anode-target")
                );

                if (anodeToBreadboard) {
                  // Get the breadboard handle for the anode connection
                  const anodeBreadboardHandle =
                    anodeToBreadboard.source === breadboardNode.id
                      ? anodeToBreadboard.sourceHandle
                      : anodeToBreadboard.targetHandle;

                  console.log(
                    `LED ${node.id} anode connected to breadboard at: ${anodeBreadboardHandle}`
                  );

                  // Get resistor connections
                  const resistorConnections = edges.filter(
                    (edge) =>
                      edge.source === connectedResistor.id ||
                      edge.target === connectedResistor.id
                  );

                  // 1. CRITICAL CHECK: First see if the resistor connects to the EXACT SAME breadboard hole
                  const exactSameHoleConnection = resistorConnections.find(
                    (edge) => {
                      if (
                        (edge.source === connectedResistor.id &&
                          edge.target === breadboardNode.id) ||
                        (edge.source === breadboardNode.id &&
                          edge.target === connectedResistor.id)
                      ) {
                        // Get the breadboard handle for the resistor connection
                        const resistorBreadboardHandle =
                          edge.source === breadboardNode.id
                            ? edge.sourceHandle
                            : edge.targetHandle;

                        // Compare the exact handles
                        return (
                          resistorBreadboardHandle === anodeBreadboardHandle
                        );
                      }
                      return false;
                    }
                  );

                  if (exactSameHoleConnection) {
                    console.log(
                      `LED ${node.id} - Found resistor connection to same exact breadboard hole`
                    );

                    // Check if resistor connects to Arduino directly
                    const resistorToArduino = resistorConnections.find(
                      (edge) =>
                        (edge.source === connectedResistor.id &&
                          edge.target === arduinoNode.id) ||
                        (edge.source === arduinoNode.id &&
                          edge.target === connectedResistor.id)
                    );

                    if (resistorToArduino) {
                      console.log(
                        `LED ${node.id} - Found resistor to Arduino connection`
                      );
                      const arduinoHandle =
                        resistorToArduino.source === arduinoNode.id
                          ? resistorToArduino.sourceHandle
                          : resistorToArduino.targetHandle;

                      // Only use digital pins, not GND pins
                      if (
                        arduinoHandle.includes("digital") &&
                        !arduinoHandle.includes("GND")
                      ) {
                        pinNumber = parseInt(arduinoHandle.match(/\d+/)?.[0]);
                        console.log(
                          `LED ${node.id} - Set pin number to ${pinNumber} from exact same breadboard hole`
                        );
                      }
                    }
                  }

                  // 2. If not exact same hole, check if they are in the same row
                  if (
                    pinNumber === undefined &&
                    anodeBreadboardHandle &&
                    anodeBreadboardHandle.includes("main-hole")
                  ) {
                    // Extract row and column from anode handle
                    const anodeRowColMatch = anodeBreadboardHandle.match(
                      /main-hole-(\d+)-(\d+)/
                    );

                    if (anodeRowColMatch) {
                      const anodeRow = parseInt(anodeRowColMatch[1]);
                      const anodeCol = parseInt(anodeRowColMatch[2]);

                      console.log(
                        `LED anode connected to breadboard row ${anodeRow}, col ${anodeCol}`
                      );

                      // Find all resistor connections to breadboard
                      const resistorToBreadboardConns =
                        resistorConnections.filter(
                          (edge) =>
                            (edge.source === connectedResistor.id &&
                              edge.target === breadboardNode.id) ||
                            (edge.source === breadboardNode.id &&
                              edge.target === connectedResistor.id)
                        );

                      // Look for connections in the same row
                      for (const conn of resistorToBreadboardConns) {
                        const resistorBreadboardHandle =
                          conn.source === breadboardNode.id
                            ? conn.sourceHandle
                            : conn.targetHandle;

                        if (
                          resistorBreadboardHandle &&
                          resistorBreadboardHandle.includes("main-hole")
                        ) {
                          const resistorRowColMatch =
                            resistorBreadboardHandle.match(
                              /main-hole-(\d+)-(\d+)/
                            );

                          if (resistorRowColMatch) {
                            const resistorRow = parseInt(
                              resistorRowColMatch[1]
                            );
                            const resistorCol = parseInt(
                              resistorRowColMatch[2]
                            );

                            console.log(
                              `Resistor connected to breadboard row ${resistorRow}, col ${resistorCol}`
                            );

                            // If in the same row (electrically connected)
                            if (resistorCol === anodeCol) {
                              console.log(
                                `LED ${node.id} - Found resistor in same COLUMN ${anodeCol} - vertical connection`
                              );

                              // Check the resistor-Arduino connection
                              const resistorToArduino =
                                resistorConnections.find(
                                  (edge) =>
                                    (edge.source === connectedResistor.id &&
                                      edge.target === arduinoNode.id) ||
                                    (edge.source === arduinoNode.id &&
                                      edge.target === connectedResistor.id)
                                );

                              if (resistorToArduino) {
                                console.log(
                                  `LED ${node.id} - Found resistor to Arduino connection`
                                );
                                const arduinoHandle =
                                  resistorToArduino.source === arduinoNode.id
                                    ? resistorToArduino.sourceHandle
                                    : resistorToArduino.targetHandle;

                                // Only use digital pins, not GND pins
                                if (
                                  arduinoHandle.includes("digital") &&
                                  !arduinoHandle.includes("GND")
                                ) {
                                  pinNumber = parseInt(
                                    arduinoHandle.match(/\d+/)?.[0]
                                  );
                                  console.log(
                                    `LED ${node.id} - Set pin number to ${pinNumber} from same COLUMN connection - vertical connection`
                                  );
                                }
                              }
                              break;
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }

              // CRITICAL: ALWAYS restore the pin number from before GND checks
              // GND connections ONLY determine if LED is connected, NEVER the pin number

              // Trace through resistor connections when LED and resistor are in same breadboard row
              if (
                pinNumber === undefined &&
                connectedResistor &&
                breadboardNode
              ) {
                console.log(
                  `Attempting to trace connection for LED ${node.id} through resistor ${connectedResistor.id}`
                );

                // Find LED anode connection to breadboard
                const ledAnodeToBreadboard = edges.find(
                  (edge) =>
                    (edge.source === node.id &&
                      edge.target === breadboardNode.id &&
                      edge.sourceHandle === "anode-source") ||
                    (edge.source === breadboardNode.id &&
                      edge.target === node.id &&
                      edge.targetHandle === "anode-target")
                );

                if (ledAnodeToBreadboard) {
                  const ledBreadboardHandle =
                    ledAnodeToBreadboard.source === breadboardNode.id
                      ? ledAnodeToBreadboard.sourceHandle
                      : ledAnodeToBreadboard.targetHandle;

                  console.log(
                    `LED ${node.id} breadboard connection: ${ledBreadboardHandle}`
                  );

                  // Check if LED is connected to main hole (not rail)
                  if (
                    ledBreadboardHandle &&
                    ledBreadboardHandle.includes("main-hole")
                  ) {
                    const ledRowColMatch = ledBreadboardHandle.match(
                      /main-hole-(\d+)-(\d+)/
                    );

                    if (ledRowColMatch) {
                      const ledRow = parseInt(ledRowColMatch[1]);
                      const ledCol = parseInt(ledRowColMatch[2]);

                      console.log(
                        `LED anode connected to breadboard row ${ledRow}, col ${ledCol}`
                      );

                      // Find resistor connections to breadboard
                      const resistorConnections = edges.filter(
                        (edge) =>
                          edge.source === connectedResistor.id ||
                          edge.target === connectedResistor.id
                      );

                      // First find the breadboard connection in the same row
                      const resistorToBreadboardInSameRow =
                        resistorConnections.find((edge) => {
                          if (
                            !(
                              (edge.source === connectedResistor.id &&
                                edge.target === breadboardNode.id) ||
                              (edge.source === breadboardNode.id &&
                                edge.target === connectedResistor.id)
                            )
                          ) {
                            return false;
                          }

                          const resistorBreadboardHandle =
                            edge.source === breadboardNode.id
                              ? edge.sourceHandle
                              : edge.targetHandle;

                          if (
                            !resistorBreadboardHandle ||
                            !resistorBreadboardHandle.includes("main-hole")
                          ) {
                            return false;
                          }

                          const resistorRowColMatch =
                            resistorBreadboardHandle.match(
                              /main-hole-(\d+)-(\d+)/
                            );
                          return (
                            resistorRowColMatch &&
                            parseInt(resistorRowColMatch[1]) === ledRow
                          );
                        });

                      if (resistorToBreadboardInSameRow) {
                        console.log(
                          `Found resistor connection in same row ${ledRow}`
                        );

                        // Find if the resistor has a connection to Arduino
                        const resistorToArduino = resistorConnections.find(
                          (edge) =>
                            (edge.source === connectedResistor.id &&
                              edge.target === arduinoNode.id) ||
                            (edge.source === arduinoNode.id &&
                              edge.target === connectedResistor.id)
                        );

                        if (resistorToArduino) {
                          console.log(`Found resistor to Arduino connection`);
                          const arduinoHandle =
                            resistorToArduino.source === arduinoNode.id
                              ? resistorToArduino.sourceHandle
                              : resistorToArduino.targetHandle;

                          // Only use digital pins, not GND pins
                          if (
                            arduinoHandle.includes("digital") &&
                            !arduinoHandle.includes("GND")
                          ) {
                            pinNumber = parseInt(
                              arduinoHandle.match(/\d+/)?.[0]
                            );
                            console.log(
                              `LED ${node.id} - Set pin number to ${pinNumber} from resistor to Arduino through breadboard row ${ledRow}`
                            );
                          }
                        } else {
                          // Check the other breadboard connection for the resistor
                          console.log(
                            `Checking if resistor has another breadboard connection`
                          );

                          const otherResistorToBreadboard =
                            resistorConnections.find((edge) => {
                              if (
                                !(
                                  (edge.source === connectedResistor.id &&
                                    edge.target === breadboardNode.id) ||
                                  (edge.source === breadboardNode.id &&
                                    edge.target === connectedResistor.id)
                                )
                              ) {
                                return false;
                              }

                              // Make sure it's not the same connection we just found
                              return (
                                edge.id !== resistorToBreadboardInSameRow.id
                              );
                            });

                          if (otherResistorToBreadboard) {
                            console.log(
                              `Found another resistor-breadboard connection`
                            );
                            const otherBreadboardHandle =
                              otherResistorToBreadboard.source ===
                              breadboardNode.id
                                ? otherResistorToBreadboard.sourceHandle
                                : otherResistorToBreadboard.targetHandle;

                            // Check if connected to a rail with pin assignment
                            if (otherBreadboardHandle.includes("rail")) {
                              if (
                                otherBreadboardHandle.includes("top-red") &&
                                breadboardRailConnections["top-red"] !== null
                              ) {
                                pinNumber =
                                  breadboardRailConnections["top-red"];
                                console.log(
                                  `Set pin number to ${pinNumber} from resistor connected to top-red rail`
                                );
                              } else if (
                                otherBreadboardHandle.includes("bottom-red") &&
                                breadboardRailConnections["bottom-red"] !== null
                              ) {
                                pinNumber =
                                  breadboardRailConnections["bottom-red"];
                                console.log(
                                  `Set pin number to ${pinNumber} from resistor connected to bottom-red rail`
                                );
                              }
                            } else if (
                              otherBreadboardHandle.includes("main-hole")
                            ) {
                              // Check if the other hole has a pin mapping
                              const otherRowColMatch =
                                otherBreadboardHandle.match(
                                  /main-hole-(\d+)-(\d+)/
                                );
                              if (otherRowColMatch) {
                                const otherCol = parseInt(otherRowColMatch[2]);
                                if (breadboardColumnConnections[otherCol]) {
                                  pinNumber =
                                    breadboardColumnConnections[otherCol].pin;
                                  console.log(
                                    `Set pin number to ${pinNumber} from resistor connected to column ${otherCol} with pin mapping`
                                  );
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }

              if (
                pinNumberBeforeGNDCheck !== undefined &&
                pinNumber === undefined
              ) {
                pinNumber = pinNumberBeforeGNDCheck;
                console.log(
                  `LED ${node.id} - Pin number ${pinNumber} preserved (GND has no effect on pin assignment)`
                );
              }

              // For the special case of LED + resistor + breadboard top-red rail connected to pin 12
              if (
                connectedResistor &&
                breadboardRailConnections["top-red"] === 12 &&
                isCathodeConnectedToGND &&
                pinNumber === undefined
              ) {
                // Check if the resistor is connected to the red rail
                const resistorConnections = edges.filter(
                  (edge) =>
                    edge.source === connectedResistor.id ||
                    edge.target === connectedResistor.id
                );

                const resistorToBreadboard = resistorConnections.find(
                  (edge) =>
                    (edge.source === connectedResistor.id &&
                      edge.target === breadboardNode?.id) ||
                    (edge.source === breadboardNode?.id &&
                      edge.target === connectedResistor.id)
                );

                if (resistorToBreadboard) {
                  const breadboardHandle =
                    resistorToBreadboard.source === breadboardNode.id
                      ? resistorToBreadboard.sourceHandle
                      : resistorToBreadboard.targetHandle;

                  console.log(
                    `LED ${node.id} resistor-breadboard connection:`,
                    {
                      resistorId: connectedResistor.id,
                      breadboardHandle,
                    }
                  );

                  // If resistor is connected to the red rail, use the red rail's pin number
                  if (
                    breadboardHandle?.includes("rail") &&
                    breadboardHandle.includes("red")
                  ) {
                    if (breadboardHandle.includes("top")) {
                      pinNumber = breadboardRailConnections["top-red"]; // Use the proper pin number from the rail
                      console.log(
                        `LED ${node.id} using top-red rail pin ${pinNumber}`
                      );
                    } else if (breadboardHandle.includes("bottom")) {
                      pinNumber = breadboardRailConnections["bottom-red"]; // Use the proper pin number from the rail
                      console.log(
                        `LED ${node.id} using bottom-red rail pin ${pinNumber}`
                      );
                    }
                  }
                }
              }

              console.log(`LED ${node.id} connection path:`, connectionPath);

              // Failsafe for missing pin number when top-red rail is used
              if (
                pinNumber === undefined &&
                breadboardRailConnections["top-red"] !== null &&
                connectedResistor &&
                isCathodeConnectedToGND
              ) {
                console.log(`LED ${node.id} - Applying pin detection failsafe`);

                // Check if the resistor is connected to the red rail on breadboard
                const resistorConnections = edges.filter(
                  (edge) =>
                    edge.source === connectedResistor.id ||
                    edge.target === connectedResistor.id
                );

                const resistorToBreadboard = resistorConnections.find(
                  (edge) =>
                    (edge.source === connectedResistor.id &&
                      edge.target === breadboardNode?.id) ||
                    (edge.source === breadboardNode?.id &&
                      edge.target === connectedResistor.id)
                );

                if (resistorToBreadboard) {
                  const breadboardHandle =
                    resistorToBreadboard.source === breadboardNode.id
                      ? resistorToBreadboard.sourceHandle
                      : resistorToBreadboard.targetHandle;

                  console.log(
                    `LED ${node.id} - Failsafe checking resistor-breadboard connection:`,
                    {
                      breadboardHandle,
                      railConnections: breadboardRailConnections,
                    }
                  );

                  // Try to determine if this is a rail or matches a rail's pin
                  if (breadboardHandle && breadboardHandle.includes("rail")) {
                    if (
                      breadboardHandle.includes("top") &&
                      breadboardHandle.includes("red")
                    ) {
                      pinNumber = breadboardRailConnections["top-red"];
                      console.log(
                        `LED ${node.id} - Failsafe set pin to ${pinNumber} from top-red rail`
                      );
                    } else if (
                      breadboardHandle.includes("bottom") &&
                      breadboardHandle.includes("red")
                    ) {
                      pinNumber = breadboardRailConnections["bottom-red"];
                      console.log(
                        `LED ${node.id} - Failsafe set pin to ${pinNumber} from bottom-red rail`
                      );
                    }
                  } else if (
                    breadboardHandle &&
                    breadboardHandle.includes("main-hole")
                  ) {
                    // Check if this is connected to a main breadboard column that has a pin mapping
                    const colMatch =
                      breadboardHandle.match(/main-hole-\d+-(\d+)/);
                    if (colMatch) {
                      const columnIndex = parseInt(colMatch[1]);
                      // Check if we have a column-to-pin mapping for this column
                      const columnMappings = breadboardColumnConnections || {};
                      if (columnMappings[columnIndex]) {
                        pinNumber = columnMappings[columnIndex].pin;
                        console.log(
                          `LED ${node.id} - Failsafe set pin to ${pinNumber} from column ${columnIndex} mapping`
                        );
                      } else {
                        console.log(
                          `LED ${node.id} - Column ${columnIndex} has no pin mapping`
                        );
                      }
                    }
                  } else {
                    // As a last resort, use the top-red rail pin if available
                    if (breadboardRailConnections["top-red"] !== null) {
                      pinNumber = breadboardRailConnections["top-red"];
                      console.log(
                        `LED ${node.id} - Last resort failsafe using top-red rail pin ${pinNumber}`
                      );
                    }
                  }
                } else {
                  // As a last resort, use the top-red rail pin if available
                  if (breadboardRailConnections["top-red"] !== null) {
                    pinNumber = breadboardRailConnections["top-red"];
                    console.log(
                      `LED ${node.id} - Last resort failsafe using top-red rail pin ${pinNumber}`
                    );
                  }
                }
              }

              const isProperlyConnected =
                Boolean(connectedResistor) &&
                isCathodeConnectedToGND &&
                !isNaN(pinNumber);

              // Check LED's previous connection state
              const wasConnected = node.data.component.props.isConnected;
              const nowConnected = isProperlyConnected;
              const previousPin = node.data.component.props.pin;

              // FAILSAFE: If we have a resistor and cathode to GND but no pin, try to use the rail pin
              if (
                Boolean(connectedResistor) &&
                isCathodeConnectedToGND &&
                (pinNumber === undefined || isNaN(pinNumber))
              ) {
                // Check if the resistor is connected to a breadboard column with pin mapping
                if (connectedResistor && breadboardNode) {
                  // Get resistor connections
                  const resistorConnections = edges.filter(
                    (edge) =>
                      edge.source === connectedResistor.id ||
                      edge.target === connectedResistor.id
                  );

                  // Find resistor-to-breadboard connection
                  const resistorToBreadboard = resistorConnections.find(
                    (edge) =>
                      (edge.source === connectedResistor.id &&
                        edge.target === breadboardNode.id) ||
                      (edge.source === breadboardNode.id &&
                        edge.target === connectedResistor.id)
                  );

                  if (resistorToBreadboard) {
                    const breadboardHandle =
                      resistorToBreadboard.source === breadboardNode.id
                        ? resistorToBreadboard.sourceHandle
                        : resistorToBreadboard.targetHandle;

                    console.log(
                      `LED ${node.id} - Final failsafe checking resistor-breadboard connection:`,
                      {
                        breadboardHandle,
                      }
                    );

                    // Check if resistor is connected to a main column with pin mapping
                    if (
                      breadboardHandle &&
                      breadboardHandle.includes("main-hole")
                    ) {
                      const colMatch =
                        breadboardHandle.match(/main-hole-\d+-(\d+)/);
                      if (colMatch) {
                        const columnIndex = parseInt(colMatch[1]);
                        const columnMappings =
                          breadboardColumnConnections || {};

                        if (columnMappings[columnIndex]) {
                          pinNumber = columnMappings[columnIndex].pin;
                          console.log(
                            `LED ${node.id} - Final failsafe using column ${columnIndex} mapped to pin ${pinNumber}`
                          );

                          if (!isNaN(pinNumber)) {
                            console.log(
                              `LED ${node.id} FAILSAFE: Connection fixed with column mapping!`
                            );
                          }
                        }
                      }
                    }
                  }
                }

                // If we still don't have a pin, use top-red rail as last resort
                if (
                  (pinNumber === undefined || isNaN(pinNumber)) &&
                  breadboardRailConnections &&
                  breadboardRailConnections["top-red"] !== null
                ) {
                  // Only assign a new pin if we don't already have a valid pin from before
                  if (previousPin === undefined || isNaN(previousPin)) {
                    pinNumber = breadboardRailConnections["top-red"];
                    console.log(
                      `LED ${node.id} FAILSAFE: Setting pin to ${pinNumber} from top-red rail`
                    );
                    // Update the isProperlyConnected value with our new pin
                    if (!isNaN(pinNumber)) {
                      console.log(`LED ${node.id} FAILSAFE: Connection fixed!`);
                    }
                  } else {
                    // If we already had a valid pin, keep it instead of changing to the rail's pin
                    console.log(
                      `LED ${node.id} FAILSAFE: Preserving existing pin ${previousPin} instead of changing`
                    );
                    pinNumber = previousPin;
                  }
                }
              }

              // Debug logs
              console.log(`LED ${node.id} connection check:`, {
                hasConnectedResistor: Boolean(connectedResistor),
                isCathodeConnectedToGND,
                pinNumber,
                isProperlyConnected,
                pinState: isProperlyConnected ? pinState[pinNumber] : undefined,
              });

              // Check if this LED was previously connected but now disconnected
              if (wasConnected && !nowConnected) {
                if (!connectedResistor) {
                  // Only clear pin if the resistor was disconnected (not just GND)
                  console.log(
                    `LED ${node.id} resistor disconnected - clearing pin assignment`
                  );
                  pinNumber = undefined;
                } else if (
                  isCathodeConnectedToGND === false &&
                  previousPin !== undefined
                ) {
                  // If just the GND was disconnected but we still have a resistor, keep the pin
                  console.log(
                    `LED ${node.id} GND disconnected but resistor present - keeping pin ${previousPin}`
                  );
                  pinNumber = previousPin;
                  // We mark it as disconnected via isConnected, but preserve the pin number
                }
              }

              // If pin has changed, log the change
              if (previousPin !== pinNumber) {
                console.log(
                  `LED ${node.id} pin changed from ${previousPin} to ${pinNumber}`
                );
              }

              // CRITICAL: Double-check connection requirements
              const isReallyConnected =
                Boolean(connectedResistor) &&
                isCathodeConnectedToGND &&
                pinNumber !== undefined &&
                !isNaN(pinNumber);

              // Track which specific pin this LED is using for future reference
              if (isReallyConnected) {
                // Record this LED's pin assignment to help with debugging
                console.log(
                  `LED ${node.id} has unique pin assignment: ${pinNumber}`
                );
              }

              // Ensure the LED knows it's disconnected if any criteria fails
              if (!isReallyConnected) {
                console.log(`LED ${node.id} connection check failed:`, {
                  hasResistor: Boolean(connectedResistor),
                  isGNDConnected: isCathodeConnectedToGND,
                  hasPinNumber: pinNumber !== undefined && !isNaN(pinNumber),
                });
              }

              // Force LED to acknowledge pin state on every update
              const newPinState = { ...pinState };
              const actualPinState = isReallyConnected
                ? pinState[pinNumber]
                : false;

              // CRITICAL: Ensure we're only using this specific LED's pin state
              // This ensures LEDs connected to the same GND don't interfere with each other
              const isolatedPinState =
                isReallyConnected && pinNumber !== undefined
                  ? {
                      // Only include this LED's pin in the pin state
                      [pinNumber]: pinState[pinNumber] || false,
                    }
                  : {};

              // Create a special reference specifically for this LED's hardware state
              // This prevents other LEDs from affecting this one
              const isolatedHardwareRef = {
                current:
                  isReallyConnected && pinNumber !== undefined
                    ? {
                        // Use the actual real-time pin state from hardware, not a shared reference
                        [pinNumber]: realPinStatesRef.current
                          ? realPinStatesRef.current[pinNumber]
                          : false,
                      }
                    : {},
              };

              // Force recreation of component to ensure it gets the latest props
              const clonedProps = {
                ...node.data.component.props,
                isConnected: isReallyConnected,
                shouldBlink: isReallyConnected && actualPinState,
                pinState: isolatedPinState, // Use the isolated pin state
                pin: isReallyConnected ? pinNumber : undefined,
                pinStateVersion: pinStateVersion, // Include the version to force updates
                forceUpdate: Date.now(),
                // Add more uniqueness to key to force clean remounts
                key: `led-${node.id}-${Date.now()}-${pinStateVersion}-${
                  isReallyConnected ? "connected" : "disconnected"
                }-${pinNumber || "nopin"}-${actualPinState ? "high" : "low"}`,
                realPinStatesRef: isolatedHardwareRef, // Use isolated hardware reference
              };

              // Create new component with fresh props
              const newComponent = React.createElement(
                node.data.component.type,
                clonedProps
              );

              console.log(
                `RECREATING LED ${node.id} with pin ${pinNumber}, state:`,
                actualPinState ? "HIGH" : "LOW"
              );

              // Add debug for rail connections
              if (pinNumber !== undefined) {
                console.log(`DEBUG: LED ${node.id} assigned pin ${pinNumber}`);
              } else {
                console.log(`DEBUG: LED ${node.id} has NO pin assigned. Rail connections:`, breadboardRailConnections);
              }

              // Return the updated node with connection info
              return {
                ...node,
                data: {
                  ...node.data,
                  component: newComponent,
                  pinState: pinNumber !== undefined ? pinState[pinNumber] : false,
                  // CRITICAL FIX: Set pin even if undefined to trigger proper component updates
                  pin: pinNumber !== undefined ? pinNumber : null,
                  isConnected: connectedResistor !== undefined || pinNumber !== undefined,
                  hardwarePinState: pinNumber !== undefined ? pinState[pinNumber] : false,
                  connectionPath,
                  pinStateVersion,
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
          nodes: nodes.map((node) => ({
            ...node,
            data: { ...node.data, component: null },
          })),
          edges: edges.map((edge) => ({ ...edge })),
        };
        const savedState = {
          nodes: lastSavedState.nodes.map((node) => ({
            ...node,
            data: { ...node.data, component: null },
          })),
          edges: lastSavedState.edges.map((edge) => ({ ...edge })),
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
              onClick={() => addNode(LED, 100, 100, { x: 0, y: 0 }, true)}
              className="component-button"
            >
              <FaLightbulb style={{ marginRight: "5px" }} />
              {!isPanelCollapsed && <span><Tooltip text="LED: A Light Emitting Diode (LED) is a semiconductor device that emits light when an electric current passes through it.">Add LED</Tooltip></span>}
            </button>
            

            
            <button
              onClick={() =>
                addNode(
                  Resistor,
                  100,
                  50,
                  { x: 100, y: 100 },
                  { resistance: "" }
                )
              }
              className="component-button"
            >
              <FaMicrochip style={{ marginRight: "5px" }} />
              {!isPanelCollapsed && <span><Tooltip text="Resistor: A resistor is a passive electrical component that limits or regulates the flow of electrical current in an electronic circuit.">Add Resistor</Tooltip></span>}
            </button>
            

            
            <button
              onClick={() => addNode(Breadboard, 1000, 250, { x: 100, y: 100 })}
              className="component-button"
            >
              <FaBreadSlice style={{ marginRight: "5px" }} />
              {!isPanelCollapsed && <span><Tooltip text="Breadboard: Used to prototype electronic circuits. Red rails (+) for positive voltage, blue rails (-) for ground. Middle section contains tie points for connecting components.">Add Breadboard</Tooltip></span>}
            </button>
            

            
            <button
              onClick={() =>
                addNode(ArduinoUnoR3, 200, 150, { x: 100, y: 100 })
              }
              className="component-button"
            >
              <FaMicrochip style={{ marginRight: "5px" }} />
              {!isPanelCollapsed && <span><Tooltip text="Arduino Uno R3: A microcontroller board based on the ATmega328P. It has 14 digital input/output pins, 6 analog inputs, a 16 MHz quartz crystal, a USB connection, a power jack, an ICSP header, and a reset button.">Add Arduino Uno</Tooltip></span>}
            </button>
            <button
              onClick={() => {
                if (!newPageName) {
                  alert(
                    "Project name is missing. Please provide a name before saving."
                  );
                  return;
                }

                let components = [];

                for (let i in nodes) {
                  components.push({
                    name: nodes[i].data.component.type.name,
                    x: nodes[i].position.x,
                    y: nodes[i].position.y,
                  });
                }

                console.log("Saving project:", newPageName, components);

                fetch("http://localhost:3512/insert", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    projectName: newPageName, // Send as a string, not an array
                    components: components, // Send as structured data
                  }),
                })
                  .then((response) => {
                    if (response.ok) {
                      alert("Data saved successfully");
                      setLastSavedState({
                        nodes: [...nodes],
                        edges: [...edges],
                      });
                      setHasUnsavedChanges(false);
                    } else {
                      alert("Failed to save data");
                    }
                  })
                  .catch((error) => {
                    console.error("Error saving project:", error);
                    alert("Error saving project");
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
              <Background variant="lines" gap={16} size={2} color="#b5deb5" />
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
      setPinStateVersion((v) => v + 1);

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
        // Make a deep copy to ensure we're not sharing references
        realPinStatesRef.current = JSON.parse(JSON.stringify(newPinStates));

        // Log pin state changes for debugging
        const changedPins = Object.keys(newPinStates).filter(
          (pin) => pinState[pin] !== newPinStates[pin]
        );

        if (changedPins.length > 0) {
          console.log(
            "Pin state changes detected:",
            changedPins.map(
              (pin) => `Pin ${pin}: ${pinState[pin]} -> ${newPinStates[pin]}`
            )
          );
        }

        // CRITICAL: Force React state update with NO COMPARISON
        setPinState(() => ({ ...newPinStates }));
        setPinStateVersion((v) => v + 1);
      };

      // Run initialization cycles
      for (let i = 0; i < 500000; i++) {
        // Reduced initialization cycles
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
        for (let i = 0; i < 50000; i++) {
          // Reduced from 5,000 to 1,000 for more accurate timing
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
      setLedBlinkState((prevState) => !prevState); // Toggle LED state
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
                    <Page
                      pageId={page.Id}
                      removePage={handleRemovePage}
                      newPageName={newPageName}
                    />
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
