import { useState, useEffect, useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { apiService } from "../services/api";

const AGE_GROUPS = [
  { id: "mam_non", label: "Mầm non (<3t)" },
  { id: "mau_giao", label: "Mẫu giáo (3-5t)" },
  { id: "cap_1", label: "Cấp 1" },
  { id: "cap_2", label: "Cấp 2" },
  { id: "cap_3", label: "Cấp 3" },
  { id: "lao_dong", label: "Lao động" },
  { id: "nghi_huu", label: "Nghỉ hưu" },
];

const RESIDENCE_TYPES = [
  { id: "thuong_tru", label: "Thường trú" },
  { id: "tam_tru", label: "Tạm trú" },
  { id: "tam_vang", label: "Tạm vắng" },
];

export default function ThongKe() {
  const componentRef = useRef<HTMLDivElement>(null);
  // Cập nhật state để chứa mảng details từ Backend
  const [data, setData] = useState<any>({
    demographics: [],
    residence: [],
    details: [],
  });
  const [filters, setFilters] = useState({
    genders: ["nam", "nu"],
    ageGroups: [] as string[],
    residenceTypes: ["thuong_tru", "tam_tru", "tam_vang"],
  });
  const [showDetails, setShowDetails] = useState(false);
  const loadData = async () => {
    try {
      const res = await apiService.getThongKe({
        genders: filters.genders,
        ageGroups: filters.ageGroups,
        residenceTypes: filters.residenceTypes,
      });

      if (res.success) {
        setData({
          demographics: res.demographics || [],
          residence: res.residence || [],
          details: res.details || [],
        });
      }
    } catch (err) {
      console.error("Lỗi kết nối API:", err);
    }
  };

  useEffect(() => {
    loadData();
  }, [filters]);

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: "Bao_cao_thong_ke_dan_cu_TDP7",
  });

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-gray-200/60 bg-white p-5 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Thống kê dân cư TDP7
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Báo cáo tổng hợp theo giới tính, độ tuổi và trạng thái cư trú.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={loadData}
            className="rounded-lg bg-white border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Làm mới
          </button>
          <button
            onClick={() => handlePrint()}
            className="rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:from-blue-700 hover:to-cyan-700"
          >
            Xuất & In báo cáo
          </button>
        </div>
      </div>

      {/* BỘ LỌC */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200/60 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-3">Giới tính</p>
          <div className="flex gap-6">
            {["nam", "nu"].map((g) => (
              <label
                key={g}
                className="flex items-center gap-2 cursor-pointer capitalize text-sm font-medium text-gray-700"
              >
                <input
                  type="checkbox"
                  checked={filters.genders.includes(g)}
                  onChange={() =>
                    setFilters({
                      ...filters,
                      genders: filters.genders.includes(g)
                        ? filters.genders.filter((x) => x !== g)
                        : [...filters.genders, g],
                    })
                  }
                  className="h-4 w-4 rounded border-gray-300 text-blue-600"
                />
                {g === "nam" ? "Nam" : "Nữ"}
              </label>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-gray-700 mb-3">
            Trạng thái cư trú
          </p>
          <div className="flex flex-col gap-2">
            {RESIDENCE_TYPES.map((r) => (
              <label
                key={r.id}
                className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700"
              >
                <input
                  type="checkbox"
                  checked={filters.residenceTypes.includes(r.id)}
                  onChange={() =>
                    setFilters({
                      ...filters,
                      residenceTypes: filters.residenceTypes.includes(r.id)
                        ? filters.residenceTypes.filter((x) => x !== r.id)
                        : [...filters.residenceTypes, r.id],
                    })
                  }
                  className="h-4 w-4 rounded border-gray-300 text-blue-600"
                />
                {r.label}
              </label>
            ))}
          </div>
        </div>

        <div className="md:col-span-2 lg:col-span-1">
          <p className="text-sm font-semibold text-gray-700 mb-3">
            Nhóm độ tuổi
          </p>
          <div className="flex flex-wrap gap-3">
            {AGE_GROUPS.map((age) => (
              <button
                key={age.id}
                onClick={() =>
                  setFilters({
                    ...filters,
                    ageGroups: filters.ageGroups.includes(age.id)
                      ? filters.ageGroups.filter((x) => x !== age.id)
                      : [...filters.ageGroups, age.id],
                  })
                }
                className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  filters.ageGroups.includes(age.id)
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                }`}
              >
                {age.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* VÙNG DỮ LIỆU ĐỂ HIỂN THỊ VÀ IN */}
      <div
        ref={componentRef}
        className="bg-white p-8 rounded-xl shadow-sm border border-gray-200/60 print:shadow-none print:border-none"
      >
        {/* Tiêu đề trang in (ẩn khi xem trên web) */}
        <div className="hidden print:block text-center mb-10 border-b-2 border-black pb-6">
          <h2 className="text-2xl font-bold uppercase">
            Cộng hòa xã hội chủ nghĩa Việt Nam
          </h2>
          <p className="text-lg font-medium">Độc lập - Tự do - Hạnh phúc</p>
          <h1 className="text-3xl font-black mt-8 uppercase">
            Báo cáo Thống kê Dân cư Tổ dân phố 7
          </h1>
          <p className="mt-2 text-gray-600 italic text-lg">
            Ngày xuất báo cáo: {new Date().toLocaleDateString("vi-VN")}
          </p>
        </div>

        <div className="space-y-12">
          {/* 1. BẢNG TỔNG HỢP (DEMOGRAPHICS) */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              1. Cơ cấu độ tuổi & giới tính (tổng hợp)
            </h2>
            <table className="w-full text-sm border-collapse border border-gray-200">
              <thead className="bg-gray-50 text-gray-700 uppercase font-semibold text-xs">
                <tr>
                  <th className="border border-gray-200 p-3 text-left">
                    Nhóm đối tượng
                  </th>
                  <th className="border border-gray-200 p-3 text-center">
                    Nam
                  </th>
                  <th className="border border-gray-200 p-3 text-center">Nữ</th>
                  <th className="border border-gray-200 p-3 text-right">
                    Tổng
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.demographics.map((item: any) => (
                  <tr key={item.age_group} className="hover:bg-gray-50">
                    <td className="border border-gray-200 p-3 font-medium">
                      {AGE_GROUPS.find((a) => a.id === item.age_group)?.label ||
                        "Khác"}
                    </td>
                    <td className="border border-gray-200 p-3 text-center">
                      {item.nam}
                    </td>
                    <td className="border border-gray-200 p-3 text-center">
                      {item.nu}
                    </td>
                    <td className="border border-gray-200 p-3 text-right font-semibold">
                      {item.count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* 2. DANH SÁCH CHI TIẾT NHÂN KHẨU */}
          <section className="mt-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-gray-900">
                2. Danh sách chi tiết nhân khẩu
              </h2>

              {/* NÚT ẤN ĐỂ HIỂN THỊ ĐỠ LOẠN */}
              <button
                onClick={() => setShowDetails(!showDetails)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
                  showDetails
                    ? "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                    : "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                }`}
              >
                {showDetails ? "Đóng danh sách" : "Xem danh sách chi tiết"}
              </button>
            </div>

            {/* CHỈ HIỆN BẢNG KHI ẤN NÚT */}
            {showDetails && (
              <div className="overflow-x-auto border rounded-xl bg-gray-50 p-4">
                <table className="w-full text-sm border-collapse border border-gray-200 bg-white">
                  <thead className="bg-gray-50 text-gray-700 uppercase font-semibold text-xs">
                    <tr>
                      <th className="border border-gray-200 p-3 text-center w-16">
                        STT
                      </th>
                      <th className="border border-gray-200 p-3 text-left">
                        Số CCCD
                      </th>
                      <th className="border border-gray-200 p-3 text-left">
                        Họ và Tên
                      </th>
                      <th className="border border-gray-200 p-3 text-center">
                        Giới tính
                      </th>
                      <th className="border border-gray-200 p-3 text-center">
                        Tuổi
                      </th>
                      <th className="border border-gray-200 p-3 text-center">
                        Cư trú
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.details &&
                      data.details.map((person: any, idx: number) => (
                        <tr key={idx} className="hover:bg-blue-50">
                          <td className="border border-gray-200 p-3 text-center text-gray-500">
                            {idx + 1}
                          </td>
                          <td className="border border-gray-200 p-3 font-mono text-xs">
                            {person.cccd || "N/A"}
                          </td>
                          <td className="border border-gray-200 p-3 font-medium">
                            {person.hoTen}
                          </td>
                          <td className="border border-gray-200 p-3 text-center capitalize">
                            {person.gioiTinh === "nam" ? "Nam" : "Nữ"}
                          </td>
                          <td className="border border-gray-200 p-3 text-center">
                            {person.age}
                          </td>
                          <td className="border border-gray-200 p-3 text-center">
                            <span
                              className={`px-2 py-1 rounded text-xs font-bold ${
                                person.status === "tam_tru"
                                  ? "bg-green-100 text-green-700"
                                  : person.status === "tam_vang"
                                  ? "bg-orange-100 text-orange-700"
                                  : "bg-blue-100 text-blue-700"
                              }`}
                            >
                              {person.status === "tam_tru"
                                ? "Tạm trú"
                                : person.status === "tam_vang"
                                ? "Tạm vắng"
                                : "Thường trú"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    {(!data.details || data.details.length === 0) && (
                      <tr>
                        <td
                          colSpan={6}
                          className="border border-gray-200 p-10 text-center text-gray-400 italic"
                        >
                          Không tìm thấy nhân khẩu nào khớp với bộ lọc.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        {/* Chữ ký trang in */}
        <div className="hidden print:flex justify-between mt-20 px-10">
          <div className="text-center">
            <p className="font-bold">Người lập báo cáo</p>
            <p className="text-sm italic mt-1">(Ký và ghi rõ họ tên)</p>
          </div>
          <div className="text-center">
            <p className="font-bold">Xác nhận của Tổ trưởng</p>
            <p className="text-sm italic mt-1">(Ký tên và đóng dấu)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
