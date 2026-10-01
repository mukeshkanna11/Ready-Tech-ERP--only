const httpError = require('../utils/httpError');
const reports = require('./report.controller');
const { createMessage } = require('../services/ai.service');

const MAX_HISTORY = 20;
const MAX_MESSAGE_LENGTH = 4000;
const MIN_FORECAST_MONTHS = 3;

const FORECAST_SOURCES = {
  sales: reports.getSalesReport,
  purchases: reports.getPurchaseReport,
};

const HORIZONS = {
  'Next 1 month': 1,
  'Next 3 months': 3,
  'Next 6 months': 6,
  'Next 12 months': 12,
};

/**
 * Run an existing report handler for the authenticated tenant
 * and return its `data` payload. Tenant scoping stays inside
 * the report controller (req.companyId from the JWT).
 */
const runReport = (handler, req, query = {}) =>
  new Promise((resolve, reject) => {
    const res = {
      status() {
        return this;
      },
      json(body) {
        resolve(body?.data ?? null);
      },
    };

    handler(
      { ...req, companyId: req.companyId, userId: req.userId, query },
      res,
      reject
    );
  });

const settle = async (handler, req, query) => {
  try {
    return await runReport(handler, req, query);
  } catch {
    return null;
  }
};

// The shared error middleware hides messages for 5xx; AI service errors are user-facing.
const sendError = (error, res, next) => {
  if (error.expose && error.status) {
    return res.status(error.status).json({
      success: false,
      message: error.message,
    });
  }

  return next(error);
};

// Reports default to the current month; AI features look at the last 12 months.
const twelveMonthsAgo = () => {
  const date = new Date();
  date.setMonth(date.getMonth() - 12, 1);
  return date.toISOString().slice(0, 10);
};

const cleanDate = (value) =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? value
    : undefined;

// ============================================================
// POST /api/ai/assistant
// ============================================================

const assistant = async (req, res, next) => {
  try {
    const history = Array.isArray(req.body?.messages)
      ? req.body.messages
      : [];

    const messages = history
      .filter(
        (message) =>
          ['user', 'assistant'].includes(message?.role) &&
          typeof message.text === 'string' &&
          message.text.trim()
      )
      .slice(-MAX_HISTORY)
      .map((message) => ({
        role: message.role,
        content: message.text.slice(0, MAX_MESSAGE_LENGTH),
      }));

    while (messages.length && messages[0].role !== 'user') {
      messages.shift();
    }

    if (!messages.length || messages[messages.length - 1].role !== 'user') {
      throw httpError(400, 'A user message is required');
    }

    const period = { from: twelveMonthsAgo() };

    const [overview, sales, purchases, inventory, workflows] =
      await Promise.all([
        settle(reports.getOverview, req, period),
        settle(reports.getSalesReport, req, period),
        settle(reports.getPurchaseReport, req, period),
        settle(reports.getInventoryReport, req, period),
        settle(reports.getWorkflowReport, req, period),
      ]);

    const erpData = { overview, sales, purchases, inventory, workflows };

    const system = [
      'You are the AI assistant inside Ready Tech ERP.',
      'Answer using only the ERP data below, which belongs to the signed-in company.',
      'If the data does not contain what is needed, say so plainly and suggest which ERP module to check. Never invent figures.',
      'Amounts are in INR unless stated otherwise. Keep answers concise and use short lists or tables where helpful.',
      `ERP data (JSON, generated ${new Date().toISOString()}):`,
      JSON.stringify(erpData),
    ].join('\n');

    const text = await createMessage({
      system,
      messages,
      effort: 'medium',
    });

    return res.status(200).json({
      success: true,
      data: {
        role: 'assistant',
        text,
        at: new Date().toISOString(),
      },
    });
  } catch (error) {
    return sendError(error, res, next);
  }
};

// ============================================================
// POST /api/ai/forecast
// ============================================================

const FORECAST_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    method: { type: 'string' },
    confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
    forecast: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          period: { type: 'string', description: 'YYYY-MM' },
          value: { type: 'number' },
          low: { type: 'number' },
          high: { type: 'number' },
        },
        required: ['period', 'value', 'low', 'high'],
        additionalProperties: false,
      },
    },
  },
  required: ['summary', 'method', 'confidence', 'forecast'],
  additionalProperties: false,
};

const forecast = async (req, res, next) => {
  try {
    const source = req.body?.source;
    const handler = FORECAST_SOURCES[source];

    if (!handler) {
      throw httpError(
        400,
        `source must be one of: ${Object.keys(FORECAST_SOURCES).join(', ')}`
      );
    }

    const months = HORIZONS[req.body?.horizon] || 3;

    const report = await runReport(handler, req, {
      from: cleanDate(req.body?.from) || twelveMonthsAgo(),
      ...(cleanDate(req.body?.to) ? { to: req.body.to } : {}),
    });

    const history = (Array.isArray(report?.monthly) ? report.monthly : [])
      .filter((item) => item?._id?.year && item?._id?.month)
      .map((item) => ({
        period: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
        total: Number(item.total) || 0,
        count: Number(item.count) || 0,
      }));

    if (history.length < MIN_FORECAST_MONTHS) {
      throw httpError(
        422,
        `At least ${MIN_FORECAST_MONTHS} months of ${source} history are needed for a forecast (found ${history.length}).`
      );
    }

    const text = await createMessage({
      system:
        'You are a forecasting analyst for an ERP system. Forecast only from the monthly history provided. Be conservative, give realistic low/high ranges, and lower confidence when history is short or volatile.',
      messages: [
        {
          role: 'user',
          content: `Forecast monthly ${source} totals (INR) for the next ${months} month(s) after the last period below. Monthly history: ${JSON.stringify(history)}`,
        },
      ],
      effort: 'high',
      format: { type: 'json_schema', schema: FORECAST_SCHEMA },
    });

    let result;

    try {
      result = JSON.parse(text);
    } catch {
      throw httpError(502, 'AI service returned an invalid forecast.');
    }

    return res.status(200).json({
      success: true,
      data: {
        source,
        horizonMonths: months,
        history,
        ...result,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    return sendError(error, res, next);
  }
};

module.exports = {
  assistant,
  forecast,
};
