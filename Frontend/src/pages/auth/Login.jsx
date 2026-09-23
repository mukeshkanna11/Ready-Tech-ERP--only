import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Eye,
  EyeOff,
  Globe2,
  LayoutDashboard,
  Lock,
  Mail,
  Package,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";

import api, { setSession } from "../../services/api";
import logo from "../../assets/Logo.jpg";
import "./Login.css";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const Login = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: "",
    }));

    setApiError("");
  };

  const validate = () => {
    const next = {};

    if (!form.email.trim()) {
      next.email = "Work email is required";
    } else if (!EMAIL_RE.test(form.email.trim())) {
      next.email = "Enter a valid work email address";
    }

    if (!form.password) {
      next.password = "Password is required";
    } else if (form.password.length < 6) {
      next.password = "Password must be at least 6 characters";
    }

    setErrors(next);

    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading || !validate()) return;

    setLoading(true);
    setApiError("");

    try {
      const { data } = await api.post("/auth/login", {
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });

      setSession(
        {
          token: data?.data?.token,
          user: data?.data?.user,
        },
        remember
      );

      navigate("/dashboard", {
        replace: true,
      });
    } catch (err) {
      setApiError(
        err?.response?.data?.message ||
          (err?.code === "ERR_NETWORK"
            ? "Unable to reach the server. Please try again."
            : "Login failed. Please check your credentials and try again.")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#020406] text-white">
      <div className="relative min-h-screen w-full overflow-hidden">
        {/* ========================================================= */}
        {/* AMBIENT BACKGROUND */}
        {/* ========================================================= */}

        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-[15%] -top-[20%] h-[55vw] w-[55vw] min-h-[450px] min-w-[450px] rounded-full bg-cyan-500/[0.07] blur-[150px]" />

          <div className="absolute -right-[15%] top-[5%] h-[55vw] w-[55vw] min-h-[450px] min-w-[450px] rounded-full bg-blue-600/[0.07] blur-[170px]" />

          <div className="absolute bottom-[-25%] left-[30%] h-[45vw] w-[45vw] min-h-[400px] min-w-[400px] rounded-full bg-violet-600/[0.05] blur-[170px]" />
        </div>

        {/* ========================================================= */}
        {/* SUBTLE GRID */}
        {/* ========================================================= */}

        <div
          className="pointer-events-none absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.45) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.45) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        {/* ========================================================= */}
        {/* MAIN FULL WIDTH CONTAINER */}
        {/* ========================================================= */}

        <div className="relative flex min-h-screen w-full flex-col lg:flex-row">
          {/* ======================================================= */}
          {/* LEFT BRAND PANEL */}
          {/* ======================================================= */}

          <section
            className="
              relative hidden min-h-screen
              w-full flex-col justify-between
              border-r border-white/[0.06]
              px-8 py-8
              lg:flex lg:w-1/2
              xl:px-12
              2xl:px-20
            "
          >
            {/* Decorative line */}
            <div className="pointer-events-none absolute right-0 top-1/2 h-32 w-px -translate-y-1/2 bg-gradient-to-b from-transparent via-cyan-400/30 to-transparent" />

            {/* Logo */}
            <div className="flex items-center gap-4">
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-white p-1 shadow-2xl shadow-black/50">
                <img
                  src={logo}
                  alt="Ready Tech Solutions"
                  className="h-14 w-14 rounded-xl object-cover"
                />
              </div>

              <div>
                <p className="text-sm font-semibold tracking-wide text-white">
                  Ready Tech Solutions
                </p>

                <div className="mt-1 flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />

                  <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500">
                    Enterprise ERP Platform
                  </p>
                </div>
              </div>
            </div>

            {/* Hero */}
            <div className="my-auto w-full max-w-3xl py-16">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/[0.07] px-3.5 py-2 text-xs font-medium text-cyan-300">
                <Sparkles size={14} />
                Intelligent Business Management
              </div>

              <h1
                className="
                  text-4xl font-semibold leading-[1.05]
                  tracking-[-0.04em]
                  sm:text-5xl
                  xl:text-6xl
                  2xl:text-7xl
                "
              >
                Run your entire business
                <span className="block bg-gradient-to-r from-cyan-300 via-sky-400 to-blue-500 bg-clip-text text-transparent">
                  from one platform.
                </span>
              </h1>

              <p className="mt-6 max-w-2xl text-sm leading-7 text-gray-500 sm:text-base">
                A powerful workspace designed to connect your sales, finance,
                inventory, customers, purchases and operations in one seamless
                ERP ecosystem.
              </p>

              {/* Feature Cards */}
              <div className="mt-10 grid w-full max-w-3xl grid-cols-1 gap-3 sm:grid-cols-2">
                <FeatureCard
                  icon={<LayoutDashboard size={17} />}
                  title="Unified Dashboard"
                  description="See your entire business at a glance."
                />

                <FeatureCard
                  icon={<BarChart3 size={17} />}
                  title="Business Intelligence"
                  description="Turn business data into useful insights."
                />

                <FeatureCard
                  icon={<Package size={17} />}
                  title="Inventory & Operations"
                  description="Keep products, purchases and stock connected."
                />

                <FeatureCard
                  icon={<Users size={17} />}
                  title="Customer Management"
                  description="Build stronger customer relationships."
                />
              </div>

              {/* Trust */}
              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-gray-600">
                <TrustItem
                  icon={<CheckCircle2 size={14} />}
                  text="Secure workspace"
                  color="text-emerald-400"
                />

                <TrustItem
                  icon={<ShieldCheck size={14} />}
                  text="Role-based access"
                  color="text-cyan-400"
                />

                <TrustItem
                  icon={<Globe2 size={14} />}
                  text="Multi-location ready"
                  color="text-blue-400"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-white/[0.06] pt-6">
              <p className="text-[11px] text-gray-700">
                © {new Date().getFullYear()} Ready Tech Solutions
              </p>

              <p className="text-[11px] text-gray-700">
                Coimbatore · Bangalore
              </p>
            </div>
          </section>

          {/* ======================================================= */}
          {/* RIGHT LOGIN AREA */}
          {/* ======================================================= */}

          <main
            className="
              flex min-h-screen w-full
              items-center justify-center
              px-4 py-6
              sm:px-8 sm:py-10
              lg:w-1/2
              lg:px-10
              xl:px-16
              2xl:px-24
            "
          >
            <div className="w-full max-w-[560px]">
              {/* Mobile / Tablet Logo */}
              <div className="mb-7 flex items-center justify-center gap-3 lg:hidden">
                <div className="overflow-hidden rounded-xl border border-white/10 bg-white p-1 shadow-xl">
                  <img
                    src={logo}
                    alt="Ready Tech Solutions"
                    className="h-10 w-10 rounded-lg object-cover sm:h-11 sm:w-11"
                  />
                </div>

                <div>
                  <p className="text-sm font-semibold">
                    Ready Tech Solutions
                  </p>

                  <p className="mt-0.5 text-[9px] uppercase tracking-[0.18em] text-gray-600">
                    Enterprise ERP
                  </p>
                </div>
              </div>

              {/* Login Card */}
              <div
                className="
                  rounded-[24px]
                  border border-white/10
                  bg-white/[0.045]
                  p-5
                  shadow-2xl shadow-black/40
                  backdrop-blur-2xl
                  sm:rounded-[28px]
                  sm:p-8
                  xl:p-10
                "
              >
                {/* Status */}
                <div className="mb-7 flex items-center justify-between">
                  <div className="flex items-center gap-2 rounded-full border border-emerald-400/10 bg-emerald-400/[0.05] px-3 py-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_7px_rgba(52,211,153,0.8)]" />

                    <span className="text-[10px] font-medium uppercase tracking-wider text-emerald-300">
                      System Online
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[10px] text-gray-600">
                    <Lock size={12} />
                    Secure Access
                  </div>
                </div>

                {/* Heading */}
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-cyan-400/70">
                    ERP Workspace
                  </p>

                  <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                    Welcome back
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-gray-500">
                    Sign in to continue to your Ready Tech ERP workspace.
                  </p>
                </div>

                {/* Error */}
                {apiError && (
                  <div
                    className="mt-6 flex items-start gap-2.5 rounded-xl border border-red-400/15 bg-red-400/[0.06] p-3.5 text-sm text-red-300"
                    role="alert"
                  >
                    <AlertCircle
                      size={17}
                      className="mt-0.5 shrink-0"
                    />

                    <span>{apiError}</span>
                  </div>
                )}

                {/* Form */}
                <form
                  onSubmit={handleSubmit}
                  noValidate
                  className="mt-7 space-y-5"
                >
                  {/* Email */}
                  <div>
                    <label
                      htmlFor="email"
                      className="mb-2 block text-xs font-medium text-gray-400"
                    >
                      Work email
                    </label>

                    <div className="group relative">
                      <Mail
                        size={17}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 transition group-focus-within:text-cyan-400"
                      />

                      <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        placeholder="you@company.com"
                        value={form.email}
                        onChange={handleChange}
                        disabled={loading}
                        aria-invalid={Boolean(errors.email)}
                        className={`h-12 w-full rounded-xl border bg-black/20 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-gray-700 ${
                          errors.email
                            ? "border-red-400/40 focus:border-red-400/60"
                            : "border-white/10 focus:border-cyan-400/40 focus:bg-black/30"
                        }`}
                      />
                    </div>

                    {errors.email && (
                      <p className="mt-1.5 text-xs text-red-400">
                        {errors.email}
                      </p>
                    )}
                  </div>

                  {/* Password */}
                  <div>
                    <label
                      htmlFor="password"
                      className="mb-2 block text-xs font-medium text-gray-400"
                    >
                      Password
                    </label>

                    <div className="group relative">
                      <Lock
                        size={17}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 transition group-focus-within:text-cyan-400"
                      />

                      <input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        placeholder="Enter your password"
                        value={form.password}
                        onChange={handleChange}
                        disabled={loading}
                        aria-invalid={Boolean(errors.password)}
                        className={`h-12 w-full rounded-xl border bg-black/20 pl-11 pr-12 text-sm text-white outline-none transition placeholder:text-gray-700 ${
                          errors.password
                            ? "border-red-400/40 focus:border-red-400/60"
                            : "border-white/10 focus:border-cyan-400/40 focus:bg-black/30"
                        }`}
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShowPassword((current) => !current)
                        }
                        disabled={loading}
                        aria-label={
                          showPassword
                            ? "Hide password"
                            : "Show password"
                        }
                        className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-gray-600 transition hover:bg-white/[0.05] hover:text-gray-300"
                      >
                        {showPassword ? (
                          <EyeOff size={17} />
                        ) : (
                          <Eye size={17} />
                        )}
                      </button>
                    </div>

                    {errors.password && (
                      <p className="mt-1.5 text-xs text-red-400">
                        {errors.password}
                      </p>
                    )}
                  </div>

                  {/* Options */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <label className="flex cursor-pointer items-center gap-2.5 text-xs text-gray-500">
                      <input
                        type="checkbox"
                        checked={remember}
                        onChange={(e) =>
                          setRemember(e.target.checked)
                        }
                        disabled={loading}
                        className="h-4 w-4 rounded border-white/20 bg-transparent accent-cyan-500"
                      />

                      Remember me
                    </label>

                    <a
                      href="/forgot-password"
                      className="text-xs font-medium text-cyan-400 transition hover:text-cyan-300"
                    >
                      Forgot password?
                    </a>
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="
                      group relative flex h-12 w-full
                      items-center justify-center gap-2
                      overflow-hidden rounded-xl
                      bg-gradient-to-r from-cyan-500 to-blue-600
                      text-sm font-semibold text-white
                      shadow-lg shadow-cyan-500/10
                      transition duration-300
                      hover:from-cyan-400 hover:to-blue-500
                      hover:shadow-cyan-500/20
                      disabled:cursor-not-allowed
                      disabled:opacity-60
                    "
                  >
                    <span className="absolute inset-0 bg-white/10 opacity-0 transition group-hover:opacity-100" />

                    {loading ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        <span>Signing in...</span>
                      </>
                    ) : (
                      <>
                        <span>Sign in to workspace</span>

                        <ArrowRight
                          size={17}
                          className="transition-transform duration-300 group-hover:translate-x-1"
                        />
                      </>
                    )}
                  </button>
                </form>

                {/* Security */}
                <div className="mt-6 flex items-center justify-center gap-2 text-[10px] text-gray-700">
                  <ShieldCheck size={13} />
                  Protected enterprise access
                </div>
              </div>

              {/* Stats */}
              <div className="mt-4 grid grid-cols-3 gap-2 sm:mt-5 sm:gap-3">
                <StatCard
                  icon={<Zap size={13} />}
                  label="Fast"
                  color="text-cyan-300"
                  bg="bg-cyan-400/[0.07]"
                />

                <StatCard
                  icon={<ShieldCheck size={13} />}
                  label="Secure"
                  color="text-emerald-300"
                  bg="bg-emerald-400/[0.07]"
                />

                <StatCard
                  icon={<BarChart3 size={13} />}
                  label="Powerful"
                  color="text-blue-300"
                  bg="bg-blue-400/[0.07]"
                />
              </div>

              {/* Mobile Footer */}
              <p className="mt-6 text-center text-[10px] text-gray-700 lg:hidden">
                © {new Date().getFullYear()} Ready Tech Solutions · Enterprise
                Resource Planning
              </p>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

/* ============================================================= */
/* FEATURE CARD */
/* ============================================================= */

const FeatureCard = ({ icon, title, description }) => {
  return (
    <div
      className="
        group rounded-2xl
        border border-white/10
        bg-white/[0.035]
        p-4
        backdrop-blur-xl
        transition-all duration-300
        hover:border-cyan-400/20
        hover:bg-white/[0.055]
        hover:-translate-y-0.5
      "
    >
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-400/10 bg-cyan-400/[0.08] text-cyan-300">
        {icon}
      </div>

      <p className="text-sm font-medium text-gray-200">
        {title}
      </p>

      <p className="mt-1 text-xs leading-5 text-gray-600">
        {description}
      </p>
    </div>
  );
};

/* ============================================================= */
/* TRUST ITEM */
/* ============================================================= */

const TrustItem = ({ icon, text, color }) => {
  return (
    <div className="flex items-center gap-2">
      <span className={color}>{icon}</span>
      {text}
    </div>
  );
};

/* ============================================================= */
/* STAT CARD */
/* ============================================================= */

const StatCard = ({ icon, label, color, bg }) => {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3 text-center">
      <div
        className={`mx-auto mb-1.5 flex h-7 w-7 items-center justify-center rounded-lg ${bg} ${color}`}
      >
        {icon}
      </div>

      <p className="text-[10px] text-gray-600">
        {label}
      </p>
    </div>
  );
};

export default Login;