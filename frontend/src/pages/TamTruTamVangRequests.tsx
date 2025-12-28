import { useEffect, useState } from "react";
import { apiService } from "../services/api";
import TamTruVangDetailModal from "../components/TamTruVangDetailModal";

const loaiLabels = {
  tam_tru: "Tạm trú",
  tam_vang: "Tạm vắng",
};

const statusLabels = {
  approved: "Đã duyệt",
  pending: "Chờ duyệt",
  rejected: "Từ chối",
  dang_thuc_hien: "Đang thực hiện",
  ket_thuc: "Kết thúc",
};

const statusColors = {
  approved: "bg-green-100 text-green-700",
  pending: "bg-yellow-100 text-yellow-700",
  rejected: "bg-red-100 text-red-700",
  dang_thuc_hien: "bg-blue-100 text-blue-700",
  ket_thuc: "bg-gray-100 text-gray-700",
};

const normalizeType = (type: string | null | undefined) =>
  (type || "").toLowerCase();
const parseYMD = (value: string | null | undefined) => {
  if (!value) return null;
  const parts = String(value).split("-");
  if (parts.length !== 3) return null;
  const [y, m, d] = parts.map((p) => parseInt(p, 10));
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 12, 0, 0);
};

const hasTemporaryStatus = (record: RequestRecord) => {
  const raw =
    (record.nhanKhau as any)?.residentStatus ||
    (record.nhanKhau as any)?.trangThai ||
    (record as any).trangThaiNhanKhau ||
    "";
  const normalized = String(raw).toLowerCase();
  return normalized.includes("tam_tru") || normalized.includes("tam_vang");
};

type RequestRecord = {
  id: number;
  loai: "tam_tru" | "tam_vang";
  status: string;
  tuNgay?: string | null;
  denNgay?: string | null;
  diaChi?: string | null;
  nguoiGui?: { hoTen?: string | null; cccd?: string | null } | null;
  nhanKhau?: { hoTen?: string | null } | null;
  hoKhau?: { soHoKhau?: string | null } | null;
  createdAt?: string | null;
  payload?: any;
  person?: any;
  household?: any;
  [key: string]: any;
};

