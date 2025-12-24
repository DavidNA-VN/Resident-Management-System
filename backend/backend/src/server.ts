import app from "./app";
import healthRoutes from "./routes/health.routes";
import authRoutes from "./routes/auth.routes";
import testRoutes from "./routes/test.routes";
import hokhauRoutes from "./routes/hokhau.routes";
import nhankhauRoutes from "./routes/nhankhau.routes";
const PORT = Number(process.env.PORT || 3000);

app.use(healthRoutes);
app.use(authRoutes);
app.use(testRoutes);
app.use(hokhauRoutes);
app.use(nhankhauRoutes);

app.use((err: any, _req: any, res: any, _next: any) => {
  console.error(err);
  res.status(500).json({
    success: false,
    error: { code: "INTERNAL_ERROR", message: err?.message || "Server error" },
  });
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
