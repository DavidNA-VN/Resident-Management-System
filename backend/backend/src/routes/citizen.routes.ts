import { Router } from "express";
import { query } from "../db";
import { requireAuth, requireRole } from "../middlewares/auth.middleware";

const router = Router();

/**
 * GET /citizen/household
 * Lấy hộ khẩu của người dân hiện tại (dựa vào userId trong nhan_khau)
 */
router.get("/citizen/household", requireAuth, requireRole(["nguoi_dan"]), async (req, res, next) => {
  try {
    const userId = req.user!.id;

    // Tìm nhân khẩu của user này
    const nhanKhauResult = await query(
      `SELECT id, "hoKhauId" FROM nhan_khau WHERE "userId" = $1 LIMIT 1`,
      [userId]
    );

    if (nhanKhauResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Không tìm thấy nhân khẩu liên kết với tài khoản này",
        },
      });
    }

    const nhanKhau = nhanKhauResult.rows[0];
    const hoKhauId = nhanKhau.hoKhauId;

    // Lấy thông tin hộ khẩu
    const hoKhauResult = await query(
      `SELECT * FROM ho_khau WHERE id = $1`,
      [hoKhauId]
    );

    if (hoKhauResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Không tìm thấy hộ khẩu",
        },
      });
    }

    const hoKhau = hoKhauResult.rows[0];

    // Lấy danh sách nhân khẩu trong hộ
    const membersResult = await query(
      `SELECT * FROM nhan_khau WHERE "hoKhauId" = $1 ORDER BY 
        CASE "quanHe" 
          WHEN 'chu_ho' THEN 1 
          ELSE 2 
        END, "createdAt" ASC`,
      [hoKhauId]
    );

    // Tìm chủ hộ
    let chuHo = null;
    if (hoKhau.chuHoId) {
      const chuHoResult = await query(
        `SELECT * FROM nhan_khau WHERE id = $1`,
        [hoKhau.chuHoId]
      );
      if (chuHoResult.rowCount > 0) {
        chuHo = chuHoResult.rows[0];
      }
    }

    return res.json({
      success: true,
      data: {
        household: hoKhau,
        members: membersResult.rows,
        chuHo: chuHo || undefined,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;


