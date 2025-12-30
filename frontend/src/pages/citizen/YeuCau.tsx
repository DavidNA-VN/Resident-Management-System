import { useState, useEffect, FormEvent } from "react";
import RequestModal, { RequestType } from "../../components/RequestModal.tsx";
import SplitHouseholdRequestModal, {
  SplitHouseholdRequestData,
} from "../../components/SplitHouseholdRequestModal.tsx";
import { apiService } from "../../services/api";

interface NhanKhau {
  id: number;
  hoTen: string;
  cccd?: string;
  ngayCapCCCD?: string;
  noiCapCCCD?: string;
  quanHe: string;
}

interface Household {
  id: number;
  soHoKhau: string;
  diaChi: string;
  diaChiDayDu?: string;
  chuHo?: {
    id?: number;
    hoTen: string;
    cccd?: string;
  };
}

interface Request {
  id: number;
  type: string;
  status: string;
  rejectionReason?: string;
  createdAt: string;
  reviewedAt?: string;
  payload: any;
}

const requestTypeLabels: Record<string, string> = {
  ADD_PERSON: "Thêm nhân khẩu",
  ADD_NEWBORN: "Thêm con sơ sinh",
  TAM_VANG: "Xin tạm vắng",
  TAM_TRU: "Xin tạm trú",
  TACH_HO_KHAU: "Yêu cầu tách hộ khẩu",
  SUA_NHAN_KHAU: "Sửa thông tin nhân khẩu",
  XOA_NHAN_KHAU: "Xoá nhân khẩu",
  UPDATE_PERSON: "Sửa thông tin nhân khẩu",
  REMOVE_PERSON: "Xoá nhân khẩu",
  SPLIT_HOUSEHOLD: "Yêu cầu tách hộ khẩu",
  DECEASED: "Xác nhận qua đời",
  MOVE_OUT: "Xác nhận chuyển đi",
  TEMPORARY_RESIDENCE: "Xin tạm trú",
  TEMPORARY_ABSENCE: "Xin tạm vắng",
};

const statusLabels: Record<string, string> = {
  PENDING: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Từ chối",
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Từ chối",
  processing: "Đang xử lý",
};

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  processing: "bg-blue-100 text-blue-700",
};

