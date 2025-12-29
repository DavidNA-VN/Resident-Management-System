import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiService, API_BASE_URL } from "../services/api";
import RequestDetailModal from "../components/RequestDetailModal";

interface RequestItem {
  id: number;
  type: string;
  status: string;
  createdAt: string;
  tuNgay?: string;
  denNgay?: string;
  lyDo?: string;
  nguoiGui?: { hoTen?: string; username?: string; cccd?: string };
  hoKhauLienQuan?: { id?: number; soHoKhau?: string; diaChi?: string };
  payload?: any;
}

const requestTypeLabels: Record<string, string> = {
  ADD_NEWBORN: "Thêm con sơ sinh",
  ADD_PERSON: "Thêm nhân khẩu",
  TEMPORARY_RESIDENCE: "Xin tạm trú",
  TEMPORARY_ABSENCE: "Xin tạm vắng",
  TAM_TRU: "Xin tạm trú",
  TAM_VANG: "Xin tạm vắng",
  TACH_HO_KHAU: "Yêu cầu tách hộ khẩu",
  SUA_NHAN_KHAU: "Sửa thông tin nhân khẩu",
  XOA_NHAN_KHAU: "Xoá nhân khẩu",
};

const statusLabels: Record<string, string> = {
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Từ chối",
  PENDING: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Từ chối",
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  PENDING: "bg-yellow-100 text-yellow-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
};

const formatDate = (isoDate?: string) => {
  if (!isoDate) return null;
  // expect YYYY-MM-DD (avoid timezone by parsing manually)
  const parts = isoDate.split("-");
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

const formatDateRange = (tuNgay?: string, denNgay?: string): string => {
  if (!tuNgay && !denNgay) return "-";
  if (tuNgay && denNgay) {
    return `${formatDate(tuNgay)} - ${formatDate(denNgay)}`;
  }
  if (tuNgay) return `Từ ${formatDate(tuNgay)}`;
  if (denNgay) return `Đến ${formatDate(denNgay)}`;
  return "-";
};

const normalizeType = (type?: string) => (type || "").toUpperCase();
const normalizeStatus = (status?: string) => (status || "").toUpperCase();

const isTamTruVangType = (type?: string) => {
  const normalized = normalizeType(type);
  return [
    "TAM_TRU",
    "TEMPORARY_RESIDENCE",
    "TAM_VANG",
    "TEMPORARY_ABSENCE",
  ].includes(normalized);
};

const parseYMDToDate = (value?: string) => {
  if (!value) return null;
  const parts = value.split("-");
  if (parts.length !== 3) return null;
  const [y, m, d] = parts.map((p) => parseInt(p, 10));
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 12, 0, 0);
};

const getDateFromPayload = (item: RequestItem, key: "tuNgay" | "denNgay") => {
  return item?.payload?.[key] || (item as any)[key] || null;
};

