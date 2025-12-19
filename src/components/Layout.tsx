import { ReactNode, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const menuItems = [
    { path: "/dashboard", label: "Dashboard", icon: "📊" },
    { path: "/ho-khau", label: "Hộ khẩu", icon: "🏠" },
    { path: "/nhan-khau", label: "Nhân khẩu", icon: "👥" },
    { path: "/bien-dong", label: "Biến động", icon: "📝" },
    { path: "/tam-tru-vang", label: "Tạm trú / Tạm vắng", icon: "📍" },
    { path: "/phan-anh", label: "Phản ánh", icon: "💬" },
    { path: "/thong-ke", label: "Thống kê", icon: "📈" },
    { path: "/bao-cao", label: "Báo cáo", icon: "📄" }
  ];

  const handleLogout = () => {
    localStorage.removeItem("isAuthenticated");
    localStorage.removeItem("userRole");
    navigate("/");
  };

  const userRole = localStorage.getItem("userRole");
  const userName = userRole === "to_truong" ? "Tổ trưởng" : "Người dân";

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">
      {/* Sidebar */}
      <aside
        className={`${
          isSidebarOpen ? "w-64" : "w-20"
        } border-r border-slate-800 bg-slate-900/50 transition-all duration-300 flex flex-col`}
      >
        {/* Logo/Header */}
        <div className="flex h-16 items-center justify-between border-b border-slate-800 px-4">
          {isSidebarOpen && (
            <h1 className="text-lg font-bold text-white">Quản lý Dân cư</h1>
          )}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            {isSidebarOpen ? "◀" : "▶"}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4">
          <ul className="space-y-2">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? "bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 border border-cyan-500/30"
                        : "text-slate-300 hover:bg-slate-800/50 hover:text-white"
                    }`}
                  >
                    <span className="text-xl">{item.icon}</span>
                    {isSidebarOpen && <span>{item.label}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User Info & Logout */}
        <div className="border-t border-slate-800 p-4">
          {isSidebarOpen && (
            <div className="mb-3 rounded-lg bg-slate-800/50 p-3">
              <p className="text-xs text-slate-400">Đăng nhập với tư cách</p>
              <p className="text-sm font-semibold text-white">{userName}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl bg-rose-500/20 px-4 py-3 text-sm font-medium text-rose-400 transition-all hover:bg-rose-500/30"
          >
            <span>🚪</span>
            {isSidebarOpen && <span>Đăng xuất</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-slate-950 p-6">
        {children}
      </main>
    </div>
  );
}

