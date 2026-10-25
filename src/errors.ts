/**
 * Thrown for every failed call: network errors, timeouts, invalid responses,
 * and any response where Pandascrow returns `status: false` or an HTTP error.
 */
export class PandascrowError extends Error {
  /** HTTP status code (0 for network errors and timeouts). */
  readonly status: number;
  /** Link to the relevant API reference page, when Pandascrow sends one. */
  readonly docUrl: string | null;
  /** Full decoded response body, when there was one. */
  readonly response: unknown;

  constructor(message: string, options: { status?: number; docUrl?: string | null; response?: unknown; cause?: unknown } = {}) {
    super(message);
    this.name = 'PandascrowError';
    this.status = options.status ?? 0;
    this.docUrl = options.docUrl ? options.docUrl : null;
    this.response = options.response;
    if (options.cause !== undefined) {
      (this as { cause?: unknown }).cause = options.cause;
    }
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
