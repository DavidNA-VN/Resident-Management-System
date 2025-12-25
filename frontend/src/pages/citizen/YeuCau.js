import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import RequestModal from "../../components/RequestModal";
import SplitHouseholdRequestModal from "../../components/SplitHouseholdRequestModal";
import { apiService } from "../../services/api";
const requestTypeLabels = {
    TAM_VANG: "Xin tạm vắng",
    TAM_TRU: "Xin tạm trú",
    TACH_HO_KHAU: "Yêu cầu tách hộ khẩu",
    SUA_NHAN_KHAU: "Sửa thông tin nhân khẩu",
    XOA_NHAN_KHAU: "Xoá nhân khẩu",
};
const statusLabels = {
    pending: "Chờ duyệt",
    approved: "Đã duyệt",
    rejected: "Từ chối",
    processing: "Đang xử lý",
};
const statusColors = {
    pending: "bg-yellow-100 text-yellow-700",
    approved: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
    processing: "bg-blue-100 text-blue-700",
};
export default function YeuCau() {
    const [selectedType, setSelectedType] = useState(null);
    const [nhanKhauList, setNhanKhauList] = useState([]);
    const [householdInfo, setHouseholdInfo] = useState(null);
    const [requests, setRequests] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingHousehold, setIsLoadingHousehold] = useState(false);
    const [success, setSuccess] = useState(null);
    useEffect(() => {
        loadHouseholdData();
        loadRequests();
    }, []);
    // Load household data khi mở modal tách hộ khẩu
    useEffect(() => {
        if (selectedType === "TACH_HO_KHAU" && !householdInfo) {
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
        const response = await apiService.createRequest(data);
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
    const requestTypes = [
        { type: "TAM_VANG", label: "Xin tạm vắng", icon: "📍" },
        { type: "TAM_TRU", label: "Xin tạm trú", icon: "🏠" },
        { type: "TACH_HO_KHAU", label: "Yêu cầu tách hộ khẩu", icon: "🔄" },
        { type: "SUA_NHAN_KHAU", label: "Sửa thông tin nhân khẩu", icon: "✏️" },
        { type: "XOA_NHAN_KHAU", label: "Xoá nhân khẩu", icon: "🗑️" },
    ];
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "rounded-xl border border-blue-200/60 bg-gradient-to-r from-blue-50 via-cyan-50 to-teal-50 p-6 shadow-sm backdrop-blur-sm", children: [_jsx("h1", { className: "text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent", children: "T\u1EA1o y\u00EAu c\u1EA7u" }), _jsx("p", { className: "mt-2 text-gray-600", children: "Ch\u1ECDn lo\u1EA1i y\u00EAu c\u1EA7u b\u1EA1n mu\u1ED1n g\u1EEDi \u0111\u1EBFn t\u1ED5 d\u00E2n ph\u1ED1" })] }), success && (_jsx("div", { className: "rounded-lg bg-green-50 border border-green-200 p-4 text-green-700", children: success })), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", children: requestTypes.map((item) => (_jsxs("button", { onClick: () => setSelectedType(item.type), className: "rounded-xl border border-gray-200/80 bg-white p-6 shadow-sm hover:shadow-lg hover:border-blue-300 transition-all duration-300 hover:-translate-y-1 text-left group", children: [_jsx("div", { className: "text-4xl mb-3 group-hover:scale-110 transition-transform", children: item.icon }), _jsx("h3", { className: "text-lg font-semibold text-gray-900 mb-2", children: item.label }), _jsx("p", { className: "text-sm text-gray-500", children: "Nh\u1EA5n \u0111\u1EC3 t\u1EA1o y\u00EAu c\u1EA7u m\u1EDBi" })] }, item.type))) }), _jsxs("div", { className: "rounded-xl border border-gray-200/80 bg-white p-6 shadow-sm", children: [_jsxs("h2", { className: "text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2", children: [_jsx("span", { children: "\uD83D\uDCCB" }), "Y\u00EAu c\u1EA7u c\u1EE7a t\u00F4i"] }), isLoading ? (_jsxs("div", { className: "text-center py-8", children: [_jsx("div", { className: "inline-block h-6 w-6 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent" }), _jsx("p", { className: "mt-2 text-gray-600", children: "\u0110ang t\u1EA3i..." })] })) : requests.length === 0 ? (_jsx("p", { className: "text-gray-500 text-center py-8", children: "B\u1EA1n ch\u01B0a c\u00F3 y\u00EAu c\u1EA7u n\u00E0o." })) : (_jsx("div", { className: "space-y-3", children: requests.map((request) => (_jsx("div", { className: "rounded-lg border border-gray-200 bg-gray-50 p-4 hover:bg-gray-100 transition-colors", children: _jsxs("div", { className: "flex items-start justify-between", children: [_jsxs("div", { className: "flex-1", children: [_jsx("h4", { className: "font-semibold text-gray-900 mb-1", children: requestTypeLabels[request.type] || request.type }), _jsxs("p", { className: "text-sm text-gray-600 mb-2", children: ["Ng\u00E0y g\u1EEDi:", " ", new Date(request.createdAt).toLocaleDateString("vi-VN", {
                                                        year: "numeric",
                                                        month: "long",
                                                        day: "numeric",
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                    })] }), request.payload?.lyDo && (_jsxs("p", { className: "text-sm text-gray-700", children: [_jsx("span", { className: "font-medium", children: "L\u00FD do:" }), " ", request.payload.lyDo] }))] }), _jsx("span", { className: `px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${statusColors[request.status] || "bg-gray-100 text-gray-700"}`, children: statusLabels[request.status] || request.status })] }) }, request.id))) }))] }), _jsx(RequestModal, { isOpen: selectedType !== null && selectedType !== "TACH_HO_KHAU", type: selectedType && selectedType !== "TACH_HO_KHAU" ? selectedType : null, onClose: () => setSelectedType(null), onSubmit: handleSubmitRequest, nhanKhauList: nhanKhauList.map((nk) => ({ id: nk.id, hoTen: nk.hoTen })), householdInfo: householdInfo ? {
                    soHoKhau: householdInfo.soHoKhau,
                    diaChi: householdInfo.diaChiDayDu || householdInfo.diaChi,
                } : undefined }), _jsx(SplitHouseholdRequestModal, { isOpen: selectedType === "TACH_HO_KHAU", onClose: () => setSelectedType(null), onSubmit: handleSubmitSplitHousehold, household: householdInfo, nhanKhauList: nhanKhauList, isLoading: isLoadingHousehold })] }));
}
