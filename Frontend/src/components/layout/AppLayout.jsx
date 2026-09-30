import { useState } from "react";

import {
  NavLink,
  Outlet,
  useNavigate,
} from "react-router-dom";

import {
  Building2,
  LayoutDashboard,
  Network,
  Users,
  Package,
  Boxes,
  UserRound,
  Store,
  UserCog,
  ShoppingCart,
  FileText,
  ClipboardList,
  Receipt,
  CreditCard,
  Menu,
  Wallet,
  Landmark,
  FolderKanban,
  ListTodo,
  BarChart3,
  GitBranch,
  X,
  LogOut,
} from "lucide-react";

import { clearSession } from "../../services/api";

const NAV_ITEMS = [
  {
    to: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },

  {
    to: "/company",
    label: "Companies",
    icon: Building2,
    end: true,
  },

  {
    to: "/company/branches",
    label: "Branches",
    icon: Network,
  },

  {
    to: "/users",
    label: "Users",
    icon: Users,
  },

  {
    to: "/hr",
    label: "HR",
    icon: UserCog,
  },

  {
    to: "/customers",
    label: "Customers",
    icon: UserRound,
  },

  {
    to: "/vendors",
    label: "Vendors",
    icon: Store,
  },

  {
    to: "/products",
    label: "Products",
    icon: Package,
  },

  {
    to: "/inventory",
    label: "Inventory",
    icon: Boxes,
  },

  {
    to: "/purchase",
    label: "Purchase",
    icon: ShoppingCart,
  },

  {
    to: "/sales",
    label: "Sales",
    icon: Receipt,
  },

  {
    to: "/quotations",
    label: "Quotations",
    icon: FileText,
  },

  {
    to: "/salesorder",
    label: "Sales Orders",
    icon: ClipboardList,
  },

  {
    to: "/invoices",
    label: "Invoices",
    icon: ClipboardList,
  },

  {
    to: "/payments",
    label: "Payments",
    icon: CreditCard,
  },

  {
    to: "/expenses",
    label: "Expenses",
    icon: Wallet,
  },

  {
    to: "/accounting",
    label: "Finance",
    icon: Landmark,
  },

  {
    to: "/projects",
    label: "Projects",
    icon: FolderKanban,
  },

  {
    to: "/projects/tasks",
    label: "Tasks",
    icon: ListTodo,
  },

  {
    to: "/workflow",
    label: "Workflow",
    icon: GitBranch,
  },
{
  to: "/reports",
  label: "Reports",
  icon: BarChart3,
},

];

