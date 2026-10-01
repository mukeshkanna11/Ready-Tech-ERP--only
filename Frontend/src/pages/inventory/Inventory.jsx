import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Barcode,
  Boxes,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Eye,
  History,
  IndianRupee,
  Layers,
  Loader2,
  Package,
  PackageX,
  Plus,
  RefreshCw,
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

/* ============================================================
   CONSTANTS / HELPERS
============================================================ */

const PAGE_SIZE = 25;
const FETCH_LIMIT = 100;
const MAX_FETCH_PAGES = 50;

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

const STATUS_META = {
  out_of_stock: {
    label: 'Out of Stock',
    className: 'border-rose-500/25 bg-rose-500/10 text-rose-300',
    dot: 'bg-rose-400',
  },
  low_stock: {
    label: 'Low Stock',
    className: 'border-amber-500/25 bg-amber-500/10 text-amber-300',
    dot: 'bg-amber-400',
  },
  reorder: {
    label: 'Reorder',
    className: 'border-orange-500/25 bg-orange-500/10 text-orange-300',
    dot: 'bg-orange-400',
  },
  overstock: {
    label: 'Overstock',
    className: 'border-sky-500/25 bg-sky-500/10 text-sky-300',
    dot: 'bg-sky-400',
  },
  in_stock: {
    label: 'In Stock',
    className: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300',
    dot: 'bg-emerald-400',
  },
};

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'in_stock', label: 'In Stock' },
  { key: 'low_stock', label: 'Low Stock' },
  { key: 'out_of_stock', label: 'Out of Stock' },
  { key: 'reorder', label: 'Reorder Required' },
];

const PRODUCT_TYPES = {
  product: 'Product',
  service: 'Service',
  raw_material: 'Raw Material',
  finished_good: 'Finished Good',
  semi_finished: 'Semi Finished',
  consumable: 'Consumable',
};

const num = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getId = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value._id || value.id || '';
};

const productOf = (item) =>
  item?.productId && typeof item.productId === 'object' ? item.productId : {};

const branchOf = (item) =>
  item?.branchId && typeof item.branchId === 'object' ? item.branchId : null;

const getProductName = (item) => {
  const product = productOf(item);
  return product.displayName || product.name || 'Unknown product';
};

const getBranchName = (item) => {
  const branch = branchOf(item);
  if (branch) return branch.name || branch.code || 'Branch';
  return item?.branchId ? 'Branch' : 'No branch';
};

const getOnHand = (item) => num(item?.onHand);
const getReserved = (item) => num(item?.reserved);
const getAvailable = (item) =>
  item?.available !== undefined && item?.available !== null
    ? num(item.available)
    : getOnHand(item) - getReserved(item);

const getValue = (item) => getOnHand(item) * num(item?.averageCost);

const getStockStatus = (item) => {
  const available = getAvailable(item);
  const minimum = num(item?.minimumStock);
  const reorder = num(item?.reorderLevel);
  const maximum = num(item?.maximumStock);

  if (available <= 0) return 'out_of_stock';
  if (minimum > 0 && available <= minimum) return 'low_stock';
  if (reorder > 0 && available <= reorder) return 'reorder';
  if (maximum > 0 && getOnHand(item) > maximum) return 'overstock';
  return 'in_stock';
};

const matchesTab = (status, tab) => {
  if (tab === 'all') return true;
  if (tab === 'in_stock') return status === 'in_stock' || status === 'overstock';
  if (tab === 'reorder') {
    return ['out_of_stock', 'low_stock', 'reorder'].includes(status);
  }
  return status === tab;
};

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(num(value));

const formatNumber = (value) =>
  new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(
    num(value)
  );

const formatDate = (value, withTime = false) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
};

const humanize = (value) =>
  value
    ? String(value)
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase())
    : '—';

const getList = (response) => {
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.items)) return response.data.items;
  if (Array.isArray(response)) return response;
  return [];
};

/* ============================================================
   UI PRIMITIVES
============================================================ */

const inputClass =
  'h-10 w-full rounded-lg border border-white/[0.08] bg-[#0b0e13] px-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-white/[0.2] focus:ring-2 focus:ring-white/[0.04] disabled:cursor-not-allowed disabled:opacity-60';

const Modal = ({ children, onClose, title, subtitle, wide = false }) => (
  <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4">
    <div
      className={`flex max-h-[94vh] w-full flex-col overflow-hidden rounded-t-2xl border border-white/[0.08] bg-[#11151c] shadow-2xl sm:rounded-2xl ${
        wide ? 'sm:max-w-5xl' : 'sm:max-w-2xl'
      }`}
    >
      <div className="flex items-start justify-between gap-4 border-b border-white/[0.06] px-5 py-4">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold text-white">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-slate-500 transition hover:bg-white/[0.06] hover:text-white"
          aria-label="Close"
        >
          <X size={18} />
        </button>
      </div>
      <div className="overflow-y-auto px-5 py-5">{children}</div>
    </div>
  </div>
);

const Field = ({ label, hint, children }) => (
  <label className="block space-y-1.5">
    <span className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
      {label}
      {hint && (
        <span className="font-normal normal-case tracking-normal text-slate-600">
          {hint}
        </span>
      )}
    </span>
    {children}
  </label>
);

