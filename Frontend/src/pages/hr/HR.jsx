import React from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  Network,
  Users,
  UsersRound,
} from "lucide-react";
const hrModules = [
  {
    label: "Employees",
    path: "employees",
    description: "Employee profiles and workforce information",
    icon: "👥",
    status: "Available",
  },
  {
    label: "Attendance",
    path: "attendance",
    description: "Daily attendance and working hours",
    icon: "🕐",
    status: "Coming next",
  },
  {
    label: "Holidays",
    path: "holidays",
    description: "Company holidays and working days",
    icon: "🏖️",
    status: "Coming next",
  },
  {
    label: "Shifts",
    path: "shifts",
    description: "Shift schedules and employee assignments",
    icon: "🔄",
    status: "Coming next",
  },
  {
    label: "Leave",
    path: "leave",
    description: "Leave requests, balances and approvals",
    icon: "📅",
    status: "Coming next",
  },
  {
    label: "Payroll",
    path: "payroll",
    description: "Salary processing and payroll management",
    icon: "💰",
    status: "Coming next",
  },
  {
    label: "Payslip",
    path: "payslip",
    description: "Employee salary slips and records",
    icon: "🧾",
    status: "Coming next",
  },
  {
    label: "Performance",
    path: "performance",
    description: "Employee goals, reviews and performance",
    icon: "📈",
    status: "Coming next",
  },
  {
    label: "HR Reports",
    path: "reports",
    description: "HR analytics and management reports",
    icon: "📊",
    status: "Coming next",
  },
];

export default function HR() {
  const location = useLocation();

  const isHRHome =
    location.pathname === "/hr" ||
    location.pathname === "/hr/";

  return (
    <div className="min-h-screen w-full bg-slate-950 text-white">
      <div className="mx-auto w-full max-w-[1800px] px-3 py-4 sm:px-5 lg:px-7">
        {/* Header */}
        <div className="mb-6">
          <div className="mb-2 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]" />

            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
              ERP · Human Resources
            </span>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Human Resources
              </h1>

              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-400">
                Manage your complete employee lifecycle from one
                centralized HR workspace.
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2 text-xs text-slate-500">
              {hrModules.length} HR Modules
            </div>
          </div>
        </div>

        {/* HR Module Navigation */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {hrModules.map((module) => {
            const active = location.pathname.startsWith(
              `/hr/${module.path}`
            );

            return (
              <Link
                key={module.path}
                to={module.path}
                className={`group relative overflow-hidden rounded-2xl border p-4 transition-all duration-200 ${
                  active
                    ? "border-emerald-500/30 bg-emerald-500/[0.08] shadow-[0_0_25px_rgba(16,185,129,0.06)]"
                    : "border-white/10 bg-white/[0.035] hover:border-white/20 hover:bg-white/[0.055]"
                }`}
              >
                {/* Active indicator */}
                {active && (
                  <span className="absolute left-0 top-0 h-full w-0.5 bg-emerald-400" />
                )}

                <div className="flex items-start justify-between gap-2">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg transition ${
                      active
                        ? "bg-emerald-500/15"
                        : "bg-white/5 group-hover:bg-white/10"
                    }`}
                  >
                    {module.icon}
                  </div>

                  {module.status === "Available" ? (
                    <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-medium text-emerald-400">
                      Active
                    </span>
                  ) : (
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] font-medium text-slate-500">
                      Soon
                    </span>
                  )}
                </div>

                <h2
                  className={`mt-3 text-sm font-semibold ${
                    active
                      ? "text-emerald-400"
                      : "text-white"
                  }`}
                >
                  {module.label}
                </h2>

                <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                  {module.description}
                </p>
              </Link>
            );
          })}
        </div>

        {/* Content */}
        {isHRHome ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 sm:p-8">
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.5fr_1fr]">
              {/* Main */}
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-2xl">
                  👥
                </div>

                <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400">
                  HR Workspace
                </p>

                <h2 className="mt-2 text-xl font-bold text-white sm:text-2xl">
                  Human Resource Management
                </h2>

                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">
                  Manage employees, attendance, holidays, shifts,
                  leave, payroll, payslips, performance and HR
                  reports through a unified workspace.
                </p>

                <Link
                  to="employees"
                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
                >
                  Open Employees
                  <span>→</span>
                </Link>
              </div>

              {/* Module Summary */}
              <div className="rounded-2xl border border-white/10 bg-black/10 p-4 sm:p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-slate-500">
                      HR Modules
                    </p>

                    <p className="mt-1 text-sm font-semibold text-white">
                      Workspace Overview
                    </p>
                  </div>

                  <span className="text-xs text-slate-600">
                    9 Modules
                  </span>
                </div>

                <div className="space-y-2">
                  {hrModules.map((module) => (
                    <Link
                      key={module.path}
                      to={module.path}
                      className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 transition hover:border-white/10 hover:bg-white/[0.045]"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 text-sm">
                        {module.icon}
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-200">
                          {module.label}
                        </p>

                        <p className="mt-0.5 text-[10px] text-slate-600">
                          {module.status}
                        </p>
                      </div>

                      <span className="text-xs text-slate-600">
                        →
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <Outlet />
        )}
      </div>
    </div>
  );
}