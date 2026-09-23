import React, { useEffect, useMemo, useState } from "react";

const API_URL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") ||
  "https://ready-tech-erp.onrender.com/api";

const initialForm = {
  userId: "",
  employeeCode: "",
  branchId: "",
  joiningDate: "",
  employmentType: "full_time",
  gender: "",
  dateOfBirth: "",
  maritalStatus: "",
  address: "",
  city: "",
  state: "",
  country: "India",
  postalCode: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  emergencyContactRelation: "",
  status: "active",
  notes: "",
};

const employmentTypes = [
  { value: "full_time", label: "Full Time" },
  { value: "part_time", label: "Part Time" },
  { value: "contract", label: "Contract" },
  { value: "intern", label: "Intern" },
  { value: "temporary", label: "Temporary" },
];

const genderOptions = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

const maritalOptions = [
  { value: "single", label: "Single" },
  { value: "married", label: "Married" },
  { value: "divorced", label: "Divorced" },
  { value: "widowed", label: "Widowed" },
  { value: "other", label: "Other" },
];

function getToken() {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    sessionStorage.getItem("token") ||
    sessionStorage.getItem("accessToken") ||
    ""
  );
}

function getUserId(user) {
  return user?._id || user?.id || "";
}

function getBranchId(branch) {
  return branch?._id || branch?.id || "";
}

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getUserName(employee) {
  return (
    employee?.userId?.name ||
    employee?.user?.name ||
    employee?.name ||
    "-"
  );
}

function getUserEmail(employee) {
  return (
    employee?.userId?.email ||
    employee?.user?.email ||
    employee?.email ||
    "-"
  );
}

function getUserPhone(employee) {
  return (
    employee?.userId?.phone ||
    employee?.user?.phone ||
    employee?.phone ||
    "-"
  );
}

function getRoleName(employee) {
  return (
    employee?.userId?.role?.name ||
    employee?.user?.role?.name ||
    "-"
  );
}

function getDepartment(employee) {
  return (
    employee?.userId?.department ||
    employee?.user?.department ||
    "-"
  );
}

function getDesignation(employee) {
  return (
    employee?.userId?.designation ||
    employee?.user?.designation ||
    "-"
  );
}

function getBranchName(employee) {
  return (
    employee?.branchId?.name ||
    employee?.branch?.name ||
    "-"
  );
}

function normalizeListResponse(data, key) {
  if (Array.isArray(data)) return data;

  if (Array.isArray(data?.data)) return data.data;

  if (Array.isArray(data?.data?.[key])) return data.data[key];

  if (Array.isArray(data?.[key])) return data[key];

  if (Array.isArray(data?.results)) return data.results;

  return [];
}

