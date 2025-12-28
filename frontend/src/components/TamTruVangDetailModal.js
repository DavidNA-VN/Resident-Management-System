import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { apiService } from "../services/api";
import { formatFromYMD } from "../utils/date";
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
export default function TamTruVangDetailModal({ requestId, isOpen, onClose, onRefresh, }) {
    const [requestDetail, setRequestDetail] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectReason, setRejectReason] = useState("");
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    useEffect(() => {
        if (isOpen && requestId) {
            loadRequestDetail();
        }
    }, [isOpen, requestId]);
    useEffect(() => {
        if (success) {
            const timer = setTimeout(() => setSuccess(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [success]);
    const loadRequestDetail = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await apiService.getTamTruVangDetail(requestId);
            if (response.success) {
                setRequestDetail(response.data);
            }
        }
        catch (err) {
            setError(err.error?.message || "Không thể tải chi tiết yêu cầu");
        }
        finally {
            setIsLoading(false);
        }
    };
    const handleApprove = async () => {
        if (!confirm("Bạn có chắc chắn muốn duyệt yêu cầu này?")) {
            return;
        }
        setIsSubmitting(true);
        setError(null);
        try {
            const response = await apiService.approveTamTruVang(requestId);
            if (response.success) {
                setSuccess("Duyệt yêu cầu thành công!");
                onRefresh();
                setTimeout(() => onClose(), 1000);
            }
        }
        catch (err) {
            setError(err.error?.message || "Không thể duyệt yêu cầu");
        }
        finally {
            setIsSubmitting(false);
        }
    };
    const handleReject = async () => {
        if (rejectReason.trim().length < 5) {
            setError("Lý do từ chối phải có ít nhất 5 ký tự");
            return;
        }
        setIsSubmitting(true);
        setError(null);
        try {
            const response = await apiService.rejectTamTruVang(requestId, rejectReason.trim());
            if (response.success) {
                setSuccess("Từ chối yêu cầu thành công!");
                setShowRejectModal(false);
                setRejectReason("");
                onRefresh();
                setTimeout(() => onClose(), 1000);
            }
        }
        catch (err) {
            setError(err.error?.message || "Không thể từ chối yêu cầu");
        }
        finally {
            setIsSubmitting(false);
        }
    };
    if (!isOpen)
        return null;
    return (_jsxs("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50", children: [_jsxs("div", { className: "w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-xl shadow-2xl", children: [_jsxs("div", { className: "flex items-center justify-between p-6 border-b border-gray-200", children: [_jsxs("h2", { className: "text-xl font-semibold text-gray-900", children: ["Chi ti\u1EBFt y\u00EAu c\u1EA7u ", loaiLabels[requestDetail?.loai || "tam_tru"]] }), _jsx("button", { onClick: onClose, className: "p-2 hover:bg-gray-100 rounded-lg transition-colors", children: _jsx("svg", { className: "w-5 h-5", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M6 18L18 6M6 6l12 12" }) }) })] }), _jsx("div", { className: "p-6", children: isLoading ? (_jsxs("div", { className: "flex items-center justify-center py-12", children: [_jsx("div", { className: "inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent" }), _jsx("span", { className: "ml-3 text-gray-600", children: "\u0110ang t\u1EA3i..." })] })) : requestDetail ? (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6", children: [_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Lo\u1EA1i y\u00EAu c\u1EA7u" }), _jsx("div", { className: "flex items-center space-x-2", children: _jsx("span", { className: `px-3 py-1 rounded-full text-xs font-semibold ${requestDetail.loai === "tam_tru" ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"}`, children: loaiLabels[requestDetail.loai] }) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Tr\u1EA1ng th\u00E1i" }), _jsx("span", { className: `px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${statusColors[requestDetail.status]}`, children: statusLabels[requestDetail.status] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Ng\u00E0y g\u1EEDi" }), _jsx("p", { className: "text-sm text-gray-900", children: new Date(requestDetail.createdAt).toLocaleDateString("vi-VN", {
                                                                year: "numeric",
                                                                month: "2-digit",
                                                                day: "2-digit",
                                                                hour: "2-digit",
                                                                minute: "2-digit",
                                                            }) })] })] }), _jsx("div", { className: "space-y-4", children: _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Ng\u01B0\u1EDDi g\u1EEDi" }), _jsxs("div", { className: "text-sm text-gray-900", children: [_jsx("p", { className: "font-medium", children: requestDetail.nguoiGui?.hoTen }), requestDetail.nguoiGui?.cccd && (_jsxs("p", { className: "text-gray-600", children: ["CCCD: ", requestDetail.nguoiGui.cccd] }))] })] }) })] }), requestDetail.nhanKhau && (_jsxs("div", { className: "border-t border-gray-200 pt-6", children: [_jsx("h3", { className: "text-lg font-medium text-gray-900 mb-4", children: "Th\u00F4ng tin nh\u00E2n kh\u1EA9u" }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6", children: [_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "H\u1ECD t\u00EAn" }), _jsx("p", { className: "text-sm text-gray-900", children: requestDetail.nhanKhau.hoTen })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "CCCD" }), _jsx("p", { className: "text-sm text-gray-900", children: requestDetail.nhanKhau.cccd || "Chưa cập nhật" })] })] }), _jsx("div", { className: "space-y-4", children: _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Ng\u00E0y sinh" }), _jsx("p", { className: "text-sm text-gray-900", children: requestDetail.nhanKhau.ngaySinh ? formatFromYMD(requestDetail.nhanKhau.ngaySinh) : "Chưa cập nhật" })] }) })] })] })), requestDetail.hoKhau && (_jsxs("div", { className: "border-t border-gray-200 pt-6", children: [_jsx("h3", { className: "text-lg font-medium text-gray-900 mb-4", children: "Th\u00F4ng tin h\u1ED9 kh\u1EA9u" }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "S\u1ED1 h\u1ED9 kh\u1EA9u" }), _jsx("p", { className: "text-sm text-gray-900", children: requestDetail.hoKhau.soHoKhau || "Chưa cập nhật" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "\u0110\u1ECBa ch\u1EC9" }), _jsx("p", { className: "text-sm text-gray-900", children: requestDetail.hoKhau.diaChi || "Chưa cập nhật" })] })] })] })), _jsxs("div", { className: "border-t border-gray-200 pt-6", children: [_jsx("h3", { className: "text-lg font-medium text-gray-900 mb-4", children: "Th\u1EDDi gian v\u00E0 \u0111\u1ECBa ch\u1EC9" }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6", children: [_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "T\u1EEB ng\u00E0y" }), _jsx("p", { className: "text-sm text-gray-900", children: formatFromYMD(requestDetail.tuNgay) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "\u0110\u1EBFn ng\u00E0y" }), _jsx("p", { className: "text-sm text-gray-900", children: requestDetail.denNgay ? formatFromYMD(requestDetail.denNgay) : "Không xác định" })] })] }), _jsx("div", { className: "space-y-4", children: _jsxs("div", { children: [_jsxs("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: ["\u0110\u1ECBa ch\u1EC9 ", requestDetail.loai === "tam_tru" ? "tạm trú" : "tạm vắng"] }), _jsx("p", { className: "text-sm text-gray-900", children: requestDetail.diaChi || "Chưa cập nhật" })] }) })] })] }), requestDetail.lyDo && (_jsxs("div", { className: "border-t border-gray-200 pt-6", children: [_jsx("h3", { className: "text-lg font-medium text-gray-900 mb-4", children: "L\u00FD do" }), _jsx("p", { className: "text-sm text-gray-900 bg-gray-50 p-3 rounded-lg", children: requestDetail.lyDo })] })), error && (_jsx("div", { className: "border-t border-gray-200 pt-6", children: _jsx("div", { className: "rounded-lg bg-red-50 border border-red-200 p-4 text-red-700", children: error }) })), success && (_jsx("div", { className: "border-t border-gray-200 pt-6", children: _jsx("div", { className: "rounded-lg bg-green-50 border border-green-200 p-4 text-green-700", children: success }) }))] })) : (_jsx("div", { className: "text-center py-12", children: _jsx("p", { className: "text-gray-500", children: "Kh\u00F4ng t\u00ECm th\u1EA5y th\u00F4ng tin y\u00EAu c\u1EA7u" }) })) }), requestDetail && requestDetail.status === "pending" && (_jsxs("div", { className: "flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50", children: [_jsx("button", { onClick: onClose, className: "px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500", children: "\u0110\u00F3ng" }), _jsx("button", { onClick: () => setShowRejectModal(true), disabled: isSubmitting, className: "px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50", children: "T\u1EEB ch\u1ED1i" }), _jsx("button", { onClick: handleApprove, disabled: isSubmitting, className: "px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50", children: isSubmitting ? "Đang xử lý..." : "Duyệt" })] }))] }), showRejectModal && (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50", children: _jsx("div", { className: "w-full max-w-md bg-white rounded-xl shadow-2xl", children: _jsxs("div", { className: "p-6", children: [_jsx("h3", { className: "text-lg font-medium text-gray-900 mb-4", children: "T\u1EEB ch\u1ED1i y\u00EAu c\u1EA7u" }), _jsxs("div", { className: "mb-4", children: [_jsxs("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: ["L\u00FD do t\u1EEB ch\u1ED1i ", _jsx("span", { className: "text-red-500", children: "*" })] }), _jsx("textarea", { value: rejectReason, onChange: (e) => setRejectReason(e.target.value), rows: 4, className: "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20", placeholder: "Nh\u1EADp l\u00FD do t\u1EEB ch\u1ED1i y\u00EAu c\u1EA7u..." })] }), error && (_jsx("div", { className: "mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-red-700 text-sm", children: error })), _jsxs("div", { className: "flex items-center justify-end space-x-3", children: [_jsx("button", { onClick: () => {
                                            setShowRejectModal(false);
                                            setRejectReason("");
                                            setError(null);
                                        }, className: "px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50", children: "H\u1EE7y" }), _jsx("button", { onClick: handleReject, disabled: isSubmitting, className: "px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 disabled:opacity-50", children: isSubmitting ? "Đang xử lý..." : "Xác nhận từ chối" })] })] }) }) }))] }));
}
