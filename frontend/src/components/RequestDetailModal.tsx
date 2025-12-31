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
  targetHouseholdId?: number;
  targetPersonId?: number;
  requester?: { hoTen?: string; cccd?: string; username?: string };
  requesterName?: string;
  requesterUsername?: string;
  requesterCccd?: string;
  createdAt: string;
  payload: any;
  precheck?: {
    warnings?: Array<{ code: string; message: string; details?: any }>;
  };
}

const firstNonEmpty = (...candidates: any[]): string | undefined => {
  for (const c of candidates) {
    const s = typeof c === "string" ? c.trim() : "";
    if (s) return s;
  }
  return undefined;
};

const extractRequester = (raw: any) => {
  const name = firstNonEmpty(
    raw?.nguoiGui?.hoTen,
    raw?.nguoiGui?.fullName,
    raw?.requesterName,
    raw?.requester?.hoTen,
    raw?.requester?.fullName,
    raw?.requesterUsername,
    raw?.nguoiGui?.username,
    raw?.requester?.username,
    raw?.payload?.citizen?.hoTen,
    raw?.payload?.user?.fullName,
    raw?.payload?.user?.username
  );

  const cccd = firstNonEmpty(
    raw?.nguoiGui?.cccd,
    raw?.requesterCccd,
    raw?.requester?.cccd,
    raw?.payload?.citizen?.cccd,
    raw?.payload?.person?.cccd,
    raw?.payload?.user?.cccd
  );

  return { name, cccd };
};

const gioiTinhLabel = (v: any) => {
  const s = String(v || "").toLowerCase();
  if (s === "nam") return "Nam";
  if (s === "nu") return "Nữ";
  if (s === "khac") return "Khác";
  return v ? String(v) : "";
};

const hoKhauCodeLabel = (v: any) => {
  const s = String(v ?? "").trim();
  if (!s) return "";

  // Accept formats like: 1, 0001, hk1, HK0001, hk-0001
  const m = s.match(/^(hk)[\s\-_]*0*(\d+)$/i);
  if (m) return `hk${String(m[2]).padStart(4, "0")}`;
  if (/^\d+$/.test(s)) return `hk${s.padStart(4, "0")}`;

  return s;
};

const formatValueForPath = (
  path: string,
  value: string,
  requestDetail: RequestDetail
) => {
  const raw = String(path || "").trim();
  const segments = raw.split(".");
  const lastSeg = segments[segments.length - 1] || "";
  const lastBase = lastSeg.replace(/\[\d+\]/g, "");
  const key = normalizeKey(lastBase);

  if (key === "gioitinh" || key === "gender" || key === "sex") {
    return gioiTinhLabel(value);
  }

  if (key === "householdid" || key === "targethouseholdid") {
    const soHoKhau = firstNonEmpty(
      requestDetail?.hoKhauLienQuan?.soHoKhau,
      requestDetail?.payload?.soHoKhau,
      requestDetail?.payload?.sohokhau
    );
    return hoKhauCodeLabel(soHoKhau || value) || value;
  }

  return value;
};

const quanHeOptions = [
  { value: "chu_ho", label: "Chủ hộ" },
  { value: "vo_chong", label: "Vợ/Chồng" },
  { value: "con", label: "Con" },
  { value: "cha_me", label: "Cha/Mẹ" },
  { value: "anh_chi_em", label: "Anh/Chị/Em" },
  { value: "ong_ba", label: "Ông/Bà" },
  { value: "chau", label: "Cháu" },
  { value: "khac", label: "Khác" },
];

const quanHeLabel = (v: any) => {
  const s = String(v || "");
  const found = quanHeOptions.find((x) => x.value === s);
  return found ? found.label : s;
};

type FlatField = {
  path: string;
  value: string;
};

const isPlainObject = (v: any) =>
  v !== null &&
  typeof v === "object" &&
  !Array.isArray(v) &&
  !(v instanceof Date);

const formatScalarForDisplay = (v: any): string => {
  if (v === undefined) return "";
  if (v === null) return "";
  if (typeof v === "boolean") return v ? "Có" : "Không";
  if (typeof v === "number") return String(v);
  if (typeof v === "string") return v;
  // Fallback for unexpected scalar-like values
  try {
    return String(v);
  } catch {
    return "";
  }
};

const flattenPayloadForForm = (
  value: any,
  prefix = "",
  out: FlatField[] = []
): FlatField[] => {
  if (value === undefined || value === null) return out;

  if (Array.isArray(value)) {
    if (value.length === 0) return out;

    const allScalars = value.every(
      (x) =>
        x === null ||
        x === undefined ||
        ["string", "number", "boolean"].includes(typeof x)
    );

    if (allScalars) {
      out.push({
        path: prefix || "payload",
        value: value
          .map((x) => formatScalarForDisplay(x))
          .filter(Boolean)
          .join("\n"),
      });
      return out;
    }

    value.forEach((item, idx) => {
      const p = prefix ? `${prefix}[${idx}]` : `[${idx}]`;
      flattenPayloadForForm(item, p, out);
    });
    return out;
  }

  if (isPlainObject(value)) {
    for (const key of Object.keys(value)) {
      const nextPrefix = prefix ? `${prefix}.${key}` : key;
      flattenPayloadForForm(value[key], nextPrefix, out);
    }
    return out;
  }

  out.push({ path: prefix || "payload", value: formatScalarForDisplay(value) });
  return out;
};