const readUser = () => {
  try {
    const raw =
      localStorage.getItem("erp_user") ||
      sessionStorage.getItem("erp_user");

    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const initials = (name = "") => {
  const value = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return value || "RT";
};

const navClass = ({ isActive }) =>
  [
    "group",
    "relative",
    "flex",
    "min-h-11",
    "items-center",
    "gap-3",
    "rounded-xl",
    "px-3",
    "text-sm",
    "transition-all",
    "duration-200",
    "focus-visible:outline-2",
    "focus-visible:outline-offset-2",
    "focus-visible:outline-cyan-400",
    isActive
      ? "border border-cyan-400/20 bg-cyan-400/[0.1] font-medium text-cyan-200 shadow-[inset_0_0_20px_rgba(34,211,238,0.03)]"
      : "border border-transparent text-gray-400 hover:border-white/10 hover:bg-white/[0.05] hover:text-gray-100",
  ].join(" ");

const AppLayout = () => {
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] =
    useState(false);

  const user = readUser();

  const handleLogout = () => {
    clearSession();
    setDrawerOpen(false);
    navigate("/login", {
      replace: true,
    });
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
  };

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
          title="Close navigation"
          className="ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-gray-400 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-gray-100 lg:hidden"
        >
          <X size={16} />
        </button>
      </div>

      {/* Navigation */}
      <nav
        aria-label="Main navigation"
        className="flex-1 overflow-y-auto p-3"
      >
        <div className="mb-3 flex items-center justify-between px-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-600">
            Core ERP
          </p>

          <span className="rounded-md border border-white/[0.06] bg-white/[0.025] px-1.5 py-0.5 text-[8px] font-medium uppercase tracking-wider text-gray-600">
            Suite
          </span>
        </div>

        <ul className="space-y-1">
          {NAV_ITEMS.map(
            ({
              to,
              label,
              icon: Icon,
              end,
            }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  onClick={closeDrawer}
                  className={navClass}
                >
                  {({ isActive }) => (
                    <>
                      {/* Active indicator */}
                      <span
                        aria-hidden="true"
                        className={`absolute left-0 h-5 w-0.5 rounded-r-full bg-cyan-400 transition-opacity duration-200 ${
                          isActive
                            ? "opacity-100"
                            : "opacity-0"
                        }`}
                      />

                      {/* Icon */}
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all ${
                          isActive
                            ? "bg-cyan-400/[0.08] text-cyan-300"
                            : "text-gray-500 group-hover:bg-white/[0.04] group-hover:text-gray-200"
                        }`}
                      >
                        <Icon
                          size={17}
                          strokeWidth={1.8}
                        />
                      </span>

                      {/* Label */}
                      <span className="min-w-0 flex-1 truncate">
                        {label}
                      </span>

                      {/* Active dot */}
                      {isActive && (
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.7)]" />
                      )}
                    </>
                  )}
                </NavLink>
              </li>
            )
          )}
        </ul>
      </nav>

      {/* User Profile */}
      <div className="border-t border-white/[0.07] p-3">
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-cyan-400/10 bg-gradient-to-br from-cyan-400/[0.12] to-blue-500/[0.08] text-[11px] font-semibold text-cyan-200">
              {initials(user?.name)}

              <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border-2 border-[#070a11] bg-emerald-400" />
            </div>

            {/* User details */}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-gray-200">
                {user?.name ||
                  "Signed in"}
              </p>

              <p className="truncate text-[11px] text-gray-600">
                {user?.email || "—"}
              </p>
            </div>

            {/* Logout */}
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Log out"
              title="Log out"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-red-400/10 bg-red-400/[0.05] text-red-300 transition hover:border-red-400/25 hover:bg-red-400/[0.12] hover:text-red-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-[#05070b] text-white">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-[10%] -top-[15%] h-[500px] w-[500px] rounded-full bg-cyan-500/[0.06] blur-[150px]" />

        <div className="absolute -right-[10%] top-[10%] h-[450px] w-[450px] rounded-full bg-blue-500/[0.05] blur-[150px]" />

        <div className="absolute bottom-[-15%] left-[35%] h-[450px] w-[450px] rounded-full bg-violet-500/[0.05] blur-[160px]" />
      </div>

      {/* Grid background */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize:
            "48px 48px",
        }}
      />

      {/* Desktop Sidebar */}
      <aside className="relative z-40 hidden h-full w-64 shrink-0 lg:block xl:w-72">
        {sidebar}
      </aside>

      {/* Mobile Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Overlay */}
          <button
            type="button"
            aria-label="Close navigation"
            onClick={closeDrawer}
            className="absolute inset-0 h-full w-full cursor-default bg-black/70 backdrop-blur-sm"
          />

          {/* Drawer */}
          <div className="absolute left-0 top-0 h-full w-72 max-w-[85vw] shadow-2xl shadow-black/60">
            {sidebar}
          </div>
        </div>
      )}

      {/* Content Column */}
      <div className="relative flex h-full min-w-0 flex-1 flex-col overflow-hidden">
        {/* Mobile Top Bar */}
        <header className="z-30 flex shrink-0 items-center gap-3 border-b border-white/[0.07] bg-[#05070b]/90 px-3 py-3 backdrop-blur-xl sm:px-5 lg:hidden">
          <button
            type="button"
            onClick={() =>
              setDrawerOpen(true)
            }
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

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">
                Ready Tech ERP
              </p>

              <p className="truncate text-[9px] uppercase tracking-[0.16em] text-gray-600">
                ERP Suite
              </p>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="relative min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;