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
        cccd,
        ngaySinh,
        gioiTinh,
        quanHe,
      } = req.body;

      if (!hoKhauId || !hoTen || !quanHe) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Missing hoKhauId or hoTen or quanHe",
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

      const r = await query(
        `INSERT INTO nhan_khau
         ("hoKhauId","hoTen","cccd","ngaySinh","gioiTinh","quanHe")
         VALUES
         ($1,$2,$3,$4,$5,$6)
         RETURNING *`,
        [
          hoKhauId,
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
