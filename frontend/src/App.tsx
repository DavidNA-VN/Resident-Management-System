import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import CitizenLayout from "./components/CitizenLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import HoKhau from "./pages/HoKhau";
import NhanKhau from "./pages/NhanKhau";
import CitizenHome from "./pages/citizen/Home";
import YeuCau from "./pages/citizen/YeuCau";
import PhanAnh from "./pages/citizen/PhanAnh";
import Requests from "./pages/Requests";
import TamTruTamVangRequests from "./pages/TamTruTamVangRequests";
import ThongKe from "./pages/ThongKe";
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={["to_truong", "to_pho", "can_bo"]}>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/ho-khau"
          element={
            <ProtectedRoute allowedRoles={["to_truong", "to_pho", "can_bo"]}>
              <Layout>
                <HoKhau />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/nhan-khau"
          element={
            <ProtectedRoute allowedRoles={["to_truong", "to_pho", "can_bo"]}>
              <Layout>
                <NhanKhau />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/requests"
          element={
            <ProtectedRoute allowedRoles={["to_truong", "to_pho", "can_bo"]}>
              <Layout>
                <Requests />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/bien-dong"
          element={
            <ProtectedRoute allowedRoles={["to_truong", "to_pho", "can_bo"]}>
              <Layout>
                <div className="rounded-xl border border-gray-200/80 bg-white p-8 shadow-sm">
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                    Biến động Nhân khẩu
                  </h1>
                  <p className="mt-2 text-gray-600">Trang này đang được phát triển...</p>
                </div>
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/tam-tru-vang"
          element={
            <ProtectedRoute allowedRoles={["to_truong", "to_pho", "can_bo"]}>
              <Layout>
                <TamTruTamVangRequests />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/phan-anh"
          element={
            <ProtectedRoute allowedRoles={["to_truong", "to_pho", "can_bo"]}>
              <Layout>
                <div className="rounded-xl border border-gray-200/80 bg-white p-8 shadow-sm">
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                    Phản ánh Kiến nghị
                  </h1>
                  <p className="mt-2 text-gray-600">Trang này đang được phát triển...</p>
                </div>
              </Layout>
            </ProtectedRoute>
          }
        />
      <Route
  path="/thong-ke"
  element={
    <ProtectedRoute allowedRoles={["to_truong", "to_pho", "can_bo"]}>
      <Layout>
        <ThongKe /> 
      </Layout>
    </ProtectedRoute>
  }
/>
        <Route
          path="/bao-cao"
          element={
            <ProtectedRoute allowedRoles={["to_truong", "to_pho", "can_bo"]}>
              <Layout>
                <div className="rounded-xl border border-gray-200/80 bg-white p-8 shadow-sm">
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                    Báo cáo
                  </h1>
                  <p className="mt-2 text-gray-600">Trang này đang được phát triển...</p>
                </div>
              </Layout>
            </ProtectedRoute>
          }
        />
        {/* Citizen Routes */}
        <Route
          path="/citizen/home"
          element={
            <ProtectedRoute allowedRoles={["nguoi_dan"]}>
              <CitizenLayout>
                <CitizenHome />
              </CitizenLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/citizen/yeu-cau"
          element={
            <ProtectedRoute allowedRoles={["nguoi_dan"]}>
              <CitizenLayout>
                <YeuCau />
              </CitizenLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/citizen/phan-anh"
          element={
            <ProtectedRoute allowedRoles={["nguoi_dan"]}>
              <CitizenLayout>
                <PhanAnh />
              </CitizenLayout>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;