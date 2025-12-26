import { FormEvent, useState, useEffect } from "react";
import { formatFromYMD } from "../utils/date";

interface NhanKhau {
  id: number;
  hoTen: string;
  cccd?: string;
  ngaySinh?: string;
  gioiTinh?: "nam" | "nu" | "khac";
  quanHe: string;
  trangThai: string;
}

interface Household {
  id: number;
  soHoKhau: string;
  diaChi: string;
  diaChiDayDu?: string;
  chuHoId?: number;
  chuHo?: NhanKhau;
}

interface TachHoKhauModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  household: Household;
  nhanKhauList: NhanKhau[];
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

export default function TachHoKhauModal({
  isOpen,
  onClose,
  onSubmit,
  household,
  nhanKhauList,
}: TachHoKhauModalProps) {
  const [selectedNhanKhauIds, setSelectedNhanKhauIds] = useState<number[]>([]);
  const [chuHoMoiId, setChuHoMoiId] = useState<number | null>(null);
  const [quanHeMap, setQuanHeMap] = useState<Record<number, string>>({});
  const [diaChiMoi, setDiaChiMoi] = useState({
    tinhThanh: "",
    quanHuyen: "",
    phuongXa: "",
    duongPho: "",
    soNha: "",
    diaChiDayDu: "",
  });
  const [ngayHieuLuc, setNgayHieuLuc] = useState("");
  const [lyDo, setLyDo] = useState("");
  const [ghiChu, setGhiChu] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [camKet, setCamKet] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      // Reset form khi mở modal
      setSelectedNhanKhauIds([]);
      setChuHoMoiId(null);
      setQuanHeMap({});
      setDiaChiMoi({
        tinhThanh: "",
        quanHuyen: "",
        phuongXa: "",
        duongPho: "",
        soNha: "",
        diaChiDayDu: "",
      });
      setNgayHieuLuc("");
      setLyDo("");
      setGhiChu("");
      setFiles([]);
      setCamKet(false);
      setErrors({});
    }
  }, [isOpen]);

  // Filter nhân khẩu chỉ lấy những người active
  const availableNhanKhau = nhanKhauList.filter((nk) => nk.trangThai === "active");

  const handleToggleNhanKhau = (id: number) => {
    setSelectedNhanKhauIds((prev) => {
      const newIds = prev.includes(id)
        ? prev.filter((nid) => nid !== id)
        : [...prev, id];

      // Nếu chủ hộ mới không còn trong danh sách chọn, reset
      if (chuHoMoiId && !newIds.includes(chuHoMoiId)) {
        setChuHoMoiId(null);
      }

      // Reset quan hệ map cho những người bị bỏ chọn
      if (!newIds.includes(id)) {
        setQuanHeMap((prev) => {
          const newMap = { ...prev };
          delete newMap[id];
          return newMap;
        });
      }

      return newIds;
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      // Giới hạn tổng dung lượng 10MB
      const maxSize = 10 * 1024 * 1024;
      const validFiles = newFiles.filter((file) => file.size <= maxSize);

      if (validFiles.length !== newFiles.length) {
        setErrors((prev) => ({
          ...prev,
          files: "Một số file vượt quá 10MB đã bị bỏ qua",
        }));
      }

      setFiles((prev) => [...prev, ...validFiles]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (selectedNhanKhauIds.length === 0) {
      newErrors.selectedNhanKhau = "Vui lòng chọn ít nhất một nhân khẩu";
    }

    if (!chuHoMoiId) {
      newErrors.chuHoMoi = "Vui lòng chọn chủ hộ mới";
    }

    if (!diaChiMoi.tinhThanh || !diaChiMoi.quanHuyen || !diaChiMoi.phuongXa || !diaChiMoi.duongPho || !diaChiMoi.soNha) {
      newErrors.diaChi = "Vui lòng điền đầy đủ thông tin địa chỉ";
    }

    if (!ngayHieuLuc) {
      newErrors.ngayHieuLuc = "Vui lòng chọn ngày dự kiến hiệu lực";
    }

    if (!lyDo || lyDo.trim() === "") {
      newErrors.lyDo = "Vui lòng nhập lý do tách hộ";
    }

    if (!camKet) {
      newErrors.camKet = "Vui lòng xác nhận cam kết";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        hoKhauCuId: household.id,
        nhanKhauIds: selectedNhanKhauIds,
        chuHoMoiId: chuHoMoiId,
        diaChiMoi,
        ngayHieuLuc,
        lyDo,
        ghiChu: ghiChu || undefined,
        quanHeMap,
        attachments: files.map((f) => ({
          name: f.name,
          size: f.size,
          type: f.type,
        })),
      };

      await onSubmit({
        type: "TACH_HO_KHAU",
        payload,
      });
      onClose();
    } catch (err: any) {
      setErrors({
        submit: err.error?.message || "Có lỗi xảy ra khi gửi yêu cầu",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const selectedNhanKhau = availableNhanKhau.filter((nk) =>
    selectedNhanKhauIds.includes(nk.id)
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl rounded-2xl border border-gray-200 bg-white shadow-xl my-8 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
          <h2 className="text-2xl font-bold text-gray-900">
            Yêu cầu tách hộ khẩu
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error Message */}
          {errors.submit && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {errors.submit}
            </div>
          )}

          {/* 3.1 Thông tin hộ khẩu hiện tại */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Thông tin hộ khẩu hiện tại
            </h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">Số hộ khẩu</p>
                <p className="text-base font-semibold text-gray-900">{household.soHoKhau}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Địa chỉ thường trú</p>
                <p className="text-base font-semibold text-gray-900">
                  {household.diaChiDayDu || household.diaChi}
                </p>
              </div>
              {household.chuHo && (
                <div className="col-span-2">
                  <p className="text-sm text-gray-500 mb-1">Chủ hộ hiện tại</p>
                  <p className="text-base font-semibold text-gray-900">
                    {household.chuHo.hoTen} {household.chuHo.cccd && `(${household.chuHo.cccd})`}
                  </p>
                </div>
              )}
            </div>

            {/* Bảng danh sách nhân khẩu (read-only) */}
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-700 mb-2">
                Danh sách nhân khẩu trong hộ
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-300 bg-gray-100">
                      <th className="text-left py-2 px-3 font-semibold text-gray-700">Họ và tên</th>
                      <th className="text-left py-2 px-3 font-semibold text-gray-700">CCCD</th>
                      <th className="text-left py-2 px-3 font-semibold text-gray-700">Ngày sinh</th>
                      <th className="text-left py-2 px-3 font-semibold text-gray-700">Giới tính</th>
                      <th className="text-left py-2 px-3 font-semibold text-gray-700">Quan hệ</th>
                      <th className="text-left py-2 px-3 font-semibold text-gray-700">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {availableNhanKhau.map((nk) => (
                      <tr key={nk.id} className="border-b border-gray-200">
                        <td className="py-2 px-3 text-gray-900">{nk.hoTen}</td>
                        <td className="py-2 px-3 text-gray-600">{nk.cccd || "-"}</td>
                        <td className="py-2 px-3 text-gray-600">
                          {nk.ngaySinh
                            ? formatFromYMD(nk.ngaySinh)
                            : "-"}
                        </td>
                        <td className="py-2 px-3 text-gray-600">
                          {nk.gioiTinh ? gioiTinhLabels[nk.gioiTinh] : "-"}
                        </td>
                        <td className="py-2 px-3 text-gray-600">
                          {quanHeLabels[nk.quanHe] || nk.quanHe}
                        </td>
                        <td className="py-2 px-3">
                          <span
                            className={`px-2 py-1 rounded text-xs font-semibold ${
                              nk.trangThai === "active"
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {nk.trangThai === "active" ? "Thường trú" : nk.trangThai}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* 3.2 Chọn nhân khẩu tách ra */}
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Chọn nhân khẩu tách ra <span className="text-red-500">*</span>
            </h3>
            {errors.selectedNhanKhau && (
              <p className="text-sm text-red-600 mb-2">{errors.selectedNhanKhau}</p>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-300 bg-gray-100">
                    <th className="w-12 text-center py-2 px-3">
                      <input
                        type="checkbox"
                        checked={
                          selectedNhanKhauIds.length === availableNhanKhau.length &&
                          availableNhanKhau.length > 0
                        }
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedNhanKhauIds(availableNhanKhau.map((nk) => nk.id));
                          } else {
                            setSelectedNhanKhauIds([]);
                            setChuHoMoiId(null);
                            setQuanHeMap({});
                          }
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-700">Họ và tên</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-700">CCCD</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-700">Ngày sinh</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-700">Giới tính</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-700">Quan hệ</th>
                  </tr>
                </thead>
                <tbody>
                  {availableNhanKhau.map((nk) => (
                    <tr
                      key={nk.id}
                      className={`border-b border-gray-200 hover:bg-gray-50 ${
                        selectedNhanKhauIds.includes(nk.id) ? "bg-blue-50" : ""
                      }`}
                    >
                      <td className="text-center py-2 px-3">
                        <input
                          type="checkbox"
                          checked={selectedNhanKhauIds.includes(nk.id)}
                          onChange={() => handleToggleNhanKhau(nk.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="py-2 px-3 text-gray-900 font-medium">{nk.hoTen}</td>
                      <td className="py-2 px-3 text-gray-600">{nk.cccd || "-"}</td>
                      <td className="py-2 px-3 text-gray-600">
                        {nk.ngaySinh
                          ? formatFromYMD(nk.ngaySinh)
                          : "-"}
                      </td>
                      <td className="py-2 px-3 text-gray-600">
                        {nk.gioiTinh ? gioiTinhLabels[nk.gioiTinh] : "-"}
                      </td>
                      <td className="py-2 px-3 text-gray-600">
                        {quanHeLabels[nk.quanHe] || nk.quanHe}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 3.3 Chọn chủ hộ mới */}
          {selectedNhanKhauIds.length > 0 && (
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Chọn chủ hộ mới <span className="text-red-500">*</span>
              </h3>
              {errors.chuHoMoi && (
                <p className="text-sm text-red-600 mb-2">{errors.chuHoMoi}</p>
              )}
              <select
                value={chuHoMoiId || ""}
                onChange={(e) => {
                  const id = Number(e.target.value);
                  setChuHoMoiId(id);
                  // Set quan hệ cho chủ hộ mới là "chu_ho"
                  setQuanHeMap((prev) => ({ ...prev, [id]: "chu_ho" }));
                }}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">-- Chọn chủ hộ mới --</option>
                {selectedNhanKhau.map((nk) => (
                  <option key={nk.id} value={nk.id}>
                    {nk.hoTen} {nk.cccd && `(${nk.cccd})`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 3.5 Quan hệ trong hộ mới */}
          {selectedNhanKhauIds.length > 0 && chuHoMoiId && (
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Quan hệ với chủ hộ mới
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-300 bg-gray-100">
                      <th className="text-left py-2 px-3 font-semibold text-gray-700">Nhân khẩu</th>
                      <th className="text-left py-2 px-3 font-semibold text-gray-700">Quan hệ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedNhanKhau.map((nk) => {
                      if (nk.id === chuHoMoiId) return null; // Chủ hộ đã set tự động
                      return (
                        <tr key={nk.id} className="border-b border-gray-200">
                          <td className="py-2 px-3 text-gray-900">{nk.hoTen}</td>
                          <td className="py-2 px-3">
                            <select
                              value={quanHeMap[nk.id] || ""}
                              onChange={(e) =>
                                setQuanHeMap((prev) => ({
                                  ...prev,
                                  [nk.id]: e.target.value,
                                }))
                              }
                              className="w-full rounded border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                              <option value="">-- Chọn quan hệ --</option>
                              {Object.entries(quanHeLabels).map(([key, label]) => (
                                <option key={key} value={key}>
                                  {label}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 3.4 Thông tin hộ khẩu mới */}
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Thông tin hộ khẩu mới <span className="text-red-500">*</span>
            </h3>
            {errors.diaChi && (
              <p className="text-sm text-red-600 mb-2">{errors.diaChi}</p>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tỉnh/Thành <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={diaChiMoi.tinhThanh}
                  onChange={(e) =>
                    setDiaChiMoi((prev) => ({ ...prev, tinhThanh: e.target.value }))
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quận/Huyện <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={diaChiMoi.quanHuyen}
                  onChange={(e) =>
                    setDiaChiMoi((prev) => ({ ...prev, quanHuyen: e.target.value }))
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phường/Xã <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={diaChiMoi.phuongXa}
                  onChange={(e) =>
                    setDiaChiMoi((prev) => ({ ...prev, phuongXa: e.target.value }))
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Đường/Phố <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={diaChiMoi.duongPho}
                  onChange={(e) =>
                    setDiaChiMoi((prev) => ({ ...prev, duongPho: e.target.value }))
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Số nhà <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={diaChiMoi.soNha}
                  onChange={(e) =>
                    setDiaChiMoi((prev) => ({ ...prev, soNha: e.target.value }))
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Địa chỉ đầy đủ
                </label>
                <input
                  type="text"
                  value={diaChiMoi.diaChiDayDu}
                  onChange={(e) =>
                    setDiaChiMoi((prev) => ({ ...prev, diaChiDayDu: e.target.value }))
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Số nhà, Đường, Phường/Xã, Quận/Huyện, Tỉnh/Thành"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ngày dự kiến hiệu lực <span className="text-red-500">*</span>
                </label>
                {errors.ngayHieuLuc && (
                  <p className="text-sm text-red-600 mb-1">{errors.ngayHieuLuc}</p>
                )}
                <input
                  type="date"
                  value={ngayHieuLuc}
                  onChange={(e) => setNgayHieuLuc(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  required
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lý do tách hộ <span className="text-red-500">*</span>
                </label>
                {errors.lyDo && (
                  <p className="text-sm text-red-600 mb-1">{errors.lyDo}</p>
                )}
                <textarea
                  value={lyDo}
                  onChange={(e) => setLyDo(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Nhập lý do tách hộ khẩu..."
                  required
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ghi chú thêm
                </label>
                <textarea
                  value={ghiChu}
                  onChange={(e) => setGhiChu(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Nhập ghi chú nếu có..."
                />
              </div>
            </div>
          </div>

          {/* 3.6 Đính kèm giấy tờ */}
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Đính kèm giấy tờ (Tùy chọn)
            </h3>
            {errors.files && (
              <p className="text-sm text-yellow-600 mb-2">{errors.files}</p>
            )}
            <input
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileChange}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <p className="text-xs text-gray-500 mt-2">
              Chấp nhận file PDF, JPG, PNG. Tối đa 10MB mỗi file.
            </p>
            {files.length > 0 && (
              <div className="mt-4 space-y-2">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{file.name}</p>
                      <p className="text-xs text-gray-500">
                        {(file.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(index)}
                      className="ml-3 rounded-lg p-1 text-red-600 hover:bg-red-50 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3.7 Cam kết và nút hành động */}
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={camKet}
                onChange={(e) => setCamKet(e.target.checked)}
                className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">
                Tôi cam kết thông tin đúng sự thật <span className="text-red-500">*</span>
              </span>
            </label>
            {errors.camKet && (
              <p className="text-sm text-red-600 mt-2">{errors.camKet}</p>
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={isSubmitting}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="flex-1 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-2.5 text-sm font-medium text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Đang gửi..." : "Gửi yêu cầu"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

