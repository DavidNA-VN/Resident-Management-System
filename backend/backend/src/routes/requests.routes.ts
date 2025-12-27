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
    let { type, targetHouseholdId, targetPersonId, payload } = req.body;
    // Debug: log incoming create request for troubleshooting
    try {
      console.log("[POST /requests] userId:", userId, "raw type:", req.body.type, "normalized type (pre):", type);
      console.log("[POST /requests] targetHouseholdId:", targetHouseholdId, "targetPersonId:", targetPersonId);
      console.log("[POST /requests] payload (raw):", typeof req.body.payload === "string" ? req.body.payload : JSON.stringify(req.body.payload));
    } catch (e) {
      console.log("[POST /requests] debug log error", e);
    }

    // Validate type (allow both canonical enums and legacy TAM_TRU/TAM_VANG)
    const allTypes = Object.values(RequestType).concat(["TAM_TRU", "TAM_VANG"]);

    if (!type || !allTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: `Loại yêu cầu không hợp lệ. Hỗ trợ: ${allTypes.join(", ")}`,
        },
      });
    }

    // Normalize payload: accept JSON string or object. If string, parse it.
    if (payload && typeof payload === "string") {
      try {
        payload = JSON.parse(payload);
      } catch (e) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Payload không phải JSON hợp lệ",
          },
        });
      }
    }

    // Validate payload must be an object
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
    } else if (type === RequestType.TEMPORARY_RESIDENCE || type === "TAM_TRU") {
      validationError = validateTemporaryResidencePayload(payload);
    } else if (type === RequestType.TEMPORARY_ABSENCE || type === "TAM_VANG") {
      validationError = validateTemporaryAbsencePayload(payload);
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
    try {
      console.log("[POST /requests] inserted request id:", result.rows[0]?.id);
    } catch (e) {
      // ignore
    }

    // Return minimal success payload
    const created = result.rows[0];
    return res.status(201).json({
      success: true,
      data: {
        id: created.id,
        status: (created.status || "PENDING").toLowerCase(),
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /tam-tru-vang/requests
 * List temporary residence/absence requests (alias to requests but returns normalized temporary records)
 *
 * Query params:
 *  - type?: TEMPORARY_RESIDENCE | TEMPORARY_ABSENCE | TAM_TRU | TAM_VANG | all
 *  - status?: PENDING | APPROVED | REJECTED | all (default PENDING)
 *  - fromDate?: YYYY-MM-DD  (createdAt >= fromDate)
 *  - toDate?: YYYY-MM-DD    (createdAt <= toDate)
 *  - keyword?: search term (hoTen, cccd, soHoKhau, diaChi)
 */
router.get("/tam-tru-vang/requests", requireAuth, requireRole(["to_truong", "to_pho", "can_bo"]), async (req, res, next) => {
  try {
    const { type, status, fromDate, toDate, keyword, page = "1", limit = "50" } = req.query;
    console.log("[GET /tam-tru-vang/requests] query:", { type, status, fromDate, toDate, keyword, page, limit });

    // Only temporary types
    const allowedTypes = ['TEMPORARY_RESIDENCE', 'TEMPORARY_ABSENCE', 'TAM_TRU', 'TAM_VANG'];

    let whereClause = `WHERE r.type = ANY($1::text[])`;
    const params: any[] = [allowedTypes];
    let idx = 2;

    if (type && String(type).toLowerCase() !== "all") {
      whereClause += ` AND r.type = $${idx}`;
      params.push(String(type).toUpperCase());
      idx++;
    }

    if (status && String(status).toLowerCase() !== "all") {
      whereClause += ` AND r.status = $${idx}`;
      params.push(String(status).toUpperCase());
      idx++;
    } else {
      // default to PENDING if not provided
      whereClause += ` AND r.status = $${idx}`;
      params.push("PENDING");
      idx++;
    }

    if (fromDate) {
      whereClause += ` AND r."createdAt" >= $${idx}`;
      params.push(fromDate);
      idx++;
    }
    if (toDate) {
      whereClause += ` AND r."createdAt" <= $${idx}`;
      params.push(toDate);
      idx++;
    }

    if (keyword && String(keyword).trim()) {
      const kw = `%${String(keyword).trim()}%`;
      whereClause += ` AND (
        nk."hoTen" ILIKE $${idx} OR
        nk.cccd ILIKE $${idx} OR
        hk."soHoKhau" ILIKE $${idx} OR
        hk.diaChi ILIKE $${idx}
      )`;
      params.push(kw);
      idx++;
    }

    // count total
    const countQuery = `
      SELECT COUNT(*) as total
      FROM requests r
      LEFT JOIN nhan_khau nk ON r."targetPersonId" = nk.id
      LEFT JOIN ho_khau hk ON nk."hoKhauId" = hk.id
      ${whereClause}
    `;
    const countResult = await query(countQuery, params);
    const total = parseInt(countResult.rows[0].total || "0");

    const pageNum = Math.max(1, parseInt(String(page)));
    const perPage = Math.max(1, Math.min(200, parseInt(String(limit))));
    const offset = (pageNum - 1) * perPage;

    // select normalized fields including payload jsonb extraction
    const selectQuery = `
      SELECT
        r.id, r.type, r.status, r."createdAt", r."reviewedAt", r."reviewedBy", r."rejectionReason",
        r."requesterUserId",
        (r.payload->>'tuNgay') as "tuNgay",
        (r.payload->>'denNgay') as "denNgay",
        (r.payload->>'lyDo') as "lyDo",
        NULLIF(r.payload->>'nhanKhauId','')::int as "nhanKhauId",
        u."fullName" as "requesterName",
        nk.id as "personId", nk."hoTen" as "personName", nk.cccd as "personCccd",
        hk.id as "householdId", hk."soHoKhau" as "householdCode", hk.diaChi as "householdAddress"
      FROM requests r
      LEFT JOIN users u ON r."requesterUserId" = u.id
      LEFT JOIN nhan_khau nk ON r."targetPersonId" = nk.id
      LEFT JOIN ho_khau hk ON nk."hoKhauId" = hk.id
      ${whereClause}
      ORDER BY r."createdAt" DESC
      LIMIT $${idx} OFFSET $${idx + 1}
    `;
    params.push(perPage);
    params.push(offset);

    const result = await query(selectQuery, params);

    const items = result.rows.map((row: any) => {
      let attachments = [];
      try {
        const parsedPayload = typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload;
        attachments = parsedPayload?.attachments || [];
      } catch (e) {
        attachments = [];
      }

      return {
        id: row.id,
        type: row.type,
        status: row.status,
        tuNgay: row.tuNgay,
        denNgay: row.denNgay,
        lyDo: row.lyDo,
        nhanKhauId: row.nhanKhauId,
        requesterUserId: row.requesterUserId,
        rejectionReason: row.rejectionReason,
        reviewedBy: row.reviewedBy,
        reviewedAt: row.reviewedAt,
        createdAt: row.createdAt,
        requesterName: row.requesterName,
        person: row.personId ? { id: row.personId, hoTen: row.personName, cccd: row.personCccd } : null,
        household: row.householdId ? { id: row.householdId, soHoKhau: row.householdCode, diaChi: row.householdAddress } : null,
        attachments: attachments,
      };
    });

    return res.json({
      success: true,
      data: items,
      pagination: {
        page: pageNum,
        limit: perPage,
        total,
        totalPages: Math.ceil(total / perPage),
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /tam-tru-vang/requests/:id/approve
 */
router.post("/tam-tru-vang/requests/:id/approve", requireAuth, requireRole(["to_truong", "to_pho", "can_bo"]), async (req, res, next) => {
  try {
    const requestId = Number(req.params.id);
    const reviewerId = req.user!.id;

    if (!requestId) {
      return res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "ID yêu cầu không hợp lệ" }});
    }

    const requestResult = await query(`SELECT * FROM requests WHERE id = $1`, [requestId]);
    if (requestResult.rowCount === 0) {
      return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Yêu cầu không tồn tại" }});
    }
    const reqRow = requestResult.rows[0];
    if (!["PENDING","pending","moi","cho_duyet"].includes((reqRow.status || "").toString())) {
      return res.status(400).json({ success: false, error: { code: "INVALID_STATE", message: "Yêu cầu đã được xử lý" }});
    }

    let parsedPayload = null;
    try {
      parsedPayload = typeof reqRow.payload === "string" ? JSON.parse(reqRow.payload) : reqRow.payload;
    } catch (e) {
      parsedPayload = reqRow.payload;
    }

    const nhanKhauId = parsedPayload?.nhanKhauId;
    const tuNgay = parsedPayload?.tuNgay;
    const denNgay = parsedPayload?.denNgay || null;
    const lyDo = parsedPayload?.lyDo || parsedPayload?.reason || null;

    if (!nhanKhauId || !tuNgay || !lyDo) {
      return res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Payload thiếu trường bắt buộc" }});
    }

    await query("BEGIN");
    try {
      // Check if tam_tru_vang record already exists (created by citizen)
      const existingTamTruVang = await query(
        `SELECT id FROM tam_tru_vang WHERE "nhanKhauId" = $1 AND "tuNgay" = $2 AND "trangThai" = 'cho_duyet'`,
        [nhanKhauId, tuNgay]
      );

      if (existingTamTruVang.rowCount > 0) {
        // Update existing record
        await query(
          `UPDATE tam_tru_vang SET "trangThai" = 'da_duyet', "nguoiDuyet" = $1 WHERE id = $2`,
          [reviewerId, existingTamTruVang.rows[0].id]
        );
      } else {
        // Fallback: create new record (for legacy requests)
        const loai = reqRow.type === "TAM_TRU" || reqRow.type === "TEMPORARY_RESIDENCE" ? "tam_tru" : "tam_vang";
        await query(
          `INSERT INTO tam_tru_vang ("nhanKhauId", loai, "tuNgay", "denNgay", "lyDo", "nguoiDangKy", "nguoiDuyet", "trangThai")
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'da_duyet')`,
          [nhanKhauId, loai, tuNgay, denNgay, lyDo, reqRow.requesterUserId || null, reviewerId]
        );
      }

      // Update nhan_khau status to reflect temporary residence/absence
      const newStatus = reqRow.type === "TAM_TRU" || reqRow.type === "TEMPORARY_RESIDENCE" ? "tam_tru" : "tam_vang";
      await query(`UPDATE nhan_khau SET "trangThai" = $1 WHERE id = $2`, [newStatus, nhanKhauId]);

      // Update request status
      await query(`UPDATE requests SET status = 'APPROVED', "reviewedBy" = $1, "reviewedAt" = CURRENT_TIMESTAMP WHERE id = $2`, [reviewerId, requestId]);

      await query("COMMIT");
      return res.json({ success: true, data: { id: requestId, status: "approved" }});
    } catch (e) {
      await query("ROLLBACK");
      throw e;
    }
  } catch (err) {
    next(err);
  }
});

/**
 * GET /tam-tru-vang/requests/:id
 * Get detail of a specific tam-tru-vang request
 */
router.get("/tam-tru-vang/requests/:id", requireAuth, requireRole(["to_truong", "to_pho", "can_bo"]), async (req, res, next) => {
  try {
    const requestId = Number(req.params.id);

    if (!requestId) {
      return res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "ID yêu cầu không hợp lệ" }});
    }

    const result = await query(
      `SELECT
        r.id, r.type, r.status, r."createdAt", r."reviewedAt", r."reviewedBy", r."rejectionReason",
        r."requesterUserId", r."targetPersonId",
        (r.payload->>'tuNgay') as "tuNgay",
        (r.payload->>'denNgay') as "denNgay",
        (r.payload->>'lyDo') as "lyDo",
        (r.payload->>'diaChi') as "diaChi",
        r.payload,
        u."fullName" as "requesterName",
        nk.id as "personId", nk."hoTen" as "personName", nk.cccd as "personCccd",
        hk.id as "householdId", hk."soHoKhau" as "householdCode", hk.diaChi as "householdAddress"
      FROM requests r
      LEFT JOIN users u ON r."requesterUserId" = u.id
      LEFT JOIN nhan_khau nk ON r."targetPersonId" = nk.id
      LEFT JOIN ho_khau hk ON nk."hoKhauId" = hk.id
      WHERE r.id = $1 AND r.type IN ('TEMPORARY_RESIDENCE', 'TEMPORARY_ABSENCE', 'TAM_TRU', 'TAM_VANG')`,
      [requestId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Yêu cầu không tồn tại" }});
    }

    const row = result.rows[0];
    let attachments = [];
    try {
      const parsedPayload = typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload;
      attachments = parsedPayload?.attachments || [];
    } catch (e) {
      attachments = [];
    }

    const detail = {
      id: row.id,
      type: row.type,
      status: row.status,
      tuNgay: row.tuNgay,
      denNgay: row.denNgay,
      lyDo: row.lyDo,
      diaChi: row.diaChi,
      requesterUserId: row.requesterUserId,
      rejectionReason: row.rejectionReason,
      reviewedBy: row.reviewedBy,
      reviewedAt: row.reviewedAt,
      createdAt: row.createdAt,
      requesterName: row.requesterName,
      person: row.personId ? { id: row.personId, hoTen: row.personName, cccd: row.personCccd } : null,
      household: row.householdId ? { id: row.householdId, soHoKhau: row.householdCode, diaChi: row.householdAddress } : null,
      attachments: attachments,
      payload: row.payload,
    };

    return res.json({ success: true, data: detail });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /tam-tru-vang/requests/:id/reject
 */
router.post("/tam-tru-vang/requests/:id/reject", requireAuth, requireRole(["to_truong", "to_pho", "can_bo"]), async (req, res, next) => {
  try {
    const requestId = Number(req.params.id);
    const reviewerId = req.user!.id;
    const { reason } = req.body;

    if (!requestId) {
      return res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "ID yêu cầu không hợp lệ" }});
    }
    if (!reason || reason.trim() === "") {
      return res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Cần cung cấp lý do từ chối" }});
    }

    const requestResult = await query(`SELECT * FROM requests WHERE id = $1`, [requestId]);
    if (requestResult.rowCount === 0) {
      return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Yêu cầu không tồn tại" }});
    }
    const reqRow = requestResult.rows[0];
    if (!["PENDING","pending","moi","cho_duyet"].includes((reqRow.status || "").toString())) {
      return res.status(400).json({ success: false, error: { code: "INVALID_STATE", message: "Yêu cầu đã được xử lý" }});
    }

    await query(`UPDATE requests SET status = 'REJECTED', "rejectionReason" = $1, "reviewedBy" = $2, "reviewedAt" = CURRENT_TIMESTAMP WHERE id = $3`, [reason.trim(), reviewerId, requestId]);

    return res.json({ success: true, data: { id: requestId, status: "rejected" }});
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

function validateTemporaryResidencePayload(payload: any): string | null {
  const residenceData = payload.residence || payload;

  // Required fields
  const requiredFields = ["nhanKhauId", "tuNgay", "diaChi", "lyDo"];
  const missingFields = requiredFields.filter(field => !residenceData[field]);
  if (missingFields.length > 0) {
    return `Thiếu các trường bắt buộc: ${missingFields.join(", ")}`;
  }

  // Validate nhanKhauId exists
  const nhanKhauId = residenceData.nhanKhauId;
  if (!Number.isInteger(nhanKhauId) || nhanKhauId <= 0) {
    return "nhanKhauId phải là số nguyên dương";
  }

  // Validate dates
  const tuNgay = new Date(residenceData.tuNgay);
  if (isNaN(tuNgay.getTime())) {
    return "tuNgay phải là ngày hợp lệ";
  }

  if (residenceData.denNgay) {
    const denNgay = new Date(residenceData.denNgay);
    if (isNaN(denNgay.getTime())) {
      return "denNgay phải là ngày hợp lệ";
    }
    if (tuNgay >= denNgay) {
      return "tuNgay phải nhỏ hơn denNgay";
    }
  }

  // Validate lyDo is not empty
  if (residenceData.lyDo.trim().length === 0) {
    return "lyDo không được để trống";
  }

  // Validate diaChi is not empty
  if (residenceData.diaChi.trim().length === 0) {
    return "diaChi không được để trống";
  }

  return null;
}

function validateTemporaryAbsencePayload(payload: any): string | null {
  const absenceData = payload.absence || payload;

  // Required fields
  const requiredFields = ["nhanKhauId", "tuNgay", "lyDo"];
  const missingFields = requiredFields.filter(field => !absenceData[field]);
  if (missingFields.length > 0) {
    return `Thiếu các trường bắt buộc: ${missingFields.join(", ")}`;
  }

  // Validate nhanKhauId exists
  const nhanKhauId = absenceData.nhanKhauId;
  if (!Number.isInteger(nhanKhauId) || nhanKhauId <= 0) {
    return "nhanKhauId phải là số nguyên dương";
  }

  // Validate dates
  const tuNgay = new Date(absenceData.tuNgay);
  if (isNaN(tuNgay.getTime())) {
    return "tuNgay phải là ngày hợp lệ";
  }

  if (absenceData.denNgay) {
    const denNgay = new Date(absenceData.denNgay);
    if (isNaN(denNgay.getTime())) {
      return "denNgay phải là ngày hợp lệ";
    }
    if (tuNgay >= denNgay) {
      return "tuNgay phải nhỏ hơn denNgay";
    }
  }

  // Validate lyDo is not empty
  if (absenceData.lyDo.trim().length === 0) {
    return "lyDo không được để trống";
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
      payload: typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload,
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
router.get("/requests/:id", requireAuth, requireRole(["to_truong", "to_pho", "can_bo"]), async (req, res, next) => {
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
        payload: typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload,
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
router.get("/requests", requireAuth, requireRole(["to_truong", "to_pho", "can_bo"]), async (req, res, next) => {
  try {
    const { status, type } = req.query;
    // Build query selecting requester and related household/person info
    let queryStr = `
      SELECT r.id, r.code, r.type, r.status, r."createdAt", r.priority,
             u.id as "requesterId", u."fullName" as "requesterName", u.username as "requesterUsername",
             hk.id as "hoKhauId", hk."soHoKhau" as "householdCode", hk.diaChi as "householdAddress",
             nk.id as "nhanKhauId", nk."hoTen" as "nhanKhauName",
             r.payload
      FROM requests r
      LEFT JOIN users u ON r."requesterUserId" = u.id
      LEFT JOIN ho_khau hk ON r."targetHouseholdId" = hk.id
      LEFT JOIN nhan_khau nk ON r."targetPersonId" = nk.id
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

    // Parse payload JSON and normalize status to lowercase for frontend
    const rows = result.rows.map((row: any) => {
      let parsedPayload = null;
      try {
        parsedPayload = typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload;
      } catch (e) {
        parsedPayload = row.payload;
      }

      return {
        id: row.id,
        code: row.code,
        type: row.type,
        status: row.status,
        createdAt: row.createdAt,
        priority: row.priority,
        requester: {
          id: row.requesterId,
          fullName: row.requesterName,
          username: row.requesterUsername,
        },
        hoKhauLienQuan: row.hoKhauId ? {
          id: row.hoKhauId,
          soHoKhau: row.householdCode,
          diaChi: row.householdAddress,
        } : null,
        nhanKhauLienQuan: row.nhanKhauId ? {
          id: row.nhanKhauId,
          hoTen: row.nhanKhauName,
        } : null,
        payload: parsedPayload,
      };
    });

    return res.json({
      success: true,
      data: rows,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /requests/:id/approve
 * Duyệt yêu cầu (chỉ tổ trưởng)
 */
router.post("/requests/:id/approve", requireAuth, requireRole(["to_truong", "to_pho", "can_bo"]), async (req, res, next) => {
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
router.post("/requests/:id/reject", requireAuth, requireRole(["to_truong", "to_pho", "can_bo"]), async (req, res, next) => {
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
    [RequestType.TEMPORARY_RESIDENCE]: processTemporaryResidenceApproval,
    [RequestType.TEMPORARY_ABSENCE]: processTemporaryAbsenceApproval,
    // legacy keys
    ["TAM_TRU" as any]: processTemporaryResidenceApproval,
    ["TAM_VANG" as any]: processTemporaryAbsenceApproval,
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

/**
 * Process TEMPORARY_RESIDENCE approval
 */
async function processTemporaryResidenceApproval(
  requestId: number,
  payload: any,
  reviewerId: number
) {
  // Start transaction
  await query("BEGIN");

  try {
    const residenceData = payload.residence || payload;
    const { nhanKhauId, tuNgay, denNgay, diaChi, lyDo } = residenceData;

    // 1. Check nhan_khau exists
    const nhanKhauCheck = await query(
      `SELECT id, "hoTen", "trangThai" FROM nhan_khau WHERE id = $1`,
      [nhanKhauId]
    );

    if (nhanKhauCheck.rowCount === 0) {
      throw { code: "PERSON_NOT_FOUND", message: "Nhân khẩu không tồn tại" };
    }

    const nhanKhau = nhanKhauCheck.rows[0];

    // 2. Check if person is already in tam_tru_vang status
    if (nhanKhau.trangThai === 'tam_tru' || nhanKhau.trangThai === 'tam_vang') {
      throw { code: "PERSON_ALREADY_IN_TEMP_STATUS", message: "Nhân khẩu đã đang trong trạng thái tạm trú hoặc tạm vắng" };
    }

    // 3. Check if there's already an active tam_tru_vang record for this person
    const existingCheck = await query(
      `SELECT id FROM tam_tru_vang
       WHERE "nhanKhauId" = $1 AND "trangThai" IN ('cho_duyet', 'da_duyet', 'dang_thuc_hien')
       AND (denNgay IS NULL OR denNgay >= CURRENT_DATE)`,
      [nhanKhauId]
    );

    if (existingCheck.rowCount > 0) {
      throw { code: "ACTIVE_TEMP_RECORD_EXISTS", message: "Đã tồn tại bản ghi tạm trú/vắng đang hoạt động cho nhân khẩu này" };
    }

    // 4. Insert new tam_tru_vang record
    const insertResult = await query(
      `INSERT INTO tam_tru_vang (
        "nhanKhauId", loai, "tuNgay", "denNgay", "diaChi", "lyDo",
        "nguoiDangKy", "nguoiDuyet", "trangThai"
      ) VALUES (
        $1, 'tam_tru', $2, $3, $4, $5,
        $6, $7, 'da_duyet'
      ) RETURNING *`,
      [
        nhanKhauId,
        tuNgay,
        denNgay || null,
        diaChi.trim(),
        lyDo.trim(),
        reviewerId, // nguoiDangKy - actually the reviewer who approved the request
        reviewerId  // nguoiDuyet
      ]
    );

    // 5. Update nhan_khau status to tam_tru
    await query(
      `UPDATE nhan_khau SET "trangThai" = 'tam_tru' WHERE id = $1`,
      [nhanKhauId]
    );

    await query("COMMIT");

  } catch (err) {
    await query("ROLLBACK");
    throw err;
  }
}

/**
 * Process TEMPORARY_ABSENCE approval
 */
async function processTemporaryAbsenceApproval(
  requestId: number,
  payload: any,
  reviewerId: number
) {
  // Start transaction
  await query("BEGIN");

  try {
    const absenceData = payload.absence || payload;
    const { nhanKhauId, tuNgay, denNgay, lyDo } = absenceData;

    // 1. Check nhan_khau exists
    const nhanKhauCheck = await query(
      `SELECT id, "hoTen", "trangThai" FROM nhan_khau WHERE id = $1`,
      [nhanKhauId]
    );

    if (nhanKhauCheck.rowCount === 0) {
      throw { code: "PERSON_NOT_FOUND", message: "Nhân khẩu không tồn tại" };
    }

    const nhanKhau = nhanKhauCheck.rows[0];

    // 2. Check if person is already in tam_tru_vang status
    if (nhanKhau.trangThai === 'tam_tru' || nhanKhau.trangThai === 'tam_vang') {
      throw { code: "PERSON_ALREADY_IN_TEMP_STATUS", message: "Nhân khẩu đã đang trong trạng thái tạm trú hoặc tạm vắng" };
    }

    // 3. Check if there's already an active tam_tru_vang record for this person
    const existingCheck = await query(
      `SELECT id FROM tam_tru_vang
       WHERE "nhanKhauId" = $1 AND "trangThai" IN ('cho_duyet', 'da_duyet', 'dang_thuc_hien')
       AND (denNgay IS NULL OR denNgay >= CURRENT_DATE)`,
      [nhanKhauId]
    );

    if (existingCheck.rowCount > 0) {
      throw { code: "ACTIVE_TEMP_RECORD_EXISTS", message: "Đã tồn tại bản ghi tạm trú/vắng đang hoạt động cho nhân khẩu này" };
    }

    // 4. Insert new tam_tru_vang record
    const insertResult = await query(
      `INSERT INTO tam_tru_vang (
        "nhanKhauId", loai, "tuNgay", "denNgay", "lyDo",
        "nguoiDangKy", "nguoiDuyet", "trangThai"
      ) VALUES (
        $1, 'tam_vang', $2, $3, $4,
        $5, $6, 'da_duyet'
      ) RETURNING *`,
      [
        nhanKhauId,
        tuNgay,
        denNgay || null,
        lyDo.trim(),
        reviewerId, // nguoiDangKy - actually the reviewer who approved the request
        reviewerId  // nguoiDuyet
      ]
    );

    // 5. Update nhan_khau status to tam_vang
    await query(
      `UPDATE nhan_khau SET "trangThai" = 'tam_vang' WHERE id = $1`,
      [nhanKhauId]
    );

    await query("COMMIT");

  } catch (err) {
    await query("ROLLBACK");
    throw err;
  }
}

export default router;

