import { query } from "../db";

export const feedbackService = {
  // 1. Lấy danh sách: Đảm bảo thứ tự tham số LIMIT/OFFSET luôn ở cuối mảng params
  async list({ page = 1, limit = 10, status, category }: any) {
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

    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const offset = (Number(page) - 1) * Number(limit);

    // Sử dụng biến idx cho LIMIT và OFFSET để khớp với mảng params
    const sql = `SELECT * FROM phan_anh ${whereClause} ORDER BY "ngayTao" DESC LIMIT $${idx++} OFFSET $${idx++}`;

    // Clone params để đếm tổng trước khi push limit/offset
    const countParams = [...params];
    params.push(Number(limit), offset);

    const result = await query(sql, params);
    const countSql = `SELECT COUNT(*) FROM phan_anh ${whereClause}`;
    const countResult = await query(countSql, countParams);

    return {
      data: result.rows,
      total: Number(countResult.rows[0].count),
      page: Number(page),
      limit: Number(limit),
    };
  },

  // 2. Chi tiết: Lấy thông tin người phản ánh
  async detail(id: number) {
    const feedback = await query(`SELECT * FROM phan_anh WHERE id = $1`, [id]);
    if (!feedback.rows[0]) return null;

    const reporters = await query(
      `SELECT u.id, u."fullName" FROM phan_anh_nguoi pan 
       JOIN users u ON pan."nguoiPhanAnhId" = u.id 
       WHERE pan."phanAnhId" = $1`,
      [id]
    );

    return {
      ...feedback.rows[0],
      reporters: reporters.rows,
    };
  },

  // 3. Phản hồi: Cập nhật trạng thái thành 'da_xu_ly' để khớp với CHECK constraint
  async addResponse(
    id: number,
    responder_unit: string,
    response_content: string
  ) {
    // Database của bạn dùng cột "ketQuaXuLy" để lưu nội dung phản hồi
    const formattedResponse = `[${responder_unit}]: ${response_content}`;

    // Câu lệnh SQL cập nhật trạng thái và nội dung phản hồi cùng lúc
    // Trạng thái 'da_xu_ly' là hợp lệ theo CHECK constraint của bạn
    const sql = `
      UPDATE phan_anh 
      SET "ketQuaXuLy" = $1, 
          "trangThai" = 'da_xu_ly', 
          "ngayXuLy" = NOW(), 
          "updatedAt" = NOW() 
      WHERE id = $2
    `;

    try {
      const result = await query(sql, [formattedResponse, id]);

      // Kiểm tra xem có bản ghi nào thực sự được cập nhật không
      if (result.rowCount === 0) {
        return {
          success: false,
          message: "Không tìm thấy phản ánh để cập nhật.",
        };
      }

      return { success: true };
    } catch (err) {
      console.error("Lỗi Database chi tiết:", err);
      throw err;
    }
  },

  // 4. Gộp: Chuyển các bản ghi phụ sang trạng thái 'tu_choi' (tương đương Đã gộp)
  async merge(feedbackIds: number[]) {
    if (!Array.isArray(feedbackIds) || feedbackIds.length < 2) return false;

    const mainId = feedbackIds[0];
    const otherIds = feedbackIds.slice(1);

    await query("BEGIN");
    try {
      // Chuyển liên kết nhân khẩu về bản ghi chính
      await query(
        `INSERT INTO phan_anh_nguoi ("phanAnhId", "nguoiPhanAnhId")
         SELECT $1, "nguoiPhanAnhId" FROM phan_anh_nguoi 
         WHERE "phanAnhId" = ANY($2::int[]) 
         ON CONFLICT ("phanAnhId", "nguoiPhanAnhId") 
         DO UPDATE SET "soLan" = phan_anh_nguoi."soLan" + 1`,
        [mainId, feedbackIds]
      );

      // Đóng các bản ghi phụ bằng trạng thái 'tu_choi'
      await query(
        `UPDATE phan_anh 
         SET "trangThai" = 'tu_choi', 
             "ketQuaXuLy" = 'Đã gộp vào phản ánh ID: ' || $1,
             "updatedAt" = NOW() 
         WHERE id = ANY($2::int[])`,
        [mainId, otherIds]
      );

      await query("COMMIT");
      return true;
    } catch (err) {
      await query("ROLLBACK");
      throw err;
    }
  },

  async notify(id: number, message: string) {
    const reporters = await query(
      `SELECT "nguoiPhanAnhId" FROM phan_anh_nguoi WHERE "phanAnhId" = $1`,
      [id]
    );
    for (const r of reporters.rows) {
      await query(
        `INSERT INTO phan_anh_thong_bao ("phanAnhId", "nguoiPhanAnhId", "noiDung", "ngayTao", "daDoc") 
         VALUES ($1, $2, $3, NOW(), false)`,
        [id, r.nguoiPhanAnhId, message]
      );
    }
    return true;
  },
};
