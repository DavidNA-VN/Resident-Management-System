import { Router } from "express";
import { query } from "../db";
import { requireAuth, requireRole } from "../middlewares/auth.middleware";
import { getCurrentDateString, normalizeDateOnly } from "../utils/date";

const router = Router();

// Enum cho các loại request (mở rộng)
export enum RequestType {
  ADD_PERSON = 'ADD_PERSON',           // Thêm nhân khẩu người lớn
  ADD_NEWBORN = 'ADD_NEWBORN',         // Thêm trẻ sơ sinh
  UPDATE_PERSON = 'UPDATE_PERSON',     // Sửa thông tin nhân khẩu
  REMOVE_PERSON = 'REMOVE_PERSON',     // Xóa nhân khẩu
  CHANGE_HEAD = 'CHANGE_HEAD',         // Đổi chủ hộ
  UPDATE_HOUSEHOLD = 'UPDATE_HOUSEHOLD', // Sửa thông tin hộ khẩu
  SPLIT_HOUSEHOLD = 'SPLIT_HOUSEHOLD', // Tách hộ khẩu
  TEMPORARY_RESIDENCE = 'TEMPORARY_RESIDENCE', // Tạm trú
  TEMPORARY_ABSENCE = 'TEMPORARY_ABSENCE', // Tạm vắng
  MOVE_OUT = 'MOVE_OUT',               // Chuyển đi
  DECEASED = 'DECEASED'                // Khai tử
}

// Status enum
export enum RequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED'
}

/**
 * POST /requests
 * Tạo yêu cầu mới (chỉ dành cho người dân)
 */
