import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";

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
                <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 backdrop-blur-sm">
                  <h1 className="text-2xl font-bold text-white">Quản lý Hộ khẩu</h1>
                  <p className="mt-2 text-slate-400">Trang này đang được phát triển...</p>
                </div>
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/nhan-khau"
          element={
            <ProtectedRoute>
              <Layout>
                <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 backdrop-blur-sm">
                  <h1 className="text-2xl font-bold text-white">Quản lý Nhân khẩu</h1>
                  <p className="mt-2 text-slate-400">Trang này đang được phát triển...</p>
            </div>
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/bien-dong"
          element={
            <ProtectedRoute>
              <Layout>
                <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 backdrop-blur-sm">
                  <h1 className="text-2xl font-bold text-white">Biến động Nhân khẩu</h1>
                  <p className="mt-2 text-slate-400">Trang này đang được phát triển...</p>
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
                <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 backdrop-blur-sm">
                  <h1 className="text-2xl font-bold text-white">Tạm trú / Tạm vắng</h1>
                  <p className="mt-2 text-slate-400">Trang này đang được phát triển...</p>
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
                <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 backdrop-blur-sm">
                  <h1 className="text-2xl font-bold text-white">Phản ánh Kiến nghị</h1>
                  <p className="mt-2 text-slate-400">Trang này đang được phát triển...</p>
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
                <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 backdrop-blur-sm">
                  <h1 className="text-2xl font-bold text-white">Thống kê</h1>
                  <p className="mt-2 text-slate-400">Trang này đang được phát triển...</p>
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
                <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 backdrop-blur-sm">
                  <h1 className="text-2xl font-bold text-white">Báo cáo</h1>
                  <p className="mt-2 text-slate-400">Trang này đang được phát triển...</p>
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
