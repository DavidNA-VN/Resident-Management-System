import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { apiService } from "../services/api";
export default function NhanKhau() {
    const [hoKhauList, setHoKhauList] = useState([]);
    const [selectedHoKhauId, setSelectedHoKhauId] = useState(null);
    const [nhanKhauList, setNhanKhauList] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [showActivateModal, setShowActivateModal] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [formData, setFormData] = useState({
        hoKhauId: "",
        hoTen: "",
        cccd: "",
        ngaySinh: "",
        gioiTinh: "",
        quanHe: "",
    });
    useEffect(() => {
        loadHoKhauList();
    }, []);
    useEffect(() => {
        if (selectedHoKhauId) {
            loadNhanKhauList(selectedHoKhauId);
        }
    }, [selectedHoKhauId]);
    const loadHoKhauList = async () => {
        setIsLoading(true);
        try {
            const response = await apiService.getHoKhauList();
            if (response.success) {
                setHoKhauList(response.data);
                if (response.data.length > 0 && !selectedHoKhauId) {
                    setSelectedHoKhauId(response.data[0].id);
                }
            }
        }
        catch (err) {
            setError(err.error?.message || "Lỗi khi tải danh sách hộ khẩu");
        }
        finally {
            setIsLoading(false);
        }
    };
    const loadNhanKhauList = async (hoKhauId) => {
        setIsLoading(true);
        try {
            const response = await apiService.getNhanKhauList(hoKhauId);
            if (response.success) {
                setNhanKhauList(response.data);
            }
        }
        catch (err) {
            setError(err.error?.message || "Lỗi khi tải danh sách nhân khẩu");
        }
        finally {
            setIsLoading(false);
        }
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        if (!formData.hoKhauId || !formData.hoTen || !formData.quanHe) {
            setError("Vui lòng điền đầy đủ thông tin bắt buộc");
            return;
        }
        setIsLoading(true);
        try {
            const response = await apiService.createNhanKhau({
                hoKhauId: Number(formData.hoKhauId),
                hoTen: formData.hoTen,
                cccd: formData.cccd || undefined,
                ngaySinh: formData.ngaySinh || undefined,
                gioiTinh: formData.gioiTinh === "nam" || formData.gioiTinh === "nu"
                    ? formData.gioiTinh
                    : undefined,
                quanHe: formData.quanHe,
            });
            if (response.success) {
                setSuccess("Tạo nhân khẩu thành công!");
                setShowCreateForm(false);
                setFormData({
                    hoKhauId: selectedHoKhauId?.toString() || "",
                    hoTen: "",
                    cccd: "",
                    ngaySinh: "",
                    gioiTinh: "",
                    quanHe: "",
                });
                if (selectedHoKhauId) {
                    loadNhanKhauList(selectedHoKhauId);
                }
            }
        }
        catch (err) {
            if (err.error?.code === "HOUSEHOLD_HEAD_EXISTS") {
                setError("Hộ khẩu này đã có chủ hộ, vui lòng chọn quan hệ khác.");
            }
            else {
                setError(err.error?.message || "Lỗi khi tạo nhân khẩu");
            }
        }
        finally {
            setIsLoading(false);
        }
    };
    const handleActivate = async (hoKhauId, chuHoId) => {
        setError(null);
        setSuccess(null);
        setIsLoading(true);
        try {
            const response = await apiService.activateHoKhau(hoKhauId, chuHoId);
            if (response.success) {
                setSuccess("Kích hoạt hộ khẩu thành công!");
                setShowActivateModal(false);
                loadHoKhauList();
                if (selectedHoKhauId === hoKhauId) {
                    loadNhanKhauList(hoKhauId);
                }
            }
        }
        catch (err) {
            setError(err.error?.message || "Lỗi khi kích hoạt hộ khẩu");
        }
        finally {
            setIsLoading(false);
        }
    };
    const selectedHoKhau = hoKhauList.find((hk) => hk.id === selectedHoKhauId);
    const chuHoCandidates = nhanKhauList.filter((nk) => nk.quanHe === "chu_ho");
    const quanHeOptions = [
        { value: "chu_ho", label: "Chủ hộ" },
        { value: "vo_chong", label: "Vợ/Chồng" },
        { value: "con", label: "Con" },
        { value: "cha_me", label: "Cha/Mẹ" },
        { value: "anh_chi_em", label: "Anh/Chị/Em" },
        { value: "ong_ba", label: "Ông/Bà" },
        { value: "chau", label: "Cháu" },
        { value: "khac", label: "Khác" },
    ];
    const hasChuHoInSelected = nhanKhauList.some((nk) => nk.quanHe === "chu_ho");
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent", children: "Qu\u1EA3n l\u00FD Nh\u00E2n kh\u1EA9u" }), _jsx("p", { className: "mt-1 text-gray-600", children: "Th\u00EAm nh\u00E2n kh\u1EA9u v\u00E0 k\u00EDch ho\u1EA1t h\u1ED9 kh\u1EA9u" })] }), _jsx("button", { onClick: () => {
                            setFormData({
                                ...formData,
                                hoKhauId: selectedHoKhauId?.toString() || "",
                            });
                            setShowCreateForm(true);
                        }, className: "rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 px-6 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg hover:-translate-y-0.5", children: "+ Th\u00EAm nh\u00E2n kh\u1EA9u" })] }), error && (_jsx("div", { className: "rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700", children: error })), success && (_jsx("div", { className: "rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-700", children: success })), _jsxs("div", { className: "rounded-xl border border-gray-200 bg-white p-4 shadow-sm", children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Ch\u1ECDn h\u1ED9 kh\u1EA9u" }), _jsx("select", { value: selectedHoKhauId || "", onChange: (e) => setSelectedHoKhauId(Number(e.target.value)), className: "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20", children: hoKhauList.map((hk) => (_jsxs("option", { value: hk.id, children: [hk.soHoKhau, " - ", hk.diaChi, " (", hk.trangThai === "active" ? "Đã kích hoạt" : "Chưa kích hoạt", ")"] }, hk.id))) })] }), selectedHoKhau &&
                selectedHoKhau.trangThai === "inactive" &&
                chuHoCandidates.length > 0 && (_jsx("div", { className: "rounded-xl border border-amber-200 bg-amber-50 p-4", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "font-semibold text-amber-900", children: "H\u1ED9 kh\u1EA9u ch\u01B0a \u0111\u01B0\u1EE3c k\u00EDch ho\u1EA1t" }), _jsxs("p", { className: "mt-1 text-sm text-amber-700", children: ["C\u00F3 ", chuHoCandidates.length, " ng\u01B0\u1EDDi c\u00F3 th\u1EC3 l\u00E0m ch\u1EE7 h\u1ED9. H\u00E3y k\u00EDch ho\u1EA1t h\u1ED9 kh\u1EA9u!"] })] }), _jsx("button", { onClick: () => setShowActivateModal(true), className: "rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600", children: "K\u00EDch ho\u1EA1t h\u1ED9 kh\u1EA9u" })] }) })), showCreateForm && (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4", children: _jsxs("div", { className: "w-full max-w-2xl rounded-xl border border-gray-200 bg-white p-6 shadow-2xl", children: [_jsxs("div", { className: "mb-6 flex items-center justify-between", children: [_jsx("h2", { className: "text-xl font-bold text-gray-900", children: "Th\u00EAm nh\u00E2n kh\u1EA9u m\u1EDBi" }), _jsx("button", { onClick: () => setShowCreateForm(false), className: "rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600", children: "\u2715" })] }), _jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [_jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["H\u1ED9 kh\u1EA9u ", _jsx("span", { className: "text-red-500", children: "*" }), _jsxs("select", { required: true, value: formData.hoKhauId, onChange: (e) => setFormData({ ...formData, hoKhauId: e.target.value }), className: "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20", children: [_jsx("option", { value: "", children: "Ch\u1ECDn h\u1ED9 kh\u1EA9u" }), hoKhauList.map((hk) => (_jsxs("option", { value: hk.id, children: [hk.soHoKhau, " - ", hk.diaChi] }, hk.id)))] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["H\u1ECD v\u00E0 t\u00EAn ", _jsx("span", { className: "text-red-500", children: "*" }), _jsx("input", { type: "text", required: true, value: formData.hoTen, onChange: (e) => setFormData({ ...formData, hoTen: e.target.value }), className: "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" })] }), _jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["CCCD/CMND", _jsx("input", { type: "text", value: formData.cccd, onChange: (e) => setFormData({ ...formData, cccd: e.target.value }), className: "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" })] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["Ng\u00E0y sinh", _jsx("input", { type: "date", value: formData.ngaySinh, onChange: (e) => setFormData({ ...formData, ngaySinh: e.target.value }), className: "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" })] }), _jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["Gi\u1EDBi t\u00EDnh", _jsxs("select", { value: formData.gioiTinh, onChange: (e) => setFormData({ ...formData, gioiTinh: e.target.value }), className: "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20", children: [_jsx("option", { value: "", children: "Ch\u1ECDn gi\u1EDBi t\u00EDnh" }), _jsx("option", { value: "nam", children: "Nam" }), _jsx("option", { value: "nu", children: "N\u1EEF" }), _jsx("option", { value: "khac", children: "Kh\u00E1c" })] })] })] }), _jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["Quan h\u1EC7 v\u1EDBi ch\u1EE7 h\u1ED9 ", _jsx("span", { className: "text-red-500", children: "*" }), _jsxs("select", { required: true, value: formData.quanHe, onChange: (e) => setFormData({ ...formData, quanHe: e.target.value }), className: "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20", children: [_jsx("option", { value: "", children: "Ch\u1ECDn quan h\u1EC7" }), quanHeOptions.map((opt) => (_jsxs("option", { value: opt.value, disabled: opt.value === "chu_ho" && hasChuHoInSelected, children: [opt.label, opt.value === "chu_ho" && hasChuHoInSelected
                                                            ? " (đã có chủ hộ)"
                                                            : ""] }, opt.value)))] }), hasChuHoInSelected && (_jsx("p", { className: "mt-1 text-xs text-red-600", children: "H\u1ED9 kh\u1EA9u n\u00E0y \u0111\u00E3 c\u00F3 ch\u1EE7 h\u1ED9, kh\u00F4ng th\u1EC3 ch\u1ECDn th\u00EAm ch\u1EE7 h\u1ED9." }))] }), _jsxs("div", { className: "flex gap-3 pt-4", children: [_jsx("button", { type: "submit", disabled: isLoading, className: "flex-1 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg disabled:opacity-50", children: isLoading ? "Đang tạo..." : "Thêm nhân khẩu" }), _jsx("button", { type: "button", onClick: () => setShowCreateForm(false), className: "rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50", children: "H\u1EE7y" })] })] })] }) })), showActivateModal && selectedHoKhau && (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4", children: _jsxs("div", { className: "w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-2xl", children: [_jsxs("div", { className: "mb-6 flex items-center justify-between", children: [_jsx("h2", { className: "text-xl font-bold text-gray-900", children: "K\u00EDch ho\u1EA1t h\u1ED9 kh\u1EA9u" }), _jsx("button", { onClick: () => setShowActivateModal(false), className: "rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600", children: "\u2715" })] }), _jsxs("p", { className: "mb-4 text-sm text-gray-600", children: ["Ch\u1ECDn ng\u01B0\u1EDDi l\u00E0m ch\u1EE7 h\u1ED9 cho h\u1ED9 kh\u1EA9u", " ", _jsx("strong", { children: selectedHoKhau.soHoKhau })] }), _jsx("div", { className: "space-y-2 mb-6", children: chuHoCandidates.map((nk) => (_jsxs("button", { onClick: () => handleActivate(selectedHoKhau.id, nk.id), disabled: isLoading, className: "w-full rounded-lg border border-gray-200 bg-white p-3 text-left hover:bg-gray-50 hover:border-blue-300 transition-all disabled:opacity-50", children: [_jsx("div", { className: "font-medium text-gray-900", children: nk.hoTen }), nk.cccd && (_jsxs("div", { className: "text-xs text-gray-500", children: ["CCCD: ", nk.cccd] }))] }, nk.id))) }), _jsx("button", { onClick: () => setShowActivateModal(false), className: "w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50", children: "H\u1EE7y" })] }) })), _jsxs("div", { className: "rounded-xl border border-gray-200 bg-white shadow-sm", children: [_jsx("div", { className: "border-b border-gray-200 p-4", children: _jsxs("h2", { className: "text-lg font-semibold text-gray-900", children: ["Danh s\u00E1ch nh\u00E2n kh\u1EA9u (", nhanKhauList.length, ")", selectedHoKhau && (_jsxs("span", { className: "ml-2 text-sm font-normal text-gray-500", children: ["- H\u1ED9 kh\u1EA9u: ", selectedHoKhau.soHoKhau] }))] }) }), isLoading && nhanKhauList.length === 0 ? (_jsx("div", { className: "p-8 text-center text-gray-500", children: "\u0110ang t\u1EA3i..." })) : !selectedHoKhauId ? (_jsx("div", { className: "p-8 text-center text-gray-500", children: "Vui l\u00F2ng ch\u1ECDn h\u1ED9 kh\u1EA9u \u0111\u1EC3 xem danh s\u00E1ch nh\u00E2n kh\u1EA9u" })) : nhanKhauList.length === 0 ? (_jsx("div", { className: "p-8 text-center text-gray-500", children: "Ch\u01B0a c\u00F3 nh\u00E2n kh\u1EA9u n\u00E0o trong h\u1ED9 kh\u1EA9u n\u00E0y. H\u00E3y th\u00EAm nh\u00E2n kh\u1EA9u m\u1EDBi!" })) : (_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full", children: [_jsx("thead", { className: "bg-gray-50", children: _jsxs("tr", { children: [_jsx("th", { className: "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700", children: "H\u1ECD t\u00EAn" }), _jsx("th", { className: "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700", children: "CCCD" }), _jsx("th", { className: "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700", children: "Quan h\u1EC7" }), _jsx("th", { className: "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700", children: "Gi\u1EDBi t\u00EDnh" }), _jsx("th", { className: "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700", children: "Ng\u00E0y sinh" })] }) }), _jsx("tbody", { className: "divide-y divide-gray-200", children: nhanKhauList.map((nk) => (_jsxs("tr", { className: `hover:bg-gray-50 ${nk.quanHe === "chu_ho" ? "bg-blue-50/50" : ""}`, children: [_jsxs("td", { className: "px-4 py-3 text-sm font-medium text-gray-900", children: [nk.hoTen, nk.quanHe === "chu_ho" && (_jsx("span", { className: "ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700", children: "Ch\u1EE7 h\u1ED9" }))] }), _jsx("td", { className: "px-4 py-3 text-sm text-gray-600", children: nk.cccd || "-" }), _jsx("td", { className: "px-4 py-3 text-sm text-gray-600", children: quanHeOptions.find((opt) => opt.value === nk.quanHe)
                                                    ?.label || nk.quanHe }), _jsx("td", { className: "px-4 py-3 text-sm text-gray-600", children: nk.gioiTinh === "nam"
                                                    ? "Nam"
                                                    : nk.gioiTinh === "nu"
                                                        ? "Nữ"
                                                        : nk.gioiTinh === "khac"
                                                            ? "Khác"
                                                            : "-" }), _jsx("td", { className: "px-4 py-3 text-sm text-gray-600", children: nk.ngaySinh
                                                    ? new Date(nk.ngaySinh).toLocaleDateString("vi-VN")
                                                    : "-" })] }, nk.id))) })] }) }))] })] }));
}
