import { Router } from "express";
import { query, pool } from "../db";
import {
  requireAnyTask,
  requireAuth,
  requireRole,
} from "../middlewares/auth.middleware";
import { getCurrentDateString, normalizeDateOnly } from "../utils/date";

const router = Router();

type PrecheckWarning = {
  code: string;
  message: string;
  details?: any;
};

function extractCccdCandidates(type: string, payload: any): string[] {
  const candidates: string[] = [];
  const safePush = (value: any) => {
    const s = typeof value === "string" ? value.trim() : "";
    if (s) candidates.push(s);
  };

  // Common patterns
  safePush(payload?.cccd);
  safePush(payload?.person?.cccd);
  safePush(payload?.newborn?.cccd);
  safePush(payload?.nhanKhau?.cccd);
  safePush(payload?.citizen?.cccd);

  // Temporary residence/absence payloads
  safePush(payload?.residence?.cccd);
  safePush(payload?.absence?.cccd);
  safePush(payload?.residence?.person?.cccd);
  safePush(payload?.absence?.person?.cccd);

  // Deduplicate
  return Array.from(new Set(candidates));
}

async function buildPrecheckWarnings(opts: {
  type: string;
  payload: any;
  targetHouseholdId?: number | null;
  targetPersonId?: number | null;
}): Promise<PrecheckWarning[]> {
  const warnings: PrecheckWarning[] = [];

  const payload = opts.payload || {};
  const cccds = extractCccdCandidates(opts.type, payload);
  const targetPersonId = opts.targetPersonId
    ? Number(opts.targetPersonId)
    : null;
  const targetHouseholdId = opts.targetHouseholdId
    ? Number(opts.targetHouseholdId)
    : null;

  // 1) Duplicate CCCD (global check)
  for (const cccd of cccds) {
    const existed = await query(
      `SELECT id, "hoKhauId", "hoTen" FROM nhan_khau WHERE cccd = $1 LIMIT 5`,
      [cccd]
    );
    if ((existed?.rowCount ?? 0) > 0) {
      const rows = existed.rows || [];
      // Allow update of the same person (targetPersonId)
      const conflicts = targetPersonId
        ? rows.filter((r: any) => Number(r.id) !== Number(targetPersonId))
        : rows;
      if (conflicts.length > 0) {
        warnings.push({
          code: "DUPLICATE_CCCD",
          message: `CCCD ${cccd} đã tồn tại trong hệ thống (${conflicts.length} bản ghi)`,
          details: conflicts.map((r: any) => ({
            id: Number(r.id),
            hoKhauId: r.hoKhauId ? Number(r.hoKhauId) : null,
            hoTen: r.hoTen || null,
          })),
        });
      }
    }
  }

  // 2) Second head of household (when creating/adding a person with quanHe=chu_ho)
  const quanHe = String(
    payload?.person?.quanHe || payload?.nhanKhau?.quanHe || ""
  ).toLowerCase();
  if (quanHe === "chu_ho" && targetHouseholdId) {
    const hasChuHo = await query(
      `SELECT id FROM nhan_khau WHERE "hoKhauId" = $1 AND LOWER("quanHe") = 'chu_ho' LIMIT 1`,
      [targetHouseholdId]
    );
    if ((hasChuHo?.rowCount ?? 0) > 0) {
      warnings.push({
        code: "DUPLICATE_HEAD",
        message: "Hộ khẩu đã có Chủ hộ, không thể thêm một Chủ hộ thứ hai",
        details: { existingChuHoId: Number(hasChuHo.rows[0].id) },
      });
    }
  }

  return warnings;
}

// Enum cho các loại request (mở rộng)
export enum RequestType {
  ADD_PERSON = "ADD_PERSON", // Thêm nhân khẩu người lớn
  ADD_NEWBORN = "ADD_NEWBORN", // Thêm trẻ sơ sinh
  UPDATE_PERSON = "UPDATE_PERSON", // Sửa thông tin nhân khẩu
  REMOVE_PERSON = "REMOVE_PERSON", // Xóa nhân khẩu
  CHANGE_HEAD = "CHANGE_HEAD", // Đổi chủ hộ
  UPDATE_HOUSEHOLD = "UPDATE_HOUSEHOLD", // Sửa thông tin hộ khẩu
  SPLIT_HOUSEHOLD = "SPLIT_HOUSEHOLD", // Tách hộ khẩu
  TEMPORARY_RESIDENCE = "TEMPORARY_RESIDENCE", // Tạm trú
  TEMPORARY_ABSENCE = "TEMPORARY_ABSENCE", // Tạm vắng
  MOVE_OUT = "MOVE_OUT", // Chuyển đi
  DECEASED = "DECEASED", // Khai tử
}

// Status enum
export enum RequestStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  CANCELLED = "CANCELLED",
}

async function assertHouseholdHead(userId: number) {
  const info = await query(
    `SELECT u."personId", nk."hoKhauId", hk."chuHoId"
     FROM users u
     JOIN nhan_khau nk ON u."personId" = nk.id
     JOIN ho_khau hk ON nk."hoKhauId" = hk.id
     WHERE u.id = $1`,
    [userId]
  );

  if ((info?.rowCount ?? 0) === 0 || !info.rows[0].personId) {
    throw {
      status: 403,
      code: "NOT_HEAD_OF_HOUSEHOLD",
      message: "Chỉ chủ hộ đã liên kết mới được phép tạo yêu cầu",
    };
  }

  const row = info.rows[0];
  if (Number(row.chuHoId) !== Number(row.personId)) {
    throw {
      status: 403,
      code: "NOT_HEAD_OF_HOUSEHOLD",
      message: "Chỉ chủ hộ mới được phép tạo yêu cầu",
    };
  }

  return {
    personId: Number(row.personId),
    householdId: Number(row.hoKhauId),
  };
}

async function ensurePersonInHousehold(personId: number, householdId: number) {
  const person = await query(
    `SELECT id, "hoKhauId", "trangThai" FROM nhan_khau WHERE id = $1`,
    [personId]
  );

  if ((person?.rowCount ?? 0) === 0) {
    throw {
      status: 404,
      code: "PERSON_NOT_FOUND",
      message: "Nhân khẩu không tồn tại",
    };
  }

  const row = person.rows[0];
  if (Number(row.hoKhauId) !== Number(householdId)) {
    throw {
      status: 403,
      code: "PERSON_OUTSIDE_HOUSEHOLD",
      message:
        "Bạn chỉ có thể gửi yêu cầu cho nhân khẩu trong hộ khẩu của mình",
    };
  }

  return row;
}

/**
 * POST /requests
 * Tạo yêu cầu mới (chỉ dành cho người dân)
 */
