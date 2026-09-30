import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  FileText,
  Plus,
  Search,
  RefreshCw,
  Download,
  Printer,
  Eye,
  Pencil,
  Trash2,
  MoreHorizontal,
  X,
  Check,
  Ban,
  Copy,
  CreditCard,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Building2,
  User,
  IndianRupee,
  Receipt,
  Clock,
  CheckCircle2,
  AlertCircle,
  CircleDollarSign,
  Loader2,
  MapPin,
  Phone,
  Mail,
  Hash,
  Package,
  Percent,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  RotateCcw,
} from "lucide-react";

import api, { getToken } from "../../services/api";

const STATUS_OPTIONS = [
  "all",
  "draft",
  "issued",
  "partially_paid",
  "paid",
  "overdue",
  "cancelled",
];

const PAYMENT_STATUS_OPTIONS = [
  "all",
  "unpaid",
  "partial",
  "paid",
  "refunded",
];

const PAYMENT_METHODS = [
  "cash",
  "bank_transfer",
  "upi",
  "card",
  "cheque",
  "credit",
  "other",
];

const DISCOUNT_TYPES = [
  {
    value: "percentage",
    label: "Percentage",
  },
  {
    value: "fixed",
    label: "Fixed Amount",
  },
];

const EMPTY_FORM = {
  branchId: "",
  customerId: "",
  invoiceDate: new Date().toISOString().slice(0, 10),
  dueDate: "",
  referenceNumber: "",
  placeOfSupply: "",
  supplyType: "intra_state",
  reverseCharge: false,
  paymentMethod: "credit",
  shippingCharges: 0,
  otherCharges: 0,
  roundOff: 0,
  notes: "",
  termsAndConditions: "",
  customerNotes: "",
  newCustomer: {
    name: "",
    companyName: "",
    email: "",
    phone: "",
    gstin: "",
    billingAddress: {
      line1: "",
      line2: "",
      city: "",
      state: "",
      country: "India",
      postalCode: "",
    },
    shippingAddress: {
      line1: "",
      line2: "",
      city: "",
      state: "",
      country: "India",
      postalCode: "",
    },
  },
  items: [
    {
      productId: "",
      quantity: 1,
      unitPrice: 0,
      discountType: "percentage",
      discountValue: 0,
      gstRate: 18,
    },
  ],
};

const EMPTY_PAYMENT = {
  amount: "",
  paymentMethod: "upi",
  paymentDate: new Date().toISOString().slice(0, 10),
  referenceNumber: "",
  notes: "",
};

const cn = (...classes) =>
  classes.filter(Boolean).join(" ");

const money = (value, currency = "INR") => {
  const number = Number(value || 0);

  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(number);
  } catch {
    return `₹${number.toLocaleString("en-IN", {
      maximumFractionDigits: 2,
    })}`;
  }
};

const numberFormat = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });

const dateFormat = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getErrorMessage = (error) => {
  if (error?.response?.status === 401) {
    return "Your session has expired. Please login again.";
  }

  if (error?.response?.status === 403) {
    return (
      error?.response?.data?.message ||
      "You do not have permission to perform this action."
    );
  }

  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    "Something went wrong. Please try again."
  );
};

const getList = (response) => {
  const data = response?.data;

  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  if (Array.isArray(data?.data?.data)) {
    return data.data.data;
  }

  if (Array.isArray(data?.invoices)) {
    return data.invoices;
  }

  if (Array.isArray(data?.data?.invoices)) {
    return data.data.invoices;
  }

  if (Array.isArray(data?.results)) {
    return data.results;
  }

  return [];
};

const getObject = (response) => {
  const data = response?.data;

  if (data?.data && !Array.isArray(data.data)) {
    return data.data;
  }

  return data;
};

const getPagination = (response) => {
  const data = response?.data;

  return (
    data?.pagination ||
    data?.data?.pagination ||
    data?.meta ||
    {}
  );
};

