import express from "express";
import sqlite3 from "sqlite3";
//new added starts
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
const port = 3512;

//initialising database projName TEXT NOT NULL,
const dbPath = path.join(__dirname, "database.sqlite");
const dbExists = fs.existsSync(dbPath);
const db = new sqlite3.Database(dbPath);

if (!dbExists) {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      proj TEXT NOT NULL,
      name TEXT NOT NULL,
      x TEXT NOT NULL,
      y TEXT NOT NULL
    )
  `;

  db.run(createTableQuery, (err) => {
    if (err) {
      console.error("Error creating table:", err.message);
    } else {
      console.log("Table created successfully");
    }
  });
}

app.use(bodyParser.json());
app.use(cors()); // Enable Cross-Origin Resource Sharing

//new added ends

// Middleware to set CORS headers
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

app.get("/", (req, res) => {
  res.json({ message: "hello this is from a server to desktop app" });
});

app.get("/getData", (req, res) => {
  const selectQuery = `
    SELECT proj,name, x, y FROM users
  `;

  db.all(selectQuery, (err, rows) => {
    if (err) {
      console.error("Error fetching data:", err.message);
      res.status(500).json({ error: "Failed to fetch data" });
      return;
    }
    res.json({ data: rows });
  });
});

app.post("/insert", (req, res) => {
  const { proj, nodeName, x, y } = req.body;

  console.log("proj", proj);

  // First delete existing rows for this project
  const deleteQuery = `DELETE FROM users WHERE proj = ?`;

  db.run(deleteQuery, [proj[0]], (err) => {
    if (err) {
      console.error("Error deleting existing rows:", err.message);
      res.status(500).json({ error: "Failed to delete existing rows" });
      return;
    }

    // Build placeholders like (?,?,?) for each item
    const placeholders = nodeName.map(() => "(?,?,?,?)").join(", ");

    // Flatten arrays into a single values array
    const values = [];
    for (let i = 0; i < nodeName.length; i++) {
      values.push(proj[0], nodeName[i], String(x[i]), String(y[i]));
    }

    const insertQuery = `
      INSERT INTO users (proj,name, x, y)
      VALUES ${placeholders};
    `;

    console.log("insertQuery", insertQuery);
    console.log("values", values);

    db.run(insertQuery, values, (err) => {
      if (err) {
        console.error("Error inserting data:", err.message);
        res.status(500).json({ error: "Failed to insert data" });
        return;
      }

      res.json({ message: `Data updated successfully at ${__dirname}` });
    });
  });
});

app.get("/say", (req, res) => {
  res.json({ message: "damn sayyyyy" });
});

app.post("/say", (req, res) => {
  //   const { message } = req.body;
  res.json({ message: "damn sayyyyy" });
});
//new added starts
//start code

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
    console.log("file is there", fs.existsSync(hexPath));
    console.log("file content", fs.readFileSync(hexPath, "utf8"));
    if (fs.existsSync(hexPath)) {
      const hexContent = fs.readFileSync(hexPath, "utf8");
      res.json({ hex: hexContent });
    } else {
      res.status(500).json({ error: "Hex file not generated" });
    }
  });
});

//end code

//end new added

const start = () => {
  app.listen(port, () => {
    console.log(`Server running at http://127.0.0.1:${port}/`);
  });
};

export { start };
