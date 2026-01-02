"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const app_1 = __importDefault(require("./app"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const hokhau_routes_1 = __importDefault(require("./routes/hokhau.routes"));
const nhankhau_routes_1 = __importDefault(require("./routes/nhankhau.routes"));
const citizen_routes_1 = __importDefault(require("./routes/citizen.routes"));
const requests_routes_1 = __importDefault(require("./routes/requests.routes"));
// Optional: mount other routes when ready
// import healthRoutes from "./routes/health.routes";
// import testRoutes from "./routes/test.routes";
// import hokhauRoutes from "./routes/hokhau.routes";
// import nhankhauRoutes from "./routes/nhankhau.routes";
// import citizenRoutes from "./routes/citizen.routes";
// import requestsRoutes from "./routes/requests.routes";
const feedback_routes_1 = __importDefault(require("./routes/feedback.routes"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
const thongke_routes_1 = __importDefault(require("./routes/thongke.routes"));
const dashboard_routes_1 = __importDefault(require("./routes/dashboard.routes"));
// Load environment variables
dotenv_1.default.config();
// Simple health route inline
app_1.default.get("/api/health", (_req, res) => {
    res.json({ success: true, message: "Server running" });
});
// Test db import
// import { query } from "./db";
// console.log("DB imported successfully");
const PORT = Number(process.env.PORT || 3000);
// Function to find available port starting from specified port
async function findAvailablePort(startPort) {
    const net = await Promise.resolve().then(() => __importStar(require("net")));
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
        }
        catch (error) {
            console.log(`Port ${port} is in use, trying next...`);
            continue;
        }
    }
    throw new Error(`No available ports found starting from ${startPort}`);
}
app_1.default.use("/api/thongke", thongke_routes_1.default);
// Mount API routes under /api to standardize frontend/backend prefix
// Mount only auth routes for now to enable login
app_1.default.use("/api", auth_routes_1.default);
// Mount household and person routes so FE requests to /api/ho-khau and /api/nhan-khau are handled
app_1.default.use("/api", hokhau_routes_1.default);
app_1.default.use("/api", nhankhau_routes_1.default);
// Mount citizen routes (for endpoints like /api/citizen/household)
app_1.default.use("/api", citizen_routes_1.default);
// Mount requests routes (create requests, leader endpoints)
app_1.default.use("/api", requests_routes_1.default);
// app.use("/api", healthRoutes);
// app.use("/api", testRoutes);
// app.use("/api", hokhauRoutes);
// app.use("/api", nhankhauRoutes);
// app.use("/api", citizenRoutes);
// app.use("/api", requestsRoutes); // Commented out - causes errorMissingColumn
app_1.default.use("/api", feedback_routes_1.default);
app_1.default.use("/api", dashboard_routes_1.default);
// Serve uploaded files statically
app_1.default.use("/uploads", express_1.default.static(path_1.default.join(__dirname, "../uploads")));
app_1.default.use((err, _req, res, _next) => {
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
        app_1.default.listen(availablePort, () => {
            console.log(`✅ Backend running on http://localhost:${availablePort}`);
            console.log(`✅ API available at http://localhost:${availablePort}/api`);
            if (availablePort !== PORT) {
                console.log(`⚠️  Port ${PORT} was occupied, using ${availablePort} instead`);
                console.log(`💡 To use port ${PORT} next time, kill process using: taskkill /PID <PID> /F`);
            }
        });
    }
    catch (error) {
        console.error("❌ Failed to start server:", error);
        process.exit(1);
    }
}
startServer();
