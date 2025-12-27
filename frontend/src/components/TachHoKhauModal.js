import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { formatFromYMD } from "../utils/date";
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
export default function TachHoKhauModal({ isOpen, onClose, onSubmit, household, nhanKhauList, }) {
    const [selectedNhanKhauIds, setSelectedNhanKhauIds] = useState([]);
    const [chuHoMoiId, setChuHoMoiId] = useState(null);
    const [quanHeMap, setQuanHeMap] = useState({});
    const [diaChiMoi, setDiaChiMoi] = useState({
        tinhThanh: "",
        quanHuyen: "",
        phuongXa: "",
        duongPho: "",
        soNha: "",
        diaChiDayDu: "",
    });
    const [ngayHieuLuc, setNgayHieuLuc] = useState("");
    const [lyDo, setLyDo] = useState("");
    const [ghiChu, setGhiChu] = useState("");
    const [files, setFiles] = useState([]);
    const [camKet, setCamKet] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState({});
    useEffect(() => {
        if (isOpen) {
            // Reset form khi mở modal
            setSelectedNhanKhauIds([]);
            setChuHoMoiId(null);
            setQuanHeMap({});
            setDiaChiMoi({
                tinhThanh: "",
                quanHuyen: "",
                phuongXa: "",
                duongPho: "",
                soNha: "",
                diaChiDayDu: "",
            });
            setNgayHieuLuc("");
            setLyDo("");
            setGhiChu("");
            setFiles([]);
            setCamKet(false);
            setErrors({});
        }
    }, [isOpen]);
    // Filter nhân khẩu chỉ lấy những người active
    const availableNhanKhau = nhanKhauList.filter((nk) => nk.trangThai === "active");
    const handleToggleNhanKhau = (id) => {
        setSelectedNhanKhauIds((prev) => {
            const newIds = prev.includes(id)
                ? prev.filter((nid) => nid !== id)
                : [...prev, id];
            // Nếu chủ hộ mới không còn trong danh sách chọn, reset
            if (chuHoMoiId && !newIds.includes(chuHoMoiId)) {
                setChuHoMoiId(null);
            }
            // Reset quan hệ map cho những người bị bỏ chọn
            if (!newIds.includes(id)) {
                setQuanHeMap((prev) => {
                    const newMap = { ...prev };
                    delete newMap[id];
                    return newMap;
                });
            }
            return newIds;
        });
    };
    const handleFileChange = (e) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            // Giới hạn tổng dung lượng 10MB
            const maxSize = 10 * 1024 * 1024;
            const validFiles = newFiles.filter((file) => file.size <= maxSize);
            if (validFiles.length !== newFiles.length) {
                setErrors((prev) => ({
                    ...prev,
                    files: "Một số file vượt quá 10MB đã bị bỏ qua",
                }));
            }
            setFiles((prev) => [...prev, ...validFiles]);
        }
    };
    const handleRemoveFile = (index) => {
        setFiles((prev) => prev.filter((_, i) => i !== index));
    };
    const validateForm = () => {
        const newErrors = {};
        if (selectedNhanKhauIds.length === 0) {
            newErrors.selectedNhanKhau = "Vui lòng chọn ít nhất một nhân khẩu";
        }
        if (!chuHoMoiId) {
            newErrors.chuHoMoi = "Vui lòng chọn chủ hộ mới";
        }
        if (!diaChiMoi.tinhThanh || !diaChiMoi.quanHuyen || !diaChiMoi.phuongXa || !diaChiMoi.duongPho || !diaChiMoi.soNha) {
            newErrors.diaChi = "Vui lòng điền đầy đủ thông tin địa chỉ";
        }
        if (!ngayHieuLuc) {
            newErrors.ngayHieuLuc = "Vui lòng chọn ngày dự kiến hiệu lực";
        }
        if (!lyDo || lyDo.trim() === "") {
            newErrors.lyDo = "Vui lòng nhập lý do tách hộ";
        }
        if (!camKet) {
            newErrors.camKet = "Vui lòng xác nhận cam kết";
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) {
            return;
        }
        setIsSubmitting(true);
        try {
            const payload = {
                hoKhauCuId: household.id,
                nhanKhauIds: selectedNhanKhauIds,
                chuHoMoiId: chuHoMoiId,
                diaChiMoi,
                ngayHieuLuc,
                lyDo,
                ghiChu: ghiChu || undefined,
                quanHeMap,
                attachments: files.map((f) => ({
                    name: f.name,
                    size: f.size,
                    type: f.type,
                })),
            };
            await onSubmit({
                type: "TACH_HO_KHAU",
                payload,
            });
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
    const selectedNhanKhau = availableNhanKhau.filter((nk) => selectedNhanKhauIds.includes(nk.id));
    return (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto", onClick: onClose, children: _jsxs("div", { className: "w-full max-w-5xl rounded-2xl border border-gray-200 bg-white shadow-xl my-8 max-h-[90vh] overflow-y-auto", onClick: (e) => e.stopPropagation(), children: [_jsxs("div", { className: "sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4", children: [_jsx("h2", { className: "text-2xl font-bold text-gray-900", children: "Y\u00EAu c\u1EA7u t\u00E1ch h\u1ED9 kh\u1EA9u" }), _jsx("button", { onClick: onClose, className: "rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors", children: "\u2715" })] }), _jsxs("form", { onSubmit: handleSubmit, className: "p-6 space-y-6", children: [errors.submit && (_jsx("div", { className: "rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700", children: errors.submit })), _jsxs("div", { className: "rounded-lg border border-gray-200 bg-gray-50 p-4", children: [_jsx("h3", { className: "text-lg font-semibold text-gray-900 mb-4", children: "Th\u00F4ng tin h\u1ED9 kh\u1EA9u hi\u1EC7n t\u1EA1i" }), _jsxs("div", { className: "grid grid-cols-2 gap-4 mb-4", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-500 mb-1", children: "S\u1ED1 h\u1ED9 kh\u1EA9u" }), _jsx("p", { className: "text-base font-semibold text-gray-900", children: household.soHoKhau })] }), _jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-500 mb-1", children: "\u0110\u1ECBa ch\u1EC9 th\u01B0\u1EDDng tr\u00FA" }), _jsx("p", { className: "text-base font-semibold text-gray-900", children: household.diaChiDayDu || household.diaChi })] }), household.chuHo && (_jsxs("div", { className: "col-span-2", children: [_jsx("p", { className: "text-sm text-gray-500 mb-1", children: "Ch\u1EE7 h\u1ED9 hi\u1EC7n t\u1EA1i" }), _jsxs("p", { className: "text-base font-semibold text-gray-900", children: [household.chuHo.hoTen, " ", household.chuHo.cccd && `(${household.chuHo.cccd})`] })] }))] }), _jsxs("div", { className: "mt-4", children: [_jsx("p", { className: "text-sm font-medium text-gray-700 mb-2", children: "Danh s\u00E1ch nh\u00E2n kh\u1EA9u trong h\u1ED9" }), _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-gray-300 bg-gray-100", children: [_jsx("th", { className: "text-left py-2 px-3 font-semibold text-gray-700", children: "H\u1ECD v\u00E0 t\u00EAn" }), _jsx("th", { className: "text-left py-2 px-3 font-semibold text-gray-700", children: "CCCD" }), _jsx("th", { className: "text-left py-2 px-3 font-semibold text-gray-700", children: "Ng\u00E0y sinh" }), _jsx("th", { className: "text-left py-2 px-3 font-semibold text-gray-700", children: "Gi\u1EDBi t\u00EDnh" }), _jsx("th", { className: "text-left py-2 px-3 font-semibold text-gray-700", children: "Quan h\u1EC7" }), _jsx("th", { className: "text-left py-2 px-3 font-semibold text-gray-700", children: "Tr\u1EA1ng th\u00E1i" })] }) }), _jsx("tbody", { children: availableNhanKhau.map((nk) => (_jsxs("tr", { className: "border-b border-gray-200", children: [_jsx("td", { className: "py-2 px-3 text-gray-900", children: nk.hoTen }), _jsx("td", { className: "py-2 px-3 text-gray-600", children: nk.cccd || "-" }), _jsx("td", { className: "py-2 px-3 text-gray-600", children: nk.ngaySinh
                                                                        ? formatFromYMD(nk.ngaySinh)
                                                                        : "-" }), _jsx("td", { className: "py-2 px-3 text-gray-600", children: nk.gioiTinh ? gioiTinhLabels[nk.gioiTinh] : "-" }), _jsx("td", { className: "py-2 px-3 text-gray-600", children: quanHeLabels[nk.quanHe] || nk.quanHe }), _jsx("td", { className: "py-2 px-3", children: _jsx("span", { className: `px-2 py-1 rounded text-xs font-semibold ${nk.trangThai === "active"
                                                                            ? "bg-green-100 text-green-700"
                                                                            : "bg-gray-100 text-gray-700"}`, children: nk.trangThai === "active" ? "Thường trú" : nk.trangThai }) })] }, nk.id))) })] }) })] })] }), _jsxs("div", { className: "rounded-lg border border-gray-200 bg-white p-4", children: [_jsxs("h3", { className: "text-lg font-semibold text-gray-900 mb-4", children: ["Ch\u1ECDn nh\u00E2n kh\u1EA9u t\u00E1ch ra ", _jsx("span", { className: "text-red-500", children: "*" })] }), errors.selectedNhanKhau && (_jsx("p", { className: "text-sm text-red-600 mb-2", children: errors.selectedNhanKhau })), _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-gray-300 bg-gray-100", children: [_jsx("th", { className: "w-12 text-center py-2 px-3", children: _jsx("input", { type: "checkbox", checked: selectedNhanKhauIds.length === availableNhanKhau.length &&
                                                                    availableNhanKhau.length > 0, onChange: (e) => {
                                                                    if (e.target.checked) {
                                                                        setSelectedNhanKhauIds(availableNhanKhau.map((nk) => nk.id));
                                                                    }
                                                                    else {
                                                                        setSelectedNhanKhauIds([]);
                                                                        setChuHoMoiId(null);
                                                                        setQuanHeMap({});
                                                                    }
                                                                }, className: "rounded border-gray-300 text-blue-600 focus:ring-blue-500" }) }), _jsx("th", { className: "text-left py-2 px-3 font-semibold text-gray-700", children: "H\u1ECD v\u00E0 t\u00EAn" }), _jsx("th", { className: "text-left py-2 px-3 font-semibold text-gray-700", children: "CCCD" }), _jsx("th", { className: "text-left py-2 px-3 font-semibold text-gray-700", children: "Ng\u00E0y sinh" }), _jsx("th", { className: "text-left py-2 px-3 font-semibold text-gray-700", children: "Gi\u1EDBi t\u00EDnh" }), _jsx("th", { className: "text-left py-2 px-3 font-semibold text-gray-700", children: "Quan h\u1EC7" })] }) }), _jsx("tbody", { children: availableNhanKhau.map((nk) => (_jsxs("tr", { className: `border-b border-gray-200 hover:bg-gray-50 ${selectedNhanKhauIds.includes(nk.id) ? "bg-blue-50" : ""}`, children: [_jsx("td", { className: "text-center py-2 px-3", children: _jsx("input", { type: "checkbox", checked: selectedNhanKhauIds.includes(nk.id), onChange: () => handleToggleNhanKhau(nk.id), className: "rounded border-gray-300 text-blue-600 focus:ring-blue-500" }) }), _jsx("td", { className: "py-2 px-3 text-gray-900 font-medium", children: nk.hoTen }), _jsx("td", { className: "py-2 px-3 text-gray-600", children: nk.cccd || "-" }), _jsx("td", { className: "py-2 px-3 text-gray-600", children: nk.ngaySinh
                                                                ? formatFromYMD(nk.ngaySinh)
                                                                : "-" }), _jsx("td", { className: "py-2 px-3 text-gray-600", children: nk.gioiTinh ? gioiTinhLabels[nk.gioiTinh] : "-" }), _jsx("td", { className: "py-2 px-3 text-gray-600", children: quanHeLabels[nk.quanHe] || nk.quanHe })] }, nk.id))) })] }) })] }), selectedNhanKhauIds.length > 0 && (_jsxs("div", { className: "rounded-lg border border-gray-200 bg-white p-4", children: [_jsxs("h3", { className: "text-lg font-semibold text-gray-900 mb-4", children: ["Ch\u1ECDn ch\u1EE7 h\u1ED9 m\u1EDBi ", _jsx("span", { className: "text-red-500", children: "*" })] }), errors.chuHoMoi && (_jsx("p", { className: "text-sm text-red-600 mb-2", children: errors.chuHoMoi })), _jsxs("select", { value: chuHoMoiId || "", onChange: (e) => {
                                        const id = Number(e.target.value);
                                        setChuHoMoiId(id);
                                        // Set quan hệ cho chủ hộ mới là "chu_ho"
                                        setQuanHeMap((prev) => ({ ...prev, [id]: "chu_ho" }));
                                    }, className: "w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20", children: [_jsx("option", { value: "", children: "-- Ch\u1ECDn ch\u1EE7 h\u1ED9 m\u1EDBi --" }), selectedNhanKhau.map((nk) => (_jsxs("option", { value: nk.id, children: [nk.hoTen, " ", nk.cccd && `(${nk.cccd})`] }, nk.id)))] })] })), selectedNhanKhauIds.length > 0 && chuHoMoiId && (_jsxs("div", { className: "rounded-lg border border-gray-200 bg-white p-4", children: [_jsx("h3", { className: "text-lg font-semibold text-gray-900 mb-4", children: "Quan h\u1EC7 v\u1EDBi ch\u1EE7 h\u1ED9 m\u1EDBi" }), _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-gray-300 bg-gray-100", children: [_jsx("th", { className: "text-left py-2 px-3 font-semibold text-gray-700", children: "Nh\u00E2n kh\u1EA9u" }), _jsx("th", { className: "text-left py-2 px-3 font-semibold text-gray-700", children: "Quan h\u1EC7" })] }) }), _jsx("tbody", { children: selectedNhanKhau.map((nk) => {
                                                    if (nk.id === chuHoMoiId)
                                                        return null; // Chủ hộ đã set tự động
                                                    return (_jsxs("tr", { className: "border-b border-gray-200", children: [_jsx("td", { className: "py-2 px-3 text-gray-900", children: nk.hoTen }), _jsx("td", { className: "py-2 px-3", children: _jsxs("select", { value: quanHeMap[nk.id] || "", onChange: (e) => setQuanHeMap((prev) => ({
                                                                        ...prev,
                                                                        [nk.id]: e.target.value,
                                                                    })), className: "w-full rounded border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500", children: [_jsx("option", { value: "", children: "-- Ch\u1ECDn quan h\u1EC7 --" }), Object.entries(quanHeLabels).map(([key, label]) => (_jsx("option", { value: key, children: label }, key)))] }) })] }, nk.id));
                                                }) })] }) })] })), _jsxs("div", { className: "rounded-lg border border-gray-200 bg-white p-4", children: [_jsxs("h3", { className: "text-lg font-semibold text-gray-900 mb-4", children: ["Th\u00F4ng tin h\u1ED9 kh\u1EA9u m\u1EDBi ", _jsx("span", { className: "text-red-500", children: "*" })] }), errors.diaChi && (_jsx("p", { className: "text-sm text-red-600 mb-2", children: errors.diaChi })), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsxs("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: ["T\u1EC9nh/Th\u00E0nh ", _jsx("span", { className: "text-red-500", children: "*" })] }), _jsx("input", { type: "text", value: diaChiMoi.tinhThanh, onChange: (e) => setDiaChiMoi((prev) => ({ ...prev, tinhThanh: e.target.value })), className: "w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20", required: true })] }), _jsxs("div", { children: [_jsxs("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: ["Qu\u1EADn/Huy\u1EC7n ", _jsx("span", { className: "text-red-500", children: "*" })] }), _jsx("input", { type: "text", value: diaChiMoi.quanHuyen, onChange: (e) => setDiaChiMoi((prev) => ({ ...prev, quanHuyen: e.target.value })), className: "w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20", required: true })] }), _jsxs("div", { children: [_jsxs("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: ["Ph\u01B0\u1EDDng/X\u00E3 ", _jsx("span", { className: "text-red-500", children: "*" })] }), _jsx("input", { type: "text", value: diaChiMoi.phuongXa, onChange: (e) => setDiaChiMoi((prev) => ({ ...prev, phuongXa: e.target.value })), className: "w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20", required: true })] }), _jsxs("div", { children: [_jsxs("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: ["\u0110\u01B0\u1EDDng/Ph\u1ED1 ", _jsx("span", { className: "text-red-500", children: "*" })] }), _jsx("input", { type: "text", value: diaChiMoi.duongPho, onChange: (e) => setDiaChiMoi((prev) => ({ ...prev, duongPho: e.target.value })), className: "w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20", required: true })] }), _jsxs("div", { children: [_jsxs("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: ["S\u1ED1 nh\u00E0 ", _jsx("span", { className: "text-red-500", children: "*" })] }), _jsx("input", { type: "text", value: diaChiMoi.soNha, onChange: (e) => setDiaChiMoi((prev) => ({ ...prev, soNha: e.target.value })), className: "w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20", required: true })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "\u0110\u1ECBa ch\u1EC9 \u0111\u1EA7y \u0111\u1EE7" }), _jsx("input", { type: "text", value: diaChiMoi.diaChiDayDu, onChange: (e) => setDiaChiMoi((prev) => ({ ...prev, diaChiDayDu: e.target.value })), className: "w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20", placeholder: "S\u1ED1 nh\u00E0, \u0110\u01B0\u1EDDng, Ph\u01B0\u1EDDng/X\u00E3, Qu\u1EADn/Huy\u1EC7n, T\u1EC9nh/Th\u00E0nh" })] }), _jsxs("div", { className: "col-span-2", children: [_jsxs("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: ["Ng\u00E0y d\u1EF1 ki\u1EBFn hi\u1EC7u l\u1EF1c ", _jsx("span", { className: "text-red-500", children: "*" })] }), errors.ngayHieuLuc && (_jsx("p", { className: "text-sm text-red-600 mb-1", children: errors.ngayHieuLuc })), _jsx("input", { type: "date", value: ngayHieuLuc, onChange: (e) => setNgayHieuLuc(e.target.value), className: "w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20", required: true })] }), _jsxs("div", { className: "col-span-2", children: [_jsxs("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: ["L\u00FD do t\u00E1ch h\u1ED9 ", _jsx("span", { className: "text-red-500", children: "*" })] }), errors.lyDo && (_jsx("p", { className: "text-sm text-red-600 mb-1", children: errors.lyDo })), _jsx("textarea", { value: lyDo, onChange: (e) => setLyDo(e.target.value), rows: 4, className: "w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20", placeholder: "Nh\u1EADp l\u00FD do t\u00E1ch h\u1ED9 kh\u1EA9u...", required: true })] }), _jsxs("div", { className: "col-span-2", children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Ghi ch\u00FA th\u00EAm" }), _jsx("textarea", { value: ghiChu, onChange: (e) => setGhiChu(e.target.value), rows: 2, className: "w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20", placeholder: "Nh\u1EADp ghi ch\u00FA n\u1EBFu c\u00F3..." })] })] })] }), _jsxs("div", { className: "rounded-lg border border-gray-200 bg-white p-4", children: [_jsx("h3", { className: "text-lg font-semibold text-gray-900 mb-4", children: "\u0110\u00EDnh k\u00E8m gi\u1EA5y t\u1EDD (T\u00F9y ch\u1ECDn)" }), errors.files && (_jsx("p", { className: "text-sm text-yellow-600 mb-2", children: errors.files })), _jsx("input", { type: "file", multiple: true, accept: ".pdf,.jpg,.jpeg,.png", onChange: handleFileChange, className: "w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" }), _jsx("p", { className: "text-xs text-gray-500 mt-2", children: "Ch\u1EA5p nh\u1EADn file PDF, JPG, PNG. T\u1ED1i \u0111a 10MB m\u1ED7i file." }), files.length > 0 && (_jsx("div", { className: "mt-4 space-y-2", children: files.map((file, index) => (_jsxs("div", { className: "flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2", children: [_jsxs("div", { className: "flex-1", children: [_jsx("p", { className: "text-sm font-medium text-gray-900", children: file.name }), _jsxs("p", { className: "text-xs text-gray-500", children: [(file.size / 1024).toFixed(2), " KB"] })] }), _jsx("button", { type: "button", onClick: () => handleRemoveFile(index), className: "ml-3 rounded-lg p-1 text-red-600 hover:bg-red-50 transition-colors", children: "\u2715" })] }, index))) }))] }), _jsxs("div", { className: "rounded-lg border border-gray-200 bg-white p-4", children: [_jsxs("label", { className: "flex items-start gap-3 cursor-pointer", children: [_jsx("input", { type: "checkbox", checked: camKet, onChange: (e) => setCamKet(e.target.checked), className: "mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500" }), _jsxs("span", { className: "text-sm text-gray-700", children: ["T\u00F4i cam k\u1EBFt th\u00F4ng tin \u0111\u00FAng s\u1EF1 th\u1EADt ", _jsx("span", { className: "text-red-500", children: "*" })] })] }), errors.camKet && (_jsx("p", { className: "text-sm text-red-600 mt-2", children: errors.camKet }))] }), _jsxs("div", { className: "flex gap-3 pt-4 border-t border-gray-200", children: [_jsx("button", { type: "button", onClick: onClose, className: "flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors", disabled: isSubmitting, children: "H\u1EE7y" }), _jsx("button", { type: "submit", className: "flex-1 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-2.5 text-sm font-medium text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed", disabled: isSubmitting, children: isSubmitting ? "Đang gửi..." : "Gửi yêu cầu" })] })] })] }) }));
}