const shouldUseTextArea = (v: string) => {
  const s = String(v || "");
  return s.includes("\n") || s.length > 80;
};

const labelMap: Record<string, string> = {
  // Common
  lydo: "Lý do",
  reason: "Lý do",
  noidung: "Nội dung",
  note: "Ghi chú",
  ghichu: "Ghi chú",
  diachi: "Địa chỉ",
  sohokhau: "Số hộ khẩu",
  tungay: "Từ ngày",
  denngay: "Đến ngày",
  ngaydukiem: "Ngày dự kiến",
  expecteddate: "Ngày dự kiến",
  newaddress: "Địa chỉ mới",
  ismoisinh: "Là trẻ sơ sinh",
  isnewborn: "Là trẻ sơ sinh",
  // Person/Newborn fields
  hoten: "Họ và tên",
  cccd: "CCCD/CMND",
  bidanh: "Bí danh",
  ngaysinh: "Ngày sinh",
  gioitinh: "Giới tính",
  noisinh: "Nơi sinh",
  nguyenquan: "Nguyên quán",
  dantoc: "Dân tộc",
  tongiao: "Tôn giáo",
  quoctich: "Quốc tịch",
  quanhe: "Quan hệ",
  ngaydangkythuongtru: "Ngày đăng ký thường trú",
  diachithuongtrutruoc: "Địa chỉ thường trú trước đây",
  nghenghiep: "Nghề nghiệp",
  noilamviec: "Nơi làm việc",
  ngaycapcccd: "Ngày cấp CCCD",
  noicapcccd: "Nơi cấp CCCD",
  // Deceased / move-out
  ngaymat: "Ngày mất",
  noimat: "Nơi mất",
  ngaychet: "Ngày mất",
  noichet: "Nơi mất",
  ngayquadoi: "Ngày mất",
  noiquadoi: "Nơi mất",
  // IDs / misc
  nhankhauid: "ID nhân khẩu",
  personid: "ID nhân khẩu",
  targetpersonid: "ID nhân khẩu",
  householdid: "ID hộ khẩu",
  targethouseholdid: "ID hộ khẩu",
  selectednhankhauids: "Danh sách nhân khẩu tách ra",
  newchuhoid: "Chủ hộ mới (ID)",
};

const normalizeKey = (k: string) =>
  String(k || "")
    .trim()
    .toLowerCase();

