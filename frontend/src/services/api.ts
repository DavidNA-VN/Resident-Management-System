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
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string> | undefined),
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
}

export const apiService = new ApiService();
