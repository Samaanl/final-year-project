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
} from "react-icons/fa"; // Import Font Awesome icons
import { MdNoteAdd } from "react-icons/md";
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
import "react-tabs/style/react-tabs.css";
import "@xyflow/react/dist/style.css";
import Tooltip from "./components/Tooltip.jsx";
import "./components/Tooltip.css";
import "./Toolbar.css"; // Import the new CSS file
import "./components/ComponentsSection.css";
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
  }); // Add this state at the top
  const [pages, setPages] = useState([]); // State to manage the list of pages
  const [pageCounter, setPageCounter] = useState(1); // Counter to generate unique page IDs
  const ledStateRef = useRef(false); // Ensure this is defined at the top
  const [defaultCode, setDefaultCode] = useState(ArduinoCode);
  const [resultOfHex, setresultOfHex] = useState("nothing");

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
        const newNode = {
          id: `${idCounter}`,
          type: "custom",
          position,
          data: {
            component: (
              <Component
                id={`component-${idCounter}`}
                pos={position}
                onDelete={handleDeleteNode}
                {...(isLEDComponent && { brightness: ledStateRef.current })}
                {...(isLEDComponent && { ledStateRef: ledStateRef })}
                {...(isLEDComponent && { shouldBlink: false })}
                {...(isLEDComponent && { isConnected: false })}
                {...(isLEDComponent && { pinState: pinState })}
                {...(isLEDComponent && { isActive: isActive })}
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
        setNodes((nds) =>
          nds.map((node) => {
            if (node.data.component.type.name === "LED") {
              // Get the Arduino node and Resistor nodes
              const arduinoNode = nodes.find(n => n.data.component.type.name === "ArduinoUnoR3");
              const resistors = nodes.filter(n => n.data.component.type.name === "Resistor");
              if (!resistors) return node;
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

                const resistorToArduino = edges.find(
                  edge =>
                    ((edge.source === resistor.id && edge.target === arduinoNode?.id &&
                      (edge.sourceHandle === "left-source" || edge.sourceHandle === "right-source") && 
                      edge.targetHandle === "handle-target-digital-13") ||
                    (edge.source === arduinoNode?.id && edge.target === resistor.id &&
                      edge.sourceHandle === "handle-source-digital-13" && 
                      (edge.targetHandle === "left-target" || edge.targetHandle === "right-target")))
                );

                return Boolean(resistorToArduino);
              });

              // Check if cathode is connected to GND
              const isCathodeConnectedToGND = Boolean(
                edges.find(edge => 
                  (edge.source === node.id && 
                   edge.target === arduinoNode?.id && 
                   (edge.targetHandle === "handle-target-power-GND1" || 
                    edge.targetHandle === "handle-target-power-GND2")) ||
                  (edge.source === arduinoNode?.id && 
                   edge.target === node.id && 
                   (edge.sourceHandle === "handle-source-power-GND1" || 
                    edge.sourceHandle === "handle-source-power-GND2"))
                )
              );

              const pinConnections = edges.filter(edge => 
                (edge.source === arduinoNode.id && resistors.some(resistor => edge.target === resistor.id && edge.sourceHandle.includes('digital'))) ||
                (edge.target === arduinoNode.id && resistors.some(resistor => edge.source === resistor.id && edge.targetHandle.includes('digital'))));

              console.log(`Pin connections:`, pinConnections);
              const pinNumber = pinConnections.find(edge => edge.source === arduinoNode.id)?.sourceHandle?.replace('handle-source-', '').split('-')[1] || 
                  pinConnections.find(edge => edge.target === arduinoNode.id)?.targetHandle?.replace('handle-target-', '').split('-')[1];
              console.log(`Extracted pin number:`, pinNumber);

              const isProperlyConnected = Boolean(connectedResistor) && isCathodeConnectedToGND && pinConnections.length > 0;

              // Update the LED state based on the pin state
              if (isProperlyConnected) {
                const currentPinState = pinState[pinNumber];
                console.log(`Pin state for ${pinNumber}:`, currentPinState);
                console.log(`LED state being set:`, currentPinState);
                setLedState(currentPinState); // Set LED state based on pin state
              } else {
                setLedState(false);
              }

              // Show connection status notifications
              if (edges.find(edge => 
                (edge.source === node.id && edge.sourceHandle === "anode-source") ||
                (edge.target === node.id && edge.targetHandle === "anode-target")
              ) && !connectedResistor) {
                toast.warning(`Connect the LED's anode (longer leg) to any side of the resistor`, {
                  icon: "⚡",
                  toastId: `anode-${node.id}`,
                  autoClose: 3000
                });
              }

              if (edges.find(edge => 
                (edge.source === node.id && edge.sourceHandle === "cathode-source") ||
                (edge.target === node.id && edge.targetHandle === "cathode-target")
              ) && !isCathodeConnectedToGND) {
                toast.warning(`Connect the LED's cathode (shorter leg) to GND`, {
                  icon: "⚡",
                  toastId: `cathode-${node.id}`,
                  autoClose: 3000
                });
              }

              // Show success notification only once when circuit is complete
              if (isProperlyConnected && !successNotificationShown[node.id]) {
                toast.success(`Circuit complete! The LED should now blink.`, {
                  icon: "💡",
                  toastId: `success-${node.id}`,
                  autoClose: 3000
                });
                setSuccessNotificationShown(prev => ({ ...prev, [node.id]: true }));
              }

              return {
                ...node,
                data: {
                  ...node.data,
                  component: React.cloneElement(node.data.component, {
                    isConnected: isProperlyConnected,
                    shouldBlink: isProperlyConnected,
                    brightness: ledStateRef.current,
                    pinState: pinState,
                    isActive: isActive,
                  }),
                },
              };
            }
            return node;
          })
        );
      }, [edges, nodes, successNotificationShown]);

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

    // Attach the virtual hardware
    const portD = new AVRIOPort(cpu, portDConfig);
    const portB = new AVRIOPort(cpu, portBConfig);

    console.log("Attaching listener to ports...");

    const updateLEDState = (port, pin) => {
      const turnOn = port.pinState(pin) === PinState.High;
      console.log(`LED on pin ${pin} is`, turnOn); // Log the state of the LED
      ledStateRef.current = turnOn;
      console.log(`Current pin state before update:`, pinState[pin]);
      setPinState((prev) => {
        const newState = { ...prev, [pin]: turnOn }; // Update pin state
        console.log(`Updated pin state for pin ${pin}:`, turnOn); // Log the updated state for the specific pin
        console.log(`Current pinState object:`, newState); // Log the entire pinState object
        return newState;
      });

      // Update LED state based on the current pin state
      if (pin === 13) {
        setIsActive(pinState[pin]); // Update isActive based on pin state
        setLedState(pinState[pin]); // Use the previously obtained state directly
      }
    };

    // Add listeners for all digital pins from 0 to 13
    for (let pin = 0; pin <= 7; pin++) {
      portD.addListener(() => updateLEDState(portD, pin));
    }
    for (let pin = 8; pin <= 13; pin++) {
      portB.addListener(() => updateLEDState(portB, pin - 8));
    }

    const timer = new AVRTimer(cpu, timer0Config);

    // Run the instructions one by one
    while (true) {
      for (let i = 0; i < 500000; i++) {
        avrInstruction(cpu);
        cpu.tick();
      }
     // Update pin states for pins 0 to 7
for (let pin = 0; pin <= 7; pin++) {
  const state = portD.pinState(pin) === PinState.High;
  console.log(`Pin ${pin} state:`, state);
  setPinState((prev) => {
    console.log(`Current pinState object before update:`, prev);
    const newState = { ...prev, [pin]: state }; // Update pin state for each pin
    // Set isActive based on the pin state
    if (pin === 13) {
      const pin13State = portB.pinState(pin - 8);
      setIsActive(pinState[pin]); // Update isActive based on pin state
      setLedState(pinState[pin]); // Use the previously obtained state directly
    }
    return newState;
  });
}

// Update pin states for pins 8 to 13
for (let pin = 8; pin <= 13; pin++) {
  const state = portB.pinState(pin - 8) === PinState.High;
  console.log(`Pin ${pin} state:`, state);
  setPinState((prev) => {
    console.log(`Current pinState object before update:`, prev);
    const newState = { ...prev, [pin]: state }; // Update pin state for each pin
    return newState;
  });
  if (state) {
    setIsActive(pinState[pin]); // Update isActive based on pin state
    setLedState(pinState[pin]); // Use the previously obtained state directly
  } else {
    setIsActive(false); // Deactivate the LED if the pin state is false
    setLedState(false); // Deactivate the LED if the pin state is false
  }
}
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  };

  console.log(`the hex is ${resultOfHex}`);
  console.log("is running", isRunning);

  // Add state management and effect to make the LED blink based on the pin state changes
  const [ledBlinkState, setLedBlinkState] = useState(false);
  useEffect(() => {
    const interval = setInterval(() => {
      setLedBlinkState(prevState => !prevState); // Toggle LED state
    }, 1000); // Change this interval as needed

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
