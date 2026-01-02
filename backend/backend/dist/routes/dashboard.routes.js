"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
const asNumber = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
};
router.get("/dashboard", auth_middleware_1.requireAuth, (0, auth_middleware_1.requireRole)(["admin", "to_truong", "to_pho", "can_bo"]), async (req, res) => {
    try {
        const userId = req.user?.id;
        const countsQuery = `
        WITH bounds AS (
          SELECT
            date_trunc('month', CURRENT_DATE) AS start_month,
            (date_trunc('month', CURRENT_DATE) + interval '1 month') AS start_next_month,
            (date_trunc('month', CURRENT_DATE) - interval '1 month') AS start_prev_month
        )
        SELECT
          -- totals
          (SELECT COUNT(*) FROM ho_khau hk WHERE hk."trangThai" <> 'deleted') AS ho_khau_total,
          (SELECT COUNT(*) FROM nhan_khau nk WHERE nk."trangThai" <> 'deleted') AS nhan_khau_total,
          (SELECT COUNT(*) FROM phan_anh pa WHERE pa."trangThai" = 'cho_xu_ly') AS phan_anh_pending_total,
          (SELECT COUNT(*) FROM bien_dong bd WHERE bd."createdAt" >= (SELECT start_month FROM bounds) AND bd."createdAt" < (SELECT start_next_month FROM bounds)) AS bien_dong_this_month,

          -- created this month vs last month (for change indicators)
          (SELECT COUNT(*) FROM ho_khau hk WHERE hk."trangThai" <> 'deleted' AND hk."createdAt" >= (SELECT start_month FROM bounds) AND hk."createdAt" < (SELECT start_next_month FROM bounds)) AS ho_khau_created_this_month,
          (SELECT COUNT(*) FROM ho_khau hk WHERE hk."trangThai" <> 'deleted' AND hk."createdAt" >= (SELECT start_prev_month FROM bounds) AND hk."createdAt" < (SELECT start_month FROM bounds)) AS ho_khau_created_last_month,

          (SELECT COUNT(*) FROM nhan_khau nk WHERE nk."trangThai" <> 'deleted' AND nk."createdAt" >= (SELECT start_month FROM bounds) AND nk."createdAt" < (SELECT start_next_month FROM bounds)) AS nhan_khau_created_this_month,
          (SELECT COUNT(*) FROM nhan_khau nk WHERE nk."trangThai" <> 'deleted' AND nk."createdAt" >= (SELECT start_prev_month FROM bounds) AND nk."createdAt" < (SELECT start_month FROM bounds)) AS nhan_khau_created_last_month,

          (SELECT COUNT(*) FROM bien_dong bd WHERE bd."createdAt" >= (SELECT start_prev_month FROM bounds) AND bd."createdAt" < (SELECT start_month FROM bounds)) AS bien_dong_last_month,

          (SELECT COUNT(*) FROM phan_anh pa WHERE pa."ngayTao" >= (SELECT start_month FROM bounds) AND pa."ngayTao" < (SELECT start_next_month FROM bounds) AND pa."trangThai" = 'cho_xu_ly') AS phan_anh_created_this_month,
          (SELECT COUNT(*) FROM phan_anh pa WHERE pa."ngayTao" >= (SELECT start_prev_month FROM bounds) AND pa."ngayTao" < (SELECT start_month FROM bounds) AND pa."trangThai" = 'cho_xu_ly') AS phan_anh_created_last_month
      ;
      `;
        const quickStatsQuery = `
        SELECT
          -- active temporary residence/absence (approved/in-progress and within date range)
          (SELECT COUNT(*) FROM tam_tru_vang t
            WHERE t.loai = 'tam_tru'
              AND t."trangThai" IN ('da_duyet', 'dang_thuc_hien')
              AND t."tuNgay" <= CURRENT_DATE
              AND (t."denNgay" IS NULL OR t."denNgay" >= CURRENT_DATE)
          ) AS tam_tru_active,

          (SELECT COUNT(*) FROM tam_tru_vang t
            WHERE t.loai = 'tam_vang'
              AND t."trangThai" IN ('da_duyet', 'dang_thuc_hien')
              AND t."tuNgay" <= CURRENT_DATE
              AND (t."denNgay" IS NULL OR t."denNgay" >= CURRENT_DATE)
          ) AS tam_vang_active,

          -- pending approvals across workflow
          (
            (SELECT COUNT(*) FROM requests r WHERE r.status = 'PENDING')
            + (SELECT COUNT(*) FROM bien_dong bd WHERE bd."trangThai" = 'cho_duyet')
            + (SELECT COUNT(*) FROM tam_tru_vang t WHERE t."trangThai" = 'cho_duyet')
          ) AS cho_duyet_total,

          -- processed feedbacks
          (SELECT COUNT(*) FROM phan_anh pa WHERE pa."trangThai" = 'da_xu_ly') AS phan_anh_da_xu_ly
        ;
      `;
        const recentActivitiesQuery = `
        WITH events AS (
          -- Nhân khẩu create/update (from lịch sử)
          SELECT
            (ls.id::text || '-ls') AS id,
            CASE
              WHEN ls."hanhDong" = 'create' THEN 'Thêm mới'
              WHEN ls."hanhDong" = 'update' THEN 'Cập nhật'
              ELSE 'Cập nhật'
            END AS type,
            CASE
              WHEN ls."hanhDong" = 'create' THEN
                'Thêm nhân khẩu mới - ' || COALESCE(nk."hoTen", 'N/A')
              WHEN ls."hanhDong" = 'update' THEN
                'Cập nhật thông tin nhân khẩu - ' || COALESCE(nk."hoTen", 'N/A')
              ELSE
                'Cập nhật dữ liệu'
            END AS description,
            COALESCE(u."fullName", 'Hệ thống') AS "user",
            ls."createdAt" AS "createdAt"
          FROM lich_su_thay_doi ls
          LEFT JOIN nhan_khau nk ON nk.id = ls."banGhiId"
          LEFT JOIN users u ON u.id = ls."nguoiThucHien"
          WHERE ls.bang = 'nhan_khau'

          UNION ALL

          -- Biến động
          SELECT
            (bd.id::text || '-bd') AS id,
            'Biến động' AS type,
            'Ghi nhận biến động: ' || bd.loai || ' - ' || COALESCE(nk."hoTen", 'N/A') AS description,
            COALESCE(u."fullName", 'Hệ thống') AS "user",
            bd."createdAt" AS "createdAt"
          FROM bien_dong bd
          LEFT JOIN nhan_khau nk ON nk.id = bd."nhanKhauId"
          LEFT JOIN users u ON u.id = bd."nguoiThucHien"

          UNION ALL

          -- Phản ánh
          SELECT
            (pa.id::text || '-pa') AS id,
            'Phản ánh' AS type,
            'Tiếp nhận phản ánh mới - ' || pa."tieuDe" AS description,
            COALESCE(u."fullName", 'Người dân') AS "user",
            pa."ngayTao" AS "createdAt"
          FROM phan_anh pa
          LEFT JOIN users u ON u.id = pa."nguoiPhanAnh"

          UNION ALL

          -- Duyệt tạm trú/tạm vắng (đã duyệt)
          SELECT
            (t.id::text || '-ttv') AS id,
            'Duyệt' AS type,
            'Duyệt hồ sơ ' || (CASE WHEN t.loai = 'tam_tru' THEN 'tạm trú' ELSE 'tạm vắng' END) || ' - ' || COALESCE(nk."hoTen", 'N/A') AS description,
            COALESCE(u."fullName", 'Hệ thống') AS "user",
            t."updatedAt" AS "createdAt"
          FROM tam_tru_vang t
          LEFT JOIN nhan_khau nk ON nk.id = t."nhanKhauId"
          LEFT JOIN users u ON u.id = t."nguoiDuyet"
          WHERE t."trangThai" = 'da_duyet'
        )
        SELECT id, type, description, "user", "createdAt"
        FROM events
        ORDER BY "createdAt" DESC
        LIMIT 10;
      `;
        const notificationsQuery = `
        SELECT id, type, title, "createdAt"
        FROM notifications
        WHERE "userId" = $1
        ORDER BY "createdAt" DESC
        LIMIT 5;
      `;
        const [countsRes, quickRes, recentRes, notiRes] = await Promise.all([
            (0, db_1.query)(countsQuery),
            (0, db_1.query)(quickStatsQuery),
            (0, db_1.query)(recentActivitiesQuery),
            userId
                ? (0, db_1.query)(notificationsQuery, [userId])
                : Promise.resolve({ rows: [] }),
        ]);
        const row = countsRes.rows?.[0] || {};
        const quick = quickRes.rows?.[0] || {};
        const hoKhauChange = asNumber(row.ho_khau_created_this_month) -
            asNumber(row.ho_khau_created_last_month);
        const nhanKhauChange = asNumber(row.nhan_khau_created_this_month) -
            asNumber(row.nhan_khau_created_last_month);
        const bienDongChange = asNumber(row.bien_dong_this_month) - asNumber(row.bien_dong_last_month);
        const phanAnhChange = asNumber(row.phan_anh_created_this_month) -
            asNumber(row.phan_anh_created_last_month);
        return res.json({
            success: true,
            stats: {
                hoKhau: asNumber(row.ho_khau_total),
                nhanKhau: asNumber(row.nhan_khau_total),
                bienDong: asNumber(row.bien_dong_this_month),
                phanAnhPending: asNumber(row.phan_anh_pending_total),
            },
            changes: {
                hoKhau: hoKhauChange,
                nhanKhau: nhanKhauChange,
                bienDong: bienDongChange,
                phanAnhPending: phanAnhChange,
            },
            quickStats: {
                tamTru: asNumber(quick.tam_tru_active),
                tamVang: asNumber(quick.tam_vang_active),
                choDuyet: asNumber(quick.cho_duyet_total),
                daXuLy: asNumber(quick.phan_anh_da_xu_ly),
            },
            recentActivities: (recentRes.rows || []).map((r, idx) => ({
                id: idx + 1,
                type: String(r.type),
                description: String(r.description),
                user: String(r.user),
                createdAt: r.createdAt,
            })),
            notifications: (notiRes.rows || []).map((n) => ({
                id: Number(n.id),
                type: String(n.type),
                title: String(n.title),
                createdAt: n.createdAt,
            })),
        });
    }
    catch (err) {
        // eslint-disable-next-line no-console
        console.error("Dashboard error:", err?.message || err);
        return res
            .status(500)
            .json({ success: false, error: err?.message || "Server error" });
    }
});
exports.default = router;
