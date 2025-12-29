import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
import Feedbacks from "./pages/Feedbacks";

function App() {
    return (_jsx(BrowserRouter, { 
        children: _jsxs(Routes, { 
            children: [
                _jsx(Route, { path: "/", element: _jsx(Login, {}) }), 
                _jsx(Route, { path: "/dashboard", element: _jsx(ProtectedRoute, { allowedRoles: ["to_truong", "to_pho", "can_bo"], children: _jsx(Layout, { children: _jsx(Dashboard, {}) }) }) }), 
                _jsx(Route, { path: "/ho-khau", element: _jsx(ProtectedRoute, { allowedRoles: ["to_truong", "to_pho", "can_bo"], children: _jsx(Layout, { children: _jsx(HoKhau, {}) }) }) }), 
                _jsx(Route, { path: "/nhan-khau", element: _jsx(ProtectedRoute, { allowedRoles: ["to_truong", "to_pho", "can_bo"], children: _jsx(Layout, { children: _jsx(NhanKhau, {}) }) }) }), 
                _jsx(Route, { path: "/requests", element: _jsx(ProtectedRoute, { allowedRoles: ["to_truong", "to_pho", "can_bo"], children: _jsx(Layout, { children: _jsx(Requests, {}) }) }) }), 
                _jsx(Route, { path: "/bien-dong", element: _jsx(ProtectedRoute, { allowedRoles: ["to_truong", "to_pho", "can_bo"], children: _jsx(Layout, { children: _jsxs("div", { className: "rounded-xl border border-gray-200/80 bg-white p-8 shadow-sm", children: [_jsx("h1", { className: "text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent", children: "Bi\u1EBFn \u0111\u1ED9ng Nh\u00E2n kh\u1EA9u" }), _jsx("p", { className: "mt-2 text-gray-600", children: "Trang n\u00E0y \u0111ang \u0111\u01B0\u1EE3c ph\u00E1t tri\u1EC3n..." })] }) }) }) }), 
                _jsx(Route, { path: "/tam-tru-vang", element: _jsx(ProtectedRoute, { allowedRoles: ["to_truong", "to_pho", "can_bo"], children: _jsx(Layout, { children: _jsx(TamTruTamVangRequests, {}) }) }) }), 
                
                /* ĐÃ SỬA ĐOẠN NÀY */
                _jsx(Route, { path: "/phan-anh", element: _jsx(ProtectedRoute, { allowedRoles: ["to_truong", "to_pho", "can_bo"], children: _jsx(Layout, { children: _jsx(Feedbacks, {}) }) }) }), 
                
                _jsx(Route, { path: "/thong-ke", element: _jsx(ProtectedRoute, { allowedRoles: ["to_truong", "to_pho", "can_bo"], children: _jsx(Layout, { children: _jsxs("div", { className: "rounded-xl border border-gray-200/80 bg-white p-8 shadow-sm", children: [_jsx("h1", { className: "text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent", children: "Th\u1ED1ng k\u00EA" }), _jsx("p", { className: "mt-2 text-gray-600", children: "Trang n\u00E0y \u0111ang \u0111\u01B0\u1EE3c ph\u00E1t tri\u1EC3n..." })] }) }) }) }), 
                _jsx(Route, { path: "/bao-cao", element: _jsx(ProtectedRoute, { allowedRoles: ["to_truong", "to_pho", "can_bo"], children: _jsx(Layout, { children: _jsxs("div", { className: "rounded-xl border border-gray-200/80 bg-white p-8 shadow-sm", children: [_jsx("h1", { className: "text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent", children: "B\u00E1o c\u00E1o" }), _jsx("p", { className: "mt-2 text-gray-600", children: "Trang n\u00E0y \u0111ang \u0111\u01B0\u1EE3c ph\u00E1t tri\u1EC3n..." })] }) }) }) }), 
                _jsx(Route, { path: "/citizen/home", element: _jsx(ProtectedRoute, { allowedRoles: ["nguoi_dan"], children: _jsx(CitizenLayout, { children: _jsx(CitizenHome, {}) }) }) }), 
                _jsx(Route, { path: "/citizen/yeu-cau", element: _jsx(ProtectedRoute, { allowedRoles: ["nguoi_dan"], children: _jsx(CitizenLayout, { children: _jsx(YeuCau, {}) }) }) }), 
                _jsx(Route, { path: "/citizen/phan-anh", element: _jsx(ProtectedRoute, { allowedRoles: ["nguoi_dan"], children: _jsx(CitizenLayout, { children: _jsx(PhanAnh, {}) }) }) }), 
                _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/", replace: true }) })
            ] 
        }) 
    }));
}
export default App;