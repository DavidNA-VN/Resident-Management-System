import { useState, useEffect, FormEvent, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { apiService } from "../services/api";
import {
  formatDateForInput,
  formatFromYMD,
  normalizeDateOnly,
} from "../utils/date";

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
  soHoKhau?: string; // household code for cross-household display
  isChuHo?: boolean; // Computed field from backend for backward compatibility
  trangThai?: string;
  updatedAt?: string;
  createdAt?: string;
}

interface SearchFilters {
  searchText: string;
  ageGroup: string;
  gender: string;
  residenceStatus: string;
  movementStatus: string;
  feedbackStatus: string;
}

enum AgeGroup {
  MAM_NON = "MAM_NON",
  CAP_1 = "CAP_1",
  CAP_2 = "CAP_2",
  CAP_3 = "CAP_3",
  LAO_DONG = "LAO_DONG",
  NGHI_HUU = "NGHI_HUU",
}

enum BienDongStatus {
  MOI_SINH = "moi_sinh",
  DA_CHUYEN_DI = "da_chuyen_di",
  DA_QUA_DOI = "da_qua_doi",
  BINH_THUONG = "binh_thuong",
}

const calculateAge = (dateStr?: string) => {
  if (!dateStr) return NaN;
  const dob = new Date(dateStr);
  if (isNaN(dob.getTime())) return NaN;

  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age;
};

const getAgeGroup = (age: number): string => {
  if (isNaN(age)) return "";
  if (age >= 3 && age <= 5) return AgeGroup.MAM_NON;
  if (age >= 6 && age <= 10) return AgeGroup.CAP_1;
  if (age >= 11 && age <= 14) return AgeGroup.CAP_2;
  if (age >= 15 && age <= 17) return AgeGroup.CAP_3;
  if (age >= 18 && age <= 59) return AgeGroup.LAO_DONG;
  if (age >= 60) return AgeGroup.NGHI_HUU;
  return "";
};

const getResidenceStatus = (trangThai?: string) => {
  const normalized = (trangThai || "").toLowerCase();
  if (normalized.includes("tam_tru") || normalized.includes("tạm trú")) {
    return "Tạm trú";
  }
  if (normalized.includes("tam_vang") || normalized.includes("tạm vắng")) {
    return "Tạm vắng";
  }
  return "Thường trú";
};

const getBienDongStatus = (nhanKhau: NhanKhau): BienDongStatus => {
  const raw =
    (nhanKhau as any).bienDong ||
    (nhanKhau as any).trangThaiBienDong ||
    (nhanKhau as any).bienDongStatus ||
    (nhanKhau as any).movementStatus ||
    nhanKhau.trangThai;
  const normalized = typeof raw === "string" ? raw.toLowerCase() : "";

  if (normalized.includes("moi_sinh") || normalized.includes("newborn")) {
    return BienDongStatus.MOI_SINH;
  }
  if (
    normalized.includes("da_chuyen_di") ||
    normalized.includes("chuyen_di") ||
    normalized.includes("chuyển đi") ||
    normalized.includes("moved")
  ) {
    return BienDongStatus.DA_CHUYEN_DI;
  }
  if (
    normalized.includes("da_qua_doi") ||
    normalized.includes("qua_doi") ||
    normalized.includes("qua đời") ||
    normalized.includes("khai_tu") ||
    normalized.includes("khai tử") ||
    normalized.includes("deceased")
  ) {
    return BienDongStatus.DA_QUA_DOI;
  }
  return BienDongStatus.BINH_THUONG;
};

