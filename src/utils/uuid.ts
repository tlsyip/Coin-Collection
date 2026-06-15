export function safeUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  const getRandomByte = (): number => {
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
      return crypto.getRandomValues(new Uint8Array(1))[0];
    }
    return Math.floor(Math.random() * 256);
  };

  const randomHex = () => (getRandomByte() & 0x0f).toString(16);
  const segment = (length: number) => Array.from({ length }, randomHex).join('');
  const y = ((getRandomByte() & 0x3) | 0x8).toString(16);

  return `${segment(4)}-${segment(4)}-4${segment(3)}-${y}${segment(3)}`;
}
