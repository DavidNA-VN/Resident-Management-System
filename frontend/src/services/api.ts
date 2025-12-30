// Frontend will read from VITE_API_URL env variable
// If backend runs on different port, update frontend/.env: VITE_API_URL=http://localhost:<PORT>/api
export const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3000/api";

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  fullName: string;
  // Registration UI defaults to citizen; backend enforces role = 'nguoi_dan'
  role?: "to_truong" | "to_pho" | "can_bo" | "nguoi_dan";
  task?: "hokhau_nhankhau" | "tamtru_tamvang" | "thongke" | "kiennghi";
}

export interface AuthResponse {
  success: boolean;
  data: {
    accessToken: string;
    user: {
      id: number;
      username: string;
      role: string;
      fullName: string;
      linked?: boolean; // Chỉ cho role="nguoi_dan"
      personInfo?: {
        personId: number;
        hoTen: string;
        householdId: number;
        isHeadOfHousehold?: boolean;
      };
      message?: string; // Thông báo khi chưa linked
    };
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface RegisterResponse {
  success: boolean;
  data: {
    id: number;
    username: string;
    role: string;
    fullName: string;
    task: string | null;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface UserInfo {
  id: number;
  username: string;
  role: "admin" | "to_truong" | "to_pho" | "can_bo" | "nguoi_dan";
  task: "hokhau_nhankhau" | "tamtru_tamvang" | "thongke" | "kiennghi" | null;
  linked?: boolean; // Chỉ cho role="nguoi_dan"
  personInfo?: {
    personId: number;
    hoTen: string;
    householdId: number;
    isHeadOfHousehold?: boolean;
  };
  message?: string; // Thông báo khi chưa linked
}

export interface MeResponse {
  success: boolean;
  data: UserInfo;
  error?: {
    code: string;
    message: string;
  };
}

class ApiService {
  private getAuthToken(): string | null {
    return localStorage.getItem("accessToken");
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getAuthToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      (headers as any)["Authorization"] = `Bearer ${token}`;
    }

    // debug log
    try {
      // eslint-disable-next-line no-console
      console.log("[api.request] ->", {
        url: `${API_BASE_URL}${endpoint}`,
        method: options.method || "GET",
        tokenExists: !!token,
        headers,
      });
    } catch (e) {
      // ignore
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      cache: "no-store",
    });

    let data: any = null;
    let rawText: string | null = null;
    try {
      rawText = await response.text();
      try {
        data = rawText ? JSON.parse(rawText) : null;
      } catch (e) {
        data = rawText;
      }
    } catch (e) {
      data = null;
    }

    // debug response
    try {
      // eslint-disable-next-line no-console
      console.log("[api.request] <-", {
        status: response.status,
        data,
        rawTextSnippet:
          typeof rawText === "string" ? rawText.slice(0, 200) : null,
      });
    } catch (e) {
      // ignore
    }

    if (!response.ok) {
      const thrown: any = { status: response.status, rawText };
      if (data && (data as any).error) {
        thrown.error = (data as any).error;
        thrown.message = (data as any).error.message;
      } else if (data && (data as any).message) {
        thrown.error = { message: (data as any).message };
        thrown.message = (data as any).message;
      } else if (typeof data === "string") {
        thrown.error = { message: data };
        thrown.message = data;
      } else {
        thrown.error = { message: `HTTP ${response.status}` };
        thrown.message = `HTTP ${response.status}`;
      }
      // eslint-disable-next-line no-console
      console.error("[api.request] throwing", thrown);
      throw thrown;
    }

    return data;
  }

  async login(credentials: LoginRequest): Promise<AuthResponse> {
    return this.request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
  }

  async register(data: RegisterRequest): Promise<RegisterResponse> {
    return this.request<RegisterResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getMe(): Promise<MeResponse> {
    return this.request<MeResponse>("/auth/me", {
      method: "GET",
    });
  }

  async getThongKe(params: {
    genders?: string[];
    ageGroups?: string[];
    residenceTypes?: string[];
    startDate?: string;
    endDate?: string;
  }): Promise<{
    success: boolean;
    demographics: any[];
    residence: any[];
    details: any[];
    error?: any;
  }> {
    const qs = new URLSearchParams();
    (params.genders || []).forEach((g) => qs.append("genders", g));
    (params.ageGroups || []).forEach((a) => qs.append("ageGroups", a));
    (params.residenceTypes || []).forEach((r) => qs.append("residenceTypes", r));
    if (params.startDate) qs.set("startDate", params.startDate);
    if (params.endDate) qs.set("endDate", params.endDate);

    const query = qs.toString();
    return this.request(`/thongke${query ? `?${query}` : ""}`, { method: "GET" });
  }

  async getCitizenHouseholds() {
    return this.request<{ success: boolean; data: any[] }>(
      "/citizen/households",
      {
        method: "GET",
      }
    );
  }

  /**
   * GET /citizen/me/households
   * Lấy hộ khẩu liên quan đến tài khoản người dân hiện tại (dựa trên personId hoặc username=cccd)
   */
  async getMyHouseholds() {
    return this.request<{
      success: boolean;
      data: any[];
      error?: { code: string; message: string };
    }>("/citizen/me/households", { method: "GET" });
  }

  logout() {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("userInfo");
    localStorage.removeItem("isAuthenticated");
  }

  // Hộ khẩu APIs
  async getHoKhauList(trangThai?: string, soHoKhau?: string) {
    const cacheBust = `_=${Date.now()}`;
    const params = new URLSearchParams();
    if (trangThai) params.append("trangThai", trangThai);
    if (soHoKhau) params.append("soHoKhau", soHoKhau);
    params.append("_", cacheBust);
    const query = params.toString();
    return this.request<{ success: boolean; data: any[] }>(
      `/ho-khau${query ? `?${query}` : ""}`,
      { method: "GET" }
    );
  }

  async getHoKhauById(id: number) {
    const cacheBust = `_=${Date.now()}`;
    return this.request<{ success: boolean; data: any }>(
      `/ho-khau/${id}?${cacheBust}`,
      {
        method: "GET",
      }
    );
  }

  async getHoKhauHistory(id: number) {
    return this.request<{ success: boolean; data: any[] }>(
      `/ho-khau/${id}/history`,
      {
        method: "GET",
      }
    );
  }

  async createHoKhau(data: {
    diaChi: string;
    tinhThanh?: string;
    quanHuyen?: string;
    phuongXa?: string;
    duongPho?: string;
    soNha?: string;
    diaChiDayDu?: string;
    ngayCap?: string;
    ghiChu?: string;
  }) {
    return this.request<{ success: boolean; data: any }>("/ho-khau", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateHoKhau(
    id: number,
    data: {
      soHoKhau?: string;
      diaChi?: string;
      tinhThanh?: string;
      quanHuyen?: string;
      phuongXa?: string;
      duongPho?: string;
      soNha?: string;
      diaChiDayDu?: string;
      ngayCap?: string;
      ghiChu?: string;
    }
  ) {
    return this.request<{
      success: boolean;
      data: any;
      error?: { code: string; message: string };
    }>(`/ho-khau/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async activateHoKhau(hoKhauId: number, chuHoId: number) {
    return this.request<{ success: boolean; data: any }>(
      `/ho-khau/${hoKhauId}/activate`,
      {
        method: "PATCH",
        body: JSON.stringify({ chuHoId }),
      }
    );
  }

  async changeChuHo(
    hoKhauId: number,
    newChuHoId: number,
    oldChuHoNewQuanHe?: string
  ) {
    return this.request<{ success: boolean; data: any }>(
      `/ho-khau/${hoKhauId}/change-chu-ho`,
      {
        method: "PATCH",
        body: JSON.stringify({ newChuHoId, oldChuHoNewQuanHe }),
      }
    );
  }

  // Nhân khẩu APIs
  async getNhanKhauList(hoKhauId: number) {
    const cacheBust = `_=${Date.now()}`;
    return this.request<{ success: boolean; data: any[] }>(
      `/nhan-khau?hoKhauId=${hoKhauId}&${cacheBust}`,
      { method: "GET" }
    );
  }

  async getNhanKhauById(id: number) {
    const cacheBust = `_=${Date.now()}`;
    return this.request<{ success: boolean; data: any }>(
      `/nhan-khau/${id}?${cacheBust}`,
      { method: "GET" }
    );
  }

  async getNhanKhauHistory(id: number) {
    return this.request<{ success: boolean; data: any[] }>(
      `/nhan-khau/${id}/history`,
      { method: "GET" }
    );
  }

  async updateNhanKhau(
    id: number,
    data: {
      hoTen?: string;
      biDanh?: string;
      cccd?: string;
      ngayCapCCCD?: string;
      noiCapCCCD?: string;
      ngaySinh?: string;
      gioiTinh?: "nam" | "nu" | "khac";
      noiSinh?: string;
      nguyenQuan?: string;
      danToc?: string;
      tonGiao?: string;
      quocTich?: string;
      quanHe?:
        | "chu_ho"
        | "vo_chong"
        | "con"
        | "cha_me"
        | "anh_chi_em"
        | "ong_ba"
        | "chau"
        | "khac";
      ngayDangKyThuongTru?: string;
      diaChiThuongTruTruoc?: string;
      ngheNghiep?: string;
      noiLamViec?: string;
      ghiChu?: string;
      ghiChuHoKhau?: string;
      lyDoKhongCoCCCD?: string;
    }
  ) {
    return this.request<{ success: boolean; data: any }>(`/nhan-khau/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async createNhanKhau(data: {
    hoKhauId: number;
    hoTen: string;
    biDanh?: string;
    cccd?: string;
    ngayCapCCCD?: string;
    noiCapCCCD?: string;
    ngaySinh?: string;
    gioiTinh?: "nam" | "nu" | "khac";
    noiSinh?: string;
    nguyenQuan?: string;
    danToc?: string;
    tonGiao?: string;
    quocTich?: string;
    quanHe:
      | "chu_ho"
      | "vo_chong"
      | "con"
      | "cha_me"
      | "anh_chi_em"
      | "ong_ba"
      | "chau"
      | "khac";
    ngayDangKyThuongTru?: string;
    diaChiThuongTruTruoc?: string;
    ngheNghiep?: string;
    noiLamViec?: string;
    ghiChu?: string;
  }) {
    return this.request<{ success: boolean; data: any }>("/nhan-khau", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // Citizen APIs
  async getCitizenHousehold() {
    return this.request<{
      success: boolean;
      data: {
        household: any;
        members: any[];
        chuHo?: any;
      };
      error?: {
        code: string;
        message: string;
      };
    }>("/citizen/household", {
      method: "GET",
    });
  }

  // Global search for nhan khau across TDP (backend)
  async searchNhanKhau(
    q: string,
    limit: number = 100,
    offset: number = 0,
    filters?: {
      ageGroup?: string;
      gender?: string;
      residenceStatus?: string;
      movementStatus?: string;
      feedbackStatus?: string;
    }
  ) {
    const params = new URLSearchParams();
    if (q) params.append("q", q);
    params.append("limit", String(limit));
    params.append("offset", String(offset));
    if (filters?.ageGroup) params.append("ageGroup", filters.ageGroup);
    if (filters?.gender) params.append("gender", filters.gender);
    if (filters?.residenceStatus)
      params.append("residenceStatus", filters.residenceStatus);
    if (filters?.movementStatus)
      params.append("movementStatus", filters.movementStatus);
    if (filters?.feedbackStatus)
      params.append("feedbackStatus", filters.feedbackStatus);

    return this.request<{
      success: boolean;
      data: any[];
      error?: { code: string; message: string };
    }>(`/nhan-khau/search?${params.toString()}`, { method: "GET" });
  }

  // Alias for global search (kept for clearer intent)
  async searchNhanKhauGlobal(
    q: string,
    limit: number = 10,
    filters?: {
      ageGroup?: string;
      gender?: string;
      residenceStatus?: string;
      movementStatus?: string;
      feedbackStatus?: string;
    }
  ) {
    return this.searchNhanKhau(q, limit, 0, filters);
  }

  async createRequest(data: {
    type: string;
    payload: any;
    targetHouseholdId?: number;
    targetPersonId?: number;
  }) {
    return this.request<{ success: boolean; data: any }>("/requests", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getMyRequests() {
    return this.request<{ success: boolean; data: any[] }>("/requests/my", {
      method: "GET",
    });
  }

  async getLeaderRequests() {
    return this.request<{ success: boolean; data: any[] }>("/requests", {
      method: "GET",
    });
  }

  async createFeedback(data: {
    tieuDe: string;
    noiDung: string;
    loai: string;
  }) {
    return this.request<{ success: boolean; data: any }>("/feedback", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getMyFeedbacks() {
    return this.request<{ success: boolean; data: any[] }>("/feedback/me", {
      method: "GET",
    });
  }

  // Lấy tất cả phản ánh (cho admin/tổ trưởng)
  async getAllFeedbacks(
    params: {
      page?: number;
      limit?: number;
      status?: string;
      category?: string;
      userId?: number;
      keyword?: string;
      reporterKeyword?: string;
      includeMerged?: boolean;
    } = {}
  ) {
    const query = new URLSearchParams();
    if (params.page) query.append("page", String(params.page));
    if (params.limit) query.append("limit", String(params.limit));
    if (params.status) query.append("status", params.status);
    if (params.category) query.append("category", params.category);
    if (params.userId) query.append("userId", String(params.userId));
    if (params.keyword) query.append("keyword", params.keyword);
    if (params.reporterKeyword) query.append("reporterKeyword", params.reporterKeyword);
    if (params.includeMerged) query.append("includeMerged", "1");

    return this.request<{
      success: boolean;
      data: any[];
      total: number;
      page: number;
      limit: number
    }>(
      `/feedbacks?${query.toString()}`,
      { method: "GET" }
    );
  }

  // Gửi phản hồi cho phản ánh
  async addResponse(id: number, responderUnit: string, content: string) {
    return this.request<{ success: boolean; data: any }>(
      `/feedbacks/${id}/response`,
      {
        method: "POST",
        body: JSON.stringify({
          responder_unit: responderUnit,
          response_content: content,
        }),
      }
    );
  }

  // Gộp các phản ánh
  async merge(ids: number[]) {
    return this.request<{ success: boolean; data: any }>(
      "/feedbacks/merge",
      {
        method: "POST",
        body: JSON.stringify({ ids }),
      }
    );
  }

  // TODO: Thay bằng API thật khi backend có endpoint /citizen/my-household
  // GET /citizen/my-household - Lấy hộ khẩu và danh sách nhân khẩu của người dân
  async getMyHousehold() {
    // Tạm thời dùng endpoint hiện có /citizen/household, sau này sẽ thay bằng /citizen/my-household
    try {
      const response = await this.request<{
        success: boolean;
        data: {
          household: any;
          members: any[];
          chuHo?: any;
        };
      }>("/citizen/household", {
        method: "GET",
      });

      // Adapt data structure từ response hiện tại sang format mới
      if (response.success && response.data) {
        return {
          success: true,
          data: {
            hoKhau: {
              ...response.data.household,
              chuHo: response.data.chuHo,
            },
            nhanKhauList: response.data.members || [],
          },
        };
      }
      return response;
    } catch (err) {
      // Mock data nếu API chưa sẵn sàng
      console.warn("API /citizen/household chưa sẵn sàng, sử dụng mock data");
      return Promise.resolve({
        success: true,
        data: {
          hoKhau: {
            id: 1,
            soHoKhau: "HK001234",
            diaChi: "Số 123, Đường ABC, Phường XYZ",
            diaChiDayDu: "Số 123, Đường ABC, Phường XYZ, Quận Hà Đông, Hà Nội",
            chuHo: {
              hoTen: "Nguyễn Văn A",
              cccd: "079912345678",
            },
          },
          nhanKhauList: [
            {
              id: 1,
              hoTen: "Nguyễn Văn A",
              cccd: "079912345678",
              quanHe: "chu_ho",
            },
            {
              id: 2,
              hoTen: "Nguyễn Thị B",
              cccd: "079912345679",
              quanHe: "vo_chong",
            },
            {
              id: 3,
              hoTen: "Nguyễn Văn C",
              cccd: "079912345680",
              quanHe: "con",
            },
          ],
        },
      });
    }
  }

  // TODO: Thay bằng API thật khi backend sẵn sàng
  // POST /citizen/requests/split-household - Tạo yêu cầu tách hộ khẩu
  async createSplitHouseholdRequest(data: {
    hoKhauId: number;
    selectedNhanKhauIds: number[];
    newChuHoId: number;
    oldHouseholdNewChuHoId?: number;
    newAddress: string;
    expectedDate: string;
    reason: string;
    note?: string;
  }) {
    // Tạm thời dùng endpoint hiện có, sau này sẽ thay bằng /citizen/requests/split-household
    try {
      return await this.request<{ success: boolean; data: any }>("/requests", {
        method: "POST",
        body: JSON.stringify({
          type: "SPLIT_HOUSEHOLD",
          targetHouseholdId: data.hoKhauId,
          payload: data,
        }),
      });
    } catch (err: any) {
      // Mock response nếu API chưa sẵn sàng
      console.warn("API /requests chưa sẵn sàng, sử dụng mock response");
      return Promise.resolve({
        success: true,
        data: {
          id: Date.now(),
          type: "TACH_HO_KHAU",
          status: "pending",
          ...data,
          createdAt: new Date().toISOString(),
        },
      });
    }
  }

  // TODO: Thay bằng API thật khi backend sẵn sàng
  // GET /requests?type=&status= - Lấy danh sách yêu cầu (cho tổ trưởng/cán bộ)
  async getRequestsList(filters?: {
    type?: string;
    status?: string;
    keyword?: string;
    fromDate?: string;
    toDate?: string;
    page?: number;
    limit?: number;
  }) {
    const params = new URLSearchParams();
    if (filters?.type) params.append("type", filters.type);
    if (filters?.status) params.append("status", filters.status);
    if (filters?.keyword) params.append("keyword", filters.keyword);
    if (filters?.fromDate) params.append("fromDate", filters.fromDate);
    if (filters?.toDate) params.append("toDate", filters.toDate);
    if (filters?.page) params.append("page", String(filters.page));
    if (filters?.limit) params.append("limit", String(filters.limit));
    const queryString = params.toString();
    const url = `/requests${queryString ? `?${queryString}` : ""}`;

    return await this.request<{ success: boolean; data: any[] }>(url, {
      method: "GET",
    });
  }

  async getRequestDetail(requestId: number) {
    return this.request<{ success: boolean; data: any }>(
      `/requests/${requestId}`,
      {
        method: "GET",
      }
    );
  }

  async approveRequest(requestId: number, householdId?: string) {
    const body: any = {};
    if (householdId) {
      body.householdId = parseInt(householdId);
    }

    return this.request<{ success: boolean; data: any }>(
      `/requests/${requestId}/approve`,
      {
        method: "POST",
        body: JSON.stringify(body),
      }
    );
  }

  async rejectRequest(requestId: number, reason: string) {
    return this.request<{ success: boolean; data: any }>(
      `/requests/${requestId}/reject`,
      {
        method: "POST",
        body: JSON.stringify({ reason }),
      }
    );
  }

  // Tam Tru Tam Vang APIs
  async getTamTruVangRequests(filters?: {
    type?: string;
    status?: string;
    keyword?: string;
    fromDate?: string;
    toDate?: string;
    page?: number;
    limit?: number;
  }) {
    const params = new URLSearchParams();
    if (filters?.type && filters.type !== "all")
      params.append("type", filters.type);
    if (filters?.status && filters.status !== "all")
      params.append("status", filters.status);
    if (filters?.keyword) params.append("keyword", filters.keyword);
    if (filters?.fromDate) params.append("fromDate", filters.fromDate);
    if (filters?.toDate) params.append("toDate", filters.toDate);
    if (filters?.page) params.append("page", String(filters.page));
    if (filters?.limit) params.append("limit", String(filters.limit));
    const queryString = params.toString();
    const url = `/tam-tru-vang/requests${queryString ? `?${queryString}` : ""}`;

    return this.request<{
      success: boolean;
      data: any[];
      pagination?: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>(url, {
      method: "GET",
    });
  }

  async getTamTruVangRequestDetail(requestId: number) {
    return this.request<{ success: boolean; data: any }>(
      `/tam-tru-vang/requests/${requestId}`,
      {
        method: "GET",
      }
    );
  }

  // Alias for backward compatibility
  async getTamTruTamVangRequestDetail(requestId: number) {
    return this.getTamTruVangRequestDetail(requestId);
  }

  async approveTamTruVangRequest(requestId: number) {
    return this.request<{ success: boolean; data: any }>(
      `/tam-tru-vang/requests/${requestId}/approve`,
      {
        method: "POST",
      }
    );
  }

  async rejectTamTruVangRequest(requestId: number, reason: string) {
    return this.request<{ success: boolean; data: any }>(
      `/tam-tru-vang/requests/${requestId}/reject`,
      {
        method: "POST",
        body: JSON.stringify({ reason }),
      }
    );
  }

  // Citizen API for creating tam-tru-vang request with file upload
  async createTamTruVangRequest(data: {
    loai: "tam_tru" | "tam_vang";
    nhanKhauId?: number;
    person?: {
      hoTen: string;
      cccd?: string;
      ngaySinh: string;
      gioiTinh: string;
      noiSinh: string;
      quanHe: string;
      ngheNghiep?: string;
      ghiChu?: string;
    };
    tuNgay: string;
    denNgay?: string;
    diaChi: string;
    lyDo: string;
    attachments?: File[];
  }) {
    const formData = new FormData();
    formData.append("loai", data.loai);
    if (data.loai === "tam_vang") {
      formData.append("nhanKhauId", String(data.nhanKhauId));
    }
    if (data.loai === "tam_tru" && data.person) {
      formData.append("person", JSON.stringify(data.person));
    }
    formData.append("tuNgay", data.tuNgay);
    if (data.denNgay) formData.append("denNgay", data.denNgay);
    formData.append("diaChi", data.diaChi);
    formData.append("lyDo", data.lyDo);

    if (data.attachments) {
      data.attachments.forEach((file) => {
        formData.append(`attachments`, file);
      });
    }

    return this.request<{ success: boolean; data: { id: number } }>(
      "/citizen/tam-tru-vang",
      {
        method: "POST",
        body: formData,
        headers: {
          // Don't set Content-Type for FormData, let browser set it with boundary
        },
      }
    );
  }
}

export const apiService = new ApiService();
