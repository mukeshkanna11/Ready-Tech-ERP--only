import React, { useCallback, useEffect, useMemo, useState } from "react";
import { getToken } from "../../services/api";

const API_BASE =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const SALES_ORDER_API = `${API_BASE}/salesorder`;

const STATUS_OPTIONS = [
  "draft",
  "confirmed",
  "processing",
  "partially_delivered",
  "delivered",
  "cancelled",
  "closed",
];

const PAYMENT_STATUS_OPTIONS = [
  "unpaid",
  "partial",
  "paid",
  "refunded",
];

const PAYMENT_METHODS = [
  "cash",
  "upi",
  "bank_transfer",
  "card",
  "cheque",
  "credit",
  "other",
];

const EMPTY_ADDRESS = {
  line1: "",
  line2: "",
  city: "",
  state: "",
  country: "",
  postalCode: "",
};

const createEmptyItem = () => ({
  productId: "",
  productCode: "",
  sku: "",
  productName: "",
  description: "",
  quantity: 1,
  unit: "PCS",
  unitPrice: 0,
  discountPercent: 0,
  discountAmount: 0,
  taxableAmount: 0,
  taxPercent: 18,
  taxAmount: 0,
  lineTotal: 0,
});

const createEmptyForm = () => ({
  customerId: "",
  branchId: "",
  quotationId: "",
  referenceNumber: "",
  orderDate: new Date().toISOString().split("T")[0],
  expectedDeliveryDate: "",
  status: "draft",
  paymentStatus: "unpaid",
  paymentMethod: "",
  items: [createEmptyItem()],
  shippingAmount: 0,
  otherCharges: 0,
  adjustmentAmount: 0,
  paidAmount: 0,
  currency: "INR",
  billingAddress: { ...EMPTY_ADDRESS },
  shippingAddress: { ...EMPTY_ADDRESS },
  notes: "",
  termsAndConditions: "",
  customerNotes: "",
});

const apiRequest = async (url, options = {}) => {
  const token = getToken();

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  let data = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(
      data?.message ||
        data?.error ||
        `Request failed with status ${response.status}`
    );
  }

  return data;
};

const money = (value, currency = "INR") => {
  const amount = Number(value || 0);

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
};

