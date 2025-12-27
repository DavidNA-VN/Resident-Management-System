import express from "express";
import cors from "cors";
// import dotenv from "dotenv";

// dotenv.config(); // Commented out - loaded in server.ts

const app = express();

app.use(cors({ origin: ["http://localhost:5173"], credentials: true }));
app.use(express.json());

export default app;
