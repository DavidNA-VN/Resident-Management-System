import { useState, useEffect, FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { apiService } from "../services/api";
import { formatDateForInput, formatFromYMD, normalizeDateOnly } from "../utils/date";

interface HoKhau {
  id: number;
  soHoKhau: string;
  diaChi: string;
  trangThai: string;
}

interface NhanKhau {
  id: number;
  hoTen: string;
  biDanh?: string;
  cccd?: string;
  ngayCapCCCD?: string;
  noiCapCCCD?: string;
  ngaySinh?: string;
  gioiTinh?: string;
  noiSinh?: string;
  nguyenQuan?: string;
  danToc?: string;
  tonGiao?: string;
  quocTich?: string;
  quanHe: string;
  ngayDangKyThuongTru?: string;
  diaChiThuongTruTruoc?: string;
  ngheNghiep?: string;
  noiLamViec?: string;
  hoKhauId: number;
  isChuHo?: boolean; // Computed field from backend for backward compatibility
}

interface NhanKhauForm {
  hoKhauId: string;
  hoTen: string;
  biDanh: string;
  cccd: string;
  ngayCapCCCD: string;
  noiCapCCCD: string;
  ngaySinh: string;
  gioiTinh: string;
  noiSinh: string;
  nguyenQuan: string;
  danToc: string;
  tonGiao: string;
  quocTich: string;
  quanHe: string;
  ngayDangKyThuongTru: string;
  diaChiThuongTruTruoc: string;
  ngheNghiep: string;
  noiLamViec: string;
  ghiChu: string;
}

export default function NhanKhau() {
  const [searchParams] = useSearchParams();
  const [hoKhauList, setHoKhauList] = useState<HoKhau[]>([]);
  const [selectedHoKhauId, setSelectedHoKhauId] = useState<number | null>(null);
  const [nhanKhauList, setNhanKhauList] = useState<NhanKhau[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showActivateModal, setShowActivateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showChangeChuHoModal, setShowChangeChuHoModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewError, setViewError] = useState<string | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewSaving, setViewSaving] = useState(false);
  const [viewingNhanKhau, setViewingNhanKhau] = useState<NhanKhau | null>(null);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const emptyForm: NhanKhauForm = {
    hoKhauId: "",
    hoTen: "",
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
    quanHe: "",
    ngayDangKyThuongTru: "",
    diaChiThuongTruTruoc: "",
    ngheNghiep: "",
    noiLamViec: "",
    ghiChu: "",
  };

  const [formData, setFormData] = useState<NhanKhauForm>({ ...emptyForm });
  const [viewForm, setViewForm] = useState<NhanKhauForm>({ ...emptyForm });

  const [hoKhauHeadStatus, setHoKhauHeadStatus] = useState<
    Record<number, boolean>
  >({});
  const [checkingHoKhauId, setCheckingHoKhauId] = useState<number | null>(null);

  const showToast = (
    message: string,
    type: "success" | "error" = "success"
  ) => {
    setToast({ type, message });
  };

  // Current user (from localStorage) to control UI permissions (người dân cannot set 'chu_ho')
  const currentUser = localStorage.getItem("userInfo")
    ? (JSON.parse(localStorage.getItem("userInfo") || "null") as any)
    : null;
  const isCitizen = currentUser?.role === "nguoi_dan";

  const normalizeField = (value: string) => {
    const trimmed = value?.trim?.() ?? "";
    return trimmed === "" ? null : trimmed;
  };

  // Helper function to check if a person is the head of household
  const isChuHo = (nhanKhau: NhanKhau) => {
    // Check isChuHo field first (from backend computed field)
    if (nhanKhau.isChuHo === true) return true;
    // Fallback to quanHe check
    const normalized = String(nhanKhau.quanHe || "").trim().toLowerCase();
    return normalized === "chu_ho" || normalized === "chủ hộ";
  };

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    loadHoKhauList();
  }, []);

  // Handle householdId from query parameter
  useEffect(() => {
    if (hoKhauList.length > 0) {
      const householdIdParam = searchParams.get('householdId');
      if (householdIdParam) {
        const householdId = parseInt(householdIdParam);
        if (hoKhauList.some(hk => hk.id === householdId)) {
          setSelectedHoKhauId(householdId);
          // Show a toast message to guide the user
          showToast("Vui lòng chọn nhân khẩu để sửa", "success");
        }
      }
    }
  }, [hoKhauList, searchParams]);

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
      const message = err.error?.message || "Lỗi khi tải danh sách hộ khẩu";
      setError(message);
      showToast(message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const loadNhanKhauList = async (hoKhauId: number) => {
    setIsLoading(true);
    setError(null); // Clear previous errors
    try {
      const response = await apiService.getNhanKhauList(hoKhauId);
      if (response.success) {
        const members = [...response.data];
        members.sort((a, b) => {
          const aIsHead = isChuHo(a);
          const bIsHead = isChuHo(b);
          if (aIsHead && !bIsHead) return -1;
          if (!aIsHead && bIsHead) return 1;
          const aName = (a.hoTen || "").trim();
          const bName = (b.hoTen || "").trim();
          return aName.localeCompare(bName, "vi", { sensitivity: "base" });
        });
        setNhanKhauList(members);
        const hasChuHo = response.data.some(
          (nk: NhanKhau) => isChuHo(nk)
        );
        setHoKhauHeadStatus((prev) => ({ ...prev, [hoKhauId]: hasChuHo }));
      } else {
        // API returned success=false, show error but keep existing list
        const message = "Lỗi khi tải danh sách nhân khẩu";
        setError(message);
        showToast(message, "error");
        // Don't clear the list - keep existing data
      }
    } catch (err: any) {
      const message = err.error?.message || "Lỗi khi tải danh sách nhân khẩu";
      setError(message);
      showToast(message, "error");
      // On network/server errors, don't clear the list - keep existing data
      // Only clear if it's a legitimate "no data" scenario
    } finally {
      setIsLoading(false);
    }
  };

  const ensureHoKhauHasChuHo = async (hoKhauId: number) => {
    if (hoKhauHeadStatus[hoKhauId] !== undefined) {
      return hoKhauHeadStatus[hoKhauId];
    }

    setCheckingHoKhauId(hoKhauId);

    try {
      const response = await apiService.getNhanKhauList(hoKhauId);

      if (response.success) {
        const members = [...response.data];
        members.sort((a, b) => {
          const aIsHead = isChuHo(a);
          const bIsHead = isChuHo(b);
          if (aIsHead && !bIsHead) return -1;
          if (!aIsHead && bIsHead) return 1;
          const aName = (a.hoTen || "").trim();
          const bName = (b.hoTen || "").trim();
          return aName.localeCompare(bName, "vi", { sensitivity: "base" });
        });

        const hasChuHo = members.some(
          (nk: NhanKhau) => isChuHo(nk)
        );

        setHoKhauHeadStatus((prev) => ({ ...prev, [hoKhauId]: hasChuHo }));
        return hasChuHo;
      }

      return false;
    } catch (err) {
      throw err;
    } finally {
      setCheckingHoKhauId((current) => (current === hoKhauId ? null : current));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setToast(null);

    const requiredFields: (keyof NhanKhauForm)[] = [
      "hoKhauId",
      "hoTen",
      "quanHe",
      "ngaySinh",
      "gioiTinh",
      "noiSinh",
      "nguyenQuan",
      "danToc",
      "tonGiao",
      "quocTich",
    ];

    const missing = requiredFields.filter((key) => !formData[key]);
    if (missing.length > 0) {
      const message =
        "Vui lòng nhập đầy đủ các trường bắt buộc (Hộ khẩu, Họ tên, Quan hệ, Ngày sinh, Giới tính, Nơi sinh, Nguyên quán, Dân tộc, Tôn giáo, Quốc tịch)";
      setError(message);
      showToast(message, "error");
      return;
    }

    const optionalKeys: (keyof NhanKhauForm)[] = [
      "cccd",
      "ngheNghiep",
      "noiLamViec",
      "biDanh",
      "ngayDangKyThuongTru",
      "noiCapCCCD",
      "ngayCapCCCD",
      "diaChiThuongTruTruoc",
    ];
    const hasMissingOptional = optionalKeys.some(
      (key) => !normalizeField(formData[key])
    );
    if (hasMissingOptional && !normalizeField(formData.ghiChu)) {
      const message =
        "Vui lòng ghi chú lý do bỏ trống các trường tùy chọn vào phần Ghi chú.";
      setError(message);
      showToast(message, "error");
      return;
    }

    setIsLoading(true);
    try {
      const hoKhauIdNumber = Number(formData.hoKhauId);

      if (isChuHo({ quanHe: formData.quanHe } as NhanKhau)) {
        const hasChuHo = await ensureHoKhauHasChuHo(hoKhauIdNumber);

        if (hasChuHo) {
          const message = "Hộ khẩu này đã có chủ hộ, không thể thêm chủ hộ mới";
          setError(message);
          showToast(message, "error");
          return;
        }
      }

      const response = await apiService.createNhanKhau({
        hoKhauId: hoKhauIdNumber,
        hoTen: normalizeField(formData.hoTen)!,
        biDanh: normalizeField(formData.biDanh) || undefined,
        cccd: normalizeField(formData.cccd) || undefined,
        ngayCapCCCD: normalizeDateOnly(formData.ngayCapCCCD) || undefined,
        noiCapCCCD: normalizeField(formData.noiCapCCCD) || undefined,
        ngaySinh: normalizeDateOnly(formData.ngaySinh) || undefined,
        gioiTinh:
          formData.gioiTinh === "nam" ||
          formData.gioiTinh === "nu" ||
          formData.gioiTinh === "khac"
            ? (formData.gioiTinh as "nam" | "nu" | "khac")
            : undefined,
        noiSinh: normalizeField(formData.noiSinh) || undefined,
        nguyenQuan: normalizeField(formData.nguyenQuan) || undefined,
        danToc: normalizeField(formData.danToc) || undefined,
        tonGiao: normalizeField(formData.tonGiao) || undefined,
        quocTich: normalizeField(formData.quocTich) || undefined,
        quanHe: formData.quanHe as any,
        ngayDangKyThuongTru: normalizeDateOnly(formData.ngayDangKyThuongTru) || undefined,
        diaChiThuongTruTruoc:
          normalizeField(formData.diaChiThuongTruTruoc) || undefined,
        ngheNghiep: normalizeField(formData.ngheNghiep) || undefined,
        noiLamViec: normalizeField(formData.noiLamViec) || undefined,
        ghiChu: normalizeField(formData.ghiChu) || undefined,
      });

      if (response.success) {
        showToast("Thêm nhân khẩu thành công", "success");
        setShowCreateForm(false);
        setFormData({
          hoKhauId: selectedHoKhauId?.toString() || "",
          hoTen: "",
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
          quanHe: "",
          ngayDangKyThuongTru: "",
          diaChiThuongTruTruoc: "",
          ngheNghiep: "",
          noiLamViec: "",
          ghiChu: "",
        });
        if (selectedHoKhauId) {
          loadNhanKhauList(selectedHoKhauId);
        }
      }
    } catch (err: any) {
      const message = err.error?.message || "Lỗi khi tạo nhân khẩu";
      setError(message);
      showToast(message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const openViewNhanKhau = async (id: number) => {
    setViewError(null);
    setViewingNhanKhau(null);
    setShowViewModal(true);
    setViewLoading(true);
    try {
      const res = await apiService.getNhanKhauById(id);
      if (res.success) {
        const nk = res.data as any;
        setViewingNhanKhau(nk);
        setViewForm({
          hoKhauId: nk.hoKhauId?.toString() || "",
          hoTen: nk.hoTen || "",
          biDanh: nk.biDanh || "",
          cccd: nk.cccd || "",
          ngayCapCCCD: formatDateForInput(nk.ngayCapCCCD),
          noiCapCCCD: nk.noiCapCCCD || "",
          ngaySinh: formatDateForInput(nk.ngaySinh),
          gioiTinh: nk.gioiTinh || "",
          noiSinh: nk.noiSinh || "",
          nguyenQuan: nk.nguyenQuan || "",
          danToc: nk.danToc || "",
          tonGiao: nk.tonGiao || "",
          quocTich: nk.quocTich || "Việt Nam",
          quanHe: nk.quanHe || "",
          ngayDangKyThuongTru: formatDateForInput(nk.ngayDangKyThuongTru),
          diaChiThuongTruTruoc: nk.diaChiThuongTruTruoc || "",
          ngheNghiep: nk.ngheNghiep || "",
          noiLamViec: nk.noiLamViec || "",
          ghiChu: nk.ghiChu || "",
        });
      }
    } catch (err: any) {
      setViewError(err.error?.message || "Lỗi khi tải thông tin nhân khẩu");
    } finally {
      setViewLoading(false);
    }
  };

  const handleUpdateNhanKhau = async (id: number) => {
    setViewError(null);
    setToast(null);
    setViewSaving(true);
    try {
      const requiredFields: (keyof NhanKhauForm)[] = [
        "hoTen",
        "quanHe",
        "ngaySinh",
        "gioiTinh",
        "noiSinh",
        "nguyenQuan",
        "danToc",
        "tonGiao",
        "quocTich",
      ];
      const missingRequired = requiredFields.filter((k) => !viewForm[k]);
      if (missingRequired.length > 0) {
        const message =
          "Vui lòng nhập đầy đủ các trường bắt buộc (Họ tên, Quan hệ, Ngày sinh, Giới tính, Nơi sinh, Nguyên quán, Dân tộc, Tôn giáo, Quốc tịch)";
        setViewError(message);
        showToast(message, "error");
        setViewSaving(false);
        return;
      }

      // Validation: Nếu đang set quanHe = "chu_ho", kiểm tra hộ khẩu đã có chủ hộ chưa
      if (isChuHo({ quanHe: viewForm.quanHe } as NhanKhau) && viewingNhanKhau) {
        const hoKhauId = viewingNhanKhau.hoKhauId;
        const hasChuHo = await ensureHoKhauHasChuHo(hoKhauId);
        
        // Nếu hộ khẩu đã có chủ hộ và nhân khẩu hiện tại không phải chủ hộ
        if (hasChuHo && !isChuHo(viewingNhanKhau)) {
          const message =
            "Hộ khẩu này đã có chủ hộ. Không thể đặt nhân khẩu này làm chủ hộ. Vui lòng sử dụng chức năng 'Đổi chủ hộ' nếu muốn thay đổi.";
          setViewError(message);
          showToast(message, "error");
          setViewSaving(false);
          return;
        }
      }

      const optionalKeys: (keyof NhanKhauForm)[] = [
        "cccd",
        "ngheNghiep",
        "noiLamViec",
        "biDanh",
        "ngayDangKyThuongTru",
        "noiCapCCCD",
        "ngayCapCCCD",
        "diaChiThuongTruTruoc",
      ];
      const hasMissingOptional = optionalKeys.some(
        (k) => !normalizeField(viewForm[k])
      );
      if (hasMissingOptional && !normalizeField(viewForm.ghiChu)) {
        const message =
          "Vui lòng ghi chú lý do bỏ trống các trường tùy chọn vào phần Ghi chú.";
        setViewError(message);
        showToast(message, "error");
        setViewSaving(false);
        return;
      }

      const payload = {
        hoTen: normalizeField(viewForm.hoTen) || undefined,
        biDanh: normalizeField(viewForm.biDanh) || undefined,
        cccd: normalizeField(viewForm.cccd) || undefined,
        ngayCapCCCD: normalizeDateOnly(viewForm.ngayCapCCCD) || undefined,
        noiCapCCCD: normalizeField(viewForm.noiCapCCCD) || undefined,
        ngaySinh: normalizeDateOnly(viewForm.ngaySinh) || undefined,
        gioiTinh:
          viewForm.gioiTinh === "nam" ||
          viewForm.gioiTinh === "nu" ||
          viewForm.gioiTinh === "khac"
            ? (viewForm.gioiTinh as "nam" | "nu" | "khac")
            : undefined,
        noiSinh: normalizeField(viewForm.noiSinh) || undefined,
        nguyenQuan: normalizeField(viewForm.nguyenQuan) || undefined,
        danToc: normalizeField(viewForm.danToc) || undefined,
        tonGiao: normalizeField(viewForm.tonGiao) || undefined,
        quocTich: normalizeField(viewForm.quocTich) || undefined,
        quanHe: (normalizeField(viewForm.quanHe) as any) || undefined,
        ngayDangKyThuongTru: normalizeDateOnly(viewForm.ngayDangKyThuongTru) || undefined,
        diaChiThuongTruTruoc:
          normalizeField(viewForm.diaChiThuongTruTruoc) || undefined,
        ngheNghiep: normalizeField(viewForm.ngheNghiep) || undefined,
        noiLamViec: normalizeField(viewForm.noiLamViec) || undefined,
      };

      try {
        const res = await apiService.updateNhanKhau(id, payload);
        if (res.success) {
          showToast("Cập nhật nhân khẩu thành công!", "success");
          setShowViewModal(false);
          setViewingNhanKhau(null);
          if (selectedHoKhauId) {
            loadNhanKhauList(selectedHoKhauId);
          }
        }
      } catch (err: any) {
        const message = err.error?.message || "Lỗi khi cập nhật nhân khẩu";
        setViewError(message);
        showToast(message, "error");
      }
    } catch (err: any) {
      const message = err.error?.message || "Lỗi khi cập nhật nhân khẩu";
      setViewError(message);
      showToast(message, "error");
    } finally {
      setViewSaving(false);
    }
  };

  const handleActivate = async (hoKhauId: number, chuHoId: number) => {
    setError(null);
    setToast(null);
    setIsLoading(true);

    try {
      const response = await apiService.activateHoKhau(hoKhauId, chuHoId);
      if (response.success) {
        showToast("Kích hoạt hộ khẩu thành công!", "success");
        setShowActivateModal(false);
        loadHoKhauList();
        if (selectedHoKhauId === hoKhauId) {
          loadNhanKhauList(hoKhauId);
        }
      }
    } catch (err: any) {
      const message = err.error?.message || "Lỗi khi kích hoạt hộ khẩu";
      setError(message);
      showToast(message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangeChuHo = async (
    newChuHoId: number,
    oldChuHoNewQuanHe?: string
  ) => {
    if (!selectedHoKhauId) return;

    setError(null);
    setToast(null);
    setIsLoading(true);

    try {
      const response = await apiService.changeChuHo(
        selectedHoKhauId,
        newChuHoId,
        oldChuHoNewQuanHe
      );
      if (response.success) {
        showToast("Đổi chủ hộ thành công!", "success");
        setShowChangeChuHoModal(false);
        loadHoKhauList();
        loadNhanKhauList(selectedHoKhauId);
      }
    } catch (err: any) {
      const message = err.error?.message || "Lỗi khi đổi chủ hộ";
      setError(message);
      showToast(message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Always derive a sorted list for rendering so Chủ hộ is shown first
  const sortedNhanKhauList = [...nhanKhauList].sort((a, b) => {
    const aIsHead = isChuHo(a);
    const bIsHead = isChuHo(b);
    if (aIsHead && !bIsHead) return -1;
    if (!aIsHead && bIsHead) return 1;
    const aName = (a.hoTen || "").trim();
    const bName = (b.hoTen || "").trim();
    return aName.localeCompare(bName, "vi", { sensitivity: "base" });
  });

  const selectedHoKhau = hoKhauList.find((hk) => hk.id === selectedHoKhauId);
  const chuHoCandidates = sortedNhanKhauList.filter((nk) => isChuHo(nk));

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

  const selectedFormHoKhauId = formData.hoKhauId
    ? Number(formData.hoKhauId)
    : null;
  const hasChuHoForForm =
    selectedFormHoKhauId !== null
      ? hoKhauHeadStatus[selectedFormHoKhauId]
      : undefined;
  const isCheckingCurrentHoKhau =
    selectedFormHoKhauId !== null &&
    checkingHoKhauId !== null &&
    checkingHoKhauId === selectedFormHoKhauId;

  useEffect(() => {
    if (showCreateForm && formData.hoKhauId) {
      ensureHoKhauHasChuHo(Number(formData.hoKhauId)).catch((err: any) => {
        const message =
          err.error?.message || "Lỗi khi kiểm tra thông tin hộ khẩu";
        setError(message);
        showToast(message, "error");
      });
    }
  }, [showCreateForm, formData.hoKhauId]);

  useEffect(() => {
    if (hasChuHoForForm && isChuHo({ quanHe: formData.quanHe } as NhanKhau)) {
      setFormData((prev) => ({ ...prev, quanHe: "" }));
    }
  }, [hasChuHoForForm, formData.quanHe]);

  return (
    <div className="space-y-6">
      {toast && (
        <div className="pointer-events-none fixed inset-x-0 top-4 z-[200] flex justify-center px-4">
          <div
            className={`pointer-events-auto flex items-start gap-3 rounded-lg border px-4 py-3 text-sm shadow-lg ${
              toast.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            <div className="font-semibold">
              {toast.type === "success" ? "Thành công" : "Thông báo"}
            </div>
            <div className="flex-1 text-gray-800">{toast.message}</div>
            <button
              onClick={() => setToast(null)}
              className="ml-2 rounded-full p-1 text-gray-500 hover:bg-black/5 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
        </div>
      )}

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

      {/* View & Edit Modal */}
      {showViewModal && viewingNhanKhau && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-xl border border-gray-200 bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto overflow-hidden modal-scroll">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Xem / Sửa nhân khẩu
                </h2>
                <p className="text-sm text-gray-500">
                  Hộ khẩu: {viewForm.hoKhauId}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setViewingNhanKhau(null);
                  setViewError(null);
                }}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {viewError && (
              <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {viewError}
              </div>
            )}

            {viewLoading ? (
              <div className="p-6 text-center text-gray-500">
                Đang tải thông tin...
              </div>
            ) : (
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (viewingNhanKhau) {
                    handleUpdateNhanKhau(viewingNhanKhau.id);
                  }
                }}
              >
                <div className="grid grid-cols-3 gap-4">
                  <label className="block text-sm font-medium text-gray-700">
                    Họ và tên
                    <input
                      type="text"
                      value={viewForm.hoTen}
                      onChange={(e) =>
                        setViewForm({ ...viewForm, hoTen: e.target.value })
                      }
                      className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      required
                    />
                  </label>
                  <label className="block text-sm font-medium text-gray-700">
                    CCCD/CMND
                    <input
                      type="text"
                      value={viewForm.cccd}
                      onChange={(e) =>
                        setViewForm({ ...viewForm, cccd: e.target.value })
                      }
                      className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </label>
                  <label className="block text-sm font-medium text-gray-700">
                    Bí danh
                    <input
                      type="text"
                      value={viewForm.biDanh}
                      onChange={(e) =>
                        setViewForm({ ...viewForm, biDanh: e.target.value })
                      }
                      className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <label className="block text-sm font-medium text-gray-700">
                    Ngày cấp CCCD
                    <input
                      type="date"
                      value={viewForm.ngayCapCCCD}
                      onChange={(e) =>
                        setViewForm({
                          ...viewForm,
                          ngayCapCCCD: e.target.value,
                        })
                      }
                      className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </label>
                  <label className="block text-sm font-medium text-gray-700">
                    Nơi cấp CCCD
                    <input
                      type="text"
                      value={viewForm.noiCapCCCD}
                      onChange={(e) =>
                        setViewForm({ ...viewForm, noiCapCCCD: e.target.value })
                      }
                      className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </label>
                  <label className="block text-sm font-medium text-gray-700">
                    Ngày đăng ký thường trú
                    <input
                      type="date"
                      value={viewForm.ngayDangKyThuongTru}
                      onChange={(e) =>
                        setViewForm({
                          ...viewForm,
                          ngayDangKyThuongTru: e.target.value,
                        })
                      }
                      className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <label className="block text-sm font-medium text-gray-700">
                    Ngày sinh <span className="text-red-500">*</span>
                    <input
                      type="date"
                      value={viewForm.ngaySinh}
                      onChange={(e) =>
                        setViewForm({ ...viewForm, ngaySinh: e.target.value })
                      }
                      className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </label>
                  <label className="block text-sm font-medium text-gray-700">
                    Giới tính <span className="text-red-500">*</span>
                    <select
                      value={viewForm.gioiTinh}
                      onChange={(e) =>
                        setViewForm({ ...viewForm, gioiTinh: e.target.value })
                      }
                      className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="">Chọn giới tính</option>
                      <option value="nam">Nam</option>
                      <option value="nu">Nữ</option>
                      <option value="khac">Khác</option>
                    </select>
                  </label>
                  <label className="block text-sm font-medium text-gray-700">
                    Nơi sinh <span className="text-red-500">*</span>
                    <input
                      type="text"
                      value={viewForm.noiSinh}
                      onChange={(e) =>
                        setViewForm({ ...viewForm, noiSinh: e.target.value })
                      }
                      className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <label className="block text-sm font-medium text-gray-700">
                    Nguyên quán <span className="text-red-500">*</span>
                    <input
                      type="text"
                      value={viewForm.nguyenQuan}
                      onChange={(e) =>
                        setViewForm({ ...viewForm, nguyenQuan: e.target.value })
                      }
                      className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </label>
                  <label className="block text-sm font-medium text-gray-700">
                    Dân tộc <span className="text-red-500">*</span>
                    <input
                      type="text"
                      value={viewForm.danToc}
                      onChange={(e) =>
                        setViewForm({ ...viewForm, danToc: e.target.value })
                      }
                      className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </label>
                  <label className="block text-sm font-medium text-gray-700">
                    Tôn giáo <span className="text-red-500">*</span>
                    <input
                      type="text"
                      value={viewForm.tonGiao}
                      onChange={(e) =>
                        setViewForm({ ...viewForm, tonGiao: e.target.value })
                      }
                      className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <label className="block text-sm font-medium text-gray-700">
                    Quốc tịch <span className="text-red-500">*</span>
                    <input
                      type="text"
                      value={viewForm.quocTich}
                      onChange={(e) =>
                        setViewForm({ ...viewForm, quocTich: e.target.value })
                      }
                      className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </label>
                  <label className="block text-sm font-medium text-gray-700">
                    Quan hệ với chủ hộ
                    <select
                      value={viewForm.quanHe}
                      onChange={(e) =>
                        setViewForm({ ...viewForm, quanHe: e.target.value })
                      }
                      className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="">Chọn quan hệ</option>
                      {quanHeOptions.map((opt) => {
                        const isChuHoOption = opt.value === "chu_ho";
                        const isCurrentChuHo =
                          viewingNhanKhau ? isChuHo(viewingNhanKhau) : false;
                        const disabledChuHo =
                          isChuHoOption &&
                          !isCurrentChuHo &&
                          selectedHoKhauId !== null &&
                          hoKhauHeadStatus[selectedHoKhauId];
                        // additionally hide/disable option for plain citizens
                        const disabledForCitizen = isChuHoOption && isCitizen;

                        return (
                          <option
                            key={opt.value}
                            value={opt.value}
                            disabled={disabledChuHo || disabledForCitizen}
                          >
                            {opt.label}
                          </option>
                        );
                      })}
                    </select>
                    {viewingNhanKhau &&
                      !isChuHo(viewingNhanKhau) &&
                      selectedHoKhauId !== null &&
                      hoKhauHeadStatus[selectedHoKhauId] && (
                        <p className="mt-1 text-xs text-amber-600">
                          Hộ khẩu này đã có chủ hộ. Vui lòng sử dụng chức năng
                          "Đổi chủ hộ" nếu muốn thay đổi.
                        </p>
                      )}
                  </label>
                </div>

                <label className="block text-sm font-medium text-gray-700">
                  Địa chỉ thường trú trước đây
                  <textarea
                    value={viewForm.diaChiThuongTruTruoc}
                    onChange={(e) =>
                      setViewForm({
                        ...viewForm,
                        diaChiThuongTruTruoc: e.target.value,
                      })
                    }
                    rows={2}
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </label>

                <div className="grid grid-cols-2 gap-4">
                  <label className="block text-sm font-medium text-gray-700">
                    Nghề nghiệp
                    <input
                      type="text"
                      value={viewForm.ngheNghiep}
                      onChange={(e) =>
                        setViewForm({ ...viewForm, ngheNghiep: e.target.value })
                      }
                      className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </label>
                  <label className="block text-sm font-medium text-gray-700">
                    Nơi làm việc
                    <input
                      type="text"
                      value={viewForm.noiLamViec}
                      onChange={(e) =>
                        setViewForm({ ...viewForm, noiLamViec: e.target.value })
                      }
                      className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </label>
                </div>

                <label className="block text-sm font-medium text-gray-700">
                  Ghi chú
                  <textarea
                    value={viewForm.ghiChu}
                    onChange={(e) =>
                      setViewForm({ ...viewForm, ghiChu: e.target.value })
                    }
                    rows={2}
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="Nhập lý do nếu bỏ trống các trường tùy chọn"
                  />
                </label>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={viewSaving}
                    className="flex-1 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg disabled:opacity-50"
                  >
                    {viewSaving ? "Đang lưu..." : "Lưu thay đổi"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowViewModal(false);
                      setViewingNhanKhau(null);
                      setViewError(null);
                    }}
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Đóng
                  </button>
                </div>
              </form>
            )}
          </div>
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

      {/* Change Chu Ho Button */}
      {selectedHoKhau &&
        selectedHoKhau.trangThai === "active" &&
        chuHoCandidates.length > 0 &&
        nhanKhauList.filter((nk) => nk.quanHe !== "chu_ho").length > 0 && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-blue-900">Đổi chủ hộ</p>
                <p className="mt-1 text-sm text-blue-700">
                  Bạn có thể thay đổi chủ hộ cho hộ khẩu này.
                </p>
              </div>
              <button
                onClick={() => setShowChangeChuHoModal(true)}
                className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600"
              >
                Đổi chủ hộ
              </button>
            </div>
          </div>
        )}

      {/* Create Form Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-xl border border-gray-200 bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto overflow-hidden modal-scroll">
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

              <div className="grid grid-cols-3 gap-4">
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
                    autoComplete="off"
                    spellCheck={false}
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

                <label className="block text-sm font-medium text-gray-700">
                  Bí danh
                  <input
                    type="text"
                    value={formData.biDanh}
                    onChange={(e) =>
                      setFormData({ ...formData, biDanh: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </label>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <label className="block text-sm font-medium text-gray-700">
                  Ngày cấp CCCD
                  <input
                    type="date"
                    value={formData.ngayCapCCCD}
                    onChange={(e) =>
                      setFormData({ ...formData, ngayCapCCCD: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </label>

                <label className="block text-sm font-medium text-gray-700">
                  Nơi cấp CCCD
                  <input
                    type="text"
                    value={formData.noiCapCCCD}
                    onChange={(e) =>
                      setFormData({ ...formData, noiCapCCCD: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </label>

                <label className="block text-sm font-medium text-gray-700">
                  Ngày đăng ký thường trú
                  <input
                    type="date"
                    value={formData.ngayDangKyThuongTru}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        ngayDangKyThuongTru: e.target.value,
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </label>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <label className="block text-sm font-medium text-gray-700">
                  Ngày sinh <span className="text-red-500">*</span>
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
                  Giới tính <span className="text-red-500">*</span>
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

                <label className="block text-sm font-medium text-gray-700">
                  Nơi sinh <span className="text-red-500">*</span>
                  <input
                    type="text"
                    value={formData.noiSinh}
                    onChange={(e) =>
                      setFormData({ ...formData, noiSinh: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </label>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <label className="block text-sm font-medium text-gray-700">
                  Nguyên quán <span className="text-red-500">*</span>
                  <input
                    type="text"
                    value={formData.nguyenQuan}
                    onChange={(e) =>
                      setFormData({ ...formData, nguyenQuan: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </label>

                <label className="block text-sm font-medium text-gray-700">
                  Dân tộc <span className="text-red-500">*</span>
                  <input
                    type="text"
                    value={formData.danToc}
                    onChange={(e) =>
                      setFormData({ ...formData, danToc: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </label>

                <label className="block text-sm font-medium text-gray-700">
                  Tôn giáo <span className="text-red-500">*</span>
                  <input
                    type="text"
                    value={formData.tonGiao}
                    onChange={(e) =>
                      setFormData({ ...formData, tonGiao: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <label className="block text-sm font-medium text-gray-700">
                  Quốc tịch <span className="text-red-500">*</span>
                  <input
                    type="text"
                    value={formData.quocTich}
                    onChange={(e) =>
                      setFormData({ ...formData, quocTich: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </label>

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
                    {quanHeOptions.map((opt) => {
                      const isChuHoOption = opt.value === "chu_ho";
                      const disabledChuHo =
                        isChuHoOption &&
                        (isCheckingCurrentHoKhau || hasChuHoForForm);
                      const disabledForCitizen = isChuHoOption && isCitizen;

                      return (
                        <option
                          key={opt.value}
                          value={opt.value}
                          disabled={disabledChuHo || disabledForCitizen}
                        >
                          {opt.label}
                        </option>
                      );
                    })}
                  </select>
                  {hasChuHoForForm && (
                    <p className="mt-1 text-xs text-amber-600">
                      Hộ khẩu này đã có chủ hộ.
                    </p>
                  )}
                </label>
              </div>

              <label className="block text-sm font-medium text-gray-700">
                Địa chỉ thường trú trước đây
                <textarea
                  value={formData.diaChiThuongTruTruoc}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      diaChiThuongTruTruoc: e.target.value,
                    })
                  }
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </label>

              <div className="grid grid-cols-2 gap-4">
                <label className="block text-sm font-medium text-gray-700">
                  Nghề nghiệp
                  <input
                    type="text"
                    value={formData.ngheNghiep}
                    onChange={(e) =>
                      setFormData({ ...formData, ngheNghiep: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </label>

                <label className="block text-sm font-medium text-gray-700">
                  Nơi làm việc
                  <input
                    type="text"
                    value={formData.noiLamViec}
                    onChange={(e) =>
                      setFormData({ ...formData, noiLamViec: e.target.value })
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
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Nhập lý do nếu bỏ trống các trường tùy chọn"
                />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto overflow-hidden modal-scroll">
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

      {/* Change Chu Ho Modal */}
      {showChangeChuHoModal && selectedHoKhau && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto overflow-hidden modal-scroll">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Đổi chủ hộ</h2>
              <button
                onClick={() => setShowChangeChuHoModal(false)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <p className="mb-4 text-sm text-gray-600">
              Chọn nhân khẩu mới làm chủ hộ cho hộ khẩu{" "}
              <strong>{selectedHoKhau.soHoKhau}</strong>
            </p>

            <p className="mb-4 text-xs text-amber-600">
              Chủ hộ hiện tại sẽ được tự động chuyển sang quan hệ khác (mặc định
              là "Vợ/Chồng").
            </p>

            <div className="space-y-2 mb-6">
              {sortedNhanKhauList
                .filter((nk) => nk.quanHe !== "chu_ho")
                .map((nk) => (
                  <button
                    key={nk.id}
                    onClick={() => handleChangeChuHo(nk.id)}
                    disabled={isLoading}
                    className="w-full rounded-lg border border-gray-200 bg-white p-3 text-left hover:bg-gray-50 hover:border-blue-300 transition-all disabled:opacity-50"
                  >
                    <div className="font-medium text-gray-900">{nk.hoTen}</div>
                    {nk.cccd && (
                      <div className="text-xs text-gray-500">
                        CCCD: {nk.cccd}
                      </div>
                    )}
                    <div className="text-xs text-gray-500">
                      {quanHeOptions.find((opt) => opt.value === nk.quanHe)
                        ?.label || nk.quanHe}
                    </div>
                  </button>
                ))}
            </div>

            {sortedNhanKhauList.filter((nk) => nk.quanHe !== "chu_ho").length ===
              0 && (
              <p className="mb-4 text-sm text-gray-500 text-center">
                Không có nhân khẩu nào khác để chọn làm chủ hộ.
              </p>
            )}

            <button
              onClick={() => setShowChangeChuHoModal(false)}
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
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sortedNhanKhauList.map((nk) => (
                  <tr
                    key={nk.id}
                    className={`hover:bg-gray-50 ${
                      isChuHo(nk) ? "bg-blue-50/50" : ""
                    }`}
                  >
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {nk.hoTen}
                      {isChuHo(nk) && (
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
                        ? formatFromYMD(nk.ngaySinh)
                        : "-"}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-600 space-x-2">
                      <button
                        onClick={() => openViewNhanKhau(nk.id)}
                        className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:border-blue-300 hover:text-blue-600"
                        title="Xem/Sửa"
                      >
                        👁 Xem
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
