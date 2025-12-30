import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiService } from "../services/api";
import { formatDateForInput, formatFromYMD } from "../utils/date";

interface HoKhau {
  id: number;
  soHoKhau: string;
  diaChi: string;
  tinhThanh?: string;
  quanHuyen?: string;
  phuongXa?: string;
  duongPho?: string;
  soNha?: string;
  ngayCap?: string;
  ghiChu?: string;
  diaChiDayDu?: string;
  trangThai: string;
  chuHoId?: number;
  createdAt: string;
}

interface NhanKhau {
  id: number;
  hoTen: string;
  cccd?: string;
  quanHe: string;
  gioiTinh?: string;
  ngaySinh?: string;
  hoKhauId?: number;
  ghiChu?: string;
}

type NhanKhauFull = NhanKhau & {
  biDanh?: string;
  ngayCapCCCD?: string;
  noiCapCCCD?: string;
  noiSinh?: string;
  nguyenQuan?: string;
  danToc?: string;
  tonGiao?: string;
  quocTich?: string;
  ngayDangKyThuongTru?: string;
  diaChiThuongTruTruoc?: string;
  ngheNghiep?: string;
  noiLamViec?: string;
};

const quanHeLabel: Record<string, string> = {
  chu_ho: "Chủ hộ",
  vo_chong: "Vợ/Chồng",
  con: "Con",
  cha_me: "Cha/Mẹ",
  anh_chi_em: "Anh/Chị/Em",
  ong_ba: "Ông/Bà",
  chau: "Cháu",
  khac: "Khác",
};

