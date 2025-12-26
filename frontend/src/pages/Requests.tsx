import { useState, useEffect } from "react";
import { apiService } from "../services/api";

interface Request {
  id: number;
  type: string;
  status: string;
  createdAt: string;
  requesterName?: string;
}

const requestTypeLabels: Record<string, string> = {
  ADD_NEWBORN: "Thêm con sơ sinh",
};

const statusLabels: Record<string, string> = {
  PENDING: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Từ chối",
};

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
};

export default function Requests() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [householdId, setHouseholdId] = useState("");
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadRequests();
  }, []);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const loadRequests = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiService.getLeaderRequests();
      if (response.success) {
        setRequests(response.data || []);
      }
    } catch (err) {
      console.error("Failed to load requests:", err);
      setError("Không thể tải danh sách yêu cầu");
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewDetail = async (request: Request) => {
    try {
      const response = await apiService.getRequestDetail(request.id);
      if (response.success) {
        setSelectedRequest(response.data);
        setShowDetailModal(true);
      }
    } catch (err) {
      setError("Không thể tải chi tiết yêu cầu");
    }
  };

  const handleApprove = async (requestId: number) => {
    setProcessingId(requestId);
    setError(null);
    try {
      // Gửi householdId nếu có và request type là ADD_PERSON
      const selectedRequest = requests.find(r => r.id === requestId);

      // Validate householdId cho ADD_PERSON
      if (selectedRequest?.type === 'ADD_PERSON') {
        const hasHouseholdId = selectedRequest.payload?.householdId || householdId.trim();
        if (!hasHouseholdId) {
          setError("Cần chỉ định ID hộ khẩu để thêm nhân khẩu");
          setProcessingId(null);
          return;
        }
      }

      const shouldSendHouseholdId = selectedRequest?.type === 'ADD_PERSON' && householdId.trim() !== '';

      const response = await apiService.approveRequest(
        requestId,
        shouldSendHouseholdId ? householdId.trim() : undefined
      );

      if (response.success) {
        setSuccess("Yêu cầu đã được duyệt thành công");
        loadRequests();
        setShowDetailModal(false);
        setHouseholdId(""); // Reset
      } else {
        setError(response.error?.message || "Duyệt yêu cầu thất bại");
      }
    } catch (err: any) {
      setError(err.message || "Duyệt yêu cầu thất bại");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !rejectionReason.trim()) return;

    setProcessingId(selectedRequest.id);
    setError(null);
    try {
      const response = await apiService.rejectRequest(selectedRequest.id, rejectionReason.trim());
      if (response.success) {
        setSuccess("Yêu cầu đã bị từ chối");
        loadRequests();
        setShowDetailModal(false);
        setShowRejectModal(false);
        setRejectionReason("");
      } else {
        setError(response.error?.message || "Từ chối yêu cầu thất bại");
      }
    } catch (err: any) {
      setError(err.message || "Từ chối yêu cầu thất bại");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
            Duyệt yêu cầu
          </h1>
          <p className="mt-1 text-gray-600">
            Quản lý và duyệt các yêu cầu từ người dân
          </p>
        </div>
        <button
          onClick={loadRequests}
          className="rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg hover:-translate-y-0.5"
        >
          🔄 Làm mới
        </button>
      </div>

      {/* Messages */}
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

      {/* Requests List */}
      <div className="rounded-xl border border-gray-200/80 bg-white shadow-sm">
        <div className="border-b border-gray-200 p-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Danh sách yêu cầu chờ duyệt ({requests.length})
          </h2>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-gray-500">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
            <p className="mt-2">Đang tải...</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Không có yêu cầu nào chờ duyệt
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Người yêu cầu
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Loại yêu cầu
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Thời gian
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {requests.map((request) => (
                  <tr
                    key={request.id}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {request.requesterName || "N/A"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {requestTypeLabels[request.type] || request.type}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(request.createdAt).toLocaleDateString("vi-VN", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-600">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleViewDetail(request)}
                          className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:border-blue-300 hover:text-blue-600"
                          title="Xem chi tiết và duyệt"
                        >
                          👁 Xem & Duyệt
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedRequest && (
        <div className="fixed inset-0 z-[120] flex min-h-screen w-screen items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-xl border border-gray-200 bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Chi tiết yêu cầu
              </h3>
              <button
                onClick={() => setShowDetailModal(false)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Người yêu cầu:</span>
                  <p className="text-gray-900">{selectedRequest.requesterName || "N/A"}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Loại yêu cầu:</span>
                  <p className="text-gray-900">{requestTypeLabels[selectedRequest.type] || selectedRequest.type}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Thời gian:</span>
                  <p className="text-gray-900">
                    {new Date(selectedRequest.createdAt).toLocaleDateString("vi-VN", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Trạng thái:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ml-2 ${statusColors[selectedRequest.status]}`}>
                    {statusLabels[selectedRequest.status] || selectedRequest.status}
                  </span>
                </div>
              </div>

              <div>
                <span className="font-medium text-gray-700">Thông tin yêu cầu:</span>
                <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                  {selectedRequest.type === "ADD_NEWBORN" && (
                    <div className="space-y-2 text-sm">
                      <div><strong>Họ tên:</strong> {selectedRequest.payload.hoTen}</div>
                      <div><strong>Ngày sinh:</strong> {selectedRequest.payload.ngaySinh}</div>
                      <div><strong>Giới tính:</strong> {selectedRequest.payload.gioiTinh}</div>
                      <div><strong>Nơi sinh:</strong> {selectedRequest.payload.noiSinh}</div>
                      {selectedRequest.payload.nguyenQuan && <div><strong>Nguyên quán:</strong> {selectedRequest.payload.nguyenQuan}</div>}
                      {selectedRequest.payload.danToc && <div><strong>Dân tộc:</strong> {selectedRequest.payload.danToc}</div>}
                      {selectedRequest.payload.tonGiao && <div><strong>Tôn giáo:</strong> {selectedRequest.payload.tonGiao}</div>}
                      {selectedRequest.payload.quocTich && <div><strong>Quốc tịch:</strong> {selectedRequest.payload.quocTich}</div>}
                      {selectedRequest.payload.cccd && <div><strong>CCCD:</strong> {selectedRequest.payload.cccd}</div>}
                      {selectedRequest.payload.ghiChu && <div><strong>Ghi chú:</strong> {selectedRequest.payload.ghiChu}</div>}
                    </div>
                  )}
                </div>
              </div>

              {/* Household ID field for ADD_PERSON */}
              {selectedRequest.status === "PENDING" && selectedRequest.type === "ADD_PERSON" && (
                <div className="pt-4 border-t">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ID Hộ khẩu {selectedRequest.payload?.householdId ? "(từ yêu cầu)" : "(bắt buộc)"}
                  </label>
                  <input
                    type="number"
                    value={householdId}
                    onChange={(e) => setHouseholdId(e.target.value)}
                    placeholder={selectedRequest.payload?.householdId ? selectedRequest.payload.householdId : "Nhập ID hộ khẩu..."}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Nhập ID hộ khẩu để thêm nhân khẩu vào. Bạn có thể tìm ID trong trang "Hộ khẩu".
                  </p>
                </div>
              )}

              {selectedRequest.status === "PENDING" && (
                <div className="flex gap-3 pt-4 border-t">
                  <button
                    onClick={() => handleApprove(selectedRequest.id)}
                    disabled={processingId === selectedRequest.id}
                    className="flex-1 rounded-lg bg-green-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg disabled:opacity-50"
                  >
                    {processingId === selectedRequest.id ? "Đang xử lý..." : "✅ Duyệt"}
                  </button>
                  <button
                    onClick={() => setShowRejectModal(true)}
                    disabled={processingId === selectedRequest.id}
                    className="rounded-lg border border-red-300 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    ❌ Từ chối
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-[130] flex min-h-screen w-screen items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Từ chối yêu cầu
              </h3>
              <button
                onClick={() => setShowRejectModal(false)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lý do từ chối <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                  placeholder="Nhập lý do từ chối yêu cầu..."
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleReject}
                  disabled={processingId === selectedRequest?.id || !rejectionReason.trim()}
                  className="flex-1 rounded-lg bg-red-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg disabled:opacity-50"
                >
                  {processingId === selectedRequest?.id ? "Đang xử lý..." : "Xác nhận từ chối"}
                </button>
                <button
                  onClick={() => setShowRejectModal(false)}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Hủy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
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
    { value: "ADD_PERSON", label: "Thêm nhân khẩu" },
    { value: "ADD_NEWBORN", label: "Thêm con sơ sinh" },
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

