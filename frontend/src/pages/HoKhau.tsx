import { useState, useEffect, FormEvent } from "react";
import { createPortal } from "react-dom";
import { apiService } from "../services/api";

interface HoKhau {
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
  ghiChu?: string;
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
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewHoKhau, setViewHoKhau] = useState<HoKhau | null>(null);
  const [nhanKhauTrongHo, setNhanKhauTrongHo] = useState<any[]>([]);
  const [viewLoading, setViewLoading] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingHoKhauId, setEditingHoKhauId] = useState<number | null>(null);
  const [selectedNhanKhau, setSelectedNhanKhau] = useState<any | null>(null);
  const [showViewNhanKhau, setShowViewNhanKhau] = useState(false);
  const [showEditNhanKhau, setShowEditNhanKhau] = useState(false);
  const [editNhanKhauData, setEditNhanKhauData] = useState({
    hoTen: "",
    cccd: "",
    ngaySinh: "",
    gioiTinh: "",
    quanHe: "",
  });

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
  const [editData, setEditData] = useState({
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

  const openViewModal = async (hk: HoKhau) => {
    setViewHoKhau(hk);
    setShowViewModal(true);
    setViewLoading(true);
    try {
      const response = await apiService.getNhanKhauList(hk.id);
      if (response.success) {
        setNhanKhauTrongHo(response.data);
      }
    } catch (err: any) {
      setError(err.error?.message || "Lỗi khi tải danh sách nhân khẩu của hộ");
    } finally {
      setViewLoading(false);
    }
  };

  const openViewNhanKhau = (nk: any) => {
    setSelectedNhanKhau(nk);
    setShowViewNhanKhau(true);
  };

  const openEditNhanKhau = (nk: any) => {
    setSelectedNhanKhau(nk);
    setEditNhanKhauData({
      hoTen: nk.hoTen || "",
      cccd: nk.cccd || "",
      ngaySinh: nk.ngaySinh ? nk.ngaySinh.substring(0, 10) : "",
      gioiTinh: nk.gioiTinh || "",
      quanHe: nk.quanHe || "",
    });
    setShowEditNhanKhau(true);
  };

  const closeNhanKhauModals = () => {
    setShowViewNhanKhau(false);
    setShowEditNhanKhau(false);
    setSelectedNhanKhau(null);
  };

  const closeViewModal = () => {
    setShowViewModal(false);
    setViewHoKhau(null);
    setNhanKhauTrongHo([]);
  };

  const openEditForm = (hk: HoKhau) => {
    setEditingHoKhauId(hk.id);
    setEditData({
      soHoKhau: hk.soHoKhau || "",
      diaChi: hk.diaChi || "",
      tinhThanh: hk.tinhThanh || "",
      quanHuyen: hk.quanHuyen || "",
      phuongXa: hk.phuongXa || "",
      duongPho: hk.duongPho || "",
      soNha: hk.soNha || "",
      ngayCap: hk.ngayCap ? hk.ngayCap.substring(0, 10) : "",
      ghiChu: hk.ghiChu || "",
    });
    setShowEditForm(true);
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

  const handleUpdate = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingHoKhauId) return;
    setError(null);
    setSuccess(null);

    if (!editData.soHoKhau || !editData.diaChi) {
      setError("Vui lòng điền số hộ khẩu và địa chỉ");
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiService.updateHoKhau(editingHoKhauId, {
        soHoKhau: editData.soHoKhau,
        diaChi: editData.diaChi,
        tinhThanh: editData.tinhThanh || undefined,
        quanHuyen: editData.quanHuyen || undefined,
        phuongXa: editData.phuongXa || undefined,
        duongPho: editData.duongPho || undefined,
        soNha: editData.soNha || undefined,
        ngayCap: editData.ngayCap || undefined,
        ghiChu: editData.ghiChu || undefined,
      });

      if (response.success) {
        setSuccess("Cập nhật hộ khẩu thành công!");
        setShowEditForm(false);
        setEditingHoKhauId(null);
        setHoKhauList((prev) =>
          prev.map((item) =>
            item.id === editingHoKhauId ? response.data : item
          )
        );
        if (viewHoKhau?.id === editingHoKhauId) {
          setViewHoKhau(response.data);
        }
        // đảm bảo đồng bộ nếu có thay đổi phía server
        loadHoKhauList();
      }
    } catch (err: any) {
      setError(err.error?.message || "Lỗi khi cập nhật hộ khẩu");
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

  const relationLabels: Record<string, string> = {
    chu_ho: "Chủ hộ",
    vo_chong: "Vợ/Chồng",
    con: "Con",
    cha_me: "Cha/Mẹ",
    anh_chi_em: "Anh/Chị/Em",
    ong_ba: "Ông/Bà",
    chau: "Cháu",
    khac: "Khác",
  };
  const relationOptions = [
    { value: "chu_ho", label: "Chủ hộ" },
    { value: "vo_chong", label: "Vợ/Chồng" },
    { value: "con", label: "Con" },
    { value: "cha_me", label: "Cha/Mẹ" },
    { value: "anh_chi_em", label: "Anh/Chị/Em" },
    { value: "ong_ba", label: "Ông/Bà" },
    { value: "chau", label: "Cháu" },
    { value: "khac", label: "Khác" },
  ];
  const genderOptions = [
    { value: "nam", label: "Nam" },
    { value: "nu", label: "Nữ" },
    { value: "khac", label: "Khác" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
            Quản lý Hộ khẩu
          </h1>
          <p className="mt-1 text-gray-600">Tạo và quản lý thông tin hộ khẩu</p>
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

      {createPortal(
        <>
          {/* View nhân khẩu modal */}
          {showViewNhanKhau && selectedNhanKhau && (
            <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-2xl">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">
                    Thông tin nhân khẩu
                  </h2>
                  <button
                    onClick={closeNhanKhauModals}
                    className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    aria-label="Đóng xem nhân khẩu"
                  >
                    ✕
                  </button>
                </div>
                <div className="space-y-2 text-sm text-gray-700">
                  <div>
                    <p className="font-semibold">Họ tên</p>
                    <p>{selectedNhanKhau.hoTen}</p>
                  </div>
                  <div>
                    <p className="font-semibold">CCCD</p>
                    <p>{selectedNhanKhau.cccd || "-"}</p>
                  </div>
                  <div>
                    <p className="font-semibold">Quan hệ</p>
                    <p>
                      {relationLabels[selectedNhanKhau.quanHe] ||
                        selectedNhanKhau.quanHe}
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold">Giới tính</p>
                    <p>
                      {selectedNhanKhau.gioiTinh === "nam"
                        ? "Nam"
                        : selectedNhanKhau.gioiTinh === "nu"
                        ? "Nữ"
                        : selectedNhanKhau.gioiTinh === "khac"
                        ? "Khác"
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold">Ngày sinh</p>
                    <p>
                      {selectedNhanKhau.ngaySinh
                        ? new Date(
                            selectedNhanKhau.ngaySinh
                          ).toLocaleDateString("vi-VN")
                        : "-"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Edit nhân khẩu modal */}
          {showEditNhanKhau && selectedNhanKhau && (
            <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-2xl">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">
                    Chỉnh sửa nhân khẩu
                  </h2>
                  <button
                    onClick={closeNhanKhauModals}
                    className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    aria-label="Đóng chỉnh sửa nhân khẩu"
                  >
                    ✕
                  </button>
                </div>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!selectedNhanKhau) return;
                    setError(null);
                    setSuccess(null);
                    setIsLoading(true);
                    try {
                      const response = await apiService.updateNhanKhau(
                        selectedNhanKhau.id,
                        {
                          hoTen: editNhanKhauData.hoTen,
                          cccd: editNhanKhauData.cccd || undefined,
                          ngaySinh: editNhanKhauData.ngaySinh || undefined,
                          gioiTinh:
                            (editNhanKhauData.gioiTinh as any) || undefined,
                          quanHe: (editNhanKhauData.quanHe as any) || undefined,
                        }
                      );

                      if (response.success) {
                        setSuccess("Cập nhật nhân khẩu thành công!");
                        setShowEditNhanKhau(false);
                        setSelectedNhanKhau(response.data);
                        setNhanKhauTrongHo((prev) =>
                          prev.map((item) =>
                            item.id === response.data.id ? response.data : item
                          )
                        );
                      }
                    } catch (err: any) {
                      if (err.error?.code === "HOUSEHOLD_HEAD_EXISTS") {
                        setError(
                          "Hộ khẩu này đã có chủ hộ, không thể chọn thêm."
                        );
                      } else {
                        setError(
                          err.error?.message || "Lỗi khi cập nhật nhân khẩu"
                        );
                      }
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                  className="space-y-3 text-sm"
                >
                  <label className="block text-sm font-medium text-gray-700">
                    Họ tên
                    <input
                      type="text"
                      required
                      value={editNhanKhauData.hoTen}
                      onChange={(e) =>
                        setEditNhanKhauData({
                          ...editNhanKhauData,
                          hoTen: e.target.value,
                        })
                      }
                      className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </label>

                  <label className="block text-sm font-medium text-gray-700">
                    CCCD
                    <input
                      type="text"
                      value={editNhanKhauData.cccd}
                      onChange={(e) =>
                        setEditNhanKhauData({
                          ...editNhanKhauData,
                          cccd: e.target.value,
                        })
                      }
                      className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Ngày sinh
                      <input
                        type="date"
                        value={editNhanKhauData.ngaySinh}
                        onChange={(e) =>
                          setEditNhanKhauData({
                            ...editNhanKhauData,
                            ngaySinh: e.target.value,
                          })
                        }
                        className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </label>

                    <label className="block text-sm font-medium text-gray-700">
                      Giới tính
                      <select
                        value={editNhanKhauData.gioiTinh}
                        onChange={(e) =>
                          setEditNhanKhauData({
                            ...editNhanKhauData,
                            gioiTinh: e.target.value,
                          })
                        }
                        className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      >
                        <option value="">Chọn</option>
                        {genderOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <label className="block text-sm font-medium text-gray-700">
                    Quan hệ
                    <select
                      required
                      value={editNhanKhauData.quanHe}
                      onChange={(e) =>
                        setEditNhanKhauData({
                          ...editNhanKhauData,
                          quanHe: e.target.value,
                        })
                      }
                      className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="">Chọn quan hệ</option>
                      {relationOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="flex-1 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-2 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg disabled:opacity-50"
                    >
                      {isLoading ? "Đang lưu..." : "Lưu"}
                    </button>
                    <button
                      type="button"
                      onClick={closeNhanKhauModals}
                      className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      Hủy
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>,
        document.body
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

      {/* View household modal */}
      {showViewModal && viewHoKhau && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-3xl rounded-xl border border-gray-200 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Chi tiết hộ khẩu {viewHoKhau.soHoKhau}
                </h2>
                <p className="text-sm text-gray-600">{viewHoKhau.diaChi}</p>
              </div>
              <button
                onClick={closeViewModal}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                aria-label="Đóng xem hộ khẩu"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4 text-sm text-gray-700">
              <div>
                <p className="font-semibold">Số hộ khẩu</p>
                <p>{viewHoKhau.soHoKhau}</p>
              </div>
              <div>
                <p className="font-semibold">Trạng thái</p>
                <div className="mt-1">
                  {getTrangThaiBadge(viewHoKhau.trangThai)}
                </div>
              </div>
              <div>
                <p className="font-semibold">Tỉnh/Thành</p>
                <p>{viewHoKhau.tinhThanh || "-"}</p>
              </div>
              <div>
                <p className="font-semibold">Quận/Huyện</p>
                <p>{viewHoKhau.quanHuyen || "-"}</p>
              </div>
              <div>
                <p className="font-semibold">Phường/Xã</p>
                <p>{viewHoKhau.phuongXa || "-"}</p>
              </div>
              <div>
                <p className="font-semibold">Đường/Phố</p>
                <p>{viewHoKhau.duongPho || "-"}</p>
              </div>
              <div>
                <p className="font-semibold">Số nhà</p>
                <p>{viewHoKhau.soNha || "-"}</p>
              </div>
              <div>
                <p className="font-semibold">Ngày cấp</p>
                <p>
                  {viewHoKhau.ngayCap
                    ? new Date(viewHoKhau.ngayCap).toLocaleDateString("vi-VN")
                    : "-"}
                </p>
              </div>
              <div className="col-span-2">
                <p className="font-semibold">Ghi chú</p>
                <p>{viewHoKhau.ghiChu || "-"}</p>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200">
              <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
                <h3 className="text-sm font-semibold text-gray-900">
                  Nhân khẩu trong hộ ({nhanKhauTrongHo.length})
                </h3>
              </div>
              {viewLoading ? (
                <div className="p-4 text-sm text-gray-600">Đang tải...</div>
              ) : nhanKhauTrongHo.length === 0 ? (
                <div className="p-4 text-sm text-gray-600">
                  Chưa có nhân khẩu nào.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left font-semibold text-gray-700">
                          Họ tên
                        </th>
                        <th className="px-4 py-2 text-left font-semibold text-gray-700">
                          CCCD
                        </th>
                        <th className="px-4 py-2 text-left font-semibold text-gray-700">
                          Quan hệ
                        </th>
                        <th className="px-4 py-2 text-left font-semibold text-gray-700">
                          Thao tác
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {[...nhanKhauTrongHo]
                        .sort((a, b) => {
                          if (a.quanHe === "chu_ho" && b.quanHe !== "chu_ho")
                            return -1;
                          if (b.quanHe === "chu_ho" && a.quanHe !== "chu_ho")
                            return 1;
                          return (a.hoTen || "").localeCompare(b.hoTen || "");
                        })
                        .map((nk) => (
                          <tr key={nk.id}>
                            <td className="px-4 py-2 text-gray-900">
                              {nk.hoTen}
                            </td>
                            <td className="px-4 py-2 text-gray-600">
                              {nk.cccd || "-"}
                            </td>
                            <td className="px-4 py-2 text-gray-600">
                              {relationLabels[nk.quanHe] || nk.quanHe}
                            </td>
                            <td className="px-4 py-2 text-gray-600">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => openViewNhanKhau(nk)}
                                  className="rounded-lg border border-gray-200 bg-white px-3 py-1 text-xs text-gray-700 hover:bg-gray-50 shadow-sm"
                                >
                                  👁 Xem
                                </button>
                                <button
                                  onClick={() => openEditNhanKhau(nk)}
                                  className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1 text-xs text-blue-700 hover:bg-blue-100 shadow-sm"
                                >
                                  ✏️ Sửa
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit household modal */}
      {showEditForm && editingHoKhauId && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-xl border border-gray-200 bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                Chỉnh sửa hộ khẩu
              </h2>
              <button
                onClick={() => {
                  setShowEditForm(false);
                  setEditingHoKhauId(null);
                }}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                aria-label="Đóng chỉnh sửa"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <label className="block text-sm font-medium text-gray-700">
                  Số hộ khẩu <span className="text-red-500">*</span>
                  <input
                    type="text"
                    required
                    value={editData.soHoKhau}
                    onChange={(e) =>
                      setEditData({ ...editData, soHoKhau: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </label>

                <label className="block text-sm font-medium text-gray-700">
                  Ngày cấp
                  <input
                    type="date"
                    value={editData.ngayCap}
                    onChange={(e) =>
                      setEditData({ ...editData, ngayCap: e.target.value })
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
                  value={editData.diaChi}
                  onChange={(e) =>
                    setEditData({ ...editData, diaChi: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </label>

              <div className="grid grid-cols-3 gap-4">
                <label className="block text-sm font-medium text-gray-700">
                  Tỉnh/Thành phố
                  <input
                    type="text"
                    value={editData.tinhThanh}
                    onChange={(e) =>
                      setEditData({ ...editData, tinhThanh: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </label>

                <label className="block text-sm font-medium text-gray-700">
                  Quận/Huyện
                  <input
                    type="text"
                    value={editData.quanHuyen}
                    onChange={(e) =>
                      setEditData({ ...editData, quanHuyen: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </label>

                <label className="block text-sm font-medium text-gray-700">
                  Phường/Xã
                  <input
                    type="text"
                    value={editData.phuongXa}
                    onChange={(e) =>
                      setEditData({ ...editData, phuongXa: e.target.value })
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
                    value={editData.duongPho}
                    onChange={(e) =>
                      setEditData({ ...editData, duongPho: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </label>

                <label className="block text-sm font-medium text-gray-700">
                  Số nhà
                  <input
                    type="text"
                    value={editData.soNha}
                    onChange={(e) =>
                      setEditData({ ...editData, soNha: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </label>
              </div>

              <label className="block text-sm font-medium text-gray-700">
                Ghi chú
                <textarea
                  value={editData.ghiChu}
                  onChange={(e) =>
                    setEditData({ ...editData, ghiChu: e.target.value })
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
                  {isLoading ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditForm(false);
                    setEditingHoKhauId(null);
                  }}
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
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Thao tác
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
                    <td className="px-4 py-3">
                      {getTrangThaiBadge(hk.trangThai)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(hk.createdAt).toLocaleDateString("vi-VN")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openViewModal(hk)}
                          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 shadow-sm"
                          aria-label="Xem nhân khẩu"
                        >
                          👁 Xem
                        </button>
                        <button
                          onClick={() => openEditForm(hk)}
                          className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm text-blue-700 hover:bg-blue-100 shadow-sm"
                          aria-label="Chỉnh sửa hộ khẩu"
                        >
                          ✏️ Sửa
                        </button>
                      </div>
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
