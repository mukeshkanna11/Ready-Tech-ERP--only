import { Navigate, Route, Routes } from "react-router-dom";

import Login from "./pages/auth/Login.jsx";
import Dashboard from "./pages/dashboard/Dashboard.jsx";

import Company from "./pages/company/Company.jsx";
import Branches from "./pages/company/Branches.jsx";

import Users from "./pages/users/Users.jsx";

import HR from "./pages/hr/HR.jsx";
import Employee from "./pages/hr/Employees.jsx";

import AppLayout from "./components/layout/AppLayout.jsx";

import { getToken } from "./services/api";

function ProtectedRoute({ children }) {
  const token = getToken();

  return token ? children : <Navigate to="/login" replace />;
}

function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />

      {/* Protected Application */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        {/* Default Route */}
        <Route
          path="/"
          element={<Navigate to="/dashboard" replace />}
        />

        {/* Dashboard */}
        <Route
          path="/dashboard"
          element={<Dashboard />}
        />

        {/* Company */}
        <Route
          path="/company"
          element={<Company />}
        />

        <Route
          path="/company/branches"
          element={<Branches />}
        />

        {/* Users */}
        <Route
          path="/users"
          element={<Users />}
        />

        {/* HR Module */}
        <Route path="/hr" element={<HR />}>
          {/* Employee */}
          <Route
            path="employees"
            element={<Employee />}
          />

          {/* Future HR Modules */}
          {/* 
          <Route path="attendance" element={<Attendance />} />
          <Route path="holidays" element={<Holidays />} />
          <Route path="shifts" element={<Shifts />} />
          <Route path="leave" element={<Leave />} />
          <Route path="payroll" element={<Payroll />} />
          <Route path="payslip" element={<Payslip />} />
          <Route path="performance" element={<Performance />} />
          <Route path="reports" element={<HRReports />} />
          */}
        </Route>
      </Route>

      {/* Invalid Route */}
      <Route
        path="*"
        element={<Navigate to="/login" replace />}
      />
    </Routes>
  );
}

export default App;