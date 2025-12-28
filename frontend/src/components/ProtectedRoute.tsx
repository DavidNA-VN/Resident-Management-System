import { ReactNode, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { apiService, UserInfo } from "../services/api";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: string[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);

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
        } else {
          setIsAuthenticated(false);
          apiService.logout();
        }
      } catch (err) {
        setIsAuthenticated(false);
        apiService.logout();
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Đang xác thực...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // Check role if allowedRoles is specified
  if (allowedRoles && userInfo && !allowedRoles.includes(userInfo.role)) {
    // Redirect based on role
    if (userInfo.role === "nguoi_dan") {
      return <Navigate to="/citizen/home" replace />;
    } else {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
}



