import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { getToken } from '../../services/api';
import {
  AlertCircle,
  Archive,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Edit3,
  Eye,
  FileText,
  Filter,
  Loader2,
  Package,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  ShoppingCart,
  Trash2,
  Truck,
  X,
  XCircle,
} from 'lucide-react';

const API_URL = (
  import.meta.env.VITE_API_URL ||
  'http://localhost:5000/api'
).replace(/\/$/, '');

const STATUS_OPTIONS = [
  'draft',
  'pending',
  'approved',
  'confirmed',
  'received',
  'cancelled',
];

const PAYMENT_STATUS_OPTIONS = [
  'unpaid',
  'partial',
  'partially_paid',
  'paid',
];

const emptyItem = () => ({
  productId: '',
  productCode: '',
  productName: '',
  unit: '',
  quantity: 1,
  unitPrice: 0,
  discountPercent: 0,
  gstRate: 0,
});

const emptyForm = () => ({
  vendorId: '',
  branchId: '',
  purchaseDate: new Date().toISOString().slice(0, 10),
  expectedDeliveryDate: '',
  referenceNumber: '',
  items: [emptyItem()],
  shippingAmount: 0,
  otherCharges: 0,
  adjustmentAmount: 0,
  notes: '',
  termsAndConditions: '',
  status: 'draft',
  paymentStatus: 'unpaid',
});


const formatCurrency = (value) => {
  const number = Number(value || 0);

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(number);
};

