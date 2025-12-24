const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  fullName: string;
  role: "to_truong" | "to_pho" | "can_bo" | "nguoi_dan";
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
  role: "to_truong" | "to_pho" | "can_bo" | "nguoi_dan";
  task: "hokhau_nhankhau" | "tamtru_tamvang" | "thongke" | "kiennghi" | null;
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
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw {
        status: response.status,
        ...data,
      };
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

  logout() {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("userInfo");
    localStorage.removeItem("isAuthenticated");
  }

  // Hộ khẩu APIs
  async getHoKhauList(trangThai?: string) {
    const params = trangThai ? `?trangThai=${trangThai}` : "";
    return this.request<{ success: boolean; data: any[] }>(
      `/ho-khau${params}`,
      { method: "GET" }
    );
  }

  async getHoKhauById(id: number) {
    return this.request<{ success: boolean; data: any }>(`/ho-khau/${id}`, {
      method: "GET",
    });
  }

  async createHoKhau(data: {
    soHoKhau: string;
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

  async activateHoKhau(hoKhauId: number, chuHoId: number) {
    return this.request<{ success: boolean; data: any }>(
      `/ho-khau/${hoKhauId}/activate`,
      {
        method: "PATCH",
        body: JSON.stringify({ chuHoId }),
      }
    );
  }

  // Nhân khẩu APIs
  async getNhanKhauList(hoKhauId: number) {
    return this.request<{ success: boolean; data: any[] }>(
      `/nhan-khau?hoKhauId=${hoKhauId}`,
      { method: "GET" }
    );
  }

  async createNhanKhau(data: {
    hoKhauId: number;
    hoTen: string;
    cccd?: string;
    ngaySinh?: string;
    gioiTinh?: "nam" | "nu" | "khac";
    quanHe:
      | "chu_ho"
      | "vo_chong"
      | "con"
      | "cha_me"
      | "anh_chi_em"
      | "ong_ba"
      | "chau"
      | "khac";
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
    }>("/citizen/household", {
      method: "GET",
    });
  }

  async createRequest(data: {
    type: string;
    payload: any;
  }) {
    return this.request<{ success: boolean; data: any }>("/requests", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getMyRequests() {
    return this.request<{ success: boolean; data: any[] }>("/requests/me", {
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
          type: "TACH_HO_KHAU",
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
  async getRequestsList(filters?: { type?: string; status?: string }) {
    try {
      const params = new URLSearchParams();
      if (filters?.type) params.append("type", filters.type);
      if (filters?.status) params.append("status", filters.status);
      const queryString = params.toString();
      const url = `/requests${queryString ? `?${queryString}` : ""}`;

      return await this.request<{ success: boolean; data: any[] }>(url, {
        method: "GET",
      });
    } catch (err) {
      // Mock data nếu API chưa sẵn sàng
      console.warn("API /requests chưa sẵn sàng, sử dụng mock data");
      return Promise.resolve({
        success: true,
        data: [
          {
            id: 1,
            type: "TACH_HO_KHAU",
            loaiYeuCau: "Yêu cầu tách hộ khẩu",
            nguoiGui: {
              hoTen: "Nguyễn Văn A",
              cccd: "079912345678",
            },
            hoKhauLienQuan: {
              soHoKhau: "HK001234",
              diaChi: "Số 123, Đường ABC",
            },
            createdAt: new Date().toISOString(),
            status: "pending",
            payload: {
              selectedNhanKhauIds: [1, 2],
              newChuHoId: 2,
              newAddress: "Số 789, Đường XYZ",
              expectedDate: "2025-12-24",
              reason: "Tách hộ để quản lý riêng",
            },
          },
        ],
      });
    }
  }

  // TODO: Thay bằng API thật khi backend sẵn sàng
  // GET /requests/:id - Lấy chi tiết yêu cầu
  async getRequestDetail(requestId: number) {
    try {
      return await this.request<{ success: boolean; data: any }>(`/requests/${requestId}`, {
        method: "GET",
      });
    } catch (err) {
      // Mock data nếu API chưa sẵn sàng
      console.warn(`API /requests/${requestId} chưa sẵn sàng, sử dụng mock data`);
      return Promise.resolve({
        success: true,
        data: {
          id: requestId,
          type: "TACH_HO_KHAU",
          status: "pending",
          nguoiGui: {
            hoTen: "Nguyễn Văn A",
            cccd: "079912345678",
          },
          hoKhauLienQuan: {
            id: 1,
            soHoKhau: "HK001234",
            diaChi: "Số 123, Đường ABC",
          },
          createdAt: new Date().toISOString(),
          payload: {
            selectedNhanKhauIds: [1, 2],
            newChuHoId: 2,
            newAddress: "Số 789, Đường XYZ",
            expectedDate: "2025-12-24",
            reason: "Tách hộ để quản lý riêng",
            note: "Đã chuẩn bị đầy đủ giấy tờ",
          },
        },
      });
    }
  }

  // TODO: Thay bằng API thật khi backend sẵn sàng
  // POST /requests/:id/approve - Duyệt yêu cầu
  async approveRequest(requestId: number) {
    try {
      return await this.request<{ success: boolean; data: any }>(`/requests/${requestId}/approve`, {
        method: "POST",
      });
    } catch (err: any) {
      // Mock response nếu API chưa sẵn sàng
      console.warn(`API /requests/${requestId}/approve chưa sẵn sàng, sử dụng mock response`);
      return Promise.resolve({
        success: true,
        data: {
          id: requestId,
          status: "approved",
        },
      });
    }
  }

  // TODO: Thay bằng API thật khi backend sẵn sàng
  // POST /requests/:id/reject - Từ chối yêu cầu
  async rejectRequest(requestId: number, reason: string) {
    try {
      return await this.request<{ success: boolean; data: any }>(`/requests/${requestId}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
    } catch (err: any) {
      // Mock response nếu API chưa sẵn sàng
      console.warn(`API /requests/${requestId}/reject chưa sẵn sàng, sử dụng mock response`);
      return Promise.resolve({
        success: true,
        data: {
          id: requestId,
          status: "rejected",
          rejectReason: reason,
        },
      });
    }
  }
}

export const apiService = new ApiService();


