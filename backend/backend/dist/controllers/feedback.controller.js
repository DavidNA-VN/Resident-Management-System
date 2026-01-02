"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.feedbackController = void 0;
const db_1 = require("../db");
exports.feedbackController = {
    async create(req, res, next) {
        const { tieuDe, noiDung, loai } = req.body;
        const userId = req.user?.id;
        if (!userId) {
            return res
                .status(401)
                .json({ success: false, message: "Bạn cần đăng nhập để gửi phản ánh" });
        }
        await (0, db_1.query)("BEGIN");
        try {
            const result = await (0, db_1.query)(`INSERT INTO phan_anh ("tieuDe", "noiDung", "loai", "nguoiPhanAnh", "trangThai", "ngayTao", "soLanPhanAnh") 
         VALUES ($1, $2, $3, $4, 'cho_xu_ly', NOW(), 1) RETURNING id`, [tieuDe, noiDung, loai, userId]);
            const newFeedbackId = result.rows[0].id;
            await (0, db_1.query)(`INSERT INTO phan_anh_nguoi ("phanAnhId", "nguoiPhanAnhId") VALUES ($1, $2)`, [newFeedbackId, userId]);
            await (0, db_1.query)("COMMIT");
            res.json({ success: true, data: { id: newFeedbackId } });
        }
        catch (err) {
            await (0, db_1.query)("ROLLBACK");
            next(err);
        }
    },
    async list(req, res, next) {
        try {
            const { page = 1, limit = 10, status, category, keyword, reporterKeyword, includeMerged, } = req.query;
            let { userId } = req.query;
            if (req.user?.role === "nguoi_dan") {
                userId = req.user.id.toString();
            }
            let where = [];
            let params = [];
            let idx = 1;
            if (status) {
                where.push(`pa."trangThai" = $${idx++}`);
                params.push(status);
            }
            if (category) {
                where.push(`pa.loai = $${idx++}`);
                params.push(category);
            }
            if (userId) {
                where.push(`pa."nguoiPhanAnh" = $${idx++}`);
                params.push(userId);
            }
            if (keyword) {
                where.push(`(pa."tieuDe" ILIKE $${idx} OR pa."noiDung" ILIKE $${idx})`);
                params.push(`%${String(keyword).trim()}%`);
                idx++;
            }
            if (reporterKeyword) {
                where.push(`EXISTS (
          SELECT 1
          FROM phan_anh_nguoi pan
          JOIN users u ON pan."nguoiPhanAnhId" = u.id
          WHERE pan."phanAnhId" = pa.id
            AND (
              u."fullName" ILIKE $${idx}
              OR u.username ILIKE $${idx}
              OR COALESCE(u.cccd, '') ILIKE $${idx}
            )
        )`);
                params.push(`%${String(reporterKeyword).trim()}%`);
                idx++;
            }
            // SỬA TẠI ĐÂY: Nếu không phải người dân xem đơn của mình, ẩn các đơn đã bị gộp
            // Điều này giúp danh sách của Tổ trưởng gọn gàng, chỉ hiện đơn "Chính"
            const includeMergedFlag = String(includeMerged || "").toLowerCase() === "1" ||
                String(includeMerged || "").toLowerCase() === "true";
            if (req.user?.role !== "nguoi_dan" && !includeMergedFlag) {
                where.push(`(pa."ketQuaXuLy" IS NULL OR pa."ketQuaXuLy" NOT LIKE 'Đã gộp vào phản ánh ID: %')`);
            }
            const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
            const offset = (Number(page) - 1) * Number(limit);
            const sql = `
        SELECT pa.*, 
          (
            SELECT COALESCE(
              JSON_AGG(
                JSON_BUILD_OBJECT(
                  'id', u.id,
                  'fullName', u."fullName",
                  'username', u.username,
                  'cccd', u.cccd
                )
              ),
              '[]'::json
            )
            FROM phan_anh_nguoi pan 
            JOIN users u ON pan."nguoiPhanAnhId" = u.id 
            WHERE pan."phanAnhId" = pa.id
          ) as "danhSachNguoi"
        FROM phan_anh pa 
        ${whereClause} 
        ORDER BY pa."ngayTao" DESC 
        LIMIT $${idx++} OFFSET $${idx++}
      `;
            const finalParams = [...params, Number(limit), offset];
            const result = await (0, db_1.query)(sql, finalParams);
            const countSql = `SELECT COUNT(*) FROM phan_anh pa ${whereClause}`;
            const countResult = await (0, db_1.query)(countSql, params);
            res.json({
                success: true,
                data: result.rows,
                total: Number(countResult.rows[0].count),
                page: Number(page),
                limit: Number(limit),
            });
        }
        catch (err) {
            next(err);
        }
    },
    async stats(req, res, next) {
        try {
            const { fromDate, toDate, includeMerged } = req.query;
            const where = [];
            const params = [];
            let idx = 1;
            if (fromDate) {
                where.push(`pa."ngayTao" >= $${idx}::date`);
                params.push(String(fromDate));
                idx++;
            }
            if (toDate) {
                // inclusive end date by converting to [toDate + 1 day)
                where.push(`pa."ngayTao" < ($${idx}::date + INTERVAL '1 day')`);
                params.push(String(toDate));
                idx++;
            }
            const includeMergedFlag = String(includeMerged || "").toLowerCase() === "1" ||
                String(includeMerged || "").toLowerCase() === "true";
            if (req.user?.role !== "nguoi_dan" && !includeMergedFlag) {
                where.push(`(pa."ketQuaXuLy" IS NULL OR pa."ketQuaXuLy" NOT LIKE 'Đã gộp vào phản ánh ID: %')`);
            }
            const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
            const sql = `
        SELECT pa."trangThai" AS status, COUNT(*)::int AS count
        FROM phan_anh pa
        ${whereClause}
        GROUP BY pa."trangThai"
        ORDER BY pa."trangThai"
      `;
            const rows = (await (0, db_1.query)(sql, params)).rows;
            const total = rows.reduce((sum, r) => sum + Number(r.count || 0), 0);
            return res.json({
                success: true,
                data: {
                    fromDate: fromDate || null,
                    toDate: toDate || null,
                    total,
                    byStatus: rows.map((r) => ({
                        status: r.status,
                        count: Number(r.count || 0),
                    })),
                },
            });
        }
        catch (err) {
            next(err);
        }
    },
    async detail(req, res, next) {
        try {
            const { id } = req.params;
            const feedback = await (0, db_1.query)(`SELECT * FROM phan_anh WHERE id = $1`, [
                id,
            ]);
            if (!feedback.rows[0])
                return res
                    .status(404)
                    .json({ success: false, error: { message: "Not found" } });
            const reporters = await (0, db_1.query)(`SELECT u.id, u."fullName" as name FROM phan_anh_nguoi pan JOIN users u ON pan."nguoiPhanAnhId" = u.id WHERE pan."phanAnhId" = $1`, [id]);
            res.json({
                success: true,
                data: {
                    ...feedback.rows[0],
                    reporters: reporters.rows,
                },
            });
        }
        catch (err) {
            next(err);
        }
    },
    async updateStatus(req, res, next) {
        try {
            const { id } = req.params;
            const { status } = req.body;
            await (0, db_1.query)(`UPDATE phan_anh SET "trangThai" = $1, "updatedAt" = NOW() WHERE id = $2`, [status, id]);
            res.json({ success: true });
        }
        catch (err) {
            next(err);
        }
    },
    async addResponse(req, res, next) {
        try {
            const { id } = req.params;
            const { responder_unit, response_content } = req.body;
            const formattedContent = `[${responder_unit}]: ${response_content}`;
            await (0, db_1.query)("BEGIN");
            // 1. Cập nhật phản hồi cho bản ghi chính
            const result = await (0, db_1.query)(`
        UPDATE phan_anh 
        SET "ketQuaXuLy" = $1, 
            "trangThai" = 'da_xu_ly', 
            "ngayXuLy" = NOW(), 
            "updatedAt" = NOW() 
        WHERE id = $2
      `, [formattedContent, id]);
            if (result.rowCount === 0) {
                await (0, db_1.query)("ROLLBACK");
                return res
                    .status(404)
                    .json({ success: false, message: "Không tìm thấy phản ánh" });
            }
            // 2. Cập nhật tất cả các bản ghi phụ đã được gộp vào bản ghi này
            await (0, db_1.query)(`
        UPDATE phan_anh 
        SET "ketQuaXuLy" = $1, 
            "trangThai" = 'da_xu_ly', 
            "ngayXuLy" = NOW(), 
            "updatedAt" = NOW() 
        WHERE "ketQuaXuLy" LIKE 'Đã gộp vào phản ánh ID: ' || $2
      `, [formattedContent, id]);
            await (0, db_1.query)("COMMIT");
            res.json({ success: true });
        }
        catch (err) {
            await (0, db_1.query)("ROLLBACK");
            next(err);
        }
    },
    async merge(req, res) {
        const { ids } = req.body;
        const mainId = ids[0];
        const otherIds = ids.slice(1);
        await (0, db_1.query)("BEGIN");
        try {
            await (0, db_1.query)(`
            INSERT INTO phan_anh_nguoi ("phanAnhId", "nguoiPhanAnhId")
            SELECT $1, "nguoiPhanAnhId" FROM phan_anh_nguoi 
            WHERE "phanAnhId" = ANY($2::int[])
            ON CONFLICT DO NOTHING
        `, [mainId, ids]);
            const countRes = await (0, db_1.query)('SELECT COUNT(*) FROM phan_anh_nguoi WHERE "phanAnhId" = $1', [mainId]);
            const totalCount = parseInt(countRes.rows[0].count);
            await (0, db_1.query)('UPDATE phan_anh SET "soLanPhanAnh" = $1, "updatedAt" = NOW() WHERE id = $2', [totalCount, mainId]);
            // Chuyển sang 'dang_xu_ly' để người dân không thấy bị từ chối
            await (0, db_1.query)(`
            UPDATE phan_anh 
            SET "trangThai" = 'dang_xu_ly', 
                "ketQuaXuLy" = 'Đã gộp vào phản ánh ID: ' || $1,
                "updatedAt" = NOW() 
            WHERE id = ANY($2::int[]) AND id != $1
        `, [mainId, otherIds]);
            await (0, db_1.query)("COMMIT");
            res.json({ success: true });
        }
        catch (err) {
            await (0, db_1.query)("ROLLBACK");
            console.error("Lỗi Merge Feedback:", err);
            res.status(500).json({ success: false, message: "Lỗi hệ thống khi gộp" });
        }
    },
    async notify(req, res, next) {
        try {
            const { id } = req.params;
            const { message } = req.body;
            const reporters = await (0, db_1.query)(`SELECT "nguoiPhanAnhId" FROM phan_anh_nguoi WHERE "phanAnhId" = $1`, [id]);
            for (const r of reporters.rows) {
                await (0, db_1.query)(`INSERT INTO phan_anh_thong_bao ("phanAnhId", "nguoiPhanAnhId", "noiDung", "ngayTao", "daDoc") VALUES ($1, $2, $3, NOW(), false)`, [id, r.nguoiPhanAnhId, message]);
            }
            res.json({ success: true });
        }
        catch (err) {
            next(err);
        }
    },
};
