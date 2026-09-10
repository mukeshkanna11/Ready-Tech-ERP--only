import { useNavigate } from "react-router-dom";

function Dashboard() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#05070b] text-white">
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center shadow-2xl">
          <h1 className="text-3xl font-semibold">
            Ready Tech Solutions
          </h1>

          <p className="mt-3 text-gray-400">
            ERP Dashboard
          </p>

          <p className="mt-2 text-sm text-gray-500">
            Welcome to your ERP system.
          </p>

          <button
            onClick={handleLogout}
            className="mt-8 rounded-xl bg-white px-5 py-3 text-sm font-medium text-black transition hover:bg-gray-200"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;