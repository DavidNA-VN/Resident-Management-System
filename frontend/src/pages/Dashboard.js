import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
function StatCard({ title, value, change, icon, color }) {
    return (_jsx("div", { className: "group rounded-xl border border-gray-200/80 bg-white p-6 shadow-sm hover:shadow-lg hover:border-gray-300 transition-all duration-300 hover:-translate-y-1", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex-1", children: [_jsx("p", { className: "text-sm font-medium text-gray-500 uppercase tracking-wide", children: title }), _jsx("p", { className: "mt-3 text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent", children: value }), _jsxs("p", { className: `mt-2 text-xs font-semibold flex items-center gap-1 ${change.startsWith("+")
                                ? "text-emerald-600"
                                : "text-red-600"}`, children: [_jsx("span", { children: change.startsWith("+") ? "↑" : "↓" }), _jsxs("span", { children: [change, " so v\u1EDBi th\u00E1ng tr\u01B0\u1EDBc"] })] })] }), _jsx("div", { className: `flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${color} text-2xl shadow-md group-hover:scale-110 transition-transform duration-300`, children: icon })] }) }));
}
function ActivityItem({ type, description, time, user }) {
    const icons = {
        "Thêm mới": "➕",
        "Cập nhật": "✏️",
        "Biến động": "📝",
        "Phản ánh": "💬",
        "Duyệt": "✅"
    };
    const typeColors = {
        "Thêm mới": "bg-emerald-50 text-emerald-700 border-emerald-200",
        "Cập nhật": "bg-blue-50 text-blue-700 border-blue-200",
        "Biến động": "bg-amber-50 text-amber-700 border-amber-200",
        "Phản ánh": "bg-purple-50 text-purple-700 border-purple-200",
        "Duyệt": "bg-green-50 text-green-700 border-green-200"
    };
    return (_jsxs("div", { className: "flex items-start gap-4 rounded-lg border border-gray-200/80 bg-white p-4 hover:bg-gray-50/80 hover:border-gray-300 hover:shadow-sm transition-all duration-200", children: [_jsx("div", { className: "flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-100 to-cyan-100 text-lg shadow-sm", children: icons[type] || "📌" }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("p", { className: "text-sm font-medium text-gray-900 leading-snug", children: description }), _jsxs("p", { className: "mt-1.5 text-xs text-gray-500 flex items-center gap-2", children: [_jsx("span", { className: "font-medium", children: user }), _jsx("span", { children: "\u2022" }), _jsx("span", { children: time })] })] }), _jsx("span", { className: `rounded-full px-3 py-1 text-xs font-semibold border whitespace-nowrap ${typeColors[type] || "bg-gray-100 text-gray-700 border-gray-200"}`, children: type })] }));
}
export default function Dashboard() {
    const [stats, setStats] = useState({
        hoKhau: 1247,
        nhanKhau: 3842,
        bienDong: 23,
        phanAnh: 8
    });
    const [recentActivities] = useState([
        {
            id: 1,
            type: "Thêm mới",
            description: "Thêm hộ khẩu mới - Nguyễn Văn A",
            time: "2 giờ trước",
            user: "Nguyễn Thị B"
        },
        {
            id: 2,
            type: "Cập nhật",
            description: "Cập nhật thông tin nhân khẩu - Trần Văn C",
            time: "5 giờ trước",
            user: "Lê Văn D"
        },
        {
            id: 3,
            type: "Biến động",
            description: "Ghi nhận biến động: Chuyển đi - Phạm Thị E",
            time: "1 ngày trước",
            user: "Hoàng Văn F"
        },
        {
            id: 4,
            type: "Phản ánh",
            description: "Tiếp nhận phản ánh mới về cơ sở hạ tầng",
            time: "1 ngày trước",
            user: "Người dân"
        },
        {
            id: 5,
            type: "Duyệt",
            description: "Duyệt hồ sơ tạm trú - Võ Thị G",
            time: "2 ngày trước",
            user: "Tổ trưởng"
        }
    ]);
    useEffect(() => {
        // Simulate data loading
        const interval = setInterval(() => {
            setStats((prev) => ({
                ...prev,
                bienDong: prev.bienDong + Math.floor(Math.random() * 3)
            }));
        }, 5000);
        return () => clearInterval(interval);
    }, []);
    const storedUserInfo = localStorage.getItem("userInfo");
    let userDisplayName = "Người dùng";
    if (storedUserInfo) {
        try {
            const user = JSON.parse(storedUserInfo);
            userDisplayName = user.fullName || user.username || "Người dùng";
        }
        catch (e) {
            // Ignore
        }
    }
    return (_jsxs("div", { className: "space-y-6", children: [_jsx("div", { className: "rounded-xl border border-blue-200/60 bg-gradient-to-r from-blue-50 via-cyan-50 to-teal-50 p-6 shadow-sm backdrop-blur-sm", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsxs("h1", { className: "text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent", children: ["Ch\u00E0o m\u1EEBng tr\u1EDF l\u1EA1i, ", userDisplayName, "!"] }), _jsx("p", { className: "mt-2 text-gray-600", children: new Date().toLocaleDateString("vi-VN", { weekday: "long", year: "numeric", month: "long", day: "numeric" }) })] }), _jsx("div", { className: "hidden md:flex items-center gap-2 text-4xl", children: _jsx("span", { children: "\uD83D\uDC4B" }) })] }) }), _jsxs("div", { className: "grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4", children: [_jsx(StatCard, { title: "T\u1ED5ng s\u1ED1 h\u1ED9 kh\u1EA9u", value: stats.hoKhau.toLocaleString("vi-VN"), change: "+12", icon: "\uD83C\uDFE0", color: "from-blue-100 to-cyan-100" }), _jsx(StatCard, { title: "T\u1ED5ng s\u1ED1 nh\u00E2n kh\u1EA9u", value: stats.nhanKhau.toLocaleString("vi-VN"), change: "+45", icon: "\uD83D\uDC65", color: "from-emerald-100 to-teal-100" }), _jsx(StatCard, { title: "Bi\u1EBFn \u0111\u1ED9ng th\u00E1ng n\u00E0y", value: stats.bienDong, change: "-3", icon: "\uD83D\uDCDD", color: "from-indigo-100 to-purple-100" }), _jsx(StatCard, { title: "Ph\u1EA3n \u00E1nh ch\u01B0a x\u1EED l\u00FD", value: stats.phanAnh, change: "+2", icon: "\uD83D\uDCAC", color: "from-rose-100 to-pink-100" })] }), _jsxs("div", { className: "grid grid-cols-1 gap-6 lg:grid-cols-3", children: [_jsx("div", { className: "lg:col-span-2", children: _jsxs("div", { className: "rounded-xl border border-gray-200/80 bg-white p-6 shadow-sm", children: [_jsxs("div", { className: "mb-5 flex items-center justify-between border-b border-gray-200/60 pb-4", children: [_jsxs("h2", { className: "text-lg font-semibold text-gray-900 flex items-center gap-2", children: [_jsx("span", { children: "\uD83D\uDCCB" }), "Ho\u1EA1t \u0111\u1ED9ng g\u1EA7n \u0111\u00E2y"] }), _jsx("button", { className: "text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors", children: "Xem t\u1EA5t c\u1EA3 \u2192" })] }), _jsx("div", { className: "space-y-2.5", children: recentActivities.map((activity) => (_jsx(ActivityItem, { ...activity }, activity.id))) })] }) }), _jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "rounded-xl border border-gray-200/80 bg-white p-6 shadow-sm", children: [_jsxs("h3", { className: "mb-4 text-lg font-semibold text-gray-900 flex items-center gap-2", children: [_jsx("span", { children: "\u26A1" }), "Th\u1ED1ng k\u00EA nhanh"] }), _jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex items-center justify-between rounded-lg bg-gradient-to-r from-gray-50 to-gray-50/50 border border-gray-200/60 px-4 py-3 hover:from-blue-50 hover:to-cyan-50 hover:border-blue-200 transition-all cursor-pointer", children: [_jsx("span", { className: "text-sm font-medium text-gray-700", children: "T\u1EA1m tr\u00FA" }), _jsx("span", { className: "text-lg font-bold text-gray-900", children: "23" })] }), _jsxs("div", { className: "flex items-center justify-between rounded-lg bg-gradient-to-r from-gray-50 to-gray-50/50 border border-gray-200/60 px-4 py-3 hover:from-emerald-50 hover:to-teal-50 hover:border-emerald-200 transition-all cursor-pointer", children: [_jsx("span", { className: "text-sm font-medium text-gray-700", children: "T\u1EA1m v\u1EAFng" }), _jsx("span", { className: "text-lg font-bold text-gray-900", children: "15" })] }), _jsxs("div", { className: "flex items-center justify-between rounded-lg bg-gradient-to-r from-gray-50 to-gray-50/50 border border-gray-200/60 px-4 py-3 hover:from-amber-50 hover:to-yellow-50 hover:border-amber-200 transition-all cursor-pointer", children: [_jsx("span", { className: "text-sm font-medium text-gray-700", children: "Ch\u1EDD duy\u1EC7t" }), _jsx("span", { className: "text-lg font-bold text-yellow-600", children: "7" })] }), _jsxs("div", { className: "flex items-center justify-between rounded-lg bg-gradient-to-r from-gray-50 to-gray-50/50 border border-gray-200/60 px-4 py-3 hover:from-green-50 hover:to-emerald-50 hover:border-green-200 transition-all cursor-pointer", children: [_jsx("span", { className: "text-sm font-medium text-gray-700", children: "\u0110\u00E3 x\u1EED l\u00FD" }), _jsx("span", { className: "text-lg font-bold text-emerald-600", children: "142" })] })] })] }), _jsxs("div", { className: "rounded-xl border border-blue-200/60 bg-gradient-to-br from-blue-50/80 to-cyan-50/60 p-6 shadow-sm", children: [_jsxs("h3", { className: "mb-4 text-lg font-semibold text-gray-900 flex items-center gap-2", children: [_jsx("span", { children: "\uD83D\uDD14" }), "Th\u00F4ng b\u00E1o"] }), _jsxs("div", { className: "space-y-2.5", children: [_jsxs("div", { className: "rounded-lg bg-white/80 border border-gray-200/60 p-3.5 hover:bg-white hover:shadow-sm transition-all cursor-pointer", children: [_jsx("p", { className: "text-sm font-semibold text-gray-900", children: "C\u1EADp nh\u1EADt quy \u0111\u1ECBnh m\u1EDBi" }), _jsx("p", { className: "mt-1.5 text-xs text-gray-500", children: "2 ng\u00E0y tr\u01B0\u1EDBc" })] }), _jsxs("div", { className: "rounded-lg bg-white/80 border border-gray-200/60 p-3.5 hover:bg-white hover:shadow-sm transition-all cursor-pointer", children: [_jsx("p", { className: "text-sm font-semibold text-gray-900", children: "H\u1ECDp t\u1ED5 d\u00E2n ph\u1ED1" }), _jsx("p", { className: "mt-1.5 text-xs text-gray-500", children: "5 ng\u00E0y tr\u01B0\u1EDBc" })] })] })] })] })] })] }));
}
