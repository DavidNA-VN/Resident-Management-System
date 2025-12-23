import { useState, useEffect, FormEvent } from "react";
import { apiService } from "../services/api";

interface HoKhau {
  id: number;
  soHoKhau: string;
  diaChi: string;
  tinhThanh?: string;
  quanHuyen?: string;
  phuongXa?: string;
  trangThai: string;
  chuHoId?: number;
  createdAt: string;
}

export default function HoKhau() {
  const [hoKhauList, setHoKhauList] = useState<HoKhau[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
    } catch (err: any) {
      setError(err.error?.message || "Lỗi khi tải danh sách hộ khẩu");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
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
    } catch (err: any) {
      setError(err.error?.message || "Lỗi khi tạo hộ khẩu");
    } finally {
      setIsLoading(false);
    }
  };

  const getTrangThaiBadge = (trangThai: string) => {
    if (trangThai === "active") {
      return (
        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
          Đã kích hoạt
        </span>
      );
    }
    return (
      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
        Chưa kích hoạt
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
            Quản lý Hộ khẩu
          </h1>
          <p className="mt-1 text-gray-600">
            Tạo và quản lý thông tin hộ khẩu
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 px-6 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg hover:-translate-y-0.5"
        >
          + Tạo hộ khẩu mới
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-700">
          {success}
        </div>
      )}

      {/* Create Form Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-xl border border-gray-200 bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                Tạo hộ khẩu mới
              </h2>
              <button
                onClick={() => setShowCreateForm(false)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <label className="block text-sm font-medium text-gray-700">
                  Số hộ khẩu <span className="text-red-500">*</span>
                  <input
                    type="text"
                    required
                    value={formData.soHoKhau}
                    onChange={(e) =>
                      setFormData({ ...formData, soHoKhau: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="VD: HK001"
                  />
                </label>

                <label className="block text-sm font-medium text-gray-700">
                  Ngày cấp
                  <input
                    type="date"
                    value={formData.ngayCap}
                    onChange={(e) =>
                      setFormData({ ...formData, ngayCap: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </label>
              </div>

              <label className="block text-sm font-medium text-gray-700">
                Địa chỉ <span className="text-red-500">*</span>
                <input
                  type="text"
                  required
                  value={formData.diaChi}
                  onChange={(e) =>
                    setFormData({ ...formData, diaChi: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Địa chỉ đầy đủ"
                />
              </label>

              <div className="grid grid-cols-3 gap-4">
                <label className="block text-sm font-medium text-gray-700">
                  Tỉnh/Thành phố
                  <input
                    type="text"
                    value={formData.tinhThanh}
                    onChange={(e) =>
                      setFormData({ ...formData, tinhThanh: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </label>

                <label className="block text-sm font-medium text-gray-700">
                  Quận/Huyện
                  <input
                    type="text"
                    value={formData.quanHuyen}
                    onChange={(e) =>
                      setFormData({ ...formData, quanHuyen: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </label>

                <label className="block text-sm font-medium text-gray-700">
                  Phường/Xã
                  <input
                    type="text"
                    value={formData.phuongXa}
                    onChange={(e) =>
                      setFormData({ ...formData, phuongXa: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <label className="block text-sm font-medium text-gray-700">
                  Đường/Phố
                  <input
                    type="text"
                    value={formData.duongPho}
                    onChange={(e) =>
                      setFormData({ ...formData, duongPho: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </label>

                <label className="block text-sm font-medium text-gray-700">
                  Số nhà
                  <input
                    type="text"
                    value={formData.soNha}
                    onChange={(e) =>
                      setFormData({ ...formData, soNha: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </label>
              </div>

              <label className="block text-sm font-medium text-gray-700">
                Ghi chú
                <textarea
                  value={formData.ghiChu}
                  onChange={(e) =>
                    setFormData({ ...formData, ghiChu: e.target.value })
                  }
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Ghi chú thêm..."
                />
              </label>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg disabled:opacity-50"
                >
                  {isLoading ? "Đang tạo..." : "Tạo hộ khẩu"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* List */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 p-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Danh sách hộ khẩu ({hoKhauList.length})
          </h2>
        </div>

        {isLoading && hoKhauList.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Đang tải...</div>
        ) : hoKhauList.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Chưa có hộ khẩu nào. Hãy tạo hộ khẩu mới!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Số hộ khẩu
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Địa chỉ
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Trạng thái
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Ngày tạo
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {hoKhauList.map((hk) => (
                  <tr key={hk.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {hk.soHoKhau}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {hk.diaChi}
                    </td>
                    <td className="px-4 py-3">{getTrangThaiBadge(hk.trangThai)}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(hk.createdAt).toLocaleDateString("vi-VN")}
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