const statusLabel = (status) => {
  if (!status) return "Unknown";

  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const statusClass = (status) => {
  switch (status) {
    case "paid":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-400";

    case "issued":
      return "border-blue-500/20 bg-blue-500/10 text-blue-400";

    case "partially_paid":
      return "border-amber-500/20 bg-amber-500/10 text-amber-400";

    case "overdue":
      return "border-red-500/20 bg-red-500/10 text-red-400";

    case "cancelled":
      return "border-rose-500/20 bg-rose-500/10 text-rose-400";

    case "draft":
      return "border-slate-500/20 bg-slate-500/10 text-slate-300";

    default:
      return "border-violet-500/20 bg-violet-500/10 text-violet-400";
  }
};

const paymentStatusClass = (status) => {
  switch (status) {
    case "paid":
      return "text-emerald-400";

    case "partial":
      return "text-amber-400";

    case "refunded":
      return "text-purple-400";

    default:
      return "text-slate-400";
  }
};

const emptyAddress = () => ({
  line1: "",
  line2: "",
  city: "",
  state: "",
  country: "India",
  postalCode: "",
});

const createEmptyItem = () => ({
  productId: "",
  quantity: 1,
  unitPrice: 0,
  discountType: "percentage",
  discountValue: 0,
  gstRate: 18,
});

const normalizeCustomerId = (customer) =>
  customer?._id || customer?.id || "";

const normalizeProductId = (product) =>
  product?._id || product?.id || "";

const getCustomerName = (customer) =>
  customer?.displayName ||
  customer?.companyName ||
  customer?.name ||
  "Unnamed Customer";

const getProductName = (product) =>
  product?.displayName ||
  product?.name ||
  product?.productCode ||
  "Unnamed Product";

const getInvoiceAmount = (invoice) =>
  Number(
    invoice?.grandTotal ??
      invoice?.total ??
      invoice?.totalAmount ??
      0
  );

const calculateItem = (item) => {
  const quantity = Math.max(
    Number(item.quantity) || 0,
    0
  );

  const unitPrice = Math.max(
    Number(item.unitPrice) || 0,
    0
  );

  const gross = quantity * unitPrice;

  let discountAmount = 0;

  if (item.discountType === "percentage") {
    discountAmount =
      gross *
      (Math.max(
        Number(item.discountValue) || 0,
        0
      ) /
        100);
  } else {
    discountAmount = Math.max(
      Number(item.discountValue) || 0,
      0
    );
  }

  discountAmount = Math.min(
    discountAmount,
    gross
  );

  const taxableAmount =
    gross - discountAmount;

  const gstRate = Math.max(
    Number(item.gstRate) || 0,
    0
  );

  const totalTax =
    taxableAmount * (gstRate / 100);

  return {
    gross,
    discountAmount,
    taxableAmount,
    totalTax,
  };
};

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [branches, setBranches] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadingDependencies, setLoadingDependencies] =
    useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState("all");
  const [paymentFilter, setPaymentFilter] =
    useState("all");

  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    pages: 1,
  });

  const [summary, setSummary] = useState({
    totalInvoices: 0,
    draft: 0,
    issued: 0,
    paid: 0,
    overdue: 0,
    totalAmount: 0,
    paidAmount: 0,
    balanceAmount: 0,
  });

  const [showCreate, setShowCreate] =
    useState(false);

  const [showView, setShowView] =
    useState(false);

  const [showPayment, setShowPayment] =
    useState(false);

  const [showCancel, setShowCancel] =
    useState(false);

  const [showMenu, setShowMenu] =
    useState(null);

  const [editingInvoice, setEditingInvoice] =
    useState(null);

  const [selectedInvoice, setSelectedInvoice] =
    useState(null);

  const [paymentInvoice, setPaymentInvoice] =
    useState(null);

  const [cancelInvoice, setCancelInvoice] =
    useState(null);

  const [paymentForm, setPaymentForm] =
    useState(EMPTY_PAYMENT);

  const [cancelReason, setCancelReason] =
    useState("");

  const [form, setForm] =
    useState(EMPTY_FORM);

  const [formLoading, setFormLoading] =
    useState(false);

  const [actionLoading, setActionLoading] =
    useState(null);

  const [viewLoading, setViewLoading] =
    useState(false);

  const [useNewCustomer, setUseNewCustomer] =
    useState(false);

  const [showAdvanced, setShowAdvanced] =
    useState(false);

  const [mobileFilters, setMobileFilters] =
    useState(false);

  const clearMessages = () => {
    setError("");
    setSuccess("");
  };

  const handleAuthError = (err) => {
    if (err?.response?.status === 401) {
      clearMessages();
    }

    setError(getErrorMessage(err));
  };

  const fetchInvoices = useCallback(
    async ({
      silent = false,
      requestedPage = page,
    } = {}) => {
      try {
        if (silent) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const params = {
          page: requestedPage,
          limit,
        };

        if (search.trim()) {
          params.search = search.trim();
        }

        if (statusFilter !== "all") {
          params.status = statusFilter;
        }

        if (paymentFilter !== "all") {
          params.paymentStatus = paymentFilter;
        }

        const response = await api.get(
          "/invoices",
          {
            params,
          }
        );

        const data = getList(response);
        const meta = getPagination(response);

        setInvoices(data);

        setPagination({
          total:
            Number(
              meta?.total ??
                meta?.totalItems ??
                response?.data?.total ??
                data.length
            ) || 0,
          page:
            Number(
              meta?.page ??
                meta?.currentPage ??
                requestedPage
            ) || requestedPage,
          limit:
            Number(meta?.limit ?? limit) || limit,
          pages:
            Number(
              meta?.pages ??
                meta?.totalPages ??
                Math.max(
                  1,
                  Math.ceil(
                    (Number(
                      meta?.total ??
                        response?.data?.total ??
                        data.length
                    ) || 0) / limit
                  )
                )
            ) || 1,
        });
      } catch (err) {
        handleAuthError(err);
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
      paymentFilter,
    ]
  );

  const fetchSummary = useCallback(async () => {
    try {
      const response = await api.get(
        "/invoices/summary"
      );

      const data = getObject(response);

      setSummary({
        totalInvoices:
          Number(
            data?.totalInvoices ??
              data?.count ??
              data?.total ??
              0
          ) || 0,

        draft:
          Number(
            data?.draft ??
              data?.draftCount ??
              data?.statusCounts?.draft ??
              0
          ) || 0,

        issued:
          Number(
            data?.issued ??
              data?.issuedCount ??
              data?.statusCounts?.issued ??
              0
          ) || 0,

        paid:
          Number(
            data?.paid ??
              data?.paidCount ??
              data?.statusCounts?.paid ??
              0
          ) || 0,

        overdue:
          Number(
            data?.overdue ??
              data?.overdueCount ??
              data?.statusCounts?.overdue ??
              0
          ) || 0,

        totalAmount:
          Number(
            data?.totalAmount ??
              data?.grandTotal ??
              data?.totals?.grandTotal ??
              0
          ) || 0,

        paidAmount:
          Number(
            data?.paidAmount ??
              data?.totals?.paidAmount ??
              0
          ) || 0,

        balanceAmount:
          Number(
            data?.balanceAmount ??
              data?.totals?.balanceAmount ??
              0
          ) || 0,
      });
    } catch (err) {
      console.error(
        "Invoice summary error:",
        err
      );
    }
  }, []);

  const fetchDependencies = useCallback(
    async () => {
      try {
        setLoadingDependencies(true);

        const results =
          await Promise.allSettled([
            api.get(
              "/customers",
              {
                params: {
                  status: "active",
                  limit: 1000,
                },
              }
            ),

            api.get(
              "/products",
              {
                params: {
                  status: "active",
                  limit: 1000,
                },
              }
            ),

            api.get(
              "/branches",
              {
                params: {
                  status: "active",
                  limit: 100,
                },
              }
            ),
          ]);

        const [
          customerResult,
          productResult,
          branchResult,
        ] = results;

        if (
          customerResult.status ===
          "fulfilled"
        ) {
          setCustomers(
            getList(customerResult.value)
          );
        }

        if (
          productResult.status ===
          "fulfilled"
        ) {
          setProducts(
            getList(productResult.value)
          );
        }

        if (
          branchResult.status ===
          "fulfilled"
        ) {
          setBranches(
            getList(branchResult.value)
          );
        }
      } catch (err) {
        handleAuthError(err);
      } finally {
        setLoadingDependencies(false);
      }
    },
    []
  );

  useEffect(() => {
    const token = getToken();

    if (!token) {
      setLoading(false);
      setError(
        "Authentication token is missing. Please login again."
      );
      return;
    }

    fetchDependencies();
  }, [fetchDependencies]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchInvoices();
    }, 250);

    return () => clearTimeout(timer);
  }, [
    fetchInvoices,
  ]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(
        () => setSuccess(""),
        3500
      );

      return () => clearTimeout(timer);
    }
  }, [success]);

  const totals = useMemo(() => {
    const subtotal = form.items.reduce(
      (sum, item) =>
        sum + calculateItem(item).gross,
      0
    );

    const totalDiscount =
      form.items.reduce(
        (sum, item) =>
          sum +
          calculateItem(item)
            .discountAmount,
        0
      );

    const taxableAmount =
      form.items.reduce(
        (sum, item) =>
          sum +
          calculateItem(item)
            .taxableAmount,
        0
      );

    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;

    form.items.forEach((item) => {
      const calculated =
        calculateItem(item);

      if (
        form.supplyType ===
        "inter_state"
      ) {
        igstAmount +=
          calculated.totalTax;
      } else {
        cgstAmount +=
          calculated.totalTax / 2;

        sgstAmount +=
          calculated.totalTax / 2;
      }
    });

    const totalTax =
      cgstAmount +
      sgstAmount +
      igstAmount;

    const shippingCharges =
      Number(form.shippingCharges) || 0;

    const otherCharges =
      Number(form.otherCharges) || 0;

    const roundOff =
      Number(form.roundOff) || 0;

    const grandTotal =
      taxableAmount +
      totalTax +
      shippingCharges +
      otherCharges +
      roundOff;

    return {
      subtotal,
      totalDiscount,
      taxableAmount,
      cgstAmount,
      sgstAmount,
      igstAmount,
      totalTax,
      shippingCharges,
      otherCharges,
      roundOff,
      grandTotal,
    };
  }, [form]);

  const resetForm = () => {
    setForm({
      ...EMPTY_FORM,
      items: [
        createEmptyItem(),
      ],
      newCustomer: {
        ...EMPTY_FORM.newCustomer,
        billingAddress:
          emptyAddress(),
        shippingAddress:
          emptyAddress(),
      },
    });

    setEditingInvoice(null);
    setUseNewCustomer(false);
    setShowAdvanced(false);
  };

  const openCreate = () => {
    clearMessages();
    resetForm();
    setShowCreate(true);
  };

  const closeCreate = () => {
    if (formLoading) return;

    setShowCreate(false);
    resetForm();
  };

  const updateForm = (field, value) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const updateNewCustomer = (
    field,
    value
  ) => {
    setForm((previous) => ({
      ...previous,
      newCustomer: {
        ...previous.newCustomer,
        [field]: value,
      },
    }));
  };

  const updateAddress = (
    type,
    field,
    value
  ) => {
    setForm((previous) => ({
      ...previous,
      newCustomer: {
        ...previous.newCustomer,
        [type]: {
          ...previous.newCustomer[type],
          [field]: value,
        },
      },
    }));
  };

  const updateItem = (
    index,
    field,
    value
  ) => {
    setForm((previous) => ({
      ...previous,
      items: previous.items.map(
        (item, itemIndex) =>
          itemIndex === index
            ? {
                ...item,
                [field]: value,
              }
            : item
      ),
    }));
  };

  const addItem = () => {
    setForm((previous) => ({
      ...previous,
      items: [
        ...previous.items,
        createEmptyItem(),
      ],
    }));
  };

  const removeItem = (index) => {
    if (form.items.length === 1) {
      return;
    }

    setForm((previous) => ({
      ...previous,
      items: previous.items.filter(
        (_, itemIndex) =>
          itemIndex !== index
      ),
    }));
  };

  const selectProduct = (
    index,
    productId
  ) => {
    const product =
      products.find(
        (item) =>
          normalizeProductId(item) ===
          productId
      );

    setForm((previous) => ({
      ...previous,
      items: previous.items.map(
        (item, itemIndex) => {
          if (itemIndex !== index) {
            return item;
          }

          return {
            ...item,
            productId,
            unitPrice:
              product?.sellingPrice ??
              product?.salePrice ??
              product?.price ??
              item.unitPrice ??
              0,
            gstRate:
              product?.gstRate ??
              product?.taxRate ??
              item.gstRate ??
              18,
          };
        }
      ),
    }));
  };

  const buildPayload = () => {
    const payload = {
      branchId:
        form.branchId || undefined,

      customerId:
        useNewCustomer
          ? undefined
          : form.customerId || undefined,

      invoiceDate:
        form.invoiceDate || undefined,

      dueDate:
        form.dueDate || undefined,

      referenceNumber:
        form.referenceNumber.trim() ||
        undefined,

      placeOfSupply:
        form.placeOfSupply.trim() ||
        undefined,

      supplyType:
        form.supplyType,

      reverseCharge:
        Boolean(form.reverseCharge),

      paymentMethod:
        form.paymentMethod,

      shippingCharges:
        Number(form.shippingCharges) || 0,

      otherCharges:
        Number(form.otherCharges) || 0,

      roundOff:
        Number(form.roundOff) || 0,

      notes:
        form.notes.trim() || undefined,

      termsAndConditions:
        form.termsAndConditions.trim() ||
        undefined,

      customerNotes:
        form.customerNotes.trim() ||
        undefined,

      items: form.items.map(
        (item) => ({
          productId:
            item.productId,
          quantity:
            Number(item.quantity) || 0,
          unitPrice:
            Number(item.unitPrice) || 0,
          discountType:
            item.discountType,
          discountValue:
            Number(item.discountValue) || 0,
          gstRate:
            Number(item.gstRate) || 0,
        })
      ),
    };

    if (useNewCustomer) {
      payload.newCustomer = {
        name:
          form.newCustomer.name.trim(),
        companyName:
          form.newCustomer.companyName.trim(),
        email:
          form.newCustomer.email.trim(),
        phone:
          form.newCustomer.phone.trim(),
        gstin:
          form.newCustomer.gstin.trim(),

        billingAddress: {
          ...form.newCustomer.billingAddress,
        },

        shippingAddress: {
          ...form.newCustomer.shippingAddress,
        },
      };
    }

    return payload;
  };

  const validateForm = () => {
    if (!form.invoiceDate) {
      return "Invoice date is required.";
    }

    if (!form.dueDate) {
      return "Due date is required.";
    }

    if (!useNewCustomer && !form.customerId) {
      return "Please select a customer.";
    }

    if (useNewCustomer) {
      if (
        !form.newCustomer.name.trim() &&
        !form.newCustomer.companyName.trim()
      ) {
        return "Customer name or company name is required.";
      }
    }

    if (!form.items.length) {
      return "At least one invoice item is required.";
    }

    for (
      let index = 0;
      index < form.items.length;
      index += 1
    ) {
      const item = form.items[index];

      if (!item.productId) {
        return `Please select a product for item ${
          index + 1
        }.`;
      }

      if (
        Number(item.quantity) <= 0
      ) {
        return `Quantity must be greater than 0 for item ${
          index + 1
        }.`;
      }

      if (
        Number(item.unitPrice) < 0
      ) {
        return `Unit price cannot be negative for item ${
          index + 1
        }.`;
      }

      if (
        Number(item.gstRate) < 0
      ) {
        return `GST rate cannot be negative for item ${
          index + 1
        }.`;
      }

      if (
        item.discountType ===
          "percentage" &&
        Number(item.discountValue) > 100
      ) {
        return `Percentage discount cannot exceed 100% for item ${
          index + 1
        }.`;
      }

      const calculation =
        calculateItem(item);

      if (
        Number(item.discountValue) >
        0 &&
        calculation.discountAmount >
          calculation.gross
      ) {
        return `Discount cannot exceed item amount for item ${
          index + 1
        }.`;
      }
    }

    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    clearMessages();

    const validationError =
      validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setFormLoading(true);

      const payload =
        buildPayload();

      let response;

      if (editingInvoice) {
        response = await api.put(
          `/invoices/${editingInvoice._id}`,
          payload
        );
      } else {
        response = await api.post(
          "/invoices",
          payload
        );
      }

      const savedInvoice =
        getObject(response);

      setSuccess(
        editingInvoice
          ? "Invoice updated successfully."
          : `Invoice ${
              savedInvoice?.invoiceNumber ||
              ""
            } created successfully.`
      );

      setShowCreate(false);
      resetForm();

      await Promise.all([
        fetchInvoices({
          silent: true,
          requestedPage: page,
        }),
        fetchSummary(),
      ]);
    } catch (err) {
      handleAuthError(err);
    } finally {
      setFormLoading(false);
    }
  };

  const mapInvoiceToForm = (
    invoice
  ) => {
    const invoiceItems =
      Array.isArray(invoice?.items)
        ? invoice.items
        : [];

    const customerId =
      invoice?.customerId?._id ||
      invoice?.customerId ||
      "";

    const branchId =
      invoice?.branchId?._id ||
      invoice?.branchId ||
      "";

    return {
      branchId,
      customerId,
      invoiceDate:
        invoice?.invoiceDate
          ? new Date(
              invoice.invoiceDate
            )
              .toISOString()
              .slice(0, 10)
          : EMPTY_FORM.invoiceDate,

      dueDate:
        invoice?.dueDate
          ? new Date(
              invoice.dueDate
            )
              .toISOString()
              .slice(0, 10)
          : "",

      referenceNumber:
        invoice?.referenceNumber || "",

      placeOfSupply:
        invoice?.placeOfSupply || "",

      supplyType:
        invoice?.supplyType ||
        "intra_state",

      reverseCharge:
        Boolean(invoice?.reverseCharge),

      paymentMethod:
        invoice?.paymentMethod ||
        "credit",

      shippingCharges:
        invoice?.shippingCharges || 0,

      otherCharges:
        invoice?.otherCharges || 0,

      roundOff:
        invoice?.roundOff || 0,

      notes:
        invoice?.notes || "",

      termsAndConditions:
        invoice?.termsAndConditions || "",

      customerNotes:
        invoice?.customerNotes || "",

      newCustomer: {
        name:
          invoice?.customerSnapshot
            ?.name || "",

        companyName:
          invoice?.customerSnapshot
            ?.companyName || "",

        email:
          invoice?.customerSnapshot
            ?.email || "",

        phone:
          invoice?.customerSnapshot
            ?.phone || "",

        gstin:
          invoice?.customerSnapshot
            ?.gstin || "",

        billingAddress: {
          ...emptyAddress(),
          ...(
            invoice?.customerSnapshot
              ?.billingAddress || {}
          ),
        },

        shippingAddress: {
          ...emptyAddress(),
          ...(
            invoice?.customerSnapshot
              ?.shippingAddress || {}
          ),
        },
      },

      items:
        invoiceItems.length > 0
          ? invoiceItems.map(
              (item) => ({
                productId:
                  item?.productId?._id ||
                  item?.productId ||
                  "",

                quantity:
                  item?.quantity || 1,

                unitPrice:
                  item?.unitPrice || 0,

                discountType:
                  item?.discountType ||
                  "percentage",

                discountValue:
                  item?.discountValue || 0,

                gstRate:
                  item?.gstRate ?? 18,
              })
            )
          : [createEmptyItem()],
    };
  };

  const openEdit = async (
    invoice
  ) => {
    try {
      clearMessages();
      setActionLoading(
        `edit-${invoice._id}`
      );

      const response =
        await api.get(
          `/invoices/${invoice._id}`
        );

      const fullInvoice =
        getObject(response) ||
        invoice;

      setEditingInvoice(
        fullInvoice
      );

      setForm(
        mapInvoiceToForm(
          fullInvoice
        )
      );

      setUseNewCustomer(
        !(
          fullInvoice?.customerId ||
          fullInvoice?.customerSnapshot
        )
      );

      setShowCreate(true);
      setShowMenu(null);
    } catch (err) {
      handleAuthError(err);
    } finally {
      setActionLoading(null);
    }
  };

  const openView = async (
    invoice
  ) => {
    try {
      clearMessages();

      setViewLoading(true);
      setShowView(true);

      const response =
        await api.get(
          `/invoices/${invoice._id}`
        );

      setSelectedInvoice(
        getObject(response) ||
          invoice
      );
    } catch (err) {
      setSelectedInvoice(
        invoice
      );

      handleAuthError(err);
    } finally {
      setViewLoading(false);
    }
  };

  const deleteInvoice = async (
    invoice
  ) => {
    const confirmed =
      window.confirm(
        `Delete invoice ${
          invoice.invoiceNumber ||
          ""
        }?\n\nThis action cannot be undone.`
      );

    if (!confirmed) return;

    try {
      clearMessages();

      setActionLoading(
        `delete-${invoice._id}`
      );

      await api.delete(
        `/invoices/${invoice._id}`
      );

      setSuccess(
        "Invoice deleted successfully."
      );

      await Promise.all([
        fetchInvoices({
          silent: true,
          requestedPage: page,
        }),
        fetchSummary(),
      ]);
    } catch (err) {
      handleAuthError(err);
    } finally {
      setActionLoading(null);
      setShowMenu(null);
    }
  };

  const issueInvoice = async (
    invoice
  ) => {
    const confirmed =
      window.confirm(
        `Issue invoice ${
          invoice.invoiceNumber ||
          ""
        }?`
      );

    if (!confirmed) return;

    try {
      clearMessages();

      setActionLoading(
        `issue-${invoice._id}`
      );

      await api.post(
        `/invoices/${invoice._id}/issue`
      );

      setSuccess(
        "Invoice issued successfully."
      );

      await Promise.all([
        fetchInvoices({
          silent: true,
          requestedPage: page,
        }),
        fetchSummary(),
      ]);
    } catch (err) {
      handleAuthError(err);
    } finally {
      setActionLoading(null);
      setShowMenu(null);
    }
  };

  const duplicateInvoice = async (
    invoice
  ) => {
    try {
      clearMessages();

      setActionLoading(
        `duplicate-${invoice._id}`
      );

      const response =
        await api.post(
          `/invoices/${invoice._id}/duplicate`
        );

      const duplicated =
        getObject(response);

      setSuccess(
        `Invoice ${
          duplicated?.invoiceNumber ||
          ""
        } duplicated successfully.`
      );

      await Promise.all([
        fetchInvoices({
          silent: true,
          requestedPage: page,
        }),
        fetchSummary(),
      ]);
    } catch (err) {
      handleAuthError(err);
    } finally {
      setActionLoading(null);
      setShowMenu(null);
    }
  };

  const openPayment = (
    invoice
  ) => {
    clearMessages();

    setPaymentInvoice(
      invoice
    );

    setPaymentForm({
      ...EMPTY_PAYMENT,
      amount:
        Number(
          invoice?.balanceAmount
        ) || "",
      paymentMethod:
        invoice?.paymentMethod ===
        "credit"
          ? "upi"
          : invoice?.paymentMethod ||
            "upi",
    });

    setShowPayment(true);
    setShowMenu(null);
  };

  const submitPayment = async (
    event
  ) => {
    event.preventDefault();

    if (!paymentInvoice) return;

    const amount =
      Number(paymentForm.amount);

    if (!amount || amount <= 0) {
      setError(
        "Payment amount must be greater than 0."
      );
      return;
    }

    const balance =
      Number(
        paymentInvoice.balanceAmount
      ) || 0;

    if (amount > balance) {
      setError(
        "Payment amount cannot exceed the invoice balance."
      );
      return;
    }

    try {
      clearMessages();

      setActionLoading(
        `payment-${paymentInvoice._id}`
      );

      await api.post(
        `/invoices/${paymentInvoice._id}/payment`,
        {
          amount,
          paymentMethod:
            paymentForm.paymentMethod,
          paymentDate:
            paymentForm.paymentDate,
          referenceNumber:
            paymentForm.referenceNumber.trim() ||
            undefined,
          notes:
            paymentForm.notes.trim() ||
            undefined,
        }
      );

      setSuccess(
        "Payment recorded successfully."
      );

      setShowPayment(false);
      setPaymentInvoice(null);
      setPaymentForm(
        EMPTY_PAYMENT
      );

      await Promise.all([
        fetchInvoices({
          silent: true,
          requestedPage: page,
        }),
        fetchSummary(),
      ]);
    } catch (err) {
      handleAuthError(err);
    } finally {
      setActionLoading(null);
    }
  };

  const openCancel = (
    invoice
  ) => {
    clearMessages();

    setCancelInvoice(
      invoice
    );

    setCancelReason("");

    setShowCancel(true);
    setShowMenu(null);
  };

  const submitCancel = async (
    event
  ) => {
    event.preventDefault();

    if (!cancelInvoice) return;

    try {
      clearMessages();

      setActionLoading(
        `cancel-${cancelInvoice._id}`
      );

      await api.post(
        `/invoices/${cancelInvoice._id}/cancel`,
        {
          reason:
            cancelReason.trim() ||
            "Cancelled by user",
        }
      );

      setSuccess(
        "Invoice cancelled successfully."
      );

      setShowCancel(false);
      setCancelInvoice(null);

      await Promise.all([
        fetchInvoices({
          silent: true,
          requestedPage: page,
        }),
        fetchSummary(),
      ]);
    } catch (err) {
      handleAuthError(err);
    } finally {
      setActionLoading(null);
    }
  };

  const downloadPdf = async (
    invoice
  ) => {
    try {
      clearMessages();

      const token = getToken();

      if (!token) {
        throw new Error(
          "Authentication token is missing. Please login again."
        );
      }

      const apiBase =
        import.meta.env.VITE_API_URL ||
        "http://localhost:5000/api";

      const response =
        await fetch(
          `${apiBase}/invoices/${invoice._id}/pdf`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

      if (!response.ok) {
        const contentType =
          response.headers.get(
            "content-type"
          ) || "";

        if (
          contentType.includes(
            "application/json"
          )
        ) {
          const data =
            await response.json();

          throw new Error(
            data?.message ||
              "Unable to download invoice PDF."
          );
        }

        throw new Error(
          `PDF download failed (${response.status})`
        );
      }

      const blob =
        await response.blob();

      if (!blob.size) {
        throw new Error(
          "Received an empty PDF file."
        );
      }

      const url =
        window.URL.createObjectURL(
          blob
        );

      const anchor =
        document.createElement("a");

      anchor.href = url;
      anchor.download = `${
        invoice.invoiceNumber ||
        "invoice"
      }.pdf`;

      document.body.appendChild(
        anchor
      );

      anchor.click();

      anchor.remove();

      setTimeout(() => {
        window.URL.revokeObjectURL(
          url
        );
      }, 1000);

      setSuccess(
        "Invoice PDF downloaded successfully."
      );
    } catch (err) {
      console.error(
        "PDF download error:",
        err
      );

      setError(
        getErrorMessage(err)
      );
    }
  };

  const printInvoice = async (
    invoice
  ) => {
    try {
      clearMessages();

      const token = getToken();

      if (!token) {
        throw new Error(
          "Authentication token is missing. Please login again."
        );
      }

      const apiBase =
        import.meta.env.VITE_API_URL ||
        "http://localhost:5000/api";

      const response =
        await fetch(
          `${apiBase}/invoices/${invoice._id}/pdf`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

      if (!response.ok) {
        const contentType =
          response.headers.get(
            "content-type"
          ) || "";

        if (
          contentType.includes(
            "application/json"
          )
        ) {
          const data =
            await response.json();

          throw new Error(
            data?.message ||
              "Unable to generate invoice PDF."
          );
        }

        throw new Error(
          `Print failed (${response.status})`
        );
      }

      const blob =
        await response.blob();

      const url =
        window.URL.createObjectURL(
          blob
        );

      const printWindow =
        window.open(
          url,
          "_blank",
          "noopener,noreferrer"
        );

      if (!printWindow) {
        window.URL.revokeObjectURL(
          url
        );

        throw new Error(
          "Popup blocked. Please allow popups to print the invoice."
        );
      }

      setTimeout(() => {
        try {
          printWindow.focus();
          printWindow.print();
        } catch (err) {
          console.error(
            "Print error:",
            err
          );
        }
      }, 1200);

      setTimeout(() => {
        window.URL.revokeObjectURL(
          url
        );
      }, 10000);
    } catch (err) {
      console.error(
        "Invoice print error:",
        err
      );

      setError(
        getErrorMessage(err)
      );
    }
  };

  const filteredInvoices =
    useMemo(() => {
      const query =
        search.trim().toLowerCase();

      if (!query) {
        return invoices;
      }

      return invoices.filter(
        (invoice) => {
          const customer =
            invoice?.customerSnapshot;

          const customerName =
            customer?.name ||
            customer?.companyName ||
            invoice?.customerId?.name ||
            invoice?.customerId?.displayName ||
            "";

          const invoiceNumber =
            invoice?.invoiceNumber ||
            "";

          const reference =
            invoice?.referenceNumber ||
            "";

          return [
            invoiceNumber,
            reference,
            customerName,
            invoice?.status,
            invoice?.paymentStatus,
          ]
            .join(" ")
            .toLowerCase()
            .includes(query);
        }
      );
    }, [invoices, search]);

  const totalPages = Math.max(
    1,
    Number(
      pagination.pages || 1
    )
  );

  const goToPage = (nextPage) => {
    if (
      nextPage < 1 ||
      nextPage > totalPages ||
      nextPage === page
    ) {
      return;
    }

    setPage(nextPage);
  };

  const renderCustomer = (
    invoice
  ) => {
    const customer =
      invoice?.customerSnapshot;

    return (
      customer?.companyName ||
      customer?.name ||
      invoice?.customerId?.displayName ||
      invoice?.customerId?.name ||
      "Walk-in Customer"
    );
  };

  const renderCustomerEmail = (
    invoice
  ) =>
    invoice?.customerSnapshot
      ?.email ||
    invoice?.customerId?.email ||
    "";

  const renderItemCount = (
    invoice
  ) =>
    Array.isArray(invoice?.items)
      ? invoice.items.length
      : 0;

  return (
    <div className="min-h-screen w-full bg-[#070b12] text-white">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-blue-600/10 blur-3xl" />
        <div className="absolute right-0 top-1/3 h-96 w-96 rounded-full bg-violet-600/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-cyan-600/5 blur-3xl" />
      </div>

      <div className="relative w-full px-4 py-5 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.22em] text-blue-400">
              <Receipt className="h-4 w-4" />
              Finance / Billing
            </div>

            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Invoices
            </h1>

            <p className="mt-1 max-w-2xl text-sm text-slate-400">
              Create, manage, issue, collect payments
              and download professional GST invoices.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                fetchInvoices({
                  silent: true,
                  requestedPage: page,
                })
              }
              disabled={refreshing}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm font-medium text-slate-200 transition hover:border-white/20 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw
                className={cn(
                  "h-4 w-4",
                  refreshing &&
                    "animate-spin"
                )}
              />
              Refresh
            </button>

            <button
              type="button"
              onClick={openCreate}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-5 text-sm font-semibold shadow-lg shadow-blue-900/20 transition hover:from-blue-500 hover:to-violet-500"
            >
              <Plus className="h-4 w-4" />
              Create Invoice
            </button>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/[0.07] p-4 text-sm text-red-300">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

            <div className="flex-1">
              <p className="font-semibold">
                Something went wrong
              </p>

              <p className="mt-1 text-red-300/80">
                {error}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setError("")}
              className="rounded-lg p-1 text-red-300/70 hover:bg-red-500/10 hover:text-red-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {success && (
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.07] p-4 text-sm text-emerald-300">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />

            <div className="flex-1">
              <p className="font-semibold">
                Success
              </p>

              <p className="mt-1 text-emerald-300/80">
                {success}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setSuccess("")}
              className="rounded-lg p-1 text-emerald-300/70 hover:bg-emerald-500/10"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* KPI Cards */}
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Total Invoices"
            value={summary.totalInvoices}
            subtitle="All invoices"
            icon={FileText}
            iconClass="bg-blue-500/10 text-blue-400"
          />

          <MetricCard
            title="Invoice Value"
            value={money(
              summary.totalAmount
            )}
            subtitle="Total billed"
            icon={CircleDollarSign}
            iconClass="bg-violet-500/10 text-violet-400"
          />

          <MetricCard
            title="Collected"
            value={money(
              summary.paidAmount
            )}
            subtitle="Payments received"
            icon={CheckCircle2}
            iconClass="bg-emerald-500/10 text-emerald-400"
            trend="Collected"
          />

          <MetricCard
            title="Outstanding"
            value={money(
              summary.balanceAmount
            )}
            subtitle="Receivable balance"
            icon={Clock}
            iconClass="bg-amber-500/10 text-amber-400"
            trend="Receivable"
          />
        </div>

        {/* Status overview */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-5">
          <MiniStat
            label="Draft"
            value={summary.draft}
            icon={FileText}
            className="text-slate-300"
          />

          <MiniStat
            label="Issued"
            value={summary.issued}
            icon={ArrowUpRight}
            className="text-blue-400"
          />

          <MiniStat
            label="Paid"
            value={summary.paid}
            icon={Check}
            className="text-emerald-400"
          />

          <MiniStat
            label="Overdue"
            value={summary.overdue}
            icon={AlertCircle}
            className="text-red-400"
          />

          <MiniStat
            label="Balance"
            value={money(
              summary.balanceAmount
            )}
            icon={Wallet}
            className="col-span-2 text-amber-400 sm:col-span-1"
          />
        </div>

        {/* Main Card */}
        <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0b111b]/90 shadow-2xl shadow-black/20 backdrop-blur-xl">
          {/* Toolbar */}
          <div className="border-b border-white/[0.07] p-4 sm:p-5">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
              <div className="relative min-w-0 flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />

                <input
                  value={search}
                  onChange={(event) => {
                    setSearch(
                      event.target.value
                    );
                    setPage(1);
                  }}
                  placeholder="Search invoice number, customer or reference..."
                  className="h-11 w-full rounded-xl border border-white/[0.08] bg-black/20 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500/40 focus:bg-black/30"
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
                  className="h-11 rounded-xl border border-white/[0.08] bg-[#101722] px-3 text-sm text-slate-200 outline-none focus:border-blue-500/40"
                >
                  {STATUS_OPTIONS.map(
                    (status) => (
                      <option
                        key={status}
                        value={status}
                      >
                        {status === "all"
                          ? "All Status"
                          : statusLabel(
                              status
                            )}
                      </option>
                    )
                  )}
                </select>

                <select
                  value={paymentFilter}
                  onChange={(event) => {
                    setPaymentFilter(
                      event.target.value
                    );
                    setPage(1);
                  }}
                  className="h-11 rounded-xl border border-white/[0.08] bg-[#101722] px-3 text-sm text-slate-200 outline-none focus:border-blue-500/40"
                >
                  {PAYMENT_STATUS_OPTIONS.map(
                    (status) => (
                      <option
                        key={status}
                        value={status}
                      >
                        {status === "all"
                          ? "All Payments"
                          : statusLabel(
                              status
                            )}
                      </option>
                    )
                  )}
                </select>

                <button
                  type="button"
                  onClick={() =>
                    setMobileFilters(
                      !mobileFilters
                    )
                  }
                  className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 text-sm text-slate-300 xl:hidden"
                >
                  <MoreHorizontal className="h-4 w-4" />
                  Options
                </button>
              </div>
            </div>

            {mobileFilters && (
              <div className="mt-3 rounded-xl border border-white/[0.07] bg-black/20 p-3 xl:hidden">
                <div className="text-xs text-slate-500">
                  Showing{" "}
                  <span className="text-slate-300">
                    {filteredInvoices.length}
                  </span>{" "}
                  invoice
                  {filteredInvoices.length !==
                  1
                    ? "s"
                    : ""}
                </div>
              </div>
            )}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px]">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.015] text-left">
                  <th className="px-5 py-4 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Invoice
                  </th>

                  <th className="px-5 py-4 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Customer
                  </th>

                  <th className="px-5 py-4 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Date
                  </th>

                  <th className="px-5 py-4 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Items
                  </th>

                  <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Amount
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

              <tbody className="divide-y divide-white/[0.045]">
                {loading ? (
                  Array.from({
                    length: 7,
                  }).map((_, index) => (
                    <tr key={index}>
                      {Array.from({
                        length: 8,
                      }).map(
                        (
                          __,
                          cellIndex
                        ) => (
                          <td
                            key={cellIndex}
                            className="px-5 py-5"
                          >
                            <div className="h-4 animate-pulse rounded bg-white/[0.06]" />
                          </td>
                        )
                      )}
                    </tr>
                  ))
                ) : filteredInvoices.length ===
                  0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-5 py-20 text-center"
                    >
                      <div className="mx-auto flex max-w-sm flex-col items-center">
                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03]">
                          <FileText className="h-7 w-7 text-slate-500" />
                        </div>

                        <h3 className="text-base font-semibold text-slate-200">
                          No invoices found
                        </h3>

                        <p className="mt-1 text-sm text-slate-500">
                          Create your first invoice
                          or change the current
                          filters.
                        </p>

                        <button
                          type="button"
                          onClick={openCreate}
                          className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold transition hover:bg-blue-500"
                        >
                          <Plus className="h-4 w-4" />
                          Create Invoice
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map(
                    (invoice) => {
                      const amount =
                        getInvoiceAmount(
                          invoice
                        );

                      const balance =
                        Number(
                          invoice?.balanceAmount
                        ) || 0;

                      const isDraft =
                        invoice?.status ===
                        "draft";

                      const isCancelled =
                        invoice?.status ===
                        "cancelled";

                      return (
                        <tr
                          key={
                            invoice._id
                          }
                          className="group transition hover:bg-white/[0.025]"
                        >
                          <td className="px-5 py-4">
                            <button
                              type="button"
                              onClick={() =>
                                openView(
                                  invoice
                                )
                              }
                              className="text-left"
                            >
                              <div className="font-semibold text-slate-100 transition group-hover:text-blue-400">
                                {invoice?.invoiceNumber ||
                                  "Draft Invoice"}
                              </div>

                              {invoice?.referenceNumber && (
                                <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                                  <Hash className="h-3 w-3" />
                                  {
                                    invoice.referenceNumber
                                  }
                                </div>
                              )}
                            </button>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/15 to-violet-500/15 text-blue-400">
                                <Building2 className="h-4 w-4" />
                              </div>

                              <div className="min-w-0">
                                <div className="max-w-[220px] truncate text-sm font-medium text-slate-200">
                                  {renderCustomer(
                                    invoice
                                  )}
                                </div>

                                {renderCustomerEmail(
                                  invoice
                                ) && (
                                  <div className="mt-0.5 max-w-[220px] truncate text-xs text-slate-500">
                                    {renderCustomerEmail(
                                      invoice
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <div className="text-sm text-slate-300">
                              {dateFormat(
                                invoice?.invoiceDate
                              )}
                            </div>

                            {invoice?.dueDate && (
                              <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                                <Clock className="h-3 w-3" />
                                Due{" "}
                                {dateFormat(
                                  invoice.dueDate
                                )}
                              </div>
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2 text-sm text-slate-300">
                              <Package className="h-4 w-4 text-slate-500" />
                              {
                                renderItemCount(
                                  invoice
                                )
                              }
                            </div>
                          </td>

                          <td className="px-5 py-4 text-right">
                            <div className="font-semibold text-slate-100">
                              {money(
                                amount,
                                invoice?.currency ||
                                  "INR"
                              )}
                            </div>

                            {balance > 0 && (
                              <div className="mt-1 text-xs text-amber-400">
                                Due{" "}
                                {money(
                                  balance,
                                  invoice?.currency ||
                                    "INR"
                                )}
                              </div>
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={cn(
                                "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold",
                                statusClass(
                                  invoice?.status
                                )
                              )}
                            >
                              {statusLabel(
                                invoice?.status
                              )}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <div
                              className={cn(
                                "text-sm font-medium",
                                paymentStatusClass(
                                  invoice?.paymentStatus
                                )
                              )}
                            >
                              {statusLabel(
                                invoice?.paymentStatus ||
                                  "unpaid"
                              )}
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex justify-end gap-1">
                              <IconButton
                                title="View"
                                onClick={() =>
                                  openView(
                                    invoice
                                  )
                                }
                              >
                                <Eye className="h-4 w-4" />
                              </IconButton>

                              <IconButton
                                title="Print"
                                onClick={() =>
                                  printInvoice(
                                    invoice
                                  )
                                }
                              >
                                <Printer className="h-4 w-4" />
                              </IconButton>

                              <IconButton
                                title="Download PDF"
                                onClick={() =>
                                  downloadPdf(
                                    invoice
                                  )
                                }
                              >
                                <Download className="h-4 w-4" />
                              </IconButton>

                              <div className="relative">
                                <IconButton
                                  title="More"
                                  onClick={() =>
                                    setShowMenu(
                                      showMenu ===
                                        invoice._id
                                        ? null
                                        : invoice._id
                                    )
                                  }
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </IconButton>

                                {showMenu ===
                                  invoice._id && (
                                  <ActionMenu
                                    invoice={
                                      invoice
                                    }
                                    isDraft={
                                      isDraft
                                    }
                                    isCancelled={
                                      isCancelled
                                    }
                                    actionLoading={
                                      actionLoading
                                    }
                                    onEdit={() =>
                                      openEdit(
                                        invoice
                                      )
                                    }
                                    onIssue={() =>
                                      issueInvoice(
                                        invoice
                                      )
                                    }
                                    onPayment={() =>
                                      openPayment(
                                        invoice
                                      )
                                    }
                                    onDuplicate={() =>
                                      duplicateInvoice(
                                        invoice
                                      )
                                    }
                                    onCancel={() =>
                                      openCancel(
                                        invoice
                                      )
                                    }
                                    onDelete={() =>
                                      deleteInvoice(
                                        invoice
                                      )
                                    }
                                  />
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    }
                  )
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col gap-3 border-t border-white/[0.07] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-slate-500">
              Showing{" "}
              <span className="font-medium text-slate-300">
                {filteredInvoices.length}
              </span>{" "}
              on this page
              {pagination.total
                ? ` of ${pagination.total}`
                : ""}
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() =>
                  goToPage(page - 1)
                }
                disabled={page <= 1}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.025] text-slate-400 transition hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <div className="flex h-9 min-w-20 items-center justify-center rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 text-xs font-semibold text-blue-300">
                {page} / {totalPages}
              </div>

              <button
                type="button"
                onClick={() =>
                  goToPage(page + 1)
                }
                disabled={
                  page >= totalPages
                }
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.025] text-slate-400 transition hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CREATE / EDIT MODAL */}
      {showCreate && (
        <Modal
          title={
            editingInvoice
              ? "Edit Invoice"
              : "Create Invoice"
          }
          subtitle={
            editingInvoice
              ? "Update invoice details and recalculate the totals."
              : "Create a professional GST invoice with customer, item and payment details."
          }
          onClose={closeCreate}
          wide
        >
          <form
            onSubmit={handleSubmit}
            className="space-y-6"
          >
            {/* Customer + basic */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
              <FormSection
                title="Invoice Details"
                icon={FileText}
              >
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field
                    label="Invoice Date"
                    required
                  >
                    <input
                      type="date"
                      value={
                        form.invoiceDate
                      }
                      onChange={(e) =>
                        updateForm(
                          "invoiceDate",
                          e.target.value
                        )
                      }
                      className="input-dark"
                    />
                  </Field>

                  <Field
                    label="Due Date"
                    required
                  >
                    <input
                      type="date"
                      value={
                        form.dueDate
                      }
                      onChange={(e) =>
                        updateForm(
                          "dueDate",
                          e.target.value
                        )
                      }
                      className="input-dark"
                    />
                  </Field>

                  <Field label="Branch">
                    <select
                      value={
                        form.branchId
                      }
                      onChange={(e) =>
                        updateForm(
                          "branchId",
                          e.target.value
                        )
                      }
                      className="input-dark"
                    >
                      <option value="">
                        Default Branch
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
                            {branch.name ||
                              branch.branchName ||
                              branch.code ||
                              "Branch"}
                          </option>
                        )
                      )}
                    </select>
                  </Field>

                  <Field label="Reference">
                    <input
                      value={
                        form.referenceNumber
                      }
                      onChange={(e) =>
                        updateForm(
                          "referenceNumber",
                          e.target.value
                        )
                      }
                      placeholder="PO / Reference"
                      className="input-dark"
                    />
                  </Field>

                  <Field label="Place of Supply">
                    <input
                      value={
                        form.placeOfSupply
                      }
                      onChange={(e) =>
                        updateForm(
                          "placeOfSupply",
                          e.target.value
                        )
                      }
                      placeholder="Tamil Nadu"
                      className="input-dark"
                    />
                  </Field>

                  <Field label="Supply Type">
                    <select
                      value={
                        form.supplyType
                      }
                      onChange={(e) =>
                        updateForm(
                          "supplyType",
                          e.target.value
                        )
                      }
                      className="input-dark"
                    >
                      <option value="intra_state">
                        Intra-State
                      </option>
                      <option value="inter_state">
                        Inter-State
                      </option>
                    </select>
                  </Field>
                </div>
              </FormSection>

              <FormSection
                title="Customer"
                icon={User}
              >
                <div className="mb-3 flex rounded-xl border border-white/[0.07] bg-black/20 p-1">
                  <button
                    type="button"
                    onClick={() =>
                      setUseNewCustomer(
                        false
                      )
                    }
                    className={cn(
                      "flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition",
                      !useNewCustomer
                        ? "bg-blue-600 text-white"
                        : "text-slate-400 hover:text-white"
                    )}
                  >
                    Existing Customer
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setUseNewCustomer(
                        true
                      )
                    }
                    className={cn(
                      "flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition",
                      useNewCustomer
                        ? "bg-blue-600 text-white"
                        : "text-slate-400 hover:text-white"
                    )}
                  >
                    New Customer
                  </button>
                </div>

                {!useNewCustomer ? (
                  <Field
                    label="Select Customer"
                    required
                  >
                    <select
                      value={
                        form.customerId
                      }
                      onChange={(e) =>
                        updateForm(
                          "customerId",
                          e.target.value
                        )
                      }
                      className="input-dark"
                    >
                      <option value="">
                        Select customer...
                      </option>

                      {customers.map(
                        (customer) => (
                          <option
                            key={normalizeCustomerId(
                              customer
                            )}
                            value={normalizeCustomerId(
                              customer
                            )}
                          >
                            {getCustomerName(
                              customer
                            )}
                            {customer.email
                              ? ` — ${customer.email}`
                              : ""}
                          </option>
                        )
                      )}
                    </select>
                  </Field>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <Field label="Name">
                        <input
                          value={
                            form
                              .newCustomer
                              .name
                          }
                          onChange={(e) =>
                            updateNewCustomer(
                              "name",
                              e.target.value
                            )
                          }
                          placeholder="Customer name"
                          className="input-dark"
                        />
                      </Field>

                      <Field label="Company Name">
                        <input
                          value={
                            form
                              .newCustomer
                              .companyName
                          }
                          onChange={(e) =>
                            updateNewCustomer(
                              "companyName",
                              e.target.value
                            )
                          }
                          placeholder="Company name"
                          className="input-dark"
                        />
                      </Field>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <Field label="Email">
                        <input
                          type="email"
                          value={
                            form
                              .newCustomer
                              .email
                          }
                          onChange={(e) =>
                            updateNewCustomer(
                              "email",
                              e.target.value
                            )
                          }
                          placeholder="accounts@company.com"
                          className="input-dark"
                        />
                      </Field>

                      <Field label="Phone">
                        <input
                          value={
                            form
                              .newCustomer
                              .phone
                          }
                          onChange={(e) =>
                            updateNewCustomer(
                              "phone",
                              e.target.value
                            )
                          }
                          placeholder="9876543210"
                          className="input-dark"
                        />
                      </Field>
                    </div>

                    <Field label="GSTIN">
                      <input
                        value={
                          form.newCustomer
                            .gstin
                        }
                        onChange={(e) =>
                          updateNewCustomer(
                            "gstin",
                            e.target.value.toUpperCase()
                          )
                        }
                        placeholder="33ABCDE1234F1Z5"
                        className="input-dark uppercase"
                      />
                    </Field>
                  </div>
                )}
              </FormSection>

              <FormSection
                title="Payment"
                icon={CreditCard}
              >
                <Field label="Payment Method">
                  <select
                    value={
                      form.paymentMethod
                    }
                    onChange={(e) =>
                      updateForm(
                        "paymentMethod",
                        e.target.value
                      )
                    }
                    className="input-dark"
                  >
                    {PAYMENT_METHODS.map(
                      (method) => (
                        <option
                          key={method}
                          value={method}
                        >
                          {statusLabel(
                            method
                          )}
                        </option>
                      )
                    )}
                  </select>
                </Field>

                <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-xl border border-white/[0.07] bg-black/20 p-3">
                  <input
                    type="checkbox"
                    checked={
                      form.reverseCharge
                    }
                    onChange={(e) =>
                      updateForm(
                        "reverseCharge",
                        e.target.checked
                      )
                    }
                    className="h-4 w-4 rounded border-white/20 bg-transparent text-blue-600"
                  />

                  <span>
                    <span className="block text-sm font-medium text-slate-200">
                      Reverse Charge
                    </span>

                    <span className="block text-xs text-slate-500">
                      Mark invoice as reverse charge.
                    </span>
                  </span>
                </label>
              </FormSection>
            </div>

            {/* New customer addresses */}
            {useNewCustomer && (
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <AddressEditor
                  title="Billing Address"
                  address={
                    form.newCustomer
                      .billingAddress
                  }
                  onChange={(
                    field,
                    value
                  ) =>
                    updateAddress(
                      "billingAddress",
                      field,
                      value
                    )
                  }
                />

                <AddressEditor
                  title="Shipping Address"
                  address={
                    form.newCustomer
                      .shippingAddress
                  }
                  onChange={(
                    field,
                    value
                  ) =>
                    updateAddress(
                      "shippingAddress",
                      field,
                      value
                    )
                  }
                />
              </div>
            )}

            {/* Items */}
            <FormSection
              title="Invoice Items"
              icon={Package}
              action={
                <button
                  type="button"
                  onClick={addItem}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-500/10 px-3 py-2 text-xs font-semibold text-blue-400 transition hover:bg-blue-500/15"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Item
                </button>
              }
            >
              <div className="overflow-x-auto rounded-xl border border-white/[0.07]">
                <table className="w-full min-w-[1000px]">
                  <thead>
                    <tr className="bg-black/20 text-left">
                      <th className="px-3 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        Product
                      </th>

                      <th className="w-24 px-3 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        Qty
                      </th>

                      <th className="w-32 px-3 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        Unit Price
                      </th>

                      <th className="w-32 px-3 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        Discount
                      </th>

                      <th className="w-24 px-3 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        GST %
                      </th>

                      <th className="w-36 px-3 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        Taxable
                      </th>

                      <th className="w-36 px-3 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        Total
                      </th>

                      <th className="w-12 px-3 py-3" />
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-white/[0.05]">
                    {form.items.map(
                      (
                        item,
                        index
                      ) => {
                        const calculation =
                          calculateItem(
                            item
                          );

                        return (
                          <tr
                            key={
                              index
                            }
                            className="bg-transparent"
                          >
                            <td className="px-3 py-3">
                              <select
                                value={
                                  item.productId
                                }
                                onChange={(
                                  e
                                ) =>
                                  selectProduct(
                                    index,
                                    e.target
                                      .value
                                  )
                                }
                                className="input-dark min-w-[260px]"
                              >
                                <option value="">
                                  Select product...
                                </option>

                                {products.map(
                                  (
                                    product
                                  ) => (
                                    <option
                                      key={normalizeProductId(
                                        product
                                      )}
                                      value={normalizeProductId(
                                        product
                                      )}
                                    >
                                      {getProductName(
                                        product
                                      )}
                                      {product.sku
                                        ? ` — ${product.sku}`
                                        : ""}
                                    </option>
                                  )
                                )}
                              </select>
                            </td>

                            <td className="px-3 py-3">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={
                                  item.quantity
                                }
                                onChange={(
                                  e
                                ) =>
                                  updateItem(
                                    index,
                                    "quantity",
                                    e.target
                                      .value
                                  )
                                }
                                className="input-dark"
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
                                  e
                                ) =>
                                  updateItem(
                                    index,
                                    "unitPrice",
                                    e.target
                                      .value
                                  )
                                }
                                className="input-dark"
                              />
                            </td>

                            <td className="px-3 py-3">
                              <div className="flex gap-1">
                                <select
                                  value={
                                    item.discountType
                                  }
                                  onChange={(
                                    e
                                  ) =>
                                    updateItem(
                                      index,
                                      "discountType",
                                      e.target
                                        .value
                                    )
                                  }
                                  className="input-dark w-20"
                                >
                                  {DISCOUNT_TYPES.map(
                                    (
                                      type
                                    ) => (
                                      <option
                                        key={
                                          type.value
                                        }
                                        value={
                                          type.value
                                        }
                                      >
                                        {type.value ===
                                        "percentage"
                                          ? "%"
                                          : "₹"}
                                      </option>
                                    )
                                  )}
                                </select>

                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={
                                    item.discountValue
                                  }
                                  onChange={(
                                    e
                                  ) =>
                                    updateItem(
                                      index,
                                      "discountValue",
                                      e.target
                                        .value
                                    )
                                  }
                                  className="input-dark min-w-20"
                                />
                              </div>
                            </td>

                            <td className="px-3 py-3">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                value={
                                  item.gstRate
                                }
                                onChange={(
                                  e
                                ) =>
                                  updateItem(
                                    index,
                                    "gstRate",
                                    e.target
                                      .value
                                  )
                                }
                                className="input-dark"
                              />
                            </td>

                            <td className="px-3 py-3 text-right text-sm text-slate-300">
                              {money(
                                calculation.taxableAmount
                              )}
                            </td>

                            <td className="px-3 py-3 text-right text-sm font-semibold text-white">
                              {money(
                                calculation.taxableAmount +
                                  calculation.totalTax
                              )}
                            </td>

                            <td className="px-3 py-3 text-right">
                              <button
                                type="button"
                                onClick={() =>
                                  removeItem(
                                    index
                                  )
                                }
                                disabled={
                                  form.items
                                    .length ===
                                  1
                                }
                                className="rounded-lg p-2 text-slate-500 transition hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-30"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      }
                    )}
                  </tbody>
                </table>
              </div>
            </FormSection>

            {/* Totals */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_420px]">
              <FormSection
                title="Additional Information"
                icon={FileText}
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <Field label="Shipping Charges">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={
                        form.shippingCharges
                      }
                      onChange={(e) =>
                        updateForm(
                          "shippingCharges",
                          e.target.value
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
                      onChange={(e) =>
                        updateForm(
                          "otherCharges",
                          e.target.value
                        )
                      }
                      className="input-dark"
                    />
                  </Field>

                  <Field label="Round Off">
                    <input
                      type="number"
                      step="0.01"
                      value={
                        form.roundOff
                      }
                      onChange={(e) =>
                        updateForm(
                          "roundOff",
                          e.target.value
                        )
                      }
                      className="input-dark"
                    />
                  </Field>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setShowAdvanced(
                      !showAdvanced
                    )
                  }
                  className="mt-4 flex items-center gap-2 text-xs font-semibold text-blue-400 hover:text-blue-300"
                >
                  <MoreHorizontal className="h-4 w-4" />
                  {showAdvanced
                    ? "Hide"
                    : "Show"}{" "}
                  Notes & Terms
                </button>

                {showAdvanced && (
                  <div className="mt-4 grid grid-cols-1 gap-4">
                    <Field label="Notes">
                      <textarea
                        value={
                          form.notes
                        }
                        onChange={(e) =>
                          updateForm(
                            "notes",
                            e.target.value
                          )
                        }
                        rows={3}
                        placeholder="Thank you for your business..."
                        className="input-dark min-h-[90px] resize-none"
                      />
                    </Field>

                    <Field label="Terms & Conditions">
                      <textarea
                        value={
                          form.termsAndConditions
                        }
                        onChange={(e) =>
                          updateForm(
                            "termsAndConditions",
                            e.target.value
                          )
                        }
                        rows={3}
                        placeholder="Payment due within 30 days..."
                        className="input-dark min-h-[90px] resize-none"
                      />
                    </Field>

                    <Field label="Customer Notes">
                      <textarea
                        value={
                          form.customerNotes
                        }
                        onChange={(e) =>
                          updateForm(
                            "customerNotes",
                            e.target.value
                          )
                        }
                        rows={3}
                        placeholder="Additional customer-specific information..."
                        className="input-dark min-h-[90px] resize-none"
                      />
                    </Field>
                  </div>
                )}
              </FormSection>

              <div className="rounded-2xl border border-blue-500/10 bg-gradient-to-br from-blue-500/[0.07] to-violet-500/[0.06] p-5">
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                    <IndianRupee className="h-4 w-4" />
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      Invoice Summary
                    </h3>

                    <p className="text-xs text-slate-500">
                      Calculated before submission
                    </p>
                  </div>
                </div>

                <div className="space-y-3 text-sm">
                  <SummaryRow
                    label="Subtotal"
                    value={money(
                      totals.subtotal
                    )}
                  />

                  <SummaryRow
                    label="Discount"
                    value={`- ${money(
                      totals.totalDiscount
                    )}`}
                    valueClass="text-amber-400"
                  />

                  <SummaryRow
                    label="Taxable Amount"
                    value={money(
                      totals.taxableAmount
                    )}
                  />

                  {form.supplyType ===
                  "inter_state" ? (
                    <SummaryRow
                      label="IGST"
                      value={money(
                        totals.igstAmount
                      )}
                      valueClass="text-blue-400"
                    />
                  ) : (
                    <>
                      <SummaryRow
                        label="CGST"
                        value={money(
                          totals.cgstAmount
                        )}
                        valueClass="text-blue-400"
                      />

                      <SummaryRow
                        label="SGST"
                        value={money(
                          totals.sgstAmount
                        )}
                        valueClass="text-blue-400"
                      />
                    </>
                  )}

                  <SummaryRow
                    label="Shipping"
                    value={money(
                      totals.shippingCharges
                    )}
                  />

                  <SummaryRow
                    label="Other Charges"
                    value={money(
                      totals.otherCharges
                    )}
                  />

                  <SummaryRow
                    label="Round Off"
                    value={money(
                      totals.roundOff
                    )}
                  />

                  <div className="my-3 border-t border-white/[0.08]" />

                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <div className="text-xs font-medium uppercase tracking-wider text-slate-500">
                        Grand Total
                      </div>

                      <div className="mt-1 text-2xl font-bold tracking-tight text-white">
                        {money(
                          totals.grandTotal
                        )}
                      </div>
                    </div>

                    <div className="rounded-xl bg-emerald-500/10 px-3 py-2 text-right">
                      <div className="text-[10px] uppercase tracking-wider text-emerald-400/70">
                        Tax
                      </div>

                      <div className="text-sm font-bold text-emerald-400">
                        {money(
                          totals.totalTax
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer actions */}
            <div className="flex flex-col-reverse gap-3 border-t border-white/[0.07] pt-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeCreate}
                disabled={formLoading}
                className="h-11 rounded-xl border border-white/[0.08] bg-white/[0.03] px-5 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.07] disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={formLoading}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-6 text-sm font-semibold shadow-lg shadow-blue-900/20 transition hover:from-blue-500 hover:to-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {formLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}

                {formLoading
                  ? "Saving..."
                  : editingInvoice
                  ? "Update Invoice"
                  : "Create Invoice"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* VIEW MODAL */}
      {showView && (
        <Modal
          title="Invoice Details"
          subtitle={
            selectedInvoice?.invoiceNumber ||
            "Invoice"
          }
          onClose={() => {
            setShowView(false);
            setSelectedInvoice(
              null
            );
          }}
          wide
        >
          {viewLoading ? (
            <div className="flex min-h-[400px] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
            </div>
          ) : (
            <InvoicePreview
              invoice={
                selectedInvoice
              }
              onPrint={() =>
                printInvoice(
                  selectedInvoice
                )
              }
              onDownload={() =>
                downloadPdf(
                  selectedInvoice
                )
              }
              onPayment={() =>
                openPayment(
                  selectedInvoice
                )
              }
              onIssue={() =>
                issueInvoice(
                  selectedInvoice
                )
              }
            />
          )}
        </Modal>
      )}

      {/* PAYMENT MODAL */}
      {showPayment && (
        <Modal
          title="Record Payment"
          subtitle={`Payment for ${
            paymentInvoice?.invoiceNumber ||
            "invoice"
          }`}
          onClose={() => {
            if (!actionLoading) {
              setShowPayment(false);
              setPaymentInvoice(
                null
              );
            }
          }}
        >
          <form
            onSubmit={submitPayment}
            className="space-y-5"
          >
            <div className="rounded-2xl border border-amber-500/15 bg-amber-500/[0.06] p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs text-slate-500">
                    Outstanding Balance
                  </div>

                  <div className="mt-1 text-2xl font-bold text-amber-400">
                    {money(
                      paymentInvoice?.balanceAmount ||
                        0
                    )}
                  </div>
                </div>

                <Wallet className="h-8 w-8 text-amber-400/60" />
              </div>
            </div>

            <Field
              label="Payment Amount"
              required
            >
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />

                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  max={
                    paymentInvoice?.balanceAmount ||
                    undefined
                  }
                  value={
                    paymentForm.amount
                  }
                  onChange={(e) =>
                    setPaymentForm(
                      (
                        previous
                      ) => ({
                        ...previous,
                        amount:
                          e.target
                            .value,
                      })
                    )
                  }
                  className="input-dark pl-10"
                  placeholder="0.00"
                />
              </div>
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                label="Payment Method"
              >
                <select
                  value={
                    paymentForm.paymentMethod
                  }
                  onChange={(e) =>
                    setPaymentForm(
                      (
                        previous
                      ) => ({
                        ...previous,
                        paymentMethod:
                          e.target
                            .value,
                      })
                    )
                  }
                  className="input-dark"
                >
                  {PAYMENT_METHODS.map(
                    (method) => (
                      <option
                        key={method}
                        value={method}
                      >
                        {statusLabel(
                          method
                        )}
                      </option>
                    )
                  )}
                </select>
              </Field>

              <Field label="Payment Date">
                <input
                  type="date"
                  value={
                    paymentForm.paymentDate
                  }
                  onChange={(e) =>
                    setPaymentForm(
                      (
                        previous
                      ) => ({
                        ...previous,
                        paymentDate:
                          e.target
                            .value,
                      })
                    )
                  }
                  className="input-dark"
                />
              </Field>
            </div>

            <Field label="Reference Number">
              <input
                value={
                  paymentForm.referenceNumber
                }
                onChange={(e) =>
                  setPaymentForm(
                    (previous) => ({
                      ...previous,
                      referenceNumber:
                        e.target
                          .value,
                    })
                  )
                }
                placeholder="UPI / Bank reference"
                className="input-dark"
              />
            </Field>

            <Field label="Notes">
              <textarea
                rows={3}
                value={
                  paymentForm.notes
                }
                onChange={(e) =>
                  setPaymentForm(
                    (previous) => ({
                      ...previous,
                      notes:
                        e.target.value,
                    })
                  )
                }
                placeholder="Payment notes..."
                className="input-dark resize-none"
              />
            </Field>

            <div className="flex flex-col-reverse gap-3 border-t border-white/[0.07] pt-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowPayment(
                    false
                  );
                  setPaymentInvoice(
                    null
                  );
                }}
                className="h-11 rounded-xl border border-white/[0.08] bg-white/[0.03] px-5 text-sm font-semibold text-slate-300"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={
                  actionLoading ===
                  `payment-${paymentInvoice?._id}`
                }
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-semibold transition hover:bg-emerald-500 disabled:opacity-50"
              >
                {actionLoading ===
                `payment-${paymentInvoice?._id}` ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CreditCard className="h-4 w-4" />
                )}
                Record Payment
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* CANCEL MODAL */}
      {showCancel && (
        <Modal
          title="Cancel Invoice"
          subtitle={`Cancel ${
            cancelInvoice?.invoiceNumber ||
            "invoice"
          }`}
          onClose={() => {
            if (!actionLoading) {
              setShowCancel(false);
              setCancelInvoice(
                null
              );
            }
          }}
        >
          <form
            onSubmit={submitCancel}
            className="space-y-5"
          >
            <div className="rounded-2xl border border-red-500/15 bg-red-500/[0.06] p-4">
              <div className="flex gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-400">
                  <Ban className="h-5 w-5" />
                </div>

                <div>
                  <p className="text-sm font-semibold text-red-300">
                    Are you sure?
                  </p>

                  <p className="mt-1 text-xs leading-5 text-red-300/70">
                    This will mark the invoice as
                    cancelled. Please provide a reason
                    for audit purposes.
                  </p>
                </div>
              </div>
            </div>

            <Field
              label="Cancellation Reason"
              required
            >
              <textarea
                rows={4}
                value={
                  cancelReason
                }
                onChange={(e) =>
                  setCancelReason(
                    e.target.value
                  )
                }
                placeholder="Enter cancellation reason..."
                className="input-dark resize-none"
              />
            </Field>

            <div className="flex flex-col-reverse gap-3 border-t border-white/[0.07] pt-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowCancel(
                    false
                  );
                  setCancelInvoice(
                    null
                  );
                }}
                className="h-11 rounded-xl border border-white/[0.08] bg-white/[0.03] px-5 text-sm font-semibold text-slate-300"
              >
                Keep Invoice
              </button>

              <button
                type="submit"
                disabled={
                  actionLoading ===
                  `cancel-${cancelInvoice?._id}`
                }
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-red-600 px-5 text-sm font-semibold transition hover:bg-red-500 disabled:opacity-50"
              >
                {actionLoading ===
                `cancel-${cancelInvoice?._id}` ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Ban className="h-4 w-4" />
                )}
                Cancel Invoice
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* COMPONENTS                                                                 */
/* -------------------------------------------------------------------------- */

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconClass,
  trend,
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0b111b]/90 p-4 shadow-xl shadow-black/10 transition hover:border-white/[0.12]">
      <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-white/[0.015] blur-2xl" />

      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-slate-500">
            {title}
          </p>

          <p className="mt-2 text-xl font-bold tracking-tight text-white sm:text-2xl">
            {value}
          </p>

          <p className="mt-1 text-[11px] text-slate-600">
            {subtitle}
          </p>
        </div>

        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            iconClass
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>

      {trend && (
        <div className="relative mt-3 flex items-center gap-1 text-[10px] font-medium text-slate-500">
          <ArrowUpRight className="h-3 w-3 text-emerald-400" />
          {trend}
        </div>
      )}
    </div>
  );
}

