import { Router } from "express";
import { query } from "../db";
import { requireAuth, requireTask } from "../middlewares/auth.middleware";

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

      const r = await query(
        `SELECT * FROM nhan_khau WHERE "hoKhauId" = $1 ORDER BY "createdAt" DESC`,
        [Number(hoKhauId)]
      );

      return res.json({ success: true, data: r.rows });
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
          ngayCapCCCD ?? null,
          noiCapCCCD ?? null,
          ngaySinh ?? null,
          gioiTinh ?? null,
          noiSinh ?? null,
          nguyenQuan ?? null,
          danToc ?? null,
          tonGiao ?? null,
          quocTich ?? null,
          quanHe,
          ngayDangKyThuongTru ?? null,
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

      const r = await query(`SELECT * FROM nhan_khau WHERE id = $1`, [id]);
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
        fields.push({ column: "ngayCapCCCD", value: ngayCapCCCD });
      if (noiCapCCCD !== undefined)
        fields.push({ column: "noiCapCCCD", value: noiCapCCCD });
      if (ngaySinh !== undefined)
        fields.push({ column: "ngaySinh", value: ngaySinh });
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
          value: ngayDangKyThuongTru,
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