export default function HoKhau() {
  const navigate = useNavigate();
  const [hoKhauList, setHoKhauList] = useState<HoKhau[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [viewingHoKhau, setViewingHoKhau] = useState<HoKhau | null>(null);
  const [editingHoKhau, setEditingHoKhau] = useState<HoKhau | null>(null);
  const [viewNhanKhau, setViewNhanKhau] = useState<NhanKhau[]>([]);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError] = useState<string | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Nhãn tiếng Việt cho các trường lịch sử hộ khẩu
  const historyFieldLabels = useMemo(
    () => ({
      soHoKhau: "Sổ hộ khẩu",
      diaChi: "Địa chỉ",
      diaChiDayDu: "Địa chỉ đầy đủ",
      tinhThanh: "Tỉnh/Thành",
      quanHuyen: "Quận/Huyện",
      phuongXa: "Phường/Xã",
      duongPho: "Đường/Phố",
      soNha: "Số nhà",
      ngayCap: "Ngày cấp",
      trangThai: "Trạng thái",
      chuHoId: "Chủ hộ",
      ghiChu: "Ghi chú",
    }),
    []
  );

  const emptyMemberFull: NhanKhauFull = {
    id: 0,
    hoTen: "",
    hoKhauId: undefined,
    quanHe: "",
    biDanh: "",
    cccd: "",
    ngayCapCCCD: "",
    noiCapCCCD: "",
    ngaySinh: "",
    gioiTinh: "",
    noiSinh: "",
    nguyenQuan: "",
    danToc: "",
    tonGiao: "",
    quocTich: "Việt Nam",
    ngayDangKyThuongTru: "",
    diaChiThuongTruTruoc: "",
    ngheNghiep: "",
    noiLamViec: "",
  };

  const [memberViewForm, setMemberViewForm] = useState<NhanKhauFull>({
    ...emptyMemberFull,
  });
  const [viewingNhanKhauDetail, setViewingNhanKhauDetail] =
    useState<NhanKhauFull | null>(null);
  const [showMemberViewModal, setShowMemberViewModal] = useState(false);
  const [memberViewLoading, setMemberViewLoading] = useState(false);
  const [memberViewError, setMemberViewError] = useState<string | null>(null);
  // Read-only mode for the member view modal. When true, fields are disabled and no save button is shown.
  const [memberViewReadOnly, setMemberViewReadOnly] = useState(true);

  // Current user (from localStorage) to decide if edit action should be shown
  const currentUser = localStorage.getItem("userInfo")
    ? (JSON.parse(localStorage.getItem("userInfo") || "null") as any)
    : null;
  const canEditMember = currentUser?.role !== "nguoi_dan";
  const canSearchHoKhauBySo = currentUser?.role === "to_truong";

  const [searchSoHoKhau, setSearchSoHoKhau] = useState("");

  const [formData, setFormData] = useState({
    diaChi: "",
    diaChiDayDu: "",
    tinhThanh: "",
    quanHuyen: "",
    phuongXa: "",
    duongPho: "",
    soNha: "",
    ngayCap: "",
    ghiChu: "",
  });

  const [editFormData, setEditFormData] = useState({
    soHoKhau: "",
    diaChi: "",
    diaChiDayDu: "",
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

  const loadHoKhauList = async (opts?: { soHoKhau?: string }) => {
    setIsLoading(true);
    try {
      const soHoKhau = String(opts?.soHoKhau || "").trim();
      const response = await apiService.getHoKhauList(undefined, soHoKhau || undefined);
      if (response.success) {
        setHoKhauList(response.data);
      }
    } catch (err: any) {
      setError(err.error?.message || "Lỗi khi tải danh sách hộ khẩu");
    } finally {
      setIsLoading(false);
    }
  };

  const loadMembers = async (hoKhauId: number) => {
    const membersRes = await apiService.getNhanKhauList(hoKhauId);
    if (membersRes.success) {
      const members = [...membersRes.data];
      members.sort((a, b) => {
        if (a.quanHe === "chu_ho" && b.quanHe !== "chu_ho") return -1;
        if (a.quanHe !== "chu_ho" && b.quanHe === "chu_ho") return 1;
        return a.hoTen.localeCompare(b.hoTen, "vi");
      });
      setViewNhanKhau(members);
    }
  };

  const openViewHousehold = async (hoKhau: HoKhau) => {
    setViewingHoKhau(hoKhau);
    setShowViewModal(true);
    setViewLoading(true);
    setViewError(null);

    try {
      const detailRes = await apiService.getHoKhauById(hoKhau.id);
      if (detailRes.success) {
        setViewingHoKhau(detailRes.data);
      }
      await loadMembers(hoKhau.id);
    } catch (err: any) {
      setViewError(err.error?.message || "Lỗi khi tải thông tin hộ khẩu");
    } finally {
      setViewLoading(false);
    }
  };

  const openHistoryModal = async (hoKhauId: number) => {
    setShowHistoryModal(true);
    setHistoryLoading(true);
    try {
      const resp = await apiService.getHoKhauHistory(hoKhauId);
      if (resp.success) {
        setHistoryList(resp.data);
      } else {
        setHistoryList([]);
      }
    } catch (err: any) {
      setHistoryList([]);
      setViewError(err.error?.message || "Lỗi khi tải lịch sử");
    } finally {
      setHistoryLoading(false);
    }
  };

  const formatHistoryValue = (field: string, raw: any) => {
    const value = raw === null || raw === undefined ? "" : String(raw).trim();
    if (value === "") return "(trống)";

    const f = String(field || "");
    if (f === "ngayCap") {
      // Expect YYYY-MM-DD; keep safe fallback
      const parts = value.split("-");
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
      const d = new Date(value);
      if (!Number.isNaN(d.getTime())) return d.toLocaleDateString("vi-VN");
      return value;
    }

    if (f === "trangThai") {
      const normalized = value.toLowerCase();
      if (normalized === "active" || normalized === "da_kich_hoat") return "Đã kích hoạt";
      if (normalized === "inactive" || normalized === "chua_kich_hoat") return "Chưa kích hoạt";
      return value;
    }

    if (f === "chuHoId") {
      const id = Number(value);
      if (!Number.isNaN(id)) {
        const member = viewNhanKhau.find((m) => Number(m.id) === id);
        if (member) return `${member.hoTen} (ID: ${id})`;
        return `ID: ${id}`;
      }
      return value;
    }

    return value;
  };

  const closeViewHousehold = () => {
    setShowViewModal(false);
    setViewingHoKhau(null);
    setViewNhanKhau([]);
    setViewError(null);
    setShowMemberViewModal(false);
    setViewingNhanKhauDetail(null);
    setMemberViewError(null);
  };

  // History modal render
  const HistoryModal = () => {
    if (!showHistoryModal) return null;
    return (
      <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">
              Lịch sử thay đổi – Hộ khẩu
            </h3>
            <button
              onClick={() => setShowHistoryModal(false)}
              className="text-gray-500"
            >
              Đóng
            </button>
          </div>
          {historyLoading ? (
            <div className="text-center text-gray-500">Đang tải lịch sử...</div>
          ) : historyList.length === 0 ? (
            <div className="text-center text-gray-500">
              Không có lịch sử nào.
            </div>
          ) : (
            <div className="overflow-y-auto max-h-80">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">Thời gian</th>
                    <th className="px-3 py-2 text-left">Hành động</th>
                    <th className="px-3 py-2 text-left">Nội dung thay đổi</th>
                    <th className="px-3 py-2 text-left">Nội dung cũ → mới</th>
                    <th className="px-3 py-2 text-left">Người thực hiện</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {historyList.map((h) => (
                    <tr key={h.id}>
                      <td className="px-3 py-2">
                        {new Date(h.createdAt).toLocaleString("vi-VN")}
                      </td>
                      <td className="px-3 py-2">{h.hanhDong}</td>
                      <td className="px-3 py-2">
                        {(historyFieldLabels as Record<string, string>)[
                          String(h.truong)
                        ] || h.truong}
                      </td>
                      <td className="px-3 py-2">
                        <div className="text-xs text-gray-600">
                          <span className="text-gray-500">
                            {formatHistoryValue(h.truong, h.noiDungCu)}
                          </span>
                          <span className="mx-2 text-gray-400">→</span>
                          <span className="text-gray-900">
                            {formatHistoryValue(h.truong, h.noiDungMoi)}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        {h.nguoiThucHienName || "-"}
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
  };

  const navigateToNhanKhauPage = (hoKhauId: number) => {
    // Navigate to nhan-khau page with householdId as query parameter
    navigate(`/nhan-khau?householdId=${hoKhauId}`);
  };

  const openViewNhanKhau = async (id: number) => {
    // Always set to read-only when viewing from Ho Khau page
    setMemberViewReadOnly(true);
    setMemberViewError(null);
    setMemberViewLoading(true);
    setShowMemberViewModal(true);
    try {
      const res = await apiService.getNhanKhauById(id);
      if (res.success) {
        const nk = res.data as NhanKhauFull;
        setViewingNhanKhauDetail(nk);
        setMemberViewForm({
          ...emptyMemberFull,
          ...nk,
          hoKhauId: nk.hoKhauId,
          ngayCapCCCD: formatDateForInput(nk.ngayCapCCCD),
          ngayDangKyThuongTru: formatDateForInput(nk.ngayDangKyThuongTru),
          ngaySinh: formatDateForInput(nk.ngaySinh),
        });
      } else {
        setMemberViewError("Không lấy được thông tin nhân khẩu");
      }
    } catch (err: any) {
      setMemberViewError(
        err.error?.message || "Lỗi khi tải thông tin nhân khẩu"
      );
    } finally {
      setMemberViewLoading(false);
    }
  };

  const openEditHousehold = async (hoKhau: HoKhau) => {
    setEditingHoKhau(hoKhau);
    setShowEditModal(true);
    setError(null);

    try {
      const response = await apiService.getHoKhauById(hoKhau.id);
      if (response.success) {
        const data = response.data;
        setEditFormData({
          soHoKhau: data.soHoKhau || "",
          diaChi: data.diaChi || "",
          diaChiDayDu: data.diaChiDayDu || "",
          tinhThanh: data.tinhThanh || "",
          quanHuyen: data.quanHuyen || "",
          phuongXa: data.phuongXa || "",
          duongPho: data.duongPho || "",
          soNha: data.soNha || "",
          ngayCap: formatDateForInput(data.ngayCap),
          ghiChu: data.ghiChu || "",
        });
      }
    } catch (err: any) {
      setError(err.error?.message || "Lỗi khi tải thông tin hộ khẩu");
    }
  };

  const handleUpdate = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingHoKhau) return;

    if (!editFormData.diaChi) {
      setError("Vui lòng điền địa chỉ");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        diaChi: editFormData.diaChi,
        diaChiDayDu: editFormData.diaChiDayDu || undefined,
        tinhThanh: editFormData.tinhThanh || undefined,
        quanHuyen: editFormData.quanHuyen || undefined,
        phuongXa: editFormData.phuongXa || undefined,
        duongPho: editFormData.duongPho || undefined,
        soNha: editFormData.soNha || undefined,
        ngayCap: editFormData.ngayCap || undefined,
        ghiChu: editFormData.ghiChu || undefined,
      };

      const response = await apiService.updateHoKhau(editingHoKhau.id, payload);

      if (response.success) {
        // Lấy lại bản ghi mới nhất từ server để chắc chắn đồng bộ DB
        const refreshed = await apiService.getHoKhauById(editingHoKhau.id);
        const updated = refreshed.success ? refreshed.data : response.data;

        setHoKhauList((prev) =>
          prev.map((item) =>
            item.id === updated.id ? { ...item, ...updated } : item
          )
        );

        setSuccess("Cập nhật hộ khẩu thành công!");
        setShowEditModal(false);
        setEditingHoKhau(null);

        // Tải lại danh sách để đồng bộ với server
        await loadHoKhauList();
      } else {
        // Hiển thị error message từ server nếu có
        const errorMessage =
          response.error?.message || "Không thể cập nhật hộ khẩu";
        setError(errorMessage);
      }
    } catch (err: any) {
      setError(err.error?.message || "Lỗi khi cập nhật hộ khẩu");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!formData.diaChi) {
      setError("Vui lòng điền địa chỉ");
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiService.createHoKhau({
        diaChi: formData.diaChi,
        diaChiDayDu: formData.diaChiDayDu || undefined,
        tinhThanh: formData.tinhThanh || undefined,
        quanHuyen: formData.quanHuyen || undefined,
        phuongXa: formData.phuongXa || undefined,
        duongPho: formData.duongPho || undefined,
        soNha: formData.soNha || undefined,
        ngayCap: formData.ngayCap || undefined,
        ghiChu: formData.ghiChu || undefined,
      });

      if (response.success) {
        const generatedCode = response.data?.soHoKhau;
        setSuccess(`Tạo hộ khẩu thành công! Mã số: ${generatedCode}`);
        setShowCreateForm(false);
        setFormData({
          diaChi: "",
          diaChiDayDu: "",
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

      {/* Member full view/edit modal */}
      {showMemberViewModal && viewingNhanKhauDetail && (
        <div className="fixed inset-0 z-[130] flex min-h-screen w-screen items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-xl border border-gray-200 bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto overflow-hidden modal-scroll">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Xem nhân khẩu
                </h3>
                <p className="text-sm text-gray-500">
                  Hộ khẩu: {viewingNhanKhauDetail.hoKhauId}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowMemberViewModal(false);
                  setViewingNhanKhauDetail(null);
                  setMemberViewError(null);
                }}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {memberViewError && (
              <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {memberViewError}
              </div>
            )}

            {memberViewLoading ? (
              <div className="p-6 text-center text-gray-500">Đang tải...</div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <label className="block text-sm font-medium text-gray-700">
                    Họ và tên
                    <input
                      type="text"
                      value={memberViewForm.hoTen}
                      onChange={(e) =>
                        setMemberViewForm({
                          ...memberViewForm,
                          hoTen: e.target.value,
                        })
                      }
                      disabled={memberViewReadOnly}
                      className={`mt-1 w-full rounded-lg border border-gray-300 ${
                        memberViewReadOnly ? "bg-gray-50" : "bg-white"
                      } px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                      required
                    />
                  </label>
                  <label className="block text-sm font-medium text-gray-700">
                    CCCD/CMND
                    <input
                      type="text"
                      value={memberViewForm.cccd}
                      onChange={(e) =>
                        setMemberViewForm({
                          ...memberViewForm,
                          cccd: e.target.value,
                        })
                      }
                      disabled={memberViewReadOnly}
                      className={`mt-1 w-full rounded-lg border border-gray-300 ${
                        memberViewReadOnly ? "bg-gray-50" : "bg-white"
                      } px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                    />
                  </label>
                  <label className="block text-sm font-medium text-gray-700">
                    Bí danh
                    <input
                      type="text"
                      value={memberViewForm.biDanh}
                      onChange={(e) =>
                        setMemberViewForm({
                          ...memberViewForm,
                          biDanh: e.target.value,
                        })
                      }
                      disabled={memberViewReadOnly}
                      className={`mt-1 w-full rounded-lg border border-gray-300 ${
                        memberViewReadOnly ? "bg-gray-50" : "bg-white"
                      } px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                    />
                  </label>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <label className="block text-sm font-medium text-gray-700">
                    Ngày cấp CCCD
                    <input
                      type="date"
                      value={memberViewForm.ngayCapCCCD || ""}
                      onChange={(e) =>
                        setMemberViewForm({
                          ...memberViewForm,
                          ngayCapCCCD: e.target.value,
                        })
                      }
                      disabled={memberViewReadOnly}
                      className={`mt-1 w-full rounded-lg border border-gray-300 ${
                        memberViewReadOnly ? "bg-gray-50" : "bg-white"
                      } px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                    />
                  </label>
                  <label className="block text-sm font-medium text-gray-700">
                    Nơi cấp CCCD
                    <input
                      type="text"
                      value={memberViewForm.noiCapCCCD || ""}
                      onChange={(e) =>
                        setMemberViewForm({
                          ...memberViewForm,
                          noiCapCCCD: e.target.value,
                        })
                      }
                      disabled={memberViewReadOnly}
                      className={`mt-1 w-full rounded-lg border border-gray-300 ${
                        memberViewReadOnly ? "bg-gray-50" : "bg-white"
                      } px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                    />
                  </label>
                  <label className="block text-sm font-medium text-gray-700">
                    Ngày đăng ký thường trú
                    <input
                      type="date"
                      value={memberViewForm.ngayDangKyThuongTru || ""}
                      onChange={(e) =>
                        setMemberViewForm({
                          ...memberViewForm,
                          ngayDangKyThuongTru: e.target.value,
                        })
                      }
                      disabled={memberViewReadOnly}
                      className={`mt-1 w-full rounded-lg border border-gray-300 ${
                        memberViewReadOnly ? "bg-gray-50" : "bg-white"
                      } px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                    />
                  </label>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <label className="block text-sm font-medium text-gray-700">
                    Ngày sinh
                    <input
                      type="date"
                      value={memberViewForm.ngaySinh || ""}
                      onChange={(e) =>
                        setMemberViewForm({
                          ...memberViewForm,
                          ngaySinh: e.target.value,
                        })
                      }
                      disabled={memberViewReadOnly}
                      className={`mt-1 w-full rounded-lg border border-gray-300 ${
                        memberViewReadOnly ? "bg-gray-50" : "bg-white"
                      } px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                    />
                  </label>
                  <label className="block text-sm font-medium text-gray-700">
                    Giới tính
                    <select
                      value={memberViewForm.gioiTinh || ""}
                      onChange={(e) =>
                        setMemberViewForm({
                          ...memberViewForm,
                          gioiTinh: e.target.value,
                        })
                      }
                      disabled={memberViewReadOnly}
                      className={`mt-1 w-full rounded-lg border border-gray-300 ${
                        memberViewReadOnly ? "bg-gray-50" : "bg-white"
                      } px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                    >
                      <option value="">Chọn giới tính</option>
                      <option value="nam">Nam</option>
                      <option value="nu">Nữ</option>
                      <option value="khac">Khác</option>
                    </select>
                  </label>
                  <label className="block text-sm font-medium text-gray-700">
                    Nơi sinh
                    <input
                      type="text"
                      value={memberViewForm.noiSinh || ""}
                      onChange={(e) =>
                        setMemberViewForm({
                          ...memberViewForm,
                          noiSinh: e.target.value,
                        })
                      }
                      disabled={memberViewReadOnly}
                      className={`mt-1 w-full rounded-lg border border-gray-300 ${
                        memberViewReadOnly ? "bg-gray-50" : "bg-white"
                      } px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                    />
                  </label>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <label className="block text-sm font-medium text-gray-700">
                    Nguyên quán
                    <input
                      type="text"
                      value={memberViewForm.nguyenQuan || ""}
                      onChange={(e) =>
                        setMemberViewForm({
                          ...memberViewForm,
                          nguyenQuan: e.target.value,
                        })
                      }
                      disabled={memberViewReadOnly}
                      className={`mt-1 w-full rounded-lg border border-gray-300 ${
                        memberViewReadOnly ? "bg-gray-50" : "bg-white"
                      } px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                    />
                  </label>
                  <label className="block text-sm font-medium text-gray-700">
                    Dân tộc
                    <input
                      type="text"
                      value={memberViewForm.danToc || ""}
                      onChange={(e) =>
                        setMemberViewForm({
                          ...memberViewForm,
                          danToc: e.target.value,
                        })
                      }
                      disabled={memberViewReadOnly}
                      className={`mt-1 w-full rounded-lg border border-gray-300 ${
                        memberViewReadOnly ? "bg-gray-50" : "bg-white"
                      } px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                    />
                  </label>
                  <label className="block text-sm font-medium text-gray-700">
                    Tôn giáo
                    <input
                      type="text"
                      value={memberViewForm.tonGiao || ""}
                      onChange={(e) =>
                        setMemberViewForm({
                          ...memberViewForm,
                          tonGiao: e.target.value,
                        })
                      }
                      disabled={memberViewReadOnly}
                      className={`mt-1 w-full rounded-lg border border-gray-300 ${
                        memberViewReadOnly ? "bg-gray-50" : "bg-white"
                      } px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                    />
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <label className="block text-sm font-medium text-gray-700">
                    Quốc tịch
                    <input
                      type="text"
                      value={memberViewForm.quocTich || ""}
                      onChange={(e) =>
                        setMemberViewForm({
                          ...memberViewForm,
                          quocTich: e.target.value,
                        })
                      }
                      disabled={memberViewReadOnly}
                      className={`mt-1 w-full rounded-lg border border-gray-300 ${
                        memberViewReadOnly ? "bg-gray-50" : "bg-white"
                      } px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                    />
                  </label>
                  <label className="block text-sm font-medium text-gray-700">
                    Quan hệ với chủ hộ
                    <select
                      value={memberViewForm.quanHe || ""}
                      onChange={(e) =>
                        setMemberViewForm({
                          ...memberViewForm,
                          quanHe: e.target.value,
                        })
                      }
                      disabled={memberViewReadOnly}
                      className={`mt-1 w-full rounded-lg border border-gray-300 ${
                        memberViewReadOnly ? "bg-gray-50" : "bg-white"
                      } px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                    >
                      <option value="">Chọn quan hệ</option>
                      {Object.keys(quanHeLabel).map((key) => (
                        <option key={key} value={key}>
                          {quanHeLabel[key]}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="block text-sm font-medium text-gray-700">
                  Địa chỉ thường trú trước đây
                  <textarea
                    value={memberViewForm.diaChiThuongTruTruoc || ""}
                    onChange={(e) =>
                      setMemberViewForm({
                        ...memberViewForm,
                        diaChiThuongTruTruoc: e.target.value,
                      })
                    }
                    disabled={memberViewReadOnly}
                    rows={2}
                    className={`mt-1 w-full rounded-lg border border-gray-300 ${
                      memberViewReadOnly ? "bg-gray-50" : "bg-white"
                    } px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                  />
                </label>

                <div className="grid grid-cols-2 gap-4">
                  <label className="block text-sm font-medium text-gray-700">
                    Nghề nghiệp
                    <input
                      type="text"
                      value={memberViewForm.ngheNghiep || ""}
                      onChange={(e) =>
                        setMemberViewForm({
                          ...memberViewForm,
                          ngheNghiep: e.target.value,
                        })
                      }
                      disabled={memberViewReadOnly}
                      className={`mt-1 w-full rounded-lg border border-gray-300 ${
                        memberViewReadOnly ? "bg-gray-50" : "bg-white"
                      } px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                    />
                  </label>
                  <label className="block text-sm font-medium text-gray-700">
                    Nơi làm việc
                    <input
                      type="text"
                      value={memberViewForm.noiLamViec || ""}
                      onChange={(e) =>
                        setMemberViewForm({
                          ...memberViewForm,
                          noiLamViec: e.target.value,
                        })
                      }
                      disabled={memberViewReadOnly}
                      className={`mt-1 w-full rounded-lg border border-gray-300 ${
                        memberViewReadOnly ? "bg-gray-50" : "bg-white"
                      } px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                    />
                  </label>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowMemberViewModal(false);
                      setViewingNhanKhauDetail(null);
                      setMemberViewError(null);
                    }}
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {success && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-700">
          {success}
        </div>
      )}

      {/* Create Form Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 z-[120] flex min-h-screen w-screen items-center justify-center bg-black/50 backdrop-blur-sm p-4">
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
                  Số hộ khẩu
                  <input
                    type="text"
                    readOnly
                    value=""
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-500 cursor-not-allowed"
                    placeholder="Tự động sinh (HK001...)"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Số hộ khẩu được sinh tự động theo định dạng HKxxx
                  </p>
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

              <label className="block text-sm font-medium text-gray-700">
                Địa chỉ đầy đủ
                <textarea
                  value={formData.diaChiDayDu}
                  onChange={(e) =>
                    setFormData({ ...formData, diaChiDayDu: e.target.value })
                  }
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Nhập địa chỉ đầy đủ nếu cần"
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

      {/* View Members Modal */}
      {showViewModal && viewingHoKhau && (
        <div className="fixed inset-0 z-[120] flex min-h-screen w-screen items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-4xl rounded-xl border border-gray-200 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Hộ khẩu {viewingHoKhau.soHoKhau}
                </h2>
                <p className="text-sm text-gray-500">
                  Địa chỉ: {viewingHoKhau.diaChi}
                </p>
              </div>
              <button
                onClick={closeViewHousehold}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {viewError && (
              <div className="mb-3 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {viewError}
              </div>
            )}

            <div className="mb-4 grid grid-cols-2 gap-4 text-sm text-gray-700">
              <div className="space-y-1">
                <div className="font-semibold text-gray-900">
                  Thông tin hộ khẩu
                </div>
                <div>Số hộ khẩu: {viewingHoKhau.soHoKhau}</div>
                <div>Địa chỉ: {viewingHoKhau.diaChi}</div>
                {viewingHoKhau.diaChiDayDu && (
                  <div>Địa chỉ đầy đủ: {viewingHoKhau.diaChiDayDu}</div>
                )}
                <div>
                  Trạng thái: {getTrangThaiBadge(viewingHoKhau.trangThai)}
                </div>
              </div>
              <div className="space-y-1">
                <div className="font-semibold text-gray-900">Địa bàn</div>
                {viewingHoKhau.tinhThanh && (
                  <div>Tỉnh/Thành: {viewingHoKhau.tinhThanh}</div>
                )}
                {viewingHoKhau.quanHuyen && (
                  <div>Quận/Huyện: {viewingHoKhau.quanHuyen}</div>
                )}
                {viewingHoKhau.phuongXa && (
                  <div>Phường/Xã: {viewingHoKhau.phuongXa}</div>
                )}
                {(viewingHoKhau.duongPho || viewingHoKhau.soNha) && (
                  <div>
                    Đường/Phố - Số nhà: {viewingHoKhau.duongPho || "-"}{" "}
                    {viewingHoKhau.soNha || ""}
                  </div>
                )}
                {viewingHoKhau.ngayCap && (
                  <div>Ngày cấp: {formatFromYMD(viewingHoKhau.ngayCap)}</div>
                )}
                {viewingHoKhau.ghiChu && (
                  <div>Ghi chú: {viewingHoKhau.ghiChu}</div>
                )}
                <div className="pt-2">
                  <button
                    onClick={() => openHistoryModal(viewingHoKhau.id)}
                    className="rounded-md border border-gray-200 bg-white px-3 py-1 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    📋 Xem lịch sử thay đổi
                  </button>
                </div>
              </div>
            </div>
            <HistoryModal />

            {viewLoading ? (
              <div className="p-4 text-center text-gray-500">
                Đang tải nhân khẩu...
              </div>
            ) : viewNhanKhau.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                Hộ khẩu này chưa có nhân khẩu nào.
              </div>
            ) : (
              <div className="max-h-[420px] overflow-y-auto">
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
                        Giới tính
                      </th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-700">
                        Ngày sinh
                      </th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-700">
                        Ghi chú
                      </th>
                      <th className="px-4 py-2 text-right font-semibold text-gray-700">
                        Thao tác
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {viewNhanKhau.map((nk) => (
                      <tr
                        key={nk.id}
                        className={
                          nk.quanHe === "chu_ho" ? "bg-blue-50/40" : ""
                        }
                      >
                        <td className="px-4 py-2 font-medium text-gray-900">
                          {nk.hoTen}
                          {nk.quanHe === "chu_ho" && (
                            <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                              Chủ hộ
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-gray-700">
                          {nk.cccd || "-"}
                        </td>
                        <td className="px-4 py-2 text-gray-700">
                          {quanHeLabel[nk.quanHe] || nk.quanHe}
                        </td>
                        <td className="px-4 py-2 text-gray-700">
                          {nk.gioiTinh === "nam"
                            ? "Nam"
                            : nk.gioiTinh === "nu"
                            ? "Nữ"
                            : nk.gioiTinh === "khac"
                            ? "Khác"
                            : "-"}
                        </td>
                        <td className="px-4 py-2 text-gray-700">
                          {nk.ngaySinh ? formatFromYMD(nk.ngaySinh) : "-"}
                        </td>
                        <td className="px-4 py-2 text-gray-700">
                          {((nk as any).ghiChuHoKhau ?? "").trim() ||
                            (nk.ghiChu ?? "").trim() ||
                            "-"}
                        </td>
                        <td className="px-4 py-2 text-right text-gray-700">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => openViewNhanKhau(nk.id)}
                              className="rounded-md border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 hover:border-blue-300 hover:text-blue-600"
                              title="Xem đầy đủ"
                            >
                              👁 Xem
                            </button>
                            {canEditMember && (
                              <button
                                onClick={() =>
                                  navigateToNhanKhauPage(viewingHoKhau!.id)
                                }
                                className="rounded-md border border-orange-200 px-3 py-1 text-xs font-semibold text-orange-700 hover:border-orange-300 hover:text-orange-600"
                                title="Chỉnh sửa nhân khẩu ở trang Nhân khẩu"
                              >
                                ✏️ Sửa ở trang Nhân khẩu
                              </button>
                            )}
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
      )}

      {/* Edit Modal */}
      {showEditModal && editingHoKhau && (
        <div className="fixed inset-0 z-[120] flex min-h-screen w-screen items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-xl border border-gray-200 bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                Chỉnh sửa hộ khẩu
              </h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingHoKhau(null);
                }}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
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
                    value={editFormData.soHoKhau}
                    readOnly
                    className="mt-1 w-full cursor-not-allowed rounded-lg border border-gray-300 bg-gray-100 px-3 py-2 text-sm text-gray-600"
                  />
                </label>

                <label className="block text-sm font-medium text-gray-700">
                  Ngày cấp
                  <input
                    type="date"
                    value={editFormData.ngayCap}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        ngayCap: e.target.value,
                      })
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
                  value={editFormData.diaChi}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, diaChi: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </label>

              <label className="block text-sm font-medium text-gray-700">
                Địa chỉ đầy đủ
                <textarea
                  value={editFormData.diaChiDayDu}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      diaChiDayDu: e.target.value,
                    })
                  }
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Nhập địa chỉ đầy đủ nếu cần"
                />
              </label>

              <div className="grid grid-cols-3 gap-4">
                <label className="block text-sm font-medium text-gray-700">
                  Tỉnh/Thành phố
                  <input
                    type="text"
                    value={editFormData.tinhThanh}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        tinhThanh: e.target.value,
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </label>

                <label className="block text-sm font-medium text-gray-700">
                  Quận/Huyện
                  <input
                    type="text"
                    value={editFormData.quanHuyen}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        quanHuyen: e.target.value,
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </label>

                <label className="block text-sm font-medium text-gray-700">
                  Phường/Xã
                  <input
                    type="text"
                    value={editFormData.phuongXa}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        phuongXa: e.target.value,
                      })
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
                    value={editFormData.duongPho}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        duongPho: e.target.value,
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </label>

                <label className="block text-sm font-medium text-gray-700">
                  Số nhà
                  <input
                    type="text"
                    value={editFormData.soNha}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        soNha: e.target.value,
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </label>
              </div>

              <label className="block text-sm font-medium text-gray-700">
                Ghi chú
                <textarea
                  value={editFormData.ghiChu}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, ghiChu: e.target.value })
                  }
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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
                    setShowEditModal(false);
                    setEditingHoKhau(null);
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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Danh sách hộ khẩu ({hoKhauList.length})
            </h2>

            {canSearchHoKhauBySo && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setError(null);
                  loadHoKhauList({ soHoKhau: searchSoHoKhau });
                }}
                className="flex w-full items-center gap-2 sm:w-auto"
              >
                <input
                  type="text"
                  value={searchSoHoKhau}
                  onChange={(e) => setSearchSoHoKhau(e.target.value)}
                  placeholder="Tìm theo số hộ khẩu..."
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:w-72"
                />
                <button
                  type="submit"
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:border-blue-300 hover:text-blue-600"
                >
                  Tìm
                </button>
              </form>
            )}
          </div>
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
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-700">
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
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        onClick={() => openViewHousehold(hk)}
                        className="inline-flex items-center rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:border-blue-300 hover:text-blue-600"
                        title="Xem nhân khẩu"
                      >
                        <span className="sr-only">Xem</span>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      </button>

                      <button
                        onClick={() => openEditHousehold(hk)}
                        className="inline-flex items-center rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:border-blue-300 hover:text-blue-600"
                        title="Chỉnh sửa hộ khẩu"
                      >
                        <span className="sr-only">Sửa</span>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                        </svg>
                      </button>
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
