import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useReactToPrint } from 'react-to-print';

const AGE_GROUPS = [
  { id: 'mam_non', label: 'Mầm non (<3t)' },
  { id: 'mau_giao', label: 'Mẫu giáo (3-5t)' },
  { id: 'cap_1', label: 'Cấp 1' },
  { id: 'cap_2', label: 'Cấp 2' },
  { id: 'cap_3', label: 'Cấp 3' },
  { id: 'lao_dong', label: 'Lao động' },
  { id: 'nghi_huu', label: 'Nghỉ hưu' },
];

const RESIDENCE_TYPES = [
  { id: 'thuong_tru', label: 'Thường trú' },
  { id: 'tam_tru', label: 'Tạm trú' },
  { id: 'tam_vang', label: 'Tạm vắng' }
];

export default function ThongKe() {
  const componentRef = useRef<HTMLDivElement>(null);
  // Cập nhật state để chứa mảng details từ Backend
  const [data, setData] = useState<any>({ demographics: [], residence: [], details: [] });
  const [filters, setFilters] = useState({
    genders: ['nam', 'nu'],
    ageGroups: [] as string[],
    residenceTypes: ['thuong_tru', 'tam_tru', 'tam_vang']
  });
  const [showDetails, setShowDetails] = useState(false);
  const loadData = async () => {
    try {
      const params = new URLSearchParams();
      filters.genders.forEach(g => params.append('genders', g));
      filters.ageGroups.forEach(a => params.append('ageGroups', a));
      filters.residenceTypes.forEach(r => params.append('residenceTypes', r));

      const res = await axios.get(`http://localhost:3000/api/thongke?${params.toString()}`);
      if (res.data.success) setData(res.data);
    } catch (err) {
      console.error("Lỗi kết nối API:", err);
    }
  };

  useEffect(() => { loadData(); }, [filters]);

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: 'Bao_cao_thong_ke_dan_cu_TDP7',
  });

  return (
    <div className="p-8 space-y-8 bg-gray-50 min-h-screen text-lg">
      {/* HEADER */}
      <div className="flex justify-between items-center border-b pb-4 bg-white p-4 rounded-t-xl shadow-sm">
        <h1 className="text-3xl font-extrabold text-gray-800 tracking-tight">Báo cáo Thống kê Dân cư TDP7</h1>
        <div className="space-x-4">
          <button onClick={loadData} className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-2 rounded-lg font-bold transition-all">Làm mới</button>
          <button onClick={() => handlePrint()} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2 rounded-lg font-bold shadow-lg transition-all">Xuất & In báo cáo</button>
        </div>
      </div>

      {/* BỘ LỌC */}
      <div className="bg-white p-8 rounded-xl shadow-md border border-gray-200 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {/* ... (Phần bộ lọc giữ nguyên như code cũ của bạn) */}
        <div>
          <p className="text-sm font-black text-blue-600 uppercase mb-4 tracking-widest border-b pb-2">1. Giới tính</p>
          <div className="flex gap-8">
            {['nam', 'nu'].map(g => (
              <label key={g} className="flex items-center gap-3 cursor-pointer capitalize text-xl font-medium">
                <input type="checkbox" checked={filters.genders.includes(g)}
                  onChange={() => setFilters({...filters, genders: filters.genders.includes(g) ? filters.genders.filter(x => x !== g) : [...filters.genders, g]})}
                  className="w-6 h-6 text-blue-600 rounded-lg" />
                {g === 'nam' ? 'Nam' : 'Nữ'}
              </label>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-black text-blue-600 uppercase mb-4 tracking-widest border-b pb-2">2. Trạng thái cư trú</p>
          <div className="flex flex-col gap-3">
            {RESIDENCE_TYPES.map(r => (
              <label key={r.id} className="flex items-center gap-3 cursor-pointer text-xl font-medium">
                <input type="checkbox" checked={filters.residenceTypes.includes(r.id)}
                  onChange={() => setFilters({...filters, residenceTypes: filters.residenceTypes.includes(r.id) ? filters.residenceTypes.filter(x => x !== r.id) : [...filters.residenceTypes, r.id]})}
                  className="w-6 h-6 text-green-600 rounded-lg" />
                {r.label}
              </label>
            ))}
          </div>
        </div>

        <div className="md:col-span-2 lg:col-span-1">
          <p className="text-sm font-black text-blue-600 uppercase mb-4 tracking-widest border-b pb-2">3. Nhóm độ tuổi</p>
          <div className="flex flex-wrap gap-3">
            {AGE_GROUPS.map(age => (
              <button key={age.id}
                onClick={() => setFilters({...filters, ageGroups: filters.ageGroups.includes(age.id) ? filters.ageGroups.filter(x => x !== age.id) : [...filters.ageGroups, age.id]})}
                className={`px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all ${
                  filters.ageGroups.includes(age.id) ? 'bg-blue-600 text-white border-blue-700' : 'bg-gray-100 text-gray-600 border-transparent'
                }`}>{age.label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* VÙNG DỮ LIỆU ĐỂ HIỂN THỊ VÀ IN */}
      <div ref={componentRef} className="bg-white p-12 rounded-xl shadow-lg border border-gray-100 print:shadow-none print:border-none">
        
        {/* Tiêu đề trang in (ẩn khi xem trên web) */}
        <div className="hidden print:block text-center mb-10 border-b-2 border-black pb-6">
          <h2 className="text-2xl font-bold uppercase">Cộng hòa xã hội chủ nghĩa Việt Nam</h2>
          <p className="text-lg font-medium">Độc lập - Tự do - Hạnh phúc</p>
          <h1 className="text-3xl font-black mt-8 uppercase">Báo cáo Thống kê Dân cư Tổ dân phố 7</h1>
          <p className="mt-2 text-gray-600 italic text-lg">Ngày xuất báo cáo: {new Date().toLocaleDateString('vi-VN')}</p>
        </div>

        <div className="space-y-12">
          {/* 1. BẢNG TỔNG HỢP (DEMOGRAPHICS) */}
          <section>
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">📊 1. Cơ cấu Độ tuổi & Giới tính (Tổng hợp)</h2>
            <table className="w-full text-lg border-collapse border border-gray-300">
              <thead className="bg-gray-100 uppercase font-bold text-sm">
                <tr>
                  <th className="border border-gray-300 p-4 text-left">Nhóm đối tượng</th>
                  <th className="border border-gray-300 p-4 text-center">Nam</th>
                  <th className="border border-gray-300 p-4 text-center">Nữ</th>
                  <th className="border border-gray-300 p-4 text-right bg-blue-50">Tổng số dân</th>
                </tr>
              </thead>
              <tbody>
                {data.demographics.map((item: any) => (
                  <tr key={item.age_group} className="hover:bg-gray-50">
                    <td className="border border-gray-300 p-4 font-semibold">{AGE_GROUPS.find(a => a.id === item.age_group)?.label || 'Khác'}</td>
                    <td className="border border-gray-300 p-4 text-center text-blue-700 font-bold">{item.nam}</td>
                    <td className="border border-gray-300 p-4 text-center text-pink-700 font-bold">{item.nu}</td>
                    <td className="border border-gray-300 p-4 text-right font-black bg-blue-50/50">{item.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* 2. DANH SÁCH CHI TIẾT NHÂN KHẨU */}
<section className="mt-8">
  <div className="flex justify-between items-center mb-6">
    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
      👥 2. Danh sách chi tiết nhân khẩu
    </h2>
    
    {/* NÚT ẤN ĐỂ HIỂN THỊ ĐỠ LOẠN */}
    <button 
      onClick={() => setShowDetails(!showDetails)}
      className={`px-6 py-2 rounded-full font-bold transition-all border-2 ${
        showDetails 
        ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100' 
        : 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100 shadow-sm'
      }`}
    >
      {showDetails ? '✕ Đóng danh sách' : '👁 Xem danh sách chi tiết'}
    </button>
  </div>

  {/* CHỈ HIỆN BẢNG KHI ẤN NÚT */}
  {showDetails && (
    <div className="overflow-x-auto border rounded-xl shadow-inner bg-gray-50 p-4 animate-in fade-in duration-500">
      <table className="w-full text-lg border-collapse border border-gray-300 bg-white">
        <thead className="bg-blue-600 text-white uppercase font-bold text-sm">
          <tr>
            <th className="border border-gray-300 p-3 text-center w-16">STT</th>
            <th className="border border-gray-300 p-3 text-left">Số CCCD</th>
            <th className="border border-gray-300 p-3 text-left">Họ và Tên</th>
            <th className="border border-gray-300 p-3 text-center">G.Tính</th>
            <th className="border border-gray-300 p-3 text-center">Tuổi</th>
            <th className="border border-gray-300 p-3 text-center">Cư trú</th>
          </tr>
        </thead>
        <tbody>
          {data.details && data.details.map((person: any, idx: number) => (
            <tr key={idx} className="hover:bg-blue-50">
              <td className="border border-gray-300 p-3 text-center text-gray-500">{idx + 1}</td>
              <td className="border border-gray-300 p-3 font-mono text-sm">{person.cccd || 'N/A'}</td>
              <td className="border border-gray-300 p-3 font-bold">{person.hoTen}</td>
              <td className="border border-gray-300 p-3 text-center capitalize">{person.gioiTinh === 'nam' ? 'Nam' : 'Nữ'}</td>
              <td className="border border-gray-300 p-3 text-center">{person.age}</td>
              <td className="border border-gray-300 p-3 text-center">
                <span className={`px-2 py-1 rounded text-xs font-bold ${
                  person.status === 'tam_tru' ? 'bg-green-100 text-green-700' : 
                  person.status === 'tam_vang' ? 'bg-orange-100 text-orange-700' : 
                  'bg-blue-100 text-blue-700'
                }`}>
                  {person.status === 'tam_tru' ? 'Tạm trú' : 
                   person.status === 'tam_vang' ? 'Tạm vắng' : 'Thường trú'}
                </span>
              </td>
            </tr>
          ))}
          {(!data.details || data.details.length === 0) && (
            <tr>
              <td colSpan={6} className="border border-gray-300 p-10 text-center text-gray-400 italic">
                Không tìm thấy nhân khẩu nào khớp với bộ lọc.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )}
</section>

          {/* 3. TÌNH TRẠNG CƯ TRÚ (TỔNG HỢP) */}
          <section className="print:mt-10">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">🏠 3. Tóm tắt biến động cư trú</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 print:grid-cols-2">
              {data.residence.map((res: any) => (
                <div key={res.loai} className="bg-blue-50 p-8 rounded-2xl border-l-8 border-blue-600 flex justify-between items-center">
                  <span className="text-xl font-black text-blue-900 uppercase tracking-wide">{res.loai === 'tam_tru' ? 'Đang tạm trú' : 'Đang tạm vắng'}</span>
                  <span className="text-6xl font-black text-blue-700">{res.count}</span>
                </div>
              ))}
            </div>
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