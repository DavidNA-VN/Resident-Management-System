import { useState, useEffect } from "react";
import { apiService } from "../services/api";
import RequestDetailModal from "../components/RequestDetailModal";

interface Request {
  id: number;
  loaiYeuCau: string;
  type: string;
  nguoiGui: {
    hoTen?: string;
    username?: string;
    cccd?: string;
  };
  hoKhauLienQuan?: {
    soHoKhau?: string;
    diaChi?: string;
  };
  createdAt: string;
  status: string;
  payload?: any;
}

const requestTypeLabels: Record<string, string> = {
  TACH_HO_KHAU: "Yêu cầu tách hộ khẩu",
  SUA_NHAN_KHAU: "Sửa thông tin nhân khẩu",
  XOA_NHAN_KHAU: "Xoá nhân khẩu",
  TAM_VANG: "Xin tạm vắng",
  TAM_TRU: "Xin tạm trú",
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

export default function Requests() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<Request[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    loadRequests();
  }, [typeFilter, statusFilter]); // Reload khi filter thay đổi

  const loadRequests = async () => {
    setIsLoading(true);
    try {
      const response = await apiService.getRequestsList({
        type: typeFilter !== "all" ? typeFilter : undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
      });
      if (response.success) {
        const data = response.data || [];
        setRequests(data);
        // Filter ở frontend nếu backend chưa hỗ trợ (sẽ xóa khi backend có)
        let filtered = data;
        if (typeFilter !== "all") {
          filtered = filtered.filter((req) => req.type === typeFilter);
        }
        if (statusFilter !== "all") {
          filtered = filtered.filter((req) => req.status === statusFilter);
        }
        setFilteredRequests(filtered);
      }
    } catch (err) {
      console.error("Failed to load requests:", err);
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

  // Filter types chỉ hiển thị các loại yêu cầu cần duyệt
  const filterTypes = [
    { value: "all", label: "Tất cả" },
    { value: "TACH_HO_KHAU", label: "Tách hộ khẩu" },
    { value: "SUA_NHAN_KHAU", label: "Sửa nhân khẩu" },
    { value: "XOA_NHAN_KHAU", label: "Xoá nhân khẩu" },
  ];

  const filterStatuses = [
    { value: "all", label: "Tất cả" },
    { value: "pending", label: "Chờ duyệt" },
    { value: "approved", label: "Đã duyệt" },
    { value: "rejected", label: "Từ chối" },
    { value: "processing", label: "Đang xử lý" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-blue-200/60 bg-gradient-to-r from-blue-50 via-cyan-50 to-teal-50 p-6 shadow-sm backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              Quản lý yêu cầu
            </h1>
            <p className="mt-2 text-gray-600">
              Duyệt và xử lý các yêu cầu từ người dân
            </p>
          </div>
          <button
            onClick={handleRefresh}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            🔄 Làm mới
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-gray-200/80 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Loại yêu cầu
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              {filterTypes.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Trạng thái
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              {filterStatuses.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200/80 bg-white shadow-sm">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
            <p className="mt-4 text-gray-600">Đang tải danh sách yêu cầu...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Không có yêu cầu nào.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">ID</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                    Loại yêu cầu
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                    Người gửi
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                    Hộ khẩu liên quan
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                    Ngày gửi
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                    Trạng thái
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map((request) => (
                  <tr
                    key={request.id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-3 px-4 text-sm text-gray-900 font-medium">
                      #{request.id}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-900">
                      {requestTypeLabels[request.type] || request.type}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {request.nguoiGui?.hoTen || request.nguoiGui?.username || "-"}
                      {request.nguoiGui?.cccd && (
                        <span className="text-gray-500 ml-1">({request.nguoiGui.cccd})</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {request.hoKhauLienQuan?.soHoKhau || request.hoKhauLienQuan?.diaChi || "-"}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {new Date(request.createdAt).toLocaleDateString("vi-VN", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                          statusColors[request.status] || "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {statusLabels[request.status] || request.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleViewDetail(request.id)}
                        className="rounded-lg bg-blue-50 text-blue-600 px-3 py-1.5 text-xs font-medium hover:bg-blue-100 transition-colors"
                      >
                        Xem chi tiết
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

