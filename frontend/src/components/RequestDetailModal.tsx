import { useState, useEffect } from "react";
import { apiService } from "../services/api";
import { getCurrentUser } from "../utils/auth";
import { formatFromYMD } from "../utils/date";

interface RequestDetailModalProps {
  requestId: number;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

interface RequestDetail {
  id: number;
  type: string;
  status: string;
  nguoiGui: {
    hoTen?: string;
    username?: string;
    cccd?: string;
  };
  hoKhauLienQuan?: {
    id?: number;
    soHoKhau?: string;
    diaChi?: string;
  };
  createdAt: string;
  payload: any;
}

const requestTypeLabels: Record<string, string> = {
  TACH_HO_KHAU: "Yêu cầu tách hộ khẩu",
  SUA_NHAN_KHAU: "Sửa thông tin nhân khẩu",
  XOA_NHAN_KHAU: "Xoá nhân khẩu",
  TAM_TRU: "Xin tạm trú",
  TAM_VANG: "Xin tạm vắng",
};

const quanHeLabels: Record<string, string> = {
  chu_ho: "Chủ hộ",
  vo_chong: "Vợ/Chồng",
  con: "Con",
  cha_me: "Cha/Mẹ",
  anh_chi_em: "Anh/Chị/Em",
  ong_ba: "Ông/Bà",
  chau: "Cháu",
  khac: "Khác",
};

export default function RequestDetailModal({
  requestId,
  isOpen,
  onClose,
  onRefresh,
}: RequestDetailModalProps) {
  console.log("[RequestDetailModal init props]", { requestId, isOpen });
  const [requestDetail, setRequestDetail] = useState<RequestDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && requestId) {
      loadRequestDetail();
    }
  }, [isOpen, requestId]);

  const loadRequestDetail = async () => {
    setIsLoading(true);
    setError(null);
    try {
      console.log("[UI] RequestDetailModal mount loadRequestDetail", requestId);
      // For tam-tru-vang requests, use the specific API
      const isTamTruVang = requestDetail?.type === 'TEMPORARY_RESIDENCE' ||
                          requestDetail?.type === 'TEMPORARY_ABSENCE' ||
                          requestDetail?.type === 'TAM_TRU' ||
                          requestDetail?.type === 'TAM_VANG';

      const response = isTamTruVang
        ? await apiService.getTamTruVangRequestDetail(requestId)
        : await apiService.getRequestDetail(requestId);

      if (response.success) {
        console.log("[UI] loadRequestDetail response.status:", response.data?.status);
        setRequestDetail(response.data);
        // compute role/canReview debug
        const cu = getCurrentUser();
        const role = cu?.role || null;
        const canReview = role ? ["can_bo", "to_truong", "to_pho"].includes(role) : false;
        console.log("[RequestDetailModal]", { role, canReview, status: response.data?.status, requestId: response.data?.id });
      }
    } catch (err: any) {
      const msg = err?.error?.message || err?.message || err;
      setError(typeof msg === "object" ? JSON.stringify(msg) : String(msg || "Không thể tải chi tiết yêu cầu"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!confirm("Bạn có chắc chắn muốn duyệt yêu cầu này?")) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      // For tam-tru-vang requests, use the specific API
      const isTamTruVang = requestDetail?.type === 'TEMPORARY_RESIDENCE' ||
                          requestDetail?.type === 'TEMPORARY_ABSENCE' ||
                          requestDetail?.type === 'TAM_TRU' ||
                          requestDetail?.type === 'TAM_VANG';

      const cu = getCurrentUser();
      const role = cu?.role || null;
      const canReview = role ? ["can_bo", "to_truong", "to_pho"].includes(role) : false;
      console.log("[RequestDetailModal] approve attempt", { requestId, role, canReview });
      if (!canReview) {
        throw { code: "FORBIDDEN", message: "Bạn không có quyền duyệt yêu cầu này" };
      }

      console.log("[UI] approving request:", requestId);
      const response = isTamTruVang
        ? await apiService.approveTamTruVangRequest(requestId)
        : await apiService.approveRequest(requestId);
      console.log("[UI] approve response:", response);

      if (response.success) {
        const applied = response.data?.applied;
        const appliedInfo = applied && applied.id ? ` (applied id: ${applied.id})` : "";
        alert("Duyệt yêu cầu thành công!" + appliedInfo);
        onRefresh();
        onClose();
      }
    } catch (err: any) {
      console.error("[UI] approve error:", err);
      const msg = err?.error?.message || err?.message || "Không thể duyệt yêu cầu";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim() || rejectReason.trim().length < 5) {
      setError("Vui lòng nhập lý do từ chối (ít nhất 5 ký tự)");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      // For tam-tru-vang requests, use the specific API
      const isTamTruVang = requestDetail?.type === 'TEMPORARY_RESIDENCE' ||
                          requestDetail?.type === 'TEMPORARY_ABSENCE' ||
                          requestDetail?.type === 'TAM_TRU' ||
                          requestDetail?.type === 'TAM_VANG';
      const cu = getCurrentUser();
      const role = cu?.role || null;
      const canReview = role ? ["can_bo", "to_truong", "to_pho"].includes(role) : false;
      console.log("[RequestDetailModal] reject attempt", { requestId, role, canReview });
      if (!canReview) {
        throw { code: "FORBIDDEN", message: "Bạn không có quyền duyệt yêu cầu này" };
      }

      console.log("[UI] rejecting request:", requestId, "reason:", rejectReason);
      const response = isTamTruVang
        ? await apiService.rejectTamTruVangRequest(requestId, rejectReason)
        : await apiService.rejectRequest(requestId, rejectReason);
      console.log("[UI] reject response:", response);

      if (response.success) {
        alert("Từ chối yêu cầu thành công!");
        setShowRejectModal(false);
        setRejectReason("");
        onRefresh();
        onClose();
      }
    } catch (err: any) {
      console.error("[UI] reject error:", err);
      const msg = err?.error?.message || err?.message || "Không thể từ chối yêu cầu";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // render-time debug for status/role
  const cuRender = getCurrentUser();
  const roleRender = cuRender?.role || null;
  const statusValueRender = String(requestDetail?.status || "").trim().toUpperCase();
  const canReviewRender = roleRender ? ["can_bo", "to_truong", "to_pho"].includes(roleRender) : false;
  console.log("[RequestDetailModal render]", { requestId, statusValueRender, roleRender, canReviewRender, requestDetail });

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <div
          className="w-full max-w-4xl rounded-2xl border border-gray-200 bg-white shadow-xl max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
            <h2 className="text-2xl font-bold text-gray-900">
              Chi tiết yêu cầu #{requestId}
            </h2>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                <div className="mb-2">{error}</div>
                {/* Quick action: allow leader to reject with this reason */}
                {requestDetail?.status === "pending" && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setRejectReason(String(error));
                        setShowRejectModal(true);
                      }}
                      className="rounded-md bg-red-600 text-white px-3 py-1 text-sm font-medium hover:bg-red-700"
                    >
                      Từ chối với lý do này
                    </button>
                  </div>
                )}
              </div>
            )}

            {isLoading ? (
              <div className="text-center py-12">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
                <p className="mt-4 text-gray-600">Đang tải chi tiết...</p>
              </div>
            ) : requestDetail ? (
              <>
                {/* Thông tin chung */}
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Thông tin chung
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Loại yêu cầu</p>
                      <p className="text-base font-semibold text-gray-900">
                        {requestTypeLabels[requestDetail.type] || requestDetail.type}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Người gửi</p>
                      <p className="text-base font-semibold text-gray-900">
                        {requestDetail.nguoiGui?.hoTen || requestDetail.nguoiGui?.username || "-"}
                        {requestDetail.nguoiGui?.cccd && (
                          <span className="text-gray-500 ml-1">
                            ({requestDetail.nguoiGui.cccd})
                          </span>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Ngày gửi</p>
                      <p className="text-base font-semibold text-gray-900">
                        {new Date(requestDetail.createdAt).toLocaleDateString("vi-VN", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    {requestDetail.hoKhauLienQuan && (
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Hộ khẩu liên quan</p>
                    <p className="text-base font-semibold text-gray-900">
                      {requestDetail.hoKhauLienQuan.soHoKhau || requestDetail.hoKhauLienQuan.diaChi || "-"}
                    </p>
                    {requestDetail.targetHouseholdId && (
                      <div className="mt-2">
                        <button
                          onClick={() => {
                            window.location.href = `/ho-khau/${requestDetail.targetHouseholdId}`;
                          }}
                          className="rounded-md border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          Mở hộ khẩu
                        </button>
                      </div>
                    )}
                      </div>
                    )}
                {/* Requester info */}
                <div className="mt-4">
                  <p className="text-sm text-gray-500 mb-1">Người tạo đơn</p>
                  <p className="text-base font-semibold text-gray-900">
                    {requestDetail.requesterName || requestDetail.requester?.hoTen || requestDetail.requesterUsername || "-"}
                    {requestDetail.requesterCccd && <span className="text-gray-500 ml-2">({requestDetail.requesterCccd})</span>}
                  </p>
                </div>
                  </div>
                </div>

                {/* Chi tiết theo loại yêu cầu */}
                {requestDetail.type === "TACH_HO_KHAU" && requestDetail.payload && (
                  <div className="rounded-lg border border-gray-200 bg-white p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Chi tiết yêu cầu tách hộ khẩu
                    </h3>
                    <div className="space-y-4">
                      {requestDetail.payload.selectedNhanKhauIds && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-2">
                            Nhân khẩu tách ra ({requestDetail.payload.selectedNhanKhauIds.length} người)
                          </p>
                          <p className="text-sm text-gray-600">
                            IDs: {requestDetail.payload.selectedNhanKhauIds.join(", ")}
                          </p>
                        </div>
                      )}
                      {requestDetail.payload.newChuHoId && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-2">Chủ hộ mới</p>
                          <p className="text-sm text-gray-600">
                            ID: {requestDetail.payload.newChuHoId}
                          </p>
                        </div>
                      )}
                      {requestDetail.payload.newAddress && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-2">
                            Địa chỉ hộ khẩu mới
                          </p>
                          <p className="text-sm text-gray-600">
                            {requestDetail.payload.newAddress}
                          </p>
                        </div>
                      )}
                      {requestDetail.payload.expectedDate && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-2">
                            Ngày dự kiến tách hộ
                          </p>
                          <p className="text-sm text-gray-600">
                            {new Date(requestDetail.payload.expectedDate).toLocaleDateString(
                              "vi-VN"
                            )}
                          </p>
                        </div>
                      )}
                      {requestDetail.payload.reason && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-2">Lý do</p>
                          <p className="text-sm text-gray-600 whitespace-pre-wrap">
                            {requestDetail.payload.reason}
                          </p>
                        </div>
                      )}
                      {requestDetail.payload.note && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-2">Ghi chú</p>
                          <p className="text-sm text-gray-600 whitespace-pre-wrap">
                            {requestDetail.payload.note}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {requestDetail.type === "SUA_NHAN_KHAU" && requestDetail.payload && (
                  <div className="rounded-lg border border-gray-200 bg-white p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Chi tiết yêu cầu sửa nhân khẩu
                    </h3>
                    <div className="space-y-4">
                      {requestDetail.payload.nhanKhauId && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-2">
                            Nhân khẩu cần sửa
                          </p>
                          <p className="text-sm text-gray-600">
                            ID: {requestDetail.payload.nhanKhauId}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">
                          Thông tin thay đổi
                        </p>
                        <div className="bg-gray-50 rounded p-3 text-sm text-gray-600">
                          {requestDetail.payload.hoTen && (
                            <p>Họ tên: {requestDetail.payload.hoTen}</p>
                          )}
                          {requestDetail.payload.cccd && (
                            <p>CCCD: {requestDetail.payload.cccd}</p>
                          )}
                          {requestDetail.payload.ngaySinh && (
                            <p>Ngày sinh: {formatFromYMD(requestDetail.payload.ngaySinh)}</p>
                          )}
                          {requestDetail.payload.gioiTinh && (
                            <p>
                              Giới tính:{" "}
                              {requestDetail.payload.gioiTinh === "nam"
                                ? "Nam"
                                : requestDetail.payload.gioiTinh === "nu"
                                ? "Nữ"
                                : "Khác"}
                            </p>
                          )}
                        </div>
                      </div>
                      {requestDetail.payload.lyDo && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-2">Lý do</p>
                          <p className="text-sm text-gray-600 whitespace-pre-wrap">
                            {requestDetail.payload.lyDo}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {requestDetail.type === "XOA_NHAN_KHAU" && requestDetail.payload && (
                  <div className="rounded-lg border border-gray-200 bg-white p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Chi tiết yêu cầu xoá nhân khẩu
                    </h3>
                    <div className="space-y-4">
                      {requestDetail.payload.nhanKhauId && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-2">
                            Nhân khẩu cần xoá
                          </p>
                          <p className="text-sm text-gray-600">
                            ID: {requestDetail.payload.nhanKhauId}
                          </p>
                        </div>
                      )}
                      {requestDetail.payload.lyDo && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-2">Lý do</p>
                          <p className="text-sm text-gray-600 whitespace-pre-wrap">
                            {requestDetail.payload.lyDo}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {requestDetail.type === "TAM_TRU" && requestDetail.payload && (
                  <div className="rounded-lg border border-gray-200 bg-white p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Chi tiết yêu cầu tạm trú
                    </h3>
                    <div className="space-y-4">
                      {requestDetail.payload.nhanKhauId && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-2">
                            Nhân khẩu xin tạm trú
                          </p>
                          <p className="text-sm text-gray-600">
                            ID: {requestDetail.payload.nhanKhauId}
                          </p>
                        </div>
                      )}
                      {requestDetail.payload.diaChi && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-2">Địa chỉ tạm trú</p>
                          <p className="text-sm text-gray-600">
                            {requestDetail.payload.diaChi}
                          </p>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-4">
                        {requestDetail.payload.tuNgay && (
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-2">Từ ngày</p>
                            <p className="text-sm text-gray-600">
                              {formatFromYMD(requestDetail.payload.tuNgay)}
                            </p>
                          </div>
                        )}
                        {requestDetail.payload.denNgay && (
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-2">Đến ngày</p>
                            <p className="text-sm text-gray-600">
                              {formatFromYMD(requestDetail.payload.denNgay)}
                            </p>
                          </div>
                        )}
                      </div>
                      {requestDetail.payload.lyDo && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-2">Lý do</p>
                          <p className="text-sm text-gray-600 whitespace-pre-wrap">
                            {requestDetail.payload.lyDo}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {requestDetail.type === "TAM_VANG" && requestDetail.payload && (
                  <div className="rounded-lg border border-gray-200 bg-white p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Chi tiết yêu cầu tạm vắng
                    </h3>
                    <div className="space-y-4">
                      {requestDetail.payload.nhanKhauId && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-2">
                            Nhân khẩu xin tạm vắng
                          </p>
                          <p className="text-sm text-gray-600">
                            ID: {requestDetail.payload.nhanKhauId}
                          </p>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-4">
                        {requestDetail.payload.tuNgay && (
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-2">Từ ngày</p>
                            <p className="text-sm text-gray-600">
                              {formatFromYMD(requestDetail.payload.tuNgay)}
                            </p>
                          </div>
                        )}
                        {requestDetail.payload.denNgay && (
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-2">Đến ngày</p>
                            <p className="text-sm text-gray-600">
                              {formatFromYMD(requestDetail.payload.denNgay)}
                            </p>
                          </div>
                        )}
                      </div>
                      {requestDetail.payload.lyDo && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-2">Lý do</p>
                          <p className="text-sm text-gray-600 whitespace-pre-wrap">
                            {requestDetail.payload.lyDo}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Actions */}
                {String(requestDetail.status || "").toUpperCase() === "PENDING" && (
                  <div className="flex gap-3 pt-4 border-t border-gray-200">
                    <button
                      onClick={handleApprove}
                      disabled={isSubmitting}
                      className="flex-1 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 px-4 py-2.5 text-sm font-medium text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? "Đang xử lý..." : "Duyệt"}
                    </button>
                    <button
                      onClick={() => setShowRejectModal(true)}
                      disabled={isSubmitting}
                      className="flex-1 rounded-lg border border-red-300 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Từ chối
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">Không tìm thấy thông tin yêu cầu.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div
            className="w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Từ chối yêu cầu</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lý do từ chối <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                  placeholder="Nhập lý do từ chối..."
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectReason("");
                  }}
                  className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Huỷ
                </button>
                <button
                  onClick={handleReject}
                  disabled={isSubmitting || !rejectReason.trim()}
                  className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Đang xử lý..." : "Xác nhận từ chối"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


