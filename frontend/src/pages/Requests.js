import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { apiService } from "../services/api";
import RequestDetailModal from "../components/RequestDetailModal";
const requestTypeLabels = {
    TACH_HO_KHAU: "Yêu cầu tách hộ khẩu",
    SUA_NHAN_KHAU: "Sửa thông tin nhân khẩu",
    XOA_NHAN_KHAU: "Xoá nhân khẩu",
    TAM_VANG: "Xin tạm vắng",
    TAM_TRU: "Xin tạm trú",
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
export default function Requests() {
    const [requests, setRequests] = useState([]);
    const [filteredRequests, setFilteredRequests] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedRequestId, setSelectedRequestId] = useState(null);
    const [typeFilter, setTypeFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    useEffect(() => {
        loadRequests();
    }, [typeFilter, statusFilter]); // Reload khi filter thay đổi
    const loadRequests = async () => {
        setIsLoading(true);
        try {
            const response = await apiService.getRequestsList({
                type: typeFilter !== "all" ? typeFilter : undefined,
                status: statusFilter !== "all" ? statusFilter : undefined,
            });
            if (response.success) {
                const data = response.data || [];
                setRequests(data);
                // Filter ở frontend nếu backend chưa hỗ trợ (sẽ xóa khi backend có)
                let filtered = data;
                if (typeFilter !== "all") {
                    filtered = filtered.filter((req) => req.type === typeFilter);
                }
                if (statusFilter !== "all") {
                    filtered = filtered.filter((req) => req.status === statusFilter);
                }
                setFilteredRequests(filtered);
            }
        }
        catch (err) {
            console.error("Failed to load requests:", err);
        }
        finally {
            setIsLoading(false);
        }
    };
    const handleRefresh = () => {
        loadRequests();
    };
    const handleViewDetail = (requestId) => {
        setSelectedRequestId(requestId);
    };
    const handleCloseModal = () => {
        setSelectedRequestId(null);
        loadRequests(); // Refresh sau khi đóng modal (có thể đã approve/reject)
    };
    // Filter types chỉ hiển thị các loại yêu cầu cần duyệt
    const filterTypes = [
        { value: "all", label: "Tất cả" },
        { value: "TACH_HO_KHAU", label: "Tách hộ khẩu" },
        { value: "SUA_NHAN_KHAU", label: "Sửa nhân khẩu" },
        { value: "XOA_NHAN_KHAU", label: "Xoá nhân khẩu" },
    ];
    const filterStatuses = [
        { value: "all", label: "Tất cả" },
        { value: "pending", label: "Chờ duyệt" },
        { value: "approved", label: "Đã duyệt" },
        { value: "rejected", label: "Từ chối" },
        { value: "processing", label: "Đang xử lý" },
    ];
    return (_jsxs("div", { className: "space-y-6", children: [_jsx("div", { className: "rounded-xl border border-blue-200/60 bg-gradient-to-r from-blue-50 via-cyan-50 to-teal-50 p-6 shadow-sm backdrop-blur-sm", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent", children: "Qu\u1EA3n l\u00FD y\u00EAu c\u1EA7u" }), _jsx("p", { className: "mt-2 text-gray-600", children: "Duy\u1EC7t v\u00E0 x\u1EED l\u00FD c\u00E1c y\u00EAu c\u1EA7u t\u1EEB ng\u01B0\u1EDDi d\u00E2n" })] }), _jsx("button", { onClick: handleRefresh, className: "rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors", children: "\uD83D\uDD04 L\u00E0m m\u1EDBi" })] }) }), _jsx("div", { className: "rounded-xl border border-gray-200/80 bg-white p-4 shadow-sm", children: _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Lo\u1EA1i y\u00EAu c\u1EA7u" }), _jsx("select", { value: typeFilter, onChange: (e) => setTypeFilter(e.target.value), className: "w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20", children: filterTypes.map((option) => (_jsx("option", { value: option.value, children: option.label }, option.value))) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Tr\u1EA1ng th\u00E1i" }), _jsx("select", { value: statusFilter, onChange: (e) => setStatusFilter(e.target.value), className: "w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20", children: filterStatuses.map((option) => (_jsx("option", { value: option.value, children: option.label }, option.value))) })] })] }) }), _jsx("div", { className: "rounded-xl border border-gray-200/80 bg-white shadow-sm", children: isLoading ? (_jsxs("div", { className: "text-center py-12", children: [_jsx("div", { className: "inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent" }), _jsx("p", { className: "mt-4 text-gray-600", children: "\u0110ang t\u1EA3i danh s\u00E1ch y\u00EAu c\u1EA7u..." })] })) : filteredRequests.length === 0 ? (_jsx("div", { className: "text-center py-12", children: _jsx("p", { className: "text-gray-500", children: "Kh\u00F4ng c\u00F3 y\u00EAu c\u1EA7u n\u00E0o." }) })) : (_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-gray-200 bg-gray-50", children: [_jsx("th", { className: "text-left py-3 px-4 text-sm font-semibold text-gray-700", children: "ID" }), _jsx("th", { className: "text-left py-3 px-4 text-sm font-semibold text-gray-700", children: "Lo\u1EA1i y\u00EAu c\u1EA7u" }), _jsx("th", { className: "text-left py-3 px-4 text-sm font-semibold text-gray-700", children: "Ng\u01B0\u1EDDi g\u1EEDi" }), _jsx("th", { className: "text-left py-3 px-4 text-sm font-semibold text-gray-700", children: "H\u1ED9 kh\u1EA9u li\u00EAn quan" }), _jsx("th", { className: "text-left py-3 px-4 text-sm font-semibold text-gray-700", children: "Ng\u00E0y g\u1EEDi" }), _jsx("th", { className: "text-left py-3 px-4 text-sm font-semibold text-gray-700", children: "Tr\u1EA1ng th\u00E1i" }), _jsx("th", { className: "text-left py-3 px-4 text-sm font-semibold text-gray-700", children: "Thao t\u00E1c" })] }) }), _jsx("tbody", { children: filteredRequests.map((request) => (_jsxs("tr", { className: "border-b border-gray-100 hover:bg-gray-50 transition-colors", children: [_jsxs("td", { className: "py-3 px-4 text-sm text-gray-900 font-medium", children: ["#", request.id] }), _jsx("td", { className: "py-3 px-4 text-sm text-gray-900", children: requestTypeLabels[request.type] || request.type }), _jsxs("td", { className: "py-3 px-4 text-sm text-gray-600", children: [request.nguoiGui?.hoTen || request.nguoiGui?.username || "-", request.nguoiGui?.cccd && (_jsxs("span", { className: "text-gray-500 ml-1", children: ["(", request.nguoiGui.cccd, ")"] }))] }), _jsx("td", { className: "py-3 px-4 text-sm text-gray-600", children: request.hoKhauLienQuan?.soHoKhau || request.hoKhauLienQuan?.diaChi || "-" }), _jsx("td", { className: "py-3 px-4 text-sm text-gray-600", children: new Date(request.createdAt).toLocaleDateString("vi-VN", {
                                                year: "numeric",
                                                month: "2-digit",
                                                day: "2-digit",
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            }) }), _jsx("td", { className: "py-3 px-4", children: _jsx("span", { className: `px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${statusColors[request.status] || "bg-gray-100 text-gray-700"}`, children: statusLabels[request.status] || request.status }) }), _jsx("td", { className: "py-3 px-4", children: _jsx("button", { onClick: () => handleViewDetail(request.id), className: "rounded-lg bg-blue-50 text-blue-600 px-3 py-1.5 text-xs font-medium hover:bg-blue-100 transition-colors", children: "Xem chi ti\u1EBFt" }) })] }, request.id))) })] }) })) }), selectedRequestId && (_jsx(RequestDetailModal, { requestId: selectedRequestId, isOpen: true, onClose: handleCloseModal, onRefresh: handleRefresh }))] }));
}