router.post("/requests", requireAuth, requireRole(["nguoi_dan"]), async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { type, targetHouseholdId, targetPersonId, payload } = req.body;

    // Validate type
    const validTypes = [RequestType.ADD_PERSON, RequestType.ADD_NEWBORN];
    const allTypes = Object.values(RequestType);

    if (!type || !allTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: `Loại yêu cầu không hợp lệ. Hỗ trợ: ${allTypes.join(", ")}`,
        },
      });
    }

    // Validate payload
    if (!payload || typeof payload !== "object") {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Thiếu hoặc payload không hợp lệ",
        },
      });
    }

    // Validate targetHouseholdId nếu có (chỉ áp dụng cho user đã linked)
    if (targetHouseholdId) {
      // Kiểm tra xem user đã linked chưa
      const userLinkCheck = await query(
        `SELECT "personId" FROM users WHERE id = $1`,
        [userId]
      );

      const isUserLinked = userLinkCheck.rows[0]?.personId !== null;

      if (isUserLinked) {
        // User đã linked thì phải validate household thuộc về họ
        const householdCheck = await query(
          `SELECT hk.id FROM ho_khau hk
           INNER JOIN nhan_khau nk ON hk.id = nk."hoKhauId"
           WHERE hk.id = $1 AND nk."userId" = $2 LIMIT 1`,
          [targetHouseholdId, userId]
        );

        if (householdCheck.rowCount === 0) {
          return res.status(403).json({
            success: false,
            error: {
              code: "FORBIDDEN",
              message: "Hộ khẩu không thuộc quyền quản lý của bạn",
            },
          });
        }
      }
      // Nếu user chưa linked, cho phép họ chỉ định householdId (tổ trưởng sẽ verify)
    }

    // Validate theo type
    let validationError = null;
    if (type === RequestType.ADD_NEWBORN) {
      validationError = validateAddNewbornPayload(payload);
    } else if (type === RequestType.ADD_PERSON) {
      validationError = validateAddPersonPayload(payload, !!targetHouseholdId);
    } else {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Loại yêu cầu này chưa được hỗ trợ",
        },
      });
    }

    if (validationError) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: validationError,
        },
      });
    }

    // Create request
    const result = await query(
      `INSERT INTO requests ("requesterUserId", type, "targetHouseholdId", "targetPersonId", payload)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, type, targetHouseholdId || null, targetPersonId || null, JSON.stringify(payload)]
    );

    return res.status(201).json({
      success: true,
      data: {
        id: result.rows[0].id,
        code: result.rows[0].code,
        type: result.rows[0].type,
        status: result.rows[0].status,
        createdAt: result.rows[0].createdAt,
        payload: JSON.parse(result.rows[0].payload),
      },
    });
  } catch (err) {
    next(err);
  }
});

// Validation functions
function validateAddNewbornPayload(payload: any): string | null {
  const newborn = payload.newborn || payload;
  const requiredFields = ["hoTen", "ngaySinh", "gioiTinh", "noiSinh"];

  const missingFields = requiredFields.filter(field => !newborn[field]);
  if (missingFields.length > 0) {
    return `Thiếu các trường bắt buộc cho trẻ sơ sinh: ${missingFields.join(", ")}`;
  }

  if (newborn.gioiTinh && !["nam", "nu", "khac"].includes(newborn.gioiTinh)) {
    return "Giới tính phải là 'nam', 'nu', hoặc 'khac'";
  }

  if (newborn.isMoiSinh !== true) {
    return "Đơn thêm con sơ sinh phải có isMoiSinh = true";
  }

  return null;
}

function validateAddPersonPayload(payload: any, hasTargetHouseholdId: boolean = false): string | null {
  const person = payload.person || payload;
  const requiredFields = ["hoTen", "ngaySinh", "gioiTinh", "noiSinh"];

  const missingFields = requiredFields.filter(field => !person[field]);
  if (missingFields.length > 0) {
    return `Thiếu các trường bắt buộc: ${missingFields.join(", ")}`;
  }

  if (person.gioiTinh && !["nam", "nu", "khac"].includes(person.gioiTinh)) {
    return "Giới tính phải là 'nam', 'nu', hoặc 'khac'";
  }

  // Nếu không có targetHouseholdId (user chưa linked), cần quanHe
  if (!hasTargetHouseholdId) {
    if (!person.quanHe) {
      return "Bạn cần chỉ định quan hệ với chủ hộ trong hộ khẩu bạn muốn gia nhập";
    }

    const validQuanHe = ['chu_ho', 'vo_chong', 'con', 'cha_me', 'anh_chi_em', 'ong_ba', 'chau', 'khac'];
    if (!validQuanHe.includes(person.quanHe)) {
      return "Quan hệ không hợp lệ";
    }
  }

  return null;
}

/**
 * GET /requests/my
 * Lấy danh sách yêu cầu của người dân hiện tại
 */
router.get("/requests/my", requireAuth, requireRole(["nguoi_dan"]), async (req, res, next) => {
  try {
    const userId = req.user!.id;

    const result = await query(
      `SELECT id, code, type, payload, status, "rejectionReason", "createdAt", "reviewedAt",
              "targetHouseholdId", "targetPersonId"
       FROM requests
       WHERE "requesterUserId" = $1
       ORDER BY "createdAt" DESC`,
      [userId]
    );

    const requests = result.rows.map((row) => ({
      id: row.id,
      code: row.code,
      type: row.type,
      status: row.status,
      rejectionReason: row.rejectionReason,
      createdAt: row.createdAt,
      reviewedAt: row.reviewedAt,
      targetHouseholdId: row.targetHouseholdId,
      targetPersonId: row.targetPersonId,
      payload: JSON.parse(row.payload),
    }));

    return res.json({
      success: true,
      data: requests,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /requests/:id
 * Lấy chi tiết một yêu cầu (chủ đơn hoặc tổ trưởng)
 */
router.get("/requests/:id", requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const requestId = Number(req.params.id);

    if (!requestId) {
      return res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "ID yêu cầu không hợp lệ" },
      });
    }

    // Check if user is requester or leader
    const isLeader = ["to_truong", "to_pho"].includes(req.user!.role);
    const isRequester = await query(
      `SELECT id FROM requests WHERE id = $1 AND "requesterUserId" = $2`,
      [requestId, userId]
    );

    if (!isLeader && isRequester.rowCount === 0) {
      return res.status(403).json({
        success: false,
        error: { code: "FORBIDDEN", message: "Không có quyền xem yêu cầu này" },
      });
    }

    const result = await query(
      `SELECT r.*, u."fullName" as requesterName, ru."fullName" as reviewerName
       FROM requests r
       LEFT JOIN users u ON r."requesterUserId" = u.id
       LEFT JOIN users ru ON r."reviewedBy" = ru.id
       WHERE r.id = $1`,
      [requestId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Yêu cầu không tồn tại" },
      });
    }

    const row = result.rows[0];
    return res.json({
      success: true,
      data: {
        id: row.id,
        code: row.code,
        type: row.type,
        status: row.status,
        rejectionReason: row.rejectionReason,
        createdAt: row.createdAt,
        reviewedAt: row.reviewedAt,
        targetHouseholdId: row.targetHouseholdId,
        targetPersonId: row.targetPersonId,
        payload: JSON.parse(row.payload),
        requesterName: row.requesterName,
        reviewerName: row.reviewerName,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /requests
 * Lấy danh sách yêu cầu (chỉ tổ trưởng)
 */
router.get("/requests", requireAuth, requireRole(["to_truong", "to_pho"]), async (req, res, next) => {
  try {
    const { status, type } = req.query;

    let queryStr = `
      SELECT r.id, r.code, r.type, r.status, r."createdAt", r.priority,
             u."fullName" as requesterName, hk."soHoKhau" as householdCode
      FROM requests r
      LEFT JOIN users u ON r."requesterUserId" = u.id
      LEFT JOIN ho_khau hk ON r."targetHouseholdId" = hk.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (status) {
      queryStr += ` AND r.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (type) {
      queryStr += ` AND r.type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    queryStr += ` ORDER BY r.priority DESC, r."createdAt" DESC`;

    const result = await query(queryStr, params);

    return res.json({
      success: true,
      data: result.rows,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /requests/:id/approve
 * Duyệt yêu cầu (chỉ tổ trưởng)
 */
router.post("/requests/:id/approve", requireAuth, requireRole(["to_truong", "to_pho"]), async (req, res, next) => {
  try {
    const requestId = Number(req.params.id);
    const reviewerId = req.user!.id;
    const { householdId } = req.body; // Tổ trưởng có thể chỉ định householdId cho ADD_PERSON

    if (!requestId) {
      return res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "ID yêu cầu không hợp lệ" },
      });
    }

    // Get request details
    const requestResult = await query(
      `SELECT * FROM requests WHERE id = $1`,
      [requestId]
    );

    if (requestResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Yêu cầu không tồn tại" },
      });
    }

    const request = requestResult.rows[0];
    if (request.status !== "PENDING") {
      return res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Yêu cầu đã được xử lý" },
      });
    }

    const payload = JSON.parse(request.payload);

    // Process approval based on type using dispatcher
    const approvalHandler = getApprovalHandler(request.type);
    if (!approvalHandler) {
      return res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Loại yêu cầu chưa được hỗ trợ" },
      });
    }

    // Sử dụng householdId từ body nếu được cung cấp (cho ADD_PERSON), nếu không dùng từ request
    const finalHouseholdId = householdId || request.targetHouseholdId;
    await approvalHandler(requestId, payload, reviewerId, finalHouseholdId, request.targetPersonId);

    // Update request status
    await query(
      `UPDATE requests
       SET status = 'APPROVED', "reviewedBy" = $1, "reviewedAt" = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [reviewerId, requestId]
    );

    return res.json({
      success: true,
      message: "Yêu cầu đã được duyệt thành công",
    });
  } catch (err: any) {
    // If it's our custom error, return it directly
    if (err.code && err.message) {
      return res.status(400).json({
        success: false,
        error: { code: err.code, message: err.message },
      });
    }
    next(err);
  }
});

/**
 * POST /requests/:id/reject
 * Từ chối yêu cầu (chỉ tổ trưởng)
 */
router.post("/requests/:id/reject", requireAuth, requireRole(["to_truong", "to_pho"]), async (req, res, next) => {
  try {
    const requestId = Number(req.params.id);
    const reviewerId = req.user!.id;
    const { reason } = req.body;

    if (!requestId) {
      return res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "ID yêu cầu không hợp lệ" },
      });
    }

    if (!reason || reason.trim() === "") {
      return res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Cần cung cấp lý do từ chối" },
      });
    }

    // Check if request exists and is pending
    const requestCheck = await query(
      `SELECT status FROM requests WHERE id = $1`,
      [requestId]
    );

    if (requestCheck.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Yêu cầu không tồn tại" },
      });
    }

    if (requestCheck.rows[0].status !== "PENDING") {
      return res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Yêu cầu đã được xử lý" },
      });
    }

    // Update request status
    await query(
      `UPDATE requests
       SET status = 'REJECTED', "rejectionReason" = $1, "reviewedBy" = $2, "reviewedAt" = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [reason.trim(), reviewerId, requestId]
    );

    return res.json({
      success: true,
      message: "Yêu cầu đã bị từ chối",
    });
  } catch (err) {
    next(err);
  }
});

