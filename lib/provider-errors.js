class ProviderError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'ProviderError';
    this.code = details.code || 'provider_error';
    this.status = details.status || 502;
    this.retryable = Boolean(details.retryable);
    this.provider = details.provider || 'unknown';
    this.requestId = details.requestId;
    this.endpoint = details.endpoint;
  }
}

function normalizeProviderError(error) {
  if (error instanceof ProviderError) return error;
  return new ProviderError(error.message || 'provider_unavailable', { code: 'provider_unavailable', retryable: true, status: 502 });
}

module.exports = { ProviderError, normalizeProviderError };
