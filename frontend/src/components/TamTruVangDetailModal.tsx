import React, { useEffect, useState } from "react";
import { apiService } from "../services/api";
import { formatFromYMD } from "../utils/date";

type Props = {
  requestId: number;
  isOpen: boolean;
  onClose: () => void;
  onRefresh?: () => void;
};

export default function TamTruVangDetailModal({ requestId, isOpen, onClose, onRefresh }: Props) {
  const [requestDetail, setRequestDetail] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && requestId) {
      loadRequestDetail();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, requestId]);

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(null), 3000);
      return () => clearTimeout(t);
    }
  }, [success]);

  const loadRequestDetail = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const resp = await apiService.getTamTruTamVangRequestDetail(requestId);
      if (resp.success) {
        setRequestDetail(resp.data);
      } else {
        setError("Không tìm thấy thông tin yêu cầu");
      }
    } catch (err: any) {
      setError(err?.error?.message || "Không thể tải chi tiết yêu cầu");
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!confirm("Bạn có chắc chắn muốn duyệt yêu cầu này?")) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const resp = await apiService.approveTamTruTamVangRequest(requestId);
      if (resp.success) {
        setSuccess("Duyệt yêu cầu thành công");
        onRefresh?.();
        setTimeout(() => onClose(), 800);
      }
    } catch (err: any) {
      setError(err?.error?.message || "Không thể duyệt yêu cầu");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (rejectReason.trim().length < 5) {
      setError("Lý do từ chối phải có ít nhất 5 ký tự");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const resp = await apiService.rejectTamTruTamVangRequest(requestId, rejectReason.trim());
      if (resp.success) {
        setSuccess("Từ chối yêu cầu thành công");
        setShowRejectModal(false);
        setRejectReason("");
        onRefresh?.();
        setTimeout(() => onClose(), 800);
      }
    } catch (err: any) {
      setError(err?.error?.message || "Không thể từ chối yêu cầu");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-xl shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Chi tiết yêu cầu {requestDetail?.type === "tam_vang" ? "Tạm vắng" : "Tạm trú"}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            ✕
          </button>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent" />
              <span className="ml-3 text-gray-600">Đang tải...</span>
            </div>
          ) : requestDetail ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Loại</label>
                    <div className="text-sm text-gray-900">{requestDetail.type}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
                    <div className="text-sm text-gray-900">{requestDetail.status}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ngày gửi</label>
                    <p className="text-sm text-gray-900">
                      {requestDetail.createdAt ? new Date(requestDetail.createdAt).toLocaleString("vi-VN") : "-"}
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Người gửi</label>
                    <div className="text-sm text-gray-900">{requestDetail.requester?.fullName || "-"}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Người tạm trú/tạm vắng</label>
                    <div className="text-sm text-gray-900">
                      {requestDetail.person?.hoTen || requestDetail.nhanKhau?.hoTen || "-"}
                    </div>
                  </div>
                </div>
              </div>

              {(requestDetail.nhanKhau || requestDetail.person) && (
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Thông tin nhân khẩu</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Họ tên</label>
                      <p className="text-sm text-gray-900">{requestDetail.nhanKhau?.hoTen || requestDetail.person?.hoTen}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">CCCD</label>
                      <p className="text-sm text-gray-900">{requestDetail.nhanKhau?.cccd || requestDetail.person?.cccd || "Chưa cập nhật"}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Thời gian và địa chỉ</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Từ ngày</label>
                    <p className="text-sm text-gray-900">{formatFromYMD(requestDetail.payload?.tuNgay || requestDetail.tuNgay)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Đến ngày</label>
                    <p className="text-sm text-gray-900">{requestDetail.payload?.denNgay ? formatFromYMD(requestDetail.payload.denNgay) : (requestDetail.denNgay ? formatFromYMD(requestDetail.denNgay) : "Không xác định")}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ</label>
                  <p className="text-sm text-gray-900">{requestDetail.payload?.diaChi || requestDetail.diaChi || "-"}</p>
                </div>
              </div>

              {(requestDetail.payload?.reason || requestDetail.payload?.lyDo || requestDetail.lyDo) && (
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Lý do</h3>
                  <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">{requestDetail.payload?.reason || requestDetail.payload?.lyDo || requestDetail.lyDo}</p>
                </div>
              )}

              {requestDetail.attachments && requestDetail.attachments.length > 0 && (
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">File đính kèm</h3>
                  <div className="space-y-2">
                    {requestDetail.attachments.map((attachment: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            📎
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{attachment.originalName || attachment.name}</p>
                            <p className="text-xs text-gray-500">
                              {(attachment.size / 1024).toFixed(1)} KB • {attachment.mimeType}
                            </p>
                          </div>
                        </div>
                        <a
                          href={`${window.location.origin}${attachment.url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Tải xuống
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {error && <div className="border-t border-gray-200 pt-6"><div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-700">{error}</div></div>}
              {success && <div className="border-t border-gray-200 pt-6"><div className="rounded-lg bg-green-50 border border-green-200 p-4 text-green-700">{success}</div></div>}
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">Không tìm thấy thông tin yêu cầu</p>
            </div>
          )}
        </div>

        {requestDetail && requestDetail.status === "pending" && (
          <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg">Đóng</button>
            <button onClick={() => setShowRejectModal(true)} disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg disabled:opacity-50">Từ chối</button>
            <button onClick={handleApprove} disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg disabled:opacity-50">{isSubmitting ? "Đang xử lý..." : "Duyệt"}</button>
          </div>
        )}

        {showRejectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="w-full max-w-md bg-white rounded-xl shadow-2xl">
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Từ chối yêu cầu</h3>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Lý do từ chối <span className="text-red-500">*</span></label>
                  <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={4} className="w-full rounded-lg border border-gray-300 px-3 py-2" placeholder="Nhập lý do từ chối..." />
                </div>
                {error && <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-red-700 text-sm">{error}</div>}
                <div className="flex items-center justify-end space-x-3">
                  <button onClick={() => { setShowRejectModal(false); setRejectReason(""); setError(null); }} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg">Hủy</button>
                  <button onClick={handleReject} disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg disabled:opacity-50">{isSubmitting ? "Đang xử lý..." : "Xác nhận từ chối"}</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


