export function usdFormat(n: number): string {
  return `$${n.toFixed(2)}`;
}

export function isExpired(expiresAt: number): boolean {
  return Date.now() > expiresAt;
}
