import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
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
export default function SplitHouseholdRequestModal({ isOpen, onClose, onSubmit, household, nhanKhauList, isLoading = false, }) {
    const [selectedNhanKhauIds, setSelectedNhanKhauIds] = useState([]);
    const [newChuHoId, setNewChuHoId] = useState(null);
    const [newAddress, setNewAddress] = useState("");
    const [expectedDate, setExpectedDate] = useState("");
    const [reason, setReason] = useState("");
    const [note, setNote] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState({});
    // Reset form khi mở/đóng modal
    useEffect(() => {
        if (isOpen) {
            setSelectedNhanKhauIds([]);
            setNewChuHoId(null);
            setNewAddress("");
            setExpectedDate("");
            setReason("");
            setNote("");
            setErrors({});
        }
    }, [isOpen]);
    const handleToggleNhanKhau = (id) => {
        setSelectedNhanKhauIds((prev) => {
            const newIds = prev.includes(id)
                ? prev.filter((nid) => nid !== id)
                : [...prev, id];
            // Nếu chủ hộ mới không còn trong danh sách chọn, reset
            if (newChuHoId && !newIds.includes(newChuHoId)) {
                setNewChuHoId(null);
            }
            return newIds;
        });
    };
    const handleSelectAll = () => {
        if (selectedNhanKhauIds.length === nhanKhauList.length) {
            setSelectedNhanKhauIds([]);
            setNewChuHoId(null);
        }
        else {
            setSelectedNhanKhauIds(nhanKhauList.map((nk) => nk.id));
        }
    };
    const validateForm = () => {
        const newErrors = {};
        if (selectedNhanKhauIds.length === 0) {
            newErrors.selectedNhanKhau = "Vui lòng chọn ít nhất một nhân khẩu";
        }
        if (!newChuHoId) {
            newErrors.newChuHo = "Vui lòng chọn chủ hộ mới";
        }
        if (!newAddress || newAddress.trim() === "") {
            newErrors.newAddress = "Vui lòng nhập địa chỉ hộ khẩu mới";
        }
        if (!expectedDate) {
            newErrors.expectedDate = "Vui lòng chọn ngày dự kiến tách hộ";
        }
        if (!reason || reason.trim() === "") {
            newErrors.reason = "Vui lòng nhập lý do tách hộ";
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!household || !validateForm()) {
            return;
        }
        setIsSubmitting(true);
        try {
            await onSubmit({
                hoKhauId: household.id,
                selectedNhanKhauIds,
                newChuHoId: newChuHoId,
                newAddress: newAddress.trim(),
                expectedDate,
                reason: reason.trim(),
                note: note.trim() || undefined,
            });
            // Đóng modal sau khi submit thành công (sẽ được xử lý ở component cha)
            onClose();
        }
        catch (err) {
            setErrors({
                submit: err.error?.message || "Có lỗi xảy ra khi gửi yêu cầu",
            });
        }
        finally {
            setIsSubmitting(false);
        }
    };
    if (!isOpen)
        return null;
    const selectedNhanKhau = nhanKhauList.filter((nk) => selectedNhanKhauIds.includes(nk.id));
    return (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4", onClick: onClose, children: _jsxs("div", { className: "w-full max-w-3xl rounded-2xl border border-gray-200 bg-white shadow-xl", onClick: (e) => e.stopPropagation(), children: [_jsxs("div", { className: "flex items-center justify-between border-b border-gray-200 px-6 py-4", children: [_jsx("h2", { className: "text-2xl font-bold text-gray-900", children: "Y\u00EAu c\u1EA7u t\u00E1ch h\u1ED9 kh\u1EA9u" }), _jsx("button", { onClick: onClose, className: "rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors", children: "\u2715" })] }), _jsxs("form", { onSubmit: handleSubmit, className: "p-6 space-y-6 max-h-[80vh] overflow-y-auto", children: [errors.submit && (_jsx("div", { className: "rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700", children: errors.submit })), household && (_jsxs("div", { className: "rounded-lg border border-gray-200 bg-gray-50 p-4", children: [_jsx("h3", { className: "text-lg font-semibold text-gray-900 mb-4", children: "A. Th\u00F4ng tin h\u1ED9 kh\u1EA9u hi\u1EC7n t\u1EA1i" }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-500 mb-1", children: "S\u1ED1 h\u1ED9 kh\u1EA9u" }), _jsx("p", { className: "text-base font-semibold text-gray-900", children: household.soHoKhau })] }), _jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-500 mb-1", children: "\u0110\u1ECBa ch\u1EC9" }), _jsx("p", { className: "text-base font-semibold text-gray-900", children: household.diaChiDayDu || household.diaChi })] }), household.chuHo && (_jsxs("div", { className: "col-span-2", children: [_jsx("p", { className: "text-sm text-gray-500 mb-1", children: "Ch\u1EE7 h\u1ED9 hi\u1EC7n t\u1EA1i" }), _jsxs("p", { className: "text-base font-semibold text-gray-900", children: [household.chuHo.hoTen, " ", household.chuHo.cccd && `(${household.chuHo.cccd})`] })] }))] })] })), _jsxs("div", { className: "rounded-lg border border-gray-200 bg-white p-4", children: [_jsxs("h3", { className: "text-lg font-semibold text-gray-900 mb-4", children: ["B. Danh s\u00E1ch nh\u00E2n kh\u1EA9u xin t\u00E1ch ", _jsx("span", { className: "text-red-500", children: "*" })] }), errors.selectedNhanKhau && (_jsx("p", { className: "text-sm text-red-600 mb-2", children: errors.selectedNhanKhau })), isLoading ? (_jsxs("div", { className: "text-center py-4", children: [_jsx("div", { className: "inline-block h-6 w-6 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent" }), _jsx("p", { className: "mt-2 text-sm text-gray-600", children: "\u0110ang t\u1EA3i..." })] })) : nhanKhauList.length === 0 ? (_jsx("p", { className: "text-sm text-gray-500 text-center py-4", children: "Kh\u00F4ng c\u00F3 nh\u00E2n kh\u1EA9u n\u00E0o trong h\u1ED9 kh\u1EA9u n\u00E0y." })) : (_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-gray-300 bg-gray-100", children: [_jsx("th", { className: "w-12 text-center py-2 px-3", children: _jsx("input", { type: "checkbox", checked: selectedNhanKhauIds.length === nhanKhauList.length &&
                                                                    nhanKhauList.length > 0, onChange: handleSelectAll, className: "rounded border-gray-300 text-blue-600 focus:ring-blue-500" }) }), _jsx("th", { className: "text-left py-2 px-3 font-semibold text-gray-700", children: "H\u1ECD t\u00EAn" }), _jsx("th", { className: "text-left py-2 px-3 font-semibold text-gray-700", children: "CCCD/CMND" }), _jsx("th", { className: "text-left py-2 px-3 font-semibold text-gray-700", children: "Quan h\u1EC7 v\u1EDBi ch\u1EE7 h\u1ED9" })] }) }), _jsx("tbody", { children: nhanKhauList.map((nk) => (_jsxs("tr", { className: `border-b border-gray-200 hover:bg-gray-50 ${selectedNhanKhauIds.includes(nk.id) ? "bg-blue-50" : ""}`, children: [_jsx("td", { className: "text-center py-2 px-3", children: _jsx("input", { type: "checkbox", checked: selectedNhanKhauIds.includes(nk.id), onChange: () => handleToggleNhanKhau(nk.id), className: "rounded border-gray-300 text-blue-600 focus:ring-blue-500" }) }), _jsx("td", { className: "py-2 px-3 text-gray-900 font-medium", children: nk.hoTen }), _jsx("td", { className: "py-2 px-3 text-gray-600", children: nk.cccd || "-" }), _jsx("td", { className: "py-2 px-3 text-gray-600", children: quanHeLabels[nk.quanHe] || nk.quanHe })] }, nk.id))) })] }) }))] }), selectedNhanKhauIds.length > 0 && (_jsxs("div", { children: [_jsxs("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: ["C. Ch\u1ECDn ch\u1EE7 h\u1ED9 m\u1EDBi ", _jsx("span", { className: "text-red-500", children: "*" })] }), errors.newChuHo && (_jsx("p", { className: "text-sm text-red-600 mb-2", children: errors.newChuHo })), _jsxs("select", { value: newChuHoId || "", onChange: (e) => setNewChuHoId(Number(e.target.value)), className: "w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20", children: [_jsx("option", { value: "", children: "-- Ch\u1ECDn ch\u1EE7 h\u1ED9 m\u1EDBi --" }), selectedNhanKhau.map((nk) => (_jsxs("option", { value: nk.id, children: [nk.hoTen, " ", nk.cccd && `(${nk.cccd})`] }, nk.id)))] })] })), _jsxs("div", { className: "space-y-4", children: [_jsxs("h3", { className: "text-lg font-semibold text-gray-900", children: ["D. Th\u00F4ng tin h\u1ED9 kh\u1EA9u m\u1EDBi ", _jsx("span", { className: "text-red-500", children: "*" })] }), _jsxs("div", { children: [_jsxs("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: ["\u0110\u1ECBa ch\u1EC9 h\u1ED9 kh\u1EA9u m\u1EDBi ", _jsx("span", { className: "text-red-500", children: "*" })] }), errors.newAddress && (_jsx("p", { className: "text-sm text-red-600 mb-2", children: errors.newAddress })), _jsx("input", { type: "text", value: newAddress, onChange: (e) => setNewAddress(e.target.value), className: "w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20", placeholder: "Nh\u1EADp \u0111\u1ECBa ch\u1EC9 h\u1ED9 kh\u1EA9u m\u1EDBi..." })] }), _jsxs("div", { children: [_jsxs("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: ["Ng\u00E0y d\u1EF1 ki\u1EBFn t\u00E1ch h\u1ED9 ", _jsx("span", { className: "text-red-500", children: "*" })] }), errors.expectedDate && (_jsx("p", { className: "text-sm text-red-600 mb-2", children: errors.expectedDate })), _jsx("input", { type: "date", value: expectedDate, onChange: (e) => setExpectedDate(e.target.value), className: "w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Ghi ch\u00FA" }), _jsx("textarea", { value: note, onChange: (e) => setNote(e.target.value), rows: 2, className: "w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20", placeholder: "Nh\u1EADp ghi ch\u00FA n\u1EBFu c\u00F3..." })] })] }), _jsxs("div", { children: [_jsxs("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: ["E. L\u00FD do t\u00E1ch h\u1ED9 ", _jsx("span", { className: "text-red-500", children: "*" })] }), errors.reason && (_jsx("p", { className: "text-sm text-red-600 mb-2", children: errors.reason })), _jsx("textarea", { value: reason, onChange: (e) => setReason(e.target.value), rows: 4, className: "w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20", placeholder: "Nh\u1EADp l\u00FD do t\u00E1ch h\u1ED9..." })] }), _jsxs("div", { className: "flex gap-3 pt-4 border-t border-gray-200", children: [_jsx("button", { type: "button", onClick: onClose, className: "flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors", disabled: isSubmitting, children: "Hu\u1EF7" }), _jsx("button", { type: "submit", className: "flex-1 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-2.5 text-sm font-medium text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed", disabled: isSubmitting, children: isSubmitting ? "Đang gửi..." : "Gửi yêu cầu" })] })] })] }) }));
}
