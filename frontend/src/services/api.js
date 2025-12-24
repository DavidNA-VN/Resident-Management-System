const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
class ApiService {
    getAuthToken() {
        return localStorage.getItem("accessToken");
    }
    async request(endpoint, options = {}) {
        const token = this.getAuthToken();
        const headers = {
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
    async login(credentials) {
        return this.request("/auth/login", {
            method: "POST",
            body: JSON.stringify(credentials),
        });
    }
    async register(data) {
        return this.request("/auth/register", {
            method: "POST",
            body: JSON.stringify(data),
        });
    }
    async getMe() {
        return this.request("/auth/me", {
            method: "GET",
        });
    }
    logout() {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("userInfo");
        localStorage.removeItem("isAuthenticated");
    }
    // Hộ khẩu APIs
    async getHoKhauList(trangThai) {
        const params = trangThai ? `?trangThai=${trangThai}` : "";
        return this.request(`/ho-khau${params}`, { method: "GET" });
    }
    async getHoKhauById(id) {
        return this.request(`/ho-khau/${id}`, {
            method: "GET",
        });
    }
    async createHoKhau(data) {
        return this.request("/ho-khau", {
            method: "POST",
            body: JSON.stringify(data),
        });
    }
    async updateHoKhau(id, data) {
        return this.request(`/ho-khau/${id}`, {
            method: "PATCH",
            body: JSON.stringify(data),
        });
    }
    async activateHoKhau(hoKhauId, chuHoId) {
        return this.request(`/ho-khau/${hoKhauId}/activate`, {
            method: "PATCH",
            body: JSON.stringify({ chuHoId }),
        });
    }
    // Nhân khẩu APIs
    async getNhanKhauList(hoKhauId) {
        return this.request(`/nhan-khau?hoKhauId=${hoKhauId}`, { method: "GET" });
    }
    async createNhanKhau(data) {
        return this.request("/nhan-khau", {
            method: "POST",
            body: JSON.stringify(data),
        });
    }
    async updateNhanKhau(id, data) {
        return this.request(`/nhan-khau/${id}`, {
            method: "PATCH",
            body: JSON.stringify(data),
        });
    }
}
export const apiService = new ApiService();
