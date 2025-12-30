import {
  jsx as _jsx,
  jsxs as _jsxs,
  Fragment as _Fragment,
} from "react/jsx-runtime";
import { useState, useEffect } from "react";
const requestTypeLabels = {
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
}) {
  const [formData, setFormData] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
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
          diaChi: "",
          tuNgay: "",
          denNgay: "",
          lyDo: "",
        });
      } else {
        setFormData({});
      }
      setError(null);
    }
  }, [isOpen, type]);
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    // Validate
    if (
      type === "TAM_VANG" ||
      type === "SUA_NHAN_KHAU" ||
      type === "XOA_NHAN_KHAU"
    ) {
      if (!formData.nhanKhauId) {
        setError("Vui lòng chọn nhân khẩu");
        return;
      }
    }
    if (type === "TAM_TRU") {
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
      if (!formData.diaChi || String(formData.diaChi).trim() === "") {
        setError("Vui lòng nhập địa chỉ tạm trú");
        return;
      }
    }

    if (type === "TAM_VANG" || type === "TAM_TRU") {
      if (!formData.tuNgay) {
        setError("Vui lòng chọn từ ngày");
        return;
      }
    }
    if (
      type === "TAM_VANG" ||
      type === "TAM_TRU" ||
      type === "SUA_NHAN_KHAU" ||
      type === "XOA_NHAN_KHAU"
    ) {
      if (!formData.lyDo || formData.lyDo.trim() === "") {
        setError("Vui lòng nhập lý do");
        return;
      }
    }

    if (type === "SUA_NHAN_KHAU") {
      const changedKeys = ["hoTen", "ngaySinh", "gioiTinh"];
      const hasChange = changedKeys.some((k) => {
        const v = formData?.[k];
        if (v === null || v === undefined) return false;
        return String(v).trim() !== "";
      });
      if (!hasChange) {
        setError("Vui lòng nhập ít nhất một thông tin cần sửa (trừ CCCD)");
        return;
      }
      if (formData?.gioiTinh) {
        const gt = String(formData.gioiTinh).toLowerCase();
        if (!["nam", "nu", "khac"].includes(gt)) {
          setError("Giới tính không hợp lệ");
          return;
        }
      }
      if (formData?.ngaySinh) {
        const d = new Date(formData.ngaySinh);
        if (Number.isNaN(d.getTime())) {
          setError("Ngày sinh không hợp lệ");
          return;
        }
      }
    }

    setIsSubmitting(true);
    try {
      const submitPayload = { ...formData };
      // Không cho phép sửa CCCD/Thông tin cấp CCCD
      delete submitPayload.cccd;
      delete submitPayload.ngayCapCCCD;
      delete submitPayload.noiCapCCCD;
      await onSubmit({
        type,
        payload: submitPayload,
      });
      // Reset form sau khi submit thành công
      setFormData({});
      onClose();
    } catch (err) {
      setError(err.error?.message || "Có lỗi xảy ra khi gửi yêu cầu");
    } finally {
      setIsSubmitting(false);
    }
  };
  if (!isOpen || !type) return null;
  return _jsx("div", {
    className:
      "fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4",
    onClick: onClose,
    children: _jsxs("div", {
      className:
        "w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-gray-200 bg-white p-6 shadow-xl",
      onClick: (e) => e.stopPropagation(),
      children: [
        _jsxs("div", {
          className:
            "mb-6 flex items-center justify-between border-b border-gray-200 pb-4",
          children: [
            _jsx("h2", {
              className: "text-2xl font-bold text-gray-900",
              children: requestTypeLabels[type],
            }),
            _jsx("button", {
              onClick: onClose,
              className:
                "rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors",
              children: "\u2715",
            }),
          ],
        }),
        error &&
          _jsx("div", {
            className:
              "mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700",
            children: error,
          }),
        _jsxs("form", {
          onSubmit: handleSubmit,
          className: "space-y-4",
          children: [
            type === "TAM_VANG" &&
              _jsxs(_Fragment, {
                children: [
                  _jsxs("div", {
                    children: [
                      _jsxs("label", {
                        className:
                          "block text-sm font-medium text-gray-700 mb-2",
                        children: [
                          "Ch\u1ECDn nh\u00E2n kh\u1EA9u ",
                          _jsx("span", {
                            className: "text-red-500",
                            children: "*",
                          }),
                        ],
                      }),
                      _jsxs("select", {
                        value: formData.nhanKhauId || "",
                        onChange: (e) =>
                          setFormData({
                            ...formData,
                            nhanKhauId: Number(e.target.value),
                          }),
                        className:
                          "w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20",
                        required: true,
                        children: [
                          _jsx("option", {
                            value: "",
                            children: "-- Ch\u1ECDn nh\u00E2n kh\u1EA9u --",
                          }),
                          nhanKhauList.map((nk) =>
                            _jsx(
                              "option",
                              { value: nk.id, children: nk.hoTen },
                              nk.id
                            )
                          ),
                        ],
                      }),
                    ],
                  }),
                  _jsxs("div", {
                    className: "grid grid-cols-2 gap-4",
                    children: [
                      _jsxs("div", {
                        children: [
                          _jsxs("label", {
                            className:
                              "block text-sm font-medium text-gray-700 mb-2",
                            children: [
                              "T\u1EEB ng\u00E0y ",
                              _jsx("span", {
                                className: "text-red-500",
                                children: "*",
                              }),
                            ],
                          }),
                          _jsx("input", {
                            type: "date",
                            value: formData.tuNgay || "",
                            onChange: (e) =>
                              setFormData({
                                ...formData,
                                tuNgay: e.target.value,
                              }),
                            className:
                              "w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20",
                            required: true,
                          }),
                        ],
                      }),
                      _jsxs("div", {
                        children: [
                          _jsx("label", {
                            className:
                              "block text-sm font-medium text-gray-700 mb-2",
                            children: "\u0110\u1EBFn ng\u00E0y",
                          }),
                          _jsx("input", {
                            type: "date",
                            value: formData.denNgay || "",
                            onChange: (e) =>
                              setFormData({
                                ...formData,
                                denNgay: e.target.value,
                              }),
                            className:
                              "w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20",
                          }),
                        ],
                      }),
                    ],
                  }),
                  _jsxs("div", {
                    children: [
                      _jsxs("label", {
                        className:
                          "block text-sm font-medium text-gray-700 mb-2",
                        children: [
                          "L\u00FD do ",
                          _jsx("span", {
                            className: "text-red-500",
                            children: "*",
                          }),
                        ],
                      }),
                      _jsx("textarea", {
                        value: formData.lyDo || "",
                        onChange: (e) =>
                          setFormData({ ...formData, lyDo: e.target.value }),
                        rows: 4,
                        className:
                          "w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20",
                        placeholder:
                          "Nh\u1EADp l\u00FD do t\u1EA1m v\u1EAFng...",
                        required: true,
                      }),
                    ],
                  }),
                ],
              }),
            type === "TAM_TRU" &&
              _jsxs(_Fragment, {
                children: [
                  _jsxs("div", {
                    className:
                      "rounded-lg border border-gray-200 bg-gray-50 p-4",
                    children: [
                      _jsx("div", {
                        className: "text-sm font-semibold text-gray-900 mb-3",
                        children: "Th\u00F4ng tin nh\u00E2n kh\u1EA9u",
                      }),
                      _jsxs("div", {
                        className: "grid grid-cols-2 gap-4",
                        children: [
                          _jsxs("div", {
                            children: [
                              _jsxs("label", {
                                className:
                                  "block text-sm font-medium text-gray-700 mb-2",
                                children: [
                                  "H\u1ECD v\u00E0 t\u00EAn ",
                                  _jsx("span", {
                                    className: "text-red-500",
                                    children: "*",
                                  }),
                                ],
                              }),
                              _jsx("input", {
                                type: "text",
                                value: formData.person?.hoTen || "",
                                onChange: (e) =>
                                  setFormData({
                                    ...formData,
                                    person: {
                                      ...(formData.person || {}),
                                      hoTen: e.target.value,
                                    },
                                  }),
                                className:
                                  "w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20",
                                placeholder:
                                  "Nh\u1EADp h\u1ECD v\u00E0 t\u00EAn...",
                                required: true,
                              }),
                            ],
                          }),
                          _jsxs("div", {
                            children: [
                              _jsx("label", {
                                className:
                                  "block text-sm font-medium text-gray-700 mb-2",
                                children: "CCCD/CMND",
                              }),
                              _jsx("input", {
                                type: "text",
                                value: formData.person?.cccd || "",
                                onChange: (e) =>
                                  setFormData({
                                    ...formData,
                                    person: {
                                      ...(formData.person || {}),
                                      cccd: e.target.value,
                                    },
                                  }),
                                className:
                                  "w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20",
                                placeholder:
                                  "Nh\u1EADp s\u1ED1 CCCD n\u1EBFu c\u00F3",
                              }),
                            ],
                          }),
                        ],
                      }),
                      _jsxs("div", {
                        className: "grid grid-cols-3 gap-4 mt-4",
                        children: [
                          _jsxs("div", {
                            children: [
                              _jsxs("label", {
                                className:
                                  "block text-sm font-medium text-gray-700 mb-2",
                                children: [
                                  "Ng\u00E0y sinh ",
                                  _jsx("span", {
                                    className: "text-red-500",
                                    children: "*",
                                  }),
                                ],
                              }),
                              _jsx("input", {
                                type: "date",
                                value: formData.person?.ngaySinh || "",
                                onChange: (e) =>
                                  setFormData({
                                    ...formData,
                                    person: {
                                      ...(formData.person || {}),
                                      ngaySinh: e.target.value,
                                    },
                                  }),
                                className:
                                  "w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20",
                                required: true,
                              }),
                            ],
                          }),
                          _jsxs("div", {
                            children: [
                              _jsxs("label", {
                                className:
                                  "block text-sm font-medium text-gray-700 mb-2",
                                children: [
                                  "Gi\u1EDBi t\u00EDnh ",
                                  _jsx("span", {
                                    className: "text-red-500",
                                    children: "*",
                                  }),
                                ],
                              }),
                              _jsxs("select", {
                                value: formData.person?.gioiTinh || "",
                                onChange: (e) =>
                                  setFormData({
                                    ...formData,
                                    person: {
                                      ...(formData.person || {}),
                                      gioiTinh: e.target.value,
                                    },
                                  }),
                                className:
                                  "w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20",
                                required: true,
                                children: [
                                  _jsx("option", {
                                    value: "",
                                    children: "Ch\u1ECDn gi\u1EDBi t\u00EDnh",
                                  }),
                                  _jsx("option", {
                                    value: "nam",
                                    children: "Nam",
                                  }),
                                  _jsx("option", {
                                    value: "nu",
                                    children: "N\u1EEF",
                                  }),
                                  _jsx("option", {
                                    value: "khac",
                                    children: "Kh\u00E1c",
                                  }),
                                ],
                              }),
                            ],
                          }),
                          _jsxs("div", {
                            children: [
                              _jsxs("label", {
                                className:
                                  "block text-sm font-medium text-gray-700 mb-2",
                                children: [
                                  "Quan h\u1EC7 ",
                                  _jsx("span", {
                                    className: "text-red-500",
                                    children: "*",
                                  }),
                                ],
                              }),
                              _jsxs("select", {
                                value: formData.person?.quanHe || "",
                                onChange: (e) =>
                                  setFormData({
                                    ...formData,
                                    person: {
                                      ...(formData.person || {}),
                                      quanHe: e.target.value,
                                    },
                                  }),
                                className:
                                  "w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20",
                                required: true,
                                children: [
                                  _jsx("option", {
                                    value: "",
                                    children: "Ch\u1ECDn quan h\u1EC7",
                                  }),
                                  _jsx("option", {
                                    value: "chu_ho",
                                    children: "Ch\u1EE7 h\u1ED9",
                                  }),
                                  _jsx("option", {
                                    value: "vo_chong",
                                    children: "V\u1EE3/Ch\u1ED3ng",
                                  }),
                                  _jsx("option", {
                                    value: "con",
                                    children: "Con",
                                  }),
                                  _jsx("option", {
                                    value: "cha_me",
                                    children: "Cha/M\u1EB9",
                                  }),
                                  _jsx("option", {
                                    value: "anh_chi_em",
                                    children: "Anh/Ch\u1ECB/Em",
                                  }),
                                  _jsx("option", {
                                    value: "ong_ba",
                                    children: "\u00D4ng/B\u00E0",
                                  }),
                                  _jsx("option", {
                                    value: "chau",
                                    children: "Ch\u00E1u",
                                  }),
                                  _jsx("option", {
                                    value: "khac",
                                    children: "Kh\u00E1c",
                                  }),
                                ],
                              }),
                            ],
                          }),
                        ],
                      }),
                      _jsxs("div", {
                        className: "mt-4",
                        children: [
                          _jsxs("label", {
                            className:
                              "block text-sm font-medium text-gray-700 mb-2",
                            children: [
                              "N\u01A1i sinh ",
                              _jsx("span", {
                                className: "text-red-500",
                                children: "*",
                              }),
                            ],
                          }),
                          _jsx("input", {
                            type: "text",
                            value: formData.person?.noiSinh || "",
                            onChange: (e) =>
                              setFormData({
                                ...formData,
                                person: {
                                  ...(formData.person || {}),
                                  noiSinh: e.target.value,
                                },
                              }),
                            className:
                              "w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20",
                            placeholder: "Nh\u1EADp n\u01A1i sinh...",
                            required: true,
                          }),
                        ],
                      }),
                      _jsxs("div", {
                        className: "grid grid-cols-2 gap-4 mt-4",
                        children: [
                          _jsxs("div", {
                            children: [
                              _jsx("label", {
                                className:
                                  "block text-sm font-medium text-gray-700 mb-2",
                                children: "Nguy\u00EAn qu\u00E1n",
                              }),
                              _jsx("input", {
                                type: "text",
                                value: formData.person?.nguyenQuan || "",
                                onChange: (e) =>
                                  setFormData({
                                    ...formData,
                                    person: {
                                      ...(formData.person || {}),
                                      nguyenQuan: e.target.value,
                                    },
                                  }),
                                className:
                                  "w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20",
                                placeholder: "Nh\u1EADp nguy\u00EAn qu\u00E1n",
                              }),
                            ],
                          }),
                          _jsxs("div", {
                            children: [
                              _jsx("label", {
                                className:
                                  "block text-sm font-medium text-gray-700 mb-2",
                                children: "D\u00E2n t\u1ED9c",
                              }),
                              _jsx("input", {
                                type: "text",
                                value: formData.person?.danToc || "",
                                onChange: (e) =>
                                  setFormData({
                                    ...formData,
                                    person: {
                                      ...(formData.person || {}),
                                      danToc: e.target.value,
                                    },
                                  }),
                                className:
                                  "w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20",
                                placeholder:
                                  "V\u00ED d\u1EE5: Kinh, T\u00E0y...",
                              }),
                            ],
                          }),
                        ],
                      }),
                      _jsxs("div", {
                        className: "grid grid-cols-2 gap-4 mt-4",
                        children: [
                          _jsxs("div", {
                            children: [
                              _jsx("label", {
                                className:
                                  "block text-sm font-medium text-gray-700 mb-2",
                                children: "T\u00F4n gi\u00E1o",
                              }),
                              _jsx("input", {
                                type: "text",
                                value: formData.person?.tonGiao || "",
                                onChange: (e) =>
                                  setFormData({
                                    ...formData,
                                    person: {
                                      ...(formData.person || {}),
                                      tonGiao: e.target.value,
                                    },
                                  }),
                                className:
                                  "w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20",
                                placeholder:
                                  "V\u00ED d\u1EE5: Kh\u00F4ng, Ph\u1EADt gi\u00E1o...",
                              }),
                            ],
                          }),
                          _jsxs("div", {
                            children: [
                              _jsx("label", {
                                className:
                                  "block text-sm font-medium text-gray-700 mb-2",
                                children: "Qu\u1ED1c t\u1ECBch",
                              }),
                              _jsx("input", {
                                type: "text",
                                value: formData.person?.quocTich || "",
                                onChange: (e) =>
                                  setFormData({
                                    ...formData,
                                    person: {
                                      ...(formData.person || {}),
                                      quocTich: e.target.value,
                                    },
                                  }),
                                className:
                                  "w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20",
                                placeholder: "V\u00ED d\u1EE5: Vi\u1EC7t Nam",
                              }),
                            ],
                          }),
                        ],
                      }),
                      _jsxs("div", {
                        className: "grid grid-cols-2 gap-4 mt-4",
                        children: [
                          _jsxs("div", {
                            children: [
                              _jsx("label", {
                                className:
                                  "block text-sm font-medium text-gray-700 mb-2",
                                children: "Ngh\u1EC1 nghi\u1EC7p",
                              }),
                              _jsx("input", {
                                type: "text",
                                value: formData.person?.ngheNghiep || "",
                                onChange: (e) =>
                                  setFormData({
                                    ...formData,
                                    person: {
                                      ...(formData.person || {}),
                                      ngheNghiep: e.target.value,
                                    },
                                  }),
                                className:
                                  "w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20",
                                placeholder: "Nh\u1EADp ngh\u1EC1 nghi\u1EC7p",
                              }),
                            ],
                          }),
                          _jsxs("div", {
                            children: [
                              _jsx("label", {
                                className:
                                  "block text-sm font-medium text-gray-700 mb-2",
                                children: "N\u01A1i l\u00E0m vi\u1EC7c",
                              }),
                              _jsx("input", {
                                type: "text",
                                value: formData.person?.noiLamViec || "",
                                onChange: (e) =>
                                  setFormData({
                                    ...formData,
                                    person: {
                                      ...(formData.person || {}),
                                      noiLamViec: e.target.value,
                                    },
                                  }),
                                className:
                                  "w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20",
                                placeholder:
                                  "Nh\u1EADp n\u01A1i l\u00E0m vi\u1EC7c",
                              }),
                            ],
                          }),
                        ],
                      }),
                      _jsxs("div", {
                        className: "grid grid-cols-2 gap-4 mt-4",
                        children: [
                          _jsxs("div", {
                            children: [
                              _jsx("label", {
                                className:
                                  "block text-sm font-medium text-gray-700 mb-2",
                                children:
                                  "Ng\u00E0y \u0111\u0103ng k\u00FD th\u01B0\u1EDDng tr\u00FA",
                              }),
                              _jsx("input", {
                                type: "date",
                                value:
                                  formData.person?.ngayDangKyThuongTru || "",
                                onChange: (e) =>
                                  setFormData({
                                    ...formData,
                                    person: {
                                      ...(formData.person || {}),
                                      ngayDangKyThuongTru: e.target.value,
                                    },
                                  }),
                                className:
                                  "w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20",
                              }),
                            ],
                          }),
                          _jsxs("div", {
                            children: [
                              _jsx("label", {
                                className:
                                  "block text-sm font-medium text-gray-700 mb-2",
                                children:
                                  "\u0110\u1ECBa ch\u1EC9 th\u01B0\u1EDDng tr\u00FA tr\u01B0\u1EDBc \u0111\u00E2y",
                              }),
                              _jsx("input", {
                                type: "text",
                                value:
                                  formData.person?.diaChiThuongTruTruoc || "",
                                onChange: (e) =>
                                  setFormData({
                                    ...formData,
                                    person: {
                                      ...(formData.person || {}),
                                      diaChiThuongTruTruoc: e.target.value,
                                    },
                                  }),
                                className:
                                  "w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20",
                                placeholder:
                                  "Nh\u1EADp \u0111\u1ECBa ch\u1EC9 tr\u01B0\u1EDBc \u0111\u00E2y",
                              }),
                            ],
                          }),
                        ],
                      }),
                      _jsxs("div", {
                        className: "mt-4",
                        children: [
                          _jsx("label", {
                            className:
                              "block text-sm font-medium text-gray-700 mb-2",
                            children: "Ghi ch\u00FA",
                          }),
                          _jsx("textarea", {
                            value: formData.person?.ghiChu || "",
                            onChange: (e) =>
                              setFormData({
                                ...formData,
                                person: {
                                  ...(formData.person || {}),
                                  ghiChu: e.target.value,
                                },
                              }),
                            rows: 3,
                            className:
                              "w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20",
                            placeholder:
                              "Th\u00F4ng tin b\u1ED5 sung n\u1EBFu c\u00F3...",
                          }),
                        ],
                      }),
                    ],
                  }),
                  _jsxs("div", {
                    children: [
                      _jsxs("label", {
                        className:
                          "block text-sm font-medium text-gray-700 mb-2",
                        children: [
                          "\u0110\u1ECBa ch\u1EC9 t\u1EA1m tr\u00FA ",
                          _jsx("span", {
                            className: "text-red-500",
                            children: "*",
                          }),
                        ],
                      }),
                      _jsx("input", {
                        type: "text",
                        value: formData.diaChi || "",
                        onChange: (e) =>
                          setFormData({ ...formData, diaChi: e.target.value }),
                        className:
                          "w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20",
                        placeholder:
                          "Nh\u1EADp \u0111\u1ECBa ch\u1EC9 t\u1EA1m tr\u00FA...",
                        required: true,
                      }),
                    ],
                  }),
                  _jsxs("div", {
                    className: "grid grid-cols-2 gap-4",
                    children: [
                      _jsxs("div", {
                        children: [
                          _jsxs("label", {
                            className:
                              "block text-sm font-medium text-gray-700 mb-2",
                            children: [
                              "T\u1EEB ng\u00E0y ",
                              _jsx("span", {
                                className: "text-red-500",
                                children: "*",
                              }),
                            ],
                          }),
                          _jsx("input", {
                            type: "date",
                            value: formData.tuNgay || "",
                            onChange: (e) =>
                              setFormData({
                                ...formData,
                                tuNgay: e.target.value,
                              }),
                            className:
                              "w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20",
                            required: true,
                          }),
                        ],
                      }),
                      _jsxs("div", {
                        children: [
                          _jsx("label", {
                            className:
                              "block text-sm font-medium text-gray-700 mb-2",
                            children: "\u0110\u1EBFn ng\u00E0y",
                          }),
                          _jsx("input", {
                            type: "date",
                            value: formData.denNgay || "",
                            onChange: (e) =>
                              setFormData({
                                ...formData,
                                denNgay: e.target.value,
                              }),
                            className:
                              "w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20",
                          }),
                        ],
                      }),
                    ],
                  }),
                  _jsxs("div", {
                    children: [
                      _jsxs("label", {
                        className:
                          "block text-sm font-medium text-gray-700 mb-2",
                        children: [
                          "Ghi ch\u00FA/L\u00FD do ",
                          _jsx("span", {
                            className: "text-red-500",
                            children: "*",
                          }),
                        ],
                      }),
                      _jsx("textarea", {
                        value: formData.lyDo || "",
                        onChange: (e) =>
                          setFormData({ ...formData, lyDo: e.target.value }),
                        rows: 4,
                        className:
                          "w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20",
                        placeholder:
                          "Nh\u1EADp l\u00FD do t\u1EA1m tr\u00FA...",
                        required: true,
                      }),
                    ],
                  }),
                ],
              }),
            type === "SUA_NHAN_KHAU" &&
              _jsxs(_Fragment, {
                children: [
                  _jsxs("div", {
                    children: [
                      _jsxs("label", {
                        className:
                          "block text-sm font-medium text-gray-700 mb-2",
                        children: [
                          "Ch\u1ECDn nh\u00E2n kh\u1EA9u c\u1EA7n s\u1EEDa ",
                          _jsx("span", {
                            className: "text-red-500",
                            children: "*",
                          }),
                        ],
                      }),
                      _jsxs("select", {
                        value: formData.nhanKhauId || "",
                        onChange: (e) =>
                          setFormData({
                            ...formData,
                            nhanKhauId: Number(e.target.value),
                          }),
                        className:
                          "w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20",
                        required: true,
                        children: [
                          _jsx("option", {
                            value: "",
                            children: "-- Ch\u1ECDn nh\u00E2n kh\u1EA9u --",
                          }),
                          nhanKhauList.map((nk) =>
                            _jsx(
                              "option",
                              { value: nk.id, children: nk.hoTen },
                              nk.id
                            )
                          ),
                        ],
                      }),
                    ],
                  }),
                  _jsxs("div", {
                    className: "grid grid-cols-2 gap-4",
                    children: [
                      _jsxs("div", {
                        children: [
                          _jsx("label", {
                            className:
                              "block text-sm font-medium text-gray-700 mb-2",
                            children: "H\u1ECD t\u00EAn m\u1EDBi",
                          }),
                          _jsx("input", {
                            type: "text",
                            value: formData.hoTen || "",
                            onChange: (e) =>
                              setFormData({
                                ...formData,
                                hoTen: e.target.value,
                              }),
                            className:
                              "w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20",
                            placeholder:
                              "Nh\u1EADp h\u1ECD t\u00EAn m\u1EDBi...",
                          }),
                        ],
                      }),
                    ],
                  }),
                  _jsxs("div", {
                    className: "grid grid-cols-2 gap-4",
                    children: [
                      _jsxs("div", {
                        children: [
                          _jsx("label", {
                            className:
                              "block text-sm font-medium text-gray-700 mb-2",
                            children: "Ng\u00E0y sinh m\u1EDBi",
                          }),
                          _jsx("input", {
                            type: "date",
                            value: formData.ngaySinh || "",
                            onChange: (e) =>
                              setFormData({
                                ...formData,
                                ngaySinh: e.target.value,
                              }),
                            className:
                              "w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20",
                          }),
                        ],
                      }),
                      _jsxs("div", {
                        children: [
                          _jsx("label", {
                            className:
                              "block text-sm font-medium text-gray-700 mb-2",
                            children: "Gi\u1EDBi t\u00EDnh m\u1EDBi",
                          }),
                          _jsxs("select", {
                            value: formData.gioiTinh || "",
                            onChange: (e) =>
                              setFormData({
                                ...formData,
                                gioiTinh: e.target.value,
                              }),
                            className:
                              "w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20",
                            children: [
                              _jsx("option", {
                                value: "",
                                children: "-- Ch\u1ECDn gi\u1EDBi t\u00EDnh --",
                              }),
                              _jsx("option", { value: "nam", children: "Nam" }),
                              _jsx("option", {
                                value: "nu",
                                children: "N\u1EEF",
                              }),
                              _jsx("option", {
                                value: "khac",
                                children: "Kh\u00E1c",
                              }),
                            ],
                          }),
                        ],
                      }),
                    ],
                  }),
                  _jsxs("div", {
                    children: [
                      _jsxs("label", {
                        className:
                          "block text-sm font-medium text-gray-700 mb-2",
                        children: [
                          "L\u00FD do s\u1EEDa ",
                          _jsx("span", {
                            className: "text-red-500",
                            children: "*",
                          }),
                        ],
                      }),
                      _jsx("textarea", {
                        value: formData.lyDo || "",
                        onChange: (e) =>
                          setFormData({ ...formData, lyDo: e.target.value }),
                        rows: 4,
                        className:
                          "w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20",
                        placeholder:
                          "Nh\u1EADp l\u00FD do s\u1EEDa th\u00F4ng tin...",
                        required: true,
                      }),
                    ],
                  }),
                ],
              }),
            type === "XOA_NHAN_KHAU" &&
              _jsxs(_Fragment, {
                children: [
                  _jsxs("div", {
                    children: [
                      _jsxs("label", {
                        className:
                          "block text-sm font-medium text-gray-700 mb-2",
                        children: [
                          "Ch\u1ECDn nh\u00E2n kh\u1EA9u c\u1EA7n xo\u00E1 ",
                          _jsx("span", {
                            className: "text-red-500",
                            children: "*",
                          }),
                        ],
                      }),
                      _jsxs("select", {
                        value: formData.nhanKhauId || "",
                        onChange: (e) =>
                          setFormData({
                            ...formData,
                            nhanKhauId: Number(e.target.value),
                          }),
                        className:
                          "w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20",
                        required: true,
                        children: [
                          _jsx("option", {
                            value: "",
                            children: "-- Ch\u1ECDn nh\u00E2n kh\u1EA9u --",
                          }),
                          nhanKhauList.map((nk) =>
                            _jsx(
                              "option",
                              { value: nk.id, children: nk.hoTen },
                              nk.id
                            )
                          ),
                        ],
                      }),
                    ],
                  }),
                  _jsxs("div", {
                    children: [
                      _jsxs("label", {
                        className:
                          "block text-sm font-medium text-gray-700 mb-2",
                        children: [
                          "L\u00FD do xo\u00E1 ",
                          _jsx("span", {
                            className: "text-red-500",
                            children: "*",
                          }),
                        ],
                      }),
                      _jsx("textarea", {
                        value: formData.lyDo || "",
                        onChange: (e) =>
                          setFormData({ ...formData, lyDo: e.target.value }),
                        rows: 4,
                        className:
                          "w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20",
                        placeholder:
                          "Nh\u1EADp l\u00FD do xo\u00E1 nh\u00E2n kh\u1EA9u...",
                        required: true,
                      }),
                    ],
                  }),
                ],
              }),
            _jsxs("div", {
              className: "flex gap-3 pt-4 border-t border-gray-200",
              children: [
                _jsx("button", {
                  type: "button",
                  onClick: onClose,
                  className:
                    "flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors",
                  disabled: isSubmitting,
                  children: "Hu\u1EF7",
                }),
                _jsx("button", {
                  type: "submit",
                  className:
                    "flex-1 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-2.5 text-sm font-medium text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed",
                  disabled: isSubmitting,
                  children: isSubmitting ? "Đang gửi..." : "Gửi yêu cầu",
                }),
              ],
            }),
          ],
        }),
      ],
    }),
  });
}
