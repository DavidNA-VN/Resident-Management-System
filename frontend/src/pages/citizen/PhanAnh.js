import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { apiService } from "../../services/api";

const loaiLabels = {
    co_so_ha_tang: "Cơ sở hạ tầng",
    moi_truong: "Môi trường",
    an_ninh: "An ninh",
    y_te: "Y tế",
    giao_duc: "Giáo dục",
    khac: "Khác",
};

const statusLabels = {
    cho_xu_ly: "Chờ xử lý",
    dang_xu_ly: "Đang xử lý",
    da_xu_ly: "Đã xử lý",
    tu_choi: "Từ chối",
};

const statusColors = {
    cho_xu_ly: "bg-yellow-100 text-yellow-700",
    dang_xu_ly: "bg-blue-100 text-blue-700",
    da_xu_ly: "bg-green-100 text-green-700",
    tu_choi: "bg-red-100 text-red-700",
};

export default function PhanAnh() {
    const [formData, setFormData] = useState({
        tieuDe: "",
        noiDung: "",
        loai: "khac",
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [feedbacks, setFeedbacks] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        loadFeedbacks();
    }, []);

    const loadFeedbacks = async () => {
        setIsLoading(true);
        try {
            const response = await apiService.getMyFeedbacks();
            if (response.success) {
                setFeedbacks(response.data || []);
            }
        }
        catch (err) {
            console.error("Failed to load feedbacks:", err);
        }
        finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        if (!formData.tieuDe.trim() || !formData.noiDung.trim()) {
            setError("Vui lòng điền đầy đủ tiêu đề và nội dung");
            return;
        }
        setIsSubmitting(true);
        try {
            const response = await apiService.createFeedback({
                tieuDe: formData.tieuDe,
                noiDung: formData.noiDung,
                loai: formData.loai,
            });
            if (response.success) {
                setSuccess("Gửi phản ánh thành công!");
                setFormData({
                    tieuDe: "",
                    noiDung: "",
                    loai: "khac",
                });
                loadFeedbacks();
                setTimeout(() => setSuccess(null), 3000);
            }
        }
        catch (err) {
            setError(err.error?.message || "Có lỗi xảy ra khi gửi phản ánh");
        }
        finally {
            setIsSubmitting(false);
        }
    };

    return (_jsxs("div", { className: "space-y-6", children: [
        _jsxs("div", { className: "rounded-xl border border-blue-200/60 bg-gradient-to-r from-blue-50 via-cyan-50 to-teal-50 p-6 shadow-sm backdrop-blur-sm", children: [
            _jsx("h1", { className: "text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent", children: "Phản ánh ý kiến" }), 
            _jsx("p", { className: "mt-2 text-gray-600", children: "Gửi phản ánh, kiến nghị của bạn đến tổ dân phố" })
        ] }), 
        success && (_jsx("div", { className: "rounded-lg bg-green-50 border border-green-200 p-4 text-green-700", children: success })), 
        error && (_jsx("div", { className: "rounded-lg bg-red-50 border border-red-200 p-4 text-red-700", children: error })), 
        _jsxs("div", { className: "rounded-xl border border-gray-200/80 bg-white p-6 shadow-sm", children: [
            _jsxs("h2", { className: "text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2", children: [_jsx("span", { children: "📝" }), "Gửi phản ánh mới"] }), 
            _jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [
                _jsxs("div", { children: [
                    _jsxs("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: ["Tiêu đề ", _jsx("span", { className: "text-red-500", children: "*" })] }), 
                    _jsx("input", { type: "text", value: formData.tieuDe, onChange: (e) => setFormData({ ...formData, tieuDe: e.target.value }), className: "w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20", placeholder: "Nhập tiêu đề phản ánh...", required: true })
                ] }), 
                _jsxs("div", { children: [
                    _jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Loại phản ánh" }), 
                    _jsx("select", { value: formData.loai, onChange: (e) => setFormData({ ...formData, loai: e.target.value }), className: "w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20", children: Object.entries(loaiLabels).map(([key, label]) => (_jsx("option", { value: key, children: label }, key))) })
                ] }), 
                _jsxs("div", { children: [
                    _jsxs("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: ["Nội dung phản ánh ", _jsx("span", { className: "text-red-500", children: "*" })] }), 
                    _jsx("textarea", { value: formData.noiDung, onChange: (e) => setFormData({ ...formData, noiDung: e.target.value }), rows: 6, className: "w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20", placeholder: "Nhập nội dung phản ánh, kiến nghị của bạn...", required: true })
                ] }), 
                _jsx("div", { className: "flex gap-3 pt-2", children: _jsx("button", { type: "submit", className: "rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 px-6 py-2.5 text-sm font-medium text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed", disabled: isSubmitting, children: isSubmitting ? "Đang gửi..." : "Gửi phản ánh" }) })
            ] })
        ] }), 
        _jsxs("div", { className: "rounded-xl border border-gray-200/80 bg-white p-6 shadow-sm", children: [
            _jsxs("h2", { className: "text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2", children: [_jsx("span", { children: "📋" }), "Phản ánh của tôi"] }), 
            isLoading ? (_jsxs("div", { className: "text-center py-8", children: [
                _jsx("div", { className: "inline-block h-6 w-6 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent" }), 
                _jsx("p", { className: "mt-2 text-gray-600", children: "Đang tải..." })
            ] })) : feedbacks.length === 0 ? (_jsx("p", { className: "text-gray-500 text-center py-8", children: "Bạn chưa có phản ánh nào." })) : (_jsx("div", { className: "space-y-3", children: feedbacks.map((feedback) => (_jsxs("div", { className: "rounded-lg border border-gray-200 bg-gray-50 p-4 hover:bg-gray-100 transition-colors", children: [
                _jsxs("div", { className: "flex items-start justify-between mb-2", children: [
                    _jsx("h4", { className: "font-semibold text-gray-900", children: feedback.tieuDe }), 
                    _jsxs("div", { className: "flex items-center gap-2", children: [
                        _jsx("span", { className: `px-2 py-1 rounded text-xs font-semibold ${statusColors[feedback.trangThai] || "bg-gray-100 text-gray-700"}`, children: statusLabels[feedback.trangThai] || feedback.trangThai }), 
                        _jsx("span", { className: "px-2 py-1 rounded text-xs font-medium bg-blue-50 text-blue-700", children: loaiLabels[feedback.loai] || feedback.loai })
                    ] })
                ] }), 
                _jsx("p", { className: "text-sm text-gray-700 mb-2", children: feedback.noiDung }),
                
                /* PHẦN HIỂN THỊ PHẢN HỒI (MỚI THÊM) */
                feedback.ketQuaXuLy && (_jsxs("div", { className: "mt-3 p-3 bg-emerald-50 border border-emerald-100 rounded-lg", children: [
                    _jsx("p", { className: "text-xs font-bold text-emerald-700 uppercase mb-1", children: "💬 Phản hồi từ Tổ dân phố:" }),
                    _jsx("p", { className: "text-sm text-emerald-800 font-medium", children: feedback.ketQuaXuLy }),
                    feedback.ngayXuLy && (_jsxs("p", { className: "text-[10px] text-emerald-600 mt-2 italic text-right", children: ["Cập nhật lúc: ", new Date(feedback.ngayXuLy).toLocaleString("vi-VN")] }))
                ] })),

                _jsxs("p", { className: "text-xs text-gray-500 mt-3 border-t pt-2", children: ["Ngày gửi:", " ", new Date(feedback.ngayTao).toLocaleDateString("vi-VN", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                })] })
            ] }, feedback.id))) }))
        ] })
    ] }));
}