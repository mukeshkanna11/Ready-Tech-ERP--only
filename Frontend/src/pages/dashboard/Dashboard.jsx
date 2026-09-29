import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  Clock3,
  FileText,
  Layers3,
  Package,
  RefreshCw,
  ShoppingBag,
  ShoppingCart,
  Store,
  Target,
  TrendingUp,
  UserRound,
  Users,
  Wallet,
  XCircle,
  Zap,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import api from "../../services/api";

/* ============================================================= */
/* CONSTANTS */
/* ============================================================= */

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const CURRENCY_SYMBOLS = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£",
};

const EMPTY_DASHBOARD = {
  company: null,
  branches: [],
  users: [],
  customers: [],
  vendors: [],
  products: [],
  inventory: [],
  purchases: [],
  sales: [],
  quotations: [],
  salesOrders: [],
  salesSummary: null,
  quotationSummary: null,
  salesOrderSummary: null,
  totals: {
    branches: 0,
    users: 0,
    customers: 0,
    vendors: 0,
    products: 0,
    inventory: 0,
    purchases: 0,
    sales: 0,
    quotations: 0,
    salesOrders: 0,
  },
};

/* ============================================================= */
/* FORMATTERS */
/* ============================================================= */

const numberFormatter = new Intl.NumberFormat("en-IN");

const formatNumber = (value = 0) => {
  const number = Number(value);

  return numberFormatter.format(
    Number.isFinite(number) ? number : 0
  );
};

const formatCurrency = (value = 0, currency = "INR") => {
  const amount = Number(value) || 0;
  const code = String(currency || "INR").toUpperCase();

  if (code === "INR") {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  }

  if (CURRENCY_SYMBOLS[code]) {
    return `${CURRENCY_SYMBOLS[code]}${new Intl.NumberFormat(
      "en-IN",
      {
        maximumFractionDigits: 0,
      }
    ).format(amount)}`;
  }

  return `${code} ${new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(amount)}`;
};

/* ============================================================= */
/* SAFE API HELPERS */
/* ============================================================= */

const getArray = (response) => {
  if (!response) return [];

  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response?.data?.data)) {
    return response.data.data;
  }

  if (Array.isArray(response?.data?.results)) {
    return response.data.results;
  }

  if (Array.isArray(response?.data?.items)) {
    return response.data.items;
  }

  if (Array.isArray(response?.data)) {
    return response.data;
  }

  if (Array.isArray(response?.results)) {
    return response.results;
  }

  if (Array.isArray(response?.items)) {
    return response.items;
  }

  return [];
};

const getObject = (response) => {
  if (!response) return null;

  if (
    response?.data?.data &&
    !Array.isArray(response.data.data)
  ) {
    return response.data.data;
  }

  if (
    response?.data &&
    typeof response.data === "object" &&
    !Array.isArray(response.data)
  ) {
    return response.data;
  }

  return response;
};

const getTotal = (response, fallback = []) => {
  const candidates = [
    response?.data?.pagination?.total,
    response?.data?.total,
    response?.data?.count,
    response?.pagination?.total,
    response?.total,
    response?.count,
    response?.meta?.total,
  ];

  for (const value of candidates) {
    const number = Number(value);

    if (Number.isFinite(number)) {
      return number;
    }
  }

  return fallback.length;
};

const toNumber = (...values) => {
  for (const value of values) {
    if (
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      const number = Number(value);

      if (Number.isFinite(number)) {
        return number;
      }
    }
  }

  return 0;
};

const normalizeStatus = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");

const getDate = (value) => {
  if (!value) return null;

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
};

const getDateValue = (item) =>
  item?.saleDate ||
  item?.orderDate ||
  item?.purchaseDate ||
  item?.quotationDate ||
  item?.createdAt ||
  item?.updatedAt ||
  null;

const formatDate = (value) => {
  const date = getDate(value);

  if (!date) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatRelativeDate = (value) => {
  const date = getDate(value);

  if (!date) return "Recently";

  const difference = Date.now() - date.getTime();

  const minutes = Math.floor(difference / 60000);
  const hours = Math.floor(difference / 3600000);
  const days = Math.floor(difference / 86400000);

  if (minutes < 1) return "Just now";

  if (minutes < 60) {
    return `${minutes} min ago`;
  }

  if (hours < 24) {
    return `${hours} hr ago`;
  }

  if (days < 7) {
    return `${days} day${days > 1 ? "s" : ""} ago`;
  }

  return formatDate(value);
};

const getAmount = (item) =>
  toNumber(
    item?.grandTotal,
    item?.totalAmount,
    item?.netAmount,
    item?.total,
    item?.amount
  );

const getPaidAmount = (item) =>
  toNumber(
    item?.paidAmount,
    item?.paid,
    item?.amountPaid,
    item?.paymentAmount
  );

const getBalance = (item) => {
  const explicitBalance = toNumber(
    item?.balanceAmount,
    item?.outstandingAmount,
    item?.dueAmount
  );

  if (explicitBalance > 0) {
    return explicitBalance;
  }

  return Math.max(
    0,
    getAmount(item) - getPaidAmount(item)
  );
};

const getQuantity = (item) =>
  toNumber(
    item?.available,
    item?.onHand,
    item?.currentStock,
    item?.stock,
    item?.quantity
  );

const getReorderLevel = (item) =>
  toNumber(
    item?.reorderLevel,
    item?.minimumStock,
    item?.minStock
  );

const getCustomerName = (item) =>
  item?.customerName ||
  item?.customer?.name ||
  item?.customer?.displayName ||
  item?.customer?.companyName ||
  item?.customerId?.name ||
  "Unknown customer";

const getVendorName = (item) =>
  item?.vendorName ||
  item?.vendor?.name ||
  item?.vendor?.displayName ||
  item?.vendor?.companyName ||
  item?.vendorId?.name ||
  "Unknown vendor";

const getProductName = (item) =>
  item?.productName ||
  item?.product?.name ||
  item?.productId?.name ||
  item?.name ||
  "Unknown product";

const getOrderNumber = (item) =>
  item?.orderNumber ||
  item?.invoiceNumber ||
  item?.quotationNumber ||
  item?.purchaseNumber ||
  item?.purchaseOrderNumber ||
  item?.referenceNumber ||
  item?._id?.slice(-8) ||
  "—";

const isCancelled = (status) =>
  ["cancelled", "canceled", "deleted"].includes(
    normalizeStatus(status)
  );

const isCompleted = (status) =>
  [
    "completed",
    "complete",
    "delivered",
    "closed",
    "won",
    "received",
  ].includes(normalizeStatus(status));

/* ============================================================= */
/* STATUS */
/* ============================================================= */

const statusLabel = (status) => {
  const value = String(status || "unknown")
    .replace(/_/g, " ")
    .trim();

  if (!value) return "Unknown";

  return value.charAt(0).toUpperCase() + value.slice(1);
};

const statusClasses = (status) => {
  const normalized = normalizeStatus(status);

  if (
    [
      "paid",
      "completed",
      "delivered",
      "accepted",
      "received",
      "won",
      "closed",
    ].includes(normalized)
  ) {
    return "border-emerald-400/15 bg-emerald-400/[0.08] text-emerald-300";
  }

  if (
    [
      "pending",
      "partial",
      "partially_delivered",
      "processing",
      "confirmed",
      "sent",
      "approved",
    ].includes(normalized)
  ) {
    return "border-blue-400/15 bg-blue-400/[0.08] text-blue-300";
  }

  if (
    [
      "cancelled",
      "canceled",
      "rejected",
      "expired",
      "lost",
    ].includes(normalized)
  ) {
    return "border-red-400/15 bg-red-400/[0.08] text-red-300";
  }

  if (
    ["draft", "unpaid"].includes(normalized)
  ) {
    return "border-amber-400/15 bg-amber-400/[0.08] text-amber-300";
  }

  return "border-white/10 bg-white/[0.035] text-gray-500";
};

/* ============================================================= */
/* DASHBOARD */
/* ============================================================= */

function Dashboard() {
  const navigate = useNavigate();

  const [dashboard, setDashboard] = useState(
    EMPTY_DASHBOARD
  );

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errors, setErrors] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);

  /* =========================================================== */
  /* FETCH */