export default function TamTruVang() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<RequestItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [lastRequestLog, setLastRequestLog] = useState<string | null>(null);

  const filterTypes = [
    { value: "all", label: "Tất cả" },
    { value: "TAM_TRU", label: "Tạm trú" },
    { value: "TAM_VANG", label: "Tạm vắng" },
  ];

  // Check user role
  const currentUser = localStorage.getItem("userInfo")
    ? JSON.parse(localStorage.getItem("userInfo") || "null")
    : null;

  const allowedRoles = ["can_bo", "to_truong", "to_pho"];
  const hasAccess = currentUser && allowedRoles.includes(currentUser.role);

  useEffect(() => {
    if (!hasAccess) {
      navigate("/dashboard");
      return;
    }
    loadRequests();
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    loadRequests();
  }, [typeFilter, searchQuery]);

  const applyFilters = (data: RequestItem[]) => {
    const now = new Date();
    const activeRecords = data
      .filter((item) => isTamTruVangType(item.type))
      .map((item) => {
        const tuNgay = getDateFromPayload(item, "tuNgay");
        const denNgay = getDateFromPayload(item, "denNgay");
        return {
          ...item,
          payload: { ...(item.payload || {}), tuNgay, denNgay },
        } as RequestItem;
      })
      .filter((item) => {
        if (normalizeStatus(item.status) !== "APPROVED") return false;
        const startDate = parseYMDToDate(getDateFromPayload(item, "tuNgay"));
        const endDate = parseYMDToDate(getDateFromPayload(item, "denNgay"));
        if (startDate && startDate > now) return false;
        if (endDate && endDate < now) return false;
        return true;
      });

    const byType =
      typeFilter === "all"
        ? activeRecords
        : activeRecords.filter((item) => {
            const normalized = normalizeType(item.type);
            if (typeFilter === "TAM_TRU") {
              return (
                normalized === "TAM_TRU" || normalized === "TEMPORARY_RESIDENCE"
              );
            }
            if (typeFilter === "TAM_VANG") {
              return (
                normalized === "TAM_VANG" || normalized === "TEMPORARY_ABSENCE"
              );
            }
            return normalized === normalizeType(typeFilter);
          });

    if (!searchQuery.trim()) return byType;
    const keyword = searchQuery.trim().toLowerCase();
    return byType.filter((item) => {
      const name = item.nguoiGui?.hoTen?.toLowerCase() || "";
      const username = item.nguoiGui?.username?.toLowerCase() || "";
      const cccd = item.nguoiGui?.cccd?.toLowerCase() || "";
      const soHoKhau =
        item.hoKhauLienQuan?.soHoKhau?.toLowerCase() ||
        item.payload?.soHoKhau?.toLowerCase() ||
        "";
      const address =
        item.hoKhauLienQuan?.diaChi?.toLowerCase() ||
        item.payload?.diaChi?.toLowerCase() ||
        "";
      return [name, username, cccd, soHoKhau, address].some((field) =>
        field.includes(keyword)
      );
    });
  };

  const showToast = (
    message: string,
    type: "success" | "error" = "success"
  ) => {
    setToast({ type, message });
  };

  const loadRequests = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Debug logs to verify endpoint call and token
      try {
        // eslint-disable-next-line no-console
        console.log(
          "[TamTruVang] calling getTamTruVangRequests with",
          {
            type: typeFilter !== "all" ? typeFilter : undefined,
            keyword: searchQuery || undefined,
          },
          "tokenExists=",
          !!localStorage.getItem("accessToken")
        );
      } catch (e) {}
      const paramsForLog: any = {
        type: typeFilter !== "all" ? typeFilter : undefined,
        keyword: searchQuery || undefined,
        page: 1,
        limit: 200,
      };
      const qp = new URLSearchParams();
      if (paramsForLog.type) qp.append("type", paramsForLog.type);
      if (paramsForLog.keyword) qp.append("keyword", paramsForLog.keyword);
      qp.append("page", String(paramsForLog.page));
      qp.append("limit", String(paramsForLog.limit));
      const base = API_BASE_URL.replace(/\/$/, "");
      const fullUrl = `${base}/tam-tru-vang/requests${
        qp.toString() ? `?${qp.toString()}` : ""
      }`;
      setLastRequestLog(`GET ${fullUrl} -> pending -> `);

      const response = await apiService.getTamTruVangRequests(paramsForLog);
      if (response && response.success) {
        const data = response.data || [];
        setRequests(data);
        setFilteredRequests(applyFilters(data));
      } else {
        setError("Không thể tải danh sách tạm trú/tạm vắng");
        setLastRequestLog(
          `GET ${fullUrl} -> 200 -> ${JSON.stringify(response).slice(0, 1000)}`
        );
      }
    } catch (err: any) {
      // log detailed error
      try {
        // eslint-disable-next-line no-console
        console.error("[TamTruVang] Failed to load requests:", err);
      } catch (e) {}

      // Show precise error messages based on status
      const status = err?.status || err?.error?.status;
      const backendMessage =
        err?.error?.message || err?.message || err?.rawText || null;
      // update UI log
      try {
        const paramsForLog2: any = {
          type: typeFilter !== "all" ? typeFilter : undefined,
          keyword: searchQuery || undefined,
          page: 1,
          limit: 200,
        };
        const qp2 = new URLSearchParams();
        if (paramsForLog2.type) qp2.append("type", paramsForLog2.type);
        if (paramsForLog2.keyword) qp2.append("keyword", paramsForLog2.keyword);
        qp2.append("page", String(paramsForLog2.page));
        qp2.append("limit", String(paramsForLog2.limit));
        const base2 = API_BASE_URL.replace(/\/$/, "");
        const fullUrl = `${base2}/tam-tru-vang/requests${
          qp2.toString() ? `?${qp2.toString()}` : ""
        }`;
        const bodySnippet =
          backendMessage || JSON.stringify(err)?.slice(0, 1000) || "";
        setLastRequestLog(
          `GET ${fullUrl} -> ${status || "ERR"} -> ${bodySnippet}`
        );
      } catch (e) {
        // ignore
      }

      if (status === 401) {
        setError(
          "Bạn chưa đăng nhập hoặc phiên đã hết hạn. Vui lòng đăng nhập lại."
        );
        showToast("Bạn chưa đăng nhập hoặc phiên đã hết hạn", "error");
      } else if (status === 403) {
        setError("Bạn không có quyền xem danh sách này.");
        showToast("Không đủ quyền", "error");
      } else if (status === 404) {
        setError(
          `Không tìm thấy API (404). Vui lòng kiểm tra cấu hình backend. ${
            backendMessage || ""
          }`
        );
        showToast("Lỗi: API không tìm thấy (404)", "error");
      } else if (status === 500) {
        setError(`Lỗi máy chủ: ${backendMessage || "Internal Server Error"}`);
        showToast("Lỗi máy chủ", "error");
      } else {
        setError(
          backendMessage
            ? `${status || ""} - ${backendMessage}`
            : "Không thể tải danh sách tạm trú/tạm vắng"
        );
        showToast("Không thể tải danh sách tạm trú/tạm vắng", "error");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    loadRequests();
  };

  const handleViewDetail = (requestId: number) => {
    setSelectedRequestId(requestId);
  };

  const handleCloseModal = () => {
    setSelectedRequestId(null);
    loadRequests(); // Refresh sau khi đóng modal (có thể đã approve/reject)
  };

  // Redirect if no access
  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            Bạn không có quyền truy cập trang này
          </h1>
          <p className="text-gray-600 mb-4">
            Chỉ cán bộ, tổ trưởng và tổ phó mới có thể truy cập trang này.
          </p>
          <button
            onClick={() => navigate("/dashboard")}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Về trang chủ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* DEBUG banner to verify this component is rendered */}
      <div className="rounded-md bg-red-50 border border-red-200 p-3 text-red-700 font-semibold">
        DEBUG: TamTruVang component loaded (v2)
      </div>
      {/* Toast */}
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
            Danh sách tạm trú / tạm vắng đang hiệu lực
          </h1>
          <p className="mt-1 text-gray-600">
            Chỉ hiển thị các hồ sơ đã duyệt và còn trong thời gian hiệu lực
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 px-6 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg hover:-translate-y-0.5"
        >
          🔄 Làm mới
        </button>
      </div>

      {/* Filter Card */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Loại yêu cầu
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              {filterTypes.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tìm kiếm
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Họ tên, CCCD, sổ hộ khẩu hoặc địa chỉ..."
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-700">
          {error}
        </div>
      )}
      {/* Last request debug log (visible) */}
      {lastRequestLog && (
        <div className="mt-3 rounded-md bg-gray-50 border border-gray-200 p-3 text-gray-700 text-sm">
          <strong>Last request:</strong>&nbsp;
          <span className="font-mono">{lastRequestLog}</span>
        </div>
      )}

      {/* Requests Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 p-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Đang tạm trú / tạm vắng ({filteredRequests.length})
          </h2>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-gray-500">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
            <p className="mt-4 text-gray-600">
              Đang tải danh sách tạm trú/tạm vắng...
            </p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p className="text-lg">Không có trường hợp đang tạm trú/tạm vắng</p>
            <p className="text-sm text-gray-400 mt-1">
              {requests.length > 0
                ? "Không tìm thấy trường hợp phù hợp với bộ lọc"
                : "Danh sách trống"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Mã đơn
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Loại
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Người gửi
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                    CCCD
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Thời gian hiệu lực
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Trạng thái
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      #{request.id}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {requestTypeLabels[request.type] || request.type}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {request.nguoiGui?.hoTen ||
                        request.nguoiGui?.username ||
                        "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {request.nguoiGui?.cccd || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {formatDateRange(
                        request.payload?.tuNgay,
                        request.payload?.denNgay
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                          statusColors[request.status] ||
                          "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {statusLabels[request.status] || request.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-600">
                      <button
                        onClick={() => handleViewDetail(request.id)}
                        className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:border-blue-300 hover:text-blue-600"
                        title="Xem chi tiết và xử lý yêu cầu"
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

      {/* Detail Modal */}
      {selectedRequestId && (
        <RequestDetailModal
          requestId={selectedRequestId}
          isOpen={true}
          onClose={handleCloseModal}
          onRefresh={handleRefresh}
        />
      )}
    </div>
  );
}
