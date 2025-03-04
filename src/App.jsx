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
  const [allProjNames, setallProjNames] = useState([]);
  // Added a state to track the selected tab
  const [selectedTabIndex, setSelectedTabIndex] = useState(0);
  // Add state to manage the modal visibility and input value
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPageName, setNewPageName] = useState("");

  const [fetchData, setfetchData] = useState([]);

  // Add this state near your other state declarations
  const [projectStates, setProjectStates] = useState({});

  // Add this state near your other state declarations
  const [isRunning, setIsRunning] = useState(false);
  const cpuLoopRef = useRef(null);

  // Add this function inside the App component
  /**
   * The function `handleDeleteProject` is used to delete a project by sending a DELETE request to a
   * specified endpoint and updating local state accordingly.
   * @returns The `handleDeleteProject` function returns `undefined`.
   */
  const handleDeleteProject = async (projectName) => {
    if (!projectName || projectName.trim() === "") {
      console.error("No project name provided for deletion");
      return;
    }

    if (window.confirm(`Are you sure you want to delete ${projectName}?`)) {
      try {
        const response = await fetch(
          `http://localhost:3512/deleteProject/${encodeURIComponent(projectName)}`,
          {
            method: "DELETE",
          },
        );

        if (response.ok) {
          // Remove from local state
          setallProjNames((prevProjects) =>
            prevProjects.filter((proj) => proj !== projectName),
          );
          // Remove from pages if it's open
          setPages((prevPages) =>
            prevPages.filter((page) => page !== projectName),
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
      [],
    );

    const handleDeleteNode = (id) => {
      setNodes((nds) => nds.filter((node) => node.id !== id));
      setEdges((eds) =>
        eds.filter((edge) => edge.source !== id && edge.target !== id),
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
              { resistance: "" },
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
            // setfetchData(data.data);
            // autoled();
            console.log("autoled i have fetched data from db", data.data);
            autoled(data.data);
          })
          // console.log("autoled i have fetched data from db");
          .catch((err) => {
            console.error("Error fetching data:", err);
          });
      }
    }, [newPageName]);

    // console.log("fetchData", fetchData);
    return (
      <div style={{ display: "flex", height: "100%", width: "100%" }}>
          <div className="components-section">
            <h3 className="components-header">Components</h3>
            <button
              onClick={() => addNode(LED, 100, 100, { x: 0, y: 0 })}
              className="component-button"
            >
              <FaLightbulb style={{ marginRight: "5px" }} />
              Add LED
            </button>
            <button
              onClick={() =>
                addNode(
                  Resistor,
                  100,
                  50,
                  { x: 100, y: 100 },
                  { resistance: "" },
                )
              }
              className="component-button"
            >
              <FaMicrochip style={{ marginRight: "5px" }} />
              Add Resistor
            </button>
            <button
              onClick={() => addNode(Breadboard, 1000, 250, { x: 100, y: 100 })}
              className="component-button"
            >
              <FaBreadSlice style={{ marginRight: "5px" }} />
              Add Breadboard
            </button>
            <button
              onClick={() =>
                addNode(ArduinoUnoR3, 200, 150, { x: 100, y: 100 })
              }
              className="component-button"
            >
              <FaMicrochip style={{ marginRight: "5px" }} />
              Add Arduino Uno
            </button>
            <button
          // style={{ backgroundColor: "#00509e" }}
          onClick={() => {
            let project = [];
            let nodeName = [];
            let x = [];
            let y = [];
            for (let i in nodes) {
              alert(
                `$node name: ${nodes[i].data.component.type.name} and its position x is ${nodes[i].position.x} and its position y is ${nodes[i].position.y}`,
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
          className="component-button"
          style={{ backgroundColor: "#4CAF50" }}
        >
          <FaSave style={{ marginRight: "5px" }} />
          SAVE 
        </button>
        </div>
        <div style={{ flex: 1 }}>
          <p>Active Nodes: {getActiveNodesCount()}</p>
          <p>display name: {}</p>

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
    // const newPageId = `page-${pageCounter}`; // Generate a new page ID
    // setPages([...pages, newPageId]); // Add the new page ID to the list of pages
    // setPageCounter(pageCounter + 1); // Increment the page counter
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
  };

  const handleNewPageSubmitExsistingProject = (proj) => {
    // const newPageId = `page-${pageCounter}`; // Generate a new page ID
    // const newPageId = `${newPageName}`;
    setPages([proj, ...pages]); // Add the new page ID to the list of pages

    setPageCounter((prev) => prev + 1); // Increment the page counter
    setIsModalOpen(false); // Hide the modal
    // setNewPageName(""); // Clear the input value
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

      <Tabs
        style={{ height: "calc(100% - 40px)" }}
        onSelect={(index) => {
          setSelectedTabIndex(index);
          console.log(`Tab clicked: ${pages[index]}`); // This gives you the pageId of the clicked tab
          setNewPageName(pages[index]);
        }}
      >
        <TabList>
          {pages.map((pageId) => (
            <Tab key={pageId}>
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
        </TabList>
        {pages.map((page) => (
          <TabPanel key={page.Id} style={{ height: "100%", width: "100%" }}>
            <Page pageId={page.Id} removePage={handleRemovePage} />
          </TabPanel>
        ))}
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
      <div
        className="project-list flex gap-6"
        style={{
          marginTop: "20px",
          border: "1px solid #ccc",
          padding: "10px",
          borderRadius: "8px",
        }}
      >
        {allProjNames
          .filter((proj) => proj && proj.trim() !== "")
          .map((proj) => (
            <div
              key={proj}
              className="project-item flex"
              style={{
                border: "1px solid #ddd",
                padding: "10px",
                borderRadius: "8px",
              }}
            >
              <button
                onClick={() => {
                  setNewPageName(proj);
                  handleNewPageSubmitExsistingProject(proj);
                }}
                // className="project-button bg-slate-400 p-2"
                key={proj}
                style={{ marginRight: "10px" }}
              >
                {proj}
              </button>
              <button
                onClick={() => handleDeleteProject(proj)}
                className="delete-button"
                style={{
                  color: "red",
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                }}
              >
                <FaTrash />
              </button>
            </div>
          ))}
      </div>
      {/* {allProjNames.map((proj) => (
        <button
          onClick={() => {
            setNewPageName(proj);
            // console.log("project name is now ", newPageName);
            handleNewPageSubmitExsistingProject(proj);
          }}
          key={proj}
          style={{ padding: "1rem", border: "1px solid #ccc" }}
        >
          {proj}
        </button>
      ))} */}
      {/* Modal for entering the new page name */}
      <Modal
        show={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setNewPageName("");
        }}
      >
        <Modal.Header>Enter Project Name</Modal.Header>
        <Modal.Body>
          <TextInput
            key={`input-${isModalOpen}`}
            value={newPageName}
            onChange={(e) => setNewPageName(e.target.value)}
            placeholder="Project Name"
            autoFocus
          />
        </Modal.Body>
        <Modal.Footer>
          {/* <Button onClick={handleNewPageSubmit}>Submit</Button> */}
          <Button color="gray" onClick={handleNewPageSubmit}>
            Submit
          </Button>

          <Button color="gray" onClick={() => setIsModalOpen(false)}>
            Cancel
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