/* =========================================================== */

  const fetchDashboard = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setErrors([]);

      const requests = [
        ["company", "/companies/me"],
        [
          "branches",
          "/branches?status=active&limit=100",
        ],
        ["users", "/users?page=1&limit=100"],
        [
          "customers",
          "/customers?status=active&limit=100",
        ],
        [
          "vendors",
          "/vendors?status=active&limit=100",
        ],
        [
          "products",
          "/products?status=active&limit=100",
        ],
        ["inventory", "/inventory?limit=1000"],
        [
          "purchases",
          "/purchases?page=1&limit=100",
        ],
        ["sales", "/sales?page=1&limit=100"],
        ["salesSummary", "/sales/summary"],
        [
          "quotations",
          "/quotations?page=1&limit=100",
        ],
        [
          "quotationSummary",
          "/quotations/summary",
        ],
        [
          "salesOrders",
          "/salesorder?page=1&limit=100",
        ],
        [
          "salesOrderSummary",
          "/salesorder/summary",
        ],
      ];

      const results = await Promise.allSettled(
        requests.map(([, path]) =>
          api.get(path)
        )
      );

      const next = {
        ...EMPTY_DASHBOARD,
        totals: {
          ...EMPTY_DASHBOARD.totals,
        },
      };

      const failed = [];

      results.forEach((result, index) => {
        const [key] = requests[index];

        if (result.status === "fulfilled") {
          const response = result.value;

          if (
            key === "company" ||
            key === "salesSummary" ||
            key === "quotationSummary" ||
            key === "salesOrderSummary"
          ) {
            next[key] = getObject(response);
          } else {
            const array = getArray(response);

            next[key] = array;

            next.totals[key] = getTotal(
              response,
              array
            );
          }
        } else {
          failed.push({
            key,
            error: result.reason,
          });
        }
      });

      setDashboard(next);
      setErrors(failed);
      setLastUpdated(new Date());

      setLoading(false);
      setRefreshing(false);
    },
    []
  );

  useEffect(() => {
    fetchDashboard(false);
  }, [fetchDashboard]);

  /* =========================================================== */
  /* COMPANY */
/* =========================================================== */

  const company = dashboard.company;

  const currency =
    company?.currency ||
    company?.defaultCurrency ||
    "INR";

  const companyName =
    company?.name ||
    company?.legalName ||
    "Ready Tech Solutions";

  const companyInitials =
    companyName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0])
      .join("")
      .toUpperCase() || "RT";

  /* =========================================================== */
  /* REVENUE */
/* =========================================================== */

  const revenue = useMemo(() => {
    return dashboard.sales
      .filter(
        (sale) =>
          !isCancelled(sale?.status)
      )
      .reduce(
        (total, sale) =>
          total + getAmount(sale),
        0
      );
  }, [dashboard.sales]);

  const completedRevenue = useMemo(() => {
    return dashboard.sales
      .filter((sale) =>
        isCompleted(sale?.status)
      )
      .reduce(
        (total, sale) =>
          total + getAmount(sale),
        0
      );
  }, [dashboard.sales]);

  const outstanding = useMemo(() => {
    return dashboard.sales
      .filter(
        (sale) =>
          !isCancelled(sale?.status)
      )
      .reduce(
        (total, sale) =>
          total + getBalance(sale),
        0
      );
  }, [dashboard.sales]);

  /* =========================================================== */
  /* INVENTORY */
/* =========================================================== */

  const lowStockItems = useMemo(() => {
    return dashboard.inventory.filter(
      (item) => {
        const quantity = getQuantity(item);
        const reorder =
          getReorderLevel(item);

        return (
          reorder > 0 &&
          quantity <= reorder
        );
      }
    );
  }, [dashboard.inventory]);

  const outOfStockItems = useMemo(() => {
    return dashboard.inventory.filter(
      (item) =>
        getQuantity(item) <= 0
    );
  }, [dashboard.inventory]);

  const healthyStockItems = useMemo(() => {
    return Math.max(
      0,
      dashboard.inventory.length -
        lowStockItems.length
    );
  }, [
    dashboard.inventory.length,
    lowStockItems.length,
  ]);

  const inventoryHealth = useMemo(() => {
    if (!dashboard.inventory.length) {
      return 0;
    }

    return Math.round(
      (healthyStockItems /
        dashboard.inventory.length) *
        100
    );
  }, [
    dashboard.inventory.length,
    healthyStockItems,
  ]);

  /* =========================================================== */
  /* SALES STATUS */
/* =========================================================== */

  const salesStats = useMemo(() => {
    const stats = {
      draft: 0,
      confirmed: 0,
      processing: 0,
      completed: 0,
      cancelled: 0,
    };

    dashboard.sales.forEach((sale) => {
      const status = normalizeStatus(
        sale?.status
      );

      if (status === "draft") {
        stats.draft += 1;
      } else if (status === "confirmed") {
        stats.confirmed += 1;
      } else if (status === "processing") {
        stats.processing += 1;
      } else if (isCompleted(status)) {
        stats.completed += 1;
      } else if (isCancelled(status)) {
        stats.cancelled += 1;
      }
    });

    return stats;
  }, [dashboard.sales]);

  /* =========================================================== */
  /* SALES ORDER STATUS */
/* =========================================================== */

  const salesOrderStats = useMemo(() => {
    const stats = {
      draft: 0,
      confirmed: 0,
      processing: 0,
      partially_delivered: 0,
      delivered: 0,
      cancelled: 0,
      closed: 0,
    };

    dashboard.salesOrders.forEach(
      (order) => {
        const status =
          normalizeStatus(
            order?.status
          );

        if (
          Object.prototype.hasOwnProperty.call(
            stats,
            status
          )
        ) {
          stats[status] += 1;
        }
      }
    );

    return stats;
  }, [dashboard.salesOrders]);

  /* =========================================================== */
  /* PURCHASE STATUS */
/* =========================================================== */

  const purchaseStats = useMemo(() => {
    const stats = {
      draft: 0,
      pending: 0,
      approved: 0,
      confirmed: 0,
      received: 0,
      cancelled: 0,
    };

    dashboard.purchases.forEach(
      (purchase) => {
        const status =
          normalizeStatus(
            purchase?.status
          );

        if (
          Object.prototype.hasOwnProperty.call(
            stats,
            status
          )
        ) {
          stats[status] += 1;
        }
      }
    );

    return stats;
  }, [dashboard.purchases]);

  /* =========================================================== */
  /* QUOTATION STATUS */
