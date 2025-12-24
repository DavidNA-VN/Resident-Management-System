import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import HoKhau from "./pages/HoKhau";
import NhanKhau from "./pages/NhanKhau";
import YeuCau from "./pages/YeuCau";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/ho-khau"
          element={
            <ProtectedRoute>
              <Layout>
                <HoKhau />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/nhan-khau"
          element={
            <ProtectedRoute>
              <Layout>
                <NhanKhau />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/yeu-cau"
          element={
            <ProtectedRoute>
              <Layout>
                <YeuCau />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/bien-dong"
          element={
            <ProtectedRoute>
              <Layout>
                <div className="rounded-xl border border-gray-200/80 bg-white p-8 shadow-sm">
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                    Biến động Nhân khẩu
                  </h1>
                  <p className="mt-2 text-gray-600">
                    Trang này đang được phát triển...
                  </p>
                </div>
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/tam-tru-vang"
          element={
            <ProtectedRoute>
              <Layout>
                <div className="rounded-xl border border-gray-200/80 bg-white p-8 shadow-sm">
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                    Tạm trú / Tạm vắng
                  </h1>
                  <p className="mt-2 text-gray-600">
                    Trang này đang được phát triển...
                  </p>
                </div>
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/phan-anh"
          element={
            <ProtectedRoute>
              <Layout>
                <div className="rounded-xl border border-gray-200/80 bg-white p-8 shadow-sm">
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                    Phản ánh Kiến nghị
                  </h1>
                  <p className="mt-2 text-gray-600">
                    Trang này đang được phát triển...
                  </p>
                </div>
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/thong-ke"
          element={
            <ProtectedRoute>
              <Layout>
                <div className="rounded-xl border border-gray-200/80 bg-white p-8 shadow-sm">
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                    Thống kê
                  </h1>
                  <p className="mt-2 text-gray-600">
                    Trang này đang được phát triển...
                  </p>
                </div>
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/bao-cao"
          element={
            <ProtectedRoute>
              <Layout>
                <div className="rounded-xl border border-gray-200/80 bg-white p-8 shadow-sm">
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                    Báo cáo
                  </h1>
                  <p className="mt-2 text-gray-600">
                    Trang này đang được phát triển...
                  </p>
                </div>
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
