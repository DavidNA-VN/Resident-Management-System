import { FormEvent, useState, useEffect, useRef } from "react";

interface NhanKhau {
  id: number;
  hoTen: string;
  cccd?: string;
  quanHe: string;
}

interface Household {
  id: number;
  soHoKhau: string;
  diaChi: string;
  diaChiDayDu?: string;
  chuHo?: {
    hoTen: string;
    cccd?: string;
  };
}

interface SplitHouseholdRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: SplitHouseholdRequestData) => Promise<void>;
  household: Household | null;
  nhanKhauList: NhanKhau[];
  isLoading?: boolean;
}

export interface SplitHouseholdRequestData {
  hoKhauId: number;
  selectedNhanKhauIds: number[];
  newChuHoId: number;
  newAddress: string;
  expectedDate: string;
  reason: string;
  note?: string;
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

export default function SplitHouseholdRequestModal({
  isOpen,
  onClose,
  onSubmit,
  household,
  nhanKhauList,
  isLoading = false,
}: SplitHouseholdRequestModalProps) {
  const [selectedNhanKhauIds, setSelectedNhanKhauIds] = useState<number[]>([]);
  const [newChuHoId, setNewChuHoId] = useState<number | null>(null);
  const [newAddress, setNewAddress] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Focus container and reset form khi mở/đóng modal
  const modalRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => modalRef.current?.focus(), 0);
      setSelectedNhanKhauIds([]);
      setNewChuHoId(null);
      setNewAddress("");
      setExpectedDate("");
      setReason("");
      setNote("");
      setErrors({});
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    }
  };

  const handleToggleNhanKhau = (id: number) => {
    setSelectedNhanKhauIds((prev) => {
      const newIds = prev.includes(id)
        ? prev.filter((nid) => nid !== id)
        : [...prev, id];

      // Nếu chủ hộ mới không còn trong danh sách chọn, reset
      if (newChuHoId && !newIds.includes(newChuHoId)) {
        setNewChuHoId(null);
      }

      return newIds;
    });
  };

  const handleSelectAll = () => {
    if (selectedNhanKhauIds.length === nhanKhauList.length) {
      setSelectedNhanKhauIds([]);
      setNewChuHoId(null);
    } else {
      setSelectedNhanKhauIds(nhanKhauList.map((nk) => nk.id));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (selectedNhanKhauIds.length === 0) {
      newErrors.selectedNhanKhau = "Vui lòng chọn ít nhất một nhân khẩu";
    }

    if (!newChuHoId) {
      newErrors.newChuHo = "Vui lòng chọn chủ hộ mới";
    }

    if (!newAddress || newAddress.trim() === "") {
      newErrors.newAddress = "Vui lòng nhập địa chỉ hộ khẩu mới";
    }

    if (!expectedDate) {
      newErrors.expectedDate = "Vui lòng chọn ngày dự kiến tách hộ";
    }

    if (!reason || reason.trim() === "") {
      newErrors.reason = "Vui lòng nhập lý do tách hộ";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!household || !validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        hoKhauId: household.id,
        selectedNhanKhauIds,
        newChuHoId: newChuHoId!,
        newAddress: newAddress.trim(),
        expectedDate,
        reason: reason.trim(),
        note: note.trim() || undefined,
      });
      // Đóng modal sau khi submit thành công (sẽ được xử lý ở component cha)
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

  const selectedNhanKhau = nhanKhauList.filter((nk) =>
    selectedNhanKhauIds.includes(nk.id)
  );

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
        aria-labelledby="split-household-title"
        className="w-full max-w-3xl rounded-2xl border border-gray-200 bg-white shadow-xl outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 id="split-household-title" className="text-2xl font-bold text-gray-900">
            Yêu cầu tách hộ khẩu
          </h2>
          <button
            onClick={onClose}
            aria-label="Đóng"
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Error Message */}
          {errors.submit && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {errors.submit}
            </div>
          )}

          {/* A. Thông tin hộ khẩu hiện tại (readonly) */}
          {household && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                A. Thông tin hộ khẩu hiện tại
              </h3>
              <div className="grid grid-cols-2 gap-4">
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
                {household.chuHo && (
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500 mb-1">Chủ hộ hiện tại</p>
                    <p className="text-base font-semibold text-gray-900">
                      {household.chuHo.hoTen} {household.chuHo.cccd && `(${household.chuHo.cccd})`}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* B. Danh sách nhân khẩu xin tách */}
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              B. Danh sách nhân khẩu xin tách <span className="text-red-500">*</span>
            </h3>
            {errors.selectedNhanKhau && (
              <p className="text-sm text-red-600 mb-2">{errors.selectedNhanKhau}</p>
            )}
            {isLoading ? (
              <div className="text-center py-4">
                <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
                <p className="mt-2 text-sm text-gray-600">Đang tải...</p>
              </div>
            ) : nhanKhauList.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                Không có nhân khẩu nào trong hộ khẩu này.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-300 bg-gray-100">
                      <th className="w-12 text-center py-2 px-3">
                        <input
                          type="checkbox"
                          checked={
                            selectedNhanKhauIds.length === nhanKhauList.length &&
                            nhanKhauList.length > 0
                          }
                          onChange={handleSelectAll}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </th>
                      <th className="text-left py-2 px-3 font-semibold text-gray-700">Họ tên</th>
                      <th className="text-left py-2 px-3 font-semibold text-gray-700">CCCD/CMND</th>
                      <th className="text-left py-2 px-3 font-semibold text-gray-700">
                        Quan hệ với chủ hộ
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {nhanKhauList.map((nk) => (
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
                          {quanHeLabels[nk.quanHe] || nk.quanHe}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* C. Chọn chủ hộ mới */}
          {selectedNhanKhauIds.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                C. Chọn chủ hộ mới <span className="text-red-500">*</span>
              </label>
              {errors.newChuHo && (
                <p className="text-sm text-red-600 mb-2">{errors.newChuHo}</p>
              )}
              <select
                value={newChuHoId || ""}
                onChange={(e) => setNewChuHoId(Number(e.target.value))}
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

          {/* D. Thông tin hộ khẩu mới */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">
              D. Thông tin hộ khẩu mới <span className="text-red-500">*</span>
            </h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Địa chỉ hộ khẩu mới <span className="text-red-500">*</span>
              </label>
              {errors.newAddress && (
                <p className="text-sm text-red-600 mb-2">{errors.newAddress}</p>
              )}
              <input
                type="text"
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="Nhập địa chỉ hộ khẩu mới..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ngày dự kiến tách hộ <span className="text-red-500">*</span>
              </label>
              {errors.expectedDate && (
                <p className="text-sm text-red-600 mb-2">{errors.expectedDate}</p>
              )}
              <input
                type="date"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ghi chú
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="Nhập ghi chú nếu có..."
              />
            </div>
          </div>

          {/* E. Lý do tách hộ */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              E. Lý do tách hộ <span className="text-red-500">*</span>
            </label>
            {errors.reason && (
              <p className="text-sm text-red-600 mb-2">{errors.reason}</p>
            )}
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              placeholder="Nhập lý do tách hộ..."
            />
          </div>

          {/* Footer - Buttons */}
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