router.post(
  "/requests",
  requireAuth,
  requireRole(["nguoi_dan"]),
  async (req, res, next) => {
    try {
      const userId = req.user!.id;
      let { type, targetHouseholdId, targetPersonId, payload } = req.body;

      let headContext: { personId: number; householdId: number };
      try {
        headContext = await assertHouseholdHead(userId);
      } catch (err: any) {
        return res.status(err.status || 403).json({
          success: false,
          error: {
            code: err.code || "NOT_HEAD_OF_HOUSEHOLD",
            message:
              err.message || "Chỉ chủ hộ đã liên kết mới được phép tạo yêu cầu",
          },
        });
      }

      let finalTargetHouseholdId: number | null = targetHouseholdId
        ? Number(targetHouseholdId)
        : null;
      let finalTargetPersonId: number | null = targetPersonId
        ? Number(targetPersonId)
        : null;
      // Debug: log incoming create request for troubleshooting
      try {
        console.log(
          "[POST /requests] userId:",
          userId,
          "raw type:",
          req.body.type,
          "normalized type (pre):",
          type
        );
        console.log(
          "[POST /requests] targetHouseholdId:",
          targetHouseholdId,
          "targetPersonId:",
          targetPersonId
        );
        console.log(
          "[POST /requests] payload (raw):",
          typeof req.body.payload === "string"
            ? req.body.payload
            : JSON.stringify(req.body.payload)
        );
      } catch (e) {
        console.log("[POST /requests] debug log error", e);
      }

      // Validate type (allow both canonical enums and legacy TAM_TRU/TAM_VANG)
      const allTypes: string[] = (
        Object.values(RequestType) as string[]
      ).concat(["TAM_TRU", "TAM_VANG"]);

      if (!type || !allTypes.includes(type)) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: `Loại yêu cầu không hợp lệ. Hỗ trợ: ${allTypes.join(
              ", "
            )}`,
          },
        });
      }

      if (
        finalTargetHouseholdId &&
        Number(finalTargetHouseholdId) !== Number(headContext.householdId)
      ) {
        return res.status(403).json({
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "Bạn chỉ có thể gửi yêu cầu cho hộ khẩu của mình",
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

      // Validate theo type
      let validationError = null;
      if (type === RequestType.ADD_NEWBORN) {
        validationError = validateAddNewbornPayload(payload);
        finalTargetHouseholdId = headContext.householdId;
        if (payload?.newborn) {
          payload.newborn.householdId = headContext.householdId;
        } else {
          payload.householdId = headContext.householdId;
        }
      } else if (type === RequestType.ADD_PERSON) {
        validationError = validateAddPersonPayload(payload, true);
        finalTargetHouseholdId = headContext.householdId;
        if (payload?.person) {
          payload.person.householdId = headContext.householdId;
        }
      } else if (
        type === RequestType.TEMPORARY_RESIDENCE ||
        type === "TAM_TRU"
      ) {
        // Default target household to current head's household
        finalTargetHouseholdId = headContext.householdId;

        // For temporary residence, "diaChi" is now used to carry the household code (soHoKhau)
        // and must be fixed to the logged-in head's household.
        const household = await query(
          `SELECT "soHoKhau" FROM ho_khau WHERE id = $1`,
          [headContext.householdId]
        );
        const soHoKhau = household?.rows?.[0]?.soHoKhau;
        if (!soHoKhau) {
          return res.status(400).json({
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Không lấy được số hộ khẩu của chủ hộ",
            },
          });
        }

        const residenceData =
          payload?.residence && typeof payload.residence === "object"
            ? payload.residence
            : payload;
        // Keep backward-compatible key "diaChi" while also storing "soHoKhau"
        residenceData.soHoKhau = soHoKhau;
        residenceData.diaChi = soHoKhau;
        payload.soHoKhau = soHoKhau;
        payload.diaChi = soHoKhau;

        validationError = validateTemporaryResidencePayload(payload);

        const nhanKhauId =
          payload?.nhanKhauId || payload?.residence?.nhanKhauId || null;
        if (nhanKhauId) {
          try {
            await ensurePersonInHousehold(
              Number(nhanKhauId),
              headContext.householdId
            );
          } catch (err: any) {
            return res.status(err.status || 400).json({
              success: false,
              error: {
                code: err.code || "VALIDATION_ERROR",
                message: err.message,
              },
            });
          }
          finalTargetPersonId = Number(nhanKhauId);
        }
      } else if (
        type === RequestType.TEMPORARY_ABSENCE ||
        type === "TAM_VANG"
      ) {
        // Default target household to current head's household
        finalTargetHouseholdId = headContext.householdId;

        validationError = validateTemporaryAbsencePayload(payload);
        const nhanKhauId =
          payload?.nhanKhauId || payload?.absence?.nhanKhauId || null;
        if (nhanKhauId) {
          try {
            await ensurePersonInHousehold(
              Number(nhanKhauId),
              headContext.householdId
            );
          } catch (err: any) {
            return res.status(err.status || 400).json({
              success: false,
              error: {
                code: err.code || "VALIDATION_ERROR",
                message: err.message,
              },
            });
          }
          finalTargetPersonId = Number(nhanKhauId);
        }
      } else if (type === RequestType.SPLIT_HOUSEHOLD) {
        validationError = validateSplitHouseholdPayload(payload);
        const targetHoKhauId = payload?.hoKhauId || headContext.householdId;
        if (Number(targetHoKhauId) !== Number(headContext.householdId)) {
          return res.status(403).json({
            success: false,
            error: {
              code: "FORBIDDEN",
              message: "Bạn chỉ có thể tách hộ cho chính hộ khẩu của mình",
            },
          });
        }

        const selectedIds: number[] = payload?.selectedNhanKhauIds || [];
        if (selectedIds.length > 0) {
          const members = await query(
            `SELECT id FROM nhan_khau WHERE "hoKhauId" = $1 AND id = ANY($2::int[])`,
            [headContext.householdId, selectedIds]
          );
          if ((members?.rowCount ?? 0) !== selectedIds.length) {
            return res.status(403).json({
              success: false,
              error: {
                code: "PERSON_OUTSIDE_HOUSEHOLD",
                message: "Tất cả nhân khẩu tách hộ phải thuộc hộ khẩu của bạn",
              },
            });
          }
        }

        if (
          payload?.newChuHoId &&
          !selectedIds.includes(Number(payload.newChuHoId))
        ) {
          return res.status(400).json({
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Chủ hộ mới phải nằm trong danh sách nhân khẩu tách",
            },
          });
        }

        finalTargetHouseholdId = headContext.householdId;
        payload.hoKhauId = headContext.householdId;
      } else if (type === RequestType.DECEASED) {
        validationError = validateDeceasedPayload(payload);
        // Always attach household context for auditing/listing
        finalTargetHouseholdId = headContext.householdId;
        const nhanKhauId = payload?.nhanKhauId || payload?.personId;
        if (nhanKhauId) {
          try {
            await ensurePersonInHousehold(
              Number(nhanKhauId),
              headContext.householdId
            );
          } catch (err: any) {
            return res.status(err.status || 400).json({
              success: false,
              error: {
                code: err.code || "VALIDATION_ERROR",
                message: err.message,
              },
            });
          }
          finalTargetPersonId = Number(nhanKhauId);
        }
      } else if (type === RequestType.UPDATE_PERSON) {
        validationError = validateUpdatePersonPayload(payload);
        const nhanKhauId = payload?.nhanKhauId || payload?.personId;
        if (nhanKhauId) {
          try {
            await ensurePersonInHousehold(
              Number(nhanKhauId),
              headContext.householdId
            );
          } catch (err: any) {
            return res.status(err.status || 400).json({
              success: false,
              error: {
                code: err.code || "VALIDATION_ERROR",
                message: err.message,
              },
            });
          }
          finalTargetHouseholdId = headContext.householdId;
          finalTargetPersonId = Number(nhanKhauId);
        }
      } else if (type === RequestType.REMOVE_PERSON) {
        validationError = validateRemovePersonPayload(payload);
        const nhanKhauId = payload?.nhanKhauId || payload?.personId;
        if (nhanKhauId) {
          try {
            await ensurePersonInHousehold(
              Number(nhanKhauId),
              headContext.householdId
            );
          } catch (err: any) {
            return res.status(err.status || 400).json({
              success: false,
              error: {
                code: err.code || "VALIDATION_ERROR",
                message: err.message,
              },
            });
          }
          finalTargetHouseholdId = headContext.householdId;
          finalTargetPersonId = Number(nhanKhauId);
        }
      } else if (type === RequestType.MOVE_OUT) {
        validationError = validateMoveOutPayload(payload);
        // Always attach household context for auditing/listing
        finalTargetHouseholdId = headContext.householdId;
        const nhanKhauId = payload?.nhanKhauId || payload?.personId;
        if (nhanKhauId) {
          try {
            await ensurePersonInHousehold(
              Number(nhanKhauId),
              headContext.householdId
            );
          } catch (err: any) {
            return res.status(err.status || 400).json({
              success: false,
              error: {
                code: err.code || "VALIDATION_ERROR",
                message: err.message,
              },
            });
          }
          finalTargetPersonId = Number(nhanKhauId);
        }
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
        [
          userId,
          type,
          finalTargetHouseholdId || null,
          finalTargetPersonId || null,
          JSON.stringify(payload),
        ]
      );
      try {
        console.log(
          "[POST /requests] inserted request id:",
          result.rows[0]?.id
        );
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
  }
);

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
router.get(
  "/tam-tru-vang/requests",
  requireAuth,
  requireAnyTask(["hokhau_nhankhau", "tamtru_tamvang"]),
  async (req, res, next) => {
    try {
      const {
        type,
        fromDate,
        toDate,
        keyword,
        page = "1",
        limit = "50",
      } = req.query;
      console.log("[GET /tam-tru-vang/requests] query:", {
        type,
        fromDate,
        toDate,
        keyword,
        page,
        limit,
      });

      // Only temporary types
      const allowedTypes = [
        "TEMPORARY_RESIDENCE",
        "TEMPORARY_ABSENCE",
        "TAM_TRU",
        "TAM_VANG",
      ];

      let whereClause = `WHERE r.type = ANY($1::text[])`;
      const params: any[] = [allowedTypes];
      let idx = 2;

      if (type && String(type).toLowerCase() !== "all") {
        whereClause += ` AND r.type = $${idx}`;
        params.push(String(type).toUpperCase());
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
        hk."diaChi" ILIKE $${idx}
      )`;
        params.push(kw);
        idx++;
      }

      // Chỉ lấy những nhân khẩu đang có trạng thái tạm trú/tạm vắng
      whereClause += ` AND nk."trangThai" IN ($${idx}, $${idx + 1})`;
      params.push("tam_tru", "tam_vang");
      idx += 2;

      const pageNum = Math.max(1, parseInt(String(page)));
      const perPage = Math.max(1, Math.min(200, parseInt(String(limit))));
      const offset = (pageNum - 1) * perPage;
      const selectQuery = `
      SELECT
        r.id, r.type, r.status, r."createdAt", r."reviewedAt", r."reviewedBy", r."rejectionReason",
        r."requesterUserId",
        r.payload as "payloadRaw",
        (r.payload->>'tuNgay') as "tuNgay",
        (r.payload->>'denNgay') as "denNgay",
        (r.payload->>'lyDo') as "lyDo",
        (r.payload->>'diaChi') as "diaChi",
        NULLIF(r.payload->>'nhanKhauId','')::int as "nhanKhauId",
        COALESCE(u."fullName", un."hoTen") as "requesterName",
        u.username as "requesterUsername",
        COALESCE(u.cccd, un.cccd) as "requesterCccd",
        nk.id as "personId", nk."hoTen" as "personName", nk.cccd as "personCccd",
        hk.id as "householdId", hk."soHoKhau" as "householdCode", hk."diaChi" as "householdAddress"
      FROM requests r
      LEFT JOIN users u ON r."requesterUserId" = u.id
      LEFT JOIN nhan_khau un ON u."personId" = un.id
      LEFT JOIN nhan_khau nk ON r."targetPersonId" = nk.id
      LEFT JOIN ho_khau hk ON nk."hoKhauId" = hk.id
      ${whereClause}
      ORDER BY r."createdAt" DESC
    `;

      const requestRows = (await query(selectQuery, params)).rows;

      const tamTruVangFilters: any[] = [];
      let ttvWhere = "WHERE 1=1";
      if (type && String(type).toLowerCase() !== "all") {
        ttvWhere += " AND ttv.loai = $" + (tamTruVangFilters.length + 1);
        tamTruVangFilters.push(
          String(type).toUpperCase().includes("VANG") ? "tam_vang" : "tam_tru"
        );
      }
      if (fromDate) {
        ttvWhere +=
          ' AND ttv."createdAt" >= $' + (tamTruVangFilters.length + 1);
        tamTruVangFilters.push(fromDate);
      }
      if (toDate) {
        ttvWhere +=
          ' AND ttv."createdAt" <= $' + (tamTruVangFilters.length + 1);
        tamTruVangFilters.push(toDate);
      }
      if (keyword && String(keyword).trim()) {
        const kw = `%${String(keyword).trim()}%`;
        ttvWhere += ` AND (nk."hoTen" ILIKE $${
          tamTruVangFilters.length + 1
        } OR nk.cccd ILIKE $${
          tamTruVangFilters.length + 1
        } OR hk."soHoKhau" ILIKE $${
          tamTruVangFilters.length + 1
        } OR hk."diaChi" ILIKE $${tamTruVangFilters.length + 1})`;
        tamTruVangFilters.push(kw);
      }

      // Chỉ lấy những nhân khẩu đang có trạng thái tạm trú/tạm vắng
      ttvWhere += ` AND nk."trangThai" IN ($${tamTruVangFilters.length + 1}, $${
        tamTruVangFilters.length + 2
      })`;
      tamTruVangFilters.push("tam_tru", "tam_vang");

      const ttvQuery = `
        SELECT
          ttv.id,
          CASE WHEN ttv.loai = 'tam_tru' THEN 'TEMPORARY_RESIDENCE' ELSE 'TEMPORARY_ABSENCE' END AS type,
          CASE ttv."trangThai"
            WHEN 'cho_duyet' THEN 'PENDING'
            WHEN 'da_duyet' THEN 'APPROVED'
            WHEN 'tu_choi' THEN 'REJECTED'
            ELSE ttv."trangThai"
          END AS status,
          ttv."createdAt",
          ttv."updatedAt" AS "reviewedAt",
          ttv."nguoiDuyet" AS "reviewedBy",
          NULL::text AS "rejectionReason",
          ttv."nguoiDangKy" AS "requesterUserId",
          NULL::jsonb AS "payloadRaw",
          ttv."tuNgay" AS "tuNgay",
          ttv."denNgay" AS "denNgay",
          ttv."lyDo" AS "lyDo",
          ttv."diaChi" AS "diaChi",
          ttv."nhanKhauId" AS "nhanKhauId",
          COALESCE(u."fullName", un."hoTen") AS "requesterName",
          u.username AS "requesterUsername",
          COALESCE(u.cccd, un.cccd) AS "requesterCccd",
          nk.id AS "personId", nk."hoTen" AS "personName", nk.cccd AS "personCccd",
          hk.id AS "householdId", hk."soHoKhau" AS "householdCode", hk."diaChi" AS "householdAddress"
        FROM tam_tru_vang ttv
        LEFT JOIN users u ON ttv."nguoiDangKy" = u.id
        LEFT JOIN nhan_khau un ON u."personId" = un.id
        LEFT JOIN nhan_khau nk ON ttv."nhanKhauId" = nk.id
        LEFT JOIN ho_khau hk ON nk."hoKhauId" = hk.id
        ${ttvWhere}
        ORDER BY ttv."createdAt" DESC
      `;

      const ttvRows = (await query(ttvQuery, tamTruVangFilters)).rows;

      const combinedRows = [...requestRows, ...ttvRows];

      const mapped = combinedRows.map((row: any) => {
        const source = row.payloadRaw === null ? "tam_tru_vang" : "requests";
        let payload: any = {};
        let attachments = [];
        try {
          payload =
            typeof row.payloadRaw === "string"
              ? JSON.parse(row.payloadRaw)
              : row.payloadRaw || {};
          attachments = payload?.attachments || [];
        } catch (e) {
          payload = {};
          attachments = [];
        }

        payload = {
          ...payload,
          tuNgay: payload.tuNgay || row.tuNgay || null,
          denNgay: payload.denNgay || row.denNgay || null,
          lyDo: payload.lyDo || row.lyDo || null,
          diaChi: payload.diaChi || row.diaChi || null,
        };

        // Sender shown to staff should be the requester (user), not the related person's CCCD.
        const nguoiGui = {
          hoTen: row.requesterName || null,
          username: row.requesterUsername || null,
          cccd: row.requesterCccd || null,
        };

        return {
          source,
          id: row.id,
          type: row.type,
          status: row.status,
          tuNgay: row.tuNgay,
          denNgay: row.denNgay,
          lyDo: row.lyDo,
          nhanKhauId: row.nhanKhauId,
          nguoiGui,
          requesterUserId: row.requesterUserId,
          rejectionReason: row.rejectionReason,
          reviewedBy: row.reviewedBy,
          reviewedAt: row.reviewedAt,
          createdAt: row.createdAt,
          payload,
          requesterName: row.requesterName,
          requesterUsername: row.requesterUsername || null,
          requesterCccd: row.requesterCccd || null,
          person: row.personId
            ? {
                id: row.personId,
                hoTen: row.personName,
                cccd: row.personCccd,
              }
            : null,
          household: row.householdId
            ? {
                id: row.householdId,
                soHoKhau: row.householdCode,
                diaChi: row.householdAddress,
              }
            : null,
          attachments: attachments,
        };
      });

      // De-duplicate so each person appears at most once per temporary type.
      // Prefer: PENDING > APPROVED > REJECTED, and prefer `tam_tru_vang` over legacy `requests`.
      const normalizeTempType = (t: any) => {
        const key = String(t || "").toUpperCase();
        return key.includes("VANG") || key.includes("ABSENCE")
          ? "TAM_VANG"
          : "TAM_TRU";
      };

      const statusRank = (s: any) => {
        const key = String(s || "").toUpperCase();
        if (key.includes("PENDING") || key.includes("CHO")) return 3;
        if (key.includes("APPROVED") || key.includes("DA_DUYET")) return 2;
        if (key.includes("REJECTED") || key.includes("TU_CHOI")) return 1;
        return 0;
      };

      const dedupMap = new Map<string, any>();
      for (const it of mapped) {
        const personKey = it.person?.id || it.nhanKhauId || "0";
        const typeKey = normalizeTempType(it.type);
        const key = `${personKey}|${typeKey}`;

        const existing = dedupMap.get(key);
        if (!existing) {
          dedupMap.set(key, it);
          continue;
        }

        const existingRank = statusRank(existing.status);
        const nextRank = statusRank(it.status);

        const preferNext =
          nextRank > existingRank ||
          (nextRank === existingRank &&
            existing.source === "requests" &&
            it.source === "tam_tru_vang") ||
          (nextRank === existingRank &&
            new Date(it.createdAt).getTime() >
              new Date(existing.createdAt).getTime());

        if (preferNext) dedupMap.set(key, it);
      }

      const items = Array.from(dedupMap.values()).sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      const total = items.length;
      const paged = items.slice(offset, offset + perPage);

      return res.json({
        success: true,
        data: paged,
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
  }
);

/**
 * POST /tam-tru-vang/requests/:id/approve
 */
router.post(
  "/tam-tru-vang/requests/:id/approve",
  requireAuth,
  requireAnyTask(["hokhau_nhankhau", "tamtru_tamvang"]),
  async (req, res, next) => {
    try {
      const requestId = Number(req.params.id);
      const reviewerId = req.user!.id;

      if (!requestId) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "ID yêu cầu không hợp lệ",
          },
        });
      }

      const requestResult = await query(
        `SELECT * FROM requests WHERE id = $1`,
        [requestId]
      );
      if ((requestResult?.rowCount ?? 0) === 0) {
        return res.status(404).json({
          success: false,
          error: { code: "NOT_FOUND", message: "Yêu cầu không tồn tại" },
        });
      }
      const reqRow = requestResult.rows[0];
      if (
        !["PENDING", "pending", "moi", "cho_duyet"].includes(
          (reqRow.status || "").toString()
        )
      ) {
        return res.status(400).json({
          success: false,
          error: { code: "INVALID_STATE", message: "Yêu cầu đã được xử lý" },
        });
      }

      let parsedPayload = null;
      try {
        parsedPayload =
          typeof reqRow.payload === "string"
            ? JSON.parse(reqRow.payload)
            : reqRow.payload;
      } catch (e) {
        parsedPayload = reqRow.payload;
      }

      const tuNgay = parsedPayload?.tuNgay;
      const denNgay = parsedPayload?.denNgay || null;
      const lyDo = parsedPayload?.lyDo || parsedPayload?.reason || null;
      const diaChi = parsedPayload?.diaChi || null;

      // Support both: payload.nhanKhauId (existing) OR payload.person (create on approve)
      let nhanKhauId = parsedPayload?.nhanKhauId
        ? Number(parsedPayload.nhanKhauId)
        : null;
      const personPayload =
        parsedPayload?.person || parsedPayload?.nhanKhau || null;

      if (!tuNgay || !lyDo) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Payload thiếu trường bắt buộc: tuNgay, lyDo",
          },
        });
      }

      if (!nhanKhauId && !personPayload) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Payload thiếu nhanKhauId hoặc thông tin person",
          },
        });
      }

      await query("BEGIN");
      try {
        // If nhanKhauId missing, create/find person inside requester's household.
        if (!nhanKhauId && personPayload) {
          // Find requester's household via users.personId -> nhan_khau.hoKhauId
          const requesterUserId =
            reqRow.requesterUserId ||
            reqRow.requesteruserid ||
            reqRow.requesterUserID;
          const requesterHousehold = await query(
            `SELECT nk."hoKhauId" as "hoKhauId"
             FROM users u
             JOIN nhan_khau nk ON u."personId" = nk.id
             WHERE u.id = $1
             LIMIT 1`,
            [requesterUserId]
          );

          if ((requesterHousehold?.rowCount ?? 0) === 0) {
            await query("ROLLBACK");
            return res.status(400).json({
              success: false,
              error: {
                code: "VALIDATION_ERROR",
                message:
                  "Không xác định được hộ khẩu của người gửi (tài khoản chưa liên kết nhân khẩu)",
              },
            });
          }

          const hoKhauId = Number(requesterHousehold.rows[0].hoKhauId);

          const hoTen = String(personPayload?.hoTen || "").trim();
          const cccd = personPayload?.cccd
            ? String(personPayload.cccd).trim()
            : null;
          const lyDoKhongCoCCCD = personPayload?.lyDoKhongCoCCCD
            ? String(personPayload.lyDoKhongCoCCCD).trim()
            : null;
          const ngaySinh = personPayload?.ngaySinh || null;
          const gioiTinh = personPayload?.gioiTinh || null;
          const noiSinh = String(personPayload?.noiSinh || "").trim();
          const quanHe = personPayload?.quanHe || "khac";

          if (!hoTen || !ngaySinh || !gioiTinh || !noiSinh) {
            await query("ROLLBACK");
            return res.status(400).json({
              success: false,
              error: {
                code: "VALIDATION_ERROR",
                message:
                  "Thiếu thông tin nhân khẩu bắt buộc: hoTen, ngaySinh, gioiTinh, noiSinh",
              },
            });
          }

          // If CCCD provided and exists, reuse only if same household
          if (cccd) {
            const existing = await query(
              `SELECT id, "hoKhauId" FROM nhan_khau WHERE cccd = $1 LIMIT 1`,
              [cccd]
            );
            if ((existing?.rowCount ?? 0) > 0) {
              const existingRow = existing.rows[0];
              if (Number(existingRow.hoKhauId) !== hoKhauId) {
                await query("ROLLBACK");
                return res.status(400).json({
                  success: false,
                  error: {
                    code: "VALIDATION_ERROR",
                    message: "Nhân khẩu với CCCD này đã tồn tại ở hộ khẩu khác",
                  },
                });
              }
              nhanKhauId = Number(existingRow.id);
            }
          }

          if (!nhanKhauId) {
            const normalizedCccd = cccd ? String(cccd).trim() : "";
            const processedLyDoKhongCoCCCD = !normalizedCccd
              ? String(lyDoKhongCoCCCD || personPayload?.ghiChu || "").trim() ||
                null
              : null;
            const processedGhiChu =
              normalizedCccd || lyDoKhongCoCCCD
                ? personPayload?.ghiChu
                  ? String(personPayload.ghiChu).trim()
                  : null
                : null;

            const insertPerson = await query(
              `INSERT INTO nhan_khau (
                "hoTen", cccd, "ngaySinh", "gioiTinh", "noiSinh",
                "nguyenQuan", "danToc", "tonGiao", "quocTich",
                "ngayDangKyThuongTru", "diaChiThuongTruTruoc",
                "ngheNghiep", "noiLamViec", "ghiChu", "lyDoKhongCoCCCD",
                "hoKhauId", "quanHe", "trangThai"
              ) VALUES (
                $1, $2, $3, $4, $5,
                $6, $7, $8, $9,
                $10, $11,
                $12, $13, $14, $15,
                $16, $17, $18
              ) RETURNING id`,
              [
                hoTen,
                normalizedCccd ? normalizedCccd : null,
                ngaySinh,
                gioiTinh,
                noiSinh,
                personPayload?.nguyenQuan || null,
                personPayload?.danToc || null,
                personPayload?.tonGiao || null,
                personPayload?.quocTich || "Việt Nam",
                personPayload?.ngayDangKyThuongTru || null,
                personPayload?.diaChiThuongTruTruoc || null,
                personPayload?.ngheNghiep || null,
                personPayload?.noiLamViec || null,
                processedGhiChu,
                processedLyDoKhongCoCCCD,
                hoKhauId,
                quanHe,
                "active",
              ]
            );
            nhanKhauId = Number(insertPerson.rows[0].id);
          }

          // Attach created/linked person to request for easier listing later
          await query(
            `UPDATE requests SET "targetPersonId" = $1 WHERE id = $2`,
            [nhanKhauId, requestId]
          );
        }

        // Check if tam_tru_vang record already exists (created by citizen)
        const existingTamTruVang = await query(
          `SELECT id FROM tam_tru_vang WHERE "nhanKhauId" = $1 AND "tuNgay" = $2 AND "trangThai" = 'cho_duyet'`,
          [nhanKhauId, tuNgay]
        );

        if ((existingTamTruVang?.rowCount ?? 0) > 0) {
          // Update existing record
          await query(
            `UPDATE tam_tru_vang SET "trangThai" = 'da_duyet', "nguoiDuyet" = $1 WHERE id = $2`,
            [reviewerId, existingTamTruVang.rows[0].id]
          );
        } else {
          // Fallback: create new record (for legacy requests)
          const loai =
            reqRow.type === "TAM_TRU" || reqRow.type === "TEMPORARY_RESIDENCE"
              ? "tam_tru"
              : "tam_vang";
          await query(
            `INSERT INTO tam_tru_vang ("nhanKhauId", loai, "tuNgay", "denNgay", "lyDo", "nguoiDangKy", "nguoiDuyet", "trangThai")
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'da_duyet')`,
            [
              nhanKhauId,
              loai,
              tuNgay,
              denNgay,
              lyDo,
              reqRow.requesterUserId || null,
              reviewerId,
            ]
          );
        }

        // Update nhan_khau status to reflect temporary residence/absence
        const newStatus =
          reqRow.type === "TAM_TRU" || reqRow.type === "TEMPORARY_RESIDENCE"
            ? "tam_tru"
            : "tam_vang";
        await query(`UPDATE nhan_khau SET "trangThai" = $1 WHERE id = $2`, [
          newStatus,
          nhanKhauId,
        ]);

        // If diaChi exists in payload and request is TAM_TRU/TAM_VANG, keep it on request payload for history
        if (diaChi) {
          try {
            const nextPayload = { ...(parsedPayload || {}), diaChi };
            await query(`UPDATE requests SET payload = $1 WHERE id = $2`, [
              JSON.stringify(nextPayload),
              requestId,
            ]);
          } catch (e) {
            // ignore
          }
        }

        // Update request status
        await query(
          `UPDATE requests SET status = 'APPROVED', "reviewedBy" = $1, "reviewedAt" = CURRENT_TIMESTAMP WHERE id = $2`,
          [reviewerId, requestId]
        );

        await query("COMMIT");
        return res.json({
          success: true,
          data: { id: requestId, status: "approved" },
        });
      } catch (e) {
        await query("ROLLBACK");
        throw e;
      }
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /tam-tru-vang/requests/:id
 * Get detail of a specific tam-tru-vang request
 */
router.get(
  "/tam-tru-vang/requests/:id",
  requireAuth,
  requireAnyTask(["hokhau_nhankhau", "tamtru_tamvang"]),
  async (req, res, next) => {
    try {
      const requestId = Number(req.params.id);

      if (!requestId) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "ID yêu cầu không hợp lệ",
          },
        });
      }

      const typeToLoai = (t: any) => {
        const s = String(t || "").toUpperCase();
        if (s.includes("ABSENCE") || s.includes("VANG")) return "tam_vang";
        if (s.includes("RESIDENCE") || s.includes("TRU")) return "tam_tru";
        return null;
      };

      // 1) Try to load from requests table
      let row: any = null;
      let source: "requests" | "tam_tru_vang" = "requests";

      const result = await query(
        `SELECT
          r.id, r.type, r.status, r."createdAt", r."reviewedAt", r."reviewedBy", r."rejectionReason",
          r."requesterUserId", r."targetPersonId",
          (r.payload->>'tuNgay') as "tuNgay",
          (r.payload->>'denNgay') as "denNgay",
          (r.payload->>'lyDo') as "lyDo",
          (r.payload->>'diaChi') as "diaChi",
          r.payload,
          COALESCE(u."fullName", un."hoTen") as "requesterName",
          u.username as "requesterUsername",
          COALESCE(u.cccd, un.cccd) as "requesterCccd",
          nk.id as "personId", nk."hoTen" as "personName", nk.cccd as "personCccd",
          hk.id as "householdId", hk."soHoKhau" as "householdCode", hk."diaChi" as "householdAddress",
          chu.id as "chuHoPersonId", chu."hoTen" as "chuHoName", chu.cccd as "chuHoCccd"
        FROM requests r
        LEFT JOIN users u ON r."requesterUserId" = u.id
        LEFT JOIN nhan_khau un ON u."personId" = un.id
        LEFT JOIN nhan_khau nk ON r."targetPersonId" = nk.id
        LEFT JOIN ho_khau hk ON nk."hoKhauId" = hk.id
        LEFT JOIN nhan_khau chu ON hk."chuHoId" = chu.id
        WHERE r.id = $1 AND r.type IN ('TEMPORARY_RESIDENCE', 'TEMPORARY_ABSENCE', 'TAM_TRU', 'TAM_VANG')`,
        [requestId]
      );

      if ((result?.rowCount ?? 0) > 0) {
        row = result.rows[0];
      } else {
        // 2) Fallback: the list endpoint also returns rows from tam_tru_vang table with id=ttv.id
        source = "tam_tru_vang";
        const ttvResult = await query(
          `SELECT
            ttv.id,
            CASE WHEN ttv.loai = 'tam_tru' THEN 'TEMPORARY_RESIDENCE' ELSE 'TEMPORARY_ABSENCE' END AS type,
            CASE ttv."trangThai"
              WHEN 'cho_duyet' THEN 'PENDING'
              WHEN 'da_duyet' THEN 'APPROVED'
              WHEN 'tu_choi' THEN 'REJECTED'
              ELSE ttv."trangThai"
            END AS status,
            ttv."createdAt",
            ttv."updatedAt" AS "reviewedAt",
            ttv."nguoiDuyet" AS "reviewedBy",
            NULL::text AS "rejectionReason",
            ttv."nguoiDangKy" AS "requesterUserId",
            ttv."nhanKhauId" AS "targetPersonId",
            ttv."tuNgay"::text AS "tuNgay",
            ttv."denNgay"::text AS "denNgay",
            ttv."lyDo" AS "lyDo",
            ttv."diaChi" AS "diaChi",
            ttv.attachments AS payload,
            COALESCE(u."fullName", un."hoTen") AS "requesterName",
            u.username AS "requesterUsername",
            COALESCE(u.cccd, un.cccd) AS "requesterCccd",
            nk.id as "personId", nk."hoTen" as "personName", nk.cccd as "personCccd",
            hk.id as "householdId", hk."soHoKhau" as "householdCode", hk."diaChi" as "householdAddress",
            chu.id as "chuHoPersonId", chu."hoTen" as "chuHoName", chu.cccd as "chuHoCccd"
          FROM tam_tru_vang ttv
          LEFT JOIN users u ON ttv."nguoiDangKy" = u.id
          LEFT JOIN nhan_khau un ON u."personId" = un.id
          LEFT JOIN nhan_khau nk ON ttv."nhanKhauId" = nk.id
          LEFT JOIN ho_khau hk ON nk."hoKhauId" = hk.id
          LEFT JOIN nhan_khau chu ON hk."chuHoId" = chu.id
          WHERE ttv.id = $1`,
          [requestId]
        );

        if ((ttvResult?.rowCount ?? 0) === 0) {
          return res.status(404).json({
            success: false,
            error: { code: "NOT_FOUND", message: "Yêu cầu không tồn tại" },
          });
        }

        row = ttvResult.rows[0];
      }

      let attachments = [];
      let parsedPayload: any = null;
      try {
        parsedPayload =
          typeof row.payload === "string"
            ? JSON.parse(row.payload)
            : row.payload;

        // requests.payload has { attachments: [...] }, while tam_tru_vang.attachments is already an array
        if (Array.isArray(parsedPayload)) attachments = parsedPayload;
        else attachments = parsedPayload?.attachments || [];
      } catch (e) {
        attachments = [];
        parsedPayload = row.payload;
      }

      const loai = typeToLoai(row.type);

      // Applicant is the household head (chu ho) as per business rule; fallback to requesterName
      const applicant = {
        id: row.chuHoPersonId || null,
        hoTen: row.chuHoName || row.requesterName || null,
        cccd: row.chuHoCccd || null,
      };

      // Subject is the related person being registered (prefer payload.person if present)
      const subjectFromPayload = parsedPayload?.person || null;
      const subject = {
        id: row.personId || null,
        hoTen: subjectFromPayload?.hoTen || row.personName || null,
        cccd: subjectFromPayload?.cccd || row.personCccd || null,
        ngaySinh: subjectFromPayload?.ngaySinh || null,
        gioiTinh: subjectFromPayload?.gioiTinh || null,
        quanHe: subjectFromPayload?.quanHe || null,
      };

      const detail = {
        id: row.id,
        type: row.type,
        loai,
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
        requesterUsername: row.requesterUsername || null,
        requesterCccd: row.requesterCccd || null,
        applicant,
        subject,
        person: row.personId
          ? { id: row.personId, hoTen: row.personName, cccd: row.personCccd }
          : null,
        household: row.householdId
          ? {
              id: row.householdId,
              soHoKhau: row.householdCode,
              diaChi: row.householdAddress,
            }
          : null,
        attachments: attachments,
        payload: parsedPayload,
        source,
      };

      return res.json({ success: true, data: detail });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /tam-tru-vang/requests/:id/reject
 */
router.post(
  "/tam-tru-vang/requests/:id/reject",
  requireAuth,
  requireAnyTask(["hokhau_nhankhau", "tamtru_tamvang"]),
  async (req, res, next) => {
    try {
      const requestId = Number(req.params.id);
      const reviewerId = req.user!.id;
      const { reason } = req.body;

      if (!requestId) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "ID yêu cầu không hợp lệ",
          },
        });
      }
      if (!reason || reason.trim() === "") {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Cần cung cấp lý do từ chối",
          },
        });
      }

      const requestResult = await query(
        `SELECT * FROM requests WHERE id = $1`,
        [requestId]
      );
      if ((requestResult?.rowCount ?? 0) === 0) {
        return res.status(404).json({
          success: false,
          error: { code: "NOT_FOUND", message: "Yêu cầu không tồn tại" },
        });
      }
      const reqRow = requestResult.rows[0];
      if (
        !["PENDING", "pending", "moi", "cho_duyet"].includes(
          (reqRow.status || "").toString()
        )
      ) {
        return res.status(400).json({
          success: false,
          error: { code: "INVALID_STATE", message: "Yêu cầu đã được xử lý" },
        });
      }

      await query(
        `UPDATE requests SET status = 'REJECTED', "rejectionReason" = $1, "reviewedBy" = $2, "reviewedAt" = CURRENT_TIMESTAMP WHERE id = $3`,
        [reason.trim(), reviewerId, requestId]
      );

      return res.json({
        success: true,
        data: { id: requestId, status: "rejected" },
      });
    } catch (err) {
      next(err);
    }
  }
);

// Validation functions
function validateAddNewbornPayload(payload: any): string | null {
  const newborn = payload.newborn || payload;
  const requiredFields = ["hoTen", "ngaySinh", "gioiTinh", "noiSinh"];

  const missingFields = requiredFields.filter((field) => !newborn[field]);
  if (missingFields.length > 0) {
    return `Thiếu các trường bắt buộc cho trẻ sơ sinh: ${missingFields.join(
      ", "
    )}`;
  }

  if (newborn.gioiTinh && !["nam", "nu", "khac"].includes(newborn.gioiTinh)) {
    return "Giới tính phải là 'nam', 'nu', hoặc 'khac'";
  }

  if (newborn.isMoiSinh !== true) {
    return "Đơn thêm con sơ sinh phải có isMoiSinh = true";
  }

  return null;
}

function validateAddPersonPayload(
  payload: any,
  hasTargetHouseholdId: boolean = false
): string | null {
  const person = payload.person || payload;
  const requiredFields = [
    "hoTen",
    "cccd",
    "ngaySinh",
    "gioiTinh",
    "quanHe",
    "noiSinh",
    "nguyenQuan",
    "danToc",
    "tonGiao",
    "quocTich",
    "ngheNghiep",
    "noiLamViec",
    "ngayDangKyThuongTru",
    "diaChiThuongTruTruoc",
  ];

  const missingFields = requiredFields.filter(
    (field) =>
      person[field] === undefined ||
      person[field] === null ||
      String(person[field]).trim() === ""
  );
  if (missingFields.length > 0) {
    return "Thiếu các trường bắt buộc (trừ Ghi chú)";
  }

  if (person.gioiTinh && !["nam", "nu", "khac"].includes(person.gioiTinh)) {
    return "Giới tính phải là 'nam', 'nu', hoặc 'khac'";
  }

  // Validate quanHe
  const validQuanHe = [
    "chu_ho",
    "vo_chong",
    "con",
    "cha_me",
    "anh_chi_em",
    "ong_ba",
    "chau",
    "khac",
  ];
  if (!validQuanHe.includes(String(person.quanHe).toLowerCase())) {
    return "Quan hệ không hợp lệ";
  }

  return null;
}

function validateTemporaryResidencePayload(payload: any): string | null {
  const residenceData = payload.residence || payload;

  const personPayload =
    (payload?.person && typeof payload.person === "object" && payload.person) ||
    (payload?.nhanKhau &&
      typeof payload.nhanKhau === "object" &&
      payload.nhanKhau) ||
    (residenceData?.person &&
      typeof residenceData.person === "object" &&
      residenceData.person) ||
    null;

  const nhanKhauIdRaw =
    residenceData?.nhanKhauId ??
    payload?.nhanKhauId ??
    payload?.personId ??
    null;
  const nhanKhauIdNum =
    nhanKhauIdRaw !== null &&
    nhanKhauIdRaw !== undefined &&
    nhanKhauIdRaw !== ""
      ? Number(nhanKhauIdRaw)
      : null;

  // Required fields (nhanKhauId is optional if person payload is provided)
  const requiredFields = ["tuNgay", "lyDo"];
  const missingFields = requiredFields.filter((field) => !residenceData[field]);
  if (missingFields.length > 0) {
    return `Thiếu các trường bắt buộc: ${missingFields.join(", ")}`;
  }

  if (!nhanKhauIdNum && !personPayload) {
    return "Thiếu thông tin nhân khẩu (nhanKhauId hoặc person)";
  }

  if (nhanKhauIdNum !== null) {
    if (!Number.isInteger(nhanKhauIdNum) || nhanKhauIdNum <= 0) {
      return "nhanKhauId phải là số nguyên dương";
    }
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

  // Validate household code (soHoKhau) / legacy diaChi
  const codeOrAddress = residenceData.soHoKhau || residenceData.diaChi;
  if (!codeOrAddress || String(codeOrAddress).trim().length === 0) {
    return "soHoKhau không được để trống";
  }

  return null;
}

function validateTemporaryAbsencePayload(payload: any): string | null {
  const absenceData = payload.absence || payload;

  const personPayload =
    (payload?.person && typeof payload.person === "object" && payload.person) ||
    (payload?.nhanKhau &&
      typeof payload.nhanKhau === "object" &&
      payload.nhanKhau) ||
    (absenceData?.person &&
      typeof absenceData.person === "object" &&
      absenceData.person) ||
    null;

  const nhanKhauIdRaw =
    absenceData?.nhanKhauId ?? payload?.nhanKhauId ?? payload?.personId ?? null;
  const nhanKhauIdNum =
    nhanKhauIdRaw !== null &&
    nhanKhauIdRaw !== undefined &&
    nhanKhauIdRaw !== ""
      ? Number(nhanKhauIdRaw)
      : null;

  // Required fields (nhanKhauId is optional if person payload is provided)
  const requiredFields = ["tuNgay", "lyDo"];
  const missingFields = requiredFields.filter((field) => !absenceData[field]);
  if (missingFields.length > 0) {
    return `Thiếu các trường bắt buộc: ${missingFields.join(", ")}`;
  }

  if (!nhanKhauIdNum && !personPayload) {
    return "Thiếu thông tin nhân khẩu (nhanKhauId hoặc person)";
  }

  if (nhanKhauIdNum !== null) {
    if (!Number.isInteger(nhanKhauIdNum) || nhanKhauIdNum <= 0) {
      return "nhanKhauId phải là số nguyên dương";
    }
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

function validateSplitHouseholdPayload(payload: any): string | null {
  if (!payload || typeof payload !== "object") {
    return "Thiếu dữ liệu tách hộ";
  }

  if (
    !Array.isArray(payload.selectedNhanKhauIds) ||
    payload.selectedNhanKhauIds.length === 0
  ) {
    return "Vui lòng chọn ít nhất một nhân khẩu cần tách";
  }

  if (!payload.newChuHoId) {
    return "Vui lòng chọn chủ hộ mới cho hộ được tách";
  }

  if (!payload.newAddress || String(payload.newAddress).trim() === "") {
    return "Vui lòng nhập địa chỉ hộ khẩu mới";
  }

  if (!payload.expectedDate) {
    return "Vui lòng chọn ngày dự kiến tách hộ";
  }

  const expectedDate = new Date(payload.expectedDate);
  if (isNaN(expectedDate.getTime())) {
    return "Ngày dự kiến tách hộ không hợp lệ";
  }

  if (!payload.reason || String(payload.reason).trim() === "") {
    return "Vui lòng nhập lý do tách hộ";
  }

  return null;
}

function validateDeceasedPayload(payload: any): string | null {
  if (!payload || typeof payload !== "object") {
    return "Thiếu dữ liệu khai tử";
  }

  const nhanKhauId = payload.nhanKhauId || payload.personId;
  if (!nhanKhauId || !Number.isInteger(Number(nhanKhauId))) {
    return "Vui lòng chọn nhân khẩu cần khai tử";
  }

  if (!payload.ngayMat) {
    return "Vui lòng nhập ngày mất";
  }

  const ngayMatDate = new Date(payload.ngayMat);
  if (isNaN(ngayMatDate.getTime())) {
    return "Ngày mất không hợp lệ";
  }

  if (!payload.lyDo || String(payload.lyDo).trim() === "") {
    return "Vui lòng nhập lý do/ghi chú khai tử";
  }

  return null;
}

function validateUpdatePersonPayload(payload: any): string | null {
  if (!payload || typeof payload !== "object") {
    return "Thiếu dữ liệu sửa nhân khẩu";
  }

  const nhanKhauId = payload.nhanKhauId || payload.personId;
  if (!nhanKhauId || !Number.isInteger(Number(nhanKhauId))) {
    return "Vui lòng chọn nhân khẩu cần sửa";
  }

  const lyDo = payload.lyDo || payload.reason;
  if (!lyDo || String(lyDo).trim() === "") {
    return "Vui lòng nhập lý do sửa";
  }

  // CCCD updates are allowed only when the current person has no CCCD.
  // This constraint is enforced at approval time (needs DB state).
  // Here we only validate internal consistency.
  const hasAnyCccdField =
    (typeof payload.cccd === "string" && payload.cccd.trim() !== "") ||
    (typeof payload.ngayCapCCCD === "string" &&
      payload.ngayCapCCCD.trim() !== "") ||
    (typeof payload.noiCapCCCD === "string" &&
      payload.noiCapCCCD.trim() !== "");
  if (hasAnyCccdField) {
    const cccd = String(payload.cccd || "").trim();
    if (!cccd) {
      return "Vui lòng nhập CCCD/CMND";
    }
    if (payload.ngayCapCCCD) {
      const d = new Date(payload.ngayCapCCCD);
      if (isNaN(d.getTime())) {
        return "Ngày cấp CCCD/CMND không hợp lệ";
      }
    }
  }

  if (payload.ngaySinh) {
    const d = new Date(payload.ngaySinh);
    if (isNaN(d.getTime())) {
      return "Ngày sinh không hợp lệ";
    }
  }

  if (payload.gioiTinh) {
    const gt = String(payload.gioiTinh).toLowerCase();
    if (!["nam", "nu", "khac"].includes(gt)) {
      return "Giới tính không hợp lệ";
    }
  }

  const updatableKeys = [
    "hoTen",
    "biDanh",
    "ngaySinh",
    "gioiTinh",
    "noiSinh",
    "nguyenQuan",
    "danToc",
    "tonGiao",
    "quocTich",
    "cccd",
    "ngayCapCCCD",
    "noiCapCCCD",
    "quanHe",
    "ngayDangKyThuongTru",
    "ngheNghiep",
    "noiLamViec",
    "diaChiThuongTruTruoc",
    "ghiChu",
    "ghiChuHoKhau",
    "lyDoKhongCoCCCD",
  ];

  const hasAnyChange = updatableKeys.some((k) => {
    const v = (payload as any)[k];
    if (v === null || v === undefined) return false;
    if (typeof v === "string") return v.trim() !== "";
    return true;
  });

  if (!hasAnyChange) {
    return "Vui lòng nhập ít nhất một thông tin cần sửa";
  }

  return null;
}

function validateRemovePersonPayload(payload: any): string | null {
  if (!payload || typeof payload !== "object") {
    return "Thiếu dữ liệu xoá nhân khẩu";
  }

  const nhanKhauId = payload.nhanKhauId || payload.personId;
  if (!nhanKhauId || !Number.isInteger(Number(nhanKhauId))) {
    return "Vui lòng chọn nhân khẩu cần xoá";
  }

  const lyDo = payload.lyDo || payload.reason;
  if (!lyDo || String(lyDo).trim() === "") {
    return "Vui lòng nhập lý do xoá";
  }

  return null;
}

function validateMoveOutPayload(payload: any): string | null {
  if (!payload || typeof payload !== "object") {
    return "Thiếu dữ liệu chuyển đi";
  }

  const nhanKhauId = payload.nhanKhauId || payload.personId;
  if (!nhanKhauId || !Number.isInteger(Number(nhanKhauId))) {
    return "Vui lòng chọn nhân khẩu cần chuyển đi";
  }

  const ngayChuyen =
    payload.ngayChuyen || payload.ngayDi || payload.ngayThucHien;
  if (!ngayChuyen) {
    return "Vui lòng nhập ngày chuyển đi";
  }
  const ngayDate = new Date(ngayChuyen);
  if (isNaN(ngayDate.getTime())) {
    return "Ngày chuyển đi không hợp lệ";
  }

  const lyDo = payload.lyDo || payload.reason || payload.noiDung;
  if (!lyDo || String(lyDo).trim() === "") {
    return "Vui lòng nhập lý do/ghi chú chuyển đi";
  }

  return null;
}

/**
 * GET /requests/my
 * Lấy danh sách yêu cầu của người dân hiện tại
 */
router.get(
  "/requests/my",
  requireAuth,
  requireRole(["nguoi_dan"]),
  async (req, res, next) => {
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
        payload:
          typeof row.payload === "string"
            ? JSON.parse(row.payload)
            : row.payload,
      }));

      return res.json({
        success: true,
        data: requests,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /requests/:id
 * Lấy chi tiết một yêu cầu (chủ đơn hoặc tổ trưởng)
 */
router.get(
  "/requests/:id",
  requireAuth,
  requireAnyTask(["hokhau_nhankhau", "tamtru_tamvang"]),
  async (req, res, next) => {
    try {
      const userId = req.user!.id;
      const requestId = Number(req.params.id);

      if (!requestId) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "ID yêu cầu không hợp lệ",
          },
        });
      }

      // Check if user is requester or leader
      const isLeader = ["to_truong", "to_pho"].includes(req.user!.role);
      const isRequester = await query(
        `SELECT id FROM requests WHERE id = $1 AND "requesterUserId" = $2`,
        [requestId, userId]
      );

      if (!isLeader && (isRequester?.rowCount ?? 0) === 0) {
        return res.status(403).json({
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "Không có quyền xem yêu cầu này",
          },
        });
      }

      const result = await query(
        `SELECT r.*, 
                COALESCE(u."fullName", un."hoTen") as "requesterName",
                u.username as "requesterUsername",
                COALESCE(u.cccd, un.cccd) as "requesterCccd",
                ru."fullName" as "reviewerName"
       FROM requests r
       LEFT JOIN users u ON r."requesterUserId" = u.id
       LEFT JOIN nhan_khau un ON u."personId" = un.id
       LEFT JOIN users ru ON r."reviewedBy" = ru.id
       WHERE r.id = $1`,
        [requestId]
      );

      if ((result?.rowCount ?? 0) === 0) {
        return res.status(404).json({
          success: false,
          error: { code: "NOT_FOUND", message: "Yêu cầu không tồn tại" },
        });
      }

      const row = result.rows[0];

      const parsedPayload =
        typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload;

      // Related household/person info for leader review
      let hoKhauLienQuan: any = null;
      if (row.targetHouseholdId) {
        const hk = await query(
          `SELECT id, "soHoKhau", "diaChi" FROM ho_khau WHERE id = $1`,
          [Number(row.targetHouseholdId)]
        );
        if ((hk?.rowCount ?? 0) > 0) {
          hoKhauLienQuan = {
            id: Number(hk.rows[0].id),
            soHoKhau: hk.rows[0].soHoKhau,
            diaChi: hk.rows[0].diaChi,
          };
        }
      }

      let nhanKhauLienQuan: any = null;
      if (row.targetPersonId) {
        const nk = await query(
          `SELECT id, "hoTen", cccd FROM nhan_khau WHERE id = $1`,
          [Number(row.targetPersonId)]
        );
        if ((nk?.rowCount ?? 0) > 0) {
          nhanKhauLienQuan = {
            id: Number(nk.rows[0].id),
            hoTen: nk.rows[0].hoTen,
            cccd: nk.rows[0].cccd,
          };
        }
      }

      const precheckWarnings = await buildPrecheckWarnings({
        type: String(row.type),
        payload: parsedPayload,
        targetHouseholdId: row.targetHouseholdId,
        targetPersonId: row.targetPersonId,
      });

      const data = {
        id: row.id,
        code: row.code,
        type: row.type,
        status: row.status ?? "PENDING",
        rejectionReason: row.rejectionReason,
        createdAt: row.createdAt,
        reviewedAt: row.reviewedAt,
        targetHouseholdId: row.targetHouseholdId,
        targetPersonId: row.targetPersonId,
        payload: parsedPayload,
        requesterName: row.requesterName,
        requesterUsername: row.requesterUsername,
        requesterCccd: row.requesterCccd,
        reviewerName: row.reviewerName,
        hoKhauLienQuan,
        nhanKhauLienQuan,
        precheck: { warnings: precheckWarnings },
      };

      console.log("[GET /requests/:id] keys=", Object.keys(data));

      return res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /requests
 * Lấy danh sách yêu cầu (chỉ tổ trưởng)
 */
router.get(
  "/requests",
  requireAuth,
  requireAnyTask(["hokhau_nhankhau", "tamtru_tamvang"]),
  async (req, res, next) => {
    try {
      const { status, type } = req.query;
      // Build query selecting requester and related household/person info
      let queryStr = `
      SELECT r.id, r.code, r.type, r.status, r."createdAt", r.priority,
              u.id as "requesterId", COALESCE(u."fullName", un."hoTen") as "requesterName", u.username as "requesterUsername", COALESCE(u.cccd, un.cccd) as "requesterCccd",
            hk.id as "hoKhauId", hk."soHoKhau" as "householdCode", hk."diaChi" as "householdAddress",
             nk.id as "nhanKhauId", nk."hoTen" as "nhanKhauName",
             r.payload
      FROM requests r
      LEFT JOIN users u ON r."requesterUserId" = u.id
            LEFT JOIN nhan_khau un ON u."personId" = un.id
      LEFT JOIN ho_khau hk ON r."targetHouseholdId" = hk.id
      LEFT JOIN nhan_khau nk ON r."targetPersonId" = nk.id
      WHERE 1=1
    `;
      const params: any[] = [];
      let paramIndex = 1;

      if (status) {
        // Compare status case-insensitively to tolerate 'pending'/'PENDING'
        queryStr += ` AND UPPER(r.status) = UPPER($${paramIndex})`;
        params.push(String(status));
        paramIndex++;
      } else {
        // default to PENDING if not provided
        queryStr += ` AND UPPER(r.status) = UPPER($${paramIndex})`;
        params.push("PENDING");
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
          parsedPayload =
            typeof row.payload === "string"
              ? JSON.parse(row.payload)
              : row.payload;
        } catch (e) {
          parsedPayload = row.payload;
        }

        return {
          id: row.id,
          code: row.code,
          type: row.type,
          status: row.status ?? "PENDING",
          createdAt: row.createdAt,
          priority: row.priority,
          requester: {
            id: row.requesterId,
            fullName: row.requesterName,
            username: row.requesterUsername,
            cccd: row.requesterCccd,
          },
          hoKhauLienQuan: row.hoKhauId
            ? {
                id: row.hoKhauId,
                soHoKhau: row.householdCode,
                diaChi: row.householdAddress,
              }
            : null,
          nhanKhauLienQuan: row.nhanKhauId
            ? {
                id: row.nhanKhauId,
                hoTen: row.nhanKhauName,
              }
            : null,
          payload: parsedPayload,
        };
      });

      console.log("[GET /requests] keys sample=", Object.keys(rows[0] || {}));

      return res.json({
        success: true,
        data: rows,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /requests/:id/approve
 * Duyệt yêu cầu (chỉ tổ trưởng)
 */
router.post(
  "/requests/:id/approve",
  requireAuth,
  requireAnyTask(["hokhau_nhankhau", "tamtru_tamvang"]),
  async (req, res, next) => {
    try {
      const requestId = Number(req.params.id);
      const reviewerId = req.user!.id;
      const { householdId } = req.body; // Tổ trưởng có thể chỉ định householdId cho ADD_PERSON

      if (!requestId) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "ID yêu cầu không hợp lệ",
          },
        });
      }

      // Get request details
      const requestResult = await query(
        `SELECT * FROM requests WHERE id = $1`,
        [requestId]
      );

      if ((requestResult?.rowCount ?? 0) === 0) {
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

      // Payload có thể đã là object (jsonb) hoặc stringified JSON. Parse an toàn để tránh lỗi "[object Object] is not valid JSON".
      let payload: any = request.payload;
      if (typeof request.payload === "string") {
        try {
          payload = JSON.parse(request.payload);
        } catch (e) {
          return res.status(400).json({
            success: false,
            error: {
              code: "INVALID_PAYLOAD",
              message: "Payload yêu cầu không phải JSON hợp lệ",
            },
          });
        }
      }

      // Process approval based on type using dispatcher
      const approvalHandler = getApprovalHandler(request.type);
      if (!approvalHandler) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Loại yêu cầu chưa được hỗ trợ",
          },
        });
      }

      // Sử dụng householdId từ body nếu được cung cấp (cho ADD_PERSON), nếu không dùng từ request
      const finalHouseholdId = householdId || request.targetHouseholdId;
      let handlerResult: any = null;
      try {
        handlerResult = await approvalHandler(
          requestId,
          payload,
          reviewerId,
          finalHouseholdId,
          request.targetPersonId
        );
      } catch (e: any) {
        // Normalize known business errors thrown by handlers
        if (e && typeof e === "object" && (e.code || e.message)) {
          return res.status(e.status || 400).json({
            success: false,
            error: {
              code: e.code || "APPROVE_FAILED",
              message: e.message || "Không thể duyệt yêu cầu",
              details: e.details,
            },
          });
        }

        // Postgres unique violation
        if (e && e.code === "23505") {
          const constraint = String(e.constraint || "");
          const msg = constraint.toLowerCase().includes("cccd")
            ? "CCCD đã tồn tại trong hệ thống"
            : "Dữ liệu bị trùng lặp (unique constraint)";
          return res.status(400).json({
            success: false,
            error: {
              code: "DUPLICATE_VALUE",
              message: msg,
              details: { constraint },
            },
          });
        }

        throw e;
      }

      // If handler created a person, set targetPersonId
      if (handlerResult && handlerResult.id) {
        await query(`UPDATE requests SET "targetPersonId" = $1 WHERE id = $2`, [
          handlerResult.id,
          requestId,
        ]);
      }

      // Update request status
      await query(
        `UPDATE requests
       SET status = 'APPROVED', "reviewedBy" = $1, "reviewedAt" = CURRENT_TIMESTAMP
       WHERE id = $2`,
        [reviewerId, requestId]
      );

      // Fetch updated request to return
      const updatedReqRes = await query(
        `SELECT r.*, u."fullName" as requesterName, u.username as requesterUsername, u.cccd as requesterCccd, ru."fullName" as reviewerName
       FROM requests r
       LEFT JOIN users u ON r."requesterUserId" = u.id
       LEFT JOIN users ru ON r."reviewedBy" = ru.id
       WHERE r.id = $1`,
        [requestId]
      );
      const updatedRow = updatedReqRes.rows[0];

      return res.json({
        success: true,
        message: "Yêu cầu đã được duyệt thành công",
        data: {
          applied: handlerResult || null,
          request: updatedRow
            ? {
                id: updatedRow.id,
                code: updatedRow.code,
                type: updatedRow.type,
                status: updatedRow.status,
                createdAt: updatedRow.createdAt,
                reviewedAt: updatedRow.reviewedAt,
                targetHouseholdId: updatedRow.targetHouseholdId,
                targetPersonId: updatedRow.targetPersonId,
                requesterName: updatedRow.requesterName,
                requesterUsername: updatedRow.requesterUsername,
                requesterCccd: updatedRow.requesterCccd,
              }
            : null,
        },
      });
    } catch (err: any) {
      // If it's our custom error (thrown by handlers with shape {code,message})
      if (err && err.code && err.message) {
        return res.status(400).json({
          success: false,
          error: { code: String(err.code), message: String(err.message) },
        });
      }

      // Handle common Postgres error codes with friendly messages
      const pgCode = err?.code;
      const pgDetail = err?.detail || err?.message || "";
      if (pgCode === "23505") {
        return res.status(409).json({
          success: false,
          error: {
            code: "DUPLICATE",
            message: "Dữ liệu trùng lặp (unique constraint). " + pgDetail,
          },
        });
      }
      if (pgCode === "23503") {
        return res.status(400).json({
          success: false,
          error: {
            code: "FK_VIOLATION",
            message: "Ràng buộc khoá ngoại thất bại. " + pgDetail,
          },
        });
      }
      if (pgCode === "23514") {
        return res.status(400).json({
          success: false,
          error: {
            code: "CHECK_VIOLATION",
            message:
              "Ràng buộc dữ liệu không thỏa (check constraint). " + pgDetail,
          },
        });
      }

      // fallback: pass to global error handler
      next(err);
    }
  }
);

/**
 * POST /requests/:id/reject
 * Từ chối yêu cầu (chỉ tổ trưởng)
 */
router.post(
  "/requests/:id/reject",
  requireAuth,
  requireAnyTask(["hokhau_nhankhau", "tamtru_tamvang"]),
  async (req, res, next) => {
    try {
      const requestId = Number(req.params.id);
      const reviewerId = req.user!.id;
      const { reason } = req.body;

      if (!requestId) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "ID yêu cầu không hợp lệ",
          },
        });
      }

      if (!reason || reason.trim() === "") {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Cần cung cấp lý do từ chối",
          },
        });
      }

      // Check if request exists and is pending
      const requestCheck = await query(
        `SELECT status FROM requests WHERE id = $1`,
        [requestId]
      );

      if ((requestCheck?.rowCount ?? 0) === 0) {
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
  }
);

// Dispatcher function để lấy handler tương ứng
function getApprovalHandler(type: string): ApprovalHandler | null {
  const handlers: Record<string, ApprovalHandler> = {
    [RequestType.ADD_NEWBORN]: processAddNewbornApproval,
    [RequestType.ADD_PERSON]: processAddPersonApproval,
    [RequestType.UPDATE_PERSON]: processUpdatePersonApproval,
    [RequestType.REMOVE_PERSON]: processRemovePersonApproval,
    [RequestType.TEMPORARY_RESIDENCE]: processTemporaryResidenceApproval,
    [RequestType.TEMPORARY_ABSENCE]: processTemporaryAbsenceApproval,
    [RequestType.SPLIT_HOUSEHOLD]: processSplitHouseholdApproval,
    [RequestType.MOVE_OUT]: processMoveOutApproval,
    [RequestType.DECEASED]: processDeceasedApproval,
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
) => Promise<any>;

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
  // Lock request row to prevent concurrent approvals
  await query(`SELECT id FROM requests WHERE id = $1 FOR UPDATE`, [requestId]);
  // Lock request row to prevent concurrent approvals
  await query(`SELECT id FROM requests WHERE id = $1 FOR UPDATE`, [requestId]);

  try {
    const newborn = payload.newborn || payload;
    const householdId = targetHouseholdId || newborn.householdId;
    const {
      hoTen,
      ngaySinh,
      gioiTinh,
      noiSinh,
      nguyenQuan,
      danToc,
      tonGiao,
      quocTich,
      cccd,
      ghiChu,
    } = newborn;

    // 1. Check household exists
    const householdCheck = await query(
      `SELECT id, "trangThai" FROM ho_khau WHERE id = $1`,
      [householdId]
    );

    if ((householdCheck?.rowCount ?? 0) === 0) {
      throw { code: "HOUSEHOLD_NOT_FOUND", message: "Hộ khẩu không tồn tại" };
    }

    const household = householdCheck.rows[0];
    if (household.trangThai !== "active") {
      throw {
        code: "HOUSEHOLD_INACTIVE",
        message: "Hộ khẩu chưa được kích hoạt",
      };
    }

    // 2. Validate CCCD if provided (should be unique if present)
    if (cccd && cccd.trim() !== "") {
      const cccdCheck = await query(
        `SELECT id FROM nhan_khau WHERE cccd = $1`,
        [cccd.trim()]
      );

      if ((cccdCheck?.rowCount ?? 0) > 0) {
        throw {
          code: "DUPLICATE_CCCD",
          message: "Số CCCD đã tồn tại trong hệ thống",
        };
      }
    }

    // 3. Basic duplicate prevention for newborns (same name + birth date + household)
    const duplicateCheck = await query(
      `SELECT id FROM nhan_khau
       WHERE "hoKhauId" = $1 AND "hoTen" = $2 AND "ngaySinh" = $3 AND "quanHe" = 'con'`,
      [householdId, hoTen.trim(), ngaySinh]
    );

    if ((duplicateCheck?.rowCount ?? 0) > 0) {
      throw {
        code: "DUPLICATE_NEWBORN",
        message: "Trẻ sơ sinh với thông tin tương tự đã tồn tại trong hộ khẩu",
      };
    }

    // 4. Auto-set fields for newborns
    // - Không nhồi trạng thái/ghi chú hệ thống vào nhan_khau.ghiChu (tránh lẫn với ghi chú hồ sơ)
    // - Nếu thiếu CCCD thì lưu lý do vào nhan_khau.lyDoKhongCoCCCD
    const processedLyDoKhongCoCCCD =
      !cccd || String(cccd).trim() === "" ? "Mới sinh - chưa có CCCD" : null;
    const processedGhiChu = ghiChu ? String(ghiChu).trim() : null;
    const processedNgheNghiep = null;
    const processedNoiLamViec = null;
    const processedDiaChiThuongTruTruoc = "mới sinh";

    // 5. Insert new nhan_khau
    const insertResult = await query(
      `INSERT INTO nhan_khau (
        "hoKhauId", "hoTen", cccd, "ngaySinh", "gioiTinh", "noiSinh", "nguyenQuan", "danToc", "tonGiao", "quocTich",
        "quanHe", "ngayDangKyThuongTru", "diaChiThuongTruTruoc", "ngheNghiep", "noiLamViec", "ghiChu", "lyDoKhongCoCCCD"
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        'con', CURRENT_DATE, $11, $12, $13, $14, $15
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
        processedLyDoKhongCoCCCD,
      ]
    );

    // 6. Record newborn movement for consistent UI (movementStatus)
    await query(
      `INSERT INTO bien_dong (
        "nhanKhauId", loai, "ngayThucHien", "noiDung", "diaChiCu", "diaChiMoi",
        "nguoiThucHien", "canBoXacNhan", "trangThai", "ghiChu"
      ) VALUES (
        $1, 'khai_sinh', $2, $3, NULL, NULL,
        NULL, $4, 'da_duyet', NULL
      )`,
      [insertResult.rows[0].id, getCurrentDateString(), "Khai sinh", reviewerId]
    );

    const created = insertResult.rows[0];
    await query("COMMIT");
    return created;
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
      throw {
        code: "HOUSEHOLD_REQUIRED",
        message:
          "Cần chỉ định hộ khẩu để thêm nhân khẩu vào. Vui lòng liên hệ tổ trưởng.",
      };
    }
    const {
      hoTen,
      cccd,
      lyDoKhongCoCCCD,
      ngaySinh,
      gioiTinh,
      noiSinh,
      nguyenQuan,
      danToc,
      tonGiao,
      quocTich,
      quanHe,
      ngayDangKyThuongTru,
      diaChiThuongTruTruoc,
      ngheNghiep,
      noiLamViec,
      ghiChu,
    } = person;

    const processedQuanHe = quanHe || "khac";

    // 1. Check household exists and is active
    const householdCheck = await query(
      `SELECT id, "trangThai" FROM ho_khau WHERE id = $1`,
      [householdId]
    );

    if ((householdCheck?.rowCount ?? 0) === 0) {
      throw { code: "HOUSEHOLD_NOT_FOUND", message: "Hộ khẩu không tồn tại" };
    }

    const household = householdCheck.rows[0];
    if (household.trangThai !== "active") {
      throw {
        code: "HOUSEHOLD_INACTIVE",
        message: "Hộ khẩu chưa được kích hoạt",
      };
    }

    // 2. Validate CCCD if provided (must be unique)
    if (cccd && cccd.trim() !== "") {
      const cccdCheck = await query(
        `SELECT id FROM nhan_khau WHERE cccd = $1`,
        [cccd.trim()]
      );

      if ((cccdCheck?.rowCount ?? 0) > 0) {
        throw {
          code: "DUPLICATE_CCCD",
          message: "Số CCCD đã tồn tại trong hệ thống",
        };
      }
    }

    // 3. Basic duplicate prevention (same name + birth date + household)
    const duplicateCheck = await query(
      `SELECT id FROM nhan_khau
       WHERE "hoKhauId" = $1 AND "hoTen" = $2 AND "ngaySinh" = $3`,
      [householdId, hoTen.trim(), ngaySinh]
    );

    if ((duplicateCheck?.rowCount ?? 0) > 0) {
      throw {
        code: "DUPLICATE_PERSON",
        message: "Người này đã tồn tại trong hộ khẩu",
      };
    }

    // 4. Validate quanHe (relationship)
    const validQuanHe = [
      "chu_ho",
      "vo_chong",
      "con",
      "cha_me",
      "anh_chi_em",
      "ong_ba",
      "chau",
      "khac",
    ];
    if (!processedQuanHe || !validQuanHe.includes(processedQuanHe)) {
      throw { code: "INVALID_RELATIONSHIP", message: "Quan hệ không hợp lệ" };
    }

    // 5. If quanHe is 'chu_ho', check if household already has a head
    if (processedQuanHe === "chu_ho") {
      const existingChuHo = await query(
        `SELECT id FROM nhan_khau WHERE "hoKhauId" = $1 AND "quanHe" = 'chu_ho'`,
        [householdId]
      );

      if ((existingChuHo?.rowCount ?? 0) > 0) {
        throw {
          code: "DUPLICATE_CHU_HO",
          message:
            "Hộ khẩu đã có chủ hộ. Vui lòng sử dụng chức năng đổi chủ hộ.",
        };
      }
    }

    // 6. Auto-set fields for person
    const normalizedCccd = cccd ? String(cccd).trim() : "";
    const processedLyDoKhongCoCCCD = !normalizedCccd
      ? String(lyDoKhongCoCCCD || ghiChu || "").trim() || null
      : null;
    // Nếu thiếu CCCD và người dùng chưa có field riêng, coi ghiChu là lý do thiếu CCCD (để không làm bẩn ghiChu hồ sơ)
    const processedGhiChu =
      normalizedCccd || lyDoKhongCoCCCD
        ? ghiChu
          ? String(ghiChu).trim()
          : null
        : null;
    const processedNgayDangKyThuongTru =
      ngayDangKyThuongTru || getCurrentDateString();
    const processedDiaChiThuongTruTruoc = diaChiThuongTruTruoc || "";

    // 7. Insert new nhan_khau
    const insertResult = await query(
      `INSERT INTO nhan_khau (
        "hoKhauId", "hoTen", cccd, "ngaySinh", "gioiTinh", "noiSinh", "nguyenQuan", "danToc", "tonGiao", "quocTich",
        "quanHe", "ngayDangKyThuongTru", "diaChiThuongTruTruoc", "ngheNghiep", "noiLamViec", "ghiChu", "lyDoKhongCoCCCD"
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17
      ) RETURNING *`,
      [
        householdId,
        hoTen.trim(),
        normalizedCccd ? normalizedCccd : null,
        ngaySinh,
        gioiTinh,
        noiSinh.trim(),
        nguyenQuan ? nguyenQuan.trim() : null,
        danToc ? danToc.trim() : null,
        tonGiao ? tonGiao.trim() : null,
        quocTich ? quocTich.trim() : "Việt Nam",
        processedQuanHe,
        processedNgayDangKyThuongTru,
        processedDiaChiThuongTruTruoc,
        ngheNghiep || null,
        noiLamViec || null,
        processedGhiChu,
        processedLyDoKhongCoCCCD,
      ]
    );
    const created = insertResult.rows[0];

    // 8. If this person becomes chu_ho, update ho_khau
    if (processedQuanHe === "chu_ho") {
      await query(`UPDATE ho_khau SET "chuHoId" = $1 WHERE id = $2`, [
        created.id,
        householdId,
      ]);
    }

    // 9. Link user if CCCD was provided
    if (cccd && cccd.trim() !== "") {
      await query(
        `UPDATE users
         SET "personId" = $1
         WHERE role = 'nguoi_dan'
           AND "personId" IS NULL
           AND normalize_cccd(username) = normalize_cccd($2)`,
        [created.id, cccd.trim()]
      );
    }

    await query("COMMIT");
    return created;
  } catch (err) {
    await query("ROLLBACK");
    throw err;
  }
}

