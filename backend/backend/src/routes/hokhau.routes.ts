import { Router } from "express";
import { PoolClient } from "pg";
import { pool, query } from "../db";
import { requireAuth, requireTask } from "../middlewares/auth.middleware";

const router = Router();

const withUserContext = async <T>(
  userId: number,
  fn: (client: PoolClient) => Promise<T>
) => {
  const client = await pool.connect();
  try {
    // Giữ user_id cho suốt phiên kết nối để trigger đọc được
    await client.query("SELECT set_config('app.user_id', $1::text, false)", [
      userId,
    ]);
    return await fn(client);
  } finally {
    client.release();
  }
};

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

      if ((r?.rowCount ?? 0) === 0) {
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

      await withUserContext(req.user!.id, async (client) => {
        if (!diaChi) {
          return res.status(400).json({
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Missing diaChi",
            },
          });
        }

        const r = await client.query(
          `INSERT INTO ho_khau
           ("soHoKhau","diaChi","tinhThanh","quanHuyen","phuongXa","duongPho",
            "soNha","diaChiDayDu","chuHoId","ngayCap","trangThai","ghiChu")
           VALUES
           (generate_ho_khau_code(),$1,$2,$3,$4,$5,$6,$7,NULL,$8,'inactive',$9)
           RETURNING *`,
          [
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
      });
    } catch (err) {
      if (
        (err as any)?.code === "23505" &&
        (err as any)?.constraint === "uq_ho_khau_so"
      ) {
        return res.status(409).json({
          success: false,
          error: {
            code: "DUPLICATE_SO_HO_KHAU",
            message: "Số hộ khẩu đã tồn tại. Vui lòng thử lại.",
          },
        });
      }
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
      await withUserContext(req.user!.id, async (client) => {
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

        if (soHoKhau !== undefined && soHoKhau.trim() !== "") {
          const existing = await client.query(
            `SELECT id FROM ho_khau WHERE "soHoKhau" = $1 AND id != $2`,
            [soHoKhau.trim(), hoKhauId]
          );

          if ((existing?.rowCount ?? 0) > 0) {
            return res.status(409).json({
              success: false,
              error: {
                code: "DUPLICATE_SO_HO_KHAU",
                message:
                  "Số hộ khẩu đã tồn tại trong hệ thống. Vui lòng chọn số khác.",
              },
            });
          }
        }

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

        const r = await client.query(
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
      });
    } catch (err) {
      if (
        (err as any)?.code === "23505" &&
        (err as any)?.constraint === "uq_ho_khau_so"
      ) {
        return res.status(409).json({
          success: false,
          error: {
            code: "DUPLICATE_SO_HO_KHAU",
            message: "Số hộ khẩu đã tồn tại. Vui lòng thử giá trị khác.",
          },
        });
      }
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
      await withUserContext(req.user!.id, async (client) => {
        const hoKhauId = Number(req.params.id);
        const { chuHoId, soHoKhau } = req.body as {
          chuHoId?: number;
          soHoKhau?: string;
        };

        if (!hoKhauId || !chuHoId) {
          return res.status(400).json({
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Missing hoKhauId or chuHoId",
            },
          });
        }

        if (soHoKhau !== undefined && soHoKhau.trim() !== "") {
          const existing = await client.query(
            `SELECT id FROM ho_khau WHERE "soHoKhau" = $1`,
            [soHoKhau.trim()]
          );

          if ((existing?.rowCount ?? 0) > 0) {
            return res.status(409).json({
              success: false,
              error: {
                code: "DUPLICATE_SO_HO_KHAU",
                message:
                  "Số hộ khẩu đã tồn tại trong hệ thống. Vui lòng chọn số khác.",
              },
            });
          }
        }

        const check = await client.query(
          `SELECT id, "quanHe" FROM nhan_khau WHERE id = $1 AND "hoKhauId" = $2`,
          [chuHoId, hoKhauId]
        );
        if ((check?.rowCount ?? 0) === 0) {
          return res.status(400).json({
            success: false,
            error: {
              code: "INVALID_CHU_HO",
              message: "chuHoId không thuộc hộ khẩu này",
            },
          });
        }

        if (check.rows[0].quanHe !== "chu_ho") {
          return res.status(400).json({
            success: false,
            error: {
              code: "INVALID_CHU_HO",
              message: "Nhân khẩu được chọn phải có quan hệ là 'Chủ hộ'",
            },
          });
        }

        const existingChuHo = await client.query(
          `SELECT id FROM nhan_khau 
           WHERE "hoKhauId" = $1 AND "quanHe" = 'chu_ho' AND id != $2`,
          [hoKhauId, chuHoId]
        );

        if ((existingChuHo?.rowCount ?? 0) > 0) {
          return res.status(400).json({
            success: false,
            error: {
              code: "DUPLICATE_CHU_HO",
              message:
                "Hộ khẩu này đã có chủ hộ khác. Vui lòng sử dụng chức năng 'Đổi chủ hộ' nếu muốn thay đổi.",
            },
          });
        }

        const updateFields: string[] = [
          '"chuHoId" = $1',
          "\"trangThai\" = 'active'",
        ];
        const params: any[] = [chuHoId];

        if (soHoKhau !== undefined && soHoKhau.trim() !== "") {
          updateFields.push('"soHoKhau" = $2');
          params.push(soHoKhau.trim());
        }

        const r = await client.query(
          `UPDATE ho_khau
           SET ${updateFields.join(", ")}
           WHERE id = $${params.length + 1}
           RETURNING *`,
          [...params, hoKhauId]
        );

        if (r.rowCount === 0) {
          return res.status(404).json({
            success: false,
            error: { code: "NOT_FOUND", message: "ho_khau not found" },
          });
        }

        return res.json({ success: true, data: r.rows[0] });
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PATCH /ho-khau/:id/change-chu-ho
 * Đổi chủ hộ: Chọn nhân khẩu mới làm chủ hộ, tự động hạ chủ hộ cũ xuống quan hệ khác
 */
router.patch(
  "/ho-khau/:id/change-chu-ho",
  requireAuth,
  requireTask("hokhau_nhankhau"),
  async (req, res, next) => {
    try {
      await withUserContext(req.user!.id, async (client) => {
        const hoKhauId = Number(req.params.id);
        const { newChuHoId, oldChuHoNewQuanHe } = req.body as {
          newChuHoId: number;
          oldChuHoNewQuanHe?: string;
        };

        if (!hoKhauId || !newChuHoId) {
          return res.status(400).json({
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Missing hoKhauId or newChuHoId",
            },
          });
        }

        await client.query("BEGIN");
        try {
          const newChuHoCheck = await client.query(
            `SELECT id, "quanHe" FROM nhan_khau WHERE id = $1 AND "hoKhauId" = $2`,
            [newChuHoId, hoKhauId]
          );
          if ((newChuHoCheck?.rowCount ?? 0) === 0) {
            await client.query("ROLLBACK");
            return res.status(400).json({
              success: false,
              error: {
                code: "INVALID_CHU_HO",
                message: "Nhân khẩu mới không thuộc hộ khẩu này",
              },
            });
          }

          const currentChuHo = await client.query(
            `SELECT nk.id, nk."quanHe" 
             FROM nhan_khau nk
             INNER JOIN ho_khau hk ON hk."chuHoId" = nk.id
             WHERE hk.id = $1`,
            [hoKhauId]
          );

          let oldChuHoId: number | null = null;
          if ((currentChuHo?.rowCount ?? 0) === 0) {
            const chuHoByQuanHe = await client.query(
              `SELECT id FROM nhan_khau 
               WHERE "hoKhauId" = $1 AND "quanHe" = 'chu_ho' AND id != $2`,
              [hoKhauId, newChuHoId]
            );
            if ((chuHoByQuanHe?.rowCount ?? 0) > 0) {
              oldChuHoId = chuHoByQuanHe.rows[0].id;
            }
          } else {
            oldChuHoId = currentChuHo.rows[0].id;
          }

          if (oldChuHoId === newChuHoId) {
            await client.query("ROLLBACK");
            return res.status(400).json({
              success: false,
              error: {
                code: "INVALID_CHU_HO",
                message: "Nhân khẩu này đã là chủ hộ",
              },
            });
          }

          if (oldChuHoId) {
            const newQuanHe = oldChuHoNewQuanHe || "vo_chong";
            const allowedQuanHe = [
              "vo_chong",
              "con",
              "cha_me",
              "anh_chi_em",
              "ong_ba",
              "chau",
              "khac",
            ];
            if (!allowedQuanHe.includes(newQuanHe)) {
              await client.query("ROLLBACK");
              return res.status(400).json({
                success: false,
                error: {
                  code: "VALIDATION_ERROR",
                  message: "Quan hệ mới cho chủ hộ cũ không hợp lệ",
                },
              });
            }

            await client.query(
              `UPDATE nhan_khau SET "quanHe" = $1 WHERE id = $2`,
              [newQuanHe, oldChuHoId]
            );
          }

          await client.query(
            `UPDATE nhan_khau SET "quanHe" = 'chu_ho' WHERE id = $1`,
            [newChuHoId]
          );

          await client.query(
            `UPDATE ho_khau SET "chuHoId" = $1 WHERE id = $2`,
            [newChuHoId, hoKhauId]
          );

          const updatedHoKhau = await client.query(
            `SELECT * FROM ho_khau WHERE id = $1`,
            [hoKhauId]
          );

          await client.query("COMMIT");
          return res.json({ success: true, data: updatedHoKhau.rows[0] });
        } catch (err) {
          await client.query("ROLLBACK");
          throw err;
        }
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;

// GET /ho-khau/:id/history - Lịch sử thay đổi của hộ khẩu
router.get(
  "/ho-khau/:id/history",
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
         WHERE l.bang = 'ho_khau' AND l."banGhiId" = $1
         ORDER BY l."createdAt" DESC`,
        [id]
      );

      return res.json({ success: true, data: r.rows });
    } catch (err) {
      next(err);
    }
  }
);
