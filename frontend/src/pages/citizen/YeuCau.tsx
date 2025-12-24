import { useState, useEffect } from "react";
import RequestModal, { RequestType } from "../../components/RequestModal";
import SplitHouseholdRequestModal, {
  SplitHouseholdRequestData,
} from "../../components/SplitHouseholdRequestModal";
import { apiService } from "../../services/api";

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

interface Request {
  id: number;
  type: string;
  status: string;
  createdAt: string;
  payload: any;
}

const requestTypeLabels: Record<string, string> = {
  TAM_VANG: "Xin tạm vắng",
  TAM_TRU: "Xin tạm trú",
  TACH_HO_KHAU: "Yêu cầu tách hộ khẩu",
  SUA_NHAN_KHAU: "Sửa thông tin nhân khẩu",
  XOA_NHAN_KHAU: "Xoá nhân khẩu",
};

const statusLabels: Record<string, string> = {
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Từ chối",
  processing: "Đang xử lý",
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  processing: "bg-blue-100 text-blue-700",
};

export default function YeuCau() {
  const [selectedType, setSelectedType] = useState<RequestType | "TACH_HO_KHAU" | null>(null);
  const [nhanKhauList, setNhanKhauList] = useState<NhanKhau[]>([]);
  const [householdInfo, setHouseholdInfo] = useState<Household | null>(null);
  const [requests, setRequests] = useState<Request[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHousehold, setIsLoadingHousehold] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadHouseholdData();
    loadRequests();
  }, []);

  // Load household data khi mở modal tách hộ khẩu
  useEffect(() => {
    if (selectedType === "TACH_HO_KHAU" && !householdInfo) {
      loadHouseholdData();
    }
  }, [selectedType]);

  const loadHouseholdData = async () => {
    setIsLoadingHousehold(true);
    try {
      // TODO: Thay bằng getMyHousehold() khi backend có endpoint /citizen/my-household
      const response = await apiService.getMyHousehold();
      if (response.success && response.data) {
        // Adapt data structure
        const householdData = response.data.hoKhau || response.data.household;
        const members = response.data.nhanKhauList || response.data.members || [];

        setNhanKhauList(
          members.map((nk: any) => ({
            id: nk.id,
            hoTen: nk.hoTen,
            cccd: nk.cccd,
            quanHe: nk.quanHe,
          }))
        );
        setHouseholdInfo({
          id: householdData.id,
          soHoKhau: householdData.soHoKhau,
          diaChi: householdData.diaChi,
          diaChiDayDu: householdData.diaChiDayDu,
          chuHo: householdData.chuHo || response.data.chuHo,
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
    const response = await apiService.createRequest(
      data as { type: RequestType | "TACH_HO_KHAU"; payload: any }
    );
    if (response.success) {
      setSuccess("Gửi yêu cầu thành công!");
      setTimeout(() => setSuccess(null), 3000);
      loadRequests();
    } else {
      throw new Error(response.error?.message || "Gửi yêu cầu thất bại");
    }
  };

  const handleSubmitSplitHousehold = async (data: SplitHouseholdRequestData) => {
    try {
      // TODO: Thay bằng createSplitHouseholdRequest() khi backend có endpoint /citizen/requests/split-household
      const response = await apiService.createSplitHouseholdRequest(data);
      if (response.success) {
        setSuccess("Gửi yêu cầu tách hộ khẩu thành công!");
        setTimeout(() => setSuccess(null), 3000);
        loadRequests();
      } else {
        throw new Error(response.error?.message || "Gửi yêu cầu thất bại");
      }
    } catch (err: any) {
      throw err;
    }
  };

  const requestTypes: Array<{ type: RequestType | "TACH_HO_KHAU"; label: string; icon: string }> = [
    { type: "TAM_VANG", label: "Xin tạm vắng", icon: "📍" },
    { type: "TAM_TRU", label: "Xin tạm trú", icon: "🏠" },
    { type: "TACH_HO_KHAU", label: "Yêu cầu tách hộ khẩu", icon: "🔄" },
    { type: "SUA_NHAN_KHAU", label: "Sửa thông tin nhân khẩu", icon: "✏️" },
    { type: "XOA_NHAN_KHAU", label: "Xoá nhân khẩu", icon: "🗑️" },
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
            onClick={() => setSelectedType(item.type)}
            className="rounded-xl border border-gray-200/80 bg-white p-6 shadow-sm hover:shadow-lg hover:border-blue-300 transition-all duration-300 hover:-translate-y-1 text-left group"
          >
            <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">
              {item.icon}
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {item.label}
            </h3>
            <p className="text-sm text-gray-500">
              Nhấn để tạo yêu cầu mới
            </p>
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
                      {new Date(request.createdAt).toLocaleDateString("vi-VN", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    {request.payload?.lyDo && (
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">Lý do:</span> {request.payload.lyDo}
                      </p>
                    )}
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                      statusColors[request.status] || "bg-gray-100 text-gray-700"
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
        type={selectedType && selectedType !== "TACH_HO_KHAU" ? selectedType : null}
        onClose={() => setSelectedType(null)}
        onSubmit={handleSubmitRequest}
        nhanKhauList={nhanKhauList.map((nk) => ({ id: nk.id, hoTen: nk.hoTen }))}
        householdInfo={householdInfo ? {
          soHoKhau: householdInfo.soHoKhau,
          diaChi: householdInfo.diaChiDayDu || householdInfo.diaChi,
        } : undefined}
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
    </div>
  );
}

