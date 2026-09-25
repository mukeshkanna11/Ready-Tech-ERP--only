const express = require("express");

const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const corsOptions = require("./config/cors");

const authRoutes = require("./routes/auth.routes");
const companyRoutes = require("./routes/company.routes");
const branchRoutes = require("./routes/branch.routes");
const userRoutes = require("./routes/user.routes");
const roleRoutes = require("./routes/role.routes");
const departmentRoutes = require("./routes/department.routes");
const designationRoutes = require("./routes/designation.routes");
const employeeRoutes = require("./routes/employee.routes");
const attendanceRoutes = require("./routes/attendance.routes");
const holidayRoutes = require("./routes/holiday.routes");
const hrReportRoutes = require("./routes/hrReport.routes");
const shiftRoutes = require("./routes/shift.routes");
const leaveRoutes = require("./routes/leave.routes");
const payrollRoutes = require("./routes/payroll.routes");
const payslipRoutes = require("./routes/payslip.routes");
const performanceRoutes = require("./routes/performance.routes");
const salaryStructureRoutes = require("./routes/salaryStructure.routes");


const {
  notFound,
  errorHandler,
} = require("./middleware/error.middleware");

const app = express();

// --------------------------------------------------
// Security & Middleware
// --------------------------------------------------

app.use(helmet());

app.use(cors(corsOptions));

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

app.use(morgan("dev"));

// --------------------------------------------------
// Health Check
// --------------------------------------------------

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    status: "ok",
  });
});

// --------------------------------------------------
// Authentication
// --------------------------------------------------

app.use("/api/auth", authRoutes);

// --------------------------------------------------
// Organization
// --------------------------------------------------

app.use("/api/companies", companyRoutes);

app.use("/api/branches", branchRoutes);

// --------------------------------------------------
// User & Access Management
// --------------------------------------------------

app.use("/api/users", userRoutes);

app.use("/api/roles", roleRoutes);

// --------------------------------------------------
// HR Management
// --------------------------------------------------

app.use("/api/departments", departmentRoutes);

app.use("/api/designations", designationRoutes);

app.use("/api/employees", employeeRoutes);

app.use("/api/attendance", attendanceRoutes);

app.use("/api/holidays", holidayRoutes);

app.use(
  "/api/hr-reports",
  hrReportRoutes
);
app.use(
  "/api/salary-structures",
  salaryStructureRoutes
);

app.use("/api/shifts", shiftRoutes);
app.use("/api/leaves", leaveRoutes);
app.use("/api/payroll", payrollRoutes);
app.use("/api/payslips", payslipRoutes);
app.use("/api/performance", performanceRoutes);


// --------------------------------------------------
// 404 Handler
// --------------------------------------------------

app.use(notFound);

// --------------------------------------------------
// Global Error Handler
// --------------------------------------------------

app.use(errorHandler);

module.exports = app;