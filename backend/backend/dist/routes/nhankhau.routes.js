"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const date_1 = require("../utils/date");
const auth_middleware_2 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
/**
 * GET /nhan-khau
 * List nhân khẩu (filter theo hoKhauId)
 */
router.get("/nhan-khau", auth_middleware_1.requireAuth, (0, auth_middleware_1.requireTask)("hokhau_nhankhau"), async (req, res, next) => {
    try {
        const { hoKhauId } = req.query;
        if (!hoKhauId) {
            return res.status(400).json({
                success: false,
                error: {
                    code: "VALIDATION_ERROR",
                    message: "Missing hoKhauId query parameter",
                },
            });
        }
        // Get nhan khau list
        const r = await (0, db_1.query)(`SELECT
          nk.id, nk."hoTen", nk."biDanh", nk.cccd,
          nk."ngayCapCCCD"::text AS "ngayCapCCCD",
          nk."noiCapCCCD",
          nk."ngaySinh"::text AS "ngaySinh",
          nk."gioiTinh", nk."noiSinh", nk."nguyenQuan", nk."danToc", nk."tonGiao", nk."quocTich",
          nk."hoKhauId", nk."quanHe",
          nk."ngayDangKyThuongTru"::text AS "ngayDangKyThuongTru",
          nk."diaChiThuongTruTruoc", nk."ngheNghiep", nk."noiLamViec", nk."ghiChu", nk."ghiChuHoKhau", nk."lyDoKhongCoCCCD",
          nk."trangThai", nk."userId", nk."createdAt", nk."updatedAt",
          hk."soHoKhau" AS "soHoKhau",
          -- residentStatus derived from trangThai
          CASE
            WHEN nk."trangThai" = 'tam_tru' THEN 'tam_tru'
            WHEN nk."trangThai" = 'tam_vang' THEN 'tam_vang'
            ELSE 'thuong_tru'
          END AS "residentStatus",
          -- movementStatus: prefer approved bien_dong records, then fall back to nhan_khau.trangThai
          CASE
            WHEN EXISTS (
              SELECT 1 FROM bien_dong bd
              WHERE bd."nhanKhauId" = nk.id AND bd.loai = 'khai_sinh' AND bd."trangThai" = 'da_duyet'
            ) THEN 'moi_sinh'
            WHEN EXISTS (
              SELECT 1 FROM bien_dong bd
              WHERE bd."nhanKhauId" = nk.id AND bd.loai = 'khai_tu' AND bd."trangThai" = 'da_duyet'
            ) THEN 'qua_doi'
            WHEN EXISTS (
              SELECT 1 FROM bien_dong bd
              WHERE bd."nhanKhauId" = nk.id AND bd.loai = 'chuyen_di' AND bd."trangThai" = 'da_duyet'
            ) THEN 'chuyen_di'
            WHEN nk."trangThai" = 'chuyen_di' THEN 'chuyen_di'
            WHEN nk."trangThai" = 'khai_tu' THEN 'qua_doi'
            ELSE 'binh_thuong'
          END AS "movementStatus",
          CASE
            WHEN EXISTS (
              SELECT 1 FROM bien_dong bd
              WHERE bd."nhanKhauId" = nk.id AND bd.loai = 'khai_sinh' AND bd."trangThai" = 'da_duyet'
            ) THEN 'moi_sinh'
            WHEN EXISTS (
              SELECT 1 FROM bien_dong bd
              WHERE bd."nhanKhauId" = nk.id AND bd.loai = 'khai_tu' AND bd."trangThai" = 'da_duyet'
            ) THEN 'da_qua_doi'
            WHEN EXISTS (
              SELECT 1 FROM bien_dong bd
              WHERE bd."nhanKhauId" = nk.id AND bd.loai = 'chuyen_di' AND bd."trangThai" = 'da_duyet'
            ) THEN 'da_chuyen_di'
            WHEN nk."trangThai" = 'chuyen_di' THEN 'da_chuyen_di'
            WHEN nk."trangThai" = 'khai_tu' THEN 'da_qua_doi'
            ELSE 'binh_thuong'
          END AS "bienDongStatus",
          -- count pending reports linked by user account (phan_anh.nguoiPhanAnh = users.id = nk.userId)
          COALESCE((
            SELECT COUNT(*) FROM phan_anh pa
            WHERE pa."nguoiPhanAnh" = nk."userId" AND pa."trangThai" IN ('cho_xu_ly','dang_xu_ly')
          ),0) AS "pendingReportsCount"
          ,
          -- total reports linked by user account (all statuses)
          COALESCE((
            SELECT COUNT(*) FROM phan_anh pa
            WHERE pa."nguoiPhanAnh" = nk."userId"
          ),0) AS "totalReportsCount"
         FROM nhan_khau nk
         LEFT JOIN ho_khau hk ON hk.id = nk."hoKhauId"
         WHERE nk."hoKhauId" = $1
         ORDER BY nk."createdAt" DESC`, [Number(hoKhauId)]);
        // Get ho khau info to determine chu ho
        const hoKhauQuery = await (0, db_1.query)(`SELECT "chuHoId" FROM ho_khau WHERE id = $1`, [Number(hoKhauId)]);
        const chuHoId = hoKhauQuery.rows[0]?.chuHoId;
        // Add computed isChuHo field for backward compatibility
        const data = r.rows.map((row) => ({
            ...row,
            isChuHo: row.id === chuHoId,
            // If quanHe is not set but this is chu ho, set it for display
            quanHe: row.quanHe || (row.id === chuHoId ? "chu_ho" : row.quanHe),
        }));
        return res.json({ success: true, data });
    }
    catch (err) {
        next(err);
    }
});
// Global search endpoint for nhan khau across TDP with optional filters
router.get("/nhan-khau/search", auth_middleware_1.requireAuth, (0, auth_middleware_2.requireRole)(["to_truong", "to_pho", "can_bo"]), async (req, res, next) => {
    try {
        const q = String(req.query.q || "").trim();
        const limit = Number(req.query.limit || 100);
        const offset = Number(req.query.offset || 0);
        const ageGroup = String(req.query.ageGroup || "").trim();
        const gender = String(req.query.gender || "").trim();
        const residenceStatus = String(req.query.residenceStatus || "").trim();
        const movementStatus = String(req.query.movementStatus || "").trim();
        const feedbackStatus = String(req.query.feedbackStatus || "").trim();
        const hasFilters = ageGroup || gender || residenceStatus || movementStatus || feedbackStatus;
        if (!hasFilters && q.length < 2) {
            return res.status(400).json({
                success: false,
                error: {
                    code: "VALIDATION_ERROR",
                    message: "Cần nhập từ khóa (≥2 ký tự) hoặc chọn ít nhất một bộ lọc",
                },
            });
        }
        if (q && q.length < 2) {
            return res.status(400).json({
                success: false,
                error: {
                    code: "VALIDATION_ERROR",
                    message: "Từ khóa cần tối thiểu 2 ký tự",
                },
            });
        }
        const conditions = [];
        const values = [];
        if (q) {
            values.push(`%${q}%`);
            conditions.push(`(nw."hoTen" ILIKE $${values.length} OR nw.cccd ILIKE $${values.length} OR nw."soHoKhau" ILIKE $${values.length})`);
        }
        // Age group filter (derived from ngaySinh)
        const ageRanges = {
            MAM_NON: [3, 5],
            CAP_1: [6, 10],
            CAP_2: [11, 14],
            CAP_3: [15, 17],
            LAO_DONG: [18, 59],
            NGHI_HUU: [60, 200],
        };
        if (ageGroup && ageRanges[ageGroup]) {
            const [minAge, maxAge] = ageRanges[ageGroup];
            values.push(minAge, maxAge);
            conditions.push(`(nw."ageYears" BETWEEN $${values.length - 1} AND $${values.length})`);
        }
        if (gender) {
            values.push(gender);
            conditions.push(`nw."gioiTinh" = $${values.length}`);
        }
        if (residenceStatus) {
            if (residenceStatus === "Thường trú") {
                conditions.push(`nw."residentStatus" = 'thuong_tru'`);
            }
            else if (residenceStatus === "Tạm trú") {
                conditions.push(`nw."residentStatus" = 'tam_tru'`);
            }
            else if (residenceStatus === "Tạm vắng") {
                conditions.push(`nw."residentStatus" = 'tam_vang'`);
            }
        }
        if (movementStatus) {
            if (movementStatus === "moi_sinh") {
                conditions.push(`nw."movementStatus" = 'moi_sinh'`);
            }
            else if (movementStatus === "da_chuyen_di") {
                conditions.push(`nw."movementStatus" = 'chuyen_di'`);
            }
            else if (movementStatus === "da_qua_doi") {
                conditions.push(`nw."movementStatus" = 'qua_doi'`);
            }
            else if (movementStatus === "binh_thuong") {
                conditions.push(`nw."movementStatus" = 'binh_thuong'`);
            }
        }
        if (feedbackStatus === "has_new") {
            conditions.push(`nw."pendingReportsCount" > 0`);
        }
        else if (feedbackStatus === "no_new") {
            conditions.push(`nw."pendingReportsCount" = 0`);
        }
        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
        const result = await (0, db_1.query)(`WITH nk_with AS (
           SELECT
             nk.id, nk."hoTen", nk."biDanh", nk.cccd,
             nk."ngayCapCCCD"::text AS "ngayCapCCCD",
             nk."noiCapCCCD",
             nk."ngaySinh"::text AS "ngaySinh",
             nk."gioiTinh", nk."noiSinh", nk."nguyenQuan", nk."danToc", nk."tonGiao", nk."quocTich",
             nk."hoKhauId", nk."quanHe", nk."trangThai", nk."createdAt", nk."updatedAt",
             hk."soHoKhau" AS "soHoKhau",
             hk."diaChi" AS "diaChi",
             CASE
               WHEN nk."trangThai" = 'tam_tru' THEN 'tam_tru'
               WHEN nk."trangThai" = 'tam_vang' THEN 'tam_vang'
               ELSE 'thuong_tru'
             END AS "residentStatus",
             CASE
               WHEN EXISTS (
                 SELECT 1 FROM bien_dong bd
                 WHERE bd."nhanKhauId" = nk.id AND bd.loai = 'khai_sinh' AND bd."trangThai" = 'da_duyet'
               ) THEN 'moi_sinh'
               WHEN EXISTS (
                 SELECT 1 FROM bien_dong bd
                 WHERE bd."nhanKhauId" = nk.id AND bd.loai = 'khai_tu' AND bd."trangThai" = 'da_duyet'
               ) THEN 'qua_doi'
               WHEN EXISTS (
                 SELECT 1 FROM bien_dong bd
                 WHERE bd."nhanKhauId" = nk.id AND bd.loai = 'chuyen_di' AND bd."trangThai" = 'da_duyet'
               ) THEN 'chuyen_di'
               WHEN nk."trangThai" = 'chuyen_di' THEN 'chuyen_di'
               WHEN nk."trangThai" = 'khai_tu' THEN 'qua_doi'
               ELSE 'binh_thuong'
             END AS "movementStatus",
             CASE
               WHEN EXISTS (
                 SELECT 1 FROM bien_dong bd
                 WHERE bd."nhanKhauId" = nk.id AND bd.loai = 'khai_sinh' AND bd."trangThai" = 'da_duyet'
               ) THEN 'moi_sinh'
               WHEN EXISTS (
                 SELECT 1 FROM bien_dong bd
                 WHERE bd."nhanKhauId" = nk.id AND bd.loai = 'khai_tu' AND bd."trangThai" = 'da_duyet'
               ) THEN 'da_qua_doi'
               WHEN EXISTS (
                 SELECT 1 FROM bien_dong bd
                 WHERE bd."nhanKhauId" = nk.id AND bd.loai = 'chuyen_di' AND bd."trangThai" = 'da_duyet'
               ) THEN 'da_chuyen_di'
               WHEN nk."trangThai" = 'chuyen_di' THEN 'da_chuyen_di'
               WHEN nk."trangThai" = 'khai_tu' THEN 'da_qua_doi'
               ELSE 'binh_thuong'
             END AS "bienDongStatus",
             COALESCE((
               SELECT COUNT(*) FROM phan_anh pa
               WHERE pa."nguoiPhanAnh" = nk."userId" AND pa."trangThai" IN ('cho_xu_ly','dang_xu_ly')
             ),0) AS "pendingReportsCount",
             DATE_PART('year', age(current_date, nk."ngaySinh"))::int AS "ageYears"
           FROM nhan_khau nk
           LEFT JOIN ho_khau hk ON hk.id = nk."hoKhauId"
         )
         SELECT *
         FROM nk_with nw
         ${whereClause}
         ORDER BY nw."createdAt" DESC
         LIMIT $${values.length + 1} OFFSET $${values.length + 2}`, [...values, limit, offset]);
        return res.json({ success: true, data: result.rows });
    }
    catch (err) {
        next(err);
    }
});
/**
 * POST /nhan-khau
 * Tạo nhân khẩu (thuộc hộ khẩu)
 */
