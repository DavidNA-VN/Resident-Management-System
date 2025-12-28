import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiService } from "../services/api";
const inputBaseClasses = "w-full rounded-xl border border-slate-600/60 bg-slate-800/90 px-4 py-3 text-sm text-white shadow-[0_8px_24px_rgba(0,0,0,0.4)] transition-all duration-300 placeholder:text-slate-500 focus:border-cyan-400 focus:bg-slate-800 focus:shadow-[0_12px_32px_rgba(14,165,233,0.35)] focus:outline-none focus:-translate-y-0.5 focus:ring-2 focus:ring-cyan-400/20";
export default function Login() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [modalType, setModalType] = useState(null);
    const navigate = useNavigate();
    // Register form state
    const [registerForm, setRegisterForm] = useState({
        username: "",
        password: "",
        fullName: "",
        role: "nguoi_dan",
        task: undefined,
    });
    const [confirmPassword, setConfirmPassword] = useState("");
    const handleLogin = async (event) => {
        event.preventDefault();
        setError(null);
        setIsSubmitting(true);
        try {
            const response = await apiService.login({ username, password });
            if (response.success && response.data.accessToken) {
                localStorage.setItem("accessToken", response.data.accessToken);
                localStorage.setItem("userInfo", JSON.stringify(response.data.user));
                localStorage.setItem("isAuthenticated", "true");
                setModalType(null);
                // Redirect based on role
                if (response.data.user.role === "nguoi_dan") {
                    // Hiển thị thông báo nếu chưa liên kết
                    if (response.data.user.linked === false) {
                        alert(response.data.user.message || "Chưa có hồ sơ nhân khẩu. Vui lòng tạo yêu cầu hoặc chờ tổ trưởng duyệt.");
                    }
                    navigate("/citizen/home");
                }
                else {
                    navigate("/dashboard");
                }
            }
        }
        catch (err) {
            setError(err.error?.message || "Đăng nhập thất bại. Vui lòng thử lại.");
        }
        finally {
            setIsSubmitting(false);
        }
    };
    const handleRegister = async (event) => {
        event.preventDefault();
        setError(null);
        // Validation
        if (registerForm.password !== confirmPassword) {
            setError("Mật khẩu xác nhận không khớp");
            return;
        }
        if (registerForm.role === "can_bo" && !registerForm.task) {
            setError("Vui lòng chọn nhiệm vụ cho cán bộ");
            return;
        }
        setIsSubmitting(true);
        try {
            const response = await apiService.register(registerForm);
            if (response.success) {
                setModalType("login");
                setError(null);
                alert("Đăng ký thành công! Vui lòng đăng nhập.");
                // Reset form
                setRegisterForm({
                    username: "",
                    password: "",
                    fullName: "",
                    role: "nguoi_dan",
                    task: undefined,
                });
                setConfirmPassword("");
            }
        }
        catch (err) {
            setError(err.error?.message || "Đăng ký thất bại. Vui lòng thử lại.");
        }
        finally {
            setIsSubmitting(false);
        }
    };
    const closeModal = () => {
        setModalType(null);
        setIsSubmitting(false);
        setError(null);
    };
    const roleOptions = [
        { key: "to_truong", label: "Tổ trưởng" },
        { key: "to_pho", label: "Tổ phó" },
        { key: "can_bo", label: "Cán bộ" },
        { key: "nguoi_dan", label: "Người dân" },
    ];
    const taskOptions = [
        { key: "hokhau_nhankhau", label: "Hộ khẩu / Nhân khẩu" },
        { key: "tamtru_tamvang", label: "Tạm trú / Tạm vắng" },
        { key: "thongke", label: "Thống kê" },
        { key: "kiennghi", label: "Kiến nghị" },
    ];
    return (_jsxs("div", { className: "relative min-h-screen overflow-hidden", children: [_jsx("img", { src: "/images/back-up-fe.jpg", alt: "Ph\u01B0\u1EDDng La Kh\u00EA", className: "absolute inset-0 h-full w-full object-cover", loading: "lazy" }), _jsx("div", { className: "absolute inset-0 bg-gradient-to-b from-slate-950/50 via-slate-950/40 to-slate-950/50", "aria-hidden": "true" }), _jsx("header", { className: "relative z-20 flex justify-end p-6", children: _jsxs("div", { className: "flex gap-3", children: [_jsx("button", { onClick: () => setModalType("login"), className: "rounded-xl border-2 border-slate-600/50 bg-slate-900/80 backdrop-blur-sm px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:border-cyan-400/60 hover:bg-slate-800/90 hover:shadow-cyan-500/20", children: "\u0110\u0103ng nh\u1EADp" }), _jsx("button", { onClick: () => setModalType("register"), className: "rounded-xl border-2 border-cyan-400/60 bg-gradient-to-r from-cyan-500/30 to-blue-500/25 px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:from-cyan-500/40 hover:to-blue-500/35 hover:shadow-cyan-500/30", children: "\u0110\u0103ng k\u00FD" })] }) }), _jsx("main", { className: "relative z-10 flex min-h-screen items-start justify-center px-4 pt-24 md:pt-32", children: _jsxs("div", { className: "text-center text-white", children: [_jsx("p", { className: "mb-4 text-sm uppercase tracking-[0.4em] text-cyan-400 font-semibold", children: "Ph\u01B0\u1EDDng La Kh\u00EA" }), _jsxs("h1", { className: "mb-4 font-display text-4xl font-bold leading-tight md:text-5xl", children: ["C\u1ED5ng qu\u1EA3n l\u00FD d\u00E2n c\u01B0", _jsx("br", {}), "T\u1ED5 d\u00E2n ph\u1ED1 s\u1ED1 7"] }), _jsx("p", { className: "mx-auto max-w-2xl text-lg text-slate-300", children: "H\u1EC7 th\u1ED1ng qu\u1EA3n l\u00FD h\u1ED9 kh\u1EA9u, nh\u00E2n kh\u1EA9u v\u00E0 ph\u1EA3n \u00E1nh ki\u1EBFn ngh\u1ECB" })] }) }), modalType && (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4", onClick: closeModal, children: _jsxs("div", { className: "w-full max-w-md rounded-2xl border border-slate-600/40 bg-slate-900/95 backdrop-blur-xl p-7 shadow-[0_25px_100px_rgba(0,0,0,0.7)] ring-1 ring-slate-700/50", onClick: (e) => e.stopPropagation(), children: [_jsxs("div", { className: "mb-6 flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-2xl font-bold text-white", children: modalType === "login" ? "Đăng nhập" : "Đăng ký" }), _jsx("p", { className: "mt-1 text-sm text-slate-400", children: modalType === "login"
                                                ? "Chào mừng trở lại"
                                                : "Tạo tài khoản mới" })] }), _jsx("button", { onClick: closeModal, className: "rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors", children: "\u2715" })] }), error && (_jsx("div", { className: "mb-4 rounded-lg bg-red-900/30 border border-red-500/50 p-3 text-sm text-red-300", children: error })), modalType === "login" && (_jsxs("form", { onSubmit: handleLogin, className: "space-y-5", children: [_jsxs("label", { className: "block text-sm font-medium text-slate-200", children: ["M\u00E3 \u0111\u0103ng nh\u1EADp / CCCD", _jsx("span", { className: "mt-2 block", children: _jsx("input", { type: "text", name: "username", required: true, value: username, onChange: (e) => setUsername(e.target.value), className: inputBaseClasses, placeholder: "VD: 0799 123 456" }) })] }), _jsxs("label", { className: "block text-sm font-medium text-slate-200", children: ["M\u1EADt kh\u1EA9u", _jsx("span", { className: "mt-2 block", children: _jsx("input", { type: "password", name: "password", required: true, value: password, onChange: (e) => setPassword(e.target.value), className: inputBaseClasses, placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" }) })] }), _jsxs("div", { className: "flex items-center justify-between text-xs", children: [_jsxs("label", { className: "inline-flex items-center gap-2 text-slate-300 cursor-pointer", children: [_jsx("input", { type: "checkbox", className: "h-4 w-4 rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-2 focus:ring-cyan-400/50 cursor-pointer" }), "Gi\u1EEF \u0111\u0103ng nh\u1EADp"] }), _jsx("button", { type: "button", className: "font-medium text-cyan-400 hover:text-cyan-300 transition-colors", children: "Qu\u00EAn m\u1EADt kh\u1EA9u?" })] }), _jsx("button", { type: "submit", className: "mt-4 w-full rounded-xl bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 px-6 py-3.5 text-sm font-bold uppercase tracking-[0.2em] text-white shadow-[0_12px_40px_rgba(14,165,233,0.5)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_50px_rgba(14,165,233,0.6)] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed", disabled: isSubmitting, children: isSubmitting ? "Đang xác thực..." : "Đăng nhập" }), _jsxs("p", { className: "text-center text-xs text-slate-500", children: ["Ch\u01B0a c\u00F3 t\u00E0i kho\u1EA3n?", " ", _jsx("button", { type: "button", onClick: () => setModalType("register"), className: "font-medium text-cyan-400 hover:text-cyan-300", children: "\u0110\u0103ng k\u00FD ngay" })] })] })), modalType === "register" && (_jsxs("form", { onSubmit: handleRegister, className: "space-y-5", children: [_jsxs("label", { className: "block text-sm font-medium text-slate-200", children: ["H\u1ECD v\u00E0 t\u00EAn", _jsx("span", { className: "mt-2 block", children: _jsx("input", { type: "text", name: "fullName", required: true, value: registerForm.fullName, onChange: (e) => setRegisterForm({
                                                    ...registerForm,
                                                    fullName: e.target.value,
                                                }), className: inputBaseClasses, placeholder: "Nh\u1EADp h\u1ECD v\u00E0 t\u00EAn" }) })] }), _jsxs("label", { className: "block text-sm font-medium text-slate-200", children: ["S\u1ED1 CCCD/CMND", _jsx("span", { className: "mt-2 block", children: _jsx("input", { type: "text", name: "cccd", required: true, value: registerForm.username, onChange: (e) => setRegisterForm({
                                                    ...registerForm,
                                                    username: e.target.value,
                                                }), className: inputBaseClasses, placeholder: "VD: 079912345678" }) })] }), _jsxs("label", { className: "block text-sm font-medium text-slate-200", children: ["S\u1ED1 \u0111i\u1EC7n tho\u1EA1i", _jsx("span", { className: "mt-2 block", children: _jsx("input", { type: "tel", name: "phone", className: inputBaseClasses, placeholder: "VD: 0901234567" }) })] }), _jsxs("label", { className: "block text-sm font-medium text-slate-200", children: ["M\u1EADt kh\u1EA9u", _jsx("span", { className: "mt-2 block", children: _jsx("input", { type: "password", name: "password", required: true, value: registerForm.password, onChange: (e) => setRegisterForm({
                                                    ...registerForm,
                                                    password: e.target.value,
                                                }), className: inputBaseClasses, placeholder: "T\u1ED1i thi\u1EC3u 6 k\u00FD t\u1EF1" }) })] }), _jsxs("label", { className: "block text-sm font-medium text-slate-200", children: ["X\u00E1c nh\u1EADn m\u1EADt kh\u1EA9u", _jsx("span", { className: "mt-2 block", children: _jsx("input", { type: "password", name: "confirmPassword", required: true, value: confirmPassword, onChange: (e) => setConfirmPassword(e.target.value), className: inputBaseClasses, placeholder: "Nh\u1EADp l\u1EA1i m\u1EADt kh\u1EA9u" }) })] }), _jsxs("div", { children: [_jsxs("label", { className: "block text-sm font-medium text-slate-200 mb-2", children: ["Vai tr\u00F2 ", _jsx("span", { className: "text-red-400", children: "*" })] }), _jsx("div", { className: "grid grid-cols-2 gap-3", children: roleOptions.map((option) => (_jsx("button", { type: "button", onClick: () => {
                                                    setRegisterForm({
                                                        ...registerForm,
                                                        role: option.key,
                                                        task: option.key === "can_bo"
                                                            ? registerForm.task
                                                            : undefined,
                                                    });
                                                }, className: `rounded-xl border-2 px-4 py-3 text-xs font-semibold uppercase tracking-[0.15em] transition-all duration-300 ${registerForm.role === option.key
                                                    ? "border-cyan-400 bg-gradient-to-r from-cyan-500/30 to-blue-500/25 text-white shadow-[0_8px_24px_rgba(14,165,233,0.4)] scale-[1.02]"
                                                    : "border-slate-600/50 bg-slate-800/50 text-slate-300 hover:border-slate-500 hover:bg-slate-800/70 hover:text-white"}`, children: option.label }, option.key))) })] }), registerForm.role === "can_bo" && (_jsxs("div", { children: [_jsxs("label", { className: "block text-sm font-medium text-slate-200 mb-2", children: ["Nhi\u1EC7m v\u1EE5 ", _jsx("span", { className: "text-red-400", children: "*" })] }), _jsx("div", { className: "grid grid-cols-2 gap-3", children: taskOptions.map((option) => (_jsx("button", { type: "button", onClick: () => {
                                                    setRegisterForm({
                                                        ...registerForm,
                                                        task: option.key,
                                                    });
                                                }, className: `rounded-xl border-2 px-4 py-3 text-xs font-semibold uppercase tracking-[0.15em] transition-all duration-300 ${registerForm.task === option.key
                                                    ? "border-cyan-400 bg-gradient-to-r from-cyan-500/30 to-blue-500/25 text-white shadow-[0_8px_24px_rgba(14,165,233,0.4)] scale-[1.02]"
                                                    : "border-slate-600/50 bg-slate-800/50 text-slate-300 hover:border-slate-500 hover:bg-slate-800/70 hover:text-white"}`, children: option.label }, option.key))) })] })), _jsxs("div", { className: "flex items-start gap-2 text-xs", children: [_jsx("input", { type: "checkbox", required: true, className: "mt-1 h-4 w-4 rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-2 focus:ring-cyan-400/50 cursor-pointer" }), _jsxs("label", { className: "text-slate-300 cursor-pointer", children: ["T\u00F4i \u0111\u1ED3ng \u00FD v\u1EDBi", " ", _jsx("button", { type: "button", className: "text-cyan-400 hover:text-cyan-300", children: "\u0110i\u1EC1u kho\u1EA3n s\u1EED d\u1EE5ng" }), " ", "v\u00E0", " ", _jsx("button", { type: "button", className: "text-cyan-400 hover:text-cyan-300", children: "Ch\u00EDnh s\u00E1ch b\u1EA3o m\u1EADt" })] })] }), _jsx("button", { type: "submit", className: "mt-4 w-full rounded-xl bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 px-6 py-3.5 text-sm font-bold uppercase tracking-[0.2em] text-white shadow-[0_12px_40px_rgba(14,165,233,0.5)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_50px_rgba(14,165,233,0.6)] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed", disabled: isSubmitting, children: isSubmitting ? "Đang xử lý..." : "Đăng ký" }), _jsxs("p", { className: "text-center text-xs text-slate-500", children: ["\u0110\u00E3 c\u00F3 t\u00E0i kho\u1EA3n?", " ", _jsx("button", { type: "button", onClick: () => setModalType("login"), className: "font-medium text-cyan-400 hover:text-cyan-300", children: "\u0110\u0103ng nh\u1EADp ngay" })] })] }))] }) }))] }));
}
