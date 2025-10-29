import * as fs from "fs/promises"; // Using promises for async operations
import { watch } from "fs";
import { createReadStream } from "fs";
import express from "express";
import dotenv from "dotenv";
import { WebSocketServer, WebSocket } from "ws";

dotenv.config();

const PORT = process.env.PORT || 3000;

const app = express();

let lines = [];

let prevFileSize;

const wss = new WebSocketServer({ port: 8080 });

// Register WebSocket connection handler once
wss.on("connection", (ws) => {
  console.log("Client connected");

  // Send current lines to the newly connected client
  ws.send(JSON.stringify(lines.slice(-10)));

  // Handle messages received from the client
  ws.on("message", (message) => {
    console.log(`Received from client: ${message}`);
  });

  // Handle client disconnections
  ws.on("close", () => {
    console.log("Client disconnected");
  });

  // Handle errors
  ws.on("error", (error) => {
    console.error("WebSocket error:", error);
  });
});

async function readLastNBytes(filePath, nBytes) {
  try {
    const stats = await fs.stat(filePath);
    const fileSize = stats.size;
    prevFileSize = fileSize;

    // Calculate the starting position for reading the last N bytes
    let startPosition = fileSize - nBytes;
    let endPosition = fileSize;

    if (nBytes >= fileSize) {
      // If N is greater than or equal to the file size, read the entire file
      const data = await fs.readFile(filePath);
      return data;
    } else {
      while (startPosition >= 0) {
        const chunk = await new Promise((resolve, reject) => {
          const stream = createReadStream(filePath, {
            start: startPosition,
            end: endPosition,
          });
          const chunks = [];

          stream.on("data", (chunk) => {
            chunks.push(chunk);
          });

          stream.on("end", () => {
            resolve(Buffer.concat(chunks));
          });

          stream.on("error", (err) => {
            reject(err);
          });
        });

        const chunkedString = chunk.toString("utf-8");

        const splitLinesArr = chunkedString.split("\n");

        lines = [...splitLinesArr, ...lines];

        if (lines.length >= 10) {
          // Keep only the last 10 lines
          lines = lines.slice(-10);
          return lines;
        }

        endPosition = startPosition;
        startPosition = startPosition - nBytes;
      }

      // If we couldn't find 10 lines, return what we have
      return lines;
    }
  } catch (error) {
    console.error("Error reading file:", error);
    throw error;
  }
}

async function watchForFileChanges(filePath) {
  let newLines = [];

  watch(filePath, {}, async (eventType) => {
    if (eventType === "change") {
      try {
        // Calculate the starting position for reading the new lines
        let startPosition = prevFileSize + 1;

        const chunk = await new Promise((resolve, reject) => {
          const stream = createReadStream(filePath, {
            start: startPosition,
          });
          const chunks = [];

          stream.on("data", (chunk) => {
            chunks.push(chunk);
          });

          stream.on("end", () => {
            resolve(Buffer.concat(chunks));
          });

          stream.on("error", (err) => {
            reject(err);
          });
        });

        const chunkedString = chunk.toString("utf-8");
        const splitLinesArr = chunkedString.split("\n");

        // Add new lines to the accumulated lines array
        newLines = [...newLines, ...splitLinesArr];

        console.log(`Watching for changes in "${filePath}"...`);

        console.log("🚀 ~ watchForFileChanges new lines:", splitLinesArr);

        const stats = await fs.stat(filePath);
        const fileSize = stats.size;

        // Update prevFileSize
        prevFileSize = fileSize;

        // Broadcast only the NEW lines to all connected clients
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(newLines));
          }
        });
        console.log("Sent new newLines to clients");

        return newLines;
      } catch (e) {}
    }
  });
}

app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// start server
app.listen(PORT, async () => {
  const filePath = "text-dump.txt";
  const nBytesToRead = 512;

  try {
    // const lastBytesBuffer = await readLastNBytes(filePath, nBytesToRead);
    // const string = lastBytesBuffer.toString("utf8");
    const firstTenLines = await readLastNBytes(filePath, nBytesToRead);
    console.log("🚀 ~ firstTenLines:", firstTenLines);

    await watchForFileChanges(filePath);
  } catch (error) {
    // Error handling
  } finally {
  }
  console.log(`Server is running at http://localhost:${PORT}`);
});