router.post("/nhan-khau", auth_middleware_1.requireAuth, (0, auth_middleware_1.requireTask)("hokhau_nhankhau"), async (req, res, next) => {
    try {
        const { hoKhauId, hoTen, biDanh, cccd, ngayCapCCCD, noiCapCCCD, ngaySinh, gioiTinh, noiSinh, nguyenQuan, danToc, tonGiao, quocTich, quanHe, ngayDangKyThuongTru, diaChiThuongTruTruoc, ngheNghiep, noiLamViec, ghiChu, ghiChuHoKhau, lyDoKhongCoCCCD, } = req.body;
        const requiredFields = [
            hoKhauId,
            hoTen,
            cccd,
            ngaySinh,
            gioiTinh,
            quanHe,
            noiSinh,
            nguyenQuan,
            danToc,
            tonGiao,
            quocTich,
            ngheNghiep,
            noiLamViec,
            ngayDangKyThuongTru,
            diaChiThuongTruTruoc,
        ];
        if (requiredFields.some((f) => f === undefined || f === null || String(f).trim() === "")) {
            return res.status(400).json({
                success: false,
                error: {
                    code: "VALIDATION_ERROR",
                    message: "Vui lòng nhập đầy đủ các trường bắt buộc (trừ Ghi chú)",
                },
            });
        }
        const allowedQuanHe = [
            "chu_ho",
            "vo_chong",
            "con",
            "cha_me",
            "anh_chi_em",
            "ong_ba",
            "chau",
            "khac",
        ];
        if (!allowedQuanHe.includes(quanHe)) {
            return res.status(400).json({
                success: false,
                error: { code: "VALIDATION_ERROR", message: "Invalid quanHe" },
            });
        }
        // Backend role enforcement: explicitly prevent a 'nguoi_dan' (citizen) from creating a record and marking as 'chu_ho'
        // (requireTask middleware already blocks nguoi_dan from hitting this endpoint, but keep explicit guard for safety)
        if (req.user?.role === "nguoi_dan" && quanHe === "chu_ho") {
            return res.status(403).json({
                success: false,
                error: {
                    code: "FORBIDDEN",
                    message: "Người dân không được phép đặt quan hệ là 'Chủ hộ'. Vui lòng gửi yêu cầu để cán bộ xử lý.",
                },
            });
        }
        // Validation: Nếu chọn "chu_ho", kiểm tra hộ khẩu đã có chủ hộ chưa
        if (quanHe === "chu_ho") {
            // Kiểm tra hộ khẩu có trạng thái active không
            const hoKhauCheck = await (0, db_1.query)(`SELECT "trangThai", "chuHoId" FROM ho_khau WHERE id = $1`, [hoKhauId]);
            if ((hoKhauCheck?.rowCount ?? 0) === 0) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: "VALIDATION_ERROR",
                        message: "Hộ khẩu không tồn tại",
                    },
                });
            }
            // Kiểm tra hộ khẩu đã có chủ hộ chưa (qua chuHoId hoặc nhân khẩu có quanHe = chu_ho)
            const existingChuHo = await (0, db_1.query)(`SELECT id FROM nhan_khau 
           WHERE "hoKhauId" = $1 AND "quanHe" = 'chu_ho'`, [hoKhauId]);
            const hoKhau = hoKhauCheck.rows[0];
            if ((existingChuHo?.rowCount ?? 0) > 0 || hoKhau.chuHoId) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: "DUPLICATE_CHU_HO",
                        message: "Hộ khẩu này đã có chủ hộ. Không thể thêm chủ hộ mới. Vui lòng sử dụng chức năng 'Đổi chủ hộ' nếu muốn thay đổi.",
                    },
                });
            }
        }
        const allowedGioiTinh = ["nam", "nu", "khac", null, undefined, ""];
        if (!allowedGioiTinh.includes(gioiTinh)) {
            return res.status(400).json({
                success: false,
                error: { code: "VALIDATION_ERROR", message: "Invalid gioiTinh" },
            });
        }
        const client = await db_1.pool.connect();
        try {
            await client.query("BEGIN");
            await client.query("SELECT set_config('app.user_id', $1::text, true)", [
                req.user?.id ? String(req.user.id) : "",
            ]);
            const r = await client.query(`INSERT INTO nhan_khau
           ("hoKhauId","hoTen","biDanh","cccd","ngayCapCCCD","noiCapCCCD","ngaySinh","gioiTinh","noiSinh","nguyenQuan","danToc","tonGiao","quocTich","quanHe","ngayDangKyThuongTru","diaChiThuongTruTruoc","ngheNghiep","noiLamViec","ghiChu","ghiChuHoKhau","lyDoKhongCoCCCD")
           VALUES
           ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
           RETURNING *`, [
                hoKhauId,
                hoTen,
                biDanh ?? null,
                cccd ?? null,
                (0, date_1.normalizeDateOnly)(ngayCapCCCD) ?? null,
                noiCapCCCD ?? null,
                (0, date_1.normalizeDateOnly)(ngaySinh) ?? null,
                gioiTinh ?? null,
                noiSinh ?? null,
                nguyenQuan ?? null,
                danToc ?? null,
                tonGiao ?? null,
                quocTich ?? null,
                quanHe,
                (0, date_1.normalizeDateOnly)(ngayDangKyThuongTru) ?? null,
                diaChiThuongTruTruoc ?? null,
                ngheNghiep ?? null,
                noiLamViec ?? null,
                ghiChu ?? null,
                ghiChuHoKhau ?? null,
                lyDoKhongCoCCCD ?? null,
            ]);
            await client.query("COMMIT");
            return res.status(201).json({ success: true, data: r.rows[0] });
        }
        catch (err) {
            await client.query("ROLLBACK");
            throw err;
        }
        finally {
            client.release();
        }
    }
    catch (err) {
        next(err);
    }
});
/**
 * GET /nhan-khau/:id
 * Lấy chi tiết một nhân khẩu
 */