const formatDate = (value) => {
  if (!value) return '-';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const normalizeList = (response) => {
  const data = response?.data;

  if (Array.isArray(data)) return data;

  if (Array.isArray(data?.data)) return data.data;

  if (Array.isArray(response?.results)) return response.results;

  return [];
};

const getEntityName = (entity) => {
  if (!entity) return '';

  return (
    entity.name ||
    entity.displayName ||
    entity.branchName ||
    entity.vendorName ||
    ''
  );
};

const statusClass = (status) => {
  switch (status) {
    case 'confirmed':
      return 'border-blue-400/20 bg-blue-400/10 text-blue-300';

    case 'approved':
      return 'border-violet-400/20 bg-violet-400/10 text-violet-300';

    case 'received':
      return 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300';

    case 'cancelled':
      return 'border-red-400/20 bg-red-400/10 text-red-300';

    case 'pending':
      return 'border-amber-400/20 bg-amber-400/10 text-amber-300';

    default:
      return 'border-slate-400/20 bg-slate-400/10 text-slate-300';
  }
};

const paymentClass = (status) => {
  switch (status) {
    case 'paid':
      return 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300';

    case 'partial':
    case 'partially_paid':
      return 'border-amber-400/20 bg-amber-400/10 text-amber-300';

    default:
      return 'border-slate-400/20 bg-slate-400/10 text-slate-300';
  }
};

const calculateItem = (item) => {
  const quantity = Math.max(Number(item.quantity) || 0, 0);
  const unitPrice = Math.max(Number(item.unitPrice) || 0, 0);
  const discountPercent = Math.min(
    Math.max(Number(item.discountPercent) || 0, 0),
    100
  );
  const gstRate = Math.min(
    Math.max(Number(item.gstRate) || 0, 0),
    100
  );

  const subtotal = quantity * unitPrice;
  const discountAmount =
    subtotal * (discountPercent / 100);

  const taxableAmount =
    subtotal - discountAmount;

  const gstAmount =
    taxableAmount * (gstRate / 100);

  const totalAmount =
    taxableAmount + gstAmount;

  return {
    quantity,
    unitPrice,
    discountPercent,
    gstRate,
    subtotal,
    discountAmount,
    taxableAmount,
    gstAmount,
    totalAmount,
  };
};

const calculateTotals = (items, shipping, other, adjustment) => {
  let subtotal = 0;
  let discountAmount = 0;
  let taxableAmount = 0;
  let gstAmount = 0;

  items.forEach((item) => {
    const calculated = calculateItem(item);

    subtotal += calculated.subtotal;
    discountAmount += calculated.discountAmount;
    taxableAmount += calculated.taxableAmount;
    gstAmount += calculated.gstAmount;
  });

  const shippingAmount =
    Math.max(Number(shipping) || 0, 0);

  const otherCharges =
    Math.max(Number(other) || 0, 0);

  const adjustmentAmount =
    Number(adjustment) || 0;

  const grandTotal =
    taxableAmount +
    gstAmount +
    shippingAmount +
    otherCharges +
    adjustmentAmount;

  return {
    subtotal,
    discountAmount,
    taxableAmount,
    gstAmount,
    shippingAmount,
    otherCharges,
    adjustmentAmount,
    grandTotal,
  };
};

const Purchase = () => {
  const [purchases, setPurchases] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [branches, setBranches] = useState([]);
  const [products, setProducts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadingFormData, setLoadingFormData] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');

  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  const [view, setView] = useState('list');

  const [modal, setModal] = useState(null);

  const [form, setForm] = useState(emptyForm());

  const [selectedPurchase, setSelectedPurchase] =
    useState(null);

  const [editingId, setEditingId] = useState(null);

  const [deleteTarget, setDeleteTarget] =
    useState(null);

  const [restoreTarget, setRestoreTarget] =
    useState(null);

  const [statusTarget, setStatusTarget] =
    useState(null);

  const [paymentTarget, setPaymentTarget] =
    useState(null);

  const [newStatus, setNewStatus] =
    useState('draft');

  const [newPaymentStatus, setNewPaymentStatus] =
    useState('unpaid');

  const totals = useMemo(
    () =>
      calculateTotals(
        form.items,
        form.shippingAmount,
        form.otherCharges,
        form.adjustmentAmount
      ),
    [
      form.items,
      form.shippingAmount,
      form.otherCharges,
      form.adjustmentAmount,
    ]
  );

  const apiRequest = useCallback(
    async (endpoint, options = {}) => {
      const token = getToken();

      const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(
        `${API_URL}${endpoint}`,
        {
          ...options,
          headers,
        }
      );

      let data = null;

      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok) {
        throw new Error(
          data?.message ||
            `Request failed with status ${response.status}`
        );
      }

      return data;
    },
    []
  );

  const fetchPurchases = useCallback(
    async (targetPage = page) => {
      setLoading(true);
      setError('');

      try {
        const params = new URLSearchParams();

        params.set('page', targetPage);
        params.set('limit', limit);

        if (search.trim()) {
          params.set(
            'search',
            search.trim()
          );
        }

        if (statusFilter) {
          params.set(
            'status',
            statusFilter
          );
        }

        if (paymentFilter) {
          params.set(
            'paymentStatus',
            paymentFilter
          );
        }

        if (branchFilter) {
          params.set(
            'branchId',
            branchFilter
          );
        }

        const response =
          await apiRequest(
            `/purchases?${params.toString()}`
          );

        const list =
          Array.isArray(response?.data)
            ? response.data
            : normalizeList(response);

        setPurchases(list);

        setPagination(
          response?.pagination || {
            page: targetPage,
            limit,
            total: list.length,
            totalPages:
              list.length > 0 ? 1 : 0,
            hasNextPage: false,
            hasPreviousPage:
              targetPage > 1,
          }
        );
      } catch (err) {
        setError(
          err.message ||
            'Unable to fetch purchases'
        );
        setPurchases([]);
      } finally {
        setLoading(false);
      }
    },
    [
      apiRequest,
      branchFilter,
      limit,
      page,
      paymentFilter,
      search,
      statusFilter,
    ]
  );

  const fetchFormData = useCallback(
    async () => {
      setLoadingFormData(true);

      try {
        const [
          vendorsResponse,
          branchesResponse,
          productsResponse,
        ] = await Promise.all([
          apiRequest(
            '/vendors?status=active&limit=100'
          ),
          apiRequest(
            '/branches?status=active&limit=100'
          ),
          apiRequest(
            '/products?status=active&limit=100'
          ),
        ]);

        setVendors(
          normalizeList(
            vendorsResponse
          )
        );

        setBranches(
          normalizeList(
            branchesResponse
          )
        );

        setProducts(
          normalizeList(
            productsResponse
          )
        );
      } catch (err) {
        setError(
          err.message ||
            'Unable to load purchase form data'
        );
      } finally {
        setLoadingFormData(false);
      }
    },
    [apiRequest]
  );

  useEffect(() => {
    fetchPurchases(page);
  }, [
    page,
    statusFilter,
    paymentFilter,
    branchFilter,
    fetchPurchases,
  ]);

  useEffect(() => {
    fetchFormData();
  }, [fetchFormData]);

  const showSuccess = (message) => {
    setSuccess(message);

    window.setTimeout(() => {
      setSuccess('');
    }, 3500);
  };

  const openCreate = async () => {
    setEditingId(null);
    setSelectedPurchase(null);
    setForm(emptyForm());
    setModal('form');

    if (
      vendors.length === 0 ||
      branches.length === 0 ||
      products.length === 0
    ) {
      await fetchFormData();
    }
  };

  const openEdit = async (purchase) => {
    setEditingId(purchase._id);
    setSelectedPurchase(null);

    if (
      vendors.length === 0 ||
      branches.length === 0 ||
      products.length === 0
    ) {
      await fetchFormData();
    }

    const mappedItems =
      (purchase.items || []).map(
        (item) => {
          const product =
            item.productId;

          return {
            productId:
              typeof product === 'object'
                ? product?._id
                : product || '',
            productCode:
              item.productCode ||
              product?.productCode ||
              '',
            productName:
              item.productName ||
              product?.name ||
              '',
            unit:
              item.unit ||
              product?.unit ||
              '',
            quantity:
              item.quantity ?? 1,
            unitPrice:
              item.unitPrice ?? 0,
            discountPercent:
              item.discountPercent ?? 0,
            gstRate:
              item.gstRate ??
              product?.gstRate ??
              0,
          };
        }
      );

    setForm({
      vendorId:
        typeof purchase.vendorId === 'object'
          ? purchase.vendorId?._id || ''
          : purchase.vendorId || '',
      branchId:
        typeof purchase.branchId === 'object'
          ? purchase.branchId?._id || ''
          : purchase.branchId || '',
      purchaseDate: purchase.purchaseDate
        ? new Date(
            purchase.purchaseDate
          )
            .toISOString()
            .slice(0, 10)
        : '',
      expectedDeliveryDate:
        purchase.expectedDeliveryDate
          ? new Date(
              purchase.expectedDeliveryDate
            )
              .toISOString()
              .slice(0, 10)
          : '',
      referenceNumber:
        purchase.referenceNumber || '',
      items:
        mappedItems.length > 0
          ? mappedItems
          : [emptyItem()],
      shippingAmount:
        purchase.shippingAmount ?? 0,
      otherCharges:
        purchase.otherCharges ?? 0,
      adjustmentAmount:
        purchase.adjustmentAmount ?? 0,
      notes:
        purchase.notes || '',
      termsAndConditions:
        purchase.termsAndConditions || '',
      status:
        purchase.status || 'draft',
      paymentStatus:
        purchase.paymentStatus ||
        'unpaid',
    });

    setModal('form');
  };

  const openView = async (purchase) => {
    setModal('view');
    setSelectedPurchase(purchase);

    try {
      const response =
        await apiRequest(
          `/purchases/${purchase._id}`
        );

      if (response?.data) {
        setSelectedPurchase(
          response.data
        );
      }
    } catch (err) {
      setError(
        err.message ||
          'Unable to fetch purchase details'
      );
    }
  };

  const handleFormChange = (
    field,
    value
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleItemChange = (
    index,
    field,
    value
  ) => {
    setForm((current) => {
      const items = [...current.items];

      items[index] = {
        ...items[index],
        [field]: value,
      };

      if (field === 'productId') {
        const product =
          products.find(
            (item) =>
              item._id === value
          );

        if (product) {
          items[index] = {
            ...items[index],
            productId:
              product._id,
            productCode:
              product.productCode || '',
            productName:
              product.name ||
              product.displayName ||
              '',
            unit:
              product.unit || 'PCS',
            gstRate:
              product.gstRate ?? 0,
            unitPrice:
              product.purchasePrice ?? 0,
          };
        }
      }

      return {
        ...current,
        items,
      };
    });
  };

  const addItem = () => {
    setForm((current) => ({
      ...current,
      items: [
        ...current.items,
        emptyItem(),
      ],
    }));
  };

  const removeItem = (index) => {
    setForm((current) => {
      if (current.items.length === 1) {
        return {
          ...current,
          items: [emptyItem()],
        };
      }

      return {
        ...current,
        items: current.items.filter(
          (_, itemIndex) =>
            itemIndex !== index
        ),
      };
    });
  };

  const validateForm = () => {
    if (!form.vendorId) {
      return 'Please select a vendor';
    }

    if (!form.branchId) {
      return 'Please select a branch';
    }

    if (!form.purchaseDate) {
      return 'Purchase date is required';
    }

    if (
      form.expectedDeliveryDate &&
      form.expectedDeliveryDate <
        form.purchaseDate
    ) {
      return 'Expected delivery date cannot be before purchase date';
    }

    if (
      !form.items.length
    ) {
      return 'Add at least one product';
    }

    for (
      let index = 0;
      index < form.items.length;
      index += 1
    ) {
      const item =
        form.items[index];

      if (!item.productId) {
        return `Please select product for item ${index + 1}`;
      }

      if (
        Number(item.quantity) <= 0
      ) {
        return `Quantity must be greater than 0 for item ${index + 1}`;
      }

      if (
        Number(item.unitPrice) < 0
      ) {
        return `Unit price cannot be negative for item ${index + 1}`;
      }

      if (
        Number(item.discountPercent) < 0 ||
        Number(item.discountPercent) > 100
      ) {
        return `Discount must be between 0 and 100 for item ${index + 1}`;
      }

      if (
        Number(item.gstRate) < 0 ||
        Number(item.gstRate) > 100
      ) {
        return `GST rate must be between 0 and 100 for item ${index + 1}`;
      }
    }

    return '';
  };

  const buildPayload = () => ({
    vendorId:
      form.vendorId,
    branchId:
      form.branchId,
    purchaseDate:
      form.purchaseDate,
    expectedDeliveryDate:
      form.expectedDeliveryDate ||
      undefined,
    referenceNumber:
      form.referenceNumber.trim(),
    items: form.items.map(
      (item) => ({
        productId:
          item.productId,
        quantity:
          Number(item.quantity) || 0,
        unitPrice:
          Number(item.unitPrice) || 0,
        discountPercent:
          Number(
            item.discountPercent
          ) || 0,
        gstRate:
          Number(item.gstRate) || 0,
      })
    ),
    shippingAmount:
      Number(form.shippingAmount) || 0,
    otherCharges:
      Number(form.otherCharges) || 0,
    adjustmentAmount:
      Number(form.adjustmentAmount) || 0,
    notes:
      form.notes.trim(),
    termsAndConditions:
      form.termsAndConditions.trim(),
    status:
      form.status,
    paymentStatus:
      form.paymentStatus,
  });

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validationError =
      validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError('');

    try {
      const payload =
        buildPayload();

      let response;

      if (editingId) {
        response =
          await apiRequest(
            `/purchases/${editingId}`,
            {
              method: 'PUT',
              body: JSON.stringify(
                payload
              ),
            }
          );
      } else {
        response =
          await apiRequest(
            '/purchases',
            {
              method: 'POST',
              body: JSON.stringify(
                payload
              ),
            }
          );
      }

      showSuccess(
        response?.message ||
          (editingId
            ? 'Purchase updated successfully'
            : 'Purchase created successfully')
      );

      setModal(null);
      setEditingId(null);
      setForm(emptyForm());

      await fetchPurchases(page);
    } catch (err) {
      setError(
        err.message ||
          'Unable to save purchase'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget?._id) return;

    setSaving(true);
    setError('');

    try {
      const response =
        await apiRequest(
          `/purchases/${deleteTarget._id}`,
          {
            method: 'DELETE',
          }
        );

      showSuccess(
        response?.message ||
          'Purchase deleted successfully'
      );

      setDeleteTarget(null);

      await fetchPurchases(page);
    } catch (err) {
      setError(
        err.message ||
          'Unable to delete purchase'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleRestore = async () => {
    if (!restoreTarget?._id) return;

    setSaving(true);
    setError('');

    try {
      const response =
        await apiRequest(
          `/purchases/${restoreTarget._id}/restore`,
          {
            method: 'PATCH',
          }
        );

      showSuccess(
        response?.message ||
          'Purchase restored successfully'
      );

      setRestoreTarget(null);

      await fetchPurchases(page);
    } catch (err) {
      setError(
        err.message ||
          'Unable to restore purchase'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!statusTarget?._id) return;

    setSaving(true);
    setError('');

    try {
      const response =
        await apiRequest(
          `/purchases/${statusTarget._id}`,
          {
            method: 'PUT',
            body: JSON.stringify({
              status: newStatus,
            }),
          }
        );

      showSuccess(
        response?.message ||
          'Purchase status updated successfully'
      );

      setStatusTarget(null);

      await fetchPurchases(page);
    } catch (err) {
      setError(
        err.message ||
          'Unable to update purchase status'
      );
    } finally {
      setSaving(false);
    }
  };

  const handlePaymentUpdate = async () => {
    if (!paymentTarget?._id) return;

    setSaving(true);
    setError('');

    try {
      const response =
        await apiRequest(
          `/purchases/${paymentTarget._id}`,
          {
            method: 'PUT',
            body: JSON.stringify({
              paymentStatus:
                newPaymentStatus,
            }),
          }
        );

      showSuccess(
        response?.message ||
          'Payment status updated successfully'
      );

      setPaymentTarget(null);

      await fetchPurchases(page);
    } catch (err) {
      setError(
        err.message ||
          'Unable to update payment status'
      );
    } finally {
      setSaving(false);
    }
  };

  const openStatusModal = (purchase) => {
    setStatusTarget(purchase);
    setNewStatus(
      purchase.status || 'draft'
    );
  };

  const openPaymentModal = (
    purchase
  ) => {
    setPaymentTarget(purchase);
    setNewPaymentStatus(
      purchase.paymentStatus ||
        'unpaid'
    );
  };

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('');
    setPaymentFilter('');
    setBranchFilter('');
    setPage(1);
  };

  const vendorName = (purchase) => {
    if (
      purchase.vendorId &&
      typeof purchase.vendorId === 'object'
    ) {
      return (
        purchase.vendorId.displayName ||
        purchase.vendorId.name ||
        '-'
      );
    }

    const vendor =
      vendors.find(
        (item) =>
          item._id ===
          purchase.vendorId
      );

    return (
      vendor?.displayName ||
      vendor?.name ||
      '-'
    );
  };

  const branchName = (purchase) => {
    if (
      purchase.branchId &&
      typeof purchase.branchId === 'object'
    ) {
      return (
        purchase.branchId.name ||
        purchase.branchId.branchName ||
        '-'
      );
    }

    const branch =
      branches.find(
        (item) =>
          item._id ===
          purchase.branchId
      );

    return (
      branch?.name ||
      branch?.branchName ||
      '-'
    );
  };

  return (
    <div className="min-h-screen w-full bg-[#080b12] text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-cyan-500/5 blur-3xl" />
        <div className="absolute -right-32 top-40 h-96 w-96 rounded-full bg-violet-500/5 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-96 w-96 rounded-full bg-blue-500/5 blur-3xl" />
      </div>

      <div className="relative z-10 w-full px-3 py-4 sm:px-5 lg:px-7 xl:px-9">
        {/* HEADER */}
        <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-cyan-400">
              <ShoppingCart className="h-4 w-4" />
              Procurement
            </div>

            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Purchase Orders
            </h1>

            <p className="mt-1 text-sm text-slate-400">
              Manage vendors, products, purchase orders and payment status.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                fetchPurchases(page)
              }
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm font-medium text-slate-200 transition hover:bg-white/[0.08]"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  loading
                    ? 'animate-spin'
                    : ''
                }`}
              />
              Refresh
            </button>

            <button
              type="button"
              onClick={openCreate}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-slate-950 shadow-lg shadow-white/5 transition hover:bg-slate-200"
            >
              <Plus className="h-4 w-4" />
              New Purchase
            </button>
          </div>
        </div>

        {/* ALERTS */}
        {error && (
          <div className="mb-4 flex items-start gap-3 rounded-2xl border border-red-400/20 bg-red-500/[0.08] px-4 py-3 text-sm text-red-200">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
            <div className="flex-1">
              {error}
            </div>
            <button
              type="button"
              onClick={() => setError('')}
              className="text-red-300/70 hover:text-red-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {success && (
          <div className="mb-4 flex items-center gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.08] px-4 py-3 text-sm text-emerald-200">
            <Check className="h-5 w-5 text-emerald-400" />
            {success}
          </div>
        )}

        {/* SUMMARY */}
        <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <SummaryCard
            icon={<ClipboardList className="h-5 w-5" />}
            label="Total Orders"
            value={
              pagination.total || 0
            }
          />

          <SummaryCard
            icon={<ClockIcon />}
            label="Pending"
            value={purchases.filter(
              (item) =>
                item.status ===
                'pending'
            ).length}
          />

          <SummaryCard
            icon={<Truck className="h-5 w-5" />}
            label="Received"
            value={purchases.filter(
              (item) =>
                item.status ===
                'received'
            ).length}
          />

          <SummaryCard
            icon={<Package className="h-5 w-5" />}
            label="Page Value"
            value={formatCurrency(
              purchases.reduce(
                (sum, item) =>
                  sum +
                  Number(
                    item.grandTotal || 0
                  ),
                0
              )
            )}
          />
        </div>

        {/* FILTER BAR */}
        <div className="mb-4 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-3 shadow-2xl shadow-black/10 backdrop-blur-xl">
          <div className="flex flex-col gap-3 xl:flex-row">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(
                    event.target.value
                  );
                  setPage(1);
                }}
                onKeyDown={(event) => {
                  if (
                    event.key ===
                    'Enter'
                  ) {
                    fetchPurchases(1);
                  }
                }}
                placeholder="Search purchase number, reference..."
                className="h-11 w-full rounded-xl border border-white/[0.08] bg-black/20 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/10"
              />
            </div>

            <SelectField
              value={statusFilter}
              onChange={(value) => {
                setStatusFilter(value);
                setPage(1);
              }}
              placeholder="All statuses"
              options={STATUS_OPTIONS}
            />

            <SelectField
              value={paymentFilter}
              onChange={(value) => {
                setPaymentFilter(value);
                setPage(1);
              }}
              placeholder="All payments"
              options={PAYMENT_STATUS_OPTIONS}
            />

            <SelectField
              value={branchFilter}
              onChange={(value) => {
                setBranchFilter(value);
                setPage(1);
              }}
              placeholder="All branches"
              options={branches.map(
                (branch) => ({
                  value: branch._id,
                  label:
                    branch.name ||
                    branch.branchName ||
                    branch.code ||
                    branch._id,
                })
              )}
            />

            {(search ||
              statusFilter ||
              paymentFilter ||
              branchFilter) && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-white/[0.08] px-4 text-sm text-slate-300 transition hover:bg-white/[0.06]"
              >
                <X className="h-4 w-4" />
                Clear
              </button>
            )}

            <button
              type="button"
              onClick={() =>
                fetchPurchases(1)
              }
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 text-sm font-medium text-cyan-300 transition hover:bg-cyan-400/15"
            >
              <Filter className="h-4 w-4" />
              Apply
            </button>
          </div>
        </div>

        {/* TABLE */}
        <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d111a]/90 shadow-2xl shadow-black/20">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px]">
              <thead>
                <tr className="border-b border-white/[0.07] bg-white/[0.025] text-left">
                  <th className="px-5 py-4 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Purchase
                  </th>
                  <th className="px-5 py-4 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Vendor
                  </th>
                  <th className="px-5 py-4 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Branch
                  </th>
                  <th className="px-5 py-4 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Date
                  </th>
                  <th className="px-5 py-4 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Total
                  </th>
                  <th className="px-5 py-4 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Status
                  </th>
                  <th className="px-5 py-4 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Payment
                  </th>
                  <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/[0.05]">
                {loading ? (
                  <TableLoading />
                ) : purchases.length ===
                  0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-6 py-16 text-center"
                    >
                      <div className="mx-auto flex max-w-sm flex-col items-center">
                        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03]">
                          <ShoppingCart className="h-6 w-6 text-slate-600" />
                        </div>

                        <h3 className="text-sm font-semibold text-slate-200">
                          No purchase orders found
                        </h3>

                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          Create a purchase order or change your filters.
                        </p>

                        <button
                          type="button"
                          onClick={openCreate}
                          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-semibold text-slate-950"
                        >
                          <Plus className="h-4 w-4" />
                          Create Purchase
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  purchases.map(
                    (purchase) => (
                      <PurchaseRow
                        key={
                          purchase._id
                        }
                        purchase={
                          purchase
                        }
                        vendorName={vendorName(
                          purchase
                        )}
                        branchName={branchName(
                          purchase
                        )}
                        onView={() =>
                          openView(
                            purchase
                          )}
                        onEdit={() =>
                          openEdit(
                            purchase
                          )}
                        onDelete={() =>
                          setDeleteTarget(
                            purchase
                          )}
                        onRestore={() =>
                          setRestoreTarget(
                            purchase
                          )}
                        onStatus={() =>
                          openStatusModal(
                            purchase
                          )}
                        onPayment={() =>
                          openPaymentModal(
                            purchase
                          )}
                      />
                    )
                  )
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION */}
          {!loading &&
            purchases.length > 0 && (
              <div className="flex flex-col gap-3 border-t border-white/[0.07] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-xs text-slate-500">
                  Showing{' '}
                  <span className="text-slate-300">
                    {(pagination.page -
                      1) *
                      pagination.limit +
                      1}
                  </span>{' '}
                  to{' '}
                  <span className="text-slate-300">
                    {Math.min(
                      pagination.page *
                        pagination.limit,
                      pagination.total
                    )}
                  </span>{' '}
                  of{' '}
                  <span className="text-slate-300">
                    {pagination.total}
                  </span>{' '}
                  purchases
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={
                      !pagination.hasPreviousPage
                    }
                    onClick={() =>
                      setPage(
                        (current) =>
                          Math.max(
                            current - 1,
                            1
                          )
                      )
                    }
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] text-slate-400 transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  <div className="min-w-9 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-center text-xs font-medium text-slate-200">
                    {pagination.page}
                  </div>

                  <button
                    type="button"
                    disabled={
                      !pagination.hasNextPage
                    }
                    onClick={() =>
                      setPage(
                        (current) =>
                          current + 1
                      )
                    }
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] text-slate-400 transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
        </div>
      </div>

      {/* CREATE / EDIT MODAL */}
      {modal === 'form' && (
        <Modal
          title={
            editingId
              ? 'Edit Purchase Order'
              : 'Create Purchase Order'
          }
          subtitle={
            editingId
              ? 'Update purchase details and line items.'
              : 'Create a new purchase order for your company.'
          }
          onClose={() => {
            if (!saving) {
              setModal(null);
            }
          }}
          wide
        >
          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >
            {loadingFormData && (
              <div className="flex items-center gap-2 rounded-xl border border-cyan-400/15 bg-cyan-400/[0.06] px-4 py-3 text-xs text-cyan-300">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading vendors, branches and products...
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <FormSelect
                label="Vendor"
                required
                value={form.vendorId}
                onChange={(value) =>
                  handleFormChange(
                    'vendorId',
                    value
                  )
                }
                options={vendors.map(
                  (vendor) => ({
                    value: vendor._id,
                    label:
                      vendor.displayName ||
                      vendor.name ||
                      vendor.vendorCode ||
                      vendor._id,
                  })
                )}
              />

              <FormSelect
                label="Branch"
                required
                value={form.branchId}
                onChange={(value) =>
                  handleFormChange(
                    'branchId',
                    value
                  )
                }
                options={branches.map(
                  (branch) => ({
                    value: branch._id,
                    label:
                      branch.name ||
                      branch.branchName ||
                      branch.code ||
                      branch._id,
                  })
                )}
              />

              <FormInput
                label="Purchase Date"
                type="date"
                required
                value={
                  form.purchaseDate
                }
                onChange={(event) =>
                  handleFormChange(
                    'purchaseDate',
                    event.target.value
                  )
                }
              />

              <FormInput
                label="Expected Delivery"
                type="date"
                value={
                  form.expectedDeliveryDate
                }
                onChange={(event) =>
                  handleFormChange(
                    'expectedDeliveryDate',
                    event.target.value
                  )
                }
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormInput
                label="Reference Number"
                placeholder="Supplier reference / quotation number"
                value={
                  form.referenceNumber
                }
                onChange={(event) =>
                  handleFormChange(
                    'referenceNumber',
                    event.target.value
                  )
                }
              />

              <div className="grid grid-cols-2 gap-3">
                <FormSelect
                  label="Status"
                  value={
                    form.status
                  }
                  onChange={(value) =>
                    handleFormChange(
                      'status',
                      value
                    )
                  }
                  options={STATUS_OPTIONS.map(
                    (value) => ({
                      value,
                      label:
                        formatLabel(
                          value
                        ),
                    })
                  )}
                />

                <FormSelect
                  label="Payment Status"
                  value={
                    form.paymentStatus
                  }
                  onChange={(value) =>
                    handleFormChange(
                      'paymentStatus',
                      value
                    )
                  }
                  options={PAYMENT_STATUS_OPTIONS.map(
                    (value) => ({
                      value,
                      label:
                        formatLabel(
                          value
                        ),
                    })
                  )}
                />
              </div>
            </div>

            {/* ITEMS */}
            <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-black/10">
              <div className="flex flex-col gap-3 border-b border-white/[0.07] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    Purchase Items
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Add products and pricing details.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={addItem}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-xs font-semibold text-cyan-300 transition hover:bg-cyan-400/15"
                >
                  <Plus className="h-4 w-4" />
                  Add Item
                </button>
              </div>

              <div className="space-y-3 p-3">
                {form.items.map(
                  (item, index) => {
                    const calculated =
                      calculateItem(
                        item
                      );

                    return (
                      <div
                        key={index}
                        className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3"
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.06] text-xs font-semibold text-slate-300">
                              {index +
                                1}
                            </span>

                            <div>
                              <p className="text-xs font-semibold text-slate-200">
                                Item{' '}
                                {index +
                                  1}
                              </p>
                              {item.productCode && (
                                <p className="text-[10px] text-slate-600">
                                  {
                                    item.productCode
                                  }
                                </p>
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              removeItem(
                                index
                              )
                            }
                            className="rounded-lg p-2 text-slate-600 transition hover:bg-red-500/10 hover:text-red-400"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
                          <div className="xl:col-span-2">
                            <FormSelect
                              label="Product"
                              required
                              value={
                                item.productId
                              }
                              onChange={(
                                value
                              ) =>
                                handleItemChange(
                                  index,
                                  'productId',
                                  value
                                )
                              }
                              options={products.map(
                                (
                                  product
                                ) => ({
                                  value:
                                    product._id,
                                  label:
                                    `${product.productCode || ''} ${product.name || product.displayName || ''}`.trim(),
                                })
                              )}
                            />
                          </div>

                          <FormInput
                            label="Quantity"
                            type="number"
                            min="0"
                            step="0.01"
                            value={
                              item.quantity
                            }
                            onChange={(
                              event
                            ) =>
                              handleItemChange(
                                index,
                                'quantity',
                                event.target
                                  .value
                              )
                            }
                          />

                          <FormInput
                            label="Unit Price"
                            type="number"
                            min="0"
                            step="0.01"
                            value={
                              item.unitPrice
                            }
                            onChange={(
                              event
                            ) =>
                              handleItemChange(
                                index,
                                'unitPrice',
                                event.target
                                  .value
                              )
                            }
                          />

                          <FormInput
                            label="Discount %"
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={
                              item.discountPercent
                            }
                            onChange={(
                              event
                            ) =>
                              handleItemChange(
                                index,
                                'discountPercent',
                                event.target
                                  .value
                              )
                            }
                          />

                          <FormInput
                            label="GST %"
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={
                              item.gstRate
                            }
                            onChange={(
                              event
                            ) =>
                              handleItemChange(
                                index,
                                'gstRate',
                                event.target
                                  .value
                              )
                            }
                          />
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                          <MiniTotal
                            label="Subtotal"
                            value={formatCurrency(
                              calculated.subtotal
                            )}
                          />

                          <MiniTotal
                            label="Discount"
                            value={formatCurrency(
                              calculated.discountAmount
                            )}
                          />

                          <MiniTotal
                            label="GST"
                            value={formatCurrency(
                              calculated.gstAmount
                            )}
                          />

                          <MiniTotal
                            label="Line Total"
                            value={formatCurrency(
                              calculated.totalAmount
                            )}
                            emphasis
                          />
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            </div>

            {/* CHARGES */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_360px]">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormInput
                  label="Shipping Amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={
                    form.shippingAmount
                  }
                  onChange={(event) =>
                    handleFormChange(
                      'shippingAmount',
                      event.target.value
                    )
                  }
                />

                <FormInput
                  label="Other Charges"
                  type="number"
                  min="0"
                  step="0.01"
                  value={
                    form.otherCharges
                  }
                  onChange={(event) =>
                    handleFormChange(
                      'otherCharges',
                      event.target.value
                    )
                  }
                />

                <FormInput
                  label="Adjustment"
                  type="number"
                  step="0.01"
                  value={
                    form.adjustmentAmount
                  }
                  onChange={(event) =>
                    handleFormChange(
                      'adjustmentAmount',
                      event.target.value
                    )
                  }
                />

                <div className="hidden sm:block" />
              </div>

              <div className="rounded-2xl border border-cyan-400/10 bg-cyan-400/[0.035] p-4">
                <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-300">
                  <FileText className="h-4 w-4" />
                  Order Summary
                </div>

                <div className="space-y-2 text-sm">
                  <SummaryLine
                    label="Subtotal"
                    value={formatCurrency(
                      totals.subtotal
                    )}
                  />

                  <SummaryLine
                    label="Discount"
                    value={`-${formatCurrency(
                      totals.discountAmount
                    )}`}
                  />

                  <SummaryLine
                    label="Taxable Amount"
                    value={formatCurrency(
                      totals.taxableAmount
                    )}
                  />

                  <SummaryLine
                    label="GST"
                    value={formatCurrency(
                      totals.gstAmount
                    )}
                  />

                  <SummaryLine
                    label="Shipping"
                    value={formatCurrency(
                      totals.shippingAmount
                    )}
                  />

                  <SummaryLine
                    label="Other Charges"
                    value={formatCurrency(
                      totals.otherCharges
                    )}
                  />

                  <SummaryLine
                    label="Adjustment"
                    value={formatCurrency(
                      totals.adjustmentAmount
                    )}
                  />

                  <div className="my-3 border-t border-white/[0.08]" />

                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200">
                      Grand Total
                    </span>

                    <span className="text-xl font-bold text-white">
                      {formatCurrency(
                        totals.grandTotal
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* NOTES */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <FormTextarea
                label="Notes"
                rows={4}
                value={form.notes}
                onChange={(event) =>
                  handleFormChange(
                    'notes',
                    event.target.value
                  )
                }
                placeholder="Internal notes..."
              />

              <FormTextarea
                label="Terms & Conditions"
                rows={4}
                value={
                  form.termsAndConditions
                }
                onChange={(event) =>
                  handleFormChange(
                    'termsAndConditions',
                    event.target.value
                  )
                }
                placeholder="Payment terms, delivery terms..."
              />
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-white/[0.07] pt-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={saving}
                onClick={() =>
                  setModal(null)
                }
                className="h-11 rounded-xl border border-white/[0.08] px-5 text-sm font-medium text-slate-300 transition hover:bg-white/[0.05] disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-6 text-sm font-semibold text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    {editingId
                      ? 'Update Purchase'
                      : 'Create Purchase'}
                  </>
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* VIEW MODAL */}
      {modal === 'view' &&
        selectedPurchase && (
          <PurchaseDetailsModal
            purchase={
              selectedPurchase
            }
            vendorName={vendorName(
              selectedPurchase
            )}
            branchName={branchName(
              selectedPurchase
            )}
            onClose={() =>
              setModal(null)
            }
            onEdit={() => {
              setModal(null);
              openEdit(
                selectedPurchase
              );
            }}
            onStatus={() => {
              setModal(null);
              openStatusModal(
                selectedPurchase
              );
            }}
            onPayment={() => {
              setModal(null);
              openPaymentModal(
                selectedPurchase
              );
            }}
          />
        )}

      {/* DELETE MODAL */}
      {deleteTarget && (
        <ConfirmModal
          title="Delete Purchase Order?"
          message={`Are you sure you want to delete ${deleteTarget.purchaseNumber || 'this purchase order'}? This will use the existing soft-delete operation.`}
          confirmText="Delete Purchase"
          danger
          loading={saving}
          onCancel={() =>
            !saving &&
            setDeleteTarget(null)
          }
          onConfirm={handleDelete}
        />
      )}

      {/* RESTORE MODAL */}
      {restoreTarget && (
        <ConfirmModal
          title="Restore Purchase Order?"
          message={`Restore ${restoreTarget.purchaseNumber || 'this purchase order'}?`}
          confirmText="Restore"
          loading={saving}
          onCancel={() =>
            !saving &&
            setRestoreTarget(null)
          }
          onConfirm={handleRestore}
        />
      )}

      {/* STATUS MODAL */}
      {statusTarget && (
        <Modal
          title="Update Purchase Status"
          subtitle={
            statusTarget.purchaseNumber ||
            'Purchase Order'
          }
          onClose={() =>
            !saving &&
            setStatusTarget(null)
          }
        >
          <div className="space-y-4">
            <FormSelect
              label="Purchase Status"
              value={newStatus}
              onChange={setNewStatus}
              options={STATUS_OPTIONS.map(
                (value) => ({
                  value,
                  label:
                    formatLabel(
                      value
                    ),
                })
              )}
            />

            <div className="flex justify-end gap-2 border-t border-white/[0.07] pt-4">
              <button
                type="button"
                disabled={saving}
                onClick={() =>
                  setStatusTarget(null)
                }
                className="rounded-xl border border-white/[0.08] px-4 py-2.5 text-sm text-slate-300"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={
                  handleStatusUpdate
                }
                className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-slate-950"
              >
                {saving && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                Update Status
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* PAYMENT MODAL */}
      {paymentTarget && (
        <Modal
          title="Update Payment Status"
          subtitle={
            paymentTarget.purchaseNumber ||
            'Purchase Order'
          }
          onClose={() =>
            !saving &&
            setPaymentTarget(null)
          }
        >
          <div className="space-y-4">
            <FormSelect
              label="Payment Status"
              value={
                newPaymentStatus
              }
              onChange={
                setNewPaymentStatus
              }
              options={PAYMENT_STATUS_OPTIONS.map(
                (value) => ({
                  value,
                  label:
                    formatLabel(
                      value
                    ),
                })
              )}
            />

            <div className="flex justify-end gap-2 border-t border-white/[0.07] pt-4">
              <button
                type="button"
                disabled={saving}
                onClick={() =>
                  setPaymentTarget(
                    null
                  )
                }
                className="rounded-xl border border-white/[0.08] px-4 py-2.5 text-sm text-slate-300"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={
                  handlePaymentUpdate
                }
                className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-slate-950"
              >
                {saving && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                Update Payment
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

/* ============================================================
   COMPONENTS
============================================================ */

const SummaryCard = ({
  icon,
  label,
  value,
}) => (
  <div className="group rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 shadow-xl shadow-black/10 transition hover:border-white/[0.12] hover:bg-white/[0.035]">
    <div className="mb-3 flex items-center justify-between">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.04] text-slate-400 transition group-hover:text-white">
        {icon}
      </div>

      <ArrowRight className="h-4 w-4 text-slate-700 transition group-hover:text-slate-500" />
    </div>

    <p className="text-xs text-slate-500">
      {label}
    </p>

    <p className="mt-1 truncate text-lg font-bold text-white sm:text-xl">
      {value}
    </p>
  </div>
);

const PurchaseRow = ({
  purchase,
  vendorName,
  branchName,
  onView,
  onEdit,
  onDelete,
  onRestore,
  onStatus,
  onPayment,
}) => {
  const deleted =
    !!purchase.deletedAt;

  return (
    <tr className="group transition hover:bg-white/[0.025]">
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.035]">
            <FileText className="h-4 w-4 text-slate-400" />
          </div>

          <div className="min-w-0">
            <button
              type="button"
              onClick={onView}
              className="block max-w-[190px] truncate text-left text-sm font-semibold text-slate-100 transition hover:text-cyan-300"
            >
              {purchase.purchaseNumber ||
                'Purchase Order'}
            </button>

            <p className="mt-0.5 max-w-[190px] truncate text-[11px] text-slate-600">
              {purchase.referenceNumber ||
                'No reference'}
            </p>
          </div>
        </div>
      </td>

      <td className="px-5 py-4">
        <p className="max-w-[180px] truncate text-sm text-slate-300">
          {vendorName}
        </p>
      </td>

      <td className="px-5 py-4">
        <p className="max-w-[170px] truncate text-sm text-slate-400">
          {branchName}
        </p>
      </td>

      <td className="px-5 py-4 text-sm text-slate-400">
        {formatDate(
          purchase.purchaseDate
        )}
      </td>

      <td className="px-5 py-4">
        <p className="text-sm font-semibold text-white">
          {formatCurrency(
            purchase.grandTotal
          )}
        </p>

        <p className="mt-0.5 text-[10px] text-slate-600">
          {purchase.items?.length ||
            0}{' '}
          item
          {purchase.items?.length ===
          1
            ? ''
            : 's'}
        </p>
      </td>

      <td className="px-5 py-4">
        <button
          type="button"
          disabled={deleted}
          onClick={onStatus}
          className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold capitalize transition ${statusClass(
            purchase.status
          )} ${
            !deleted
              ? 'hover:brightness-125'
              : ''
          }`}
        >
          {formatLabel(
            purchase.status ||
              'draft'
          )}
        </button>
      </td>

      <td className="px-5 py-4">
        <button
          type="button"
          disabled={deleted}
          onClick={onPayment}
          className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold capitalize transition ${paymentClass(
            purchase.paymentStatus
          )}`}
        >
          {formatLabel(
            purchase.paymentStatus ||
              'unpaid'
          )}
        </button>
      </td>

      <td className="px-5 py-4">
        <div className="flex justify-end gap-1">
          <ActionButton
            icon={<Eye />}
            label="View"
            onClick={onView}
          />

          {!deleted ? (
            <>
              <ActionButton
                icon={<Edit3 />}
                label="Edit"
                onClick={onEdit}
              />

              <ActionButton
                icon={<Trash2 />}
                label="Delete"
                danger
                onClick={onDelete}
              />
            </>
          ) : (
            <ActionButton
              icon={<RotateCcw />}
              label="Restore"
              onClick={onRestore}
            />
          )}
        </div>
      </td>
    </tr>
  );
};

const ActionButton = ({
  icon,
  label,
  onClick,
  danger = false,
}) => (
  <button
    type="button"
    title={label}
    onClick={onClick}
    className={`flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-slate-600 transition ${
      danger
        ? 'hover:border-red-400/10 hover:bg-red-500/10 hover:text-red-400'
        : 'hover:border-white/[0.07] hover:bg-white/[0.06] hover:text-slate-200'
    }`}
  >
    {React.cloneElement(icon, {
      className: 'h-4 w-4',
    })}
  </button>
);

const Modal = ({
  title,
  subtitle,
  children,
  onClose,
  wide = false,
}) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-3 backdrop-blur-md sm:p-5">
    <div
      className={`relative flex max-h-[94vh] w-full flex-col overflow-hidden rounded-3xl border border-white/[0.1] bg-[#0b0f17] shadow-2xl shadow-black/50 ${
        wide
          ? 'max-w-7xl'
          : 'max-w-lg'
      }`}
    >
      <div className="flex shrink-0 items-start justify-between border-b border-white/[0.07] px-5 py-4 sm:px-6">
        <div className="pr-4">
          <h2 className="text-base font-bold text-white sm:text-lg">
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
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] text-slate-500 transition hover:bg-white/[0.06] hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="overflow-y-auto p-4 sm:p-6">
        {children}
      </div>
    </div>
  </div>
);

const ConfirmModal = ({
  title,
  message,
  confirmText,
  danger = false,
  loading,
  onCancel,
  onConfirm,
}) => (
  <Modal
    title={title}
    onClose={onCancel}
  >
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            danger
              ? 'bg-red-500/10 text-red-400'
              : 'bg-cyan-500/10 text-cyan-400'
          }`}
        >
          {danger ? (
            <Trash2 className="h-5 w-5" />
          ) : (
            <RotateCcw className="h-5 w-5" />
          )}
        </div>

        <p className="text-sm leading-6 text-slate-400">
          {message}
        </p>
      </div>

      <div className="flex justify-end gap-2 border-t border-white/[0.07] pt-4">
        <button
          type="button"
          disabled={loading}
          onClick={onCancel}
          className="rounded-xl border border-white/[0.08] px-4 py-2.5 text-sm text-slate-300 transition hover:bg-white/[0.05]"
        >
          Cancel
        </button>

        <button
          type="button"
          disabled={loading}
          onClick={onConfirm}
          className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold ${
            danger
              ? 'bg-red-500 text-white hover:bg-red-400'
              : 'bg-white text-slate-950 hover:bg-slate-200'
          }`}
        >
          {loading && (
            <Loader2 className="h-4 w-4 animate-spin" />
          )}

          {confirmText}
        </button>
      </div>
    </div>
  </Modal>
);

const PurchaseDetailsModal = ({
  purchase,
  vendorName,
  branchName,
  onClose,
  onEdit,
  onStatus,
  onPayment,
}) => {
  const items =
    purchase.items || [];

  return (
    <Modal
      title={
        purchase.purchaseNumber ||
        'Purchase Order'
      }
      subtitle="Complete purchase order details"
      onClose={onClose}
      wide
    >
      <div className="space-y-5">
        {/* TOP INFO */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <DetailCard
            label="Vendor"
            value={vendorName}
          />

          <DetailCard
            label="Branch"
            value={branchName}
          />

          <DetailCard
            label="Purchase Date"
            value={formatDate(
              purchase.purchaseDate
            )}
          />

          <DetailCard
            label="Expected Delivery"
            value={formatDate(
              purchase.expectedDeliveryDate
            )}
          />
        </div>

        {/* STATUS */}
        <div className="flex flex-col gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">
              Current Status
            </p>

            <div className="mt-2 flex flex-wrap gap-2">
              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClass(
                  purchase.status
                )}`}
              >
                {formatLabel(
                  purchase.status
                )}
              </span>

              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${paymentClass(
                  purchase.paymentStatus
                )}`}
              >
                {formatLabel(
                  purchase.paymentStatus
                )}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onStatus}
              className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] px-3 py-2 text-xs font-medium text-slate-300 transition hover:bg-white/[0.05]"
            >
              <RefreshCw className="h-4 w-4" />
              Status
            </button>

            <button
              type="button"
              onClick={onPayment}
              className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] px-3 py-2 text-xs font-medium text-slate-300 transition hover:bg-white/[0.05]"
            >
              <Check className="h-4 w-4" />
              Payment
            </button>

            <button
              type="button"
              onClick={onEdit}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-950"
            >
              <Edit3 className="h-4 w-4" />
              Edit
            </button>
          </div>
        </div>

        {/* ITEMS */}
        <div className="overflow-hidden rounded-2xl border border-white/[0.07]">
          <div className="border-b border-white/[0.07] bg-white/[0.025] px-4 py-3">
            <h3 className="text-sm font-semibold text-white">
              Items
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-white/[0.06] text-left">
                  <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-slate-600">
                    Product
                  </th>
                  <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-slate-600">
                    Qty
                  </th>
                  <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-slate-600">
                    Price
                  </th>
                  <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-slate-600">
                    Discount
                  </th>
                  <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-slate-600">
                    GST
                  </th>
                  <th className="px-4 py-3 text-right text-[10px] uppercase tracking-wider text-slate-600">
                    Total
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/[0.05]">
                {items.map(
                  (item, index) => {
                    const calculated =
                      calculateItem(
                        item
                      );

                    const product =
                      typeof item.productId ===
                      'object'
                        ? item.productId
                        : null;

                    return (
                      <tr
                        key={
                          item._id ||
                          index
                        }
                      >
                        <td className="px-4 py-4">
                          <p className="text-sm font-medium text-slate-200">
                            {item.productName ||
                              product?.name ||
                              '-'}
                          </p>

                          <p className="mt-1 text-[10px] text-slate-600">
                            {item.productCode ||
                              product?.productCode ||
                              ''}{' '}
                            •{' '}
                            {item.unit ||
                              product?.unit ||
                              ''}
                          </p>
                        </td>

                        <td className="px-4 py-4 text-sm text-slate-400">
                          {item.quantity}
                        </td>

                        <td className="px-4 py-4 text-sm text-slate-400">
                          {formatCurrency(
                            item.unitPrice
                          )}
                        </td>

                        <td className="px-4 py-4 text-sm text-slate-400">
                          {item.discountPercent ||
                            0}
                          %
                        </td>

                        <td className="px-4 py-4 text-sm text-slate-400">
                          {item.gstRate ||
                            0}
                          %
                        </td>

                        <td className="px-4 py-4 text-right text-sm font-semibold text-white">
                          {formatCurrency(
                            item.totalAmount ??
                              calculated.totalAmount
                          )}
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* TOTALS */}
        <div className="ml-auto w-full max-w-md rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
          <SummaryLine
            label="Subtotal"
            value={formatCurrency(
              purchase.subtotal
            )}
          />

          <SummaryLine
            label="Discount"
            value={`-${formatCurrency(
              purchase.discountAmount
            )}`}
          />

          <SummaryLine
            label="Taxable Amount"
            value={formatCurrency(
              purchase.taxableAmount
            )}
          />

          <SummaryLine
            label="GST"
            value={formatCurrency(
              purchase.gstAmount
            )}
          />

          <SummaryLine
            label="Shipping"
            value={formatCurrency(
              purchase.shippingAmount
            )}
          />

          <SummaryLine
            label="Other Charges"
            value={formatCurrency(
              purchase.otherCharges
            )}
          />

          <SummaryLine
            label="Adjustment"
            value={formatCurrency(
              purchase.adjustmentAmount
            )}
          />

          <div className="my-3 border-t border-white/[0.08]" />

          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-200">
              Grand Total
            </span>

            <span className="text-xl font-bold text-white">
              {formatCurrency(
                purchase.grandTotal
              )}
            </span>
          </div>
        </div>

        {/* NOTES */}
        {(purchase.notes ||
          purchase.termsAndConditions) && (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {purchase.notes && (
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                  Notes
                </p>

                <p className="whitespace-pre-wrap text-sm leading-6 text-slate-400">
                  {purchase.notes}
                </p>
              </div>
            )}

            {purchase.termsAndConditions && (
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                  Terms & Conditions
                </p>

                <p className="whitespace-pre-wrap text-sm leading-6 text-slate-400">
                  {
                    purchase.termsAndConditions
                  }
                </p>
              </div>
            )}
          </div>
        )}

        {/* FOOTER INFO */}
        <div className="grid grid-cols-2 gap-3 border-t border-white/[0.07] pt-4 md:grid-cols-4">
          <DetailCard
            label="Reference"
            value={
              purchase.referenceNumber ||
              '-'
            }
          />

          <DetailCard
            label="Created"
            value={formatDate(
              purchase.createdAt
            )}
          />

          <DetailCard
            label="Updated"
            value={formatDate(
              purchase.updatedAt
            )}
          />

          <DetailCard
            label="Purchase ID"
            value={
              purchase._id || '-'
            }
          />
        </div>
      </div>
    </Modal>
  );
};

const DetailCard = ({
  label,
  value,
}) => (
  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
    <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-600">
      {label}
    </p>

    <p className="mt-1 truncate text-xs font-medium text-slate-300">
      {value || '-'}
    </p>
  </div>
);

const SummaryLine = ({
  label,
  value,
}) => (
  <div className="flex items-center justify-between gap-4 py-1.5 text-sm">
    <span className="text-slate-500">
      {label}
    </span>

    <span className="font-medium text-slate-300">
      {value}
    </span>
  </div>
);

const MiniTotal = ({
  label,
  value,
  emphasis = false,
}) => (
  <div className="rounded-lg border border-white/[0.05] bg-black/10 px-3 py-2">
    <p className="text-[9px] uppercase tracking-wider text-slate-600">
      {label}
    </p>

    <p
      className={`mt-1 text-xs font-semibold ${
        emphasis
          ? 'text-white'
          : 'text-slate-400'
      }`}
    >
      {value}
    </p>
  </div>
);

const FormInput = ({
  label,
  required = false,
  ...props
}) => (
  <label className="block">
    <span className="mb-1.5 block text-[11px] font-medium text-slate-500">
      {label}
      {required && (
        <span className="ml-1 text-red-400">
          *
        </span>
      )}
    </span>

    <input
      {...props}
      className="h-10 w-full rounded-xl border border-white/[0.08] bg-black/20 px-3 text-sm text-white outline-none transition placeholder:text-slate-700 focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/10"
    />
  </label>
);

const FormTextarea = ({
  label,
  required = false,
  ...props
}) => (
  <label className="block">
    <span className="mb-1.5 block text-[11px] font-medium text-slate-500">
      {label}
      {required && (
        <span className="ml-1 text-red-400">
          *
        </span>
      )}
    </span>

    <textarea
      {...props}
      className="w-full resize-none rounded-xl border border-white/[0.08] bg-black/20 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-700 focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/10"
    />
  </label>
);

const FormSelect = ({
  label,
  required = false,
  value,
  onChange,
  options = [],
}) => (
  <label className="block">
    <span className="mb-1.5 block text-[11px] font-medium text-slate-500">
      {label}
      {required && (
        <span className="ml-1 text-red-400">
          *
        </span>
      )}
    </span>

    <div className="relative">
      <select
        value={value || ''}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        className="h-10 w-full appearance-none rounded-xl border border-white/[0.08] bg-[#0a0e16] px-3 pr-9 text-sm text-white outline-none transition focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/10"
      >
        <option
          value=""
          className="bg-[#0a0e16]"
        >
          Select {label}
        </option>

        {options.map(
          (option) => (
            <option
              key={option.value}
              value={option.value}
              className="bg-[#0a0e16]"
            >
              {option.label}
            </option>
          )
        )}
      </select>

      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
    </div>
  </label>
);

const SelectField = ({
  value,
  onChange,
  placeholder,
  options = [],
}) => (
  <div className="relative min-w-[170px]">
    <select
      value={value || ''}
      onChange={(event) =>
        onChange(
          event.target.value
        )
      }
      className="h-11 w-full appearance-none rounded-xl border border-white/[0.08] bg-black/20 px-3 pr-9 text-sm text-slate-300 outline-none transition focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/10"
    >
      <option
        value=""
        className="bg-[#0a0e16]"
      >
        {placeholder}
      </option>

      {options.map(
        (option) => {
          const normalized =
            typeof option ===
            'string'
              ? {
                  value: option,
                  label:
                    formatLabel(
                      option
                    ),
                }
              : option;

          return (
            <option
              key={
                normalized.value
              }
              value={
                normalized.value
              }
              className="bg-[#0a0e16]"
            >
              {normalized.label}
            </option>
          );
        }
      )}
    </select>

    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
  </div>
);

const TableLoading = () => (
  <>
    {Array.from({
      length: 5,
    }).map((_, index) => (
      <tr key={index}>
        {Array.from({
          length: 8,
        }).map(
          (_, cellIndex) => (
            <td
              key={cellIndex}
              className="px-5 py-5"
            >
              <div className="h-4 animate-pulse rounded bg-white/[0.04]" />
            </td>
          )
        )}
      </tr>
    ))}
  </>
);

const ClockIcon = () => (
  <CalendarDays className="h-5 w-5" />
);

const formatLabel = (value) => {
  if (!value) return '-';

  return String(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
};

export default Purchase;