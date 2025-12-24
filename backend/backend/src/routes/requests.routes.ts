import { Router } from "express";
import { query } from "../db";
import { requireAuth, requireRole } from "../middlewares/auth.middleware";

const router = Router();

/**
 * POST /requests
 * Tạo yêu cầu mới (chỉ dành cho người dân)
 */
router.post("/requests", requireAuth, requireRole(["nguoi_dan"]), async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { type, payload } = req.body;

    // Validate type
    const validTypes = [
      "TAM_VANG",
      "TAM_TRU",
      "TACH_HO_KHAU",
      "SUA_NHAN_KHAU",
      "XOA_NHAN_KHAU",
    ];

    if (!type || !validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: `Invalid type. Must be one of: ${validTypes.join(", ")}`,
        },
      });
    }

    // Validate payload
    if (!payload || typeof payload !== "object") {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Missing or invalid payload",
        },
      });
    }

    // Lấy hoKhauId của user
    let hoKhauId: number | null = null;
    let nhanKhauId: number | null = null;

    const nhanKhauResult = await query(
      `SELECT id, "hoKhauId" FROM nhan_khau WHERE "userId" = $1 LIMIT 1`,
      [userId]
    );

    if (nhanKhauResult.rowCount > 0) {
      const nk = nhanKhauResult.rows[0];
      hoKhauId = nk.hoKhauId;
      nhanKhauId = nk.id;
    }

    // Validate nhanKhauId nếu cần
    if (type === "TAM_VANG" || type === "TAM_TRU" || type === "SUA_NHAN_KHAU" || type === "XOA_NHAN_KHAU") {
      if (!payload.nhanKhauId) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Missing nhanKhauId in payload",
          },
        });
      }

      // Verify nhân khẩu thuộc hộ của user
      if (hoKhauId) {
        const checkResult = await query(
          `SELECT id FROM nhan_khau WHERE id = $1 AND "hoKhauId" = $2`,
          [payload.nhanKhauId, hoKhauId]
        );

        if (checkResult.rowCount === 0) {
          return res.status(403).json({
            success: false,
            error: {
              code: "FORBIDDEN",
              message: "Nhân khẩu không thuộc hộ khẩu của bạn",
            },
          });
        }
      }
    }

    // Map type sang loai trong yeu_cau_thay_doi
    const loaiMap: Record<string, string> = {
      TAM_VANG: "tam_vang",
      TAM_TRU: "tam_tru",
      TACH_HO_KHAU: "chuyen_di", // Tách hộ khẩu dùng loai chuyen_di
      SUA_NHAN_KHAU: "sua_thong_tin",
      XOA_NHAN_KHAU: "khac",
    };

    const loai = loaiMap[type] || "khac";

    // Tạo yêu cầu trong bảng yeu_cau_thay_doi
    const result = await query(
      `INSERT INTO yeu_cau_thay_doi 
       ("nguoiGuiId", "hoKhauId", "nhanKhauId", loai, "tieuDe", "noiDung", "trangThai")
       VALUES ($1, $2, $3, $4, $5, $6, 'moi')
       RETURNING *`,
      [
        userId,
        hoKhauId,
        payload.nhanKhauId || nhanKhauId,
        loai,
        payload.tieuDe || requestTypeToTitle(type),
        JSON.stringify(payload), // Store full payload as JSON in noiDung
      ]
    );

    return res.status(201).json({
      success: true,
      data: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /requests/me
 * Lấy danh sách yêu cầu của người dân hiện tại
 */
router.get("/requests/me", requireAuth, requireRole(["nguoi_dan"]), async (req, res, next) => {
  try {
    const userId = req.user!.id;

    const result = await query(
      `SELECT id, loai, "tieuDe", "noiDung", "trangThai", "createdAt", "updatedAt"
       FROM yeu_cau_thay_doi
       WHERE "nguoiGuiId" = $1
       ORDER BY "createdAt" DESC`,
      [userId]
    );

    // Parse noiDung (JSON) thành payload
    const requests = result.rows.map((row) => {
      let payload = {};
      try {
        payload = JSON.parse(row.noiDung);
      } catch (e) {
        payload = { lyDo: row.noiDung };
      }

      // Map loai ngược lại thành type
      const typeMap: Record<string, string> = {
        tam_vang: "TAM_VANG",
        tam_tru: "TAM_TRU",
        chuyen_di: "TACH_HO_KHAU",
        chuyen_den: "TACH_HO_KHAU",
        sua_thong_tin: "SUA_NHAN_KHAU",
        khac: "XOA_NHAN_KHAU",
      };

      // Map trangThai từ DB sang frontend
      const statusMap: Record<string, string> = {
        moi: "pending",
        dang_xu_ly: "processing",
        da_xu_ly: "approved",
        tu_choi: "rejected",
      };

      return {
        id: row.id,
        type: typeMap[row.loai] || row.loai,
        status: statusMap[row.trangThai] || row.trangThai,
        createdAt: row.createdAt,
        payload,
      };
    });

    return res.json({
      success: true,
      data: requests,
    });
  } catch (err) {
    next(err);
  }
});

function requestTypeToTitle(type: string): string {
  const titles: Record<string, string> = {
    TAM_VANG: "Xin tạm vắng",
    TAM_TRU: "Xin tạm trú",
    CHUYEN_HO_KHAU: "Xin chuyển hộ khẩu",
    SUA_NHAN_KHAU: "Sửa thông tin nhân khẩu",
    XOA_NHAN_KHAU: "Xoá nhân khẩu",
  };
  return titles[type] || "Yêu cầu";
}

export default router;

