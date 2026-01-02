"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const feedback_controller_1 = require("../controllers/feedback.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
/**
 * POST /feedback
 * Tạo phản ánh mới (chỉ dành cho người dân)
 */
router.post("/feedback", auth_middleware_1.requireAuth, (0, auth_middleware_1.requireRole)(["nguoi_dan"]), async (req, res, next) => {
    try {
        const userId = req.user.id;
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
        await (0, db_1.query)("BEGIN");
        // Insert vào bảng phan_anh
        // Đã thêm cột "soLanPhanAnh" khởi tạo là 1
        const result = await (0, db_1.query)(`INSERT INTO phan_anh 
        ("tieuDe", "noiDung", "nguoiPhanAnh", loai, "trangThai", "soLanPhanAnh")
        VALUES ($1, $2, $3, $4, 'cho_xu_ly', 1)
        RETURNING *`, [tieuDe, noiDung, userId, finalLoai]);
        const pa = result.rows[0];
        // QUAN TRỌNG: Lưu ngay vào bảng trung gian phan_anh_nguoi để hiện tên người gửi
        await (0, db_1.query)(`INSERT INTO phan_anh_nguoi ("phanAnhId", "nguoiPhanAnhId") VALUES ($1, $2)`, [pa.id, userId]);
        await (0, db_1.query)("COMMIT");
        return res.status(201).json({
            success: true,
            data: pa,
        });
    }
    catch (err) {
        await (0, db_1.query)("ROLLBACK");
        next(err);
    }
});
/**
 * POST /phan-anh
 * Tạo phản ánh mới liên kết với nhân khẩu.
 * - Người dân: được tạo
 * - Cán bộ: chỉ task Kiến nghị
 * - Tổ trưởng/Tổ phó/Admin: được tạo
 */
router.post("/phan-anh", auth_middleware_1.requireAuth, (0, auth_middleware_1.requireRoleOrAnyTask)(["nguoi_dan", "to_truong", "to_pho", "admin"], ["kiennghi"]), async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { tieuDe, noiDung, loai, nhanKhauId } = req.body;
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
        await (0, db_1.query)("BEGIN");
        const result = await (0, db_1.query)(`INSERT INTO phan_anh
        ("tieuDe", "noiDung", "nguoiPhanAnh", loai, "trangThai", "soLanPhanAnh")
        VALUES ($1, $2, $3, $4, 'cho_xu_ly', 1)
        RETURNING *`, [tieuDe, noiDung, userId, finalLoai]);
        const pa = result.rows[0];
        // Lưu người tạo vào bảng trung gian ngay lập tức
        await (0, db_1.query)(`INSERT INTO phan_anh_nguoi ("phanAnhId", "nguoiPhanAnhId") VALUES ($1, $2)`, [pa.id, userId]);
        // If nhanKhauId provided and linked to a user, create phan_anh_nguoi mapping for tracking
        if (nhanKhauId) {
            // find user linked to this nhan_khau (if any)
            const linked = await (0, db_1.query)(`SELECT "userId" FROM nhan_khau WHERE id = $1`, [Number(nhanKhauId)]);
            const linkedUserId = linked.rows[0]?.userId;
            if (linkedUserId && linkedUserId !== userId) {
                await (0, db_1.query)(`INSERT INTO phan_anh_nguoi ("phanAnhId","nguoiPhanAnhId") VALUES ($1,$2)
            ON CONFLICT DO NOTHING`, [pa.id, linkedUserId]);
            }
        }
        await (0, db_1.query)("COMMIT");
        return res.status(201).json({ success: true, data: pa });
    }
    catch (err) {
        await (0, db_1.query)("ROLLBACK");
        next(err);
    }
});
/**
 * GET /feedback/me
 * Lấy danh sách phản ánh của người dân hiện tại kèm nội dung phản hồi
 */
router.get("/feedback/me", auth_middleware_1.requireAuth, (0, auth_middleware_1.requireRole)(["nguoi_dan"]), async (req, res, next) => {
    try {
        const userId = req.user.id;
        // SỬA TẠI ĐÂY: Thêm cột "ketQuaXuLy" và "ngayXuLy" để người dân thấy phản hồi
        const result = await (0, db_1.query)(`SELECT id, "tieuDe", "noiDung", loai, "trangThai", "ngayTao", "updatedAt", "ketQuaXuLy", "ngayXuLy"
        FROM phan_anh
        WHERE "nguoiPhanAnh" = $1
        ORDER BY "ngayTao" DESC`, [userId]);
        return res.json({
            success: true,
            data: result.rows,
        });
    }
    catch (err) {
        next(err);
    }
});
// Các route quản lý Feedbacks gọi từ Controller
/**
 * GET /feedbacks
 * Lấy danh sách phản ánh/kiến nghị (phân trang, lọc trạng thái, phân loại)
 */
router.get("/feedbacks", auth_middleware_1.requireAuth, (0, auth_middleware_1.requireAnyTask)(["kiennghi"]), feedback_controller_1.feedbackController.list);
/**
 * GET /feedbacks/stats
 * Thống kê số lượng phản ánh/kiến nghị theo trạng thái theo khoảng ngày (ví dụ theo quý).
 * Query params:
 *  - fromDate?: YYYY-MM-DD
 *  - toDate?: YYYY-MM-DD
 *  - includeMerged?: 1|true (mặc định ẩn các phản ánh phụ đã bị gộp)
 */
router.get("/feedbacks/stats", auth_middleware_1.requireAuth, (0, auth_middleware_1.requireAnyTask)(["kiennghi"]), feedback_controller_1.feedbackController.stats);
/**
 * GET /feedbacks/:id
 * Xem chi tiết một phản ánh, kèm danh sách người phản ánh và phản hồi
 */
router.get("/feedbacks/:id", auth_middleware_1.requireAuth, (0, auth_middleware_1.requireAnyTask)(["kiennghi"]), feedback_controller_1.feedbackController.detail);
/**
 * PATCH /feedbacks/:id/status
 * Cập nhật trạng thái phản ánh (chỉ ADMIN/TỔ TRƯỞNG)
 */
router.patch("/feedbacks/:id/status", auth_middleware_1.requireAuth, (0, auth_middleware_1.requireAnyTask)(["kiennghi"]), feedback_controller_1.feedbackController.updateStatus);
/**
 * POST /feedbacks/:id/response
 * Ghi nhận phản hồi từ cơ quan chức năng (chỉ ADMIN/TỔ TRƯỞNG)
 */
router.post("/feedbacks/:id/response", auth_middleware_1.requireAuth, (0, auth_middleware_1.requireAnyTask)(["kiennghi"]), feedback_controller_1.feedbackController.addResponse);
/**
 * POST /feedbacks/merge
 * Gộp các phản ánh trùng nhau (chỉ ADMIN/TỔ TRƯỞNG)
 */
router.post("/feedbacks/merge", auth_middleware_1.requireAuth, (0, auth_middleware_1.requireAnyTask)(["kiennghi"]), feedback_controller_1.feedbackController.merge);
/**
 * POST /feedbacks/:id/notify
 * Gửi thông báo cho người dân khi phản ánh có phản hồi hoặc thay đổi trạng thái
 */
router.post("/feedbacks/:id/notify", auth_middleware_1.requireAuth, (0, auth_middleware_1.requireAnyTask)(["kiennghi"]), feedback_controller_1.feedbackController.notify);
exports.default = router;
