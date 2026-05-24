import { Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";

import Login from "./Pages/Login";
import ForgotPassword from "./Pages/ForgetPassword";
import Dashboard from "./Pages/Dashboard";
import HrDashboard from "./Pages/HrDashboard";
import EmployeeDashboard from "./Pages/EmployeeDashboard";
import ApplyLeave from "./components/employee/ApplyLeave.jsx";
import EmpReport from "./components/employee/EmpReport.jsx";

export default function App() {
  const [auth, setAuth] = useState({ token: null, role: null });
  const [loadingAuth, setLoadingAuth] = useState(true);

  // Load auth from localStorage
  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role")?.toLowerCase();
    setAuth({ token, role });
    setLoadingAuth(false);
  }, []);

  // 🔐 Private Route
  const PrivateRoute = ({ children, allowedRoles }) => {
    if (loadingAuth) return <p>Loading...</p>;

    const { token, role } = auth;

    if (!token) return <Navigate to="/" replace />;

    if (allowedRoles && role && !allowedRoles.includes(role)) {
      if (role === "admin") return <Navigate to="/dashboard" replace />;
      if (role === "hr") return <Navigate to="/hrdashboard" replace />;
      if (role === "employee") return <Navigate to="/employeedashboard" replace />;
      return <Navigate to="/" replace />;
    }

    return children;
  };

  return (
    <Routes>

      {/* Public Routes */}
      <Route path="/" element={<Login setAuth={setAuth} />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

      {/* Admin Dashboard */}
      <Route
        path="/dashboard"
        element={
          <PrivateRoute allowedRoles={["admin"]}>
            <Dashboard />
          </PrivateRoute>
        }
      />

      {/* HR Dashboard */}
      <Route
        path="/hrdashboard"
        element={
          <PrivateRoute allowedRoles={["hr"]}>
            <HrDashboard />
          </PrivateRoute>
        }
      />

      {/* Employee Dashboard */}
      <Route
        path="/employeedashboard"
        element={
          <PrivateRoute allowedRoles={["employee"]}>
            <EmployeeDashboard />
          </PrivateRoute>
        }
      />

       {/* ================= EMPLOYEE APPLY LEAVE ================= */}
  <Route
    path="/employee/apply-leave"
    element={
      <PrivateRoute allowedRoles={["employee"]}>
        <ApplyLeave />
      </PrivateRoute>
    }
  />
   <Route
    path="/employee/report"
    element={
      <PrivateRoute allowedRoles={["employee"]}>
        <EmpReport />
      </PrivateRoute>
    }
  />
      {/* Catch All */}
      <Route path="*" element={<Navigate to="/" replace />} />

    </Routes>
  );
}