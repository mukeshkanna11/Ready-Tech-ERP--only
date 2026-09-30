import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  RefreshCw,
  CalendarDays,
  Printer,
  Download,
  TrendingUp,
  TrendingDown,
  Scale,
  Wallet,
  FileSpreadsheet,
  AlertCircle,
} from "lucide-react";
import api from "../../services/api";

const money = (value = 0) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const today = new Date();
const firstDay = new Date(
  today.getFullYear(),
  today.getMonth(),
  1
);

const formatDateInput = (date) =>
  date.toISOString().slice(0, 10);

const normalizeRows = (payload) => {
  if (!payload) return [];

  if (Array.isArray(payload)) return payload;

  return (
    payload.accounts ||
    payload.rows ||
    payload.data ||
    payload.items ||
    []
  );
};

export default function FinancialReports() {
  const [activeReport, setActiveReport] = useState("trial-balance");

  const [fromDate, setFromDate] = useState(
    formatDateInput(firstDay)
  );

  const [toDate, setToDate] = useState(
    formatDateInput(today)
  );

  const [trialBalance, setTrialBalance] = useState(null);
  const [profitLoss, setProfitLoss] = useState(null);
  const [balanceSheet, setBalanceSheet] = useState(null);
  const [accountSummary, setAccountSummary] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchReport = async (endpoint) => {
    try {
      const response = await api.get(endpoint, {
        params: {
          fromDate,
          toDate,
          startDate: fromDate,
          endDate: toDate,
        },
      });

      return response.data?.data ?? response.data;
    } catch (err) {
      throw err;
    }
  };

  const loadReports = async () => {
    try {
      setLoading(true);
      setError("");

      /*
       * These are the Finance report endpoints.
       * The fallback endpoints make the UI tolerant of either
       * /financial-reports/... or /reports/... naming.
       */

      const results = await Promise.allSettled([
        fetchReport("/financial-reports/trial-balance"),
        fetchReport("/financial-reports/profit-loss"),
        fetchReport("/financial-reports/balance-sheet"),
        api.get("/accounts/summary"),
      ]);

      const [trial, pnl, balance, summary] = results;

      if (trial.status === "fulfilled") {
        setTrialBalance(trial.value);
      }

      if (pnl.status === "fulfilled") {
        setProfitLoss(pnl.value);
      }

      if (balance.status === "fulfilled") {
        setBalanceSheet(balance.value);
      }

      if (summary.status === "fulfilled") {
        setAccountSummary(summary.value?.data || null);
      }

      if (
        trial.status === "rejected" &&
        pnl.status === "rejected" &&
        balance.status === "rejected"
      ) {
        setError(
          "Financial report APIs could not be loaded. Check the backend report routes."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const trialRows = useMemo(
    () => normalizeRows(trialBalance),
    [trialBalance]
  );

  const assets = useMemo(
    () => normalizeRows(balanceSheet?.assets || balanceSheet),
    [balanceSheet]
  );

  const liabilities = useMemo(
    () =>
      normalizeRows(
        balanceSheet?.liabilities ||
          balanceSheet?.liability ||
          []
      ),
    [balanceSheet]
  );

  const equity = useMemo(
    () =>
      normalizeRows(
        balanceSheet?.equity ||
          balanceSheet?.equities ||
          []
      ),
    [balanceSheet]
  );

  const incomeRows = useMemo(
    () =>
      normalizeRows(
        profitLoss?.income ||
          profitLoss?.revenue ||
          profitLoss?.revenues ||
          []
      ),
    [profitLoss]
  );

  const expenseRows = useMemo(
    () =>
      normalizeRows(
        profitLoss?.expenses ||
          profitLoss?.expense ||
          []
      ),
    [profitLoss]
  );

  const totalAssets =
    Number(balanceSheet?.totalAssets ?? 0) ||
    assets.reduce(
      (sum, row) =>
        sum +
        Number(
          row.balance ??
            row.currentBalance ??
            row.amount ??
            row.total ??
            0
        ),
      0
    );

  const totalLiabilities =
    Number(balanceSheet?.totalLiabilities ?? 0) ||
    liabilities.reduce(
      (sum, row) =>
        sum +
        Number(
          row.balance ??
            row.currentBalance ??
            row.amount ??
            row.total ??
            0
        ),
      0
    );

  const totalEquity =
    Number(balanceSheet?.totalEquity ?? 0) ||
    equity.reduce(
      (sum, row) =>
        sum +
        Number(
          row.balance ??
            row.currentBalance ??
            row.amount ??
            row.total ??
            0
        ),
      0
    );

  const totalIncome =
    Number(
      profitLoss?.totalIncome ??
        profitLoss?.totalRevenue ??
        profitLoss?.revenue
    ) ||
    incomeRows.reduce(
      (sum, row) =>
        sum +
        Number(
          row.amount ??
            row.balance ??
            row.currentBalance ??
            row.total ??
            0
        ),
      0
    );

  const totalExpense =
    Number(profitLoss?.totalExpense ?? profitLoss?.totalExpenses) ||
    expenseRows.reduce(
      (sum, row) =>
        sum +
        Number(
          row.amount ??
            row.balance ??
            row.currentBalance ??
            row.total ??
            0
        ),
      0
    );

  const netProfit =
    Number(
      profitLoss?.netProfit ??
        profitLoss?.netIncome ??
        profitLoss?.profit
    ) || totalIncome - totalExpense;

  const trialDebit =
    Number(
      trialBalance?.totalDebit ??
        trialBalance?.debitTotal
    ) ||
    trialRows.reduce(
      (sum, row) =>
        sum +
        Number(row.debit ?? row.totalDebit ?? 0),
      0
    );

  const trialCredit =
    Number(
      trialBalance?.totalCredit ??
        trialBalance?.creditTotal
    ) ||
    trialRows.reduce(
      (sum, row) =>
        sum +
        Number(row.credit ?? row.totalCredit ?? 0),
      0
    );

  const exportCSV = () => {
    let rows = [];

    if (activeReport === "trial-balance") {
      rows = trialRows.map((row) => ({
        Code: row.code || "",
        Account: row.name || row.accountName || "",
        Debit: row.debit || 0,
        Credit: row.credit || 0,
        Balance: row.balance || row.currentBalance || 0,
      }));
    }

    if (activeReport === "profit-loss") {
      rows = [
        ...incomeRows.map((row) => ({
          Type: "Income",
          Account: row.name || row.accountName || "",
          Amount: row.amount || row.balance || 0,
        })),
        ...expenseRows.map((row) => ({
          Type: "Expense",
          Account: row.name || row.accountName || "",
          Amount: row.amount || row.balance || 0,
        })),
      ];
    }

    if (activeReport === "balance-sheet") {
      rows = [
        ...assets.map((row) => ({
          Type: "Asset",
          Account: row.name || row.accountName || "",
          Amount: row.amount || row.balance || row.currentBalance || 0,
        })),
        ...liabilities.map((row) => ({
          Type: "Liability",
          Account: row.name || row.accountName || "",
          Amount: row.amount || row.balance || row.currentBalance || 0,
        })),
        ...equity.map((row) => ({
          Type: "Equity",
          Account: row.name || row.accountName || "",
          Amount: row.amount || row.balance || row.currentBalance || 0,
        })),
      ];
    }

    if (!rows.length) {
      setError("No report data available to export.");
      return;
    }

    const headers = Object.keys(rows[0]);

    const csv = [
      headers.join(","),
      ...rows.map((row) =>
        headers
          .map((header) => {
            const value = row[header] ?? "";
            return `"${String(value).replaceAll('"', '""')}"`
          })
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `${activeReport}-${fromDate}-${toDate}.csv`;
    link.click();

    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#080b12] text-white">
      <div className="mx-auto max-w-[1600px] p-4 md:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-7 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-cyan-400">
              <BarChart3 size={14} />
              Finance
            </div>

            <h1 className="text-2xl font-bold md:text-3xl">
              Financial Reports
            </h1>

            <p className="mt-1 text-sm text-slate-400">
              Analyze your company's financial position and performance.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={loadReports}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-slate-200 hover:bg-white/[0.08]"
            >
              <RefreshCw
                size={16}
                className={loading ? "animate-spin" : ""}
              />
              Refresh
            </button>

            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-slate-200 hover:bg-white/[0.08]"
            >
              <Printer size={16} />
              Print
            </button>

            <button
              onClick={exportCSV}
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
            >
              <Download size={16} />
              Export CSV
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Date Filter */}
        <div className="mb-6 rounded-2xl border border-white/[0.07] bg-white/[0.035] p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="mb-1 text-xs uppercase tracking-wider text-slate-500">
                Reporting Period
              </p>

              <p className="text-sm text-slate-300">
                Select the date range used by financial reports.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <DateField
                label="From"
                value={fromDate}
                onChange={setFromDate}
              />

              <DateField
                label="To"
                value={toDate}
                onChange={setToDate}
              />

              <button
                onClick={loadReports}
                className="sm:col-span-2 inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-2.5 text-sm font-medium text-cyan-300 hover:bg-cyan-500/15"
              >
                <CalendarDays size={16} />
                Apply Date Range
              </button>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KPI
            title="Total Assets"
            value={totalAssets}
            icon={Wallet}
          />

          <KPI
            title="Total Liabilities"
            value={totalLiabilities}
            icon={Scale}
          />

          <KPI
            title="Revenue"
            value={totalIncome}
            icon={TrendingUp}
          />

          <KPI
            title="Net Profit"
            value={netProfit}
            icon={TrendingDown}
            positive={netProfit >= 0}
          />
        </div>

        {/* Report Tabs */}
        <div className="mb-5 flex flex-wrap gap-2 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-2">
          <ReportTab
            active={activeReport === "trial-balance"}
            onClick={() => setActiveReport("trial-balance")}
            icon={Scale}
            label="Trial Balance"
          />

          <ReportTab
            active={activeReport === "profit-loss"}
            onClick={() => setActiveReport("profit-loss")}
            icon={TrendingUp}
            label="Profit & Loss"
          />

          <ReportTab
            active={activeReport === "balance-sheet"}
            onClick={() => setActiveReport("balance-sheet")}
            icon={Wallet}
            label="Balance Sheet"
          />
        </div>

        {/* Report */}
        <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025]">
          {activeReport === "trial-balance" && (
            <TrialBalance
              rows={trialRows}
              debit={trialDebit}
              credit={trialCredit}
              loading={loading}
            />
          )}

          {activeReport === "profit-loss" && (
            <ProfitLoss
              incomeRows={incomeRows}
              expenseRows={expenseRows}
              totalIncome={totalIncome}
              totalExpense={totalExpense}
              netProfit={netProfit}
              loading={loading}
            />
          )}

          {activeReport === "balance-sheet" && (
            <BalanceSheet
              assets={assets}
              liabilities={liabilities}
              equity={equity}
              totalAssets={totalAssets}
              totalLiabilities={totalLiabilities}
              totalEquity={totalEquity}
              loading={loading}
            />
          )}
        </div>

        {/* Account Summary */}
        {accountSummary && (
          <div className="mt-6 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">
            <div className="mb-4 flex items-center gap-2">
              <FileSpreadsheet
                size={18}
                className="text-cyan-400"
              />
              <h2 className="font-semibold">Account Summary</h2>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
              <SummaryItem
                label="Assets"
                value={accountSummary.assets}
              />
              <SummaryItem
                label="Liabilities"
                value={accountSummary.liabilities}
              />
              <SummaryItem
                label="Equity"
                value={accountSummary.equity}
              />
              <SummaryItem
                label="Income"
                value={accountSummary.income}
              />
              <SummaryItem
                label="Expense"
                value={accountSummary.expense}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function KPI({
  title,
  value,
  icon: Icon,
  positive = true,
}) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.035] p-5">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm text-slate-400">{title}</span>

        <div className="rounded-xl bg-cyan-400/10 p-2.5 text-cyan-400">
          <Icon size={18} />
        </div>
      </div>

      <div
        className={`text-xl font-bold ${
          title === "Net Profit"
            ? positive
              ? "text-emerald-400"
              : "text-rose-400"
            : "text-white"
        }`}
      >
        {money(value)}
      </div>
    </div>
  );
}

function DateField({ label, value, onChange }) {
  return (
    <div>
      <label className="mb-2 block text-xs text-slate-500">
        {label}
      </label>

      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl border border-white/10 bg-[#080b12] px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500/50"
      />
    </div>
  );
}

function ReportTab({
  active,
  onClick,
  icon: Icon,
  label,
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
        active
          ? "bg-cyan-500 text-slate-950"
          : "text-slate-400 hover:bg-white/5 hover:text-white"
      }`}
    >
      <Icon size={16} />
      {label}
    </button>
  );
}

function TrialBalance({
  rows,
  debit,
  credit,
  loading,
}) {
  return (
    <div>
      <ReportHeader
        title="Trial Balance"
        description="Debit and credit balances across your chart of accounts."
      />

      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead className="border-y border-white/[0.07] bg-white/[0.025]">
            <tr>
              <th className="px-5 py-3 text-left text-xs uppercase tracking-wider text-slate-500">
                Code
              </th>
              <th className="px-5 py-3 text-left text-xs uppercase tracking-wider text-slate-500">
                Account
              </th>
              <th className="px-5 py-3 text-right text-xs uppercase tracking-wider text-slate-500">
                Debit
              </th>
              <th className="px-5 py-3 text-right text-xs uppercase tracking-wider text-slate-500">
                Credit
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-white/[0.05]">
            {loading ? (
              <LoadingRow colSpan={4} />
            ) : rows.length === 0 ? (
              <EmptyRow colSpan={4} />
            ) : (
              rows.map((row, index) => (
                <tr
                  key={row._id || row.accountId || index}
                  className="hover:bg-white/[0.025]"
                >
                  <td className="px-5 py-3 font-mono text-xs text-cyan-300">
                    {row.code || row.accountCode || "-"}
                  </td>

                  <td className="px-5 py-3 text-sm text-slate-200">
                    {row.name ||
                      row.accountName ||
                      row.account?.name ||
                      "-"}
                  </td>

                  <td className="px-5 py-3 text-right text-sm text-emerald-400">
                    {money(row.debit ?? row.totalDebit ?? 0)}
                  </td>

                  <td className="px-5 py-3 text-right text-sm text-rose-400">
                    {money(row.credit ?? row.totalCredit ?? 0)}
                  </td>
                </tr>
              ))
            )}
          </tbody>

          <tfoot className="border-t border-white/[0.08] bg-white/[0.03]">
            <tr>
              <td colSpan="2" className="px-5 py-4 font-semibold">
                Total
              </td>

              <td className="px-5 py-4 text-right font-bold text-emerald-400">
                {money(debit)}
              </td>

              <td className="px-5 py-4 text-right font-bold text-rose-400">
                {money(credit)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function ProfitLoss({
  incomeRows,
  expenseRows,
  totalIncome,
  totalExpense,
  netProfit,
  loading,
}) {
  return (
    <div>
      <ReportHeader
        title="Profit & Loss"
        description="Revenue, expenses and net profitability for the selected period."
      />

      {loading ? (
        <div className="p-12 text-center">
          <RefreshCw className="mx-auto animate-spin text-cyan-400" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 p-5 lg:grid-cols-2">
          <ReportSection
            title="Income"
            rows={incomeRows}
            total={totalIncome}
            positive
          />

          <ReportSection
            title="Expenses"
            rows={expenseRows}
            total={totalExpense}
          />

          <div className="lg:col-span-2 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-500">
                  Net Result
                </p>
                <h3 className="mt-1 text-lg font-semibold">
                  {netProfit >= 0
                    ? "Net Profit"
                    : "Net Loss"}
                </h3>
              </div>

              <div
                className={`text-2xl font-bold ${
                  netProfit >= 0
                    ? "text-emerald-400"
                    : "text-rose-400"
                }`}
              >
                {money(Math.abs(netProfit))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ReportSection({
  title,
  rows,
  total,
  positive = false,
}) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#0b0f17]">
      <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
        <h3 className="font-semibold">{title}</h3>

        <span
          className={
            positive
              ? "text-sm font-semibold text-emerald-400"
              : "text-sm font-semibold text-rose-400"
          }
        >
          {money(total)}
        </span>
      </div>

      <div className="divide-y divide-white/[0.05]">
        {rows.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-slate-600">
            No data
          </div>
        ) : (
          rows.map((row, index) => (
            <div
              key={row._id || row.accountId || index}
              className="flex items-center justify-between gap-4 px-5 py-3"
            >
              <span className="text-sm text-slate-300">
                {row.name ||
                  row.accountName ||
                  row.account?.name ||
                  "-"}
              </span>

              <span className="text-sm font-medium">
                {money(
                  row.amount ??
                    row.balance ??
                    row.currentBalance ??
                    row.total ??
                    0
                )}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function BalanceSheet({
  assets,
  liabilities,
  equity,
  totalAssets,
  totalLiabilities,
  totalEquity,
  loading,
}) {
  return (
    <div>
      <ReportHeader
        title="Balance Sheet"
        description="Assets, liabilities and equity representing the company's financial position."
      />

      {loading ? (
        <div className="p-12 text-center">
          <RefreshCw className="mx-auto animate-spin text-cyan-400" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 p-5 lg:grid-cols-2">
          <ReportSection
            title="Assets"
            rows={assets}
            total={totalAssets}
            positive
          />

          <div className="space-y-6">
            <ReportSection
              title="Liabilities"
              rows={liabilities}
              total={totalLiabilities}
            />

            <ReportSection
              title="Equity"
              rows={equity}
              total={totalEquity}
            />
          </div>
        </div>
      )}

      <div className="border-t border-white/[0.07] bg-white/[0.025] px-5 py-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500">
              Balance Check
            </p>

            <p className="mt-1 text-sm text-slate-300">
              Assets should equal liabilities plus equity.
            </p>
          </div>

          <div className="text-lg font-bold">
            {money(totalAssets)}{" "}
            <span className="text-slate-600">=</span>{" "}
            {money(totalLiabilities + totalEquity)}
          </div>
        </div>
      </div>
    </div>
  );
}

function ReportHeader({ title, description }) {
  return (
    <div className="border-b border-white/[0.07] px-5 py-5">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">
        {description}
      </p>
    </div>
  );
}

function SummaryItem({ label, value }) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-white">
        {money(value)}
      </p>
    </div>
  );
}

function LoadingRow({ colSpan }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-5 py-14 text-center">
        <RefreshCw className="mx-auto animate-spin text-cyan-400" />
        <p className="mt-3 text-sm text-slate-500">
          Loading report...
        </p>
      </td>
    </tr>
  );
}

function EmptyRow({ colSpan }) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="px-5 py-14 text-center text-sm text-slate-500"
      >
        No report data available.
      </td>
    </tr>
  );
}