import { Router } from "express";
import { query } from "../db";
import { requireAuth, requireTask } from "../middlewares/auth.middleware";

const router = Router();

/**
 * GET /ho-khau
 * List hộ khẩu (có thể filter theo trangThai)
 */
router.get(
  "/ho-khau",
  requireAuth,
  requireTask("hokhau_nhankhau"),
  async (req, res, next) => {
    try {
      const { trangThai } = req.query;
      let queryStr = `SELECT * FROM ho_khau WHERE 1=1`;
      const params: any[] = [];
      let paramIndex = 1;

      if (trangThai) {
        queryStr += ` AND "trangThai" = $${paramIndex}`;
        params.push(trangThai);
        paramIndex++;
      }

      queryStr += ` ORDER BY "createdAt" DESC LIMIT 100`;

      const r = await query(queryStr, params);
      return res.json({ success: true, data: r.rows });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /ho-khau/:id
 * Lấy chi tiết một hộ khẩu
 */
router.get(
  "/ho-khau/:id",
  requireAuth,
  requireTask("hokhau_nhankhau"),
  async (req, res, next) => {
    try {
      const hoKhauId = Number(req.params.id);
      const r = await query(`SELECT * FROM ho_khau WHERE id = $1`, [hoKhauId]);

      if (r.rowCount === 0) {
        return res.status(404).json({
          success: false,
          error: { code: "NOT_FOUND", message: "Hộ khẩu không tồn tại" },
        });
      }

      return res.json({ success: true, data: r.rows[0] });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /ho-khau
 * Tạo hộ khẩu NHÁP (inactive, chuHoId = NULL)
 */
router.post(
  "/ho-khau",
  requireAuth,
  requireTask("hokhau_nhankhau"),
  async (req, res, next) => {
    try {
      const {
        soHoKhau,
        diaChi,
        tinhThanh,
        quanHuyen,
        phuongXa,
        duongPho,
        soNha,
        diaChiDayDu,
        ngayCap,
        ghiChu,
      } = req.body;

      if (!soHoKhau || !diaChi) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Missing soHoKhau or diaChi",
          },
        });
      }

      const r = await query(
        `INSERT INTO ho_khau
         ("soHoKhau","diaChi","tinhThanh","quanHuyen","phuongXa","duongPho",
          "soNha","diaChiDayDu","chuHoId","ngayCap","trangThai","ghiChu")
         VALUES
         ($1,$2,$3,$4,$5,$6,$7,$8,NULL,$9,'inactive',$10)
         RETURNING *`,
        [
          soHoKhau,
          diaChi,
          tinhThanh ?? null,
          quanHuyen ?? null,
          phuongXa ?? null,
          duongPho ?? null,
          soNha ?? null,
          diaChiDayDu ?? null,
          ngayCap ?? null,
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
 * PATCH /ho-khau/:id
 * Cập nhật thông tin hộ khẩu (không thay đổi chủ hộ / trạng thái)
 */
router.patch(
  "/ho-khau/:id",
  requireAuth,
  requireTask("hokhau_nhankhau"),
  async (req, res, next) => {
    try {
      const hoKhauId = Number(req.params.id);
      if (!hoKhauId) {
        return res.status(400).json({
          success: false,
          error: { code: "VALIDATION_ERROR", message: "Missing hoKhauId" },
        });
      }

      const {
        soHoKhau,
        diaChi,
        tinhThanh,
        quanHuyen,
        phuongXa,
        duongPho,
        soNha,
        diaChiDayDu,
        ngayCap,
        ghiChu,
      } = req.body;

      const fields: { column: string; value: any }[] = [];

      if (soHoKhau !== undefined)
        fields.push({ column: "soHoKhau", value: soHoKhau });
      if (diaChi !== undefined)
        fields.push({ column: "diaChi", value: diaChi });
      if (tinhThanh !== undefined)
        fields.push({ column: "tinhThanh", value: tinhThanh });
      if (quanHuyen !== undefined)
        fields.push({ column: "quanHuyen", value: quanHuyen });
      if (phuongXa !== undefined)
        fields.push({ column: "phuongXa", value: phuongXa });
      if (duongPho !== undefined)
        fields.push({ column: "duongPho", value: duongPho });
      if (soNha !== undefined) fields.push({ column: "soNha", value: soNha });
      if (diaChiDayDu !== undefined)
        fields.push({ column: "diaChiDayDu", value: diaChiDayDu });
      if (ngayCap !== undefined)
        fields.push({ column: "ngayCap", value: ngayCap });
      if (ghiChu !== undefined)
        fields.push({ column: "ghiChu", value: ghiChu });

      if (fields.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Không có trường nào để cập nhật",
          },
        });
      }

      const setClauses = fields
        .map((f, idx) => `"${f.column}" = $${idx + 1}`)
        .join(", ");
      const values = fields.map((f) => (f.value === "" ? null : f.value));

      const r = await query(
        `UPDATE ho_khau
         SET ${setClauses}
         WHERE id = $${fields.length + 1}
         RETURNING *`,
        [...values, hoKhauId]
      );

      if (r.rowCount === 0) {
        return res.status(404).json({
          success: false,
          error: { code: "NOT_FOUND", message: "Hộ khẩu không tồn tại" },
        });
      }

      return res.json({ success: true, data: r.rows[0] });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PATCH /ho-khau/:id/activate
 * Set chuHoId + activate trong 1 query
 */
router.patch(
  "/ho-khau/:id/activate",
  requireAuth,
  requireTask("hokhau_nhankhau"),
  async (req, res, next) => {
    try {
      const hoKhauId = Number(req.params.id);
      const { chuHoId } = req.body as { chuHoId?: number };

      if (!hoKhauId || !chuHoId) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Missing hoKhauId or chuHoId",
          },
        });
      }

      // validate chủ hộ thuộc đúng hộ
      const check = await query(
        `SELECT id FROM nhan_khau WHERE id = $1 AND "hoKhauId" = $2`,
        [chuHoId, hoKhauId]
      );
      if (check.rowCount === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_CHU_HO",
            message: "chuHoId không thuộc hộ khẩu này",
          },
        });
      }

      const r = await query(
        `UPDATE ho_khau
         SET "chuHoId" = $1,
             "trangThai" = 'active'
         WHERE id = $2
         RETURNING *`,
        [chuHoId, hoKhauId]
      );

      if (r.rowCount === 0) {
        return res.status(404).json({
          success: false,
          error: { code: "NOT_FOUND", message: "ho_khau not found" },
        });
      }

      return res.json({ success: true, data: r.rows[0] });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
