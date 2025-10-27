import express from "express";
import dotenv from "dotenv";
import { PrismaClient } from "./generated/prisma/index.js";

dotenv.config();

const app = express();

// In Memory users array (for testing without DB)
// let users = [
//   { id: 1, name: "Alice", email: "alice@example.com" },
//   { id: 2, name: "Bob", email: "bob@example.com" },
// ];

const PORT = process.env.PORT || 3000;

const prisma = new PrismaClient();

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
app.get("/users", async (req, res) => {
  const users = await prisma.user.findMany();
  res.json(users);
});

// GET single user
app.get("/users/:id", async (req, res) => {
  // In Memory version
  // const user = users.find((u) => u.id === parseInt(req.params.id));

  const user = await prisma.user.findUnique({
    where: { id: parseInt(req.params.id) },
  });
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(user);
});

// POST create new user
app.post("/users", express.json(), async (req, res) => {
  const { name, email } = req.body;
  if (!name || !email)
    return res.status(400).json({ error: "Name & email required" });

  // In Memory version
  // const newUser = { id: users.length + 1, name, email };
  // users.push(newUser);

  const newUser = await prisma.user.create({ data: { name, email } });
  res.status(201).json(newUser);
});

// PUT update user
app.put("/users/:id", express.json(), async (req, res) => {
  // In Memory version
  // const user = users.find((u) => u.id === parseInt(req.params.id));
  // if (!user) return res.status(404).json({ error: "User not found" });

  // if (name) user.name = name;
  // if (email) user.email = email;

  const { name, email } = req.body;

  const user = await prisma.user.update({
    where: { id: parseInt(req.params.id) },
    data: { name, email },
  });

  res.json(user);
});

// DELETE user
app.delete("/users/:id", async (req, res) => {
  // const index = users.findIndex((u) => u.id === parseInt(req.params.id));
  // if (index === -1) return res.status(404).json({ error: "User not found" });
  // const deleted = users.splice(index, 1);

  const deleted = await prisma.user.delete({
    where: { id: parseInt(req.params.id) },
  });
  res.json(deleted);
});

app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// start server
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