const humanizeKey = (k: string) => {
  const s = String(k || "").trim();
  if (!s) return "";
  const spaced = s
    .replace(/_/g, " ")
    .replace(/([a-z\d])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
};

const labelForKey = (k: string) => {
  const nk = normalizeKey(k);
  return labelMap[nk] || humanizeKey(k);
};

const labelForPath = (path: string) => {
  const raw = String(path || "").trim();
  if (!raw) return "";

  const segments = raw.split(".");
  const lastSeg = segments[segments.length - 1] || "";
  const lastBase = lastSeg.replace(/\[\d+\]/g, "");
  const lastIdxMatch = lastSeg.match(/\[(\d+)\]/);
  const lastLabelBase = labelForKey(lastBase);
  return lastIdxMatch ? `${lastLabelBase} #${lastIdxMatch[1]}` : lastLabelBase;
};

const requestDetailTitle = (type: string) => {
  const label = requestTypeLabels[type] || type;
  let s = String(label || "").trim();
  s = s.replace(/^Yêu\s+cầu\s+/i, "");
  s = s
    .replace(/^Xin\s+/i, "xin ")
    .replace(/^Thêm\s+/i, "thêm ")
    .replace(/^Sửa\s+/i, "sửa ")
    .replace(/^Xoá\s+/i, "xoá ")
    .replace(/^Xác\s+nhận\s+/i, "xác nhận ");
  return s ? `Chi tiết yêu cầu ${s}` : "Chi tiết yêu cầu";
};

const requestTypeLabels: Record<string, string> = {
  TACH_HO_KHAU: "Yêu cầu tách hộ khẩu",
  SPLIT_HOUSEHOLD: "Yêu cầu tách hộ khẩu",
  ADD_PERSON: "Thêm nhân khẩu",
  ADD_NEWBORN: "Thêm con sơ sinh",
  TEMPORARY_RESIDENCE: "Xin tạm trú",
  TEMPORARY_ABSENCE: "Xin tạm vắng",
  SUA_NHAN_KHAU: "Sửa thông tin nhân khẩu",
  XOA_NHAN_KHAU: "Xoá nhân khẩu",
  UPDATE_PERSON: "Sửa thông tin nhân khẩu",
  REMOVE_PERSON: "Xoá nhân khẩu",
  TAM_TRU: "Xin tạm trú",
  TAM_VANG: "Xin tạm vắng",
  DECEASED: "Xác nhận qua đời",
  MOVE_OUT: "Xác nhận chuyển đi",
};

export default function RequestDetailModal({
  requestId,
  isOpen,
  onClose,
  onRefresh,
}: RequestDetailModalProps) {
  console.log("[RequestDetailModal init props]", { requestId, isOpen });
  const [requestDetail, setRequestDetail] = useState<RequestDetail | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const warnings = Array.isArray(requestDetail?.precheck?.warnings)
    ? requestDetail!.precheck!.warnings!
    : [];
  const hasBlockingWarnings = warnings.length > 0;

  const buildRejectReasonFromWarnings = (
    ws: Array<{ code?: string; message?: string }>
  ) => {
    const lines = (ws || [])
      .map((w) => String(w?.message || "").trim())
      .filter(Boolean);
    if (lines.length === 0) return "";
    return `Không thể duyệt do các cảnh báo/điều kiện tiên quyết sau:\n- ${lines.join(
      "\n- "
    )}`;
  };

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
      const isTamTruVang =
        requestDetail?.type === "TEMPORARY_RESIDENCE" ||
        requestDetail?.type === "TEMPORARY_ABSENCE" ||
        requestDetail?.type === "TAM_TRU" ||
        requestDetail?.type === "TAM_VANG";

      const response = isTamTruVang
        ? await apiService.getTamTruVangRequestDetail(requestId)
        : await apiService.getRequestDetail(requestId);

      if (response.success) {
        console.log(
          "[UI] loadRequestDetail response.status:",
          response.data?.status
        );

        const raw: any = response.data || {};
        const requesterExtract = extractRequester(raw);
        const mergedNguoiGui = {
          ...raw.nguoiGui,
          hoTen: requesterExtract.name || raw.nguoiGui?.hoTen,
          username:
            raw.nguoiGui?.username ||
            raw.requesterUsername ||
            raw.requester?.username,
          cccd: requesterExtract.cccd || raw.nguoiGui?.cccd,
        };

        setRequestDetail({
          ...raw,
          nguoiGui: mergedNguoiGui,
          requester: raw.requester,
          requesterName: raw.requesterName || requesterExtract.name,
          requesterUsername: raw.requesterUsername || raw.requester?.username,
          requesterCccd: raw.requesterCccd || requesterExtract.cccd,
        });

        // If backend reports precheck warnings, suggest a reject reason up-front
        const ws = Array.isArray(raw?.precheck?.warnings)
          ? raw.precheck.warnings
          : [];
        if (ws.length > 0) {
          const suggested = buildRejectReasonFromWarnings(ws);
          setRejectReason((prev) => (prev.trim() ? prev : suggested));
        }
        // compute role/canReview debug
        const cu = getCurrentUser();
        const role = cu?.role || null;
        const canReview = role
          ? ["can_bo", "to_truong", "to_pho"].includes(role)
          : false;
        console.log("[RequestDetailModal]", {
          role,
          canReview,
          status: response.data?.status,
          requestId: response.data?.id,
        });
      }
    } catch (err: any) {
      const msg = err?.error?.message || err?.message || err;
      setError(
        typeof msg === "object"
          ? JSON.stringify(msg)
          : String(msg || "Không thể tải chi tiết yêu cầu")
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async () => {
    if (hasBlockingWarnings) {
      const suggested = buildRejectReasonFromWarnings(warnings);
      if (suggested)
        setRejectReason((prev) => (prev.trim() ? prev : suggested));
      setError(
        "Yêu cầu có cảnh báo/điều kiện tiên quyết nên không thể duyệt. Vui lòng từ chối và ghi rõ lý do."
      );
      return;
    }

    if (!confirm("Bạn có chắc chắn muốn duyệt yêu cầu này?")) {
      return;
    }

    if (!requestDetail) {
      setError("Không có dữ liệu yêu cầu để duyệt");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      let approveHouseholdId: number | undefined;
      // For tam-tru-vang requests, use the specific API
      const isTamTruVang =
        requestDetail?.type === "TEMPORARY_RESIDENCE" ||
        requestDetail?.type === "TEMPORARY_ABSENCE" ||
        requestDetail?.type === "TAM_TRU" ||
        requestDetail?.type === "TAM_VANG";

      const cu = getCurrentUser();
      const role = cu?.role || null;
      const canReview = role
        ? ["can_bo", "to_truong", "to_pho"].includes(role)
        : false;
      console.log("[RequestDetailModal] approve attempt", {
        requestId,
        role,
        canReview,
      });
      if (!canReview) {
        throw {
          code: "FORBIDDEN",
          message: "Bạn không có quyền duyệt yêu cầu này",
        };
      }

      // Xử lý đặc thù cho yêu cầu thêm nhân khẩu: kiểm tra trùng CCCD, trùng Chủ hộ trước khi duyệt
      if (requestDetail?.type === "ADD_PERSON") {
        const person = requestDetail.payload?.person;
        const householdId =
          requestDetail.targetHouseholdId ||
          requestDetail.hoKhauLienQuan?.id ||
          requestDetail.payload?.targetHouseholdId;
        approveHouseholdId = householdId;

        if (!householdId) {
          throw { message: "Không xác định được hộ khẩu cần thêm" };
        }

        try {
          const membersRes = await apiService.getNhanKhauList(householdId);
          if (membersRes?.success) {
            const members = membersRes.data || [];

            // Kiểm tra trùng CCCD
            if (person?.cccd) {
              const dup = members.find(
                (m: any) =>
                  (m.cccd || "").trim() !== "" && m.cccd === person.cccd
              );
              if (dup) {
                throw {
                  message: `CCCD đã tồn tại trong hộ khẩu (ID ${dup.id})`,
                };
              }
            }

            // Kiểm tra 2 chủ hộ
            const isChuHo =
              String(person?.quanHe || "").toLowerCase() === "chu_ho";
            if (isChuHo) {
              const hasChuHo = members.some(
                (m: any) => String(m.quanHe || "").toLowerCase() === "chu_ho"
              );
              if (hasChuHo) {
                throw {
                  message:
                    "Hộ khẩu đã có Chủ hộ, không thể thêm một Chủ hộ thứ hai",
                };
              }
            }
          }
        } catch (validationErr: any) {
          const msg =
            validationErr?.message ||
            "Không thể kiểm tra ràng buộc trước khi duyệt";
          setRejectReason(msg);
          throw { message: msg };
        }
      }

      console.log("[UI] approving request:", requestId);
      const response = isTamTruVang
        ? await apiService.approveTamTruVangRequest(requestId)
        : await apiService.approveRequest(
            requestId,
            approveHouseholdId ? String(approveHouseholdId) : undefined
          );
      console.log("[UI] approve response:", response);

      if (response.success) {
        const applied = response.data?.applied;
        const appliedInfo =
          applied && applied.id ? ` (applied id: ${applied.id})` : "";
        alert(`Duyệt yêu cầu thành công!${appliedInfo}`);
        onRefresh();
        onClose();
      }
    } catch (err: any) {
      console.error("[UI] approve error:", err);
      const msg =
        err?.error?.message || err?.message || "Không thể duyệt yêu cầu";
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
      const isTamTruVang =
        requestDetail?.type === "TEMPORARY_RESIDENCE" ||
        requestDetail?.type === "TEMPORARY_ABSENCE" ||
        requestDetail?.type === "TAM_TRU" ||
        requestDetail?.type === "TAM_VANG";
      const cu = getCurrentUser();
      const role = cu?.role || null;
      const canReview = role
        ? ["can_bo", "to_truong", "to_pho"].includes(role)
        : false;
      console.log("[RequestDetailModal] reject attempt", {
        requestId,
        role,
        canReview,
      });
      if (!canReview) {
        throw {
          code: "FORBIDDEN",
          message: "Bạn không có quyền duyệt yêu cầu này",
        };
      }

      console.log(
        "[UI] rejecting request:",
        requestId,
        "reason:",
        rejectReason
      );
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
      const msg =
        err?.error?.message || err?.message || "Không thể từ chối yêu cầu";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // render-time debug for status/role
  const cuRender = getCurrentUser();
  const roleRender = cuRender?.role || null;
  const statusValueRender = String(requestDetail?.status || "")
    .trim()
    .toUpperCase();
  const canReviewRender = roleRender
    ? ["can_bo", "to_truong", "to_pho"].includes(roleRender)
    : false;
  console.log("[RequestDetailModal render]", {
    requestId,
    statusValueRender,
    roleRender,
    canReviewRender,
    requestDetail,
  });

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
                <div className="mb-2 whitespace-pre-wrap">{error}</div>
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
                {/* Precheck warnings */}
                {hasBlockingWarnings && (
                  <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                    <h3 className="text-lg font-semibold text-yellow-800 mb-2">
                      Cảnh báo trước khi duyệt
                    </h3>
                    <p className="text-sm text-yellow-900 mb-3">
                      Yêu cầu này đang có điều kiện tiên quyết chưa đạt. Để
                      tránh duyệt xong bị lỗi, hệ thống khóa nút Duyệt và bạn
                      cần Từ chối kèm lý do.
                    </p>
                    <ul className="list-disc pl-5 space-y-1 text-sm text-yellow-900">
                      {warnings.map((w: any, idx: number) => (
                        <li key={`WARN-${idx}`}>{String(w?.message || "-")}</li>
                      ))}
                    </ul>
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => {
                          const suggested =
                            buildRejectReasonFromWarnings(warnings);
                          if (suggested) setRejectReason(suggested);
                          setShowRejectModal(true);
                        }}
                        className="rounded-md bg-red-600 text-white px-3 py-1 text-sm font-medium hover:bg-red-700"
                      >
                        Từ chối theo cảnh báo
                      </button>
                    </div>
                  </div>
                )}

                {/* Thông tin chung */}
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Thông tin chung
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Loại yêu cầu</p>
                      <p className="text-base font-semibold text-gray-900">
                        {requestTypeLabels[requestDetail.type] ||
                          requestDetail.type}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Người gửi</p>
                      <p className="text-base font-semibold text-gray-900">
                        {requestDetail.nguoiGui?.hoTen ||
                          requestDetail.requesterName ||
                          requestDetail.requester?.hoTen ||
                          requestDetail.nguoiGui?.username ||
                          requestDetail.requesterUsername ||
                          requestDetail.requester?.username ||
                          "-"}
                        {(requestDetail.nguoiGui?.cccd ||
                          requestDetail.requesterCccd ||
                          requestDetail.requester?.cccd) && (
                          <span className="text-gray-500 ml-2">
                            {requestDetail.nguoiGui?.cccd ||
                              requestDetail.requesterCccd ||
                              requestDetail.requester?.cccd}
                          </span>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Ngày gửi</p>
                      <p className="text-base font-semibold text-gray-900">
                        {new Date(requestDetail.createdAt).toLocaleDateString(
                          "vi-VN",
                          {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </p>
                    </div>
                    {requestDetail.hoKhauLienQuan && (
                      <div>
                        <p className="text-sm text-gray-500 mb-1">
                          Hộ khẩu liên quan
                        </p>
                        <p className="text-base font-semibold text-gray-900">
                          {requestDetail.hoKhauLienQuan.soHoKhau ||
                            requestDetail.hoKhauLienQuan.diaChi ||
                            "-"}
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
                      <p className="text-sm text-gray-500 mb-1">
                        Người tạo đơn
                      </p>
                      <p className="text-base font-semibold text-gray-900">
                        {requestDetail.requesterName ||
                          requestDetail.requester?.hoTen ||
                          requestDetail.requesterUsername ||
                          "-"}
                        {requestDetail.requesterCccd && (
                          <span className="text-gray-500 ml-2">
                            {requestDetail.requesterCccd}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Chi tiết theo loại yêu cầu */}
                {(requestDetail.type === "TACH_HO_KHAU" ||
                  requestDetail.type === "SPLIT_HOUSEHOLD") &&
                  requestDetail.payload && (
                    <div className="rounded-lg border border-gray-200 bg-white p-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Chi tiết yêu cầu tách hộ khẩu
                      </h3>
                      <div className="space-y-4">
                        {requestDetail.payload.selectedNhanKhauIds && (
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-2">
                              Nhân khẩu tách ra (
                              {requestDetail.payload.selectedNhanKhauIds.length}{" "}
                              người)
                            </p>
                            <p className="text-sm text-gray-600">
                              IDs:{" "}
                              {requestDetail.payload.selectedNhanKhauIds.join(
                                ", "
                              )}
                            </p>
                          </div>
                        )}
                        {requestDetail.payload.newChuHoId && (
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-2">
                              Chủ hộ mới
                            </p>
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
                              {new Date(
                                requestDetail.payload.expectedDate
                              ).toLocaleDateString("vi-VN")}
                            </p>
                          </div>
                        )}
                        {requestDetail.payload.reason && (
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-2">
                              Lý do
                            </p>
                            <p className="text-sm text-gray-600 whitespace-pre-wrap">
                              {requestDetail.payload.reason}
                            </p>
                          </div>
                        )}
                        {requestDetail.payload.note && (
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-2">
                              Ghi chú
                            </p>
                            <p className="text-sm text-gray-600 whitespace-pre-wrap">
                              {requestDetail.payload.note}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                {requestDetail.type === "ADD_PERSON" &&
                  requestDetail.payload && (
                    <div className="rounded-lg border border-gray-200 bg-white p-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Chi tiết yêu cầu thêm nhân khẩu
                      </h3>
                      {(() => {
                        const payload: any = requestDetail.payload || {};
                        const person: any = payload.person || payload;
                        const householdId =
                          payload.targetHouseholdId ||
                          requestDetail.targetHouseholdId ||
                          payload?.person?.householdId ||
                          person?.householdId ||
                          "";

                        const householdDisplay =
                          hoKhauCodeLabel(
                            requestDetail.hoKhauLienQuan?.soHoKhau ||
                              householdId
                          ) || (householdId ? String(householdId) : "");

                        return (
                          <div className="space-y-4">
                            <p className="text-sm text-gray-600">
                              Thông tin dưới đây được hiển thị theo đúng form
                              người dân đã nhập (chỉ để xem).
                            </p>

                            <label className="block text-sm font-medium text-gray-700">
                              Hộ khẩu
                              <input
                                type="text"
                                disabled
                                value={householdDisplay}
                                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                              />
                            </label>

                            <div className="grid grid-cols-3 gap-4">
                              <label className="block text-sm font-medium text-gray-700">
                                Họ và tên
                                <input
                                  type="text"
                                  disabled
                                  value={
                                    person?.hoTen ? String(person.hoTen) : ""
                                  }
                                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                                  autoComplete="off"
                                  spellCheck={false}
                                />
                              </label>

                              <label className="block text-sm font-medium text-gray-700">
                                CCCD/CMND
                                <input
                                  type="text"
                                  disabled
                                  value={
                                    person?.cccd ? String(person.cccd) : ""
                                  }
                                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                                />
                              </label>

                              <label className="block text-sm font-medium text-gray-700">
                                Bí danh
                                <input
                                  type="text"
                                  disabled
                                  value={
                                    person?.biDanh ? String(person.biDanh) : ""
                                  }
                                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                                />
                              </label>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                              <label className="block text-sm font-medium text-gray-700">
                                Ngày cấp CCCD
                                <input
                                  type="date"
                                  disabled
                                  value={
                                    person?.ngayCapCCCD
                                      ? String(person.ngayCapCCCD)
                                      : ""
                                  }
                                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                                />
                              </label>

                              <label className="block text-sm font-medium text-gray-700">
                                Nơi cấp CCCD
                                <input
                                  type="text"
                                  disabled
                                  value={
                                    person?.noiCapCCCD
                                      ? String(person.noiCapCCCD)
                                      : ""
                                  }
                                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                                />
                              </label>

                              <label className="block text-sm font-medium text-gray-700">
                                Ngày đăng ký thường trú
                                <input
                                  type="date"
                                  disabled
                                  value={
                                    person?.ngayDangKyThuongTru
                                      ? String(person.ngayDangKyThuongTru)
                                      : ""
                                  }
                                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                                />
                              </label>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                              <label className="block text-sm font-medium text-gray-700">
                                Ngày sinh
                                <input
                                  type="date"
                                  disabled
                                  value={
                                    person?.ngaySinh
                                      ? String(person.ngaySinh)
                                      : ""
                                  }
                                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                                />
                              </label>

                              <label className="block text-sm font-medium text-gray-700">
                                Giới tính
                                <select
                                  disabled
                                  value={
                                    person?.gioiTinh
                                      ? String(person.gioiTinh)
                                      : ""
                                  }
                                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                                >
                                  <option value="">
                                    {person?.gioiTinh
                                      ? gioiTinhLabel(person.gioiTinh)
                                      : ""}
                                  </option>
                                  <option value="nam">Nam</option>
                                  <option value="nu">Nữ</option>
                                  <option value="khac">Khác</option>
                                </select>
                              </label>

                              <label className="block text-sm font-medium text-gray-700">
                                Nơi sinh
                                <input
                                  type="text"
                                  disabled
                                  value={
                                    person?.noiSinh
                                      ? String(person.noiSinh)
                                      : ""
                                  }
                                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                                />
                              </label>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                              <label className="block text-sm font-medium text-gray-700">
                                Nguyên quán
                                <input
                                  type="text"
                                  disabled
                                  value={
                                    person?.nguyenQuan
                                      ? String(person.nguyenQuan)
                                      : ""
                                  }
                                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                                />
                              </label>

                              <label className="block text-sm font-medium text-gray-700">
                                Dân tộc
                                <input
                                  type="text"
                                  disabled
                                  value={
                                    person?.danToc ? String(person.danToc) : ""
                                  }
                                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                                />
                              </label>

                              <label className="block text-sm font-medium text-gray-700">
                                Tôn giáo
                                <input
                                  type="text"
                                  disabled
                                  value={
                                    person?.tonGiao
                                      ? String(person.tonGiao)
                                      : ""
                                  }
                                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                                />
                              </label>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <label className="block text-sm font-medium text-gray-700">
                                Quốc tịch
                                <input
                                  type="text"
                                  disabled
                                  value={
                                    person?.quocTich
                                      ? String(person.quocTich)
                                      : ""
                                  }
                                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                                />
                              </label>

                              <label className="block text-sm font-medium text-gray-700">
                                Quan hệ với chủ hộ
                                <select
                                  disabled
                                  value={
                                    person?.quanHe ? String(person.quanHe) : ""
                                  }
                                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                                >
                                  <option value="">
                                    {person?.quanHe
                                      ? quanHeLabel(person.quanHe)
                                      : ""}
                                  </option>
                                  {quanHeOptions.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                      {opt.label}
                                    </option>
                                  ))}
                                </select>
                              </label>
                            </div>

                            <label className="block text-sm font-medium text-gray-700">
                              Địa chỉ thường trú trước đây
                              <textarea
                                disabled
                                value={
                                  person?.diaChiThuongTruTruoc
                                    ? String(person.diaChiThuongTruTruoc)
                                    : ""
                                }
                                rows={2}
                                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                              />
                            </label>

                            <div className="grid grid-cols-2 gap-4">
                              <label className="block text-sm font-medium text-gray-700">
                                Nghề nghiệp
                                <input
                                  type="text"
                                  disabled
                                  value={
                                    person?.ngheNghiep
                                      ? String(person.ngheNghiep)
                                      : ""
                                  }
                                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                                />
                              </label>

                              <label className="block text-sm font-medium text-gray-700">
                                Nơi làm việc
                                <input
                                  type="text"
                                  disabled
                                  value={
                                    person?.noiLamViec
                                      ? String(person.noiLamViec)
                                      : ""
                                  }
                                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                                />
                              </label>
                            </div>

                            <label className="block text-sm font-medium text-gray-700">
                              Ghi chú
                              <textarea
                                disabled
                                value={
                                  person?.ghiChu ? String(person.ghiChu) : ""
                                }
                                rows={2}
                                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                              />
                            </label>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                {requestDetail.type === "ADD_NEWBORN" &&
                  requestDetail.payload && (
                    <div className="rounded-lg border border-gray-200 bg-white p-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Chi tiết yêu cầu thêm con sơ sinh
                      </h3>
                      {(() => {
                        const newborn =
                          requestDetail.payload?.newborn ||
                          requestDetail.payload;
                        return (
                          <div className="bg-gray-50 rounded p-3 text-sm text-gray-700 space-y-1">
                            <p>Họ tên: {newborn?.hoTen || "-"}</p>
                            <p>
                              Ngày sinh:{" "}
                              {newborn?.ngaySinh
                                ? formatFromYMD(newborn.ngaySinh)
                                : "-"}
                            </p>
                            <p>Giới tính: {newborn?.gioiTinh || "-"}</p>
                            <p>Nơi sinh: {newborn?.noiSinh || "-"}</p>
                            {newborn?.isMoiSinh !== undefined && (
                              <p>
                                Trẻ mới sinh:{" "}
                                {newborn.isMoiSinh ? "Có" : "Không"}
                              </p>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}

                {(requestDetail.type === "SUA_NHAN_KHAU" ||
                  requestDetail.type === "UPDATE_PERSON") &&
                  requestDetail.payload && (
                    <div className="rounded-lg border border-gray-200 bg-white p-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Chi tiết yêu cầu sửa nhân khẩu
                      </h3>
                      <div className="space-y-4">
                        {(requestDetail.payload.nhanKhauId ||
                          requestDetail.payload.personId) && (
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-2">
                              Nhân khẩu cần sửa
                            </p>
                            <p className="text-sm text-gray-600">
                              ID:{" "}
                              {requestDetail.payload.nhanKhauId ||
                                requestDetail.payload.personId}
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
                              <p>
                                Ngày sinh:{" "}
                                {formatFromYMD(requestDetail.payload.ngaySinh)}
                              </p>
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
                            <p className="text-sm font-medium text-gray-700 mb-2">
                              Lý do
                            </p>
                            <p className="text-sm text-gray-600 whitespace-pre-wrap">
                              {requestDetail.payload.lyDo}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                {(requestDetail.type === "XOA_NHAN_KHAU" ||
                  requestDetail.type === "REMOVE_PERSON") &&
                  requestDetail.payload && (
                    <div className="rounded-lg border border-gray-200 bg-white p-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Chi tiết yêu cầu xoá nhân khẩu
                      </h3>
                      <div className="space-y-4">
                        {(requestDetail.payload.nhanKhauId ||
                          requestDetail.payload.personId) && (
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-2">
                              Nhân khẩu cần xoá
                            </p>
                            <p className="text-sm text-gray-600">
                              ID:{" "}
                              {requestDetail.payload.nhanKhauId ||
                                requestDetail.payload.personId}
                            </p>
                          </div>
                        )}
                        {requestDetail.payload.lyDo && (
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-2">
                              Lý do
                            </p>
                            <p className="text-sm text-gray-600 whitespace-pre-wrap">
                              {requestDetail.payload.lyDo}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                {(requestDetail.type === "TAM_TRU" ||
                  requestDetail.type === "TEMPORARY_RESIDENCE") &&
                  requestDetail.payload && (
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
                        {(requestDetail.payload.soHoKhau ||
                          requestDetail.payload.diaChi) && (
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-2">
                              Số hộ khẩu
                            </p>
                            <p className="text-sm text-gray-600">
                              {requestDetail.payload.soHoKhau ||
                                requestDetail.payload.diaChi}
                            </p>
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-4">
                          {requestDetail.payload.tuNgay && (
                            <div>
                              <p className="text-sm font-medium text-gray-700 mb-2">
                                Từ ngày
                              </p>
                              <p className="text-sm text-gray-600">
                                {formatFromYMD(requestDetail.payload.tuNgay)}
                              </p>
                            </div>
                          )}
                          {requestDetail.payload.denNgay && (
                            <div>
                              <p className="text-sm font-medium text-gray-700 mb-2">
                                Đến ngày
                              </p>
                              <p className="text-sm text-gray-600">
                                {formatFromYMD(requestDetail.payload.denNgay)}
                              </p>
                            </div>
                          )}
                        </div>
                        {requestDetail.payload.lyDo && (
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-2">
                              Lý do
                            </p>
                            <p className="text-sm text-gray-600 whitespace-pre-wrap">
                              {requestDetail.payload.lyDo}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                {(requestDetail.type === "TAM_VANG" ||
                  requestDetail.type === "TEMPORARY_ABSENCE") &&
                  requestDetail.payload && (
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
                              <p className="text-sm font-medium text-gray-700 mb-2">
                                Từ ngày
                              </p>
                              <p className="text-sm text-gray-600">
                                {formatFromYMD(requestDetail.payload.tuNgay)}
                              </p>
                            </div>
                          )}
                          {requestDetail.payload.denNgay && (
                            <div>
                              <p className="text-sm font-medium text-gray-700 mb-2">
                                Đến ngày
                              </p>
                              <p className="text-sm text-gray-600">
                                {formatFromYMD(requestDetail.payload.denNgay)}
                              </p>
                            </div>
                          )}
                        </div>
                        {requestDetail.payload.lyDo && (
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-2">
                              Lý do
                            </p>
                            <p className="text-sm text-gray-600 whitespace-pre-wrap">
                              {requestDetail.payload.lyDo}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                {requestDetail.type === "DECEASED" && requestDetail.payload && (
                  <div className="rounded-lg border border-gray-200 bg-white p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Chi tiết yêu cầu khai tử
                    </h3>
                    <div className="space-y-3 text-sm text-gray-700">
                      <div>
                        <span className="font-medium">Nhân khẩu:</span>{" "}
                        {requestDetail.payload.nhanKhauId ||
                          requestDetail.payload.personId ||
                          requestDetail.targetPersonId ||
                          "-"}
                      </div>
                      {requestDetail.payload.ngayMat && (
                        <div>
                          <span className="font-medium">Ngày mất:</span>{" "}
                          {formatFromYMD(requestDetail.payload.ngayMat)}
                        </div>
                      )}
                      {requestDetail.payload.noiMat && (
                        <div>
                          <span className="font-medium">Nơi mất:</span>{" "}
                          {requestDetail.payload.noiMat}
                        </div>
                      )}
                      {requestDetail.payload.lyDo && (
                        <div>
                          <span className="font-medium">Lý do/Ghi chú:</span>
                          <div className="whitespace-pre-wrap">
                            {requestDetail.payload.lyDo}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {requestDetail.type === "MOVE_OUT" && requestDetail.payload && (
                  <div className="rounded-lg border border-gray-200 bg-white p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Chi tiết yêu cầu chuyển đi
                    </h3>
                    <div className="space-y-3 text-sm text-gray-700">
                      <div>
                        <span className="font-medium">Nhân khẩu:</span>{" "}
                        {requestDetail.payload.nhanKhauId ||
                          requestDetail.payload.personId ||
                          requestDetail.targetPersonId ||
                          "-"}
                      </div>
                      {(requestDetail.payload.ngayChuyen ||
                        requestDetail.payload.ngayDi ||
                        requestDetail.payload.ngayThucHien) && (
                        <div>
                          <span className="font-medium">Ngày chuyển đi:</span>{" "}
                          {formatFromYMD(
                            requestDetail.payload.ngayChuyen ||
                              requestDetail.payload.ngayDi ||
                              requestDetail.payload.ngayThucHien
                          )}
                        </div>
                      )}
                      {(requestDetail.payload.noiDen ||
                        requestDetail.payload.diaChiMoi ||
                        requestDetail.payload.diaChiDen) && (
                        <div>
                          <span className="font-medium">Nơi đến:</span>{" "}
                          {requestDetail.payload.noiDen ||
                            requestDetail.payload.diaChiMoi ||
                            requestDetail.payload.diaChiDen}
                        </div>
                      )}
                      {(requestDetail.payload.lyDo ||
                        requestDetail.payload.reason ||
                        requestDetail.payload.noiDung) && (
                        <div>
                          <span className="font-medium">Lý do/Ghi chú:</span>
                          <div className="whitespace-pre-wrap">
                            {requestDetail.payload.lyDo ||
                              requestDetail.payload.reason ||
                              requestDetail.payload.noiDung}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Universal read-only form: show ALL payload fields user entered */}
                {requestDetail.type !== "ADD_PERSON" && (
                  <div className="rounded-lg border border-gray-200 bg-white p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      {requestDetailTitle(requestDetail.type)}
                    </h3>
                    {(() => {
                      const rd: any = requestDetail as any;
                      const related =
                        rd?.nhanKhauLienQuan ||
                        rd?.subject ||
                        rd?.person ||
                        rd?.payload?.person ||
                        null;
                      const relatedName =
                        related?.hoTen ||
                        related?.personName ||
                        related?.name ||
                        "";
                      const relatedCccd =
                        related?.cccd || related?.personCccd || "";

                      const payload = requestDetail.payload;
                      const fields = flattenPayloadForForm(payload);
                      if (
                        (!fields || fields.length === 0) &&
                        !relatedName &&
                        !relatedCccd
                      ) {
                        return (
                          <div className="text-sm text-gray-500">
                            Không có dữ liệu để hiển thị.
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-4">
                          {(relatedName || relatedCccd) && (
                            <div className="grid grid-cols-2 gap-4">
                              <label className="block text-sm font-medium text-gray-700">
                                Họ và tên
                                <input
                                  disabled
                                  value={relatedName ? String(relatedName) : ""}
                                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                                />
                              </label>
                              <label className="block text-sm font-medium text-gray-700">
                                CCCD/CMND
                                <input
                                  disabled
                                  value={relatedCccd ? String(relatedCccd) : ""}
                                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                                />
                              </label>
                            </div>
                          )}

                          {fields && fields.length > 0 && (
                            <div className="space-y-3">
                              {fields.map((f) => {
                                const label = labelForPath(f.path);
                                const value = formatValueForPath(
                                  f.path,
                                  f.value ?? "",
                                  requestDetail
                                );
                                return (
                                  <label
                                    key={f.path}
                                    className="block text-sm font-medium text-gray-700"
                                  >
                                    {label}
                                    {shouldUseTextArea(value) ? (
                                      <textarea
                                        disabled
                                        value={value}
                                        rows={3}
                                        className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                                      />
                                    ) : (
                                      <input
                                        disabled
                                        value={value}
                                        className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                                      />
                                    )}
                                  </label>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Actions */}
                {String(requestDetail.status || "").toUpperCase() ===
                  "PENDING" && (
                  <div className="flex gap-3 pt-4 border-t border-gray-200">
                    <button
                      onClick={handleApprove}
                      disabled={isSubmitting || hasBlockingWarnings}
                      className="flex-1 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 px-4 py-2.5 text-sm font-medium text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting
                        ? "Đang xử lý..."
                        : hasBlockingWarnings
                        ? "Duyệt (bị khóa do cảnh báo)"
                        : "Duyệt"}
                    </button>
                    <button
                      onClick={() => {
                        if (hasBlockingWarnings) {
                          const suggested =
                            buildRejectReasonFromWarnings(warnings);
                          if (suggested)
                            setRejectReason((prev) =>
                              prev.trim() ? prev : suggested
                            );
                        }
                        setShowRejectModal(true);
                      }}
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
                <p className="text-gray-500">
                  Không tìm thấy thông tin yêu cầu.
                </p>
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
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Từ chối yêu cầu
            </h3>
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
