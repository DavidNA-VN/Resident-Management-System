const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
class ApiService {
    getAuthToken() {
        return localStorage.getItem("accessToken");
    }
    async request(endpoint, options = {}) {
        const token = this.getAuthToken();
        const headers = {
            "Content-Type": "application/json",
            Accept: "application/json",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            ...options.headers,
        };
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers,
            cache: "no-store",
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
        const cacheBust = `_=${Date.now()}`;
        const params = new URLSearchParams();
        if (trangThai)
            params.append("trangThai", trangThai);
        params.append("_", cacheBust);
        const query = params.toString();
        return this.request(`/ho-khau${query ? `?${query}` : ""}`, { method: "GET" });
    }
    async getHoKhauById(id) {
        const cacheBust = `_=${Date.now()}`;
        return this.request(`/ho-khau/${id}?${cacheBust}`, {
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
        const cacheBust = `_=${Date.now()}`;
        return this.request(`/nhan-khau?hoKhauId=${hoKhauId}&${cacheBust}`, { method: "GET" });
    }
    async getNhanKhauById(id) {
        const cacheBust = `_=${Date.now()}`;
        return this.request(`/nhan-khau/${id}?${cacheBust}`, { method: "GET" });
    }
    async updateNhanKhau(id, data) {
        return this.request(`/nhan-khau/${id}`, {
            method: "PATCH",
            body: JSON.stringify(data),
        });
    }
    async createNhanKhau(data) {
        return this.request("/nhan-khau", {
            method: "POST",
            body: JSON.stringify(data),
        });
    }
    // Citizen APIs
    async getCitizenHousehold() {
        return this.request("/citizen/household", {
            method: "GET",
        });
    }
    async createRequest(data) {
        return this.request("/requests", {
            method: "POST",
            body: JSON.stringify(data),
        });
    }
    async getMyRequests() {
        return this.request("/requests/me", {
            method: "GET",
        });
    }
    async createFeedback(data) {
        return this.request("/feedback", {
            method: "POST",
            body: JSON.stringify(data),
        });
    }
    async getMyFeedbacks() {
        return this.request("/feedback/me", {
            method: "GET",
        });
    }
    // TODO: Thay bằng API thật khi backend có endpoint /citizen/my-household
    // GET /citizen/my-household - Lấy hộ khẩu và danh sách nhân khẩu của người dân
    async getMyHousehold() {
        // Tạm thời dùng endpoint hiện có /citizen/household, sau này sẽ thay bằng /citizen/my-household
        try {
            const response = await this.request("/citizen/household", {
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
        }
        catch (err) {
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
    async createSplitHouseholdRequest(data) {
        // Tạm thời dùng endpoint hiện có, sau này sẽ thay bằng /citizen/requests/split-household
        try {
            return await this.request("/requests", {
                method: "POST",
                body: JSON.stringify({
                    type: "TACH_HO_KHAU",
                    payload: data,
                }),
            });
        }
        catch (err) {
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
    async getRequestsList(filters) {
        try {
            const params = new URLSearchParams();
            if (filters?.type)
                params.append("type", filters.type);
            if (filters?.status)
                params.append("status", filters.status);
            const queryString = params.toString();
            const url = `/requests${queryString ? `?${queryString}` : ""}`;
            return await this.request(url, {
                method: "GET",
            });
        }
        catch (err) {
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
    async getRequestDetail(requestId) {
        try {
            return await this.request(`/requests/${requestId}`, {
                method: "GET",
            });
        }
        catch (err) {
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
    async approveRequest(requestId) {
        try {
            return await this.request(`/requests/${requestId}/approve`, {
                method: "POST",
            });
        }
        catch (err) {
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
    async rejectRequest(requestId, reason) {
        try {
            return await this.request(`/requests/${requestId}/reject`, {
                method: "POST",
                body: JSON.stringify({ reason }),
            });
        }
        catch (err) {
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