export default function YeuCau() {
  const [selectedType, setSelectedType] = useState<
    | RequestType
    | "TACH_HO_KHAU"
    | "ADD_NEWBORN"
    | "ADD_PERSON"
    | "DECEASED"
    | "MOVE_OUT"
    | null
  >(null);
  const [showAddNewbornModal, setShowAddNewbornModal] = useState(false);
  const [showAddPersonModal, setShowAddPersonModal] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [nhanKhauList, setNhanKhauList] = useState<NhanKhau[]>([]);
  const [householdInfo, setHouseholdInfo] = useState<Household | null>(null);
  const [households, setHouseholds] = useState<any[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHousehold, setIsLoadingHousehold] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const currentPersonId = userInfo?.personInfo?.personId;

  const formatDateTimeVi = (value: any) => {
    if (!value) return "-";
    const d = new Date(value);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDateVi = (value: any) => {
    if (!value) return "-";
    const d = new Date(value);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("vi-VN");
  };

  const inferredIsHeadFromMembers =
    currentPersonId !== undefined &&
    currentPersonId !== null &&
    nhanKhauList.some(
      (nk) =>
        Number(nk.id) === Number(currentPersonId) &&
        String(nk.quanHe).toLowerCase() === "chu_ho"
    );

  const inferredIsHeadFromHousehold =
    householdInfo?.chuHo?.id !== undefined &&
    householdInfo?.chuHo?.id !== null &&
    currentPersonId !== undefined &&
    currentPersonId !== null &&
    Number(householdInfo.chuHo.id) === Number(currentPersonId);

  const isHeadOfHousehold =
    userInfo?.personInfo?.isHeadOfHousehold === true ||
    inferredIsHeadFromHousehold ||
    inferredIsHeadFromMembers;

  useEffect(() => {
    loadUserInfo();
    loadHouseholdData();
    loadHouseholds();
    loadRequests();
  }, []);

  const loadUserInfo = async () => {
    try {
      const response = await apiService.getMe();
      if (response.success) {
        setUserInfo(response.data);
      }
    } catch (err) {
      console.error("Lỗi khi tải thông tin user:", err);
    }
  };

  const loadHouseholds = async () => {
    try {
      // Prefer backend endpoint that returns households related to this user
      const response = await apiService.getMyHouseholds();
      if (response.success) {
        setHouseholds(response.data || []);
      } else {
        // If backend indicates not linked, fall back to empty list and keep UI informative
        console.warn("getMyHouseholds:", response.error?.message || "no data");
        setHouseholds([]);
      }
    } catch (err) {
      console.error("Lỗi khi tải danh sách hộ khẩu:", err);
    }
  };

  // Load household data khi mở các modal cần hộ khẩu (tạm trú/vắng, tách hộ, thêm con sơ sinh, thêm nhân khẩu)
  useEffect(() => {
    const needsHousehold = [
      "TACH_HO_KHAU",
      "ADD_NEWBORN",
      "ADD_PERSON",
      "TAM_TRU",
      "TAM_VANG",
      "DECEASED",
      "MOVE_OUT",
    ];

    if (selectedType && needsHousehold.includes(selectedType) && !householdInfo) {
      loadHouseholdData();
    }
  }, [selectedType, householdInfo]);

  const loadHouseholdData = async () => {
    setIsLoadingHousehold(true);
    try {
      // TODO: Thay bằng getMyHousehold() khi backend có endpoint /citizen/my-household
      const response = await apiService.getMyHousehold();
      if (response.success && response.data) {
        // Adapt data structure (backend may return different shapes)
        const data: any = response.data;
        const householdData = data?.hoKhau || data?.household || null;
        const members = (data?.nhanKhauList || data?.members || []) as any[];

        if (!householdData || !householdData.id) {
          console.warn("getMyHousehold: missing household payload", data);
          setHouseholdInfo(null);
          setNhanKhauList([]);
          return;
        }

        setNhanKhauList(
          members.map((nk: any) => ({
            id: nk.id,
            hoTen: nk.hoTen,
            cccd: nk.cccd,
            ngayCapCCCD: nk.ngayCapCCCD,
            noiCapCCCD: nk.noiCapCCCD,
            quanHe: nk.quanHe,
          }))
        );
        setHouseholdInfo({
          id: householdData.id,
          soHoKhau: householdData.soHoKhau,
          diaChi: householdData.diaChi,
          diaChiDayDu: householdData.diaChiDayDu,
          chuHo: householdData.chuHo || data?.chuHo,
        });
      }
    } catch (err) {
      console.error("Failed to load household data:", err);
    } finally {
      setIsLoadingHousehold(false);
    }
  };

  const loadRequests = async () => {
    setIsLoading(true);
    try {
      const response = await apiService.getMyRequests();
      if (response.success) {
        setRequests(response.data || []);
      }
    } catch (err) {
      console.error("Failed to load requests:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitRequest = async (data: { type: string; payload: any }) => {
    if (!isHeadOfHousehold) {
      throw new Error("Chỉ chủ hộ mới được phép tạo yêu cầu.");
    }
    // Map UI type to backend enum
    const typeMapping: Record<string, string> = {
      TAM_TRU: "TEMPORARY_RESIDENCE",
      TAM_VANG: "TEMPORARY_ABSENCE",
      TACH_HO_KHAU: "SPLIT_HOUSEHOLD",
      SUA_NHAN_KHAU: "UPDATE_PERSON",
      DECEASED: "DECEASED",
      MOVE_OUT: "MOVE_OUT",
    };

    const backendType = typeMapping[data.type] || data.type;

    const targetPersonId =
      data.payload?.nhanKhauId || data.payload?.targetPersonId || null;

    const response = await apiService.createRequest({
      type: backendType,
      payload: data.payload,
      targetHouseholdId:
        backendType === "TEMPORARY_RESIDENCE" ||
        backendType === "TEMPORARY_ABSENCE"
          ? householdInfo?.id
          : undefined,
      targetPersonId:
        backendType === "TEMPORARY_RESIDENCE" ||
        backendType === "TEMPORARY_ABSENCE" ||
        backendType === "DECEASED" ||
        backendType === "MOVE_OUT" ||
        backendType === "UPDATE_PERSON"
          ? targetPersonId || undefined
          : undefined,
    });
    if (response.success) {
      setSuccess("Gửi yêu cầu thành công!");
      setTimeout(() => setSuccess(null), 3000);
      loadRequests();
    } else {
      throw new Error(
        (response as any)?.error?.message || "Gửi yêu cầu thất bại"
      );
    }
  };

  const handleSubmitSplitHousehold = async (
    data: SplitHouseholdRequestData
  ) => {
    if (!isHeadOfHousehold) {
      throw new Error("Chỉ chủ hộ mới được phép tạo yêu cầu.");
    }
    try {
      // TODO: Thay bằng createSplitHouseholdRequest() khi backend có endpoint /citizen/requests/split-household
      const response = await apiService.createSplitHouseholdRequest(data);
      if (response.success) {
        setSuccess("Gửi yêu cầu tách hộ khẩu thành công!");
        setTimeout(() => setSuccess(null), 3000);
        loadRequests();
      } else {
        throw new Error(
          (response as any)?.error?.message || "Gửi yêu cầu thất bại"
        );
      }
    } catch (err: any) {
      throw err;
    }
  };

  const handleSubmitAddNewborn = async (data: any) => {
    if (!isHeadOfHousehold) {
      throw new Error("Chỉ chủ hộ mới được phép tạo yêu cầu.");
    }
    try {
      const payload = {
        type: "ADD_NEWBORN",
        targetHouseholdId: data.householdId
          ? Number(data.householdId)
          : householdInfo?.id,
        payload: {
          newborn: {
            hoTen: data.hoTen,
            ngaySinh: data.ngaySinh,
            gioiTinh: data.gioiTinh,
            noiSinh: data.noiSinh,
            nguyenQuan: data.nguyenQuan || undefined,
            danToc: data.danToc || undefined,
            tonGiao: data.tonGiao || undefined,
            quocTich: data.quocTich || undefined,
            cccd: data.cccd || undefined,
            ghiChu: data.ghiChu || undefined,
            isMoiSinh: true,
          },
        },
      };

      const response = await apiService.createRequest(payload);
      if (response.success) {
        setSuccess("Gửi yêu cầu thêm con sơ sinh thành công!");
        setTimeout(() => setSuccess(null), 3000);
        loadRequests();
        setShowAddNewbornModal(false);
      } else {
        throw new Error(
          (response as any)?.error?.message || "Gửi yêu cầu thất bại"
        );
      }
    } catch (err: any) {
      throw err;
    }
  };

  const handleSubmitAddPerson = async (data: any) => {
    if (!isHeadOfHousehold) {
      throw new Error("Chỉ chủ hộ mới được phép tạo yêu cầu.");
    }
    try {
      const requiredFields = [
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
        (k) => !String(data?.[k] ?? "").trim()
      );
      if (missing.length > 0) {
        throw new Error(
          "Vui lòng nhập đầy đủ các trường bắt buộc (trừ Ghi chú) trước khi gửi yêu cầu."
        );
      }

      const payload: any = {
        type: "ADD_PERSON",
        payload: {
          person: {
            hoTen: String(data.hoTen).trim(),
            cccd: String(data.cccd).trim(),
            ngaySinh: data.ngaySinh,
            gioiTinh: data.gioiTinh,
            noiSinh: String(data.noiSinh).trim(),
            nguyenQuan: String(data.nguyenQuan).trim(),
            danToc: String(data.danToc).trim(),
            tonGiao: String(data.tonGiao).trim(),
            quocTich: String(data.quocTich).trim() || "Việt Nam",
            quanHe: data.quanHe,
            ngayDangKyThuongTru: data.ngayDangKyThuongTru,
            diaChiThuongTruTruoc: String(data.diaChiThuongTruTruoc).trim(),
            ngheNghiep: String(data.ngheNghiep).trim(),
            noiLamViec: String(data.noiLamViec).trim(),
            ghiChu: data.ghiChu || undefined,
          },
        },
      };

      const resolvedHouseholdId =
        (data.householdId && data.householdId !== ""
          ? parseInt(data.householdId, 10)
          : householdInfo?.id) || null;

      if (resolvedHouseholdId) {
        payload.targetHouseholdId = resolvedHouseholdId;
      }

      // Always include quanHe for add-person request

      const response = await apiService.createRequest(payload);
      if (response.success) {
        setSuccess("Gửi yêu cầu thêm nhân khẩu thành công!");
        setTimeout(() => setSuccess(null), 3000);
        loadRequests();
        setShowAddPersonModal(false);
      } else {
        throw new Error(
          (response as any)?.error?.message || "Gửi yêu cầu thất bại"
        );
      }
    } catch (err: any) {
      throw err;
    }
  };

  const requestTypes: Array<{
    type:
      | RequestType
      | "TACH_HO_KHAU"
      | "ADD_NEWBORN"
      | "ADD_PERSON";
    label: string;
    icon: string;
  }> = [
    { type: "ADD_PERSON", label: "Thêm nhân khẩu", icon: "👤" },
    { type: "ADD_NEWBORN", label: "Thêm con sơ sinh", icon: "👶" },
    { type: "TAM_VANG", label: "Xin tạm vắng", icon: "📍" },
    { type: "TAM_TRU", label: "Xin tạm trú", icon: "🏠" },
    { type: "MOVE_OUT", label: "Xác nhận chuyển đi", icon: "🚚" },
    { type: "DECEASED", label: "Xác nhận qua đời", icon: "🕯️" },
    { type: "TACH_HO_KHAU", label: "Yêu cầu tách hộ khẩu", icon: "🔄" },
    { type: "SUA_NHAN_KHAU", label: "Sửa thông tin nhân khẩu", icon: "✏️" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-blue-200/60 bg-gradient-to-r from-blue-50 via-cyan-50 to-teal-50 p-6 shadow-sm backdrop-blur-sm">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
          Tạo yêu cầu
        </h1>
        <p className="mt-2 text-gray-600">
          Chọn loại yêu cầu bạn muốn gửi đến tổ dân phố
        </p>
      </div>

      {!isHeadOfHousehold && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">
          Chỉ tài khoản chủ hộ mới được gửi yêu cầu. Vui lòng đăng nhập bằng tài
          khoản của chủ hộ hộ khẩu.
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-green-700">
          {success}
        </div>
      )}

      {/* Request Type Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {requestTypes.map((item) => (
          <button
            key={item.type}
            onClick={() => {
              if (!isHeadOfHousehold) return;
              if (item.type === "ADD_NEWBORN") {
                setShowAddNewbornModal(true);
              } else if (item.type === "ADD_PERSON") {
                setShowAddPersonModal(true);
              } else {
                setSelectedType(item.type);
              }
            }}
            disabled={!isHeadOfHousehold}
            title={
              isHeadOfHousehold ? undefined : "Chỉ chủ hộ được phép tạo yêu cầu"
            }
            className="rounded-xl border border-gray-200/80 bg-white p-6 shadow-sm hover:shadow-lg hover:border-blue-300 transition-all duration-300 hover:-translate-y-1 text-left group disabled:cursor-not-allowed disabled:opacity-60"
          >
            <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">
              {item.icon}
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {item.label}
            </h3>
            <p className="text-sm text-gray-500">Nhấn để tạo yêu cầu mới</p>
          </button>
        ))}
      </div>

      {/* My Requests */}
      <div className="rounded-xl border border-gray-200/80 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <span>📋</span>
          Yêu cầu của tôi
        </h2>
        {isLoading ? (
          <div className="text-center py-8">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
            <p className="mt-2 text-gray-600">Đang tải...</p>
          </div>
        ) : requests.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            Bạn chưa có yêu cầu nào.
          </p>
        ) : (
          <div className="space-y-3">
            {requests.map((request) => (
              <div
                key={request.id}
                className="rounded-lg border border-gray-200 bg-gray-50 p-4 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 mb-1">
                      {requestTypeLabels[request.type] || request.type}
                    </h4>
                    <p className="text-sm text-gray-600 mb-2">
                      Ngày gửi:{" "}
                      {formatDateTimeVi(request.createdAt)}
                    </p>
                    {request.payload?.lyDo && (
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">Lý do:</span>{" "}
                        {request.payload.lyDo}
                      </p>
                    )}
                    {request.status === "REJECTED" &&
                      request.rejectionReason && (
                        <p className="text-sm text-red-700">
                          <span className="font-medium">Lý do từ chối:</span>{" "}
                          {request.rejectionReason}
                        </p>
                      )}
                    {request.status === "APPROVED" && request.reviewedAt && (
                      <p className="text-sm text-green-700">
                        <span className="font-medium">Đã duyệt:</span>{" "}
                        {formatDateVi(request.reviewedAt)}
                      </p>
                    )}
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                      statusColors[request.status] ||
                      "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {statusLabels[request.status] || request.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal cho các yêu cầu thông thường */}
      <RequestModal
        isOpen={selectedType !== null && selectedType !== "TACH_HO_KHAU"}
        type={
          selectedType && selectedType !== "TACH_HO_KHAU" ? selectedType : null
        }
        onClose={() => setSelectedType(null)}
        onSubmit={handleSubmitRequest}
        nhanKhauList={nhanKhauList.map((nk) => ({
          id: nk.id,
          hoTen: nk.hoTen,
          cccd: nk.cccd,
          ngayCapCCCD: nk.ngayCapCCCD,
          noiCapCCCD: nk.noiCapCCCD,
        }))}
        householdInfo={
          householdInfo
            ? {
                soHoKhau: householdInfo.soHoKhau,
                diaChi: householdInfo.diaChiDayDu || householdInfo.diaChi,
              }
            : undefined
        }
      />

      {/* Modal riêng cho tách hộ khẩu */}
      <SplitHouseholdRequestModal
        isOpen={selectedType === "TACH_HO_KHAU"}
        onClose={() => setSelectedType(null)}
        onSubmit={handleSubmitSplitHousehold}
        household={householdInfo}
        nhanKhauList={nhanKhauList}
        isLoading={isLoadingHousehold}
      />

      {/* Modal thêm con sơ sinh */}
      {showAddNewbornModal && (
        <AddNewbornModal
          isOpen={showAddNewbornModal}
          onClose={() => setShowAddNewbornModal(false)}
          onSubmit={handleSubmitAddNewborn}
          householdInfo={householdInfo}
        />
      )}

      {/* Modal thêm nhân khẩu */}
      {showAddPersonModal && (
        <AddPersonModal
          isOpen={showAddPersonModal}
          onClose={() => setShowAddPersonModal(false)}
          onSubmit={handleSubmitAddPerson}
          householdInfo={householdInfo}
          userInfo={userInfo}
          households={households}
        />
      )}
    </div>
  );
}

// Modal thêm nhân khẩu
interface AddPersonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  householdInfo: Household | null;
  userInfo: any;
  households: any[];
}

function AddPersonModal({
  isOpen,
  onClose,
  onSubmit,
  householdInfo,
  userInfo,
  households,
}: AddPersonModalProps) {
  const [formData, setFormData] = useState({
    householdId: "",
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
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isUserLinked = userInfo?.linked === true;

  useEffect(() => {
    if (isOpen) {
      if (isUserLinked && householdInfo) {
        // User đã linked, tự động điền household của họ
        setFormData((prev) => ({
          ...prev,
          householdId: householdInfo.id.toString(),
        }));
      } else {
        // User chưa linked, để trống householdId
        setFormData((prev) => ({
          ...prev,
          householdId: "",
        }));
      }
    }
  }, [isOpen, householdInfo, isUserLinked]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    const requiredFields = [
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

    const missingFields = requiredFields.filter(
      (field) => !String((formData as any)[field] ?? "").trim()
    );
    if (missingFields.length > 0) {
      setError("Vui lòng điền đầy đủ tất cả các trường (trừ Ghi chú).");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } catch (err: any) {
      setError(err.message || "Có lỗi xảy ra");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex min-h-screen w-screen items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-xl border border-gray-200 bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Thêm nhân khẩu
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Hộ khẩu */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Hộ khẩu {isUserLinked && <span className="text-red-500">*</span>}
            </label>
            {isUserLinked ? (
              <input
                type="text"
                value={`${householdInfo?.soHoKhau || ""} - ${
                  householdInfo?.diaChi || ""
                }`}
                disabled
                className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm"
              />
            ) : (
              <div className="space-y-2">
                <select
                  value={formData.householdId}
                  onChange={(e) =>
                    setFormData({ ...formData, householdId: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="">Chọn hộ khẩu (tùy chọn)</option>
                  {households.map((household) => (
                    <option key={household.id} value={household.id}>
                      {household.soHoKhau} - {household.diaChi}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500">
                  Chọn hộ khẩu bạn muốn gia nhập. Nếu không có hộ khẩu phù hợp,
                  để trống và tổ trưởng sẽ xử lý.
                </p>
              </div>
            )}
          </div>

          {/* Thông tin nhân khẩu */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Họ và tên <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.hoTen}
                onChange={(e) =>
                  setFormData({ ...formData, hoTen: e.target.value })
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="Nhập họ và tên"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                CCCD/CMND <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.cccd}
                onChange={(e) =>
                  setFormData({ ...formData, cccd: e.target.value })
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="Nhập số CCCD/CMND"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ngày sinh <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.ngaySinh}
                onChange={(e) =>
                  setFormData({ ...formData, ngaySinh: e.target.value })
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Giới tính <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.gioiTinh}
                onChange={(e) =>
                  setFormData({ ...formData, gioiTinh: e.target.value })
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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
                value={formData.quanHe}
                onChange={(e) =>
                  setFormData({ ...formData, quanHe: e.target.value })
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nơi sinh <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.noiSinh}
              onChange={(e) =>
                setFormData({ ...formData, noiSinh: e.target.value })
              }
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              placeholder="Nhập nơi sinh"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nguyên quán <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.nguyenQuan}
                onChange={(e) =>
                  setFormData({ ...formData, nguyenQuan: e.target.value })
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="Nhập nguyên quán"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dân tộc <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.danToc}
                onChange={(e) =>
                  setFormData({ ...formData, danToc: e.target.value })
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="Ví dụ: Kinh, Tày..."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tôn giáo <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.tonGiao}
                onChange={(e) =>
                  setFormData({ ...formData, tonGiao: e.target.value })
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="Ví dụ: Không, Phật giáo..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quốc tịch <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.quocTich}
                onChange={(e) =>
                  setFormData({ ...formData, quocTich: e.target.value })
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="Ví dụ: Việt Nam"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nghề nghiệp <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.ngheNghiep}
                onChange={(e) =>
                  setFormData({ ...formData, ngheNghiep: e.target.value })
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="Nhập nghề nghiệp"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nơi làm việc <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.noiLamViec}
                onChange={(e) =>
                  setFormData({ ...formData, noiLamViec: e.target.value })
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="Nhập nơi làm việc"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ngày đăng ký thường trú <span className="text-red-500">*</span>
              </label>
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
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Địa chỉ thường trú trước đây <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.diaChiThuongTruTruoc}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    diaChiThuongTruTruoc: e.target.value,
                  })
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="Nhập địa chỉ trước đây"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ghi chú
            </label>
            <textarea
              value={formData.ghiChu}
              onChange={(e) =>
                setFormData({ ...formData, ghiChu: e.target.value })
              }
              rows={3}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              placeholder="Thông tin bổ sung nếu có..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg disabled:opacity-50"
            >
              {isSubmitting ? "Đang gửi..." : "Gửi yêu cầu"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Hủy
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Modal thêm con sơ sinh
interface AddNewbornModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  householdInfo: Household | null;
}

function AddNewbornModal({
  isOpen,
  onClose,
  onSubmit,
  householdInfo,
}: AddNewbornModalProps) {
  const [formData, setFormData] = useState({
    householdId: "",
    hoTen: "",
    ngaySinh: "",
    gioiTinh: "",
    noiSinh: "",
    nguyenQuan: "",
    danToc: "",
    tonGiao: "",
    quocTich: "Việt Nam",
    cccd: "",
    ghiChu: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && householdInfo) {
      setFormData((prev) => ({
        ...prev,
        householdId: householdInfo.id.toString(),
      }));
    }
  }, [isOpen, householdInfo]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (
      !formData.hoTen ||
      !formData.ngaySinh ||
      !formData.gioiTinh ||
      !formData.noiSinh
    ) {
      setError("Vui lòng điền đầy đủ các trường bắt buộc");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } catch (err: any) {
      setError(err.message || "Có lỗi xảy ra");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex min-h-screen w-screen items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-xl border border-gray-200 bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Thêm con sơ sinh
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Hộ khẩu */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Hộ khẩu <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={`${householdInfo?.soHoKhau || ""} - ${
                householdInfo?.diaChi || ""
              }`}
              disabled
              className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm"
            />
          </div>

          {/* Thông tin trẻ sơ sinh */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Họ và tên <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.hoTen}
                onChange={(e) =>
                  setFormData({ ...formData, hoTen: e.target.value })
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="Nhập họ và tên"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ngày sinh <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.ngaySinh}
                onChange={(e) =>
                  setFormData({ ...formData, ngaySinh: e.target.value })
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Giới tính <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.gioiTinh}
                onChange={(e) =>
                  setFormData({ ...formData, gioiTinh: e.target.value })
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">Chọn giới tính</option>
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
                required
                value={formData.noiSinh}
                onChange={(e) =>
                  setFormData({ ...formData, noiSinh: e.target.value })
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="Nhập nơi sinh"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nguyên quán
              </label>
              <input
                type="text"
                value={formData.nguyenQuan}
                onChange={(e) =>
                  setFormData({ ...formData, nguyenQuan: e.target.value })
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="Nhập nguyên quán"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dân tộc
              </label>
              <input
                type="text"
                value={formData.danToc}
                onChange={(e) =>
                  setFormData({ ...formData, danToc: e.target.value })
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="Ví dụ: Kinh, Tày..."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tôn giáo
              </label>
              <input
                type="text"
                value={formData.tonGiao}
                onChange={(e) =>
                  setFormData({ ...formData, tonGiao: e.target.value })
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="Ví dụ: Không, Phật giáo..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quốc tịch
              </label>
              <input
                type="text"
                value={formData.quocTich}
                onChange={(e) =>
                  setFormData({ ...formData, quocTich: e.target.value })
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="Ví dụ: Việt Nam"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              CCCD/CMND (nếu có)
            </label>
            <input
              type="text"
              value={formData.cccd}
              onChange={(e) =>
                setFormData({ ...formData, cccd: e.target.value })
              }
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              placeholder="Nhập số CCCD nếu đã có"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ghi chú
            </label>
            <textarea
              value={formData.ghiChu}
              onChange={(e) =>
                setFormData({ ...formData, ghiChu: e.target.value })
              }
              rows={3}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              placeholder="Thông tin bổ sung nếu có..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg disabled:opacity-50"
            >
              {isSubmitting ? "Đang gửi..." : "Gửi yêu cầu"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Hủy
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
