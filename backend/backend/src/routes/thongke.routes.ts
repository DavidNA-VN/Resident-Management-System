import { Router } from 'express';
import pool from '../database';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { genders, ageGroups, residenceTypes, startDate, endDate } = req.query;
    const gList = Array.isArray(genders) ? genders : genders ? [genders] : [];
    const aList = Array.isArray(ageGroups) ? ageGroups : ageGroups ? [ageGroups] : [];
    const rList = Array.isArray(residenceTypes) ? residenceTypes : residenceTypes ? [residenceTypes] : [];

    // 1. Xây dựng điều kiện lọc cơ bản cho nhân khẩu
    let baseFilter = ` WHERE nk."trangThai" != 'deleted'`;
    if (gList.length > 0) baseFilter += ` AND nk."gioiTinh" IN (${gList.map(g => `'${g}'`).join(',')})`;
    if (startDate) baseFilter += ` AND nk."createdAt" >= '${startDate}'`;
    if (endDate) baseFilter += ` AND nk."createdAt" <= '${endDate}'`;

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
            WHEN (("gioiTinh"='nam' AND a BETWEEN 18 AND 60) OR ("gioiTinh"='nu' AND a BETWEEN 18 AND 55)) THEN 'lao_dong'
            WHEN (("gioiTinh"='nam' AND a > 60) OR ("gioiTinh"='nu' AND a > 55)) THEN 'nghi_huu' ELSE 'khac'
          END as age_group
        FROM (SELECT "gioiTinh", EXTRACT(YEAR FROM AGE(CURRENT_DATE, "ngaySinh")) as a FROM nhan_khau nk ${baseFilter}) as sub
      ) as final
      ${aList.length > 0 ? `WHERE age_group IN (${aList.map(a => `'${a}'`).join(',')})` : ''}
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
      ${rList.length > 0 ? `WHERE status IN (${rList.map(r => `'${r}'`).join(',')})` : ''}
      ORDER BY "hoTen" ASC;
    `;

    // Thực thi đồng thời
    const [demographics, residence, details] = await Promise.all([
      pool.query(mainQuery),
      pool.query(resSummaryQuery),
      pool.query(detailQuery)
    ]);

    res.json({ 
      success: true, 
      demographics: demographics.rows, 
      residence: residence.rows,
      details: details.rows 
    });
  } catch (err: any) {
    console.error("Lỗi Backend ThongKe:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /thongke/phan-anh - Thống kê về các phản ánh
router.get('/phan-anh', async (req, res) => {
  try {
    const { loai, tuNgay, denNgay, trangThai } = req.query;
    
    let where = [];
    let params: any[] = [];
    let idx = 1;

    // Lọc theo loại phản ánh
    if (loai && loai !== 'all') {
      where.push(`pa.loai = $${idx++}`);
      params.push(loai);
    }

    // Lọc theo ngày từ
    if (tuNgay) {
      where.push(`pa."ngayTao" >= $${idx++}`);
      params.push(tuNgay);
    }

    // Lọc theo ngày đến
    if (denNgay) {
      where.push(`pa."ngayTao" <= $${idx++}`);
      params.push(denNgay + ' 23:59:59'); // Bao gồm cả ngày cuối
    }

    // Lọc theo trạng thái xử lý
    // "chua_xu_ly" = cho_xu_ly, "da_xu_ly" = da_xu_ly
    if (trangThai === 'chua_xu_ly') {
      where.push(`pa."trangThai" = $${idx++}`);
      params.push('cho_xu_ly');
    } else if (trangThai === 'da_xu_ly') {
      where.push(`pa."trangThai" = $${idx++}`);
      params.push('da_xu_ly');
    }

    // Ẩn các phản ánh đã bị gộp
    where.push(`(pa."ketQuaXuLy" IS NULL OR pa."ketQuaXuLy" NOT LIKE 'Đã gộp vào phản ánh ID: %')`);

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    // Query lấy danh sách phản ánh với thông tin người phản ánh (CCCD và tên)
    // Lấy người phản ánh đầu tiên từ phan_anh_nguoi
    const querySql = `
      SELECT 
        pa.id,
        pa."tieuDe",
        pa."noiDung",
        pa.loai,
        pa."trangThai",
        pa."ngayTao",
        COALESCE(nk.cccd, u.username) as cccd,
        COALESCE(nk."hoTen", u."fullName") as ten
      FROM phan_anh pa
      LEFT JOIN LATERAL (
        SELECT pan."nguoiPhanAnhId"
        FROM phan_anh_nguoi pan
        WHERE pan."phanAnhId" = pa.id
        ORDER BY pan.id ASC
        LIMIT 1
      ) first_reporter ON true
      LEFT JOIN users u ON first_reporter."nguoiPhanAnhId" = u.id
      LEFT JOIN nhan_khau nk ON u."personId" = nk.id
      ${whereClause}
      ORDER BY pa."ngayTao" DESC
    `;

    const result = await pool.query(querySql, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (err: any) {
    console.error("Lỗi Backend Thống kê Phản ánh:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;