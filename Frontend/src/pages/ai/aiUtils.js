import { useEffect, useState } from "react";
import api from "../../services/api";
import { getApiErrorMessage } from "../../utils/apiError";

const ACTIVITY_KEY = "erp_ai_activity";

export const readActivity = () => {
  try {
    return JSON.parse(sessionStorage.getItem(ACTIVITY_KEY) || "[]");
  } catch {
    return [];
  }
};

export const logActivity = (type, detail) => {
  const next = [
    { type, detail, at: new Date().toISOString() },
    ...readActivity(),
  ].slice(0, 20);
  sessionStorage.setItem(ACTIVITY_KEY, JSON.stringify(next));
};

export const humanize = (value) =>
  String(value ?? "unknown")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

export const formatNumber = (value) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(
    Number(value) || 0
  );

export const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
};

// [{ _id, count }] or { key: count } -> [{ label, count }]
export const toCounts = (value) => {
  if (Array.isArray(value)) {
    return value
      .filter((item) => item && typeof item === "object")
      .map((item) => ({
        label: humanize(
          typeof item._id === "object" && item._id !== null
            ? Object.values(item._id).join(" / ")
            : item._id
        ),
        count: Number(item.count) || 0,
      }));
  }
  if (value && typeof value === "object") {
    return Object.entries(value)
      .filter(([, count]) => typeof count === "number")
      .map(([label, count]) => ({ label: humanize(label), count }));
  }
  return [];
};

// Flatten numeric/scalar report values into readable key points.
export const flattenReport = (data, prefix = "", depth = 0, out = []) => {
  if (!data || typeof data !== "object" || depth > 3) return out;

  Object.entries(data).forEach(([key, value]) => {
    if (["period", "generatedAt", "_id"].includes(key)) return;
    const label = prefix ? `${prefix} › ${humanize(key)}` : humanize(key);

    if (typeof value === "number") {
      out.push({ label, value: formatNumber(value) });
    } else if (Array.isArray(value)) {
      const counts = toCounts(value);
      if (counts.length && counts.length === value.length) {
        counts.forEach((item) =>
          out.push({ label: `${label} › ${item.label}`, value: formatNumber(item.count) })
        );
      } else {
        out.push({ label: `${label} (records)`, value: formatNumber(value.length) });
      }
    } else if (value && typeof value === "object") {
      flattenReport(value, label, depth + 1, out);
    }
  });

  return out;
};

export const useApi = (url) => {
  const [state, setState] = useState({ data: null, loading: Boolean(url), error: "" });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!url) return undefined;
    let cancelled = false;

    api
      .get(url)
      .then((response) => {
        if (!cancelled) {
          setState({ data: response?.data?.data ?? null, loading: false, error: "" });
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setState({
            data: null,
            loading: false,
            error: getApiErrorMessage(err, "Unable to load data."),
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [url, reloadKey]);

  const reload = () => {
    setState((previous) => ({ ...previous, loading: true, error: "" }));
    setReloadKey((key) => key + 1);
  };

  return { ...state, reload };
};

export const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
    Number(value) || 0
  );

export const monthlySeries = (monthly) =>
  (Array.isArray(monthly) ? monthly : [])
    .filter((item) => item?._id?.year && item?._id?.month)
    .map((item) => ({
      label: new Date(item._id.year, item._id.month - 1).toLocaleString("en-IN", {
        month: "short",
        year: "2-digit",
      }),
      total: Number(item.total) || 0,
      count: Number(item.count) || 0,
    }));
