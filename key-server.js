import express from "express";
import dotenv from "dotenv";

dotenv.config();

const PORT = process.env.PORT || 3000;

const app = express();

let keys = [];

function generateRandomKey(length) {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

// simple middleware example
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next(); // pass control to next handler
});

// your first route
app.get("/hello", (req, res) => {
  res.json({ message: "Hello, Backend World 👋" });
});

// An endpoint to create new keys.
// Each generated key has a life of 5 mins after which it gets deleted if not for keep alive (more details below)
app.post("/keys", express.json(), (req, res) => {
  const newKey = {
    keyId: generateRandomKey(8),
    isBlocked: false,
    createdAt: new Date(),
    blockedAt: null,
  };

  const timerId = setTimeout(() => {
    const filteredKeys = keys.filter((k) => k.keyId !== newKey.keyId);
    keys = filteredKeys;
  }, 5 * 60 * 1000);

  keys.push({ ...newKey, timerId: timerId });

  res.status(201).json({
    keyId: newKey.keyId,
    isBlocked: newKey.isBlocked,
    createdAt: newKey.createdAt,
    blockedAt: newKey.blockedAt,
  });
});

// An endpoint to retrieve an available key, ensuring the key is randomly selected and not currently in use.
// This key should then be blocked from being served again until its status changes.
// If no keys are available, a 404 error should be returned.
app.get("/keys", (req, res) => {
  const availableKeys = keys.filter((key) => !key.isBlocked);
  if (availableKeys.length === 0) {
    return res.status(404).json({ error: "No available keys" });
  }
  const randomIndex = Math.floor(Math.random() * availableKeys.length);
  const selectedKey = availableKeys[randomIndex];
  selectedKey.isBlocked = true;
  selectedKey.blockedAt = new Date();

  // Create a clean object without the timerId before sending
  const responseKey = {
    keyId: selectedKey.keyId,
    isBlocked: selectedKey.isBlocked,
    createdAt: selectedKey.createdAt,
    blockedAt: selectedKey.blockedAt,
  };

  // Automatically release blocked keys within 60 seconds if not unblocked explicitly.
  setTimeout(() => {
    const updatedKeys = keys.map((k) => {
      if (k.keyId === responseKey.keyId) {
        return { ...k, isBlocked: false, blockedAt: null };
      } else return k;
    });

    keys = updatedKeys;
  }, 60 * 1000);

  res.status(200).json(responseKey);
});

// GET /keys/:id: Provide information (e.g., assignment timestamps) about a specific key.
app.get("/keys/:id", (req, res) => {
  const selectedKey = keys.find((k) => k.keyId === req.params.id);
  if (!selectedKey) {
    return res.status(404).json({ error: "Invalid key" });
  }

  // Create a clean object without the timerId before sending
  const responseKey = {
    keyId: selectedKey.keyId,
    isBlocked: selectedKey.isBlocked,
    createdAt: selectedKey.createdAt,
    blockedAt: selectedKey.blockedAt,
  };

  res.status(200).json(responseKey);
});

// An endpoint to unblock a previously assigned key, making it available for reuse.
app.put("/keys/:id", express.json(), (req, res) => {
  const key = keys.find((k) => k.keyId === req.params.id);
  if (!key) {
    return res.status(404).json({ error: "Invalid key" });
  }
  key.isBlocked = false;
  key.blockedAt = null;

  // Send back only the updated key
  const responseKey = {
    keyId: key.keyId,
    isBlocked: key.isBlocked,
    createdAt: key.createdAt,
    blockedAt: key.blockedAt,
  };

  res.status(200).json(responseKey);
});

// DELETE /keys/:id: Remove a specific key, identified by :id, from the system.
app.delete("/keys/:id", (req, res) => {
  if (!req.params.id) {
    return res.status(404).json({ error: "Invalid key" });
  }
  const filteredKeys = keys.filter((k) => k.keyId !== req.params.id);
  keys = filteredKeys;

  console.log(`Removed key: ${req.params.id}`);

  // Send back a success message instead of the filtered array
  res.status(200).json({ message: "Key successfully deleted" });
});

// PUT /keepalive/:id: Signal the server to keep the specified key, identified by :id, from being deleted.
app.put("/keepalive/:id", express.json(), (req, res) => {
  const keepAliveKey = keys.find((k) => k.keyId === req.params.id);

  if (!keepAliveKey) {
    return res.status(404).json({ error: "Invalid key" });
  }

  clearTimeout(keepAliveKey.timerId);

  const newTimerId = setTimeout(() => {
    const filteredKeys = keys.filter((k) => k.keyId !== keepAliveKey.keyId);
    keys = filteredKeys;
  }, 5 * 60 * 1000);

  const updatedKeys = keys.map((k) => {
    if (k.keyId === keepAliveKey.keyId) {
      return { ...k, timerId: newTimerId };
    } else return k;
  });

  keys = updatedKeys;
});

app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// start server
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
