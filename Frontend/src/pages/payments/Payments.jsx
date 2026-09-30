import React, { useEffect, useMemo, useState } from "react";
import api from "../../services/api";

const initialForm = {
  branchId: "",
  customerId: "",
  invoiceId: "",
  paymentDate: new Date().toISOString().split("T")[0],
  amount: "",
  paymentMethod: "cash",
  referenceNumber: "",
  notes: "",
  status: "completed",
};

const paymentMethods = [
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "upi", label: "UPI" },
  { value: "card", label: "Card" },
  { value: "cheque", label: "Cheque" },
  { value: "other", label: "Other" },
];

const statusOptions = [
  "pending",
  "completed",
  "cancelled",
  "refunded",
];

const formatCurrency = (value) => {
  const number = Number(value || 0);

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(number);
};

const formatDate = (value) => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getStatusClass = (status) => {
  switch (status) {
    case "completed":
      return "payment-status completed";
    case "pending":
      return "payment-status pending";
    case "cancelled":
      return "payment-status cancelled";
    case "refunded":
      return "payment-status refunded";
    default:
      return "payment-status";
  }
};

const getMethodIcon = (method) => {
  switch (method) {
    case "cash":
      return "💵";
    case "bank_transfer":
      return "🏦";
    case "upi":
      return "📱";
    case "card":
      return "💳";
    case "cheque":
      return "🧾";
    default:
      return "💰";
  }
};

const getErrorMessage = (error) => {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    "Something went wrong"
  );
};

const extractList = (response) => {
  const data = response?.data?.data;

  if (Array.isArray(data)) return data;

  if (Array.isArray(data?.payments)) return data.payments;

  if (Array.isArray(response?.data?.payments)) {
    return response.data.payments;
  }

  return [];
};

const extractPagination = (response) => {
  const data = response?.data?.data;

  const pagination =
    data?.pagination ||
    response?.data?.pagination ||
    {};

  return {
    page: Number(pagination.page || 1),
    pages: Number(
      pagination.pages ||
        pagination.totalPages ||
        1
    ),
    total: Number(
      pagination.total ||
        pagination.totalItems ||
        0
    ),
  };
};

const extractSummary = (response) => {
  const data = response?.data?.data || response?.data || {};

  return {
    total: Number(data.total || data.totalPayments || 0),
    totalAmount: Number(
      data.totalAmount ||
        data.amount ||
        0
    ),
    completed: Number(
      data.completed ||
        data.completedCount ||
        0
    ),
    pending: Number(
      data.pending ||
        data.pendingCount ||
        0
    ),
    cancelled: Number(
      data.cancelled ||
        data.cancelledCount ||
        0
    ),
    refunded: Number(
      data.refunded ||
        data.refundedCount ||
        0
    ),
    today: Number(
      data.today ||
        data.todayAmount ||
        0
    ),
    month: Number(
      data.month ||
        data.monthAmount ||
        0
    ),
  };
};

