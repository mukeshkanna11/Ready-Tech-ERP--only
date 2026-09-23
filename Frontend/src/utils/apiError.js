// Matches the { success: false, message } shape the backend error middleware returns,
// with the same network fallback Login.jsx already uses.
export const getApiErrorMessage = (
  err,
  fallback = "Something went wrong. Please try again."
) =>
  err?.response?.data?.message ||
  (err?.code === "ERR_NETWORK"
    ? "Unable to reach the server. Please try again."
    : fallback);

export default getApiErrorMessage;
