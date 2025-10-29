export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function toPascalCase(value: string): string {
  if (!value) {
    return '';
  }

  const spaced = value.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
  const words = spaced
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean);

  if (words.length === 0) {
    return '';
  }

  return words
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

export function ensureValidIdentifier(value: string, fallback = 'generated'): string {
  let sanitized = value.replace(/[^A-Za-z0-9_]/g, '');

  if (!/^[A-Za-z_]/.test(sanitized)) {
    sanitized = `_${sanitized}`;
  }

  if (!/^[A-Za-z_]\w*$/.test(sanitized)) {
    sanitized = sanitized.replace(/[^A-Za-z0-9_]/g, '');
    if (!/^[A-Za-z_]/.test(sanitized)) {
      sanitized = `_${sanitized}`;
    }
  }

  if (!/^[A-Za-z_]\w*$/.test(sanitized) || sanitized === '_') {
    sanitized = `_${fallback}`;
  }

  return sanitized;
}
