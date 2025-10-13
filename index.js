import express from "express";
import dotenv from "dotenv";
dotenv.config();

const app = express();

let users = [
  { id: 1, name: "Alice", email: "alice@example.com" },
  { id: 2, name: "Bob", email: "bob@example.com" },
];

const PORT = process.env.PORT || 3000;

// simple middleware example
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next(); // pass control to next handler
});

app.use((req, res, next) => {
  console.log(
    `${req.method} ${req.url} - handled at ${new Date().toISOString()}`
  );
  next();
});

// your first route
app.get("/hello", (req, res) => {
  res.json({ message: "Hello, Backend World 👋" });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime().toFixed(2) });
});

// GET all users
app.get("/users", (req, res) => {
  res.json(users);
});

// GET single user
app.get("/users/:id", (req, res) => {
  const user = users.find((u) => u.id === parseInt(req.params.id));
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(user);
});

// POST create new user
app.post("/users", express.json(), (req, res) => {
  const { name, email } = req.body;
  if (!name || !email)
    return res.status(400).json({ error: "Name & email required" });
  const newUser = { id: users.length + 1, name, email };
  users.push(newUser);
  res.status(201).json(newUser);
});

// PUT update user
app.put("/users/:id", express.json(), (req, res) => {
  const user = users.find((u) => u.id === parseInt(req.params.id));
  if (!user) return res.status(404).json({ error: "User not found" });
  const { name, email } = req.body;
  if (name) user.name = name;
  if (email) user.email = email;
  res.json(user);
});

// DELETE user
app.delete("/users/:id", (req, res) => {
  const index = users.findIndex((u) => u.id === parseInt(req.params.id));
  if (index === -1) return res.status(404).json({ error: "User not found" });
  const deleted = users.splice(index, 1);
  res.json(deleted[0]);
});

app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// start server
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
