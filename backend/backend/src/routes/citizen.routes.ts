import { Router } from "express";
import { query } from "../db";
import { requireAuth, requireRole } from "../middlewares/auth.middleware";
import multer from "multer";
import path from "path";
import fs from "fs";

// Configure multer for file uploads
const uploadsDir = path.join(__dirname, "../../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow common document and image types
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only document and image files are allowed!'));
    }
  }
});

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
      if ((chuHoResult?.rowCount ?? 0) > 0) {
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

/**
 * GET /citizen/me/households
 * Lấy danh sách (thực tế 1 phần tử) hộ khẩu liên quan tới tài khoản người dân hiện tại.
 * Logic:
 *  - Nếu users.personId tồn tại: lấy nhan_khau theo personId -> trả về ho_khau của người đó
 *  - Nếu personId không có: thử khớp username (CCCD) với nhan_khau.cccd (bỏ space) và trả về ho_khau tương ứng
 */
router.get("/citizen/me/households", requireAuth, requireRole(["nguoi_dan"]), async (req, res, next) => {
  try {
    const userId = req.user!.id;

    // Try users.personId first
    const userRow = await query(`SELECT "personId", username FROM users WHERE id = $1`, [userId]);
    if (userRow.rowCount === 0) {
      return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "User not found" } });
    }

    const personId = userRow.rows[0].personId;
    const username = String(userRow.rows[0].username || "").trim();

    console.log("[GET /citizen/me/households] userId:", userId, "personId:", personId, "username:", username);

    let households: any[] = [];

    if (personId) {
      // find the nhan_khau and its ho_khau
      const nhResult = await query(
        `SELECT hk.id, hk."soHoKhau", hk.diaChi, hk.trangThai
         FROM nhan_khau nk
         JOIN ho_khau hk ON nk."hoKhauId" = hk.id
         WHERE nk.id = $1`,
        [personId]
      );
      if ((nhResult?.rowCount ?? 0) > 0) {
        households.push(nhResult.rows[0]);
      }
    } else if (username) {
      // Try to match username as CCCD (remove spaces)
      const norm = username.replace(/\s+/g, "");
      const matchResult = await query(
        `SELECT hk.id, hk."soHoKhau", hk.diaChi, hk.trangThai
         FROM nhan_khau nk
         JOIN ho_khau hk ON nk."hoKhauId" = hk.id
         WHERE REPLACE(COALESCE(nk.cccd,''),' ','') = $1
         LIMIT 1`,
        [norm]
      );
      if ((matchResult?.rowCount ?? 0) > 0) {
        households.push(matchResult.rows[0]);
      }
    }

    if (households.length === 0) {
      return res.status(200).json({
        success: false,
        error: { code: "NOT_LINKED", message: "Tài khoản chưa liên kết nhân khẩu" },
      });
    }

    return res.json({ success: true, data: households });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /citizen/tam-tru-vang
 * Tạo yêu cầu tạm trú/tạm vắng kèm file đính kèm
 */
router.post("/citizen/tam-tru-vang", requireAuth, requireRole(["nguoi_dan"]), upload.array('attachments', 5), async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { loai, nhanKhauId, tuNgay, denNgay, diaChi, lyDo } = req.body;

    // Validate required fields
    if (!loai || !nhanKhauId || !tuNgay || !diaChi || !lyDo) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Thiếu thông tin bắt buộc: loai, nhanKhauId, tuNgay, diaChi, lyDo"
        }
      });
    }

    // Validate loai
    if (!['tam_tru', 'tam_vang'].includes(loai)) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Loại phải là 'tam_tru' hoặc 'tam_vang'"
        }
      });
    }

    // Check if nhanKhauId belongs to user's household
    const nhanKhauCheck = await query(
      `SELECT nk.id, nk."hoKhauId", hk."chuHoId"
       FROM nhan_khau nk
       JOIN ho_khau hk ON nk."hoKhauId" = hk.id
       WHERE nk.id = $1`,
      [nhanKhauId]
    );

    if (nhanKhauCheck.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Nhân khẩu không tồn tại"
        }
      });
    }

    const nhanKhau = nhanKhauCheck.rows[0];

    // Check if user is linked to this household (either as the person or as head of household)
    const userLinkCheck = await query(
      `SELECT "personId" FROM users WHERE id = $1`,
      [userId]
    );

    const currentPersonId = userLinkCheck.rows[0]?.personId ?? null;
    const isLinkedToPerson = currentPersonId == nhanKhauId;
    // ho_khau.chuHoId stored as chuHoId was selected into nhanKhau via join; use nhanKhau.chuHoId
    const isHeadOfHousehold = currentPersonId && (nhanKhau.chuHoId ?? null) && Number(currentPersonId) === Number(nhanKhau.chuHoId);

    if (!isLinkedToPerson && !isHeadOfHousehold) {
      return res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Bạn không có quyền tạo yêu cầu cho nhân khẩu này"
        }
      });
    }

    // Process uploaded files
    const attachments = [];
    if (req.files && Array.isArray(req.files)) {
      for (const file of req.files as Express.Multer.File[]) {
        const attachment = {
          id: Date.now() + Math.random(),
          name: file.filename,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          path: file.path,
          url: `/uploads/${file.filename}`,
          uploadedAt: new Date().toISOString()
        };
        attachments.push(attachment);
      }
    }

    // Insert into tam_tru_vang table
    const insertResult = await query(
      `INSERT INTO tam_tru_vang (
        "nhanKhauId", loai, "tuNgay", "denNgay", "diaChi", "lyDo",
        "nguoiDangKy", attachments, "trangThai"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'cho_duyet')
      RETURNING id`,
      [
        nhanKhauId,
        loai,
        tuNgay,
        denNgay || null,
        diaChi,
        lyDo,
        userId,
        JSON.stringify(attachments)
      ]
    );

    const tamTruVangId = insertResult.rows[0].id;

    // Also create a request record for tracking
    const requestType = loai === 'tam_tru' ? 'TEMPORARY_RESIDENCE' : 'TEMPORARY_ABSENCE';
    const payload = {
      nhanKhauId: parseInt(nhanKhauId),
      tuNgay,
      denNgay: denNgay || null,
      diaChi,
      lyDo,
      attachments
    };

    await query(
      `INSERT INTO requests ("requesterUserId", type, "targetPersonId", payload, status)
       VALUES ($1, $2, $3, $4, 'PENDING')`,
      [userId, requestType, nhanKhauId, JSON.stringify(payload)]
    );

    return res.status(201).json({
      success: true,
      data: {
        id: tamTruVangId,
        message: "Yêu cầu đã được tạo thành công"
      }
    });

  } catch (err: any) {
    // If error occurs and files were uploaded, clean them up
    if (req.files && Array.isArray(req.files)) {
      for (const file of req.files as Express.Multer.File[]) {
        try {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        } catch (cleanupErr) {
          console.error("Error cleaning up file:", cleanupErr);
        }
      }
    }

    next(err);
  }
});

export default router;

