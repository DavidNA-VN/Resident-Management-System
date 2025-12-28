import { FormEvent, useState, useEffect, useRef } from "react";

export type RequestType =
  | "TAM_VANG"
  | "TAM_TRU"
  | "TACH_HO_KHAU"
  | "SUA_NHAN_KHAU"
  | "XOA_NHAN_KHAU";

// Focus the modal for keyboard accessibility


interface RequestModalProps {
  isOpen: boolean;
  type: RequestType | null;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  nhanKhauList?: Array<{ id: number; hoTen: string }>;
  householdInfo?: { soHoKhau: string; diaChi: string };
}

const requestTypeLabels: Record<RequestType, string> = {
  TAM_VANG: "Xin tạm vắng",
  TAM_TRU: "Xin tạm trú",
  TACH_HO_KHAU: "Yêu cầu tách hộ khẩu",
  SUA_NHAN_KHAU: "Sửa thông tin nhân khẩu",
  XOA_NHAN_KHAU: "Xoá nhân khẩu",
};

export default function RequestModal({
  isOpen,
  type,
  onClose,
  onSubmit,
  nhanKhauList = [],
  householdInfo,
}: RequestModalProps) {
  const [formData, setFormData] = useState<any>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && type) {
      // Reset form khi mở modal
      setFormData({});
      setError(null);
    }
  }, [isOpen, type]);

  // Accessibility: focus modal container when opened
  const modalRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (isOpen) {
      // small timeout to ensure elements are rendered
      setTimeout(() => modalRef.current?.focus(), 0);
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate
    if (type === "TAM_VANG" || type === "TAM_TRU" || type === "SUA_NHAN_KHAU" || type === "XOA_NHAN_KHAU") {
      if (!formData.nhanKhauId) {
        setError("Vui lòng chọn nhân khẩu");
        return;
      }
    }

    if (type === "TAM_VANG" || type === "TAM_TRU") {
      if (!formData.tuNgay) {
        setError("Vui lòng chọn từ ngày");
        return;
      }
    }

    if (type === "TAM_VANG" || type === "TAM_TRU" || type === "SUA_NHAN_KHAU" || type === "XOA_NHAN_KHAU") {
      if (!formData.lyDo || formData.lyDo.trim() === "") {
        setError("Vui lòng nhập lý do");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        type,
        payload: formData,
      });
      // Reset form sau khi submit thành công
      setFormData({});
      onClose();
    } catch (err: any) {
      setError(err.error?.message || "Có lỗi xảy ra khi gửi yêu cầu");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !type) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="request-modal-title"
        className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 shadow-xl outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-6 flex items-center justify-between border-b border-gray-200 pb-4">
          <h2 id="request-modal-title" className="text-2xl font-bold text-gray-900">
            {requestTypeLabels[type]}
          </h2>
          <button
            onClick={onClose}
            aria-label="Đóng"
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            ✕
          </button>
        </div>

        {householdInfo && (
          <div className="mb-4 text-sm text-gray-600">
            <span className="font-medium">Hộ khẩu:</span> {householdInfo.soHoKhau} — {householdInfo.diaChi}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* TAM_VANG */}
          {type === "TAM_VANG" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Chọn nhân khẩu <span className="text-red-500">*</span>
                </label>
                <select
                  autoFocus
                  value={formData.nhanKhauId || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, nhanKhauId: Number(e.target.value) })
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  required
                >
                  <option value="">-- Chọn nhân khẩu --</option>
                  {nhanKhauList.map((nk) => (
                    <option key={nk.id} value={nk.id}>
                      {nk.hoTen}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Từ ngày <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.tuNgay || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, tuNgay: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Đến ngày
                  </label>
                  <input
                    type="date"
                    value={formData.denNgay || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, denNgay: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lý do <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.lyDo || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, lyDo: e.target.value })
                  }
                  rows={4}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Nhập lý do tạm vắng..."
                  required
                />
              </div>
            </>
          )}

          {/* TAM_TRU */}
          {type === "TAM_TRU" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Chọn nhân khẩu <span className="text-red-500">*</span>
                </label>
                <select
                  autoFocus
                  value={formData.nhanKhauId || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, nhanKhauId: Number(e.target.value) })
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  required
                >
                  <option value="">-- Chọn nhân khẩu --</option>
                  {nhanKhauList.map((nk) => (
                    <option key={nk.id} value={nk.id}>
                      {nk.hoTen}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Địa chỉ tạm trú <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.diaChi || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, diaChi: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Nhập địa chỉ tạm trú..."
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Từ ngày <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.tuNgay || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, tuNgay: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Đến ngày
                  </label>
                  <input
                    type="date"
                    value={formData.denNgay || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, denNgay: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ghi chú/Lý do <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.lyDo || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, lyDo: e.target.value })
                  }
                  rows={4}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Nhập lý do tạm trú..."
                  required
                />
              </div>
            </>
          )}


          {/* SUA_NHAN_KHAU */}
          {type === "SUA_NHAN_KHAU" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Chọn nhân khẩu cần sửa <span className="text-red-500">*</span>
                </label>
                <select
                  autoFocus
                  value={formData.nhanKhauId || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, nhanKhauId: Number(e.target.value) })
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  required
                >
                  <option value="">-- Chọn nhân khẩu --</option>
                  {nhanKhauList.map((nk) => (
                    <option key={nk.id} value={nk.id}>
                      {nk.hoTen}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Họ tên mới
                  </label>
                  <input
                    type="text"
                    value={formData.hoTen || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, hoTen: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="Nhập họ tên mới..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CCCD/CMND mới
                  </label>
                  <input
                    type="text"
                    value={formData.cccd || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, cccd: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="Nhập CCCD/CMND mới..."
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ngày sinh mới
                  </label>
                  <input
                    type="date"
                    value={formData.ngaySinh || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, ngaySinh: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Giới tính mới
                  </label>
                  <select
                    value={formData.gioiTinh || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, gioiTinh: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="">-- Chọn giới tính --</option>
                    <option value="nam">Nam</option>
                    <option value="nu">Nữ</option>
                    <option value="khac">Khác</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lý do sửa <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.lyDo || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, lyDo: e.target.value })
                  }
                  rows={4}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Nhập lý do sửa thông tin..."
                  required
                />
              </div>
            </>
          )}

          {/* XOA_NHAN_KHAU */}
          {type === "XOA_NHAN_KHAU" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Chọn nhân khẩu cần xoá <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.nhanKhauId || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, nhanKhauId: Number(e.target.value) })
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  required
                >
                  <option value="">-- Chọn nhân khẩu --</option>
                  {nhanKhauList.map((nk) => (
                    <option key={nk.id} value={nk.id}>
                      {nk.hoTen}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lý do xoá <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.lyDo || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, lyDo: e.target.value })
                  }
                  rows={4}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Nhập lý do xoá nhân khẩu..."
                  required
                />
              </div>
            </>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={isSubmitting}
            >
              Huỷ
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