export default function Employee() {
  const [employees, setEmployees] = useState([]);
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadingMasters, setLoadingMasters] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [branchFilter, setBranchFilter] = useState("");
  const [employmentFilter, setEmploymentFilter] = useState("");

  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);

  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);

  const [editingEmployee, setEditingEmployee] = useState(null);
  const [viewingEmployee, setViewingEmployee] = useState(null);

  const [form, setForm] = useState(initialForm);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const activeEmployees = useMemo(
    () => employees.filter((employee) => employee.status === "active"),
    [employees]
  );

  const inactiveEmployees = useMemo(
    () => employees.filter((employee) => employee.status === "inactive"),
    [employees]
  );

  const fetchJSON = async (url, options = {}) => {
    const token = getToken();

    const response = await fetch(`${API_URL}${url}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data?.message ||
          data?.error ||
          `Request failed with status ${response.status}`
      );
    }

    return data;
  };

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      params.set("page", page);
      params.set("limit", limit);

      if (search.trim()) {
        params.set("search", search.trim());
      }

      if (statusFilter) {
        params.set("status", statusFilter);
      }

      if (branchFilter) {
        params.set("branchId", branchFilter);
      }

      if (employmentFilter) {
        params.set("employmentType", employmentFilter);
      }

      const data = await fetchJSON(`/employees?${params.toString()}`);

      const list = normalizeListResponse(data, "employees");

      setEmployees(list);

      const responseTotal =
        data?.total ??
        data?.data?.total ??
        data?.pagination?.total ??
        data?.data?.pagination?.total ??
        list.length;

      setTotal(Number(responseTotal) || 0);
    } catch (err) {
      setError(err.message || "Unable to load employees.");
    } finally {
      setLoading(false);
    }
  };

  const fetchMasters = async () => {
    try {
      setLoadingMasters(true);

      const [usersResponse, branchesResponse] = await Promise.all([
        fetchJSON("/users?status=active&limit=100"),
        fetchJSON("/branches?status=active&limit=100"),
      ]);

      setUsers(normalizeListResponse(usersResponse, "users"));
      setBranches(normalizeListResponse(branchesResponse, "branches"));
    } catch (err) {
      setError(err.message || "Unable to load users or branches.");
    } finally {
      setLoadingMasters(false);
    }
  };

  useEffect(() => {
    fetchMasters();
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [
    page,
    statusFilter,
    branchFilter,
    employmentFilter,
  ]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (page === 1) {
        fetchEmployees();
      } else {
        setPage(1);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [search]);

  const openCreateModal = () => {
    setEditingEmployee(null);
    setForm(initialForm);
    setError("");
    setSuccess("");
    setShowModal(true);
  };

  const openEditModal = (employee) => {
    setEditingEmployee(employee);

    setForm({
      userId:
        employee?.userId?._id ||
        employee?.userId?.id ||
        employee?.userId ||
        "",
      employeeCode: employee?.employeeCode || "",
      branchId:
        employee?.branchId?._id ||
        employee?.branchId?.id ||
        employee?.branchId ||
        "",
      joiningDate: employee?.joiningDate
        ? new Date(employee.joiningDate).toISOString().split("T")[0]
        : "",
      employmentType: employee?.employmentType || "full_time",
      gender: employee?.gender || "",
      dateOfBirth: employee?.dateOfBirth
        ? new Date(employee.dateOfBirth).toISOString().split("T")[0]
        : "",
      maritalStatus: employee?.maritalStatus || "",
      address: employee?.address || "",
      city: employee?.city || "",
      state: employee?.state || "",
      country: employee?.country || "India",
      postalCode: employee?.postalCode || "",
      emergencyContactName: employee?.emergencyContactName || "",
      emergencyContactPhone: employee?.emergencyContactPhone || "",
      emergencyContactRelation: employee?.emergencyContactRelation || "",
      status: employee?.status || "active",
      notes: employee?.notes || "",
    });

    setError("");
    setSuccess("");
    setShowModal(true);
  };

  const openViewModal = async (employee) => {
    try {
      setError("");

      const employeeId = employee?._id || employee?.id;

      if (!employeeId) {
        setViewingEmployee(employee);
        setShowViewModal(true);
        return;
      }

      const data = await fetchJSON(`/employees/${employeeId}`);

      const detailed =
        data?.employee ||
        data?.data?.employee ||
        data?.data ||
        data;

      setViewingEmployee(detailed);
      setShowViewModal(true);
    } catch (err) {
      setError(err.message || "Unable to load employee details.");
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const validateForm = () => {
    if (!editingEmployee && !form.userId) {
      return "Please select a user.";
    }

    if (!form.employeeCode.trim()) {
      return "Employee code is required.";
    }

    if (!form.branchId) {
      return "Please select a branch.";
    }

    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const payload = {
        employeeCode: form.employeeCode.trim(),
        branchId: form.branchId,
        joiningDate: form.joiningDate || undefined,
        employmentType: form.employmentType,
        gender: form.gender || undefined,
        dateOfBirth: form.dateOfBirth || undefined,
        maritalStatus: form.maritalStatus || undefined,
        address: form.address.trim() || undefined,
        city: form.city.trim() || undefined,
        state: form.state.trim() || undefined,
        country: form.country.trim() || "India",
        postalCode: form.postalCode.trim() || undefined,
        emergencyContactName:
          form.emergencyContactName.trim() || undefined,
        emergencyContactPhone:
          form.emergencyContactPhone.trim() || undefined,
        emergencyContactRelation:
          form.emergencyContactRelation.trim() || undefined,
        status: form.status,
        notes: form.notes.trim() || undefined,
      };

      if (!editingEmployee) {
        payload.userId = form.userId;
      }

      if (editingEmployee) {
        const employeeId =
          editingEmployee?._id || editingEmployee?.id;

        await fetchJSON(`/employees/${employeeId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });

        setSuccess("Employee updated successfully.");
      } else {
        await fetchJSON("/employees", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        setSuccess("Employee created successfully.");
      }

      setShowModal(false);
      setForm(initialForm);
      setEditingEmployee(null);

      await fetchEmployees();
    } catch (err) {
      setError(err.message || "Unable to save employee.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      setActionLoading(true);
      setError("");
      setSuccess("");

      const employeeId =
        deleteTarget?._id || deleteTarget?.id;

      await fetchJSON(`/employees/${employeeId}`, {
        method: "DELETE",
      });

      setSuccess("Employee deactivated successfully.");
      setDeleteTarget(null);

      await fetchEmployees();
    } catch (err) {
      setError(err.message || "Unable to deactivate employee.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestore = async (employee) => {
    try {
      setActionLoading(true);
      setError("");
      setSuccess("");

      const employeeId =
        employee?._id || employee?.id;

      await fetchJSON(`/employees/${employeeId}/restore`, {
        method: "PATCH",
      });

      setSuccess("Employee restored successfully.");

      await fetchEmployees();
    } catch (err) {
      setError(err.message || "Unable to restore employee.");
    } finally {
      setActionLoading(false);
    }
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("active");
    setBranchFilter("");
    setEmploymentFilter("");
    setPage(1);
  };

  const getEmploymentLabel = (value) => {
    return (
      employmentTypes.find((item) => item.value === value)?.label ||
      value ||
      "-"
    );
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-white">
      <div className="mx-auto w-full max-w-[1800px] px-3 py-4 sm:px-5 lg:px-7">
        {/* Header */}
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
                HR Management
              </span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Employees
            </h1>

            <p className="mt-1 text-sm text-slate-400">
              Manage employee profiles, branches and employment details.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 sm:w-auto"
          >
            <span className="text-lg leading-none">+</span>
            Add Employee
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-4 flex items-start justify-between gap-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            <span>{error}</span>

            <button
              type="button"
              onClick={() => setError("")}
              className="text-red-300 hover:text-white"
            >
              ×
            </button>
          </div>
        )}

        {success && (
          <div className="mb-4 flex items-start justify-between gap-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            <span>{success}</span>

            <button
              type="button"
              onClick={() => setSuccess("")}
              className="text-emerald-300 hover:text-white"
            >
              ×
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <p className="text-xs uppercase tracking-wider text-slate-500">
              Current Page
            </p>

            <p className="mt-2 text-2xl font-bold">
              {employees.length}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Employees loaded
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-500/10 bg-emerald-500/[0.04] p-4">
            <p className="text-xs uppercase tracking-wider text-slate-500">
              Active
            </p>

            <p className="mt-2 text-2xl font-bold text-emerald-400">
              {activeEmployees.length}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Active on current page
            </p>
          </div>

          <div className="rounded-2xl border border-amber-500/10 bg-amber-500/[0.04] p-4">
            <p className="text-xs uppercase tracking-wider text-slate-500">
              Inactive
            </p>

            <p className="mt-2 text-2xl font-bold text-amber-400">
              {inactiveEmployees.length}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Inactive on current page
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-5 rounded-2xl border border-white/10 bg-white/[0.035] p-3 sm:p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
            {/* Search */}
            <div className="xl:col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-slate-400">
                Search
              </label>

              <div className="relative">
                <input
                  type="text"
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Search employee code, name or email..."
                  className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-4 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-500/50"
                />

                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">
                Status
              </label>

              <select
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500/50"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            {/* Branch */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">
                Branch
              </label>

              <select
                value={branchFilter}
                onChange={(event) => {
                  setBranchFilter(event.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500/50"
              >
                <option value="">All Branches</option>

                {branches.map((branch) => {
                  const id = getBranchId(branch);

                  return (
                    <option key={id} value={id}>
                      {branch.name}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Employment */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">
                Employment
              </label>

              <select
                value={employmentFilter}
                onChange={(event) => {
                  setEmploymentFilter(event.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500/50"
              >
                <option value="">All Types</option>

                {employmentTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">
              {total} employee{total === 1 ? "" : "s"} found
            </p>

            <button
              type="button"
              onClick={clearFilters}
              className="rounded-lg px-3 py-2 text-xs font-medium text-slate-400 transition hover:bg-white/5 hover:text-white"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px]">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.025]">
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Employee
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Code
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Department
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Designation
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Branch
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Employment
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Status
                  </th>

                  <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/[0.06]">
                {loading ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-5 py-16 text-center"
                    >
                      <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-slate-700 border-t-emerald-400" />

                      <p className="mt-3 text-sm text-slate-500">
                        Loading employees...
                      </p>
                    </td>
                  </tr>
                ) : employees.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-5 py-16 text-center"
                    >
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-xl">
                        👤
                      </div>

                      <p className="mt-3 text-sm font-medium text-slate-300">
                        No employees found
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Try changing your filters or create a new employee.
                      </p>
                    </td>
                  </tr>
                ) : (
                  employees.map((employee) => {
                    const employeeId =
                      employee?._id || employee?.id;

                    const name = getUserName(employee);

                    return (
                      <tr
                        key={employeeId}
                        className="transition hover:bg-white/[0.025]"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-sm font-bold text-emerald-400">
                              {name
                                .charAt(0)
                                .toUpperCase()}
                            </div>

                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-white">
                                {name}
                              </p>

                              <p className="mt-0.5 truncate text-xs text-slate-500">
                                {getUserEmail(employee)}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <span className="rounded-lg bg-white/5 px-2.5 py-1 text-xs font-semibold text-slate-300">
                            {employee.employeeCode || "-"}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-300">
                          {getDepartment(employee)}
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-300">
                          {getDesignation(employee)}
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-300">
                          {getBranchName(employee)}
                        </td>

                        <td className="px-5 py-4">
                          <span className="text-sm text-slate-300">
                            {getEmploymentLabel(
                              employee.employmentType
                            )}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          {employee.status === "active" ? (
                            <span className="inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-400">
                              Inactive
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                openViewModal(employee)
                              }
                              className="rounded-lg px-2.5 py-2 text-xs font-medium text-slate-400 transition hover:bg-white/10 hover:text-white"
                            >
                              View
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                openEditModal(employee)
                              }
                              className="rounded-lg px-2.5 py-2 text-xs font-medium text-blue-400 transition hover:bg-blue-500/10 hover:text-blue-300"
                            >
                              Edit
                            </button>

                            {employee.status === "active" ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setDeleteTarget(employee)
                                }
                                className="rounded-lg px-2.5 py-2 text-xs font-medium text-red-400 transition hover:bg-red-500/10 hover:text-red-300"
                              >
                                Deactivate
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={actionLoading}
                                onClick={() =>
                                  handleRestore(employee)
                                }
                                className="rounded-lg px-2.5 py-2 text-xs font-medium text-emerald-400 transition hover:bg-emerald-500/10 hover:text-emerald-300 disabled:opacity-50"
                              >
                                Restore
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col gap-3 border-t border-white/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">
              Page {page} of {totalPages}
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() =>
                  setPage((previous) => Math.max(1, previous - 1))
                }
                className="rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-slate-400 transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
              >
                Previous
              </button>

              <span className="rounded-lg bg-white/5 px-3 py-2 text-xs font-medium text-slate-300">
                {page}
              </span>

              <button
                type="button"
                disabled={
                  page >= totalPages || loading
                }
                onClick={() =>
                  setPage((previous) =>
                    Math.min(totalPages, previous + 1)
                  )
                }
                className="rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-slate-400 transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 p-3 backdrop-blur-sm sm:p-6">
          <div className="mx-auto my-3 w-full max-w-5xl overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-2xl sm:my-8">
            {/* Modal Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-slate-950/95 px-4 py-4 backdrop-blur sm:px-6">
              <div>
                <h2 className="text-lg font-bold text-white sm:text-xl">
                  {editingEmployee
                    ? "Edit Employee"
                    : "Add Employee"}
                </h2>

                <p className="mt-0.5 text-xs text-slate-500">
                  {editingEmployee
                    ? "Update employee profile information."
                    : "Create a new employee profile."}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-xl p-2 text-xl text-slate-500 transition hover:bg-white/5 hover:text-white"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="max-h-[calc(100vh-160px)] overflow-y-auto px-4 py-5 sm:px-6">
                {/* Basic */}
                <div className="mb-6">
                  <h3 className="mb-3 text-sm font-semibold text-white">
                    Basic Information
                  </h3>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {!editingEmployee && (
                      <Field label="User *">
                        <select
                          name="userId"
                          value={form.userId}
                          onChange={handleChange}
                          disabled={loadingMasters}
                          className={inputClass}
                        >
                          <option value="">
                            {loadingMasters
                              ? "Loading users..."
                              : "Select User"}
                          </option>

                          {users.map((user) => {
                            const id = getUserId(user);

                            return (
                              <option key={id} value={id}>
                                {user.name} — {user.email}
                              </option>
                            );
                          })}
                        </select>
                      </Field>
                    )}

                    <Field label="Employee Code *">
                      <input
                        type="text"
                        name="employeeCode"
                        value={form.employeeCode}
                        onChange={handleChange}
                        placeholder="EMP001"
                        className={inputClass}
                      />
                    </Field>

                    <Field label="Branch *">
                      <select
                        name="branchId"
                        value={form.branchId}
                        onChange={handleChange}
                        disabled={loadingMasters}
                        className={inputClass}
                      >
                        <option value="">
                          {loadingMasters
                            ? "Loading branches..."
                            : "Select Branch"}
                        </option>

                        {branches.map((branch) => {
                          const id = getBranchId(branch);

                          return (
                            <option key={id} value={id}>
                              {branch.name}
                            </option>
                          );
                        })}
                      </select>
                    </Field>

                    <Field label="Joining Date">
                      <input
                        type="date"
                        name="joiningDate"
                        value={form.joiningDate}
                        onChange={handleChange}
                        className={inputClass}
                      />
                    </Field>

                    <Field label="Employment Type">
                      <select
                        name="employmentType"
                        value={form.employmentType}
                        onChange={handleChange}
                        className={inputClass}
                      >
                        {employmentTypes.map((type) => (
                          <option
                            key={type.value}
                            value={type.value}
                          >
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field label="Status">
                      <select
                        name="status"
                        value={form.status}
                        onChange={handleChange}
                        className={inputClass}
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </Field>
                  </div>
                </div>

                {/* Personal */}
                <div className="mb-6">
                  <h3 className="mb-3 text-sm font-semibold text-white">
                    Personal Information
                  </h3>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <Field label="Gender">
                      <select
                        name="gender"
                        value={form.gender}
                        onChange={handleChange}
                        className={inputClass}
                      >
                        <option value="">Select Gender</option>

                        {genderOptions.map((option) => (
                          <option
                            key={option.value}
                            value={option.value}
                          >
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field label="Date of Birth">
                      <input
                        type="date"
                        name="dateOfBirth"
                        value={form.dateOfBirth}
                        onChange={handleChange}
                        className={inputClass}
                      />
                    </Field>

                    <Field label="Marital Status">
                      <select
                        name="maritalStatus"
                        value={form.maritalStatus}
                        onChange={handleChange}
                        className={inputClass}
                      >
                        <option value="">
                          Select Marital Status
                        </option>

                        {maritalOptions.map((option) => (
                          <option
                            key={option.value}
                            value={option.value}
                          >
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                </div>

                {/* Contact */}
                <div className="mb-6">
                  <h3 className="mb-3 text-sm font-semibold text-white">
                    Address & Contact
                  </h3>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <div className="md:col-span-2 lg:col-span-3">
                      <Field label="Address">
                        <textarea
                          name="address"
                          value={form.address}
                          onChange={handleChange}
                          rows={3}
                          placeholder="Full address"
                          className={`${inputClass} resize-none`}
                        />
                      </Field>
                    </div>

                    <Field label="City">
                      <input
                        type="text"
                        name="city"
                        value={form.city}
                        onChange={handleChange}
                        placeholder="Coimbatore"
                        className={inputClass}
                      />
                    </Field>

                    <Field label="State">
                      <input
                        type="text"
                        name="state"
                        value={form.state}
                        onChange={handleChange}
                        placeholder="Tamil Nadu"
                        className={inputClass}
                      />
                    </Field>

                    <Field label="Country">
                      <input
                        type="text"
                        name="country"
                        value={form.country}
                        onChange={handleChange}
                        placeholder="India"
                        className={inputClass}
                      />
                    </Field>

                    <Field label="Postal Code">
                      <input
                        type="text"
                        name="postalCode"
                        value={form.postalCode}
                        onChange={handleChange}
                        placeholder="641001"
                        className={inputClass}
                      />
                    </Field>
                  </div>
                </div>

                {/* Emergency */}
                <div className="mb-6">
                  <h3 className="mb-3 text-sm font-semibold text-white">
                    Emergency Contact
                  </h3>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <Field label="Contact Name">
                      <input
                        type="text"
                        name="emergencyContactName"
                        value={form.emergencyContactName}
                        onChange={handleChange}
                        placeholder="Emergency contact"
                        className={inputClass}
                      />
                    </Field>

                    <Field label="Contact Phone">
                      <input
                        type="text"
                        name="emergencyContactPhone"
                        value={form.emergencyContactPhone}
                        onChange={handleChange}
                        placeholder="9876543210"
                        className={inputClass}
                      />
                    </Field>

                    <Field label="Relation">
                      <input
                        type="text"
                        name="emergencyContactRelation"
                        value={form.emergencyContactRelation}
                        onChange={handleChange}
                        placeholder="Brother"
                        className={inputClass}
                      />
                    </Field>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <Field label="Notes">
                    <textarea
                      name="notes"
                      value={form.notes}
                      onChange={handleChange}
                      rows={4}
                      placeholder="Additional employee notes..."
                      className={`${inputClass} resize-none`}
                    />
                  </Field>
                </div>
              </div>

              {/* Footer */}
              <div className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-white/10 bg-slate-950 px-4 py-4 sm:flex-row sm:justify-end sm:px-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl border border-white/10 px-5 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : editingEmployee
                      ? "Update Employee"
                      : "Create Employee"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && viewingEmployee && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 p-3 backdrop-blur-sm sm:p-6">
          <div className="mx-auto my-3 w-full max-w-3xl overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-2xl sm:my-10">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 sm:px-6">
              <div>
                <h2 className="text-lg font-bold text-white">
                  Employee Details
                </h2>

                <p className="text-xs text-slate-500">
                  Complete employee profile
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowViewModal(false)}
                className="rounded-xl p-2 text-xl text-slate-500 hover:bg-white/5 hover:text-white"
              >
                ×
              </button>
            </div>

            <div className="max-h-[calc(100vh-150px)] overflow-y-auto px-5 py-5 sm:px-6">
              <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:flex-row sm:items-center">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-xl font-bold text-emerald-400">
                  {getUserName(viewingEmployee)
                    .charAt(0)
                    .toUpperCase()}
                </div>

                <div className="min-w-0">
                  <h3 className="truncate text-xl font-bold text-white">
                    {getUserName(viewingEmployee)}
                  </h3>

                  <p className="mt-1 text-sm text-slate-400">
                    {getUserEmail(viewingEmployee)}
                  </p>

                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="rounded-lg bg-white/5 px-2.5 py-1 text-xs text-slate-300">
                      {viewingEmployee.employeeCode || "-"}
                    </span>

                    <span className="rounded-lg bg-white/5 px-2.5 py-1 text-xs text-slate-300">
                      {getEmploymentLabel(
                        viewingEmployee.employmentType
                      )}
                    </span>

                    <span
                      className={`rounded-lg px-2.5 py-1 text-xs ${
                        viewingEmployee.status === "active"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-amber-500/10 text-amber-400"
                      }`}
                    >
                      {viewingEmployee.status || "-"}
                    </span>
                  </div>
                </div>
              </div>

              <DetailSection title="Work Information">
                <DetailItem
                  label="Role"
                  value={getRoleName(viewingEmployee)}
                />

                <DetailItem
                  label="Department"
                  value={getDepartment(viewingEmployee)}
                />

                <DetailItem
                  label="Designation"
                  value={getDesignation(viewingEmployee)}
                />

                <DetailItem
                  label="Branch"
                  value={getBranchName(viewingEmployee)}
                />

                <DetailItem
                  label="Joining Date"
                  value={formatDate(
                    viewingEmployee.joiningDate
                  )}
                />
              </DetailSection>

              <DetailSection title="Personal Information">
                <DetailItem
                  label="Gender"
                  value={viewingEmployee.gender}
                />

                <DetailItem
                  label="Date of Birth"
                  value={formatDate(
                    viewingEmployee.dateOfBirth
                  )}
                />

                <DetailItem
                  label="Marital Status"
                  value={viewingEmployee.maritalStatus}
                />

                <DetailItem
                  label="Phone"
                  value={getUserPhone(viewingEmployee)}
                />
              </DetailSection>

              <DetailSection title="Address">
                <div className="md:col-span-2 lg:col-span-3">
                  <DetailItem
                    label="Address"
                    value={viewingEmployee.address}
                  />
                </div>

                <DetailItem
                  label="City"
                  value={viewingEmployee.city}
                />

                <DetailItem
                  label="State"
                  value={viewingEmployee.state}
                />

                <DetailItem
                  label="Country"
                  value={viewingEmployee.country}
                />

                <DetailItem
                  label="Postal Code"
                  value={viewingEmployee.postalCode}
                />
              </DetailSection>

              <DetailSection title="Emergency Contact">
                <DetailItem
                  label="Name"
                  value={viewingEmployee.emergencyContactName}
                />

                <DetailItem
                  label="Phone"
                  value={viewingEmployee.emergencyContactPhone}
                />

                <DetailItem
                  label="Relation"
                  value={viewingEmployee.emergencyContactRelation}
                />
              </DetailSection>

              {viewingEmployee.notes && (
                <DetailSection title="Notes">
                  <div className="md:col-span-2 lg:col-span-3">
                    <p className="rounded-xl border border-white/10 bg-white/[0.025] p-3 text-sm leading-6 text-slate-300">
                      {viewingEmployee.notes}
                    </p>
                  </div>
                </DetailSection>
              )}

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowViewModal(false)}
                  className="rounded-xl border border-white/10 px-5 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-950 p-5 shadow-2xl sm:p-6">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/10 text-red-400">
              !
            </div>

            <h2 className="text-lg font-bold text-white">
              Deactivate Employee?
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              This will mark{" "}
              <span className="font-semibold text-white">
                {getUserName(deleteTarget)}
              </span>{" "}
              as inactive. The employee record will not be permanently
              deleted.
            </p>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={actionLoading}
                className="rounded-xl border border-white/10 px-5 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/5"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDelete}
                disabled={actionLoading}
                className="rounded-xl bg-red-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-400 disabled:opacity-50"
              >
                {actionLoading
                  ? "Processing..."
                  : "Deactivate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-white/10 bg-slate-900 px-3.5 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50";

function Field({ label, children }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-slate-400">
        {label}
      </label>
      {children}
    </div>
  );
}

function DetailSection({ title, children }) {
  return (
    <div className="mb-6">
      <h3 className="mb-3 text-sm font-semibold text-white">
        {title}
      </h3>

      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:grid-cols-2 lg:grid-cols-3">
        {children}
      </div>
    </div>
  );
}

function DetailItem({ label, value }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-slate-600">
        {label}
      </p>

      <p className="mt-1 break-words text-sm text-slate-300">
        {value || "-"}
      </p>
    </div>
  );
}