export default function Payment() {
  const [payments, setPayments] = useState([]);
  const [branches, setBranches] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [invoices, setInvoices] = useState([]);

  const [summary, setSummary] = useState({
    total: 0,
    totalAmount: 0,
    completed: 0,
    pending: 0,
    cancelled: 0,
    refunded: 0,
    today: 0,
    month: 0,
  });

  const [pagination, setPagination] = useState({
    page: 1,
    pages: 1,
    total: 0,
  });

  const [filters, setFilters] = useState({
    search: "",
    status: "",
    paymentMethod: "",
    customerId: "",
    invoiceId: "",
    dateFrom: "",
    dateTo: "",
  });

  const [form, setForm] = useState(initialForm);

  const [editingPayment, setEditingPayment] = useState(null);
  const [viewingPayment, setViewingPayment] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [deleteModal, setDeleteModal] = useState(false);
  const [cancelModal, setCancelModal] = useState(false);
  const [refundModal, setRefundModal] = useState(false);

  const [actionReason, setActionReason] = useState("");

  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  const [showFilters, setShowFilters] = useState(false);

  const selectedInvoice = useMemo(() => {
    if (!form.invoiceId) return null;

    return (
      invoices.find(
        (invoice) =>
          String(invoice._id) ===
          String(form.invoiceId)
      ) || null
    );
  }, [form.invoiceId, invoices]);

  const fetchPayments = async (
    targetPage = page
  ) => {
    try {
      setLoading(true);
      setError("");

      const params = {
        page: targetPage,
        limit,
      };

      Object.entries(filters).forEach(
        ([key, value]) => {
          if (value) {
            params[key] = value;
          }
        }
      );

      const response = await api.get(
        "/payments",
        { params }
      );

      setPayments(
        extractList(response)
      );

      setPagination(
        extractPagination(response)
      );

      setPage(targetPage);
    } catch (err) {
      setError(
        getErrorMessage(err)
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await api.get(
        "/payments/summary"
      );

      setSummary(
        extractSummary(response)
      );
    } catch (err) {
      console.error(
        "Payment summary error:",
        err
      );
    }
  };

  const fetchMasterData = async () => {
    try {
      const [
        branchResponse,
        customerResponse,
        invoiceResponse,
      ] = await Promise.allSettled([
        api.get("/branches", {
          params: {
            status: "active",
            limit: 100,
          },
        }),
        api.get("/customers", {
          params: {
            status: "active",
            limit: 100,
          },
        }),
        api.get("/invoices", {
          params: {
            limit: 100,
          },
        }),
      ]);

      if (
        branchResponse.status ===
        "fulfilled"
      ) {
        setBranches(
          extractList(
            branchResponse.value
          )
        );
      }

      if (
        customerResponse.status ===
        "fulfilled"
      ) {
        setCustomers(
          extractList(
            customerResponse.value
          )
        );
      }

      if (
        invoiceResponse.status ===
        "fulfilled"
      ) {
        setInvoices(
          extractList(
            invoiceResponse.value
          )
        );
      }
    } catch (err) {
      console.error(
        "Master data error:",
        err
      );
    }
  };

  const refreshAll = async () => {
    await Promise.all([
      fetchPayments(page),
      fetchSummary(),
    ]);
  };

  useEffect(() => {
    fetchPayments(1);
  }, [
    filters.search,
    filters.status,
    filters.paymentMethod,
    filters.customerId,
    filters.invoiceId,
    filters.dateFrom,
    filters.dateTo,
  ]);

  useEffect(() => {
    fetchSummary();
    fetchMasterData();
  }, []);

  const clearMessages = () => {
    setError("");
    setSuccess("");
  };

  const handleFilterChange = (
    field,
    value
  ) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const resetFilters = () => {
    setFilters({
      search: "",
      status: "",
      paymentMethod: "",
      customerId: "",
      invoiceId: "",
      dateFrom: "",
      dateTo: "",
    });
  };

  const openCreate = () => {
    clearMessages();

    setEditingPayment(null);

    setForm({
      ...initialForm,
      paymentDate:
        new Date()
          .toISOString()
          .split("T")[0],
      status: "completed",
    });

    setShowForm(true);
  };

  const openEdit = (payment) => {
    clearMessages();

    if (payment.status !== "pending") {
      setError(
        "Only pending payments can be edited."
      );
      return;
    }

    setEditingPayment(payment);

    setForm({
      branchId:
        payment.branchId?._id ||
        payment.branchId ||
        "",
      customerId:
        payment.customerId?._id ||
        payment.customerId ||
        "",
      invoiceId:
        payment.invoiceId?._id ||
        payment.invoiceId ||
        "",
      paymentDate: payment.paymentDate
        ? new Date(payment.paymentDate)
            .toISOString()
            .split("T")[0]
        : "",
      amount:
        payment.amount ?? "",
      paymentMethod:
        payment.paymentMethod ||
        "cash",
      referenceNumber:
        payment.referenceNumber ||
        "",
      notes: payment.notes || "",
      status: payment.status || "pending",
    });

    setShowForm(true);
  };

  const closeForm = () => {
    if (formLoading) return;

    setShowForm(false);
    setEditingPayment(null);
    setForm(initialForm);
  };

  const handleFormChange = (
    field,
    value
  ) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleInvoiceChange = (
    invoiceId
  ) => {
    const invoice = invoices.find(
      (item) =>
        String(item._id) ===
        String(invoiceId)
    );

    setForm((prev) => ({
      ...prev,
      invoiceId,
      customerId:
        invoice?.customerId?._id ||
        invoice?.customerId ||
        prev.customerId,
      branchId:
        invoice?.branchId?._id ||
        invoice?.branchId ||
        prev.branchId,
    }));
  };

  const validateForm = () => {
    if (!form.customerId) {
      return "Please select a customer.";
    }

    if (!form.invoiceId) {
      return "Please select an invoice.";
    }

    if (!form.paymentDate) {
      return "Payment date is required.";
    }

    const amount = Number(form.amount);

    if (!amount || amount <= 0) {
      return "Payment amount must be greater than 0.";
    }

    if (!form.paymentMethod) {
      return "Please select a payment method.";
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

      const payload = {
        branchId:
          form.branchId || undefined,
        customerId:
          form.customerId,
        invoiceId:
          form.invoiceId,
        paymentDate:
          form.paymentDate,
        amount:
          Number(form.amount),
        paymentMethod:
          form.paymentMethod,
        referenceNumber:
          form.referenceNumber.trim(),
        notes:
          form.notes.trim(),
      };

      if (!editingPayment) {
        payload.status =
          form.status || "completed";
      }

      if (editingPayment) {
        await api.put(
          `/payments/${editingPayment._id}`,
          payload
        );

        setSuccess(
          "Pending payment updated successfully."
        );
      } else {
        await api.post(
          "/payments",
          payload
        );

        setSuccess(
          "Payment created successfully."
        );
      }

      closeForm();

      await Promise.all([
        fetchPayments(page),
        fetchSummary(),
        fetchMasterData(),
      ]);
    } catch (err) {
      setError(
        getErrorMessage(err)
      );
    } finally {
      setFormLoading(false);
    }
  };

  const openDetails = async (
    payment
  ) => {
    try {
      setActionLoading(true);
      clearMessages();

      const response =
        await api.get(
          `/payments/${payment._id}`
        );

      setViewingPayment(
        response?.data?.data ||
          response?.data ||
          payment
      );

      setShowDetails(true);
    } catch (err) {
      setError(
        getErrorMessage(err)
      );
    } finally {
      setActionLoading(false);
    }
  };

  const closeDetails = () => {
    setShowDetails(false);
    setViewingPayment(null);
  };

  const openDelete = (payment) => {
    clearMessages();
    setSelectedPayment(payment);
    setDeleteModal(true);
  };

  const openCancel = (payment) => {
    clearMessages();
    setSelectedPayment(payment);
    setActionReason("");
    setCancelModal(true);
  };

  const openRefund = (payment) => {
    clearMessages();
    setSelectedPayment(payment);
    setActionReason("");
    setRefundModal(true);
  };

  const handleDelete = async () => {
    if (!selectedPayment) return;

    try {
      setActionLoading(true);
      clearMessages();

      await api.delete(
        `/payments/${selectedPayment._id}`
      );

      setSuccess(
        "Payment deleted successfully."
      );

      setDeleteModal(false);
      setSelectedPayment(null);

      await Promise.all([
        fetchPayments(page),
        fetchSummary(),
      ]);
    } catch (err) {
      setError(
        getErrorMessage(err)
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!selectedPayment) return;

    try {
      setActionLoading(true);
      clearMessages();

      await api.post(
        `/payments/${selectedPayment._id}/cancel`,
        {
          reason:
            actionReason.trim() ||
            "Payment cancelled",
        }
      );

      setSuccess(
        "Payment cancelled successfully."
      );

      setCancelModal(false);
      setSelectedPayment(null);
      setActionReason("");

      await Promise.all([
        fetchPayments(page),
        fetchSummary(),
      ]);
    } catch (err) {
      setError(
        getErrorMessage(err)
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleRefund = async () => {
    if (!selectedPayment) return;

    try {
      setActionLoading(true);
      clearMessages();

      await api.post(
        `/payments/${selectedPayment._id}/refund`,
        {
          reason:
            actionReason.trim() ||
            "Payment refunded",
        }
      );

      setSuccess(
        "Payment refunded successfully."
      );

      setRefundModal(false);
      setSelectedPayment(null);
      setActionReason("");

      await Promise.all([
        fetchPayments(page),
        fetchSummary(),
      ]);
    } catch (err) {
      setError(
        getErrorMessage(err)
      );
    } finally {
      setActionLoading(false);
    }
  };

  const getCustomerName = (
    customer
  ) => {
    if (!customer) return "Unknown customer";

    if (typeof customer === "string") {
      const found = customers.find(
        (item) =>
          String(item._id) ===
          String(customer)
      );

      return (
        found?.name ||
        found?.displayName ||
        found?.companyName ||
        "Unknown customer"
      );
    }

    return (
      customer.name ||
      customer.displayName ||
      customer.companyName ||
      "Unknown customer"
    );
  };

  const getInvoiceNumber = (
    invoice
  ) => {
    if (!invoice) return "-";

    if (typeof invoice === "string") {
      const found = invoices.find(
        (item) =>
          String(item._id) ===
          String(invoice)
      );

      return (
        found?.invoiceNumber ||
        invoice
      );
    }

    return (
      invoice.invoiceNumber ||
      invoice.number ||
      "-"
    );
  };

  const getBranchName = (
    branch
  ) => {
    if (!branch) return "-";

    if (typeof branch === "string") {
      const found = branches.find(
        (item) =>
          String(item._id) ===
          String(branch)
      );

      return (
        found?.name ||
        found?.branchName ||
        branch
      );
    }

    return (
      branch.name ||
      branch.branchName ||
      "-"
    );
  };

  const getInvoiceBalance = () => {
    if (!selectedInvoice) return null;

    const balance =
      selectedInvoice.balanceAmount;

    if (
      balance === undefined ||
      balance === null
    ) {
      return null;
    }

    return Number(balance);
  };

  const renderPaymentRow = (
    payment
  ) => {
    const customer =
      payment.customerId;

    const invoice =
      payment.invoiceId;

    return (
      <tr key={payment._id}>
        <td>
          <div className="payment-number">
            <span className="payment-icon">
              {getMethodIcon(
                payment.paymentMethod
              )}
            </span>

            <div>
              <strong>
                {payment.paymentNumber ||
                  "-"}
              </strong>

              {payment.referenceNumber && (
                <small>
                  Ref:{" "}
                  {payment.referenceNumber}
                </small>
              )}
            </div>
          </div>
        </td>

        <td>
          <div className="customer-cell">
            <strong>
              {getCustomerName(
                customer
              )}
            </strong>

            {customer?.email && (
              <small>
                {customer.email}
              </small>
            )}
          </div>
        </td>

        <td>
          <span className="invoice-link">
            {getInvoiceNumber(invoice)}
          </span>
        </td>

        <td>
          <span className="date-text">
            {formatDate(
              payment.paymentDate
            )}
          </span>
        </td>

        <td>
          <strong className="amount-text">
            {formatCurrency(
              payment.amount
            )}
          </strong>
        </td>

        <td>
          <span className="method-badge">
            {paymentMethods.find(
              (item) =>
                item.value ===
                payment.paymentMethod
            )?.label ||
              payment.paymentMethod ||
              "-"}
          </span>
        </td>

        <td>
          <span
            className={getStatusClass(
              payment.status
            )}
          >
            <span className="status-dot" />
            {payment.status}
          </span>
        </td>

        <td>
          <div className="row-actions">
            <button
              className="icon-button"
              title="View"
              onClick={() =>
                openDetails(payment)
              }
            >
              👁
            </button>

            {payment.status ===
              "pending" && (
              <button
                className="icon-button"
                title="Edit"
                onClick={() =>
                  openEdit(payment)
                }
              >
                ✏️
              </button>
            )}

            {payment.status ===
              "completed" && (
              <>
                <button
                  className="icon-button warning"
                  title="Cancel"
                  onClick={() =>
                    openCancel(payment)
                  }
                >
                  ↩
                </button>

                <button
                  className="icon-button purple"
                  title="Refund"
                  onClick={() =>
                    openRefund(payment)
                  }
                >
                  ↪
                </button>
              </>
            )}

            {payment.status !==
              "completed" && (
              <button
                className="icon-button danger"
                title="Delete"
                onClick={() =>
                  openDelete(payment)
                }
              >
                🗑
              </button>
            )}
          </div>
        </td>
      </tr>
    );
  };

  return (
    <>
      <div className="payment-page">
        <style>{`
          * {
            box-sizing: border-box;
          }

          .payment-page {
            min-height: 100vh;
            padding: 28px;
            background:
              radial-gradient(
                circle at 10% 0%,
                rgba(59, 130, 246, 0.08),
                transparent 30%
              ),
              radial-gradient(
                circle at 90% 10%,
                rgba(139, 92, 246, 0.07),
                transparent 28%
              ),
              #070b12;
            color: #e5e7eb;
          }

          .payment-container {
            max-width: 1600px;
            margin: 0 auto;
          }

          .payment-header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 20px;
            margin-bottom: 28px;
          }

          .header-left {
            display: flex;
            gap: 16px;
            align-items: center;
          }

          .page-logo {
            width: 52px;
            height: 52px;
            border-radius: 15px;
            display: grid;
            place-items: center;
            background:
              linear-gradient(
                145deg,
                #172033,
                #0e1523
              );
            border: 1px solid #253149;
            box-shadow:
              0 12px 30px rgba(0,0,0,.28),
              inset 0 1px 0 rgba(255,255,255,.04);
            font-size: 23px;
          }

          .payment-header h1 {
            margin: 0 0 5px;
            font-size: 28px;
            font-weight: 750;
            letter-spacing: -.5px;
            color: #f8fafc;
          }

          .payment-header p {
            margin: 0;
            color: #7f8da3;
            font-size: 14px;
          }

          .header-actions {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
          }

          .primary-button,
          .secondary-button {
            border: 0;
            min-height: 42px;
            padding: 0 16px;
            border-radius: 11px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 650;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            transition: .2s ease;
          }

          .primary-button {
            color: white;
            background:
              linear-gradient(
                135deg,
                #2563eb,
                #4f46e5
              );
            box-shadow:
              0 8px 24px rgba(37,99,235,.22);
          }

          .primary-button:hover {
            transform: translateY(-1px);
            box-shadow:
              0 12px 30px rgba(37,99,235,.3);
          }

          .secondary-button {
            color: #cbd5e1;
            background: #111827;
            border: 1px solid #263246;
          }

          .secondary-button:hover {
            background: #172033;
            border-color: #334155;
          }

          .summary-grid {
            display: grid;
            grid-template-columns:
              repeat(4, minmax(0, 1fr));
            gap: 15px;
            margin-bottom: 20px;
          }

          .summary-card {
            position: relative;
            overflow: hidden;
            min-height: 126px;
            padding: 18px;
            border-radius: 16px;
            background:
              linear-gradient(
                145deg,
                rgba(17,24,39,.98),
                rgba(10,15,24,.98)
              );
            border: 1px solid #202b3d;
            box-shadow:
              0 15px 40px rgba(0,0,0,.18);
          }

          .summary-card::after {
            content: "";
            position: absolute;
            right: -30px;
            top: -30px;
            width: 100px;
            height: 100px;
            border-radius: 50%;
            background: rgba(59,130,246,.08);
          }

          .summary-label {
            color: #8290a5;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: .6px;
          }

          .summary-value {
            margin-top: 9px;
            color: #f8fafc;
            font-size: 25px;
            font-weight: 750;
            letter-spacing: -.5px;
          }

          .summary-sub {
            margin-top: 7px;
            color: #64748b;
            font-size: 12px;
          }

          .summary-icon {
            position: absolute;
            right: 17px;
            top: 17px;
            width: 36px;
            height: 36px;
            display: grid;
            place-items: center;
            border-radius: 11px;
            background: #162033;
            border: 1px solid #263650;
            font-size: 16px;
          }

          .toolbar {
            padding: 14px;
            margin-bottom: 15px;
            border: 1px solid #202b3d;
            border-radius: 15px;
            background: rgba(12,18,29,.92);
          }

          .search-row {
            display: flex;
            align-items: center;
            gap: 10px;
          }

          .search-box {
            position: relative;
            flex: 1;
          }

          .search-box span {
            position: absolute;
            left: 13px;
            top: 50%;
            transform: translateY(-50%);
            color: #66758c;
          }

          .input,
          .select,
          .textarea {
            width: 100%;
            outline: none;
            border: 1px solid #273449;
            background: #0d1420;
            color: #e5e7eb;
            border-radius: 10px;
            font-size: 13px;
            transition: .2s ease;
          }

          .input,
          .select {
            height: 42px;
            padding: 0 12px;
          }

          .search-input {
            padding-left: 39px;
          }

          .textarea {
            min-height: 90px;
            padding: 12px;
            resize: vertical;
          }

          .input:focus,
          .select:focus,
          .textarea:focus {
            border-color: #3b82f6;
            box-shadow:
              0 0 0 3px rgba(59,130,246,.09);
          }

          .filter-button {
            height: 42px;
            padding: 0 14px;
            border-radius: 10px;
            border: 1px solid #273449;
            background: #111827;
            color: #cbd5e1;
            cursor: pointer;
          }

          .filter-panel {
            margin-top: 13px;
            padding-top: 13px;
            border-top: 1px solid #1e293b;
            display: grid;
            grid-template-columns:
              repeat(4, minmax(0, 1fr));
            gap: 10px;
          }

          .table-card {
            overflow: hidden;
            border: 1px solid #202b3d;
            border-radius: 16px;
            background: #0b111b;
            box-shadow:
              0 20px 50px rgba(0,0,0,.17);
          }

          .table-top {
            padding: 16px 18px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #1d2839;
          }

          .table-top h2 {
            margin: 0;
            font-size: 15px;
            color: #f1f5f9;
          }

          .record-count {
            color: #64748b;
            font-size: 12px;
          }

          .table-wrapper {
            overflow-x: auto;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            min-width: 1050px;
          }

          th {
            padding: 13px 15px;
            text-align: left;
            color: #68778d;
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: .7px;
            background: #0d1420;
            border-bottom: 1px solid #1d2839;
          }

          td {
            padding: 14px 15px;
            border-bottom: 1px solid #182232;
            vertical-align: middle;
          }

          tr:last-child td {
            border-bottom: 0;
          }

          tbody tr {
            transition: .15s ease;
          }

          tbody tr:hover {
            background: rgba(30,41,59,.27);
          }

          .payment-number {
            display: flex;
            gap: 10px;
            align-items: center;
          }

          .payment-icon {
            width: 34px;
            height: 34px;
            flex: 0 0 34px;
            display: grid;
            place-items: center;
            border-radius: 9px;
            background: #111c2d;
            border: 1px solid #263650;
          }

          .payment-number strong,
          .customer-cell strong {
            display: block;
            color: #e8edf5;
            font-size: 13px;
            font-weight: 650;
          }

          .payment-number small,
          .customer-cell small {
            display: block;
            margin-top: 3px;
            color: #617088;
            font-size: 11px;
          }

          .invoice-link {
            color: #60a5fa;
            font-size: 12px;
            font-weight: 600;
          }

          .date-text {
            color: #a5b0c1;
            font-size: 12px;
          }

          .amount-text {
            color: #f8fafc;
            font-size: 13px;
          }

          .method-badge {
            padding: 6px 9px;
            border-radius: 7px;
            background: #111827;
            color: #aeb9ca;
            border: 1px solid #253146;
            font-size: 11px;
          }

          .payment-status {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 5px 8px;
            border-radius: 999px;
            font-size: 10px;
            text-transform: capitalize;
            font-weight: 700;
          }

          .status-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: currentColor;
          }

          .payment-status.completed {
            color: #4ade80;
            background: rgba(34,197,94,.08);
            border: 1px solid rgba(34,197,94,.16);
          }

          .payment-status.pending {
            color: #fbbf24;
            background: rgba(245,158,11,.08);
            border: 1px solid rgba(245,158,11,.16);
          }

          .payment-status.cancelled {
            color: #fb7185;
            background: rgba(244,63,94,.08);
            border: 1px solid rgba(244,63,94,.16);
          }

          .payment-status.refunded {
            color: #c084fc;
            background: rgba(168,85,247,.08);
            border: 1px solid rgba(168,85,247,.16);
          }

          .row-actions {
            display: flex;
            gap: 5px;
          }

          .icon-button {
            width: 31px;
            height: 31px;
            border-radius: 8px;
            border: 1px solid #263246;
            background: #101722;
            color: #aab5c6;
            cursor: pointer;
            display: grid;
            place-items: center;
            font-size: 12px;
            transition: .18s ease;
          }

          .icon-button:hover {
            background: #172236;
            border-color: #3b4b64;
            color: white;
          }

          .icon-button.warning:hover {
            color: #fbbf24;
            border-color: rgba(245,158,11,.4);
          }

          .icon-button.purple:hover {
            color: #c084fc;
            border-color: rgba(168,85,247,.4);
          }

          .icon-button.danger:hover {
            color: #fb7185;
            border-color: rgba(244,63,94,.4);
          }

          .empty-state {
            padding: 65px 20px;
            text-align: center;
          }

          .empty-icon {
            width: 60px;
            height: 60px;
            margin: 0 auto 15px;
            display: grid;
            place-items: center;
            border-radius: 16px;
            background: #111a29;
            border: 1px solid #263650;
            font-size: 25px;
          }

          .empty-state h3 {
            margin: 0 0 6px;
            font-size: 16px;
            color: #dbe3ee;
          }

          .empty-state p {
            margin: 0;
            color: #65748a;
            font-size: 13px;
          }

          .pagination {
            padding: 14px 17px;
            border-top: 1px solid #1d2839;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }

          .pagination-info {
            color: #65748a;
            font-size: 12px;
          }

          .pagination-buttons {
            display: flex;
            gap: 6px;
          }

          .page-button {
            min-width: 34px;
            height: 34px;
            padding: 0 9px;
            border-radius: 8px;
            border: 1px solid #263246;
            background: #101722;
            color: #aab5c6;
            cursor: pointer;
          }

          .page-button.active {
            color: white;
            background: #2563eb;
            border-color: #2563eb;
          }

          .page-button:disabled {
            opacity: .4;
            cursor: not-allowed;
          }

          .alert {
            margin-bottom: 15px;
            padding: 12px 14px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            font-size: 13px;
          }

          .alert.error {
            color: #fecdd3;
            background: rgba(127,29,29,.25);
            border: 1px solid rgba(244,63,94,.25);
          }

          .alert.success {
            color: #bbf7d0;
            background: rgba(20,83,45,.25);
            border: 1px solid rgba(34,197,94,.22);
          }

          .modal-overlay {
            position: fixed;
            z-index: 1000;
            inset: 0;
            padding: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(0,0,0,.72);
            backdrop-filter: blur(8px);
          }

          .modal {
            width: min(700px, 100%);
            max-height: 92vh;
            overflow-y: auto;
            border: 1px solid #263246;
            border-radius: 18px;
            background: #0b111b;
            box-shadow:
              0 35px 100px rgba(0,0,0,.5);
          }

          .modal.small {
            width: min(450px, 100%);
          }

          .modal-header {
            padding: 19px 21px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 1px solid #1d2839;
          }

          .modal-header h3 {
            margin: 0;
            color: #f8fafc;
            font-size: 16px;
          }

          .modal-header p {
            margin: 4px 0 0;
            color: #66758c;
            font-size: 11px;
          }

          .close-button {
            width: 32px;
            height: 32px;
            border-radius: 8px;
            border: 1px solid #263246;
            background: #101722;
            color: #9aa8bb;
            cursor: pointer;
          }

          .modal-body {
            padding: 20px;
          }

          .form-grid {
            display: grid;
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
            gap: 14px;
          }

          .form-group {
            display: flex;
            flex-direction: column;
            gap: 7px;
          }

          .form-group.full {
            grid-column: 1 / -1;
          }

          .form-label {
            color: #94a3b8;
            font-size: 11px;
            font-weight: 650;
          }

          .required {
            color: #f87171;
          }

          .invoice-info {
            margin-top: 12px;
            padding: 13px;
            border-radius: 10px;
            background: #0e1725;
            border: 1px solid #263650;
          }

          .invoice-info-grid {
            display: grid;
            grid-template-columns:
              repeat(3, 1fr);
            gap: 10px;
          }

          .info-label {
            color: #64748b;
            font-size: 10px;
          }

          .info-value {
            margin-top: 3px;
            color: #dbe4ef;
            font-size: 12px;
            font-weight: 650;
          }

          .modal-footer {
            padding: 15px 20px;
            display: flex;
            justify-content: flex-end;
            gap: 9px;
            border-top: 1px solid #1d2839;
          }

          .details-grid {
            display: grid;
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
            gap: 10px;
          }

          .detail-card {
            padding: 13px;
            border-radius: 11px;
            background: #0e1623;
            border: 1px solid #1e2a3d;
          }

          .detail-card.full {
            grid-column: 1 / -1;
          }

          .detail-label {
            color: #64748b;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: .5px;
          }

          .detail-value {
            margin-top: 5px;
            color: #e2e8f0;
            font-size: 13px;
            font-weight: 600;
            word-break: break-word;
          }

          .confirm-icon {
            width: 52px;
            height: 52px;
            margin-bottom: 15px;
            display: grid;
            place-items: center;
            border-radius: 15px;
            background: #162033;
            border: 1px solid #2b3b55;
            font-size: 22px;
          }

          .confirm-title {
            margin: 0 0 7px;
            color: #f8fafc;
            font-size: 17px;
          }

          .confirm-text {
            margin: 0;
            color: #7f8da3;
            font-size: 13px;
            line-height: 1.6;
          }

          .reason-input {
            margin-top: 15px;
          }

          .skeleton {
            height: 56px;
            background:
              linear-gradient(
                90deg,
                #0d1420 25%,
                #131d2c 50%,
                #0d1420 75%
              );
            background-size: 200% 100%;
            animation: skeleton 1.3s infinite;
          }

          @keyframes skeleton {
            from {
              background-position: 200% 0;
            }

            to {
              background-position: -200% 0;
            }
          }

          @media (max-width: 1100px) {
            .summary-grid {
              grid-template-columns:
                repeat(2, minmax(0, 1fr));
            }

            .filter-panel {
              grid-template-columns:
                repeat(2, minmax(0, 1fr));
            }
          }

          @media (max-width: 760px) {
            .payment-page {
              padding: 15px;
            }

            .payment-header {
              flex-direction: column;
            }

            .header-actions {
              width: 100%;
            }

            .header-actions button {
              flex: 1;
            }

            .summary-grid {
              grid-template-columns: 1fr;
            }

            .search-row {
              flex-wrap: wrap;
            }

            .search-box {
              flex-basis: 100%;
            }

            .filter-panel {
              grid-template-columns: 1fr;
            }

            .form-grid,
            .details-grid {
              grid-template-columns: 1fr;
            }

            .form-group.full,
            .detail-card.full {
              grid-column: auto;
            }

            .invoice-info-grid {
              grid-template-columns: 1fr;
            }

            .pagination {
              gap: 10px;
              align-items: flex-start;
              flex-direction: column;
            }
          }
        `}</style>

        <div className="payment-container">

          <div className="payment-header">
            <div className="header-left">
              <div className="page-logo">
                💳
              </div>

              <div>
                <h1>Payments</h1>
                <p>
                  Manage customer payments,
                  allocations, refunds and
                  transaction records.
                </p>
              </div>
            </div>

            <div className="header-actions">
              <button
                className="secondary-button"
                onClick={refreshAll}
                disabled={loading}
              >
                ↻ Refresh
              </button>

              <button
                className="primary-button"
                onClick={openCreate}
              >
                ＋ Record Payment
              </button>
            </div>
          </div>

          {error && (
            <div className="alert error">
              <span>{error}</span>

              <button
                className="close-button"
                onClick={() =>
                  setError("")
                }
              >
                ×
              </button>
            </div>
          )}

          {success && (
            <div className="alert success">
              <span>{success}</span>

              <button
                className="close-button"
                onClick={() =>
                  setSuccess("")
                }
              >
                ×
              </button>
            </div>
          )}

          <div className="summary-grid">

            <div className="summary-card">
              <div className="summary-icon">
                💰
              </div>

              <div className="summary-label">
                Total Payments
              </div>

              <div className="summary-value">
                {summary.total}
              </div>

              <div className="summary-sub">
                {formatCurrency(
                  summary.totalAmount
                )}{" "}
                collected
              </div>
            </div>

            <div className="summary-card">
              <div className="summary-icon">
                ✓
              </div>

              <div className="summary-label">
                Completed
              </div>

              <div className="summary-value">
                {summary.completed}
              </div>

              <div className="summary-sub">
                Successfully posted
              </div>
            </div>

            <div className="summary-card">
              <div className="summary-icon">
                ◷
              </div>

              <div className="summary-label">
                Pending
              </div>

              <div className="summary-value">
                {summary.pending}
              </div>

              <div className="summary-sub">
                Awaiting confirmation
              </div>
            </div>

            <div className="summary-card">
              <div className="summary-icon">
                📅
              </div>

              <div className="summary-label">
                This Month
              </div>

              <div className="summary-value">
                {formatCurrency(
                  summary.month
                )}
              </div>

              <div className="summary-sub">
                Current month collection
              </div>
            </div>

          </div>

          <div className="toolbar">

            <div className="search-row">

              <div className="search-box">
                <span>⌕</span>

                <input
                  className="input search-input"
                  placeholder="Search payment number, reference..."
                  value={filters.search}
                  onChange={(event) =>
                    handleFilterChange(
                      "search",
                      event.target.value
                    )
                  }
                />
              </div>

              <select
                className="select"
                style={{ width: 160 }}
                value={filters.status}
                onChange={(event) =>
                  handleFilterChange(
                    "status",
                    event.target.value
                  )
                }
              >
                <option value="">
                  All Status
                </option>

                {statusOptions.map(
                  (status) => (
                    <option
                      key={status}
                      value={status}
                    >
                      {status
                        .charAt(0)
                        .toUpperCase() +
                        status.slice(1)}
                    </option>
                  )
                )}
              </select>

              <button
                className="filter-button"
                onClick={() =>
                  setShowFilters(
                    (value) => !value
                  )
                }
              >
                ⚙ Filters
              </button>

            </div>

            {showFilters && (
              <div className="filter-panel">

                <select
                  className="select"
                  value={
                    filters.paymentMethod
                  }
                  onChange={(event) =>
                    handleFilterChange(
                      "paymentMethod",
                      event.target.value
                    )
                  }
                >
                  <option value="">
                    All Payment Methods
                  </option>

                  {paymentMethods.map(
                    (method) => (
                      <option
                        key={method.value}
                        value={method.value}
                      >
                        {method.label}
                      </option>
                    )
                  )}
                </select>

                <select
                  className="select"
                  value={
                    filters.customerId
                  }
                  onChange={(event) =>
                    handleFilterChange(
                      "customerId",
                      event.target.value
                    )
                  }
                >
                  <option value="">
                    All Customers
                  </option>

                  {customers.map(
                    (customer) => (
                      <option
                        key={customer._id}
                        value={customer._id}
                      >
                        {getCustomerName(
                          customer
                        )}
                      </option>
                    )
                  )}
                </select>

                <select
                  className="select"
                  value={
                    filters.invoiceId
                  }
                  onChange={(event) =>
                    handleFilterChange(
                      "invoiceId",
                      event.target.value
                    )
                  }
                >
                  <option value="">
                    All Invoices
                  </option>

                  {invoices.map(
                    (invoice) => (
                      <option
                        key={invoice._id}
                        value={invoice._id}
                      >
                        {invoice.invoiceNumber ||
                          invoice._id}
                      </option>
                    )
                  )}
                </select>

                <button
                  className="secondary-button"
                  onClick={resetFilters}
                >
                  Clear Filters
                </button>

                <div className="form-group">
                  <label className="form-label">
                    From Date
                  </label>

                  <input
                    className="input"
                    type="date"
                    value={
                      filters.dateFrom
                    }
                    onChange={(event) =>
                      handleFilterChange(
                        "dateFrom",
                        event.target.value
                      )
                    }
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    To Date
                  </label>

                  <input
                    className="input"
                    type="date"
                    value={
                      filters.dateTo
                    }
                    onChange={(event) =>
                      handleFilterChange(
                        "dateTo",
                        event.target.value
                      )
                    }
                  />
                </div>

              </div>
            )}

          </div>

          <div className="table-card">

            <div className="table-top">
              <div>
                <h2>
                  Payment Transactions
                </h2>
              </div>

              <div className="record-count">
                {pagination.total} records
              </div>
            </div>

            <div className="table-wrapper">

              {loading ? (
                <table>
                  <tbody>
                    {[1, 2, 3, 4, 5].map(
                      (item) => (
                        <tr key={item}>
                          <td colSpan="8">
                            <div className="skeleton" />
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              ) : payments.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">
                    💳
                  </div>

                  <h3>
                    No payments found
                  </h3>

                  <p>
                    Create your first
                    payment transaction
                    or adjust your filters.
                  </p>

                  <br />

                  <button
                    className="primary-button"
                    onClick={openCreate}
                  >
                    ＋ Record Payment
                  </button>
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Payment</th>
                      <th>Customer</th>
                      <th>Invoice</th>
                      <th>Date</th>
                      <th>Amount</th>
                      <th>Method</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {payments.map(
                      renderPaymentRow
                    )}
                  </tbody>
                </table>
              )}

            </div>

            {!loading &&
              payments.length > 0 && (
                <div className="pagination">

                  <div className="pagination-info">
                    Page {pagination.page} of{" "}
                    {pagination.pages}
                  </div>

                  <div className="pagination-buttons">

                    <button
                      className="page-button"
                      disabled={
                        page <= 1
                      }
                      onClick={() =>
                        fetchPayments(
                          page - 1
                        )
                      }
                    >
                      ‹
                    </button>

                    {Array.from(
                      {
                        length:
                          Math.min(
                            pagination.pages,
                            5
                          ),
                      },
                      (_, index) => {
                        let pageNumber =
                          index + 1;

                        if (
                          pagination.pages >
                            5 &&
                          page >
                            3
                        ) {
                          pageNumber =
                            page - 2 + index;
                        }

                        if (
                          pageNumber >
                          pagination.pages
                        ) {
                          return null;
                        }

                        return (
                          <button
                            key={
                              pageNumber
                            }
                            className={
                              "page-button " +
                              (pageNumber ===
                              page
                                ? "active"
                                : "")
                            }
                            onClick={() =>
                              fetchPayments(
                                pageNumber
                              )
                            }
                          >
                            {pageNumber}
                          </button>
                        );
                      }
                    )}

                    <button
                      className="page-button"
                      disabled={
                        page >=
                        pagination.pages
                      }
                      onClick={() =>
                        fetchPayments(
                          page + 1
                        )
                      }
                    >
                      ›
                    </button>

                  </div>

                </div>
              )}

          </div>
        </div>
      </div>

      {/* CREATE / EDIT MODAL */}

      {showForm && (
        <div
          className="modal-overlay"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeForm();
            }
          }}
        >
          <div className="modal">

            <div className="modal-header">
              <div>
                <h3>
                  {editingPayment
                    ? "Edit Pending Payment"
                    : "Record Payment"}
                </h3>

                <p>
                  {editingPayment
                    ? "Update pending transaction details."
                    : "Record a customer payment against an invoice."}
                </p>
              </div>

              <button
                className="close-button"
                onClick={closeForm}
              >
                ×
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
            >
              <div className="modal-body">

                <div className="form-grid">

                  <div className="form-group">
                    <label className="form-label">
                      Customer{" "}
                      <span className="required">
                        *
                      </span>
                    </label>

                    <select
                      className="select"
                      value={
                        form.customerId
                      }
                      disabled={
                        !!editingPayment
                      }
                      onChange={(event) =>
                        handleFormChange(
                          "customerId",
                          event.target.value
                        )
                      }
                    >
                      <option value="">
                        Select Customer
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
                            {getCustomerName(
                              customer
                            )}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Invoice{" "}
                      <span className="required">
                        *
                      </span>
                    </label>

                    <select
                      className="select"
                      value={
                        form.invoiceId
                      }
                      disabled={
                        !!editingPayment
                      }
                      onChange={(event) =>
                        handleInvoiceChange(
                          event.target.value
                        )
                      }
                    >
                      <option value="">
                        Select Invoice
                      </option>

                      {invoices
                        .filter(
                          (invoice) =>
                            ![
                              "cancelled",
                              "draft",
                            ].includes(
                              invoice.status
                            )
                        )
                        .map(
                          (invoice) => (
                            <option
                              key={
                                invoice._id
                              }
                              value={
                                invoice._id
                              }
                            >
                              {invoice.invoiceNumber ||
                                invoice._id}
                            </option>
                          )
                        )}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Branch
                    </label>

                    <select
                      className="select"
                      value={
                        form.branchId
                      }
                      onChange={(event) =>
                        handleFormChange(
                          "branchId",
                          event.target.value
                        )
                      }
                    >
                      <option value="">
                        Select Branch
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
                            {getBranchName(
                              branch
                            )}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Payment Date{" "}
                      <span className="required">
                        *
                      </span>
                    </label>

                    <input
                      className="input"
                      type="date"
                      value={
                        form.paymentDate
                      }
                      onChange={(event) =>
                        handleFormChange(
                          "paymentDate",
                          event.target.value
                        )
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Amount{" "}
                      <span className="required">
                        *
                      </span>
                    </label>

                    <input
                      className="input"
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="0.00"
                      value={
                        form.amount
                      }
                      onChange={(event) =>
                        handleFormChange(
                          "amount",
                          event.target.value
                        )
                      }
                    />

                    {selectedInvoice &&
                      getInvoiceBalance() !==
                        null && (
                        <small
                          style={{
                            color:
                              "#64748b",
                            fontSize:
                              "11px",
                          }}
                        >
                          Invoice balance:{" "}
                          {formatCurrency(
                            getInvoiceBalance()
                          )}
                        </small>
                      )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Payment Method{" "}
                      <span className="required">
                        *
                      </span>
                    </label>

                    <select
                      className="select"
                      value={
                        form.paymentMethod
                      }
                      onChange={(event) =>
                        handleFormChange(
                          "paymentMethod",
                          event.target.value
                        )
                      }
                    >
                      {paymentMethods.map(
                        (method) => (
                          <option
                            key={
                              method.value
                            }
                            value={
                              method.value
                            }
                          >
                            {method.label}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  {!editingPayment && (
                    <div className="form-group">
                      <label className="form-label">
                        Initial Status
                      </label>

                      <select
                        className="select"
                        value={
                          form.status
                        }
                        onChange={(event) =>
                          handleFormChange(
                            "status",
                            event.target.value
                          )
                        }
                      >
                        <option value="completed">
                          Completed
                        </option>

                        <option value="pending">
                          Pending
                        </option>
                      </select>
                    </div>
                  )}

                  <div className="form-group">
                    <label className="form-label">
                      Reference Number
                    </label>

                    <input
                      className="input"
                      placeholder="UPI / Bank / Cheque reference"
                      value={
                        form.referenceNumber
                      }
                      onChange={(event) =>
                        handleFormChange(
                          "referenceNumber",
                          event.target.value
                        )
                      }
                    />
                  </div>

                  <div className="form-group full">
                    <label className="form-label">
                      Notes
                    </label>

                    <textarea
                      className="textarea"
                      placeholder="Payment notes..."
                      value={
                        form.notes
                      }
                      onChange={(event) =>
                        handleFormChange(
                          "notes",
                          event.target.value
                        )
                      }
                    />
                  </div>

                </div>

                {selectedInvoice && (
                  <div className="invoice-info">

                    <div
                      style={{
                        color:
                          "#dbe4ef",
                        fontSize:
                          "12px",
                        fontWeight:
                          700,
                        marginBottom:
                          "10px",
                      }}
                    >
                      Invoice Information
                    </div>

                    <div className="invoice-info-grid">

                      <div>
                        <div className="info-label">
                          Invoice
                        </div>

                        <div className="info-value">
                          {selectedInvoice.invoiceNumber ||
                            "-"}
                        </div>
                      </div>

                      <div>
                        <div className="info-label">
                          Grand Total
                        </div>

                        <div className="info-value">
                          {formatCurrency(
                            selectedInvoice.grandTotal
                          )}
                        </div>
                      </div>

                      <div>
                        <div className="info-label">
                          Balance
                        </div>

                        <div className="info-value">
                          {formatCurrency(
                            selectedInvoice.balanceAmount
                          )}
                        </div>
                      </div>

                    </div>
                  </div>
                )}

              </div>

              <div className="modal-footer">

                <button
                  type="button"
                  className="secondary-button"
                  onClick={closeForm}
                  disabled={
                    formLoading
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={
                    formLoading
                  }
                >
                  {formLoading
                    ? "Saving..."
                    : editingPayment
                    ? "Update Payment"
                    : "Record Payment"}
                </button>

              </div>
            </form>

          </div>
        </div>
      )}

      {/* DETAILS MODAL */}

      {showDetails &&
        viewingPayment && (
          <div
            className="modal-overlay"
            onMouseDown={(event) => {
              if (
                event.target ===
                event.currentTarget
              ) {
                closeDetails();
              }
            }}
          >
            <div className="modal">

              <div className="modal-header">
                <div>
                  <h3>
                    Payment Details
                  </h3>

                  <p>
                    Complete transaction
                    information
                  </p>
                </div>

                <button
                  className="close-button"
                  onClick={
                    closeDetails
                  }
                >
                  ×
                </button>
              </div>

              <div className="modal-body">

                <div
                  style={{
                    display:
                      "flex",
                    alignItems:
                      "center",
                    justifyContent:
                      "space-between",
                    marginBottom:
                      "16px",
                    padding:
                      "14px",
                    borderRadius:
                      "12px",
                    background:
                      "#0e1725",
                    border:
                      "1px solid #263650",
                  }}
                >
                  <div>
                    <div
                      style={{
                        color:
                          "#64748b",
                        fontSize:
                          "10px",
                        textTransform:
                          "uppercase",
                      }}
                    >
                      Payment Number
                    </div>

                    <div
                      style={{
                        color:
                          "#f8fafc",
                        fontSize:
                          "17px",
                        fontWeight:
                          750,
                        marginTop:
                          "4px",
                      }}
                    >
                      {viewingPayment.paymentNumber ||
                        "-"}
                    </div>
                  </div>

                  <span
                    className={getStatusClass(
                      viewingPayment.status
                    )}
                  >
                    <span className="status-dot" />
                    {
                      viewingPayment.status
                    }
                  </span>
                </div>

                <div className="details-grid">

                  <div className="detail-card">
                    <div className="detail-label">
                      Customer
                    </div>

                    <div className="detail-value">
                      {getCustomerName(
                        viewingPayment.customerId
                      )}
                    </div>
                  </div>

                  <div className="detail-card">
                    <div className="detail-label">
                      Invoice
                    </div>

                    <div className="detail-value">
                      {getInvoiceNumber(
                        viewingPayment.invoiceId
                      )}
                    </div>
                  </div>

                  <div className="detail-card">
                    <div className="detail-label">
                      Amount
                    </div>

                    <div className="detail-value">
                      {formatCurrency(
                        viewingPayment.amount
                      )}
                    </div>
                  </div>

                  <div className="detail-card">
                    <div className="detail-label">
                      Payment Method
                    </div>

                    <div className="detail-value">
                      {paymentMethods.find(
                        (item) =>
                          item.value ===
                          viewingPayment.paymentMethod
                      )?.label ||
                        viewingPayment.paymentMethod ||
                        "-"}
                    </div>
                  </div>

                  <div className="detail-card">
                    <div className="detail-label">
                      Payment Date
                    </div>

                    <div className="detail-value">
                      {formatDate(
                        viewingPayment.paymentDate
                      )}
                    </div>
                  </div>

                  <div className="detail-card">
                    <div className="detail-label">
                      Branch
                    </div>

                    <div className="detail-value">
                      {getBranchName(
                        viewingPayment.branchId
                      )}
                    </div>
                  </div>

                  <div className="detail-card">
                    <div className="detail-label">
                      Allocated Amount
                    </div>

                    <div className="detail-value">
                      {formatCurrency(
                        viewingPayment.allocatedAmount
                      )}
                    </div>
                  </div>

                  <div className="detail-card">
                    <div className="detail-label">
                      Remaining Amount
                    </div>

                    <div className="detail-value">
                      {formatCurrency(
                        viewingPayment.remainingAmount
                      )}
                    </div>
                  </div>

                  <div className="detail-card full">
                    <div className="detail-label">
                      Reference Number
                    </div>

                    <div className="detail-value">
                      {viewingPayment.referenceNumber ||
                        "-"}
                    </div>
                  </div>

                  <div className="detail-card full">
                    <div className="detail-label">
                      Notes
                    </div>

                    <div className="detail-value">
                      {viewingPayment.notes ||
                        "-"}
                    </div>
                  </div>

                  {viewingPayment.cancellationReason && (
                    <div className="detail-card full">
                      <div className="detail-label">
                        Cancellation Reason
                      </div>

                      <div className="detail-value">
                        {
                          viewingPayment.cancellationReason
                        }
                      </div>
                    </div>
                  )}

                  {viewingPayment.refundReason && (
                    <div className="detail-card full">
                      <div className="detail-label">
                        Refund Reason
                      </div>

                      <div className="detail-value">
                        {
                          viewingPayment.refundReason
                        }
                      </div>
                    </div>
                  )}

                </div>

              </div>

              <div className="modal-footer">

                {viewingPayment.status ===
                  "pending" && (
                  <button
                    className="secondary-button"
                    onClick={() => {
                      closeDetails();
                      openEdit(
                        viewingPayment
                      );
                    }}
                  >
                    ✏ Edit
                  </button>
                )}

                {viewingPayment.status ===
                  "completed" && (
                  <>
                    <button
                      className="secondary-button"
                      onClick={() => {
                        closeDetails();
                        openCancel(
                          viewingPayment
                        );
                      }}
                    >
                      ↩ Cancel
                    </button>

                    <button
                      className="primary-button"
                      onClick={() => {
                        closeDetails();
                        openRefund(
                          viewingPayment
                        );
                      }}
                    >
                      ↪ Refund
                    </button>
                  </>
                )}

                <button
                  className="secondary-button"
                  onClick={
                    closeDetails
                  }
                >
                  Close
                </button>

              </div>

            </div>
          </div>
        )}

      {/* DELETE MODAL */}

      {deleteModal &&
        selectedPayment && (
          <div className="modal-overlay">
            <div className="modal small">

              <div className="modal-body">

                <div className="confirm-icon">
                  🗑
                </div>

                <h3 className="confirm-title">
                  Delete Payment?
                </h3>

                <p className="confirm-text">
                  Are you sure you want to
                  delete{" "}
                  <strong>
                    {
                      selectedPayment.paymentNumber
                    }
                  </strong>
                  ? This action is only
                  allowed for non-completed
                  payments.
                </p>

              </div>

              <div className="modal-footer">

                <button
                  className="secondary-button"
                  onClick={() =>
                    setDeleteModal(
                      false
                    )
                  }
                  disabled={
                    actionLoading
                  }
                >
                  Cancel
                </button>

                <button
                  className="primary-button"
                  style={{
                    background:
                      "linear-gradient(135deg,#dc2626,#be123c)",
                  }}
                  onClick={
                    handleDelete
                  }
                  disabled={
                    actionLoading
                  }
                >
                  {actionLoading
                    ? "Deleting..."
                    : "Delete Payment"}
                </button>

              </div>

            </div>
          </div>
        )}

      {/* CANCEL MODAL */}

      {cancelModal &&
        selectedPayment && (
          <div className="modal-overlay">
            <div className="modal small">

              <div className="modal-body">

                <div className="confirm-icon">
                  ↩
                </div>

                <h3 className="confirm-title">
                  Cancel Payment?
                </h3>

                <p className="confirm-text">
                  This will cancel payment{" "}
                  <strong>
                    {
                      selectedPayment.paymentNumber
                    }
                  </strong>{" "}
                  and synchronize the
                  invoice payment balance.
                </p>

                <div className="reason-input">
                  <label className="form-label">
                    Reason
                  </label>

                  <textarea
                    className="textarea"
                    placeholder="Enter cancellation reason..."
                    value={
                      actionReason
                    }
                    onChange={(event) =>
                      setActionReason(
                        event.target
                          .value
                      )
                    }
                  />
                </div>

              </div>

              <div className="modal-footer">

                <button
                  className="secondary-button"
                  onClick={() =>
                    setCancelModal(
                      false
                    )
                  }
                  disabled={
                    actionLoading
                  }
                >
                  Keep Payment
                </button>

                <button
                  className="primary-button"
                  onClick={
                    handleCancel
                  }
                  disabled={
                    actionLoading
                  }
                >
                  {actionLoading
                    ? "Cancelling..."
                    : "Cancel Payment"}
                </button>

              </div>

            </div>
          </div>
        )}

      {/* REFUND MODAL */}

      {refundModal &&
        selectedPayment && (
          <div className="modal-overlay">
            <div className="modal small">

              <div className="modal-body">

                <div className="confirm-icon">
                  ↪
                </div>

                <h3 className="confirm-title">
                  Refund Payment?
                </h3>

                <p className="confirm-text">
                  Refund{" "}
                  <strong>
                    {formatCurrency(
                      selectedPayment.amount
                    )}
                  </strong>{" "}
                  for payment{" "}
                  <strong>
                    {
                      selectedPayment.paymentNumber
                    }
                  </strong>
                  ? The invoice balance
                  will be recalculated.
                </p>

                <div className="reason-input">
                  <label className="form-label">
                    Refund Reason
                  </label>

                  <textarea
                    className="textarea"
                    placeholder="Enter refund reason..."
                    value={
                      actionReason
                    }
                    onChange={(event) =>
                      setActionReason(
                        event.target
                          .value
                      )
                    }
                  />
                </div>

              </div>

              <div className="modal-footer">

                <button
                  className="secondary-button"
                  onClick={() =>
                    setRefundModal(
                      false
                    )
                  }
                  disabled={
                    actionLoading
                  }
                >
                  Keep Payment
                </button>

                <button
                  className="primary-button"
                  onClick={
                    handleRefund
                  }
                  disabled={
                    actionLoading
                  }
                >
                  {actionLoading
                    ? "Refunding..."
                    : "Refund Payment"}
                </button>

              </div>

            </div>
          </div>
        )}

    </>
  );
}