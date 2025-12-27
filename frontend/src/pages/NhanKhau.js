import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { apiService } from "../services/api";
import { formatDateForInput, formatFromYMD, normalizeDateOnly } from "../utils/date";
export default function NhanKhau() {
    const [searchParams] = useSearchParams();
    const [hoKhauList, setHoKhauList] = useState([]);
    const [selectedHoKhauId, setSelectedHoKhauId] = useState(null);
    const [nhanKhauList, setNhanKhauList] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [showActivateModal, setShowActivateModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [showChangeChuHoModal, setShowChangeChuHoModal] = useState(false);
    const [error, setError] = useState(null);
    const [viewError, setViewError] = useState(null);
    const [viewLoading, setViewLoading] = useState(false);
    const [viewSaving, setViewSaving] = useState(false);
    const [viewingNhanKhau, setViewingNhanKhau] = useState(null);
    const [toast, setToast] = useState(null);
    const emptyForm = {
        hoKhauId: "",
        hoTen: "",
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
        quanHe: "",
        ngayDangKyThuongTru: "",
        diaChiThuongTruTruoc: "",
        ngheNghiep: "",
        noiLamViec: "",
        ghiChu: "",
    };
    const [formData, setFormData] = useState({ ...emptyForm });
    const [viewForm, setViewForm] = useState({ ...emptyForm });
    const [hoKhauHeadStatus, setHoKhauHeadStatus] = useState({});
    const [checkingHoKhauId, setCheckingHoKhauId] = useState(null);
    const showToast = (message, type = "success") => {
        setToast({ type, message });
    };
    // Current user (from localStorage) to control UI permissions (người dân cannot set 'chu_ho')
    const currentUser = localStorage.getItem("userInfo")
        ? JSON.parse(localStorage.getItem("userInfo") || "null")
        : null;
    const isCitizen = currentUser?.role === "nguoi_dan";
    const normalizeField = (value) => {
        const trimmed = value?.trim?.() ?? "";
        return trimmed === "" ? null : trimmed;
    };
    // Helper function to check if a person is the head of household
    const isChuHo = (nhanKhau) => {
        // Check isChuHo field first (from backend computed field)
        if (nhanKhau.isChuHo === true)
            return true;
        // Fallback to quanHe check
        const normalized = String(nhanKhau.quanHe || "").trim().toLowerCase();
        return normalized === "chu_ho" || normalized === "chủ hộ";
    };
    useEffect(() => {
        if (!toast)
            return;
        const timer = setTimeout(() => setToast(null), 3500);
        return () => clearTimeout(timer);
    }, [toast]);
    useEffect(() => {
        loadHoKhauList();
    }, []);
    // Handle householdId from query parameter
    useEffect(() => {
        if (hoKhauList.length > 0) {
            const householdIdParam = searchParams.get('householdId');
            if (householdIdParam) {
                const householdId = parseInt(householdIdParam);
                if (hoKhauList.some(hk => hk.id === householdId)) {
                    setSelectedHoKhauId(householdId);
                    // Show a toast message to guide the user
                    showToast("Vui lòng chọn nhân khẩu để sửa", "success");
                }
            }
        }
    }, [hoKhauList, searchParams]);
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
            const message = err.error?.message || "Lỗi khi tải danh sách hộ khẩu";
            setError(message);
            showToast(message, "error");
        }
        finally {
            setIsLoading(false);
        }
    };
    const loadNhanKhauList = async (hoKhauId) => {
        setIsLoading(true);
        setError(null); // Clear previous errors
        try {
            const response = await apiService.getNhanKhauList(hoKhauId);
            if (response.success) {
                const members = [...response.data];
                members.sort((a, b) => {
                    const aIsHead = isChuHo(a);
                    const bIsHead = isChuHo(b);
                    if (aIsHead && !bIsHead)
                        return -1;
                    if (!aIsHead && bIsHead)
                        return 1;
                    const aName = (a.hoTen || "").trim();
                    const bName = (b.hoTen || "").trim();
                    return aName.localeCompare(bName, "vi", { sensitivity: "base" });
                });
                setNhanKhauList(members);
                const hasChuHo = response.data.some((nk) => isChuHo(nk));
                setHoKhauHeadStatus((prev) => ({ ...prev, [hoKhauId]: hasChuHo }));
            }
            else {
                // API returned success=false, show error but keep existing list
                const message = "Lỗi khi tải danh sách nhân khẩu";
                setError(message);
                showToast(message, "error");
                // Don't clear the list - keep existing data
            }
        }
        catch (err) {
            const message = err.error?.message || "Lỗi khi tải danh sách nhân khẩu";
            setError(message);
            showToast(message, "error");
            // On network/server errors, don't clear the list - keep existing data
            // Only clear if it's a legitimate "no data" scenario
        }
        finally {
            setIsLoading(false);
        }
    };
    const ensureHoKhauHasChuHo = async (hoKhauId) => {
        if (hoKhauHeadStatus[hoKhauId] !== undefined) {
            return hoKhauHeadStatus[hoKhauId];
        }
        setCheckingHoKhauId(hoKhauId);
        try {
            const response = await apiService.getNhanKhauList(hoKhauId);
            if (response.success) {
                const members = [...response.data];
                members.sort((a, b) => {
                    const aIsHead = isChuHo(a);
                    const bIsHead = isChuHo(b);
                    if (aIsHead && !bIsHead)
                        return -1;
                    if (!aIsHead && bIsHead)
                        return 1;
                    const aName = (a.hoTen || "").trim();
                    const bName = (b.hoTen || "").trim();
                    return aName.localeCompare(bName, "vi", { sensitivity: "base" });
                });
                const hasChuHo = members.some((nk) => isChuHo(nk));
                setHoKhauHeadStatus((prev) => ({ ...prev, [hoKhauId]: hasChuHo }));
                return hasChuHo;
            }
            return false;
        }
        catch (err) {
            throw err;
        }
        finally {
            setCheckingHoKhauId((current) => (current === hoKhauId ? null : current));
        }
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setToast(null);
        const requiredFields = [
            "hoKhauId",
            "hoTen",
            "quanHe",
            "ngaySinh",
            "gioiTinh",
            "noiSinh",
            "nguyenQuan",
            "danToc",
            "tonGiao",
            "quocTich",
        ];
        const missing = requiredFields.filter((key) => !formData[key]);
        if (missing.length > 0) {
            const message = "Vui lòng nhập đầy đủ các trường bắt buộc (Hộ khẩu, Họ tên, Quan hệ, Ngày sinh, Giới tính, Nơi sinh, Nguyên quán, Dân tộc, Tôn giáo, Quốc tịch)";
            setError(message);
            showToast(message, "error");
            return;
        }
        const optionalKeys = [
            "cccd",
            "ngheNghiep",
            "noiLamViec",
            "biDanh",
            "ngayDangKyThuongTru",
            "noiCapCCCD",
            "ngayCapCCCD",
            "diaChiThuongTruTruoc",
        ];
        const hasMissingOptional = optionalKeys.some((key) => !normalizeField(formData[key]));
        if (hasMissingOptional && !normalizeField(formData.ghiChu)) {
            const message = "Vui lòng ghi chú lý do bỏ trống các trường tùy chọn vào phần Ghi chú.";
            setError(message);
            showToast(message, "error");
            return;
        }
        setIsLoading(true);
        try {
            const hoKhauIdNumber = Number(formData.hoKhauId);
            if (isChuHo({ quanHe: formData.quanHe })) {
                const hasChuHo = await ensureHoKhauHasChuHo(hoKhauIdNumber);
                if (hasChuHo) {
                    const message = "Hộ khẩu này đã có chủ hộ, không thể thêm chủ hộ mới";
                    setError(message);
                    showToast(message, "error");
                    return;
                }
            }
            const response = await apiService.createNhanKhau({
                hoKhauId: hoKhauIdNumber,
                hoTen: normalizeField(formData.hoTen),
                biDanh: normalizeField(formData.biDanh) || undefined,
                cccd: normalizeField(formData.cccd) || undefined,
                ngayCapCCCD: normalizeDateOnly(formData.ngayCapCCCD) || undefined,
                noiCapCCCD: normalizeField(formData.noiCapCCCD) || undefined,
                ngaySinh: normalizeDateOnly(formData.ngaySinh) || undefined,
                gioiTinh: formData.gioiTinh === "nam" ||
                    formData.gioiTinh === "nu" ||
                    formData.gioiTinh === "khac"
                    ? formData.gioiTinh
                    : undefined,
                noiSinh: normalizeField(formData.noiSinh) || undefined,
                nguyenQuan: normalizeField(formData.nguyenQuan) || undefined,
                danToc: normalizeField(formData.danToc) || undefined,
                tonGiao: normalizeField(formData.tonGiao) || undefined,
                quocTich: normalizeField(formData.quocTich) || undefined,
                quanHe: formData.quanHe,
                ngayDangKyThuongTru: normalizeDateOnly(formData.ngayDangKyThuongTru) || undefined,
                diaChiThuongTruTruoc: normalizeField(formData.diaChiThuongTruTruoc) || undefined,
                ngheNghiep: normalizeField(formData.ngheNghiep) || undefined,
                noiLamViec: normalizeField(formData.noiLamViec) || undefined,
                ghiChu: normalizeField(formData.ghiChu) || undefined,
            });
            if (response.success) {
                showToast("Thêm nhân khẩu thành công", "success");
                setShowCreateForm(false);
                setFormData({
                    hoKhauId: selectedHoKhauId?.toString() || "",
                    hoTen: "",
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
                    quanHe: "",
                    ngayDangKyThuongTru: "",
                    diaChiThuongTruTruoc: "",
                    ngheNghiep: "",
                    noiLamViec: "",
                    ghiChu: "",
                });
                if (selectedHoKhauId) {
                    loadNhanKhauList(selectedHoKhauId);
                }
            }
        }
        catch (err) {
            const message = err.error?.message || "Lỗi khi tạo nhân khẩu";
            setError(message);
            showToast(message, "error");
        }
        finally {
            setIsLoading(false);
        }
    };
    const openViewNhanKhau = async (id) => {
        setViewError(null);
        setViewingNhanKhau(null);
        setShowViewModal(true);
        setViewLoading(true);
        try {
            const res = await apiService.getNhanKhauById(id);
            if (res.success) {
                const nk = res.data;
                setViewingNhanKhau(nk);
                setViewForm({
                    hoKhauId: nk.hoKhauId?.toString() || "",
                    hoTen: nk.hoTen || "",
                    biDanh: nk.biDanh || "",
                    cccd: nk.cccd || "",
                    ngayCapCCCD: formatDateForInput(nk.ngayCapCCCD),
                    noiCapCCCD: nk.noiCapCCCD || "",
                    ngaySinh: formatDateForInput(nk.ngaySinh),
                    gioiTinh: nk.gioiTinh || "",
                    noiSinh: nk.noiSinh || "",
                    nguyenQuan: nk.nguyenQuan || "",
                    danToc: nk.danToc || "",
                    tonGiao: nk.tonGiao || "",
                    quocTich: nk.quocTich || "Việt Nam",
                    quanHe: nk.quanHe || "",
                    ngayDangKyThuongTru: formatDateForInput(nk.ngayDangKyThuongTru),
                    diaChiThuongTruTruoc: nk.diaChiThuongTruTruoc || "",
                    ngheNghiep: nk.ngheNghiep || "",
                    noiLamViec: nk.noiLamViec || "",
                    ghiChu: nk.ghiChu || "",
                });
            }
        }
        catch (err) {
            setViewError(err.error?.message || "Lỗi khi tải thông tin nhân khẩu");
        }
        finally {
            setViewLoading(false);
        }
    };
    const handleUpdateNhanKhau = async (id) => {
        setViewError(null);
        setToast(null);
        setViewSaving(true);
        try {
            const requiredFields = [
                "hoTen",
                "quanHe",
                "ngaySinh",
                "gioiTinh",
                "noiSinh",
                "nguyenQuan",
                "danToc",
                "tonGiao",
                "quocTich",
            ];
            const missingRequired = requiredFields.filter((k) => !viewForm[k]);
            if (missingRequired.length > 0) {
                const message = "Vui lòng nhập đầy đủ các trường bắt buộc (Họ tên, Quan hệ, Ngày sinh, Giới tính, Nơi sinh, Nguyên quán, Dân tộc, Tôn giáo, Quốc tịch)";
                setViewError(message);
                showToast(message, "error");
                setViewSaving(false);
                return;
            }
            // Validation: Nếu đang set quanHe = "chu_ho", kiểm tra hộ khẩu đã có chủ hộ chưa
            if (isChuHo({ quanHe: viewForm.quanHe }) && viewingNhanKhau) {
                const hoKhauId = viewingNhanKhau.hoKhauId;
                const hasChuHo = await ensureHoKhauHasChuHo(hoKhauId);
                // Nếu hộ khẩu đã có chủ hộ và nhân khẩu hiện tại không phải chủ hộ
                if (hasChuHo && !isChuHo(viewingNhanKhau)) {
                    const message = "Hộ khẩu này đã có chủ hộ. Không thể đặt nhân khẩu này làm chủ hộ. Vui lòng sử dụng chức năng 'Đổi chủ hộ' nếu muốn thay đổi.";
                    setViewError(message);
                    showToast(message, "error");
                    setViewSaving(false);
                    return;
                }
            }
            const optionalKeys = [
                "cccd",
                "ngheNghiep",
                "noiLamViec",
                "biDanh",
                "ngayDangKyThuongTru",
                "noiCapCCCD",
                "ngayCapCCCD",
                "diaChiThuongTruTruoc",
            ];
            const hasMissingOptional = optionalKeys.some((k) => !normalizeField(viewForm[k]));
            if (hasMissingOptional && !normalizeField(viewForm.ghiChu)) {
                const message = "Vui lòng ghi chú lý do bỏ trống các trường tùy chọn vào phần Ghi chú.";
                setViewError(message);
                showToast(message, "error");
                setViewSaving(false);
                return;
            }
            const payload = {
                hoTen: normalizeField(viewForm.hoTen) || undefined,
                biDanh: normalizeField(viewForm.biDanh) || undefined,
                cccd: normalizeField(viewForm.cccd) || undefined,
                ngayCapCCCD: normalizeDateOnly(viewForm.ngayCapCCCD) || undefined,
                noiCapCCCD: normalizeField(viewForm.noiCapCCCD) || undefined,
                ngaySinh: normalizeDateOnly(viewForm.ngaySinh) || undefined,
                gioiTinh: viewForm.gioiTinh === "nam" ||
                    viewForm.gioiTinh === "nu" ||
                    viewForm.gioiTinh === "khac"
                    ? viewForm.gioiTinh
                    : undefined,
                noiSinh: normalizeField(viewForm.noiSinh) || undefined,
                nguyenQuan: normalizeField(viewForm.nguyenQuan) || undefined,
                danToc: normalizeField(viewForm.danToc) || undefined,
                tonGiao: normalizeField(viewForm.tonGiao) || undefined,
                quocTich: normalizeField(viewForm.quocTich) || undefined,
                quanHe: normalizeField(viewForm.quanHe) || undefined,
                ngayDangKyThuongTru: normalizeDateOnly(viewForm.ngayDangKyThuongTru) || undefined,
                diaChiThuongTruTruoc: normalizeField(viewForm.diaChiThuongTruTruoc) || undefined,
                ngheNghiep: normalizeField(viewForm.ngheNghiep) || undefined,
                noiLamViec: normalizeField(viewForm.noiLamViec) || undefined,
            };
            try {
                const res = await apiService.updateNhanKhau(id, payload);
                if (res.success) {
                    showToast("Cập nhật nhân khẩu thành công!", "success");
                    setShowViewModal(false);
                    setViewingNhanKhau(null);
                    if (selectedHoKhauId) {
                        loadNhanKhauList(selectedHoKhauId);
                    }
                }
            }
            catch (err) {
                const message = err.error?.message || "Lỗi khi cập nhật nhân khẩu";
                setViewError(message);
                showToast(message, "error");
            }
        }
        catch (err) {
            const message = err.error?.message || "Lỗi khi cập nhật nhân khẩu";
            setViewError(message);
            showToast(message, "error");
        }
        finally {
            setViewSaving(false);
        }
    };
    const handleActivate = async (hoKhauId, chuHoId) => {
        setError(null);
        setToast(null);
        setIsLoading(true);
        try {
            const response = await apiService.activateHoKhau(hoKhauId, chuHoId);
            if (response.success) {
                showToast("Kích hoạt hộ khẩu thành công!", "success");
                setShowActivateModal(false);
                loadHoKhauList();
                if (selectedHoKhauId === hoKhauId) {
                    loadNhanKhauList(hoKhauId);
                }
            }
        }
        catch (err) {
            const message = err.error?.message || "Lỗi khi kích hoạt hộ khẩu";
            setError(message);
            showToast(message, "error");
        }
        finally {
            setIsLoading(false);
        }
    };
    const handleChangeChuHo = async (newChuHoId, oldChuHoNewQuanHe) => {
        if (!selectedHoKhauId)
            return;
        setError(null);
        setToast(null);
        setIsLoading(true);
        try {
            const response = await apiService.changeChuHo(selectedHoKhauId, newChuHoId, oldChuHoNewQuanHe);
            if (response.success) {
                showToast("Đổi chủ hộ thành công!", "success");
                setShowChangeChuHoModal(false);
                loadHoKhauList();
                loadNhanKhauList(selectedHoKhauId);
            }
        }
        catch (err) {
            const message = err.error?.message || "Lỗi khi đổi chủ hộ";
            setError(message);
            showToast(message, "error");
        }
        finally {
            setIsLoading(false);
        }
    };
    // Always derive a sorted list for rendering so Chủ hộ is shown first
    const sortedNhanKhauList = [...nhanKhauList].sort((a, b) => {
        const aIsHead = isChuHo(a);
        const bIsHead = isChuHo(b);
        if (aIsHead && !bIsHead)
            return -1;
        if (!aIsHead && bIsHead)
            return 1;
        const aName = (a.hoTen || "").trim();
        const bName = (b.hoTen || "").trim();
        return aName.localeCompare(bName, "vi", { sensitivity: "base" });
    });
    const selectedHoKhau = hoKhauList.find((hk) => hk.id === selectedHoKhauId);
    const chuHoCandidates = sortedNhanKhauList.filter((nk) => isChuHo(nk));
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
    const selectedFormHoKhauId = formData.hoKhauId
        ? Number(formData.hoKhauId)
        : null;
    const hasChuHoForForm = selectedFormHoKhauId !== null
        ? hoKhauHeadStatus[selectedFormHoKhauId]
        : undefined;
    const isCheckingCurrentHoKhau = selectedFormHoKhauId !== null &&
        checkingHoKhauId !== null &&
        checkingHoKhauId === selectedFormHoKhauId;
    useEffect(() => {
        if (showCreateForm && formData.hoKhauId) {
            ensureHoKhauHasChuHo(Number(formData.hoKhauId)).catch((err) => {
                const message = err.error?.message || "Lỗi khi kiểm tra thông tin hộ khẩu";
                setError(message);
                showToast(message, "error");
            });
        }
    }, [showCreateForm, formData.hoKhauId]);
    useEffect(() => {
        if (hasChuHoForForm && isChuHo({ quanHe: formData.quanHe })) {
            setFormData((prev) => ({ ...prev, quanHe: "" }));
        }
    }, [hasChuHoForForm, formData.quanHe]);
    return (_jsxs("div", { className: "space-y-6", children: [toast && (_jsx("div", { className: "pointer-events-none fixed inset-x-0 top-4 z-[200] flex justify-center px-4", children: _jsxs("div", { className: `pointer-events-auto flex items-start gap-3 rounded-lg border px-4 py-3 text-sm shadow-lg ${toast.type === "success"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border-red-200 bg-red-50 text-red-800"}`, children: [_jsx("div", { className: "font-semibold", children: toast.type === "success" ? "Thành công" : "Thông báo" }), _jsx("div", { className: "flex-1 text-gray-800", children: toast.message }), _jsx("button", { onClick: () => setToast(null), className: "ml-2 rounded-full p-1 text-gray-500 hover:bg-black/5 hover:text-gray-700", children: "\u2715" })] }) })), _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent", children: "Qu\u1EA3n l\u00FD Nh\u00E2n kh\u1EA9u" }), _jsx("p", { className: "mt-1 text-gray-600", children: "Th\u00EAm nh\u00E2n kh\u1EA9u v\u00E0 k\u00EDch ho\u1EA1t h\u1ED9 kh\u1EA9u" })] }), _jsx("button", { onClick: () => {
                            setFormData({
                                ...formData,
                                hoKhauId: selectedHoKhauId?.toString() || "",
                            });
                            setShowCreateForm(true);
                        }, className: "rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 px-6 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg hover:-translate-y-0.5", children: "+ Th\u00EAm nh\u00E2n kh\u1EA9u" })] }), showViewModal && viewingNhanKhau && (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto", children: _jsxs("div", { className: "w-full max-w-2xl rounded-xl border border-gray-200 bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto overflow-hidden modal-scroll", children: [_jsxs("div", { className: "mb-4 flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-xl font-bold text-gray-900", children: "Xem / S\u1EEDa nh\u00E2n kh\u1EA9u" }), _jsxs("p", { className: "text-sm text-gray-500", children: ["H\u1ED9 kh\u1EA9u: ", viewForm.hoKhauId] })] }), _jsx("button", { onClick: () => {
                                        setShowViewModal(false);
                                        setViewingNhanKhau(null);
                                        setViewError(null);
                                    }, className: "rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600", children: "\u2715" })] }), viewError && (_jsx("div", { className: "mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700", children: viewError })), viewLoading ? (_jsx("div", { className: "p-6 text-center text-gray-500", children: "\u0110ang t\u1EA3i th\u00F4ng tin..." })) : (_jsxs("form", { className: "space-y-4", onSubmit: (e) => {
                                e.preventDefault();
                                if (viewingNhanKhau) {
                                    handleUpdateNhanKhau(viewingNhanKhau.id);
                                }
                            }, children: [_jsxs("div", { className: "grid grid-cols-3 gap-4", children: [_jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["H\u1ECD v\u00E0 t\u00EAn", _jsx("input", { type: "text", value: viewForm.hoTen, onChange: (e) => setViewForm({ ...viewForm, hoTen: e.target.value }), className: "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20", required: true })] }), _jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["CCCD/CMND", _jsx("input", { type: "text", value: viewForm.cccd, onChange: (e) => setViewForm({ ...viewForm, cccd: e.target.value }), className: "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" })] }), _jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["B\u00ED danh", _jsx("input", { type: "text", value: viewForm.biDanh, onChange: (e) => setViewForm({ ...viewForm, biDanh: e.target.value }), className: "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" })] })] }), _jsxs("div", { className: "grid grid-cols-3 gap-4", children: [_jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["Ng\u00E0y c\u1EA5p CCCD", _jsx("input", { type: "date", value: viewForm.ngayCapCCCD, onChange: (e) => setViewForm({
                                                        ...viewForm,
                                                        ngayCapCCCD: e.target.value,
                                                    }), className: "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" })] }), _jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["N\u01A1i c\u1EA5p CCCD", _jsx("input", { type: "text", value: viewForm.noiCapCCCD, onChange: (e) => setViewForm({ ...viewForm, noiCapCCCD: e.target.value }), className: "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" })] }), _jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["Ng\u00E0y \u0111\u0103ng k\u00FD th\u01B0\u1EDDng tr\u00FA", _jsx("input", { type: "date", value: viewForm.ngayDangKyThuongTru, onChange: (e) => setViewForm({
                                                        ...viewForm,
                                                        ngayDangKyThuongTru: e.target.value,
                                                    }), className: "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" })] })] }), _jsxs("div", { className: "grid grid-cols-3 gap-4", children: [_jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["Ng\u00E0y sinh ", _jsx("span", { className: "text-red-500", children: "*" }), _jsx("input", { type: "date", value: viewForm.ngaySinh, onChange: (e) => setViewForm({ ...viewForm, ngaySinh: e.target.value }), className: "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" })] }), _jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["Gi\u1EDBi t\u00EDnh ", _jsx("span", { className: "text-red-500", children: "*" }), _jsxs("select", { value: viewForm.gioiTinh, onChange: (e) => setViewForm({ ...viewForm, gioiTinh: e.target.value }), className: "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20", children: [_jsx("option", { value: "", children: "Ch\u1ECDn gi\u1EDBi t\u00EDnh" }), _jsx("option", { value: "nam", children: "Nam" }), _jsx("option", { value: "nu", children: "N\u1EEF" }), _jsx("option", { value: "khac", children: "Kh\u00E1c" })] })] }), _jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["N\u01A1i sinh ", _jsx("span", { className: "text-red-500", children: "*" }), _jsx("input", { type: "text", value: viewForm.noiSinh, onChange: (e) => setViewForm({ ...viewForm, noiSinh: e.target.value }), className: "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" })] })] }), _jsxs("div", { className: "grid grid-cols-3 gap-4", children: [_jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["Nguy\u00EAn qu\u00E1n ", _jsx("span", { className: "text-red-500", children: "*" }), _jsx("input", { type: "text", value: viewForm.nguyenQuan, onChange: (e) => setViewForm({ ...viewForm, nguyenQuan: e.target.value }), className: "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" })] }), _jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["D\u00E2n t\u1ED9c ", _jsx("span", { className: "text-red-500", children: "*" }), _jsx("input", { type: "text", value: viewForm.danToc, onChange: (e) => setViewForm({ ...viewForm, danToc: e.target.value }), className: "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" })] }), _jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["T\u00F4n gi\u00E1o ", _jsx("span", { className: "text-red-500", children: "*" }), _jsx("input", { type: "text", value: viewForm.tonGiao, onChange: (e) => setViewForm({ ...viewForm, tonGiao: e.target.value }), className: "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" })] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["Qu\u1ED1c t\u1ECBch ", _jsx("span", { className: "text-red-500", children: "*" }), _jsx("input", { type: "text", value: viewForm.quocTich, onChange: (e) => setViewForm({ ...viewForm, quocTich: e.target.value }), className: "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" })] }), _jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["Quan h\u1EC7 v\u1EDBi ch\u1EE7 h\u1ED9", _jsxs("select", { value: viewForm.quanHe, onChange: (e) => setViewForm({ ...viewForm, quanHe: e.target.value }), className: "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20", children: [_jsx("option", { value: "", children: "Ch\u1ECDn quan h\u1EC7" }), quanHeOptions.map((opt) => {
                                                            const isChuHoOption = opt.value === "chu_ho";
                                                            const isCurrentChuHo = viewingNhanKhau ? isChuHo(viewingNhanKhau) : false;
                                                            const disabledChuHo = isChuHoOption &&
                                                                !isCurrentChuHo &&
                                                                selectedHoKhauId !== null &&
                                                                hoKhauHeadStatus[selectedHoKhauId];
                                                            // additionally hide/disable option for plain citizens
                                                            const disabledForCitizen = isChuHoOption && isCitizen;
                                                            return (_jsx("option", { value: opt.value, disabled: disabledChuHo || disabledForCitizen, children: opt.label }, opt.value));
                                                        })] }), viewingNhanKhau &&
                                                    !isChuHo(viewingNhanKhau) &&
                                                    selectedHoKhauId !== null &&
                                                    hoKhauHeadStatus[selectedHoKhauId] && (_jsx("p", { className: "mt-1 text-xs text-amber-600", children: "H\u1ED9 kh\u1EA9u n\u00E0y \u0111\u00E3 c\u00F3 ch\u1EE7 h\u1ED9. Vui l\u00F2ng s\u1EED d\u1EE5ng ch\u1EE9c n\u0103ng \"\u0110\u1ED5i ch\u1EE7 h\u1ED9\" n\u1EBFu mu\u1ED1n thay \u0111\u1ED5i." }))] })] }), _jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["\u0110\u1ECBa ch\u1EC9 th\u01B0\u1EDDng tr\u00FA tr\u01B0\u1EDBc \u0111\u00E2y", _jsx("textarea", { value: viewForm.diaChiThuongTruTruoc, onChange: (e) => setViewForm({
                                                ...viewForm,
                                                diaChiThuongTruTruoc: e.target.value,
                                            }), rows: 2, className: "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" })] }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["Ngh\u1EC1 nghi\u1EC7p", _jsx("input", { type: "text", value: viewForm.ngheNghiep, onChange: (e) => setViewForm({ ...viewForm, ngheNghiep: e.target.value }), className: "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" })] }), _jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["N\u01A1i l\u00E0m vi\u1EC7c", _jsx("input", { type: "text", value: viewForm.noiLamViec, onChange: (e) => setViewForm({ ...viewForm, noiLamViec: e.target.value }), className: "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" })] })] }), _jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["Ghi ch\u00FA", _jsx("textarea", { value: viewForm.ghiChu, onChange: (e) => setViewForm({ ...viewForm, ghiChu: e.target.value }), rows: 2, className: "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20", placeholder: "Nh\u1EADp l\u00FD do n\u1EBFu b\u1ECF tr\u1ED1ng c\u00E1c tr\u01B0\u1EDDng t\u00F9y ch\u1ECDn" })] }), _jsxs("div", { className: "flex gap-3 pt-4", children: [_jsx("button", { type: "submit", disabled: viewSaving, className: "flex-1 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg disabled:opacity-50", children: viewSaving ? "Đang lưu..." : "Lưu thay đổi" }), _jsx("button", { type: "button", onClick: () => {
                                                setShowViewModal(false);
                                                setViewingNhanKhau(null);
                                                setViewError(null);
                                            }, className: "rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50", children: "\u0110\u00F3ng" })] })] }))] }) })), _jsxs("div", { className: "rounded-xl border border-gray-200 bg-white p-4 shadow-sm", children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Ch\u1ECDn h\u1ED9 kh\u1EA9u" }), _jsx("select", { value: selectedHoKhauId || "", onChange: (e) => setSelectedHoKhauId(Number(e.target.value)), className: "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20", children: hoKhauList.map((hk) => (_jsxs("option", { value: hk.id, children: [hk.soHoKhau, " - ", hk.diaChi, " (", hk.trangThai === "active" ? "Đã kích hoạt" : "Chưa kích hoạt", ")"] }, hk.id))) })] }), selectedHoKhau &&
                selectedHoKhau.trangThai === "inactive" &&
                chuHoCandidates.length > 0 && (_jsx("div", { className: "rounded-xl border border-amber-200 bg-amber-50 p-4", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "font-semibold text-amber-900", children: "H\u1ED9 kh\u1EA9u ch\u01B0a \u0111\u01B0\u1EE3c k\u00EDch ho\u1EA1t" }), _jsxs("p", { className: "mt-1 text-sm text-amber-700", children: ["C\u00F3 ", chuHoCandidates.length, " ng\u01B0\u1EDDi c\u00F3 th\u1EC3 l\u00E0m ch\u1EE7 h\u1ED9. H\u00E3y k\u00EDch ho\u1EA1t h\u1ED9 kh\u1EA9u!"] })] }), _jsx("button", { onClick: () => setShowActivateModal(true), className: "rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600", children: "K\u00EDch ho\u1EA1t h\u1ED9 kh\u1EA9u" })] }) })), selectedHoKhau &&
                selectedHoKhau.trangThai === "active" &&
                chuHoCandidates.length > 0 &&
                nhanKhauList.filter((nk) => nk.quanHe !== "chu_ho").length > 0 && (_jsx("div", { className: "rounded-xl border border-blue-200 bg-blue-50 p-4", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "font-semibold text-blue-900", children: "\u0110\u1ED5i ch\u1EE7 h\u1ED9" }), _jsx("p", { className: "mt-1 text-sm text-blue-700", children: "B\u1EA1n c\u00F3 th\u1EC3 thay \u0111\u1ED5i ch\u1EE7 h\u1ED9 cho h\u1ED9 kh\u1EA9u n\u00E0y." })] }), _jsx("button", { onClick: () => setShowChangeChuHoModal(true), className: "rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600", children: "\u0110\u1ED5i ch\u1EE7 h\u1ED9" })] }) })), showCreateForm && (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto", children: _jsxs("div", { className: "w-full max-w-2xl rounded-xl border border-gray-200 bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto overflow-hidden modal-scroll", children: [_jsxs("div", { className: "mb-6 flex items-center justify-between", children: [_jsx("h2", { className: "text-xl font-bold text-gray-900", children: "Th\u00EAm nh\u00E2n kh\u1EA9u m\u1EDBi" }), _jsx("button", { onClick: () => setShowCreateForm(false), className: "rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600", children: "\u2715" })] }), _jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [_jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["H\u1ED9 kh\u1EA9u ", _jsx("span", { className: "text-red-500", children: "*" }), _jsxs("select", { required: true, value: formData.hoKhauId, onChange: (e) => setFormData({ ...formData, hoKhauId: e.target.value }), className: "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20", children: [_jsx("option", { value: "", children: "Ch\u1ECDn h\u1ED9 kh\u1EA9u" }), hoKhauList.map((hk) => (_jsxs("option", { value: hk.id, children: [hk.soHoKhau, " - ", hk.diaChi] }, hk.id)))] })] }), _jsxs("div", { className: "grid grid-cols-3 gap-4", children: [_jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["H\u1ECD v\u00E0 t\u00EAn ", _jsx("span", { className: "text-red-500", children: "*" }), _jsx("input", { type: "text", required: true, value: formData.hoTen, onChange: (e) => setFormData({ ...formData, hoTen: e.target.value }), className: "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20", autoComplete: "off", spellCheck: false })] }), _jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["CCCD/CMND", _jsx("input", { type: "text", value: formData.cccd, onChange: (e) => setFormData({ ...formData, cccd: e.target.value }), className: "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" })] }), _jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["B\u00ED danh", _jsx("input", { type: "text", value: formData.biDanh, onChange: (e) => setFormData({ ...formData, biDanh: e.target.value }), className: "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" })] })] }), _jsxs("div", { className: "grid grid-cols-3 gap-4", children: [_jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["Ng\u00E0y c\u1EA5p CCCD", _jsx("input", { type: "date", value: formData.ngayCapCCCD, onChange: (e) => setFormData({ ...formData, ngayCapCCCD: e.target.value }), className: "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" })] }), _jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["N\u01A1i c\u1EA5p CCCD", _jsx("input", { type: "text", value: formData.noiCapCCCD, onChange: (e) => setFormData({ ...formData, noiCapCCCD: e.target.value }), className: "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" })] }), _jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["Ng\u00E0y \u0111\u0103ng k\u00FD th\u01B0\u1EDDng tr\u00FA", _jsx("input", { type: "date", value: formData.ngayDangKyThuongTru, onChange: (e) => setFormData({
                                                        ...formData,
                                                        ngayDangKyThuongTru: e.target.value,
                                                    }), className: "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" })] })] }), _jsxs("div", { className: "grid grid-cols-3 gap-4", children: [_jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["Ng\u00E0y sinh ", _jsx("span", { className: "text-red-500", children: "*" }), _jsx("input", { type: "date", value: formData.ngaySinh, onChange: (e) => setFormData({ ...formData, ngaySinh: e.target.value }), className: "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" })] }), _jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["Gi\u1EDBi t\u00EDnh ", _jsx("span", { className: "text-red-500", children: "*" }), _jsxs("select", { value: formData.gioiTinh, onChange: (e) => setFormData({ ...formData, gioiTinh: e.target.value }), className: "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20", children: [_jsx("option", { value: "", children: "Ch\u1ECDn gi\u1EDBi t\u00EDnh" }), _jsx("option", { value: "nam", children: "Nam" }), _jsx("option", { value: "nu", children: "N\u1EEF" }), _jsx("option", { value: "khac", children: "Kh\u00E1c" })] })] }), _jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["N\u01A1i sinh ", _jsx("span", { className: "text-red-500", children: "*" }), _jsx("input", { type: "text", value: formData.noiSinh, onChange: (e) => setFormData({ ...formData, noiSinh: e.target.value }), className: "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" })] })] }), _jsxs("div", { className: "grid grid-cols-3 gap-4", children: [_jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["Nguy\u00EAn qu\u00E1n ", _jsx("span", { className: "text-red-500", children: "*" }), _jsx("input", { type: "text", value: formData.nguyenQuan, onChange: (e) => setFormData({ ...formData, nguyenQuan: e.target.value }), className: "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" })] }), _jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["D\u00E2n t\u1ED9c ", _jsx("span", { className: "text-red-500", children: "*" }), _jsx("input", { type: "text", value: formData.danToc, onChange: (e) => setFormData({ ...formData, danToc: e.target.value }), className: "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" })] }), _jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["T\u00F4n gi\u00E1o ", _jsx("span", { className: "text-red-500", children: "*" }), _jsx("input", { type: "text", value: formData.tonGiao, onChange: (e) => setFormData({ ...formData, tonGiao: e.target.value }), className: "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" })] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["Qu\u1ED1c t\u1ECBch ", _jsx("span", { className: "text-red-500", children: "*" }), _jsx("input", { type: "text", value: formData.quocTich, onChange: (e) => setFormData({ ...formData, quocTich: e.target.value }), className: "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" })] }), _jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["Quan h\u1EC7 v\u1EDBi ch\u1EE7 h\u1ED9 ", _jsx("span", { className: "text-red-500", children: "*" }), _jsxs("select", { required: true, value: formData.quanHe, onChange: (e) => setFormData({ ...formData, quanHe: e.target.value }), className: "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20", children: [_jsx("option", { value: "", children: "Ch\u1ECDn quan h\u1EC7" }), quanHeOptions.map((opt) => {
                                                            const isChuHoOption = opt.value === "chu_ho";
                                                            const disabledChuHo = isChuHoOption &&
                                                                (isCheckingCurrentHoKhau || hasChuHoForForm);
                                                            const disabledForCitizen = isChuHoOption && isCitizen;
                                                            return (_jsx("option", { value: opt.value, disabled: disabledChuHo || disabledForCitizen, children: opt.label }, opt.value));
                                                        })] }), hasChuHoForForm && (_jsx("p", { className: "mt-1 text-xs text-amber-600", children: "H\u1ED9 kh\u1EA9u n\u00E0y \u0111\u00E3 c\u00F3 ch\u1EE7 h\u1ED9." }))] })] }), _jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["\u0110\u1ECBa ch\u1EC9 th\u01B0\u1EDDng tr\u00FA tr\u01B0\u1EDBc \u0111\u00E2y", _jsx("textarea", { value: formData.diaChiThuongTruTruoc, onChange: (e) => setFormData({
                                                ...formData,
                                                diaChiThuongTruTruoc: e.target.value,
                                            }), rows: 2, className: "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" })] }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["Ngh\u1EC1 nghi\u1EC7p", _jsx("input", { type: "text", value: formData.ngheNghiep, onChange: (e) => setFormData({ ...formData, ngheNghiep: e.target.value }), className: "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" })] }), _jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["N\u01A1i l\u00E0m vi\u1EC7c", _jsx("input", { type: "text", value: formData.noiLamViec, onChange: (e) => setFormData({ ...formData, noiLamViec: e.target.value }), className: "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" })] })] }), _jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["Ghi ch\u00FA", _jsx("textarea", { value: formData.ghiChu, onChange: (e) => setFormData({ ...formData, ghiChu: e.target.value }), rows: 2, className: "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20", placeholder: "Nh\u1EADp l\u00FD do n\u1EBFu b\u1ECF tr\u1ED1ng c\u00E1c tr\u01B0\u1EDDng t\u00F9y ch\u1ECDn" })] }), _jsxs("div", { className: "flex gap-3 pt-4", children: [_jsx("button", { type: "submit", disabled: isLoading, className: "flex-1 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg disabled:opacity-50", children: isLoading ? "Đang tạo..." : "Thêm nhân khẩu" }), _jsx("button", { type: "button", onClick: () => setShowCreateForm(false), className: "rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50", children: "H\u1EE7y" })] })] })] }) })), showActivateModal && selectedHoKhau && (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto", children: _jsxs("div", { className: "w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto overflow-hidden modal-scroll", children: [_jsxs("div", { className: "mb-6 flex items-center justify-between", children: [_jsx("h2", { className: "text-xl font-bold text-gray-900", children: "K\u00EDch ho\u1EA1t h\u1ED9 kh\u1EA9u" }), _jsx("button", { onClick: () => setShowActivateModal(false), className: "rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600", children: "\u2715" })] }), _jsxs("p", { className: "mb-4 text-sm text-gray-600", children: ["Ch\u1ECDn ng\u01B0\u1EDDi l\u00E0m ch\u1EE7 h\u1ED9 cho h\u1ED9 kh\u1EA9u", " ", _jsx("strong", { children: selectedHoKhau.soHoKhau })] }), _jsx("div", { className: "space-y-2 mb-6", children: chuHoCandidates.map((nk) => (_jsxs("button", { onClick: () => handleActivate(selectedHoKhau.id, nk.id), disabled: isLoading, className: "w-full rounded-lg border border-gray-200 bg-white p-3 text-left hover:bg-gray-50 hover:border-blue-300 transition-all disabled:opacity-50", children: [_jsx("div", { className: "font-medium text-gray-900", children: nk.hoTen }), nk.cccd && (_jsxs("div", { className: "text-xs text-gray-500", children: ["CCCD: ", nk.cccd] }))] }, nk.id))) }), _jsx("button", { onClick: () => setShowActivateModal(false), className: "w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50", children: "H\u1EE7y" })] }) })), showChangeChuHoModal && selectedHoKhau && (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto", children: _jsxs("div", { className: "w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto overflow-hidden modal-scroll", children: [_jsxs("div", { className: "mb-6 flex items-center justify-between", children: [_jsx("h2", { className: "text-xl font-bold text-gray-900", children: "\u0110\u1ED5i ch\u1EE7 h\u1ED9" }), _jsx("button", { onClick: () => setShowChangeChuHoModal(false), className: "rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600", children: "\u2715" })] }), _jsxs("p", { className: "mb-4 text-sm text-gray-600", children: ["Ch\u1ECDn nh\u00E2n kh\u1EA9u m\u1EDBi l\u00E0m ch\u1EE7 h\u1ED9 cho h\u1ED9 kh\u1EA9u", " ", _jsx("strong", { children: selectedHoKhau.soHoKhau })] }), _jsx("p", { className: "mb-4 text-xs text-amber-600", children: "Ch\u1EE7 h\u1ED9 hi\u1EC7n t\u1EA1i s\u1EBD \u0111\u01B0\u1EE3c t\u1EF1 \u0111\u1ED9ng chuy\u1EC3n sang quan h\u1EC7 kh\u00E1c (m\u1EB7c \u0111\u1ECBnh l\u00E0 \"V\u1EE3/Ch\u1ED3ng\")." }), _jsx("div", { className: "space-y-2 mb-6", children: sortedNhanKhauList
                                .filter((nk) => nk.quanHe !== "chu_ho")
                                .map((nk) => (_jsxs("button", { onClick: () => handleChangeChuHo(nk.id), disabled: isLoading, className: "w-full rounded-lg border border-gray-200 bg-white p-3 text-left hover:bg-gray-50 hover:border-blue-300 transition-all disabled:opacity-50", children: [_jsx("div", { className: "font-medium text-gray-900", children: nk.hoTen }), nk.cccd && (_jsxs("div", { className: "text-xs text-gray-500", children: ["CCCD: ", nk.cccd] })), _jsx("div", { className: "text-xs text-gray-500", children: quanHeOptions.find((opt) => opt.value === nk.quanHe)
                                            ?.label || nk.quanHe })] }, nk.id))) }), sortedNhanKhauList.filter((nk) => nk.quanHe !== "chu_ho").length ===
                            0 && (_jsx("p", { className: "mb-4 text-sm text-gray-500 text-center", children: "Kh\u00F4ng c\u00F3 nh\u00E2n kh\u1EA9u n\u00E0o kh\u00E1c \u0111\u1EC3 ch\u1ECDn l\u00E0m ch\u1EE7 h\u1ED9." })), _jsx("button", { onClick: () => setShowChangeChuHoModal(false), className: "w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50", children: "H\u1EE7y" })] }) })), _jsxs("div", { className: "rounded-xl border border-gray-200 bg-white shadow-sm", children: [_jsx("div", { className: "border-b border-gray-200 p-4", children: _jsxs("h2", { className: "text-lg font-semibold text-gray-900", children: ["Danh s\u00E1ch nh\u00E2n kh\u1EA9u (", nhanKhauList.length, ")", selectedHoKhau && (_jsxs("span", { className: "ml-2 text-sm font-normal text-gray-500", children: ["- H\u1ED9 kh\u1EA9u: ", selectedHoKhau.soHoKhau] }))] }) }), isLoading && nhanKhauList.length === 0 ? (_jsx("div", { className: "p-8 text-center text-gray-500", children: "\u0110ang t\u1EA3i..." })) : !selectedHoKhauId ? (_jsx("div", { className: "p-8 text-center text-gray-500", children: "Vui l\u00F2ng ch\u1ECDn h\u1ED9 kh\u1EA9u \u0111\u1EC3 xem danh s\u00E1ch nh\u00E2n kh\u1EA9u" })) : nhanKhauList.length === 0 ? (_jsx("div", { className: "p-8 text-center text-gray-500", children: "Ch\u01B0a c\u00F3 nh\u00E2n kh\u1EA9u n\u00E0o trong h\u1ED9 kh\u1EA9u n\u00E0y. H\u00E3y th\u00EAm nh\u00E2n kh\u1EA9u m\u1EDBi!" })) : (_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full", children: [_jsx("thead", { className: "bg-gray-50", children: _jsxs("tr", { children: [_jsx("th", { className: "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700", children: "H\u1ECD t\u00EAn" }), _jsx("th", { className: "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700", children: "CCCD" }), _jsx("th", { className: "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700", children: "Quan h\u1EC7" }), _jsx("th", { className: "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700", children: "Gi\u1EDBi t\u00EDnh" }), _jsx("th", { className: "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700", children: "Ng\u00E0y sinh" }), _jsx("th", { className: "px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-700", children: "Thao t\u00E1c" })] }) }), _jsx("tbody", { className: "divide-y divide-gray-200", children: sortedNhanKhauList.map((nk) => (_jsxs("tr", { className: `hover:bg-gray-50 ${isChuHo(nk) ? "bg-blue-50/50" : ""}`, children: [_jsxs("td", { className: "px-4 py-3 text-sm font-medium text-gray-900", children: [nk.hoTen, isChuHo(nk) && (_jsx("span", { className: "ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700", children: "Ch\u1EE7 h\u1ED9" }))] }), _jsx("td", { className: "px-4 py-3 text-sm text-gray-600", children: nk.cccd || "-" }), _jsx("td", { className: "px-4 py-3 text-sm text-gray-600", children: quanHeOptions.find((opt) => opt.value === nk.quanHe)
                                                    ?.label || nk.quanHe }), _jsx("td", { className: "px-4 py-3 text-sm text-gray-600", children: nk.gioiTinh === "nam"
                                                    ? "Nam"
                                                    : nk.gioiTinh === "nu"
                                                        ? "Nữ"
                                                        : nk.gioiTinh === "khac"
                                                            ? "Khác"
                                                            : "-" }), _jsx("td", { className: "px-4 py-3 text-sm text-gray-600", children: nk.ngaySinh
                                                    ? formatFromYMD(nk.ngaySinh)
                                                    : "-" }), _jsx("td", { className: "px-4 py-3 text-right text-sm text-gray-600 space-x-2", children: _jsx("button", { onClick: () => openViewNhanKhau(nk.id), className: "rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:border-blue-300 hover:text-blue-600", title: "Xem/S\u1EEDa", children: "\uD83D\uDC41 Xem" }) })] }, nk.id))) })] }) }))] })] }));
}
