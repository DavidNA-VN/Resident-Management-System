import { useEffect, useState } from "react";

interface StatCardProps {
  title: string;
  value: string | number;
  change: string;
  icon: string;
  color: string;
}

function StatCard({ title, value, change, icon, color }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/60 to-slate-900/40 p-6 shadow-lg hover:border-slate-600/50 hover:shadow-xl transition-all">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-300">{title}</p>
          <p className="mt-2 text-3xl font-bold text-white">{value}</p>
          <p className={`mt-2 text-sm font-medium ${change.startsWith("+") ? "text-emerald-400" : "text-rose-400"}`}>
            {change} so với tháng trước
          </p>
        </div>
        <div className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${color} text-3xl shadow-lg`}>
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
  time: string;
  user: string;
}

function ActivityItem({ type, description, time, user }: Omit<RecentActivity, "id">) {
  const icons: Record<string, string> = {
    "Thêm mới": "➕",
    "Cập nhật": "✏️",
    "Biến động": "📝",
    "Phản ánh": "💬",
    "Duyệt": "✅"
  };

  return (
    <div className="flex items-start gap-4 rounded-lg border border-slate-700/40 bg-slate-800/40 p-4 hover:bg-slate-800/60 hover:border-slate-600/50 transition-all">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 text-xl">
        {icons[type] || "📌"}
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-white">{description}</p>
        <p className="mt-1 text-xs text-slate-400">
          {user} • {time}
        </p>
      </div>
      <span className="rounded-full bg-slate-700/60 px-3 py-1 text-xs font-medium text-slate-200">
        {type}
      </span>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState({
    hoKhau: 1247,
    nhanKhau: 3842,
    bienDong: 23,
    phanAnh: 8
  });

  const [recentActivities] = useState<RecentActivity[]>([
    {
      id: 1,
      type: "Thêm mới",
      description: "Thêm hộ khẩu mới - Nguyễn Văn A",
      time: "2 giờ trước",
      user: "Nguyễn Thị B"
    },
    {
      id: 2,
      type: "Cập nhật",
      description: "Cập nhật thông tin nhân khẩu - Trần Văn C",
      time: "5 giờ trước",
      user: "Lê Văn D"
    },
    {
      id: 3,
      type: "Biến động",
      description: "Ghi nhận biến động: Chuyển đi - Phạm Thị E",
      time: "1 ngày trước",
      user: "Hoàng Văn F"
    },
    {
      id: 4,
      type: "Phản ánh",
      description: "Tiếp nhận phản ánh mới về cơ sở hạ tầng",
      time: "1 ngày trước",
      user: "Người dân"
    },
    {
      id: 5,
      type: "Duyệt",
      description: "Duyệt hồ sơ tạm trú - Võ Thị G",
      time: "2 ngày trước",
      user: "Tổ trưởng"
    }
  ]);

  useEffect(() => {
    // Simulate data loading
    const interval = setInterval(() => {
      setStats((prev) => ({
        ...prev,
        bienDong: prev.bienDong + Math.floor(Math.random() * 3)
      }));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="rounded-2xl border border-slate-700/50 bg-gradient-to-r from-blue-600/20 via-cyan-600/15 to-teal-600/20 p-6 shadow-lg">
        <h1 className="text-2xl font-bold text-white">
          Chào mừng trở lại, {localStorage.getItem("userRole") === "to_truong" ? "Tổ trưởng" : "Người dân"}!
        </h1>
        <p className="mt-2 text-slate-300">
          Hôm nay là {new Date().toLocaleDateString("vi-VN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Tổng số hộ khẩu"
          value={stats.hoKhau.toLocaleString("vi-VN")}
          change="+12"
          icon="🏠"
          color="from-blue-500/40 to-cyan-500/30"
        />
        <StatCard
          title="Tổng số nhân khẩu"
          value={stats.nhanKhau.toLocaleString("vi-VN")}
          change="+45"
          icon="👥"
          color="from-emerald-500/40 to-teal-500/30"
        />
        <StatCard
          title="Biến động tháng này"
          value={stats.bienDong}
          change="-3"
          icon="📝"
          color="from-indigo-500/40 to-purple-500/30"
        />
        <StatCard
          title="Phản ánh chưa xử lý"
          value={stats.phanAnh}
          change="+2"
          icon="💬"
          color="from-rose-500/40 to-pink-500/30"
        />
      </div>

      {/* Charts and Activities Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Activities */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Hoạt động gần đây</h2>
              <button className="text-sm text-cyan-400 hover:text-cyan-300 font-medium">Xem tất cả</button>
            </div>
            <div className="space-y-3">
              {recentActivities.map((activity) => (
                <ActivityItem key={activity.id} {...activity} />
              ))}
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-6 shadow-lg">
            <h3 className="mb-4 text-lg font-semibold text-white">Thống kê nhanh</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg bg-slate-700/40 px-3 py-2.5 hover:bg-slate-700/60 transition-colors">
                <span className="text-sm text-slate-300">Tạm trú</span>
                <span className="text-lg font-semibold text-white">23</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-700/40 px-3 py-2.5 hover:bg-slate-700/60 transition-colors">
                <span className="text-sm text-slate-300">Tạm vắng</span>
                <span className="text-lg font-semibold text-white">15</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-700/40 px-3 py-2.5 hover:bg-slate-700/60 transition-colors">
                <span className="text-sm text-slate-300">Chờ duyệt</span>
                <span className="text-lg font-semibold text-yellow-400">7</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-700/40 px-3 py-2.5 hover:bg-slate-700/60 transition-colors">
                <span className="text-sm text-slate-300">Đã xử lý</span>
                <span className="text-lg font-semibold text-emerald-400">142</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-700/50 bg-gradient-to-br from-blue-600/15 to-cyan-600/10 p-6 shadow-lg">
            <h3 className="mb-4 text-lg font-semibold text-white">Thông báo</h3>
            <div className="space-y-3">
              <div className="rounded-lg bg-slate-800/40 border border-slate-700/40 p-3 hover:bg-slate-800/60 transition-colors">
                <p className="text-sm font-medium text-white">Cập nhật quy định mới</p>
                <p className="mt-1 text-xs text-slate-400">2 ngày trước</p>
              </div>
              <div className="rounded-lg bg-slate-800/40 border border-slate-700/40 p-3 hover:bg-slate-800/60 transition-colors">
                <p className="text-sm font-medium text-white">Họp tổ dân phố</p>
                <p className="mt-1 text-xs text-slate-400">5 ngày trước</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}



