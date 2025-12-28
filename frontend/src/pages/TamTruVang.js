import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiService } from "../services/api";
import RequestDetailModal from "../components/RequestDetailModal";
const requestTypeLabels = {
    ADD_NEWBORN: "Thêm con sơ sinh",
    ADD_PERSON: "Thêm nhân khẩu",
    TEMPORARY_RESIDENCE: "Xin tạm trú",
    TEMPORARY_ABSENCE: "Xin tạm vắng",
    TAM_TRU: "Xin tạm trú",
    TAM_VANG: "Xin tạm vắng",
    TACH_HO_KHAU: "Yêu cầu tách hộ khẩu",
    SUA_NHAN_KHAU: "Sửa thông tin nhân khẩu",
    XOA_NHAN_KHAU: "Xoá nhân khẩu",
};
const statusLabels = {
    pending: "Chờ duyệt",
    approved: "Đã duyệt",
    rejected: "Từ chối",
    PENDING: "Chờ duyệt",
    APPROVED: "Đã duyệt",
    REJECTED: "Từ chối",
};
const statusColors = {
    pending: "bg-yellow-100 text-yellow-700",
    approved: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
    PENDING: "bg-yellow-100 text-yellow-700",
    APPROVED: "bg-green-100 text-green-700",
    REJECTED: "bg-red-100 text-red-700",
};
const formatDateRange = (tuNgay, denNgay) => {
    if (!tuNgay && !denNgay)
        return "-";
    if (tuNgay && denNgay) {
        return `${new Date(tuNgay).toLocaleDateString("vi-VN")} - ${new Date(denNgay).toLocaleDateString("vi-VN")}`;
    }
    if (tuNgay)
        return `Từ ${new Date(tuNgay).toLocaleDateString("vi-VN")}`;
    if (denNgay)
        return `Đến ${new Date(denNgay).toLocaleDateString("vi-VN")}`;
    return "-";
};
export default function TamTruVang() {
    const navigate = useNavigate();
    const [requests, setRequests] = useState([]);
    const [filteredRequests, setFilteredRequests] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [typeFilter, setTypeFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedRequestId, setSelectedRequestId] = useState(null);
    const [error, setError] = useState(null);
    const [toast, setToast] = useState(null);
    const filterTypes = [
        { value: "all", label: "Tất cả" },
        { value: "TAM_TRU", label: "Tạm trú" },
        { value: "TAM_VANG", label: "Tạm vắng" },
        { value: "TACH_HO_KHAU", label: "Tách hộ khẩu" },
        { value: "SUA_NHAN_KHAU", label: "Sửa nhân khẩu" },
        { value: "XOA_NHAN_KHAU", label: "Xoá nhân khẩu" },
        { value: "ADD_PERSON", label: "Thêm nhân khẩu" },
        { value: "ADD_NEWBORN", label: "Thêm con sơ sinh" },
    ];
    const filterStatuses = [
        { value: "all", label: "Tất cả" },
        { value: "pending", label: "Chờ duyệt" },
        { value: "approved", label: "Đã duyệt" },
        { value: "rejected", label: "Từ chối" },
    ];
    // Check user role
    const currentUser = localStorage.getItem("userInfo")
        ? JSON.parse(localStorage.getItem("userInfo") || "null")
        : null;
    const allowedRoles = ["can_bo", "to_truong", "to_pho"];
    const hasAccess = currentUser && allowedRoles.includes(currentUser.role);
    useEffect(() => {
        if (!hasAccess) {
            navigate("/dashboard");
            return;
        }
        loadRequests();
    }, []);
    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3500);
            return () => clearTimeout(timer);
        }
    }, [toast]);
    useEffect(() => {
        loadRequests();
    }, [typeFilter, statusFilter, searchQuery]);
    const showToast = (message, type = "success") => {
        setToast({ type, message });
    };
    const loadRequests = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await apiService.getRequestsList({
                type: typeFilter !== "all" ? typeFilter : undefined,
                status: statusFilter !== "all" ? statusFilter : undefined,
                q: searchQuery || undefined,
            });
            if (response.success) {
                setRequests(response.data || []);
                setFilteredRequests(response.data || []);
            }
            else {
                setError("Không thể tải danh sách yêu cầu");
            }
        }
        catch (err) {
            console.error("Failed to load requests:", err);
            setError("Không thể tải danh sách yêu cầu");
            showToast("Không thể tải danh sách yêu cầu", "error");
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
    // Redirect if no access
    if (!hasAccess) {
        return (_jsx("div", { className: "flex items-center justify-center min-h-screen", children: _jsxs("div", { className: "text-center", children: [_jsx("h1", { className: "text-2xl font-bold text-red-600 mb-4", children: "B\u1EA1n kh\u00F4ng c\u00F3 quy\u1EC1n truy c\u1EADp trang n\u00E0y" }), _jsx("p", { className: "text-gray-600 mb-4", children: "Ch\u1EC9 c\u00E1n b\u1ED9, t\u1ED5 tr\u01B0\u1EDFng v\u00E0 t\u1ED5 ph\u00F3 m\u1EDBi c\u00F3 th\u1EC3 truy c\u1EADp trang n\u00E0y." }), _jsx("button", { onClick: () => navigate("/dashboard"), className: "bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600", children: "V\u1EC1 trang ch\u1EE7" })] }) }));
    }
    return (_jsxs("div", { className: "space-y-6", children: [_jsx("div", { className: "rounded-md bg-red-50 border border-red-200 p-3 text-red-700 font-semibold", children: "DEBUG: TamTruVang component loaded (v2)" }), toast && (_jsx("div", { className: "pointer-events-none fixed inset-x-0 top-4 z-[200] flex justify-center px-4", children: _jsxs("div", { className: `pointer-events-auto flex items-start gap-3 rounded-lg border px-4 py-3 text-sm shadow-lg ${toast.type === "success"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border-red-200 bg-red-50 text-red-800"}`, children: [_jsx("div", { className: "font-semibold", children: toast.type === "success" ? "Thành công" : "Thông báo" }), _jsx("div", { className: "flex-1 text-gray-800", children: toast.message }), _jsx("button", { onClick: () => setToast(null), className: "ml-2 rounded-full p-1 text-gray-500 hover:bg-black/5 hover:text-gray-700", children: "\u2715" })] }) })), _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent", children: "Duy\u1EC7t \u0111\u01A1n T\u1EA1m tr\u00FA / T\u1EA1m v\u1EAFng" }), _jsx("p", { className: "mt-1 text-gray-600", children: "Ti\u1EBFp nh\u1EADn v\u00E0 x\u1EED l\u00FD y\u00EAu c\u1EA7u t\u1EEB ng\u01B0\u1EDDi d\u00E2n" })] }), _jsx("button", { onClick: handleRefresh, className: "rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 px-6 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg hover:-translate-y-0.5", children: "\uD83D\uDD04 L\u00E0m m\u1EDBi" })] }), _jsx("div", { className: "rounded-xl border border-gray-200 bg-white p-4 shadow-sm", children: _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-4 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Lo\u1EA1i y\u00EAu c\u1EA7u" }), _jsx("select", { value: typeFilter, onChange: (e) => setTypeFilter(e.target.value), className: "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20", children: filterTypes.map((option) => (_jsx("option", { value: option.value, children: option.label }, option.value))) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Tr\u1EA1ng th\u00E1i" }), _jsx("select", { value: statusFilter, onChange: (e) => setStatusFilter(e.target.value), className: "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20", children: filterStatuses.map((option) => (_jsx("option", { value: option.value, children: option.label }, option.value))) })] }), _jsxs("div", { className: "md:col-span-2", children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "T\u00ECm ki\u1EBFm" }), _jsx("input", { type: "text", value: searchQuery, onChange: (e) => setSearchQuery(e.target.value), placeholder: "M\u00E3 y\u00EAu c\u1EA7u, t\u00EAn ng\u01B0\u1EDDi g\u1EEDi ho\u1EB7c CCCD...", className: "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" })] })] }) }), error && (_jsx("div", { className: "rounded-lg bg-red-50 border border-red-200 p-4 text-red-700", children: error })), _jsxs("div", { className: "rounded-xl border border-gray-200 bg-white shadow-sm", children: [_jsx("div", { className: "border-b border-gray-200 p-4", children: _jsxs("h2", { className: "text-lg font-semibold text-gray-900", children: ["Danh s\u00E1ch y\u00EAu c\u1EA7u (", filteredRequests.length, ")"] }) }), isLoading ? (_jsxs("div", { className: "p-8 text-center text-gray-500", children: [_jsx("div", { className: "inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent" }), _jsx("p", { className: "mt-4 text-gray-600", children: "\u0110ang t\u1EA3i danh s\u00E1ch y\u00EAu c\u1EA7u..." })] })) : filteredRequests.length === 0 ? (_jsxs("div", { className: "p-8 text-center text-gray-500", children: [_jsx("p", { className: "text-lg", children: "Ch\u01B0a c\u00F3 \u0111\u01A1n n\u00E0o" }), _jsx("p", { className: "text-sm text-gray-400 mt-1", children: requests.length > 0 ? "Không tìm thấy đơn phù hợp với bộ lọc" : "Danh sách đơn trống" })] })) : (_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full", children: [_jsx("thead", { className: "bg-gray-50", children: _jsxs("tr", { children: [_jsx("th", { className: "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700", children: "M\u00E3 \u0111\u01A1n" }), _jsx("th", { className: "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700", children: "Lo\u1EA1i" }), _jsx("th", { className: "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700", children: "Ng\u01B0\u1EDDi g\u1EEDi" }), _jsx("th", { className: "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700", children: "CCCD" }), _jsx("th", { className: "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700", children: "Th\u1EDDi gian" }), _jsx("th", { className: "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700", children: "Tr\u1EA1ng th\u00E1i" }), _jsx("th", { className: "px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-700", children: "Thao t\u00E1c" })] }) }), _jsx("tbody", { className: "divide-y divide-gray-200", children: filteredRequests.map((request) => (_jsxs("tr", { className: "hover:bg-gray-50", children: [_jsxs("td", { className: "px-4 py-3 text-sm font-medium text-gray-900", children: ["#", request.id] }), _jsx("td", { className: "px-4 py-3 text-sm text-gray-600", children: requestTypeLabels[request.type] || request.type }), _jsx("td", { className: "px-4 py-3 text-sm text-gray-600", children: request.nguoiGui?.hoTen || request.nguoiGui?.username || "-" }), _jsx("td", { className: "px-4 py-3 text-sm text-gray-600", children: request.nguoiGui?.cccd || "-" }), _jsx("td", { className: "px-4 py-3 text-sm text-gray-600", children: formatDateRange(request.payload?.tuNgay, request.payload?.denNgay) }), _jsx("td", { className: "px-4 py-3", children: _jsx("span", { className: `px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${statusColors[request.status] || "bg-gray-100 text-gray-700"}`, children: statusLabels[request.status] || request.status }) }), _jsx("td", { className: "px-4 py-3 text-right text-sm text-gray-600", children: _jsx("button", { onClick: () => handleViewDetail(request.id), className: "rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:border-blue-300 hover:text-blue-600", title: "Xem chi ti\u1EBFt v\u00E0 x\u1EED l\u00FD y\u00EAu c\u1EA7u", children: "\uD83D\uDC41 Xem" }) })] }, request.id))) })] }) }))] }), selectedRequestId && (_jsx(RequestDetailModal, { requestId: selectedRequestId, isOpen: true, onClose: handleCloseModal, onRefresh: handleRefresh }))] }));
}
