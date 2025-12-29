// auth.middleware.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { query } from "../db";

export type TaskCode =
  | "hokhau_nhankhau"
  | "tamtru_tamvang"
  | "thongke"
  | "kiennghi";

export type RoleCode = "to_truong" | "to_pho" | "can_bo" | "nguoi_dan";

export type AuthUser = {
  id: number;
  username: string;
  role: RoleCode;
  task: TaskCode | null;
  personId?: number | null;
};

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
        error: { code: "FORBIDDEN", message: "Role not allowed" },
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
export const requireTask = (taskRequired: TaskCode) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Missing auth" },
      });
    }

    // Tổ trưởng / tổ phó: full quyền
    if (user.role === "to_truong" || user.role === "to_pho") {
      return next();
    }

    // Cán bộ: đúng task mới được thao tác
    if (user.role === "can_bo") {
      if (user.task === taskRequired) return next();

      return res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: `Not allowed for task '${taskRequired}'`,
        },
      });
    }

    // Người dân / role khác: chặn
    return res.status(403).json({
      success: false,
      error: { code: "FORBIDDEN", message: "Permission denied" },
    });
  };
};