/* =========================================================== */

  const quotationStats = useMemo(() => {
    const stats = {
      draft: 0,
      sent: 0,
      accepted: 0,
      rejected: 0,
      expired: 0,
      cancelled: 0,
    };

    dashboard.quotations.forEach(
      (quotation) => {
        const status =
          normalizeStatus(
            quotation?.status
          );

        if (
          Object.prototype.hasOwnProperty.call(
            stats,
            status
          )
        ) {
          stats[status] += 1;
        }
      }
    );

    return stats;
  }, [dashboard.quotations]);

  /* =========================================================== */
  /* MONTHLY REVENUE */
/* =========================================================== */

  const monthlyRevenue = useMemo(() => {
    const now = new Date();

    const months = [];

    for (
      let index = 5;
      index >= 0;
      index -= 1
    ) {
      const date = new Date(
        now.getFullYear(),
        now.getMonth() - index,
        1
      );

      months.push({
        year: date.getFullYear(),
        month: date.getMonth(),
        label: MONTHS[date.getMonth()],
        value: 0,
      });
    }

    dashboard.sales.forEach((sale) => {
      if (isCancelled(sale?.status)) {
        return;
      }

      const date = getDate(
        sale?.saleDate ||
          sale?.createdAt
      );

      if (!date) return;

      const month = months.find(
        (item) =>
          item.year ===
            date.getFullYear() &&
          item.month ===
            date.getMonth()
      );

      if (month) {
        month.value += getAmount(sale);
      }
    });

    return months;
  }, [dashboard.sales]);

  const maxRevenue = Math.max(
    ...monthlyRevenue.map(
      (item) => item.value
    ),
    1
  );

  /* =========================================================== */
  /* RECENT DATA */
/* =========================================================== */

  const recentSalesOrders = useMemo(() => {
    return [...dashboard.salesOrders]
      .sort((a, b) => {
        const first =
          getDate(
            getDateValue(a)
          )?.getTime() || 0;

        const second =
          getDate(
            getDateValue(b)
          )?.getTime() || 0;

        return second - first;
      })
      .slice(0, 6);
  }, [dashboard.salesOrders]);

  const recentSales = useMemo(() => {
    return [...dashboard.sales]
      .sort((a, b) => {
        const first =
          getDate(
            getDateValue(a)
          )?.getTime() || 0;

        const second =
          getDate(
            getDateValue(b)
          )?.getTime() || 0;

        return second - first;
      })
      .slice(0, 5);
  }, [dashboard.sales]);

  const recentCustomers = useMemo(() => {
    return [...dashboard.customers]
      .sort((a, b) => {
        const first =
          getDate(
            a?.createdAt
          )?.getTime() || 0;

        const second =
          getDate(
            b?.createdAt
          )?.getTime() || 0;

        return second - first;
      })
      .slice(0, 5);
  }, [dashboard.customers]);

  /* =========================================================== */
  /* ACTIVITY */
/* =========================================================== */

  const recentActivities = useMemo(() => {
    const events = [];

    dashboard.sales.forEach(
      (item) => {
        events.push({
          id: `sale-${item?._id}`,
          title: `Sale ${getOrderNumber(
            item
          )}`,
          description: `${getCustomerName(
            item
          )} · ${formatCurrency(
            getAmount(item),
            currency
          )}`,
          time: getDateValue(item),
          icon: CircleDollarSign,
        });
      }
    );

    dashboard.salesOrders.forEach(
      (item) => {
        events.push({
          id: `order-${item?._id}`,
          title: `Sales order ${getOrderNumber(
            item
          )}`,
          description: `${getCustomerName(
            item
          )} · ${formatCurrency(
            getAmount(item),
            currency
          )}`,
          time: getDateValue(item),
          icon: ShoppingCart,
        });
      }
    );

    dashboard.purchases.forEach(
      (item) => {
        events.push({
          id: `purchase-${item?._id}`,
          title: `Purchase ${getOrderNumber(
            item
          )}`,
          description: `${getVendorName(
            item
          )} · ${formatCurrency(
            getAmount(item),
            currency
          )}`,
          time: getDateValue(item),
          icon: ShoppingBag,
        });
      }
    );

    dashboard.quotations.forEach(
      (item) => {
        events.push({
          id: `quotation-${item?._id}`,
          title: `Quotation ${getOrderNumber(
            item
          )}`,
          description: `${getCustomerName(
            item
          )} · ${formatCurrency(
            getAmount(item),
            currency
          )}`,
          time: getDateValue(item),
          icon: FileText,
        });
      }
    );

    dashboard.customers.forEach(
      (item) => {
        events.push({
          id: `customer-${item?._id}`,
          title: "Customer added",
          description:
            item?.name ||
            item?.displayName ||
            item?.companyName ||
            "New customer",
          time: item?.createdAt,
          icon: Users,
        });
      }
    );

    return events
      .filter((item) => item.time)
      .sort((a, b) => {
        const first =
          getDate(
            a.time
          )?.getTime() || 0;

        const second =
          getDate(
            b.time
          )?.getTime() || 0;

        return second - first;
      })
      .slice(0, 8);
  }, [
    dashboard.sales,
    dashboard.salesOrders,
    dashboard.purchases,
    dashboard.quotations,
    dashboard.customers,
    currency,
  ]);

  /* =========================================================== */
  /* QUICK ACTIONS */
/* =========================================================== */

  const quickActions = [
    {
      icon: UserRound,
      title: "Customer",
      description: "Add customer",
      path: "/customers",
    },
    {
      icon: Store,
      title: "Vendor",
      description: "Add vendor",
      path: "/vendors",
    },
    {
      icon: Package,
      title: "Product",
      description: "Add product",
      path: "/products",
    },
    {
      icon: ShoppingBag,
      title: "Purchase",
      description: "New purchase",
      path: "/purchase",
    },
    {
      icon: CircleDollarSign,
      title: "Sales",
      description: "New sale",
      path: "/sales",
    },
    {
      icon: FileText,
      title: "Quotation",
      description: "New quotation",
      path: "/quotations",
    },
    {
      icon: ClipboardList,
      title: "Sales Order",
      description: "New order",
      path: "/salesorder",
    },
    {
      icon: Layers3,
      title: "Inventory",
      description: "Stock control",
      path: "/inventory",
    },
  ];

  /* =========================================================== */
  /* KPI */
