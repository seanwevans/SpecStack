export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function sanitizeIdentifier(raw: string | undefined | null): string {
  if (!raw) {
    return '';
  }

  const withoutArraySuffix = raw.replace(/\[\]$/, '');
  const stripped = withoutArraySuffix.replace(/[^A-Za-z0-9_]/g, '');
  if (!stripped) {
    return '';
  }

  return /^[0-9]/.test(stripped) ? `_${stripped}` : stripped;
}
