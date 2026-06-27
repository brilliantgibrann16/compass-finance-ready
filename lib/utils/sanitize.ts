/**
 * Input sanitization utilities to prevent XSS and injection attacks.
 */

const HTML_ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
  "/": "&#x2F;",
};

const HTML_ESCAPE_RE = /[&<>"'/]/g;

/** Escape HTML special characters to prevent XSS when rendering user content. */
export function escapeHtml(input: string): string {
  return input.replace(HTML_ESCAPE_RE, (char) => HTML_ESCAPE_MAP[char] ?? char);
}

/** Strip control characters (except newline/tab) from user input. */
export function stripControlChars(input: string): string {
  return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
}

/**
 * Sanitize a general text input: trim, strip control chars, enforce max length.
 * Does NOT escape HTML — use escapeHtml separately when rendering in raw contexts.
 */
export function sanitizeTextInput(input: string, maxLength = 500): string {
  const cleaned = stripControlChars(input.trim());
  return cleaned.slice(0, maxLength);
}

/**
 * Validate and sanitize an email address.
 * Returns the cleaned email or null if invalid.
 */
export function sanitizeEmail(input: string): string | null {
  const trimmed = input.trim().toLowerCase();
  if (trimmed.length > 254) return null;
  // RFC 5322 simplified check
  const emailRe = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/;
  return emailRe.test(trimmed) ? trimmed : null;
}

/**
 * Sanitize a numeric string input for financial amounts.
 * Returns the parsed number or null if invalid.
 */
export function sanitizeAmount(input: string, max = 100_000_000): number | null {
  const cleaned = input.replace(/[^0-9.,]/g, "").replace(/[.,]/g, "");
  const amount = parseInt(cleaned, 10);
  if (!Number.isFinite(amount) || amount <= 0 || amount > max) return null;
  return amount;
}
