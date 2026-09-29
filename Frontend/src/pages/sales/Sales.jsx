import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { getToken } from '../../services/api';
import {
  AlertCircle,
  Archive,
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  CreditCard,
  Download,
  Edit3,
  Eye,
  FileText,
  Filter,
  Loader2,
  MoreHorizontal,
  Package,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  ShoppingCart,
  Trash2,
  TrendingUp,
  User,
  X,
  XCircle,
} from 'lucide-react';

/* =========================================================
   CONFIG
========================================================= */

const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/* =========================================================
   HELPERS
========================================================= */

const apiRequest = async (
  endpoint,
  options = {}
) => {
  const token = getToken();

  const response = await fetch(
    `${API_BASE_URL}${endpoint}`,
    {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : {}),
        ...(options.headers || {}),
      },
    }
  );

  let result;

  try {
    result = await response.json();
  } catch (_) {
    result = {
      success: false,
      message: 'Invalid server response',
    };
  }

  if (!response.ok) {
    throw new Error(
      result?.message ||
        `Request failed with status ${response.status}`
    );
  }

  return result;
};

const formatCurrency = (
  value,
  currency = 'INR'
) => {
  const amount = Number(value || 0);

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
};

const formatDate = (value) => {
  if (!value) return '-';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const formatDateInput = (value) => {
  if (!value) return '';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1
  ).padStart(2, '0');
  const day = String(
    date.getDate()
  ).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const getCustomerName = (sale) => {
  if (
    sale?.customerId &&
    typeof sale.customerId === 'object'
  ) {
    return (
      sale.customerId.displayName ||
      sale.customerId.name ||
      sale.customerId.customerCode ||
      'Customer'
    );
  }

  return sale?.customerName || 'Customer';
};

const getCustomerEmail = (sale) => {
  if (
    sale?.customerId &&
    typeof sale.customerId === 'object'
  ) {
    return sale.customerId.email || '';
  }

  return '';
};

const getBranchName = (sale) => {
  if (
    sale?.branchId &&
    typeof sale.branchId === 'object'
  ) {
    return (
      sale.branchId.name ||
      sale.branchId.code ||
      'Branch'
    );
  }

  return 'Head Office';
};

const getStatusClass = (status) => {
  switch (status) {
    case 'draft':
      return 'border-slate-500/30 bg-slate-500/10 text-slate-300';

    case 'confirmed':
      return 'border-blue-500/30 bg-blue-500/10 text-blue-300';

    case 'completed':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';

    case 'cancelled':
      return 'border-red-500/30 bg-red-500/10 text-red-300';

    default:
      return 'border-white/10 bg-white/5 text-slate-300';
  }
};

const getPaymentClass = (
  paymentStatus
) => {
  switch (paymentStatus) {
    case 'paid':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';

    case 'partial':
      return 'border-amber-500/30 bg-amber-500/10 text-amber-300';

    case 'refunded':
      return 'border-purple-500/30 bg-purple-500/10 text-purple-300';

    case 'unpaid':
      return 'border-red-500/30 bg-red-500/10 text-red-300';

    default:
      return 'border-white/10 bg-white/5 text-slate-300';
  }
};

const statusLabel = (status) => {
  if (!status) return '-';

  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) =>
      char.toUpperCase()
    );
};

const paymentLabel = (status) => {
  if (!status) return '-';

  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) =>
      char.toUpperCase()
    );
};

/* =========================================================
   EMPTY FORM
========================================================= */

const EMPTY_FORM = {
  customerId: '',
  branchId: '',
  saleDate: formatDateInput(
    new Date()
  ),
  dueDate: '',
  referenceNumber: '',
  status: 'draft',
  paymentMethod: '',
  items: [
    {
      productId: '',
      quantity: 1,
      unitPrice: 0,
      discountPercent: 0,
      taxPercent: 18,
      description: '',
    },
  ],
  shippingAmount: 0,
  otherCharges: 0,
  adjustmentAmount: 0,
  paidAmount: 0,
  currency: 'INR',
  billingAddress: {
    line1: '',
    line2: '',
    city: '',
    state: '',
    country: 'India',
    postalCode: '',
  },
  shippingAddress: {
    line1: '',
    line2: '',
    city: '',
    state: '',
    country: 'India',
    postalCode: '',
  },
  notes: '',
  termsAndConditions: '',
};

/* =========================================================
   COMPONENT
========================================================= */

