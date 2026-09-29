import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Boxes,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Eye,
  Filter,
  History,
  Loader2,
  Package,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { getToken, clearSession } from '../../services/api';

const API_URL = (
  import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
).replace(/\/$/, '');

// Clear the stale session and send the user to login once (no retry loop).
const handleUnauthorized = () => {
  clearSession();
  if (window.location.pathname !== '/login') {
    window.location.replace('/login');
  }
};

const apiRequest = async (endpoint, options = {}) => {
  const token = getToken();

  if (!token) {
    handleUnauthorized();
    throw new Error('Authentication token is missing. Please login again.');
  }

  const headers = {
    Accept: 'application/json',
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type') || '';

  let data;

  if (contentType.includes('application/json')) {
    data = await response.json();
  } else {
    const text = await response.text();
    data = { message: text };
  }

  if (!response.ok) {
    if (response.status === 401) {
      handleUnauthorized();
      throw new Error(
        'Authentication token is missing or expired. Please login again.'
      );
    }

    throw new Error(
      data?.message ||
        data?.error ||
        `Request failed with status ${response.status}`
    );
  }

  return data;
};

const emptyForm = {
  productId: '',
  branchId: '',
  openingStock: '',
  reorderLevel: '',
  minimumStock: '',
  maximumStock: '',
  averageCost: '',
  lastPurchasePrice: '',
};

const emptyAdjustment = {
  inventoryId: '',
  quantity: '',
  direction: 'in',
  reason: '',
  notes: '',
  referenceType: 'manual_adjustment',
  referenceNumber: '',
  unitCost: '',
};

const getId = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value._id || '';
};

const getProductName = (inventory) => {
  if (!inventory?.productId) return 'Unknown Product';

  if (typeof inventory.productId === 'string') {
    return inventory.productId;
  }

  return (
    inventory.productId.displayName ||
    inventory.productId.name ||
    inventory.productId.sku ||
    'Unknown Product'
  );
};

const getProductSku = (inventory) => {
  if (!inventory?.productId || typeof inventory.productId === 'string') {
    return '—';
  }

  return inventory.productId.sku || inventory.productId.productCode || '—';
};

const getBranchName = (inventory) => {
  if (!inventory?.branchId) return 'Main Workspace';

  if (typeof inventory.branchId === 'string') {
    return inventory.branchId;
  }

  return (
    inventory.branchId.name ||
    inventory.branchId.branchName ||
    inventory.branchId.code ||
    'Branch'
  );
};

const formatCurrency = (value) => {
  const number = Number(value || 0);

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(number);
};

const formatDate = (value) => {
  if (!value) return '—';

  try {
    return new Date(value).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
};

const getStockStatus = (inventory) => {
  if (inventory.stockStatus) return inventory.stockStatus;

  const available = Number(inventory.available || 0);
  const reorder = Number(inventory.reorderLevel || 0);

  if (available <= 0) return 'out_of_stock';
  if (reorder > 0 && available <= reorder) return 'low_stock';

  return 'in_stock';
};

const stockStatusLabel = (status) => {
  const labels = {
    in_stock: 'In Stock',
    low_stock: 'Low Stock',
    out_of_stock: 'Out of Stock',
    over_stock: 'Over Stock',
  };

  return labels[status] || status || 'Unknown';
};

const stockStatusClass = (status) => {
  const classes = {
    in_stock:
      'border-emerald-500/20 bg-emerald-500/10 text-emerald-400',
    low_stock:
      'border-amber-500/20 bg-amber-500/10 text-amber-400',
    out_of_stock:
      'border-red-500/20 bg-red-500/10 text-red-400',
    over_stock:
      'border-blue-500/20 bg-blue-500/10 text-blue-400',
  };

  return classes[status] || 'border-white/10 bg-white/5 text-slate-300';
};

const normalizeInventoryResponse = (response) => {
  if (Array.isArray(response?.data)) {
    return {
      items: response.data,
      pagination: response.pagination || {},
    };
  }

  if (Array.isArray(response?.data?.items)) {
    return {
      items: response.data.items,
      pagination: response.data.pagination || response.pagination || {},
    };
  }

  if (Array.isArray(response?.items)) {
    return {
      items: response.items,
      pagination: response.pagination || {},
    };
  }

  return {
    items: [],
    pagination: {},
  };
};

const normalizeListResponse = (response) => {
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.items)) return response.data.items;
  if (Array.isArray(response?.items)) return response.items;
  return [];
};

