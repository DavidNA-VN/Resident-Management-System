import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiService } from "../services/api";
import { formatDateForInput, formatFromYMD } from "../utils/date";
const quanHeLabel = {
    chu_ho: "Chủ hộ",
    vo_chong: "Vợ/Chồng",
    con: "Con",
    cha_me: "Cha/Mẹ",
    anh_chi_em: "Anh/Chị/Em",
    ong_ba: "Ông/Bà",
    chau: "Cháu",
    khac: "Khác",
};
export default function HoKhau() {
    const navigate = useNavigate();
    const [hoKhauList, setHoKhauList] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [viewingHoKhau, setViewingHoKhau] = useState(null);
    const [editingHoKhau, setEditingHoKhau] = useState(null);
    const [viewNhanKhau, setViewNhanKhau] = useState([]);
    const [viewLoading, setViewLoading] = useState(false);
    const [viewError, setViewError] = useState(null);
    const emptyMemberFull = {
        id: 0,
        hoTen: "",
        hoKhauId: undefined,
        quanHe: "",
        biDanh: "",
        cccd: "",
        ngayCapCCCD: "",
        noiCapCCCD: "",
        ngaySinh: "",
        gioiTinh: "",
        noiSinh: "",
        nguyenQuan: "",
        danToc: "",
        tonGiao: "",
        quocTich: "Việt Nam",
        ngayDangKyThuongTru: "",
        diaChiThuongTruTruoc: "",
        ngheNghiep: "",
        noiLamViec: "",
    };
    const [memberViewForm, setMemberViewForm] = useState({
        ...emptyMemberFull,
    });
    const [viewingNhanKhauDetail, setViewingNhanKhauDetail] = useState(null);
    const [showMemberViewModal, setShowMemberViewModal] = useState(false);
    const [memberViewLoading, setMemberViewLoading] = useState(false);
    const [memberViewError, setMemberViewError] = useState(null);
    // Read-only mode for the member view modal. When true, fields are disabled and no save button is shown.
    const [memberViewReadOnly, setMemberViewReadOnly] = useState(true);
    // Current user (from localStorage) to decide if edit action should be shown
    const currentUser = localStorage.getItem("userInfo")
        ? JSON.parse(localStorage.getItem("userInfo") || "null")
        : null;
    const canEditMember = currentUser?.role !== "nguoi_dan";
    const [formData, setFormData] = useState({
        soHoKhau: "",
        diaChi: "",
        diaChiDayDu: "",
        tinhThanh: "",
        quanHuyen: "",
        phuongXa: "",
        duongPho: "",
        soNha: "",
        ngayCap: "",
        ghiChu: "",
    });
    const [editFormData, setEditFormData] = useState({
        soHoKhau: "",
        diaChi: "",
        diaChiDayDu: "",
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
    const loadMembers = async (hoKhauId) => {
        const membersRes = await apiService.getNhanKhauList(hoKhauId);
        if (membersRes.success) {
            const members = [...membersRes.data];
            members.sort((a, b) => {
                if (a.quanHe === "chu_ho" && b.quanHe !== "chu_ho")
                    return -1;
                if (a.quanHe !== "chu_ho" && b.quanHe === "chu_ho")
                    return 1;
                return a.hoTen.localeCompare(b.hoTen, "vi");
            });
            setViewNhanKhau(members);
        }
    };
    const openViewHousehold = async (hoKhau) => {
        setViewingHoKhau(hoKhau);
        setShowViewModal(true);
        setViewLoading(true);
        setViewError(null);
        try {
            const detailRes = await apiService.getHoKhauById(hoKhau.id);
            if (detailRes.success) {
                setViewingHoKhau(detailRes.data);
            }
            await loadMembers(hoKhau.id);
        }
        catch (err) {
            setViewError(err.error?.message || "Lỗi khi tải thông tin hộ khẩu");
        }
        finally {
            setViewLoading(false);
        }
    };
    const closeViewHousehold = () => {
        setShowViewModal(false);
        setViewingHoKhau(null);
        setViewNhanKhau([]);
        setViewError(null);
        setShowMemberViewModal(false);
        setViewingNhanKhauDetail(null);
        setMemberViewError(null);
    };
    const navigateToNhanKhauPage = (hoKhauId) => {
        // Navigate to nhan-khau page with householdId as query parameter
        navigate(`/nhan-khau?householdId=${hoKhauId}`);
    };
    const openViewNhanKhau = async (id) => {
        // Always set to read-only when viewing from Ho Khau page
        setMemberViewReadOnly(true);
        setMemberViewError(null);
        setMemberViewLoading(true);
        setShowMemberViewModal(true);
        try {
            const res = await apiService.getNhanKhauById(id);
            if (res.success) {
                const nk = res.data;
                setViewingNhanKhauDetail(nk);
                setMemberViewForm({
                    ...emptyMemberFull,
                    ...nk,
                    hoKhauId: nk.hoKhauId,
                    ngayCapCCCD: formatDateForInput(nk.ngayCapCCCD),
                    ngayDangKyThuongTru: formatDateForInput(nk.ngayDangKyThuongTru),
                    ngaySinh: formatDateForInput(nk.ngaySinh),
                });
            }
            else {
                setMemberViewError("Không lấy được thông tin nhân khẩu");
            }
        }
        catch (err) {
            setMemberViewError(err.error?.message || "Lỗi khi tải thông tin nhân khẩu");
        }
        finally {
            setMemberViewLoading(false);
        }
    };
    const openEditHousehold = async (hoKhau) => {
        setEditingHoKhau(hoKhau);
        setShowEditModal(true);
        setError(null);
        try {
            const response = await apiService.getHoKhauById(hoKhau.id);
            if (response.success) {
                const data = response.data;
                setEditFormData({
                    soHoKhau: data.soHoKhau || "",
                    diaChi: data.diaChi || "",
                    diaChiDayDu: data.diaChiDayDu || "",
                    tinhThanh: data.tinhThanh || "",
                    quanHuyen: data.quanHuyen || "",
                    phuongXa: data.phuongXa || "",
                    duongPho: data.duongPho || "",
                    soNha: data.soNha || "",
                    ngayCap: formatDateForInput(data.ngayCap),
                    ghiChu: data.ghiChu || "",
                });
            }
        }
        catch (err) {
            setError(err.error?.message || "Lỗi khi tải thông tin hộ khẩu");
        }
    };
    const handleUpdate = async (e) => {
        e.preventDefault();
        if (!editingHoKhau)
            return;
        if (!editFormData.soHoKhau || !editFormData.diaChi) {
            setError("Vui lòng điền số hộ khẩu và địa chỉ");
            return;
        }
        setIsLoading(true);
        setError(null);
        setSuccess(null);
        try {
            const payload = {
                soHoKhau: editFormData.soHoKhau,
                diaChi: editFormData.diaChi,
                diaChiDayDu: editFormData.diaChiDayDu || undefined,
                tinhThanh: editFormData.tinhThanh || undefined,
                quanHuyen: editFormData.quanHuyen || undefined,
                phuongXa: editFormData.phuongXa || undefined,
                duongPho: editFormData.duongPho || undefined,
                soNha: editFormData.soNha || undefined,
                ngayCap: editFormData.ngayCap || undefined,
                ghiChu: editFormData.ghiChu || undefined,
            };
            const response = await apiService.updateHoKhau(editingHoKhau.id, payload);
            if (response.success) {
                // Lấy lại bản ghi mới nhất từ server để chắc chắn đồng bộ DB
                const refreshed = await apiService.getHoKhauById(editingHoKhau.id);
                const updated = refreshed.success ? refreshed.data : response.data;
                setHoKhauList((prev) => prev.map((item) => item.id === updated.id ? { ...item, ...updated } : item));
                setSuccess("Cập nhật hộ khẩu thành công!");
                setShowEditModal(false);
                setEditingHoKhau(null);
                // Tải lại danh sách để đồng bộ với server
                await loadHoKhauList();
            }
            else {
                setError("Không thể cập nhật hộ khẩu");
            }
        }
        catch (err) {
            setError(err.error?.message || "Lỗi khi cập nhật hộ khẩu");
        }
        finally {
            setIsLoading(false);
        }
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
                diaChiDayDu: formData.diaChiDayDu || undefined,
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
                    diaChiDayDu: "",
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
    const getTrangThaiBadge = (trangThai) => {
        if (trangThai === "active") {
            return (_jsx("span", { className: "rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700", children: "\u0110\u00E3 k\u00EDch ho\u1EA1t" }));
        }
        return (_jsx("span", { className: "rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700", children: "Ch\u01B0a k\u00EDch ho\u1EA1t" }));
    };
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent", children: "Qu\u1EA3n l\u00FD H\u1ED9 kh\u1EA9u" }), _jsx("p", { className: "mt-1 text-gray-600", children: "T\u1EA1o v\u00E0 qu\u1EA3n l\u00FD th\u00F4ng tin h\u1ED9 kh\u1EA9u" })] }), _jsx("button", { onClick: () => setShowCreateForm(true), className: "rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 px-6 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg hover:-translate-y-0.5", children: "+ T\u1EA1o h\u1ED9 kh\u1EA9u m\u1EDBi" })] }), error && (_jsx("div", { className: "rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700", children: error })), showMemberViewModal && viewingNhanKhauDetail && (_jsx("div", { className: "fixed inset-0 z-[130] flex min-h-screen w-screen items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto", children: _jsxs("div", { className: "w-full max-w-2xl rounded-xl border border-gray-200 bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto overflow-hidden modal-scroll", children: [_jsxs("div", { className: "mb-4 flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h3", { className: "text-lg font-semibold text-gray-900", children: "Xem nh\u00E2n kh\u1EA9u" }), _jsxs("p", { className: "text-sm text-gray-500", children: ["H\u1ED9 kh\u1EA9u: ", viewingNhanKhauDetail.hoKhauId] })] }), _jsx("button", { onClick: () => {
                                        setShowMemberViewModal(false);
                                        setViewingNhanKhauDetail(null);
                                        setMemberViewError(null);
                                    }, className: "rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600", children: "\u2715" })] }), memberViewError && (_jsx("div", { className: "mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700", children: memberViewError })), memberViewLoading ? (_jsx("div", { className: "p-6 text-center text-gray-500", children: "\u0110ang t\u1EA3i..." })) : (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "grid grid-cols-3 gap-4", children: [_jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["H\u1ECD v\u00E0 t\u00EAn", _jsx("input", { type: "text", value: memberViewForm.hoTen, onChange: (e) => setMemberViewForm({
                                                        ...memberViewForm,
                                                        hoTen: e.target.value,
                                                    }), disabled: memberViewReadOnly, className: `mt-1 w-full rounded-lg border border-gray-300 ${memberViewReadOnly ? 'bg-gray-50' : 'bg-white'} px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20`, required: true })] }), _jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["CCCD/CMND", _jsx("input", { type: "text", value: memberViewForm.cccd, onChange: (e) => setMemberViewForm({
                                                        ...memberViewForm,
                                                        cccd: e.target.value,
                                                    }), disabled: memberViewReadOnly, className: `mt-1 w-full rounded-lg border border-gray-300 ${memberViewReadOnly ? 'bg-gray-50' : 'bg-white'} px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20` })] }), _jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["B\u00ED danh", _jsx("input", { type: "text", value: memberViewForm.biDanh, onChange: (e) => setMemberViewForm({
                                                        ...memberViewForm,
                                                        biDanh: e.target.value,
                                                    }), disabled: memberViewReadOnly, className: `mt-1 w-full rounded-lg border border-gray-300 ${memberViewReadOnly ? 'bg-gray-50' : 'bg-white'} px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20` })] })] }), _jsxs("div", { className: "grid grid-cols-3 gap-4", children: [_jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["Ng\u00E0y c\u1EA5p CCCD", _jsx("input", { type: "date", value: memberViewForm.ngayCapCCCD || "", onChange: (e) => setMemberViewForm({
                                                        ...memberViewForm,
                                                        ngayCapCCCD: e.target.value,
                                                    }), disabled: memberViewReadOnly, className: `mt-1 w-full rounded-lg border border-gray-300 ${memberViewReadOnly ? 'bg-gray-50' : 'bg-white'} px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20` })] }), _jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["N\u01A1i c\u1EA5p CCCD", _jsx("input", { type: "text", value: memberViewForm.noiCapCCCD || "", onChange: (e) => setMemberViewForm({
                                                        ...memberViewForm,
                                                        noiCapCCCD: e.target.value,
                                                    }), disabled: memberViewReadOnly, className: `mt-1 w-full rounded-lg border border-gray-300 ${memberViewReadOnly ? 'bg-gray-50' : 'bg-white'} px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20` })] }), _jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["Ng\u00E0y \u0111\u0103ng k\u00FD th\u01B0\u1EDDng tr\u00FA", _jsx("input", { type: "date", value: memberViewForm.ngayDangKyThuongTru || "", onChange: (e) => setMemberViewForm({
                                                        ...memberViewForm,
                                                        ngayDangKyThuongTru: e.target.value,
                                                    }), disabled: memberViewReadOnly, className: `mt-1 w-full rounded-lg border border-gray-300 ${memberViewReadOnly ? 'bg-gray-50' : 'bg-white'} px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20` })] })] }), _jsxs("div", { className: "grid grid-cols-3 gap-4", children: [_jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["Ng\u00E0y sinh", _jsx("input", { type: "date", value: memberViewForm.ngaySinh || "", onChange: (e) => setMemberViewForm({
                                                        ...memberViewForm,
                                                        ngaySinh: e.target.value,
                                                    }), disabled: memberViewReadOnly, className: `mt-1 w-full rounded-lg border border-gray-300 ${memberViewReadOnly ? 'bg-gray-50' : 'bg-white'} px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20` })] }), _jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["Gi\u1EDBi t\u00EDnh", _jsxs("select", { value: memberViewForm.gioiTinh || "", onChange: (e) => setMemberViewForm({
                                                        ...memberViewForm,
                                                        gioiTinh: e.target.value,
                                                    }), disabled: memberViewReadOnly, className: `mt-1 w-full rounded-lg border border-gray-300 ${memberViewReadOnly ? 'bg-gray-50' : 'bg-white'} px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20`, children: [_jsx("option", { value: "", children: "Ch\u1ECDn gi\u1EDBi t\u00EDnh" }), _jsx("option", { value: "nam", children: "Nam" }), _jsx("option", { value: "nu", children: "N\u1EEF" }), _jsx("option", { value: "khac", children: "Kh\u00E1c" })] })] }), _jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["N\u01A1i sinh", _jsx("input", { type: "text", value: memberViewForm.noiSinh || "", onChange: (e) => setMemberViewForm({
                                                        ...memberViewForm,
                                                        noiSinh: e.target.value,
                                                    }), disabled: memberViewReadOnly, className: `mt-1 w-full rounded-lg border border-gray-300 ${memberViewReadOnly ? 'bg-gray-50' : 'bg-white'} px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20` })] })] }), _jsxs("div", { className: "grid grid-cols-3 gap-4", children: [_jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["Nguy\u00EAn qu\u00E1n", _jsx("input", { type: "text", value: memberViewForm.nguyenQuan || "", onChange: (e) => setMemberViewForm({
                                                        ...memberViewForm,
                                                        nguyenQuan: e.target.value,
                                                    }), disabled: memberViewReadOnly, className: `mt-1 w-full rounded-lg border border-gray-300 ${memberViewReadOnly ? 'bg-gray-50' : 'bg-white'} px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20` })] }), _jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["D\u00E2n t\u1ED9c", _jsx("input", { type: "text", value: memberViewForm.danToc || "", onChange: (e) => setMemberViewForm({
                                                        ...memberViewForm,
                                                        danToc: e.target.value,
                                                    }), disabled: memberViewReadOnly, className: `mt-1 w-full rounded-lg border border-gray-300 ${memberViewReadOnly ? 'bg-gray-50' : 'bg-white'} px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20` })] }), _jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["T\u00F4n gi\u00E1o", _jsx("input", { type: "text", value: memberViewForm.tonGiao || "", onChange: (e) => setMemberViewForm({
                                                        ...memberViewForm,
                                                        tonGiao: e.target.value,
                                                    }), disabled: memberViewReadOnly, className: `mt-1 w-full rounded-lg border border-gray-300 ${memberViewReadOnly ? 'bg-gray-50' : 'bg-white'} px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20` })] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["Qu\u1ED1c t\u1ECBch", _jsx("input", { type: "text", value: memberViewForm.quocTich || "", onChange: (e) => setMemberViewForm({
                                                        ...memberViewForm,
                                                        quocTich: e.target.value,
                                                    }), disabled: memberViewReadOnly, className: `mt-1 w-full rounded-lg border border-gray-300 ${memberViewReadOnly ? 'bg-gray-50' : 'bg-white'} px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20` })] }), _jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["Quan h\u1EC7 v\u1EDBi ch\u1EE7 h\u1ED9", _jsxs("select", { value: memberViewForm.quanHe || "", onChange: (e) => setMemberViewForm({
                                                        ...memberViewForm,
                                                        quanHe: e.target.value,
                                                    }), disabled: memberViewReadOnly, className: `mt-1 w-full rounded-lg border border-gray-300 ${memberViewReadOnly ? 'bg-gray-50' : 'bg-white'} px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20`, children: [_jsx("option", { value: "", children: "Ch\u1ECDn quan h\u1EC7" }), Object.keys(quanHeLabel).map((key) => (_jsx("option", { value: key, children: quanHeLabel[key] }, key)))] })] })] }), _jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["\u0110\u1ECBa ch\u1EC9 th\u01B0\u1EDDng tr\u00FA tr\u01B0\u1EDBc \u0111\u00E2y", _jsx("textarea", { value: memberViewForm.diaChiThuongTruTruoc || "", onChange: (e) => setMemberViewForm({
                                                ...memberViewForm,
                                                diaChiThuongTruTruoc: e.target.value,
                                            }), disabled: memberViewReadOnly, rows: 2, className: `mt-1 w-full rounded-lg border border-gray-300 ${memberViewReadOnly ? 'bg-gray-50' : 'bg-white'} px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20` })] }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["Ngh\u1EC1 nghi\u1EC7p", _jsx("input", { type: "text", value: memberViewForm.ngheNghiep || "", onChange: (e) => setMemberViewForm({
                                                        ...memberViewForm,
                                                        ngheNghiep: e.target.value,
                                                    }), disabled: memberViewReadOnly, className: `mt-1 w-full rounded-lg border border-gray-300 ${memberViewReadOnly ? 'bg-gray-50' : 'bg-white'} px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20` })] }), _jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["N\u01A1i l\u00E0m vi\u1EC7c", _jsx("input", { type: "text", value: memberViewForm.noiLamViec || "", onChange: (e) => setMemberViewForm({
                                                        ...memberViewForm,
                                                        noiLamViec: e.target.value,
                                                    }), disabled: memberViewReadOnly, className: `mt-1 w-full rounded-lg border border-gray-300 ${memberViewReadOnly ? 'bg-gray-50' : 'bg-white'} px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20` })] })] }), _jsx("div", { className: "flex justify-end pt-4", children: _jsx("button", { type: "button", onClick: () => {
                                            setShowMemberViewModal(false);
                                            setViewingNhanKhauDetail(null);
                                            setMemberViewError(null);
                                        }, className: "rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50", children: "\u0110\u00F3ng" }) })] }))] }) })), success && (_jsx("div", { className: "rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-700", children: success })), showCreateForm && (_jsx("div", { className: "fixed inset-0 z-[120] flex min-h-screen w-screen items-center justify-center bg-black/50 backdrop-blur-sm p-4", children: _jsxs("div", { className: "w-full max-w-2xl rounded-xl border border-gray-200 bg-white p-6 shadow-2xl", children: [_jsxs("div", { className: "mb-6 flex items-center justify-between", children: [_jsx("h2", { className: "text-xl font-bold text-gray-900", children: "T\u1EA1o h\u1ED9 kh\u1EA9u m\u1EDBi" }), _jsx("button", { onClick: () => setShowCreateForm(false), className: "rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600", children: "\u2715" })] }), _jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [_jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["S\u1ED1 h\u1ED9 kh\u1EA9u ", _jsx("span", { className: "text-red-500", children: "*" }), _jsx("input", { type: "text", required: true, value: formData.soHoKhau, onChange: (e) => setFormData({ ...formData, soHoKhau: e.target.value }), className: "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20", placeholder: "VD: HK001" })] }), _jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["Ng\u00E0y c\u1EA5p", _jsx("input", { type: "date", value: formData.ngayCap, onChange: (e) => setFormData({ ...formData, ngayCap: e.target.value }), className: "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" })] })] }), _jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["\u0110\u1ECBa ch\u1EC9 ", _jsx("span", { className: "text-red-500", children: "*" }), _jsx("input", { type: "text", required: true, value: formData.diaChi, onChange: (e) => setFormData({ ...formData, diaChi: e.target.value }), className: "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20", placeholder: "\u0110\u1ECBa ch\u1EC9 \u0111\u1EA7y \u0111\u1EE7" })] }), _jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["\u0110\u1ECBa ch\u1EC9 \u0111\u1EA7y \u0111\u1EE7", _jsx("textarea", { value: formData.diaChiDayDu, onChange: (e) => setFormData({ ...formData, diaChiDayDu: e.target.value }), rows: 2, className: "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20", placeholder: "Nh\u1EADp \u0111\u1ECBa ch\u1EC9 \u0111\u1EA7y \u0111\u1EE7 n\u1EBFu c\u1EA7n" })] }), _jsxs("div", { className: "grid grid-cols-3 gap-4", children: [_jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["T\u1EC9nh/Th\u00E0nh ph\u1ED1", _jsx("input", { type: "text", value: formData.tinhThanh, onChange: (e) => setFormData({ ...formData, tinhThanh: e.target.value }), className: "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" })] }), _jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["Qu\u1EADn/Huy\u1EC7n", _jsx("input", { type: "text", value: formData.quanHuyen, onChange: (e) => setFormData({ ...formData, quanHuyen: e.target.value }), className: "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" })] }), _jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["Ph\u01B0\u1EDDng/X\u00E3", _jsx("input", { type: "text", value: formData.phuongXa, onChange: (e) => setFormData({ ...formData, phuongXa: e.target.value }), className: "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" })] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["\u0110\u01B0\u1EDDng/Ph\u1ED1", _jsx("input", { type: "text", value: formData.duongPho, onChange: (e) => setFormData({ ...formData, duongPho: e.target.value }), className: "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" })] }), _jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["S\u1ED1 nh\u00E0", _jsx("input", { type: "text", value: formData.soNha, onChange: (e) => setFormData({ ...formData, soNha: e.target.value }), className: "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" })] })] }), _jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["Ghi ch\u00FA", _jsx("textarea", { value: formData.ghiChu, onChange: (e) => setFormData({ ...formData, ghiChu: e.target.value }), rows: 3, className: "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20", placeholder: "Ghi ch\u00FA th\u00EAm..." })] }), _jsxs("div", { className: "flex gap-3 pt-4", children: [_jsx("button", { type: "submit", disabled: isLoading, className: "flex-1 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg disabled:opacity-50", children: isLoading ? "Đang tạo..." : "Tạo hộ khẩu" }), _jsx("button", { type: "button", onClick: () => setShowCreateForm(false), className: "rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50", children: "H\u1EE7y" })] })] })] }) })), showViewModal && viewingHoKhau && (_jsx("div", { className: "fixed inset-0 z-[120] flex min-h-screen w-screen items-center justify-center bg-black/50 backdrop-blur-sm p-4", children: _jsxs("div", { className: "w-full max-w-4xl rounded-xl border border-gray-200 bg-white p-6 shadow-2xl", children: [_jsxs("div", { className: "mb-4 flex items-center justify-between", children: [_jsxs("div", { children: [_jsxs("h2", { className: "text-xl font-bold text-gray-900", children: ["H\u1ED9 kh\u1EA9u ", viewingHoKhau.soHoKhau] }), _jsxs("p", { className: "text-sm text-gray-500", children: ["\u0110\u1ECBa ch\u1EC9: ", viewingHoKhau.diaChi] })] }), _jsx("button", { onClick: closeViewHousehold, className: "rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600", children: "\u2715" })] }), viewError && (_jsx("div", { className: "mb-3 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700", children: viewError })), _jsxs("div", { className: "mb-4 grid grid-cols-2 gap-4 text-sm text-gray-700", children: [_jsxs("div", { className: "space-y-1", children: [_jsx("div", { className: "font-semibold text-gray-900", children: "Th\u00F4ng tin h\u1ED9 kh\u1EA9u" }), _jsxs("div", { children: ["S\u1ED1 h\u1ED9 kh\u1EA9u: ", viewingHoKhau.soHoKhau] }), _jsxs("div", { children: ["\u0110\u1ECBa ch\u1EC9: ", viewingHoKhau.diaChi] }), viewingHoKhau.diaChiDayDu && (_jsxs("div", { children: ["\u0110\u1ECBa ch\u1EC9 \u0111\u1EA7y \u0111\u1EE7: ", viewingHoKhau.diaChiDayDu] })), _jsxs("div", { children: ["Tr\u1EA1ng th\u00E1i: ", getTrangThaiBadge(viewingHoKhau.trangThai)] })] }), _jsxs("div", { className: "space-y-1", children: [_jsx("div", { className: "font-semibold text-gray-900", children: "\u0110\u1ECBa b\u00E0n" }), viewingHoKhau.tinhThanh && (_jsxs("div", { children: ["T\u1EC9nh/Th\u00E0nh: ", viewingHoKhau.tinhThanh] })), viewingHoKhau.quanHuyen && (_jsxs("div", { children: ["Qu\u1EADn/Huy\u1EC7n: ", viewingHoKhau.quanHuyen] })), viewingHoKhau.phuongXa && (_jsxs("div", { children: ["Ph\u01B0\u1EDDng/X\u00E3: ", viewingHoKhau.phuongXa] })), (viewingHoKhau.duongPho || viewingHoKhau.soNha) && (_jsxs("div", { children: ["\u0110\u01B0\u1EDDng/Ph\u1ED1 - S\u1ED1 nh\u00E0: ", viewingHoKhau.duongPho || "-", " ", viewingHoKhau.soNha || ""] })), viewingHoKhau.ngayCap && (_jsxs("div", { children: ["Ng\u00E0y c\u1EA5p:", " ", formatFromYMD(viewingHoKhau.ngayCap)] })), viewingHoKhau.ghiChu && (_jsxs("div", { children: ["Ghi ch\u00FA: ", viewingHoKhau.ghiChu] }))] })] }), viewLoading ? (_jsx("div", { className: "p-4 text-center text-gray-500", children: "\u0110ang t\u1EA3i nh\u00E2n kh\u1EA9u..." })) : viewNhanKhau.length === 0 ? (_jsx("div", { className: "p-4 text-center text-gray-500", children: "H\u1ED9 kh\u1EA9u n\u00E0y ch\u01B0a c\u00F3 nh\u00E2n kh\u1EA9u n\u00E0o." })) : (_jsx("div", { className: "max-h-[420px] overflow-y-auto", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { className: "bg-gray-50", children: _jsxs("tr", { children: [_jsx("th", { className: "px-4 py-2 text-left font-semibold text-gray-700", children: "H\u1ECD t\u00EAn" }), _jsx("th", { className: "px-4 py-2 text-left font-semibold text-gray-700", children: "CCCD" }), _jsx("th", { className: "px-4 py-2 text-left font-semibold text-gray-700", children: "Quan h\u1EC7" }), _jsx("th", { className: "px-4 py-2 text-left font-semibold text-gray-700", children: "Gi\u1EDBi t\u00EDnh" }), _jsx("th", { className: "px-4 py-2 text-left font-semibold text-gray-700", children: "Ng\u00E0y sinh" }), _jsx("th", { className: "px-4 py-2 text-left font-semibold text-gray-700", children: "Ghi ch\u00FA" }), _jsx("th", { className: "px-4 py-2 text-right font-semibold text-gray-700", children: "Thao t\u00E1c" })] }) }), _jsx("tbody", { className: "divide-y divide-gray-200", children: viewNhanKhau.map((nk) => (_jsxs("tr", { className: nk.quanHe === "chu_ho" ? "bg-blue-50/40" : "", children: [_jsxs("td", { className: "px-4 py-2 font-medium text-gray-900", children: [nk.hoTen, nk.quanHe === "chu_ho" && (_jsx("span", { className: "ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700", children: "Ch\u1EE7 h\u1ED9" }))] }), _jsx("td", { className: "px-4 py-2 text-gray-700", children: nk.cccd || "-" }), _jsx("td", { className: "px-4 py-2 text-gray-700", children: quanHeLabel[nk.quanHe] || nk.quanHe }), _jsx("td", { className: "px-4 py-2 text-gray-700", children: nk.gioiTinh === "nam"
                                                        ? "Nam"
                                                        : nk.gioiTinh === "nu"
                                                            ? "Nữ"
                                                            : nk.gioiTinh === "khac"
                                                                ? "Khác"
                                                                : "-" }), _jsx("td", { className: "px-4 py-2 text-gray-700", children: nk.ngaySinh
                                                        ? formatFromYMD(nk.ngaySinh)
                                                        : "-" }), _jsx("td", { className: "px-4 py-2 text-gray-700", children: (nk.ghiChu ?? "").trim() || "Còn sống" }), _jsx("td", { className: "px-4 py-2 text-right text-gray-700", children: _jsxs("div", { className: "flex justify-end gap-2", children: [_jsx("button", { onClick: () => openViewNhanKhau(nk.id), className: "rounded-md border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 hover:border-blue-300 hover:text-blue-600", title: "Xem \u0111\u1EA7y \u0111\u1EE7", children: "\uD83D\uDC41 Xem" }), canEditMember && (_jsx("button", { onClick: () => navigateToNhanKhauPage(viewingHoKhau.id), className: "rounded-md border border-orange-200 px-3 py-1 text-xs font-semibold text-orange-700 hover:border-orange-300 hover:text-orange-600", title: "Ch\u1EC9nh s\u1EEDa nh\u00E2n kh\u1EA9u \u1EDF trang Nh\u00E2n kh\u1EA9u", children: "\u270F\uFE0F S\u1EEDa \u1EDF trang Nh\u00E2n kh\u1EA9u" }))] }) })] }, nk.id))) })] }) }))] }) })), showEditModal && editingHoKhau && (_jsx("div", { className: "fixed inset-0 z-[120] flex min-h-screen w-screen items-center justify-center bg-black/50 backdrop-blur-sm p-4", children: _jsxs("div", { className: "w-full max-w-2xl rounded-xl border border-gray-200 bg-white p-6 shadow-2xl", children: [_jsxs("div", { className: "mb-6 flex items-center justify-between", children: [_jsx("h2", { className: "text-xl font-bold text-gray-900", children: "Ch\u1EC9nh s\u1EEDa h\u1ED9 kh\u1EA9u" }), _jsx("button", { onClick: () => {
                                        setShowEditModal(false);
                                        setEditingHoKhau(null);
                                    }, className: "rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600", children: "\u2715" })] }), _jsxs("form", { onSubmit: handleUpdate, className: "space-y-4", children: [_jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["S\u1ED1 h\u1ED9 kh\u1EA9u ", _jsx("span", { className: "text-red-500", children: "*" }), _jsx("input", { type: "text", required: true, value: editFormData.soHoKhau, onChange: (e) => setEditFormData({
                                                        ...editFormData,
                                                        soHoKhau: e.target.value,
                                                    }), className: "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" })] }), _jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["Ng\u00E0y c\u1EA5p", _jsx("input", { type: "date", value: editFormData.ngayCap, onChange: (e) => setEditFormData({
                                                        ...editFormData,
                                                        ngayCap: e.target.value,
                                                    }), className: "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" })] })] }), _jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["\u0110\u1ECBa ch\u1EC9 ", _jsx("span", { className: "text-red-500", children: "*" }), _jsx("input", { type: "text", required: true, value: editFormData.diaChi, onChange: (e) => setEditFormData({ ...editFormData, diaChi: e.target.value }), className: "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" })] }), _jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["\u0110\u1ECBa ch\u1EC9 \u0111\u1EA7y \u0111\u1EE7", _jsx("textarea", { value: editFormData.diaChiDayDu, onChange: (e) => setEditFormData({
                                                ...editFormData,
                                                diaChiDayDu: e.target.value,
                                            }), rows: 2, className: "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20", placeholder: "Nh\u1EADp \u0111\u1ECBa ch\u1EC9 \u0111\u1EA7y \u0111\u1EE7 n\u1EBFu c\u1EA7n" })] }), _jsxs("div", { className: "grid grid-cols-3 gap-4", children: [_jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["T\u1EC9nh/Th\u00E0nh ph\u1ED1", _jsx("input", { type: "text", value: editFormData.tinhThanh, onChange: (e) => setEditFormData({
                                                        ...editFormData,
                                                        tinhThanh: e.target.value,
                                                    }), className: "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" })] }), _jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["Qu\u1EADn/Huy\u1EC7n", _jsx("input", { type: "text", value: editFormData.quanHuyen, onChange: (e) => setEditFormData({
                                                        ...editFormData,
                                                        quanHuyen: e.target.value,
                                                    }), className: "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" })] }), _jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["Ph\u01B0\u1EDDng/X\u00E3", _jsx("input", { type: "text", value: editFormData.phuongXa, onChange: (e) => setEditFormData({
                                                        ...editFormData,
                                                        phuongXa: e.target.value,
                                                    }), className: "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" })] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["\u0110\u01B0\u1EDDng/Ph\u1ED1", _jsx("input", { type: "text", value: editFormData.duongPho, onChange: (e) => setEditFormData({
                                                        ...editFormData,
                                                        duongPho: e.target.value,
                                                    }), className: "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" })] }), _jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["S\u1ED1 nh\u00E0", _jsx("input", { type: "text", value: editFormData.soNha, onChange: (e) => setEditFormData({
                                                        ...editFormData,
                                                        soNha: e.target.value,
                                                    }), className: "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" })] })] }), _jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["Ghi ch\u00FA", _jsx("textarea", { value: editFormData.ghiChu, onChange: (e) => setEditFormData({ ...editFormData, ghiChu: e.target.value }), rows: 3, className: "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" })] }), _jsxs("div", { className: "flex gap-3 pt-4", children: [_jsx("button", { type: "submit", disabled: isLoading, className: "flex-1 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg disabled:opacity-50", children: isLoading ? "Đang lưu..." : "Lưu thay đổi" }), _jsx("button", { type: "button", onClick: () => {
                                                setShowEditModal(false);
                                                setEditingHoKhau(null);
                                            }, className: "rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50", children: "H\u1EE7y" })] })] })] }) })), _jsxs("div", { className: "rounded-xl border border-gray-200 bg-white shadow-sm", children: [_jsx("div", { className: "border-b border-gray-200 p-4", children: _jsxs("h2", { className: "text-lg font-semibold text-gray-900", children: ["Danh s\u00E1ch h\u1ED9 kh\u1EA9u (", hoKhauList.length, ")"] }) }), isLoading && hoKhauList.length === 0 ? (_jsx("div", { className: "p-8 text-center text-gray-500", children: "\u0110ang t\u1EA3i..." })) : hoKhauList.length === 0 ? (_jsx("div", { className: "p-8 text-center text-gray-500", children: "Ch\u01B0a c\u00F3 h\u1ED9 kh\u1EA9u n\u00E0o. H\u00E3y t\u1EA1o h\u1ED9 kh\u1EA9u m\u1EDBi!" })) : (_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full", children: [_jsx("thead", { className: "bg-gray-50", children: _jsxs("tr", { children: [_jsx("th", { className: "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700", children: "S\u1ED1 h\u1ED9 kh\u1EA9u" }), _jsx("th", { className: "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700", children: "\u0110\u1ECBa ch\u1EC9" }), _jsx("th", { className: "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700", children: "Tr\u1EA1ng th\u00E1i" }), _jsx("th", { className: "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700", children: "Ng\u00E0y t\u1EA1o" }), _jsx("th", { className: "px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-700", children: "Thao t\u00E1c" })] }) }), _jsx("tbody", { className: "divide-y divide-gray-200", children: hoKhauList.map((hk) => (_jsxs("tr", { className: "hover:bg-gray-50", children: [_jsx("td", { className: "px-4 py-3 text-sm font-medium text-gray-900", children: hk.soHoKhau }), _jsx("td", { className: "px-4 py-3 text-sm text-gray-600", children: hk.diaChi }), _jsx("td", { className: "px-4 py-3", children: getTrangThaiBadge(hk.trangThai) }), _jsx("td", { className: "px-4 py-3 text-sm text-gray-500", children: new Date(hk.createdAt).toLocaleDateString("vi-VN") }), _jsxs("td", { className: "px-4 py-3 text-right space-x-2", children: [_jsxs("button", { onClick: () => openViewHousehold(hk), className: "inline-flex items-center rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:border-blue-300 hover:text-blue-600", title: "Xem nh\u00E2n kh\u1EA9u", children: [_jsx("span", { className: "sr-only", children: "Xem" }), _jsxs("svg", { xmlns: "http://www.w3.org/2000/svg", className: "h-4 w-4", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" }), _jsx("circle", { cx: "12", cy: "12", r: "3" })] })] }), _jsxs("button", { onClick: () => openEditHousehold(hk), className: "inline-flex items-center rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:border-blue-300 hover:text-blue-600", title: "Ch\u1EC9nh s\u1EEDa h\u1ED9 kh\u1EA9u", children: [_jsx("span", { className: "sr-only", children: "S\u1EEDa" }), _jsxs("svg", { xmlns: "http://www.w3.org/2000/svg", className: "h-4 w-4", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M12 20h9" }), _jsx("path", { d: "M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" })] })] })] })] }, hk.id))) })] }) }))] })] }));
}