/* =========================================================== */

  const kpis = [
    {
      title: "Total Revenue",
      value: formatCurrency(
        revenue,
        currency
      ),
      subtitle: `${formatCurrency(
        completedRevenue,
        currency
      )} completed`,
      icon: CircleDollarSign,
      accent: "cyan",
    },
    {
      title: "Sales Orders",
      value: formatNumber(
        dashboard.totals.salesOrders
      ),
      subtitle: `${formatNumber(
        salesOrderStats.processing
      )} processing`,
      icon: ClipboardList,
      accent: "blue",
    },
    {
      title: "Outstanding",
      value: formatCurrency(
        outstanding,
        currency
      ),
      subtitle: "Receivable balance",
      icon: Wallet,
      accent: "amber",
    },
    {
      title: "Customers",
      value: formatNumber(
        dashboard.totals.customers
      ),
      subtitle: "Active customers",
      icon: Users,
      accent: "violet",
    },
    {
      title: "Products",
      value: formatNumber(
        dashboard.totals.products
      ),
      subtitle: `${formatNumber(
        lowStockItems.length
      )} low stock`,
      icon: Package,
      accent: "emerald",
    },
    {
      title: "Vendors",
      value: formatNumber(
        dashboard.totals.vendors
      ),
      subtitle: "Active vendors",
      icon: Store,
      accent: "blue",
    },
    {
      title: "Purchases",
      value: formatNumber(
        dashboard.totals.purchases
      ),
      subtitle: `${formatNumber(
        purchaseStats.pending
      )} pending`,
      icon: ShoppingBag,
      accent: "orange",
    },
    {
      title: "Quotations",
      value: formatNumber(
        dashboard.totals.quotations
      ),
      subtitle: `${formatNumber(
        quotationStats.sent
      )} awaiting response`,
      icon: FileText,
      accent: "pink",
    },
  ];

  /* =========================================================== */
  /* LOADING */
/* =========================================================== */

  if (loading) {
    return <DashboardSkeleton />;
  }

  /* =========================================================== */
  /* RENDER */
