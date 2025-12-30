import pdfMake from "pdfmake/build/pdfmake";
// pdfmake ships fonts as a virtual file system bundle
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import pdfFonts from "pdfmake/build/vfs_fonts";

(pdfMake as any).vfs = (pdfFonts as any).pdfMake?.vfs;

const formatDateVN = (value?: string | null) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("vi-VN");
};

const normalizeType = (type?: string | null) => String(type || "").toLowerCase();

const pickFirstString = (...values: any[]): string => {
  for (const v of values) {
    const s = v === null || v === undefined ? "" : String(v).trim();
    if (s) return s;
  }
  return "";
};

export type TamTruTamVangDetail = {
  id: number;
  type?: string | null;
  loai?: "tam_tru" | "tam_vang" | string | null;
  status?: string | null;
  tuNgay?: string | null;
  denNgay?: string | null;
  lyDo?: string | null;
  diaChi?: string | null;
  createdAt?: string | null;
  requesterName?: string | null;
  applicant?: { hoTen?: string | null; cccd?: string | null } | null;
  subject?: {
    hoTen?: string | null;
    cccd?: string | null;
    ngaySinh?: string | null;
    gioiTinh?: string | null;
    quanHe?: string | null;
  } | null;
  person?: { hoTen?: string | null; cccd?: string | null } | null;
  household?: { soHoKhau?: string | null; diaChi?: string | null } | null;
  payload?: any;
};

