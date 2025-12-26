import { Router } from "express";
import { query } from "../db";
import { requireAuth, requireRole } from "../middlewares/auth.middleware";

const router = Router();

/**
 * GET /citizen/household
 * Lấy hộ khẩu của người dân hiện tại (dựa vào personId trong users)
 */
router.get("/citizen/household", requireAuth, requireRole(["nguoi_dan"]), async (req, res, next) => {
  try {
    const userId = req.user!.id;

    // Kiểm tra user có linked không
    const userResult = await query(
      `SELECT "personId" FROM users WHERE id = $1`,
      [userId]
    );

    if (userResult.rowCount === 0 || !userResult.rows[0].personId) {
      return res.status(200).json({
        success: false,
        error: {
          code: "NOT_LINKED",
          message: "Tài khoản chưa liên kết với hồ sơ nhân khẩu",
        },
      });
    }

    const personId = userResult.rows[0].personId;

    // Tìm nhân khẩu của user này
    const nhanKhauResult = await query(
      `SELECT id, "hoKhauId" FROM nhan_khau WHERE id = $1`,
      [personId]
    );

    if (nhanKhauResult.rowCount === 0) {
      return res.status(200).json({
        success: false,
        error: {
          code: "NOT_LINKED",
          message: "Hồ sơ nhân khẩu không tồn tại",
        },
      });
    }

    const nhanKhau = nhanKhauResult.rows[0];
    const hoKhauId = nhanKhau.hoKhauId;

    // Lấy thông tin hộ khẩu
    const hoKhauResult = await query(
      `SELECT * FROM ho_khau WHERE id = $1`,
      [hoKhauId]
    );

    if (hoKhauResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Không tìm thấy hộ khẩu",
        },
      });
    }

    const hoKhau = hoKhauResult.rows[0];

    // Lấy danh sách nhân khẩu trong hộ
    const membersResult = await query(
      `SELECT
        id, "hoTen", "biDanh", cccd,
        "ngayCapCCCD"::text AS "ngayCapCCCD",
        "noiCapCCCD",
        "ngaySinh"::text AS "ngaySinh",
        "gioiTinh", "noiSinh", "nguyenQuan", "danToc", "tonGiao", "quocTich",
        "hoKhauId", "quanHe",
        "ngayDangKyThuongTru"::text AS "ngayDangKyThuongTru",
        "diaChiThuongTruTruoc", "ngheNghiep", "noiLamViec", "ghiChu",
        "trangThai", "userId", "createdAt", "updatedAt"
       FROM nhan_khau WHERE "hoKhauId" = $1 ORDER BY
        CASE "quanHe"
          WHEN 'chu_ho' THEN 1
          ELSE 2
        END, "createdAt" ASC`,
      [hoKhauId]
    );

    // Tìm chủ hộ
    let chuHo = null;
    if (hoKhau.chuHoId) {
      const chuHoResult = await query(
        `SELECT
          id, "hoTen", "biDanh", cccd,
          "ngayCapCCCD"::text AS "ngayCapCCCD",
          "noiCapCCCD",
          "ngaySinh"::text AS "ngaySinh",
          "gioiTinh", "noiSinh", "nguyenQuan", "danToc", "tonGiao", "quocTich",
          "hoKhauId", "quanHe",
          "ngayDangKyThuongTru"::text AS "ngayDangKyThuongTru",
          "diaChiThuongTruTruoc", "ngheNghiep", "noiLamViec", "ghiChu",
          "trangThai", "userId", "createdAt", "updatedAt"
         FROM nhan_khau WHERE id = $1`,
        [hoKhau.chuHoId]
      );
      if (chuHoResult.rowCount > 0) {
        chuHo = chuHoResult.rows[0];
      }
    }

    return res.json({
      success: true,
      data: {
        household: hoKhau,
        members: membersResult.rows,
        chuHo: chuHo || undefined,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /citizen/households
 * Lấy danh sách hộ khẩu để người dân chọn khi tạo request
 */
router.get("/citizen/households", async (req, res, next) => {
  try {
    // Lấy danh sách hộ khẩu active (có thể filter theo điều kiện)
    const householdsResult = await query(
      `SELECT id, "soHoKhau", diaChi, tinhThanh, quanHuyen, phuongXa, duongPho, soNha, trangThai
       FROM ho_khau
       WHERE trangThai = 'active'
       ORDER BY "soHoKhau" ASC`
    );

    return res.json({
      success: true,
      data: householdsResult.rows,
    });
  } catch (err) {
    next(err);
  }
});

export default router;

