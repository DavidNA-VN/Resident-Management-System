import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { apiService } from "../../services/api";
import { formatFromYMD } from "../../utils/date";
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
    const [userInfo, setUserInfo] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    useEffect(() => {
        loadData();
    }, []);
    const loadData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            // Lấy thông tin user hiện tại
            const userResponse = await apiService.getMe();
            if (userResponse.success) {
                setUserInfo(userResponse.data);
            }
            // Nếu user đã linked thì load household
            if (userResponse.data?.linked) {
                const response = await apiService.getCitizenHousehold();
                if (response.success && response.data) {
                    setHouseholdData(response.data);
                }
                else if (response.error?.code !== "NOT_LINKED") {
                    // Chỉ set error nếu không phải lỗi NOT_LINKED (đã được handle ở UI)
                    setError(response.error?.message || "Không tìm thấy thông tin hộ khẩu");
                }
            }
        }
        catch (err) {
            setError(err.error?.message || "Lỗi khi tải dữ liệu");
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
    // Nếu user chưa linked (chưa có hồ sơ nhân khẩu)
    if (userInfo && userInfo.linked === false) {
        return (_jsx("div", { className: "max-w-2xl mx-auto", children: _jsxs("div", { className: "rounded-xl border border-blue-200/80 bg-blue-50/50 p-8 shadow-sm", children: [_jsxs("div", { className: "text-center mb-6", children: [_jsx("div", { className: "inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4", children: _jsx("span", { className: "text-3xl", children: "\uD83D\uDC64" }) }), _jsx("h2", { className: "text-2xl font-bold text-blue-600 mb-2", children: "T\u00E0i kho\u1EA3n ch\u01B0a li\u00EAn k\u1EBFt h\u1ED3 s\u01A1 nh\u00E2n kh\u1EA9u" }), _jsx("p", { className: "text-blue-700", children: userInfo.message || "Bạn đã đăng ký thành công nhưng chưa có hồ sơ nhân khẩu trong hệ thống." })] }), _jsxs("div", { className: "bg-white/70 rounded-lg p-6 mb-6", children: [_jsx("h3", { className: "font-semibold text-gray-800 mb-3", children: "\u0110\u1EC3 s\u1EED d\u1EE5ng \u0111\u1EA7y \u0111\u1EE7 ch\u1EE9c n\u0103ng:" }), _jsxs("div", { className: "space-y-3 text-sm text-gray-700", children: [_jsxs("div", { className: "flex items-start gap-3", children: [_jsx("span", { className: "text-blue-500 mt-1", children: "1." }), _jsxs("div", { children: [_jsx("p", { className: "font-medium", children: "T\u1EA1o y\u00EAu c\u1EA7u th\u00EAm nh\u00E2n kh\u1EA9u" }), _jsx("p", { className: "text-gray-600", children: "Ch\u1ECDn h\u1ED9 kh\u1EA9u b\u1EA1n mu\u1ED1n gia nh\u1EADp v\u00E0 \u0111i\u1EC1n th\u00F4ng tin c\u00E1 nh\u00E2n" })] })] }), _jsxs("div", { className: "flex items-start gap-3", children: [_jsx("span", { className: "text-blue-500 mt-1", children: "2." }), _jsxs("div", { children: [_jsx("p", { className: "font-medium", children: "Ch\u1EDD t\u1ED5 tr\u01B0\u1EDFng duy\u1EC7t" }), _jsx("p", { className: "text-gray-600", children: "T\u1ED5 tr\u01B0\u1EDFng s\u1EBD ki\u1EC3m tra v\u00E0 th\u00EAm b\u1EA1n v\u00E0o h\u1EC7 th\u1ED1ng" })] })] }), _jsxs("div", { className: "flex items-start gap-3", children: [_jsx("span", { className: "text-blue-500 mt-1", children: "3." }), _jsxs("div", { children: [_jsx("p", { className: "font-medium", children: "\u0110\u0103ng nh\u1EADp l\u1EA1i" }), _jsx("p", { className: "text-gray-600", children: "Sau khi \u0111\u01B0\u1EE3c duy\u1EC7t, t\u00E0i kho\u1EA3n s\u1EBD t\u1EF1 \u0111\u1ED9ng li\u00EAn k\u1EBFt" })] })] })] })] }), _jsx("div", { className: "text-center", children: _jsxs("a", { href: "/citizen/yeu-cau", className: "inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 font-semibold", children: [_jsx("span", { className: "mr-2", children: "\uD83D\uDCDD" }), "T\u1EA1o y\u00EAu c\u1EA7u ngay"] }) })] }) }));
    }
    if (!householdData) {
        return (_jsxs("div", { className: "rounded-xl border border-yellow-200/80 bg-yellow-50/50 p-8 shadow-sm", children: [_jsx("h2", { className: "text-xl font-bold text-yellow-600 mb-2", children: "\u0110ang t\u1EA3i..." }), _jsx("p", { className: "text-yellow-700", children: "\u0110ang t\u1EA3i th\u00F4ng tin h\u1ED9 kh\u1EA9u c\u1EE7a b\u1EA1n..." })] }));
    }
    const { household, members, chuHo } = householdData;
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "rounded-xl border border-blue-200/60 bg-gradient-to-r from-blue-50 via-cyan-50 to-teal-50 p-6 shadow-sm backdrop-blur-sm", children: [_jsx("h1", { className: "text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent", children: "Th\u00F4ng tin h\u1ED9 kh\u1EA9u c\u1EE7a t\u00F4i" }), _jsx("p", { className: "mt-2 text-gray-600", children: new Date().toLocaleDateString("vi-VN", {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                        }) })] }), _jsxs("div", { className: "rounded-xl border border-gray-200/80 bg-white p-6 shadow-sm", children: [_jsxs("h2", { className: "text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2", children: [_jsx("span", { children: "\uD83C\uDFE0" }), "Th\u00F4ng tin h\u1ED9 kh\u1EA9u"] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-500 mb-1", children: "S\u1ED1 h\u1ED9 kh\u1EA9u" }), _jsx("p", { className: "text-base font-semibold text-gray-900", children: household.soHoKhau })] }), _jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-500 mb-1", children: "\u0110\u1ECBa ch\u1EC9" }), _jsx("p", { className: "text-base font-semibold text-gray-900", children: household.diaChiDayDu || household.diaChi })] }), household.ngayCap && (_jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-500 mb-1", children: "Ng\u00E0y c\u1EA5p" }), _jsx("p", { className: "text-base font-semibold text-gray-900", children: formatFromYMD(household.ngayCap) })] })), _jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-500 mb-1", children: "Tr\u1EA1ng th\u00E1i" }), _jsx("span", { className: `inline-block px-3 py-1 rounded-full text-xs font-semibold ${household.trangThai === "active"
                                            ? "bg-green-100 text-green-700"
                                            : "bg-gray-100 text-gray-700"}`, children: household.trangThai === "active" ? "Đang hoạt động" : "Chưa kích hoạt" })] }), chuHo && (_jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-500 mb-1", children: "Ch\u1EE7 h\u1ED9" }), _jsx("p", { className: "text-base font-semibold text-gray-900", children: chuHo.hoTen })] }))] })] }), _jsxs("div", { className: "rounded-xl border border-gray-200/80 bg-white p-6 shadow-sm", children: [_jsxs("h2", { className: "text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2", children: [_jsx("span", { children: "\uD83D\uDC65" }), "Danh s\u00E1ch nh\u00E2n kh\u1EA9u (", members.length, ")"] }), members.length === 0 ? (_jsx("p", { className: "text-gray-500 text-center py-8", children: "Ch\u01B0a c\u00F3 nh\u00E2n kh\u1EA9u n\u00E0o trong h\u1ED9 kh\u1EA9u n\u00E0y." })) : (_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-gray-200", children: [_jsx("th", { className: "text-left py-3 px-4 text-sm font-semibold text-gray-700", children: "H\u1ECD t\u00EAn" }), _jsx("th", { className: "text-left py-3 px-4 text-sm font-semibold text-gray-700", children: "CCCD/CMND" }), _jsx("th", { className: "text-left py-3 px-4 text-sm font-semibold text-gray-700", children: "Ng\u00E0y sinh" }), _jsx("th", { className: "text-left py-3 px-4 text-sm font-semibold text-gray-700", children: "Gi\u1EDBi t\u00EDnh" }), _jsx("th", { className: "text-left py-3 px-4 text-sm font-semibold text-gray-700", children: "Quan h\u1EC7" }), _jsx("th", { className: "text-left py-3 px-4 text-sm font-semibold text-gray-700", children: "Tr\u1EA1ng th\u00E1i" })] }) }), _jsx("tbody", { children: members.map((member) => (_jsxs("tr", { className: "border-b border-gray-100 hover:bg-gray-50 transition-colors", children: [_jsx("td", { className: "py-3 px-4 text-sm text-gray-900 font-medium", children: member.hoTen }), _jsx("td", { className: "py-3 px-4 text-sm text-gray-600", children: member.cccd || "-" }), _jsx("td", { className: "py-3 px-4 text-sm text-gray-600", children: member.ngaySinh
                                                    ? formatFromYMD(member.ngaySinh)
                                                    : "-" }), _jsx("td", { className: "py-3 px-4 text-sm text-gray-600", children: member.gioiTinh ? gioiTinhLabels[member.gioiTinh] : "-" }), _jsx("td", { className: "py-3 px-4 text-sm text-gray-600", children: quanHeLabels[member.quanHe] || member.quanHe }), _jsx("td", { className: "py-3 px-4", children: _jsx("span", { className: `inline-block px-2 py-1 rounded text-xs font-semibold ${member.trangThai === "active"
                                                        ? "bg-green-100 text-green-700"
                                                        : "bg-gray-100 text-gray-700"}`, children: member.trangThai === "active" ? "Thường trú" : member.trangThai }) })] }, member.id))) })] }) }))] })] }));
}
