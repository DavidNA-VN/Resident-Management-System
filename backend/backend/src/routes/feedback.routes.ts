import { Router } from "express";
import { query } from "../db";
import { feedbackController } from "../controllers/feedback.controller";
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

    // Bắt đầu Transaction để đảm bảo tính đồng bộ giữa 2 bảng
    await query('BEGIN');

    // Insert vào bảng phan_anh
    // Đã thêm cột "soLanPhanAnh" khởi tạo là 1
    const result = await query(
      `INSERT INTO phan_anh 
        ("tieuDe", "noiDung", "nguoiPhanAnh", loai, "trangThai", "soLanPhanAnh")
        VALUES ($1, $2, $3, $4, 'cho_xu_ly', 1)
        RETURNING *`,
      [tieuDe, noiDung, userId, finalLoai]
    );

    const pa = result.rows[0];

    // QUAN TRỌNG: Lưu ngay vào bảng trung gian phan_anh_nguoi để hiện tên người gửi
    await query(
      `INSERT INTO phan_anh_nguoi ("phanAnhId", "nguoiPhanAnhId") VALUES ($1, $2)`,
      [pa.id, userId]
    );

    await query('COMMIT');

    return res.status(201).json({
      success: true,
      data: pa,
    });
  } catch (err) {
    await query('ROLLBACK');
    next(err);
  }
});

/**
 * POST /phan-anh
 * Tạo phản ánh mới liên kết với nhân khẩu (cho cả cán bộ/tổ trưởng/ người dân)
 */
router.post("/phan-anh", requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { tieuDe, noiDung, loai, nhanKhauId } = req.body;

    if (!tieuDe || !noiDung) {
      return res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Missing tieuDe or noiDung" },
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

    await query('BEGIN');

    const result = await query(
      `INSERT INTO phan_anh
        ("tieuDe", "noiDung", "nguoiPhanAnh", loai, "trangThai", "soLanPhanAnh")
        VALUES ($1, $2, $3, $4, 'cho_xu_ly', 1)
        RETURNING *`,
      [tieuDe, noiDung, userId, finalLoai]
    );

    const pa = result.rows[0];

    // Lưu người tạo vào bảng trung gian ngay lập tức
    await query(
      `INSERT INTO phan_anh_nguoi ("phanAnhId", "nguoiPhanAnhId") VALUES ($1, $2)`,
      [pa.id, userId]
    );

    // If nhanKhauId provided and linked to a user, create phan_anh_nguoi mapping for tracking
    if (nhanKhauId) {
      // find user linked to this nhan_khau (if any)
      const linked = await query(`SELECT "userId" FROM nhan_khau WHERE id = $1`, [Number(nhanKhauId)]);
      const linkedUserId = linked.rows[0]?.userId;
      if (linkedUserId && linkedUserId !== userId) {
        await query(
          `INSERT INTO phan_anh_nguoi ("phanAnhId","nguoiPhanAnhId") VALUES ($1,$2)
            ON CONFLICT DO NOTHING`,
          [pa.id, linkedUserId]
        );
      }
    }

    await query('COMMIT');
    return res.status(201).json({ success: true, data: pa });
  } catch (err) {
    await query('ROLLBACK');
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

// Các route quản lý Feedbacks gọi từ Controller
/**
 * GET /feedbacks
 * Lấy danh sách phản ánh/kiến nghị (phân trang, lọc trạng thái, phân loại)
 */
router.get("/feedbacks", requireAuth, feedbackController.list);

/**
 * GET /feedbacks/:id
 * Xem chi tiết một phản ánh, kèm danh sách người phản ánh và phản hồi
 */
router.get("/feedbacks/:id", requireAuth, feedbackController.detail);

/**
 * PATCH /feedbacks/:id/status
 * Cập nhật trạng thái phản ánh (chỉ ADMIN/TỔ TRƯỞNG)
 */
router.patch("/feedbacks/:id/status", requireAuth, requireRole(["admin", "to_truong"]), feedbackController.updateStatus);

/**
 * POST /feedbacks/:id/response
 * Ghi nhận phản hồi từ cơ quan chức năng (chỉ ADMIN/TỔ TRƯỞNG)
 */
router.post("/feedbacks/:id/response", requireAuth, requireRole(["admin", "to_truong"]), feedbackController.addResponse);

/**
 * POST /feedbacks/merge
 * Gộp các phản ánh trùng nhau (chỉ ADMIN/TỔ TRƯỞNG)
 */
router.post("/feedbacks/merge", requireAuth, requireRole(["admin", "to_truong"]), feedbackController.merge);

/**
 * POST /feedbacks/:id/notify
 * Gửi thông báo cho người dân khi phản ánh có phản hồi hoặc thay đổi trạng thái
 */
router.post("/feedbacks/:id/notify", requireAuth, requireRole(["admin", "to_truong"]), feedbackController.notify);

export default router;