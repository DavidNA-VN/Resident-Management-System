import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { apiService } from "../services/api";
export default function HoKhau() {
    const [hoKhauList, setHoKhauList] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [showViewModal, setShowViewModal] = useState(false);
    const [viewHoKhau, setViewHoKhau] = useState(null);
    const [nhanKhauTrongHo, setNhanKhauTrongHo] = useState([]);
    const [viewLoading, setViewLoading] = useState(false);
    const [showEditForm, setShowEditForm] = useState(false);
    const [editingHoKhauId, setEditingHoKhauId] = useState(null);
    const [selectedNhanKhau, setSelectedNhanKhau] = useState(null);
    const [showViewNhanKhau, setShowViewNhanKhau] = useState(false);
    const [showEditNhanKhau, setShowEditNhanKhau] = useState(false);
    const [editNhanKhauData, setEditNhanKhauData] = useState({
        hoTen: "",
        cccd: "",
        ngaySinh: "",
        gioiTinh: "",
        quanHe: "",
    });
    // Form state
    const [formData, setFormData] = useState({
        soHoKhau: "",
        diaChi: "",
        tinhThanh: "",
        quanHuyen: "",
        phuongXa: "",
        duongPho: "",
        soNha: "",
        ngayCap: "",
        ghiChu: "",
    });
    const [editData, setEditData] = useState({
        soHoKhau: "",
        diaChi: "",
        tinhThanh: "",
        quanHuyen: "",
        phuongXa: "",
        duongPho: "",
        soNha: "",
        ngayCap: "",
        ghiChu: "",
    });
    useEffect(() => {
        loadHoKhauList();
    }, []);
    const loadHoKhauList = async () => {
        setIsLoading(true);
        try {
            const response = await apiService.getHoKhauList();
            if (response.success) {
                setHoKhauList(response.data);
            }
        }
        catch (err) {
            setError(err.error?.message || "Lỗi khi tải danh sách hộ khẩu");
        }
        finally {
            setIsLoading(false);
        }
    };
    const openViewModal = async (hk) => {
        setViewHoKhau(hk);
        setShowViewModal(true);
        setViewLoading(true);
        try {
            const response = await apiService.getNhanKhauList(hk.id);
            if (response.success) {
                setNhanKhauTrongHo(response.data);
            }
        }
        catch (err) {
            setError(err.error?.message || "Lỗi khi tải danh sách nhân khẩu của hộ");
        }
        finally {
            setViewLoading(false);
        }
    };
    const openViewNhanKhau = (nk) => {
        setSelectedNhanKhau(nk);
        setShowViewNhanKhau(true);
    };
    const openEditNhanKhau = (nk) => {
        setSelectedNhanKhau(nk);
        setEditNhanKhauData({
            hoTen: nk.hoTen || "",
            cccd: nk.cccd || "",
            ngaySinh: nk.ngaySinh ? nk.ngaySinh.substring(0, 10) : "",
            gioiTinh: nk.gioiTinh || "",
            quanHe: nk.quanHe || "",
        });
        setShowEditNhanKhau(true);
    };
    const closeNhanKhauModals = () => {
        setShowViewNhanKhau(false);
        setShowEditNhanKhau(false);
        setSelectedNhanKhau(null);
    };
    const closeViewModal = () => {
        setShowViewModal(false);
        setViewHoKhau(null);
        setNhanKhauTrongHo([]);
    };
    const openEditForm = (hk) => {
        setEditingHoKhauId(hk.id);
        setEditData({
            soHoKhau: hk.soHoKhau || "",
            diaChi: hk.diaChi || "",
            tinhThanh: hk.tinhThanh || "",
            quanHuyen: hk.quanHuyen || "",
            phuongXa: hk.phuongXa || "",
            duongPho: hk.duongPho || "",
            soNha: hk.soNha || "",
            ngayCap: hk.ngayCap ? hk.ngayCap.substring(0, 10) : "",
            ghiChu: hk.ghiChu || "",
        });
        setShowEditForm(true);
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        if (!formData.soHoKhau || !formData.diaChi) {
            setError("Vui lòng điền số hộ khẩu và địa chỉ");
            return;
        }
        setIsLoading(true);
        try {
            const response = await apiService.createHoKhau({
                soHoKhau: formData.soHoKhau,
                diaChi: formData.diaChi,
                tinhThanh: formData.tinhThanh || undefined,
                quanHuyen: formData.quanHuyen || undefined,
                phuongXa: formData.phuongXa || undefined,
                duongPho: formData.duongPho || undefined,
                soNha: formData.soNha || undefined,
                ngayCap: formData.ngayCap || undefined,
                ghiChu: formData.ghiChu || undefined,
            });
            if (response.success) {
                setSuccess("Tạo hộ khẩu thành công!");
                setShowCreateForm(false);
                setFormData({
                    soHoKhau: "",
                    diaChi: "",
                    tinhThanh: "",
                    quanHuyen: "",
                    phuongXa: "",
                    duongPho: "",
                    soNha: "",
                    ngayCap: "",
                    ghiChu: "",
                });
                loadHoKhauList();
            }
        }
        catch (err) {
            setError(err.error?.message || "Lỗi khi tạo hộ khẩu");
        }
        finally {
            setIsLoading(false);
        }
    };
    const handleUpdate = async (e) => {
        e.preventDefault();
        if (!editingHoKhauId)
            return;
        setError(null);
        setSuccess(null);
        if (!editData.soHoKhau || !editData.diaChi) {
            setError("Vui lòng điền số hộ khẩu và địa chỉ");
            return;
        }
        setIsLoading(true);
        try {
            const response = await apiService.updateHoKhau(editingHoKhauId, {
                soHoKhau: editData.soHoKhau,
                diaChi: editData.diaChi,
                tinhThanh: editData.tinhThanh || undefined,
                quanHuyen: editData.quanHuyen || undefined,
                phuongXa: editData.phuongXa || undefined,
                duongPho: editData.duongPho || undefined,
                soNha: editData.soNha || undefined,
                ngayCap: editData.ngayCap || undefined,
                ghiChu: editData.ghiChu || undefined,
            });
            if (response.success) {
                setSuccess("Cập nhật hộ khẩu thành công!");
                setShowEditForm(false);
                setEditingHoKhauId(null);
                setHoKhauList((prev) => prev.map((item) => item.id === editingHoKhauId ? response.data : item));
                if (viewHoKhau?.id === editingHoKhauId) {
                    setViewHoKhau(response.data);
                }
                // đảm bảo đồng bộ nếu có thay đổi phía server
                loadHoKhauList();
            }
        }
        catch (err) {
            setError(err.error?.message || "Lỗi khi cập nhật hộ khẩu");
        }
        finally {
            setIsLoading(false);
        }
    };
    const getTrangThaiBadge = (trangThai) => {
        if (trangThai === "active") {
            return (_jsx("span", { className: "rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700", children: "\u0110\u00E3 k\u00EDch ho\u1EA1t" }));
        }
        return (_jsx("span", { className: "rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700", children: "Ch\u01B0a k\u00EDch ho\u1EA1t" }));
    };
    const relationLabels = {
        chu_ho: "Chủ hộ",
        vo_chong: "Vợ/Chồng",
        con: "Con",
        cha_me: "Cha/Mẹ",
        anh_chi_em: "Anh/Chị/Em",
        ong_ba: "Ông/Bà",
        chau: "Cháu",
        khac: "Khác",
    };
    const relationOptions = [
        { value: "chu_ho", label: "Chủ hộ" },
        { value: "vo_chong", label: "Vợ/Chồng" },
        { value: "con", label: "Con" },
        { value: "cha_me", label: "Cha/Mẹ" },
        { value: "anh_chi_em", label: "Anh/Chị/Em" },
        { value: "ong_ba", label: "Ông/Bà" },
        { value: "chau", label: "Cháu" },
        { value: "khac", label: "Khác" },
    ];
    const genderOptions = [
        { value: "nam", label: "Nam" },
        { value: "nu", label: "Nữ" },
        { value: "khac", label: "Khác" },
    ];
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent", children: "Qu\u1EA3n l\u00FD H\u1ED9 kh\u1EA9u" }), _jsx("p", { className: "mt-1 text-gray-600", children: "T\u1EA1o v\u00E0 qu\u1EA3n l\u00FD th\u00F4ng tin h\u1ED9 kh\u1EA9u" })] }), _jsx("button", { onClick: () => setShowCreateForm(true), className: "rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 px-6 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg hover:-translate-y-0.5", children: "+ T\u1EA1o h\u1ED9 kh\u1EA9u m\u1EDBi" })] }), error && (_jsx("div", { className: "rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700", children: error })), createPortal(_jsxs(_Fragment, { children: [showViewNhanKhau && selectedNhanKhau && (_jsx("div", { className: "fixed inset-0 z-[1200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4", children: _jsxs("div", { className: "w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-2xl", children: [_jsxs("div", { className: "mb-4 flex items-center justify-between", children: [_jsx("h2", { className: "text-xl font-bold text-gray-900", children: "Th\u00F4ng tin nh\u00E2n kh\u1EA9u" }), _jsx("button", { onClick: closeNhanKhauModals, className: "rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600", "aria-label": "\u0110\u00F3ng xem nh\u00E2n kh\u1EA9u", children: "\u2715" })] }), _jsxs("div", { className: "space-y-2 text-sm text-gray-700", children: [_jsxs("div", { children: [_jsx("p", { className: "font-semibold", children: "H\u1ECD t\u00EAn" }), _jsx("p", { children: selectedNhanKhau.hoTen })] }), _jsxs("div", { children: [_jsx("p", { className: "font-semibold", children: "CCCD" }), _jsx("p", { children: selectedNhanKhau.cccd || "-" })] }), _jsxs("div", { children: [_jsx("p", { className: "font-semibold", children: "Quan h\u1EC7" }), _jsx("p", { children: relationLabels[selectedNhanKhau.quanHe] ||
                                                        selectedNhanKhau.quanHe })] }), _jsxs("div", { children: [_jsx("p", { className: "font-semibold", children: "Gi\u1EDBi t\u00EDnh" }), _jsx("p", { children: selectedNhanKhau.gioiTinh === "nam"
                                                        ? "Nam"
                                                        : selectedNhanKhau.gioiTinh === "nu"
                                                            ? "Nữ"
                                                            : selectedNhanKhau.gioiTinh === "khac"
                                                                ? "Khác"
                                                                : "-" })] }), _jsxs("div", { children: [_jsx("p", { className: "font-semibold", children: "Ng\u00E0y sinh" }), _jsx("p", { children: selectedNhanKhau.ngaySinh
                                                        ? new Date(selectedNhanKhau.ngaySinh).toLocaleDateString("vi-VN")
                                                        : "-" })] })] })] }) })), showEditNhanKhau && selectedNhanKhau && (_jsx("div", { className: "fixed inset-0 z-[1200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4", children: _jsxs("div", { className: "w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-2xl", children: [_jsxs("div", { className: "mb-4 flex items-center justify-between", children: [_jsx("h2", { className: "text-xl font-bold text-gray-900", children: "Ch\u1EC9nh s\u1EEDa nh\u00E2n kh\u1EA9u" }), _jsx("button", { onClick: closeNhanKhauModals, className: "rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600", "aria-label": "\u0110\u00F3ng ch\u1EC9nh s\u1EEDa nh\u00E2n kh\u1EA9u", children: "\u2715" })] }), _jsxs("form", { onSubmit: async (e) => {
                                        e.preventDefault();
                                        if (!selectedNhanKhau)
                                            return;
                                        setError(null);
                                        setSuccess(null);
                                        setIsLoading(true);
                                        try {
                                            const response = await apiService.updateNhanKhau(selectedNhanKhau.id, {
                                                hoTen: editNhanKhauData.hoTen,
                                                cccd: editNhanKhauData.cccd || undefined,
                                                ngaySinh: editNhanKhauData.ngaySinh || undefined,
                                                gioiTinh: editNhanKhauData.gioiTinh || undefined,
                                                quanHe: editNhanKhauData.quanHe || undefined,
                                            });
                                            if (response.success) {
                                                setSuccess("Cập nhật nhân khẩu thành công!");
                                                setShowEditNhanKhau(false);
                                                setSelectedNhanKhau(response.data);
                                                setNhanKhauTrongHo((prev) => prev.map((item) => item.id === response.data.id ? response.data : item));
                                            }
                                        }
                                        catch (err) {
                                            if (err.error?.code === "HOUSEHOLD_HEAD_EXISTS") {
                                                setError("Hộ khẩu này đã có chủ hộ, không thể chọn thêm.");
                                            }
                                            else {
                                                setError(err.error?.message || "Lỗi khi cập nhật nhân khẩu");
                                            }
                                        }
                                        finally {
                                            setIsLoading(false);
                                        }
                                    }, className: "space-y-3 text-sm", children: [_jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["H\u1ECD t\u00EAn", _jsx("input", { type: "text", required: true, value: editNhanKhauData.hoTen, onChange: (e) => setEditNhanKhauData({
                                                        ...editNhanKhauData,
                                                        hoTen: e.target.value,
                                                    }), className: "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" })] }), _jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["CCCD", _jsx("input", { type: "text", value: editNhanKhauData.cccd, onChange: (e) => setEditNhanKhauData({
                                                        ...editNhanKhauData,
                                                        cccd: e.target.value,
                                                    }), className: "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["Ng\u00E0y sinh", _jsx("input", { type: "date", value: editNhanKhauData.ngaySinh, onChange: (e) => setEditNhanKhauData({
                                                                ...editNhanKhauData,
                                                                ngaySinh: e.target.value,
                                                            }), className: "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" })] }), _jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["Gi\u1EDBi t\u00EDnh", _jsxs("select", { value: editNhanKhauData.gioiTinh, onChange: (e) => setEditNhanKhauData({
                                                                ...editNhanKhauData,
                                                                gioiTinh: e.target.value,
                                                            }), className: "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20", children: [_jsx("option", { value: "", children: "Ch\u1ECDn" }), genderOptions.map((opt) => (_jsx("option", { value: opt.value, children: opt.label }, opt.value)))] })] })] }), _jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["Quan h\u1EC7", _jsxs("select", { required: true, value: editNhanKhauData.quanHe, onChange: (e) => setEditNhanKhauData({
                                                        ...editNhanKhauData,
                                                        quanHe: e.target.value,
                                                    }), className: "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20", children: [_jsx("option", { value: "", children: "Ch\u1ECDn quan h\u1EC7" }), relationOptions.map((opt) => (_jsx("option", { value: opt.value, children: opt.label }, opt.value)))] })] }), _jsxs("div", { className: "flex gap-2 pt-2", children: [_jsx("button", { type: "submit", disabled: isLoading, className: "flex-1 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-2 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg disabled:opacity-50", children: isLoading ? "Đang lưu..." : "Lưu" }), _jsx("button", { type: "button", onClick: closeNhanKhauModals, className: "rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50", children: "H\u1EE7y" })] })] })] }) }))] }), document.body), success && (_jsx("div", { className: "rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-700", children: success })), showCreateForm && (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4", children: _jsxs("div", { className: "w-full max-w-2xl rounded-xl border border-gray-200 bg-white p-6 shadow-2xl", children: [_jsxs("div", { className: "mb-6 flex items-center justify-between", children: [_jsx("h2", { className: "text-xl font-bold text-gray-900", children: "T\u1EA1o h\u1ED9 kh\u1EA9u m\u1EDBi" }), _jsx("button", { onClick: () => setShowCreateForm(false), className: "rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600", children: "\u2715" })] }), _jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [_jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["S\u1ED1 h\u1ED9 kh\u1EA9u ", _jsx("span", { className: "text-red-500", children: "*" }), _jsx("input", { type: "text", required: true, value: formData.soHoKhau, onChange: (e) => setFormData({ ...formData, soHoKhau: e.target.value }), className: "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20", placeholder: "VD: HK001" })] }), _jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["Ng\u00E0y c\u1EA5p", _jsx("input", { type: "date", value: formData.ngayCap, onChange: (e) => setFormData({ ...formData, ngayCap: e.target.value }), className: "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" })] })] }), _jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["\u0110\u1ECBa ch\u1EC9 ", _jsx("span", { className: "text-red-500", children: "*" }), _jsx("input", { type: "text", required: true, value: formData.diaChi, onChange: (e) => setFormData({ ...formData, diaChi: e.target.value }), className: "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20", placeholder: "\u0110\u1ECBa ch\u1EC9 \u0111\u1EA7y \u0111\u1EE7" })] }), _jsxs("div", { className: "grid grid-cols-3 gap-4", children: [_jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["T\u1EC9nh/Th\u00E0nh ph\u1ED1", _jsx("input", { type: "text", value: formData.tinhThanh, onChange: (e) => setFormData({ ...formData, tinhThanh: e.target.value }), className: "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" })] }), _jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["Qu\u1EADn/Huy\u1EC7n", _jsx("input", { type: "text", value: formData.quanHuyen, onChange: (e) => setFormData({ ...formData, quanHuyen: e.target.value }), className: "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" })] }), _jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["Ph\u01B0\u1EDDng/X\u00E3", _jsx("input", { type: "text", value: formData.phuongXa, onChange: (e) => setFormData({ ...formData, phuongXa: e.target.value }), className: "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" })] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["\u0110\u01B0\u1EDDng/Ph\u1ED1", _jsx("input", { type: "text", value: formData.duongPho, onChange: (e) => setFormData({ ...formData, duongPho: e.target.value }), className: "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" })] }), _jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["S\u1ED1 nh\u00E0", _jsx("input", { type: "text", value: formData.soNha, onChange: (e) => setFormData({ ...formData, soNha: e.target.value }), className: "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" })] })] }), _jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["Ghi ch\u00FA", _jsx("textarea", { value: formData.ghiChu, onChange: (e) => setFormData({ ...formData, ghiChu: e.target.value }), rows: 3, className: "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20", placeholder: "Ghi ch\u00FA th\u00EAm..." })] }), _jsxs("div", { className: "flex gap-3 pt-4", children: [_jsx("button", { type: "submit", disabled: isLoading, className: "flex-1 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg disabled:opacity-50", children: isLoading ? "Đang tạo..." : "Tạo hộ khẩu" }), _jsx("button", { type: "button", onClick: () => setShowCreateForm(false), className: "rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50", children: "H\u1EE7y" })] })] })] }) })), showViewModal && viewHoKhau && (_jsx("div", { className: "fixed inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4", children: _jsxs("div", { className: "w-full max-w-3xl rounded-xl border border-gray-200 bg-white p-6 shadow-2xl", children: [_jsxs("div", { className: "mb-4 flex items-center justify-between", children: [_jsxs("div", { children: [_jsxs("h2", { className: "text-xl font-bold text-gray-900", children: ["Chi ti\u1EBFt h\u1ED9 kh\u1EA9u ", viewHoKhau.soHoKhau] }), _jsx("p", { className: "text-sm text-gray-600", children: viewHoKhau.diaChi })] }), _jsx("button", { onClick: closeViewModal, className: "rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600", "aria-label": "\u0110\u00F3ng xem h\u1ED9 kh\u1EA9u", children: "\u2715" })] }), _jsxs("div", { className: "grid grid-cols-2 gap-4 mb-4 text-sm text-gray-700", children: [_jsxs("div", { children: [_jsx("p", { className: "font-semibold", children: "S\u1ED1 h\u1ED9 kh\u1EA9u" }), _jsx("p", { children: viewHoKhau.soHoKhau })] }), _jsxs("div", { children: [_jsx("p", { className: "font-semibold", children: "Tr\u1EA1ng th\u00E1i" }), _jsx("div", { className: "mt-1", children: getTrangThaiBadge(viewHoKhau.trangThai) })] }), _jsxs("div", { children: [_jsx("p", { className: "font-semibold", children: "T\u1EC9nh/Th\u00E0nh" }), _jsx("p", { children: viewHoKhau.tinhThanh || "-" })] }), _jsxs("div", { children: [_jsx("p", { className: "font-semibold", children: "Qu\u1EADn/Huy\u1EC7n" }), _jsx("p", { children: viewHoKhau.quanHuyen || "-" })] }), _jsxs("div", { children: [_jsx("p", { className: "font-semibold", children: "Ph\u01B0\u1EDDng/X\u00E3" }), _jsx("p", { children: viewHoKhau.phuongXa || "-" })] }), _jsxs("div", { children: [_jsx("p", { className: "font-semibold", children: "\u0110\u01B0\u1EDDng/Ph\u1ED1" }), _jsx("p", { children: viewHoKhau.duongPho || "-" })] }), _jsxs("div", { children: [_jsx("p", { className: "font-semibold", children: "S\u1ED1 nh\u00E0" }), _jsx("p", { children: viewHoKhau.soNha || "-" })] }), _jsxs("div", { children: [_jsx("p", { className: "font-semibold", children: "Ng\u00E0y c\u1EA5p" }), _jsx("p", { children: viewHoKhau.ngayCap
                                                ? new Date(viewHoKhau.ngayCap).toLocaleDateString("vi-VN")
                                                : "-" })] }), _jsxs("div", { className: "col-span-2", children: [_jsx("p", { className: "font-semibold", children: "Ghi ch\u00FA" }), _jsx("p", { children: viewHoKhau.ghiChu || "-" })] })] }), _jsxs("div", { className: "rounded-lg border border-gray-200", children: [_jsx("div", { className: "flex items-center justify-between border-b border-gray-200 px-4 py-3", children: _jsxs("h3", { className: "text-sm font-semibold text-gray-900", children: ["Nh\u00E2n kh\u1EA9u trong h\u1ED9 (", nhanKhauTrongHo.length, ")"] }) }), viewLoading ? (_jsx("div", { className: "p-4 text-sm text-gray-600", children: "\u0110ang t\u1EA3i..." })) : nhanKhauTrongHo.length === 0 ? (_jsx("div", { className: "p-4 text-sm text-gray-600", children: "Ch\u01B0a c\u00F3 nh\u00E2n kh\u1EA9u n\u00E0o." })) : (_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { className: "bg-gray-50", children: _jsxs("tr", { children: [_jsx("th", { className: "px-4 py-2 text-left font-semibold text-gray-700", children: "H\u1ECD t\u00EAn" }), _jsx("th", { className: "px-4 py-2 text-left font-semibold text-gray-700", children: "CCCD" }), _jsx("th", { className: "px-4 py-2 text-left font-semibold text-gray-700", children: "Quan h\u1EC7" }), _jsx("th", { className: "px-4 py-2 text-left font-semibold text-gray-700", children: "Thao t\u00E1c" })] }) }), _jsx("tbody", { className: "divide-y divide-gray-200", children: [...nhanKhauTrongHo]
                                                    .sort((a, b) => {
                                                    if (a.quanHe === "chu_ho" && b.quanHe !== "chu_ho")
                                                        return -1;
                                                    if (b.quanHe === "chu_ho" && a.quanHe !== "chu_ho")
                                                        return 1;
                                                    return (a.hoTen || "").localeCompare(b.hoTen || "");
                                                })
                                                    .map((nk) => (_jsxs("tr", { children: [_jsx("td", { className: "px-4 py-2 text-gray-900", children: nk.hoTen }), _jsx("td", { className: "px-4 py-2 text-gray-600", children: nk.cccd || "-" }), _jsx("td", { className: "px-4 py-2 text-gray-600", children: relationLabels[nk.quanHe] || nk.quanHe }), _jsx("td", { className: "px-4 py-2 text-gray-600", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("button", { onClick: () => openViewNhanKhau(nk), className: "rounded-lg border border-gray-200 bg-white px-3 py-1 text-xs text-gray-700 hover:bg-gray-50 shadow-sm", children: "\uD83D\uDC41 Xem" }), _jsx("button", { onClick: () => openEditNhanKhau(nk), className: "rounded-lg border border-blue-200 bg-blue-50 px-3 py-1 text-xs text-blue-700 hover:bg-blue-100 shadow-sm", children: "\u270F\uFE0F S\u1EEDa" })] }) })] }, nk.id))) })] }) }))] })] }) })), showEditForm && editingHoKhauId && (_jsx("div", { className: "fixed inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4", children: _jsxs("div", { className: "w-full max-w-2xl rounded-xl border border-gray-200 bg-white p-6 shadow-2xl", children: [_jsxs("div", { className: "mb-6 flex items-center justify-between", children: [_jsx("h2", { className: "text-xl font-bold text-gray-900", children: "Ch\u1EC9nh s\u1EEDa h\u1ED9 kh\u1EA9u" }), _jsx("button", { onClick: () => {
                                        setShowEditForm(false);
                                        setEditingHoKhauId(null);
                                    }, className: "rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600", "aria-label": "\u0110\u00F3ng ch\u1EC9nh s\u1EEDa", children: "\u2715" })] }), _jsxs("form", { onSubmit: handleUpdate, className: "space-y-4", children: [_jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["S\u1ED1 h\u1ED9 kh\u1EA9u ", _jsx("span", { className: "text-red-500", children: "*" }), _jsx("input", { type: "text", required: true, value: editData.soHoKhau, onChange: (e) => setEditData({ ...editData, soHoKhau: e.target.value }), className: "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" })] }), _jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["Ng\u00E0y c\u1EA5p", _jsx("input", { type: "date", value: editData.ngayCap, onChange: (e) => setEditData({ ...editData, ngayCap: e.target.value }), className: "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" })] })] }), _jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["\u0110\u1ECBa ch\u1EC9 ", _jsx("span", { className: "text-red-500", children: "*" }), _jsx("input", { type: "text", required: true, value: editData.diaChi, onChange: (e) => setEditData({ ...editData, diaChi: e.target.value }), className: "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" })] }), _jsxs("div", { className: "grid grid-cols-3 gap-4", children: [_jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["T\u1EC9nh/Th\u00E0nh ph\u1ED1", _jsx("input", { type: "text", value: editData.tinhThanh, onChange: (e) => setEditData({ ...editData, tinhThanh: e.target.value }), className: "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" })] }), _jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["Qu\u1EADn/Huy\u1EC7n", _jsx("input", { type: "text", value: editData.quanHuyen, onChange: (e) => setEditData({ ...editData, quanHuyen: e.target.value }), className: "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" })] }), _jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["Ph\u01B0\u1EDDng/X\u00E3", _jsx("input", { type: "text", value: editData.phuongXa, onChange: (e) => setEditData({ ...editData, phuongXa: e.target.value }), className: "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" })] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["\u0110\u01B0\u1EDDng/Ph\u1ED1", _jsx("input", { type: "text", value: editData.duongPho, onChange: (e) => setEditData({ ...editData, duongPho: e.target.value }), className: "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" })] }), _jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["S\u1ED1 nh\u00E0", _jsx("input", { type: "text", value: editData.soNha, onChange: (e) => setEditData({ ...editData, soNha: e.target.value }), className: "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" })] })] }), _jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["Ghi ch\u00FA", _jsx("textarea", { value: editData.ghiChu, onChange: (e) => setEditData({ ...editData, ghiChu: e.target.value }), rows: 3, className: "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20", placeholder: "Ghi ch\u00FA th\u00EAm..." })] }), _jsxs("div", { className: "flex gap-3 pt-4", children: [_jsx("button", { type: "submit", disabled: isLoading, className: "flex-1 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg disabled:opacity-50", children: isLoading ? "Đang lưu..." : "Lưu thay đổi" }), _jsx("button", { type: "button", onClick: () => {
                                                setShowEditForm(false);
                                                setEditingHoKhauId(null);
                                            }, className: "rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50", children: "H\u1EE7y" })] })] })] }) })), _jsxs("div", { className: "rounded-xl border border-gray-200 bg-white shadow-sm", children: [_jsx("div", { className: "border-b border-gray-200 p-4", children: _jsxs("h2", { className: "text-lg font-semibold text-gray-900", children: ["Danh s\u00E1ch h\u1ED9 kh\u1EA9u (", hoKhauList.length, ")"] }) }), isLoading && hoKhauList.length === 0 ? (_jsx("div", { className: "p-8 text-center text-gray-500", children: "\u0110ang t\u1EA3i..." })) : hoKhauList.length === 0 ? (_jsx("div", { className: "p-8 text-center text-gray-500", children: "Ch\u01B0a c\u00F3 h\u1ED9 kh\u1EA9u n\u00E0o. H\u00E3y t\u1EA1o h\u1ED9 kh\u1EA9u m\u1EDBi!" })) : (_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full", children: [_jsx("thead", { className: "bg-gray-50", children: _jsxs("tr", { children: [_jsx("th", { className: "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700", children: "S\u1ED1 h\u1ED9 kh\u1EA9u" }), _jsx("th", { className: "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700", children: "\u0110\u1ECBa ch\u1EC9" }), _jsx("th", { className: "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700", children: "Tr\u1EA1ng th\u00E1i" }), _jsx("th", { className: "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700", children: "Ng\u00E0y t\u1EA1o" }), _jsx("th", { className: "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700", children: "Thao t\u00E1c" })] }) }), _jsx("tbody", { className: "divide-y divide-gray-200", children: hoKhauList.map((hk) => (_jsxs("tr", { className: "hover:bg-gray-50", children: [_jsx("td", { className: "px-4 py-3 text-sm font-medium text-gray-900", children: hk.soHoKhau }), _jsx("td", { className: "px-4 py-3 text-sm text-gray-600", children: hk.diaChi }), _jsx("td", { className: "px-4 py-3", children: getTrangThaiBadge(hk.trangThai) }), _jsx("td", { className: "px-4 py-3 text-sm text-gray-500", children: new Date(hk.createdAt).toLocaleDateString("vi-VN") }), _jsx("td", { className: "px-4 py-3", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("button", { onClick: () => openViewModal(hk), className: "rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 shadow-sm", "aria-label": "Xem nh\u00E2n kh\u1EA9u", children: "\uD83D\uDC41 Xem" }), _jsx("button", { onClick: () => openEditForm(hk), className: "rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm text-blue-700 hover:bg-blue-100 shadow-sm", "aria-label": "Ch\u1EC9nh s\u1EEDa h\u1ED9 kh\u1EA9u", children: "\u270F\uFE0F S\u1EEDa" })] }) })] }, hk.id))) })] }) }))] })] }));
}
