import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { apiService } from "../services/api";
export default function HoKhau() {
    const [hoKhauList, setHoKhauList] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    // Form state
    const [formData, setFormData] = useState({
        soHoKhau: "",
        diaChi: "",
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
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent", children: "Qu\u1EA3n l\u00FD H\u1ED9 kh\u1EA9u" }), _jsx("p", { className: "mt-1 text-gray-600", children: "T\u1EA1o v\u00E0 qu\u1EA3n l\u00FD th\u00F4ng tin h\u1ED9 kh\u1EA9u" })] }), _jsx("button", { onClick: () => setShowCreateForm(true), className: "rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 px-6 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg hover:-translate-y-0.5", children: "+ T\u1EA1o h\u1ED9 kh\u1EA9u m\u1EDBi" })] }), error && (_jsx("div", { className: "rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700", children: error })), success && (_jsx("div", { className: "rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-700", children: success })), showCreateForm && (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4", children: _jsxs("div", { className: "w-full max-w-2xl rounded-xl border border-gray-200 bg-white p-6 shadow-2xl", children: [_jsxs("div", { className: "mb-6 flex items-center justify-between", children: [_jsx("h2", { className: "text-xl font-bold text-gray-900", children: "T\u1EA1o h\u1ED9 kh\u1EA9u m\u1EDBi" }), _jsx("button", { onClick: () => setShowCreateForm(false), className: "rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600", children: "\u2715" })] }), _jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [_jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["S\u1ED1 h\u1ED9 kh\u1EA9u ", _jsx("span", { className: "text-red-500", children: "*" }), _jsx("input", { type: "text", required: true, value: formData.soHoKhau, onChange: (e) => setFormData({ ...formData, soHoKhau: e.target.value }), className: "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20", placeholder: "VD: HK001" })] }), _jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["Ng\u00E0y c\u1EA5p", _jsx("input", { type: "date", value: formData.ngayCap, onChange: (e) => setFormData({ ...formData, ngayCap: e.target.value }), className: "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" })] })] }), _jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["\u0110\u1ECBa ch\u1EC9 ", _jsx("span", { className: "text-red-500", children: "*" }), _jsx("input", { type: "text", required: true, value: formData.diaChi, onChange: (e) => setFormData({ ...formData, diaChi: e.target.value }), className: "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20", placeholder: "\u0110\u1ECBa ch\u1EC9 \u0111\u1EA7y \u0111\u1EE7" })] }), _jsxs("div", { className: "grid grid-cols-3 gap-4", children: [_jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["T\u1EC9nh/Th\u00E0nh ph\u1ED1", _jsx("input", { type: "text", value: formData.tinhThanh, onChange: (e) => setFormData({ ...formData, tinhThanh: e.target.value }), className: "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" })] }), _jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["Qu\u1EADn/Huy\u1EC7n", _jsx("input", { type: "text", value: formData.quanHuyen, onChange: (e) => setFormData({ ...formData, quanHuyen: e.target.value }), className: "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" })] }), _jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["Ph\u01B0\u1EDDng/X\u00E3", _jsx("input", { type: "text", value: formData.phuongXa, onChange: (e) => setFormData({ ...formData, phuongXa: e.target.value }), className: "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" })] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["\u0110\u01B0\u1EDDng/Ph\u1ED1", _jsx("input", { type: "text", value: formData.duongPho, onChange: (e) => setFormData({ ...formData, duongPho: e.target.value }), className: "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" })] }), _jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["S\u1ED1 nh\u00E0", _jsx("input", { type: "text", value: formData.soNha, onChange: (e) => setFormData({ ...formData, soNha: e.target.value }), className: "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" })] })] }), _jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["Ghi ch\u00FA", _jsx("textarea", { value: formData.ghiChu, onChange: (e) => setFormData({ ...formData, ghiChu: e.target.value }), rows: 3, className: "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20", placeholder: "Ghi ch\u00FA th\u00EAm..." })] }), _jsxs("div", { className: "flex gap-3 pt-4", children: [_jsx("button", { type: "submit", disabled: isLoading, className: "flex-1 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg disabled:opacity-50", children: isLoading ? "Đang tạo..." : "Tạo hộ khẩu" }), _jsx("button", { type: "button", onClick: () => setShowCreateForm(false), className: "rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50", children: "H\u1EE7y" })] })] })] }) })), _jsxs("div", { className: "rounded-xl border border-gray-200 bg-white shadow-sm", children: [_jsx("div", { className: "border-b border-gray-200 p-4", children: _jsxs("h2", { className: "text-lg font-semibold text-gray-900", children: ["Danh s\u00E1ch h\u1ED9 kh\u1EA9u (", hoKhauList.length, ")"] }) }), isLoading && hoKhauList.length === 0 ? (_jsx("div", { className: "p-8 text-center text-gray-500", children: "\u0110ang t\u1EA3i..." })) : hoKhauList.length === 0 ? (_jsx("div", { className: "p-8 text-center text-gray-500", children: "Ch\u01B0a c\u00F3 h\u1ED9 kh\u1EA9u n\u00E0o. H\u00E3y t\u1EA1o h\u1ED9 kh\u1EA9u m\u1EDBi!" })) : (_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full", children: [_jsx("thead", { className: "bg-gray-50", children: _jsxs("tr", { children: [_jsx("th", { className: "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700", children: "S\u1ED1 h\u1ED9 kh\u1EA9u" }), _jsx("th", { className: "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700", children: "\u0110\u1ECBa ch\u1EC9" }), _jsx("th", { className: "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700", children: "Tr\u1EA1ng th\u00E1i" }), _jsx("th", { className: "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700", children: "Ng\u00E0y t\u1EA1o" })] }) }), _jsx("tbody", { className: "divide-y divide-gray-200", children: hoKhauList.map((hk) => (_jsxs("tr", { className: "hover:bg-gray-50", children: [_jsx("td", { className: "px-4 py-3 text-sm font-medium text-gray-900", children: hk.soHoKhau }), _jsx("td", { className: "px-4 py-3 text-sm text-gray-600", children: hk.diaChi }), _jsx("td", { className: "px-4 py-3", children: getTrangThaiBadge(hk.trangThai) }), _jsx("td", { className: "px-4 py-3 text-sm text-gray-500", children: new Date(hk.createdAt).toLocaleDateString("vi-VN") })] }, hk.id))) })] }) }))] })] }));
}