async function processUpdatePersonApproval(
  requestId: number,
  payload: any,
  reviewerId: number,
  targetHouseholdId?: number,
  targetPersonId?: number
) {
  await query("BEGIN");

  try {
    await query(`SELECT id FROM requests WHERE id = $1 FOR UPDATE`, [
      requestId,
    ]);

    const nhanKhauId =
      targetPersonId || payload?.nhanKhauId || payload?.personId;
    if (!nhanKhauId) {
      throw { code: "VALIDATION_ERROR", message: "Thiếu nhân khẩu cần sửa" };
    }

    const current = await query(
      `SELECT id, "hoKhauId", "quanHe", "trangThai", "cccd" FROM nhan_khau WHERE id = $1`,
      [nhanKhauId]
    );
    if ((current?.rowCount ?? 0) === 0) {
      throw { code: "PERSON_NOT_FOUND", message: "Nhân khẩu không tồn tại" };
    }
    if (String(current.rows[0].trangThai) === "deleted") {
      throw { code: "PERSON_DELETED", message: "Nhân khẩu đã bị xoá" };
    }

    const currentCccd = String(current.rows[0]?.cccd ?? "").trim();

    const payloadCccd = String(payload?.cccd ?? "").trim();
    const payloadNgayCap = String(payload?.ngayCapCCCD ?? "").trim();
    const payloadNoiCap = String(payload?.noiCapCCCD ?? "").trim();
    const hasAnyCccdField =
      payloadCccd !== "" || payloadNgayCap !== "" || payloadNoiCap !== "";

    // Allow CCCD updates ONLY when the current CCCD is empty (e.g., newborn).
    if (hasAnyCccdField) {
      if (currentCccd !== "") {
        throw {
          code: "VALIDATION_ERROR",
          message:
            "Nhân khẩu đã có CCCD/CMND nên không thể sửa CCCD qua yêu cầu này",
        };
      }
      if (!payloadCccd) {
        throw {
          code: "VALIDATION_ERROR",
          message: "Vui lòng nhập CCCD/CMND",
        };
      }
    }

    const allowed: Array<{
      key: string;
      col: string;
      normalize?: (v: any) => any;
    }> = [
      { key: "hoTen", col: '"hoTen"', normalize: (v) => String(v).trim() },
      { key: "biDanh", col: '"biDanh"', normalize: (v) => String(v).trim() },
      {
        key: "ngaySinh",
        col: '"ngaySinh"',
        normalize: (v) => normalizeDateOnly(v),
      },
      { key: "gioiTinh", col: '"gioiTinh"', normalize: (v) => String(v) },
      { key: "noiSinh", col: '"noiSinh"', normalize: (v) => String(v).trim() },
      {
        key: "nguyenQuan",
        col: '"nguyenQuan"',
        normalize: (v) => String(v).trim(),
      },
      { key: "danToc", col: '"danToc"', normalize: (v) => String(v).trim() },
      {
        key: "tonGiao",
        col: '"tonGiao"',
        normalize: (v) => String(v).trim(),
      },
      {
        key: "quocTich",
        col: '"quocTich"',
        normalize: (v) => String(v).trim(),
      },
      // CCCD fields: only accepted when current DB CCCD is empty (validated above)
      { key: "cccd", col: '"cccd"', normalize: (v) => String(v).trim() },
      {
        key: "ngayCapCCCD",
        col: '"ngayCapCCCD"',
        normalize: (v) => normalizeDateOnly(v),
      },
      {
        key: "noiCapCCCD",
        col: '"noiCapCCCD"',
        normalize: (v) => String(v).trim(),
      },
      { key: "quanHe", col: '"quanHe"', normalize: (v) => String(v).trim() },
      {
        key: "ngayDangKyThuongTru",
        col: '"ngayDangKyThuongTru"',
        normalize: (v) => normalizeDateOnly(v),
      },
      {
        key: "ngheNghiep",
        col: '"ngheNghiep"',
        normalize: (v) => String(v).trim(),
      },
      {
        key: "noiLamViec",
        col: '"noiLamViec"',
        normalize: (v) => String(v).trim(),
      },
      {
        key: "diaChiThuongTruTruoc",
        col: '"diaChiThuongTruTruoc"',
        normalize: (v) => String(v).trim(),
      },
      { key: "ghiChu", col: '"ghiChu"', normalize: (v) => String(v).trim() },
      {
        key: "ghiChuHoKhau",
        col: '"ghiChuHoKhau"',
        normalize: (v) => String(v).trim(),
      },
      {
        key: "lyDoKhongCoCCCD",
        col: '"lyDoKhongCoCCCD"',
        normalize: (v) => String(v).trim(),
      },
    ];

    const setClauses: string[] = [];
    const params: any[] = [];

    for (const f of allowed) {
      const raw = payload?.[f.key];
      if (raw === undefined) continue;

      const isCccdKey =
        f.key === "cccd" || f.key === "ngayCapCCCD" || f.key === "noiCapCCCD";

      // Only touch CCCD columns when the request explicitly provides non-empty CCCD data.
      if (isCccdKey && !hasAnyCccdField) continue;

      const normalized = f.normalize ? f.normalize(raw) : raw;

      // For CCCD keys, ignore empty string to avoid clearing DB values.
      if (isCccdKey && (normalized === "" || normalized === null)) continue;

      // allow explicit null to clear (for non-CCCD fields)
      if (normalized === "") {
        setClauses.push(`${f.col} = NULL`);
      } else {
        params.push(normalized);
        setClauses.push(`${f.col} = $${params.length}`);
      }
    }

    if (setClauses.length === 0) {
      throw {
        code: "VALIDATION_ERROR",
        message: "Không có thông tin nào để cập nhật",
      };
    }

    const lyDo = String(
      payload?.lyDo || payload?.reason || "Cập nhật thông tin"
    ).trim();

    // Chỉ cập nhật các trường được phép; KHÔNG tự động append lý do vào nhan_khau.ghiChu
    // (lý do đã được lưu vào bien_dong để audit)
    params.push(nhanKhauId);
    await query(
      `UPDATE nhan_khau
       SET ${setClauses.join(", ")},
           "updatedAt" = CURRENT_TIMESTAMP
       WHERE id = $${params.length}`,
      params
    );

    await query(
      `INSERT INTO bien_dong (
        "nhanKhauId", loai, "ngayThucHien", "noiDung", "diaChiCu", "diaChiMoi",
        "nguoiThucHien", "canBoXacNhan", "trangThai", "ghiChu"
      ) VALUES (
        $1, 'thay_doi_thong_tin', $2, $3, NULL, NULL,
        $4, $4, 'da_duyet', $5
      )`,
      [
        nhanKhauId,
        getCurrentDateString(),
        lyDo,
        reviewerId,
        JSON.stringify({
          changedFields: setClauses.map((c) => c.split("=")[0].trim()),
        }),
      ]
    );

    await query("COMMIT");
    return { personId: nhanKhauId, changed: true };
  } catch (err) {
    await query("ROLLBACK");
    throw err;
  }
}

