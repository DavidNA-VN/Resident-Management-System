import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { apiService, UserInfo } from "../services/api";

interface LayoutProps {
  children: ReactNode;
}

const roleLabels: Record<string, string> = {
  to_truong: "Tổ trưởng",
  to_pho: "Tổ phó",
  can_bo: "Cán bộ",
  nguoi_dan: "Người dân",
};

const taskLabels: Record<string, string> = {
  hokhau_nhankhau: "Hộ khẩu/Nhân khẩu",
  tamtru_tamvang: "Tạm trú/Tạm vắng",
  thongke: "Thống kê",
  kiennghi: "Kiến nghị",
};

function canAccessPath(user: UserInfo | null, path: string): boolean {
  if (!user) return false;

  // Leaders/admin: full access
  if (
    user.role === "to_truong" ||
    user.role === "to_pho" ||
    user.role === "admin"
  ) {
    return true;
  }

  if (user.role !== "can_bo") return false;

  // Staff: access determined by task
  const task = user.task || "";
  const allowedByTask: Record<string, string[]> = {
    // As requested: cán bộ hộ khẩu/nhân khẩu được làm cả tạm trú/tạm vắng
    hokhau_nhankhau: [
      "/dashboard",
      "/ho-khau",
      "/nhan-khau",
      "/requests",
      "/tam-tru-vang",
    ],
    tamtru_tamvang: ["/dashboard", "/requests", "/tam-tru-vang"],
    kiennghi: ["/dashboard", "/phan-anh"],
    thongke: ["/dashboard", "/thong-ke", "/bao-cao"],
  };

  const allowed = allowedByTask[task] || ["/dashboard"]; // safe default
  return allowed.includes(path);
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);

  const menuItems = [
    { path: "/dashboard", label: "Dashboard" },
    { path: "/ho-khau", label: "Hộ khẩu" },
    { path: "/nhan-khau", label: "Nhân khẩu" },
    { path: "/requests", label: "Yêu cầu" },
    { path: "/tam-tru-vang", label: "Tạm trú / Tạm vắng" },
    { path: "/phan-anh", label: "Phản ánh" },
    { path: "/thong-ke", label: "Thống kê" },
  ];

  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        const response = await apiService.getMe();
        if (response.success) {
          setUserInfo(response.data);
          localStorage.setItem("userInfo", JSON.stringify(response.data));
        }
      } catch (err) {
        console.error("Failed to load user info:", err);
        // Nếu token invalid, logout
        apiService.logout();
        navigate("/");
      }
    };

    const storedUserInfo = localStorage.getItem("userInfo");
    if (storedUserInfo) {
      try {
        setUserInfo(JSON.parse(storedUserInfo));
      } catch (e) {
        // Ignore parse error
      }
    }

    loadUserInfo();
  }, [navigate]);

  const handleLogout = () => {
    apiService.logout();
    navigate("/");
  };

  const userName = userInfo
    ? `${roleLabels[userInfo.role] || userInfo.role}${
        userInfo.task ? ` - ${taskLabels[userInfo.task] || userInfo.task}` : ""
      }`
    : "Đang tải...";

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Sidebar */}
      <aside
        className={`${
          isSidebarOpen ? "w-64" : "w-20"
        } border-r border-gray-200/80 bg-white/95 backdrop-blur-sm shadow-lg transition-all duration-300 flex flex-col`}
      >
        {/* Logo/Header */}
        <div className="flex h-16 items-center justify-between border-b border-gray-200/60 px-4 bg-gradient-to-r from-blue-50/50 to-cyan-50/30">
          {isSidebarOpen && (
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                Quản lý Dân cư
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">TDP7 La Khê</p>
            </div>
          )}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            aria-label="Toggle sidebar"
          >
            {isSidebarOpen ? "◀" : "▶"}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          <ul className="space-y-1">
            {menuItems
              .filter((item) => canAccessPath(userInfo, item.path))
              .map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md shadow-blue-500/25 scale-[1.02]"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 hover:scale-[1.01]"
                      }`}
                    >
                      {isSidebarOpen && <span>{item.label}</span>}
                    </Link>
                  </li>
                );
              })}
          </ul>
        </nav>

        {/* User Info & Logout */}
        <div className="border-t border-gray-200/60 p-4 bg-gray-50/50">
          {isSidebarOpen && (
            <div className="mb-3 rounded-lg bg-white border border-gray-200 p-3 shadow-sm">
              <p className="text-xs text-gray-500 mb-1">
                Đăng nhập với tư cách
              </p>
              <p className="text-sm font-semibold text-gray-900 leading-tight">
                {userName}
              </p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg bg-gradient-to-r from-red-50 to-rose-50 border border-red-200/60 px-4 py-2.5 text-sm font-medium text-red-600 transition-all hover:from-red-100 hover:to-rose-100 hover:shadow-sm"
          >
            <span className="text-base">🚪</span>
            {isSidebarOpen && <span>Đăng xuất</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-gradient-to-br from-gray-50/50 via-white to-gray-50/50 p-6">
        <div className="max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
