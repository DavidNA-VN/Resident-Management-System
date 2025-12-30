import React, { useEffect, useState } from "react";

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
            if (type === "TAM_TRU") {
                setFormData({ lyDo: "Tạm trú", ghiChu: "Tạm trú" });
            } else {
                setFormData({});
            }
            setError(null);
        }
    }, [isOpen, type]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (type === "DECEASED") {
            if (!formData.ngayMat) {
                setError("Vui lòng nhập ngày mất");
                return;
            }
            if (!formData.lyDo || String(formData.lyDo).trim() === "") {
                setError("Vui lòng nhập lý do/ghi chú");
                return;
            }
        }

        if (type === "TAM_VANG") {
            if (!formData.nhanKhauId) {
                setError("Vui lòng chọn nhân khẩu");
                return;
            }
            if (!formData.tuNgay) {
                setError("Vui lòng chọn từ ngày");
                return;
            }
            if (!formData.lyDo || formData.lyDo.trim() === "") {
                setError("Vui lòng nhập lý do");
                return;
            }
        }

        if (type === "TAM_TRU") {
            const requiredFields = [
                "hoTen",
                "ngaySinh",
                "gioiTinh",
                "noiSinh",
                "quanHe",
                "tuNgay",
                "diaChi",
            ];
            const missing = requiredFields.filter((f) => !formData[f]);
            if (missing.length > 0) {
                setError(`Vui lòng nhập: ${missing.join(", ")}`);
                return;
            }
            if (!formData.lyDo || formData.lyDo.trim() === "") {
                setError("Vui lòng nhập ghi chú/Lý do tạm trú");
                return;
            }
        }

        setIsSubmitting(true);
        try {
            let payloadToSend = formData;
            if (type === "TAM_TRU") {
                payloadToSend = {
                    person: {
                        hoTen: formData.hoTen,
                        cccd: formData.cccd || undefined,
                        ngaySinh: formData.ngaySinh,
                        gioiTinh: formData.gioiTinh,
                        noiSinh: formData.noiSinh,
                        quanHe: formData.quanHe,
                        ngheNghiep: formData.ngheNghiep || undefined,
                        ghiChu: formData.ghiChu || formData.lyDo || "Tạm trú",
                    },
                    tuNgay: formData.tuNgay,
                    denNgay: formData.denNgay,
                    diaChi: formData.diaChi,
                    lyDo: formData.lyDo || "Tạm trú",
                    ghiChu: formData.ghiChu || "Tạm trú",
                };
            }

            await onSubmit({ type, payload: payloadToSend });
            setFormData({});
            onClose();
        } catch (err) {
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
        >
            <div
                className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="mb-6 flex items-center justify-between border-b border-gray-200 pb-4">
                    <h2 className="text-2xl font-bold text-gray-900">
                        {requestTypeLabels[type]}
                    </h2>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                    >
                        ×
                    </button>
                </div>

                {error && (
                    <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {type === "TAM_VANG" && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Chọn nhân khẩu <span className="text-red-500">*</span>
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
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Từ ngày <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.tuNgay || ""}
                                        onChange={(e) => setFormData({ ...formData, tuNgay: e.target.value })}
                                        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Đến ngày</label>
                                    <input
                                        type="date"
                                        value={formData.denNgay || ""}
                                        onChange={(e) => setFormData({ ...formData, denNgay: e.target.value })}
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
                                    onChange={(e) => setFormData({ ...formData, lyDo: e.target.value })}
                                    rows={4}
                                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                    placeholder="Nhập lý do tạm vắng..."
                                    required
                                />
                            </div>
                        </>
                    )}

                    {type === "TAM_TRU" && (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Họ tên <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        autoFocus
                                        type="text"
                                        value={formData.hoTen || ""}
                                        onChange={(e) => setFormData({ ...formData, hoTen: e.target.value })}
                                        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Quan hệ với chủ hộ <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={formData.quanHe || ""}
                                        onChange={(e) => setFormData({ ...formData, quanHe: e.target.value })}
                                        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                    >
                                        <option value="">-- Chọn quan hệ --</option>
                                        <option value="chu_ho">Chủ hộ</option>
                                        <option value="vo_chong">Vợ/chồng</option>
                                        <option value="con">Con</option>
                                        <option value="cha_me">Cha/mẹ</option>
                                        <option value="anh_chi_em">Anh/chị/em</option>
                                        <option value="ong_ba">Ông/bà</option>
                                        <option value="chau">Cháu</option>
                                        <option value="khac">Khác</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Ngày sinh <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.ngaySinh || ""}
                                        onChange={(e) => setFormData({ ...formData, ngaySinh: e.target.value })}
                                        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Giới tính <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={formData.gioiTinh || ""}
                                        onChange={(e) => setFormData({ ...formData, gioiTinh: e.target.value })}
                                        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                    >
                                        <option value="">-- Chọn giới tính --</option>
                                        <option value="nam">Nam</option>
                                        <option value="nu">Nữ</option>
                                        <option value="khac">Khác</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Nơi sinh <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.noiSinh || ""}
                                        onChange={(e) => setFormData({ ...formData, noiSinh: e.target.value })}
                                        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">CCCD/CMND</label>
                                    <input
                                        type="text"
                                        value={formData.cccd || ""}
                                        onChange={(e) => setFormData({ ...formData, cccd: e.target.value })}
                                        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                        placeholder="Nhập CCCD (nếu có)"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Nghề nghiệp</label>
                                    <input
                                        type="text"
                                        value={formData.ngheNghiep || ""}
                                        onChange={(e) => setFormData({ ...formData, ngheNghiep: e.target.value })}
                                        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                        placeholder="Nhập nghề nghiệp (nếu có)"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Địa chỉ tạm trú <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.diaChi || ""}
                                    onChange={(e) => setFormData({ ...formData, diaChi: e.target.value })}
                                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                    placeholder="Nhập địa chỉ tạm trú..."
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Từ ngày <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.tuNgay || ""}
                                        onChange={(e) => setFormData({ ...formData, tuNgay: e.target.value })}
                                        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Đến ngày
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.denNgay || ""}
                                        onChange={(e) => setFormData({ ...formData, denNgay: e.target.value })}
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
                                    onChange={(e) => setFormData({ ...formData, lyDo: e.target.value })}
                                    rows={4}
                                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                    placeholder="Nhập lý do/ghi chú tạm trú..."
                                />
                            </div>
                        </>
                    )}

                    {type === "SUA_NHAN_KHAU" && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Chọn nhân khẩu cần sửa <span className="text-red-500">*</span>
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
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Họ tên mới</label>
                                    <input
                                        type="text"
                                        value={formData.hoTen || ""}
                                        onChange={(e) => setFormData({ ...formData, hoTen: e.target.value })}
                                        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                        placeholder="Nhập họ tên mới..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">CCCD/CMND mới</label>
                                    <input
                                        type="text"
                                        value={formData.cccd || ""}
                                        onChange={(e) => setFormData({ ...formData, cccd: e.target.value })}
                                        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                        placeholder="Nhập CCCD/CMND mới..."
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Ngày sinh mới</label>
                                    <input
                                        type="date"
                                        value={formData.ngaySinh || ""}
                                        onChange={(e) => setFormData({ ...formData, ngaySinh: e.target.value })}
                                        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Giới tính mới</label>
                                    <select
                                        value={formData.gioiTinh || ""}
                                        onChange={(e) => setFormData({ ...formData, gioiTinh: e.target.value })}
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
                                    onChange={(e) => setFormData({ ...formData, lyDo: e.target.value })}
                                    rows={4}
                                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                    placeholder="Nhập lý do sửa thông tin..."
                                    required
                                />
                            </div>
                        </>
                    )}

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
                                    onChange={(e) => setFormData({ ...formData, lyDo: e.target.value })}
                                    rows={4}
                                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                    placeholder="Nhập lý do xoá nhân khẩu..."
                                    required
                                />
                            </div>
                        </>
                    )}

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
