import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { apiService } from "../services/api";
export default function ProtectedRoute({ children, allowedRoles }) {
    const [isAuthenticated, setIsAuthenticated] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [userInfo, setUserInfo] = useState(null);
    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem("accessToken");
            if (!token) {
                setIsAuthenticated(false);
                setIsLoading(false);
                return;
            }
            try {
                // Verify token bằng cách gọi /auth/me
                const response = await apiService.getMe();
                if (response.success) {
                    setIsAuthenticated(true);
                    setUserInfo(response.data);
                    localStorage.setItem("userInfo", JSON.stringify(response.data));
                }
                else {
                    setIsAuthenticated(false);
                    apiService.logout();
                }
            }
            catch (err) {
                setIsAuthenticated(false);
                apiService.logout();
            }
            finally {
                setIsLoading(false);
            }
        };
        checkAuth();
    }, []);
    if (isLoading) {
        return (_jsx("div", { className: "flex h-screen items-center justify-center bg-gray-50", children: _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent" }), _jsx("p", { className: "mt-4 text-gray-600", children: "\u0110ang x\u00E1c th\u1EF1c..." })] }) }));
    }
    if (!isAuthenticated) {
        return _jsx(Navigate, { to: "/", replace: true });
    }
    // Check role if allowedRoles is specified
    if (allowedRoles && userInfo && !allowedRoles.includes(userInfo.role)) {
        // Redirect based on role
        if (userInfo.role === "nguoi_dan") {
            return _jsx(Navigate, { to: "/citizen/home", replace: true });
        }
        else {
            return _jsx(Navigate, { to: "/dashboard", replace: true });
        }
    }
    return _jsx(_Fragment, { children: children });
}
