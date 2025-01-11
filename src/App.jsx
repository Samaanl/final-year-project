import { useState } from "react";
import "@wokwi/elements";
import { parse } from "intel-hex";
import { Buffer } from "buffer";
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

window.Buffer = window.Buffer || Buffer;

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

function App() {
  const [defaultCode, setDefaultCode] = useState(ArduinoCode);
  const [ledState13, setledState13] = useState(false);
  const [ledState7, setledState7] = useState(false);

  const RunCode = async () => {
    //compile the source code to arduino redable hex
    const response = await fetch("http://localhost:5000/compile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: defaultCode }),
    });

    //load the hex file to the ardunio cpu
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

    port.addListener(() => {
      const turnon = port.pinState(7) === PinState.High;
      console.log("LED on pin 7 is", turnon);
      setledState7(turnon);
    });

    portB.addListener(() => {
      const turnon = portB.pinState(5) === PinState.High;
      console.log("LED on pin 13 is", turnon);
      setledState13(turnon);
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

  return (
    <>
      <div>Arduino simulator</div>
      <wokwi-led color="blue" value={ledState7 ? true : ""}></wokwi-led>
      {/* {ledState13 ? true : ""} */}
      <wokwi-arduino-uno led13={ledState13 ? true : ""}></wokwi-arduino-uno>

      <svg
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none", // Prevent interfering with clicks
        }}
      >
        {/* Wire from Arduino Pin 13 to LED */}
        <line
          x1="32" // Arduino Pin 13 X-coordinate
          y1="220" // Arduino Pin 13 Y-coordinate
          x2="240" // LED Anode X-coordinate
          y2="35" // LED Anode Y-coordinate
          stroke="red"
          strokeWidth="2"
        />

        {/* Wire from LED Cathode to Ground */}
        <line
          x1="22" // LED Cathode X-coordinate
          y1="220" // LED Cathode Y-coordinate
          x2="230" // Ground pin X-coordinate
          y2="218" // Ground pin Y-coordinate
          stroke="black"
          strokeWidth="2"
        />
      </svg>

      <textarea
        rows={30}
        style={{ width: "100%" }}
        value={defaultCode}
        onChange={(e) => setDefaultCode(e.target.value)}
      ></textarea>
      <button onClick={RunCode}>RUN</button>
    </>
  );
}

export default App;
