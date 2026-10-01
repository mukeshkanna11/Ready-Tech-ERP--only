const Anthropic = require('@anthropic-ai/sdk');
const baseHttpError = require('../utils/httpError');

// AI errors are safe to show to the user (no internals), so mark them for the controller.
const httpError = (status, message) => {
  const error = baseHttpError(status, message);
  error.expose = true;
  return error;
};

const MODEL = 'claude-opus-5-5';

let client = null;

// The API key is read only from the backend environment (ANTHROPIC_API_KEY).
const getClient = () => {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw httpError(
      503,
      'AI service is not configured. Set ANTHROPIC_API_KEY on the server.'
    );
  }

  if (!client) {
    client = new Anthropic();
  }

  return client;
};

const toHttpError = (error) => {
  if (error instanceof Anthropic.RateLimitError) {
    return httpError(429, 'AI service is busy. Please try again shortly.');
  }

  if (error instanceof Anthropic.AuthenticationError) {
    return httpError(503, 'AI service credentials are invalid.');
  }

  if (error instanceof Anthropic.APIError) {
    return httpError(502, `AI service error: ${error.message}`);
  }

  if (error.status) return error;

  return httpError(502, 'AI service request failed.');
};

/**
 * Single Messages API call with refusal fallback enabled.
 * Returns the concatenated text of the response.
 */
const createMessage = async ({ system, messages, effort, format }) => {
  let response;

  try {
    response = await getClient().beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: {
        effort,
        ...(format ? { format } : {}),
      },
      system,
      messages,
    });
  } catch (error) {
    throw toHttpError(error);
  }

  if (response.stop_reason === 'refusal') {
    throw httpError(422, 'The AI declined this request.');
  }

  const text = response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('');

  if (!text) {
    throw httpError(502, 'AI service returned an empty response.');
  }

  return text;
};

module.exports = {
  createMessage,
};
