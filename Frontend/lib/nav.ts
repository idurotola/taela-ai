/**
 * Validates a post-login redirect target taken from the URL. Only same-site
 * absolute paths are allowed, so `?next=https://evil.example` or
 * `?next=//evil.example` can't turn sign-in into an open redirect.
 */
export function safeNextPath(next: string | null): string | null {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.includes('\\')) return null;
  return next;
}
