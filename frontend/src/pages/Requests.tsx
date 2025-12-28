import { useEffect, useState } from "react";
import { apiService } from "../services/api";
import RequestDetailModal from "../components/RequestDetailModal";

interface RequestItem {
  id: number;
  type: string;
  status: string;
  createdAt: string;
  requester: { id: number; fullName?: string; username?: string };
  hoKhauLienQuan?: { id?: number; soHoKhau?: string; diaChi?: string };
  nhanKhauLienQuan?: { id?: number; hoTen?: string };
  payload?: any;
}

export default function Requests() {
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    setIsLoading(true);
      try {
      console.log("[FE] fetching requests for leader");
      const res = await apiService.getRequestsList({ status: "PENDING", limit: 100 });
      const resAny = res as any;
      if (resAny.success) {
        setRequests(resAny.data || []);
      } else {
        console.warn("getRequestsList:", resAny.error?.message);
        setRequests([]);
      }
    } catch (err: any) {
      console.error("Failed to load requests:", err);
      setRequests([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Danh sách yêu cầu (Chờ duyệt)</h1>

      {isLoading ? (
        <div className="text-center py-8">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Đang tải...</p>
        </div>
      ) : requests.length === 0 ? (
        <p className="text-gray-500">Không có yêu cầu nào đang chờ duyệt.</p>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <div key={r.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm flex items-center justify-between">
              <div>
                <div className="font-semibold text-gray-900">
                  {r.type} {r.nhanKhauLienQuan ? `- ${r.nhanKhauLienQuan.hoTen}` : ""}
                </div>
                <div className="text-sm text-gray-500">
                  {r.hoKhauLienQuan ? `${r.hoKhauLienQuan.soHoKhau} - ${r.hoKhauLienQuan.diaChi}` : ""}
                </div>
                <div className="text-xs text-gray-400 mt-1">Gửi: {new Date(r.createdAt).toLocaleString()}</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    console.log("[UI] request row click:", r.id);
                    setSelectedRequestId(r.id);
                  }}
                  className="rounded-md bg-blue-600 text-white px-3 py-1 text-sm font-medium hover:bg-blue-700"
                >
                  Xem chi tiết
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedRequestId && (
        console.log("[Requests] rendering RequestDetailModal with selectedRequestId", selectedRequestId),
        <RequestDetailModal
          requestId={selectedRequestId}
          isOpen={!!selectedRequestId}
          onClose={() => {
            setSelectedRequestId(null);
            loadRequests();
          }}
          onRefresh={() => loadRequests()}
        />
      )}
    </div>
  );
}

 
