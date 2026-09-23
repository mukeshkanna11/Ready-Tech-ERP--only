import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Building2,
  LayoutDashboard,
  LogOut,
  Menu,
  Network,
  X,
} from "lucide-react";

import { clearSession } from "../../services/api";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/company", label: "Companies", icon: Building2, end: true },
  { to: "/company/branches", label: "Branches", icon: Network },
  { to: "/users", label: "Users", icon: Network }
];

const readUser = () => {
  try {
    const raw =
      localStorage.getItem("erp_user") || sessionStorage.getItem("erp_user");

    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const initials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "RT";

const navClass = ({ isActive }) =>
  `group relative flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 ${
    isActive
      ? "border border-cyan-400/20 bg-cyan-400/[0.1] font-medium text-cyan-200"
      : "border border-transparent text-gray-400 hover:border-white/10 hover:bg-white/[0.05] hover:text-gray-100"
  }`;

const AppLayout = () => {
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const user = readUser();

  const handleLogout = () => {
    clearSession();
    navigate("/login", { replace: true });
  };

  const closeDrawer = () => setDrawerOpen(false);

  const sidebar = (
    <div className="flex h-full flex-col border-r border-white/[0.07] bg-[#070a11]">
      {/* Brand */}
      <div className="flex items-center gap-3 border-b border-white/[0.07] px-4 py-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/[0.08] text-sm font-bold text-cyan-300 shadow-lg shadow-cyan-500/5">
          RT
        </div>

        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">
            Ready Tech
          </p>

          <p className="truncate text-[10px] uppercase tracking-[0.2em] text-cyan-400">
            ERP Suite
          </p>
        </div>

        <button
          type="button"
          onClick={closeDrawer}
          aria-label="Close navigation"
          className="ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-gray-400 transition hover:text-gray-100 lg:hidden"
        >
          <X size={16} />
        </button>
      </div>

      {/* Navigation */}
      <nav aria-label="Main navigation" className="flex-1 overflow-y-auto p-3">
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-600">
          Core ERP
        </p>

        <ul className="space-y-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                onClick={closeDrawer}
                className={navClass}
              >
                {({ isActive }) => (
                  <>
                    <span
                      aria-hidden="true"
                      className={`absolute left-0 h-5 w-0.5 rounded-r-full bg-cyan-400 transition-opacity ${
                        isActive ? "opacity-100" : "opacity-0"
                      }`}
                    />

                    <Icon size={17} className="shrink-0" />
                    <span className="truncate">{label}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Profile */}
      <div className="border-t border-white/[0.07] p-3">
        <div className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.05] text-[11px] font-semibold text-gray-200">
            {initials(user?.name)}
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-gray-200">
              {user?.name || "Signed in"}
            </p>

            <p className="truncate text-[11px] text-gray-600">
              {user?.email || "—"}
            </p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            aria-label="Log out"
            title="Log out"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-red-400/10 bg-red-400/[0.05] text-red-300 transition hover:border-red-400/25 hover:bg-red-400/[0.12] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    // Fixed viewport frame: the shell never scrolls, only <main> does.
    <div className="flex h-dvh w-full overflow-hidden bg-[#05070b] text-white">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-[10%] -top-[15%] h-[500px] w-[500px] rounded-full bg-cyan-500/[0.06] blur-[150px]" />
        <div className="absolute -right-[10%] top-[10%] h-[450px] w-[450px] rounded-full bg-blue-500/[0.05] blur-[150px]" />
        <div className="absolute bottom-[-15%] left-[35%] h-[450px] w-[450px] rounded-full bg-violet-500/[0.05] blur-[160px]" />
      </div>

      <div
        className="pointer-events-none fixed inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* Desktop sidebar */}
      <aside className="hidden h-full w-64 shrink-0 lg:block xl:w-72">
        {sidebar}
      </aside>

      {/* Mobile drawer */}
      {drawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            role="presentation"
            onClick={closeDrawer}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          <div className="absolute left-0 top-0 h-full w-72 max-w-[85vw] shadow-2xl shadow-black/60">
            {sidebar}
          </div>
        </div>
      ) : null}

      {/* Content column */}
      <div className="relative flex h-full min-w-0 flex-1 flex-col overflow-hidden">
        {/* Mobile top bar */}
        <header className="z-30 flex shrink-0 items-center gap-3 border-b border-white/[0.07] bg-[#05070b]/90 px-3 py-3 backdrop-blur-xl sm:px-5 lg:hidden">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation"
            aria-expanded={drawerOpen}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-gray-300 transition hover:border-white/20 hover:bg-white/[0.07] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
          >
            <Menu size={18} />
          </button>

          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-cyan-400/20 bg-cyan-400/[0.08] text-[11px] font-bold text-cyan-300">
              RT
            </div>

            <span className="truncate text-sm font-semibold">Ready Tech ERP</span>
          </div>
        </header>

        <main className="relative min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