const filterNhanKhauList = (list: NhanKhau[], filters: SearchFilters) => {
  const searchLower = filters.searchText?.trim().toLowerCase() || "";

  return list.filter((nhanKhau) => {
    if (searchLower) {
      const nameMatch = nhanKhau.hoTen?.toLowerCase().includes(searchLower);
      const cccdMatch = nhanKhau.cccd?.toLowerCase().includes(searchLower);
      const soHoMatch = nhanKhau.soHoKhau?.toLowerCase().includes(searchLower);
      if (!nameMatch && !cccdMatch && !soHoMatch) return false;
    }

    if (filters.ageGroup) {
      const age = calculateAge(nhanKhau.ngaySinh);
      const ageGroup = getAgeGroup(age);
      if (ageGroup !== filters.ageGroup) return false;
    }

    if (filters.gender && nhanKhau.gioiTinh !== filters.gender) {
      return false;
    }

    if (filters.residenceStatus) {
      const residenceStatus = getResidenceStatus((nhanKhau as any).trangThai);
      if (residenceStatus !== filters.residenceStatus) return false;
    }

    if (filters.movementStatus) {
      const bd = getBienDongStatus(nhanKhau);
      if (bd !== filters.movementStatus) return false;
    }

    if (filters.feedbackStatus) {
      const pending = (nhanKhau as any).pendingReportsCount ?? 0;
      if (filters.feedbackStatus === "has_new" && pending === 0) return false;
      if (filters.feedbackStatus === "no_new" && pending > 0) return false;
    }

    return true;
  });
};

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

  // Search and filter states
  const [filters, setFilters] = useState<SearchFilters>({
    searchText: "",
    ageGroup: "",
    gender: "",
    residenceStatus: "",
    movementStatus: "",
    feedbackStatus: "",
  });
  // Global search (popover) states
  const [globalQuery, setGlobalQuery] = useState<string>("");
  const [globalResults, setGlobalResults] = useState<any[]>([]);
  const [isGlobalLoading, setIsGlobalLoading] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isGlobalOpen, setIsGlobalOpen] = useState(false);
  const [highlightNhanKhauId, setHighlightNhanKhauId] = useState<number | null>(
    null
  );
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showHistoryListModal, setShowHistoryListModal] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyRecords, setHistoryRecords] = useState<any[]>([]);
  const [historyTarget, setHistoryTarget] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  // (removed searchScope - global search handled separately if needed)

  const historyFieldLabels: Record<string, string> = useMemo(
    () => ({
      hoTen: "Họ và tên",
      biDanh: "Bí danh",
      cccd: "CCCD/CMND",
      ngayCapCCCD: "Ngày cấp CCCD",
      noiCapCCCD: "Nơi cấp CCCD",
      ngaySinh: "Ngày sinh",
      gioiTinh: "Giới tính",
      noiSinh: "Nơi sinh",
      nguyenQuan: "Nguyên quán",
      danToc: "Dân tộc",
      tonGiao: "Tôn giáo",
      quocTich: "Quốc tịch",
      hoKhauId: "Hộ khẩu",
      quanHe: "Quan hệ với chủ hộ",
      ngayDangKyThuongTru: "Ngày đăng ký thường trú",
      diaChiThuongTruTruoc: "Địa chỉ thường trú trước đây",
      ngheNghiep: "Nghề nghiệp",
      noiLamViec: "Nơi làm việc",
      ghiChu: "Ghi chú",
      ghiChuHoKhau: "Ghi chú hộ khẩu",
      lyDoKhongCoCCCD: "Lý do không có CCCD",
      trangThai: "Trạng thái",
    }),
    []
  );

  const quanHeValueLabels: Record<string, string> = {
    chu_ho: "Chủ hộ",
    vo_chong: "Vợ/Chồng",
    con: "Con",
    cha_me: "Cha/Mẹ",
    anh_chi_em: "Anh/Chị/Em",
    ong_ba: "Ông/Bà",
    chau: "Cháu",
    khac: "Khác",
  };

  const formatQuanHeValue = (value: any) => {
    const key = String(value || "").toLowerCase();
    return quanHeValueLabels[key] || value;
  };

  const formatGioiTinhValue = (value: any) => {
    const key = String(value || "").toLowerCase();
    if (key === "nam") return "Nam";
    if (key === "nu") return "Nữ";
    if (key === "khac") return "Khác";
    return value;
  };

  const formatHistoryValue = (value: any, field?: string) => {
    if (value === null || value === undefined || value === "") return "(trống)";

    const tryParseJson = (v: any) => {
      if (typeof v !== "string") return null;
      const trimmed = v.trim();
      if (!trimmed) return null;
      if (!(trimmed.startsWith("{") || trimmed.startsWith("["))) return null;
      try {
        return JSON.parse(trimmed);
      } catch {
        return null;
      }
    };

    const parsed = tryParseJson(value);
    if (parsed !== null) {
      if (Array.isArray(parsed)) {
        const items = parsed
          .map((x) => {
            if (x && typeof x === "object") {
              const maybeName = (x as any).hoTen || (x as any).name;
              const maybeId = (x as any).id;
              if (maybeName && maybeId) return `${maybeName} (ID: ${maybeId})`;
              if (maybeName) return String(maybeName);
            }
            return String(x);
          })
          .filter(Boolean);
        return items.length ? items.join(", ") : "(trống)";
      }

      if (parsed && typeof parsed === "object") {
        const obj: any = parsed;
        if (obj.hoTen && obj.id) return `${obj.hoTen} (ID: ${obj.id})`;
        if (obj.hoTen) return String(obj.hoTen);
        const entries = Object.entries(obj)
          .slice(0, 6)
          .map(([k, v]) => {
            const label = historyFieldLabels[k] || k;
            const vv =
              v === null || v === undefined || String(v).trim() === ""
                ? "(trống)"
                : String(v);
            return `${label}: ${vv}`;
          });
        return entries.length ? entries.join("; ") : "(trống)";
      }
    }

    if (field === "quanHe") {
      return formatQuanHeValue(value);
    }

    if (field === "gioiTinh") {
      return formatGioiTinhValue(value);
    }

    if (field === "trangThai") {
      const key = String(value || "").toLowerCase();
      if (key === "active") return "Thường trú";
      if (key === "tam_tru") return "Tạm trú";
      if (key === "tam_vang") return "Tạm vắng";
      return value;
    }

    const dateFields = new Set([
      "ngayCapCCCD",
      "ngaySinh",
      "ngayDangKyThuongTru",
      "tuNgay",
      "denNgay",
      "ngayThucHien",
    ]);
    if (field && dateFields.has(field)) {
      try {
        const d = new Date(value);
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString("vi-VN");
        }
      } catch (e) {
        // fall through
      }
    }
    const str = String(value);
    return str.length > 200 ? str.slice(0, 200) + "..." : str;
  };

  const formatDateTime = (value?: string) => {
    if (!value) return "(không rõ)";
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    return d.toLocaleString("vi-VN");
  };

  // Filtered list
  const filteredNhanKhauList = useMemo(() => {
    return filterNhanKhauList(nhanKhauList, filters);
  }, [nhanKhauList, filters]);

  const sortedNhanKhauByUpdatedAt = useMemo(() => {
    const list = [...nhanKhauList];
    list.sort((a, b) => {
      const aTime = a.updatedAt || a.createdAt || "";
      const bTime = b.updatedAt || b.createdAt || "";
      return bTime.localeCompare(aTime);
    });
    return list;
  }, [nhanKhauList]);

  // Debounced global search effect (no household selected). Supports filter-only queries.
  useEffect(() => {
    if (selectedHoKhauId) return; // Household selected => use household list, not global search

    const q = globalQuery?.trim() || "";
    const hasFilterSelections =
      filters.ageGroup ||
      filters.gender ||
      filters.residenceStatus ||
      filters.movementStatus ||
      filters.feedbackStatus;

    if (!hasFilterSelections && q.length < 2) {
      setIsGlobalOpen(false);
      setGlobalResults([]);
      setGlobalError(null);
      setNhanKhauList([]);
      return;
    }

    setIsGlobalLoading(true);
    setGlobalError(null);
    const id = setTimeout(async () => {
      console.log("[GLOBAL SEARCH] querying:", q, "filters", {
        ...filters,
        searchText: undefined,
      });
      try {
        const resp = await apiService.searchNhanKhauGlobal(q, 100, {
          ageGroup: filters.ageGroup || undefined,
          gender: filters.gender || undefined,
          residenceStatus: filters.residenceStatus || undefined,
          movementStatus: filters.movementStatus || undefined,
          feedbackStatus: filters.feedbackStatus || undefined,
        });
        if (resp && resp.success) {
          setGlobalResults(resp.data || []);
          setIsGlobalOpen(true);
          setNhanKhauList(resp.data || []);
        } else {
          setGlobalResults([]);
          setGlobalError(resp?.error?.message || "Không có kết quả");
          setIsGlobalOpen(true);
          setNhanKhauList([]);
          showToast(resp?.error?.message || "Không có kết quả", "error");
        }
      } catch (err: any) {
        const msg =
          err?.status === 404
            ? "Chưa có API search toàn TDP"
            : err?.message || "Lỗi khi tìm kiếm toàn TDP";
        setGlobalError(msg);
        setGlobalResults([]);
        setIsGlobalOpen(true);
        setNhanKhauList([]);
        showToast(msg, "error");
      } finally {
        setIsGlobalLoading(false);
      }
    }, 300);

    return () => clearTimeout(id);
  }, [
    globalQuery,
    selectedHoKhauId,
    filters.ageGroup,
    filters.gender,
    filters.residenceStatus,
    filters.movementStatus,
    filters.feedbackStatus,
  ]);

  // Close popover on click outside or ESC
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(e.target as Node)
      ) {
        setIsGlobalOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setIsGlobalOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

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
    const normalized = String(nhanKhau.quanHe || "")
      .trim()
      .toLowerCase();
    return normalized === "chu_ho" || normalized === "chủ hộ";
  };

  const openHistoryModal = async (nhanKhauId: number, hoTen: string) => {
    setShowHistoryModal(true);
    setHistoryLoading(true);
    setHistoryError(null);
    setHistoryRecords([]);
    setHistoryTarget({ id: nhanKhauId, name: hoTen });
    try {
      const resp = await apiService.getNhanKhauHistory(nhanKhauId);
      if (resp.success) {
        setHistoryRecords(resp.data || []);
      } else {
        setHistoryError(
          (resp as any)?.error?.message || "Không tải được lịch sử"
        );
      }
    } catch (err: any) {
      setHistoryError(err?.message || "Không tải được lịch sử");
    } finally {
      setHistoryLoading(false);
    }
  };

  const closeHistoryModal = () => {
    setShowHistoryModal(false);
    setHistoryTarget(null);
    setHistoryRecords([]);
    setHistoryError(null);
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
      const householdIdParam = searchParams.get("householdId");
      if (householdIdParam) {
        const householdId = parseInt(householdIdParam);
        if (hoKhauList.some((hk) => hk.id === householdId)) {
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
        const hasChuHo = response.data.some((nk: NhanKhau) => isChuHo(nk));
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

        const hasChuHo = members.some((nk: NhanKhau) => isChuHo(nk));

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
      "cccd",
      "ngaySinh",
      "gioiTinh",
      "quanHe",
      "noiSinh",
      "nguyenQuan",
      "danToc",
      "tonGiao",
      "quocTich",
      "ngheNghiep",
      "noiLamViec",
      "ngayDangKyThuongTru",
      "diaChiThuongTruTruoc",
    ];

    const missing = requiredFields.filter(
      (key) => !normalizeField(formData[key])
    );
    if (missing.length > 0) {
      const message =
        "Vui lòng nhập đầy đủ các trường bắt buộc (Hộ khẩu, Họ tên, CCCD/CMND, Ngày sinh, Giới tính, Quan hệ, Nơi sinh, Nguyên quán, Dân tộc, Tôn giáo, Quốc tịch, Nghề nghiệp, Nơi làm việc, Ngày đăng ký thường trú, Địa chỉ thường trú trước đây)";
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
        cccd: normalizeField(formData.cccd)!,
        ngayCapCCCD: normalizeDateOnly(formData.ngayCapCCCD) || undefined,
        noiCapCCCD: normalizeField(formData.noiCapCCCD) || undefined,
        ngaySinh: normalizeDateOnly(formData.ngaySinh)!,
        gioiTinh:
          formData.gioiTinh === "nam" ||
          formData.gioiTinh === "nu" ||
          formData.gioiTinh === "khac"
            ? (formData.gioiTinh as "nam" | "nu" | "khac")
            : undefined,
        noiSinh: normalizeField(formData.noiSinh)!,
        nguyenQuan: normalizeField(formData.nguyenQuan)!,
        danToc: normalizeField(formData.danToc)!,
        tonGiao: normalizeField(formData.tonGiao)!,
        quocTich: normalizeField(formData.quocTich)!,
        quanHe: formData.quanHe as any,
        ngayDangKyThuongTru: normalizeDateOnly(formData.ngayDangKyThuongTru)!,
        diaChiThuongTruTruoc: normalizeField(formData.diaChiThuongTruTruoc)!,
        ngheNghiep: normalizeField(formData.ngheNghiep)!,
        noiLamViec: normalizeField(formData.noiLamViec)!,
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

  // openViewNhanKhau removed (not used) — viewing handled via modal controls

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
        ngayDangKyThuongTru:
          normalizeDateOnly(viewForm.ngayDangKyThuongTru) || undefined,
        diaChiThuongTruTruoc:
          normalizeField(viewForm.diaChiThuongTruTruoc) || undefined,
        ngheNghiep: normalizeField(viewForm.ngheNghiep) || undefined,
        noiLamViec: normalizeField(viewForm.noiLamViec) || undefined,
        ghiChu: normalizeField(viewForm.ghiChu) || undefined,
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

  const openViewNhanKhau = async (id: number) => {
    console.log("[UI] openViewNhanKhau", id);
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
          ngayCapCCCD: formatDateForInput
            ? formatDateForInput(nk.ngayCapCCCD)
            : nk.ngayCapCCCD || "",
          noiCapCCCD: nk.noiCapCCCD || "",
          ngaySinh: formatDateForInput
            ? formatDateForInput(nk.ngaySinh)
            : nk.ngaySinh || "",
          gioiTinh: nk.gioiTinh || "",
          noiSinh: nk.noiSinh || "",
          nguyenQuan: nk.nguyenQuan || "",
          danToc: nk.danToc || "",
          tonGiao: nk.tonGiao || "",
          quocTich: nk.quocTich || "Việt Nam",
          quanHe: nk.quanHe || "",
          ngayDangKyThuongTru: formatDateForInput
            ? formatDateForInput(nk.ngayDangKyThuongTru)
            : nk.ngayDangKyThuongTru || "",
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
            <div>{toast.message}</div>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* History list modal (tổng hợp) */}
      {showHistoryListModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-3xl rounded-xl border border-gray-200 bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Nhân khẩu có thay đổi gần đây
                </h2>
                <p className="text-sm text-gray-500">
                  Chọn một nhân khẩu để xem lịch sử chi tiết
                </p>
              </div>
              <button
                onClick={() => setShowHistoryListModal(false)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {sortedNhanKhauByUpdatedAt.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-4 text-center text-sm text-gray-600">
                Chưa có nhân khẩu nào.
              </div>
            ) : (
              <div className="space-y-2">
                {sortedNhanKhauByUpdatedAt.map((nk) => (
                  <div
                    key={nk.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2 hover:border-blue-300 hover:bg-blue-50/60 transition"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-gray-900 truncate">
                        {nk.hoTen}
                        {isChuHo(nk) && (
                          <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                            Chủ hộ
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-600 truncate">
                        Quan hệ: {formatQuanHeValue(nk.quanHe)}
                      </div>
                      <div className="text-xs text-gray-600 truncate">
                        Thay đổi gần nhất:{" "}
                        {formatDateTime(nk.updatedAt || nk.createdAt)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setShowHistoryListModal(false);
                          openHistoryModal(nk.id, nk.hoTen);
                        }}
                        className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 hover:border-blue-300 hover:text-blue-600"
                      >
                        Xem lịch sử
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {showViewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-3xl rounded-xl border border-gray-200 bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                Thông tin nhân khẩu
              </h2>
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

            {viewLoading || !viewingNhanKhau ? (
              <div className="p-4 text-center text-gray-500">Đang tải...</div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleUpdateNhanKhau(viewingNhanKhau.id);
                }}
                className="space-y-4"
              >
                <div className="grid grid-cols-3 gap-4">
                  <label className="block text-sm font-medium text-gray-700">
                    Họ và tên <span className="text-red-500">*</span>
                    <input
                      type="text"
                      value={viewForm.hoTen}
                      onChange={(e) =>
                        setViewForm({ ...viewForm, hoTen: e.target.value })
                      }
                      className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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
                        const isCurrentChuHo = viewingNhanKhau
                          ? isChuHo(viewingNhanKhau)
                          : false;
                        const disabledChuHo =
                          isChuHoOption &&
                          !isCurrentChuHo &&
                          selectedHoKhauId !== null &&
                          hoKhauHeadStatus[selectedHoKhauId];
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

      {/* History modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-3xl rounded-xl border border-gray-200 bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Lịch sử thay đổi nhân khẩu
                </h2>
                {historyTarget && (
                  <p className="text-sm text-gray-500">
                    Nhân khẩu: {historyTarget.name} (ID {historyTarget.id})
                  </p>
                )}
              </div>
              <button
                onClick={closeHistoryModal}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {historyError && (
              <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {historyError}
              </div>
            )}

            {historyLoading ? (
              <div className="p-4 text-center text-gray-500">
                Đang tải lịch sử...
              </div>
            ) : historyRecords.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-4 text-center text-sm text-gray-600">
                Chưa có lịch sử thay đổi.
              </div>
            ) : (
              <div className="max-h-[60vh] overflow-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                        Thời gian
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                        Hành động
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                        Thông tin
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                        Giá trị cũ
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                        Giá trị mới
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                        Người thực hiện
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {historyRecords.map((item) => {
                      const actionLabel =
                        item.hanhDong === "create"
                          ? "Tạo mới"
                          : item.hanhDong === "update"
                          ? "Cập nhật"
                          : item.hanhDong === "delete"
                          ? "Xóa"
                          : item.hanhDong;
                      const fieldLabel = item.truong
                        ? historyFieldLabels[item.truong] || item.truong
                        : actionLabel === "Tạo mới"
                        ? "(toàn bộ bản ghi)"
                        : "(không rõ)";
                      return (
                        <tr key={item.id} className="align-top">
                          <td className="px-3 py-2 text-sm text-gray-700">
                            {item.createdAt
                              ? new Date(item.createdAt).toLocaleString("vi-VN")
                              : ""}
                          </td>
                          <td className="px-3 py-2 text-sm font-semibold text-gray-800">
                            {actionLabel}
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-700">
                            {fieldLabel}
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-600 whitespace-pre-wrap">
                            {actionLabel === "Tạo mới"
                              ? ""
                              : formatHistoryValue(item.noiDungCu, item.truong)}
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-600 whitespace-pre-wrap">
                            {actionLabel === "Tạo mới"
                              ? ""
                              : formatHistoryValue(
                                  item.noiDungMoi,
                                  item.truong
                                )}
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-700">
                            {item.nguoiThucHienName ||
                              (item.nguoiThucHien
                                ? `#${item.nguoiThucHien}`
                                : "(không rõ)")}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Header với Select Hộ khẩu và Actions */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Quản lý Nhân khẩu
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (!selectedHoKhauId) {
                  showToast("Vui lòng chọn hộ khẩu trước", "error");
                  return;
                }
                setFormData({
                  ...formData,
                  hoKhauId: String(selectedHoKhauId),
                });
                setShowCreateForm(true);
              }}
              className="rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-1.5 text-sm font-semibold text-white shadow-md transition hover:shadow-lg hover:-translate-y-0.5"
            >
              + Thêm nhân khẩu
            </button>
            <button
              onClick={() => {
                setShowHistoryListModal(true);
              }}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              📋 Xem lịch sử thay đổi
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Chọn hộ khẩu
            </label>
            <select
              value={selectedHoKhauId ?? ""}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedHoKhauId(val ? Number(val) : null);
              }}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="">Chọn hộ khẩu</option>
              {hoKhauList.map((hk) => (
                <option key={hk.id} value={hk.id}>
                  {hk.soHoKhau} - {hk.diaChi} (
                  {hk.trangThai === "active"
                    ? "Đã kích hoạt"
                    : "Chưa kích hoạt"}
                  )
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Advanced Filter Card (prominent) */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm mt-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-800">
            Bộ lọc tìm kiếm nâng cao
          </h3>
          <div className="flex items-center gap-2">
            <button
              className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-1 text-sm text-gray-700 hover:bg-gray-50"
              onClick={() => {
                showToast("Xuất báo cáo (chức năng demo)", "success");
              }}
            >
              📤 Xuất báo cáo
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <div className="md:col-span-2">
            <input
              type="text"
              placeholder="Tìm theo họ tên, CCCD..."
              ref={searchInputRef}
              value={globalQuery}
              onChange={(e) => {
                const v = e.target.value;
                setFilters({ ...filters, searchText: v });
                setGlobalQuery(v);
              }}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() =>
                setFilters({
                  searchText: "",
                  ageGroup: "",
                  gender: "",
                  residenceStatus: "",
                  movementStatus: "",
                  feedbackStatus: "",
                })
              }
              className="rounded-md bg-white border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Xoá lọc
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 relative">
          <select
            value={filters.ageGroup}
            onChange={(e) =>
              setFilters({ ...filters, ageGroup: e.target.value })
            }
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">Độ tuổi: Tất cả</option>
            <option value={AgeGroup.MAM_NON}>Mầm non (3-5)</option>
            <option value={AgeGroup.CAP_1}>Cấp 1 (6-10)</option>
            <option value={AgeGroup.CAP_2}>Cấp 2 (11-14)</option>
            <option value={AgeGroup.CAP_3}>Cấp 3 (15-17)</option>
            <option value={AgeGroup.LAO_DONG}>Lao động (18-59)</option>
            <option value={AgeGroup.NGHI_HUU}>Nghỉ hưu (≥60)</option>
          </select>

          <select
            value={filters.gender}
            onChange={(e) => setFilters({ ...filters, gender: e.target.value })}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">Giới tính: Tất cả</option>
            <option value="nam">Nam</option>
            <option value="nu">Nữ</option>
            <option value="khac">Khác</option>
          </select>

          <select
            value={filters.residenceStatus}
            onChange={(e) =>
              setFilters({ ...filters, residenceStatus: e.target.value })
            }
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">Trạng thái cư trú: Tất cả</option>
            <option value="Thường trú">Thường trú</option>
            <option value="Tạm trú">Tạm trú</option>
            <option value="Tạm vắng">Tạm vắng</option>
          </select>

          <select
            value={filters.movementStatus}
            onChange={(e) =>
              setFilters({ ...filters, movementStatus: e.target.value })
            }
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">Biến động: Tất cả</option>
            <option value={BienDongStatus.MOI_SINH}>Mới sinh</option>
            <option value={BienDongStatus.DA_CHUYEN_DI}>Đã chuyển đi</option>
            <option value={BienDongStatus.DA_QUA_DOI}>Đã qua đời</option>
            <option value={BienDongStatus.BINH_THUONG}>Bình thường</option>
          </select>

          <select
            value={filters.feedbackStatus}
            onChange={(e) =>
              setFilters({ ...filters, feedbackStatus: e.target.value })
            }
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">Phản ánh: Tất cả</option>
            <option value="has_new">Có phản ánh mới</option>
            <option value="no_new">Không có phản ánh mới</option>
          </select>
        </div>

        <div className="mt-3 text-sm text-gray-600">
          Đang lọc:{" "}
          <span className="font-semibold">{filteredNhanKhauList.length}</span>{" "}
          kết quả / Tổng{" "}
          <span className="font-semibold">{nhanKhauList.length}</span>
        </div>
        {/* Global search popover */}
        {isGlobalOpen && (
          <div
            ref={popoverRef}
            className="absolute left-0 right-0 mt-2 z-50 rounded-md border border-gray-200 bg-white shadow-lg p-3 max-h-64 overflow-y-auto"
            style={{ top: "110%" }}
          >
            {isGlobalLoading ? (
              <div className="text-sm text-gray-500">Đang tìm kiếm...</div>
            ) : globalError ? (
              <div className="text-sm text-red-500">{globalError}</div>
            ) : globalResults.length === 0 ? (
              <div className="text-sm text-gray-500">
                Không tìm thấy kết quả
              </div>
            ) : (
              <ul className="space-y-2">
                {globalResults.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between rounded-md p-2 hover:bg-gray-50 cursor-pointer"
                    onClick={() => {
                      // Set household and load members
                      setSelectedHoKhauId(r.hoKhauId);
                      loadNhanKhauList(r.hoKhauId);
                      setIsGlobalOpen(false);
                      // highlight the selected person after a short delay (after list loads)
                      setTimeout(() => {
                        setHighlightNhanKhauId(r.id);
                        const tr = document.querySelector(
                          `[data-nk-id='${r.id}']`
                        );
                        if (tr)
                          (tr as HTMLElement).scrollIntoView({
                            behavior: "smooth",
                            block: "center",
                          });
                        setTimeout(() => setHighlightNhanKhauId(null), 3000);
                      }, 500);
                    }}
                  >
                    <div>
                      <div className="font-medium text-gray-900">{r.hoTen}</div>
                      <div className="text-xs text-gray-500">
                        {r.cccd || "-"}
                      </div>
                    </div>
                    <div className="text-xs text-gray-600 text-right">
                      <div className="font-medium">
                        {r.soHoKhau || r.hoKhauId}
                      </div>
                      <div>
                        {r.diaChi ? String(r.diaChi).slice(0, 40) : "-"}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
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
                  CCCD/CMND <span className="text-red-500">*</span>
                  <input
                    type="text"
                    required
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
                  Ngày đăng ký thường trú{" "}
                  <span className="text-red-500">*</span>
                  <input
                    type="date"
                    required
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
                    required
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
                    required
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
                    required
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
                    required
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
                    required
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
                    required
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
                    required
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
                Địa chỉ thường trú trước đây{" "}
                <span className="text-red-500">*</span>
                <textarea
                  required
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
                  Nghề nghiệp <span className="text-red-500">*</span>
                  <input
                    type="text"
                    required
                    value={formData.ngheNghiep}
                    onChange={(e) =>
                      setFormData({ ...formData, ngheNghiep: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </label>

                <label className="block text-sm font-medium text-gray-700">
                  Nơi làm việc <span className="text-red-500">*</span>
                  <input
                    type="text"
                    required
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
                  placeholder="Thông tin bổ sung nếu có..."
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

            {sortedNhanKhauList.filter((nk) => nk.quanHe !== "chu_ho")
              .length === 0 && (
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
            Danh sách nhân khẩu ({filteredNhanKhauList.length})
            {selectedHoKhau && (
              <span className="ml-2 text-sm font-normal text-gray-500">
                - Hộ khẩu: {selectedHoKhau.soHoKhau}
              </span>
            )}
            {filteredNhanKhauList.length !== nhanKhauList.length && (
              <span className="ml-2 text-xs font-normal text-blue-600 bg-blue-50 px-2 py-1 rounded">
                Đã lọc: {filteredNhanKhauList.length}/{nhanKhauList.length}
              </span>
            )}
          </h2>
        </div>

        {isLoading && nhanKhauList.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Đang tải...</div>
        ) : selectedHoKhauId === null && nhanKhauList.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Vui lòng chọn hộ khẩu hoặc nhập tìm kiếm để xem nhân khẩu
          </div>
        ) : selectedHoKhauId !== null && nhanKhauList.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Chưa có nhân khẩu nào trong hộ khẩu này. Hãy thêm nhân khẩu mới!
          </div>
        ) : filteredNhanKhauList.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Không tìm thấy nhân khẩu nào phù hợp với bộ lọc.
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
                    Số hộ khẩu
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                    CCCD
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Giới tính
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Ngày sinh
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Độ tuổi
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Quan hệ
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Cư trú
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Biến động
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Phản ánh
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredNhanKhauList.map((nk) => (
                  <tr
                    key={nk.id}
                    className={`hover:bg-gray-50 ${
                      isChuHo(nk) ? "bg-blue-50/50" : ""
                    }`}
                    data-nk-id={nk.id}
                    style={
                      highlightNhanKhauId === nk.id
                        ? { backgroundColor: "#fff7d6" }
                        : undefined
                    }
                  >
                    {/* Họ tên */}
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {nk.hoTen}
                      {isChuHo(nk) && (
                        <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                          Chủ hộ
                        </span>
                      )}
                    </td>

                    {/* Số hộ khẩu */}
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {nk.soHoKhau ||
                        hoKhauList.find((hk) => hk.id === nk.hoKhauId)
                          ?.soHoKhau ||
                        "-"}
                    </td>

                    {/* CCCD */}
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {nk.cccd || "-"}
                    </td>

                    {/* Giới tính */}
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {nk.gioiTinh === "nam"
                        ? "Nam"
                        : nk.gioiTinh === "nu"
                        ? "Nữ"
                        : nk.gioiTinh === "khac"
                        ? "Khác"
                        : "-"}
                    </td>

                    {/* Ngày sinh */}
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {nk.ngaySinh ? formatFromYMD(nk.ngaySinh) : "-"}
                    </td>

                    {/* Độ tuổi */}
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {nk.ngaySinh ? `${calculateAge(nk.ngaySinh)} tuổi` : "-"}
                    </td>

                    {/* Quan hệ */}
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {quanHeOptions.find((opt) => opt.value === nk.quanHe)
                        ?.label || nk.quanHe}
                    </td>

                    {/* Trạng thái cư trú */}
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {((nk as any).residentStatus === "tam_tru" &&
                        "Tạm trú") ||
                        ((nk as any).residentStatus === "tam_vang" &&
                          "Tạm vắng") ||
                        "Thường trú"}
                    </td>

                    {/* Biến động */}
                    <td className="px-4 py-3 text-sm">
                      {(() => {
                        const status = getBienDongStatus(nk);
                        const statusLabels = {
                          [BienDongStatus.MOI_SINH]: {
                            text: "Mới sinh",
                            color: "bg-green-100 text-green-700",
                          },
                          [BienDongStatus.DA_CHUYEN_DI]: {
                            text: "Đã chuyển đi",
                            color: "bg-red-100 text-red-700",
                          },
                          [BienDongStatus.DA_QUA_DOI]: {
                            text: "Đã qua đời",
                            color: "bg-gray-100 text-gray-700",
                          },
                          [BienDongStatus.BINH_THUONG]: {
                            text: "Bình thường",
                            color: "bg-blue-100 text-blue-700",
                          },
                        };
                        const label = statusLabels[status];
                        return (
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${label.color}`}
                          >
                            {label.text}
                          </span>
                        );
                      })()}
                    </td>

                    {/* Phản ánh */}
                    <td className="px-4 py-3 text-center">
                      {(() => {
                        const total = (nk as any).totalReportsCount ?? 0;
                        const pending = (nk as any).pendingReportsCount ?? 0;
                        if (total <= 0) {
                          return (
                            <span className="text-xs text-gray-400">0</span>
                          );
                        }

                        return (
                          <div className="inline-flex items-center gap-1">
                            <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                              {total}
                            </span>
                            {pending > 0 && (
                              <span
                                className="inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-semibold text-orange-700"
                                title="Số phản ánh đang chờ/đang xử lý"
                              >
                                {pending}
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </td>

                    {/* Thao tác */}
                    <td className="px-4 py-3 text-right text-sm text-gray-600 space-x-1">
                      <button
                        type="button"
                        onClick={() => openViewNhanKhau(nk.id)}
                        className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-700 hover:border-orange-300 hover:text-orange-600"
                        title="Ghi nhận phản ánh"
                      >
                        👁️ Xem
                      </button>
                      <button
                        onClick={() => openHistoryModal(nk.id, nk.hoTen)}
                        className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-700 hover:border-blue-300 hover:text-blue-600"
                        title="Xem lịch sử"
                      >
                        📋 Lịch sử
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
