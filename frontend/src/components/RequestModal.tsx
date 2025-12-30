import { FormEvent, useState, useEffect, useRef, KeyboardEvent } from "react";

export type RequestType =
  | "ADD_PERSON"
  | "ADD_NEWBORN"
  | "TAM_VANG"
  | "TAM_TRU"
  | "TACH_HO_KHAU"
  | "SUA_NHAN_KHAU"
  | "UPDATE_PERSON"
  | "XOA_NHAN_KHAU"
  | "MOVE_OUT"
  | "DECEASED";

// Focus the modal for keyboard accessibility

interface RequestModalProps {
  isOpen: boolean;
  type: RequestType | null;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  nhanKhauList?: Array<{
    id: number;
    hoTen: string;
    cccd?: string | null;
    ngayCapCCCD?: string | null;
    noiCapCCCD?: string | null;
  }>;
  householdInfo?: { soHoKhau: string; diaChi: string };
}

const requestTypeLabels: Record<RequestType, string> = {
  ADD_PERSON: "Thêm nhân khẩu",
  ADD_NEWBORN: "Thêm con sơ sinh",
  TAM_VANG: "Xin tạm vắng",
  TAM_TRU: "Xin tạm trú",
  TACH_HO_KHAU: "Yêu cầu tách hộ khẩu",
  SUA_NHAN_KHAU: "Sửa thông tin nhân khẩu",
  UPDATE_PERSON: "Sửa thông tin nhân khẩu",
  XOA_NHAN_KHAU: "Xoá nhân khẩu",
  MOVE_OUT: "Xác nhận chuyển đi",
  DECEASED: "Xác nhận qua đời",
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

  // Legacy UI type: treat SUA_NHAN_KHAU as UPDATE_PERSON (MOVE_OUT/DECEASED are separate operations now)
  const submitType: RequestType | null =
    type === "SUA_NHAN_KHAU" ? "UPDATE_PERSON" : type;

  const selectedNhanKhau =
    submitType === "UPDATE_PERSON" && formData?.nhanKhauId
      ? nhanKhauList.find((nk) => Number(nk.id) === Number(formData.nhanKhauId))
      : null;
  const selectedNhanKhauCccd = String(selectedNhanKhau?.cccd ?? "").trim();
  const canEditCccd =
    submitType === "UPDATE_PERSON" && !!selectedNhanKhau && selectedNhanKhauCccd === "";

  useEffect(() => {
    if (isOpen && type) {
      // Reset form khi mở modal
      if (type === "TAM_TRU") {
        setFormData({
          person: {
            hoTen: "",
            cccd: "",
            ngaySinh: "",
            gioiTinh: "",
            noiSinh: "",
            nguyenQuan: "",
            danToc: "",
            tonGiao: "",
            quocTich: "Việt Nam",
            quanHe: "",
            ngayDangKyThuongTru: "",
            diaChiThuongTruTruoc: "",
            ngheNghiep: "",
            noiLamViec: "",
            ghiChu: "",
          },
          // diaChi is kept for backward compatibility but now carries soHoKhau
          diaChi: householdInfo?.soHoKhau || "",
          tuNgay: "",
          denNgay: "",
          lyDo: "",
        });
      } else {
        setFormData({});
      }
      setError(null);
    }
  }, [isOpen, type, householdInfo?.soHoKhau]);

  // If householdInfo arrives after opening, backfill the fixed soHoKhau
  useEffect(() => {
    if (!isOpen || type !== "TAM_TRU") return;
    const soHoKhau = householdInfo?.soHoKhau;
    if (!soHoKhau) return;
    if (!formData?.diaChi || String(formData.diaChi).trim() === "") {
      setFormData((prev: any) => ({ ...prev, diaChi: soHoKhau }));
    }
  }, [isOpen, type, householdInfo?.soHoKhau, formData?.diaChi]);

  // Accessibility: focus modal container when opened
  const modalRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (isOpen) {
      // small timeout to ensure elements are rendered
      setTimeout(() => modalRef.current?.focus(), 0);
    }
  }, [isOpen]);

  // Keep key handling typed without requiring React namespace import
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      onClose();
    }
  };

  // When choosing a person for UPDATE_PERSON, prefill CCCD fields for display.
  // (Editable only when current CCCD is empty.)
  useEffect(() => {
    if (!isOpen) return;
    if (submitType !== "UPDATE_PERSON") return;
    const nhanKhauId = Number(formData?.nhanKhauId);
    if (!nhanKhauId) return;
    const nk = nhanKhauList.find((x) => Number(x.id) === nhanKhauId);
    if (!nk) return;
    setFormData((prev: any) => ({
      ...prev,
      cccd: nk.cccd ?? "",
      ngayCapCCCD: nk.ngayCapCCCD ?? "",
      noiCapCCCD: nk.noiCapCCCD ?? "",
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, submitType, formData?.nhanKhauId]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!submitType) return;

    // Validate
    if (
      submitType === "TAM_VANG" ||
      submitType === "UPDATE_PERSON" ||
      submitType === "XOA_NHAN_KHAU" ||
      submitType === "DECEASED" ||
      submitType === "MOVE_OUT"
    ) {
      if (!formData.nhanKhauId) {
        setError("Vui lòng chọn nhân khẩu");
        return;
      }
    }

    if (submitType === "TAM_TRU") {
      const person = formData.person || {};
      const requiredPersonFields = [
        "hoTen",
        "ngaySinh",
        "gioiTinh",
        "noiSinh",
        "quanHe",
      ];
      const missing = requiredPersonFields.filter(
        (f) => !person[f] || String(person[f]).trim() === ""
      );
      if (missing.length > 0) {
        setError(
          `Vui lòng điền đầy đủ các trường bắt buộc: ${missing.join(", ")}`
        );
        return;
      }
      // Fixed household code (soHoKhau) is required and comes from householdInfo
      if (!householdInfo?.soHoKhau || String(householdInfo.soHoKhau).trim() === "") {
        setError("Không lấy được số hộ khẩu của hộ hiện tại");
        return;
      }
    }

    if (submitType === "DECEASED") {
      if (!formData.ngayMat) {
        setError("Vui lòng nhập ngày mất");
        return;
      }
      if (!formData.lyDo || String(formData.lyDo).trim() === "") {
        setError("Vui lòng nhập lý do/ghi chú");
        return;
      }
    }

    if (submitType === "MOVE_OUT") {
      if (!formData.ngayChuyen) {
        setError("Vui lòng nhập ngày chuyển đi");
        return;
      }
      if (!formData.lyDo || String(formData.lyDo).trim() === "") {
        setError("Vui lòng nhập lý do/ghi chú");
        return;
      }
    }

    if (submitType === "TAM_VANG" || submitType === "TAM_TRU") {
      if (!formData.tuNgay) {
        setError("Vui lòng chọn từ ngày");
        return;
      }
    }

    if (
      submitType === "TAM_VANG" ||
      submitType === "TAM_TRU" ||
      submitType === "UPDATE_PERSON" ||
      submitType === "XOA_NHAN_KHAU" ||
      submitType === "MOVE_OUT"
    ) {
      if (!formData.lyDo || formData.lyDo.trim() === "") {
        setError("Vui lòng nhập lý do");
        return;
      }
    }

    if (submitType === "UPDATE_PERSON") {
      // Allow CCCD updates ONLY when this person currently has no CCCD (e.g., newborn)
      const changedKeys = [
        "hoTen",
        "biDanh",
        "ngaySinh",
        "gioiTinh",
        "noiSinh",
        "nguyenQuan",
        "danToc",
        "tonGiao",
        "quocTich",
        ...(canEditCccd ? ["cccd", "ngayCapCCCD", "noiCapCCCD"] : []),
        "quanHe",
        "ngayDangKyThuongTru",
        "diaChiThuongTruTruoc",
        "ngheNghiep",
        "noiLamViec",
        "ghiChu",
        "ghiChuHoKhau",
        "lyDoKhongCoCCCD",
      ];
      const hasChange = changedKeys.some((k) => {
        const v = formData?.[k];
        if (v === null || v === undefined) return false;
        return String(v).trim() !== "";
      });
      if (!hasChange) {
        setError("Vui lòng nhập ít nhất một thông tin cần sửa");
        return;
      }

      if (canEditCccd) {
        const cccd = String(formData?.cccd ?? "").trim();
        const hasAnyCccdField =
          cccd !== "" ||
          String(formData?.ngayCapCCCD ?? "").trim() !== "" ||
          String(formData?.noiCapCCCD ?? "").trim() !== "";
        if (hasAnyCccdField && cccd === "") {
          setError("Vui lòng nhập CCCD/CMND");
          return;
        }
      }
    }

    setIsSubmitting(true);
    try {
      const safePayload =
        submitType === "UPDATE_PERSON"
          ? (() => {
              if (canEditCccd) return formData;
              const { cccd, ngayCapCCCD, noiCapCCCD, ...rest } = formData || {};
              return rest;
            })()
          : formData;
      await onSubmit({
        type: submitType,
        payload: safePayload,
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
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-gray-200 bg-white p-6 shadow-xl outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-6 flex items-center justify-between border-b border-gray-200 pb-4">
          <h2
            id="request-modal-title"
            className="text-2xl font-bold text-gray-900"
          >
            {requestTypeLabels[submitType || type]}
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
            <span className="font-medium">Hộ khẩu:</span>{" "}
            {householdInfo.soHoKhau} — {householdInfo.diaChi}
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
                    setFormData({
                      ...formData,
                      nhanKhauId: Number(e.target.value),
                    })
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
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="text-sm font-semibold text-gray-900 mb-3">
                  Thông tin nhân khẩu
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Họ và tên <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.person?.hoTen || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          person: {
                            ...(formData.person || {}),
                            hoTen: e.target.value,
                          },
                        })
                      }
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      placeholder="Nhập họ và tên..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      CCCD/CMND
                    </label>
                    <input
                      type="text"
                      value={formData.person?.cccd || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          person: {
                            ...(formData.person || {}),
                            cccd: e.target.value,
                          },
                        })
                      }
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      placeholder="Nhập số CCCD nếu có"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ngày sinh <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.person?.ngaySinh || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          person: {
                            ...(formData.person || {}),
                            ngaySinh: e.target.value,
                          },
                        })
                      }
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Giới tính <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={formData.person?.gioiTinh || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          person: {
                            ...(formData.person || {}),
                            gioiTinh: e.target.value,
                          },
                        })
                      }
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="">Chọn giới tính</option>
                      <option value="nam">Nam</option>
                      <option value="nu">Nữ</option>
                      <option value="khac">Khác</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quan hệ <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={formData.person?.quanHe || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          person: {
                            ...(formData.person || {}),
                            quanHe: e.target.value,
                          },
                        })
                      }
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="">Chọn quan hệ</option>
                      <option value="chu_ho">Chủ hộ</option>
                      <option value="vo_chong">Vợ/Chồng</option>
                      <option value="con">Con</option>
                      <option value="cha_me">Cha/Mẹ</option>
                      <option value="anh_chi_em">Anh/Chị/Em</option>
                      <option value="ong_ba">Ông/Bà</option>
                      <option value="chau">Cháu</option>
                      <option value="khac">Khác</option>
                    </select>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nơi sinh <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.person?.noiSinh || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        person: {
                          ...(formData.person || {}),
                          noiSinh: e.target.value,
                        },
                      })
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="Nhập nơi sinh..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nguyên quán
                    </label>
                    <input
                      type="text"
                      value={formData.person?.nguyenQuan || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          person: {
                            ...(formData.person || {}),
                            nguyenQuan: e.target.value,
                          },
                        })
                      }
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      placeholder="Nhập nguyên quán"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Dân tộc
                    </label>
                    <input
                      type="text"
                      value={formData.person?.danToc || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          person: {
                            ...(formData.person || {}),
                            danToc: e.target.value,
                          },
                        })
                      }
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      placeholder="Ví dụ: Kinh, Tày..."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tôn giáo
                    </label>
                    <input
                      type="text"
                      value={formData.person?.tonGiao || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          person: {
                            ...(formData.person || {}),
                            tonGiao: e.target.value,
                          },
                        })
                      }
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      placeholder="Ví dụ: Không, Phật giáo..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quốc tịch
                    </label>
                    <input
                      type="text"
                      value={formData.person?.quocTich || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          person: {
                            ...(formData.person || {}),
                            quocTich: e.target.value,
                          },
                        })
                      }
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      placeholder="Ví dụ: Việt Nam"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nghề nghiệp
                    </label>
                    <input
                      type="text"
                      value={formData.person?.ngheNghiep || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          person: {
                            ...(formData.person || {}),
                            ngheNghiep: e.target.value,
                          },
                        })
                      }
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      placeholder="Nhập nghề nghiệp"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nơi làm việc
                    </label>
                    <input
                      type="text"
                      value={formData.person?.noiLamViec || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          person: {
                            ...(formData.person || {}),
                            noiLamViec: e.target.value,
                          },
                        })
                      }
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      placeholder="Nhập nơi làm việc"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ngày đăng ký thường trú
                    </label>
                    <input
                      type="date"
                      value={formData.person?.ngayDangKyThuongTru || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          person: {
                            ...(formData.person || {}),
                            ngayDangKyThuongTru: e.target.value,
                          },
                        })
                      }
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Địa chỉ thường trú trước đây
                    </label>
                    <input
                      type="text"
                      value={formData.person?.diaChiThuongTruTruoc || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          person: {
                            ...(formData.person || {}),
                            diaChiThuongTruTruoc: e.target.value,
                          },
                        })
                      }
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      placeholder="Nhập địa chỉ trước đây"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ghi chú
                  </label>
                  <textarea
                    value={formData.person?.ghiChu || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        person: {
                          ...(formData.person || {}),
                          ghiChu: e.target.value,
                        },
                      })
                    }
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="Thông tin bổ sung nếu có..."
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Số hộ khẩu <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={householdInfo?.soHoKhau || formData.diaChi || ""}
                  readOnly
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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

          {type === "DECEASED" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Chọn nhân khẩu cần xác nhận{" "}
                  <span className="text-red-500">*</span>
                </label>
                <select
                  autoFocus
                  value={formData.nhanKhauId || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      nhanKhauId: Number(e.target.value),
                    })
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
                    Ngày mất <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.ngayMat || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, ngayMat: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nơi mất
                  </label>
                  <input
                    type="text"
                    value={formData.noiMat || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, noiMat: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="Nhập địa điểm (nếu có)"
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
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Mô tả ngắn gọn lý do, hồ sơ kèm theo nếu có"
                  required
                />
              </div>
            </>
          )}

          {type === "MOVE_OUT" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Chọn nhân khẩu cần xác nhận chuyển đi{" "}
                  <span className="text-red-500">*</span>
                </label>
                <select
                  autoFocus
                  value={formData.nhanKhauId || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      nhanKhauId: Number(e.target.value),
                    })
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
                    Ngày chuyển đi <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.ngayChuyen || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, ngayChuyen: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nơi đến (nếu có)
                  </label>
                  <input
                    type="text"
                    value={formData.noiDen || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, noiDen: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="Nhập địa chỉ/địa điểm chuyển đến"
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
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Mô tả ngắn gọn lý do chuyển đi, giấy tờ kèm theo nếu có"
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
                    setFormData({
                      ...formData,
                      nhanKhauId: Number(e.target.value),
                    })
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

              {/* Full person fields (fill only the fields you want to update) */}
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
                    Bí danh
                  </label>
                  <input
                    type="text"
                    value={formData.biDanh || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, biDanh: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="Nhập bí danh (nếu có)"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CCCD/CMND
                  </label>
                  <input
                    type="text"
                    value={formData.cccd || ""}
                    disabled={!canEditCccd}
                    onChange={(e) =>
                      setFormData({ ...formData, cccd: e.target.value })
                    }
                    className={
                      canEditCccd
                        ? "w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        : "w-full cursor-not-allowed rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-500"
                    }
                    placeholder={
                      canEditCccd
                        ? "Nhập CCCD/CMND (chỉ áp dụng khi nhân khẩu chưa có CCCD)"
                        : "Không thể sửa CCCD/CMND"
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ngày cấp CCCD/CMND
                  </label>
                  <input
                    type="date"
                    value={formData.ngayCapCCCD || ""}
                    disabled={!canEditCccd}
                    onChange={(e) =>
                      setFormData({ ...formData, ngayCapCCCD: e.target.value })
                    }
                    className={
                      canEditCccd
                        ? "w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        : "w-full cursor-not-allowed rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-500"
                    }
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nơi cấp CCCD/CMND
                </label>
                <input
                  type="text"
                  value={formData.noiCapCCCD || ""}
                  disabled={!canEditCccd}
                  onChange={(e) =>
                    setFormData({ ...formData, noiCapCCCD: e.target.value })
                  }
                  className={
                    canEditCccd
                      ? "w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      : "w-full cursor-not-allowed rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-500"
                  }
                  placeholder={
                    canEditCccd
                      ? "Nhập nơi cấp CCCD/CMND"
                      : "Không thể sửa thông tin cấp CCCD/CMND"
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ngày sinh
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
                    Giới tính
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nơi sinh
                  </label>
                  <input
                    type="text"
                    value={formData.noiSinh || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, noiSinh: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="Nhập nơi sinh"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nguyên quán
                  </label>
                  <input
                    type="text"
                    value={formData.nguyenQuan || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, nguyenQuan: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="Nhập nguyên quán"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dân tộc
                  </label>
                  <input
                    type="text"
                    value={formData.danToc || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, danToc: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tôn giáo
                  </label>
                  <input
                    type="text"
                    value={formData.tonGiao || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, tonGiao: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quốc tịch
                  </label>
                  <input
                    type="text"
                    value={formData.quocTich || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, quocTich: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quan hệ trong hộ
                  </label>
                  <select
                    value={formData.quanHe || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, quanHe: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="">-- Chọn quan hệ --</option>
                    <option value="chu_ho">Chủ hộ</option>
                    <option value="vo_chong">Vợ/Chồng</option>
                    <option value="con">Con</option>
                    <option value="cha_me">Cha/Mẹ</option>
                    <option value="anh_chi_em">Anh/Chị/Em</option>
                    <option value="ong_ba">Ông/Bà</option>
                    <option value="chau">Cháu</option>
                    <option value="khac">Khác</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ngày đăng ký thường trú
                  </label>
                  <input
                    type="date"
                    value={formData.ngayDangKyThuongTru || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        ngayDangKyThuongTru: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Địa chỉ thường trú trước
                </label>
                <input
                  type="text"
                  value={formData.diaChiThuongTruTruoc || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      diaChiThuongTruTruoc: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nghề nghiệp
                  </label>
                  <input
                    type="text"
                    value={formData.ngheNghiep || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, ngheNghiep: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nơi làm việc
                  </label>
                  <input
                    type="text"
                    value={formData.noiLamViec || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, noiLamViec: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ghi chú
                  </label>
                  <textarea
                    value={formData.ghiChu || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, ghiChu: e.target.value })
                    }
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ghi chú hộ khẩu
                  </label>
                  <textarea
                    value={formData.ghiChuHoKhau || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, ghiChuHoKhau: e.target.value })
                    }
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lý do không có CCCD
                </label>
                <input
                  type="text"
                  value={formData.lyDoKhongCoCCCD || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, lyDoKhongCoCCCD: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lý do sửa{" "}
                  <span className="text-red-500">*</span>
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
                    setFormData({
                      ...formData,
                      nhanKhauId: Number(e.target.value),
                    })
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