async function processRemovePersonApproval(
  requestId: number,
  payload: any,
  reviewerId: number,
  targetHouseholdId?: number,
  targetPersonId?: number
) {
  await query("BEGIN");

  try {
    await query(`SELECT id FROM requests WHERE id = $1 FOR UPDATE`, [
      requestId,
    ]);

    const nhanKhauId =
      targetPersonId || payload?.nhanKhauId || payload?.personId;
    if (!nhanKhauId) {
      throw { code: "VALIDATION_ERROR", message: "Thiếu nhân khẩu cần xoá" };
    }

    const person = await query(
      `SELECT id, "hoKhauId", "quanHe", "trangThai" FROM nhan_khau WHERE id = $1`,
      [nhanKhauId]
    );
    if ((person?.rowCount ?? 0) === 0) {
      throw { code: "PERSON_NOT_FOUND", message: "Nhân khẩu không tồn tại" };
    }

    const row = person.rows[0];
    if (String(row.trangThai) === "deleted") {
      throw { code: "PERSON_DELETED", message: "Nhân khẩu đã bị xoá" };
    }
    if (String(row.quanHe) === "chu_ho") {
      throw {
        code: "CANNOT_DELETE_HEAD",
        message: "Không thể xoá Chủ hộ. Vui lòng đổi Chủ hộ trước.",
      };
    }

    const lyDo = String(
      payload?.lyDo || payload?.reason || "Xoá nhân khẩu"
    ).trim();
    const noteLine = `Xoá nhân khẩu (${getCurrentDateString()}): ${lyDo}`;

    await query(
      `UPDATE nhan_khau
       SET "trangThai" = 'deleted',
           "ghiChu" = CASE
             WHEN "ghiChu" IS NULL OR trim("ghiChu") = '' THEN $2
             ELSE ("ghiChu" || E'\\n' || $2)
           END,
           "updatedAt" = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [nhanKhauId, noteLine]
    );

    await query("COMMIT");
    return { personId: nhanKhauId, deleted: true };
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
  reviewerId: number,
  targetHouseholdId?: number,
  targetPersonId?: number
) {
  // Start transaction
  await query("BEGIN");

  try {
    await query(`SELECT id FROM requests WHERE id = $1 FOR UPDATE`, [
      requestId,
    ]);

    const reqMeta = await query(
      `SELECT "requesterUserId", "targetHouseholdId" FROM requests WHERE id = $1`,
      [requestId]
    );

    const requesterUserId: number | null =
      (reqMeta?.rowCount ?? 0) > 0
        ? reqMeta.rows[0].requesterUserId ?? null
        : null;

    const effectiveHouseholdId: number | null = targetHouseholdId
      ? Number(targetHouseholdId)
      : (reqMeta?.rowCount ?? 0) > 0 && reqMeta.rows[0].targetHouseholdId
      ? Number(reqMeta.rows[0].targetHouseholdId)
      : null;

    const residenceData =
      payload?.residence && typeof payload.residence === "object"
        ? payload.residence
        : payload;
    const personPayload =
      payload?.person || payload?.nhanKhau || residenceData?.person || null;
    const tuNgay = residenceData?.tuNgay;
    const denNgay = residenceData?.denNgay;
    const lyDo = residenceData?.lyDo || residenceData?.reason;
    let diaChi = residenceData?.diaChi || payload?.diaChi || null;

    let nhanKhauId: number | null = null;
    if (targetPersonId) nhanKhauId = Number(targetPersonId);
    if (!nhanKhauId && residenceData?.nhanKhauId)
      nhanKhauId = Number(residenceData.nhanKhauId);
    if (!nhanKhauId && payload?.nhanKhauId)
      nhanKhauId = Number(payload.nhanKhauId);

    if (!tuNgay || !lyDo) {
      throw {
        code: "VALIDATION_ERROR",
        message: "Payload thiếu trường bắt buộc: tuNgay, lyDo",
      };
    }

    if (!nhanKhauId && !personPayload) {
      throw {
        code: "VALIDATION_ERROR",
        message: "Payload thiếu nhanKhauId hoặc thông tin person",
      };
    }

    // Ensure we have a household context.
    if (!effectiveHouseholdId) {
      throw {
        code: "HOUSEHOLD_REQUIRED",
        message: "Không xác định được hộ khẩu liên quan của yêu cầu tạm trú",
      };
    }

    // If diaChi (soHoKhau) missing, derive from household.
    if (!diaChi || String(diaChi).trim() === "") {
      const household = await query(
        `SELECT "soHoKhau" FROM ho_khau WHERE id = $1`,
        [effectiveHouseholdId]
      );
      const soHoKhau = household?.rows?.[0]?.soHoKhau;
      if (!soHoKhau) {
        throw {
          code: "VALIDATION_ERROR",
          message: "Không lấy được số hộ khẩu của hộ liên quan",
        };
      }
      diaChi = soHoKhau;
    }

    // Support new person creation on approval (citizen submits payload.person).
    if (!nhanKhauId && personPayload) {
      const hoTen = String(personPayload?.hoTen || "").trim();
      const cccd = personPayload?.cccd ? String(personPayload.cccd).trim() : "";
      const ngaySinh = personPayload?.ngaySinh || null;
      const gioiTinh = personPayload?.gioiTinh || null;
      const noiSinh = String(personPayload?.noiSinh || "").trim();
      const quanHe = personPayload?.quanHe || "khac";

      if (!hoTen || !ngaySinh || !gioiTinh || !noiSinh || !quanHe) {
        throw {
          code: "VALIDATION_ERROR",
          message:
            "Thiếu thông tin nhân khẩu bắt buộc: hoTen, ngaySinh, gioiTinh, noiSinh, quanHe",
        };
      }

      // If CCCD provided and exists, reuse only if same household
      if (cccd) {
        const existing = await query(
          `SELECT id, "hoKhauId" FROM nhan_khau WHERE cccd = $1 LIMIT 1`,
          [cccd]
        );
        if ((existing?.rowCount ?? 0) > 0) {
          const existingRow = existing.rows[0];
          if (Number(existingRow.hoKhauId) !== Number(effectiveHouseholdId)) {
            throw {
              code: "VALIDATION_ERROR",
              message: "Nhân khẩu với CCCD này đã tồn tại ở hộ khẩu khác",
            };
          }
          nhanKhauId = Number(existingRow.id);
        }
      }

      if (!nhanKhauId) {
        const insertPerson = await query(
          `INSERT INTO nhan_khau (
            "hoTen", cccd, "ngaySinh", "gioiTinh", "noiSinh",
            "nguyenQuan", "danToc", "tonGiao", "quocTich",
            "ngayDangKyThuongTru", "diaChiThuongTruTruoc",
            "ngheNghiep", "noiLamViec", "ghiChu",
            "hoKhauId", "quanHe", "trangThai"
          ) VALUES (
            $1, $2, $3, $4, $5,
            $6, $7, $8, $9,
            $10, $11,
            $12, $13, $14,
            $15, $16, $17
          ) RETURNING id`,
          [
            hoTen,
            cccd ? cccd : null,
            ngaySinh,
            gioiTinh,
            noiSinh,
            personPayload?.nguyenQuan || null,
            personPayload?.danToc || null,
            personPayload?.tonGiao || null,
            personPayload?.quocTich || "Việt Nam",
            personPayload?.ngayDangKyThuongTru || null,
            personPayload?.diaChiThuongTruTruoc || null,
            personPayload?.ngheNghiep || null,
            personPayload?.noiLamViec || null,
            personPayload?.ghiChu ? String(personPayload.ghiChu).trim() : null,
            effectiveHouseholdId,
            quanHe,
            "active",
          ]
        );
        nhanKhauId = Number(insertPerson.rows[0].id);
      }
    }

    if (!nhanKhauId) {
      throw {
        code: "VALIDATION_ERROR",
        message: "Không xác định được nhân khẩu để duyệt tạm trú",
      };
    }

    // 1. Check nhan_khau exists
    const nhanKhauCheck = await query(
      `SELECT id, "hoTen", "trangThai" FROM nhan_khau WHERE id = $1`,
      [nhanKhauId]
    );

    if ((nhanKhauCheck?.rowCount ?? 0) === 0) {
      throw { code: "PERSON_NOT_FOUND", message: "Nhân khẩu không tồn tại" };
    }

    const nhanKhau = nhanKhauCheck.rows[0];

    // 2. Check if person is already in tam_tru_vang status
    if (nhanKhau.trangThai === "tam_tru" || nhanKhau.trangThai === "tam_vang") {
      throw {
        code: "PERSON_ALREADY_IN_TEMP_STATUS",
        message: "Nhân khẩu đã đang trong trạng thái tạm trú hoặc tạm vắng",
      };
    }

    // 3. Check if there's already an active tam_tru_vang record for this person
    const existingCheck = await query(
      `SELECT id FROM tam_tru_vang
       WHERE "nhanKhauId" = $1 AND "trangThai" IN ('cho_duyet', 'da_duyet', 'dang_thuc_hien')
       AND (denNgay IS NULL OR denNgay >= CURRENT_DATE)`,
      [nhanKhauId]
    );

    if ((existingCheck?.rowCount ?? 0) > 0) {
      throw {
        code: "ACTIVE_TEMP_RECORD_EXISTS",
        message:
          "Đã tồn tại bản ghi tạm trú/vắng đang hoạt động cho nhân khẩu này",
      };
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
        String(diaChi).trim(),
        String(lyDo).trim(),
        requesterUserId || reviewerId,
        reviewerId, // nguoiDuyet
      ]
    );

    // 5. Update nhan_khau status to tam_tru
    await query(`UPDATE nhan_khau SET "trangThai" = 'tam_tru' WHERE id = $1`, [
      nhanKhauId,
    ]);

    await query("COMMIT");

    return { id: nhanKhauId, tamTruVangId: insertResult.rows[0]?.id };
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
  reviewerId: number,
  targetHouseholdId?: number,
  targetPersonId?: number
) {
  // Start transaction
  await query("BEGIN");

  try {
    await query(`SELECT id FROM requests WHERE id = $1 FOR UPDATE`, [
      requestId,
    ]);

    const reqMeta = await query(
      `SELECT "requesterUserId", "targetHouseholdId" FROM requests WHERE id = $1`,
      [requestId]
    );

    const requesterUserId: number | null =
      (reqMeta?.rowCount ?? 0) > 0
        ? reqMeta.rows[0].requesterUserId ?? null
        : null;

    const effectiveHouseholdId: number | null = targetHouseholdId
      ? Number(targetHouseholdId)
      : (reqMeta?.rowCount ?? 0) > 0 && reqMeta.rows[0].targetHouseholdId
      ? Number(reqMeta.rows[0].targetHouseholdId)
      : null;

    const absenceData =
      payload?.absence && typeof payload.absence === "object"
        ? payload.absence
        : payload;
    const personPayload =
      payload?.person || payload?.nhanKhau || absenceData?.person || null;
    const tuNgay = absenceData?.tuNgay;
    const denNgay = absenceData?.denNgay;
    const lyDo = absenceData?.lyDo || absenceData?.reason;

    let nhanKhauId: number | null = null;
    if (targetPersonId) nhanKhauId = Number(targetPersonId);
    if (!nhanKhauId && absenceData?.nhanKhauId)
      nhanKhauId = Number(absenceData.nhanKhauId);
    if (!nhanKhauId && payload?.nhanKhauId)
      nhanKhauId = Number(payload.nhanKhauId);

    if (!tuNgay || !lyDo) {
      throw {
        code: "VALIDATION_ERROR",
        message: "Payload thiếu trường bắt buộc: tuNgay, lyDo",
      };
    }

    // Optional: allow creating a person on approve if payload.person provided.
    if (!nhanKhauId && personPayload) {
      if (!effectiveHouseholdId) {
        throw {
          code: "HOUSEHOLD_REQUIRED",
          message: "Không xác định được hộ khẩu liên quan của yêu cầu tạm vắng",
        };
      }

      const hoTen = String(personPayload?.hoTen || "").trim();
      const cccd = personPayload?.cccd ? String(personPayload.cccd).trim() : "";
      const ngaySinh = personPayload?.ngaySinh || null;
      const gioiTinh = personPayload?.gioiTinh || null;
      const noiSinh = String(personPayload?.noiSinh || "").trim();
      const quanHe = personPayload?.quanHe || "khac";

      if (!hoTen || !ngaySinh || !gioiTinh || !noiSinh || !quanHe) {
        throw {
          code: "VALIDATION_ERROR",
          message:
            "Thiếu thông tin nhân khẩu bắt buộc: hoTen, ngaySinh, gioiTinh, noiSinh, quanHe",
        };
      }

      if (cccd) {
        const existing = await query(
          `SELECT id, "hoKhauId" FROM nhan_khau WHERE cccd = $1 LIMIT 1`,
          [cccd]
        );
        if ((existing?.rowCount ?? 0) > 0) {
          const existingRow = existing.rows[0];
          if (Number(existingRow.hoKhauId) !== Number(effectiveHouseholdId)) {
            throw {
              code: "VALIDATION_ERROR",
              message: "Nhân khẩu với CCCD này đã tồn tại ở hộ khẩu khác",
            };
          }
          nhanKhauId = Number(existingRow.id);
        }
      }

      if (!nhanKhauId) {
        const insertPerson = await query(
          `INSERT INTO nhan_khau (
            "hoTen", cccd, "ngaySinh", "gioiTinh", "noiSinh",
            "nguyenQuan", "danToc", "tonGiao", "quocTich",
            "ngayDangKyThuongTru", "diaChiThuongTruTruoc",
            "ngheNghiep", "noiLamViec", "ghiChu",
            "hoKhauId", "quanHe", "trangThai"
          ) VALUES (
            $1, $2, $3, $4, $5,
            $6, $7, $8, $9,
            $10, $11,
            $12, $13, $14,
            $15, $16, $17
          ) RETURNING id`,
          [
            hoTen,
            cccd ? cccd : null,
            ngaySinh,
            gioiTinh,
            noiSinh,
            personPayload?.nguyenQuan || null,
            personPayload?.danToc || null,
            personPayload?.tonGiao || null,
            personPayload?.quocTich || "Việt Nam",
            personPayload?.ngayDangKyThuongTru || null,
            personPayload?.diaChiThuongTruTruoc || null,
            personPayload?.ngheNghiep || null,
            personPayload?.noiLamViec || null,
            personPayload?.ghiChu ? String(personPayload.ghiChu).trim() : null,
            effectiveHouseholdId,
            quanHe,
            "active",
          ]
        );
        nhanKhauId = Number(insertPerson.rows[0].id);
      }
    }

    if (!nhanKhauId) {
      throw {
        code: "VALIDATION_ERROR",
        message: "Thiếu nhân khẩu cần tạm vắng",
      };
    }

    // 1. Check nhan_khau exists
    const nhanKhauCheck = await query(
      `SELECT id, "hoTen", "trangThai" FROM nhan_khau WHERE id = $1`,
      [nhanKhauId]
    );

    if ((nhanKhauCheck?.rowCount ?? 0) === 0) {
      throw { code: "PERSON_NOT_FOUND", message: "Nhân khẩu không tồn tại" };
    }

    const nhanKhau = nhanKhauCheck.rows[0];

    // 2. Check if person is already in tam_tru_vang status
    if (nhanKhau.trangThai === "tam_tru" || nhanKhau.trangThai === "tam_vang") {
      throw {
        code: "PERSON_ALREADY_IN_TEMP_STATUS",
        message: "Nhân khẩu đã đang trong trạng thái tạm trú hoặc tạm vắng",
      };
    }

    // 3. Check if there's already an active tam_tru_vang record for this person
    const existingCheck = await query(
      `SELECT id FROM tam_tru_vang
       WHERE "nhanKhauId" = $1 AND "trangThai" IN ('cho_duyet', 'da_duyet', 'dang_thuc_hien')
       AND (denNgay IS NULL OR denNgay >= CURRENT_DATE)`,
      [nhanKhauId]
    );

    if ((existingCheck?.rowCount ?? 0) > 0) {
      throw {
        code: "ACTIVE_TEMP_RECORD_EXISTS",
        message:
          "Đã tồn tại bản ghi tạm trú/vắng đang hoạt động cho nhân khẩu này",
      };
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
        requesterUserId || reviewerId,
        reviewerId, // nguoiDuyet
      ]
    );

    // 5. Update nhan_khau status to tam_vang
    await query(`UPDATE nhan_khau SET "trangThai" = 'tam_vang' WHERE id = $1`, [
      nhanKhauId,
    ]);

    await query("COMMIT");

    return { id: nhanKhauId, tamTruVangId: insertResult.rows[0]?.id };
  } catch (err) {
    await query("ROLLBACK");
    throw err;
  }
}

async function processSplitHouseholdApproval(
  requestId: number,
  payload: any,
  reviewerId: number,
  targetHouseholdId?: number
) {
  // Thực hiện tách hộ khẩu trực tiếp khi tổ trưởng duyệt
  await query("BEGIN");

  try {
    // Khóa request để tránh duyệt trùng
    await query(`SELECT id FROM requests WHERE id = $1 FOR UPDATE`, [
      requestId,
    ]);

    const originalHouseholdId = targetHouseholdId || payload?.hoKhauId;
    if (!originalHouseholdId) {
      throw {
        code: "HOUSEHOLD_REQUIRED",
        message: "Thiếu hộ khẩu gốc để tách",
      };
    }

    const selectedIds: number[] = (payload?.selectedNhanKhauIds || [])
      .map((n: any) => Number(n))
      .filter((n: number) => Number.isInteger(n) && n > 0);

    if (selectedIds.length === 0) {
      throw {
        code: "VALIDATION_ERROR",
        message: "Vui lòng chọn ít nhất một nhân khẩu cần tách",
      };
    }

    const newChuHoId = Number(payload?.newChuHoId);
    if (!newChuHoId || !selectedIds.includes(newChuHoId)) {
      throw {
        code: "VALIDATION_ERROR",
        message: "Chủ hộ mới phải nằm trong danh sách nhân khẩu được tách",
      };
    }

    const newAddress = String(payload?.newAddress || "").trim();
    if (!newAddress) {
      throw {
        code: "VALIDATION_ERROR",
        message: "Địa chỉ hộ khẩu mới không được để trống",
      };
    }

    const expectedDate = payload?.expectedDate || getCurrentDateString();

    // Kiểm tra hộ khẩu gốc
    const originalHousehold = await query(
      `SELECT id, "chuHoId", "trangThai", "soHoKhau", "diaChi" FROM ho_khau WHERE id = $1`,
      [originalHouseholdId]
    );

    if ((originalHousehold?.rowCount ?? 0) === 0) {
      throw {
        code: "HOUSEHOLD_NOT_FOUND",
        message: "Hộ khẩu gốc không tồn tại",
      };
    }

    // Kiểm tra nhân khẩu thuộc hộ khẩu gốc
    const selectedPeople = await query(
      `SELECT id, "hoKhauId", "quanHe" FROM nhan_khau WHERE id = ANY($1::int[])`,
      [selectedIds]
    );

    if ((selectedPeople?.rowCount ?? 0) !== selectedIds.length) {
      throw {
        code: "VALIDATION_ERROR",
        message: "Danh sách nhân khẩu tách không hợp lệ",
      };
    }

    const invalidMember = selectedPeople.rows.find(
      (p) => p.hoKhauId !== originalHouseholdId
    );
    if (invalidMember) {
      throw {
        code: "VALIDATION_ERROR",
        message: "Tất cả nhân khẩu tách hộ phải thuộc cùng hộ khẩu gốc",
      };
    }

    // Tạo hộ khẩu mới với số hộ khẩu tự sinh
    const newHouseholdResult = await query(
      `INSERT INTO ho_khau ("soHoKhau", "diaChi", "ngayCap", "trangThai", "ghiChu", "chuHoId")
       VALUES (generate_ho_khau_code(), $1, $2, 'inactive', $3, NULL)
       RETURNING id, "soHoKhau"`,
      [newAddress, expectedDate, payload?.reason || null]
    );

    const newHouseholdId = newHouseholdResult.rows[0].id;
    const newSoHoKhau = newHouseholdResult.rows[0].soHoKhau;

    // Chuyển nhân khẩu sang hộ mới, set quanHe cho chủ hộ mới
    await query(
      `UPDATE nhan_khau
       SET "hoKhauId" = $1,
           "quanHe" = CASE
             WHEN id = $2 THEN 'chu_ho'
             WHEN "quanHe" = 'chu_ho' THEN 'khac'
             ELSE "quanHe"
           END,
           "ngayDangKyThuongTru" = COALESCE("ngayDangKyThuongTru", $3),
           "updatedAt" = CURRENT_TIMESTAMP
       WHERE id = ANY($4::int[])`,
      [newHouseholdId, newChuHoId, expectedDate, selectedIds]
    );

    // Kích hoạt hộ khẩu mới và gán chủ hộ
    await query(
      `UPDATE ho_khau
       SET "chuHoId" = $1, "trangThai" = 'active', "ngayCap" = COALESCE("ngayCap", $2)
       WHERE id = $3`,
      [newChuHoId, expectedDate, newHouseholdId]
    );

    // Xử lý hộ khẩu gốc nếu chủ hộ cũ đã tách đi
    const oldChuHoId = originalHousehold.rows[0].chuHoId;
    const chuHoMoved = oldChuHoId && selectedIds.includes(Number(oldChuHoId));

    if (chuHoMoved) {
      // If there are remaining members, require explicit replacement head in payload
      const remaining = await query(
        `SELECT id FROM nhan_khau WHERE "hoKhauId" = $1 ORDER BY id`,
        [originalHouseholdId]
      );

      if ((remaining?.rowCount ?? 0) > 0) {
        const replacementFromPayloadRaw =
          payload?.oldHouseholdNewChuHoId ?? payload?.oldChuHoIdReplacement;
        const replacementFromPayload = replacementFromPayloadRaw
          ? Number(replacementFromPayloadRaw)
          : null;

        if (!replacementFromPayload) {
          throw {
            code: "VALIDATION_ERROR",
            message:
              "Khi tách chủ hộ ra khỏi hộ khẩu gốc, vui lòng chọn chủ hộ thay thế cho hộ khẩu gốc",
          };
        }

        const newHeadId = replacementFromPayload;

        const isValidRemaining = remaining.rows.some(
          (r: any) => Number(r.id) === Number(newHeadId)
        );
        if (!isValidRemaining) {
          throw {
            code: "VALIDATION_ERROR",
            message:
              "Vui lòng chọn chủ hộ thay thế hợp lệ cho hộ khẩu gốc khi tách chủ hộ",
          };
        }

        await query(`UPDATE nhan_khau SET "quanHe" = 'chu_ho' WHERE id = $1`, [
          newHeadId,
        ]);
        await query(`UPDATE ho_khau SET "chuHoId" = $1 WHERE id = $2`, [
          newHeadId,
          originalHouseholdId,
        ]);
      } else {
        // Không còn thành viên, chuyển trạng thái hộ gốc về inactive
        await query(
          `UPDATE ho_khau SET "chuHoId" = NULL, "trangThai" = 'inactive' WHERE id = $1`,
          [originalHouseholdId]
        );
      }
    }

    // Ghi lịch sử: hộ gốc đã tách các thành viên sang hộ mới
    const movedMembers = await query(
      `SELECT id, "hoTen" FROM nhan_khau WHERE id = ANY($1::int[])`,
      [selectedIds]
    );

    await query(
      `INSERT INTO lich_su_thay_doi (bang, "banGhiId", "hanhDong", truong, "noiDungCu", "noiDungMoi", "nguoiThucHien")
       VALUES ('ho_khau', $1, 'update', 'tach_ho', NULL, $2, $3)`,
      [
        originalHouseholdId,
        JSON.stringify({
          movedToHouseholdId: newHouseholdId,
          movedToSoHoKhau: newSoHoKhau,
          members: movedMembers.rows,
        }),
        reviewerId,
      ]
    );

    // Ghi lịch sử: hộ mới được tạo từ tách hộ
    await query(
      `INSERT INTO lich_su_thay_doi (bang, "banGhiId", "hanhDong", truong, "noiDungCu", "noiDungMoi", "nguoiThucHien")
       VALUES ('ho_khau', $1, 'create', 'tach_ho', NULL, $2, $3)`,
      [
        newHouseholdId,
        JSON.stringify({
          sourceHouseholdId: originalHouseholdId,
          sourceSoHoKhau: originalHousehold.rows[0].soHoKhau,
          members: movedMembers.rows,
        }),
        reviewerId,
      ]
    );

    await query("COMMIT");

    return {
      acknowledged: true,
      message: "Tách hộ thành công",
      newHouseholdId,
      newSoHoKhau,
      originalHouseholdId,
    };
  } catch (err) {
    await query("ROLLBACK");
    throw err;
  }
}

async function processDeceasedApproval(
  requestId: number,
  payload: any,
  reviewerId: number,
  targetHouseholdId?: number,
  targetPersonId?: number
) {
  await query("BEGIN");

  try {
    const nhanKhauId =
      targetPersonId || payload?.nhanKhauId || payload?.personId;
    if (!nhanKhauId) {
      throw {
        code: "VALIDATION_ERROR",
        message: "Thiếu nhân khẩu cần khai tử",
      };
    }

    const person = await query(
      `SELECT id, "trangThai", "hoKhauId" FROM nhan_khau WHERE id = $1`,
      [nhanKhauId]
    );

    if ((person?.rowCount ?? 0) === 0) {
      throw { code: "PERSON_NOT_FOUND", message: "Nhân khẩu không tồn tại" };
    }

    if (
      targetHouseholdId &&
      Number(person.rows[0].hoKhauId) !== Number(targetHouseholdId)
    ) {
      throw {
        code: "PERSON_OUTSIDE_HOUSEHOLD",
        message: "Nhân khẩu không thuộc hộ khẩu liên quan của yêu cầu",
      };
    }

    if (String(person.rows[0].trangThai) === "khai_tu") {
      throw { code: "ALREADY_DECEASED", message: "Nhân khẩu đã được khai tử" };
    }

    const ngayMat = normalizeDateOnly(
      payload?.ngayMat || payload?.dateOfDeath || getCurrentDateString()
    );
    const lyDo = (payload?.lyDo || payload?.reason || "Khai tử").toString();
    const noiMat = payload?.noiMat || payload?.diaDiem || null;
    const ghiChu =
      payload?.ghiChu ||
      payload?.note ||
      (noiMat ? `Nơi mất: ${String(noiMat)}` : null);

    // Keep person record but mark movement status; overwrite note for clarity in UI
    await query(
      `UPDATE nhan_khau
       SET "trangThai" = 'khai_tu',
           "ghiChu" = CASE
             WHEN $2::text IS NULL OR trim($2::text) = '' THEN "ghiChu"
             ELSE $2
           END,
           "updatedAt" = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [
        nhanKhauId,
        `Khai tử (${ngayMat}): ${lyDo}${noiMat ? ` - ${String(noiMat)}` : ""}`,
      ]
    );

    await query(
      `INSERT INTO bien_dong (
        "nhanKhauId", loai, "ngayThucHien", "noiDung", "diaChiCu", "diaChiMoi",
        "nguoiThucHien", "canBoXacNhan", "trangThai", "ghiChu"
      ) VALUES (
        $1, 'khai_tu', $2, $3, NULL, NULL,
        $4, $4, 'da_duyet', $5
      )`,
      [nhanKhauId, ngayMat, lyDo, reviewerId, ghiChu || null]
    );

    await query("COMMIT");
    return { personId: nhanKhauId, ngayMat, lyDo, noiMat };
  } catch (err) {
    await query("ROLLBACK");
    throw err;
  }
}

