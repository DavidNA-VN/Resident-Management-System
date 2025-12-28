import { Router } from "express";
import { query } from "../db";
import { requireAuth, requireTask } from "../middlewares/auth.middleware";
import { normalizeDateOnly } from "../utils/date";
import { requireRole } from "../middlewares/auth.middleware";

const router = Router();

/**
 * GET /nhan-khau
 * List nhân khẩu (filter theo hoKhauId)
 */
router.get(
  "/nhan-khau",
  requireAuth,
  requireTask("hokhau_nhankhau"),
  async (req, res, next) => {
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
      const r = await query(
        `SELECT
          nk.id, nk."hoTen", nk."biDanh", nk.cccd,
          nk."ngayCapCCCD"::text AS "ngayCapCCCD",
          nk."noiCapCCCD",
          nk."ngaySinh"::text AS "ngaySinh",
          nk."gioiTinh", nk."noiSinh", nk."nguyenQuan", nk."danToc", nk."tonGiao", nk."quocTich",
          nk."hoKhauId", nk."quanHe",
          nk."ngayDangKyThuongTru"::text AS "ngayDangKyThuongTru",
          nk."diaChiThuongTruTruoc", nk."ngheNghiep", nk."noiLamViec", nk."ghiChu",
          nk."trangThai", nk."userId", nk."createdAt", nk."updatedAt",
          -- residentStatus derived from trangThai
          CASE
            WHEN nk."trangThai" = 'tam_tru' THEN 'tam_tru'
            WHEN nk."trangThai" = 'tam_vang' THEN 'tam_vang'
            ELSE 'thuong_tru'
          END AS "residentStatus",
          -- movementStatus: prefer khai_sinh in bien_dong, else map from trangThai
          CASE
            WHEN EXISTS (
              SELECT 1 FROM bien_dong bd WHERE bd."nhanKhauId" = nk.id AND bd.loai = 'khai_sinh'
            ) THEN 'moi_sinh'
            WHEN nk."trangThai" = 'chuyen_di' THEN 'chuyen_di'
            WHEN nk."trangThai" = 'khai_tu' THEN 'qua_doi'
            ELSE 'binh_thuong'
          END AS "movementStatus",
          -- count pending reports linked by user account (phan_anh.nguoiPhanAnh = users.id = nk.userId)
          COALESCE((
            SELECT COUNT(*) FROM phan_anh pa
            WHERE pa."nguoiPhanAnh" = nk."userId" AND pa."trangThai" IN ('cho_xu_ly','dang_xu_ly')
          ),0) AS "pendingReportsCount"
         FROM nhan_khau nk WHERE nk."hoKhauId" = $1 ORDER BY nk."createdAt" DESC`,
        [Number(hoKhauId)]
      );

      // Get ho khau info to determine chu ho
      const hoKhauQuery = await query(
        `SELECT "chuHoId" FROM ho_khau WHERE id = $1`,
        [Number(hoKhauId)]
      );

      const chuHoId = hoKhauQuery.rows[0]?.chuHoId;

      // Add computed isChuHo field for backward compatibility
      const data = r.rows.map((row: any) => ({
        ...row,
        isChuHo: row.id === chuHoId,
        // If quanHe is not set but this is chu ho, set it for display
        quanHe: row.quanHe || (row.id === chuHoId ? 'chu_ho' : row.quanHe)
      }));

      return res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /nhan-khau
 * Tạo nhân khẩu (thuộc hộ khẩu)
 */
router.post(
  "/nhan-khau",
  requireAuth,
  requireTask("hokhau_nhankhau"),
  async (req, res, next) => {
    try {
      const {
        hoKhauId,
        hoTen,
        biDanh,
        cccd,
        ngayCapCCCD,
        noiCapCCCD,
        ngaySinh,
        gioiTinh,
        noiSinh,
        nguyenQuan,
        danToc,
        tonGiao,
        quocTich,
        quanHe,
        ngayDangKyThuongTru,
        diaChiThuongTruTruoc,
        ngheNghiep,
        noiLamViec,
        ghiChu,
      } = req.body;

      const requiredFields = [
        hoKhauId,
        hoTen,
        quanHe,
        ngaySinh,
        gioiTinh,
        noiSinh,
        nguyenQuan,
        danToc,
        tonGiao,
        quocTich,
      ];
      if (requiredFields.some((f) => !f)) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message:
              "Vui lòng nhập đầy đủ các trường bắt buộc (Hộ khẩu, Họ tên, Quan hệ, Ngày sinh, Giới tính, Nơi sinh, Nguyên quán, Dân tộc, Tôn giáo, Quốc tịch)",
          },
        });
      }

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

      const hasMissingOptional = optionalFields.some(
        (v) => v === undefined || v === null || v === ""
      );
      if (hasMissingOptional && (!ghiChu || String(ghiChu).trim() === "")) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message:
              "Vui lòng ghi chú lý do bỏ trống các trường tùy chọn (CCCD, nghề nghiệp, nơi làm việc, bí danh, ngày đăng ký thường trú, nơi cấp CCCD, ngày cấp CCCD, địa chỉ thường trú trước đây)",
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
        const hoKhauCheck = await query(
          `SELECT "trangThai", "chuHoId" FROM ho_khau WHERE id = $1`,
          [hoKhauId]
        );
        
        if (hoKhauCheck.rowCount === 0) {
          return res.status(400).json({
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Hộ khẩu không tồn tại",
            },
          });
        }

        // Kiểm tra hộ khẩu đã có chủ hộ chưa (qua chuHoId hoặc nhân khẩu có quanHe = chu_ho)
        const existingChuHo = await query(
          `SELECT id FROM nhan_khau 
           WHERE "hoKhauId" = $1 AND "quanHe" = 'chu_ho'`,
          [hoKhauId]
        );

        const hoKhau = hoKhauCheck.rows[0];
        if (existingChuHo.rowCount > 0 || hoKhau.chuHoId) {
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

      const r = await query(
        `INSERT INTO nhan_khau
         ("hoKhauId","hoTen","biDanh","cccd","ngayCapCCCD","noiCapCCCD","ngaySinh","gioiTinh","noiSinh","nguyenQuan","danToc","tonGiao","quocTich","quanHe","ngayDangKyThuongTru","diaChiThuongTruTruoc","ngheNghiep","noiLamViec","ghiChu")
         VALUES
         ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
         RETURNING *`,
        [
          hoKhauId,
          hoTen,
          biDanh ?? null,
          cccd ?? null,
          normalizeDateOnly(ngayCapCCCD) ?? null,
          noiCapCCCD ?? null,
          normalizeDateOnly(ngaySinh) ?? null,
          gioiTinh ?? null,
          noiSinh ?? null,
          nguyenQuan ?? null,
          danToc ?? null,
          tonGiao ?? null,
          quocTich ?? null,
          quanHe,
          normalizeDateOnly(ngayDangKyThuongTru) ?? null,
          diaChiThuongTruTruoc ?? null,
          ngheNghiep ?? null,
          noiLamViec ?? null,
          ghiChu ?? null,
        ]
      );

      return res.status(201).json({ success: true, data: r.rows[0] });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /nhan-khau/:id
 * Lấy chi tiết một nhân khẩu
 */
router.get(
  "/nhan-khau/:id",
  requireAuth,
  requireTask("hokhau_nhankhau"),
  async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      if (!id) {
        return res.status(400).json({
          success: false,
          error: { code: "VALIDATION_ERROR", message: "Missing id" },
        });
      }

      const r = await query(`
        SELECT
          nk.id, nk."hoTen", nk."biDanh", nk.cccd,
          nk."ngayCapCCCD"::text AS "ngayCapCCCD",
          nk."noiCapCCCD",
          nk."ngaySinh"::text AS "ngaySinh",
          nk."gioiTinh", nk."noiSinh", nk."nguyenQuan", nk."danToc", nk."tonGiao", nk."quocTich",
          nk."hoKhauId", nk."quanHe",
          nk."ngayDangKyThuongTru"::text AS "ngayDangKyThuongTru",
          nk."diaChiThuongTruTruoc", nk."ngheNghiep", nk."noiLamViec", nk."ghiChu",
          nk."trangThai", nk."userId", nk."createdAt", nk."updatedAt",
          CASE
            WHEN nk."trangThai" = 'tam_tru' THEN 'tam_tru'
            WHEN nk."trangThai" = 'tam_vang' THEN 'tam_vang'
            ELSE 'thuong_tru'
          END AS "residentStatus",
          CASE
            WHEN EXISTS (SELECT 1 FROM bien_dong bd WHERE bd."nhanKhauId" = nk.id AND bd.loai = 'khai_sinh') THEN 'moi_sinh'
            WHEN nk."trangThai" = 'chuyen_di' THEN 'chuyen_di'
            WHEN nk."trangThai" = 'khai_tu' THEN 'qua_doi'
            ELSE 'binh_thuong'
          END AS "movementStatus",
          COALESCE((SELECT COUNT(*) FROM phan_anh pa WHERE pa."nguoiPhanAnh" = nk."userId" AND pa."trangThai" IN ('cho_xu_ly','dang_xu_ly')),0) AS "pendingReportsCount"
         FROM nhan_khau nk WHERE nk.id = $1`, [id]);
      if (r.rowCount === 0) {
        return res.status(404).json({
          success: false,
          error: { code: "NOT_FOUND", message: "Nhân khẩu không tồn tại" },
        });
      }

      return res.json({ success: true, data: r.rows[0] });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /nhan-khau/:id/history
 * Lấy lịch sử thay đổi cho nhân khẩu (audit)
 */
router.get(
  "/nhan-khau/:id/history",
  requireAuth,
  requireTask("hokhau_nhankhau"),
  async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      if (!id) {
        return res.status(400).json({
          success: false,
          error: { code: "VALIDATION_ERROR", message: "Missing id" },
        });
      }

      const r = await query(
        `SELECT l.id, l."hanhDong", l.truong, l."noiDungCu", l."noiDungMoi",
                l."nguoiThucHien", u."fullName" AS "nguoiThucHienName", l."createdAt"
         FROM lich_su_thay_doi l
         LEFT JOIN users u ON u.id = l."nguoiThucHien"
         WHERE l.bang = 'nhan_khau' AND l."banGhiId" = $1
         ORDER BY l."createdAt" DESC`,
        [id]
      );

      return res.json({ success: true, data: r.rows });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PATCH /nhan-khau/:id
 * Cập nhật thông tin nhân khẩu
 */
router.patch(
  "/nhan-khau/:id",
  requireAuth,
  requireTask("hokhau_nhankhau"),
  async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      if (!id) {
        return res.status(400).json({
          success: false,
          error: { code: "VALIDATION_ERROR", message: "Missing id" },
        });
      }

      const {
        hoTen,
        biDanh,
        cccd,
        ngayCapCCCD,
        noiCapCCCD,
        ngaySinh,
        gioiTinh,
        noiSinh,
        nguyenQuan,
        danToc,
        tonGiao,
        quocTich,
        quanHe,
        ngayDangKyThuongTru,
        diaChiThuongTruTruoc,
        ngheNghiep,
        noiLamViec,
        ghiChu,
      } = req.body;

      const fields: { column: string; value: any }[] = [];
      if (hoTen !== undefined) fields.push({ column: "hoTen", value: hoTen });
      if (biDanh !== undefined)
        fields.push({ column: "biDanh", value: biDanh });
      if (cccd !== undefined) fields.push({ column: "cccd", value: cccd });
      if (ngayCapCCCD !== undefined)
        fields.push({ column: "ngayCapCCCD", value: normalizeDateOnly(ngayCapCCCD) });
      if (noiCapCCCD !== undefined)
        fields.push({ column: "noiCapCCCD", value: noiCapCCCD });
      if (ngaySinh !== undefined)
        fields.push({ column: "ngaySinh", value: normalizeDateOnly(ngaySinh) });
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
          value: normalizeDateOnly(ngayDangKyThuongTru),
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
      const providedMissingOptional = optionalFields.some(
        (v) => v !== undefined && (v === null || v === "")
      );
      if (providedMissingOptional && (ghiChu === undefined || ghiChu === "")) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message:
              "Vui lòng ghi chú lý do bỏ trống các trường tùy chọn (CCCD, nghề nghiệp, nơi làm việc, bí danh, ngày đăng ký thường trú, nơi cấp CCCD, ngày cấp CCCD, địa chỉ thường trú trước đây)",
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
        const currentNhanKhau = await query(
          `SELECT "hoKhauId" FROM nhan_khau WHERE id = $1`,
          [id]
        );

        if (currentNhanKhau.rowCount === 0) {
          return res.status(404).json({
            success: false,
            error: { code: "NOT_FOUND", message: "Nhân khẩu không tồn tại" },
          });
        }

        const hoKhauId = currentNhanKhau.rows[0].hoKhauId;

        // Kiểm tra hộ khẩu đã có chủ hộ khác chưa (không tính chính nhân khẩu này)
        const existingChuHo = await query(
          `SELECT id FROM nhan_khau 
           WHERE "hoKhauId" = $1 AND "quanHe" = 'chu_ho' AND id != $2`,
          [hoKhauId, id]
        );

        // Kiểm tra hộ khẩu có chuHoId trỏ đến nhân khẩu khác không
        const hoKhauCheck = await query(
          `SELECT "chuHoId" FROM ho_khau WHERE id = $1`,
          [hoKhauId]
        );

        if (
          existingChuHo.rowCount > 0 ||
          (hoKhauCheck.rowCount > 0 &&
            hoKhauCheck.rows[0].chuHoId &&
            hoKhauCheck.rows[0].chuHoId !== id)
        ) {
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

      const r = await query(
        `UPDATE nhan_khau SET ${setClauses} WHERE id = $${
          fields.length + 1
        } RETURNING *`,
        [...values, id]
      );

      if (r.rowCount === 0) {
        return res.status(404).json({
          success: false,
          error: { code: "NOT_FOUND", message: "Nhân khẩu không tồn tại" },
        });
      }

      return res.json({ success: true, data: r.rows[0] });
    } catch (err) {
      next(err);
    }
  }
);

export default router;

// Global search endpoint for nhan khau across TDP
router.get(
  "/nhan-khau/search",
  requireAuth,
  requireRole(["to_truong", "to_pho", "can_bo"]),
  async (req, res, next) => {
    try {
      const q = String(req.query.q || "").trim();
      const limit = Number(req.query.limit || 100);
      const offset = Number(req.query.offset || 0);

      if (!q || q.length < 2) {
        return res.status(400).json({
          success: false,
          error: { code: "VALIDATION_ERROR", message: "Query q is required (min 2 chars)" },
        });
      }
      const searchParam = `%${q}%`;
      const result = await query(
        `SELECT
           nk.id, nk."hoTen", nk."biDanh", nk.cccd,
           nk."ngayCapCCCD"::text AS "ngayCapCCCD",
           nk."noiCapCCCD",
           nk."ngaySinh"::text AS "ngaySinh",
           nk."gioiTinh", nk."noiSinh", nk."nguyenQuan", nk."danToc", nk."tonGiao", nk."quocTich",
           nk."hoKhauId", nk."quanHe", nk."trangThai",
           hk."soHoKhau" AS "soHoKhau",
           hk."diaChi" AS "diaChi"
         FROM nhan_khau nk
         LEFT JOIN ho_khau hk ON hk.id = nk."hoKhauId"
         WHERE (nk."hoTen" ILIKE $1 OR nk.cccd ILIKE $1)
         ORDER BY nk."createdAt" DESC
         LIMIT $2 OFFSET $3`,
        [searchParam, limit, offset]
      );

      return res.json({ success: true, data: result.rows });
    } catch (err) {
      next(err);
    }
  }
);
