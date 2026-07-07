// Client-side Binance data fetcher
// Fetches directly from the browser to bypass server-side network restrictions

interface BinanceKline {
  0: number;  // Open time
  1: string;  // Open
  2: string;  // High
  3: string;  // Low
  4: string;  // Close
  5: string;  // Volume
  6: number;  // Close time
  7: string;  // Quote asset volume
  8: number;  // Number of trades
  9: string;  // Taker buy base asset volume
  10: string; // Taker buy quote asset volume
  11: string; // Ignore
}

interface BinanceFundingRate {
  symbol: string;
  fundingRate: string;
  fundingTime: number;
}

const BINANCE_FAPI_ENDPOINTS = [
  'https://fapi.binance.com',
  'https://fapi1.binance.com',
  'https://fapi2.binance.com',
  'https://fapi3.binance.com',
];

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return res;
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

async function tryEndpoints<T>(
  path: string,
  parser: (res: Response) => Promise<T>,
  timeoutMs: number
): Promise<T> {
  const errors: string[] = [];

  for (const base of BINANCE_FAPI_ENDPOINTS) {
    try {
      const url = `${base}${path}`;
      const res = await fetchWithTimeout(url, timeoutMs);
      if (res.ok) {
        const data = await parser(res);
        // Binance returns errors as { code: -1121, msg: "Invalid symbol." } with HTTP 200
        if (data && typeof data === 'object' && 'code' in (data as Record<string, unknown>) && 'msg' in (data as Record<string, unknown>)) {
          const errObj = data as { code: number; msg: string };
          throw new Error(errObj.msg || `Binance error code ${errObj.code}`);
        }
        return data;
      }
      // Try to parse error body for a helpful message
      try {
        const errBody = await res.json() as { code?: number; msg?: string };
        if (errBody.msg) {
          throw new Error(errBody.msg);
        }
      } catch {
        // If parsing fails, use HTTP status
      }
      errors.push(`${base}: HTTP ${res.status}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // If it's a Binance business error (like Invalid symbol), throw immediately
      if (msg.includes('Invalid symbol') || msg.includes('Invalid interval') || msg.includes('Too many requests')) {
        throw new Error(msg);
      }
      errors.push(`${base}: ${msg}`);
    }
  }

  throw new Error(errors.join(' | '));
}

export async function fetchKlines(
  symbol: string,
  interval: string,
  limit: number = 200
): Promise<BinanceKline[]> {
  const path = `/fapi/v1/klines?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(interval)}&limit=${limit}`;
  return tryEndpoints<BinanceKline[]>(
    path,
    (res) => res.json(),
    15000
  );
}

export async function fetchFundingRate(
  symbol: string
): Promise<number | null> {
  try {
    const path = `/fapi/v1/fundingRate?symbol=${encodeURIComponent(symbol)}&limit=1`;
    const data = await tryEndpoints<BinanceFundingRate[]>(
      path,
      (res) => res.json(),
      8000
    );
    if (Array.isArray(data) && data.length > 0) {
      return parseFloat(data[0].fundingRate);
    }
  } catch {
    // Optional — fail silently
  }
  return null;
}