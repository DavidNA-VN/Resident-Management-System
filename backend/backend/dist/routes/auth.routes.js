"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const jwt = __importStar(require("jsonwebtoken"));
const db_1 = require("../db");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const cccd_1 = require("../utils/cccd");
const router = (0, express_1.Router)();
async function resolvePersonLink(username, personId) {
    const normalizedCCCD = (0, cccd_1.normalizeCCCD)(username || "");
    const personById = personId
        ? await (0, db_1.query)(`SELECT nk.id, nk."hoTen", nk."hoKhauId", hk."chuHoId"
         FROM nhan_khau nk
         JOIN ho_khau hk ON nk."hoKhauId" = hk.id
         WHERE nk.id = $1`, [personId])
        : null;
    const personByIdRow = personById?.rows?.[0];
    if (personByIdRow) {
        const p = personByIdRow;
        return {
            linked: true,
            personInfo: {
                personId: p.id,
                hoTen: p.hoTen,
                householdId: p.hoKhauId,
                isHeadOfHousehold: Number(p.chuHoId) === Number(p.id),
            },
        };
    }
    if (normalizedCCCD) {
        const personByCCCD = await (0, db_1.query)(`SELECT nk.id, nk."hoTen", nk."hoKhauId", hk."chuHoId"
       FROM nhan_khau nk
       JOIN ho_khau hk ON nk."hoKhauId" = hk.id
       WHERE normalize_cccd(nk.cccd) = $1
       LIMIT 1`, [normalizedCCCD]);
        if ((personByCCCD.rowCount ?? 0) > 0) {
            const p = personByCCCD.rows[0];
            return {
                linked: true,
                personInfo: {
                    personId: p.id,
                    hoTen: p.hoTen,
                    householdId: p.hoKhauId,
                    isHeadOfHousehold: Number(p.chuHoId) === Number(p.id),
                },
            };
        }
    }
    return {
        linked: false,
        personInfo: null,
        message: "Chưa có hồ sơ nhân khẩu. Vui lòng tạo yêu cầu hoặc chờ tổ trưởng duyệt.",
    };
}
// POST /auth/register
router.post("/auth/register", async (req, res, next) => {
    try {
        const { username, password, fullName } = req.body;
        // Registration is for citizens only. Staff accounts are provisioned directly in DB.
        const role = "nguoi_dan";
        const task = undefined;
        // Validation: thiếu field required
        if (!username || !password || !fullName) {
            return res.status(400).json({
                success: false,
                error: {
                    code: "VALIDATION_ERROR",
                    message: "Missing required fields: username, password, fullName",
                },
            });
        }
        // Validation: task không hợp lệ (nếu có)
        if (task) {
            const validTasks = [
                "hokhau_nhankhau",
                "tamtru_tamvang",
                "thongke",
                "kiennghi",
            ];
            if (!validTasks.includes(task)) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: "VALIDATION_ERROR",
                        message: `Invalid task. Must be one of: ${validTasks.join(", ")}`,
                    },
                });
            }
        }
        // Citizens never have a task
        const finalTask = null;
        let finalUsername = username;
        // Citizens: username is CCCD (normalize)
        if (!username || username.trim() === "") {
            return res.status(400).json({
                success: false,
                error: {
                    code: "VALIDATION_ERROR",
                    message: "CCCD là bắt buộc cho người dân",
                },
            });
        }
        // Chuẩn hoá và validate CCCD
        const normalizedCCCD = (0, cccd_1.normalizeCCCD)(username);
        if (!normalizedCCCD) {
            return res.status(400).json({
                success: false,
                error: {
                    code: "VALIDATION_ERROR",
                    message: "CCCD không hợp lệ (chỉ chứa số)",
                },
            });
        }
        finalUsername = normalizedCCCD;
        // Validate độ dài CCCD (thường 9-12 ký tự)
        if (finalUsername.length < 9 || finalUsername.length > 12) {
            return res.status(400).json({
                success: false,
                error: {
                    code: "VALIDATION_ERROR",
                    message: "CCCD phải có 9-12 chữ số",
                },
            });
        }
        // Check uniqueness: username đã tồn tại
        const checkUser = await (0, db_1.query)(`SELECT id FROM users WHERE username = $1`, [
            finalUsername,
        ]);
        if (checkUser.rowCount && checkUser.rowCount > 0) {
            return res.status(409).json({
                success: false,
                error: {
                    code: "USERNAME_EXISTS",
                    message: "Username/CCCD đã tồn tại trong hệ thống",
                },
            });
        }
        // Insert user vào database
        const result = await (0, db_1.query)(`INSERT INTO users (username, password, role, "fullName", task, "isActive")
       VALUES ($1, $2, $3, $4, $5, TRUE)
       RETURNING id, username, role, "fullName", task`, [finalUsername, password, role, fullName, finalTask]);
        return res.status(201).json({
            success: true,
            data: result.rows[0],
        });
    }
    catch (err) {
        next(err);
    }
});
// POST /auth/login
router.post("/auth/login", async (req, res, next) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                error: {
                    code: "VALIDATION_ERROR",
                    message: "Missing username or password",
                },
            });
        }
        const result = await (0, db_1.query)(`SELECT id, username, password, role, "fullName", "personId"
       FROM users
       WHERE username = $1 AND "isActive" = true`, [username]);
        if (result.rowCount === 0) {
            return res.status(401).json({
                success: false,
                error: {
                    code: "INVALID_CREDENTIALS",
                    message: "Invalid username or password",
                },
            });
        }
        const user = result.rows[0];
        // DEMO: password plaintext (sau này đổi bcrypt)
        if (user.password !== password) {
            return res.status(401).json({
                success: false,
                error: {
                    code: "INVALID_CREDENTIALS",
                    message: "Invalid username or password",
                },
            });
        }
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            return res.status(500).json({
                success: false,
                error: { code: "CONFIG_ERROR", message: "Missing JWT_SECRET" },
            });
        }
        const accessToken = jwt.sign({ userId: user.id, role: user.role }, secret, {
            expiresIn: "1d",
        });
        // Chuẩn bị response data
        const responseData = {
            accessToken,
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                fullName: user["fullName"],
            },
        };
        // Đối với người dân: kiểm tra liên kết với nhan_khau
        if (user.role === "nguoi_dan") {
            const resolved = await resolvePersonLink(user.username, user.personId);
            responseData.user.linked = resolved.linked;
            if (resolved.linked && resolved.personInfo) {
                responseData.user.personInfo = resolved.personInfo;
                if (!user.personId) {
                    await (0, db_1.query)(`UPDATE users SET "personId" = $1 WHERE id = $2`, [
                        resolved.personInfo.personId,
                        user.id,
                    ]);
                }
            }
            else if (resolved.message) {
                responseData.user.message = resolved.message;
            }
        }
        return res.json({
            success: true,
            data: responseData,
        });
    }
    catch (err) {
        next(err);
    }
});
// GET /auth/me (lấy thông tin user hiện tại từ req.user do requireAuth inject)
router.get("/auth/me", auth_middleware_1.requireAuth, async (req, res) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            error: { code: "UNAUTHORIZED", message: "Missing auth" },
        });
    }
    const user = req.user;
    const responseData = { ...user };
    // Đối với người dân: kiểm tra liên kết với nhan_khau
    if (user.role === "nguoi_dan") {
        const resolved = await resolvePersonLink(user.username, user.personId);
        responseData.linked = resolved.linked;
        if (resolved.linked && resolved.personInfo) {
            responseData.personInfo = resolved.personInfo;
            if (!user.personId) {
                await (0, db_1.query)(`UPDATE users SET "personId" = $1 WHERE id = $2`, [
                    resolved.personInfo.personId,
                    user.id,
                ]);
            }
        }
        else if (resolved.message) {
            responseData.message = resolved.message;
        }
    }
    return res.json({
        success: true,
        data: responseData,
    });
});
exports.default = router;
