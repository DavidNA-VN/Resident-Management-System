"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = __importDefault(require("../database"));
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
router.get("/", auth_middleware_1.requireAuth, (0, auth_middleware_1.requireAnyTask)(["thongke"]), async (req, res) => {
    try {
        const { genders, ageGroups, residenceTypes, startDate, endDate } = req.query;
        const gListRaw = Array.isArray(genders)
            ? genders
            : genders
                ? [genders]
                : [];
        const aListRaw = Array.isArray(ageGroups)
            ? ageGroups
            : ageGroups
                ? [ageGroups]
                : [];
        const rListRaw = Array.isArray(residenceTypes)
            ? residenceTypes
            : residenceTypes
                ? [residenceTypes]
                : [];
        const allowedGenders = new Set(["nam", "nu", "khac"]);
        const allowedAgeGroups = new Set([
            "mam_non",
            "mau_giao",
            "cap_1",
            "cap_2",
            "cap_3",
            "lao_dong",
            "nghi_huu",
        ]);
        const allowedResidenceTypes = new Set([
            "thuong_tru",
            "tam_tru",
            "tam_vang",
        ]);
        const gList = gListRaw
            .map((v) => String(v))
            .filter((v) => allowedGenders.has(v));
        const aList = aListRaw
            .map((v) => String(v))
            .filter((v) => allowedAgeGroups.has(v));
        const rList = rListRaw
            .map((v) => String(v))
            .filter((v) => allowedResidenceTypes.has(v));
        // 1. Xây dựng điều kiện lọc cơ bản cho nhân khẩu
        let baseFilter = ` WHERE nk."trangThai" != 'deleted'`;
        if (gList.length > 0)
            baseFilter += ` AND nk."gioiTinh" IN (${gList
                .map((g) => `'${g}'`)
                .join(",")})`;
        if (startDate)
            baseFilter += ` AND nk."createdAt" >= '${startDate}'`;
        if (endDate)
            baseFilter += ` AND nk."createdAt" <= '${endDate}'`;
        // 2. Query thống kê tổng hợp (Demographics)
        const mainQuery = `
      SELECT age_group, COUNT(*) as count, 
             COUNT(*) FILTER (WHERE "gioiTinh" = 'nam') as nam,
             COUNT(*) FILTER (WHERE "gioiTinh" = 'nu') as nu
      FROM (
        SELECT "gioiTinh",
          CASE 
            WHEN a < 3 THEN 'mam_non' WHEN a BETWEEN 3 AND 5 THEN 'mau_giao'
            WHEN a BETWEEN 6 AND 10 THEN 'cap_1' WHEN a BETWEEN 11 AND 14 THEN 'cap_2'
            WHEN a BETWEEN 15 AND 17 THEN 'cap_3'
            WHEN a BETWEEN 18 AND 59 THEN 'lao_dong'
            WHEN a >= 60 THEN 'nghi_huu' ELSE 'khac'
          END as age_group
        FROM (SELECT "gioiTinh", EXTRACT(YEAR FROM AGE(CURRENT_DATE, "ngaySinh")) as a FROM nhan_khau nk ${baseFilter}) as sub
      ) as final
      ${aList.length > 0
            ? `WHERE age_group IN (${aList.map((a) => `'${a}'`).join(",")})`
            : ""}
      GROUP BY age_group;
    `;
        // 3. Query tóm tắt tạm trú/vắng
        const resSummaryQuery = `SELECT loai, COUNT(*) FROM tam_tru_vang WHERE "trangThai" = 'da_duyet' GROUP BY loai`;
        // 4. Query danh sách chi tiết (Sửa lỗi khai báo trùng và tích hợp lọc trạng thái cư trú)
        const detailQuery = `
      SELECT * FROM (
        SELECT 
          nk."cccd", 
          nk."hoTen", 
          nk."gioiTinh", 
          EXTRACT(YEAR FROM AGE(CURRENT_DATE, nk."ngaySinh")) as age,
          CASE 
            WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, nk."ngaySinh")) < 3 THEN 'mam_non'
            WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, nk."ngaySinh")) BETWEEN 3 AND 5 THEN 'mau_giao'
            WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, nk."ngaySinh")) BETWEEN 6 AND 10 THEN 'cap_1'
            WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, nk."ngaySinh")) BETWEEN 11 AND 14 THEN 'cap_2'
            WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, nk."ngaySinh")) BETWEEN 15 AND 17 THEN 'cap_3'
            WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, nk."ngaySinh")) BETWEEN 18 AND 59 THEN 'lao_dong'
            WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, nk."ngaySinh")) >= 60 THEN 'nghi_huu'
            ELSE 'khac'
          END as age_group,
          COALESCE(ttv.loai, 'thuong_tru') as status
        FROM nhan_khau nk
        LEFT JOIN (
            SELECT DISTINCT ON ("nhanKhauId") "nhanKhauId", loai 
            FROM tam_tru_vang 
            WHERE "trangThai" = 'da_duyet' 
            ORDER BY "nhanKhauId", "createdAt" DESC
        ) ttv ON nk.id = ttv."nhanKhauId"
        ${baseFilter}
      ) as sub_detail
      ${[
            rList.length > 0
                ? `status IN (${rList.map((r) => `'${r}'`).join(",")})`
                : null,
            aList.length > 0
                ? `age_group IN (${aList.map((a) => `'${a}'`).join(",")})`
                : null,
        ].filter(Boolean).length > 0
            ? `WHERE ${[
                rList.length > 0
                    ? `status IN (${rList.map((r) => `'${r}'`).join(",")})`
                    : null,
                aList.length > 0
                    ? `age_group IN (${aList.map((a) => `'${a}'`).join(",")})`
                    : null,
            ]
                .filter(Boolean)
                .join(" AND ")}`
            : ""}
      ORDER BY "hoTen" ASC;
    `;
        // Thực thi đồng thời
        const [demographics, residence, details] = await Promise.all([
            database_1.default.query(mainQuery),
            database_1.default.query(resSummaryQuery),
            database_1.default.query(detailQuery),
        ]);
        res.json({
            success: true,
            demographics: demographics.rows,
            residence: residence.rows,
            details: details.rows,
        });
    }
    catch (err) {
        console.error("Lỗi Backend ThongKe:", err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});
exports.default = router;
