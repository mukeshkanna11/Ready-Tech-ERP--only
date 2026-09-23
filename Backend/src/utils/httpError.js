// Mirrors the local helper in auth.service.js so the error middleware can read err.status.
const httpError = (status, message) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

module.exports = httpError;
