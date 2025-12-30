// auth.middleware.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { query } from "../db";

export type TaskCode =
  | "hokhau_nhankhau"
  | "tamtru_tamvang"
  | "thongke"
  | "kiennghi";

export type RoleCode =
  | "admin"
  | "to_truong"
  | "to_pho"
  | "can_bo"
  | "nguoi_dan";

export type AuthUser = {
  id: number;
  username: string;
  role: RoleCode;
  task: TaskCode | null;
  personId?: number | null;
};

const taskLabels: Record<TaskCode, string> = {
  hokhau_nhankhau: "Hộ khẩu / Nhân khẩu",
  tamtru_tamvang: "Tạm trú / Tạm vắng",
  thongke: "Thống kê",
  kiennghi: "Phản ánh / Kiến nghị",
};

function normalizeTaskRequired(taskRequired: TaskCode | TaskCode[]): TaskCode[] {
  return Array.isArray(taskRequired) ? taskRequired : [taskRequired];
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/**
 * requireAuth:
 * - Expect header: Authorization: Bearer <token>
 * - Verify JWT
 * - Load user (role + task) from DB
 * - Attach req.user
 */
export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Missing token" },
      });
    }

    const token = auth.slice("Bearer ".length).trim();
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      // cấu hình server lỗi -> 500 để dễ debug
      return res.status(500).json({
        success: false,
        error: { code: "INTERNAL_ERROR", message: "JWT_SECRET missing" },
      });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, secret);
    } catch (err: any) {
      // TokenExpiredError / JsonWebTokenError
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Invalid or expired token" },
      });
    }

    const userId = Number(decoded?.userId);
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Invalid token payload" },
      });
    }

    const r = await query(
      `SELECT id, username, role, task, "personId"
       FROM users
       WHERE id = $1 AND "isActive" = true`,
      [userId]
    );

    if (r.rowCount === 0) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "User not found or inactive" },
      });
    }

    const u = r.rows[0];

    // Normalize user (tránh task undefined / sai kiểu runtime)
    req.user = {
      id: Number(u.id),
      username: String(u.username),
      role: u.role as RoleCode,
      task: (u.task ?? null) as TaskCode | null,
      personId: u.personId ? Number(u.personId) : null,
    };

    return next();
  } catch (err) {
    // Lỗi bất ngờ (DB down, query fail...)
    return res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Auth middleware error" },
    });
  }
};

/**
 * requireRole:
 * Dùng khi bạn vẫn muốn chặn theo role (optional)
 * Lưu ý: phải đặt sau requireAuth
 */
export const requireRole = (roles: RoleCode[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Missing auth" },
      });
    }

    if (!roles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        error: { code: "FORBIDDEN", message: "Bạn không có quyền truy cập" },
      });
    }

    return next();
  };
};

/**
 * requireTask:
 * - to_truong / to_pho: full quyền, luôn pass
 * - can_bo: phải đúng task được phân
 * - role khác: chặn
 * Lưu ý: phải đặt sau requireAuth
 */
export const requireAnyTask = (taskRequired: TaskCode | TaskCode[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Missing auth" },
      });
    }

    // Admin / Tổ trưởng / Tổ phó: full quyền
    if (user.role === "admin" || user.role === "to_truong" || user.role === "to_pho") {
      return next();
    }

    // Cán bộ: đúng task mới được thao tác
    if (user.role === "can_bo") {
      const required = normalizeTaskRequired(taskRequired);
      if (user.task && required.includes(user.task)) return next();

      return res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: `Bạn không được phân công xử lý chức năng này (yêu cầu tác vụ: ${required
            .map((t) => taskLabels[t] || t)
            .join(" hoặc ")}).`,
        },
      });
    }

    // Người dân / role khác: chặn
    return res.status(403).json({
      success: false,
      error: { code: "FORBIDDEN", message: "Bạn không có quyền truy cập" },
    });
  };
};

/**
 * Backward-compatible: require a single task.
 */
export const requireTask = (taskRequired: TaskCode) => requireAnyTask(taskRequired);

/**
 * Allow if role is in `roles` OR (user is can_bo and task in `tasks`).
 * Admin/to_truong/to_pho will pass if included in roles (recommended).
 */
export const requireRoleOrAnyTask = (roles: RoleCode[], tasks: TaskCode[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Missing auth" },
      });
    }

    if (roles.includes(user.role)) return next();

    if (user.role === "can_bo" && user.task && tasks.includes(user.task)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      error: { code: "FORBIDDEN", message: "Bạn không có quyền truy cập" },
    });
  };
};
