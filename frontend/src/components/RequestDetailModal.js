import { jsxs as _jsxs, jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { apiService } from "../services/api";
const requestTypeLabels = {
    TACH_HO_KHAU: "Yêu cầu tách hộ khẩu",
    SUA_NHAN_KHAU: "Sửa thông tin nhân khẩu",
    XOA_NHAN_KHAU: "Xoá nhân khẩu",
};
const quanHeLabels = {
    chu_ho: "Chủ hộ",
    vo_chong: "Vợ/Chồng",
    con: "Con",
    cha_me: "Cha/Mẹ",
    anh_chi_em: "Anh/Chị/Em",
    ong_ba: "Ông/Bà",
    chau: "Cháu",
    khac: "Khác",
};
export default function RequestDetailModal({ requestId, isOpen, onClose, onRefresh, }) {
    const [requestDetail, setRequestDetail] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectReason, setRejectReason] = useState("");
    const [error, setError] = useState(null);
    useEffect(() => {
        if (isOpen && requestId) {
            loadRequestDetail();
        }
    }, [isOpen, requestId]);
    const loadRequestDetail = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await apiService.getRequestDetail(requestId);
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
            const response = await apiService.approveRequest(requestId);
            if (response.success) {
                alert("Duyệt yêu cầu thành công!");
                onRefresh();
                onClose();
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
        if (!rejectReason.trim()) {
            setError("Vui lòng nhập lý do từ chối");
            return;
        }
        setIsSubmitting(true);
        setError(null);
        try {
            const response = await apiService.rejectRequest(requestId, rejectReason);
            if (response.success) {
                alert("Từ chối yêu cầu thành công!");
                setShowRejectModal(false);
                setRejectReason("");
                onRefresh();
                onClose();
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
    return (_jsxs(_Fragment, { children: [_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4", onClick: onClose, children: _jsxs("div", { className: "w-full max-w-4xl rounded-2xl border border-gray-200 bg-white shadow-xl max-h-[90vh] overflow-y-auto", onClick: (e) => e.stopPropagation(), children: [_jsxs("div", { className: "sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4", children: [_jsxs("h2", { className: "text-2xl font-bold text-gray-900", children: ["Chi ti\u1EBFt y\u00EAu c\u1EA7u #", requestId] }), _jsx("button", { onClick: onClose, className: "rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors", children: "\u2715" })] }), _jsxs("div", { className: "p-6 space-y-6", children: [error && (_jsx("div", { className: "rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700", children: error })), isLoading ? (_jsxs("div", { className: "text-center py-12", children: [_jsx("div", { className: "inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent" }), _jsx("p", { className: "mt-4 text-gray-600", children: "\u0110ang t\u1EA3i chi ti\u1EBFt..." })] })) : requestDetail ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "rounded-lg border border-gray-200 bg-gray-50 p-4", children: [_jsx("h3", { className: "text-lg font-semibold text-gray-900 mb-4", children: "Th\u00F4ng tin chung" }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-500 mb-1", children: "Lo\u1EA1i y\u00EAu c\u1EA7u" }), _jsx("p", { className: "text-base font-semibold text-gray-900", children: requestTypeLabels[requestDetail.type] || requestDetail.type })] }), _jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-500 mb-1", children: "Ng\u01B0\u1EDDi g\u1EEDi" }), _jsxs("p", { className: "text-base font-semibold text-gray-900", children: [requestDetail.nguoiGui?.hoTen || requestDetail.nguoiGui?.username || "-", requestDetail.nguoiGui?.cccd && (_jsxs("span", { className: "text-gray-500 ml-1", children: ["(", requestDetail.nguoiGui.cccd, ")"] }))] })] }), _jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-500 mb-1", children: "Ng\u00E0y g\u1EEDi" }), _jsx("p", { className: "text-base font-semibold text-gray-900", children: new Date(requestDetail.createdAt).toLocaleDateString("vi-VN", {
                                                                        year: "numeric",
                                                                        month: "long",
                                                                        day: "numeric",
                                                                        hour: "2-digit",
                                                                        minute: "2-digit",
                                                                    }) })] }), requestDetail.hoKhauLienQuan && (_jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-500 mb-1", children: "H\u1ED9 kh\u1EA9u li\u00EAn quan" }), _jsx("p", { className: "text-base font-semibold text-gray-900", children: requestDetail.hoKhauLienQuan.soHoKhau || requestDetail.hoKhauLienQuan.diaChi || "-" })] }))] })] }), requestDetail.type === "TACH_HO_KHAU" && requestDetail.payload && (_jsxs("div", { className: "rounded-lg border border-gray-200 bg-white p-4", children: [_jsx("h3", { className: "text-lg font-semibold text-gray-900 mb-4", children: "Chi ti\u1EBFt y\u00EAu c\u1EA7u t\u00E1ch h\u1ED9 kh\u1EA9u" }), _jsxs("div", { className: "space-y-4", children: [requestDetail.payload.selectedNhanKhauIds && (_jsxs("div", { children: [_jsxs("p", { className: "text-sm font-medium text-gray-700 mb-2", children: ["Nh\u00E2n kh\u1EA9u t\u00E1ch ra (", requestDetail.payload.selectedNhanKhauIds.length, " ng\u01B0\u1EDDi)"] }), _jsxs("p", { className: "text-sm text-gray-600", children: ["IDs: ", requestDetail.payload.selectedNhanKhauIds.join(", ")] })] })), requestDetail.payload.newChuHoId && (_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-700 mb-2", children: "Ch\u1EE7 h\u1ED9 m\u1EDBi" }), _jsxs("p", { className: "text-sm text-gray-600", children: ["ID: ", requestDetail.payload.newChuHoId] })] })), requestDetail.payload.newAddress && (_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-700 mb-2", children: "\u0110\u1ECBa ch\u1EC9 h\u1ED9 kh\u1EA9u m\u1EDBi" }), _jsx("p", { className: "text-sm text-gray-600", children: requestDetail.payload.newAddress })] })), requestDetail.payload.expectedDate && (_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-700 mb-2", children: "Ng\u00E0y d\u1EF1 ki\u1EBFn t\u00E1ch h\u1ED9" }), _jsx("p", { className: "text-sm text-gray-600", children: new Date(requestDetail.payload.expectedDate).toLocaleDateString("vi-VN") })] })), requestDetail.payload.reason && (_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-700 mb-2", children: "L\u00FD do" }), _jsx("p", { className: "text-sm text-gray-600 whitespace-pre-wrap", children: requestDetail.payload.reason })] })), requestDetail.payload.note && (_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-700 mb-2", children: "Ghi ch\u00FA" }), _jsx("p", { className: "text-sm text-gray-600 whitespace-pre-wrap", children: requestDetail.payload.note })] }))] })] })), requestDetail.type === "SUA_NHAN_KHAU" && requestDetail.payload && (_jsxs("div", { className: "rounded-lg border border-gray-200 bg-white p-4", children: [_jsx("h3", { className: "text-lg font-semibold text-gray-900 mb-4", children: "Chi ti\u1EBFt y\u00EAu c\u1EA7u s\u1EEDa nh\u00E2n kh\u1EA9u" }), _jsxs("div", { className: "space-y-4", children: [requestDetail.payload.nhanKhauId && (_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-700 mb-2", children: "Nh\u00E2n kh\u1EA9u c\u1EA7n s\u1EEDa" }), _jsxs("p", { className: "text-sm text-gray-600", children: ["ID: ", requestDetail.payload.nhanKhauId] })] })), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-700 mb-2", children: "Th\u00F4ng tin thay \u0111\u1ED5i" }), _jsxs("div", { className: "bg-gray-50 rounded p-3 text-sm text-gray-600", children: [requestDetail.payload.hoTen && (_jsxs("p", { children: ["H\u1ECD t\u00EAn: ", requestDetail.payload.hoTen] })), requestDetail.payload.cccd && (_jsxs("p", { children: ["CCCD: ", requestDetail.payload.cccd] })), requestDetail.payload.ngaySinh && (_jsxs("p", { children: ["Ng\u00E0y sinh:", " ", new Date(requestDetail.payload.ngaySinh).toLocaleDateString("vi-VN")] })), requestDetail.payload.gioiTinh && (_jsxs("p", { children: ["Gi\u1EDBi t\u00EDnh:", " ", requestDetail.payload.gioiTinh === "nam"
                                                                                    ? "Nam"
                                                                                    : requestDetail.payload.gioiTinh === "nu"
                                                                                        ? "Nữ"
                                                                                        : "Khác"] }))] })] }), requestDetail.payload.lyDo && (_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-700 mb-2", children: "L\u00FD do" }), _jsx("p", { className: "text-sm text-gray-600 whitespace-pre-wrap", children: requestDetail.payload.lyDo })] }))] })] })), requestDetail.type === "XOA_NHAN_KHAU" && requestDetail.payload && (_jsxs("div", { className: "rounded-lg border border-gray-200 bg-white p-4", children: [_jsx("h3", { className: "text-lg font-semibold text-gray-900 mb-4", children: "Chi ti\u1EBFt y\u00EAu c\u1EA7u xo\u00E1 nh\u00E2n kh\u1EA9u" }), _jsxs("div", { className: "space-y-4", children: [requestDetail.payload.nhanKhauId && (_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-700 mb-2", children: "Nh\u00E2n kh\u1EA9u c\u1EA7n xo\u00E1" }), _jsxs("p", { className: "text-sm text-gray-600", children: ["ID: ", requestDetail.payload.nhanKhauId] })] })), requestDetail.payload.lyDo && (_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-700 mb-2", children: "L\u00FD do" }), _jsx("p", { className: "text-sm text-gray-600 whitespace-pre-wrap", children: requestDetail.payload.lyDo })] }))] })] })), requestDetail.status === "pending" && (_jsxs("div", { className: "flex gap-3 pt-4 border-t border-gray-200", children: [_jsx("button", { onClick: handleApprove, disabled: isSubmitting, className: "flex-1 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 px-4 py-2.5 text-sm font-medium text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed", children: isSubmitting ? "Đang xử lý..." : "Duyệt" }), _jsx("button", { onClick: () => setShowRejectModal(true), disabled: isSubmitting, className: "flex-1 rounded-lg border border-red-300 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed", children: "T\u1EEB ch\u1ED1i" })] }))] })) : (_jsx("div", { className: "text-center py-12", children: _jsx("p", { className: "text-gray-500", children: "Kh\u00F4ng t\u00ECm th\u1EA5y th\u00F4ng tin y\u00EAu c\u1EA7u." }) }))] })] }) }), showRejectModal && (_jsx("div", { className: "fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4", children: _jsxs("div", { className: "w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-xl p-6", onClick: (e) => e.stopPropagation(), children: [_jsx("h3", { className: "text-lg font-semibold text-gray-900 mb-4", children: "T\u1EEB ch\u1ED1i y\u00EAu c\u1EA7u" }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsxs("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: ["L\u00FD do t\u1EEB ch\u1ED1i ", _jsx("span", { className: "text-red-500", children: "*" })] }), _jsx("textarea", { value: rejectReason, onChange: (e) => setRejectReason(e.target.value), rows: 4, className: "w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20", placeholder: "Nh\u1EADp l\u00FD do t\u1EEB ch\u1ED1i..." })] }), _jsxs("div", { className: "flex gap-3", children: [_jsx("button", { onClick: () => {
                                                setShowRejectModal(false);
                                                setRejectReason("");
                                            }, className: "flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors", children: "Hu\u1EF7" }), _jsx("button", { onClick: handleReject, disabled: isSubmitting || !rejectReason.trim(), className: "flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed", children: isSubmitting ? "Đang xử lý..." : "Xác nhận từ chối" })] })] })] }) }))] }));
}
