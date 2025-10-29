// create-large-logs.js
const fs = require("fs");

const FILE_PATH = "./large-logs.txt";
const TARGET_SIZE = 1024 * 1024 * 1024; // 1 GB
const LEVELS = ["INFO", "WARN", "ERROR", "DEBUG"];
const SERVICES = [
  "auth-service",
  "api-gateway",
  "db-connector",
  "payment-service",
  "cache-layer",
];
const MESSAGES = [
  "User logged in",
  "User logged out",
  "Payment processed",
  "Database connection lost",
  "Cache refreshed",
  "Request timed out",
  "File uploaded successfully",
  "Invalid credentials",
  "Fetching data from API",
  "Background job started",
  "Session expired",
  "New order placed",
  "Configuration updated",
  "Token expired",
  "Reconnecting to database",
];

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getTimestamp() {
  const now = new Date();
  now.setSeconds(now.getSeconds() + Math.floor(Math.random() * 100000));
  return now.toISOString().replace("T", " ").replace("Z", "");
}

const stream = fs.createWriteStream(FILE_PATH);
let written = 0;

function writeChunk() {
  let ok = true;
  while (ok && written < TARGET_SIZE) {
    const logLine = `[${getTimestamp()}] ${randomItem(LEVELS)}  ${randomItem(
      SERVICES
    )} - ${randomItem(MESSAGES)}\n`;
    written += Buffer.byteLength(logLine);
    if (written >= TARGET_SIZE) {
      stream.write(logLine);
      console.log(`✅ Done! Generated ${FILE_PATH} (~1GB)`);
      stream.end();
      return;
    }
    ok = stream.write(logLine);
  }
  if (written < TARGET_SIZE) stream.once("drain", writeChunk);
}

writeChunk();
