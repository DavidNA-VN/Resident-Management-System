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
      const { hoKhauId, hoTen, cccd, ngaySinh, gioiTinh, quanHe } = req.body;

      if (!hoKhauId || !hoTen || !quanHe) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Missing hoKhauId or hoTen or quanHe",
          },
        });
      }

      const hoKhauIdNumber = Number(hoKhauId);
      if (!Number.isInteger(hoKhauIdNumber) || hoKhauIdNumber <= 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid hoKhauId",
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

      const hoKhauResult = await query<{ id: number; chuHoId: number | null }>(
        `SELECT id, "chuHoId" FROM ho_khau WHERE id = $1`,
        [hoKhauIdNumber]
      );

      if (hoKhauResult.rowCount === 0) {
        return res.status(404).json({
          success: false,
          error: { code: "NOT_FOUND", message: "Hộ khẩu không tồn tại" },
        });
      }

      if (quanHe === "chu_ho") {
        if (hoKhauResult.rows[0].chuHoId) {
          return res.status(400).json({
            success: false,
            error: {
              code: "HOUSEHOLD_HEAD_EXISTS",
              message: "Hộ khẩu này đã có chủ hộ",
            },
          });
        }

        const existingChuHo = await query(
          `SELECT id FROM nhan_khau WHERE "hoKhauId" = $1 AND "quanHe" = 'chu_ho' LIMIT 1`,
          [hoKhauIdNumber]
        );

        if ((existingChuHo.rowCount ?? 0) > 0) {
          return res.status(400).json({
            success: false,
            error: {
              code: "HOUSEHOLD_HEAD_EXISTS",
              message: "Hộ khẩu này đã có chủ hộ",
            },
          });
        }
      }

      const r = await query(
        `INSERT INTO nhan_khau
         ("hoKhauId","hoTen","cccd","ngaySinh","gioiTinh","quanHe")
         VALUES
         ($1,$2,$3,$4,$5,$6)
         RETURNING *`,
        [
          hoKhauIdNumber,
          hoTen,
          cccd ?? null,
          ngaySinh ?? null,
          gioiTinh ?? null,
          quanHe,
        ]
      );

      return res.status(201).json({ success: true, data: r.rows[0] });
    } catch (err) {
      next(err);
    }
  }
);

export default router;

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
      const nhanKhauId = Number(req.params.id);
      if (!Number.isInteger(nhanKhauId) || nhanKhauId <= 0) {
        return res.status(400).json({
          success: false,
          error: { code: "VALIDATION_ERROR", message: "Invalid nhanKhauId" },
        });
      }

      const current = await query(`SELECT * FROM nhan_khau WHERE id = $1`, [
        nhanKhauId,
      ]);

      if (current.rowCount === 0) {
        return res.status(404).json({
          success: false,
          error: { code: "NOT_FOUND", message: "Nhân khẩu không tồn tại" },
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

      const existing = current.rows[0];
      const { hoTen, cccd, ngaySinh, gioiTinh, quanHe } = req.body as any;

      if (gioiTinh && !["nam", "nu", "khac"].includes(gioiTinh)) {
        return res.status(400).json({
          success: false,
          error: { code: "VALIDATION_ERROR", message: "Invalid gioiTinh" },
        });
      }

      if (quanHe && !allowedQuanHe.includes(quanHe)) {
        return res.status(400).json({
          success: false,
          error: { code: "VALIDATION_ERROR", message: "Invalid quanHe" },
        });
      }

      const merged = {
        hoTen: hoTen ?? existing.hoTen,
        cccd: cccd ?? existing.cccd,
        ngaySinh: ngaySinh ?? existing.ngaySinh,
        gioiTinh: gioiTinh ?? existing.gioiTinh,
        quanHe: quanHe ?? existing.quanHe,
      };

      if (!merged.hoTen || !merged.quanHe) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Missing hoTen or quanHe",
          },
        });
      }

      // Nếu chuyển sang chủ hộ, kiểm tra hộ đã có chủ hộ chưa
      if (merged.quanHe === "chu_ho") {
        const hoKhauId = existing.hoKhauId;
        const hoKhauResult = await query<{
          id: number;
          chuHoId: number | null;
        }>(`SELECT id, "chuHoId" FROM ho_khau WHERE id = $1`, [hoKhauId]);

        if (
          hoKhauResult.rows[0]?.chuHoId &&
          hoKhauResult.rows[0].chuHoId !== nhanKhauId
        ) {
          return res.status(400).json({
            success: false,
            error: {
              code: "HOUSEHOLD_HEAD_EXISTS",
              message: "Hộ khẩu này đã có chủ hộ",
            },
          });
        }

        const existingChuHo = await query(
          `SELECT id FROM nhan_khau WHERE "hoKhauId" = $1 AND "quanHe" = 'chu_ho' AND id <> $2 LIMIT 1`,
          [hoKhauId, nhanKhauId]
        );

        if ((existingChuHo.rowCount ?? 0) > 0) {
          return res.status(400).json({
            success: false,
            error: {
              code: "HOUSEHOLD_HEAD_EXISTS",
              message: "Hộ khẩu này đã có chủ hộ",
            },
          });
        }
      }

      const r = await query(
        `UPDATE nhan_khau
         SET "hoTen" = $1,
             "cccd" = $2,
             "ngaySinh" = $3,
             "gioiTinh" = $4,
             "quanHe" = $5
         WHERE id = $6
         RETURNING *`,
        [
          merged.hoTen,
          merged.cccd ?? null,
          merged.ngaySinh ?? null,
          merged.gioiTinh ?? null,
          merged.quanHe,
          nhanKhauId,
        ]
      );

      return res.json({ success: true, data: r.rows[0] });
    } catch (err) {
      next(err);
    }
  }
);
