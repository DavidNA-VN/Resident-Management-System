import { FormEvent, useState, useEffect } from "react";
import { apiService } from "../../services/api";

interface Feedback {
  id: number;
  tieuDe: string;
  noiDung: string;
  loai: string;
  trangThai: string;
  ngayTao: string;
  // Thêm các trường dữ liệu mới để nhận phản hồi từ Backend
  ketQuaXuLy?: string; 
  ngayXuLy?: string;
}

const loaiLabels: Record<string, string> = {
  co_so_ha_tang: "Cơ sở hạ tầng",
  moi_truong: "Môi trường",
  an_ninh: "An ninh",
  y_te: "Y tế",
  giao_duc: "Giáo dục",
  khac: "Khác",
};

const loaiCards: Array<{ key: keyof typeof loaiLabels; img: string }> = [
  { key: "moi_truong", img: "/images/moitruong.jpg" },
  { key: "co_so_ha_tang", img: "/images/cosohatang.jpg" },
  { key: "giao_duc", img: "/images/giaoduc.jpg" },
  { key: "y_te", img: "/images/yte.jpg" },
  { key: "an_ninh", img: "/images/anninh.jpg" },
  { key: "khac", img: "/images/back-up-fe.jpg" },
];

const statusLabels: Record<string, string> = {
  cho_xu_ly: "Chờ xử lý",
  dang_xu_ly: "Đang xử lý",
  da_xu_ly: "Đã xử lý",
  tu_choi: "Từ chối",
};

const statusColors: Record<string, string> = {
  cho_xu_ly: "bg-yellow-100 text-yellow-700",
  dang_xu_ly: "bg-blue-100 text-blue-700",
  da_xu_ly: "bg-green-100 text-green-700",
  tu_choi: "bg-red-100 text-red-700",
};

export default function PhanAnh() {
  const [formData, setFormData] = useState({
    tieuDe: "",
    noiDung: "",
    loai: "khac",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadFeedbacks();
  }, []);

  const loadFeedbacks = async () => {
    setIsLoading(true);
    try {
      const response = await apiService.getMyFeedbacks();
      if (response.success) {
        setFeedbacks(response.data || []);
      }
    } catch (err) {
      console.error("Failed to load feedbacks:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!formData.tieuDe.trim() || !formData.noiDung.trim()) {
      setError("Vui lòng điền đầy đủ tiêu đề và nội dung");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await apiService.createFeedback({
        tieuDe: formData.tieuDe,
        noiDung: formData.noiDung,
        loai: formData.loai,
      });

      if (response.success) {
        setSuccess("Gửi phản ánh thành công!");
        setFormData({
          tieuDe: "",
          noiDung: "",
          loai: "khac",
        });
        loadFeedbacks();
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err: any) {
      setError(err.error?.message || "Có lỗi xảy ra khi gửi phản ánh");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-blue-200/60 bg-gradient-to-r from-blue-50 via-cyan-50 to-teal-50 p-6 shadow-sm backdrop-blur-sm">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
          Phản ánh ý kiến
        </h1>
        <p className="mt-2 text-gray-600">
          Gửi phản ánh, kiến nghị của bạn đến tổ dân phố
        </p>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-green-700">
          {success}
        </div>
      )}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Form */}
      <div className="rounded-xl border border-gray-200/80 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <span>📝</span>
          Gửi phản ánh mới
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tiêu đề <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.tieuDe}
              onChange={(e) =>
                setFormData({ ...formData, tieuDe: e.target.value })
              }
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              placeholder="Nhập tiêu đề phản ánh..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Chủ đề phản ánh
            </label>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {loaiCards.map((item) => {
                const selected = formData.loai === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setFormData({ ...formData, loai: item.key })}
                    className={`group overflow-hidden rounded-xl border text-left transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                      selected
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                    aria-pressed={selected}
                    title={loaiLabels[item.key]}
                  >
                    <div className="h-24 w-full bg-gray-100">
                      <img
                        src={item.img}
                        alt={loaiLabels[item.key]}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <div className="px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-gray-900">
                          {loaiLabels[item.key]}
                        </span>
                        {selected && (
                          <span className="text-xs font-semibold text-blue-700">
                            Đã chọn
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {item.key === "moi_truong" && "Vệ sinh, rác thải, ô nhiễm"}
                        {item.key === "co_so_ha_tang" && "Đường xá, điện nước, công trình"}
                        {item.key === "giao_duc" && "Trường lớp, học tập, trẻ em"}
                        {item.key === "y_te" && "Khám chữa bệnh, dịch bệnh"}
                        {item.key === "an_ninh" && "Trật tự, an toàn khu phố"}
                        {item.key === "khac" && "Chủ đề khác"}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nội dung phản ánh <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.noiDung}
              onChange={(e) =>
                setFormData({ ...formData, noiDung: e.target.value })
              }
              rows={6}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              placeholder="Nhập nội dung phản ánh, kiến nghị của bạn..."
              required
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              className="rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 px-6 py-2.5 text-sm font-medium text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Đang gửi..." : "Gửi phản ánh"}
            </button>
          </div>
        </form>
      </div>

      {/* My Feedbacks */}
      <div className="rounded-xl border border-gray-200/80 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <span>📋</span>
          Phản ánh của tôi
        </h2>
        {isLoading ? (
          <div className="text-center py-8">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
            <p className="mt-2 text-gray-600">Đang tải...</p>
          </div>
        ) : feedbacks.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            Bạn chưa có phản ánh nào.
          </p>
        ) : (
          <div className="space-y-3">
            {feedbacks.map((feedback) => (
              <div
                key={feedback.id}
                className="rounded-lg border border-gray-200 bg-gray-50 p-4 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold text-gray-900">
                    {feedback.tieuDe}
                  </h4>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${
                        statusColors[feedback.trangThai] ||
                        "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {statusLabels[feedback.trangThai] || feedback.trangThai}
                    </span>
                    <span className="px-2 py-1 rounded text-xs font-medium bg-blue-50 text-blue-700">
                      {loaiLabels[feedback.loai] || feedback.loai}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-gray-700 mb-2">{feedback.noiDung}</p>

                {/* HIỂN THỊ PHẦN PHẢN HỒI NẾU CÓ */}
                {feedback.ketQuaXuLy && (
                  <div className="mt-3 p-3 bg-emerald-50 border border-emerald-100 rounded-lg shadow-inner">
                    <p className="text-xs font-bold text-emerald-700 uppercase mb-1 flex items-center gap-1">
                      <span>💬</span> Phản hồi từ Tổ dân phố:
                    </p>
                    <p className="text-sm text-emerald-800 font-medium">
                      {feedback.ketQuaXuLy}
                    </p>
                    {feedback.ngayXuLy && (
                      <p className="text-[10px] text-emerald-600 mt-2 italic text-right">
                        Cập nhật lúc:{" "}
                        {new Date(feedback.ngayXuLy).toLocaleString("vi-VN")}
                      </p>
                    )}
                  </div>
                )}

                <p className="text-xs text-gray-500 mt-3 border-t pt-2">
                  Ngày gửi:{" "}
                  {new Date(feedback.ngayTao).toLocaleDateString("vi-VN", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}