const Sales = () => {
  const [sales, setSales] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [branches, setBranches] = useState([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [actionLoading, setActionLoading] =
    useState(null);

  const [error, setError] =
    useState('');

  const [success, setSuccess] =
    useState('');

  const [search, setSearch] =
    useState('');

  const [statusFilter, setStatusFilter] =
    useState('');

  const [
    paymentStatusFilter,
    setPaymentStatusFilter,
  ] = useState('');

  const [
    customerFilter,
    setCustomerFilter,
  ] = useState('');

  const [fromDate, setFromDate] =
    useState('');

  const [toDate, setToDate] =
    useState('');

  const [page, setPage] =
    useState(1);

  const [limit, setLimit] =
    useState(10);

  const [pagination, setPagination] =
    useState({
      page: 1,
      limit: 10,
      total: 0,
      pages: 1,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    });

  const [summary, setSummary] =
    useState({
      totals: {
        totalSales: 0,
        subtotal: 0,
        discountAmount: 0,
        taxableAmount: 0,
        taxAmount: 0,
        shippingAmount: 0,
        otherCharges: 0,
        grandTotal: 0,
        paidAmount: 0,
        balanceAmount: 0,
      },
      statusSummary: [],
      paymentSummary: [],
    });

  const [
    showFilters,
    setShowFilters,
  ] = useState(false);

  const [
    showForm,
    setShowForm,
  ] = useState(false);

  const [
    showDetails,
    setShowDetails,
  ] = useState(false);

  const [
    showDeleteConfirm,
    setShowDeleteConfirm,
  ] = useState(false);

  const [
    showCancelConfirm,
    setShowCancelConfirm,
  ] = useState(false);

  const [
    selectedSale,
    setSelectedSale,
  ] = useState(null);

  const [
    editingSale,
    setEditingSale,
  ] = useState(null);

  const [
    form,
    setForm,
  ] = useState(EMPTY_FORM);

  /* =====================================================
     LOAD MASTER DATA
  ===================================================== */

  const loadMasters = useCallback(
    async () => {
      try {
        const [
          customerResponse,
          productResponse,
          branchResponse,
        ] = await Promise.all([
          apiRequest(
            '/customers?status=active&limit=100'
          ),
          apiRequest(
            '/products?status=active&limit=100'
          ),
          apiRequest(
            '/branches?status=active&limit=100'
          ),
        ]);

        setCustomers(
          customerResponse?.data || []
        );

        setProducts(
          productResponse?.data || []
        );

        setBranches(
          branchResponse?.data || []
        );
      } catch (err) {
        console.error(
          'Master data error:',
          err
        );
      }
    },
    []
  );

  /* =====================================================
     LOAD SALES
  ===================================================== */

  const loadSales = useCallback(
    async ({
      silent = false,
      targetPage = page,
    } = {}) => {
      try {
        if (!silent) {
          setLoading(true);
        } else {
          setRefreshing(true);
        }

        setError('');

        const params =
          new URLSearchParams();

        params.set(
          'page',
          String(targetPage)
        );

        params.set(
          'limit',
          String(limit)
        );

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

        if (
          paymentStatusFilter
        ) {
          params.set(
            'paymentStatus',
            paymentStatusFilter
          );
        }

        if (customerFilter) {
          params.set(
            'customerId',
            customerFilter
          );
        }

        if (fromDate) {
          params.set(
            'fromDate',
            fromDate
          );
        }

        if (toDate) {
          params.set(
            'toDate',
            toDate
          );
        }

        const result =
          await apiRequest(
            `/sales?${params.toString()}`
          );

        setSales(
          result?.data || []
        );

        setPagination(
          result?.pagination || {
            page: targetPage,
            limit,
            total: 0,
            pages: 1,
            totalPages: 1,
            hasNextPage: false,
            hasPreviousPage: false,
          }
        );
      } catch (err) {
        setError(
          err.message ||
            'Failed to load sales'
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      page,
      limit,
      search,
      statusFilter,
      paymentStatusFilter,
      customerFilter,
      fromDate,
      toDate,
    ]
  );

  /* =====================================================
     LOAD SUMMARY
  ===================================================== */

  const loadSummary =
    useCallback(async () => {
      try {
        const params =
          new URLSearchParams();

        if (fromDate) {
          params.set(
            'fromDate',
            fromDate
          );
        }

        if (toDate) {
          params.set(
            'toDate',
            toDate
          );
        }

        const result =
          await apiRequest(
            `/sales/summary${
              params.toString()
                ? `?${params.toString()}`
                : ''
            }`
          );

        if (result?.data) {
          setSummary(
            result.data
          );
        }
      } catch (err) {
        console.error(
          'Summary error:',
          err
        );
      }
    }, [fromDate, toDate]);

  useEffect(() => {
    loadMasters();
  }, [loadMasters]);

  useEffect(() => {
    loadSales();
  }, [loadSales]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  /* =====================================================
     AUTO CLEAR MESSAGES
  ===================================================== */

  useEffect(() => {
    if (!success) return;

    const timer = setTimeout(
      () => setSuccess(''),
      4000
    );

    return () =>
      clearTimeout(timer);
  }, [success]);

  /* =====================================================
     FILTER RESET
  ===================================================== */

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('');
    setPaymentStatusFilter('');
    setCustomerFilter('');
    setFromDate('');
    setToDate('');
    setPage(1);
  };

  /* =====================================================
     FORM
  ===================================================== */

  const openCreate = () => {
    setEditingSale(null);
    setForm({
      ...EMPTY_FORM,
      saleDate:
        formatDateInput(
          new Date()
        ),
      items: [
        {
          productId: '',
          quantity: 1,
          unitPrice: 0,
          discountPercent: 0,
          taxPercent: 18,
          description: '',
        },
      ],
    });
    setError('');
    setShowForm(true);
  };

  const openEdit = async (sale) => {
    try {
      setSaving(true);
      setError('');

      const result =
        await apiRequest(
          `/sales/${sale._id}`
        );

      const data =
        result?.data;

      if (!data) {
        throw new Error(
          'Sale data not found'
        );
      }

      setEditingSale(data);

      setForm({
        customerId:
          typeof data.customerId ===
          'object'
            ? data.customerId?._id
            : data.customerId || '',

        branchId:
          typeof data.branchId ===
          'object'
            ? data.branchId?._id
            : data.branchId || '',

        saleDate:
          formatDateInput(
            data.saleDate
          ),

        dueDate:
          formatDateInput(
            data.dueDate
          ),

        referenceNumber:
          data.referenceNumber || '',

        status:
          data.status || 'draft',

        paymentMethod:
          data.paymentMethod || '',

        items: (
          data.items || []
        ).map((item) => ({
          productId:
            typeof item.productId ===
            'object'
              ? item.productId?._id
              : item.productId || '',

          quantity:
            item.quantity ?? 1,

          unitPrice:
            item.unitPrice ?? 0,

          discountPercent:
            item.discountPercent ??
            0,

          taxPercent:
            item.taxPercent ?? 0,

          description:
            item.description || '',
        })),

        shippingAmount:
          data.shippingAmount ?? 0,

        otherCharges:
          data.otherCharges ?? 0,

        adjustmentAmount:
          data.adjustmentAmount ?? 0,

        paidAmount:
          data.paidAmount ?? 0,

        currency:
          data.currency || 'INR',

        billingAddress:
          data.billingAddress ||
          EMPTY_FORM.billingAddress,

        shippingAddress:
          data.shippingAddress ||
          EMPTY_FORM.shippingAddress,

        notes:
          data.notes || '',

        termsAndConditions:
          data.termsAndConditions ||
          '',
      });

      setShowForm(true);
    } catch (err) {
      setError(
        err.message ||
          'Failed to load sale'
      );
    } finally {
      setSaving(false);
    }
  };

  const updateForm = (
    field,
    value
  ) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const updateAddress = (
    type,
    field,
    value
  ) => {
    setForm((previous) => ({
      ...previous,
      [type]: {
        ...previous[type],
        [field]: value,
      },
    }));
  };

  const updateItem = (
    index,
    field,
    value
  ) => {
    setForm((previous) => {
      const items = [
        ...previous.items,
      ];

      items[index] = {
        ...items[index],
        [field]: value,
      };

      if (
        field === 'productId'
      ) {
        const product =
          products.find(
            (item) =>
              String(item._id) ===
              String(value)
          );

        if (product) {
          items[index].unitPrice =
            product.sellingPrice ??
            product.mrp ??
            0;

          items[index].taxPercent =
            product.gstRate ?? 0;
        }
      }

      return {
        ...previous,
        items,
      };
    });
  };

  const addItem = () => {
    setForm((previous) => ({
      ...previous,
      items: [
        ...previous.items,
        {
          productId: '',
          quantity: 1,
          unitPrice: 0,
          discountPercent: 0,
          taxPercent: 18,
          description: '',
        },
      ],
    }));
  };

  const removeItem = (
    index
  ) => {
    setForm((previous) => {
      if (
        previous.items.length ===
        1
      ) {
        return previous;
      }

      return {
        ...previous,
        items:
          previous.items.filter(
            (_, itemIndex) =>
              itemIndex !== index
          ),
      };
    });
  };

  /* =====================================================
     FORM TOTALS
  ===================================================== */

  const formTotals =
    useMemo(() => {
      const items =
        form.items || [];

      let subtotal = 0;
      let discount = 0;
      let taxable = 0;
      let tax = 0;

      items.forEach((item) => {
        const quantity =
          Number(
            item.quantity || 0
          );

        const price =
          Number(
            item.unitPrice || 0
          );

        const discountPercent =
          Number(
            item.discountPercent || 0
          );

        const taxPercent =
          Number(
            item.taxPercent || 0
          );

        const gross =
          quantity * price;

        const discountAmount =
          gross *
          (discountPercent /
            100);

        const taxableAmount =
          gross -
          discountAmount;

        const taxAmount =
          taxableAmount *
          (taxPercent / 100);

        subtotal += gross;
        discount +=
          discountAmount;
        taxable +=
          taxableAmount;
        tax += taxAmount;
      });

      const shipping =
        Number(
          form.shippingAmount || 0
        );

      const other =
        Number(
          form.otherCharges || 0
        );

      const adjustment =
        Number(
          form.adjustmentAmount ||
            0
        );

      const grandTotal =
        taxable +
        tax +
        shipping +
        other +
        adjustment;

      const paid =
        Number(
          form.paidAmount || 0
        );

      return {
        subtotal,
        discount,
        taxable,
        tax,
        shipping,
        other,
        adjustment,
        grandTotal,
        paid,
        balance:
          grandTotal - paid,
      };
    }, [form]);

  /* =====================================================
     SAVE
  ===================================================== */

  const saveSale = async (event) => {
    event.preventDefault();

    try {
      setSaving(true);
      setError('');

      if (!form.customerId) {
        throw new Error(
          'Please select a customer'
        );
      }

      if (
        !form.items?.length
      ) {
        throw new Error(
          'Please add at least one item'
        );
      }

      for (
        let index = 0;
        index < form.items.length;
        index++
      ) {
        const item =
          form.items[index];

        if (!item.productId) {
          throw new Error(
            `Please select product for item ${
              index + 1
            }`
          );
        }

        if (
          Number(item.quantity) <=
          0
        ) {
          throw new Error(
            `Quantity must be greater than 0 for item ${
              index + 1
            }`
          );
        }
      }

      if (
        Number(form.paidAmount) >
        formTotals.grandTotal
      ) {
        throw new Error(
          'Paid amount cannot be greater than grand total'
        );
      }

      const payload = {
        customerId:
          form.customerId,

        branchId:
          form.branchId || null,

        saleDate:
          form.saleDate || undefined,

        dueDate:
          form.dueDate || null,

        referenceNumber:
          form.referenceNumber || '',

        status:
          form.status || 'draft',

        paymentMethod:
          form.paymentMethod || '',

        items: form.items.map(
          (item) => ({
            productId:
              item.productId,

            quantity:
              Number(
                item.quantity
              ),

            unitPrice:
              Number(
                item.unitPrice
              ),

            discountPercent:
              Number(
                item.discountPercent ||
                  0
              ),

            taxPercent:
              Number(
                item.taxPercent ||
                  0
              ),

            description:
              item.description ||
              '',
          })
        ),

        shippingAmount:
          Number(
            form.shippingAmount ||
              0
          ),

        otherCharges:
          Number(
            form.otherCharges || 0
          ),

        adjustmentAmount:
          Number(
            form.adjustmentAmount ||
              0
          ),

        paidAmount:
          Number(
            form.paidAmount || 0
          ),

        currency:
          form.currency || 'INR',

        billingAddress:
          form.billingAddress,

        shippingAddress:
          form.shippingAddress,

        notes:
          form.notes || '',

        termsAndConditions:
          form.termsAndConditions ||
          '',
      };

      let result;

      if (editingSale?._id) {
        result =
          await apiRequest(
            `/sales/${editingSale._id}`,
            {
              method: 'PUT',
              body: JSON.stringify(
                payload
              ),
            }
          );
      } else {
        result =
          await apiRequest(
            '/sales',
            {
              method: 'POST',
              body: JSON.stringify(
                payload
              ),
            }
          );
      }

      setSuccess(
        result?.message ||
          (editingSale
            ? 'Sale updated successfully'
            : 'Sale created successfully')
      );

      setShowForm(false);
      setEditingSale(null);
      setForm(EMPTY_FORM);

      await Promise.all([
        loadSales({
          silent: true,
          targetPage: page,
        }),
        loadSummary(),
      ]);
    } catch (err) {
      setError(
        err.message ||
          'Failed to save sale'
      );
    } finally {
      setSaving(false);
    }
  };

  /* =====================================================
     VIEW
  ===================================================== */

  const openDetails = async (
    sale
  ) => {
    try {
      setActionLoading(
        `view-${sale._id}`
      );

      const result =
        await apiRequest(
          `/sales/${sale._id}`
        );

      setSelectedSale(
        result?.data || sale
      );

      setShowDetails(true);
    } catch (err) {
      setError(
        err.message ||
          'Failed to load sale details'
      );
    } finally {
      setActionLoading(null);
    }
  };

  /* =====================================================
     ACTIONS
  ===================================================== */

  const performAction = async (
    sale,
    action
  ) => {
    try {
      setActionLoading(
        `${action}-${sale._id}`
      );

      setError('');

      let endpoint = '';
      let method = 'POST';

      switch (action) {
        case 'confirm':
          endpoint = `/sales/${sale._id}/confirm`;
          break;

        case 'complete':
          endpoint = `/sales/${sale._id}/complete`;
          break;

        case 'cancel':
          endpoint = `/sales/${sale._id}/cancel`;
          break;

        case 'delete':
          endpoint = `/sales/${sale._id}`;
          method = 'DELETE';
          break;

        case 'restore':
          endpoint = `/sales/${sale._id}/restore`;
          method = 'PATCH';
          break;

        default:
          throw new Error(
            'Invalid action'
          );
      }

      const result =
        await apiRequest(
          endpoint,
          {
            method,
            body:
              method === 'POST'
                ? JSON.stringify({})
                : undefined,
          }
        );

      setSuccess(
        result?.message ||
          'Action completed successfully'
      );

      setShowDeleteConfirm(false);
      setShowCancelConfirm(false);

      if (
        selectedSale?._id ===
        sale._id
      ) {
        setSelectedSale(
          result?.data || selectedSale
        );
      }

      await Promise.all([
        loadSales({
          silent: true,
          targetPage: page,
        }),
        loadSummary(),
      ]);
    } catch (err) {
      setError(
        err.message ||
          'Action failed'
      );
    } finally {
      setActionLoading(null);
    }
  };

  /* =====================================================
     EXPORT CSV
  ===================================================== */

  const exportCSV = () => {
    if (!sales.length) {
      setError(
        'No sales available to export'
      );
      return;
    }

    const headers = [
      'Invoice Number',
      'Reference',
      'Customer',
      'Sale Date',
      'Due Date',
      'Status',
      'Payment Status',
      'Payment Method',
      'Subtotal',
      'Discount',
      'Tax',
      'Grand Total',
      'Paid',
      'Balance',
    ];

    const rows = sales.map(
      (sale) => [
        sale.invoiceNumber || '',
        sale.referenceNumber || '',
        getCustomerName(sale),
        formatDate(
          sale.saleDate
        ),
        formatDate(
          sale.dueDate
        ),
        statusLabel(
          sale.status
        ),
        paymentLabel(
          sale.paymentStatus
        ),
        sale.paymentMethod || '',
        sale.subtotal ?? 0,
        sale.discountAmount ?? 0,
        sale.taxAmount ?? 0,
        sale.grandTotal ?? 0,
        sale.paidAmount ?? 0,
        sale.balanceAmount ?? 0,
      ]
    );

    const csv = [
      headers,
      ...rows,
    ]
      .map((row) =>
        row
          .map((cell) => {
            const value =
              String(cell ?? '');

            return `"${value.replace(
              /"/g,
              '""'
            )}"`;
          })
          .join(',')
      )
      .join('\n');

    const blob =
      new Blob([csv], {
        type: 'text/csv;charset=utf-8;',
      });

    const url =
      URL.createObjectURL(
        blob
      );

    const link =
      document.createElement(
        'a'
      );

    link.href = url;
    link.download = `sales-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    document.body.appendChild(
      link
    );

    link.click();

    document.body.removeChild(
      link
    );

    URL.revokeObjectURL(url);
  };

  /* =====================================================
     SELECT CUSTOMER ADDRESS
  ===================================================== */

  const handleCustomerChange = (
    customerId
  ) => {
    const customer =
      customers.find(
        (item) =>
          String(item._id) ===
          String(customerId)
      );

    setForm((previous) => ({
      ...previous,
      customerId,
      billingAddress:
        customer?.billingAddress ||
        previous.billingAddress,
      shippingAddress:
        customer?.shippingAddress ||
        previous.shippingAddress,
    }));
  };

  /* =====================================================
     STATISTICS
  ===================================================== */

  const totals =
    summary?.totals || {};

  const draftCount =
    summary?.statusSummary?.find(
      (item) =>
        item._id === 'draft'
    )?.count || 0;

  const confirmedCount =
    summary?.statusSummary?.find(
      (item) =>
        item._id === 'confirmed'
    )?.count || 0;

  const completedCount =
    summary?.statusSummary?.find(
      (item) =>
        item._id === 'completed'
    )?.count || 0;

  const cancelledCount =
    summary?.statusSummary?.find(
      (item) =>
        item._id === 'cancelled'
    )?.count || 0;

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <div className="min-h-screen w-full bg-[#07090d] text-white">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-cyan-500/5 blur-3xl" />
        <div className="absolute right-0 top-1/3 h-96 w-96 rounded-full bg-blue-500/5 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-96 w-96 rounded-full bg-violet-500/5 blur-3xl" />
      </div>

      <div className="relative w-full px-3 py-4 sm:px-5 lg:px-7 xl:px-8">
        {/* =================================================
            HEADER
        ================================================= */}

        <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10">
                <ShoppingCart
                  size={18}
                  className="text-cyan-300"
                />
              </div>

              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300/80">
                Sales Management
              </span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Sales
            </h1>

            <p className="mt-1 max-w-2xl text-sm text-slate-400">
              Create, manage, confirm and track
              your sales transactions from one
              workspace.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                loadSales({
                  silent: true,
                  targetPage: page,
                })
              }
              disabled={refreshing}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm font-medium text-slate-200 transition hover:border-white/20 hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw
                size={15}
                className={
                  refreshing
                    ? 'animate-spin'
                    : ''
                }
              />
              <span className="hidden sm:inline">
                Refresh
              </span>
            </button>

            <button
              type="button"
              onClick={exportCSV}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm font-medium text-slate-200 transition hover:border-white/20 hover:bg-white/[0.07]"
            >
              <Download size={15} />
              <span className="hidden sm:inline">
                Export
              </span>
            </button>

            <button
              type="button"
              onClick={openCreate}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-slate-950 shadow-lg shadow-white/5 transition hover:bg-slate-100"
            >
              <Plus size={16} />
              New Sale
            </button>
          </div>
        </div>

        {/* =================================================
            ALERTS
        ================================================= */}

        {error && (
          <div className="mb-4 flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/[0.08] px-4 py-3 text-sm text-red-200">
            <AlertCircle
              size={18}
              className="mt-0.5 shrink-0 text-red-400"
            />

            <div className="min-w-0 flex-1">
              {error}
            </div>

            <button
              type="button"
              onClick={() =>
                setError('')
              }
              className="text-red-300/70 hover:text-red-200"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {success && (
          <div className="mb-4 flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.08] px-4 py-3 text-sm text-emerald-200">
            <CheckCircle2
              size={18}
              className="mt-0.5 shrink-0 text-emerald-400"
            />

            <div className="flex-1">
              {success}
            </div>

            <button
              type="button"
              onClick={() =>
                setSuccess('')
              }
              className="text-emerald-300/70 hover:text-emerald-200"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* =================================================
            KPI CARDS
        ================================================= */}

        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            icon={CircleDollarSign}
            label="Total Sales"
            value={formatCurrency(
              totals.grandTotal
            )}
            helper={`${totals.totalSales || 0} transactions`}
          />

          <KpiCard
            icon={TrendingUp}
            label="Collected"
            value={formatCurrency(
              totals.paidAmount
            )}
            helper="Total paid amount"
          />

          <KpiCard
            icon={Clock3}
            label="Outstanding"
            value={formatCurrency(
              totals.balanceAmount
            )}
            helper="Pending customer balance"
          />

          <KpiCard
            icon={CheckCircle2}
            label="Completed"
            value={completedCount}
            helper={`${confirmedCount} confirmed`}
          />
        </div>

        {/* =================================================
            MINI STATUS STRIP
        ================================================= */}

        <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <MiniStat
            label="Draft"
            value={draftCount}
            icon={FileText}
          />

          <MiniStat
            label="Confirmed"
            value={confirmedCount}
            icon={CheckCircle2}
          />

          <MiniStat
            label="Completed"
            value={completedCount}
            icon={TrendingUp}
          />

          <MiniStat
            label="Cancelled"
            value={cancelledCount}
            icon={XCircle}
          />
        </div>

        {/* =================================================
            MAIN PANEL
        ================================================= */}

        <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0c0f14]/90 shadow-2xl shadow-black/20 backdrop-blur-xl">
          {/* Search toolbar */}
          <div className="border-b border-white/[0.07] p-3 sm:p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative min-w-0 flex-1">
                <Search
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                />

                <input
                  type="text"
                  value={search}
                  onChange={(event) => {
                    setSearch(
                      event.target.value
                    );
                    setPage(1);
                  }}
                  placeholder="Search invoice or reference number..."
                  className="h-11 w-full rounded-xl border border-white/[0.08] bg-white/[0.035] pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/30 focus:bg-white/[0.05]"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <select
                  value={statusFilter}
                  onChange={(event) => {
                    setStatusFilter(
                      event.target.value
                    );
                    setPage(1);
                  }}
                  className="h-11 min-w-[140px] rounded-xl border border-white/[0.08] bg-[#11151c] px-3 text-sm text-slate-300 outline-none focus:border-cyan-400/30"
                >
                  <option value="">
                    All Status
                  </option>
                  <option value="draft">
                    Draft
                  </option>
                  <option value="confirmed">
                    Confirmed
                  </option>
                  <option value="completed">
                    Completed
                  </option>
                  <option value="cancelled">
                    Cancelled
                  </option>
                </select>

                <select
                  value={
                    paymentStatusFilter
                  }
                  onChange={(event) => {
                    setPaymentStatusFilter(
                      event.target.value
                    );
                    setPage(1);
                  }}
                  className="h-11 min-w-[145px] rounded-xl border border-white/[0.08] bg-[#11151c] px-3 text-sm text-slate-300 outline-none focus:border-cyan-400/30"
                >
                  <option value="">
                    All Payments
                  </option>
                  <option value="unpaid">
                    Unpaid
                  </option>
                  <option value="partial">
                    Partial
                  </option>
                  <option value="paid">
                    Paid
                  </option>
                  <option value="refunded">
                    Refunded
                  </option>
                </select>

                <button
                  type="button"
                  onClick={() =>
                    setShowFilters(
                      (value) => !value
                    )
                  }
                  className={`inline-flex h-11 items-center gap-2 rounded-xl border px-3 text-sm font-medium transition ${
                    showFilters
                      ? 'border-cyan-400/30 bg-cyan-400/10 text-cyan-300'
                      : 'border-white/[0.08] bg-white/[0.035] text-slate-300 hover:bg-white/[0.06]'
                  }`}
                >
                  <Filter size={15} />
                  Filters
                  <ChevronDown
                    size={14}
                    className={
                      showFilters
                        ? 'rotate-180 transition'
                        : 'transition'
                    }
                  />
                </button>
              </div>
            </div>

            {showFilters && (
              <div className="mt-3 grid grid-cols-1 gap-3 rounded-xl border border-white/[0.06] bg-black/20 p-3 sm:grid-cols-2 lg:grid-cols-4">
                <Field
                  label="Customer"
                  compact
                >
                  <select
                    value={
                      customerFilter
                    }
                    onChange={(event) => {
                      setCustomerFilter(
                        event.target.value
                      );
                      setPage(1);
                    }}
                    className="input-dark"
                  >
                    <option value="">
                      All Customers
                    </option>

                    {customers.map(
                      (customer) => (
                        <option
                          key={
                            customer._id
                          }
                          value={
                            customer._id
                          }
                        >
                          {customer.displayName ||
                            customer.name ||
                            customer.customerCode}
                        </option>
                      )
                    )}
                  </select>
                </Field>

                <Field
                  label="From Date"
                  compact
                >
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(event) => {
                      setFromDate(
                        event.target.value
                      );
                      setPage(1);
                    }}
                    className="input-dark"
                  />
                </Field>

                <Field
                  label="To Date"
                  compact
                >
                  <input
                    type="date"
                    value={toDate}
                    onChange={(event) => {
                      setToDate(
                        event.target.value
                      );
                      setPage(1);
                    }}
                    className="input-dark"
                  />
                </Field>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.035] text-sm font-medium text-slate-300 transition hover:bg-white/[0.07]"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* =================================================
              TABLE
          ================================================= */}

          <div className="relative">
            {loading ? (
              <div className="flex min-h-[430px] items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <Loader2
                    size={30}
                    className="animate-spin text-cyan-400"
                  />
                  <span className="text-sm text-slate-500">
                    Loading sales...
                  </span>
                </div>
              </div>
            ) : sales.length === 0 ? (
              <EmptyState
                onCreate={openCreate}
              />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1050px]">
                    <thead>
                      <tr className="border-b border-white/[0.06] bg-white/[0.015]">
                        <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                          Invoice
                        </th>

                        <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                          Customer
                        </th>

                        <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                          Date
                        </th>

                        <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                          Status
                        </th>

                        <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                          Payment
                        </th>

                        <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                          Amount
                        </th>

                        <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                          Balance
                        </th>

                        <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {sales.map(
                        (sale) => (
                          <SaleRow
                            key={
                              sale._id
                            }
                            sale={sale}
                            actionLoading={
                              actionLoading
                            }
                            onView={
                              openDetails
                            }
                            onEdit={
                              openEdit
                            }
                            onConfirm={() =>
                              performAction(
                                sale,
                                'confirm'
                              )
                            }
                            onComplete={() =>
                              performAction(
                                sale,
                                'complete'
                              )
                            }
                            onCancel={() => {
                              setSelectedSale(
                                sale
                              );
                              setShowCancelConfirm(
                                true
                              );
                            }}
                            onDelete={() => {
                              setSelectedSale(
                                sale
                              );
                              setShowDeleteConfirm(
                                true
                              );
                            }}
                            onRestore={() =>
                              performAction(
                                sale,
                                'restore'
                              )
                            }
                          />
                        )
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex flex-col gap-3 border-t border-white/[0.06] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-xs text-slate-500">
                    Showing{' '}
                    <span className="font-medium text-slate-300">
                      {sales.length}
                    </span>{' '}
                    of{' '}
                    <span className="font-medium text-slate-300">
                      {pagination.total ||
                        0}
                    </span>{' '}
                    sales
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={limit}
                      onChange={(event) => {
                        setLimit(
                          Number(
                            event.target
                              .value
                          )
                        );
                        setPage(1);
                      }}
                      className="h-9 rounded-lg border border-white/[0.08] bg-white/[0.035] px-2 text-xs text-slate-300 outline-none"
                    >
                      <option value="10">
                        10 / page
                      </option>
                      <option value="20">
                        20 / page
                      </option>
                      <option value="50">
                        50 / page
                      </option>
                      <option value="100">
                        100 / page
                      </option>
                    </select>

                    <button
                      type="button"
                      disabled={
                        !pagination.hasPreviousPage
                      }
                      onClick={() =>
                        setPage(
                          (value) =>
                            Math.max(
                              1,
                              value - 1
                            )
                        )
                      }
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.035] text-slate-300 transition hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <ChevronLeft
                        size={15}
                      />
                    </button>

                    <div className="flex h-9 min-w-9 items-center justify-center rounded-lg border border-cyan-400/20 bg-cyan-400/10 px-2 text-xs font-semibold text-cyan-300">
                      {pagination.page ||
                        page}
                    </div>

                    <button
                      type="button"
                      disabled={
                        !pagination.hasNextPage
                      }
                      onClick={() =>
                        setPage(
                          (value) =>
                            value + 1
                        )
                      }
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.035] text-slate-300 transition hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <ChevronRight
                        size={15}
                      />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ===================================================
          CREATE / EDIT MODAL
      =================================================== */}

      {showForm && (
        <SaleFormModal
          form={form}
          editingSale={editingSale}
          customers={customers}
          products={products}
          branches={branches}
          totals={formTotals}
          saving={saving}
          onClose={() => {
            if (!saving) {
              setShowForm(false);
              setEditingSale(null);
            }
          }}
          onSubmit={saveSale}
          onChange={updateForm}
          onCustomerChange={
            handleCustomerChange
          }
          onAddressChange={
            updateAddress
          }
          onItemChange={
            updateItem
          }
          onAddItem={addItem}
          onRemoveItem={
            removeItem
          }
        />
      )}

      {/* ===================================================
          DETAILS MODAL
      =================================================== */}

      {showDetails &&
        selectedSale && (
          <SaleDetailsModal
            sale={selectedSale}
            actionLoading={
              actionLoading
            }
            onClose={() =>
              setShowDetails(false)
            }
            onEdit={() => {
              setShowDetails(false);
              openEdit(
                selectedSale
              );
            }}
            onConfirm={() =>
              performAction(
                selectedSale,
                'confirm'
              )
            }
            onComplete={() =>
              performAction(
                selectedSale,
                'complete'
              )
            }
            onCancel={() => {
              setShowCancelConfirm(
                true
              );
            }}
          />
        )}

      {/* ===================================================
          DELETE CONFIRM
      =================================================== */}

      {showDeleteConfirm &&
        selectedSale && (
          <ConfirmModal
            title="Delete Sale?"
            description={`This will soft-delete ${selectedSale.invoiceNumber}. The sale can be restored later.`}
            icon={Trash2}
            danger
            loading={
              actionLoading ===
              `delete-${selectedSale._id}`
            }
            confirmText="Delete Sale"
            onClose={() =>
              setShowDeleteConfirm(
                false
              )
            }
            onConfirm={() =>
              performAction(
                selectedSale,
                'delete'
              )
            }
          />
        )}

      {/* ===================================================
          CANCEL CONFIRM
      =================================================== */}

      {showCancelConfirm &&
        selectedSale && (
          <ConfirmModal
            title="Cancel Sale?"
            description={
              selectedSale.stockUpdated
                ? 'This will cancel the sale and restore the deducted stock.'
                : 'This will cancel the sale. No stock restoration is required.'
            }
            icon={XCircle}
            danger
            loading={
              actionLoading ===
              `cancel-${selectedSale._id}`
            }
            confirmText="Cancel Sale"
            onClose={() =>
              setShowCancelConfirm(
                false
              )
            }
            onConfirm={() =>
              performAction(
                selectedSale,
                'cancel'
              )
            }
          />
        )}
    </div>
  );
};

/* =========================================================
   KPI CARD
========================================================= */

const KpiCard = ({
  icon: Icon,
  label,
  value,
  helper,
}) => {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0c0f14]/90 p-4 transition hover:border-white/[0.13]">
      <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-cyan-400/[0.03] blur-2xl transition group-hover:bg-cyan-400/[0.06]" />

      <div className="relative">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04]">
            <Icon
              size={17}
              className="text-slate-300"
            />
          </div>

          <ArrowUpRight
            size={15}
            className="text-slate-600"
          />
        </div>

        <p className="text-xs font-medium text-slate-500">
          {label}
        </p>

        <p className="mt-1 truncate text-xl font-bold tracking-tight text-white">
          {value}
        </p>

        <p className="mt-1 text-[11px] text-slate-600">
          {helper}
        </p>
      </div>
    </div>
  );
};

/* =========================================================
   MINI STAT
========================================================= */

const MiniStat = ({
  label,
  value,
  icon: Icon,
}) => (
  <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-2.5">
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.04]">
      <Icon
        size={14}
        className="text-slate-400"
      />
    </div>

    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wider text-slate-600">
        {label}
      </p>

      <p className="text-sm font-semibold text-slate-200">
        {value}
      </p>
    </div>
  </div>
);

/* =========================================================
   SALE ROW
========================================================= */

const SaleRow = ({
  sale,
  actionLoading,
  onView,
  onEdit,
  onConfirm,
  onComplete,
  onCancel,
  onDelete,
  onRestore,
}) => {
  const isLoading =
    actionLoading?.endsWith(
      sale._id
    );

  return (
    <tr className="group border-b border-white/[0.045] transition hover:bg-white/[0.025]">
      <td className="px-4 py-4">
        <button
          type="button"
          onClick={() =>
            onView(sale)
          }
          className="text-left"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-400/10 bg-cyan-400/[0.06]">
              <FileText
                size={15}
                className="text-cyan-300"
              />
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-100 transition group-hover:text-white">
                {sale.invoiceNumber}
              </p>

              {sale.referenceNumber && (
                <p className="mt-0.5 max-w-[170px] truncate text-[11px] text-slate-600">
                  {sale.referenceNumber}
                </p>
              )}
            </div>
          </div>
        </button>
      </td>

      <td className="px-4 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.05]">
            <User
              size={14}
              className="text-slate-400"
            />
          </div>

          <div className="min-w-0">
            <p className="max-w-[180px] truncate text-sm font-medium text-slate-200">
              {getCustomerName(
                sale
              )}
            </p>

            <p className="text-[11px] text-slate-600">
              {getBranchName(
                sale
              )}
            </p>
          </div>
        </div>
      </td>

      <td className="px-4 py-4">
        <div className="flex items-center gap-2 text-sm text-slate-300">
          <Calendar
            size={14}
            className="text-slate-600"
          />
          {formatDate(
            sale.saleDate
          )}
        </div>
      </td>

      <td className="px-4 py-4">
        <span
          className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium ${getStatusClass(
            sale.status
          )}`}
        >
          {statusLabel(
            sale.status
          )}
        </span>
      </td>

      <td className="px-4 py-4">
        <span
          className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium ${getPaymentClass(
            sale.paymentStatus
          )}`}
        >
          {paymentLabel(
            sale.paymentStatus
          )}
        </span>
      </td>

      <td className="px-4 py-4 text-right">
        <p className="text-sm font-semibold text-slate-100">
          {formatCurrency(
            sale.grandTotal,
            sale.currency
          )}
        </p>

        {sale.paidAmount > 0 && (
          <p className="mt-0.5 text-[10px] text-emerald-400/70">
            Paid{' '}
            {formatCurrency(
              sale.paidAmount,
              sale.currency
            )}
          </p>
        )}
      </td>

      <td className="px-4 py-4 text-right">
        <p
          className={`text-sm font-semibold ${
            Number(
              sale.balanceAmount || 0
            ) > 0
              ? 'text-amber-300'
              : 'text-emerald-300'
          }`}
        >
          {formatCurrency(
            sale.balanceAmount,
            sale.currency
          )}
        </p>
      </td>

      <td className="px-4 py-4">
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() =>
              onView(sale)
            }
            title="View"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white/[0.06] hover:text-slate-200"
          >
            {actionLoading ===
            `view-${sale._id}` ? (
              <Loader2
                size={14}
                className="animate-spin"
              />
            ) : (
              <Eye size={14} />
            )}
          </button>

          {sale.status ===
            'draft' && (
            <>
              <button
                type="button"
                onClick={() =>
                  onEdit(sale)
                }
                title="Edit"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white/[0.06] hover:text-blue-300"
              >
                <Edit3
                  size={14}
                />
              </button>

              <button
                type="button"
                onClick={onConfirm}
                disabled={isLoading}
                title="Confirm & deduct stock"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-emerald-500/10 hover:text-emerald-300 disabled:opacity-40"
              >
                {actionLoading ===
                `confirm-${sale._id}` ? (
                  <Loader2
                    size={14}
                    className="animate-spin"
                  />
                ) : (
                  <Check
                    size={14}
                  />
                )}
              </button>
            </>
          )}

          {sale.status ===
            'confirmed' && (
            <button
              type="button"
              onClick={onComplete}
              disabled={isLoading}
              title="Complete"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-emerald-500/10 hover:text-emerald-300 disabled:opacity-40"
            >
              {actionLoading ===
              `complete-${sale._id}` ? (
                <Loader2
                  size={14}
                  className="animate-spin"
                />
              ) : (
                <CheckCircle2
                  size={14}
                />
              )}
            </button>
          )}

          {sale.status !==
            'cancelled' && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              title="Cancel"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-red-500/10 hover:text-red-300 disabled:opacity-40"
            >
              <XCircle
                size={14}
              />
            </button>
          )}

          {sale.status ===
            'cancelled' && (
            <button
              type="button"
              onClick={onRestore}
              disabled={isLoading}
              title="Restore"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-cyan-500/10 hover:text-cyan-300 disabled:opacity-40"
            >
              {actionLoading ===
              `restore-${sale._id}` ? (
                <Loader2
                  size={14}
                  className="animate-spin"
                />
              ) : (
                <RotateCcw
                  size={14}
                />
              )}
            </button>
          )}

          {sale.status ===
            'draft' && (
            <button
              type="button"
              onClick={onDelete}
              disabled={isLoading}
              title="Delete"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-red-500/10 hover:text-red-300 disabled:opacity-40"
            >
              <Trash2
                size={14}
              />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
};

/* =========================================================
   EMPTY STATE
========================================================= */

const EmptyState = ({
  onCreate,
}) => (
  <div className="flex min-h-[430px] flex-col items-center justify-center px-6 text-center">
    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.035]">
      <ShoppingCart
        size={25}
        className="text-slate-500"
      />
    </div>

    <h3 className="text-base font-semibold text-slate-200">
      No sales found
    </h3>

    <p className="mt-1 max-w-sm text-sm text-slate-600">
      Create your first sales transaction
      or adjust your filters to see
      existing records.
    </p>

    <button
      type="button"
      onClick={onCreate}
      className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
    >
      <Plus size={15} />
      Create Sale
    </button>
  </div>
);

/* =========================================================
   FIELD
========================================================= */

const Field = ({
  label,
  children,
  required = false,
  className = '',
  compact = false,
}) => (
  <label
    className={`block ${className}`}
  >
    <span
      className={`mb-1.5 block font-medium text-slate-400 ${
        compact
          ? 'text-[11px]'
          : 'text-xs'
      }`}
    >
      {label}
      {required && (
        <span className="ml-1 text-red-400">
          *
        </span>
      )}
    </span>

    {children}
  </label>
);

/* =========================================================
   SALE FORM MODAL
========================================================= */

const SaleFormModal = ({
  form,
  editingSale,
  customers,
  products,
  branches,
  totals,
  saving,
  onClose,
  onSubmit,
  onChange,
  onCustomerChange,
  onAddressChange,
  onItemChange,
  onAddItem,
  onRemoveItem,
}) => {
  return (
    <ModalShell
      title={
        editingSale
          ? 'Edit Sale'
          : 'Create New Sale'
      }
      subtitle={
        editingSale
          ? `Update ${editingSale.invoiceNumber}`
          : 'Create a new sales transaction'
      }
      onClose={onClose}
      wide
    >
      <form
        onSubmit={onSubmit}
        className="flex max-h-[calc(100vh-150px)] flex-col"
      >
        <div className="overflow-y-auto px-4 py-4 sm:px-6">
          {/* Basic information */}
          <section>
            <SectionTitle
              icon={FileText}
              title="Sale Information"
              description="Customer, date and transaction details"
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field
                label="Customer"
                required
              >
                <select
                  value={
                    form.customerId
                  }
                  onChange={(event) =>
                    onCustomerChange(
                      event.target
                        .value
                    )
                  }
                  className="input-dark"
                  required
                >
                  <option value="">
                    Select customer
                  </option>

                  {customers.map(
                    (customer) => (
                      <option
                        key={
                          customer._id
                        }
                        value={
                          customer._id
                        }
                      >
                        {customer.displayName ||
                          customer.name ||
                          customer.customerCode}
                      </option>
                    )
                  )}
                </select>
              </Field>

              <Field label="Branch">
                <select
                  value={
                    form.branchId
                  }
                  onChange={(event) =>
                    onChange(
                      'branchId',
                      event.target
                        .value
                    )
                  }
                  className="input-dark"
                >
                  <option value="">
                    Head Office / No Branch
                  </option>

                  {branches.map(
                    (branch) => (
                      <option
                        key={
                          branch._id
                        }
                        value={
                          branch._id
                        }
                      >
                        {branch.name}
                        {branch.code
                          ? ` (${branch.code})`
                          : ''}
                      </option>
                    )
                  )}
                </select>
              </Field>

              <Field
                label="Sale Date"
                required
              >
                <input
                  type="date"
                  value={
                    form.saleDate
                  }
                  onChange={(event) =>
                    onChange(
                      'saleDate',
                      event.target
                        .value
                    )
                  }
                  className="input-dark"
                  required
                />
              </Field>

              <Field label="Due Date">
                <input
                  type="date"
                  value={
                    form.dueDate
                  }
                  onChange={(event) =>
                    onChange(
                      'dueDate',
                      event.target
                        .value
                    )
                  }
                  className="input-dark"
                />
              </Field>

              <Field label="Reference Number">
                <input
                  type="text"
                  value={
                    form.referenceNumber
                  }
                  onChange={(event) =>
                    onChange(
                      'referenceNumber',
                      event.target
                        .value
                    )
                  }
                  placeholder="e.g. PO-001"
                  className="input-dark"
                />
              </Field>

              <Field label="Status">
                <select
                  value={
                    form.status
                  }
                  onChange={(event) =>
                    onChange(
                      'status',
                      event.target
                        .value
                    )
                  }
                  className="input-dark"
                  disabled={
                    Boolean(
                      editingSale
                    )
                  }
                >
                  <option value="draft">
                    Draft
                  </option>
                </select>
              </Field>

              <Field label="Payment Method">
                <select
                  value={
                    form.paymentMethod
                  }
                  onChange={(event) =>
                    onChange(
                      'paymentMethod',
                      event.target
                        .value
                    )
                  }
                  className="input-dark"
                >
                  <option value="">
                    Select method
                  </option>
                  <option value="cash">
                    Cash
                  </option>
                  <option value="bank_transfer">
                    Bank Transfer
                  </option>
                  <option value="upi">
                    UPI
                  </option>
                  <option value="card">
                    Card
                  </option>
                  <option value="cheque">
                    Cheque
                  </option>
                  <option value="credit">
                    Credit
                  </option>
                  <option value="other">
                    Other
                  </option>
                </select>
              </Field>

              <Field label="Currency">
                <select
                  value={
                    form.currency
                  }
                  onChange={(event) =>
                    onChange(
                      'currency',
                      event.target
                        .value
                    )
                  }
                  className="input-dark"
                >
                  <option value="INR">
                    INR — Indian Rupee
                  </option>
                  <option value="USD">
                    USD — US Dollar
                  </option>
                  <option value="EUR">
                    EUR — Euro
                  </option>
                  <option value="GBP">
                    GBP — Pound
                  </option>
                </select>
              </Field>
            </div>
          </section>

          {/* Items */}
          <section className="mt-7">
            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <SectionTitle
                icon={Package}
                title="Sale Items"
                description="Products, quantity, pricing and taxes"
              />

              <button
                type="button"
                onClick={onAddItem}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-cyan-400/20 bg-cyan-400/[0.08] px-3 text-xs font-semibold text-cyan-300 transition hover:bg-cyan-400/[0.13]"
              >
                <Plus size={14} />
                Add Item
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-white/[0.07]">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                    <th className="px-3 py-2.5 text-left text-[10px] uppercase tracking-wider text-slate-600">
                      Product
                    </th>
                    <th className="px-3 py-2.5 text-left text-[10px] uppercase tracking-wider text-slate-600">
                      Qty
                    </th>
                    <th className="px-3 py-2.5 text-left text-[10px] uppercase tracking-wider text-slate-600">
                      Unit Price
                    </th>
                    <th className="px-3 py-2.5 text-left text-[10px] uppercase tracking-wider text-slate-600">
                      Discount %
                    </th>
                    <th className="px-3 py-2.5 text-left text-[10px] uppercase tracking-wider text-slate-600">
                      Tax %
                    </th>
                    <th className="px-3 py-2.5 text-right text-[10px] uppercase tracking-wider text-slate-600">
                      Line Total
                    </th>
                    <th className="w-12 px-2 py-2.5" />
                  </tr>
                </thead>

                <tbody>
                  {form.items.map(
                    (
                      item,
                      index
                    ) => {
                      const gross =
                        Number(
                          item.quantity ||
                            0
                        ) *
                        Number(
                          item.unitPrice ||
                            0
                        );

                      const discount =
                        gross *
                        (Number(
                          item.discountPercent ||
                            0
                        ) /
                          100);

                      const taxable =
                        gross -
                        discount;

                      const tax =
                        taxable *
                        (Number(
                          item.taxPercent ||
                            0
                        ) /
                          100);

                      const lineTotal =
                        taxable +
                        tax;

                      return (
                        <tr
                          key={
                            index
                          }
                          className="border-b border-white/[0.04] last:border-0"
                        >
                          <td className="px-3 py-3">
                            <select
                              value={
                                item.productId
                              }
                              onChange={(
                                event
                              ) =>
                                onItemChange(
                                  index,
                                  'productId',
                                  event
                                    .target
                                    .value
                                )
                              }
                              className="input-dark min-w-[220px]"
                              required
                            >
                              <option value="">
                                Select product
                              </option>

                              {products.map(
                                (
                                  product
                                ) => (
                                  <option
                                    key={
                                      product._id
                                    }
                                    value={
                                      product._id
                                    }
                                  >
                                    {product.name ||
                                      product.displayName ||
                                      product.productCode}
                                  </option>
                                )
                              )}
                            </select>
                          </td>

                          <td className="px-3 py-3">
                            <input
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={
                                item.quantity
                              }
                              onChange={(
                                event
                              ) =>
                                onItemChange(
                                  index,
                                  'quantity',
                                  event
                                    .target
                                    .value
                                )
                              }
                              className="input-dark w-24"
                              required
                            />
                          </td>

                          <td className="px-3 py-3">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={
                                item.unitPrice
                              }
                              onChange={(
                                event
                              ) =>
                                onItemChange(
                                  index,
                                  'unitPrice',
                                  event
                                    .target
                                    .value
                                )
                              }
                              className="input-dark w-32"
                              required
                            />
                          </td>

                          <td className="px-3 py-3">
                            <input
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
                                onItemChange(
                                  index,
                                  'discountPercent',
                                  event
                                    .target
                                    .value
                                )
                              }
                              className="input-dark w-24"
                            />
                          </td>

                          <td className="px-3 py-3">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={
                                item.taxPercent
                              }
                              onChange={(
                                event
                              ) =>
                                onItemChange(
                                  index,
                                  'taxPercent',
                                  event
                                    .target
                                    .value
                                )
                              }
                              className="input-dark w-24"
                            />
                          </td>

                          <td className="px-3 py-3 text-right">
                            <span className="text-sm font-semibold text-slate-200">
                              {formatCurrency(
                                lineTotal,
                                form.currency
                              )}
                            </span>
                          </td>

                          <td className="px-2 py-3">
                            <button
                              type="button"
                              onClick={() =>
                                onRemoveItem(
                                  index
                                )
                              }
                              disabled={
                                form.items
                                  .length ===
                                1
                              }
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition hover:bg-red-500/10 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-20"
                            >
                              <Trash2
                                size={14}
                              />
                            </button>
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-3">
              {form.items.map(
                (
                  item,
                  index
                ) => (
                  <input
                    key={
                      `desc-${index}`
                    }
                    type="text"
                    value={
                      item.description
                    }
                    onChange={(
                      event
                    ) =>
                      onItemChange(
                        index,
                        'description',
                        event.target
                          .value
                      )
                    }
                    placeholder={`Item ${index + 1} description (optional)`}
                    className="mb-2 h-9 w-full rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 text-xs text-slate-300 outline-none placeholder:text-slate-700 focus:border-cyan-400/20"
                  />
                )
              )}
            </div>
          </section>

          {/* Totals */}
          <section className="mt-7">
            <SectionTitle
              icon={Banknote}
              title="Pricing & Payment"
              description="Charges, payment and final amount"
            />

            <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_380px]">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Shipping Amount">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      form.shippingAmount
                    }
                    onChange={(event) =>
                      onChange(
                        'shippingAmount',
                        event.target
                          .value
                      )
                    }
                    className="input-dark"
                  />
                </Field>

                <Field label="Other Charges">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      form.otherCharges
                    }
                    onChange={(event) =>
                      onChange(
                        'otherCharges',
                        event.target
                          .value
                      )
                    }
                    className="input-dark"
                  />
                </Field>

                <Field label="Adjustment">
                  <input
                    type="number"
                    step="0.01"
                    value={
                      form.adjustmentAmount
                    }
                    onChange={(event) =>
                      onChange(
                        'adjustmentAmount',
                        event.target
                          .value
                      )
                    }
                    className="input-dark"
                  />
                </Field>

                <Field label="Paid Amount">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      form.paidAmount
                    }
                    onChange={(event) =>
                      onChange(
                        'paidAmount',
                        event.target
                          .value
                      )
                    }
                    className="input-dark"
                  />
                </Field>

                <Field
                  label="Notes"
                  className="sm:col-span-2"
                >
                  <textarea
                    value={
                      form.notes
                    }
                    onChange={(event) =>
                      onChange(
                        'notes',
                        event.target
                          .value
                      )
                    }
                    rows={3}
                    placeholder="Internal notes..."
                    className="input-dark min-h-[90px] resize-y py-2.5"
                  />
                </Field>

                <Field
                  label="Terms & Conditions"
                  className="sm:col-span-2"
                >
                  <textarea
                    value={
                      form.termsAndConditions
                    }
                    onChange={(event) =>
                      onChange(
                        'termsAndConditions',
                        event.target
                          .value
                      )
                    }
                    rows={3}
                    placeholder="Payment terms and conditions..."
                    className="input-dark min-h-[90px] resize-y py-2.5"
                  />
                </Field>
              </div>

              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
                <div className="space-y-3">
                  <TotalRow
                    label="Subtotal"
                    value={formatCurrency(
                      totals.subtotal,
                      form.currency
                    )}
                  />

                  <TotalRow
                    label="Discount"
                    value={`-${formatCurrency(
                      totals.discount,
                      form.currency
                    )}`}
                    valueClass="text-red-300"
                  />

                  <TotalRow
                    label="Taxable Amount"
                    value={formatCurrency(
                      totals.taxable,
                      form.currency
                    )}
                  />

                  <TotalRow
                    label="Tax"
                    value={formatCurrency(
                      totals.tax,
                      form.currency
                    )}
                  />

                  <TotalRow
                    label="Shipping"
                    value={formatCurrency(
                      totals.shipping,
                      form.currency
                    )}
                  />

                  <TotalRow
                    label="Other Charges"
                    value={formatCurrency(
                      totals.other,
                      form.currency
                    )}
                  />

                  <TotalRow
                    label="Adjustment"
                    value={formatCurrency(
                      totals.adjustment,
                      form.currency
                    )}
                  />

                  <div className="my-2 border-t border-white/[0.07]" />

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-300">
                      Grand Total
                    </span>

                    <span className="text-xl font-bold text-white">
                      {formatCurrency(
                        totals.grandTotal,
                        form.currency
                      )}
                    </span>
                  </div>

                  <TotalRow
                    label="Paid"
                    value={formatCurrency(
                      totals.paid,
                      form.currency
                    )}
                    valueClass="text-emerald-300"
                  />

                  <div className="rounded-xl border border-amber-400/10 bg-amber-400/[0.04] px-3 py-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-amber-200/70">
                        Balance Due
                      </span>

                      <span className="text-base font-bold text-amber-300">
                        {formatCurrency(
                          totals.balance,
                          form.currency
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Addresses */}
          <section className="mt-7">
            <SectionTitle
              icon={User}
              title="Addresses"
              description="Billing and shipping information"
            />

            <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <AddressCard
                title="Billing Address"
                address={
                  form.billingAddress
                }
                onChange={(
                  field,
                  value
                ) =>
                  onAddressChange(
                    'billingAddress',
                    field,
                    value
                  )
                }
              />

              <AddressCard
                title="Shipping Address"
                address={
                  form.shippingAddress
                }
                onChange={(
                  field,
                  value
                ) =>
                  onAddressChange(
                    'shippingAddress',
                    field,
                    value
                  )
                }
              />
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="flex flex-col-reverse gap-2 border-t border-white/[0.07] bg-[#0a0d12] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-[11px] text-slate-600">
            Sale will remain in draft until
            confirmed.
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="h-10 rounded-xl border border-white/[0.08] bg-white/[0.035] px-4 text-sm font-medium text-slate-300 transition hover:bg-white/[0.07] disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Loader2
                    size={15}
                    className="animate-spin"
                  />
                  Saving...
                </>
              ) : (
                <>
                  <Check size={15} />
                  {editingSale
                    ? 'Update Sale'
                    : 'Create Sale'}
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </ModalShell>
  );
};

/* =========================================================
   SECTION TITLE
========================================================= */

const SectionTitle = ({
  icon: Icon,
  title,
  description,
}) => (
  <div className="flex items-start gap-3">
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.035]">
      <Icon
        size={14}
        className="text-slate-400"
      />
    </div>

    <div>
      <h3 className="text-sm font-semibold text-slate-200">
        {title}
      </h3>

      <p className="mt-0.5 text-[11px] text-slate-600">
        {description}
      </p>
    </div>
  </div>
);

/* =========================================================
   TOTAL ROW
========================================================= */

const TotalRow = ({
  label,
  value,
  valueClass = 'text-slate-300',
}) => (
  <div className="flex items-center justify-between gap-4">
    <span className="text-xs text-slate-500">
      {label}
    </span>

    <span
      className={`text-xs font-medium ${valueClass}`}
    >
      {value}
    </span>
  </div>
);

/* =========================================================
   ADDRESS CARD
========================================================= */

const AddressCard = ({
  title,
  address,
  onChange,
}) => (
  <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
    <p className="mb-3 text-xs font-semibold text-slate-300">
      {title}
    </p>

    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <input
        value={address?.line1 || ''}
        onChange={(event) =>
          onChange(
            'line1',
            event.target.value
          )
        }
        placeholder="Address line 1"
        className="input-dark sm:col-span-2"
      />

      <input
        value={address?.line2 || ''}
        onChange={(event) =>
          onChange(
            'line2',
            event.target.value
          )
        }
        placeholder="Address line 2"
        className="input-dark sm:col-span-2"
      />

      <input
        value={address?.city || ''}
        onChange={(event) =>
          onChange(
            'city',
            event.target.value
          )
        }
        placeholder="City"
        className="input-dark"
      />

      <input
        value={address?.state || ''}
        onChange={(event) =>
          onChange(
            'state',
            event.target.value
          )
        }
        placeholder="State"
        className="input-dark"
      />

      <input
        value={
          address?.country || ''
        }
        onChange={(event) =>
          onChange(
            'country',
            event.target.value
          )
        }
        placeholder="Country"
        className="input-dark"
      />

      <input
        value={
          address?.postalCode || ''
        }
        onChange={(event) =>
          onChange(
            'postalCode',
            event.target.value
          )
        }
        placeholder="Postal code"
        className="input-dark"
      />
    </div>
  </div>
);

/* =========================================================
   DETAILS MODAL
========================================================= */

const SaleDetailsModal = ({
  sale,
  actionLoading,
  onClose,
  onEdit,
  onConfirm,
  onComplete,
  onCancel,
}) => {
  return (
    <ModalShell
      title={
        sale.invoiceNumber ||
        'Sale Details'
      }
      subtitle={`${getCustomerName(
        sale
      )} • ${formatDate(
        sale.saleDate
      )}`}
      onClose={onClose}
      wide
    >
      <div className="max-h-[calc(100vh-150px)] overflow-y-auto px-4 py-4 sm:px-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <DetailBox
            label="Status"
            value={statusLabel(
              sale.status
            )}
          />

          <DetailBox
            label="Payment"
            value={paymentLabel(
              sale.paymentStatus
            )}
          />

          <DetailBox
            label="Grand Total"
            value={formatCurrency(
              sale.grandTotal,
              sale.currency
            )}
          />

          <DetailBox
            label="Balance"
            value={formatCurrency(
              sale.balanceAmount,
              sale.currency
            )}
          />
        </div>

        <div className="mt-5 overflow-x-auto rounded-xl border border-white/[0.07]">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                <th className="px-3 py-3 text-left text-[10px] uppercase tracking-wider text-slate-600">
                  Product
                </th>
                <th className="px-3 py-3 text-right text-[10px] uppercase tracking-wider text-slate-600">
                  Qty
                </th>
                <th className="px-3 py-3 text-right text-[10px] uppercase tracking-wider text-slate-600">
                  Price
                </th>
                <th className="px-3 py-3 text-right text-[10px] uppercase tracking-wider text-slate-600">
                  Tax
                </th>
                <th className="px-3 py-3 text-right text-[10px] uppercase tracking-wider text-slate-600">
                  Total
                </th>
              </tr>
            </thead>

            <tbody>
              {(sale.items || []).map(
                (item, index) => (
                  <tr
                    key={
                      item._id ||
                      index
                    }
                    className="border-b border-white/[0.04] last:border-0"
                  >
                    <td className="px-3 py-3">
                      <p className="text-sm font-medium text-slate-200">
                        {item.productName ||
                          'Product'}
                      </p>

                      <p className="mt-0.5 text-[10px] text-slate-600">
                        {item.sku ||
                          item.productCode ||
                          ''}
                      </p>
                    </td>

                    <td className="px-3 py-3 text-right text-sm text-slate-300">
                      {item.quantity}
                    </td>

                    <td className="px-3 py-3 text-right text-sm text-slate-300">
                      {formatCurrency(
                        item.unitPrice,
                        sale.currency
                      )}
                    </td>

                    <td className="px-3 py-3 text-right text-sm text-slate-300">
                      {item.taxPercent ??
                        0}
                      %
                    </td>

                    <td className="px-3 py-3 text-right text-sm font-semibold text-slate-100">
                      {formatCurrency(
                        item.lineTotal,
                        sale.currency
                      )}
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
            <p className="mb-3 text-xs font-semibold text-slate-300">
              Customer
            </p>

            <div className="space-y-2 text-xs">
              <DetailLine
                label="Name"
                value={getCustomerName(
                  sale
                )}
              />

              <DetailLine
                label="Email"
                value={
                  getCustomerEmail(
                    sale
                  ) || '-'
                }
              />

              <DetailLine
                label="Branch"
                value={getBranchName(
                  sale
                )}
              />

              <DetailLine
                label="Reference"
                value={
                  sale.referenceNumber ||
                  '-'
                }
              />
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
            <p className="mb-3 text-xs font-semibold text-slate-300">
              Amount Summary
            </p>

            <div className="space-y-2">
              <TotalRow
                label="Subtotal"
                value={formatCurrency(
                  sale.subtotal,
                  sale.currency
                )}
              />

              <TotalRow
                label="Discount"
                value={formatCurrency(
                  sale.discountAmount,
                  sale.currency
                )}
              />

              <TotalRow
                label="Tax"
                value={formatCurrency(
                  sale.taxAmount,
                  sale.currency
                )}
              />

              <TotalRow
                label="Shipping"
                value={formatCurrency(
                  sale.shippingAmount,
                  sale.currency
                )}
              />

              <div className="border-t border-white/[0.06] pt-2">
                <TotalRow
                  label="Grand Total"
                  value={formatCurrency(
                    sale.grandTotal,
                    sale.currency
                  )}
                  valueClass="text-white font-bold"
                />
              </div>

              <TotalRow
                label="Paid"
                value={formatCurrency(
                  sale.paidAmount,
                  sale.currency
                )}
                valueClass="text-emerald-300"
              />

              <TotalRow
                label="Balance"
                value={formatCurrency(
                  sale.balanceAmount,
                  sale.currency
                )}
                valueClass="text-amber-300 font-semibold"
              />
            </div>
          </div>
        </div>

        {sale.notes && (
          <div className="mt-4 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
            <p className="mb-1 text-xs font-semibold text-slate-300">
              Notes
            </p>

            <p className="text-sm leading-6 text-slate-500">
              {sale.notes}
            </p>
          </div>
        )}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          {sale.status ===
            'draft' && (
            <>
              <button
                type="button"
                onClick={onEdit}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.035] px-3 text-xs font-medium text-slate-300 transition hover:bg-white/[0.07]"
              >
                <Edit3 size={14} />
                Edit
              </button>

              <button
                type="button"
                onClick={onConfirm}
                disabled={
                  actionLoading ===
                  `confirm-${sale._id}`
                }
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-emerald-500/10 px-3 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/15 disabled:opacity-50"
              >
                {actionLoading ===
                `confirm-${sale._id}` ? (
                  <Loader2
                    size={14}
                    className="animate-spin"
                  />
                ) : (
                  <Check
                    size={14}
                  />
                )}
                Confirm Sale
              </button>
            </>
          )}

          {sale.status ===
            'confirmed' && (
            <button
              type="button"
              onClick={onComplete}
              disabled={
                actionLoading ===
                `complete-${sale._id}`
              }
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-emerald-500/10 px-3 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/15 disabled:opacity-50"
            >
              {actionLoading ===
              `complete-${sale._id}` ? (
                <Loader2
                  size={14}
                  className="animate-spin"
                />
              ) : (
                <CheckCircle2
                  size={14}
                />
              )}
              Complete
            </button>
          )}

          {sale.status !==
            'cancelled' && (
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-red-500/10 px-3 text-xs font-semibold text-red-300 transition hover:bg-red-500/15"
            >
              <XCircle size={14} />
              Cancel
            </button>
          )}
        </div>
      </div>
    </ModalShell>
  );
};

/* =========================================================
   DETAIL BOX
========================================================= */

const DetailBox = ({
  label,
  value,
}) => (
  <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3">
    <p className="text-[10px] uppercase tracking-wider text-slate-600">
      {label}
    </p>

    <p className="mt-1 text-sm font-semibold text-slate-200">
      {value}
    </p>
  </div>
);

/* =========================================================
   DETAIL LINE
========================================================= */

const DetailLine = ({
  label,
  value,
}) => (
  <div className="flex items-start justify-between gap-4">
    <span className="text-slate-600">
      {label}
    </span>

    <span className="max-w-[65%] text-right font-medium text-slate-300">
      {value}
    </span>
  </div>
);

/* =========================================================
   CONFIRM MODAL
========================================================= */

const ConfirmModal = ({
  title,
  description,
  icon: Icon,
  danger = false,
  loading = false,
  confirmText,
  onClose,
  onConfirm,
}) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
    <div className="w-full max-w-md overflow-hidden rounded-2xl border border-white/[0.09] bg-[#0d1117] shadow-2xl">
      <div className="p-5">
        <div
          className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${
            danger
              ? 'bg-red-500/10 text-red-300'
              : 'bg-cyan-500/10 text-cyan-300'
          }`}
        >
          <Icon size={20} />
        </div>

        <h3 className="text-lg font-semibold text-white">
          {title}
        </h3>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          {description}
        </p>
      </div>

      <div className="flex justify-end gap-2 border-t border-white/[0.07] bg-black/10 px-5 py-3">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="h-9 rounded-lg border border-white/[0.08] bg-white/[0.035] px-3 text-xs font-medium text-slate-300 transition hover:bg-white/[0.07]"
        >
          Keep
        </button>

        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className={`inline-flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-semibold ${
            danger
              ? 'bg-red-500/15 text-red-300 hover:bg-red-500/20'
              : 'bg-cyan-500/15 text-cyan-300'
          } disabled:opacity-50`}
        >
          {loading && (
            <Loader2
              size={13}
              className="animate-spin"
            />
          )}

          {confirmText}
        </button>
      </div>
    </div>
  </div>
);

/* =========================================================
   MODAL SHELL
========================================================= */

const ModalShell = ({
  title,
  subtitle,
  onClose,
  children,
  wide = false,
}) => (
  <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/75 p-2 backdrop-blur-sm sm:p-4">
    <div
      className={`flex w-full flex-col overflow-hidden rounded-2xl border border-white/[0.09] bg-[#0d1117] shadow-2xl ${
        wide
          ? 'max-w-6xl'
          : 'max-w-2xl'
      }`}
    >
      <div className="flex items-center justify-between gap-4 border-b border-white/[0.07] bg-[#0b0e13] px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold text-white sm:text-lg">
            {title}
          </h2>

          {subtitle && (
            <p className="mt-0.5 truncate text-[11px] text-slate-600">
              {subtitle}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.03] text-slate-500 transition hover:bg-white/[0.07] hover:text-slate-200"
        >
          <X size={16} />
        </button>
      </div>

      {children}
    </div>
  </div>
);

export default Sales;