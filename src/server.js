import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import { exec } from "child_process";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// Define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(bodyParser.json());
app.use(cors()); // Enable Cross-Origin Resource Sharing

app.post("/compile", (req, res) => {
  const sketchCode = req.body.code;
  const sketchFolder = path.join(__dirname, "temp", "sketch");
  const sketchPath = path.join(sketchFolder, "sketch.ino");
  const buildPath = path.join(__dirname, "temp", "build");

  // Ensure necessary directories exist
  if (!fs.existsSync(sketchFolder)) {
    fs.mkdirSync(sketchFolder, { recursive: true });
  }

  // Save the sketch code to a file inside the folder
  fs.writeFileSync(sketchPath, sketchCode);

  // Define the board type (FQBN)
  const fqbn = "arduino:avr:uno";

  // Run Arduino CLI to compile
  const compileCommand = `arduino-cli compile --fqbn ${fqbn} --build-path "${buildPath}" "${sketchFolder}"`;
  console.log(`Running: ${compileCommand}`);

  exec(compileCommand, (err, stdout, stderr) => {
    if (err) {
      console.error("Compilation error:", stderr);
      res.status(500).json({ error: stderr });
      return;
    }

    console.log("Compilation successful:", stdout);

    // Path to the generated .hex file
    const hexPath = path.join(buildPath, "sketch.ino.hex");

    if (fs.existsSync(hexPath)) {
      const hexContent = fs.readFileSync(hexPath, "utf8");
      res.json({ hex: hexContent });
    } else {
      res.status(500).json({ error: "Hex file not generated" });
    }
  });
});

// Start the server
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
