import { Request, Response, NextFunction } from "express";
import { query } from "../db";

export const feedbackController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { page = 1, limit = 10, status, category } = req.query;
      let { userId } = req.query;

      if (req.user?.role === "nguoi_dan") {
        userId = req.user.id.toString();
      }

      let where = [];
      let params: any[] = [];
      let idx = 1;

      if (status) {
        where.push(`"trangThai" = $${idx++}`);
        params.push(status);
      }
      if (category) {
        where.push(`loai = $${idx++}`);
        params.push(category);
      }
      if (userId) {
        where.push(`"nguoiPhanAnh" = $${idx++}`);
        params.push(userId);
      }

      const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
      const offset = (Number(page) - 1) * Number(limit);

      params.push(Number(limit), offset);
      const limitParamIdx = idx;
      const offsetParamIdx = idx + 1;
      const sql = `SELECT * FROM phan_anh ${whereClause} ORDER BY "ngayTao" DESC LIMIT $${limitParamIdx} OFFSET $${offsetParamIdx}`;
      const result = await query(sql, params);

      const countParams = params.slice(0, params.length - 2);
      const countSql = `SELECT COUNT(*) FROM phan_anh ${whereClause}`;
      const countResult = await query(countSql, countParams);

      res.json({
        success: true,
        data: result.rows,
        total: Number(countResult.rows[0].count),
        page: Number(page),
        limit: Number(limit),
      });
    } catch (err) {
      next(err);
    }
  },

  async detail(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const feedback = await query(`SELECT * FROM phan_anh WHERE id = $1`, [id]);
      if (!feedback.rows[0]) return res.status(404).json({ success: false, error: { message: "Not found" } });

      const reporters = await query(
        `SELECT u.id, u."fullName" as name FROM phan_anh_nguoi pan JOIN users u ON pan."nguoiPhanAnhId" = u.id WHERE pan."phanAnhId" = $1`,
        [id]
      );

      // ĐÃ SỬA: Bỏ truy vấn vào bảng phan_anh_phan_hoi không tồn tại
      res.json({
        success: true,
        data: {
          ...feedback.rows[0],
          reporters: reporters.rows,
          // Phản hồi bây giờ nằm trong feedback.rows[0].ketQuaXuLy
        },
      });
    } catch (err) {
      next(err);
    }
  },

  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      await query(`UPDATE phan_anh SET "trangThai" = $1, "updatedAt" = NOW() WHERE id = $2`, [status, id]);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  },

  // ĐÃ SỬA: Hàm addResponse để khớp với Database (sử dụng cột ketQuaXuLy và trạng thái da_xu_ly)
  async addResponse(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { responder_unit, response_content } = req.body;

      // Lưu phản hồi trực tiếp vào bảng phan_anh
      const formattedContent = `[${responder_unit}]: ${response_content}`;

      const sql = `
        UPDATE phan_anh 
        SET "ketQuaXuLy" = $1, 
            "trangThai" = 'da_xu_ly', 
            "ngayXuLy" = NOW(), 
            "updatedAt" = NOW() 
        WHERE id = $2
      `;

      const result = await query(sql, [formattedContent, id]);

      if (result.rowCount === 0) {
        return res.status(404).json({ success: false, message: "Không tìm thấy phản ánh" });
      }

      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  },

 // feedback.controller.ts

async merge(req: Request, res: Response, next: NextFunction) {
  try {
    const { ids } = req.body; 
    const feedbackIds = ids;

    if (!Array.isArray(feedbackIds) || feedbackIds.length < 2) {
      return res.status(400).json({ success: false, error: { message: "Cần ít nhất 2 phản ánh để gộp" } });
    }
    
    const mainId = feedbackIds[0];
    const otherIds = feedbackIds.slice(1);

    await query('BEGIN');
    try {
      // 1. Ghi nhận những người phản ánh vào bảng trung gian
      // Lấy tất cả người dân từ các bản ghi bị gộp chuyển sang bản ghi chính
      await query(
        `INSERT INTO phan_anh_nguoi ("phanAnhId", "nguoiPhanAnhId")
         SELECT $1, "nguoiPhanAnhId" FROM phan_anh_nguoi 
         WHERE "phanAnhId" = ANY($2::int[]) 
         ON CONFLICT ("phanAnhId", "nguoiPhanAnhId") DO NOTHING`,
        [mainId, feedbackIds]
      );

      // 2. Ghi nhận số lần phản ánh vào cột vừa tạo
      // Cộng số lượng phản ánh bị gộp vào bản ghi chính
      await query(
        `UPDATE phan_anh 
         SET "soLanPhanAnh" = COALESCE("soLanPhanAnh", 1) + $1,
             "updatedAt" = NOW()
         WHERE id = $2`, 
        [otherIds.length, mainId]
      );

      // 3. Chuyển trạng thái các bản ghi phụ thành 'tu_choi' để đóng chúng lại
      await query(
        `UPDATE phan_anh 
         SET "trangThai" = 'tu_choi', 
             "ketQuaXuLy" = 'Đã gộp vào phản ánh ID: ' || $1,
             "updatedAt" = NOW() 
         WHERE id = ANY($2::int[]) AND id != $1`, 
        [mainId, feedbackIds]
      );

      await query('COMMIT');
      res.json({ success: true });
    } catch (err) {
      await query('ROLLBACK');
      throw err;
    }
  } catch (err) {
    next(err);
  }
},

  async notify(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { message } = req.body;
      const reporters = await query(`SELECT "nguoiPhanAnhId" FROM phan_anh_nguoi WHERE "phanAnhId" = $1`, [id]);
      for (const r of reporters.rows) {
        await query(
          `INSERT INTO phan_anh_thong_bao ("phanAnhId", "nguoiPhanAnhId", "noiDung", "ngayTao", "daDoc") VALUES ($1, $2, $3, NOW(), false)`,
          [id, r.nguoiPhanAnhId, message]
        );
      }
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
};