router.get("/nhan-khau/:id", auth_middleware_1.requireAuth, (0, auth_middleware_1.requireTask)("hokhau_nhankhau"), async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (!id) {
            return res.status(400).json({
                success: false,
                error: { code: "VALIDATION_ERROR", message: "Missing id" },
            });
        }
        const r = await (0, db_1.query)(`
        SELECT
          nk.id, nk."hoTen", nk."biDanh", nk.cccd,
          nk."ngayCapCCCD"::text AS "ngayCapCCCD",
          nk."noiCapCCCD",
          nk."ngaySinh"::text AS "ngaySinh",
          nk."gioiTinh", nk."noiSinh", nk."nguyenQuan", nk."danToc", nk."tonGiao", nk."quocTich",
          nk."hoKhauId", nk."quanHe",
          nk."ngayDangKyThuongTru"::text AS "ngayDangKyThuongTru",
          nk."diaChiThuongTruTruoc", nk."ngheNghiep", nk."noiLamViec", nk."ghiChu", nk."ghiChuHoKhau", nk."lyDoKhongCoCCCD",
          nk."trangThai", nk."userId", nk."createdAt", nk."updatedAt",
          CASE
            WHEN nk."trangThai" = 'tam_tru' THEN 'tam_tru'
            WHEN nk."trangThai" = 'tam_vang' THEN 'tam_vang'
            ELSE 'thuong_tru'
          END AS "residentStatus",
          CASE
            WHEN EXISTS (
              SELECT 1 FROM bien_dong bd
              WHERE bd."nhanKhauId" = nk.id AND bd.loai = 'khai_sinh' AND bd."trangThai" = 'da_duyet'
            ) THEN 'moi_sinh'
            WHEN EXISTS (
              SELECT 1 FROM bien_dong bd
              WHERE bd."nhanKhauId" = nk.id AND bd.loai = 'khai_tu' AND bd."trangThai" = 'da_duyet'
            ) THEN 'qua_doi'
            WHEN EXISTS (
              SELECT 1 FROM bien_dong bd
              WHERE bd."nhanKhauId" = nk.id AND bd.loai = 'chuyen_di' AND bd."trangThai" = 'da_duyet'
            ) THEN 'chuyen_di'
            WHEN nk."trangThai" = 'chuyen_di' THEN 'chuyen_di'
            WHEN nk."trangThai" = 'khai_tu' THEN 'qua_doi'
            ELSE 'binh_thuong'
          END AS "movementStatus",
          CASE
            WHEN EXISTS (
              SELECT 1 FROM bien_dong bd
              WHERE bd."nhanKhauId" = nk.id AND bd.loai = 'khai_sinh' AND bd."trangThai" = 'da_duyet'
            ) THEN 'moi_sinh'
            WHEN EXISTS (
              SELECT 1 FROM bien_dong bd
              WHERE bd."nhanKhauId" = nk.id AND bd.loai = 'khai_tu' AND bd."trangThai" = 'da_duyet'
            ) THEN 'da_qua_doi'
            WHEN EXISTS (
              SELECT 1 FROM bien_dong bd
              WHERE bd."nhanKhauId" = nk.id AND bd.loai = 'chuyen_di' AND bd."trangThai" = 'da_duyet'
            ) THEN 'da_chuyen_di'
            WHEN nk."trangThai" = 'chuyen_di' THEN 'da_chuyen_di'
            WHEN nk."trangThai" = 'khai_tu' THEN 'da_qua_doi'
            ELSE 'binh_thuong'
          END AS "bienDongStatus",
          COALESCE((SELECT COUNT(*) FROM phan_anh pa WHERE pa."nguoiPhanAnh" = nk."userId" AND pa."trangThai" IN ('cho_xu_ly','dang_xu_ly')),0) AS "pendingReportsCount"
         FROM nhan_khau nk WHERE nk.id = $1`, [id]);
        if (r.rowCount === 0) {
            return res.status(404).json({
                success: false,
                error: { code: "NOT_FOUND", message: "Nhân khẩu không tồn tại" },
            });
        }
        return res.json({ success: true, data: r.rows[0] });
    }
    catch (err) {
        next(err);
    }
});
/**
 * GET /nhan-khau/:id/history
 * Lấy lịch sử thay đổi cho nhân khẩu (audit)
 */