// Dispatcher function để lấy handler tương ứng
function getApprovalHandler(type: string): ApprovalHandler | null {
  const handlers: Record<string, ApprovalHandler> = {
    [RequestType.ADD_NEWBORN]: processAddNewbornApproval,
    [RequestType.ADD_PERSON]: processAddPersonApproval,
  };

  return handlers[type] || null;
}

type ApprovalHandler = (
  requestId: number,
  payload: any,
  reviewerId: number,
  targetHouseholdId?: number,
  targetPersonId?: number
) => Promise<void>;

/**
 * Process ADD_NEWBORN approval
 */
async function processAddNewbornApproval(
  requestId: number,
  payload: any,
  reviewerId: number,
  targetHouseholdId?: number
) {
  // Start transaction
  await query("BEGIN");

  try {
    const newborn = payload.newborn || payload;
    const householdId = targetHouseholdId || newborn.householdId;
    const { hoTen, ngaySinh, gioiTinh, noiSinh, nguyenQuan, danToc, tonGiao, quocTich, cccd, ghiChu } = newborn;

    // 1. Check household exists
    const householdCheck = await query(
      `SELECT id, "trangThai" FROM ho_khau WHERE id = $1`,
      [householdId]
    );

    if (householdCheck.rowCount === 0) {
      throw { code: "HOUSEHOLD_NOT_FOUND", message: "Hộ khẩu không tồn tại" };
    }

    const household = householdCheck.rows[0];
    if (household.trangThai !== "active") {
      throw { code: "HOUSEHOLD_INACTIVE", message: "Hộ khẩu chưa được kích hoạt" };
    }

    // 2. Validate CCCD if provided (should be unique if present)
    if (cccd && cccd.trim() !== "") {
      const cccdCheck = await query(
        `SELECT id FROM nhan_khau WHERE cccd = $1`,
        [cccd.trim()]
      );

      if (cccdCheck.rowCount > 0) {
        throw { code: "DUPLICATE_CCCD", message: "Số CCCD đã tồn tại trong hệ thống" };
      }
    }

    // 3. Basic duplicate prevention for newborns (same name + birth date + household)
    const duplicateCheck = await query(
      `SELECT id FROM nhan_khau
       WHERE "hoKhauId" = $1 AND "hoTen" = $2 AND "ngaySinh" = $3 AND "quanHe" = 'con'`,
      [householdId, hoTen.trim(), ngaySinh]
    );

    if (duplicateCheck.rowCount > 0) {
      throw { code: "DUPLICATE_NEWBORN", message: "Trẻ sơ sinh với thông tin tương tự đã tồn tại trong hộ khẩu" };
    }

    // 4. Auto-set fields for newborns
    const processedGhiChu = ghiChu || (cccd ? "Mới sinh" : "Mới sinh - chưa có CCCD");
    const processedNgheNghiep = null;
    const processedNoiLamViec = null;
    const processedDiaChiThuongTruTruoc = "mới sinh";

    // 5. Insert new nhan_khau
    const insertResult = await query(
      `INSERT INTO nhan_khau (
        "hoKhauId", "hoTen", cccd, "ngaySinh", gioiTinh, "noiSinh", nguyenQuan, danToc, tonGiao, quocTich,
        "quanHe", "ngayDangKyThuongTru", "diaChiThuongTruTruoc", ngheNghiep, "noiLamViec", ghiChu
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        'con', CURRENT_DATE, $11, $12, $13, $14
      ) RETURNING *`,
      [
        householdId,
        hoTen.trim(),
        cccd ? cccd.trim() : null,
        ngaySinh,
        gioiTinh,
        noiSinh.trim(),
        nguyenQuan ? nguyenQuan.trim() : null,
        danToc ? danToc.trim() : null,
        tonGiao ? tonGiao.trim() : null,
        quocTich ? quocTich.trim() : "Việt Nam",
        processedDiaChiThuongTruTruoc,
        processedNgheNghiep,
        processedNoiLamViec,
        processedGhiChu,
      ]
    );

    await query("COMMIT");

  } catch (err) {
    await query("ROLLBACK");
    throw err;
  }
}

