"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
// chỉ cần đăng nhập
router.get("/test/protected", auth_middleware_1.requireAuth, (req, res) => {
    res.json({ success: true, message: "You are authenticated" });
});
// chỉ role can_bo mới vào
router.get("/test/admin", auth_middleware_1.requireAuth, (0, auth_middleware_1.requireRole)(["can_bo"]), (req, res) => {
    res.json({ success: true, message: "You are can_bo" });
});
exports.default = router;
