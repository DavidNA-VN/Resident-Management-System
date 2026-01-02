"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Configure multer for file uploads
const uploadsDir = path_1.default.join(__dirname, "../../uploads");
if (!fs_1.default.existsSync(uploadsDir)) {
    fs_1.default.mkdirSync(uploadsDir, { recursive: true });
}
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path_1.default.extname(file.originalname));
    },
});
const upload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        // Allow common document and image types
        const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt/;
        const extname = allowedTypes.test(path_1.default.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (mimetype && extname) {
            return cb(null, true);
        }
        else {
            cb(new Error("Only document and image files are allowed!"));
        }
    },
});
const router = (0, express_1.Router)();
/**
 * GET /citizen/household
 * Lấy hộ khẩu của người dân hiện tại (dựa vào personId trong users)
 */
router.get("/citizen/household", auth_middleware_1.requireAuth, (0, auth_middleware_1.requireRole)(["nguoi_dan"]), async (req, res, next) => {
    try {
        const userId = req.user.id;
        // Kiểm tra user có linked không
        const userResult = await (0, db_1.query)(`SELECT "personId" FROM users WHERE id = $1`, [userId]);
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
        const nhanKhauResult = await (0, db_1.query)(`SELECT id, "hoKhauId" FROM nhan_khau WHERE id = $1`, [personId]);
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
        const hoKhauResult = await (0, db_1.query)(`SELECT * FROM ho_khau WHERE id = $1`, [
            hoKhauId,
        ]);
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
        const membersResult = await (0, db_1.query)(`SELECT
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
        END, "createdAt" ASC`, [hoKhauId]);
        // Tìm chủ hộ
        let chuHo = null;
        if (hoKhau.chuHoId) {
            const chuHoResult = await (0, db_1.query)(`SELECT
          id, "hoTen", "biDanh", cccd,
          "ngayCapCCCD"::text AS "ngayCapCCCD",
          "noiCapCCCD",
          "ngaySinh"::text AS "ngaySinh",
          "gioiTinh", "noiSinh", "nguyenQuan", "danToc", "tonGiao", "quocTich",
          "hoKhauId", "quanHe",
          "ngayDangKyThuongTru"::text AS "ngayDangKyThuongTru",
          "diaChiThuongTruTruoc", "ngheNghiep", "noiLamViec", "ghiChu",
          "trangThai", "userId", "createdAt", "updatedAt"
         FROM nhan_khau WHERE id = $1`, [hoKhau.chuHoId]);
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
    }
    catch (err) {
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
        const householdsResult = await (0, db_1.query)(`SELECT id, "soHoKhau", "diaChi", "tinhThanh", "quanHuyen", "phuongXa", "duongPho", "soNha", "trangThai"
       FROM ho_khau
       WHERE "trangThai" = 'active'
       ORDER BY "soHoKhau" ASC`);
        return res.json({
            success: true,
            data: householdsResult.rows,
        });
    }
    catch (err) {
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
router.get("/citizen/me/households", auth_middleware_1.requireAuth, (0, auth_middleware_1.requireRole)(["nguoi_dan"]), async (req, res, next) => {
    try {
        const userId = req.user.id;
        // Try users.personId first
        const userRow = await (0, db_1.query)(`SELECT "personId", username FROM users WHERE id = $1`, [userId]);
        if (userRow.rowCount === 0) {
            return res
                .status(404)
                .json({
                success: false,
                error: { code: "NOT_FOUND", message: "User not found" },
            });
        }
        const personId = userRow.rows[0].personId;
        const username = String(userRow.rows[0].username || "").trim();
        console.log("[GET /citizen/me/households] userId:", userId, "personId:", personId, "username:", username);
        let households = [];
        if (personId) {
            // find the nhan_khau and its ho_khau
            const nhResult = await (0, db_1.query)(`SELECT hk.id, hk."soHoKhau", hk."diaChi", hk."trangThai"
         FROM nhan_khau nk
         JOIN ho_khau hk ON nk."hoKhauId" = hk.id
         WHERE nk.id = $1`, [personId]);
            if ((nhResult?.rowCount ?? 0) > 0) {
                households.push(nhResult.rows[0]);
            }
        }
        else if (username) {
            // Try to match username as CCCD (remove spaces)
            const norm = username.replace(/\s+/g, "");
            const matchResult = await (0, db_1.query)(`SELECT hk.id, hk."soHoKhau", hk."diaChi", hk."trangThai"
         FROM nhan_khau nk
         JOIN ho_khau hk ON nk."hoKhauId" = hk.id
         WHERE REPLACE(COALESCE(nk.cccd,''),' ','') = $1
         LIMIT 1`, [norm]);
            if ((matchResult?.rowCount ?? 0) > 0) {
                households.push(matchResult.rows[0]);
            }
        }
        if (households.length === 0) {
            return res.status(200).json({
                success: false,
                error: {
                    code: "NOT_LINKED",
                    message: "Tài khoản chưa liên kết nhân khẩu",
                },
            });
        }
        return res.json({ success: true, data: households });
    }
    catch (err) {
        next(err);
    }
});
/**
 * POST /citizen/tam-tru-vang
 * Tạo yêu cầu tạm trú/tạm vắng kèm file đính kèm
 */
router.post("/citizen/tam-tru-vang", auth_middleware_1.requireAuth, (0, auth_middleware_1.requireRole)(["nguoi_dan"]), upload.array("attachments", 5), async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { loai, nhanKhauId, tuNgay, denNgay, diaChi, lyDo } = req.body;
        const headInfo = await (0, db_1.query)(`SELECT u."personId", nk."hoKhauId", hk."chuHoId"
       FROM users u
       JOIN nhan_khau nk ON u."personId" = nk.id
       JOIN ho_khau hk ON nk."hoKhauId" = hk.id
       WHERE u.id = $1`, [userId]);
        if ((headInfo?.rowCount ?? 0) === 0 ||
            !headInfo.rows[0].personId ||
            Number(headInfo.rows[0].personId) !== Number(headInfo.rows[0].chuHoId)) {
            return res.status(403).json({
                success: false,
                error: {
                    code: "NOT_HEAD_OF_HOUSEHOLD",
                    message: "Chỉ chủ hộ đã liên kết mới được phép tạo yêu cầu",
                },
            });
        }
        const headHouseholdId = Number(headInfo.rows[0].hoKhauId);
        // Validate loai
        if (!["tam_tru", "tam_vang"].includes(loai)) {
            return res.status(400).json({
                success: false,
                error: {
                    code: "VALIDATION_ERROR",
                    message: "Loại phải là 'tam_tru' hoặc 'tam_vang'",
                },
            });
        }
        // For both types, require tuNgay + diaChi + lyDo
        if (!tuNgay || !diaChi || !lyDo) {
            return res.status(400).json({
                success: false,
                error: {
                    code: "VALIDATION_ERROR",
                    message: "Thiếu thông tin bắt buộc: tuNgay, diaChi, lyDo",
                },
            });
        }
        // Validate date range when provided
        const parsedTuNgay = new Date(tuNgay);
        const parsedDenNgay = denNgay ? new Date(denNgay) : null;
        if (isNaN(parsedTuNgay.getTime())) {
            return res.status(400).json({
                success: false,
                error: { code: "VALIDATION_ERROR", message: "tuNgay không hợp lệ" },
            });
        }
        if (parsedDenNgay && isNaN(parsedDenNgay.getTime())) {
            return res.status(400).json({
                success: false,
                error: { code: "VALIDATION_ERROR", message: "denNgay không hợp lệ" },
            });
        }
        if (parsedDenNgay && parsedTuNgay >= parsedDenNgay) {
            return res.status(400).json({
                success: false,
                error: {
                    code: "VALIDATION_ERROR",
                    message: "tuNgay phải nhỏ hơn denNgay",
                },
            });
        }
        // New flow: cho phép thêm nhân khẩu mới cho tạm trú
        const personInput = req.body.person || null;
        let finalNhanKhauId = nhanKhauId ? Number(nhanKhauId) : null;
        if (!finalNhanKhauId && loai === "tam_vang") {
            return res.status(400).json({
                success: false,
                error: {
                    code: "VALIDATION_ERROR",
                    message: "Tạm vắng yêu cầu chọn nhân khẩu hiện có",
                },
            });
        }
        if (!finalNhanKhauId && loai === "tam_tru") {
            // Validate minimal person fields
            const requiredPerson = [
                "hoTen",
                "ngaySinh",
                "gioiTinh",
                "noiSinh",
                "quanHe",
            ];
            const missingPerson = requiredPerson.filter((f) => !personInput || !personInput[f]);
            if (missingPerson.length > 0) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: "VALIDATION_ERROR",
                        message: `Thiếu thông tin nhân khẩu tạm trú: ${missingPerson.join(", ")}`,
                    },
                });
            }
            if (personInput.gioiTinh &&
                !["nam", "nu", "khac"].includes(personInput.gioiTinh)) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: "VALIDATION_ERROR",
                        message: "Giới tính phải là 'nam', 'nu' hoặc 'khac'",
                    },
                });
            }
        }
        // If existing nhanKhauId provided, ensure belongs to household
        if (finalNhanKhauId) {
            const nhanKhauCheck = await (0, db_1.query)(`SELECT nk.id, nk."hoKhauId", hk."chuHoId"
         FROM nhan_khau nk
         JOIN ho_khau hk ON nk."hoKhauId" = hk.id
         WHERE nk.id = $1`, [finalNhanKhauId]);
            if (nhanKhauCheck.rowCount === 0) {
                return res.status(404).json({
                    success: false,
                    error: {
                        code: "NOT_FOUND",
                        message: "Nhân khẩu không tồn tại",
                    },
                });
            }
            const nhanKhau = nhanKhauCheck.rows[0];
            if (Number(nhanKhau.hoKhauId) !== headHouseholdId) {
                return res.status(403).json({
                    success: false,
                    error: {
                        code: "FORBIDDEN",
                        message: "Bạn chỉ có thể tạo yêu cầu cho nhân khẩu trong hộ khẩu của mình",
                    },
                });
            }
        }
        // Process uploaded files
        const attachments = [];
        if (req.files && Array.isArray(req.files)) {
            for (const file of req.files) {
                const attachment = {
                    id: Date.now() + Math.random(),
                    name: file.filename,
                    originalName: file.originalname,
                    mimeType: file.mimetype,
                    size: file.size,
                    path: file.path,
                    url: `/uploads/${file.filename}`,
                    uploadedAt: new Date().toISOString(),
                };
                attachments.push(attachment);
            }
        }
        await (0, db_1.query)("BEGIN");
        // Nếu là tạm trú và chưa có nhanKhauId, tạo nhân khẩu mới ở trạng thái tạm trú
        if (!finalNhanKhauId && loai === "tam_tru") {
            // Uniqueness check cho CCCD nếu có
            if (personInput.cccd && personInput.cccd.trim() !== "") {
                const cccdCheck = await (0, db_1.query)(`SELECT id FROM nhan_khau WHERE cccd = $1`, [personInput.cccd.trim()]);
                if ((cccdCheck?.rowCount ?? 0) > 0) {
                    await (0, db_1.query)("ROLLBACK");
                    return res.status(409).json({
                        success: false,
                        error: {
                            code: "DUPLICATE_CCCD",
                            message: "CCCD đã tồn tại trong hệ thống",
                        },
                    });
                }
            }
            const quanHe = personInput.quanHe || "khac";
            const insertPerson = await (0, db_1.query)(`INSERT INTO nhan_khau (
            "hoTen", "biDanh", cccd, "ngayCapCCCD", "noiCapCCCD",
            "ngaySinh", "gioiTinh", "noiSinh", "nguyenQuan", "danToc", "tonGiao", "quocTich",
            "hoKhauId", "quanHe", "ngayDangKyThuongTru", "diaChiThuongTruTruoc",
            "ngheNghiep", "noiLamViec", "ghiChu", "trangThai"
          ) VALUES (
            $1, $2, $3, $4, $5,
            $6, $7, $8, $9, $10, $11, $12,
            $13, $14, $15, $16,
            $17, $18, $19, 'tam_tru'
          ) RETURNING id`, [
                personInput.hoTen.trim(),
                personInput.biDanh || null,
                personInput.cccd?.trim() || null,
                personInput.ngayCapCCCD || null,
                personInput.noiCapCCCD || null,
                personInput.ngaySinh,
                personInput.gioiTinh,
                personInput.noiSinh,
                personInput.nguyenQuan || null,
                personInput.danToc || null,
                personInput.tonGiao || null,
                personInput.quocTich || "Việt Nam",
                headHouseholdId,
                quanHe,
                personInput.ngayDangKyThuongTru || null,
                personInput.diaChiThuongTruTruoc || null,
                personInput.ngheNghiep || null,
                personInput.noiLamViec || null,
                personInput.ghiChu || lyDo || "Tạm trú",
            ]);
            finalNhanKhauId = insertPerson.rows[0].id;
        }
        // Insert into tam_tru_vang table
        const insertResult = await (0, db_1.query)(`INSERT INTO tam_tru_vang (
        "nhanKhauId", loai, "tuNgay", "denNgay", "diaChi", "lyDo",
        "nguoiDangKy", attachments, "trangThai"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'cho_duyet')
      RETURNING id`, [
            finalNhanKhauId,
            loai,
            tuNgay,
            denNgay || null,
            diaChi,
            lyDo,
            userId,
            JSON.stringify(attachments),
        ]);
        const tamTruVangId = insertResult.rows[0].id;
        // Also create a request record for tracking
        const requestType = loai === "tam_tru" ? "TEMPORARY_RESIDENCE" : "TEMPORARY_ABSENCE";
        const payload = {
            nhanKhauId: finalNhanKhauId,
            tuNgay,
            denNgay: denNgay || null,
            diaChi,
            lyDo,
            attachments,
        };
        if (personInput) {
            payload.person = personInput;
        }
        await (0, db_1.query)(`INSERT INTO requests ("requesterUserId", type, "targetPersonId", payload, status)
       VALUES ($1, $2, $3, $4, 'PENDING')`, [userId, requestType, finalNhanKhauId, JSON.stringify(payload)]);
        await (0, db_1.query)("COMMIT");
        return res.status(201).json({
            success: true,
            data: {
                id: tamTruVangId,
                message: "Yêu cầu đã được tạo thành công",
            },
        });
    }
    catch (err) {
        await (0, db_1.query)("ROLLBACK");
        // If error occurs and files were uploaded, clean them up
        if (req.files && Array.isArray(req.files)) {
            for (const file of req.files) {
                try {
                    if (fs_1.default.existsSync(file.path)) {
                        fs_1.default.unlinkSync(file.path);
                    }
                }
                catch (cleanupErr) {
                    console.error("Error cleaning up file:", cleanupErr);
                }
            }
        }
        next(err);
    }
});
exports.default = router;
