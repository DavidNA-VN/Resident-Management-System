import { Router } from "express";
import { query } from "../db";
import { requireAuth, requireRole } from "../middlewares/auth.middleware";

const router = Router();

/**
 * POST /feedback
 * Tạo phản ánh mới (chỉ dành cho người dân)
 */
router.post("/feedback", requireAuth, requireRole(["nguoi_dan"]), async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { tieuDe, noiDung, loai } = req.body;

    // Validation
    if (!tieuDe || !noiDung) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Missing tieuDe or noiDung",
        },
      });
    }

    const validLoai = [
      "co_so_ha_tang",
      "moi_truong",
      "an_ninh",
      "y_te",
      "giao_duc",
      "khac",
    ];

    const finalLoai = loai && validLoai.includes(loai) ? loai : "khac";

    // Insert vào bảng phan_anh
    const result = await query(
      `INSERT INTO phan_anh 
       ("tieuDe", "noiDung", "nguoiPhanAnh", loai, "trangThai")
       VALUES ($1, $2, $3, $4, 'cho_xu_ly')
       RETURNING *`,
      [tieuDe, noiDung, userId, finalLoai]
    );

    return res.status(201).json({
      success: true,
      data: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /feedback/me
 * Lấy danh sách phản ánh của người dân hiện tại
 */
router.get("/feedback/me", requireAuth, requireRole(["nguoi_dan"]), async (req, res, next) => {
  try {
    const userId = req.user!.id;

    const result = await query(
      `SELECT id, "tieuDe", "noiDung", loai, "trangThai", "ngayTao", "updatedAt"
       FROM phan_anh
       WHERE "nguoiPhanAnh" = $1
       ORDER BY "ngayTao" DESC`,
      [userId]
    );

    return res.json({
      success: true,
      data: result.rows,
    });
  } catch (err) {
    next(err);
  }
});

export default router;