router.get("/nhan-khau/:id/history", auth_middleware_1.requireAuth, (0, auth_middleware_1.requireTask)("hokhau_nhankhau"), async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (!id) {
            return res.status(400).json({
                success: false,
                error: { code: "VALIDATION_ERROR", message: "Missing id" },
            });
        }
        const r = await (0, db_1.query)(`SELECT l.id, l."hanhDong", l.truong, l."noiDungCu", l."noiDungMoi",
                l."nguoiThucHien", u."fullName" AS "nguoiThucHienName", l."createdAt"
         FROM lich_su_thay_doi l
         LEFT JOIN users u ON u.id = l."nguoiThucHien"
         WHERE l.bang = 'nhan_khau' AND l."banGhiId" = $1
         ORDER BY l."createdAt" DESC`, [id]);
        return res.json({ success: true, data: r.rows });
    }
    catch (err) {
        next(err);
    }
});
/**
 * PATCH /nhan-khau/:id
 * Cập nhật thông tin nhân khẩu
 */
router.patch("/nhan-khau/:id", auth_middleware_1.requireAuth, (0, auth_middleware_1.requireTask)("hokhau_nhankhau"), async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (!id) {
            return res.status(400).json({
                success: false,
                error: { code: "VALIDATION_ERROR", message: "Missing id" },
            });
        }
        const { hoTen, biDanh, cccd, ngayCapCCCD, noiCapCCCD, ngaySinh, gioiTinh, noiSinh, nguyenQuan, danToc, tonGiao, quocTich, quanHe, ngayDangKyThuongTru, diaChiThuongTruTruoc, ngheNghiep, noiLamViec, ghiChu, ghiChuHoKhau, lyDoKhongCoCCCD, } = req.body;
        const fields = [];
        if (hoTen !== undefined)
            fields.push({ column: "hoTen", value: hoTen });
        if (biDanh !== undefined)
            fields.push({ column: "biDanh", value: biDanh });
        if (cccd !== undefined)
            fields.push({ column: "cccd", value: cccd });
        if (ngayCapCCCD !== undefined)
            fields.push({
                column: "ngayCapCCCD",
                value: (0, date_1.normalizeDateOnly)(ngayCapCCCD),
            });
        if (noiCapCCCD !== undefined)
            fields.push({ column: "noiCapCCCD", value: noiCapCCCD });
        if (ngaySinh !== undefined)
            fields.push({ column: "ngaySinh", value: (0, date_1.normalizeDateOnly)(ngaySinh) });
        if (gioiTinh !== undefined)
            fields.push({ column: "gioiTinh", value: gioiTinh });
        if (noiSinh !== undefined)
            fields.push({ column: "noiSinh", value: noiSinh });
        if (nguyenQuan !== undefined)
            fields.push({ column: "nguyenQuan", value: nguyenQuan });
        if (danToc !== undefined)
            fields.push({ column: "danToc", value: danToc });
        if (tonGiao !== undefined)
            fields.push({ column: "tonGiao", value: tonGiao });
        if (quocTich !== undefined)
            fields.push({ column: "quocTich", value: quocTich });
        if (quanHe !== undefined)
            fields.push({ column: "quanHe", value: quanHe });
        if (ngayDangKyThuongTru !== undefined)
            fields.push({
                column: "ngayDangKyThuongTru",
                value: (0, date_1.normalizeDateOnly)(ngayDangKyThuongTru),
            });
        if (diaChiThuongTruTruoc !== undefined)
            fields.push({
                column: "diaChiThuongTruTruoc",
                value: diaChiThuongTruTruoc,
            });
        if (ngheNghiep !== undefined)
            fields.push({ column: "ngheNghiep", value: ngheNghiep });
        if (noiLamViec !== undefined)
            fields.push({ column: "noiLamViec", value: noiLamViec });
        if (ghiChu !== undefined)
            fields.push({ column: "ghiChu", value: ghiChu });
        if (ghiChuHoKhau !== undefined)
            fields.push({ column: "ghiChuHoKhau", value: ghiChuHoKhau });
        if (lyDoKhongCoCCCD !== undefined)
            fields.push({ column: "lyDoKhongCoCCCD", value: lyDoKhongCoCCCD });
        const optionalFields = [
            cccd,
            ngheNghiep,
            noiLamViec,
            biDanh,
            ngayDangKyThuongTru,
            noiCapCCCD,
            ngayCapCCCD,
            diaChiThuongTruTruoc,
        ];
        const providedMissingOptional = optionalFields.some((v) => v !== undefined && (v === null || v === ""));
        const providedReason = (ghiChu !== undefined && String(ghiChu).trim() !== "") ||
            (lyDoKhongCoCCCD !== undefined &&
                String(lyDoKhongCoCCCD).trim() !== "");
        if (providedMissingOptional && !providedReason) {
            return res.status(400).json({
                success: false,
                error: {
                    code: "VALIDATION_ERROR",
                    message: "Vui lòng ghi chú lý do bỏ trống các trường tùy chọn (CCCD, nghề nghiệp, nơi làm việc, bí danh, ngày đăng ký thường trú, nơi cấp CCCD, ngày cấp CCCD, địa chỉ thường trú trước đây)",
                },
            });
        }
        if (fields.length === 0) {
            return res.status(400).json({
                success: false,
                error: {
                    code: "VALIDATION_ERROR",
                    message: "Không có trường nào để cập nhật",
                },
            });
        }
        if (quanHe !== undefined) {
            const allowedQuanHe = [
                "chu_ho",
                "vo_chong",
                "con",
                "cha_me",
                "anh_chi_em",
                "ong_ba",
                "chau",
                "khac",
            ];
            if (!allowedQuanHe.includes(quanHe)) {
                return res.status(400).json({
                    success: false,
                    error: { code: "VALIDATION_ERROR", message: "Invalid quanHe" },
                });
            }
        }
        if (gioiTinh !== undefined) {
            const allowedGioiTinh = ["nam", "nu", "khac", null, ""];
            if (!allowedGioiTinh.includes(gioiTinh)) {
                return res.status(400).json({
                    success: false,
                    error: { code: "VALIDATION_ERROR", message: "Invalid gioiTinh" },
                });
            }
        }
        // Validation: Nếu đang cập nhật quanHe thành "chu_ho", kiểm tra hộ khẩu đã có chủ hộ chưa
        if (quanHe !== undefined && quanHe === "chu_ho") {
            // Backend role enforcement: prevent a 'nguoi_dan' from updating themselves to 'chu_ho'
            if (req.user?.role === "nguoi_dan") {
                return res.status(403).json({
                    success: false,
                    error: {
                        code: "FORBIDDEN",
                        message: "Người dân không được phép cập nhật quan hệ thành 'Chủ hộ'. Vui lòng gửi yêu cầu để cán bộ xử lý.",
                    },
                });
            }
            // Lấy thông tin nhân khẩu hiện tại
            const currentNhanKhau = await (0, db_1.query)(`SELECT "hoKhauId" FROM nhan_khau WHERE id = $1`, [id]);
            if ((currentNhanKhau?.rowCount ?? 0) === 0) {
                return res.status(404).json({
                    success: false,
                    error: { code: "NOT_FOUND", message: "Nhân khẩu không tồn tại" },
                });
            }
            const hoKhauId = currentNhanKhau.rows[0].hoKhauId;
            // Kiểm tra hộ khẩu đã có chủ hộ khác chưa (không tính chính nhân khẩu này)
            const existingChuHo = await (0, db_1.query)(`SELECT id FROM nhan_khau 
           WHERE "hoKhauId" = $1 AND "quanHe" = 'chu_ho' AND id != $2`, [hoKhauId, id]);
            // Kiểm tra hộ khẩu có chuHoId trỏ đến nhân khẩu khác không
            const hoKhauCheck = await (0, db_1.query)(`SELECT "chuHoId" FROM ho_khau WHERE id = $1`, [hoKhauId]);
            if ((existingChuHo?.rowCount ?? 0) > 0 ||
                ((hoKhauCheck?.rowCount ?? 0) > 0 &&
                    hoKhauCheck.rows[0].chuHoId &&
                    hoKhauCheck.rows[0].chuHoId !== id)) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: "DUPLICATE_CHU_HO",
                        message: "Hộ khẩu này đã có chủ hộ. Không thể đặt nhân khẩu này làm chủ hộ. Vui lòng sử dụng chức năng 'Đổi chủ hộ' nếu muốn thay đổi.",
                    },
                });
            }
        }
        const setClauses = fields
            .map((f, idx) => `"${f.column}" = $${idx + 1}`)
            .join(", ");
        const values = fields.map((f) => (f.value === "" ? null : f.value));
        const client = await db_1.pool.connect();
        try {
            await client.query("BEGIN");
            await client.query("SELECT set_config('app.user_id', $1::text, true)", [
                req.user?.id ? String(req.user.id) : "",
            ]);
            const r = await client.query(`UPDATE nhan_khau SET ${setClauses} WHERE id = $${fields.length + 1} RETURNING *`, [...values, id]);
            await client.query("COMMIT");
            if ((r?.rowCount ?? 0) === 0) {
                return res.status(404).json({
                    success: false,
                    error: { code: "NOT_FOUND", message: "Nhân khẩu không tồn tại" },
                });
            }
            return res.json({ success: true, data: r.rows[0] });
        }
        catch (err) {
            await client.query("ROLLBACK");
            throw err;
        }
        finally {
            client.release();
        }
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