const Modal = ({ children, onClose, title, subtitle, wide = false }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5">
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        className={`relative z-10 flex max-h-[92vh] w-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#101114] shadow-2xl ${
          wide ? 'max-w-5xl' : 'max-w-2xl'
        }`}
      >
        <div className="flex items-start justify-between border-b border-white/10 px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-lg font-semibold text-white">{title}</h2>
            {subtitle && (
              <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
            )}
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-white/5 hover:text-white"
          >
            <X size={19} />
          </button>
        </div>

        <div className="overflow-y-auto p-5 sm:p-6">{children}</div>
      </div>
    </div>
  );
};

const Input = ({
  label,
  value,
  onChange,
  type = 'text',
  placeholder = '',
  required = false,
  disabled = false,
}) => {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-slate-300">
        {label}
        {required && <span className="ml-1 text-red-400">*</span>}
      </span>

      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full rounded-xl border border-white/10 bg-[#17191d] px-3.5 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-50"
      />
    </label>
  );
};

const Select = ({ label, value, onChange, children }) => {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-slate-300">
        {label}
      </span>

      <select
        value={value}
        onChange={onChange}
        className="w-full rounded-xl border border-white/10 bg-[#17191d] px-3.5 py-2.5 text-sm text-white outline-none transition focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/10"
      >
        {children}
      </select>
    </label>
  );
};

