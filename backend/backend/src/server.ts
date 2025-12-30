import express from "express";
import app from "./app";
import authRoutes from "./routes/auth.routes";
import hokhauRoutes from "./routes/hokhau.routes";
import nhankhauRoutes from "./routes/nhankhau.routes";
import citizenRoutes from "./routes/citizen.routes";
import requestsRoutes from "./routes/requests.routes";
// Optional: mount other routes when ready
// import healthRoutes from "./routes/health.routes";
// import testRoutes from "./routes/test.routes";
// import hokhauRoutes from "./routes/hokhau.routes";
// import nhankhauRoutes from "./routes/nhankhau.routes";
// import citizenRoutes from "./routes/citizen.routes";
// import requestsRoutes from "./routes/requests.routes";
import feedbackRoutes from "./routes/feedback.routes";
import path from "path";
import dotenv from "dotenv";
import thongKeRoutes from "./routes/thongke.routes";
import dashboardRoutes from "./routes/dashboard.routes";
// Load environment variables
dotenv.config();

// Simple health route inline
app.get("/api/health", (_req, res) => {
  res.json({ success: true, message: "Server running" });
});

// Test db import
// import { query } from "./db";
// console.log("DB imported successfully");

const PORT = Number(process.env.PORT || 3000);

// Function to find available port starting from specified port
async function findAvailablePort(startPort: number): Promise<number> {
  const net = await import("net");

  for (let port = startPort; port < startPort + 100; port++) {
    try {
      await new Promise((resolve, reject) => {
        const server = net.createServer();
        server.listen(port, () => {
          server.close(() => resolve(port));
        });
        server.on("error", () => reject(new Error(`Port ${port} is in use`)));
      });
      return port;
    } catch (error) {
      console.log(`Port ${port} is in use, trying next...`);
      continue;
    }
  }
  throw new Error(`No available ports found starting from ${startPort}`);
}
app.use("/api/thongke", thongKeRoutes);
// Mount API routes under /api to standardize frontend/backend prefix
// Mount only auth routes for now to enable login
app.use("/api", authRoutes);
// Mount household and person routes so FE requests to /api/ho-khau and /api/nhan-khau are handled
app.use("/api", hokhauRoutes);
app.use("/api", nhankhauRoutes);
// Mount citizen routes (for endpoints like /api/citizen/household)
app.use("/api", citizenRoutes);
// Mount requests routes (create requests, leader endpoints)
app.use("/api", requestsRoutes);
// app.use("/api", healthRoutes);
// app.use("/api", testRoutes);
// app.use("/api", hokhauRoutes);
// app.use("/api", nhankhauRoutes);
// app.use("/api", citizenRoutes);
// app.use("/api", requestsRoutes); // Commented out - causes errorMissingColumn
app.use("/api", feedbackRoutes);
app.use("/api", dashboardRoutes);

// Serve uploaded files statically
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.use((err: any, _req: any, res: any, _next: any) => {
  console.error(err);
  res.status(500).json({
    success: false,
    error: { code: "INTERNAL_ERROR", message: err?.message || "Server error" },
  });
});

// Start server with port fallback logic
async function startServer() {
  try {
    const availablePort = await findAvailablePort(PORT);
    app.listen(availablePort, () => {
      console.log(`✅ Backend running on http://localhost:${availablePort}`);
      console.log(`✅ API available at http://localhost:${availablePort}/api`);
      if (availablePort !== PORT) {
        console.log(
          `⚠️  Port ${PORT} was occupied, using ${availablePort} instead`
        );
        console.log(
          `💡 To use port ${PORT} next time, kill process using: taskkill /PID <PID> /F`
        );
      }
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
