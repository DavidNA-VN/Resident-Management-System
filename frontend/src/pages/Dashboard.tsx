import { useEffect, useMemo, useState } from "react";
import { apiService } from "../services/api";

interface StatCardProps {
  title: string;
  value: string | number;
  change: string;
  icon: string;
  color: string;
}

function StatCard({ title, value, change, icon, color }: StatCardProps) {
  return (
    <div className="group rounded-xl border border-gray-200/80 bg-white p-6 shadow-sm hover:shadow-lg hover:border-gray-300 transition-all duration-300 hover:-translate-y-1">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">
            {title}
          </p>
          <p className="mt-3 text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            {value}
          </p>
          <p
            className={`mt-2 text-xs font-semibold flex items-center gap-1 ${
              change.startsWith("+") ? "text-emerald-600" : "text-red-600"
            }`}
          >
            <span>{change.startsWith("+") ? "↑" : "↓"}</span>
            <span>{change} so với tháng trước</span>
          </p>
        </div>
        <div
          className={`flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${color} text-2xl shadow-md group-hover:scale-110 transition-transform duration-300`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

interface RecentActivity {
  id: number;
  type: string;
  description: string;
  user: string;
  createdAt: string;
}

function ActivityItem({
  type,
  description,
  createdAt,
  user,
}: Omit<RecentActivity, "id">) {
  const icons: Record<string, string> = {
    "Thêm mới": "➕",
    "Cập nhật": "✏️",
    "Biến động": "📝",
    "Phản ánh": "💬",
    Duyệt: "✅",
  };

  const typeColors: Record<string, string> = {
    "Thêm mới": "bg-emerald-50 text-emerald-700 border-emerald-200",
    "Cập nhật": "bg-blue-50 text-blue-700 border-blue-200",
    "Biến động": "bg-amber-50 text-amber-700 border-amber-200",
    "Phản ánh": "bg-purple-50 text-purple-700 border-purple-200",
    Duyệt: "bg-green-50 text-green-700 border-green-200",
  };

  return (
    <div className="flex items-start gap-4 rounded-lg border border-gray-200/80 bg-white p-4 hover:bg-gray-50/80 hover:border-gray-300 hover:shadow-sm transition-all duration-200">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-100 to-cyan-100 text-lg shadow-sm">
        {icons[type] || "📌"}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 leading-snug">
          {description}
        </p>
        <p className="mt-1.5 text-xs text-gray-500 flex items-center gap-2">
          <span className="font-medium">{user}</span>
          <span>•</span>
          <span>{createdAt}</span>
        </p>
      </div>
      <span
        className={`rounded-full px-3 py-1 text-xs font-semibold border whitespace-nowrap ${
          typeColors[type] || "bg-gray-100 text-gray-700 border-gray-200"
        }`}
      >
        {type}
      </span>
    </div>
  );
}

const formatDelta = (n: number) => `${n >= 0 ? "+" : ""}${n}`;

const formatRelativeVi = (iso: string) => {
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return iso;
  const diffMs = Date.now() - dt.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Vừa xong";
  if (diffMin < 60) return `${diffMin} phút trước`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH} giờ trước`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD} ngày trước`;
  return dt.toLocaleDateString("vi-VN");
};

export default function Dashboard() {
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState({
    hoKhau: 0,
    nhanKhau: 0,
    bienDong: 0,
    phanAnh: 0,
  });
  const [changes, setChanges] = useState({
    hoKhau: 0,
    nhanKhau: 0,
    bienDong: 0,
    phanAnh: 0,
  });
  const [quickStats, setQuickStats] = useState({
    tamTru: 0,
    tamVang: 0,
    choDuyet: 0,
    daXuLy: 0,
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>(
    []
  );
  const [notifications, setNotifications] = useState<
    Array<{ id: number; title: string; createdAt: string }>
  >([]);

  const loadDashboard = async () => {
    setIsLoading(true);
    try {
      const res = await apiService.getDashboard();
      if (res.success) {
        setStats({
          hoKhau: res.stats.hoKhau ?? 0,
          nhanKhau: res.stats.nhanKhau ?? 0,
          bienDong: res.stats.bienDong ?? 0,
          phanAnh: res.stats.phanAnhPending ?? 0,
        });
        setChanges({
          hoKhau: res.changes.hoKhau ?? 0,
          nhanKhau: res.changes.nhanKhau ?? 0,
          bienDong: res.changes.bienDong ?? 0,
          phanAnh: res.changes.phanAnhPending ?? 0,
        });
        setQuickStats({
          tamTru: res.quickStats.tamTru ?? 0,
          tamVang: res.quickStats.tamVang ?? 0,
          choDuyet: res.quickStats.choDuyet ?? 0,
          daXuLy: res.quickStats.daXuLy ?? 0,
        });
        setRecentActivities(
          (res.recentActivities || []).map((a) => ({
            id: a.id,
            type: a.type,
            description: a.description,
            user: a.user,
            createdAt: a.createdAt,
          }))
        );
        setNotifications(
          (res.notifications || []).map((n) => ({
            id: n.id,
            title: n.title,
            createdAt: n.createdAt,
          }))
        );
      }
    } catch (err) {
      console.error("Dashboard load error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const storedUserInfo = localStorage.getItem("userInfo");
  let userDisplayName = "Người dùng";
  if (storedUserInfo) {
    try {
      const user = JSON.parse(storedUserInfo);
      userDisplayName = user.fullName || user.username || "Người dùng";
    } catch (e) {
      // Ignore
    }
  }

  const activityRows = useMemo(
    () =>
      recentActivities.map((a) => ({
        ...a,
        createdAt: formatRelativeVi(a.createdAt),
      })),
    [recentActivities]
  );

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="rounded-xl border border-blue-200/60 bg-gradient-to-r from-blue-50 via-cyan-50 to-teal-50 p-6 shadow-sm backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              Chào mừng trở lại, {userDisplayName}!
            </h1>
            <p className="mt-2 text-gray-600">
              {new Date().toLocaleDateString("vi-VN", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <div className="hidden md:flex items-center gap-2 text-4xl">
            <span>👋</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Tổng số hộ khẩu"
          value={stats.hoKhau.toLocaleString("vi-VN")}
          change={formatDelta(changes.hoKhau)}
          icon="🏠"
          color="from-blue-100 to-cyan-100"
        />
        <StatCard
          title="Tổng số nhân khẩu"
          value={stats.nhanKhau.toLocaleString("vi-VN")}
          change={formatDelta(changes.nhanKhau)}
          icon="👥"
          color="from-emerald-100 to-teal-100"
        />
        <StatCard
          title="Biến động tháng này"
          value={stats.bienDong}
          change={formatDelta(changes.bienDong)}
          icon="📝"
          color="from-indigo-100 to-purple-100"
        />
        <StatCard
          title="Phản ánh chưa xử lý"
          value={stats.phanAnh}
          change={formatDelta(changes.phanAnh)}
          icon="💬"
          color="from-rose-100 to-pink-100"
        />
      </div>

      {/* Charts and Activities Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Activities */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-gray-200/80 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between border-b border-gray-200/60 pb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <span>📋</span>
                Hoạt động gần đây
              </h2>
              <button className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors">
                Xem tất cả →
              </button>
            </div>
            <div className="space-y-2.5">
              {activityRows.length === 0 && !isLoading && (
                <div className="text-sm text-gray-500">
                  Chưa có hoạt động gần đây.
                </div>
              )}
              {activityRows.map((activity) => (
                <ActivityItem key={activity.id} {...activity} />
              ))}
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="space-y-6">
          <div className="rounded-xl border border-gray-200/80 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-gray-900 flex items-center gap-2">
              <span>⚡</span>
              Thống kê nhanh
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-lg bg-gradient-to-r from-gray-50 to-gray-50/50 border border-gray-200/60 px-4 py-3 hover:from-blue-50 hover:to-cyan-50 hover:border-blue-200 transition-all cursor-pointer">
                <span className="text-sm font-medium text-gray-700">
                  Tạm trú
                </span>
                <span className="text-lg font-bold text-gray-900">
                  {quickStats.tamTru}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-gradient-to-r from-gray-50 to-gray-50/50 border border-gray-200/60 px-4 py-3 hover:from-emerald-50 hover:to-teal-50 hover:border-emerald-200 transition-all cursor-pointer">
                <span className="text-sm font-medium text-gray-700">
                  Tạm vắng
                </span>
                <span className="text-lg font-bold text-gray-900">
                  {quickStats.tamVang}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-gradient-to-r from-gray-50 to-gray-50/50 border border-gray-200/60 px-4 py-3 hover:from-amber-50 hover:to-yellow-50 hover:border-amber-200 transition-all cursor-pointer">
                <span className="text-sm font-medium text-gray-700">
                  Chờ duyệt
                </span>
                <span className="text-lg font-bold text-yellow-600">
                  {quickStats.choDuyet}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-gradient-to-r from-gray-50 to-gray-50/50 border border-gray-200/60 px-4 py-3 hover:from-green-50 hover:to-emerald-50 hover:border-green-200 transition-all cursor-pointer">
                <span className="text-sm font-medium text-gray-700">
                  Đã xử lý
                </span>
                <span className="text-lg font-bold text-emerald-600">
                  {quickStats.daXuLy}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-blue-200/60 bg-gradient-to-br from-blue-50/80 to-cyan-50/60 p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-gray-900 flex items-center gap-2">
              <span>🔔</span>
              Thông báo
            </h3>
            <div className="space-y-2.5">
              {notifications.length === 0 && !isLoading && (
                <div className="text-sm text-gray-600">Chưa có thông báo.</div>
              )}
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className="rounded-lg bg-white/80 border border-gray-200/60 p-3.5 hover:bg-white hover:shadow-sm transition-all cursor-pointer"
                >
                  <p className="text-sm font-semibold text-gray-900">
                    {n.title}
                  </p>
                  <p className="mt-1.5 text-xs text-gray-500">
                    {formatRelativeVi(n.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
