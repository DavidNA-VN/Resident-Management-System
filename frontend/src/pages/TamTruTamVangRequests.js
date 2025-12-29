import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { apiService } from "../services/api";
import TamTruVangDetailModal from "../components/TamTruVangDetailModal";
const loaiLabels = {
    tam_tru: "Tạm trú",
    tam_vang: "Tạm vắng",
};
const statusLabels = {
    pending: "Chờ duyệt",
    approved: "Đã duyệt",
    rejected: "Từ chối",
    dang_thuc_hien: "Đang thực hiện",
    ket_thuc: "Kết thúc",
};
const statusColors = {
    pending: "bg-yellow-100 text-yellow-700",
    approved: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
    dang_thuc_hien: "bg-blue-100 text-blue-700",
    ket_thuc: "bg-gray-100 text-gray-700",
};
export default function TamTruTamVangRequests() {
    const [requests, setRequests] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [loaiFilter, setLoaiFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [selectedRequestId, setSelectedRequestId] = useState(null);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    useEffect(() => {
        loadRequests();
    }, []);
    useEffect(() => {
        // reload when filters change
        loadRequests();
    }, [loaiFilter, statusFilter, searchQuery, fromDate, toDate]);
    useEffect(() => {
        if (success) {
            const timer = setTimeout(() => setSuccess(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [success]);
    const loadRequests = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const params = {};
            if (loaiFilter !== "all")
                params.type = loaiFilter === "tam_vang" ? "TAM_VANG" : "TAM_TRU";
            if (statusFilter !== "all")
                params.status = statusFilter;
            if (searchQuery.trim())
                params.keyword = searchQuery.trim();
            if (fromDate)
                params.fromDate = fromDate;
            if (toDate)
                params.toDate = toDate;
            params.page = 1;
            params.limit = 200;

            const response = await apiService.getTamTruVangRequests(params);
            if (response?.success) {
                setRequests(response.data || []);
            }
        }
        catch (err) {
            console.error("Failed to load tam-tru/tam-vang requests:", err);
            setError(err.error?.message || "Không thể tải danh sách yêu cầu");
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
        loadRequests();
    };
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent", children: "Duy\u1EC7t T\u1EA1m tr\u00FA / T\u1EA1m v\u1EAFng" }), _jsx("p", { className: "mt-1 text-gray-600", children: "Danh s\u00E1ch \u0111\u01A1n do ng\u01B0\u1EDDi d\u00E2n g\u1EEDi, c\u00E1n b\u1ED9 c\u00F3 th\u1EC3 duy\u1EC7t ho\u1EB7c t\u1EEB ch\u1ED1i." })] }), _jsx("button", { onClick: handleRefresh, className: "rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg hover:-translate-y-0.5", children: "\uD83D\uDD04 L\u00E0m m\u1EDBi" })] }), _jsxs("div", { className: "rounded-xl border border-gray-200/80 bg-white p-4 shadow-sm", children: [_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Lo\u1EA1i" }), _jsxs("select", { value: loaiFilter, onChange: (e) => setLoaiFilter(e.target.value), className: "w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20", children: [_jsx("option", { value: "all", children: "T\u1EA5t c\u1EA3" }), _jsx("option", { value: "tam_tru", children: "T\u1EA1m tr\u00FA" }), _jsx("option", { value: "tam_vang", children: "T\u1EA1m v\u1EAFng" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Tr\u1EA1ng th\u00E1i" }), _jsxs("select", { value: statusFilter, onChange: (e) => setStatusFilter(e.target.value), className: "w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20", children: [_jsx("option", { value: "all", children: "T\u1EA5t c\u1EA3" }), _jsx("option", { value: "pending", children: "Ch\u1EDD duy\u1EC7t" }), _jsx("option", { value: "approved", children: "\u0110\u00E3 duy\u1EC7t" }), _jsx("option", { value: "rejected", children: "T\u1EEB ch\u1ED1i" }), _jsx("option", { value: "dang_thuc_hien", children: "\u0110ang th\u1EF1c hi\u1EC7n" }), _jsx("option", { value: "ket_thuc", children: "K\u1EBFt th\u00FAc" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "T\u1EEB ng\u00E0y" }), _jsx("input", { type: "date", value: fromDate, onChange: (e) => setFromDate(e.target.value), className: "w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "\u0110\u1EBFn ng\u00E0y" }), _jsx("input", { type: "date", value: toDate, onChange: (e) => setToDate(e.target.value), className: "w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" })] })] }), _jsxs("div", { className: "mt-4", children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "T\u00ECm ki\u1EBFm" }), _jsx("input", { type: "text", value: searchQuery, onChange: (e) => setSearchQuery(e.target.value), placeholder: "T\u00ECm theo H\u1ECD t\u00EAn / CCCD / S\u1ED1 h\u1ED9 kh\u1EA9u", className: "w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" })] })] }), error && (_jsx("div", { className: "rounded-lg bg-red-50 border border-red-200 p-4 text-red-700", children: error })), success && (_jsx("div", { className: "rounded-lg bg-green-50 border border-green-200 p-4 text-green-700", children: success })), _jsxs("div", { className: "rounded-xl border border-gray-200/80 bg-white shadow-sm", children: [_jsx("div", { className: "border-b border-gray-200 p-4", children: _jsxs("h2", { className: "text-lg font-semibold text-gray-900", children: ["Danh s\u00E1ch \u0111\u01A1n (", requests.length, ")"] }) }), isLoading ? (_jsxs("div", { className: "p-8 text-center text-gray-500", children: [_jsx("div", { className: "inline-block h-6 w-6 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent" }), _jsx("p", { className: "mt-2", children: "\u0110ang t\u1EA3i..." })] })) : requests.length === 0 ? (_jsxs("div", { className: "p-8 text-center text-gray-500", children: [_jsx("div", { className: "text-2xl mb-2", children: "\uD83D\uDCCB" }), _jsx("p", { children: "Kh\u00F4ng c\u00F3 \u0111\u01A1n n\u00E0o." })] })) : (_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full", children: [_jsx("thead", { className: "bg-gray-50", children: _jsxs("tr", { children: [_jsx("th", { className: "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700", children: "M\u00E3 \u0111\u01A1n" }), _jsx("th", { className: "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700", children: "Lo\u1EA1i" }), _jsx("th", { className: "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700", children: "Ng\u01B0\u1EDDi g\u1EEDi" }), _jsx("th", { className: "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700", children: "Li\u00EAn quan" }), _jsx("th", { className: "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700", children: "T\u1EEB ng\u00E0y - \u0110\u1EBFn ng\u00E0y" }), _jsx("th", { className: "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700", children: "\u0110\u1ECBa ch\u1EC9" }), _jsx("th", { className: "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700", children: "Ng\u00E0y g\u1EEDi" }), _jsx("th", { className: "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700", children: "Tr\u1EA1ng th\u00E1i" }), _jsx("th", { className: "px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-700", children: "Thao t\u00E1c" })] }) }), _jsx("tbody", { children: requests.map((request) => (_jsxs("tr", { className: "border-b border-gray-100 hover:bg-gray-50", children: [_jsxs("td", { className: "py-3 px-4 text-sm text-gray-900 font-medium", children: ["#", request.id] }), _jsx("td", { className: "py-3 px-4 text-sm text-gray-900", children: _jsx("span", { className: `px-2 py-1 rounded-full text-xs font-semibold ${request.loai === "tam_tru" ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"}`, children: loaiLabels[request.loai] }) }), _jsx("td", { className: "py-3 px-4 text-sm text-gray-600", children: _jsxs("div", { children: [_jsx("div", { className: "font-medium", children: request.nguoiGui?.hoTen || "-" }), request.nguoiGui?.cccd && (_jsx("div", { className: "text-gray-500 text-xs", children: request.nguoiGui.cccd }))] }) }), _jsx("td", { className: "py-3 px-4 text-sm text-gray-600", children: _jsxs("div", { children: [request.hoKhau?.soHoKhau && (_jsx("div", { className: "font-medium", children: request.hoKhau.soHoKhau })), request.nhanKhau?.hoTen && (_jsx("div", { className: "text-gray-500 text-xs", children: request.nhanKhau.hoTen }))] }) }), _jsx("td", { className: "py-3 px-4 text-sm text-gray-600", children: _jsxs("div", { children: [_jsx("div", { children: new Date(request.tuNgay).toLocaleDateString("vi-VN") }), _jsx("div", { className: "text-gray-500 text-xs", children: request.denNgay ? `→ ${new Date(request.denNgay).toLocaleDateString("vi-VN")}` : "→ Không xác định" })] }) }), _jsx("td", { className: "py-3 px-4 text-sm text-gray-600 max-w-xs", children: _jsx("div", { className: "truncate", title: request.diaChi || "", children: request.diaChi || "-" }) }), _jsx("td", { className: "py-3 px-4 text-sm text-gray-600", children: new Date(request.createdAt).toLocaleDateString("vi-VN", {
                                                    year: "numeric",
                                                    month: "2-digit",
                                                    day: "2-digit",
                                                }) }), _jsx("td", { className: "py-3 px-4", children: _jsx("span", { className: `px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${statusColors[(request.status || "").toString().toLowerCase()] || "bg-gray-100 text-gray-700"}`, children: statusLabels[(request.status || "").toString().toLowerCase()] || request.status }) }), _jsx("td", { className: "py-3 px-4 text-right", children: _jsx("button", { onClick: () => handleViewDetail(request.id), className: "rounded-lg bg-blue-50 text-blue-600 px-3 py-1.5 text-xs font-medium hover:bg-blue-100 transition-colors", children: "Xem" }) })] }, request.id))) })] }) }))] }), selectedRequestId && (_jsx(TamTruVangDetailModal, { requestId: selectedRequestId, isOpen: true, onClose: handleCloseModal, onRefresh: handleRefresh }))] }));
}
