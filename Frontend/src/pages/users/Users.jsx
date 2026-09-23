import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Search,
  Plus,
  RefreshCw,
  Pencil,
  Trash2,
  RotateCcw,
  X,
  Eye,
  EyeOff,
  ShieldCheck,
  Users as UsersIcon,
  UserCheck,
  UserX,
  KeyRound,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react';

import { getToken } from '../../services/api';

const API_URL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, '') ||
  'https://ready-tech-erp.onrender.com/api';

const apiRequest = async (endpoint, options = {}) => {
  const token = getToken();

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  let data = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(
      data?.message || `Request failed with status ${response.status}`
    );
  }

  return data;
};

const EMPTY_FORM = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  phone: '',
  role: '',
  department: '',
  designation: '',
  status: 'active',
};

const EMPTY_PASSWORD_FORM = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

const getInitials = (name = '') =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'U';

const normalizeArray = (response) => {
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response)) return response;
  return [];
};

const normalizeUsers = (response) => normalizeArray(response);

const getRoleName = (user) => {
  if (!user?.role) return 'No role';

  if (typeof user.role === 'string') {
    return user.role;
  }

  return (
    user.role.name ||
    user.role.title ||
    user.role.code ||
    'Assigned'
  );
};

const getRoleId = (role) => {
  if (!role) return '';

  if (typeof role === 'string') {
    return role;
  }

  return String(role._id || role.id || '');
};

const getDepartmentId = (department) => {
  if (!department) return '';

  if (typeof department === 'string') {
    return department;
  }

  return String(department._id || department.id || '');
};

const getDepartmentName = (department) => {
  if (!department) return '';

  if (typeof department === 'string') {
    return department;
  }

  return department.name || '';
};

const getDesignationName = (designation) => {
  if (!designation) return '';

  if (typeof designation === 'string') {
    return designation;
  }

  return designation.name || '';
};

