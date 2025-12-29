import { useEffect, useState } from "react";
import { apiService } from "../services/api";

export default function Feedbacks() {
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [currentFb, setCurrentFb] = useState<any>(null);
  const [responseContent, setResponseContent] = useState("");
  const [responderUnit, setResponderUnit] = useState("Ban quản lý TDP7");

  useEffect(() => {
    loadFeedbacks();
  }, []);

  const loadFeedbacks = async () => {
    setIsLoading(true);
    try {
      const res = await apiService.getAllFeedbacks();
      if (res.success) {
        setFeedbacks(res.data || []);
      }
    } catch (err) {
      console.error("Lỗi khi tải danh sách:", err);
    } finally {
      setIsLoading(false);
      setSelectedIds([]); 
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleMerge = async () => {
    if (selectedIds.length < 2) {
      alert("Vui lòng chọn ít nhất 2 phản ánh để gộp!");
      return;
    }
    if (window.confirm(`Bạn có chắc muốn gộp ${selectedIds.length} phản ánh này? Các phản ánh phụ sẽ được ẩn khỏi danh sách quản lý và xử lý chung với phản ánh chính.`)) {
      try {
        const res = await apiService.merge(selectedIds);
        if (res.success) {
          alert("Gộp thành công! Hệ thống đã tối ưu danh sách hiển thị.");
          await loadFeedbacks(); 
        } else {
          alert("Gộp thất bại: " + (res.message || "Lỗi hệ thống"));
        }
      } catch (err) {
        alert("Lỗi khi thực hiện gộp.");
      }
    }
  };

  const handleSubmitResponse = async () => {
    if (!responseContent.trim()) {
      alert("Vui lòng nhập nội dung phản hồi!");
      return;
    }

    if (!currentFb?.id) {
      alert("Lỗi: Không xác định được ID phản ánh!");
      return;
    }

    try {
      const res = await apiService.addResponse(currentFb.id, responderUnit, responseContent);
      
      if (res && res.success) {
        alert("Đã gửi phản hồi thành công! Tất cả các phản ánh liên quan đã được cập nhật trạng thái.");
        setShowResponseModal(false);
        setResponseContent("");
        await loadFeedbacks(); 
      } else {
        alert("Lỗi từ server: " + (res?.message || "Kiểm tra Database/Backend."));
      }
    } catch (err: any) {
      console.error("Lỗi Catch:", err);
      alert("Lỗi kết nối: " + (err.message || "Không thể kết nối đến máy chủ."));
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      cho_xu_ly: "bg-yellow-100 text-yellow-700 border-yellow-200",
      dang_xu_ly: "bg-blue-100 text-blue-700 border-blue-200",
      da_xu_ly: "bg-green-100 text-green-700 border-green-200",
      tu_choi: "bg-red-50 text-red-600 border-red-100",
    };
    return styles[status] || "bg-gray-100 text-gray-700 border-gray-200";
  };

  // Cập nhật nhãn trạng thái để Tổ trưởng dễ phân biệt các bài Đã gộp
  const getStatusLabel = (status: string, ketQuaXuLy?: string) => {
    if (status === "dang_xu_ly" && ketQuaXuLy?.includes("Đã gộp vào")) {
        return "Đã gộp";
    }
    const labels: Record<string, string> = {
      cho_xu_ly: "Chờ xử lý",
      dang_xu_ly: "Đang xử lý",
      da_xu_ly: "Đã xử lý",
      tu_choi: "Từ chối",
    };
    return labels[status] || status;
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-extrabold bg-gradient-to-r from-blue-700 to-cyan-600 bg-clip-text text-transparent">
            Quản lý Phản ánh & Kiến nghị
          </h1>
          {selectedIds.length > 0 && (
            <p className="text-sm text-blue-600 font-semibold mt-1 animate-pulse">
              ● Đang chọn {selectedIds.length} mục để xử lý
            </p>
          )}
        </div>
        
        <div className="flex gap-3">
          {selectedIds.length >= 2 && (
            <button 
              onClick={handleMerge}
              className="px-5 py-2 text-sm bg-orange-600 text-white rounded-xl hover:bg-orange-700 shadow-lg font-bold transition-all"
            >
              🔗 Gộp làm một
            </button>
          )}
          <button 
            onClick={loadFeedbacks}
            className="px-5 py-2 text-sm bg-white border border-gray-200 rounded-xl hover:bg-gray-50 font-medium text-gray-700 shadow-sm transition-all"
          >
            🔄 Làm mới
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-500 font-medium">Đang cập nhật dữ liệu...</p>
        </div>
      ) : (
        <div className="grid gap-5">
          {feedbacks
            /* SỬA TẠI ĐÂY: Ẩn hoàn toàn các phản ánh phụ đã bị gộp khỏi danh sách quản lý của Tổ trưởng */
            .filter(fb => !fb.ketQuaXuLy || !fb.ketQuaXuLy.includes("Đã gộp vào phản ánh ID:")) 
            .map((fb) => (
              <div 
                key={fb.id} 
                className={`group bg-white border rounded-2xl p-6 shadow-sm transition-all duration-300 flex gap-5 ${
                  selectedIds.includes(fb.id) ? "border-blue-400 ring-2 ring-blue-100 bg-blue-50/20" : "border-gray-100 hover:border-gray-300 hover:shadow-md"
                }`}
              >
                <div className="pt-1">
                  <input 
                    type="checkbox"
                    className="w-5 h-5 rounded-md border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer transition-transform group-hover:scale-110"
                    checked={selectedIds.includes(fb.id)}
                    onChange={() => toggleSelect(fb.id)}
                  />
                </div>

                <div className="flex-1">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-bold text-gray-900 text-xl leading-snug">{fb.tieuDe}</h3>
                    <div className="flex gap-2 items-center">
                      {fb.soLanPhanAnh > 1 && (
                        <span className="bg-orange-100 text-orange-700 text-[10px] px-2 py-1 rounded-lg font-black tracking-tighter uppercase shadow-sm border border-orange-200">
                          🔥 {fb.soLanPhanAnh} Lượt gửi
                        </span>
                      )}
                      <span className={`px-3 py-1 rounded-lg text-[11px] font-bold border ${getStatusBadge(fb.trangThai)}`}>
                        {getStatusLabel(fb.trangThai, fb.ketQuaXuLy)}
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-gray-600 mb-4 leading-relaxed">{fb.noiDung}</p>

                  <div className="flex flex-wrap gap-2 mb-5 items-center">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Người gửi:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {fb.danhSachNguoi && fb.danhSachNguoi.length > 0 ? (
                        fb.danhSachNguoi.map((name: string, index: number) => (
                          <span 
                            key={index} 
                            className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100 shadow-sm"
                          >
                            👤 {name}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-gray-400 italic">Chưa xác định danh tính</span>
                      )}
                    </div>
                  </div>

                  {fb.ketQuaXuLy && (
                    <div className="mb-6 p-4 bg-emerald-50 border-l-4 border-emerald-400 rounded-r-xl shadow-inner text-sm">
                      <p className="font-bold text-emerald-800 flex items-center gap-2 mb-1">
                        <span className="text-lg">💬</span> Nội dung phản hồi:
                      </p>
                      <p className="text-emerald-700 font-medium leading-relaxed">{fb.ketQuaXuLy}</p>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between pt-5 border-t border-gray-50 text-sm text-gray-400">
                    <div className="flex gap-6">
                      <span className="flex items-center gap-1.5 font-medium text-gray-500">
                        📂 {fb.loai}
                      </span>
                      <span className="flex items-center gap-1.5 font-medium text-gray-500">
                        📅 {new Date(fb.ngayTao).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                    
                    <button 
                      onClick={() => {
                        setCurrentFb(fb);
                        setResponseContent(fb.ketQuaXuLy || ""); 
                        setShowResponseModal(true);
                      }}
                      className="text-blue-600 font-bold hover:text-blue-800 transition-all flex items-center gap-1 group/btn"
                    >
                      Xử lý & Phản hồi <span className="group-hover/btn:translate-x-1 transition-transform">→</span>
                    </button>
                  </div>
                </div>
              </div>
          ))}
        </div>
      )}

      {showResponseModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full transform transition-all scale-100">
            <div className="p-8 border-b border-gray-50">
              <h2 className="text-2xl font-bold text-gray-900">Xử lý phản ánh</h2>
              <p className="text-sm text-gray-500 mt-2 line-clamp-1 italic">Vấn đề: "{currentFb?.tieuDe}"</p>
            </div>
            
            <div className="p-8 space-y-6">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Đơn vị xử lý</label>
                <input 
                  type="text" 
                  value={responderUnit}
                  onChange={(e) => setResponderUnit(e.target.value)}
                  className="w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Nội dung phản hồi cho dân</label>
                <textarea 
                  rows={5}
                  value={responseContent}
                  onChange={(e) => setResponseContent(e.target.value)}
                  placeholder="Mô tả quá trình xử lý hoặc kết quả tại đây..."
                  className="w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-medium resize-none"
                />
              </div>
            </div>

            <div className="p-8 bg-gray-50 flex justify-end gap-4 rounded-b-3xl">
              <button 
                onClick={() => setShowResponseModal(false)}
                className="px-6 py-3 text-gray-500 font-bold hover:text-gray-700 transition-colors"
              >
                Đóng
              </button>
              <button 
                onClick={handleSubmitResponse}
                className="px-8 py-3 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-200 active:scale-95 transition-all"
              >
                Xác nhận phản hồi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}