/* =========================================================== */

  return (
    <div className="relative min-h-full w-full overflow-hidden bg-[#05070b] text-white">
      {/* Background atmosphere */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-cyan-500/[0.055] blur-[150px]" />

        <div className="absolute right-[-160px] top-[15%] h-[520px] w-[520px] rounded-full bg-blue-500/[0.05] blur-[160px]" />

        <div className="absolute bottom-[-180px] left-[35%] h-[500px] w-[500px] rounded-full bg-violet-500/[0.035] blur-[170px]" />
      </div>

      {/* Grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.018]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "52px 52px",
        }}
      />

      <main className="relative w-full min-w-0 px-3 py-4 sm:px-5 sm:py-6 md:px-6 lg:px-8 2xl:px-10">
        {/* =================================================== */}
        {/* HEADER */}
        {/* =================================================== */}

        <header className="mb-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.07] text-sm font-bold text-cyan-300 shadow-lg shadow-cyan-500/5">
                {companyInitials}

                <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#05070b] bg-emerald-400" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-400 sm:text-[11px]">
                    {companyName}
                  </p>

                  <span className="hidden rounded-full border border-emerald-400/15 bg-emerald-400/[0.06] px-2 py-0.5 text-[9px] text-emerald-300 sm:inline-flex">
                    LIVE
                  </span>
                </div>

                <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight sm:text-3xl lg:text-4xl">
                  Business Command Center
                </h1>

                <p className="mt-1.5 max-w-3xl text-xs leading-5 text-gray-500 sm:text-sm">
                  Monitor your ERP operations, revenue,
                  inventory and workflow from one workspace.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="hidden items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.025] px-3 py-2.5 text-xs text-gray-500 md:flex">
                <CalendarDays size={14} />

                {new Date().toLocaleDateString(
                  "en-IN",
                  {
                    weekday: "short",
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  }
                )}
              </div>

              <button
                type="button"
                onClick={() =>
                  fetchDashboard(true)
                }
                disabled={refreshing}
                className="flex min-h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-4 text-xs font-medium text-gray-300 transition hover:border-cyan-400/20 hover:bg-cyan-400/[0.05] hover:text-white disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
              >
                <RefreshCw
                  size={14}
                  className={
                    refreshing
                      ? "animate-spin"
                      : ""
                  }
                />

                {refreshing
                  ? "Syncing..."
                  : "Refresh"}
              </button>
            </div>
          </div>

          <div className="mt-6 h-px bg-gradient-to-r from-cyan-400/20 via-white/[0.06] to-transparent" />
        </header>

        {/* =================================================== */}
        {/* ERROR */}
        {/* =================================================== */}

        {errors.length > 0 && (
          <div className="mb-5 rounded-2xl border border-amber-400/15 bg-amber-400/[0.035] p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-400/15 bg-amber-400/[0.06] text-amber-300">
                  <AlertTriangle size={17} />
                </div>

                <div>
                  <p className="text-sm font-medium text-amber-200">
                    Some modules could not be synchronized
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    Available ERP data is still displayed.
                    Failed modules:{" "}
                    {errors
                      .map(
                        (item) => item.key
                      )
                      .join(", ")}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  fetchDashboard(true)
                }
                className="rounded-lg border border-amber-400/15 bg-amber-400/[0.05] px-3 py-2 text-xs font-medium text-amber-300 hover:bg-amber-400/[0.1]"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* =================================================== */}
        {/* WORKSPACE HERO */}
        {/* =================================================== */}

        <section className="mb-5 overflow-hidden rounded-3xl border border-white/[0.09] bg-gradient-to-br from-white/[0.055] via-white/[0.025] to-cyan-500/[0.025] p-5 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-6 lg:p-7">
          <div className="flex flex-col gap-7 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-400/[0.06] px-3 py-1.5 text-[10px] font-medium text-emerald-300 sm:text-xs">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                Workspace operational
              </div>

              <h2 className="mt-4 text-xl font-semibold tracking-tight sm:text-2xl">
                Welcome back 👋
              </h2>

              <p className="mt-1.5 max-w-2xl text-xs leading-6 text-gray-500 sm:text-sm">
                Your live business overview is ready.
                Keep track of sales, customers, inventory
                and daily operations without leaving the
                command center.
              </p>

              <div className="mt-4 flex items-center gap-2 text-[10px] text-gray-600 sm:text-xs">
                <Clock3 size={12} />

                {lastUpdated
                  ? `Last synced ${formatRelativeDate(
                      lastUpdated
                    )}`
                  : "Synchronizing data"}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <HeroMetric
                icon={Building2}
                value={dashboard.totals.branches}
                label="Branches"
              />

              <HeroMetric
                icon={Users}
                value={dashboard.totals.users}
                label="Users"
              />

              <HeroMetric
                icon={Layers3}
                value={dashboard.totals.inventory}
                label="Stock Items"
              />
            </div>
          </div>
        </section>

        {/* =================================================== */}
        {/* KPI GRID */}
        {/* =================================================== */}

        <section className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 min-[1800px]:grid-cols-8">
          {kpis.map((kpi) => (
            <KpiCard
              key={kpi.title}
              {...kpi}
            />
          ))}
        </section>

        {/* =================================================== */}
        {/* MAIN ANALYTICS */}
        {/* =================================================== */}

        <section className="mb-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
          {/* Revenue */}
          <div className="relative min-w-0 overflow-hidden rounded-3xl border border-white/[0.09] bg-white/[0.03] p-5 shadow-xl shadow-black/10 backdrop-blur-xl sm:p-6 xl:col-span-2">
            <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-cyan-400/[0.035] blur-3xl" />

            <div className="relative mb-7 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-400/10 bg-cyan-400/[0.06] text-cyan-300">
                    <TrendingUp size={16} />
                  </div>

                  <div>
                    <h3 className="font-semibold">
                      Revenue Performance
                    </h3>

                    <p className="mt-0.5 text-[10px] text-gray-600 sm:text-xs">
                      Actual sales · rolling 6 months
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-white/[0.08] bg-black/20 px-4 py-2.5">
                <p className="text-[9px] uppercase tracking-wider text-gray-600">
                  Total revenue
                </p>

                <p className="mt-0.5 text-sm font-semibold text-gray-200">
                  {formatCurrency(
                    revenue,
                    currency
                  )}
                </p>
              </div>
            </div>

            <div className="relative flex h-64 items-end gap-2 sm:h-72 sm:gap-4">
              {monthlyRevenue.map(
                (item, index) => {
                  const height =
                    item.value > 0
                      ? Math.max(
                          5,
                          (item.value /
                            maxRevenue) *
                            100
                        )
                      : 3;

                  return (
                    <div
                      key={`${item.year}-${item.month}`}
                      className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2"
                    >
                      <div className="relative flex h-full w-full items-end">
                        <div className="absolute bottom-0 left-1/2 h-px w-full -translate-x-1/2 bg-white/[0.035]" />

                        <div
                          className="relative w-full overflow-hidden rounded-t-xl bg-gradient-to-t from-cyan-500/20 via-cyan-400/55 to-cyan-300/90 transition-all duration-500 group-hover:from-cyan-500/30 group-hover:to-cyan-200"
                          style={{
                            height: `${height}%`,
                          }}
                        >
                          <div className="absolute inset-x-0 top-0 h-px bg-cyan-200/80" />
                        </div>

                        {item.value > 0 && (
                          <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-[#0b1019] px-2.5 py-1.5 text-[10px] text-gray-300 opacity-0 shadow-xl transition group-hover:opacity-100">
                            {formatCurrency(
                              item.value,
                              currency
                            )}
                          </div>
                        )}
                      </div>

                      <span className="text-[10px] text-gray-600 sm:text-xs">
                        {item.label}
                      </span>
                    </div>
                  );
                }
              )}
            </div>
          </div>

          {/* Sales Pipeline */}
          <div className="min-w-0 rounded-3xl border border-white/[0.09] bg-white/[0.03] p-5 shadow-xl shadow-black/10 backdrop-blur-xl sm:p-6">
            <SectionHeader
              icon={Target}
              title="Sales Pipeline"
              subtitle="Current sales workflow"
            />

            <div className="space-y-4">
              <PipelineRow
                label="Draft"
                value={salesStats.draft}
                total={dashboard.sales.length}
              />

              <PipelineRow
                label="Confirmed"
                value={salesStats.confirmed}
                total={dashboard.sales.length}
              />

              <PipelineRow
                label="Processing"
                value={salesStats.processing}
                total={dashboard.sales.length}
              />

              <PipelineRow
                label="Completed"
                value={salesStats.completed}
                total={dashboard.sales.length}
              />

              <PipelineRow
                label="Cancelled"
                value={salesStats.cancelled}
                total={dashboard.sales.length}
              />
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <MiniStat
                icon={CircleDollarSign}
                label="Sales"
                value={
                  dashboard.totals.sales
                }
              />

              <MiniStat
                icon={ClipboardList}
                label="Orders"
                value={
                  dashboard.totals.salesOrders
                }
              />
            </div>
          </div>
        </section>

        {/* =================================================== */}
        {/* OPERATIONS STRIP */}
        {/* =================================================== */}

        <section className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <OperationalTile
            icon={ShoppingBag}
            title="Purchases"
            value={
              dashboard.totals.purchases
            }
            detail={`${purchaseStats.pending} pending`}
            path="/purchase"
            navigate={navigate}
          />

          <OperationalTile
            icon={FileText}
            title="Quotations"
            value={
              dashboard.totals.quotations
            }
            detail={`${quotationStats.sent} awaiting response`}
            path="/quotations"
            navigate={navigate}
          />

          <OperationalTile
            icon={ClipboardList}
            title="Sales Orders"
            value={
              dashboard.totals.salesOrders
            }
            detail={`${salesOrderStats.processing} processing`}
            path="/salesorder"
            navigate={navigate}
          />
        </section>

        {/* =================================================== */}
        {/* SALES ORDERS + ACTIVITY */}
        {/* =================================================== */}

        <section className="mb-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
          <div className="min-w-0 rounded-3xl border border-white/[0.09] bg-white/[0.03] p-5 shadow-xl shadow-black/10 backdrop-blur-xl sm:p-6 xl:col-span-2">
            <SectionHeader
              icon={ClipboardList}
              title="Recent Sales Orders"
              subtitle="Latest orders from this workspace"
              actionLabel="View all"
              onAction={() =>
                navigate("/salesorder")
              }
            />

            {recentSalesOrders.length ===
            0 ? (
              <EmptyState
                icon={ClipboardList}
                title="No sales orders yet"
                description="Created sales orders will appear here automatically."
              />
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[720px]">
                    <thead>
                      <tr className="border-b border-white/[0.07] text-left text-[9px] uppercase tracking-[0.16em] text-gray-600">
                        <th className="pb-3 font-medium">
                          Order
                        </th>

                        <th className="pb-3 font-medium">
                          Customer
                        </th>

                        <th className="pb-3 font-medium">
                          Amount
                        </th>

                        <th className="pb-3 font-medium">
                          Status
                        </th>

                        <th className="pb-3 text-right font-medium">
                          Date
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {recentSalesOrders.map(
                        (order) => (
                          <tr
                            key={
                              order?._id
                            }
                            className="border-b border-white/[0.05] transition hover:bg-white/[0.018] last:border-0"
                          >
                            <td className="py-4 text-sm font-semibold text-gray-300">
                              {getOrderNumber(
                                order
                              )}
                            </td>

                            <td className="max-w-[220px] truncate py-4 text-sm text-gray-500">
                              {getCustomerName(
                                order
                              )}
                            </td>

                            <td className="py-4 text-sm font-medium text-gray-200">
                              {formatCurrency(
                                getAmount(
                                  order
                                ),
                                currency
                              )}
                            </td>

                            <td className="py-4">
                              <StatusBadge
                                status={
                                  order?.status
                                }
                              />
                            </td>

                            <td className="py-4 text-right text-xs text-gray-600">
                              {formatDate(
                                order?.orderDate ||
                                  order?.createdAt
                              )}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="space-y-2.5 md:hidden">
                  {recentSalesOrders.map(
                    (order) => (
                      <div
                        key={
                          order?._id
                        }
                        className="rounded-2xl border border-white/[0.07] bg-black/15 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-200">
                              {getOrderNumber(
                                order
                              )}
                            </p>

                            <p className="mt-1 truncate text-xs text-gray-500">
                              {getCustomerName(
                                order
                              )}
                            </p>
                          </div>

                          <StatusBadge
                            status={
                              order?.status
                            }
                          />
                        </div>

                        <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3">
                          <span className="text-xs text-gray-600">
                            {formatDate(
                              order?.orderDate ||
                                order?.createdAt
                            )}
                          </span>

                          <span className="text-sm font-semibold text-gray-200">
                            {formatCurrency(
                              getAmount(
                                order
                              ),
                              currency
                            )}
                          </span>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </>
            )}
          </div>

          {/* Activity */}
          <div className="min-w-0 rounded-3xl border border-white/[0.09] bg-white/[0.03] p-5 shadow-xl shadow-black/10 backdrop-blur-xl sm:p-6">
            <SectionHeader
              icon={Activity}
              title="Live Activity"
              subtitle="Latest business events"
            />

            {recentActivities.length ===
            0 ? (
              <EmptyState
                icon={Activity}
                title="No recent activity"
                description="Business activity will appear here as records are created."
              />
            ) : (
              <div className="space-y-5">
                {recentActivities.map(
                  (
                    activity,
                    index
                  ) => {
                    const Icon =
                      activity.icon;

                    return (
                      <div
                        key={
                          activity.id
                        }
                        className="flex gap-3"
                      >
                        <div className="relative">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.035] text-cyan-300">
                            <Icon
                              size={15}
                            />
                          </div>

                          {index !==
                            recentActivities.length -
                              1 && (
                            <div className="absolute left-1/2 top-10 h-8 w-px -translate-x-1/2 bg-white/[0.08]" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-gray-300">
                            {
                              activity.title
                            }
                          </p>

                          <p className="mt-1 truncate text-xs text-gray-600">
                            {
                              activity.description
                            }
                          </p>

                          <div className="mt-1.5 flex items-center gap-1.5">
                            <Clock3
                              size={
                                10
                              }
                              className="text-gray-700"
                            />

                            <span className="text-[10px] text-gray-700">
                              {formatRelativeDate(
                                activity.time
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            )}
          </div>
        </section>

        {/* =================================================== */}
        {/* INVENTORY + ALERTS */}
        {/* =================================================== */}

        <section className="mb-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
          {/* Health */}
          <div className="min-w-0 rounded-3xl border border-white/[0.09] bg-white/[0.03] p-5 shadow-xl shadow-black/10 backdrop-blur-xl sm:p-6">
            <SectionHeader
              icon={Package}
              title="Inventory Health"
              subtitle="Current stock position"
              actionLabel="Inventory"
              onAction={() =>
                navigate("/inventory")
              }
            />

            <div className="flex items-center gap-6">
              <HealthRing
                value={
                  inventoryHealth
                }
              />

              <div className="min-w-0 flex-1 space-y-3">
                <HealthRow
                  label="Healthy"
                  value={
                    healthyStockItems
                  }
                  icon={
                    CheckCircle2
                  }
                  type="success"
                />

                <HealthRow
                  label="Low stock"
                  value={
                    lowStockItems.length
                  }
                  icon={
                    AlertTriangle
                  }
                  type="warning"
                />

                <HealthRow
                  label="Out of stock"
                  value={
                    outOfStockItems.length
                  }
                  icon={XCircle}
                  type="danger"
                />
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <MiniStat
                icon={Layers3}
                label="Stock Items"
                value={
                  dashboard
                    .totals
                    .inventory
                }
              />

              <MiniStat
                icon={Package}
                label="Products"
                value={
                  dashboard
                    .totals
                    .products
                }
              />
            </div>
          </div>

          {/* Low stock */}
          <div className="min-w-0 rounded-3xl border border-white/[0.09] bg-white/[0.03] p-5 shadow-xl shadow-black/10 backdrop-blur-xl sm:p-6 xl:col-span-2">
            <SectionHeader
              icon={Bell}
              title="Stock Alerts"
              subtitle="Products requiring attention"
              actionLabel="View inventory"
              onAction={() =>
                navigate("/inventory")
              }
            />

            {lowStockItems.length ===
            0 ? (
              <div className="flex min-h-[185px] flex-col items-center justify-center rounded-2xl border border-emerald-400/10 bg-emerald-400/[0.025] px-5 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.06] text-emerald-300">
                  <CheckCircle2
                    size={21}
                  />
                </div>

                <p className="mt-3 text-sm font-medium text-gray-300">
                  Inventory is healthy
                </p>

                <p className="mt-1 max-w-sm text-xs leading-5 text-gray-600">
                  No inventory records are
                  currently below their
                  configured reorder level.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {lowStockItems
                  .slice(0, 6)
                  .map((item) => {
                    const quantity =
                      getQuantity(
                        item
                      );

                    const reorder =
                      getReorderLevel(
                        item
                      );

                    return (
                      <div
                        key={
                          item?._id
                        }
                        className="rounded-2xl border border-amber-400/10 bg-amber-400/[0.025] p-4 transition hover:border-amber-400/20"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-400/10 bg-amber-400/[0.05] text-amber-300">
                              <Package
                                size={
                                  15
                                }
                              />
                            </div>

                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-gray-300">
                                {getProductName(
                                  item
                                )}
                              </p>

                              <p className="mt-1 truncate text-[10px] text-gray-600">
                                {item?.sku ||
                                  item?.productCode ||
                                  "No SKU"}
                              </p>
                            </div>
                          </div>

                          <span className="shrink-0 rounded-full border border-amber-400/10 bg-amber-400/[0.06] px-2 py-1 text-[9px] font-medium text-amber-300">
                            Attention
                          </span>
                        </div>

                        <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3">
                          <span className="text-xs text-gray-600">
                            Current
                          </span>

                          <span className="text-sm font-semibold text-amber-300">
                            {formatNumber(
                              quantity
                            )}
                          </span>

                          <span className="text-[10px] text-gray-700">
                            Reorder{" "}
                            {formatNumber(
                              reorder
                            )}
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </section>

        {/* =================================================== */}
        {/* RECENT SALES + CUSTOMERS */}
        {/* =================================================== */}

        <section className="mb-5 grid grid-cols-1 gap-5 md:grid-cols-2">
          {/* Sales */}
          <div className="min-w-0 rounded-3xl border border-white/[0.09] bg-white/[0.03] p-5 shadow-xl shadow-black/10 backdrop-blur-xl sm:p-6">
            <SectionHeader
              icon={CircleDollarSign}
              title="Recent Sales"
              subtitle="Latest sales transactions"
              actionLabel="View sales"
              onAction={() =>
                navigate("/sales")
              }
            />

            {recentSales.length ===
            0 ? (
              <EmptyState
                icon={CircleDollarSign}
                title="No sales yet"
                description="Sales transactions will appear here once created."
              />
            ) : (
              <div className="space-y-2">
                {recentSales.map(
                  (sale) => (
                    <div
                      key={
                        sale?._id
                      }
                      className="group flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-black/15 p-3 transition hover:border-cyan-400/10 hover:bg-white/[0.025]"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-400/10 bg-cyan-400/[0.05] text-cyan-300">
                        <CircleDollarSign
                          size={
                            15
                          }
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-300">
                          {getOrderNumber(
                            sale
                          )}
                        </p>

                        <p className="mt-0.5 truncate text-xs text-gray-600">
                          {getCustomerName(
                            sale
                          )}
                        </p>
                      </div>

                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold text-gray-200">
                          {formatCurrency(
                            getAmount(
                              sale
                            ),
                            currency
                          )}
                        </p>

                        <div className="mt-1">
                          <StatusBadge
                            status={
                              sale?.status
                            }
                          />
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </div>

          {/* Customers */}
          <div className="min-w-0 rounded-3xl border border-white/[0.09] bg-white/[0.03] p-5 shadow-xl shadow-black/10 backdrop-blur-xl sm:p-6">
            <SectionHeader
              icon={Users}
              title="Recent Customers"
              subtitle="Latest customer records"
              actionLabel="View customers"
              onAction={() =>
                navigate(
                  "/customers"
                )
              }
            />

            {recentCustomers.length ===
            0 ? (
              <EmptyState
                icon={Users}
                title="No customers yet"
                description="New customer records will appear here."
              />
            ) : (
              <div className="space-y-2">
                {recentCustomers.map(
                  (customer) => {
                    const name =
                      customer?.name ||
                      customer?.displayName ||
                      customer?.companyName ||
                      "Unnamed customer";

                    const email =
                      customer?.email ||
                      customer?.contactEmail ||
                      "No email";

                    return (
                      <div
                        key={
                          customer?._id
                        }
                        className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-black/15 p-3 transition hover:border-violet-400/10 hover:bg-white/[0.025]"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-violet-400/10 bg-violet-400/[0.05] text-violet-300">
                          <UserRound
                            size={
                              15
                            }
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-gray-300">
                            {name}
                          </p>

                          <p className="mt-0.5 truncate text-xs text-gray-600">
                            {email}
                          </p>
                        </div>

                        <span className="shrink-0 text-[10px] text-gray-700">
                          {formatRelativeDate(
                            customer?.createdAt
                          )}
                        </span>
                      </div>
                    );
                  }
                )}
              </div>
            )}
          </div>
        </section>

        {/* =================================================== */}
        {/* WORKSPACE + QUICK ACTIONS */}
        {/* =================================================== */}

        <section className="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* Workspace */}
          <div className="min-w-0 rounded-3xl border border-white/[0.09] bg-white/[0.03] p-5 shadow-xl shadow-black/10 backdrop-blur-xl sm:p-6">
            <div className="mb-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-400">
                Workspace
              </p>

              <div className="mt-2 flex items-center gap-2">
                <Building2
                  size={18}
                  className="text-gray-500"
                />

                <h3 className="truncate text-lg font-semibold">
                  {companyName}
                </h3>
              </div>
            </div>

            <div className="space-y-4">
              <InfoRow
                label="Legal Name"
                value={
                  company?.legalName ||
                  companyName
                }
              />

              <InfoRow
                label="Email"
                value={
                  company?.email ||
                  "—"
                }
              />

              <InfoRow
                label="Phone"
                value={
                  company?.phone ||
                  "—"
                }
              />

              <InfoRow
                label="GST Number"
                value={
                  company?.gstNumber ||
                  company?.gstin ||
                  "—"
                }
              />

              <InfoRow
                label="Currency"
                value={currency}
              />

              <InfoRow
                label="Status"
                value={
                  company?.status ||
                  "active"
                }
              />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="min-w-0 rounded-3xl border border-white/[0.09] bg-white/[0.03] p-5 shadow-xl shadow-black/10 backdrop-blur-xl sm:p-6 lg:col-span-2">
            <SectionHeader
              icon={Zap}
              title="Quick Actions"
              subtitle="Jump directly into common ERP operations"
            />

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {quickActions.map(
                (action) => {
                  const Icon =
                    action.icon;

                  return (
                    <button
                      key={
                        action.title
                      }
                      type="button"
                      onClick={() =>
                        navigate(
                          action.path
                        )
                      }
                      className="group min-w-0 rounded-2xl border border-white/[0.08] bg-black/15 p-4 text-left transition duration-300 hover:-translate-y-0.5 hover:border-cyan-400/20 hover:bg-cyan-400/[0.035]"
                    >
                      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.035] text-gray-500 transition group-hover:border-cyan-400/15 group-hover:text-cyan-300">
                        <Icon
                          size={16}
                        />
                      </div>

                      <p className="truncate text-xs font-medium text-gray-400 transition group-hover:text-gray-200">
                        {action.title}
                      </p>

                      <p className="mt-1 truncate text-[10px] text-gray-700">
                        {
                          action.description
                        }
                      </p>
                    </button>
                  );
                }
              )}
            </div>
          </div>
        </section>

        {/* =================================================== */}
        {/* FOOTER */}
        {/* =================================================== */}

        <footer className="border-t border-white/[0.06] py-6">
          <div className="flex flex-col gap-2 text-[10px] text-gray-700 sm:flex-row sm:items-center sm:justify-between sm:text-xs">
            <p>
              ©{" "}
              {new Date().getFullYear()}{" "}
              Ready Tech Solutions.
              All rights reserved.
            </p>

            <div className="flex items-center gap-2">
              <span>ERP Platform</span>

              <span className="text-gray-800">
                •
              </span>

              <span>
                {formatNumber(
                  dashboard.totals
                    .branches
                )}{" "}
                branches
              </span>

              <span className="text-gray-800">
                •
              </span>

              <span>
                {formatNumber(
                  dashboard.totals.users
                )}{" "}
                users
              </span>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}

/* ============================================================= */
/* KPI CARD */
/* ============================================================= */

const KpiCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  accent = "cyan",
}) => {
  const accentClasses = {
    cyan: "text-cyan-300 bg-cyan-400/[0.07] border-cyan-400/10",
    blue: "text-blue-300 bg-blue-400/[0.07] border-blue-400/10",
    amber: "text-amber-300 bg-amber-400/[0.07] border-amber-400/10",
    violet:
      "text-violet-300 bg-violet-400/[0.07] border-violet-400/10",
    emerald:
      "text-emerald-300 bg-emerald-400/[0.07] border-emerald-400/10",
    orange:
      "text-orange-300 bg-orange-400/[0.07] border-orange-400/10",
    pink: "text-pink-300 bg-pink-400/[0.07] border-pink-400/10",
  };

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/[0.09] bg-white/[0.03] p-4 shadow-xl shadow-black/10 backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:border-white/[0.15] hover:bg-white/[0.045] sm:p-5">
      <div className="absolute right-[-25px] top-[-25px] h-20 w-20 rounded-full bg-white/[0.015] blur-2xl transition group-hover:bg-white/[0.025]" />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[10px] font-medium uppercase tracking-wider text-gray-600">
            {title}
          </p>

          <p className="mt-2 truncate text-xl font-semibold tracking-tight text-gray-100 sm:text-2xl">
            {value}
          </p>
        </div>

        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
            accentClasses[
              accent
            ] ||
            accentClasses.cyan
          }`}
        >
          <Icon size={16} />
        </div>
      </div>

      <div className="relative mt-4 flex min-w-0 items-center gap-1.5">
        <span className="truncate text-[10px] text-gray-600">
          {subtitle}
        </span>
      </div>
    </div>
  );
};

/* ============================================================= */
/* HERO METRIC */
/* ============================================================= */

const HeroMetric = ({
  icon: Icon,
  value,
  label,
}) => {
  return (
    <div className="min-w-0 rounded-2xl border border-white/[0.08] bg-black/20 px-2 py-3 text-center sm:min-w-[105px] sm:px-5">
      <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.03] text-gray-500">
        <Icon size={14} />
      </div>

      <p className="mt-2 text-lg font-semibold text-gray-200">
        {formatNumber(value)}
      </p>

      <p className="mt-0.5 truncate text-[9px] uppercase tracking-wider text-gray-600">
        {label}
      </p>
    </div>
  );
};

/* ============================================================= */
/* SECTION HEADER */
/* ============================================================= */

const SectionHeader = ({
  icon: Icon,
  title,
  subtitle,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="mb-5 flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-2.5">
        {Icon && (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-cyan-300">
            <Icon size={15} />
          </div>
        )}

        <div className="min-w-0">
          <h3 className="truncate font-semibold text-gray-200">
            {title}
          </h3>

          {subtitle && (
            <p className="mt-1 truncate text-xs text-gray-600">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {actionLabel &&
        onAction && (
          <button
            type="button"
            onClick={onAction}
            className="flex shrink-0 items-center gap-1 text-[10px] font-medium text-cyan-400 transition hover:text-cyan-300 sm:text-xs"
          >
            {actionLabel}
            <ChevronRight
              size={13}
            />
          </button>
        )}
    </div>
  );
};

/* ============================================================= */
/* PIPELINE ROW */
/* ============================================================= */

const PipelineRow = ({
  label,
  value,
  total,
}) => {
  const safeTotal =
    Number(total) > 0
      ? Number(total)
      : 1;

  const percentage = Math.min(
    100,
    (Number(value || 0) /
      safeTotal) *
      100
  );

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <span className="text-xs text-gray-500">
          {label}
        </span>

        <span className="text-xs font-medium text-gray-300">
          {formatNumber(value)}
        </span>
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-500/80 to-blue-400/80 transition-all duration-500"
          style={{
            width: `${percentage}%`,
          }}
        />
      </div>
    </div>
  );
};

/* ============================================================= */
/* OPERATIONAL TILE */
/* ============================================================= */

const OperationalTile = ({
  icon: Icon,
  title,
  value,
  detail,
  path,
  navigate,
}) => {
  return (
    <button
      type="button"
      onClick={() =>
        navigate(path)
      }
      className="group flex items-center justify-between rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 text-left transition hover:border-cyan-400/15 hover:bg-cyan-400/[0.025]"
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.035] text-cyan-300">
          <Icon size={17} />
        </div>

        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-300">
            {title}
          </p>

          <p className="mt-0.5 truncate text-[10px] text-gray-600">
            {detail}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-lg font-semibold text-gray-200">
          {formatNumber(value)}
        </span>

        <ChevronRight
          size={15}
          className="text-gray-700 transition group-hover:translate-x-0.5 group-hover:text-cyan-300"
        />
      </div>
    </button>
  );
};

/* ============================================================= */
/* STATUS BADGE */
/* ============================================================= */

const StatusBadge = ({
  status,
}) => {
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-[9px] font-medium sm:text-[10px] ${statusClasses(
        status
      )}`}
    >
      {statusLabel(status)}
    </span>
  );
};

/* ============================================================= */
/* MINI STAT */
/* ============================================================= */

const MiniStat = ({
  label,
  value,
  icon: Icon,
}) => {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-black/15 p-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-gray-500">
        <Icon size={14} />
      </div>

      <div className="min-w-0">
        <p className="truncate text-[10px] text-gray-600">
          {label}
        </p>

        <p className="mt-0.5 text-sm font-semibold text-gray-300">
          {formatNumber(value)}
        </p>
      </div>
    </div>
  );
};

/* ============================================================= */
/* HEALTH RING */
/* ============================================================= */

const HealthRing = ({
  value,
}) => {
  const safeValue = Math.max(
    0,
    Math.min(
      100,
      Number(value) || 0
    )
  );

  const radius = 46;
  const circumference =
    2 * Math.PI * radius;

  const offset =
    circumference -
    (safeValue / 100) *
      circumference;

  return (
    <div className="relative h-32 w-32 shrink-0">
      <svg
        className="h-full w-full -rotate-90"
        viewBox="0 0 120 120"
      >
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="9"
        />

        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="currentColor"
          className="text-cyan-400"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={
            circumference
          }
          strokeDashoffset={
            offset
          }
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-semibold">
          {safeValue}%
        </span>

        <span className="text-[9px] uppercase tracking-wider text-gray-600">
          Healthy
        </span>
      </div>
    </div>
  );
};

/* ============================================================= */
/* HEALTH ROW */
/* ============================================================= */

const HealthRow = ({
  label,
  value,
  icon: Icon,
  type,
}) => {
  const styles = {
    success:
      "text-emerald-300",
    warning:
      "text-amber-300",
    danger:
      "text-red-300",
  };

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2">
        <Icon
          size={13}
          className={
            styles[type] ||
            styles.success
          }
        />

        <span className="truncate text-xs text-gray-500">
          {label}
        </span>
      </div>

      <span className="text-xs font-semibold text-gray-300">
        {formatNumber(value)}
      </span>
    </div>
  );
};

/* ============================================================= */
/* INFO ROW */
/* ============================================================= */

const InfoRow = ({
  label,
  value,
}) => {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/[0.05] pb-3 last:border-0 last:pb-0">
      <span className="shrink-0 text-xs text-gray-600">
        {label}
      </span>

      <span className="max-w-[65%] truncate text-right text-xs font-medium text-gray-300">
        {value || "—"}
      </span>
    </div>
  );
};

/* ============================================================= */
/* EMPTY STATE */
/* ============================================================= */

const EmptyState = ({
  icon: Icon,
  title,
  description,
}) => {
  return (
    <div className="flex min-h-[180px] flex-col items-center justify-center rounded-2xl border border-white/[0.06] bg-black/10 px-5 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-gray-600">
        <Icon size={19} />
      </div>

      <p className="mt-3 text-sm font-medium text-gray-400">
        {title}
      </p>

      <p className="mt-1 max-w-xs text-xs leading-5 text-gray-700">
        {description}
      </p>
    </div>
  );
};

/* ============================================================= */
/* LOADING SKELETON */
/* ============================================================= */

const DashboardSkeleton =
  () => {
    return (
      <div className="min-h-full w-full bg-[#05070b] px-3 py-4 sm:px-5 sm:py-6 md:px-6 lg:px-8 2xl:px-10">
        <div className="w-full animate-pulse">
          <div className="mb-6 flex items-center justify-between border-b border-white/[0.06] pb-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-white/[0.05]" />

              <div className="space-y-2">
                <div className="h-3 w-40 rounded bg-white/[0.05]" />

                <div className="h-8 w-72 rounded bg-white/[0.06]" />

                <div className="h-3 w-96 max-w-[65vw] rounded bg-white/[0.035]" />
              </div>
            </div>

            <div className="hidden h-10 w-28 rounded-xl bg-white/[0.05] sm:block" />
          </div>

          <div className="mb-5 h-36 rounded-3xl border border-white/[0.06] bg-white/[0.025]" />

          <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 min-[1800px]:grid-cols-8">
            {Array.from({
              length: 8,
            }).map(
              (_, index) => (
                <div
                  key={index}
                  className="h-32 rounded-2xl border border-white/[0.06] bg-white/[0.025]"
                />
              )
            )}
          </div>

          <div className="mb-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
            <div className="h-[370px] rounded-3xl border border-white/[0.06] bg-white/[0.025] xl:col-span-2" />

            <div className="h-[370px] rounded-3xl border border-white/[0.06] bg-white/[0.025]" />
          </div>

          <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-3">
            {Array.from({
              length: 3,
            }).map(
              (_, index) => (
                <div
                  key={index}
                  className="h-20 rounded-2xl border border-white/[0.06] bg-white/[0.025]"
                />
              )
            )}
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
            <div className="h-[350px] rounded-3xl border border-white/[0.06] bg-white/[0.025] xl:col-span-2" />

            <div className="h-[350px] rounded-3xl border border-white/[0.06] bg-white/[0.025]" />
          </div>
        </div>
      </div>
    );
  };

export default Dashboard;