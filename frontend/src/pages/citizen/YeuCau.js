import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import RequestModal from "../../components/RequestModal.jsx";
import SplitHouseholdRequestModal from "../../components/SplitHouseholdRequestModal";
import { apiService } from "../../services/api";
const requestTypeLabels = {
    ADD_PERSON: "Thêm nhân khẩu",
    ADD_NEWBORN: "Thêm con sơ sinh",
    TAM_VANG: "Xin tạm vắng",
    TAM_TRU: "Xin tạm trú",
    TACH_HO_KHAU: "Yêu cầu tách hộ khẩu",
    SUA_NHAN_KHAU: "Sửa thông tin nhân khẩu",
    XOA_NHAN_KHAU: "Xoá nhân khẩu",
};
const statusLabels = {
    PENDING: "Chờ duyệt",
    APPROVED: "Đã duyệt",
    REJECTED: "Từ chối",
    pending: "Chờ duyệt",
    approved: "Đã duyệt",
    rejected: "Từ chối",
    processing: "Đang xử lý",
};
const statusColors = {
    PENDING: "bg-yellow-100 text-yellow-700",
    APPROVED: "bg-green-100 text-green-700",
    REJECTED: "bg-red-100 text-red-700",
    pending: "bg-yellow-100 text-yellow-700",
    approved: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
    processing: "bg-blue-100 text-blue-700",
};
export default function YeuCau() {
    const [selectedType, setSelectedType] = useState(null);
    const [showAddNewbornModal, setShowAddNewbornModal] = useState(false);
    const [showAddPersonModal, setShowAddPersonModal] = useState(false);
    const [userInfo, setUserInfo] = useState(null);
    const [nhanKhauList, setNhanKhauList] = useState([]);
    const [householdInfo, setHouseholdInfo] = useState(null);
    const [households, setHouseholds] = useState([]);
    const [requests, setRequests] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingHousehold, setIsLoadingHousehold] = useState(false);
    const [success, setSuccess] = useState(null);
    useEffect(() => {
        loadUserInfo();
        loadHouseholdData();
        loadHouseholds();
        loadRequests();
    }, []);
    const loadUserInfo = async () => {
        try {
            const response = await apiService.getMe();
            if (response.success) {
                setUserInfo(response.data);
            }
        }
        catch (err) {
            console.error("Lỗi khi tải thông tin user:", err);
        }
    };
    const loadHouseholds = async () => {
        try {
            const response = await apiService.getCitizenHouseholds();
            if (response.success) {
                setHouseholds(response.data || []);
            }
        }
        catch (err) {
            console.error("Lỗi khi tải danh sách hộ khẩu:", err);
        }
    };
    // Load household data khi mở modal tách hộ khẩu hoặc thêm con sơ sinh
    useEffect(() => {
        if ((selectedType === "TACH_HO_KHAU" || selectedType === "ADD_NEWBORN") && !householdInfo) {
            loadHouseholdData();
        }
    }, [selectedType]);
    const loadHouseholdData = async () => {
        setIsLoadingHousehold(true);
        try {
            // TODO: Thay bằng getMyHousehold() khi backend có endpoint /citizen/my-household
            const response = await apiService.getMyHousehold();
            if (response.success && response.data) {
                // Adapt data structure
                const householdData = response.data.hoKhau || response.data.household;
                const members = response.data.nhanKhauList || response.data.members || [];
                setNhanKhauList(members.map((nk) => ({
                    id: nk.id,
                    hoTen: nk.hoTen,
                    cccd: nk.cccd,
                    quanHe: nk.quanHe,
                })));
                setHouseholdInfo({
                    id: householdData.id,
                    soHoKhau: householdData.soHoKhau,
                    diaChi: householdData.diaChi,
                    diaChiDayDu: householdData.diaChiDayDu,
                    chuHo: householdData.chuHo || response.data.chuHo,
                });
            }
        }
        catch (err) {
            console.error("Failed to load household data:", err);
        }
        finally {
            setIsLoadingHousehold(false);
        }
    };
    const loadRequests = async () => {
        setIsLoading(true);
        try {
            const response = await apiService.getMyRequests();
            if (response.success) {
                setRequests(response.data || []);
            }
        }
        catch (err) {
            console.error("Failed to load requests:", err);
        }
        finally {
            setIsLoading(false);
        }
    };
    const handleSubmitRequest = async (data) => {
        // Map UI type to backend enum
        const typeMapping = {
            TAM_TRU: "TEMPORARY_RESIDENCE",
            TAM_VANG: "TEMPORARY_ABSENCE",
            TACH_HO_KHAU: "SPLIT_HOUSEHOLD",
            SUA_NHAN_KHAU: "UPDATE_PERSON",
            DECEASED: "DECEASED",
            MOVE_OUT: "MOVE_OUT",
        };
        const backendType = typeMapping[data.type] || data.type;
        const targetPersonId = (data.payload?.nhanKhauId || data.payload?.targetPersonId || null);
        const response = await apiService.createRequest({
            type: backendType,
            payload: data.payload,
            targetHouseholdId: backendType === "TEMPORARY_RESIDENCE" || backendType === "TEMPORARY_ABSENCE"
                ? householdInfo?.id
                : undefined,
            targetPersonId: backendType === "TEMPORARY_RESIDENCE" ||
                backendType === "TEMPORARY_ABSENCE" ||
                backendType === "DECEASED" ||
                backendType === "MOVE_OUT" ||
                backendType === "UPDATE_PERSON"
                ? (targetPersonId || undefined)
                : undefined,
        });
        if (response.success) {
            setSuccess("Gửi yêu cầu thành công!");
            setTimeout(() => setSuccess(null), 3000);
            loadRequests();
        }
        else {
            throw new Error(response.error?.message || "Gửi yêu cầu thất bại");
        }
    };
    const handleSubmitSplitHousehold = async (data) => {
        try {
            // TODO: Thay bằng createSplitHouseholdRequest() khi backend có endpoint /citizen/requests/split-household
            const response = await apiService.createSplitHouseholdRequest(data);
            if (response.success) {
                setSuccess("Gửi yêu cầu tách hộ khẩu thành công!");
                setTimeout(() => setSuccess(null), 3000);
                loadRequests();
            }
            else {
                throw new Error(response.error?.message || "Gửi yêu cầu thất bại");
            }
        }
        catch (err) {
            throw err;
        }
    };
    const handleSubmitAddNewborn = async (data) => {
        try {
            const payload = {
                type: "ADD_NEWBORN",
                targetHouseholdId: data.householdId,
                payload: {
                    newborn: {
                        hoTen: data.hoTen,
                        ngaySinh: data.ngaySinh,
                        gioiTinh: data.gioiTinh,
                        noiSinh: data.noiSinh,
                        nguyenQuan: data.nguyenQuan || undefined,
                        danToc: data.danToc || undefined,
                        tonGiao: data.tonGiao || undefined,
                        quocTich: data.quocTich || undefined,
                        cccd: data.cccd || undefined,
                        ghiChu: data.ghiChu || undefined,
                        isMoiSinh: true,
                    }
                }
            };
            const response = await apiService.createRequest(payload);
            if (response.success) {
                setSuccess("Gửi yêu cầu thêm con sơ sinh thành công!");
                setTimeout(() => setSuccess(null), 3000);
                loadRequests();
                setShowAddNewbornModal(false);
            }
            else {
                throw new Error(response.error?.message || "Gửi yêu cầu thất bại");
            }
        }
        catch (err) {
            throw err;
        }
    };
    const handleSubmitAddPerson = async (data) => {
        try {
            const payload = {
                type: "ADD_PERSON",
                payload: {
                    person: {
                        hoTen: data.hoTen,
                        cccd: data.cccd || undefined,
                        ngaySinh: data.ngaySinh,
                        gioiTinh: data.gioiTinh,
                        noiSinh: data.noiSinh,
                        nguyenQuan: data.nguyenQuan || undefined,
                        danToc: data.danToc || undefined,
                        tonGiao: data.tonGiao || undefined,
                        quocTich: data.quocTich || "Việt Nam",
                        ngayDangKyThuongTru: data.ngayDangKyThuongTru || undefined,
                        diaChiThuongTruTruoc: data.diaChiThuongTruTruoc || undefined,
                        ngheNghiep: data.ngheNghiep || undefined,
                        noiLamViec: data.noiLamViec || undefined,
                        ghiChu: data.ghiChu || undefined,
                    }
                }
            };
            // Chỉ thêm targetHouseholdId nếu có giá trị và không phải empty string
            if (data.householdId && data.householdId !== "") {
                payload.targetHouseholdId = parseInt(data.householdId);
            }
            // Thêm quanHe nếu user chưa linked
            if (!userInfo?.linked && data.quanHe) {
                payload.payload.person.quanHe = data.quanHe;
            }
            const response = await apiService.createRequest(payload);
            if (response.success) {
                setSuccess("Gửi yêu cầu thêm nhân khẩu thành công!");
                setTimeout(() => setSuccess(null), 3000);
                loadRequests();
                setShowAddPersonModal(false);
            }
            else {
                throw new Error(response.error?.message || "Gửi yêu cầu thất bại");
            }
        }
        catch (err) {
            throw err;
        }
    };
    const requestTypes = [
        { type: "ADD_PERSON", label: "Thêm nhân khẩu", icon: "👤" },
        { type: "ADD_NEWBORN", label: "Thêm con sơ sinh", icon: "👶" },
        { type: "TAM_VANG", label: "Xin tạm vắng", icon: "📍" },
        { type: "TAM_TRU", label: "Xin tạm trú", icon: "🏠" },
        { type: "TACH_HO_KHAU", label: "Yêu cầu tách hộ khẩu", icon: "🔄" },
        { type: "SUA_NHAN_KHAU", label: "Sửa thông tin nhân khẩu", icon: "✏️" },
    ];
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "rounded-xl border border-blue-200/60 bg-gradient-to-r from-blue-50 via-cyan-50 to-teal-50 p-6 shadow-sm backdrop-blur-sm", children: [_jsx("h1", { className: "text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent", children: "T\u1EA1o y\u00EAu c\u1EA7u" }), _jsx("p", { className: "mt-2 text-gray-600", children: "Ch\u1ECDn lo\u1EA1i y\u00EAu c\u1EA7u b\u1EA1n mu\u1ED1n g\u1EEDi \u0111\u1EBFn t\u1ED5 d\u00E2n ph\u1ED1" })] }), success && (_jsx("div", { className: "rounded-lg bg-green-50 border border-green-200 p-4 text-green-700", children: success })), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", children: requestTypes.map((item) => (_jsxs("button", { onClick: () => {
                        if (item.type === "ADD_NEWBORN") {
                            setShowAddNewbornModal(true);
                        }
                        else if (item.type === "ADD_PERSON") {
                            setShowAddPersonModal(true);
                        }
                        else {
                            setSelectedType(item.type);
                        }
                    }, className: "rounded-xl border border-gray-200/80 bg-white p-6 shadow-sm hover:shadow-lg hover:border-blue-300 transition-all duration-300 hover:-translate-y-1 text-left group", children: [_jsx("div", { className: "text-4xl mb-3 group-hover:scale-110 transition-transform", children: item.icon }), _jsx("h3", { className: "text-lg font-semibold text-gray-900 mb-2", children: item.label }), _jsx("p", { className: "text-sm text-gray-500", children: "Nh\u1EA5n \u0111\u1EC3 t\u1EA1o y\u00EAu c\u1EA7u m\u1EDBi" })] }, item.type))) }), _jsxs("div", { className: "rounded-xl border border-gray-200/80 bg-white p-6 shadow-sm", children: [_jsxs("h2", { className: "text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2", children: [_jsx("span", { children: "\uD83D\uDCCB" }), "Y\u00EAu c\u1EA7u c\u1EE7a t\u00F4i"] }), isLoading ? (_jsxs("div", { className: "text-center py-8", children: [_jsx("div", { className: "inline-block h-6 w-6 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent" }), _jsx("p", { className: "mt-2 text-gray-600", children: "\u0110ang t\u1EA3i..." })] })) : requests.length === 0 ? (_jsx("p", { className: "text-gray-500 text-center py-8", children: "B\u1EA1n ch\u01B0a c\u00F3 y\u00EAu c\u1EA7u n\u00E0o." })) : (_jsx("div", { className: "space-y-3", children: requests.map((request) => (_jsx("div", { className: "rounded-lg border border-gray-200 bg-gray-50 p-4 hover:bg-gray-100 transition-colors", children: _jsxs("div", { className: "flex items-start justify-between", children: [_jsxs("div", { className: "flex-1", children: [_jsx("h4", { className: "font-semibold text-gray-900 mb-1", children: requestTypeLabels[request.type] || request.type }), _jsxs("p", { className: "text-sm text-gray-600 mb-2", children: ["Ng\u00E0y g\u1EEDi:", " ", new Date(request.createdAt).toLocaleDateString("vi-VN", {
                                                        year: "numeric",
                                                        month: "long",
                                                        day: "numeric",
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                    })] }), request.payload?.lyDo && (_jsxs("p", { className: "text-sm text-gray-700", children: [_jsx("span", { className: "font-medium", children: "L\u00FD do:" }), " ", request.payload.lyDo] })), request.status === "REJECTED" && request.rejectionReason && (_jsxs("p", { className: "text-sm text-red-700", children: [_jsx("span", { className: "font-medium", children: "L\u00FD do t\u1EEB ch\u1ED1i:" }), " ", request.rejectionReason] })), request.status === "APPROVED" && request.reviewedAt && (_jsxs("p", { className: "text-sm text-green-700", children: [_jsx("span", { className: "font-medium", children: "\u0110\u00E3 duy\u1EC7t:" }), " ", new Date(request.reviewedAt).toLocaleDateString("vi-VN")] }))] }), _jsx("span", { className: `px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${statusColors[request.status] || "bg-gray-100 text-gray-700"}`, children: statusLabels[request.status] || request.status })] }) }, request.id))) }))] }), _jsx(RequestModal, { isOpen: selectedType !== null && selectedType !== "TACH_HO_KHAU", type: selectedType && selectedType !== "TACH_HO_KHAU" ? selectedType : null, onClose: () => setSelectedType(null), onSubmit: handleSubmitRequest, nhanKhauList: nhanKhauList.map((nk) => ({ id: nk.id, hoTen: nk.hoTen })), householdInfo: householdInfo ? {
                    soHoKhau: householdInfo.soHoKhau,
                    diaChi: householdInfo.diaChiDayDu || householdInfo.diaChi,
                } : undefined }), _jsx(SplitHouseholdRequestModal, { isOpen: selectedType === "TACH_HO_KHAU", onClose: () => setSelectedType(null), onSubmit: handleSubmitSplitHousehold, household: householdInfo, nhanKhauList: nhanKhauList, isLoading: isLoadingHousehold }), showAddNewbornModal && (_jsx(AddNewbornModal, { isOpen: showAddNewbornModal, onClose: () => setShowAddNewbornModal(false), onSubmit: handleSubmitAddNewborn, householdInfo: householdInfo })), showAddPersonModal && (_jsx(AddPersonModal, { isOpen: showAddPersonModal, onClose: () => setShowAddPersonModal(false), onSubmit: handleSubmitAddPerson, householdInfo: householdInfo, userInfo: userInfo, households: households }))] }));
}
function AddPersonModal({ isOpen, onClose, onSubmit, householdInfo, userInfo, households }) {
    const [formData, setFormData] = useState({
        householdId: "",
        hoTen: "",
        cccd: "",
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
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const isUserLinked = userInfo?.linked === true;
    useEffect(() => {
        if (isOpen) {
            if (isUserLinked && householdInfo) {
                // User đã linked, tự động điền household của họ
                setFormData(prev => ({
                    ...prev,
                    householdId: householdInfo.id.toString(),
                }));
            }
            else {
                // User chưa linked, để trống householdId
                setFormData(prev => ({
                    ...prev,
                    householdId: "",
                }));
            }
        }
    }, [isOpen, householdInfo, isUserLinked]);
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        // Validation
        const requiredFields = ["hoTen", "ngaySinh", "gioiTinh", "noiSinh"];
        if (isUserLinked) {
            requiredFields.push("quanHe");
        }
        const missingFields = requiredFields.filter(field => !formData[field]);
        if (missingFields.length > 0) {
            setError(`Vui lòng điền đầy đủ các trường bắt buộc: ${missingFields.join(", ")}`);
            return;
        }
        // Nếu user chưa linked, quanHe là bắt buộc
        if (!isUserLinked && !formData.quanHe) {
            setError("Vui lòng chọn quan hệ với chủ hộ");
            return;
        }
        setIsSubmitting(true);
        try {
            await onSubmit(formData);
        }
        catch (err) {
            setError(err.message || "Có lỗi xảy ra");
        }
        finally {
            setIsSubmitting(false);
        }
    };
    if (!isOpen)
        return null;
    return (_jsx("div", { className: "fixed inset-0 z-[120] flex min-h-screen w-screen items-center justify-center bg-black/50 backdrop-blur-sm p-4", children: _jsxs("div", { className: "w-full max-w-2xl rounded-xl border border-gray-200 bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto", children: [_jsxs("div", { className: "mb-4 flex items-center justify-between", children: [_jsx("h3", { className: "text-lg font-semibold text-gray-900", children: "Th\u00EAm nh\u00E2n kh\u1EA9u" }), _jsx("button", { onClick: onClose, className: "rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600", children: "\u2715" })] }), error && (_jsx("div", { className: "mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700", children: error })), _jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [_jsxs("div", { children: [_jsxs("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: ["H\u1ED9 kh\u1EA9u ", isUserLinked && _jsx("span", { className: "text-red-500", children: "*" })] }), isUserLinked ? (_jsx("input", { type: "text", value: `${householdInfo?.soHoKhau || ""} - ${householdInfo?.diaChi || ""}`, disabled: true, className: "w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm" })) : (_jsxs("div", { className: "space-y-2", children: [_jsxs("select", { value: formData.householdId, onChange: (e) => setFormData({ ...formData, householdId: e.target.value }), className: "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20", children: [_jsx("option", { value: "", children: "Ch\u1ECDn h\u1ED9 kh\u1EA9u (t\u00F9y ch\u1ECDn)" }), households.map((household) => (_jsxs("option", { value: household.id, children: [household.soHoKhau, " - ", household.diaChi] }, household.id)))] }), _jsx("p", { className: "text-xs text-gray-500", children: "Ch\u1ECDn h\u1ED9 kh\u1EA9u b\u1EA1n mu\u1ED1n gia nh\u1EADp. N\u1EBFu kh\u00F4ng c\u00F3 h\u1ED9 kh\u1EA9u ph\u00F9 h\u1EE3p, \u0111\u1EC3 tr\u1ED1ng v\u00E0 t\u1ED5 tr\u01B0\u1EDFng s\u1EBD x\u1EED l\u00FD." })] }))] }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsxs("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: ["H\u1ECD v\u00E0 t\u00EAn ", _jsx("span", { className: "text-red-500", children: "*" })] }), _jsx("input", { type: "text", required: true, value: formData.hoTen, onChange: (e) => setFormData({ ...formData, hoTen: e.target.value }), className: "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20", placeholder: "Nh\u1EADp h\u1ECD v\u00E0 t\u00EAn" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "CCCD/CMND" }), _jsx("input", { type: "text", value: formData.cccd, onChange: (e) => setFormData({ ...formData, cccd: e.target.value }), className: "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20", placeholder: "Nh\u1EADp s\u1ED1 CCCD n\u1EBFu c\u00F3" })] })] }), _jsxs("div", { className: "grid grid-cols-3 gap-4", children: [_jsxs("div", { children: [_jsxs("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: ["Ng\u00E0y sinh ", _jsx("span", { className: "text-red-500", children: "*" })] }), _jsx("input", { type: "date", required: true, value: formData.ngaySinh, onChange: (e) => setFormData({ ...formData, ngaySinh: e.target.value }), className: "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" })] }), _jsxs("div", { children: [_jsxs("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: ["Gi\u1EDBi t\u00EDnh ", _jsx("span", { className: "text-red-500", children: "*" })] }), _jsxs("select", { required: true, value: formData.gioiTinh, onChange: (e) => setFormData({ ...formData, gioiTinh: e.target.value }), className: "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20", children: [_jsx("option", { value: "", children: "Ch\u1ECDn gi\u1EDBi t\u00EDnh" }), _jsx("option", { value: "nam", children: "Nam" }), _jsx("option", { value: "nu", children: "N\u1EEF" }), _jsx("option", { value: "khac", children: "Kh\u00E1c" })] })] }), _jsxs("div", { children: [_jsxs("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: ["Quan h\u1EC7 ", _jsx("span", { className: "text-red-500", children: "*" })] }), _jsxs("select", { required: true, value: formData.quanHe, onChange: (e) => setFormData({ ...formData, quanHe: e.target.value }), className: "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20", children: [_jsx("option", { value: "", children: "Ch\u1ECDn quan h\u1EC7" }), _jsx("option", { value: "chu_ho", children: "Ch\u1EE7 h\u1ED9" }), _jsx("option", { value: "vo_chong", children: "V\u1EE3/Ch\u1ED3ng" }), _jsx("option", { value: "con", children: "Con" }), _jsx("option", { value: "cha_me", children: "Cha/M\u1EB9" }), _jsx("option", { value: "anh_chi_em", children: "Anh/Ch\u1ECB/Em" }), _jsx("option", { value: "ong_ba", children: "\u00D4ng/B\u00E0" }), _jsx("option", { value: "chau", children: "Ch\u00E1u" }), _jsx("option", { value: "khac", children: "Kh\u00E1c" })] })] })] }), _jsxs("div", { children: [_jsxs("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: ["N\u01A1i sinh ", _jsx("span", { className: "text-red-500", children: "*" })] }), _jsx("input", { type: "text", required: true, value: formData.noiSinh, onChange: (e) => setFormData({ ...formData, noiSinh: e.target.value }), className: "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20", placeholder: "Nh\u1EADp n\u01A1i sinh" })] }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Nguy\u00EAn qu\u00E1n" }), _jsx("input", { type: "text", value: formData.nguyenQuan, onChange: (e) => setFormData({ ...formData, nguyenQuan: e.target.value }), className: "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20", placeholder: "Nh\u1EADp nguy\u00EAn qu\u00E1n" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "D\u00E2n t\u1ED9c" }), _jsx("input", { type: "text", value: formData.danToc, onChange: (e) => setFormData({ ...formData, danToc: e.target.value }), className: "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20", placeholder: "V\u00ED d\u1EE5: Kinh, T\u00E0y..." })] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "T\u00F4n gi\u00E1o" }), _jsx("input", { type: "text", value: formData.tonGiao, onChange: (e) => setFormData({ ...formData, tonGiao: e.target.value }), className: "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20", placeholder: "V\u00ED d\u1EE5: Kh\u00F4ng, Ph\u1EADt gi\u00E1o..." })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Qu\u1ED1c t\u1ECBch" }), _jsx("input", { type: "text", value: formData.quocTich, onChange: (e) => setFormData({ ...formData, quocTich: e.target.value }), className: "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20", placeholder: "V\u00ED d\u1EE5: Vi\u1EC7t Nam" })] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Ngh\u1EC1 nghi\u1EC7p" }), _jsx("input", { type: "text", value: formData.ngheNghiep, onChange: (e) => setFormData({ ...formData, ngheNghiep: e.target.value }), className: "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20", placeholder: "Nh\u1EADp ngh\u1EC1 nghi\u1EC7p" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "N\u01A1i l\u00E0m vi\u1EC7c" }), _jsx("input", { type: "text", value: formData.noiLamViec, onChange: (e) => setFormData({ ...formData, noiLamViec: e.target.value }), className: "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20", placeholder: "Nh\u1EADp n\u01A1i l\u00E0m vi\u1EC7c" })] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Ng\u00E0y \u0111\u0103ng k\u00FD th\u01B0\u1EDDng tr\u00FA" }), _jsx("input", { type: "date", value: formData.ngayDangKyThuongTru, onChange: (e) => setFormData({ ...formData, ngayDangKyThuongTru: e.target.value }), className: "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "\u0110\u1ECBa ch\u1EC9 th\u01B0\u1EDDng tr\u00FA tr\u01B0\u1EDBc \u0111\u00E2y" }), _jsx("input", { type: "text", value: formData.diaChiThuongTruTruoc, onChange: (e) => setFormData({ ...formData, diaChiThuongTruTruoc: e.target.value }), className: "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20", placeholder: "Nh\u1EADp \u0111\u1ECBa ch\u1EC9 tr\u01B0\u1EDBc \u0111\u00E2y" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Ghi ch\u00FA" }), _jsx("textarea", { value: formData.ghiChu, onChange: (e) => setFormData({ ...formData, ghiChu: e.target.value }), rows: 3, className: "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20", placeholder: "Th\u00F4ng tin b\u1ED5 sung n\u1EBFu c\u00F3..." })] }), _jsxs("div", { className: "flex gap-3 pt-4", children: [_jsx("button", { type: "submit", disabled: isSubmitting, className: "flex-1 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg disabled:opacity-50", children: isSubmitting ? "Đang gửi..." : "Gửi yêu cầu" }), _jsx("button", { type: "button", onClick: onClose, className: "rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50", children: "H\u1EE7y" })] })] })] }) }));
}
function AddNewbornModal({ isOpen, onClose, onSubmit, householdInfo }) {
    const [formData, setFormData] = useState({
        householdId: "",
        hoTen: "",
        ngaySinh: "",
        gioiTinh: "",
        noiSinh: "",
        nguyenQuan: "",
        danToc: "",
        tonGiao: "",
        quocTich: "Việt Nam",
        cccd: "",
        ghiChu: "",
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    useEffect(() => {
        if (isOpen && householdInfo) {
            setFormData(prev => ({
                ...prev,
                householdId: householdInfo.id.toString(),
            }));
        }
    }, [isOpen, householdInfo]);
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        // Validation
        if (!formData.hoTen || !formData.ngaySinh || !formData.gioiTinh || !formData.noiSinh) {
            setError("Vui lòng điền đầy đủ các trường bắt buộc");
            return;
        }
        setIsSubmitting(true);
        try {
            await onSubmit(formData);
        }
        catch (err) {
            setError(err.message || "Có lỗi xảy ra");
        }
        finally {
            setIsSubmitting(false);
        }
    };
    if (!isOpen)
        return null;
    return (_jsx("div", { className: "fixed inset-0 z-[120] flex min-h-screen w-screen items-center justify-center bg-black/50 backdrop-blur-sm p-4", children: _jsxs("div", { className: "w-full max-w-2xl rounded-xl border border-gray-200 bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto", children: [_jsxs("div", { className: "mb-4 flex items-center justify-between", children: [_jsx("h3", { className: "text-lg font-semibold text-gray-900", children: "Th\u00EAm con s\u01A1 sinh" }), _jsx("button", { onClick: onClose, className: "rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600", children: "\u2715" })] }), error && (_jsx("div", { className: "mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700", children: error })), _jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [_jsxs("div", { children: [_jsxs("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: ["H\u1ED9 kh\u1EA9u ", _jsx("span", { className: "text-red-500", children: "*" })] }), _jsx("input", { type: "text", value: `${householdInfo?.soHoKhau || ""} - ${householdInfo?.diaChi || ""}`, disabled: true, className: "w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm" })] }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsxs("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: ["H\u1ECD v\u00E0 t\u00EAn ", _jsx("span", { className: "text-red-500", children: "*" })] }), _jsx("input", { type: "text", required: true, value: formData.hoTen, onChange: (e) => setFormData({ ...formData, hoTen: e.target.value }), className: "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20", placeholder: "Nh\u1EADp h\u1ECD v\u00E0 t\u00EAn" })] }), _jsxs("div", { children: [_jsxs("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: ["Ng\u00E0y sinh ", _jsx("span", { className: "text-red-500", children: "*" })] }), _jsx("input", { type: "date", required: true, value: formData.ngaySinh, onChange: (e) => setFormData({ ...formData, ngaySinh: e.target.value }), className: "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" })] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsxs("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: ["Gi\u1EDBi t\u00EDnh ", _jsx("span", { className: "text-red-500", children: "*" })] }), _jsxs("select", { required: true, value: formData.gioiTinh, onChange: (e) => setFormData({ ...formData, gioiTinh: e.target.value }), className: "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20", children: [_jsx("option", { value: "", children: "Ch\u1ECDn gi\u1EDBi t\u00EDnh" }), _jsx("option", { value: "nam", children: "Nam" }), _jsx("option", { value: "nu", children: "N\u1EEF" }), _jsx("option", { value: "khac", children: "Kh\u00E1c" })] })] }), _jsxs("div", { children: [_jsxs("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: ["N\u01A1i sinh ", _jsx("span", { className: "text-red-500", children: "*" })] }), _jsx("input", { type: "text", required: true, value: formData.noiSinh, onChange: (e) => setFormData({ ...formData, noiSinh: e.target.value }), className: "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20", placeholder: "Nh\u1EADp n\u01A1i sinh" })] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Nguy\u00EAn qu\u00E1n" }), _jsx("input", { type: "text", value: formData.nguyenQuan, onChange: (e) => setFormData({ ...formData, nguyenQuan: e.target.value }), className: "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20", placeholder: "Nh\u1EADp nguy\u00EAn qu\u00E1n" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "D\u00E2n t\u1ED9c" }), _jsx("input", { type: "text", value: formData.danToc, onChange: (e) => setFormData({ ...formData, danToc: e.target.value }), className: "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20", placeholder: "V\u00ED d\u1EE5: Kinh, T\u00E0y..." })] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "T\u00F4n gi\u00E1o" }), _jsx("input", { type: "text", value: formData.tonGiao, onChange: (e) => setFormData({ ...formData, tonGiao: e.target.value }), className: "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20", placeholder: "V\u00ED d\u1EE5: Kh\u00F4ng, Ph\u1EADt gi\u00E1o..." })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Qu\u1ED1c t\u1ECBch" }), _jsx("input", { type: "text", value: formData.quocTich, onChange: (e) => setFormData({ ...formData, quocTich: e.target.value }), className: "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20", placeholder: "V\u00ED d\u1EE5: Vi\u1EC7t Nam" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "CCCD/CMND (n\u1EBFu c\u00F3)" }), _jsx("input", { type: "text", value: formData.cccd, onChange: (e) => setFormData({ ...formData, cccd: e.target.value }), className: "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20", placeholder: "Nh\u1EADp s\u1ED1 CCCD n\u1EBFu \u0111\u00E3 c\u00F3" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Ghi ch\u00FA" }), _jsx("textarea", { value: formData.ghiChu, onChange: (e) => setFormData({ ...formData, ghiChu: e.target.value }), rows: 3, className: "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20", placeholder: "Th\u00F4ng tin b\u1ED5 sung n\u1EBFu c\u00F3..." })] }), _jsxs("div", { className: "flex gap-3 pt-4", children: [_jsx("button", { type: "submit", disabled: isSubmitting, className: "flex-1 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg disabled:opacity-50", children: isSubmitting ? "Đang gửi..." : "Gửi yêu cầu" }), _jsx("button", { type: "button", onClick: onClose, className: "rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50", children: "H\u1EE7y" })] })] })] }) }));
}
