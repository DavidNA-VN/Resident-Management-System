import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout.tsx";
import CitizenLayout from "./components/CitizenLayout.tsx";
import ProtectedRoute from "./components/ProtectedRoute.tsx";
import Login from "./pages/Login.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import HoKhau from "./pages/HoKhau.tsx";
import NhanKhau from "./pages/NhanKhau.tsx";
import CitizenHome from "./pages/citizen/Home.tsx";
import YeuCau from "./pages/citizen/YeuCau.tsx";
import PhanAnh from "./pages/citizen/PhanAnh.tsx";
import Requests from "./pages/Requests";
import TamTruTamVangRequests from "./pages/TamTruTamVangRequests.tsx";
import Feedbacks from "./pages/Feedbacks";
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
            <ProtectedRoute
              allowedRoles={["to_truong", "to_pho", "can_bo"]}
              allowedTasks={["hokhau_nhankhau"]}
            >
              <Layout>
                <HoKhau />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/nhan-khau"
          element={
            <ProtectedRoute
              allowedRoles={["to_truong", "to_pho", "can_bo"]}
              allowedTasks={["hokhau_nhankhau"]}
            >
              <Layout>
                <NhanKhau />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/requests"
          element={
            <ProtectedRoute
              allowedRoles={["to_truong", "to_pho", "can_bo"]}
              allowedTasks={["hokhau_nhankhau", "tamtru_tamvang"]}
            >
              <Layout>
                <Requests />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/bien-dong"
          element={
            <Navigate to="/dashboard" replace />
          }
        />
        <Route
          path="/tam-tru-vang"
          element={
            <ProtectedRoute
              allowedRoles={["to_truong", "to_pho", "can_bo"]}
              allowedTasks={["hokhau_nhankhau", "tamtru_tamvang"]}
            >
              <Layout>
                <TamTruTamVangRequests />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/phan-anh"
          element={
            <ProtectedRoute
              allowedRoles={["to_truong", "to_pho", "can_bo"]}
              allowedTasks={["kiennghi"]}
            >
              <Layout>
                <Feedbacks />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
  path="/thong-ke"
  element={
    <ProtectedRoute
      allowedRoles={["to_truong", "to_pho", "can_bo"]}
      allowedTasks={["thongke"]}
    >
      <Layout>
        <ThongKe /> 
      </Layout>
    </ProtectedRoute>
  }
/>
        <Route
          path="/bao-cao"
          element={
            <ProtectedRoute
              allowedRoles={["to_truong", "to_pho", "can_bo"]}
              allowedTasks={["thongke"]}
            >
              <Layout>
                <ThongKe />
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