/**
 * Process ADD_PERSON approval
 */
async function processAddPersonApproval(
  requestId: number,
  payload: any,
  reviewerId: number,
  targetHouseholdId?: number
) {
  // Start transaction
  await query("BEGIN");

  try {
    const person = payload.person || payload;
    let householdId = targetHouseholdId;

    // Nếu không có targetHouseholdId từ request, kiểm tra trong payload
    if (!householdId) {
      householdId = person.householdId;
    }

    // Nếu vẫn không có, lấy householdId từ quan hệ gia đình (nếu có)
    // Hoặc yêu cầu tổ trưởng chỉ định
    if (!householdId) {
      throw { code: "HOUSEHOLD_REQUIRED", message: "Cần chỉ định hộ khẩu để thêm nhân khẩu vào. Vui lòng liên hệ tổ trưởng." };
    }
    const { hoTen, cccd, ngaySinh, gioiTinh, noiSinh, nguyenQuan, danToc, tonGiao, quocTich, quanHe, ngayDangKyThuongTru, diaChiThuongTruTruoc, ngheNghiep, noiLamViec, ghiChu } = person;

    // 1. Check household exists and is active
    const householdCheck = await query(
      `SELECT id, "trangThai" FROM ho_khau WHERE id = $1`,
      [householdId]
    );

    if (householdCheck.rowCount === 0) {
      throw { code: "HOUSEHOLD_NOT_FOUND", message: "Hộ khẩu không tồn tại" };
    }

    const household = householdCheck.rows[0];
    if (household.trangThai !== "active") {
      throw { code: "HOUSEHOLD_INACTIVE", message: "Hộ khẩu chưa được kích hoạt" };
    }

    // 2. Validate CCCD if provided (must be unique)
    if (cccd && cccd.trim() !== "") {
      const cccdCheck = await query(
        `SELECT id FROM nhan_khau WHERE cccd = $1`,
        [cccd.trim()]
      );

      if (cccdCheck.rowCount > 0) {
        throw { code: "DUPLICATE_CCCD", message: "Số CCCD đã tồn tại trong hệ thống" };
      }
    }

    // 3. Basic duplicate prevention (same name + birth date + household)
    const duplicateCheck = await query(
      `SELECT id FROM nhan_khau
       WHERE "hoKhauId" = $1 AND "hoTen" = $2 AND "ngaySinh" = $3`,
      [householdId, hoTen.trim(), ngaySinh]
    );

    if (duplicateCheck.rowCount > 0) {
      throw { code: "DUPLICATE_PERSON", message: "Người này đã tồn tại trong hộ khẩu" };
    }

    // 4. Validate quanHe (relationship)
    if (!quanHe) {
      throw { code: "INVALID_RELATIONSHIP", message: "Phải chỉ định quan hệ với chủ hộ" };
    }

    const validQuanHe = ['chu_ho', 'vo_chong', 'con', 'cha_me', 'anh_chi_em', 'ong_ba', 'chau', 'khac'];
    if (!validQuanHe.includes(quanHe)) {
      throw { code: "INVALID_RELATIONSHIP", message: "Quan hệ không hợp lệ" };
    }

    // 5. If quanHe is 'chu_ho', check if household already has a head
    if (quanHe === 'chu_ho') {
      const existingChuHo = await query(
        `SELECT id FROM nhan_khau WHERE "hoKhauId" = $1 AND "quanHe" = 'chu_ho'`,
        [householdId]
      );

      if (existingChuHo.rowCount > 0) {
        throw { code: "DUPLICATE_CHU_HO", message: "Hộ khẩu đã có chủ hộ. Vui lòng sử dụng chức năng đổi chủ hộ." };
      }
    }

    // 6. Auto-set fields for person
    const processedGhiChu = ghiChu || (cccd ? "" : "Chưa có CCCD");
    const processedNgayDangKyThuongTru = ngayDangKyThuongTru || getCurrentDateString();
    const processedDiaChiThuongTruTruoc = diaChiThuongTruTruoc || "";

    // 7. Insert new nhan_khau
    const insertResult = await query(
      `INSERT INTO nhan_khau (
        "hoKhauId", "hoTen", cccd, "ngaySinh", gioiTinh, "noiSinh", nguyenQuan, danToc, tonGiao, quocTich,
        "quanHe", "ngayDangKyThuongTru", "diaChiThuongTruTruoc", ngheNghiep, "noiLamViec", ghiChu
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16
      ) RETURNING *`,
      [
        householdId,
        hoTen.trim(),
        cccd ? cccd.trim() : null,
        ngaySinh,
        gioiTinh,
        noiSinh.trim(),
        nguyenQuan ? nguyenQuan.trim() : null,
        danToc ? danToc.trim() : null,
        tonGiao ? tonGiao.trim() : null,
        quocTich ? quocTich.trim() : "Việt Nam",
        quanHe,
        processedNgayDangKyThuongTru,
        processedDiaChiThuongTruTruoc,
        ngheNghiep || null,
        noiLamViec || null,
        processedGhiChu,
      ]
    );

    // 8. If this person becomes chu_ho, update ho_khau
    if (quanHe === 'chu_ho') {
      await query(
        `UPDATE ho_khau SET "chuHoId" = $1 WHERE id = $2`,
        [insertResult.rows[0].id, householdId]
      );
    }

    // 9. Link user if CCCD was provided
    if (cccd && cccd.trim() !== "") {
      await query(
        `UPDATE users
         SET "personId" = $1
         WHERE role = 'nguoi_dan'
           AND "personId" IS NULL
           AND normalize_cccd(username) = normalize_cccd($2)`,
        [insertResult.rows[0].id, cccd.trim()]
      );
    }

    await query("COMMIT");

  } catch (err) {
    await query("ROLLBACK");
    throw err;
  }
}

export default router;