const Users = () => {
  const [users, setUsers] = useState([]);

  const [roles, setRoles] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);

  const [optionsLoading, setOptionsLoading] = useState(true);
  const [designationLoading, setDesignationLoading] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');

  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  const [showForm, setShowForm] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const [editingUser, setEditingUser] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);

  const [form, setForm] = useState(EMPTY_FORM);

  const [passwordForm, setPasswordForm] = useState(
    EMPTY_PASSWORD_FORM
  );

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [showCurrentPassword, setShowCurrentPassword] =
    useState(false);

  const [showNewPassword, setShowNewPassword] =
    useState(false);

  const [showNewConfirmPassword, setShowNewConfirmPassword] =
    useState(false);

  const [confirmDelete, setConfirmDelete] = useState(null);

  /*
   * ---------------------------------------------------------
   * USERS
   * ---------------------------------------------------------
   */

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const params = new URLSearchParams();

      if (search.trim()) {
        params.set('search', search.trim());
      }

      if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }

      if (roleFilter !== 'all') {
        params.set('role', roleFilter);
      }

      params.set('page', String(page));
      params.set('limit', String(limit));

      const response = await apiRequest(
        `/users?${params.toString()}`
      );

      setUsers(normalizeUsers(response));
    } catch (err) {
      setError(err.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, [
    search,
    statusFilter,
    roleFilter,
    page,
    limit,
  ]);

  /*
   * ---------------------------------------------------------
   * MASTER DATA
   * ---------------------------------------------------------
   */

  const loadMasterData = useCallback(async () => {
    try {
      setOptionsLoading(true);
      setError('');

      const [rolesResponse, departmentsResponse] =
        await Promise.all([
          apiRequest('/roles?status=active&limit=100'),
          apiRequest('/departments?status=active&limit=100'),
        ]);

      setRoles(normalizeArray(rolesResponse));
      setDepartments(normalizeArray(departmentsResponse));
    } catch (err) {
      setRoles([]);
      setDepartments([]);

      setError(
        err.message || 'Failed to load roles and departments'
      );
    } finally {
      setOptionsLoading(false);
    }
  }, []);

  /*
   * ---------------------------------------------------------
   * DESIGNATIONS
   * ---------------------------------------------------------
   */

  const loadDesignations = useCallback(
    async (departmentId) => {
      if (!departmentId) {
        setDesignations([]);
        return;
      }

      try {
        setDesignationLoading(true);

        const response = await apiRequest(
          `/designations?status=active&departmentId=${encodeURIComponent(
            departmentId
          )}&limit=100`
        );

        setDesignations(normalizeArray(response));
      } catch (err) {
        setDesignations([]);

        setError(
          err.message || 'Failed to load designations'
        );
      } finally {
        setDesignationLoading(false);
      }
    },
    []
  );

  /*
   * ---------------------------------------------------------
   * INITIAL LOAD
   * ---------------------------------------------------------
   */

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    loadMasterData();
  }, [loadMasterData]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess('');
      }, 3500);

      return () => clearTimeout(timer);
    }
  }, [success]);

  /*
   * ---------------------------------------------------------
   * STATS
   * ---------------------------------------------------------
   */

  const stats = useMemo(() => {
    const total = users.length;

    const active = users.filter(
      (user) => user.status === 'active'
    ).length;

    const inactive = users.filter(
      (user) => user.status === 'inactive'
    ).length;

    const admins = users.filter((user) => {
      const role = getRoleName(user).toLowerCase();

      return (
        role.includes('admin') ||
        role.includes('super')
      );
    }).length;

    return {
      total,
      active,
      inactive,
      admins,
    };
  }, [users]);

  /*
   * ---------------------------------------------------------
   * FORM
   * ---------------------------------------------------------
   */

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingUser(null);

    setDesignations([]);

    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const openCreate = () => {
    resetForm();

    setError('');
    setShowForm(true);
  };

  const openEdit = async (user) => {
    const roleId = getRoleId(user.role);

    const departmentName =
      getDepartmentName(user.department);

    const designationName =
      getDesignationName(user.designation);

    setEditingUser(user);

    setForm({
      name: user.name || '',
      email: user.email || '',
      password: '',
      confirmPassword: '',
      phone: user.phone || '',
      role: roleId,
      department: departmentName,
      designation: designationName,
      status: user.status || 'active',
    });

    setError('');
    setShowForm(true);

    /*
     * Find the current department ID from master data.
     * Then load department-specific designations.
     */
    const department = departments.find(
      (item) =>
        String(item.name).trim().toLowerCase() ===
        String(departmentName).trim().toLowerCase()
    );

    if (department?._id) {
      await loadDesignations(department._id);
    } else {
      setDesignations([]);
    }
  };

  const closeForm = () => {
    if (saving) return;

    setShowForm(false);
    resetForm();
  };

  const updateForm = (field, value) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  /*
   * Department select stores department NAME
   * because User.department is currently String.
   *
   * But API needs department ID to fetch designations.
   */
  const updateDepartment = async (value) => {
    setForm((previous) => ({
      ...previous,
      department: value,
      designation: '',
    }));

    setDesignations([]);

    if (!value) return;

    const selectedDepartment = departments.find(
      (department) =>
        String(department._id) === String(value)
    );

    if (!selectedDepartment?._id) return;

    await loadDesignations(selectedDepartment._id);
  };

  /*
   * Department select uses ID internally through the
   * handler, but form keeps department NAME.
   */
  const selectedDepartment = useMemo(() => {
    if (!form.department) return null;

    return (
      departments.find(
        (department) =>
          String(department.name).trim().toLowerCase() ===
          String(form.department).trim().toLowerCase()
      ) || null
    );
  }, [departments, form.department]);

  /*
   * ---------------------------------------------------------
   * SUBMIT USER
   * ---------------------------------------------------------
   */

  const submitUser = async (event) => {
    event.preventDefault();

    setError('');

    if (!form.name.trim()) {
      setError('Name is required');
      return;
    }

    if (!form.email.trim()) {
      setError('Email is required');
      return;
    }

    if (!editingUser && !form.password) {
      setError('Password is required for a new user');
      return;
    }

    if (
      form.password &&
      form.password.length < 6
    ) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (
      form.password &&
      form.password !== form.confirmPassword
    ) {
      setError('Passwords do not match');
      return;
    }

    try {
      setSaving(true);

      const payload = {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim() || undefined,

        /*
         * Backend User model field is "role".
         * Backend controller can accept roleId.
         */
        roleId: form.role || undefined,

        /*
         * User model currently stores these as strings.
         */
        department:
          form.department.trim() || undefined,

        designation:
          form.designation.trim() || undefined,

        status: form.status,
      };

      if (form.password) {
        payload.password = form.password;
      }

      if (editingUser) {
        await apiRequest(
          `/users/${editingUser._id}`,
          {
            method: 'PUT',
            body: JSON.stringify(payload),
          }
        );

        setSuccess('User updated successfully');
      } else {
        await apiRequest('/users', {
          method: 'POST',
          body: JSON.stringify(payload),
        });

        setSuccess('User created successfully');
      }

      closeForm();

      await loadUsers();
    } catch (err) {
      setError(
        err.message || 'Unable to save user'
      );
    } finally {
      setSaving(false);
    }
  };

  /*
   * ---------------------------------------------------------
   * CHANGE PASSWORD
   * ---------------------------------------------------------
   */

  const openPasswordChange = () => {
    setPasswordForm(EMPTY_PASSWORD_FORM);

    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowNewConfirmPassword(false);

    setError('');
    setShowPasswordModal(true);
  };

  const closePasswordModal = () => {
    if (saving) return;

    setShowPasswordModal(false);

    setPasswordForm(EMPTY_PASSWORD_FORM);

    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowNewConfirmPassword(false);
  };

  const changePassword = async (event) => {
    event.preventDefault();

    setError('');

    if (!passwordForm.currentPassword) {
      setError('Current password is required');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setError(
        'New password must be at least 6 characters'
      );
      return;
    }

    if (
      passwordForm.newPassword !==
      passwordForm.confirmPassword
    ) {
      setError('New passwords do not match');
      return;
    }

    if (
      passwordForm.currentPassword ===
      passwordForm.newPassword
    ) {
      setError(
        'New password must be different from current password'
      );
      return;
    }

    try {
      setSaving(true);

      await apiRequest('/users/me/password', {
        method: 'PATCH',
        body: JSON.stringify(passwordForm),
      });

      setSuccess('Password changed successfully');

      closePasswordModal();
    } catch (err) {
      setError(
        err.message || 'Unable to change password'
      );
    } finally {
      setSaving(false);
    }
  };

  /*
   * ---------------------------------------------------------
   * DELETE / RESTORE
   * ---------------------------------------------------------
   */

  const deleteUser = async () => {
    if (!confirmDelete) return;

    try {
      setSaving(true);
      setError('');

      await apiRequest(
        `/users/${confirmDelete._id}`,
        {
          method: 'DELETE',
        }
      );

      setSuccess('User deactivated successfully');

      setConfirmDelete(null);

      await loadUsers();
    } catch (err) {
      setError(
        err.message || 'Unable to deactivate user'
      );
    } finally {
      setSaving(false);
    }
  };

  const restoreUser = async (user) => {
    try {
      setSaving(true);
      setError('');

      await apiRequest(
        `/users/${user._id}/restore`,
        {
          method: 'PATCH',
        }
      );

      setSuccess('User restored successfully');

      await loadUsers();
    } catch (err) {
      setError(
        err.message || 'Unable to restore user'
      );
    } finally {
      setSaving(false);
    }
  };

  /*
   * ---------------------------------------------------------
   * VIEW
   * ---------------------------------------------------------
   */

  const viewUser = (user) => {
    setSelectedUser(user);
    setShowDetails(true);
  };

  /*
   * ---------------------------------------------------------
   * FILTERS
   * ---------------------------------------------------------
   */

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setRoleFilter('all');
    setPage(1);
  };

  /*
   * ---------------------------------------------------------
   * RENDER
   * ---------------------------------------------------------
   */

  return (
    <div className="min-h-full w-full bg-slate-950 text-slate-100">
      <div className="w-full px-4 py-5 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
              <UsersIcon className="h-4 w-4" />
              Administration
            </div>

            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Users
            </h1>

            <p className="mt-1 text-sm text-slate-400">
              Manage workspace users, roles, departments,
              designations and account access.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={openPasswordChange}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-slate-600 hover:bg-slate-800"
            >
              <KeyRound className="h-4 w-4" />
              Change Password
            </button>

            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
            >
              <Plus className="h-4 w-4" />
              Add User
            </button>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            <span>{error}</span>

            <button
              type="button"
              onClick={() => setError('')}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            {success}
          </div>
        )}

        {/* Stats */}
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={<UsersIcon />}
            label="Total Users"
            value={stats.total}
          />

          <StatCard
            icon={<UserCheck />}
            label="Active"
            value={stats.active}
          />

          <StatCard
            icon={<UserX />}
            label="Inactive"
            value={stats.inactive}
          />

          <StatCard
            icon={<ShieldCheck />}
            label="Administrators"
            value={stats.admins}
          />
        </div>

        {/* Filters */}
        <div className="mb-5 rounded-2xl border border-slate-800 bg-slate-900/70 p-3 shadow-xl shadow-black/10">
          <div className="flex flex-col gap-3 lg:flex-row">

            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />

              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search name, email, phone, department..."
                className="h-11 w-full rounded-xl border border-slate-800 bg-slate-950 pl-10 pr-4 text-sm outline-none transition placeholder:text-slate-600 focus:border-slate-600"
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <select
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value);
                  setPage(1);
                }}
                className="h-11 rounded-xl border border-slate-800 bg-slate-950 px-3 text-sm text-slate-300 outline-none"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>

              <select
                value={roleFilter}
                onChange={(event) => {
                  setRoleFilter(event.target.value);
                  setPage(1);
                }}
                className="h-11 rounded-xl border border-slate-800 bg-slate-950 px-3 text-sm text-slate-300 outline-none"
              >
                <option value="all">All Roles</option>

                {roles.map((role) => (
                  <option
                    key={role._id}
                    value={role._id}
                  >
                    {role.name}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-950 px-4 text-sm text-slate-300 hover:bg-slate-800"
              >
                <Filter className="h-4 w-4" />
                Reset
              </button>

              <button
                type="button"
                onClick={loadUsers}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-800 bg-slate-950 px-3 text-slate-300 hover:bg-slate-800"
                title="Refresh"
              >
                <RefreshCw
                  className={`h-4 w-4 ${
                    loading ? 'animate-spin' : ''
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 shadow-2xl shadow-black/10">
          <div className="overflow-x-auto">
            <table className="min-w-[1050px] w-full">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-left">
                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    User
                  </th>

                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Role
                  </th>

                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Department
                  </th>

                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Designation
                  </th>

                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Status
                  </th>

                  <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <LoadingRows />
                ) : users.length === 0 ? (
                  <tr>
                    <td
                      colSpan="6"
                      className="px-5 py-16 text-center"
                    >
                      <UsersIcon className="mx-auto mb-3 h-8 w-8 text-slate-700" />

                      <p className="text-sm font-medium text-slate-400">
                        No users found
                      </p>

                      <p className="mt-1 text-xs text-slate-600">
                        Try changing your filters or create
                        a new user.
                      </p>
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr
                      key={user._id}
                      className="border-b border-slate-800/70 transition hover:bg-slate-800/30"
                    >
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => viewUser(user)}
                          className="flex items-center gap-3 text-left"
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-xs font-bold text-slate-300">
                            {getInitials(user.name)}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-100">
                              {user.name}
                            </p>

                            <p className="truncate text-xs text-slate-500">
                              {user.email}
                            </p>
                          </div>
                        </button>
                      </td>

                      <td className="px-5 py-4">
                        <span className="rounded-lg border border-slate-700 bg-slate-800/60 px-2.5 py-1 text-xs font-medium text-slate-300">
                          {getRoleName(user)}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-400">
                        {getDepartmentName(user.department) || '—'}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-400">
                        {getDesignationName(user.designation) || '—'}
                      </td>

                      <td className="px-5 py-4">
                        <StatusBadge status={user.status} />
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-1">
                          <ActionButton
                            title="View"
                            onClick={() => viewUser(user)}
                          >
                            <Eye className="h-4 w-4" />
                          </ActionButton>

                          <ActionButton
                            title="Edit"
                            onClick={() => openEdit(user)}
                          >
                            <Pencil className="h-4 w-4" />
                          </ActionButton>

                          {user.status === 'inactive' ? (
                            <ActionButton
                              title="Restore"
                              onClick={() =>
                                restoreUser(user)
                              }
                            >
                              <RotateCcw className="h-4 w-4" />
                            </ActionButton>
                          ) : (
                            <ActionButton
                              danger
                              title="Deactivate"
                              onClick={() =>
                                setConfirmDelete(user)
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </ActionButton>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col gap-3 border-t border-slate-800 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">
              Showing {users.length} users
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() =>
                  setPage((current) =>
                    Math.max(current - 1, 1)
                  )
                }
                className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-800 px-3 text-sm text-slate-400 disabled:cursor-not-allowed disabled:opacity-30 hover:bg-slate-800"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <span className="px-2 text-xs text-slate-500">
                Page {page}
              </span>

              <button
                type="button"
                disabled={users.length < limit}
                onClick={() =>
                  setPage((current) => current + 1)
                }
                className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-800 px-3 text-sm text-slate-400 disabled:cursor-not-allowed disabled:opacity-30 hover:bg-slate-800"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================
          CREATE / EDIT USER
      ===================================================== */}

      {showForm && (
        <Modal
          title={editingUser ? 'Edit User' : 'Create User'}
          subtitle={
            editingUser
              ? 'Update user account and organization details.'
              : 'Create a new user inside the current workspace.'
          }
          onClose={closeForm}
        >
          <form
            onSubmit={submitUser}
            className="space-y-5"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

              <Input
                label="Full Name"
                required
                value={form.name}
                onChange={(value) =>
                  updateForm('name', value)
                }
                placeholder="Enter full name"
              />

              <Input
                label="Email"
                required
                type="email"
                value={form.email}
                onChange={(value) =>
                  updateForm('email', value)
                }
                placeholder="user@company.com"
              />

              <Input
                label="Phone"
                value={form.phone}
                onChange={(value) =>
                  updateForm('phone', value)
                }
                placeholder="+91..."
              />

              {/* Role */}
              <Select
                label="Role"
                value={form.role}
                disabled={optionsLoading}
                onChange={(value) =>
                  updateForm('role', value)
                }
              >
                <option value="">
                  {optionsLoading
                    ? 'Loading roles...'
                    : roles.length
                      ? 'Select role'
                      : 'No roles available'}
                </option>

                {form.role &&
                  !roles.some(
                    (item) =>
                      String(item._id) ===
                      String(form.role)
                  ) && (
                    <option value={form.role}>
                      {getRoleName(editingUser)}
                    </option>
                  )}

                {roles.map((role) => (
                  <option
                    key={role._id}
                    value={role._id}
                  >
                    {role.name}
                  </option>
                ))}
              </Select>

              {/* Department */}
              <Select
                label="Department"
                value={selectedDepartment?._id || ''}
                disabled={optionsLoading}
                onChange={updateDepartment}
              >
                <option value="">
                  {optionsLoading
                    ? 'Loading departments...'
                    : departments.length
                      ? 'Select department'
                      : 'No departments available'}
                </option>

                {form.department &&
                  !selectedDepartment && (
                    <option value={form.department}>
                      {form.department}
                    </option>
                  )}

                {departments.map((department) => (
                  <option
                    key={department._id}
                    value={department._id}
                  >
                    {department.name}
                  </option>
                ))}
              </Select>

              {/* Designation */}
              <Select
                label="Designation"
                value={
                  designations.some(
                    (item) =>
                      item.name === form.designation
                  )
                    ? form.designation
                    : ''
                }
                disabled={
                  !selectedDepartment ||
                  designationLoading
                }
                onChange={(value) =>
                  updateForm('designation', value)
                }
              >
                <option value="">
                  {designationLoading
                    ? 'Loading designations...'
                    : !selectedDepartment
                      ? 'Select department first'
                      : designations.length
                        ? 'Select designation'
                        : 'No designations available'}
                </option>

                {form.designation &&
                  !designations.some(
                    (item) =>
                      item.name === form.designation
                  ) && (
                    <option value={form.designation}>
                      {form.designation}
                    </option>
                  )}

                {designations.map((designation) => (
                  <option
                    key={designation._id}
                    value={designation.name}
                  >
                    {designation.name}
                  </option>
                ))}
              </Select>

              {/* Status */}
              <Select
                label="Status"
                value={form.status}
                onChange={(value) =>
                  updateForm('status', value)
                }
              >
                <option value="active">
                  Active
                </option>

                <option value="inactive">
                  Inactive
                </option>
              </Select>

              {/* Create password only */}
              {!editingUser && (
                <>
                  <PasswordInput
                    label="Password"
                    required
                    value={form.password}
                    visible={showPassword}
                    onToggle={() =>
                      setShowPassword(
                        (value) => !value
                      )
                    }
                    onChange={(value) =>
                      updateForm(
                        'password',
                        value
                      )
                    }
                  />

                  <PasswordInput
                    label="Confirm Password"
                    required
                    value={form.confirmPassword}
                    visible={showConfirmPassword}
                    onToggle={() =>
                      setShowConfirmPassword(
                        (value) => !value
                      )
                    }
                    onChange={(value) =>
                      updateForm(
                        'confirmPassword',
                        value
                      )
                    }
                  />
                </>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-800 pt-5">
              <button
                type="button"
                disabled={saving}
                onClick={closeForm}
                className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-50"
              >
                {saving
                  ? 'Saving...'
                  : editingUser
                    ? 'Update User'
                    : 'Create User'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* =====================================================
          PASSWORD MODAL
      ===================================================== */}

      {showPasswordModal && (
        <Modal
          title="Change Password"
          subtitle="Verify your current password before creating a new password."
          onClose={closePasswordModal}
        >
          <form
            onSubmit={changePassword}
            className="space-y-5"
          >
            <PasswordInput
              label="Current Password"
              required
              value={passwordForm.currentPassword}
              visible={showCurrentPassword}
              onToggle={() =>
                setShowCurrentPassword(
                  (value) => !value
                )
              }
              onChange={(value) =>
                setPasswordForm((previous) => ({
                  ...previous,
                  currentPassword: value,
                }))
              }
            />

            <PasswordInput
              label="New Password"
              required
              value={passwordForm.newPassword}
              visible={showNewPassword}
              onToggle={() =>
                setShowNewPassword(
                  (value) => !value
                )
              }
              onChange={(value) =>
                setPasswordForm((previous) => ({
                  ...previous,
                  newPassword: value,
                }))
              }
            />

            <PasswordInput
              label="Confirm New Password"
              required
              value={passwordForm.confirmPassword}
              visible={showNewConfirmPassword}
              onToggle={() =>
                setShowNewConfirmPassword(
                  (value) => !value
                )
              }
              onChange={(value) =>
                setPasswordForm((previous) => ({
                  ...previous,
                  confirmPassword: value,
                }))
              }
            />

            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs text-slate-500">
              Password must contain at least 6 characters.
              Your current password is required for security.
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-800 pt-5">
              <button
                type="button"
                disabled={saving}
                onClick={closePasswordModal}
                className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-50"
              >
                <KeyRound className="h-4 w-4" />

                {saving
                  ? 'Changing...'
                  : 'Change Password'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* =====================================================
          DETAILS MODAL
      ===================================================== */}

      {showDetails && selectedUser && (
        <Modal
          title="User Details"
          subtitle="Account and organization information"
          onClose={() => setShowDetails(false)}
        >
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800 text-lg font-bold">
                {getInitials(selectedUser.name)}
              </div>

              <div>
                <h3 className="text-lg font-semibold">
                  {selectedUser.name}
                </h3>

                <p className="text-sm text-slate-500">
                  {selectedUser.email}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Detail
                label="Role"
                value={getRoleName(selectedUser)}
              />

              <Detail
                label="Status"
                value={selectedUser.status}
              />

              <Detail
                label="Department"
                value={getDepartmentName(
                  selectedUser.department
                )}
              />

              <Detail
                label="Designation"
                value={getDesignationName(
                  selectedUser.designation
                )}
              />

              <Detail
                label="Phone"
                value={selectedUser.phone}
              />

              <Detail
                label="Created"
                value={
                  selectedUser.createdAt
                    ? new Date(
                        selectedUser.createdAt
                      ).toLocaleDateString()
                    : '—'
                }
              />
            </div>
          </div>
        </Modal>
      )}

      {/* =====================================================
          DELETE CONFIRMATION
      ===================================================== */}

      {confirmDelete && (
        <Modal
          title="Deactivate User"
          subtitle="This is a soft delete. The user account will remain in the database."
          onClose={() => {
            if (!saving) {
              setConfirmDelete(null);
            }
          }}
        >
          <div className="space-y-5">
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
              Are you sure you want to deactivate{' '}
              <strong>{confirmDelete.name}</strong>?
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() =>
                  setConfirmDelete(null)
                }
                className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={deleteUser}
                className="rounded-xl bg-red-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-400 disabled:opacity-50"
              >
                {saving
                  ? 'Deactivating...'
                  : 'Deactivate'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

/*
 * ============================================================
 * SMALL UI COMPONENTS
 * ============================================================
 */

const StatCard = ({
  icon,
  label,
  value,
}) => (
  <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
    <div className="mb-4 flex items-center justify-between">
      <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
        {label}
      </span>

      <div className="text-slate-500">
        {React.cloneElement(icon, {
          className: 'h-4 w-4',
        })}
      </div>
    </div>

    <p className="text-2xl font-semibold tracking-tight">
      {value}
    </p>
  </div>
);

const StatusBadge = ({ status }) => {
  const active = status === 'active';

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
        active
          ? 'bg-emerald-500/10 text-emerald-400'
          : 'bg-slate-700/50 text-slate-400'
      }`}
    >
      {active ? 'Active' : 'Inactive'}
    </span>
  );
};

const ActionButton = ({
  children,
  onClick,
  title,
  danger = false,
}) => (
  <button
    type="button"
    title={title}
    onClick={onClick}
    className={`inline-flex h-9 w-9 items-center justify-center rounded-lg transition ${
      danger
        ? 'text-slate-500 hover:bg-red-500/10 hover:text-red-400'
        : 'text-slate-500 hover:bg-slate-800 hover:text-slate-200'
    }`}
  >
    {children}
  </button>
);

const Input = ({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  required = false,
}) => (
  <label className="block">
    <span className="mb-2 block text-xs font-medium text-slate-400">
      {label}

      {required && (
        <span className="ml-1 text-red-400">*</span>
      )}
    </span>

    <input
      type={type}
      required={required}
      value={value}
      onChange={(event) =>
        onChange(event.target.value)
      }
      placeholder={placeholder}
      className="h-11 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-slate-600"
    />
  </label>
);

const Select = ({
  label,
  value,
  onChange,
  children,
  disabled = false,
}) => (
  <label className="block">
    <span className="mb-2 block text-xs font-medium text-slate-400">
      {label}
    </span>

    <select
      value={value}
      disabled={disabled}
      onChange={(event) =>
        onChange(event.target.value)
      }
      className="h-11 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 text-sm text-slate-100 outline-none focus:border-slate-600 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {children}
    </select>
  </label>
);

const PasswordInput = ({
  label,
  value,
  onChange,
  visible,
  onToggle,
  required = false,
}) => (
  <label className="block">
    <span className="mb-2 block text-xs font-medium text-slate-400">
      {label}

      {required && (
        <span className="ml-1 text-red-400">*</span>
      )}
    </span>

    <div className="relative">
      <input
        type={visible ? 'text' : 'password'}
        required={required}
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="h-11 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 pr-11 text-sm text-slate-100 outline-none focus:border-slate-600"
      />

      <button
        type="button"
        onClick={onToggle}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
      >
        {visible ? (
          <EyeOff className="h-4 w-4" />
        ) : (
          <Eye className="h-4 w-4" />
        )}
      </button>
    </div>
  </label>
);

const Detail = ({
  label,
  value,
}) => (
  <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
    <p className="mb-1 text-[11px] uppercase tracking-wider text-slate-600">
      {label}
    </p>

    <p className="text-sm text-slate-300">
      {value || '—'}
    </p>
  </div>
);

const LoadingRows = () => (
  <>
    {Array.from({ length: 6 }).map((_, index) => (
      <tr
        key={index}
        className="border-b border-slate-800/70"
      >
        {Array.from({ length: 6 }).map(
          (_, cell) => (
            <td
              key={cell}
              className="px-5 py-5"
            >
              <div className="h-4 animate-pulse rounded bg-slate-800" />
            </td>
          )
        )}
      </tr>
    ))}
  </>
);

const Modal = ({
  title,
  subtitle,
  children,
  onClose,
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
    <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
      <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-800 bg-slate-900 px-5 py-4">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-slate-100">
            {title}
          </h2>

          {subtitle && (
            <p className="mt-1 text-xs text-slate-500">
              {subtitle}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-lg p-2 text-slate-500 hover:bg-slate-800 hover:text-slate-200"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="p-5">
        {children}
      </div>
    </div>
  </div>
);

export default Users;