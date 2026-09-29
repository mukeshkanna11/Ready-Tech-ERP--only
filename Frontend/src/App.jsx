import { Navigate, Route, Routes } from "react-router-dom";

// Auth
import Login from "./pages/auth/Login.jsx";

// Dashboard
import Dashboard from "./pages/dashboard/Dashboard.jsx";

// Company
import Company from "./pages/company/Company.jsx";
import Branches from "./pages/company/Branches.jsx";
import Customers from "./pages/customers/Customers.jsx";
// Users
import Users from "./pages/users/Users.jsx";

// HR
import HR from "./pages/hr/HR.jsx";
import Employee from "./pages/hr/Employees.jsx";
import Attendance from "./pages/hr/Attendance.jsx";
import Holidays from "./pages/hr/Holidays.jsx";
import Shifts from "./pages/hr/Shifts.jsx";
import Leave from "./pages/hr/Leave.jsx";
import SalaryStructure from "./pages/hr/SalaryStructure.jsx";
import Payroll from "./pages/hr/Payroll.jsx";
import Payslips from "./pages/hr/Payslips.jsx";
import Performance from "./pages/hr/Performance.jsx";
import HRReports from "./pages/hr/HRReports.jsx";
import Vendors from "./pages/vendors/Vendors.jsx";
import Products from "./pages/products/Products.jsx";
import Inventory from './pages/inventory/Inventory.jsx';
import Purchase from "./pages/purchase/Purchase.jsx";
import Sales from "./pages/sales/Sales.jsx";
import Quotations from "./pages/sales/Quotations.jsx";
import SalesOrder from "./pages/sales/SalesOrders.jsx";


// Layout
import AppLayout from "./components/layout/AppLayout.jsx";

// API
import { getToken } from "./services/api";

function ProtectedRoute({ children }) {
  const token = getToken();

  return token ? children : <Navigate to="/login" replace />;
}

function App() {
  return (
    <Routes>
      {/* ==================== PUBLIC ROUTES ==================== */}

      <Route path="/login" element={<Login />} />

      {/* ==================== PROTECTED APPLICATION ==================== */}

      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        {/* ==================== DEFAULT ==================== */}

        <Route
          path="/"
          element={<Navigate to="/dashboard" replace />}
        />

        {/* ==================== DASHBOARD ==================== */}

        <Route
          path="/dashboard"
          element={<Dashboard />}
        />

        {/* ==================== COMPANY ==================== */}

        <Route
          path="/company"
          element={<Company />}
        />

        <Route
          path="/company/branches"
          element={<Branches />}
        />

        {/* ==================== USERS ==================== */}

        <Route
          path="/users"
          element={<Users />}
        />

        <Route
          path="/customers"
          element={<Customers/>}
        />


        <Route
          path="/vendors"
          element={<Vendors/>}
        />

        <Route path="/products" element={<Products />} />

         <Route path="/inventory" element={<Inventory />} />
<Route path="/purchase" element={<Purchase />} />
<Route path="/sales" element={<Sales />} />
<Route path="/quotations" element={<Quotations />} />
<Route path="/salesorder" element={<SalesOrder />} />



        {/* ==================== HR MODULE ==================== */}

        <Route
          path="/hr"
          element={<HR />}
        >  
          {/* Employee */}
          <Route
            path="employees"
            element={<Employee />}
          />

          {/* Attendance */}
          <Route
            path="attendance"
            element={<Attendance />}
          />

          {/* Holidays */}
          <Route
            path="holidays"
            element={<Holidays />}
          />

          {/* Shifts */}
          <Route
            path="shifts"
            element={<Shifts />}
          />

          {/* Leave */}
          <Route
            path="leave"
            element={<Leave />}
          />

          {/* Salary Structure */}
          <Route
            path="salary-structure"
            element={<SalaryStructure />}
          />

          {/* Payroll */}
          <Route
            path="payroll"
            element={<Payroll />}
          />

          {/* Payslips */}
          <Route
            path="payslip"
            element={<Payslips />}
          />

          {/* Performance */}
          <Route
            path="performance"
            element={<Performance />}
          />

          {/* HR Reports */}
          <Route
            path="reports"
            element={<HRReports />}
          />
        </Route>
      </Route>

      {/* ==================== INVALID ROUTES ==================== */}

      <Route
        path="*"
        element={<Navigate to="/login" replace />}
      />
    </Routes>
  );
}

export default App;