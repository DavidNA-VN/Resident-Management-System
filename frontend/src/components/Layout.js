import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { apiService } from "../services/api";
const roleLabels = {
    to_truong: "Tổ trưởng",
    to_pho: "Tổ phó",
    can_bo: "Cán bộ",
    nguoi_dan: "Người dân",
};
const taskLabels = {
    hokhau_nhankhau: "Hộ khẩu/Nhân khẩu",
    tamtru_tamvang: "Tạm trú/Tạm vắng",
    thongke: "Thống kê",
    kiennghi: "Kiến nghị",
};
export default function Layout({ children }) {
    const location = useLocation();
    const navigate = useNavigate();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [userInfo, setUserInfo] = useState(null);
    const menuItems = [
        { path: "/dashboard", label: "Dashboard", icon: "📊" },
        { path: "/ho-khau", label: "Hộ khẩu", icon: "🏠" },
        { path: "/nhan-khau", label: "Nhân khẩu", icon: "👥" },
        { path: "/requests", label: "Yêu cầu", icon: "📋" },
        { path: "/bien-dong", label: "Biến động", icon: "📝" },
        { path: "/tam-tru-vang", label: "Tạm trú / Tạm vắng", icon: "📍" },
        { path: "/phan-anh", label: "Phản ánh", icon: "💬" },
        { path: "/thong-ke", label: "Thống kê", icon: "📈" },
        { path: "/bao-cao", label: "Báo cáo", icon: "📄" }
    ];
    useEffect(() => {
        const loadUserInfo = async () => {
            try {
                const response = await apiService.getMe();
                if (response.success) {
                    setUserInfo(response.data);
                    localStorage.setItem("userInfo", JSON.stringify(response.data));
                }
            }
            catch (err) {
                console.error("Failed to load user info:", err);
                // Nếu token invalid, logout
                apiService.logout();
                navigate("/");
            }
        };
        const storedUserInfo = localStorage.getItem("userInfo");
        if (storedUserInfo) {
            try {
                setUserInfo(JSON.parse(storedUserInfo));
            }
            catch (e) {
                // Ignore parse error
            }
        }
        loadUserInfo();
    }, [navigate]);
    const handleLogout = () => {
        apiService.logout();
        navigate("/");
    };
    const userName = userInfo
        ? `${roleLabels[userInfo.role] || userInfo.role}${userInfo.task ? ` - ${taskLabels[userInfo.task] || userInfo.task}` : ""}`
        : "Đang tải...";
    return (_jsxs("div", { className: "flex h-screen overflow-hidden bg-gradient-to-br from-gray-50 via-white to-gray-50", children: [_jsxs("aside", { className: `${isSidebarOpen ? "w-64" : "w-20"} border-r border-gray-200/80 bg-white/95 backdrop-blur-sm shadow-lg transition-all duration-300 flex flex-col`, children: [_jsxs("div", { className: "flex h-16 items-center justify-between border-b border-gray-200/60 px-4 bg-gradient-to-r from-blue-50/50 to-cyan-50/30", children: [isSidebarOpen && (_jsxs("div", { children: [_jsx("h1", { className: "text-lg font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent", children: "Qu\u1EA3n l\u00FD D\u00E2n c\u01B0" }), _jsx("p", { className: "text-xs text-gray-500 mt-0.5", children: "TDP7 La Kh\u00EA" })] })), _jsx("button", { onClick: () => setIsSidebarOpen(!isSidebarOpen), className: "rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors", "aria-label": "Toggle sidebar", children: isSidebarOpen ? "◀" : "▶" })] }), _jsx("nav", { className: "flex-1 overflow-y-auto p-4 space-y-1", children: _jsx("ul", { className: "space-y-1", children: menuItems
                                .filter((item) => {
                                // Chỉ hiển thị menu "Yêu cầu" cho to_truong và can_bo
                                if (item.path === "/requests") {
                                    return userInfo?.role === "to_truong" || userInfo?.role === "can_bo";
                                }
                                return true;
                            })
                                .map((item) => {
                                const isActive = location.pathname === item.path;
                                return (_jsx("li", { children: _jsxs(Link, { to: item.path, className: `flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200 ${isActive
                                            ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md shadow-blue-500/25 scale-[1.02]"
                                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 hover:scale-[1.01]"}`, children: [_jsx("span", { className: "text-lg", children: item.icon }), isSidebarOpen && _jsx("span", { children: item.label })] }) }, item.path));
                            }) }) }), _jsxs("div", { className: "border-t border-gray-200/60 p-4 bg-gray-50/50", children: [isSidebarOpen && (_jsxs("div", { className: "mb-3 rounded-lg bg-white border border-gray-200 p-3 shadow-sm", children: [_jsx("p", { className: "text-xs text-gray-500 mb-1", children: "\u0110\u0103ng nh\u1EADp v\u1EDBi t\u01B0 c\u00E1ch" }), _jsx("p", { className: "text-sm font-semibold text-gray-900 leading-tight", children: userName })] })), _jsxs("button", { onClick: handleLogout, className: "flex w-full items-center gap-3 rounded-lg bg-gradient-to-r from-red-50 to-rose-50 border border-red-200/60 px-4 py-2.5 text-sm font-medium text-red-600 transition-all hover:from-red-100 hover:to-rose-100 hover:shadow-sm", children: [_jsx("span", { className: "text-base", children: "\uD83D\uDEAA" }), isSidebarOpen && _jsx("span", { children: "\u0110\u0103ng xu\u1EA5t" })] })] })] }), _jsx("main", { className: "flex-1 overflow-y-auto bg-gradient-to-br from-gray-50/50 via-white to-gray-50/50 p-6", children: _jsx("div", { className: "max-w-7xl mx-auto", children: children }) })] }));
}