const numberValue = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const formatDate = (value) => {
  if (!value) return "-";

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

const getStatusClass = (status) => {
  switch (status) {
    case "draft":
      return "so-status draft";
    case "confirmed":
      return "so-status confirmed";
    case "processing":
      return "so-status processing";
    case "partially_delivered":
      return "so-status partial";
    case "delivered":
      return "so-status delivered";
    case "cancelled":
      return "so-status cancelled";
    case "closed":
      return "so-status closed";
    default:
      return "so-status";
  }
};

const getPaymentClass = (status) => {
  switch (status) {
    case "paid":
      return "payment-badge paid";
    case "partial":
      return "payment-badge partial";
    case "refunded":
      return "payment-badge refunded";
    default:
      return "payment-badge unpaid";
  }
};

const titleCase = (value = "") =>
  value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function SalesOrder() {
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [branches, setBranches] = useState([]);
  const [quotations, setQuotations] = useState([]);

  const [summary, setSummary] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState("");
  const [referenceLoading, setReferenceLoading] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");

  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1,
  });

  const [showForm, setShowForm] = useState(false);
  const [showView, setShowView] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [viewingOrder, setViewingOrder] = useState(null);

  const [form, setForm] = useState(createEmptyForm());

  const [deleteTarget, setDeleteTarget] = useState(null);

  const [activeTab, setActiveTab] = useState("details");

  const [sortField, setSortField] = useState("createdAt");
  const [sortDirection, setSortDirection] = useState("desc");

  const clearMessages = () => {
    setError("");
    setSuccess("");
  };

  const showSuccess = (message) => {
    setError("");
    setSuccess(message);

    window.setTimeout(() => {
      setSuccess("");
    }, 3500);
  };

  const showError = (message) => {
    setSuccess("");
    setError(message);

    window.setTimeout(() => {
      setError("");
    }, 5000);
  };

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();

      params.set("page", page);
      params.set("limit", limit);

      if (search.trim()) {
        params.set("search", search.trim());
      }

      if (statusFilter) {
        params.set("status", statusFilter);
      }

      if (paymentFilter) {
        params.set("paymentStatus", paymentFilter);
      }

      const response = await apiRequest(
        `${SALES_ORDER_API}?${params.toString()}`
      );

      const data = response?.data;

      if (Array.isArray(data)) {
        setOrders(data);
      } else {
        setOrders(data?.salesOrders || data?.orders || []);
      }

      if (response?.pagination) {
        setPagination(response.pagination);
      } else if (data?.pagination) {
        setPagination(data.pagination);
      }
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, statusFilter, paymentFilter]);

  const loadSummary = useCallback(async () => {
    try {
      const response = await apiRequest(`${SALES_ORDER_API}/summary`);

      setSummary(response?.data || response);
    } catch {
      // Summary should not break the main page.
    }
  }, []);

  const loadReferences = useCallback(async () => {
    try {
      setReferenceLoading(true);

      const [
        customersResponse,
        productsResponse,
        branchesResponse,
        quotationsResponse,
      ] = await Promise.allSettled([
        apiRequest(`${API_BASE}/customers?limit=1000`),
        apiRequest(`${API_BASE}/products?limit=1000`),
        apiRequest(`${API_BASE}/branches?limit=1000`),
        apiRequest(`${API_BASE}/quotations?limit=1000`),
      ]);

      if (customersResponse.status === "fulfilled") {
        const response = customersResponse.value;
        const data = response?.data;

        setCustomers(
          Array.isArray(data)
            ? data
            : data?.customers || data?.items || []
        );
      }

      if (productsResponse.status === "fulfilled") {
        const response = productsResponse.value;
        const data = response?.data;

        setProducts(
          Array.isArray(data)
            ? data
            : data?.products || data?.items || []
        );
      }

      if (branchesResponse.status === "fulfilled") {
        const response = branchesResponse.value;
        const data = response?.data;

        setBranches(
          Array.isArray(data)
            ? data
            : data?.branches || data?.items || []
        );
      }

      if (quotationsResponse.status === "fulfilled") {
        const response = quotationsResponse.value;
        const data = response?.data;

        setQuotations(
          Array.isArray(data)
            ? data
            : data?.quotations || data?.items || []
        );
      }
    } finally {
      setReferenceLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    loadReferences();
  }, [loadReferences]);

  const sortedOrders = useMemo(() => {
    const result = [...orders];

    result.sort((a, b) => {
      let aValue = a?.[sortField];
      let bValue = b?.[sortField];

      if (sortField === "customer") {
        aValue =
          a?.customerId?.name ||
          a?.customerId?.displayName ||
          a?.customer?.name ||
          "";
        bValue =
          b?.customerId?.name ||
          b?.customerId?.displayName ||
          b?.customer?.name ||
          "";
      }

      if (sortField === "grandTotal") {
        aValue = numberValue(a?.grandTotal);
        bValue = numberValue(b?.grandTotal);
      }

      if (sortField === "createdAt" || sortField === "orderDate") {
        aValue = new Date(aValue || 0).getTime();
        bValue = new Date(bValue || 0).getTime();
      }

      if (typeof aValue === "string") {
        return sortDirection === "asc"
          ? aValue.localeCompare(String(bValue || ""))
          : String(bValue || "").localeCompare(aValue);
      }

      return sortDirection === "asc"
        ? numberValue(aValue) - numberValue(bValue)
        : numberValue(bValue) - numberValue(aValue);
    });

    return result;
  }, [orders, sortField, sortDirection]);

  const calculatedTotals = useMemo(() => {
    let subtotal = 0;
    let discountAmount = 0;
    let taxableAmount = 0;
    let taxAmount = 0;

    form.items.forEach((item) => {
      const quantity = numberValue(item.quantity);
      const unitPrice = numberValue(item.unitPrice);
      const discountPercent = numberValue(item.discountPercent);
      const taxPercent = numberValue(item.taxPercent);

      const gross = quantity * unitPrice;
      const discount = (gross * discountPercent) / 100;
      const taxable = Math.max(gross - discount, 0);
      const tax = (taxable * taxPercent) / 100;

      subtotal += gross;
      discountAmount += discount;
      taxableAmount += taxable;
      taxAmount += tax;
    });

    const shippingAmount = numberValue(form.shippingAmount);
    const otherCharges = numberValue(form.otherCharges);
    const adjustmentAmount = numberValue(form.adjustmentAmount);

    const grandTotal =
      taxableAmount +
      taxAmount +
      shippingAmount +
      otherCharges +
      adjustmentAmount;

    const paidAmount = Math.max(numberValue(form.paidAmount), 0);

    const balanceAmount = Math.max(grandTotal - paidAmount, 0);

    let paymentStatus = "unpaid";

    if (paidAmount > 0 && paidAmount < grandTotal) {
      paymentStatus = "partial";
    }

    if (paidAmount >= grandTotal && grandTotal > 0) {
      paymentStatus = "paid";
    }

    return {
      subtotal,
      discountAmount,
      taxableAmount,
      taxAmount,
      shippingAmount,
      otherCharges,
      adjustmentAmount,
      grandTotal,
      paidAmount,
      balanceAmount,
      paymentStatus,
    };
  }, [form]);

  const updateForm = (field, value) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const updateAddress = (type, field, value) => {
    setForm((previous) => ({
      ...previous,
      [type]: {
        ...previous[type],
        [field]: value,
      },
    }));
  };

  const updateItem = (index, field, value) => {
    setForm((previous) => {
      const items = [...previous.items];

      const item = {
        ...items[index],
        [field]: value,
      };

      if (field === "productId") {
        const product = products.find(
          (productItem) => productItem._id === value
        );

        if (product) {
          item.productCode =
            product.productCode || product.code || "";
          item.sku = product.sku || "";
          item.productName =
            product.name ||
            product.displayName ||
            product.productName ||
            "";
          item.unit =
            product.unit ||
            product.unitOfMeasure ||
            "PCS";
          item.unitPrice = numberValue(
            product.sellingPrice ??
              product.salePrice ??
              product.price ??
              0
          );
          item.taxPercent = numberValue(
            product.gstRate ??
              product.taxRate ??
              product.taxPercent ??
              18
          );
        }
      }

      const quantity = numberValue(item.quantity);
      const unitPrice = numberValue(item.unitPrice);
      const discountPercent = numberValue(item.discountPercent);
      const taxPercent = numberValue(item.taxPercent);

      const gross = quantity * unitPrice;
      const discount = (gross * discountPercent) / 100;
      const taxable = Math.max(gross - discount, 0);
      const tax = (taxable * taxPercent) / 100;

      item.discountAmount = Number(discount.toFixed(2));
      item.taxableAmount = Number(taxable.toFixed(2));
      item.taxAmount = Number(tax.toFixed(2));
      item.lineTotal = Number((taxable + tax).toFixed(2));

      items[index] = item;

      return {
        ...previous,
        items,
      };
    });
  };

  const addItem = () => {
    setForm((previous) => ({
      ...previous,
      items: [...previous.items, createEmptyItem()],
    }));
  };

  const removeItem = (index) => {
    setForm((previous) => {
      if (previous.items.length === 1) {
        return previous;
      }

      return {
        ...previous,
        items: previous.items.filter(
          (_, itemIndex) => itemIndex !== index
        ),
      };
    });
  };

  const duplicateItem = (index) => {
    setForm((previous) => {
      const item = previous.items[index];

      return {
        ...previous,
        items: [
          ...previous.items.slice(0, index + 1),
          { ...item },
          ...previous.items.slice(index + 1),
        ],
      };
    });
  };

  const resetForm = () => {
    setForm(createEmptyForm());
    setEditingId(null);
    setActiveTab("details");
  };

  const openCreate = () => {
    clearMessages();
    resetForm();
    setShowView(false);
    setViewingOrder(null);
    setShowForm(true);
  };

  const getCustomerObject = (order) => {
    if (!order) return null;

    if (order.customerId && typeof order.customerId === "object") {
      return order.customerId;
    }

    if (order.customer) {
      return order.customer;
    }

    return customers.find(
      (customer) => customer._id === order.customerId
    );
  };

  const getProductObject = (productId) => {
    return products.find(
      (product) => product._id === productId
    );
  };

  const populateFormFromOrder = (order) => {
    const customer = getCustomerObject(order);

    const rawItems = Array.isArray(order.items)
      ? order.items
      : [];

    const items =
      rawItems.length > 0
        ? rawItems.map((item) => ({
            productId:
              typeof item.productId === "object"
                ? item.productId?._id
                : item.productId || "",
            productCode:
              item.productCode ||
              item.productId?.productCode ||
              "",
            sku:
              item.sku ||
              item.productId?.sku ||
              "",
            productName:
              item.productName ||
              item.productId?.name ||
              "",
            description: item.description || "",
            quantity: numberValue(item.quantity) || 1,
            unit: item.unit || "PCS",
            unitPrice: numberValue(item.unitPrice),
            discountPercent: numberValue(
              item.discountPercent
            ),
            discountAmount: numberValue(
              item.discountAmount
            ),
            taxableAmount: numberValue(
              item.taxableAmount
            ),
            taxPercent: numberValue(item.taxPercent),
            taxAmount: numberValue(item.taxAmount),
            lineTotal: numberValue(item.lineTotal),
          }))
        : [createEmptyItem()];

    setForm({
      customerId:
        typeof order.customerId === "object"
          ? order.customerId?._id || ""
          : order.customerId || "",
      branchId:
        typeof order.branchId === "object"
          ? order.branchId?._id || ""
          : order.branchId || "",
      quotationId:
        typeof order.quotationId === "object"
          ? order.quotationId?._id || ""
          : order.quotationId || "",
      referenceNumber: order.referenceNumber || "",
      orderDate:
        order.orderDate
          ? new Date(order.orderDate)
              .toISOString()
              .split("T")[0]
          : "",
      expectedDeliveryDate:
        order.expectedDeliveryDate
          ? new Date(order.expectedDeliveryDate)
              .toISOString()
              .split("T")[0]
          : "",
      status: order.status || "draft",
      paymentStatus: order.paymentStatus || "unpaid",
      paymentMethod: order.paymentMethod || "",
      items,
      shippingAmount: numberValue(
        order.shippingAmount
      ),
      otherCharges: numberValue(order.otherCharges),
      adjustmentAmount: numberValue(
        order.adjustmentAmount
      ),
      paidAmount: numberValue(order.paidAmount),
      currency: order.currency || "INR",
      billingAddress: {
        ...EMPTY_ADDRESS,
        ...(order.billingAddress || {}),
      },
      shippingAddress: {
        ...EMPTY_ADDRESS,
        ...(order.shippingAddress || {}),
      },
      notes: order.notes || "",
      termsAndConditions:
        order.termsAndConditions || "",
      customerNotes: order.customerNotes || "",
    });

    return customer;
  };

  const openEdit = async (order) => {
    try {
      clearMessages();

      let fullOrder = order;

      if (
        order?._id &&
        (!order.items || !Array.isArray(order.items))
      ) {
        const response = await apiRequest(
          `${SALES_ORDER_API}/${order._id}`
        );

        fullOrder = response?.data || response;
      }

      populateFormFromOrder(fullOrder);

      setEditingId(fullOrder._id);
      setShowView(false);
      setViewingOrder(null);
      setActiveTab("details");
      setShowForm(true);
    } catch (err) {
      showError(err.message);
    }
  };

  const openView = async (order) => {
    try {
      clearMessages();

      setActionLoading(`view-${order._id}`);

      const response = await apiRequest(
        `${SALES_ORDER_API}/${order._id}`
      );

      const fullOrder = response?.data || response;

      setViewingOrder(fullOrder);
      setShowView(true);
      setShowForm(false);
    } catch (err) {
      showError(err.message);
    } finally {
      setActionLoading("");
    }
  };

  const handleQuotationSelect = async (quotationId) => {
    updateForm("quotationId", quotationId);

    if (!quotationId) return;

    const quotation = quotations.find(
      (item) => item._id === quotationId
    );

    if (!quotation) return;

    const customerId =
      typeof quotation.customerId === "object"
        ? quotation.customerId?._id
        : quotation.customerId;

    const branchId =
      typeof quotation.branchId === "object"
        ? quotation.branchId?._id
        : quotation.branchId;

    const quotationItems = Array.isArray(
      quotation.items
    )
      ? quotation.items
      : [];

    setForm((previous) => ({
      ...previous,
      quotationId,
      customerId: customerId || previous.customerId,
      branchId: branchId || previous.branchId,
      referenceNumber:
        quotation.referenceNumber ||
        previous.referenceNumber,
      items:
        quotationItems.length > 0
          ? quotationItems.map((item) => ({
              productId:
                typeof item.productId === "object"
                  ? item.productId?._id || ""
                  : item.productId || "",
              productCode: item.productCode || "",
              sku: item.sku || "",
              productName: item.productName || "",
              description: item.description || "",
              quantity: numberValue(item.quantity) || 1,
              unit: item.unit || "PCS",
              unitPrice: numberValue(item.unitPrice),
              discountPercent: numberValue(
                item.discountPercent
              ),
              discountAmount: 0,
              taxableAmount: 0,
              taxPercent: numberValue(
                item.taxPercent
              ),
              taxAmount: 0,
              lineTotal: 0,
            }))
          : previous.items,
      shippingAmount: numberValue(
        quotation.shippingAmount
      ),
      otherCharges: numberValue(
        quotation.otherCharges
      ),
      adjustmentAmount: numberValue(
        quotation.adjustmentAmount
      ),
      currency: quotation.currency || "INR",
      billingAddress: {
        ...EMPTY_ADDRESS,
        ...(quotation.billingAddress || {}),
      },
      shippingAddress: {
        ...EMPTY_ADDRESS,
        ...(quotation.shippingAddress || {}),
      },
      notes: quotation.notes || "",
      termsAndConditions:
        quotation.termsAndConditions || "",
      customerNotes:
        quotation.customerNotes || "",
    }));
  };

  const fillCustomerAddress = (customerId) => {
    const customer = customers.find(
      (item) => item._id === customerId
    );

    if (!customer) return;

    const billing =
      customer.billingAddress ||
      customer.address ||
      {};

    const shipping =
      customer.shippingAddress ||
      customer.address ||
      billing;

    setForm((previous) => ({
      ...previous,
      customerId,
      billingAddress: {
        ...EMPTY_ADDRESS,
        ...billing,
      },
      shippingAddress: {
        ...EMPTY_ADDRESS,
        ...shipping,
      },
    }));
  };

  const buildPayload = () => {
    return {
      customerId: form.customerId,
      branchId: form.branchId || null,
      quotationId: form.quotationId || null,
      referenceNumber:
        form.referenceNumber.trim() || undefined,
      orderDate: form.orderDate || undefined,
      expectedDeliveryDate:
        form.expectedDeliveryDate || undefined,

      items: form.items
        .filter((item) => item.productId)
        .map((item) => ({
          productId: item.productId,
          productCode: item.productCode || undefined,
          sku: item.sku || undefined,
          productName: item.productName || undefined,
          description:
            item.description?.trim() || undefined,
          quantity: numberValue(item.quantity),
          unit: item.unit || "PCS",
          unitPrice: numberValue(item.unitPrice),
          discountPercent: numberValue(
            item.discountPercent
          ),
          taxPercent: numberValue(item.taxPercent),
        })),

      shippingAmount: numberValue(form.shippingAmount),
      otherCharges: numberValue(form.otherCharges),
      adjustmentAmount: numberValue(
        form.adjustmentAmount
      ),
      paidAmount: numberValue(form.paidAmount),
      paymentMethod: form.paymentMethod || "",
      currency: form.currency || "INR",

      billingAddress: form.billingAddress,
      shippingAddress: form.shippingAddress,

      notes: form.notes.trim(),
      termsAndConditions:
        form.termsAndConditions.trim(),
      customerNotes: form.customerNotes.trim(),
    };
  };

  const validateForm = () => {
    if (!form.customerId) {
      showError("Please select a customer.");
      setActiveTab("details");
      return false;
    }

    const validItems = form.items.filter(
      (item) => item.productId
    );

    if (validItems.length === 0) {
      showError(
        "Please add at least one product to the sales order."
      );
      setActiveTab("items");
      return false;
    }

    for (let index = 0; index < validItems.length; index++) {
      const item = validItems[index];

      if (numberValue(item.quantity) <= 0) {
        showError(
          `Item ${index + 1}: quantity must be greater than 0.`
        );
        setActiveTab("items");
        return false;
      }

      if (numberValue(item.unitPrice) < 0) {
        showError(
          `Item ${index + 1}: unit price cannot be negative.`
        );
        setActiveTab("items");
        return false;
      }
    }

    if (
      numberValue(form.paidAmount) >
      calculatedTotals.grandTotal
    ) {
      showError(
        "Paid amount cannot be greater than the grand total."
      );
      setActiveTab("payment");
      return false;
    }

    return true;
  };

  const saveOrder = async () => {
    clearMessages();

    if (!validateForm()) return;

    try {
      setSaving(true);

      const payload = buildPayload();

      let response;

      if (editingId) {
        response = await apiRequest(
          `${SALES_ORDER_API}/${editingId}`,
          {
            method: "PUT",
            body: JSON.stringify(payload),
          }
        );
      } else {
        response = await apiRequest(
          SALES_ORDER_API,
          {
            method: "POST",
            body: JSON.stringify(payload),
          }
        );
      }

      const saved = response?.data || response;

      showSuccess(
        editingId
          ? "Sales Order updated successfully."
          : `Sales Order ${
              saved?.orderNumber || ""
            } created successfully.`
      );

      setShowForm(false);
      resetForm();

      await Promise.all([
        loadOrders(),
        loadSummary(),
      ]);
    } catch (err) {
      showError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const performAction = async (
    order,
    action,
    successMessage
  ) => {
    if (!order?._id) return;

    try {
      setActionLoading(`${action}-${order._id}`);

      await apiRequest(
        `${SALES_ORDER_API}/${order._id}/${action}`,
        {
          method: "POST",
        }
      );

      showSuccess(
        successMessage ||
          `Sales Order ${action} successfully.`
      );

      await Promise.all([
        loadOrders(),
        loadSummary(),
      ]);

      if (showView) {
        const refreshed = await apiRequest(
          `${SALES_ORDER_API}/${order._id}`
        );

        setViewingOrder(
          refreshed?.data || refreshed
        );
      }
    } catch (err) {
      showError(err.message);
    } finally {
      setActionLoading("");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget?._id) return;

    try {
      setActionLoading(
        `delete-${deleteTarget._id}`
      );

      await apiRequest(
        `${SALES_ORDER_API}/${deleteTarget._id}`,
        {
          method: "DELETE",
        }
      );

      showSuccess("Sales Order deleted successfully.");

      setDeleteTarget(null);

      if (
        viewingOrder?._id === deleteTarget._id
      ) {
        setShowView(false);
        setViewingOrder(null);
      }

      await Promise.all([
        loadOrders(),
        loadSummary(),
      ]);
    } catch (err) {
      showError(err.message);
    } finally {
      setActionLoading("");
    }
  };

  const handleRestore = async (order) => {
    await performAction(
      order,
      "restore",
      "Sales Order restored successfully."
    );
  };

  const handleDuplicate = async (order) => {
    await performAction(
      order,
      "duplicate",
      "Sales Order duplicated successfully."
    );
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection((previous) =>
        previous === "asc" ? "desc" : "asc"
      );
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const customerName = (order) => {
    const customer = getCustomerObject(order);

    return (
      customer?.name ||
      customer?.displayName ||
      customer?.companyName ||
      customer?.customerName ||
      "Unknown Customer"
    );
  };

  const customerInitial = (order) => {
    const name = customerName(order);

    return name.charAt(0).toUpperCase();
  };

  const summaryValue = (keys) => {
    if (!summary) return 0;

    for (const key of keys) {
      if (
        summary[key] !== undefined &&
        summary[key] !== null
      ) {
        return summary[key];
      }

      if (
        summary.data &&
        summary.data[key] !== undefined
      ) {
        return summary.data[key];
      }
    }

    return 0;
  };

  const totalOrders =
    summaryValue(["total", "totalOrders"]) ||
    pagination.total ||
    orders.length;

  const draftOrders = summaryValue([
    "draft",
    "draftCount",
  ]);

  const confirmedOrders = summaryValue([
    "confirmed",
    "confirmedCount",
  ]);

  const processingOrders = summaryValue([
    "processing",
    "processingCount",
  ]);

  const deliveredOrders = summaryValue([
    "delivered",
    "deliveredCount",
  ]);

  const cancelledOrders = summaryValue([
    "cancelled",
    "cancelledCount",
  ]);

  const totalAmount = summaryValue([
    "totalAmount",
    "grandTotal",
    "totalValue",
  ]);

  const paidAmount = summaryValue([
    "paidAmount",
    "totalPaid",
  ]);

  const balanceAmount = summaryValue([
    "balanceAmount",
    "totalBalance",
  ]);

  const renderActionButton = (
    label,
    icon,
    onClick,
    disabled = false,
    danger = false
  ) => (
    <button
      type="button"
      className={`so-action-button ${
        danger ? "danger" : ""
      }`}
      onClick={onClick}
      disabled={disabled}
      title={label}
    >
      <span>{icon}</span>
      <span className="action-label">{label}</span>
    </button>
  );

  const renderWorkflowActions = (order) => {
    const status = order.status;

    const isBusy = actionLoading.includes(
      order._id
    );

    return (
      <div className="workflow-actions">
        {status === "draft" &&
          renderActionButton(
            "Confirm",
            "✓",
            () =>
              performAction(
                order,
                "confirm",
                "Sales Order confirmed successfully."
              ),
            isBusy
          )}

        {status === "confirmed" &&
          renderActionButton(
            "Process",
            "⚡",
            () =>
              performAction(
                order,
                "process",
                "Sales Order moved to processing."
              ),
            isBusy
          )}

        {status === "processing" &&
          renderActionButton(
            "Deliver",
            "🚚",
            () =>
              performAction(
                order,
                "deliver",
                "Sales Order marked as delivered."
              ),
            isBusy
          )}

        {status === "delivered" &&
          renderActionButton(
            "Close",
            "✓",
            () =>
              performAction(
                order,
                "close",
                "Sales Order closed successfully."
              ),
            isBusy
          )}

        {["draft", "confirmed", "processing"].includes(
          status
        ) &&
          renderActionButton(
            "Cancel",
            "×",
            () =>
              performAction(
                order,
                "cancel",
                "Sales Order cancelled successfully."
              ),
            isBusy,
            true
          )}
      </div>
    );
  };

  return (
    <div className="sales-order-page">
      <style>{`
        * {
          box-sizing: border-box;
        }

        .sales-order-page {
          min-height: 100vh;
          background:
            radial-gradient(circle at 15% 0%, rgba(99, 102, 241, 0.13), transparent 28%),
            radial-gradient(circle at 85% 10%, rgba(14, 165, 233, 0.09), transparent 25%),
            #07090f;
          color: #f5f7fb;
          padding: 26px;
          font-family:
            Inter,
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
        }

        .so-container {
          max-width: 1600px;
          margin: 0 auto;
        }

        .so-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 24px;
          margin-bottom: 26px;
        }

        .so-title-section {
          display: flex;
          align-items: flex-start;
          gap: 16px;
        }

        .so-title-icon {
          width: 52px;
          height: 52px;
          border-radius: 16px;
          display: grid;
          place-items: center;
          background:
            linear-gradient(
              135deg,
              rgba(99, 102, 241, 0.22),
              rgba(14, 165, 233, 0.13)
            );
          border: 1px solid rgba(129, 140, 248, 0.25);
          box-shadow:
            0 14px 35px rgba(0, 0, 0, 0.28),
            inset 0 1px rgba(255, 255, 255, 0.05);
          font-size: 24px;
        }

        .so-title {
          margin: 0;
          font-size: 28px;
          font-weight: 800;
          letter-spacing: -0.6px;
        }

        .so-subtitle {
          margin: 6px 0 0;
          color: #8e97aa;
          font-size: 14px;
        }

        .so-primary-button {
          border: 0;
          cursor: pointer;
          color: white;
          font-weight: 750;
          padding: 12px 18px;
          border-radius: 12px;
          background:
            linear-gradient(
              135deg,
              #6366f1,
              #4f46e5
            );
          box-shadow:
            0 12px 28px rgba(79, 70, 229, 0.28),
            inset 0 1px rgba(255,255,255,0.16);
          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease;
          white-space: nowrap;
        }

        .so-primary-button:hover {
          transform: translateY(-1px);
          box-shadow:
            0 16px 35px rgba(79, 70, 229, 0.36),
            inset 0 1px rgba(255,255,255,0.18);
        }

        .so-primary-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .so-summary-grid {
          display: grid;
          grid-template-columns:
            repeat(4, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 18px;
        }

        .so-summary-card {
          min-height: 132px;
          padding: 18px;
          border-radius: 18px;
          border: 1px solid rgba(255,255,255,0.075);
          background:
            linear-gradient(
              145deg,
              rgba(19, 23, 34, 0.96),
              rgba(10, 13, 21, 0.96)
            );
          box-shadow:
            0 18px 45px rgba(0, 0, 0, 0.20),
            inset 0 1px rgba(255,255,255,0.035);
          position: relative;
          overflow: hidden;
        }

        .so-summary-card::after {
          content: "";
          position: absolute;
          width: 100px;
          height: 100px;
          right: -50px;
          top: -50px;
          background: rgba(99,102,241,0.08);
          border-radius: 50%;
          filter: blur(4px);
        }

        .so-card-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: #929bad;
          font-size: 13px;
          font-weight: 600;
        }

        .so-card-icon {
          width: 32px;
          height: 32px;
          display: grid;
          place-items: center;
          border-radius: 10px;
          background: rgba(255,255,255,0.045);
          border: 1px solid rgba(255,255,255,0.055);
        }

        .so-card-value {
          margin-top: 14px;
          font-size: 25px;
          font-weight: 800;
          letter-spacing: -0.4px;
        }

        .so-card-meta {
          margin-top: 5px;
          color: #6f788b;
          font-size: 12px;
        }

        .so-main-card {
          border: 1px solid rgba(255,255,255,0.075);
          background:
            rgba(10, 13, 20, 0.88);
          backdrop-filter: blur(20px);
          border-radius: 20px;
          overflow: hidden;
          box-shadow:
            0 24px 70px rgba(0, 0, 0, 0.28),
            inset 0 1px rgba(255,255,255,0.035);
        }

        .so-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding: 17px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }

        .so-search-wrap {
          position: relative;
          flex: 1;
          min-width: 240px;
        }

        .so-search-icon {
          position: absolute;
          left: 13px;
          top: 50%;
          transform: translateY(-50%);
          color: #70798d;
          pointer-events: none;
        }

        .so-input,
        .so-select,
        .so-textarea {
          width: 100%;
          border: 1px solid rgba(255,255,255,0.08);
          outline: none;
          background: rgba(255,255,255,0.035);
          color: #f2f4f8;
          border-radius: 11px;
          transition:
            border-color 0.18s ease,
            background 0.18s ease,
            box-shadow 0.18s ease;
        }

        .so-input,
        .so-select {
          min-height: 42px;
          padding: 0 12px;
          font-size: 13px;
        }

        .so-search-input {
          padding-left: 39px;
        }

        .so-input::placeholder,
        .so-textarea::placeholder {
          color: #616a7d;
        }

        .so-input:focus,
        .so-select:focus,
        .so-textarea:focus {
          border-color: rgba(99,102,241,0.65);
          background: rgba(99,102,241,0.055);
          box-shadow:
            0 0 0 3px rgba(99,102,241,0.10);
        }

        .so-select {
          cursor: pointer;
        }

        .so-select option {
          background: #111520;
          color: #fff;
        }

        .so-filter {
          min-width: 150px;
        }

        .so-refresh {
          height: 42px;
          width: 42px;
          border-radius: 11px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.035);
          color: #b7c0d0;
          cursor: pointer;
          font-size: 16px;
        }

        .so-refresh:hover {
          background: rgba(255,255,255,0.07);
          color: white;
        }

        .so-table-wrap {
          width: 100%;
          overflow-x: auto;
        }

        .so-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 1120px;
        }

        .so-table th {
          padding: 13px 16px;
          text-align: left;
          color: #6f788b;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.7px;
          font-weight: 750;
          background: rgba(255,255,255,0.018);
          border-bottom: 1px solid rgba(255,255,255,0.06);
          white-space: nowrap;
        }

        .so-sortable {
          cursor: pointer;
          user-select: none;
        }

        .so-sortable:hover {
          color: #aeb7c8;
        }

        .so-table td {
          padding: 15px 16px;
          border-bottom: 1px solid rgba(255,255,255,0.045);
          font-size: 13px;
          color: #cfd5e0;
          vertical-align: middle;
        }

        .so-table tbody tr {
          transition:
            background 0.18s ease;
        }

        .so-table tbody tr:hover {
          background: rgba(255,255,255,0.025);
        }

        .so-order-number {
          color: #eef1f7;
          font-weight: 750;
          cursor: pointer;
        }

        .so-order-number:hover {
          color: #818cf8;
        }

        .so-reference {
          color: #737d90;
          font-size: 11px;
          margin-top: 4px;
        }

        .so-customer {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .so-avatar {
          width: 34px;
          height: 34px;
          min-width: 34px;
          border-radius: 10px;
          display: grid;
          place-items: center;
          background:
            linear-gradient(
              135deg,
              rgba(99,102,241,0.20),
              rgba(14,165,233,0.13)
            );
          border: 1px solid rgba(129,140,248,0.17);
          color: #c7d2fe;
          font-weight: 800;
          font-size: 12px;
        }

        .so-customer-name {
          color: #e6e9ef;
          font-weight: 650;
        }

        .so-status,
        .payment-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 9px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 750;
          text-transform: capitalize;
          white-space: nowrap;
          border: 1px solid transparent;
        }

        .so-status::before,
        .payment-badge::before {
          content: "";
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: currentColor;
          opacity: 0.8;
        }

        .so-status.draft {
          color: #a8b1c1;
          background: rgba(148,163,184,0.09);
          border-color: rgba(148,163,184,0.15);
        }

        .so-status.confirmed {
          color: #93c5fd;
          background: rgba(59,130,246,0.09);
          border-color: rgba(59,130,246,0.17);
        }

        .so-status.processing {
          color: #c4b5fd;
          background: rgba(139,92,246,0.10);
          border-color: rgba(139,92,246,0.18);
        }

        .so-status.partial {
          color: #fcd34d;
          background: rgba(234,179,8,0.09);
          border-color: rgba(234,179,8,0.16);
        }

        .so-status.delivered {
          color: #86efac;
          background: rgba(34,197,94,0.09);
          border-color: rgba(34,197,94,0.17);
        }

        .so-status.cancelled {
          color: #fca5a5;
          background: rgba(239,68,68,0.09);
          border-color: rgba(239,68,68,0.17);
        }

        .so-status.closed {
          color: #67e8f9;
          background: rgba(6,182,212,0.09);
          border-color: rgba(6,182,212,0.17);
        }

        .payment-badge.paid {
          color: #86efac;
          background: rgba(34,197,94,0.08);
        }

        .payment-badge.partial {
          color: #fcd34d;
          background: rgba(234,179,8,0.08);
        }

        .payment-badge.refunded {
          color: #c4b5fd;
          background: rgba(139,92,246,0.08);
        }

        .payment-badge.unpaid {
          color: #fca5a5;
          background: rgba(239,68,68,0.08);
        }

        .so-amount {
          color: #f4f6fa;
          font-weight: 750;
          white-space: nowrap;
        }

        .so-actions {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }

        .so-icon-button {
          width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          border-radius: 9px;
          border: 1px solid rgba(255,255,255,0.07);
          background: rgba(255,255,255,0.035);
          color: #aeb7c7;
          cursor: pointer;
          transition: all 0.18s ease;
        }

        .so-icon-button:hover {
          color: white;
          border-color: rgba(129,140,248,0.30);
          background: rgba(99,102,241,0.10);
        }

        .so-icon-button.danger:hover {
          color: #fca5a5;
          border-color: rgba(239,68,68,0.25);
          background: rgba(239,68,68,0.09);
        }

        .workflow-actions {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          margin-top: 8px;
        }

        .so-action-button {
          min-height: 29px;
          padding: 5px 9px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.07);
          background: rgba(255,255,255,0.03);
          color: #b9c1d0;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 10px;
          font-weight: 700;
        }

        .so-action-button:hover {
          color: white;
          background: rgba(99,102,241,0.10);
          border-color: rgba(99,102,241,0.25);
        }

        .so-action-button.danger:hover {
          color: #fca5a5;
          background: rgba(239,68,68,0.09);
          border-color: rgba(239,68,68,0.22);
        }

        .so-action-button:disabled,
        .so-icon-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .so-empty {
          text-align: center;
          padding: 70px 20px;
        }

        .so-empty-icon {
          width: 58px;
          height: 58px;
          margin: 0 auto 15px;
          border-radius: 17px;
          display: grid;
          place-items: center;
          background: rgba(99,102,241,0.09);
          border: 1px solid rgba(99,102,241,0.16);
          font-size: 25px;
        }

        .so-empty-title {
          font-size: 16px;
          font-weight: 750;
        }

        .so-empty-text {
          margin-top: 6px;
          color: #727c8f;
          font-size: 13px;
        }

        .so-pagination {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          padding: 14px 17px;
          color: #777f91;
          font-size: 12px;
        }

        .so-page-buttons {
          display: flex;
          gap: 7px;
        }

        .so-page-button {
          min-width: 34px;
          height: 34px;
          padding: 0 10px;
          border-radius: 9px;
          border: 1px solid rgba(255,255,255,0.07);
          background: rgba(255,255,255,0.035);
          color: #aeb7c6;
          cursor: pointer;
        }

        .so-page-button:hover:not(:disabled) {
          background: rgba(99,102,241,0.10);
          border-color: rgba(99,102,241,0.25);
          color: white;
        }

        .so-page-button:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }

        .so-page-current {
          background: rgba(99,102,241,0.14);
          color: #c7d2fe;
          border-color: rgba(99,102,241,0.25);
        }

        .so-alert {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 12px 14px;
          margin-bottom: 16px;
          border-radius: 12px;
          border: 1px solid;
          font-size: 13px;
        }

        .so-alert.error {
          color: #fecaca;
          background: rgba(127,29,29,0.18);
          border-color: rgba(239,68,68,0.22);
        }

        .so-alert.success {
          color: #bbf7d0;
          background: rgba(20,83,45,0.17);
          border-color: rgba(34,197,94,0.20);
        }

        .so-overlay {
          position: fixed;
          inset: 0;
          z-index: 100;
          background: rgba(0,0,0,0.72);
          backdrop-filter: blur(9px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 22px;
        }

        .so-modal {
          width: min(1100px, 100%);
          max-height: calc(100vh - 44px);
          overflow: hidden;
          border-radius: 22px;
          border: 1px solid rgba(255,255,255,0.09);
          background:
            linear-gradient(
              145deg,
              rgba(18,22,32,0.99),
              rgba(9,12,19,0.99)
            );
          box-shadow:
            0 40px 120px rgba(0,0,0,0.55),
            inset 0 1px rgba(255,255,255,0.045);
          display: flex;
          flex-direction: column;
        }

        .so-modal.large {
          width: min(1250px, 100%);
        }

        .so-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 18px 20px;
          border-bottom: 1px solid rgba(255,255,255,0.07);
        }

        .so-modal-title {
          font-size: 18px;
          font-weight: 800;
        }

        .so-modal-subtitle {
          margin-top: 4px;
          color: #717b8e;
          font-size: 12px;
        }

        .so-close {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.07);
          background: rgba(255,255,255,0.035);
          color: #aeb6c5;
          cursor: pointer;
          font-size: 18px;
        }

        .so-close:hover {
          color: white;
          background: rgba(255,255,255,0.08);
        }

        .so-modal-body {
          overflow-y: auto;
          padding: 20px;
        }

        .so-modal-footer {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 9px;
          padding: 15px 20px;
          border-top: 1px solid rgba(255,255,255,0.07);
        }

        .so-secondary-button {
          min-height: 42px;
          padding: 0 15px;
          border-radius: 11px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.035);
          color: #b7c0cf;
          cursor: pointer;
          font-weight: 650;
        }

        .so-secondary-button:hover {
          background: rgba(255,255,255,0.07);
          color: white;
        }

        .so-tabs {
          display: flex;
          gap: 5px;
          margin-bottom: 19px;
          padding: 4px;
          border-radius: 12px;
          background: rgba(255,255,255,0.025);
          border: 1px solid rgba(255,255,255,0.05);
          width: fit-content;
        }

        .so-tab {
          padding: 8px 13px;
          border-radius: 8px;
          border: 0;
          background: transparent;
          color: #747e90;
          cursor: pointer;
          font-size: 12px;
          font-weight: 700;
        }

        .so-tab.active {
          color: #eef1f7;
          background: rgba(99,102,241,0.14);
          box-shadow:
            inset 0 0 0 1px rgba(99,102,241,0.16);
        }

        .so-section {
          margin-bottom: 20px;
        }

        .so-section-title {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .so-section-title h3 {
          margin: 0;
          font-size: 14px;
          font-weight: 800;
        }

        .so-section-title span {
          color: #6f788a;
          font-size: 11px;
        }

        .so-form-grid {
          display: grid;
          grid-template-columns:
            repeat(3, minmax(0, 1fr));
          gap: 13px;
        }

        .so-field {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .so-field.full {
          grid-column: 1 / -1;
        }

        .so-field label {
          color: #9ca5b6;
          font-size: 11px;
          font-weight: 700;
        }

        .so-required {
          color: #f87171;
        }

        .so-textarea {
          min-height: 95px;
          padding: 11px 12px;
          resize: vertical;
          font-size: 13px;
          font-family: inherit;
        }

        .so-address-grid {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 15px;
        }

        .so-address-card {
          border: 1px solid rgba(255,255,255,0.065);
          border-radius: 14px;
          padding: 14px;
          background: rgba(255,255,255,0.018);
        }

        .so-address-title {
          font-size: 12px;
          font-weight: 750;
          margin-bottom: 12px;
          color: #dce1ea;
        }

        .so-address-fields {
          display: grid;
          gap: 9px;
        }

        .so-item-table-wrap {
          overflow-x: auto;
          border: 1px solid rgba(255,255,255,0.065);
          border-radius: 14px;
        }

        .so-item-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 1050px;
        }

        .so-item-table th {
          padding: 10px;
          color: #6f788a;
          background: rgba(255,255,255,0.025);
          border-bottom: 1px solid rgba(255,255,255,0.06);
          text-align: left;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .so-item-table td {
          padding: 9px;
          border-bottom: 1px solid rgba(255,255,255,0.045);
          vertical-align: middle;
        }

        .so-item-table tr:last-child td {
          border-bottom: 0;
        }

        .so-item-input {
          min-width: 80px;
        }

        .so-product-select {
          min-width: 210px;
        }

        .so-remove-item,
        .so-duplicate-item {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.07);
          cursor: pointer;
          background: rgba(255,255,255,0.035);
          color: #9da7b8;
        }

        .so-remove-item:hover {
          color: #fca5a5;
          background: rgba(239,68,68,0.09);
        }

        .so-duplicate-item:hover {
          color: #c7d2fe;
          background: rgba(99,102,241,0.10);
        }

        .so-add-item {
          margin-top: 10px;
          border: 1px dashed rgba(129,140,248,0.28);
          background: rgba(99,102,241,0.045);
          color: #a5b4fc;
          border-radius: 10px;
          padding: 9px 13px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 700;
        }

        .so-add-item:hover {
          background: rgba(99,102,241,0.10);
        }

        .so-total-layout {
          display: grid;
          grid-template-columns:
            minmax(0, 1.3fr)
            minmax(320px, 0.7fr);
          gap: 18px;
        }

        .so-note-card {
          border: 1px solid rgba(255,255,255,0.065);
          background: rgba(255,255,255,0.018);
          border-radius: 15px;
          padding: 15px;
        }

        .so-totals-card {
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 16px;
          padding: 17px;
          background:
            linear-gradient(
              145deg,
              rgba(99,102,241,0.06),
              rgba(255,255,255,0.018)
            );
        }

        .so-total-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
          padding: 8px 0;
          color: #8992a4;
          font-size: 12px;
        }

        .so-total-row strong {
          color: #dce1ea;
          font-weight: 700;
        }

        .so-total-row.grand {
          margin-top: 7px;
          padding-top: 13px;
          border-top: 1px solid rgba(255,255,255,0.07);
          color: #c7d2fe;
          font-size: 14px;
        }

        .so-total-row.grand strong {
          color: #eef1ff;
          font-size: 20px;
        }

        .so-balance {
          color: #fcd34d !important;
        }

        .so-form-error {
          color: #fca5a5;
          font-size: 11px;
          margin-top: 4px;
        }

        .so-view-grid {
          display: grid;
          grid-template-columns:
            repeat(4, minmax(0, 1fr));
          gap: 10px;
          margin-bottom: 18px;
        }

        .so-view-stat {
          border: 1px solid rgba(255,255,255,0.065);
          background: rgba(255,255,255,0.018);
          border-radius: 13px;
          padding: 12px;
        }

        .so-view-label {
          color: #70798b;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .so-view-value {
          margin-top: 6px;
          color: #e9edf4;
          font-weight: 750;
          font-size: 13px;
        }

        .so-view-items {
          border: 1px solid rgba(255,255,255,0.065);
          border-radius: 14px;
          overflow: hidden;
        }

        .so-view-items table {
          width: 100%;
          border-collapse: collapse;
        }

        .so-view-items th,
        .so-view-items td {
          padding: 11px 12px;
          border-bottom: 1px solid rgba(255,255,255,0.045);
          text-align: left;
          font-size: 12px;
        }

        .so-view-items th {
          color: #717b8e;
          background: rgba(255,255,255,0.025);
          font-size: 10px;
          text-transform: uppercase;
        }

        .so-view-items td {
          color: #c7ceda;
        }

        .so-view-items tr:last-child td {
          border-bottom: 0;
        }

        .so-view-bottom {
          display: grid;
          grid-template-columns:
            minmax(0, 1fr)
            320px;
          gap: 15px;
          margin-top: 15px;
        }

        .so-view-notes {
          border: 1px solid rgba(255,255,255,0.065);
          border-radius: 14px;
          padding: 14px;
          background: rgba(255,255,255,0.018);
        }

        .so-view-notes h4 {
          margin: 0 0 8px;
          font-size: 12px;
          color: #dce1ea;
        }

        .so-view-notes p {
          margin: 0 0 13px;
          color: #818a9c;
          line-height: 1.6;
          font-size: 12px;
        }

        .so-delete-modal {
          width: min(430px, 100%);
        }

        .so-delete-content {
          padding: 24px;
          text-align: center;
        }

        .so-delete-icon {
          width: 55px;
          height: 55px;
          margin: 0 auto 15px;
          border-radius: 16px;
          display: grid;
          place-items: center;
          color: #fca5a5;
          background: rgba(239,68,68,0.09);
          border: 1px solid rgba(239,68,68,0.18);
          font-size: 24px;
        }

        .so-delete-title {
          font-size: 17px;
          font-weight: 800;
        }

        .so-delete-text {
          color: #7d8799;
          font-size: 12px;
          line-height: 1.6;
          margin: 8px 0 0;
        }

        .so-delete-actions {
          display: flex;
          justify-content: center;
          gap: 9px;
          padding: 0 24px 24px;
        }

        .so-danger-button {
          min-height: 42px;
          padding: 0 16px;
          border-radius: 11px;
          border: 1px solid rgba(239,68,68,0.20);
          background: rgba(239,68,68,0.10);
          color: #fca5a5;
          cursor: pointer;
          font-weight: 750;
        }

        .so-danger-button:hover {
          background: rgba(239,68,68,0.17);
        }

        .so-loading {
          min-height: 350px;
          display: grid;
          place-items: center;
          color: #737d90;
        }

        .so-spinner {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: 2px solid rgba(255,255,255,0.10);
          border-top-color: #818cf8;
          animation: so-spin 0.8s linear infinite;
        }

        @keyframes so-spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 1200px) {
          .so-summary-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

          .so-form-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

          .so-view-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 800px) {
          .sales-order-page {
            padding: 15px;
          }

          .so-header {
            flex-direction: column;
          }

          .so-primary-button {
            width: 100%;
          }

          .so-toolbar {
            flex-direction: column;
            align-items: stretch;
          }

          .so-search-wrap {
            min-width: 0;
          }

          .so-filter {
            width: 100%;
          }

          .so-summary-grid {
            grid-template-columns: 1fr;
          }

          .so-form-grid {
            grid-template-columns: 1fr;
          }

          .so-field.full {
            grid-column: auto;
          }

          .so-address-grid,
          .so-total-layout,
          .so-view-bottom {
            grid-template-columns: 1fr;
          }

          .so-modal {
            max-height: calc(100vh - 20px);
          }

          .so-overlay {
            padding: 10px;
          }

          .so-modal-body {
            padding: 15px;
          }

          .so-modal-footer {
            flex-direction: column-reverse;
          }

          .so-modal-footer button {
            width: 100%;
          }

          .so-pagination {
            flex-direction: column;
            align-items: stretch;
          }

          .so-page-buttons {
            justify-content: center;
          }

          .action-label {
            display: none;
          }

          .so-workflow-actions {
            display: none;
          }
        }
      `}</style>

      <div className="so-container">
        <div className="so-header">
          <div className="so-title-section">
            <div className="so-title-icon">📦</div>

            <div>
              <h1 className="so-title">
                Sales Orders
              </h1>

              <p className="so-subtitle">
                Manage customer orders, fulfillment,
                payments and delivery workflow.
              </p>
            </div>
          </div>

          <button
            type="button"
            className="so-primary-button"
            onClick={openCreate}
          >
            + New Sales Order
          </button>
        </div>

        {error && (
          <div className="so-alert error">
            <span>⚠</span>
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="so-alert success">
            <span>✓</span>
            <span>{success}</span>
          </div>
        )}

        <div className="so-summary-grid">
          <div className="so-summary-card">
            <div className="so-card-top">
              <span>Total Orders</span>
              <span className="so-card-icon">
                📋
              </span>
            </div>

            <div className="so-card-value">
              {totalOrders}
            </div>

            <div className="so-card-meta">
              All sales orders
            </div>
          </div>

          <div className="so-summary-card">
            <div className="so-card-top">
              <span>Order Value</span>
              <span className="so-card-icon">
                ₹
              </span>
            </div>

            <div className="so-card-value">
              {money(totalAmount)}
            </div>

            <div className="so-card-meta">
              Total order value
            </div>
          </div>

          <div className="so-summary-card">
            <div className="so-card-top">
              <span>Paid</span>
              <span className="so-card-icon">
                ✓
              </span>
            </div>

            <div className="so-card-value">
              {money(paidAmount)}
            </div>

            <div className="so-card-meta">
              Payments received
            </div>
          </div>

          <div className="so-summary-card">
            <div className="so-card-top">
              <span>Outstanding</span>
              <span className="so-card-icon">
                ◷
              </span>
            </div>

            <div className="so-card-value">
              {money(balanceAmount)}
            </div>

            <div className="so-card-meta">
              Balance amount
            </div>
          </div>
        </div>

        <div className="so-summary-grid">
          <div className="so-summary-card">
            <div className="so-card-top">
              <span>Draft</span>
              <span className="so-card-icon">
                ✎
              </span>
            </div>

            <div className="so-card-value">
              {draftOrders}
            </div>

            <div className="so-card-meta">
              Waiting for confirmation
            </div>
          </div>

          <div className="so-summary-card">
            <div className="so-card-top">
              <span>Confirmed</span>
              <span className="so-card-icon">
                ✓
              </span>
            </div>

            <div className="so-card-value">
              {confirmedOrders}
            </div>

            <div className="so-card-meta">
              Confirmed orders
            </div>
          </div>

          <div className="so-summary-card">
            <div className="so-card-top">
              <span>Processing</span>
              <span className="so-card-icon">
                ⚡
              </span>
            </div>

            <div className="so-card-value">
              {processingOrders}
            </div>

            <div className="so-card-meta">
              Currently processing
            </div>
          </div>

          <div className="so-summary-card">
            <div className="so-card-top">
              <span>Delivered</span>
              <span className="so-card-icon">
                🚚
              </span>
            </div>

            <div className="so-card-value">
              {deliveredOrders}
            </div>

            <div className="so-card-meta">
              Successfully delivered
            </div>
          </div>
        </div>

        <div className="so-main-card">
          <div className="so-toolbar">
            <div className="so-search-wrap">
              <span className="so-search-icon">
                ⌕
              </span>

              <input
                className="so-input so-search-input"
                placeholder="Search order number, reference..."
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
              />
            </div>

            <select
              className="so-select so-filter"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setPage(1);
              }}
            >
              <option value="">
                All Statuses
              </option>

              {STATUS_OPTIONS.map((status) => (
                <option
                  value={status}
                  key={status}
                >
                  {titleCase(status)}
                </option>
              ))}
            </select>

            <select
              className="so-select so-filter"
              value={paymentFilter}
              onChange={(event) => {
                setPaymentFilter(event.target.value);
                setPage(1);
              }}
            >
              <option value="">
                All Payments
              </option>

              {PAYMENT_STATUS_OPTIONS.map(
                (status) => (
                  <option
                    value={status}
                    key={status}
                  >
                    {titleCase(status)}
                  </option>
                )
              )}
            </select>

            <button
              type="button"
              className="so-refresh"
              title="Refresh"
              onClick={() => {
                loadOrders();
                loadSummary();
              }}
            >
              ↻
            </button>
          </div>

          {loading ? (
            <div className="so-loading">
              <div className="so-spinner" />
            </div>
          ) : sortedOrders.length === 0 ? (
            <div className="so-empty">
              <div className="so-empty-icon">
                📦
              </div>

              <div className="so-empty-title">
                No Sales Orders Found
              </div>

              <div className="so-empty-text">
                Create your first sales order to start
                managing customer orders.
              </div>

              <button
                type="button"
                className="so-primary-button"
                style={{ marginTop: 18 }}
                onClick={openCreate}
              >
                + Create Sales Order
              </button>
            </div>
          ) : (
            <>
              <div className="so-table-wrap">
                <table className="so-table">
                  <thead>
                    <tr>
                      <th
                        className="so-sortable"
                        onClick={() =>
                          handleSort("orderNumber")
                        }
                      >
                        Order
                      </th>

                      <th
                        className="so-sortable"
                        onClick={() =>
                          handleSort("customer")
                        }
                      >
                        Customer
                      </th>

                      <th
                        className="so-sortable"
                        onClick={() =>
                          handleSort("orderDate")
                        }
                      >
                        Order Date
                      </th>

                      <th>
                        Delivery
                      </th>

                      <th>Status</th>

                      <th>Payment</th>

                      <th
                        className="so-sortable"
                        onClick={() =>
                          handleSort("grandTotal")
                        }
                      >
                        Amount
                      </th>

                      <th>
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {sortedOrders.map((order) => {
                      const deleted =
                        Boolean(order.deletedAt);

                      return (
                        <tr key={order._id}>
                          <td>
                            <div
                              className="so-order-number"
                              onClick={() =>
                                openView(order)
                              }
                            >
                              {order.orderNumber ||
                                "-"}
                            </div>

                            {order.referenceNumber && (
                              <div className="so-reference">
                                Ref:{" "}
                                {
                                  order.referenceNumber
                                }
                              </div>
                            )}
                          </td>

                          <td>
                            <div className="so-customer">
                              <div className="so-avatar">
                                {customerInitial(
                                  order
                                )}
                              </div>

                              <div className="so-customer-name">
                                {customerName(order)}
                              </div>
                            </div>
                          </td>

                          <td>
                            {formatDate(
                              order.orderDate
                            )}
                          </td>

                          <td>
                            {formatDate(
                              order.expectedDeliveryDate
                            )}
                          </td>

                          <td>
                            <span
                              className={getStatusClass(
                                order.status
                              )}
                            >
                              {titleCase(
                                order.status ||
                                  "draft"
                              )}
                            </span>
                          </td>

                          <td>
                            <span
                              className={getPaymentClass(
                                order.paymentStatus
                              )}
                            >
                              {titleCase(
                                order.paymentStatus ||
                                  "unpaid"
                              )}
                            </span>
                          </td>

                          <td>
                            <div className="so-amount">
                              {money(
                                order.grandTotal,
                                order.currency ||
                                  "INR"
                              )}
                            </div>
                          </td>

                          <td>
                            <div className="so-actions">
                              <button
                                type="button"
                                className="so-icon-button"
                                title="View"
                                disabled={
                                  actionLoading ===
                                  `view-${order._id}`
                                }
                                onClick={() =>
                                  openView(order)
                                }
                              >
                                👁
                              </button>

                              {!deleted && (
                                <>
                                  <button
                                    type="button"
                                    className="so-icon-button"
                                    title="Edit"
                                    onClick={() =>
                                      openEdit(
                                        order
                                      )
                                    }
                                  >
                                    ✎
                                  </button>

                                  <button
                                    type="button"
                                    className="so-icon-button"
                                    title="Duplicate"
                                    disabled={
                                      actionLoading ===
                                      `duplicate-${order._id}`
                                    }
                                    onClick={() =>
                                      handleDuplicate(
                                        order
                                      )
                                    }
                                  >
                                    ⧉
                                  </button>

                                  <button
                                    type="button"
                                    className="so-icon-button danger"
                                    title="Delete"
                                    onClick={() =>
                                      setDeleteTarget(
                                        order
                                      )
                                    }
                                  >
                                    🗑
                                  </button>
                                </>
                              )}

                              {deleted && (
                                <button
                                  type="button"
                                  className="so-action-button"
                                  disabled={
                                    actionLoading ===
                                    `restore-${order._id}`
                                  }
                                  onClick={() =>
                                    handleRestore(
                                      order
                                    )
                                  }
                                >
                                  ↺ Restore
                                </button>
                              )}
                            </div>

                            {!deleted &&
                              renderWorkflowActions(
                                order
                              )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="so-pagination">
                <div>
                  Showing{" "}
                  {sortedOrders.length} of{" "}
                  {pagination.total || sortedOrders.length}{" "}
                  sales orders
                </div>

                <div className="so-page-buttons">
                  <button
                    type="button"
                    className="so-page-button"
                    disabled={page <= 1}
                    onClick={() =>
                      setPage((previous) =>
                        Math.max(previous - 1, 1)
                      )
                    }
                  >
                    ←
                  </button>

                  <button
                    type="button"
                    className="so-page-button so-page-current"
                  >
                    {page}
                  </button>

                  <button
                    type="button"
                    className="so-page-button"
                    disabled={
                      page >=
                      (pagination.pages || 1)
                    }
                    onClick={() =>
                      setPage((previous) =>
                        Math.min(
                          previous + 1,
                          pagination.pages || 1
                        )
                      )
                    }
                  >
                    →
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {showForm && (
        <div className="so-overlay">
          <div className="so-modal large">
            <div className="so-modal-header">
              <div>
                <div className="so-modal-title">
                  {editingId
                    ? "Edit Sales Order"
                    : "Create Sales Order"}
                </div>

                <div className="so-modal-subtitle">
                  {editingId
                    ? "Update order details, items and payment information."
                    : "Create a professional customer sales order."}
                </div>
              </div>

              <button
                type="button"
                className="so-close"
                onClick={() =>
                  !saving && setShowForm(false)
                }
              >
                ×
              </button>
            </div>

            <div className="so-modal-body">
              <div className="so-tabs">
                <button
                  type="button"
                  className={`so-tab ${
                    activeTab === "details"
                      ? "active"
                      : ""
                  }`}
                  onClick={() =>
                    setActiveTab("details")
                  }
                >
                  Order Details
                </button>

                <button
                  type="button"
                  className={`so-tab ${
                    activeTab === "items"
                      ? "active"
                      : ""
                  }`}
                  onClick={() =>
                    setActiveTab("items")
                  }
                >
                  Items
                </button>

                <button
                  type="button"
                  className={`so-tab ${
                    activeTab === "payment"
                      ? "active"
                      : ""
                  }`}
                  onClick={() =>
                    setActiveTab("payment")
                  }
                >
                  Payment
                </button>

                <button
                  type="button"
                  className={`so-tab ${
                    activeTab === "notes"
                      ? "active"
                      : ""
                  }`}
                  onClick={() =>
                    setActiveTab("notes")
                  }
                >
                  Notes
                </button>
              </div>

              {activeTab === "details" && (
                <>
                  <div className="so-section">
                    <div className="so-section-title">
                      <h3>
                        Customer & Order
                      </h3>

                      <span>
                        Required information
                      </span>
                    </div>

                    <div className="so-form-grid">
                      <div className="so-field">
                        <label>
                          Customer{" "}
                          <span className="so-required">
                            *
                          </span>
                        </label>

                        <select
                          className="so-select"
                          value={form.customerId}
                          onChange={(event) =>
                            fillCustomerAddress(
                              event.target.value
                            )
                          }
                          disabled={
                            referenceLoading
                          }
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
                                {customer.name ||
                                  customer.displayName ||
                                  customer.companyName ||
                                  customer.customerName ||
                                  "Unnamed Customer"}
                              </option>
                            )
                          )}
                        </select>
                      </div>

                      <div className="so-field">
                        <label>
                          Branch
                        </label>

                        <select
                          className="so-select"
                          value={form.branchId}
                          onChange={(event) =>
                            updateForm(
                              "branchId",
                              event.target.value
                            )
                          }
                        >
                          <option value="">
                            Select branch
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
                                  "Unnamed Branch"}
                              </option>
                            )
                          )}
                        </select>
                      </div>

                      <div className="so-field">
                        <label>
                          Quotation
                        </label>

                        <select
                          className="so-select"
                          value={
                            form.quotationId
                          }
                          onChange={(event) =>
                            handleQuotationSelect(
                              event.target.value
                            )
                          }
                        >
                          <option value="">
                            No quotation
                          </option>

                          {quotations.map(
                            (quotation) => (
                              <option
                                key={
                                  quotation._id
                                }
                                value={
                                  quotation._id
                                }
                              >
                                {quotation.quotationNumber ||
                                  quotation.referenceNumber ||
                                  quotation._id}
                              </option>
                            )
                          )}
                        </select>
                      </div>

                      <div className="so-field">
                        <label>
                          Reference Number
                        </label>

                        <input
                          className="so-input"
                          value={
                            form.referenceNumber
                          }
                          onChange={(event) =>
                            updateForm(
                              "referenceNumber",
                              event.target.value
                            )
                          }
                          placeholder="SO-REF-2026-001"
                        />
                      </div>

                      <div className="so-field">
                        <label>
                          Order Date
                        </label>

                        <input
                          type="date"
                          className="so-input"
                          value={
                            form.orderDate
                          }
                          onChange={(event) =>
                            updateForm(
                              "orderDate",
                              event.target.value
                            )
                          }
                        />
                      </div>

                      <div className="so-field">
                        <label>
                          Expected Delivery
                        </label>

                        <input
                          type="date"
                          className="so-input"
                          value={
                            form.expectedDeliveryDate
                          }
                          onChange={(event) =>
                            updateForm(
                              "expectedDeliveryDate",
                              event.target.value
                            )
                          }
                        />
                      </div>

                      <div className="so-field">
                        <label>
                          Currency
                        </label>

                        <select
                          className="so-select"
                          value={form.currency}
                          onChange={(event) =>
                            updateForm(
                              "currency",
                              event.target.value
                            )
                          }
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
                      </div>
                    </div>
                  </div>

                  <div className="so-section">
                    <div className="so-section-title">
                      <h3>
                        Billing & Shipping
                      </h3>

                      <span>
                        Customer address
                      </span>
                    </div>

                    <div className="so-address-grid">
                      <div className="so-address-card">
                        <div className="so-address-title">
                          Billing Address
                        </div>

                        <div className="so-address-fields">
                          <input
                            className="so-input"
                            placeholder="Address line 1"
                            value={
                              form.billingAddress
                                .line1
                            }
                            onChange={(event) =>
                              updateAddress(
                                "billingAddress",
                                "line1",
                                event.target.value
                              )
                            }
                          />

                          <input
                            className="so-input"
                            placeholder="Address line 2"
                            value={
                              form.billingAddress
                                .line2
                            }
                            onChange={(event) =>
                              updateAddress(
                                "billingAddress",
                                "line2",
                                event.target.value
                              )
                            }
                          />

                          <input
                            className="so-input"
                            placeholder="City"
                            value={
                              form.billingAddress
                                .city
                            }
                            onChange={(event) =>
                              updateAddress(
                                "billingAddress",
                                "city",
                                event.target.value
                              )
                            }
                          />

                          <input
                            className="so-input"
                            placeholder="State"
                            value={
                              form.billingAddress
                                .state
                            }
                            onChange={(event) =>
                              updateAddress(
                                "billingAddress",
                                "state",
                                event.target.value
                              )
                            }
                          />

                          <div className="so-form-grid">
                            <input
                              className="so-input"
                              placeholder="Country"
                              value={
                                form
                                  .billingAddress
                                  .country
                              }
                              onChange={(
                                event
                              ) =>
                                updateAddress(
                                  "billingAddress",
                                  "country",
                                  event.target.value
                                )
                              }
                            />

                            <input
                              className="so-input"
                              placeholder="Postal Code"
                              value={
                                form
                                  .billingAddress
                                  .postalCode
                              }
                              onChange={(
                                event
                              ) =>
                                updateAddress(
                                  "billingAddress",
                                  "postalCode",
                                  event.target.value
                                )
                              }
                            />
                          </div>
                        </div>
                      </div>

                      <div className="so-address-card">
                        <div className="so-address-title">
                          Shipping Address
                        </div>

                        <div className="so-address-fields">
                          <input
                            className="so-input"
                            placeholder="Address line 1"
                            value={
                              form.shippingAddress
                                .line1
                            }
                            onChange={(event) =>
                              updateAddress(
                                "shippingAddress",
                                "line1",
                                event.target.value
                              )
                            }
                          />

                          <input
                            className="so-input"
                            placeholder="Address line 2"
                            value={
                              form.shippingAddress
                                .line2
                            }
                            onChange={(event) =>
                              updateAddress(
                                "shippingAddress",
                                "line2",
                                event.target.value
                              )
                            }
                          />

                          <input
                            className="so-input"
                            placeholder="City"
                            value={
                              form.shippingAddress
                                .city
                            }
                            onChange={(event) =>
                              updateAddress(
                                "shippingAddress",
                                "city",
                                event.target.value
                              )
                            }
                          />

                          <input
                            className="so-input"
                            placeholder="State"
                            value={
                              form.shippingAddress
                                .state
                            }
                            onChange={(event) =>
                              updateAddress(
                                "shippingAddress",
                                "state",
                                event.target.value
                              )
                            }
                          />

                          <div className="so-form-grid">
                            <input
                              className="so-input"
                              placeholder="Country"
                              value={
                                form
                                  .shippingAddress
                                  .country
                              }
                              onChange={(
                                event
                              ) =>
                                updateAddress(
                                  "shippingAddress",
                                  "country",
                                  event.target.value
                                )
                              }
                            />

                            <input
                              className="so-input"
                              placeholder="Postal Code"
                              value={
                                form
                                  .shippingAddress
                                  .postalCode
                              }
                              onChange={(
                                event
                              ) =>
                                updateAddress(
                                  "shippingAddress",
                                  "postalCode",
                                  event.target.value
                                )
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {activeTab === "items" && (
                <div className="so-section">
                  <div className="so-section-title">
                    <h3>
                      Order Items
                    </h3>

                    <span>
                      {form.items.length} item
                      {form.items.length !== 1
                        ? "s"
                        : ""}
                    </span>
                  </div>

                  <div className="so-item-table-wrap">
                    <table className="so-item-table">
                      <thead>
                        <tr>
                          <th>
                            Product
                          </th>
                          <th>
                            Description
                          </th>
                          <th>
                            Qty
                          </th>
                          <th>
                            Unit
                          </th>
                          <th>
                            Unit Price
                          </th>
                          <th>
                            Discount %
                          </th>
                          <th>
                            GST %
                          </th>
                          <th>
                            Line Total
                          </th>
                          <th />
                        </tr>
                      </thead>

                      <tbody>
                        {form.items.map(
                          (item, index) => (
                            <tr
                              key={`${index}-${item.productId}`}
                            >
                              <td>
                                <select
                                  className="so-select so-product-select"
                                  value={
                                    item.productId
                                  }
                                  onChange={(
                                    event
                                  ) =>
                                    updateItem(
                                      index,
                                      "productId",
                                      event.target.value
                                    )
                                  }
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
                                          product.productName ||
                                          product.sku ||
                                          "Unnamed Product"}
                                      </option>
                                    )
                                  )}
                                </select>

                                {item.sku && (
                                  <div className="so-reference">
                                    {item.sku}
                                  </div>
                                )}
                              </td>

                              <td>
                                <input
                                  className="so-input so-item-input"
                                  value={
                                    item.description
                                  }
                                  onChange={(
                                    event
                                  ) =>
                                    updateItem(
                                      index,
                                      "description",
                                      event.target.value
                                    )
                                  }
                                  placeholder="Description"
                                />
                              </td>

                              <td>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  className="so-input so-item-input"
                                  value={
                                    item.quantity
                                  }
                                  onChange={(
                                    event
                                  ) =>
                                    updateItem(
                                      index,
                                      "quantity",
                                      event.target.value
                                    )
                                  }
                                />
                              </td>

                              <td>
                                <input
                                  className="so-input so-item-input"
                                  value={
                                    item.unit
                                  }
                                  onChange={(
                                    event
                                  ) =>
                                    updateItem(
                                      index,
                                      "unit",
                                      event.target.value
                                    )
                                  }
                                />
                              </td>

                              <td>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  className="so-input so-item-input"
                                  value={
                                    item.unitPrice
                                  }
                                  onChange={(
                                    event
                                  ) =>
                                    updateItem(
                                      index,
                                      "unitPrice",
                                      event.target.value
                                    )
                                  }
                                />
                              </td>

                              <td>
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.01"
                                  className="so-input so-item-input"
                                  value={
                                    item.discountPercent
                                  }
                                  onChange={(
                                    event
                                  ) =>
                                    updateItem(
                                      index,
                                      "discountPercent",
                                      event.target.value
                                    )
                                  }
                                />
                              </td>

                              <td>
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.01"
                                  className="so-input so-item-input"
                                  value={
                                    item.taxPercent
                                  }
                                  onChange={(
                                    event
                                  ) =>
                                    updateItem(
                                      index,
                                      "taxPercent",
                                      event.target.value
                                    )
                                  }
                                />
                              </td>

                              <td>
                                <strong
                                  style={{
                                    color:
                                      "#e8ebf2",
                                    whiteSpace:
                                      "nowrap",
                                    fontSize:
                                      "12px",
                                  }}
                                >
                                  {money(
                                    (() => {
                                      const quantity =
                                        numberValue(
                                          item.quantity
                                        );

                                      const price =
                                        numberValue(
                                          item.unitPrice
                                        );

                                      const discount =
                                        (quantity *
                                          price *
                                          numberValue(
                                            item.discountPercent
                                          )) /
                                        100;

                                      const taxable =
                                        Math.max(
                                          quantity *
                                            price -
                                            discount,
                                          0
                                        );

                                      const tax =
                                        (taxable *
                                          numberValue(
                                            item.taxPercent
                                          )) /
                                        100;

                                      return (
                                        taxable +
                                        tax
                                      );
                                    })(),
                                    form.currency
                                  )}
                                </strong>
                              </td>

                              <td>
                                <div
                                  style={{
                                    display:
                                      "flex",
                                    gap: "5px",
                                  }}
                                >
                                  <button
                                    type="button"
                                    className="so-duplicate-item"
                                    title="Duplicate item"
                                    onClick={() =>
                                      duplicateItem(
                                        index
                                      )
                                    }
                                  >
                                    ⧉
                                  </button>

                                  <button
                                    type="button"
                                    className="so-remove-item"
                                    title="Remove item"
                                    onClick={() =>
                                      removeItem(
                                        index
                                      )
                                    }
                                  >
                                    ×
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>

                  <button
                    type="button"
                    className="so-add-item"
                    onClick={addItem}
                  >
                    + Add Product
                  </button>

                  <div
                    className="so-total-layout"
                    style={{
                      marginTop: 18,
                    }}
                  >
                    <div className="so-note-card">
                      <div className="so-section-title">
                        <h3>
                          Additional Charges
                        </h3>
                      </div>

                      <div className="so-form-grid">
                        <div className="so-field">
                          <label>
                            Shipping Amount
                          </label>

                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="so-input"
                            value={
                              form.shippingAmount
                            }
                            onChange={(event) =>
                              updateForm(
                                "shippingAmount",
                                event.target.value
                              )
                            }
                          />
                        </div>

                        <div className="so-field">
                          <label>
                            Other Charges
                          </label>

                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="so-input"
                            value={
                              form.otherCharges
                            }
                            onChange={(event) =>
                              updateForm(
                                "otherCharges",
                                event.target.value
                              )
                            }
                          />
                        </div>

                        <div className="so-field">
                          <label>
                            Adjustment
                          </label>

                          <input
                            type="number"
                            step="0.01"
                            className="so-input"
                            value={
                              form.adjustmentAmount
                            }
                            onChange={(event) =>
                              updateForm(
                                "adjustmentAmount",
                                event.target.value
                              )
                            }
                          />
                        </div>
                      </div>
                    </div>

                    <div className="so-totals-card">
                      <div className="so-total-row">
                        <span>
                          Subtotal
                        </span>

                        <strong>
                          {money(
                            calculatedTotals.subtotal,
                            form.currency
                          )}
                        </strong>
                      </div>

                      <div className="so-total-row">
                        <span>
                          Discount
                        </span>

                        <strong>
                          -
                          {money(
                            calculatedTotals.discountAmount,
                            form.currency
                          )}
                        </strong>
                      </div>

                      <div className="so-total-row">
                        <span>
                          Taxable Amount
                        </span>

                        <strong>
                          {money(
                            calculatedTotals.taxableAmount,
                            form.currency
                          )}
                        </strong>
                      </div>

                      <div className="so-total-row">
                        <span>
                          GST / Tax
                        </span>

                        <strong>
                          {money(
                            calculatedTotals.taxAmount,
                            form.currency
                          )}
                        </strong>
                      </div>

                      <div className="so-total-row">
                        <span>
                          Shipping
                        </span>

                        <strong>
                          {money(
                            calculatedTotals.shippingAmount,
                            form.currency
                          )}
                        </strong>
                      </div>

                      <div className="so-total-row">
                        <span>
                          Other Charges
                        </span>

                        <strong>
                          {money(
                            calculatedTotals.otherCharges,
                            form.currency
                          )}
                        </strong>
                      </div>

                      <div className="so-total-row grand">
                        <span>
                          Grand Total
                        </span>

                        <strong>
                          {money(
                            calculatedTotals.grandTotal,
                            form.currency
                          )}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "payment" && (
                <>
                  <div className="so-section">
                    <div className="so-section-title">
                      <h3>
                        Payment Information
                      </h3>

                      <span>
                        Payment tracking
                      </span>
                    </div>

                    <div className="so-form-grid">
                      <div className="so-field">
                        <label>
                          Paid Amount
                        </label>

                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="so-input"
                          value={
                            form.paidAmount
                          }
                          onChange={(event) =>
                            updateForm(
                              "paidAmount",
                              event.target.value
                            )
                          }
                        />
                      </div>

                      <div className="so-field">
                        <label>
                          Payment Method
                        </label>

                        <select
                          className="so-select"
                          value={
                            form.paymentMethod
                          }
                          onChange={(event) =>
                            updateForm(
                              "paymentMethod",
                              event.target.value
                            )
                          }
                        >
                          <option value="">
                            Select method
                          </option>

                          {PAYMENT_METHODS.map(
                            (method) => (
                              <option
                                key={method}
                                value={method}
                              >
                                {titleCase(
                                  method
                                )}
                              </option>
                            )
                          )}
                        </select>
                      </div>

                      <div className="so-field">
                        <label>
                          Calculated Payment Status
                        </label>

                        <div
                          style={{
                            minHeight: 42,
                            display: "flex",
                            alignItems:
                              "center",
                          }}
                        >
                          <span
                            className={getPaymentClass(
                              calculatedTotals.paymentStatus
                            )}
                          >
                            {titleCase(
                              calculatedTotals.paymentStatus
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="so-total-layout">
                    <div className="so-note-card">
                      <div className="so-section-title">
                        <h3>
                          Payment Summary
                        </h3>
                      </div>

                      <p
                        style={{
                          color: "#737d90",
                          fontSize: 12,
                          lineHeight: 1.7,
                          margin: 0,
                        }}
                      >
                        Payment status is calculated
                        automatically from the paid
                        amount and grand total.
                      </p>
                    </div>

                    <div className="so-totals-card">
                      <div className="so-total-row">
                        <span>
                          Grand Total
                        </span>

                        <strong>
                          {money(
                            calculatedTotals.grandTotal,
                            form.currency
                          )}
                        </strong>
                      </div>

                      <div className="so-total-row">
                        <span>
                          Paid
                        </span>

                        <strong>
                          {money(
                            calculatedTotals.paidAmount,
                            form.currency
                          )}
                        </strong>
                      </div>

                      <div className="so-total-row grand">
                        <span>
                          Balance
                        </span>

                        <strong className="so-balance">
                          {money(
                            calculatedTotals.balanceAmount,
                            form.currency
                          )}
                        </strong>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {activeTab === "notes" && (
                <div className="so-section">
                  <div className="so-form-grid">
                    <div className="so-field full">
                      <label>
                        Internal Notes
                      </label>

                      <textarea
                        className="so-textarea"
                        value={form.notes}
                        onChange={(event) =>
                          updateForm(
                            "notes",
                            event.target.value
                          )
                        }
                        placeholder="Add internal notes..."
                      />
                    </div>

                    <div className="so-field full">
                      <label>
                        Terms & Conditions
                      </label>

                      <textarea
                        className="so-textarea"
                        value={
                          form.termsAndConditions
                        }
                        onChange={(event) =>
                          updateForm(
                            "termsAndConditions",
                            event.target.value
                          )
                        }
                        placeholder="Payment terms, delivery terms, warranty, etc..."
                      />
                    </div>

                    <div className="so-field full">
                      <label>
                        Customer Notes
                      </label>

                      <textarea
                        className="so-textarea"
                        value={
                          form.customerNotes
                        }
                        onChange={(event) =>
                          updateForm(
                            "customerNotes",
                            event.target.value
                          )
                        }
                        placeholder="Notes visible to the customer..."
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="so-modal-footer">
              <button
                type="button"
                className="so-secondary-button"
                disabled={saving}
                onClick={() =>
                  setShowForm(false)
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className="so-primary-button"
                disabled={saving}
                onClick={saveOrder}
              >
                {saving
                  ? "Saving..."
                  : editingId
                  ? "Update Sales Order"
                  : "Create Sales Order"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showView && viewingOrder && (
        <div className="so-overlay">
          <div className="so-modal large">
            <div className="so-modal-header">
              <div>
                <div className="so-modal-title">
                  {viewingOrder.orderNumber ||
                    "Sales Order"}
                </div>

                <div className="so-modal-subtitle">
                  {customerName(
                    viewingOrder
                  )}{" "}
                  •{" "}
                  {formatDate(
                    viewingOrder.orderDate
                  )}
                </div>
              </div>

              <button
                type="button"
                className="so-close"
                onClick={() => {
                  setShowView(false);
                  setViewingOrder(null);
                }}
              >
                ×
              </button>
            </div>

            <div className="so-modal-body">
              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 16,
                  flexWrap: "wrap",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    gap: 7,
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    className={getStatusClass(
                      viewingOrder.status
                    )}
                  >
                    {titleCase(
                      viewingOrder.status ||
                        "draft"
                    )}
                  </span>

                  <span
                    className={getPaymentClass(
                      viewingOrder.paymentStatus
                    )}
                  >
                    {titleCase(
                      viewingOrder.paymentStatus ||
                        "unpaid"
                    )}
                  </span>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 7,
                  }}
                >
                  {viewingOrder.status ===
                    "draft" &&
                    renderActionButton(
                      "Confirm",
                      "✓",
                      () =>
                        performAction(
                          viewingOrder,
                          "confirm",
                          "Sales Order confirmed successfully."
                        ),
                      Boolean(
                        actionLoading
                      )
                    )}

                  {viewingOrder.status ===
                    "confirmed" &&
                    renderActionButton(
                      "Process",
                      "⚡",
                      () =>
                        performAction(
                          viewingOrder,
                          "process",
                          "Sales Order moved to processing."
                        ),
                      Boolean(
                        actionLoading
                      )
                    )}

                  {viewingOrder.status ===
                    "processing" &&
                    renderActionButton(
                      "Deliver",
                      "🚚",
                      () =>
                        performAction(
                          viewingOrder,
                          "deliver",
                          "Sales Order marked as delivered."
                        ),
                      Boolean(
                        actionLoading
                      )
                    )}

                  {viewingOrder.status ===
                    "delivered" &&
                    renderActionButton(
                      "Close",
                      "✓",
                      () =>
                        performAction(
                          viewingOrder,
                          "close",
                          "Sales Order closed successfully."
                        ),
                      Boolean(
                        actionLoading
                      )
                    )}
                </div>
              </div>

              <div className="so-view-grid">
                <div className="so-view-stat">
                  <div className="so-view-label">
                    Customer
                  </div>

                  <div className="so-view-value">
                    {customerName(
                      viewingOrder
                    )}
                  </div>
                </div>

                <div className="so-view-stat">
                  <div className="so-view-label">
                    Reference
                  </div>

                  <div className="so-view-value">
                    {viewingOrder.referenceNumber ||
                      "-"}
                  </div>
                </div>

                <div className="so-view-stat">
                  <div className="so-view-label">
                    Order Date
                  </div>

                  <div className="so-view-value">
                    {formatDate(
                      viewingOrder.orderDate
                    )}
                  </div>
                </div>

                <div className="so-view-stat">
                  <div className="so-view-label">
                    Delivery Date
                  </div>

                  <div className="so-view-value">
                    {formatDate(
                      viewingOrder.expectedDeliveryDate
                    )}
                  </div>
                </div>

                <div className="so-view-stat">
                  <div className="so-view-label">
                    Subtotal
                  </div>

                  <div className="so-view-value">
                    {money(
                      viewingOrder.subtotal,
                      viewingOrder.currency ||
                        "INR"
                    )}
                  </div>
                </div>

                <div className="so-view-stat">
                  <div className="so-view-label">
                    Tax
                  </div>

                  <div className="so-view-value">
                    {money(
                      viewingOrder.taxAmount,
                      viewingOrder.currency ||
                        "INR"
                    )}
                  </div>
                </div>

                <div className="so-view-stat">
                  <div className="so-view-label">
                    Paid
                  </div>

                  <div className="so-view-value">
                    {money(
                      viewingOrder.paidAmount,
                      viewingOrder.currency ||
                        "INR"
                    )}
                  </div>
                </div>

                <div className="so-view-stat">
                  <div className="so-view-label">
                    Balance
                  </div>

                  <div className="so-view-value">
                    {money(
                      viewingOrder.balanceAmount,
                      viewingOrder.currency ||
                        "INR"
                    )}
                  </div>
                </div>
              </div>

              <div className="so-view-items">
                <table>
                  <thead>
                    <tr>
                      <th>
                        Product
                      </th>
                      <th>
                        Qty
                      </th>
                      <th>
                        Unit Price
                      </th>
                      <th>
                        Discount
                      </th>
                      <th>
                        Tax
                      </th>
                      <th>
                        Total
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {(viewingOrder.items ||
                      []).map(
                        (item, index) => (
                          <tr
                            key={
                              item._id ||
                              `${item.productId}-${index}`
                            }
                          >
                            <td>
                              <div
                                style={{
                                  color:
                                    "#e7ebf2",
                                  fontWeight:
                                    700,
                                }}
                              >
                                {item.productName ||
                                  item.productId?.name ||
                                  "Product"}
                              </div>

                              {(item.sku ||
                                item.productCode) && (
                                <div className="so-reference">
                                  {item.sku ||
                                    item.productCode}
                                </div>
                              )}
                            </td>

                            <td>
                              {item.quantity}{" "}
                              {item.unit ||
                                "PCS"}
                            </td>

                            <td>
                              {money(
                                item.unitPrice,
                                viewingOrder.currency ||
                                  "INR"
                              )}
                            </td>

                            <td>
                              {numberValue(
                                item.discountPercent
                              )}
                              %
                            </td>

                            <td>
                              {numberValue(
                                item.taxPercent
                              )}
                              %
                            </td>

                            <td>
                              <strong>
                                {money(
                                  item.lineTotal,
                                  viewingOrder.currency ||
                                    "INR"
                                )}
                              </strong>
                            </td>
                          </tr>
                        )
                      )}
                  </tbody>
                </table>
              </div>

              <div className="so-view-bottom">
                <div className="so-view-notes">
                  <h4>
                    Notes
                  </h4>

                  <p>
                    {viewingOrder.notes ||
                      "No internal notes."}
                  </p>

                  <h4>
                    Terms & Conditions
                  </h4>

                  <p>
                    {viewingOrder.termsAndConditions ||
                      "No terms and conditions added."}
                  </p>

                  <h4>
                    Customer Notes
                  </h4>

                  <p>
                    {viewingOrder.customerNotes ||
                      "No customer notes."}
                  </p>
                </div>

                <div className="so-totals-card">
                  <div className="so-total-row">
                    <span>
                      Subtotal
                    </span>

                    <strong>
                      {money(
                        viewingOrder.subtotal,
                        viewingOrder.currency ||
                          "INR"
                      )}
                    </strong>
                  </div>

                  <div className="so-total-row">
                    <span>
                      Discount
                    </span>

                    <strong>
                      -
                      {money(
                        viewingOrder.discountAmount,
                        viewingOrder.currency ||
                          "INR"
                      )}
                    </strong>
                  </div>

                  <div className="so-total-row">
                    <span>
                      Tax
                    </span>

                    <strong>
                      {money(
                        viewingOrder.taxAmount,
                        viewingOrder.currency ||
                          "INR"
                      )}
                    </strong>
                  </div>

                  <div className="so-total-row">
                    <span>
                      Shipping
                    </span>

                    <strong>
                      {money(
                        viewingOrder.shippingAmount,
                        viewingOrder.currency ||
                          "INR"
                      )}
                    </strong>
                  </div>

                  <div className="so-total-row grand">
                    <span>
                      Grand Total
                    </span>

                    <strong>
                      {money(
                        viewingOrder.grandTotal,
                        viewingOrder.currency ||
                          "INR"
                      )}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="so-modal-footer">
              <button
                type="button"
                className="so-secondary-button"
                onClick={() =>
                  handleDuplicate(
                    viewingOrder
                  )
                }
              >
                ⧉ Duplicate
              </button>

              {viewingOrder.status ===
                "draft" && (
                <button
                  type="button"
                  className="so-secondary-button"
                  onClick={() =>
                    openEdit(
                      viewingOrder
                    )
                  }
                >
                  ✎ Edit
                </button>
              )}

              <button
                type="button"
                className="so-primary-button"
                onClick={() => {
                  setShowView(false);
                  setViewingOrder(null);
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="so-overlay">
          <div className="so-modal so-delete-modal">
            <div className="so-delete-content">
              <div className="so-delete-icon">
                🗑
              </div>

              <div className="so-delete-title">
                Delete Sales Order?
              </div>

              <p className="so-delete-text">
                Are you sure you want to delete{" "}
                <strong>
                  {deleteTarget.orderNumber}
                </strong>
                ? The order will be soft deleted
                and can be restored later.
              </p>
            </div>

            <div className="so-delete-actions">
              <button
                type="button"
                className="so-secondary-button"
                onClick={() =>
                  setDeleteTarget(null)
                }
                disabled={Boolean(
                  actionLoading
                )}
              >
                Keep Order
              </button>

              <button
                type="button"
                className="so-danger-button"
                onClick={handleDelete}
                disabled={Boolean(
                  actionLoading
                )}
              >
                {actionLoading
                  ? "Deleting..."
                  : "Delete Order"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}