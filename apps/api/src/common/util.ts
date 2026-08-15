/**
 * Mutex de proceso para operaciones transaccionales en better-sqlite3
 * (una sola conexión síncrona: dos transacciones solapadas lanzan
 * "cannot start a transaction within a transaction"). En Neon/Postgres
 * el bloqueo real lo da SELECT ... FOR UPDATE; el mutex no estorba.
 */
let chain: Promise<unknown> = Promise.resolve();

export function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(fn, fn);
  // Nunca dejar la cadena en estado rechazado
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

/**
 * Generador de referencias legibles: FV-XXXXXX / FP-XXXXXX
 * (alfanumérico, sin caracteres ambiguos).
 */
const REF_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function genRef(prefix: string): string {
  let out = '';
  const rand = crypto.getRandomValues(new Uint8Array(6));
  for (let i = 0; i < 6; i++) {
    out += REF_ALPHABET[rand[i] % REF_ALPHABET.length];
  }
  return `${prefix}-${out}`;
}

/** sha256 hex — qrHash del FastPass */
export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
