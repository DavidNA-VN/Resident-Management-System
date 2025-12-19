import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";

type RoleKey = "to_truong" | "nguoi_dan";
type ModalType = "login" | "register" | null;

const inputBaseClasses =
  "w-full rounded-xl border border-slate-600/60 bg-slate-800/90 px-4 py-3 text-sm text-white shadow-[0_8px_24px_rgba(0,0,0,0.4)] transition-all duration-300 placeholder:text-slate-500 focus:border-cyan-400 focus:bg-slate-800 focus:shadow-[0_12px_32px_rgba(14,165,233,0.35)] focus:outline-none focus:-translate-y-0.5 focus:ring-2 focus:ring-cyan-400/20";

export default function Login() {
  const [role, setRole] = useState<RoleKey>("to_truong");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalType, setModalType] = useState<ModalType>(null);
  const navigate = useNavigate();

  const handleLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      localStorage.setItem("userRole", role);
      localStorage.setItem("isAuthenticated", "true");
      setModalType(null);
      navigate("/dashboard");
    }, 900);
  };

  const handleRegister = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      // Chuyển sang form đăng nhập sau khi đăng ký
      setModalType("login");
      alert("Đăng ký thành công! Vui lòng đăng nhập.");
    }, 900);
  };

  const closeModal = () => {
    setModalType(null);
    setIsSubmitting(false);
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <img
        src="/images/back-up-fe.jpg"
        alt="Phường La Khê"
        className="absolute inset-0 h-full w-full object-cover"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/50 via-slate-950/40 to-slate-950/50" aria-hidden="true" />

      {/* Header với nút Đăng nhập/Đăng ký */}
      <header className="relative z-20 flex justify-end p-6">
        <div className="flex gap-3">
          <button
            onClick={() => setModalType("login")}
            className="rounded-xl border-2 border-slate-600/50 bg-slate-900/80 backdrop-blur-sm px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:border-cyan-400/60 hover:bg-slate-800/90 hover:shadow-cyan-500/20"
          >
            Đăng nhập
          </button>
          <button
            onClick={() => setModalType("register")}
            className="rounded-xl border-2 border-cyan-400/60 bg-gradient-to-r from-cyan-500/30 to-blue-500/25 px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:from-cyan-500/40 hover:to-blue-500/35 hover:shadow-cyan-500/30"
          >
            Đăng ký
          </button>
        </div>
      </header>

      {/* Main Content - Welcome Section */}
      <main className="relative z-10 flex min-h-screen items-start justify-center px-4 pt-24 md:pt-32">
        <div className="text-center text-white">
          <p className="mb-4 text-sm uppercase tracking-[0.4em] text-cyan-400 font-semibold">Phường La Khê</p>
          <h1 className="mb-4 font-display text-4xl font-bold leading-tight md:text-5xl">
            Cổng quản lý dân cư<br />Tổ dân phố số 7
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-slate-300">
            Hệ thống quản lý hộ khẩu, nhân khẩu và phản ánh kiến nghị
          </p>
        </div>
      </main>

      {/* Modal Overlay */}
      {modalType && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={closeModal}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-600/40 bg-slate-900/95 backdrop-blur-xl p-7 shadow-[0_25px_100px_rgba(0,0,0,0.7)] ring-1 ring-slate-700/50"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {modalType === "login" ? "Đăng nhập" : "Đăng ký"}
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  {modalType === "login" ? "Chào mừng trở lại" : "Tạo tài khoản mới"}
                </p>
              </div>
              <button
                onClick={closeModal}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Role Selection - Chỉ hiện khi đăng nhập */}
            {modalType === "login" && (
              <div className="mb-6 grid grid-cols-2 gap-3">
                {(
                  [
                    { key: "to_truong", label: "Tổ trưởng" },
                    { key: "nguoi_dan", label: "Người dân" }
                  ] as Array<{ key: RoleKey; label: string }>
                ).map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setRole(option.key)}
                    className={`rounded-xl border-2 px-4 py-3 text-xs font-semibold uppercase tracking-[0.15em] transition-all duration-300 ${
                      role === option.key
                        ? "border-cyan-400 bg-gradient-to-r from-cyan-500/30 to-blue-500/25 text-white shadow-[0_8px_24px_rgba(14,165,233,0.4)] scale-[1.02]"
                        : "border-slate-600/50 bg-slate-800/50 text-slate-300 hover:border-slate-500 hover:bg-slate-800/70 hover:text-white"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}

            {/* Login Form */}
            {modalType === "login" && (
              <form onSubmit={handleLogin} className="space-y-5">
                <label className="block text-sm font-medium text-slate-200">
                  Mã đăng nhập / CCCD
                  <span className="mt-2 block">
                    <input type="text" name="username" required className={inputBaseClasses} placeholder="VD: 0799 123 456" />
                  </span>
                </label>

                <label className="block text-sm font-medium text-slate-200">
                  Mật khẩu
                  <span className="mt-2 block">
                    <input type="password" name="password" required className={inputBaseClasses} placeholder="••••••••" />
                  </span>
                </label>

                <div className="flex items-center justify-between text-xs">
                  <label className="inline-flex items-center gap-2 text-slate-300 cursor-pointer">
                    <input type="checkbox" className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-2 focus:ring-cyan-400/50 cursor-pointer" />
                    Giữ đăng nhập
                  </label>
                  <button type="button" className="font-medium text-cyan-400 hover:text-cyan-300 transition-colors">
                    Quên mật khẩu?
                  </button>
                </div>

                <button
                  type="submit"
                  className="mt-4 w-full rounded-xl bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 px-6 py-3.5 text-sm font-bold uppercase tracking-[0.2em] text-white shadow-[0_12px_40px_rgba(14,165,233,0.5)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_50px_rgba(14,165,233,0.6)] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Đang xác thực..." : "Đăng nhập"}
                </button>

                <p className="text-center text-xs text-slate-500">
                  Chưa có tài khoản?{" "}
                  <button
                    type="button"
                    onClick={() => setModalType("register")}
                    className="font-medium text-cyan-400 hover:text-cyan-300"
                  >
                    Đăng ký ngay
                  </button>
                </p>
              </form>
            )}

            {/* Register Form */}
            {modalType === "register" && (
              <form onSubmit={handleRegister} className="space-y-5">
                <label className="block text-sm font-medium text-slate-200">
                  Họ và tên
                  <span className="mt-2 block">
                    <input type="text" name="fullName" required className={inputBaseClasses} placeholder="Nhập họ và tên" />
                  </span>
                </label>

                <label className="block text-sm font-medium text-slate-200">
                  Số CCCD/CMND
                  <span className="mt-2 block">
                    <input type="text" name="cccd" required className={inputBaseClasses} placeholder="VD: 079912345678" />
                  </span>
                </label>

                <label className="block text-sm font-medium text-slate-200">
                  Số điện thoại
                  <span className="mt-2 block">
                    <input type="tel" name="phone" required className={inputBaseClasses} placeholder="VD: 0901234567" />
                  </span>
                </label>

                <label className="block text-sm font-medium text-slate-200">
                  Mật khẩu
                  <span className="mt-2 block">
                    <input type="password" name="password" required className={inputBaseClasses} placeholder="Tối thiểu 6 ký tự" />
                  </span>
                </label>

                <label className="block text-sm font-medium text-slate-200">
                  Xác nhận mật khẩu
                  <span className="mt-2 block">
                    <input type="password" name="confirmPassword" required className={inputBaseClasses} placeholder="Nhập lại mật khẩu" />
                  </span>
                </label>

                <div className="flex items-start gap-2 text-xs">
                  <input type="checkbox" required className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-2 focus:ring-cyan-400/50 cursor-pointer" />
                  <label className="text-slate-300 cursor-pointer">
                    Tôi đồng ý với{" "}
                    <button type="button" className="text-cyan-400 hover:text-cyan-300">
                      Điều khoản sử dụng
                    </button>{" "}
                    và{" "}
                    <button type="button" className="text-cyan-400 hover:text-cyan-300">
                      Chính sách bảo mật
                    </button>
                  </label>
                </div>

                <button
                  type="submit"
                  className="mt-4 w-full rounded-xl bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 px-6 py-3.5 text-sm font-bold uppercase tracking-[0.2em] text-white shadow-[0_12px_40px_rgba(14,165,233,0.5)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_50px_rgba(14,165,233,0.6)] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Đang xử lý..." : "Đăng ký"}
                </button>

                <p className="text-center text-xs text-slate-500">
                  Đã có tài khoản?{" "}
                  <button
                    type="button"
                    onClick={() => setModalType("login")}
                    className="font-medium text-cyan-400 hover:text-cyan-300"
                  >
                    Đăng nhập ngay
                  </button>
                </p>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
