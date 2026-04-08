import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(__dirname, "dist");
const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.static(dist));

app.get("*", (_req, res) => {
  res.sendFile(path.join(dist, "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
