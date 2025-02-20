import React, { useState, useCallback, useRef, useEffect } from "react";
import { Button, Drawer } from "flowbite-react";
import { v4 as uuidv4 } from 'uuid';
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

  const [fetchData, setfetchData] = useState([]);

  // Add this state near your other state declarations
  const [isRunning, setIsRunning] = useState(false);
  const cpuLoopRef = useRef(null);

  // Page component to handle each individual page
  const Page = ({ pageId, removePage }) => {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [idCounter, setIdCounter] = useState(1);
    const [selectedNode, setSelectedNode] = useState(null);
    const edgeReconnectSuccessful = useRef(true);
    const [resistorValues, setResistorValues] = useState({});

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

    const addNode = (Component, width, height,pos, initialData = {}) => {
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
    function autoled(data){
      for(let i in data){
        switch (data[i].name) {
          case "LED":
            addNode(LED, 100, 100,{ x:data[i].x, y: data[i].y })
            break;
            case "Resistor":
            addNode(Resistor, 100, 50,{ x:data[i].x, y: data[i].y })
            case "Breadboard":
              addNode(Breadboard, 1000, 50,{ x:data[i].x, y: data[i].y })
            break;
            default:
            addNode(Breadboard, 100, 100,{ x:data[i].x, y: data[i].y })
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

    

    useEffect(() => {
      if (nodes.length === 0) {  // Ensures it runs only if no nodes exist
        fetch('http://127.0.0.1:3512/getData')
          .then(res => res.json())
          .then(data => {
            // setfetchData(data.data);
            // autoled();
            console.log("autoled i have fetched data from db",data.data);
            autoled(data.data);
          });
        // console.log("autoled i have fetched data from db");
        
      }
    }, []);

    // console.log("fetchData", fetchData);
    return (
      <div style={{ display: "flex", height: "100%", width: "100%" }}>
        <div className="components-section">
          <h3 className="components-header">Components</h3>
          <button
            onClick={() => addNode(LED, 100, 100,{ x: 100, y: 100 })}
            className="component-button"
          >
            <FaLightbulb style={{ marginRight: "5px" }} />
            Add LED
          </button>
          <button
            onClick={() => addNode(Resistor, 100, 50,{ x: 100, y: 100 }, { resistance: "" })}
            className="component-button"
          >
            <FaMicrochip style={{ marginRight: "5px" }} />
            Add Resistor
          </button>
          <button
            onClick={() => addNode(Breadboard, 1000, 250,{ x: 100, y: 100 })}
            className="component-button"
          >
            <FaBreadSlice style={{ marginRight: "5px" }} />
            Add Breadboard
          </button>
          <button
            onClick={() => addNode(ArduinoUnoR3, 200, 150,{ x: 100, y: 100 })}
            className="component-button"
          >
            <FaMicrochip style={{ marginRight: "5px" }} />
            Add Arduino Uno
          </button>
          {
          
          // autoled()
          }
        </div>

        <div style={{ flex: 1 }}>
        <p>Active Nodes: {getActiveNodesCount()}</p>
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

      <button onClick={() => console.log("save")}>
        SAVE
      </button>

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
            <Page pageId={pageId} removePage={handleRemovePage} />{" "}
            {/* Render the Page component */}
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
