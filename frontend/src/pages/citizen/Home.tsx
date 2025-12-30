import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiService } from "../../services/api";
import { formatFromYMD } from "../../utils/date";

interface Household {
  id: number;
  soHoKhau: string;
  diaChi: string;
  tinhThanh?: string;
  quanHuyen?: string;
  phuongXa?: string;
  duongPho?: string;
  soNha?: string;
  diaChiDayDu?: string;
  ngayCap?: string;
  trangThai: string;
  chuHoId?: number;
  ghiChu?: string;
}

interface NhanKhau {
  id: number;
  hoTen: string;
  cccd?: string;
  ngaySinh?: string;
  gioiTinh?: "nam" | "nu" | "khac";
  quanHe: string;
  trangThai: string;
}

interface HouseholdWithMembers {
  household: Household;
  members: NhanKhau[];
  chuHo?: NhanKhau;
}

const quanHeLabels: Record<string, string> = {
  chu_ho: "Chủ hộ",
  vo_chong: "Vợ/Chồng",
  con: "Con",
  cha_me: "Cha/Mẹ",
  anh_chi_em: "Anh/Chị/Em",
  ong_ba: "Ông/Bà",
  chau: "Cháu",
  khac: "Khác",
};

const gioiTinhLabels: Record<string, string> = {
  nam: "Nam",
  nu: "Nữ",
  khac: "Khác",
};

export default function CitizenHome() {
  const [householdData, setHouseholdData] = useState<HouseholdWithMembers | null>(null);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Lấy thông tin user hiện tại
      const userResponse = await apiService.getMe();
      if (userResponse.success) {
        setUserInfo(userResponse.data);
      }

      // Nếu user đã linked thì load household
      if (userResponse.data?.linked) {
        const response = await apiService.getCitizenHousehold();
        if (response.success && response.data) {
          setHouseholdData(response.data);
        } else if (response.error?.code !== "NOT_LINKED") {
          // Chỉ set error nếu không phải lỗi NOT_LINKED (đã được handle ở UI)
          setError(response.error?.message || "Không tìm thấy thông tin hộ khẩu");
        }
      }
    } catch (err: any) {
      setError(err.error?.message || "Lỗi khi tải dữ liệu");
    } finally {
      setIsLoading(false);
    }
  };


  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Đang tải thông tin...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200/80 bg-red-50/50 p-8 shadow-sm">
        <h2 className="text-xl font-bold text-red-600 mb-2">Lỗi</h2>
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  // Nếu user chưa linked (chưa có hồ sơ nhân khẩu)
  if (userInfo && userInfo.linked === false) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="rounded-xl border border-blue-200/80 bg-blue-50/50 p-8 shadow-sm">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <span className="text-3xl">👤</span>
            </div>
            <h2 className="text-2xl font-bold text-blue-600 mb-2">Tài khoản chưa liên kết hồ sơ nhân khẩu</h2>
            <p className="text-blue-700">
              {userInfo.message || "Bạn đã đăng ký thành công nhưng chưa có hồ sơ nhân khẩu trong hệ thống."}
            </p>
          </div>

          <div className="bg-white/70 rounded-lg p-6 mb-6">
            <h3 className="font-semibold text-gray-800 mb-3">Để sử dụng đầy đủ chức năng:</h3>
            <div className="space-y-3 text-sm text-gray-700">
              <div className="flex items-start gap-3">
                <span className="text-blue-500 mt-1">1.</span>
                <div>
                  <p className="font-medium">Tạo yêu cầu thêm nhân khẩu</p>
                  <p className="text-gray-600">Chọn hộ khẩu bạn muốn gia nhập và điền thông tin cá nhân</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-blue-500 mt-1">2.</span>
                <div>
                  <p className="font-medium">Chờ tổ trưởng duyệt</p>
                  <p className="text-gray-600">Tổ trưởng sẽ kiểm tra và thêm bạn vào hệ thống</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-blue-500 mt-1">3.</span>
                <div>
                  <p className="font-medium">Đăng nhập lại</p>
                  <p className="text-gray-600">Sau khi được duyệt, tài khoản sẽ tự động liên kết</p>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center">
            <Link
              to="/citizen/yeu-cau"
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 font-semibold"
            >
              <span className="mr-2">📝</span>
              Tạo yêu cầu ngay
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!householdData) {
    return (
      <div className="rounded-xl border border-yellow-200/80 bg-yellow-50/50 p-8 shadow-sm">
        <h2 className="text-xl font-bold text-yellow-600 mb-2">Đang tải...</h2>
        <p className="text-yellow-700">
          Đang tải thông tin hộ khẩu của bạn...
        </p>
      </div>
    );
  }

  const { household, members, chuHo } = householdData;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-blue-200/60 bg-gradient-to-r from-blue-50 via-cyan-50 to-teal-50 p-6 shadow-sm backdrop-blur-sm">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
          Thông tin hộ khẩu của tôi
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

      {/* Thông tin hộ khẩu */}
      <div className="rounded-xl border border-gray-200/80 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <span>🏠</span>
          Thông tin hộ khẩu
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500 mb-1">Số hộ khẩu</p>
            <p className="text-base font-semibold text-gray-900">{household.soHoKhau}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Địa chỉ</p>
            <p className="text-base font-semibold text-gray-900">
              {household.diaChiDayDu || household.diaChi}
            </p>
          </div>
          {household.ngayCap && (
            <div>
              <p className="text-sm text-gray-500 mb-1">Ngày cấp</p>
              <p className="text-base font-semibold text-gray-900">
                {formatFromYMD(household.ngayCap)}
              </p>
            </div>
          )}
          <div>
            <p className="text-sm text-gray-500 mb-1">Trạng thái</p>
            <span
              className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                household.trangThai === "active"
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              {household.trangThai === "active" ? "Đang hoạt động" : "Chưa kích hoạt"}
            </span>
          </div>
          {chuHo && (
            <div>
              <p className="text-sm text-gray-500 mb-1">Chủ hộ</p>
              <p className="text-base font-semibold text-gray-900">{chuHo.hoTen}</p>
            </div>
          )}
        </div>
      </div>

      {/* Danh sách nhân khẩu */}
      <div className="rounded-xl border border-gray-200/80 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <span>👥</span>
          Danh sách nhân khẩu ({members.length})
        </h2>
        {members.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Chưa có nhân khẩu nào trong hộ khẩu này.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Họ tên</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">CCCD/CMND</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Ngày sinh</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Giới tính</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Quan hệ</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 text-sm text-gray-900 font-medium">{member.hoTen}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{member.cccd || "-"}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {member.ngaySinh
                        ? formatFromYMD(member.ngaySinh)
                        : "-"}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {member.gioiTinh ? gioiTinhLabels[member.gioiTinh] : "-"}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {quanHeLabels[member.quanHe] || member.quanHe}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                          member.trangThai === "active"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {member.trangThai === "active" ? "Thường trú" : member.trangThai}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}