function MiniStat({
  label,
  value,
  icon: Icon,
  className,
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-[#0b111b]/70 px-4 py-3">
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.04]",
          className
        )}
      >
        <Icon className="h-4 w-4" />
      </div>

      <div className="min-w-0">
        <p className="truncate text-[11px] text-slate-500">
          {label}
        </p>

        <p
          className={cn(
            "mt-0.5 truncate text-sm font-bold",
            className
          )}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function IconButton({
  children,
  title,
  onClick,
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-transparent text-slate-500 transition hover:border-white/[0.08] hover:bg-white/[0.05] hover:text-slate-200"
    >
      {children}
    </button>
  );
}

function ActionMenu({
  invoice,
  isDraft,
  isCancelled,
  actionLoading,
  onEdit,
  onIssue,
  onPayment,
  onDuplicate,
  onCancel,
  onDelete,
}) {
  const loading =
    actionLoading?.endsWith(
      invoice._id
    );

  return (
    <div className="absolute right-0 top-11 z-50 w-48 overflow-hidden rounded-xl border border-white/[0.09] bg-[#111823] p-1.5 shadow-2xl shadow-black/40">
      {!isCancelled && (
        <MenuItem
          icon={Pencil}
          label="Edit"
          onClick={onEdit}
          disabled={loading}
        />
      )}

      {isDraft && (
        <MenuItem
          icon={Check}
          label="Issue Invoice"
          onClick={onIssue}
          disabled={loading}
        />
      )}

      {!isCancelled &&
        invoice?.paymentStatus !==
          "paid" && (
          <MenuItem
            icon={CreditCard}
            label="Record Payment"
            onClick={onPayment}
            disabled={loading}
          />
        )}

      <MenuItem
        icon={Copy}
        label="Duplicate"
        onClick={onDuplicate}
        disabled={loading}
      />

      {!isCancelled && (
        <MenuItem
          icon={Ban}
          label="Cancel"
          danger
          onClick={onCancel}
          disabled={loading}
        />
      )}

      <div className="my-1 border-t border-white/[0.06]" />

      <MenuItem
        icon={Trash2}
        label="Delete"
        danger
        onClick={onDelete}
        disabled={loading}
      />
    </div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  danger,
  disabled,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium transition disabled:opacity-40",
        danger
          ? "text-red-400 hover:bg-red-500/10"
          : "text-slate-300 hover:bg-white/[0.06] hover:text-white"
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function Modal({
  title,
  subtitle,
  onClose,
  children,
  wide,
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm sm:p-5">
      <div
        className={cn(
          "flex max-h-[94vh] w-full flex-col overflow-hidden rounded-2xl border border-white/[0.09] bg-[#0b111b] shadow-2xl shadow-black/50",
          wide
            ? "max-w-7xl"
            : "max-w-xl"
        )}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/[0.07] px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-lg font-bold text-white">
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
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-white/[0.06] hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
          {children}
        </div>
      </div>
    </div>
  );
}

function FormSection({
  title,
  icon: Icon,
  children,
  action,
}) {
  return (
    <section className="rounded-2xl border border-white/[0.07] bg-white/[0.015] p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
            <Icon className="h-4 w-4" />
          </div>

          <h3 className="text-sm font-semibold text-slate-200">
            {title}
          </h3>
        </div>

        {action}
      </div>

      {children}
    </section>
  );
}

function Field({
  label,
  required,
  children,
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-medium text-slate-500">
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
}

function AddressEditor({
  title,
  address,
  onChange,
}) {
  return (
    <FormSection
      title={title}
      icon={MapPin}
    >
      <div className="space-y-3">
        <Field label="Address Line 1">
          <input
            value={address.line1 || ""}
            onChange={(e) =>
              onChange(
                "line1",
                e.target.value
              )
            }
            placeholder="Street / Building"
            className="input-dark"
          />
        </Field>

        <Field label="Address Line 2">
          <input
            value={address.line2 || ""}
            onChange={(e) =>
              onChange(
                "line2",
                e.target.value
              )
            }
            placeholder="Area / Landmark"
            className="input-dark"
          />
        </Field>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="City">
            <input
              value={address.city || ""}
              onChange={(e) =>
                onChange(
                  "city",
                  e.target.value
                )
              }
              placeholder="Coimbatore"
              className="input-dark"
            />
          </Field>

          <Field label="State">
            <input
              value={address.state || ""}
              onChange={(e) =>
                onChange(
                  "state",
                  e.target.value
                )
              }
              placeholder="Tamil Nadu"
              className="input-dark"
            />
          </Field>

          <Field label="Country">
            <input
              value={
                address.country ||
                "India"
              }
              onChange={(e) =>
                onChange(
                  "country",
                  e.target.value
                )
              }
              className="input-dark"
            />
          </Field>

          <Field label="Postal Code">
            <input
              value={
                address.postalCode ||
                ""
              }
              onChange={(e) =>
                onChange(
                  "postalCode",
                  e.target.value
                )
              }
              placeholder="641001"
              className="input-dark"
            />
          </Field>
        </div>
      </div>
    </FormSection>
  );
}

function SummaryRow({
  label,
  value,
  valueClass,
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs text-slate-500">
        {label}
      </span>

      <span
        className={cn(
          "text-sm font-medium text-slate-200",
          valueClass
        )}
      >
        {value}
      </span>
    </div>
  );
}

function InvoicePreview({
  invoice,
  onPrint,
  onDownload,
  onPayment,
  onIssue,
}) {
  if (!invoice) {
    return (
      <div className="py-20 text-center text-slate-500">
        Invoice not found.
      </div>
    );
  }

  const company =
    invoice.companySnapshot || {};

  const customer =
    invoice.customerSnapshot || {};

  const items =
    Array.isArray(invoice.items)
      ? invoice.items
      : [];

  const currency =
    invoice.currency || "INR";

  return (
    <div className="space-y-5">
      {/* Actions */}
      <div className="flex flex-wrap justify-end gap-2">
        {invoice.status ===
          "draft" && (
          <button
            type="button"
            onClick={onIssue}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-semibold transition hover:bg-blue-500"
          >
            <Check className="h-4 w-4" />
            Issue
          </button>
        )}

        {invoice.paymentStatus !==
          "paid" &&
          invoice.status !==
            "cancelled" && (
            <button
              type="button"
              onClick={onPayment}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-xs font-semibold transition hover:bg-emerald-500"
            >
              <CreditCard className="h-4 w-4" />
              Payment
            </button>
          )}

        <button
          type="button"
          onClick={onPrint}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 text-xs font-semibold text-slate-200 transition hover:bg-white/[0.08]"
        >
          <Printer className="h-4 w-4" />
          Print
        </button>

        <button
          type="button"
          onClick={onDownload}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 text-xs font-semibold text-slate-200 transition hover:bg-white/[0.08]"
        >
          <Download className="h-4 w-4" />
          Download PDF
        </button>
      </div>

      {/* Preview */}
      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white text-slate-900 shadow-2xl">
        {/* Invoice header */}
        <div className="border-b border-slate-200 p-6 sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              {company.logo ? (
                <img
                  src={company.logo}
                  alt={
                    company.name ||
                    "Company"
                  }
                  className="mb-4 max-h-14 max-w-48 object-contain"
                />
              ) : (
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-white">
                  <Building2 className="h-6 w-6" />
                </div>
              )}

              <h3 className="text-xl font-bold">
                {company.name ||
                  company.legalName ||
                  "Ready Tech Solutions"}
              </h3>

              {company.legalName &&
                company.legalName !==
                  company.name && (
                  <p className="mt-1 text-xs text-slate-500">
                    {
                      company.legalName
                    }
                  </p>
                )}

              <div className="mt-3 space-y-1 text-xs text-slate-500">
                {company.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-3 w-3" />
                    {company.email}
                  </div>
                )}

                {company.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-3 w-3" />
                    {company.phone}
                  </div>
                )}

                {company.gstin && (
                  <div className="font-semibold text-slate-700">
                    GSTIN:{" "}
                    {company.gstin}
                  </div>
                )}
              </div>
            </div>

            <div className="text-left sm:text-right">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Tax Invoice
              </div>

              <div className="mt-2 text-2xl font-bold">
                {invoice.invoiceNumber ||
                  "DRAFT"}
              </div>

              <div className="mt-3 space-y-1 text-xs text-slate-500">
                <div>
                  Invoice Date:{" "}
                  <span className="font-medium text-slate-700">
                    {dateFormat(
                      invoice.invoiceDate
                    )}
                  </span>
                </div>

                <div>
                  Due Date:{" "}
                  <span className="font-medium text-slate-700">
                    {dateFormat(
                      invoice.dueDate
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bill to */}
        <div className="grid grid-cols-1 border-b border-slate-200 sm:grid-cols-2">
          <div className="border-b border-slate-200 p-6 sm:border-b-0 sm:border-r">
            <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Bill To
            </div>

            <div className="font-bold">
              {customer.companyName ||
                customer.name ||
                "Customer"}
            </div>

            {customer.name &&
              customer.companyName && (
                <div className="mt-1 text-xs text-slate-500">
                  {customer.name}
                </div>
              )}

            {customer.gstin && (
              <div className="mt-2 text-xs font-semibold text-slate-600">
                GSTIN:{" "}
                {customer.gstin}
              </div>
            )}

            {customer.email && (
              <div className="mt-1 text-xs text-slate-500">
                {customer.email}
              </div>
            )}

            {customer.phone && (
              <div className="text-xs text-slate-500">
                {customer.phone}
              </div>
            )}
          </div>

          <div className="p-6">
            <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Supply Details
            </div>

            <div className="space-y-1 text-xs text-slate-600">
              <div>
                Place of Supply:{" "}
                <span className="font-semibold text-slate-800">
                  {invoice.placeOfSupply ||
                    "—"}
                </span>
              </div>

              <div>
                Supply Type:{" "}
                <span className="font-semibold text-slate-800">
                  {statusLabel(
                    invoice.supplyType ||
                      "intra_state"
                  )}
                </span>
              </div>

              <div>
                Reverse Charge:{" "}
                <span className="font-semibold text-slate-800">
                  {invoice.reverseCharge
                    ? "Yes"
                    : "No"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="overflow-x-auto p-6 sm:p-8">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b-2 border-slate-900 text-left">
                <th className="pb-3 text-[10px] font-bold uppercase tracking-wider">
                  Description
                </th>

                <th className="pb-3 text-right text-[10px] font-bold uppercase tracking-wider">
                  Qty
                </th>

                <th className="pb-3 text-right text-[10px] font-bold uppercase tracking-wider">
                  Rate
                </th>

                <th className="pb-3 text-right text-[10px] font-bold uppercase tracking-wider">
                  Discount
                </th>

                <th className="pb-3 text-right text-[10px] font-bold uppercase tracking-wider">
                  GST
                </th>

                <th className="pb-3 text-right text-[10px] font-bold uppercase tracking-wider">
                  Amount
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {items.map(
                (
                  item,
                  index
                ) => (
                  <tr key={index}>
                    <td className="py-4">
                      <div className="font-semibold">
                        {item.name ||
                          item.productCode ||
                          "Item"}
                      </div>

                      {(item.sku ||
                        item.hsnSac) && (
                        <div className="mt-1 text-[10px] text-slate-400">
                          {item.sku
                            ? `SKU: ${item.sku}`
                            : ""}
                          {item.sku &&
                          item.hsnSac
                            ? " • "
                            : ""}
                          {item.hsnSac
                            ? `HSN/SAC: ${item.hsnSac}`
                            : ""}
                        </div>
                      )}
                    </td>

                    <td className="py-4 text-right text-xs">
                      {numberFormat(
                        item.quantity
                      )}
                    </td>

                    <td className="py-4 text-right text-xs">
                      {money(
                        item.unitPrice,
                        currency
                      )}
                    </td>

                    <td className="py-4 text-right text-xs">
                      {money(
                        item.discountAmount ||
                          0,
                        currency
                      )}
                    </td>

                    <td className="py-4 text-right text-xs">
                      {numberFormat(
                        item.gstRate
                      )}
                      %
                    </td>

                    <td className="py-4 text-right text-xs font-bold">
                      {money(
                        item.lineTotal ||
                          item.total ||
                          0,
                        currency
                      )}
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end border-t border-slate-200 bg-slate-50 p-6 sm:p-8">
          <div className="w-full max-w-sm space-y-2 text-sm">
            <SummaryLight
              label="Subtotal"
              value={money(
                invoice.subtotal ||
                  0,
                currency
              )}
            />

            <SummaryLight
              label="Discount"
              value={`- ${money(
                invoice.totalDiscount ||
                  0,
                currency
              )}`}
            />

            <SummaryLight
              label="Taxable Amount"
              value={money(
                invoice.taxableAmount ||
                  0,
                currency
              )}
            />

            {invoice.supplyType ===
            "inter_state" ? (
              <SummaryLight
                label="IGST"
                value={money(
                  invoice.igstAmount ||
                    0,
                  currency
                )}
              />
            ) : (
              <>
                <SummaryLight
                  label="CGST"
                  value={money(
                    invoice.cgstAmount ||
                      0,
                    currency
                  )}
                />

                <SummaryLight
                  label="SGST"
                  value={money(
                    invoice.sgstAmount ||
                      0,
                    currency
                  )}
                />
              </>
            )}

            <SummaryLight
              label="Shipping"
              value={money(
                invoice.shippingCharges ||
                  0,
                currency
              )}
            />

            <SummaryLight
              label="Other Charges"
              value={money(
                invoice.otherCharges ||
                  0,
                currency
              )}
            />

            <div className="my-3 border-t border-slate-300" />

            <div className="flex items-center justify-between">
              <span className="font-bold">
                Grand Total
              </span>

              <span className="text-xl font-bold">
                {money(
                  invoice.grandTotal ||
                    0,
                  currency
                )}
              </span>
            </div>

            <SummaryLight
              label="Paid"
              value={money(
                invoice.paidAmount ||
                  0,
                currency
              )}
            />

            <SummaryLight
              label="Balance"
              value={money(
                invoice.balanceAmount ||
                  0,
                currency
              )}
            />
          </div>
        </div>

        {/* Notes */}
        {(invoice.notes ||
          invoice.termsAndConditions ||
          invoice.customerNotes) && (
          <div className="grid grid-cols-1 gap-6 border-t border-slate-200 p-6 sm:grid-cols-3 sm:p-8">
            {invoice.notes && (
              <div>
                <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Notes
                </div>

                <p className="whitespace-pre-wrap text-xs leading-5 text-slate-600">
                  {invoice.notes}
                </p>
              </div>
            )}

            {invoice.termsAndConditions && (
              <div>
                <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Terms
                </div>

                <p className="whitespace-pre-wrap text-xs leading-5 text-slate-600">
                  {
                    invoice.termsAndConditions
                  }
                </p>
              </div>
            )}

            {invoice.customerNotes && (
              <div>
                <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Customer Notes
                </div>

                <p className="whitespace-pre-wrap text-xs leading-5 text-slate-600">
                  {
                    invoice.customerNotes
                  }
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryLight({
  label,
  value,
}) {
  return (
    <div className="flex items-center justify-between gap-5 text-xs">
      <span className="text-slate-500">
        {label}
      </span>

      <span className="font-semibold text-slate-700">
        {value}
      </span>
    </div>
  );
}