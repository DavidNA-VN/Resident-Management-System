import { Router } from "express";
import jwt from "jsonwebtoken";
import { query } from "../db";
import { requireAuth, RoleCode, TaskCode } from "../middlewares/auth.middleware";

const router = Router();

// POST /auth/register
router.post("/auth/register", async (req, res, next) => {
  try {
    const { username, password, fullName, role, task } = req.body as {
      username?: string;
      password?: string;
      fullName?: string;
      role?: string;
      task?: string;
    };

    // Validation: thiếu field required
    if (!username || !password || !fullName || !role) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Missing required fields: username, password, fullName, role",
        },
      });
    }

    // Validation: role không hợp lệ
    const validRoles: RoleCode[] = ["to_truong", "to_pho", "can_bo", "nguoi_dan"];
    if (!validRoles.includes(role as RoleCode)) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: `Invalid role. Must be one of: ${validRoles.join(", ")}`,
        },
      });
    }

    // Validation: role="can_bo" mà thiếu task
    if (role === "can_bo" && !task) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Missing task for can_bo",
        },
      });
    }

    // Validation: task không hợp lệ (nếu có)
    if (task) {
      const validTasks: TaskCode[] = [
        "hokhau_nhankhau",
        "tamtru_tamvang",
        "thongke",
        "kiennghi",
      ];
      if (!validTasks.includes(task as TaskCode)) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: `Invalid task. Must be one of: ${validTasks.join(", ")}`,
          },
        });
      }
    }

    // Force task = NULL nếu role != "can_bo"
    const finalTask = role === "can_bo" ? task : null;

    // Check uniqueness: username đã tồn tại
    const checkUser = await query(
      `SELECT id FROM users WHERE username = $1`,
      [username]
    );

    if (checkUser.rowCount && checkUser.rowCount > 0) {
      return res.status(409).json({
        success: false,
        error: {
          code: "USERNAME_EXISTS",
          message: "Username already exists",
        },
      });
    }

    // Insert user vào database
    const result = await query(
      `INSERT INTO users (username, password, role, "fullName", task, "isActive")
       VALUES ($1, $2, $3, $4, $5, TRUE)
       RETURNING id, username, role, "fullName", task`,
      [username, password, role, fullName, finalTask]
    );

    return res.status(201).json({
      success: true,
      data: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
});

// POST /auth/login
router.post("/auth/login", async (req, res, next) => {
  try {
    const { username, password } = req.body as { username?: string; password?: string };

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Missing username or password" },
      });
    }

    const result = await query(
      `SELECT id, username, password, role, "fullName"
       FROM users
       WHERE username = $1 AND "isActive" = true`,
      [username]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({
        success: false,
        error: { code: "INVALID_CREDENTIALS", message: "Invalid username or password" },
      });
    }

    const user = result.rows[0] as any;

    // DEMO: password plaintext (sau này đổi bcrypt)
    if (user.password !== password) {
      return res.status(401).json({
        success: false,
        error: { code: "INVALID_CREDENTIALS", message: "Invalid username or password" },
      });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({
        success: false,
        error: { code: "CONFIG_ERROR", message: "Missing JWT_SECRET" },
      });
    }

    const accessToken = jwt.sign(
      { userId: user.id, role: user.role },
      secret,
      { expiresIn: "1d" }
    );

    return res.json({
      success: true,
      data: {
        accessToken,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          fullName: user["fullName"],
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /auth/me (lấy thông tin user hiện tại từ req.user do requireAuth inject)
router.get("/auth/me", requireAuth, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: { code: "UNAUTHORIZED", message: "Missing auth" },
    });
  }

  return res.json({
    success: true,
    data: req.user,
  });
});

export default router;
