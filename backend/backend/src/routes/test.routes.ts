import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/auth.middleware";

const router = Router();

// chỉ cần đăng nhập
router.get("/test/protected", requireAuth, (req, res) => {
  res.json({ success: true, message: "You are authenticated" });
});

// chỉ role can_bo mới vào
router.get("/test/admin", requireAuth, requireRole(["can_bo"]), (req, res) => {
  res.json({ success: true, message: "You are can_bo" });
});

export default router;