const Button = ({
  children,
  onClick,
  variant = 'primary',
  disabled = false,
  type = 'button',
  className = '',
}) => {
  const variants = {
    primary:
      'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-600/10',
    secondary:
      'border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10',
    danger:
      'border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20',
    success:
      'bg-emerald-600 text-white hover:bg-emerald-500',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

const Inventory = () => {
  const [inventory, setInventory] = useState([]);
  const [products, setProducts] = useState([]);
  const [branches, setBranches] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [stockStatus, setStockStatus] = useState('');
  const [branchId, setBranchId] = useState('');

  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [pagination, setPagination] = useState({});

  const [modal, setModal] = useState(null);

  const [form, setForm] = useState(emptyForm);
  const [adjustment, setAdjustment] = useState(emptyAdjustment);
  const [selectedInventory, setSelectedInventory] = useState(null);
  const [movements, setMovements] = useState([]);

  const [productsLoading, setProductsLoading] = useState(false);
  const [branchesLoading, setBranchesLoading] = useState(false);

  const showSuccess = (message) => {
    setSuccess(message);
    setError('');

    window.setTimeout(() => {
      setSuccess('');
    }, 3500);
  };

  const showError = (message) => {
    setError(message);
    setSuccess('');

    window.setTimeout(() => {
      setError('');
    }, 5000);
  };

  const loadInventory = async () => {
    try {
      setLoading(true);
      setError('');

      const params = new URLSearchParams();

      params.set('page', String(page));
      params.set('limit', String(limit));

      if (search.trim()) params.set('search', search.trim());
      if (status) params.set('status', status);
      if (stockStatus) params.set('stockStatus', stockStatus);
      if (branchId) params.set('branchId', branchId);

      const response = await apiRequest(
        `/inventory?${params.toString()}`
      );

      const normalized = normalizeInventoryResponse(response);

      setInventory(normalized.items);
      setPagination(normalized.pagination || {});
    } catch (err) {
      showError(err.message || 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      setProductsLoading(true);

      const response = await apiRequest(
        '/products?status=active&limit=100'
      );

      setProducts(normalizeListResponse(response));
    } catch {
      // Product dropdown remains usable if API isn't available.
    } finally {
      setProductsLoading(false);
    }
  };

  const loadBranches = async () => {
    try {
      setBranchesLoading(true);

      const response = await apiRequest(
        '/branches?status=active&limit=100'
      );

      setBranches(normalizeListResponse(response));
    } catch {
      // Branch dropdown remains usable if API isn't available.
    } finally {
      setBranchesLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
  }, [page, status, stockStatus, branchId]);

  useEffect(() => {
    loadProducts();
    loadBranches();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (page === 1) {
        loadInventory();
      } else {
        setPage(1);
      }
    }, 400);

    return () => window.clearTimeout(timer);
  }, [search]);

  const statistics = useMemo(() => {
    const totalItems = inventory.length;

    const inStock = inventory.filter(
      (item) => getStockStatus(item) === 'in_stock'
    ).length;

    const lowStock = inventory.filter(
      (item) => getStockStatus(item) === 'low_stock'
    ).length;

    const outOfStock = inventory.filter(
      (item) => getStockStatus(item) === 'out_of_stock'
    ).length;

    const availableQty = inventory.reduce(
      (total, item) => total + Number(item.available || 0),
      0
    );

    return {
      totalItems,
      inStock,
      lowStock,
      outOfStock,
      availableQty,
    };
  }, [inventory]);

  const openCreate = () => {
    setForm(emptyForm);
    setSelectedInventory(null);
    setModal('create');
  };

  const openEdit = (item) => {
    setSelectedInventory(item);

    setForm({
      productId: getId(item.productId),
      branchId: getId(item.branchId),
      openingStock: '',
      reorderLevel: item.reorderLevel ?? '',
      minimumStock: item.minimumStock ?? '',
      maximumStock: item.maximumStock ?? '',
      averageCost: item.averageCost ?? '',
      lastPurchasePrice: item.lastPurchasePrice ?? '',
    });

    setModal('edit');
  };

  const openAdjustment = (item, direction) => {
    setSelectedInventory(item);

    setAdjustment({
      ...emptyAdjustment,
      inventoryId: item._id,
      direction,
      unitCost:
        item.averageCost ||
        item.lastPurchasePrice ||
        item.productId?.purchasePrice ||
        '',
    });

    setModal('adjust');
  };

  const openView = async (item) => {
    try {
      setActionLoading(true);
      setSelectedInventory(item);
      setMovements([]);

      const response = await apiRequest(`/inventory/${item._id}`);

      const data = response?.data || response;

      setSelectedInventory(data);
      setMovements(data?.movements || []);

      setModal('view');
    } catch (err) {
      showError(err.message || 'Failed to load inventory details');
    } finally {
      setActionLoading(false);
    }
  };

  const updateForm = (key, value) => {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const updateAdjustment = (key, value) => {
    setAdjustment((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const submitCreate = async (event) => {
    event.preventDefault();

    if (!form.productId) {
      showError('Please select a product.');
      return;
    }

    try {
      setSaving(true);

      const payload = {
        productId: form.productId,
        ...(form.branchId ? { branchId: form.branchId } : {}),
        ...(form.openingStock !== ''
          ? { openingStock: Number(form.openingStock) }
          : {}),
        ...(form.reorderLevel !== ''
          ? { reorderLevel: Number(form.reorderLevel) }
          : {}),
        ...(form.minimumStock !== ''
          ? { minimumStock: Number(form.minimumStock) }
          : {}),
        ...(form.maximumStock !== ''
          ? { maximumStock: Number(form.maximumStock) }
          : {}),
        ...(form.averageCost !== ''
          ? { averageCost: Number(form.averageCost) }
          : {}),
        ...(form.lastPurchasePrice !== ''
          ? { lastPurchasePrice: Number(form.lastPurchasePrice) }
          : {}),
      };

      await apiRequest('/inventory', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setModal(null);
      showSuccess('Inventory created successfully.');
      await loadInventory();
    } catch (err) {
      showError(err.message || 'Failed to create inventory');
    } finally {
      setSaving(false);
    }
  };

  const submitEdit = async (event) => {
    event.preventDefault();

    if (!selectedInventory?._id) return;

    try {
      setSaving(true);

      const payload = {
        reorderLevel: Number(form.reorderLevel || 0),
        minimumStock: Number(form.minimumStock || 0),
        maximumStock: Number(form.maximumStock || 0),
        averageCost: Number(form.averageCost || 0),
        lastPurchasePrice: Number(form.lastPurchasePrice || 0),
        status: selectedInventory.status || 'active',
      };

      await apiRequest(`/inventory/${selectedInventory._id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      setModal(null);
      showSuccess('Inventory settings updated.');
      await loadInventory();
    } catch (err) {
      showError(err.message || 'Failed to update inventory');
    } finally {
      setSaving(false);
    }
  };

  const submitAdjustment = async (event) => {
    event.preventDefault();

    if (!adjustment.inventoryId) {
      showError('Inventory is required.');
      return;
    }

    const quantity = Number(adjustment.quantity);

    if (!quantity || quantity <= 0) {
      showError('Enter a valid quantity greater than zero.');
      return;
    }

    if (
      adjustment.direction === 'out' &&
      quantity > Number(selectedInventory?.available || 0)
    ) {
      showError(
        `Maximum stock-out quantity is ${Number(
          selectedInventory?.available || 0
        )}.`
      );
      return;
    }

    try {
      setSaving(true);

      const payload = {
        inventoryId: adjustment.inventoryId,
        quantity,
        direction: adjustment.direction,
        reason:
          adjustment.reason ||
          (adjustment.direction === 'in'
            ? 'Manual stock increase'
            : 'Manual stock decrease'),
        notes: adjustment.notes || '',
        referenceType: adjustment.referenceType || 'manual_adjustment',
        referenceNumber: adjustment.referenceNumber || '',
        ...(adjustment.unitCost !== ''
          ? { unitCost: Number(adjustment.unitCost) }
          : {}),
      };

      await apiRequest('/inventory/adjust', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setModal(null);
      showSuccess(
        adjustment.direction === 'in'
          ? 'Stock increased successfully.'
          : 'Stock decreased successfully.'
      );

      await loadInventory();
    } catch (err) {
      showError(err.message || 'Failed to adjust stock');
    } finally {
      setSaving(false);
    }
  };

  const deleteInventory = async (item) => {
    const confirmed = window.confirm(
      `Delete inventory for "${getProductName(item)}"?\n\nInventory can only be deleted when On Hand and Reserved quantities are both 0.`
    );

    if (!confirmed) return;

    try {
      setActionLoading(true);

      await apiRequest(`/inventory/${item._id}`, {
        method: 'DELETE',
      });

      showSuccess('Inventory deleted successfully.');
      await loadInventory();
    } catch (err) {
      showError(err.message || 'Failed to delete inventory');
    } finally {
      setActionLoading(false);
    }
  };

  const restoreInventory = async (item) => {
    const confirmed = window.confirm(
      `Restore inventory for "${getProductName(item)}"?`
    );

    if (!confirmed) return;

    try {
      setActionLoading(true);

      await apiRequest(`/inventory/${item._id}/restore`, {
        method: 'PATCH',
      });

      showSuccess('Inventory restored successfully.');
      await loadInventory();
    } catch (err) {
      showError(err.message || 'Failed to restore inventory');
    } finally {
      setActionLoading(false);
    }
  };

  const totalPages =
    pagination?.totalPages ||
    pagination?.pages ||
    Math.ceil(
      Number(pagination?.total || pagination?.totalItems || 0) / limit
    ) ||
    1;

  const currentPage =
    pagination?.currentPage ||
    pagination?.page ||
    page;

  const hasNext =
    pagination?.hasNextPage !== undefined
      ? pagination.hasNextPage
      : page < totalPages;

  const hasPrevious =
    pagination?.hasPreviousPage !== undefined
      ? pagination.hasPreviousPage
      : page > 1;

  return (
    <div className="min-h-screen w-full bg-[#090a0c] text-white">
      <div className="mx-auto w-full max-w-[1800px] px-3 py-4 sm:px-5 lg:px-7 lg:py-6">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-medium text-blue-400">
              <Boxes size={15} />
              INVENTORY MANAGEMENT
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Inventory
            </h1>

            <p className="mt-1 max-w-2xl text-sm text-slate-400">
              Manage stock, inventory levels, adjustments and movement history
              from one workspace.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={loadInventory}
              disabled={loading}
            >
              <RefreshCw
                size={16}
                className={loading ? 'animate-spin' : ''}
              />
              Refresh
            </Button>

            <Button onClick={openCreate}>
              <Plus size={17} />
              Add Inventory
            </Button>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            {success}
          </div>
        )}

        {/* Statistics */}
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard
            icon={<Package size={20} />}
            label="Total Inventory"
            value={statistics.totalItems}
            detail="Current page"
          />

          <StatCard
            icon={<Boxes size={20} />}
            label="In Stock"
            value={statistics.inStock}
            detail="Healthy stock"
          />

          <StatCard
            icon={<AlertCircle size={20} />}
            label="Low Stock"
            value={statistics.lowStock}
            detail="Needs attention"
          />

          <StatCard
            icon={<Package size={20} />}
            label="Out of Stock"
            value={statistics.outOfStock}
            detail="No available stock"
          />

          <StatCard
            icon={<Boxes size={20} />}
            label="Available Qty"
            value={statistics.availableQty.toLocaleString('en-IN')}
            detail="Across current page"
          />
        </div>

        {/* Filters */}
        <div className="mb-5 rounded-2xl border border-white/10 bg-[#101114] p-3 sm:p-4">
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search
                size={17}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
              />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search product, SKU or inventory..."
                className="w-full rounded-xl border border-white/10 bg-[#17191d] py-2.5 pl-10 pr-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500/60"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:w-[570px]">
              <Select
                label=""
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>

              <Select
                label=""
                value={stockStatus}
                onChange={(event) => {
                  setStockStatus(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">All Stock</option>
                <option value="in_stock">In Stock</option>
                <option value="low_stock">Low Stock</option>
                <option value="out_of_stock">Out of Stock</option>
                <option value="over_stock">Over Stock</option>
              </Select>

              <Select
                label=""
                value={branchId}
                onChange={(event) => {
                  setBranchId(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">All Branches</option>

                {branches.map((branch) => (
                  <option key={branch._id} value={branch._id}>
                    {branch.name || branch.branchName || branch.code}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
            <Filter size={14} />
            Filters automatically update inventory results.
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#101114]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.025] text-left">
                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Product
                  </th>

                  <th className="px-4 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Branch
                  </th>

                  <th className="px-4 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                    On Hand
                  </th>

                  <th className="px-4 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Reserved
                  </th>

                  <th className="px-4 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Available
                  </th>

                  <th className="px-4 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Avg. Cost
                  </th>

                  <th className="px-4 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Stock Status
                  </th>

                  <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" className="px-5 py-20">
                      <div className="flex flex-col items-center justify-center text-slate-500">
                        <Loader2
                          size={28}
                          className="mb-3 animate-spin text-blue-500"
                        />
                        <p className="text-sm">Loading inventory...</p>
                      </div>
                    </td>
                  </tr>
                ) : inventory.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-5 py-20">
                      <div className="flex flex-col items-center justify-center text-center">
                        <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                          <Package
                            size={28}
                            className="text-slate-500"
                          />
                        </div>

                        <h3 className="text-sm font-semibold text-white">
                          No inventory found
                        </h3>

                        <p className="mt-1 max-w-sm text-xs text-slate-500">
                          Try changing your filters or create your first
                          inventory record.
                        </p>

                        <button
                          onClick={openCreate}
                          className="mt-4 text-sm font-medium text-blue-400 hover:text-blue-300"
                        >
                          + Add Inventory
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  inventory.map((item) => {
                    const stock = getStockStatus(item);

                    return (
                      <tr
                        key={item._id}
                        className="border-b border-white/[0.06] transition hover:bg-white/[0.025]"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                              <Package
                                size={18}
                                className="text-blue-400"
                              />
                            </div>

                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-white">
                                {getProductName(item)}
                              </p>

                              <p className="mt-0.5 text-xs text-slate-500">
                                {getProductSku(item)}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4 text-sm text-slate-300">
                          {getBranchName(item)}
                        </td>

                        <td className="px-4 py-4 text-right text-sm font-semibold text-white">
                          {Number(item.onHand || 0).toLocaleString('en-IN')}
                        </td>

                        <td className="px-4 py-4 text-right text-sm text-slate-400">
                          {Number(item.reserved || 0).toLocaleString('en-IN')}
                        </td>

                        <td className="px-4 py-4 text-right text-sm font-semibold text-blue-300">
                          {Number(item.available || 0).toLocaleString(
                            'en-IN'
                          )}
                        </td>

                        <td className="px-4 py-4 text-right text-sm text-slate-300">
                          {formatCurrency(item.averageCost)}
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium ${stockStatusClass(
                              stock
                            )}`}
                          >
                            {stockStatusLabel(stock)}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-1.5">
                            <IconButton
                              title="View"
                              onClick={() => openView(item)}
                            >
                              <Eye size={15} />
                            </IconButton>

                            <IconButton
                              title="Stock In"
                              onClick={() => openAdjustment(item, 'in')}
                            >
                              <ArrowUpFromLine size={15} />
                            </IconButton>

                            <IconButton
                              title="Stock Out"
                              onClick={() => openAdjustment(item, 'out')}
                            >
                              <ArrowDownToLine size={15} />
                            </IconButton>

                            <IconButton
                              title="Edit"
                              onClick={() => openEdit(item)}
                            >
                              <Edit3 size={15} />
                            </IconButton>

                            {Number(item.onHand || 0) === 0 &&
                            Number(item.reserved || 0) === 0 ? (
                              <IconButton
                                title="Delete"
                                danger
                                onClick={() => deleteInventory(item)}
                              >
                                <Trash2 size={15} />
                              </IconButton>
                            ) : (
                              <IconButton
                                title="Delete unavailable while stock exists"
                                disabled
                              >
                                <Trash2 size={15} />
                              </IconButton>
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
          <div className="flex flex-col gap-3 border-t border-white/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">
              Page {currentPage} of {Math.max(totalPages, 1)}
            </p>

            <div className="flex items-center gap-2">
              <button
                disabled={!hasPrevious || loading}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ChevronLeft size={16} />
              </button>

              <span className="min-w-9 text-center text-xs text-slate-400">
                {currentPage}
              </span>

              <button
                disabled={!hasNext || loading}
                onClick={() => setPage((value) => value + 1)}
                className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Create */}
      {modal === 'create' && (
        <Modal
          title="Create Inventory"
          subtitle="Create inventory for a product and optionally assign a branch."
          onClose={() => setModal(null)}
        >
          <form onSubmit={submitCreate} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Select
                  label="Product"
                  value={form.productId}
                  onChange={(event) =>
                    updateForm('productId', event.target.value)
                  }
                >
                  <option value="">
                    {productsLoading
                      ? 'Loading products...'
                      : 'Select product'}
                  </option>

                  {products.map((product) => (
                    <option key={product._id} value={product._id}>
                      {product.displayName ||
                        product.name ||
                        product.sku ||
                        product.productCode}
                    </option>
                  ))}
                </Select>
              </div>

              <Select
                label="Branch"
                value={form.branchId}
                onChange={(event) =>
                  updateForm('branchId', event.target.value)
                }
              >
                <option value="">Main Workspace</option>

                {branches.map((branch) => (
                  <option key={branch._id} value={branch._id}>
                    {branch.name || branch.branchName || branch.code}
                  </option>
                ))}
              </Select>

              <Input
                label="Opening Stock"
                type="number"
                min="0"
                value={form.openingStock}
                onChange={(event) =>
                  updateForm('openingStock', event.target.value)
                }
                placeholder="0"
              />

              <Input
                label="Reorder Level"
                type="number"
                min="0"
                value={form.reorderLevel}
                onChange={(event) =>
                  updateForm('reorderLevel', event.target.value)
                }
                placeholder="0"
              />

              <Input
                label="Minimum Stock"
                type="number"
                min="0"
                value={form.minimumStock}
                onChange={(event) =>
                  updateForm('minimumStock', event.target.value)
                }
                placeholder="0"
              />

              <Input
                label="Maximum Stock"
                type="number"
                min="0"
                value={form.maximumStock}
                onChange={(event) =>
                  updateForm('maximumStock', event.target.value)
                }
                placeholder="0"
              />

              <Input
                label="Average Cost"
                type="number"
                min="0"
                value={form.averageCost}
                onChange={(event) =>
                  updateForm('averageCost', event.target.value)
                }
                placeholder="0.00"
              />

              <Input
                label="Last Purchase Price"
                type="number"
                min="0"
                value={form.lastPurchasePrice}
                onChange={(event) =>
                  updateForm('lastPurchasePrice', event.target.value)
                }
                placeholder="0.00"
              />
            </div>

            <div className="flex justify-end gap-2 border-t border-white/10 pt-4">
              <Button
                variant="secondary"
                onClick={() => setModal(null)}
              >
                Cancel
              </Button>

              <Button type="submit" disabled={saving}>
                {saving && <Loader2 size={16} className="animate-spin" />}
                Create Inventory
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit */}
      {modal === 'edit' && selectedInventory && (
        <Modal
          title="Edit Inventory"
          subtitle={`Update settings for ${getProductName(
            selectedInventory
          )}.`}
          onClose={() => setModal(null)}
        >
          <form onSubmit={submitEdit} className="space-y-5">
            <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
              <div className="flex items-center gap-3">
                <Package size={20} className="text-blue-400" />

                <div>
                  <p className="text-sm font-medium text-white">
                    {getProductName(selectedInventory)}
                  </p>
                  <p className="text-xs text-slate-500">
                    Current stock:{' '}
                    {Number(
                      selectedInventory.available || 0
                    ).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Reorder Level"
                type="number"
                min="0"
                value={form.reorderLevel}
                onChange={(event) =>
                  updateForm('reorderLevel', event.target.value)
                }
              />

              <Input
                label="Minimum Stock"
                type="number"
                min="0"
                value={form.minimumStock}
                onChange={(event) =>
                  updateForm('minimumStock', event.target.value)
                }
              />

              <Input
                label="Maximum Stock"
                type="number"
                min="0"
                value={form.maximumStock}
                onChange={(event) =>
                  updateForm('maximumStock', event.target.value)
                }
              />

              <Input
                label="Average Cost"
                type="number"
                min="0"
                value={form.averageCost}
                onChange={(event) =>
                  updateForm('averageCost', event.target.value)
                }
              />

              <Input
                label="Last Purchase Price"
                type="number"
                min="0"
                value={form.lastPurchasePrice}
                onChange={(event) =>
                  updateForm('lastPurchasePrice', event.target.value)
                }
              />
            </div>

            <p className="text-xs text-slate-500">
              Physical stock quantities are changed through Stock In / Stock
              Out, not through this settings form.
            </p>

            <div className="flex justify-end gap-2 border-t border-white/10 pt-4">
              <Button
                variant="secondary"
                onClick={() => setModal(null)}
              >
                Cancel
              </Button>

              <Button type="submit" disabled={saving}>
                {saving && <Loader2 size={16} className="animate-spin" />}
                Save Changes
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Adjustment */}
      {modal === 'adjust' && selectedInventory && (
        <Modal
          title={
            adjustment.direction === 'in'
              ? 'Stock In'
              : 'Stock Out'
          }
          subtitle={`${getProductName(selectedInventory)} • Available: ${Number(
            selectedInventory.available || 0
          ).toLocaleString('en-IN')}`}
          onClose={() => setModal(null)}
        >
          <form onSubmit={submitAdjustment} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Quantity"
                type="number"
                min="0.01"
                step="0.01"
                value={adjustment.quantity}
                onChange={(event) =>
                  updateAdjustment('quantity', event.target.value)
                }
                placeholder="Enter quantity"
                required
              />

              <Select
                label="Direction"
                value={adjustment.direction}
                onChange={(event) =>
                  updateAdjustment('direction', event.target.value)
                }
              >
                <option value="in">Stock In</option>
                <option value="out">Stock Out</option>
              </Select>

              <Input
                label="Reason"
                value={adjustment.reason}
                onChange={(event) =>
                  updateAdjustment('reason', event.target.value)
                }
                placeholder="Reason for adjustment"
              />

              <Input
                label="Reference Number"
                value={adjustment.referenceNumber}
                onChange={(event) =>
                  updateAdjustment(
                    'referenceNumber',
                    event.target.value
                  )
                }
                placeholder="e.g. PO-001"
              />

              <Select
                label="Reference Type"
                value={adjustment.referenceType}
                onChange={(event) =>
                  updateAdjustment(
                    'referenceType',
                    event.target.value
                  )
                }
              >
                <option value="manual_adjustment">
                  Manual Adjustment
                </option>
                <option value="purchase">Purchase</option>
                <option value="purchase_return">
                  Purchase Return
                </option>
                <option value="sale">Sale</option>
                <option value="sales_return">Sales Return</option>
              </Select>

              <Input
                label="Unit Cost"
                type="number"
                min="0"
                step="0.01"
                value={adjustment.unitCost}
                onChange={(event) =>
                  updateAdjustment('unitCost', event.target.value)
                }
                placeholder="0.00"
              />

              <div className="sm:col-span-2">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-slate-300">
                    Notes
                  </span>

                  <textarea
                    value={adjustment.notes}
                    onChange={(event) =>
                      updateAdjustment('notes', event.target.value)
                    }
                    rows="3"
                    placeholder="Additional notes..."
                    className="w-full resize-none rounded-xl border border-white/10 bg-[#17191d] px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500/60"
                  />
                </label>
              </div>
            </div>

            {adjustment.direction === 'out' && (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-xs text-amber-300">
                Maximum stock-out quantity:{' '}
                <strong>
                  {Number(
                    selectedInventory.available || 0
                  ).toLocaleString('en-IN')}
                </strong>
              </div>
            )}

            <div className="flex justify-end gap-2 border-t border-white/10 pt-4">
              <Button
                variant="secondary"
                onClick={() => setModal(null)}
              >
                Cancel
              </Button>

              <Button
                type="submit"
                variant={
                  adjustment.direction === 'in'
                    ? 'success'
                    : 'danger'
                }
                disabled={saving}
              >
                {saving && <Loader2 size={16} className="animate-spin" />}

                {adjustment.direction === 'in'
                  ? 'Add Stock'
                  : 'Remove Stock'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* View */}
      {modal === 'view' && selectedInventory && (
        <Modal
          wide
          title="Inventory Details"
          subtitle={getProductName(selectedInventory)}
          onClose={() => setModal(null)}
        >
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
              <DetailCard
                label="On Hand"
                value={Number(
                  selectedInventory.onHand || 0
                ).toLocaleString('en-IN')}
              />

              <DetailCard
                label="Reserved"
                value={Number(
                  selectedInventory.reserved || 0
                ).toLocaleString('en-IN')}
              />

              <DetailCard
                label="Available"
                value={Number(
                  selectedInventory.available || 0
                ).toLocaleString('en-IN')}
              />

              <DetailCard
                label="Average Cost"
                value={formatCurrency(
                  selectedInventory.averageCost
                )}
              />

              <DetailCard
                label="Stock Status"
                value={stockStatusLabel(
                  getStockStatus(selectedInventory)
                )}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <InfoRow
                label="Product"
                value={getProductName(selectedInventory)}
              />

              <InfoRow
                label="SKU"
                value={getProductSku(selectedInventory)}
              />

              <InfoRow
                label="Branch"
                value={getBranchName(selectedInventory)}
              />

              <InfoRow
                label="Status"
                value={selectedInventory.status || '—'}
              />

              <InfoRow
                label="Reorder Level"
                value={selectedInventory.reorderLevel ?? 0}
              />

              <InfoRow
                label="Minimum Stock"
                value={selectedInventory.minimumStock ?? 0}
              />

              <InfoRow
                label="Maximum Stock"
                value={selectedInventory.maximumStock ?? 0}
              />

              <InfoRow
                label="Last Purchase"
                value={formatCurrency(
                  selectedInventory.lastPurchasePrice
                )}
              />
            </div>

            <div className="overflow-hidden rounded-xl border border-white/10">
              <div className="flex items-center gap-2 border-b border-white/10 bg-white/[0.025] px-4 py-3">
                <History size={17} className="text-blue-400" />
                <h3 className="text-sm font-semibold text-white">
                  Stock Movement History
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px]">
                  <thead>
                    <tr className="border-b border-white/10 text-left">
                      <th className="px-4 py-3 text-xs text-slate-500">
                        Date
                      </th>
                      <th className="px-4 py-3 text-xs text-slate-500">
                        Type
                      </th>
                      <th className="px-4 py-3 text-xs text-slate-500">
                        Direction
                      </th>
                      <th className="px-4 py-3 text-right text-xs text-slate-500">
                        Qty
                      </th>
                      <th className="px-4 py-3 text-right text-xs text-slate-500">
                        Previous
                      </th>
                      <th className="px-4 py-3 text-right text-xs text-slate-500">
                        New
                      </th>
                      <th className="px-4 py-3 text-xs text-slate-500">
                        Reason
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {actionLoading ? (
                      <tr>
                        <td colSpan="7" className="px-4 py-10">
                          <div className="flex justify-center">
                            <Loader2
                              size={22}
                              className="animate-spin text-blue-500"
                            />
                          </div>
                        </td>
                      </tr>
                    ) : movements.length === 0 ? (
                      <tr>
                        <td
                          colSpan="7"
                          className="px-4 py-10 text-center text-xs text-slate-500"
                        >
                          No movement history found.
                        </td>
                      </tr>
                    ) : (
                      movements.map((movement) => (
                        <tr
                          key={movement._id}
                          className="border-b border-white/[0.06]"
                        >
                          <td className="px-4 py-3 text-xs text-slate-400">
                            {formatDate(movement.movementDate)}
                          </td>

                          <td className="px-4 py-3 text-xs text-slate-300">
                            {movement.movementType || '—'}
                          </td>

                          <td className="px-4 py-3">
                            <span
                              className={`text-xs font-medium ${
                                movement.direction === 'in'
                                  ? 'text-emerald-400'
                                  : movement.direction === 'out'
                                  ? 'text-red-400'
                                  : 'text-slate-400'
                              }`}
                            >
                              {movement.direction || 'neutral'}
                            </span>
                          </td>

                          <td className="px-4 py-3 text-right text-xs font-semibold text-white">
                            {Number(
                              movement.quantity || 0
                            ).toLocaleString('en-IN')}
                          </td>

                          <td className="px-4 py-3 text-right text-xs text-slate-400">
                            {Number(
                              movement.previousQuantity || 0
                            ).toLocaleString('en-IN')}
                          </td>

                          <td className="px-4 py-3 text-right text-xs text-blue-300">
                            {Number(
                              movement.newQuantity || 0
                            ).toLocaleString('en-IN')}
                          </td>

                          <td className="max-w-[240px] truncate px-4 py-3 text-xs text-slate-400">
                            {movement.reason || '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end border-t border-white/10 pt-4">
              <Button
                variant="secondary"
                onClick={() => setModal(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Restore is intentionally exposed through deleted records only.
          If your GET endpoint later supports includeDeleted=true, this
          button can be wired directly without changing the API client. */}
    </div>
  );
};

const StatCard = ({ icon, label, value, detail }) => (
  <div className="rounded-2xl border border-white/10 bg-[#101114] p-4">
    <div className="mb-4 flex items-center justify-between">
      <div className="rounded-xl border border-white/10 bg-white/5 p-2.5 text-blue-400">
        {icon}
      </div>

      <span className="text-[10px] uppercase tracking-wider text-slate-600">
        Inventory
      </span>
    </div>

    <p className="text-xs text-slate-500">{label}</p>

    <p className="mt-1 text-2xl font-bold tracking-tight text-white">
      {value}
    </p>

    <p className="mt-1 text-[11px] text-slate-600">{detail}</p>
  </div>
);

const IconButton = ({
  children,
  onClick,
  title,
  danger = false,
  disabled = false,
}) => (
  <button
    type="button"
    title={title}
    onClick={onClick}
    disabled={disabled}
    className={`rounded-lg border p-2 transition disabled:cursor-not-allowed disabled:opacity-30 ${
      danger
        ? 'border-red-500/10 bg-red-500/5 text-red-400 hover:bg-red-500/15'
        : 'border-white/10 bg-white/[0.03] text-slate-400 hover:bg-white/10 hover:text-white'
    }`}
  >
    {children}
  </button>
);

const DetailCard = ({ label, value }) => (
  <div className="rounded-xl border border-white/10 bg-white/[0.025] p-3">
    <p className="text-[10px] uppercase tracking-wider text-slate-600">
      {label}
    </p>

    <p className="mt-1 truncate text-sm font-semibold text-white">
      {value}
    </p>
  </div>
);

const InfoRow = ({ label, value }) => (
  <div className="rounded-xl border border-white/10 bg-[#15171a] px-3.5 py-3">
    <p className="text-[10px] uppercase tracking-wider text-slate-600">
      {label}
    </p>

    <p className="mt-1 truncate text-sm text-slate-200">{value}</p>
  </div>
);

export default Inventory;