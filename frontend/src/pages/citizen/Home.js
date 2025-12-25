import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { apiService } from "../../services/api";
const quanHeLabels = {
    chu_ho: "Chủ hộ",
    vo_chong: "Vợ/Chồng",
    con: "Con",
    cha_me: "Cha/Mẹ",
    anh_chi_em: "Anh/Chị/Em",
    ong_ba: "Ông/Bà",
    chau: "Cháu",
    khac: "Khác",
};
const gioiTinhLabels = {
    nam: "Nam",
    nu: "Nữ",
    khac: "Khác",
};
export default function CitizenHome() {
    const [householdData, setHouseholdData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    useEffect(() => {
        loadHousehold();
    }, []);
    const loadHousehold = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await apiService.getCitizenHousehold();
            if (response.success && response.data) {
                setHouseholdData(response.data);
            }
            else {
                setError("Không tìm thấy thông tin hộ khẩu");
            }
        }
        catch (err) {
            setError(err.error?.message || "Lỗi khi tải thông tin hộ khẩu");
        }
        finally {
            setIsLoading(false);
        }
    };
    if (isLoading) {
        return (_jsx("div", { className: "flex items-center justify-center min-h-[400px]", children: _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent" }), _jsx("p", { className: "mt-4 text-gray-600", children: "\u0110ang t\u1EA3i th\u00F4ng tin..." })] }) }));
    }
    if (error) {
        return (_jsxs("div", { className: "rounded-xl border border-red-200/80 bg-red-50/50 p-8 shadow-sm", children: [_jsx("h2", { className: "text-xl font-bold text-red-600 mb-2", children: "L\u1ED7i" }), _jsx("p", { className: "text-red-700", children: error })] }));
    }
    if (!householdData) {
        return (_jsxs("div", { className: "rounded-xl border border-gray-200/80 bg-white p-8 shadow-sm", children: [_jsx("h2", { className: "text-xl font-bold text-gray-900 mb-2", children: "Ch\u01B0a c\u00F3 th\u00F4ng tin" }), _jsx("p", { className: "text-gray-600", children: "B\u1EA1n ch\u01B0a \u0111\u01B0\u1EE3c li\u00EAn k\u1EBFt v\u1EDBi h\u1ED9 kh\u1EA9u n\u00E0o." })] }));
    }
    const { household, members, chuHo } = householdData;
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "rounded-xl border border-blue-200/60 bg-gradient-to-r from-blue-50 via-cyan-50 to-teal-50 p-6 shadow-sm backdrop-blur-sm", children: [_jsx("h1", { className: "text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent", children: "Th\u00F4ng tin h\u1ED9 kh\u1EA9u c\u1EE7a t\u00F4i" }), _jsx("p", { className: "mt-2 text-gray-600", children: new Date().toLocaleDateString("vi-VN", {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                        }) })] }), _jsxs("div", { className: "rounded-xl border border-gray-200/80 bg-white p-6 shadow-sm", children: [_jsxs("h2", { className: "text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2", children: [_jsx("span", { children: "\uD83C\uDFE0" }), "Th\u00F4ng tin h\u1ED9 kh\u1EA9u"] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-500 mb-1", children: "S\u1ED1 h\u1ED9 kh\u1EA9u" }), _jsx("p", { className: "text-base font-semibold text-gray-900", children: household.soHoKhau })] }), _jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-500 mb-1", children: "\u0110\u1ECBa ch\u1EC9" }), _jsx("p", { className: "text-base font-semibold text-gray-900", children: household.diaChiDayDu || household.diaChi })] }), household.ngayCap && (_jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-500 mb-1", children: "Ng\u00E0y c\u1EA5p" }), _jsx("p", { className: "text-base font-semibold text-gray-900", children: new Date(household.ngayCap).toLocaleDateString("vi-VN") })] })), _jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-500 mb-1", children: "Tr\u1EA1ng th\u00E1i" }), _jsx("span", { className: `inline-block px-3 py-1 rounded-full text-xs font-semibold ${household.trangThai === "active"
                                            ? "bg-green-100 text-green-700"
                                            : "bg-gray-100 text-gray-700"}`, children: household.trangThai === "active" ? "Đang hoạt động" : "Chưa kích hoạt" })] }), chuHo && (_jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-500 mb-1", children: "Ch\u1EE7 h\u1ED9" }), _jsx("p", { className: "text-base font-semibold text-gray-900", children: chuHo.hoTen })] }))] })] }), _jsxs("div", { className: "rounded-xl border border-gray-200/80 bg-white p-6 shadow-sm", children: [_jsxs("h2", { className: "text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2", children: [_jsx("span", { children: "\uD83D\uDC65" }), "Danh s\u00E1ch nh\u00E2n kh\u1EA9u (", members.length, ")"] }), members.length === 0 ? (_jsx("p", { className: "text-gray-500 text-center py-8", children: "Ch\u01B0a c\u00F3 nh\u00E2n kh\u1EA9u n\u00E0o trong h\u1ED9 kh\u1EA9u n\u00E0y." })) : (_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-gray-200", children: [_jsx("th", { className: "text-left py-3 px-4 text-sm font-semibold text-gray-700", children: "H\u1ECD t\u00EAn" }), _jsx("th", { className: "text-left py-3 px-4 text-sm font-semibold text-gray-700", children: "CCCD/CMND" }), _jsx("th", { className: "text-left py-3 px-4 text-sm font-semibold text-gray-700", children: "Ng\u00E0y sinh" }), _jsx("th", { className: "text-left py-3 px-4 text-sm font-semibold text-gray-700", children: "Gi\u1EDBi t\u00EDnh" }), _jsx("th", { className: "text-left py-3 px-4 text-sm font-semibold text-gray-700", children: "Quan h\u1EC7" }), _jsx("th", { className: "text-left py-3 px-4 text-sm font-semibold text-gray-700", children: "Tr\u1EA1ng th\u00E1i" })] }) }), _jsx("tbody", { children: members.map((member) => (_jsxs("tr", { className: "border-b border-gray-100 hover:bg-gray-50 transition-colors", children: [_jsx("td", { className: "py-3 px-4 text-sm text-gray-900 font-medium", children: member.hoTen }), _jsx("td", { className: "py-3 px-4 text-sm text-gray-600", children: member.cccd || "-" }), _jsx("td", { className: "py-3 px-4 text-sm text-gray-600", children: member.ngaySinh
                                                    ? new Date(member.ngaySinh).toLocaleDateString("vi-VN")
                                                    : "-" }), _jsx("td", { className: "py-3 px-4 text-sm text-gray-600", children: member.gioiTinh ? gioiTinhLabels[member.gioiTinh] : "-" }), _jsx("td", { className: "py-3 px-4 text-sm text-gray-600", children: quanHeLabels[member.quanHe] || member.quanHe }), _jsx("td", { className: "py-3 px-4", children: _jsx("span", { className: `inline-block px-2 py-1 rounded text-xs font-semibold ${member.trangThai === "active"
                                                        ? "bg-green-100 text-green-700"
                                                        : "bg-gray-100 text-gray-700"}`, children: member.trangThai === "active" ? "Thường trú" : member.trangThai }) })] }, member.id))) })] }) }))] })] }));
}
