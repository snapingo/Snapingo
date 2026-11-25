// Which database errors are worth a second try. Pure, so it can be tested
// without a database (src/lib/db.ts uses it).

/**
 * Errors that mean "the connection hiccupped", not "the query is wrong":
 *  - the pooler closed an idle connection ("Connection terminated...");
 *  - the database could not be reached for a moment (Prisma P1001, "Can't
 *    reach database server") or timed out (P1002, P1008).
 * Anything else - a bad query, a constraint, a missing column - is a real
 * error and must surface straight away.
 */
export function isTransientDbError(error: unknown): boolean {
  const code = typeof error === "object" && error !== null ? (error as { code?: unknown }).code : undefined;
  if (code === "P1001" || code === "P1002" || code === "P1008") return true;

  const text = error instanceof Error ? `${error.message} ${String(error.cause ?? "")}` : String(error);
  return /Connection terminated|terminating connection|ECONNRESET|ETIMEDOUT|socket hang up|Can't reach database server/i.test(text);
}

/** How long to wait before each further attempt of a read: two retries, backing off. */
export const RETRY_DELAYS_MS = [300, 900] as const;
