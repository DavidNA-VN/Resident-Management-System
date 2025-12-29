import express from "express";
import cors from "cors";
// import dotenv from "dotenv";

// dotenv.config(); // Commented out - loaded in server.ts
import thongKeRoutes from './routes/thongke.routes';
const app = express();

app.use(cors({ origin: ["http://localhost:5173"], credentials: true }));
app.use(express.json());
app.use('/api/thongke', thongKeRoutes);
export default app;