const Button = ({
  children,
  variant = 'primary',
  className = '',
  ...props
}) => {
  const variants = {
    primary: 'bg-white text-slate-950 hover:bg-slate-200',
    secondary:
      'border border-white/[0.08] bg-white/[0.03] text-slate-200 hover:bg-white/[0.07]',
    danger: 'bg-rose-500 text-white hover:bg-rose-400',
  };

  return (
    <button
      type="button"
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

const StatusBadge = ({ status }) => {
  const meta = STATUS_META[status] || STATUS_META.in_stock;
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${meta.className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
};

const StatCard = ({ icon: Icon, label, value, detail, tone = 'text-slate-300' }) => (
  <div className="rounded-xl border border-white/[0.06] bg-[#11151c] p-4">
    <div className="flex items-center justify-between">
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">
        {label}
      </p>
      <Icon size={16} className={tone} />
    </div>
    <p className="mt-2 truncate text-xl font-semibold text-white">{value}</p>
    {detail && <p className="mt-0.5 text-[11px] text-slate-600">{detail}</p>}
  </div>
);

const DetailItem = ({ label, value, mono = false }) => (
  <div className="rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2.5">
    <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-600">
      {label}
    </p>
    <p
      className={`mt-1 break-words text-sm text-slate-200 ${
        mono ? 'font-mono' : ''
      }`}
    >
      {value === '' || value === null || value === undefined ? '—' : value}
    </p>
  </div>
);

const IconAction = ({ icon: Icon, label, onClick, danger = false, disabled }) => (
  <button
    type="button"
    title={label}
    aria-label={label}
    disabled={disabled}
    onClick={(event) => {
      event.stopPropagation();
      onClick();
    }}
    className={`rounded-md p-1.5 transition disabled:opacity-40 ${
      danger
        ? 'text-slate-500 hover:bg-rose-500/10 hover:text-rose-300'
        : 'text-slate-500 hover:bg-white/[0.06] hover:text-white'
    }`}
  >
    <Icon size={15} />
  </button>
);

/* ============================================================
   PAGE
============================================================ */

const Inventory = () => {
  const [inventory, setInventory] = useState([]);
  const [products, setProducts] = useState([]);
  const [branches, setBranches] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('all');
  const [stockStatus, setStockStatus] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);

  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [adjustment, setAdjustment] = useState(emptyAdjustment);
  const [selected, setSelected] = useState(null);
  const [movements, setMovements] = useState([]);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const messageTimer = useRef(null);

  const flash = useCallback((type, message) => {
    window.clearTimeout(messageTimer.current);
    setSuccess(type === 'success' ? message : '');
    setError(type === 'error' ? message : '');
    messageTimer.current = window.setTimeout(() => {
      setSuccess('');
      setError('');
    }, type === 'success' ? 3500 : 6000);
  }, []);

  useEffect(() => () => window.clearTimeout(messageTimer.current), []);

  const reload = () => {
    setLoading(true);
    setReloadKey((key) => key + 1);
  };

  // Load every inventory record once; filters, tabs and summary run client-side.
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const all = [];
        let current = 1;
        let totalPages = 1;

        do {
          const response = await apiRequest(
            `/inventory?page=${current}&limit=${FETCH_LIMIT}`
          );
          all.push(...getList(response));
          totalPages = num(response?.pagination?.totalPages) || 1;
          current += 1;
        } while (current <= totalPages && current <= MAX_FETCH_PAGES);

        if (cancelled) return;
        setInventory(all);
        setLoadError('');
      } catch (err) {
        if (cancelled) return;
        setLoadError(err.message || 'Failed to load inventory');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  useEffect(() => {
    let cancelled = false;

    Promise.allSettled([
      apiRequest('/products?status=active&limit=100'),
      apiRequest('/branches?status=active&limit=100'),
    ]).then(([productRes, branchRes]) => {
      if (cancelled) return;
      if (productRes.status === 'fulfilled') {
        setProducts(getList(productRes.value));
      }
      if (branchRes.status === 'fulfilled') {
        setBranches(getList(branchRes.value));
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  /* ---------------- derived data ---------------- */

  const rows = useMemo(
    () =>
      inventory.map((item) => ({
        ...item,
        _status: getStockStatus(item),
        _value: getValue(item),
      })),
    [inventory]
  );

  const summary = useMemo(() => {
    const productIds = new Set();
    const branchMap = new Map();
    let units = 0;
    let value = 0;
    let low = 0;
    let out = 0;
    let reorder = 0;

    rows.forEach((item) => {
      productIds.add(getId(item.productId));
      units += getOnHand(item);
      value += item._value;
      if (item._status === 'low_stock') low += 1;
      if (item._status === 'out_of_stock') out += 1;
      if (matchesTab(item._status, 'reorder')) reorder += 1;

      const key = getId(item.branchId) || 'none';
      const entry = branchMap.get(key) || {
        key,
        name: getBranchName(item),
        records: 0,
        units: 0,
        value: 0,
        alerts: 0,
      };
      entry.records += 1;
      entry.units += getOnHand(item);
      entry.value += item._value;
      if (['out_of_stock', 'low_stock'].includes(item._status)) {
        entry.alerts += 1;
      }
      branchMap.set(key, entry);
    });

    return {
      products: productIds.size,
      units,
      value,
      low,
      out,
      reorder,
      branches: [...branchMap.values()].sort((a, b) => b.units - a.units),
    };
  }, [rows]);

  const tabCounts = useMemo(() => {
    const counts = {};
    TABS.forEach(({ key }) => {
      counts[key] = rows.filter((item) => matchesTab(item._status, key)).length;
    });
    return counts;
  }, [rows]);

  const branchOptions = useMemo(() => {
    const map = new Map();
    branches.forEach((branch) => map.set(branch._id, branch.name || branch.code));
    rows.forEach((item) => {
      const id = getId(item.branchId);
      if (id && !map.has(id)) map.set(id, getBranchName(item));
    });
    return [...map.entries()];
  }, [branches, rows]);

  const typeOptions = useMemo(
    () =>
      [...new Set(rows.map((item) => productOf(item).productType).filter(Boolean))],
    [rows]
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    let list = rows.filter((item) => {
      if (!matchesTab(item._status, tab)) return false;
      if (stockStatus && item._status !== stockStatus) return false;
      if (branchFilter === 'none' && item.branchId) return false;
      if (
        branchFilter &&
        branchFilter !== 'none' &&
        getId(item.branchId) !== branchFilter
      ) {
        return false;
      }
      if (typeFilter && productOf(item).productType !== typeFilter) return false;
      return true;
    });

    if (term) {
      const exactBarcode = list.filter(
        (item) => String(productOf(item).barcode || '').toLowerCase() === term
      );

      list = exactBarcode.length
        ? exactBarcode
        : list.filter((item) => {
            const product = productOf(item);
            return [
              product.name,
              product.displayName,
              product.productCode,
              product.sku,
              product.barcode,
            ]
              .filter(Boolean)
              .some((field) => String(field).toLowerCase().includes(term));
          });
    }

    return list;
  }, [rows, search, tab, stockStatus, branchFilter, typeFilter]);

  const totalPages = Math.max(Math.ceil(filtered.length / PAGE_SIZE), 1);
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  const hasFilters =
    search || tab !== 'all' || stockStatus || branchFilter || typeFilter;

  const clearFilters = () => {
    setSearch('');
    setTab('all');
    setStockStatus('');
    setBranchFilter('');
    setTypeFilter('');
    setPage(1);
  };

  const withReset = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  /* ---------------- actions ---------------- */

  const closeModal = () => {
    if (saving) return;
    setModal(null);
  };

  const openCreate = () => {
    setForm(emptyForm);
    setSelected(null);
    setModal('create');
  };

  const openEdit = (item) => {
    setSelected(item);
    setForm({
      productId: getId(item.productId),
      branchId: getId(item.branchId),
      openingStock: item.openingStock ?? '',
      reorderLevel: item.reorderLevel ?? '',
      minimumStock: item.minimumStock ?? '',
      maximumStock: item.maximumStock ?? '',
      averageCost: item.averageCost ?? '',
      lastPurchasePrice: item.lastPurchasePrice ?? '',
    });
    setModal('edit');
  };

  const openAdjustment = (item, direction) => {
    setSelected(item);
    setAdjustment({
      ...emptyAdjustment,
      inventoryId: item._id,
      direction,
      unitCost:
        item.averageCost ||
        item.lastPurchasePrice ||
        productOf(item).purchasePrice ||
        '',
    });
    setModal('adjust');
  };

  const openView = async (item) => {
    setSelected(item);
    setMovements([]);
    setModal('view');

    try {
      setDetailsLoading(true);
      const response = await apiRequest(`/inventory/${item._id}`);
      const data = response?.data || response;
      setSelected(data);
      setMovements(Array.isArray(data?.movements) ? data.movements : []);
    } catch (err) {
      flash('error', err.message || 'Failed to load inventory details');
    } finally {
      setDetailsLoading(false);
    }
  };

  const updateForm = (key) => (event) =>
    setForm((previous) => ({ ...previous, [key]: event.target.value }));

  const updateAdjustment = (key) => (event) =>
    setAdjustment((previous) => ({ ...previous, [key]: event.target.value }));

  const validateThresholds = () => {
    const minimum = num(form.minimumStock);
    const maximum = num(form.maximumStock);
    const values = [
      form.openingStock,
      form.reorderLevel,
      form.minimumStock,
      form.maximumStock,
      form.averageCost,
      form.lastPurchasePrice,
    ];

    if (values.some((value) => value !== '' && num(value) < 0)) {
      return 'Quantities and costs cannot be negative.';
    }
    if (maximum > 0 && minimum > maximum) {
      return 'Minimum stock cannot be greater than maximum stock.';
    }
    return '';
  };

  const submitForm = async (event) => {
    event.preventDefault();
    if (saving) return;

    const isEdit = modal === 'edit' && selected?._id;

    if (!isEdit && !form.productId) {
      flash('error', 'Please select a product.');
      return;
    }

    const validation = validateThresholds();
    if (validation) {
      flash('error', validation);
      return;
    }

    const optional = (key) =>
      form[key] !== '' ? { [key]: Number(form[key]) } : {};

    try {
      setSaving(true);

      if (isEdit) {
        await apiRequest(`/inventory/${selected._id}`, {
          method: 'PUT',
          body: JSON.stringify({
            reorderLevel: num(form.reorderLevel),
            minimumStock: num(form.minimumStock),
            maximumStock: num(form.maximumStock),
            averageCost: num(form.averageCost),
            lastPurchasePrice: num(form.lastPurchasePrice),
            status: selected.status || 'active',
          }),
        });
      } else {
        await apiRequest('/inventory', {
          method: 'POST',
          body: JSON.stringify({
            productId: form.productId,
            ...(form.branchId ? { branchId: form.branchId } : {}),
            ...optional('openingStock'),
            ...optional('reorderLevel'),
            ...optional('minimumStock'),
            ...optional('maximumStock'),
            ...optional('averageCost'),
            ...optional('lastPurchasePrice'),
          }),
        });
      }

      setModal(null);
      flash(
        'success',
        isEdit ? 'Inventory updated successfully.' : 'Inventory created successfully.'
      );
      reload();
    } catch (err) {
      flash(
        'error',
        err.message || (isEdit ? 'Failed to update inventory' : 'Failed to create inventory')
      );
    } finally {
      setSaving(false);
    }
  };

  const submitAdjustment = async (event) => {
    event.preventDefault();
    if (saving) return;

    const quantity = Number(adjustment.quantity);

    if (!quantity || quantity <= 0) {
      flash('error', 'Enter a valid quantity greater than zero.');
      return;
    }

    if (adjustment.direction === 'out' && quantity > getAvailable(selected)) {
      flash('error', `Maximum stock-out quantity is ${getAvailable(selected)}.`);
      return;
    }

    try {
      setSaving(true);
      await apiRequest('/inventory/adjust', {
        method: 'POST',
        body: JSON.stringify({
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
        }),
      });

      setModal(null);
      flash(
        'success',
        adjustment.direction === 'in'
          ? 'Stock increased successfully.'
          : 'Stock decreased successfully.'
      );
      reload();
    } catch (err) {
      flash('error', err.message || 'Failed to adjust stock');
    } finally {
      setSaving(false);
    }
  };

  const performDelete = async () => {
    if (!confirmDelete || saving) return;

    try {
      setSaving(true);
      await apiRequest(`/inventory/${confirmDelete._id}`, { method: 'DELETE' });
      setConfirmDelete(null);
      if (modal === 'view') setModal(null);
      flash('success', 'Inventory deleted successfully.');
      reload();
    } catch (err) {
      flash('error', err.message || 'Failed to delete inventory');
    } finally {
      setSaving(false);
    }
  };

  /* ---------------- render helpers ---------------- */

  const renderActions = (item) => (
    <div className="flex items-center justify-end gap-0.5">
      <IconAction icon={Eye} label="View details" onClick={() => openView(item)} />
      <IconAction icon={Edit3} label="Edit" onClick={() => openEdit(item)} />
      <IconAction
        icon={ArrowDownToLine}
        label="Stock in"
        onClick={() => openAdjustment(item, 'in')}
      />
      <IconAction
        icon={ArrowUpFromLine}
        label="Stock out"
        disabled={getAvailable(item) <= 0}
        onClick={() => openAdjustment(item, 'out')}
      />
      <IconAction
        icon={Trash2}
        label="Delete"
        danger
        onClick={() => setConfirmDelete(item)}
      />
    </div>
  );

  const th =
    'sticky top-0 z-10 whitespace-nowrap bg-[#141922] px-3 py-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500';
  const td = 'whitespace-nowrap px-3 py-3 text-xs text-slate-300';

  const selectedProduct = productOf(selected);
  const isEditing = modal === 'edit';

  return (
    <div className="min-h-screen space-y-5 bg-[#0b0e13] p-4 text-slate-200 sm:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Operations
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-white">Inventory</h1>
          <p className="mt-1 text-sm text-slate-500">
            Stock levels, thresholds and valuation across your branches.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={reload} disabled={loading}>
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            Refresh
          </Button>
          <Button onClick={openCreate}>
            <Plus size={15} />
            Add Inventory
          </Button>
        </div>
      </div>

      {/* Messages */}
      {success && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-300">
          <CheckCircle2 size={16} />
          {success}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-300">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard
          icon={Package}
          label="Total Products"
          value={formatNumber(summary.products)}
          detail={`${formatNumber(rows.length)} inventory records`}
        />
        <StatCard
          icon={Boxes}
          label="Stock Units"
          value={formatNumber(summary.units)}
          detail="On hand"
        />
        <StatCard
          icon={IndianRupee}
          label="Inventory Value"
          value={formatCurrency(summary.value)}
          detail="On hand × average cost"
          tone="text-emerald-400"
        />
        <StatCard
          icon={AlertTriangle}
          label="Low Stock"
          value={formatNumber(summary.low)}
          detail="At or below minimum"
          tone="text-amber-400"
        />
        <StatCard
          icon={PackageX}
          label="Out of Stock"
          value={formatNumber(summary.out)}
          detail="No available units"
          tone="text-rose-400"
        />
        <StatCard
          icon={Layers}
          label="Reorder Required"
          value={formatNumber(summary.reorder)}
          detail="At or below reorder level"
          tone="text-orange-400"
        />
      </div>

      {/* Branch summary */}
      {summary.branches.length > 0 && (
        <div className="rounded-xl border border-white/[0.06] bg-[#11151c] p-4">
          <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">
            <Building2 size={14} />
            Branch stock summary
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {summary.branches.map((branch) => (
              <button
                type="button"
                key={branch.key}
                onClick={() =>
                  withReset(setBranchFilter)(
                    branchFilter === branch.key ? '' : branch.key
                  )
                }
                className={`min-w-[190px] rounded-lg border px-3 py-2.5 text-left transition ${
                  branchFilter === branch.key
                    ? 'border-white/[0.25] bg-white/[0.06]'
                    : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]'
                }`}
              >
                <p className="truncate text-sm font-medium text-white">
                  {branch.name}
                </p>
                <p className="mt-1 text-[11px] text-slate-500">
                  {formatNumber(branch.records)} items ·{' '}
                  {formatNumber(branch.units)} units
                </p>
                <p className="mt-0.5 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">
                    {formatCurrency(branch.value)}
                  </span>
                  {branch.alerts > 0 && (
                    <span className="text-amber-400">{branch.alerts} alerts</span>
                  )}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Table card */}
      <div className="rounded-xl border border-white/[0.06] bg-[#11151c]">
        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto border-b border-white/[0.06] px-3 pt-3">
          {TABS.map(({ key, label }) => (
            <button
              type="button"
              key={key}
              onClick={() => withReset(setTab)(key)}
              className={`whitespace-nowrap rounded-t-lg border-b-2 px-3 py-2 text-xs font-semibold transition ${
                tab === key
                  ? 'border-white text-white'
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              {label}
              <span className="ml-1.5 rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-slate-400">
                {tabCounts[key] || 0}
              </span>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-2 p-3 lg:flex-row">
          <div className="relative flex-1">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-600"
            />
            <input
              value={search}
              onChange={(event) => withReset(setSearch)(event.target.value)}
              className={`${inputClass} pl-9 pr-9`}
              placeholder="Search name, code, SKU or scan barcode…"
              aria-label="Search inventory"
            />
            {search ? (
              <button
                type="button"
                onClick={() => withReset(setSearch)('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            ) : (
              <Barcode
                size={15}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-700"
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:flex">
            <select
              value={branchFilter}
              onChange={(event) => withReset(setBranchFilter)(event.target.value)}
              className={`${inputClass} lg:w-40`}
              aria-label="Filter by branch"
            >
              <option value="">All branches</option>
              <option value="none">No branch</option>
              {branchOptions.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>

            <select
              value={typeFilter}
              onChange={(event) => withReset(setTypeFilter)(event.target.value)}
              className={`${inputClass} lg:w-36`}
              aria-label="Filter by product type"
            >
              <option value="">All types</option>
              {typeOptions.map((type) => (
                <option key={type} value={type}>
                  {PRODUCT_TYPES[type] || humanize(type)}
                </option>
              ))}
            </select>

            <select
              value={stockStatus}
              onChange={(event) => withReset(setStockStatus)(event.target.value)}
              className={`${inputClass} lg:w-36`}
              aria-label="Filter by stock status"
            >
              <option value="">Any status</option>
              {Object.entries(STATUS_META).map(([key, meta]) => (
                <option key={key} value={key}>
                  {meta.label}
                </option>
              ))}
            </select>

            <Button
              variant="secondary"
              onClick={clearFilters}
              disabled={!hasFilters}
              className="h-10"
            >
              <X size={14} />
              Clear
            </Button>
          </div>
        </div>

        {/* Body */}
        {loading ? (
          <div className="space-y-2 p-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="h-11 animate-pulse rounded-lg bg-white/[0.03]"
              />
            ))}
          </div>
        ) : loadError ? (
          <div className="flex flex-col items-center gap-3 px-4 py-14 text-center">
            <AlertCircle size={28} className="text-rose-400" />
            <p className="text-sm text-rose-300">{loadError}</p>
            <Button variant="secondary" onClick={reload}>
              <RefreshCw size={14} />
              Try again
            </Button>
          </div>
        ) : !filtered.length ? (
          <div className="flex flex-col items-center gap-2 px-4 py-14 text-center">
            <Boxes size={30} className="text-slate-700" />
            <p className="text-sm font-medium text-slate-300">
              {rows.length ? 'No inventory matches your filters' : 'No inventory yet'}
            </p>
            <p className="text-xs text-slate-600">
              {rows.length
                ? 'Try a different search or clear the filters.'
                : 'Add inventory for a product to start tracking stock.'}
            </p>
            {hasFilters && rows.length > 0 && (
              <Button variant="secondary" onClick={clearFilters} className="mt-2">
                Clear filters
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop / tablet table */}
            <div className="hidden max-h-[65vh] overflow-auto md:block">
              <table className="w-full min-w-[1900px] border-separate border-spacing-0 text-left">
                <thead>
                  <tr>
                    <th className={`${th} sticky left-0 z-20`}>Product</th>
                    <th className={th}>Code</th>
                    <th className={th}>SKU</th>
                    <th className={th}>Barcode</th>
                    <th className={th}>Type</th>
                    <th className={th}>Branch</th>
                    <th className={`${th} text-right`}>On Hand</th>
                    <th className={`${th} text-right`}>Reserved</th>
                    <th className={`${th} text-right`}>Available</th>
                    <th className={`${th} text-right`}>Min</th>
                    <th className={`${th} text-right`}>Reorder</th>
                    <th className={`${th} text-right`}>Max</th>
                    <th className={`${th} text-right`}>Avg Cost</th>
                    <th className={`${th} text-right`}>Last Purchase</th>
                    <th className={`${th} text-right`}>Value</th>
                    <th className={th}>Status</th>
                    <th className={th}>Updated</th>
                    <th className={`${th} text-right`}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((item) => {
                    const product = productOf(item);
                    return (
                      <tr
                        key={item._id}
                        onClick={() => openView(item)}
                        className="group cursor-pointer"
                      >
                        <td className="sticky left-0 z-[1] max-w-[240px] border-b border-white/[0.04] bg-[#11151c] px-3 py-3 group-hover:bg-[#161b24]">
                          <p className="truncate text-sm font-medium text-white">
                            {getProductName(item)}
                          </p>
                          {product.category && (
                            <p className="truncate text-[11px] text-slate-600">
                              {product.category}
                            </p>
                          )}
                        </td>
                        {[
                          product.productCode || '—',
                          product.sku || '—',
                        ].map((value, index) => (
                          <td
                            key={index}
                            className={`${td} border-b border-white/[0.04] group-hover:bg-white/[0.02]`}
                          >
                            {value}
                          </td>
                        ))}
                        <td className={`${td} border-b border-white/[0.04] font-mono group-hover:bg-white/[0.02]`}>
                          {product.barcode || '—'}
                        </td>
                        <td className={`${td} border-b border-white/[0.04] group-hover:bg-white/[0.02]`}>
                          {product.productType
                            ? PRODUCT_TYPES[product.productType] ||
                              humanize(product.productType)
                            : '—'}
                        </td>
                        <td className={`${td} border-b border-white/[0.04] group-hover:bg-white/[0.02]`}>
                          {getBranchName(item)}
                        </td>
                        {[
                          getOnHand(item),
                          getReserved(item),
                          getAvailable(item),
                          num(item.minimumStock),
                          num(item.reorderLevel),
                          num(item.maximumStock),
                        ].map((value, index) => (
                          <td
                            key={index}
                            className={`${td} border-b border-white/[0.04] text-right tabular-nums group-hover:bg-white/[0.02] ${
                              index === 2 ? 'font-semibold text-white' : ''
                            }`}
                          >
                            {formatNumber(value)}
                          </td>
                        ))}
                        {[item.averageCost, item.lastPurchasePrice, item._value].map(
                          (value, index) => (
                            <td
                              key={index}
                              className={`${td} border-b border-white/[0.04] text-right tabular-nums group-hover:bg-white/[0.02] ${
                                index === 2 ? 'font-semibold text-white' : ''
                              }`}
                            >
                              {formatCurrency(value)}
                            </td>
                          )
                        )}
                        <td className={`${td} border-b border-white/[0.04] group-hover:bg-white/[0.02]`}>
                          <StatusBadge status={item._status} />
                        </td>
                        <td className={`${td} border-b border-white/[0.04] text-slate-500 group-hover:bg-white/[0.02]`}>
                          {formatDate(item.updatedAt)}
                        </td>
                        <td className={`${td} border-b border-white/[0.04] group-hover:bg-white/[0.02]`}>
                          {renderActions(item)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="space-y-2 p-3 md:hidden">
              {pageRows.map((item) => {
                const product = productOf(item);
                return (
                  <div
                    key={item._id}
                    onClick={() => openView(item)}
                    className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-white">
                          {getProductName(item)}
                        </p>
                        <p className="mt-0.5 truncate text-[11px] text-slate-500">
                          {[product.productCode, product.sku, getBranchName(item)]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                        {product.barcode && (
                          <p className="mt-0.5 font-mono text-[11px] text-slate-500">
                            {product.barcode}
                          </p>
                        )}
                      </div>
                      <StatusBadge status={item._status} />
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
                      {[
                        ['On hand', formatNumber(getOnHand(item))],
                        ['Available', formatNumber(getAvailable(item))],
                        ['Reserved', formatNumber(getReserved(item))],
                        ['Min', formatNumber(item.minimumStock)],
                        ['Reorder', formatNumber(item.reorderLevel)],
                        ['Max', formatNumber(item.maximumStock)],
                        ['Avg cost', formatCurrency(item.averageCost)],
                        ['Last purchase', formatCurrency(item.lastPurchasePrice)],
                        ['Value', formatCurrency(item._value)],
                      ].map(([label, value]) => (
                        <div key={label}>
                          <p className="text-slate-600">{label}</p>
                          <p className="text-slate-200">{value}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 flex items-center justify-between border-t border-white/[0.05] pt-2">
                      <span className="text-[11px] text-slate-600">
                        Updated {formatDate(item.updatedAt)}
                      </span>
                      {renderActions(item)}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between border-t border-white/[0.06] px-4 py-3 text-xs text-slate-500">
              <span>
                {(safePage - 1) * PAGE_SIZE + 1}–
                {Math.min(safePage * PAGE_SIZE, filtered.length)} of{' '}
                {filtered.length}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setPage(safePage - 1)}
                  className="rounded-md p-1.5 hover:bg-white/[0.06] disabled:opacity-30"
                  aria-label="Previous page"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="px-2">
                  {safePage} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage(safePage + 1)}
                  className="rounded-md p-1.5 hover:bg-white/[0.06] disabled:opacity-30"
                  aria-label="Next page"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Create / Edit */}
      {(modal === 'create' || isEditing) && (
        <Modal
          title={isEditing ? 'Edit Inventory' : 'Add Inventory'}
          subtitle={
            isEditing
              ? `${getProductName(selected)} · ${getBranchName(selected)}`
              : 'Start tracking stock for a product.'
          }
          onClose={closeModal}
        >
          <form onSubmit={submitForm} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Product">
                <select
                  value={form.productId}
                  onChange={updateForm('productId')}
                  disabled={isEditing}
                  className={inputClass}
                  required={!isEditing}
                >
                  <option value="">Select product</option>
                  {isEditing &&
                    form.productId &&
                    !products.some((item) => item._id === form.productId) && (
                      <option value={form.productId}>
                        {getProductName(selected)}
                      </option>
                    )}
                  {products.map((product) => (
                    <option key={product._id} value={product._id}>
                      {product.name}
                      {product.productCode ? ` (${product.productCode})` : ''}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Branch">
                <select
                  value={form.branchId}
                  onChange={updateForm('branchId')}
                  disabled={isEditing}
                  className={inputClass}
                >
                  <option value="">No branch</option>
                  {isEditing &&
                    form.branchId &&
                    !branches.some((item) => item._id === form.branchId) && (
                      <option value={form.branchId}>
                        {getBranchName(selected)}
                      </option>
                    )}
                  {branches.map((branch) => (
                    <option key={branch._id} value={branch._id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field
                label="Opening Stock"
                hint={isEditing ? 'Use stock in/out to change' : ''}
              >
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={form.openingStock}
                  onChange={updateForm('openingStock')}
                  disabled={isEditing}
                  className={inputClass}
                  placeholder="0"
                />
              </Field>

              <Field label="Reorder Level">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={form.reorderLevel}
                  onChange={updateForm('reorderLevel')}
                  className={inputClass}
                  placeholder="0"
                />
              </Field>

              <Field label="Minimum Stock">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={form.minimumStock}
                  onChange={updateForm('minimumStock')}
                  className={inputClass}
                  placeholder="0"
                />
              </Field>

              <Field label="Maximum Stock">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={form.maximumStock}
                  onChange={updateForm('maximumStock')}
                  className={inputClass}
                  placeholder="0"
                />
              </Field>

              <Field label="Average Cost">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={form.averageCost}
                  onChange={updateForm('averageCost')}
                  className={inputClass}
                  placeholder="0.00"
                />
              </Field>

              <Field label="Last Purchase Price">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={form.lastPurchasePrice}
                  onChange={updateForm('lastPurchasePrice')}
                  className={inputClass}
                  placeholder="0.00"
                />
              </Field>
            </div>

            <div className="flex justify-end gap-2 border-t border-white/[0.06] pt-4">
              <Button variant="secondary" onClick={closeModal} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 size={15} className="animate-spin" />}
                {isEditing ? 'Save Changes' : 'Create Inventory'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Stock adjustment */}
      {modal === 'adjust' && selected && (
        <Modal
          title={adjustment.direction === 'in' ? 'Stock In' : 'Stock Out'}
          subtitle={`${getProductName(selected)} · Available ${formatNumber(
            getAvailable(selected)
          )}`}
          onClose={closeModal}
        >
          <form onSubmit={submitAdjustment} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Direction">
                <select
                  value={adjustment.direction}
                  onChange={updateAdjustment('direction')}
                  className={inputClass}
                >
                  <option value="in">Stock In</option>
                  <option value="out">Stock Out</option>
                </select>
              </Field>
              <Field label="Quantity">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={adjustment.quantity}
                  onChange={updateAdjustment('quantity')}
                  className={inputClass}
                  required
                />
              </Field>
              <Field label="Unit Cost">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={adjustment.unitCost}
                  onChange={updateAdjustment('unitCost')}
                  className={inputClass}
                />
              </Field>
              <Field label="Reference Number">
                <input
                  value={adjustment.referenceNumber}
                  onChange={updateAdjustment('referenceNumber')}
                  className={inputClass}
                />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Reason">
                  <input
                    value={adjustment.reason}
                    onChange={updateAdjustment('reason')}
                    className={inputClass}
                    placeholder={
                      adjustment.direction === 'in'
                        ? 'Manual stock increase'
                        : 'Manual stock decrease'
                    }
                  />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="Notes">
                  <textarea
                    value={adjustment.notes}
                    onChange={updateAdjustment('notes')}
                    rows={3}
                    className={`${inputClass} h-auto py-2`}
                  />
                </Field>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-white/[0.06] pt-4">
              <Button variant="secondary" onClick={closeModal} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 size={15} className="animate-spin" />}
                Apply Adjustment
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Details */}
      {modal === 'view' && selected && (
        <Modal
          wide
          title={getProductName(selected)}
          subtitle={`${selectedProduct.productCode || 'No code'} · ${getBranchName(
            selected
          )}`}
          onClose={closeModal}
        >
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge status={getStockStatus(selected)} />
              <span className="text-xs text-slate-500">
                Last updated {formatDate(selected.updatedAt, true)}
              </span>
              {detailsLoading && (
                <Loader2 size={14} className="animate-spin text-slate-500" />
              )}
            </div>

            <section>
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                Product
              </h3>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                <DetailItem label="Product Code" value={selectedProduct.productCode} />
                <DetailItem label="SKU" value={selectedProduct.sku} />
                <DetailItem label="Barcode" value={selectedProduct.barcode} mono />
                <DetailItem
                  label="Type"
                  value={
                    selectedProduct.productType &&
                    (PRODUCT_TYPES[selectedProduct.productType] ||
                      humanize(selectedProduct.productType))
                  }
                />
                <DetailItem label="Category" value={selectedProduct.category} />
                <DetailItem label="Brand" value={selectedProduct.brand} />
                <DetailItem label="Unit" value={selectedProduct.unit} />
                <DetailItem label="Branch" value={getBranchName(selected)} />
              </div>
            </section>

            <section>
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                Stock
              </h3>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                <DetailItem label="Opening Stock" value={formatNumber(selected.openingStock)} />
                <DetailItem label="On Hand" value={formatNumber(getOnHand(selected))} />
                <DetailItem label="Reserved" value={formatNumber(getReserved(selected))} />
                <DetailItem label="Available" value={formatNumber(getAvailable(selected))} />
                <DetailItem label="Minimum Stock" value={formatNumber(selected.minimumStock)} />
                <DetailItem label="Reorder Level" value={formatNumber(selected.reorderLevel)} />
                <DetailItem label="Maximum Stock" value={formatNumber(selected.maximumStock)} />
                <DetailItem label="Last Stock In" value={formatDate(selected.lastStockInAt, true)} />
              </div>
            </section>

            <section>
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                Cost & Valuation
              </h3>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                <DetailItem label="Average Cost" value={formatCurrency(selected.averageCost)} />
                <DetailItem
                  label="Last Purchase Price"
                  value={formatCurrency(selected.lastPurchasePrice)}
                />
                <DetailItem label="Inventory Value" value={formatCurrency(getValue(selected))} />
                <DetailItem label="Last Stock Out" value={formatDate(selected.lastStockOutAt, true)} />
              </div>
            </section>

            <section>
              <h3 className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                <History size={13} />
                Stock Movements
              </h3>
              {detailsLoading ? (
                <div className="h-16 animate-pulse rounded-lg bg-white/[0.03]" />
              ) : movements.length ? (
                <div className="overflow-x-auto rounded-lg border border-white/[0.06]">
                  <table className="w-full min-w-[760px] text-left text-xs">
                    <thead className="bg-white/[0.03] text-[10px] uppercase tracking-[0.1em] text-slate-500">
                      <tr>
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2">Type</th>
                        <th className="px-3 py-2 text-right">Quantity</th>
                        <th className="px-3 py-2">Reference</th>
                        <th className="px-3 py-2 text-right">Previous</th>
                        <th className="px-3 py-2 text-right">New</th>
                        <th className="px-3 py-2">Branch</th>
                        <th className="px-3 py-2">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movements.map((movement) => (
                        <tr key={movement._id} className="border-t border-white/[0.04]">
                          <td className="whitespace-nowrap px-3 py-2 text-slate-400">
                            {formatDate(movement.movementDate || movement.createdAt, true)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-slate-300">
                            {humanize(movement.movementType)}
                          </td>
                          <td
                            className={`whitespace-nowrap px-3 py-2 text-right font-semibold tabular-nums ${
                              movement.direction === 'in'
                                ? 'text-emerald-300'
                                : movement.direction === 'out'
                                  ? 'text-rose-300'
                                  : 'text-slate-300'
                            }`}
                          >
                            {movement.direction === 'in'
                              ? '+'
                              : movement.direction === 'out'
                                ? '−'
                                : ''}
                            {formatNumber(movement.quantity)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-slate-400">
                            {[humanize(movement.referenceType), movement.referenceNumber]
                              .filter((value) => value && value !== '—')
                              .join(' · ') || '—'}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-slate-400">
                            {formatNumber(movement.previousQuantity)}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-slate-200">
                            {formatNumber(movement.newQuantity)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-slate-400">
                            {getId(movement.branchId) &&
                            getId(movement.branchId) === getId(selected.branchId)
                              ? getBranchName(selected)
                              : movement.branchId
                                ? 'Branch'
                                : 'No branch'}
                          </td>
                          <td className="max-w-[220px] px-3 py-2 text-slate-500">
                            {[movement.reason, movement.notes].filter(Boolean).join(' — ') ||
                              '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-4 text-center text-xs text-slate-600">
                  No stock movements recorded.
                </p>
              )}
            </section>

            <div className="flex flex-wrap justify-end gap-2 border-t border-white/[0.06] pt-4">
              <Button variant="secondary" onClick={() => openAdjustment(selected, 'in')}>
                <ArrowDownToLine size={14} />
                Stock In
              </Button>
              <Button
                variant="secondary"
                onClick={() => openAdjustment(selected, 'out')}
                disabled={getAvailable(selected) <= 0}
              >
                <ArrowUpFromLine size={14} />
                Stock Out
              </Button>
              <Button variant="secondary" onClick={() => openEdit(selected)}>
                <Edit3 size={14} />
                Edit
              </Button>
              <Button variant="danger" onClick={() => setConfirmDelete(selected)}>
                <Trash2 size={14} />
                Delete
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#11151c] p-5 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-rose-500/10 p-2 text-rose-300">
                <Trash2 size={18} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">Delete inventory?</h3>
                <p className="mt-1 text-sm text-slate-400">
                  {getProductName(confirmDelete)} · {getBranchName(confirmDelete)}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  Inventory can only be deleted when On Hand and Reserved are both 0.
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setConfirmDelete(null)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button variant="danger" onClick={performDelete} disabled={saving}>
                {saving && <Loader2 size={15} className="animate-spin" />}
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