async function processMoveOutApproval(
  requestId: number,
  payload: any,
  reviewerId: number,
  targetHouseholdId?: number,
  targetPersonId?: number
) {
  await query("BEGIN");

  try {
    const nhanKhauId =
      targetPersonId || payload?.nhanKhauId || payload?.personId;
    if (!nhanKhauId) {
      throw {
        code: "VALIDATION_ERROR",
        message: "Thiếu nhân khẩu cần chuyển đi",
      };
    }

    const person = await query(
      `SELECT id, "trangThai", "hoKhauId" FROM nhan_khau WHERE id = $1`,
      [nhanKhauId]
    );

    if ((person?.rowCount ?? 0) === 0) {
      throw { code: "PERSON_NOT_FOUND", message: "Nhân khẩu không tồn tại" };
    }

    if (
      targetHouseholdId &&
      Number(person.rows[0].hoKhauId) !== Number(targetHouseholdId)
    ) {
      throw {
        code: "PERSON_OUTSIDE_HOUSEHOLD",
        message: "Nhân khẩu không thuộc hộ khẩu liên quan của yêu cầu",
      };
    }

    if (String(person.rows[0].trangThai) === "chuyen_di") {
      throw { code: "ALREADY_MOVED_OUT", message: "Nhân khẩu đã chuyển đi" };
    }

    if (String(person.rows[0].trangThai) === "khai_tu") {
      throw {
        code: "PERSON_DECEASED",
        message: "Nhân khẩu đã khai tử, không thể ghi nhận chuyển đi",
      };
    }

    const ngayChuyen = normalizeDateOnly(
      payload?.ngayChuyen ||
        payload?.ngayDi ||
        payload?.ngayThucHien ||
        getCurrentDateString()
    );
    const lyDo = (
      payload?.lyDo ||
      payload?.reason ||
      payload?.noiDung ||
      "Chuyển đi"
    ).toString();
    const noiDen =
      payload?.noiDen || payload?.diaChiMoi || payload?.diaChiDen || null;
    const ghiChu = payload?.ghiChu || payload?.note || null;

    await query(
      `UPDATE nhan_khau
       SET "trangThai" = 'chuyen_di',
           "ghiChu" = CASE
             WHEN $2::text IS NULL OR trim($2::text) = '' THEN "ghiChu"
             ELSE $2
           END,
           "updatedAt" = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [
        nhanKhauId,
        `Chuyển đi (${ngayChuyen}): ${lyDo}${
          noiDen ? ` - ${String(noiDen)}` : ""
        }`,
      ]
    );

    await query(
      `INSERT INTO bien_dong (
        "nhanKhauId", loai, "ngayThucHien", "noiDung", "diaChiCu", "diaChiMoi",
        "nguoiThucHien", "canBoXacNhan", "trangThai", "ghiChu"
      ) VALUES (
        $1, 'chuyen_di', $2, $3, NULL, $4,
        $5, $5, 'da_duyet', $6
      )`,
      [nhanKhauId, ngayChuyen, lyDo, noiDen, reviewerId, ghiChu]
    );

    await query("COMMIT");
    return { personId: nhanKhauId, ngayChuyen, lyDo, noiDen };
  } catch (err) {
    await query("ROLLBACK");
    throw err;
  }
}

export default router;
