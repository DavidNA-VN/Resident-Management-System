import { useState, useEffect, FormEvent } from "react";
import { apiService } from "../services/api";

interface HoKhau {
  id: number;
  soHoKhau: string;
  diaChi: string;
  trangThai: string;
}

interface NhanKhau {
  id: number;
  hoTen: string;
  cccd?: string;
  ngaySinh?: string;
  gioiTinh?: string;
  quanHe: string;
  hoKhauId: number;
}

export default function NhanKhau() {
  const [hoKhauList, setHoKhauList] = useState<HoKhau[]>([]);
  const [selectedHoKhauId, setSelectedHoKhauId] = useState<number | null>(null);
  const [nhanKhauList, setNhanKhauList] = useState<NhanKhau[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showActivateModal, setShowActivateModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    hoKhauId: "",
    hoTen: "",
    cccd: "",
    ngaySinh: "",
    gioiTinh: "",
    quanHe: "",
  });

  useEffect(() => {
    loadHoKhauList();
  }, []);

  useEffect(() => {
    if (selectedHoKhauId) {
      loadNhanKhauList(selectedHoKhauId);
    }
  }, [selectedHoKhauId]);

  const loadHoKhauList = async () => {
    setIsLoading(true);
    try {
      const response = await apiService.getHoKhauList();
      if (response.success) {
        setHoKhauList(response.data);
        if (response.data.length > 0 && !selectedHoKhauId) {
          setSelectedHoKhauId(response.data[0].id);
        }
      }
    } catch (err: any) {
      setError(err.error?.message || "Lỗi khi tải danh sách hộ khẩu");
    } finally {
      setIsLoading(false);
    }
  };

  const loadNhanKhauList = async (hoKhauId: number) => {
    setIsLoading(true);
    try {
      const response = await apiService.getNhanKhauList(hoKhauId);
      if (response.success) {
        setNhanKhauList(response.data);
      }
    } catch (err: any) {
      setError(err.error?.message || "Lỗi khi tải danh sách nhân khẩu");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!formData.hoKhauId || !formData.hoTen || !formData.quanHe) {
      setError("Vui lòng điền đầy đủ thông tin bắt buộc");
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiService.createNhanKhau({
        hoKhauId: Number(formData.hoKhauId),
        hoTen: formData.hoTen,
        cccd: formData.cccd || undefined,
        ngaySinh: formData.ngaySinh || undefined,
        gioiTinh:
          formData.gioiTinh === "nam" || formData.gioiTinh === "nu"
            ? (formData.gioiTinh as "nam" | "nu")
            : undefined,
        quanHe: formData.quanHe as any,
      });

      if (response.success) {
        setSuccess("Tạo nhân khẩu thành công!");
        setShowCreateForm(false);
        setFormData({
          hoKhauId: selectedHoKhauId?.toString() || "",
          hoTen: "",
          cccd: "",
          ngaySinh: "",
          gioiTinh: "",
          quanHe: "",
        });
        if (selectedHoKhauId) {
          loadNhanKhauList(selectedHoKhauId);
        }
      }
    } catch (err: any) {
      if (err.error?.code === "HOUSEHOLD_HEAD_EXISTS") {
        setError("Hộ khẩu này đã có chủ hộ, vui lòng chọn quan hệ khác.");
      } else {
        setError(err.error?.message || "Lỗi khi tạo nhân khẩu");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleActivate = async (hoKhauId: number, chuHoId: number) => {
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      const response = await apiService.activateHoKhau(hoKhauId, chuHoId);
      if (response.success) {
        setSuccess("Kích hoạt hộ khẩu thành công!");
        setShowActivateModal(false);
        loadHoKhauList();
        if (selectedHoKhauId === hoKhauId) {
          loadNhanKhauList(hoKhauId);
        }
      }
    } catch (err: any) {
      setError(err.error?.message || "Lỗi khi kích hoạt hộ khẩu");
    } finally {
      setIsLoading(false);
    }
  };

  const selectedHoKhau = hoKhauList.find((hk) => hk.id === selectedHoKhauId);
  const chuHoCandidates = nhanKhauList.filter((nk) => nk.quanHe === "chu_ho");

  const quanHeOptions = [
    { value: "chu_ho", label: "Chủ hộ" },
    { value: "vo_chong", label: "Vợ/Chồng" },
    { value: "con", label: "Con" },
    { value: "cha_me", label: "Cha/Mẹ" },
    { value: "anh_chi_em", label: "Anh/Chị/Em" },
    { value: "ong_ba", label: "Ông/Bà" },
    { value: "chau", label: "Cháu" },
    { value: "khac", label: "Khác" },
  ];

  const hasChuHoInSelected = nhanKhauList.some((nk) => nk.quanHe === "chu_ho");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
            Quản lý Nhân khẩu
          </h1>
          <p className="mt-1 text-gray-600">
            Thêm nhân khẩu và kích hoạt hộ khẩu
          </p>
        </div>
        <button
          onClick={() => {
            setFormData({
              ...formData,
              hoKhauId: selectedHoKhauId?.toString() || "",
            });
            setShowCreateForm(true);
          }}
          className="rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 px-6 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg hover:-translate-y-0.5"
        >
          + Thêm nhân khẩu
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

      {/* Select Hộ khẩu */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Chọn hộ khẩu
        </label>
        <select
          value={selectedHoKhauId || ""}
          onChange={(e) => setSelectedHoKhauId(Number(e.target.value))}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          {hoKhauList.map((hk) => (
            <option key={hk.id} value={hk.id}>
              {hk.soHoKhau} - {hk.diaChi} (
              {hk.trangThai === "active" ? "Đã kích hoạt" : "Chưa kích hoạt"})
            </option>
          ))}
        </select>
      </div>

      {/* Activate Button */}
      {selectedHoKhau &&
        selectedHoKhau.trangThai === "inactive" &&
        chuHoCandidates.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-amber-900">
                  Hộ khẩu chưa được kích hoạt
                </p>
                <p className="mt-1 text-sm text-amber-700">
                  Có {chuHoCandidates.length} người có thể làm chủ hộ. Hãy kích
                  hoạt hộ khẩu!
                </p>
              </div>
              <button
                onClick={() => setShowActivateModal(true)}
                className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600"
              >
                Kích hoạt hộ khẩu
              </button>
            </div>
          </div>
        )}

      {/* Create Form Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-xl border border-gray-200 bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                Thêm nhân khẩu mới
              </h2>
              <button
                onClick={() => setShowCreateForm(false)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block text-sm font-medium text-gray-700">
                Hộ khẩu <span className="text-red-500">*</span>
                <select
                  required
                  value={formData.hoKhauId}
                  onChange={(e) =>
                    setFormData({ ...formData, hoKhauId: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="">Chọn hộ khẩu</option>
                  {hoKhauList.map((hk) => (
                    <option key={hk.id} value={hk.id}>
                      {hk.soHoKhau} - {hk.diaChi}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-2 gap-4">
                <label className="block text-sm font-medium text-gray-700">
                  Họ và tên <span className="text-red-500">*</span>
                  <input
                    type="text"
                    required
                    value={formData.hoTen}
                    onChange={(e) =>
                      setFormData({ ...formData, hoTen: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </label>

                <label className="block text-sm font-medium text-gray-700">
                  CCCD/CMND
                  <input
                    type="text"
                    value={formData.cccd}
                    onChange={(e) =>
                      setFormData({ ...formData, cccd: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <label className="block text-sm font-medium text-gray-700">
                  Ngày sinh
                  <input
                    type="date"
                    value={formData.ngaySinh}
                    onChange={(e) =>
                      setFormData({ ...formData, ngaySinh: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </label>

                <label className="block text-sm font-medium text-gray-700">
                  Giới tính
                  <select
                    value={formData.gioiTinh}
                    onChange={(e) =>
                      setFormData({ ...formData, gioiTinh: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="">Chọn giới tính</option>
                    <option value="nam">Nam</option>
                    <option value="nu">Nữ</option>
                    <option value="khac">Khác</option>
                  </select>
                </label>
              </div>

              <label className="block text-sm font-medium text-gray-700">
                Quan hệ với chủ hộ <span className="text-red-500">*</span>
                <select
                  required
                  value={formData.quanHe}
                  onChange={(e) =>
                    setFormData({ ...formData, quanHe: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="">Chọn quan hệ</option>
                  {quanHeOptions.map((opt) => (
                    <option
                      key={opt.value}
                      value={opt.value}
                      disabled={opt.value === "chu_ho" && hasChuHoInSelected}
                    >
                      {opt.label}
                      {opt.value === "chu_ho" && hasChuHoInSelected
                        ? " (đã có chủ hộ)"
                        : ""}
                    </option>
                  ))}
                </select>
                {hasChuHoInSelected && (
                  <p className="mt-1 text-xs text-red-600">
                    Hộ khẩu này đã có chủ hộ, không thể chọn thêm chủ hộ.
                  </p>
                )}
              </label>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg disabled:opacity-50"
                >
                  {isLoading ? "Đang tạo..." : "Thêm nhân khẩu"}
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

      {/* Activate Modal */}
      {showActivateModal && selectedHoKhau && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                Kích hoạt hộ khẩu
              </h2>
              <button
                onClick={() => setShowActivateModal(false)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <p className="mb-4 text-sm text-gray-600">
              Chọn người làm chủ hộ cho hộ khẩu{" "}
              <strong>{selectedHoKhau.soHoKhau}</strong>
            </p>

            <div className="space-y-2 mb-6">
              {chuHoCandidates.map((nk) => (
                <button
                  key={nk.id}
                  onClick={() => handleActivate(selectedHoKhau.id, nk.id)}
                  disabled={isLoading}
                  className="w-full rounded-lg border border-gray-200 bg-white p-3 text-left hover:bg-gray-50 hover:border-blue-300 transition-all disabled:opacity-50"
                >
                  <div className="font-medium text-gray-900">{nk.hoTen}</div>
                  {nk.cccd && (
                    <div className="text-xs text-gray-500">CCCD: {nk.cccd}</div>
                  )}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowActivateModal(false)}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Hủy
            </button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 p-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Danh sách nhân khẩu ({nhanKhauList.length})
            {selectedHoKhau && (
              <span className="ml-2 text-sm font-normal text-gray-500">
                - Hộ khẩu: {selectedHoKhau.soHoKhau}
              </span>
            )}
          </h2>
        </div>

        {isLoading && nhanKhauList.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Đang tải...</div>
        ) : !selectedHoKhauId ? (
          <div className="p-8 text-center text-gray-500">
            Vui lòng chọn hộ khẩu để xem danh sách nhân khẩu
          </div>
        ) : nhanKhauList.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Chưa có nhân khẩu nào trong hộ khẩu này. Hãy thêm nhân khẩu mới!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Họ tên
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                    CCCD
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Quan hệ
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Giới tính
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Ngày sinh
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {nhanKhauList.map((nk) => (
                  <tr
                    key={nk.id}
                    className={`hover:bg-gray-50 ${
                      nk.quanHe === "chu_ho" ? "bg-blue-50/50" : ""
                    }`}
                  >
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {nk.hoTen}
                      {nk.quanHe === "chu_ho" && (
                        <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                          Chủ hộ
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {nk.cccd || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {quanHeOptions.find((opt) => opt.value === nk.quanHe)
                        ?.label || nk.quanHe}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {nk.gioiTinh === "nam"
                        ? "Nam"
                        : nk.gioiTinh === "nu"
                        ? "Nữ"
                        : nk.gioiTinh === "khac"
                        ? "Khác"
                        : "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {nk.ngaySinh
                        ? new Date(nk.ngaySinh).toLocaleDateString("vi-VN")
                        : "-"}
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