export default function TamTruTamVangRequests() {
  const [requests, setRequests] = useState<RequestRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loaiFilter, setLoaiFilter] = useState<"all" | "tam_tru" | "tam_vang">(
    "all"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaiFilter, searchQuery, fromDate, toDate]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const mapRecord = (item: any): RequestRecord => {
    const typeNormalized = normalizeType(item.loai || item.type);
    const loai =
      typeNormalized.includes("vang") || typeNormalized.includes("absence")
        ? "tam_vang"
        : "tam_tru";
    const payload = item.payload || {};
    const tuNgayRaw = payload.tuNgay || item.tuNgay || null;
    const denNgayRaw = payload.denNgay || item.denNgay || null;
    const diaChi = payload.diaChi || item.diaChi || "";
    const nguoiGui = item.nguoiGui || {
      hoTen: item.requesterName || item.person?.hoTen || null,
      cccd: item.person?.cccd || null,
    };
    const nhanKhau = item.nhanKhau || item.person || null;
    const hoKhau = item.hoKhau || item.household || null;

    return {
      ...item,
      loai,
      status: (item.status || "").toLowerCase(),
      tuNgay: tuNgayRaw,
      denNgay: denNgayRaw,
      diaChi,
      nguoiGui,
      nhanKhau,
      hoKhau,
    };
  };

  const filterActive = (records: RequestRecord[]) => {
    const keyword = searchQuery.trim().toLowerCase();
    const filterFrom = parseYMD(fromDate || undefined);
    const filterTo = parseYMD(toDate || undefined);

    return records
      .filter((r) => r.status === "approved" || r.status === "da_duyet")
      .filter((r) => !!r.hoKhau?.soHoKhau)
      .filter((r) => {
        if (!filterFrom && !filterTo) return true;
        const start = parseYMD(r.tuNgay ?? undefined);
        const end = parseYMD(r.denNgay ?? undefined) || start;

        // Keep records that overlap the selected window
        if (!start && !end) return false;
        if (filterFrom && end && end < filterFrom) return false;
        if (filterTo && start && start > filterTo) return false;
        return true;
      })
      .filter((r) => (loaiFilter === "all" ? true : r.loai === loaiFilter))
      .filter((r) => {
        if (!keyword) return true;
        const name = r.nguoiGui?.hoTen?.toLowerCase() || "";
        const cccd = r.nguoiGui?.cccd?.toLowerCase() || "";
        const nhanKhauName = r.nhanKhau?.hoTen?.toLowerCase() || "";
        const soHoKhau = r.hoKhau?.soHoKhau?.toLowerCase() || "";
        const diaChi = (r.diaChi || "").toLowerCase();
        return [name, nhanKhauName, cccd, soHoKhau, diaChi].some((f) =>
          f.includes(keyword)
        );
      });
  };

  const loadRequests = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = {
        // Gọi full, lọc loại ở client để tránh sai khác enum backend
        type: undefined,
        keyword: searchQuery.trim() || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        status: "approved",
        page: 1,
        limit: 200,
      } as const;

      const response = await apiService.getTamTruVangRequests(params);
      if (response?.success) {
        console.log("[TTTV] params", params, "state", {
          loaiFilter,
          searchQuery,
          fromDate,
          toDate,
        });
        console.log("[TTTV] raw count", (response.data || []).length);
        const normalized = (response.data || []).map(mapRecord);
        console.log(
          "[TTTV] mapped count",
          normalized.length,
          normalized.map((r) => ({ id: r.id, loai: r.loai, status: r.status }))
        );
        const filtered = filterActive(normalized);
        console.log("[TTTV] filtered count", filtered.length, filtered);
        setRequests(filtered);
      }
    } catch (err: any) {
      console.error("Failed to load tam-tru/tam-vang requests:", err);
      setError(
        err?.error?.message || "Không thể tải danh sách tạm trú/tạm vắng"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => loadRequests();
  const handleViewDetail = (requestId: number) =>
    setSelectedRequestId(requestId);
  const handleCloseModal = () => {
    setSelectedRequestId(null);
    loadRequests();
  };

  const renderStatus = (status: string) => {
    const key = (status || "").toLowerCase();
    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
          statusColors[key as keyof typeof statusColors] ||
          "bg-gray-100 text-gray-700"
        }`}
      >
        {statusLabels[key as keyof typeof statusLabels] || status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
            Duyệt Tạm trú / Tạm vắng
          </h1>
          <p className="mt-1 text-gray-600">
            Danh sách đơn do người dân gửi, cán bộ có thể duyệt hoặc từ chối.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg hover:-translate-y-0.5"
        >
          Làm mới
        </button>
      </div>

      <div className="rounded-xl border border-gray-200/80 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Loại
            </label>
            <select
              value={loaiFilter}
              onChange={(e) =>
                setLoaiFilter((prev) => {
                  const next = e.target.value as typeof loaiFilter;
                  console.log("[TTTV] select change", { prev, next });
                  return next;
                })
              }
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="all">Tất cả</option>
              <option value="tam_tru">Tạm trú</option>
              <option value="tam_vang">Tạm vắng</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Từ ngày
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Đến ngày
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tìm kiếm
          </label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo Họ tên / CCCD / Số hộ khẩu"
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-green-700">
          {success}
        </div>
      )}

      <div className="rounded-xl border border-gray-200/80 bg-white shadow-sm">
        <div className="border-b border-gray-200 p-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Danh sách đơn ({requests.length})
          </h2>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-gray-500">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent" />
            <p className="mt-2">Đang tải...</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <div className="text-2xl mb-2"></div>
            <p>Không có đơn nào.</p>
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
                    Liên quan
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Từ ngày - Đến ngày
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Địa chỉ
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Ngày gửi
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Trạng thái
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {requests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm text-gray-900 font-medium">
                      #{request.id}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-900">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          request.loai === "tam_tru"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-orange-100 text-orange-700"
                        }`}
                      >
                        {loaiLabels[request.loai] || request.loai}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      <div className="font-medium">
                        {request.nguoiGui?.hoTen || "-"}
                      </div>
                      {request.nguoiGui?.cccd && (
                        <div className="text-gray-500 text-xs">
                          {request.nguoiGui.cccd}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      <div>{request.hoKhau?.soHoKhau || "-"}</div>
                      {request.nhanKhau?.hoTen && (
                        <div className="text-gray-500 text-xs">
                          {request.nhanKhau.hoTen}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      <div>
                        {request.tuNgay
                          ? new Date(request.tuNgay).toLocaleDateString("vi-VN")
                          : "-"}
                      </div>
                      <div className="text-gray-500 text-xs">
                        {request.denNgay
                          ? `${new Date(request.denNgay).toLocaleDateString(
                              "vi-VN"
                            )}`
                          : "Không xác định"}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 max-w-xs">
                      <div className="truncate" title={request.diaChi || ""}>
                        {request.diaChi || "-"}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {request.createdAt
                        ? new Date(request.createdAt).toLocaleDateString(
                            "vi-VN",
                            {
                              year: "numeric",
                              month: "2-digit",
                              day: "2-digit",
                            }
                          )
                        : "-"}
                    </td>
                    <td className="py-3 px-4">
                      {renderStatus(request.status)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleViewDetail(request.id)}
                        className="rounded-lg bg-blue-50 text-blue-600 px-3 py-1.5 text-xs font-medium hover:bg-blue-100 transition-colors"
                      >
                        Xem
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedRequestId && (
        <TamTruVangDetailModal
          requestId={selectedRequestId}
          isOpen={true}
          onClose={handleCloseModal}
          onRefresh={handleRefresh}
        />
      )}
    </div>
  );
}