export const downloadTamTruTamVangPdf = (detail: TamTruTamVangDetail) => {
  const typeUpper = String(detail.type || "").toUpperCase();
  const loaiNormalized = String(detail.loai || "").toLowerCase();

  // Prefer explicit mapping from backend (loai/type). Only fallback to payload when needed.
  const isTamVang =
    loaiNormalized === "tam_vang" ||
    typeUpper.includes("ABSENCE") ||
    typeUpper.includes("TAM_VANG") ||
    normalizeType(detail.payload?.type || detail.payload?.loai).includes("tam_vang") ||
    normalizeType(detail.payload?.type || detail.payload?.loai).includes("temporary_absence");

  const title = isTamVang
    ? "GIẤY ĐỀ NGHỊ KHAI BÁO TẠM VẮNG"
    : "GIẤY ĐỀ NGHỊ ĐĂNG KÝ TẠM TRÚ";

  // Business rule: applicant is household head (chu ho)
  const applicantName = pickFirstString(
    detail.applicant?.hoTen,
    detail.payload?.chuHo?.hoTen,
    detail.requesterName,
    detail.payload?.requesterName
  );

  const applicantCccd = pickFirstString(
    detail.applicant?.cccd,
    detail.payload?.chuHo?.cccd,
    detail.payload?.cccdChuHo,
    detail.payload?.cccdNguoiDangKy
  );

  // Subject: the person who is actually temporary resident/absent (entered CCCD)
  const subjectName = pickFirstString(
    detail.subject?.hoTen,
    detail.payload?.person?.hoTen,
    detail.person?.hoTen,
    detail.payload?.personName,
    detail.payload?.nguoiTamTruVang?.hoTen,
    detail.payload?.nguoiLienQuan?.hoTen
  );

  const subjectCccd = pickFirstString(
    detail.subject?.cccd,
    detail.payload?.person?.cccd,
    detail.person?.cccd,
    detail.payload?.personCccd,
    detail.payload?.nguoiTamTruVang?.cccd,
    detail.payload?.cccdNguoiTamTruVang,
    detail.payload?.nguoiLienQuan?.cccd,
    detail.payload?.cccdNguoiLienQuan
  );

  const householdCode = pickFirstString(
    detail.household?.soHoKhau,
    detail.payload?.soHoKhau,
    detail.payload?.householdCode,
    detail.payload?.maSoHoKhau
  );

  const householdAddress = pickFirstString(
    detail.household?.diaChi,
    detail.payload?.householdAddress,
    detail.payload?.diaChiThuongTru,
    detail.payload?.diaChiCuTru
  );

  const tuNgay = pickFirstString(detail.tuNgay, detail.payload?.tuNgay);
  const denNgay = pickFirstString(detail.denNgay, detail.payload?.denNgay);
  const lyDo = pickFirstString(detail.lyDo, detail.payload?.lyDo);
  const diaChi = pickFirstString(detail.diaChi, detail.payload?.diaChi, householdAddress);

  const now = new Date();
  const placeAndDate = `..., ngày ${String(now.getDate()).padStart(2, "0")} tháng ${String(
    now.getMonth() + 1
  ).padStart(2, "0")} năm ${now.getFullYear()}`;

  const signerName = isTamVang ? subjectName : applicantName;

  const toTruongName = pickFirstString(
    detail.payload?.toTruong?.hoTen,
    detail.payload?.toTruongHoTen,
    detail.payload?.toTruongName
  );

  const sections: any[] = [];

  if (!isTamVang) {
    sections.push({
      text: [
        {
          text: "\n1. Thông tin chủ hộ (hộ khẩu nơi đăng ký tạm trú):\n",
          bold: true,
        },
        `- Họ và tên: ${applicantName || "................................"}\n`,
        `- Số CCCD/CMND: ${applicantCccd || "................................"}\n`,
        `- Địa chỉ thường trú: ${householdAddress || "................................"}\n`,
        householdCode ? `- Số hộ khẩu: ${householdCode}\n` : "",
      ],
      style: "body",
    });
  }

  sections.push({
    text: [
      {
        text: `\n${isTamVang ? "1" : "2"}. Thông tin người ${isTamVang ? "tạm vắng" : "tạm trú"}:\n`,
        bold: true,
      },
      `- Họ và tên: ${subjectName || "................................"}\n`,
      `- Số CCCD/CMND: ${subjectCccd || "................................"}\n`,
    ],
    style: "body",
  });

  sections.push({
    text: [
      {
        text: `\n${isTamVang ? "2" : "3"}. Thời gian ${isTamVang ? "tạm vắng" : "tạm trú"}:\n`,
        bold: true,
      },
      `- Từ ngày: ${tuNgay ? formatDateVN(tuNgay) : ".........."}  `,
      `Đến ngày: ${denNgay ? formatDateVN(denNgay) : ".........."}\n`,
    ],
    style: "body",
  });

  sections.push({
    text: [
      {
        text: `\n${isTamVang ? "3" : "4"}. ${isTamVang ? "Nơi đến (địa chỉ tạm vắng)" : "Địa chỉ tạm trú"}:\n`,
        bold: true,
      },
      `- ${diaChi || "................................"}\n`,
    ],
    style: "body",
  });

  sections.push({
    text: [
      { text: `\n${isTamVang ? "4" : "5"}. Lý do:\n`, bold: true },
      `- ${lyDo || "................................"}\n`,
    ],
    style: "body",
  });

  const docDefinition: any = {
    pageSize: "A4",
    pageMargins: [50, 40, 50, 40],
    content: [
      {
        columns: [
          { width: "*", text: "" },
          {
            width: "auto",
            text: `Mã đơn: #${detail.id}`,
            style: "smallMuted",
            alignment: "right",
          },
        ],
      },
      { text: "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", style: "header", alignment: "center" },
      { text: "Độc lập - Tự do - Hạnh phúc", style: "subHeader", alignment: "center" },
      { text: "______________________________", alignment: "center", margin: [0, 0, 0, 18] },

      { text: title, style: "title", alignment: "center" },
      { text: "\nKính gửi: Công an ............................................................", style: "body" },

      ...sections,

      {
        text:
          "\nTôi xin cam đoan những nội dung kê khai trên là đúng sự thật và chịu trách nhiệm trước pháp luật về lời khai của mình.",
        style: "body",
      },

      { text: "\n\n" },

      {
        columns: [
          {
            width: "*",
            stack: [
              // Spacer to align with the applicant's place/date line on the right
              { text: " ", alignment: "center", style: "body" },
              { text: "TỔ TRƯỞNG", alignment: "center", bold: true },
              { text: "(Ký, ghi rõ họ tên)", alignment: "center", style: "smallMuted" },
              { text: "\n\n\n\n" },
              { text: toTruongName || "................................", alignment: "center", bold: true },
            ],
          },
          {
            width: "*",
            stack: [
              { text: placeAndDate, alignment: "center", style: "body" },
              { text: `${isTamVang ? "NGƯỜI KHAI BÁO" : "NGƯỜI LÀM ĐƠN"}`, alignment: "center", bold: true },
              { text: "(Ký, ghi rõ họ tên)", alignment: "center", style: "smallMuted" },
              { text: "\n\n\n\n" },
              { text: signerName || "................................", alignment: "center", bold: true },
            ],
          },
        ],
      },
    ],
    styles: {
      header: { fontSize: 12, bold: true },
      subHeader: { fontSize: 11, bold: true },
      title: { fontSize: 14, bold: true, margin: [0, 0, 0, 8] },
      body: { fontSize: 11, lineHeight: 1.35 },
      smallMuted: { fontSize: 9, color: "#666666" },
    },
    defaultStyle: {
      font: "Roboto",
    },
  };

  const fileBase = isTamVang ? "don-tam-vang" : "don-tam-tru";
  const fileName = `${fileBase}_#${detail.id}.pdf`;
  pdfMake.createPdf(docDefinition).download(fileName);
};
