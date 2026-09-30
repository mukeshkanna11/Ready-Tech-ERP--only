import { Navigate, Route, Routes } from "react-router-dom";

// ==================== AUTH ====================
import Login from "./pages/auth/Login.jsx";

// ==================== DASHBOARD ====================
import Dashboard from "./pages/dashboard/Dashboard.jsx";

// ==================== COMPANY ====================
import Company from "./pages/company/Company.jsx";
import Branches from "./pages/company/Branches.jsx";

// ==================== USERS ====================
import Users from "./pages/users/Users.jsx";

// ==================== CUSTOMERS ====================
import Customers from "./pages/customers/Customers.jsx";

// ==================== VENDORS ====================
import Vendors from "./pages/vendors/Vendors.jsx";

// ==================== PRODUCTS ====================
import Products from "./pages/products/Products.jsx";

// ==================== INVENTORY ====================
import Inventory from "./pages/inventory/Inventory.jsx";

// ==================== PURCHASE ====================
import Purchase from "./pages/purchase/Purchase.jsx";

// ==================== SALES ====================
import Sales from "./pages/sales/Sales.jsx";
import Quotations from "./pages/sales/Quotations.jsx";
import SalesOrder from "./pages/sales/SalesOrders.jsx";

// ==================== INVOICES ====================
import Invoices from "./pages/invoices/Invoices.jsx";

// ==================== PAYMENTS ====================
import Payments from "./pages/payments/Payments.jsx";

// ==================== EXPENSES ====================
import Expenses from "./pages/expenses/Expenses.jsx";

// ==================== FINANCE / ACCOUNTING ====================
import Accounts from "./pages/accounting/Accounts.jsx";
import JournalEntries from "./pages/accounting/JournalEntries.jsx";
import FinancialReports from "./pages/accounting/FinancialReports.jsx";

// ==================== PROJECTS ====================
import Projects from "./pages/projects/Projects.jsx";
import Tasks from "./pages/projects/Tasks.jsx";

// ==================== WORKFLOW ====================
import Workflow from "./pages/workflow/Workflow.jsx";
import WorkflowInstances from "./pages/workflow/WorkflowInstances.jsx";
import WorkflowDetails from "./pages/workflow/WorkflowDetails.jsx";

// ==================== HR ====================
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
import Reports from "./pages/reports/Reports.jsx";


// ==================== LAYOUT ====================
import AppLayout from "./components/layout/AppLayout.jsx";

// ==================== API ====================
import { getToken } from "./services/api";

// ============================================================
// PROTECTED ROUTE
// ============================================================

function ProtectedRoute({ children }) {
  const token = getToken();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

// ============================================================
// APP ROUTES
// ============================================================

function App() {
  return (
    <Routes>
      {/* ======================================================
          PUBLIC ROUTES
      ====================================================== */}

      <Route
        path="/login"
        element={<Login />}
      />

      {/* ======================================================
          PROTECTED APPLICATION
      ====================================================== */}

      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        {/* ====================================================
            DEFAULT
        ==================================================== */}

        <Route
          path="/"
          element={
            <Navigate
              to="/dashboard"
              replace
            />
          }
        />

        {/* ====================================================
            DASHBOARD
        ==================================================== */}

        <Route
          path="/dashboard"
          element={<Dashboard />}
        />

        {/* ====================================================
            COMPANY
        ==================================================== */}

        <Route
          path="/company"
          element={<Company />}
        />

        <Route
          path="/company/branches"
          element={<Branches />}
        />

        {/* ====================================================
            USERS
        ==================================================== */}

        <Route
          path="/users"
          element={<Users />}
        />

        {/* ====================================================
            CUSTOMERS
        ==================================================== */}

        <Route
          path="/customers"
          element={<Customers />}
        />

        {/* ====================================================
            VENDORS
        ==================================================== */}

        <Route
          path="/vendors"
          element={<Vendors />}
        />

        {/* ====================================================
            PRODUCTS
        ==================================================== */}

        <Route
          path="/products"
          element={<Products />}
        />

        {/* ====================================================
            INVENTORY
        ==================================================== */}

        <Route
          path="/inventory"
          element={<Inventory />}
        />

        {/* ====================================================
            PURCHASE
        ==================================================== */}

        <Route
          path="/purchase"
          element={<Purchase />}
        />

        {/* ====================================================
            SALES
        ==================================================== */}

        <Route
          path="/sales"
          element={<Sales />}
        />

        <Route
          path="/quotations"
          element={<Quotations />}
        />

        <Route
          path="/salesorder"
          element={<SalesOrder />}
        />

        {/* ====================================================
            INVOICES
        ==================================================== */}

        <Route
          path="/invoices"
          element={<Invoices />}
        />

        {/* ====================================================
            PAYMENTS
        ==================================================== */}

        <Route
          path="/payments"
          element={<Payments />}
        />

        {/* ====================================================
            EXPENSES
        ==================================================== */}

        <Route
          path="/expenses"
          element={<Expenses />}
        />

        {/* ====================================================
            PROJECTS
        ==================================================== */}

        <Route
          path="/projects"
          element={<Projects />}
        />

        {/* ====================================================
            PROJECT TASKS
        ==================================================== */}

        <Route
          path="/projects/tasks"
          element={<Tasks />}
        />

        {/* Backward-compatible task URL */}
        <Route
          path="/tasks"
          element={
            <Navigate
              to="/projects/tasks"
              replace
            />
          }
        />

        {/* ====================================================
            FINANCE / ACCOUNTING
        ==================================================== */}

        <Route
          path="/accounting"
          element={
            <Navigate
              to="/accounting/accounts"
              replace
            />
          }
        />

        <Route
          path="/accounting/accounts"
          element={<Accounts />}
        />

        <Route
          path="/accounting/journal-entries"
          element={<JournalEntries />}
        />

        <Route
          path="/accounting/financial-reports"
          element={<FinancialReports />}
        />

        {/* ====================================================
            WORKFLOW
        ==================================================== */}

        {/* Workflow configuration / management */}
        <Route
          path="/workflow"
          element={<Workflow />}
        />

        {/* All workflow approval instances */}
        <Route
          path="/workflow/instances"
          element={<WorkflowInstances />}
        />

        {/* Individual workflow instance */}
        <Route
          path="/workflow/instances/:id"
          element={<WorkflowDetails />}
        />
<Route path="/reports" element={<Reports />} />
        {/* ====================================================
            HR MODULE
        ==================================================== */}

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

      {/* ======================================================
          UNKNOWN ROUTES
      ====================================================== */}

      <Route
        path="*"
        element={
          <Navigate
            to="/login"
            replace
          />
        }
      />
    </Routes>
  );
}

export default App;