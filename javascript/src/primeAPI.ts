/**
 * Returns the Nth prime using 0-based indexing (0 -> 2).
 * Throws RangeError for negative or non-integer n.
 *
 * Segmented Sieve approach:
 * 1) Estimate an upper bound for the nth prime (p_n).
 * 2) Sieve up to sqrt(upper) to get "base primes".
 * 3) Sieve in chunks [low, high) using the base primes.
 * 4) Count primes until we reach the Nth, then return it.
 */
export function nthPrime(n: number): number {

  const seed: number[] = [
    2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71,
    73, 79, 83, 89, 97,
  ];

  if (!Number.isInteger(n) || n < 0) {
    throw new RangeError('n must be a non-negative integer (0-based index)');
  }

  // Fast path for small n (0..24)
  if (n < seed.length) return seed[n];

  // --- Upper bound estimate for p_n ---
  const upper = upperBoundForNthPrime(n);

  // --- Base primes up to sqrt(upper) ---
  const limit = Math.floor(Math.sqrt(upper));
  const basePrimes = simpleSieve(limit);

  // --- Segmented sieve from just after the last seed prime ---
  let count = seed.length; // (indices 0..24)
  const lastSeed = seed[seed.length - 1]; // 97

  // start from next integer after lastSeed; bump to odd
  let startLow = lastSeed + 1;
  if ((startLow & 1) === 0) startLow++; // ensure odd

  const SEG = Math.max(32768, limit); // reasonable chunk size

  for (let low = Math.max(3, startLow); low <= upper; low += SEG) {
    const high = Math.min(low + SEG - 1, upper);
    const isPrime = new Array(high - low + 1).fill(true);

    for (const p of basePrimes) {
      // find first multiple of p in [low, high]
      let start = Math.max(p * p, Math.ceil(low / p) * p);
      if (start > high) continue;

      for (let m = start; m <= high; m += p) {
        isPrime[m - low] = false;
      }
    }

    // Count primes in this segment (skip evens)
    for (let x = low; x <= high; x++) {
      if ((x & 1) === 0) continue; // skip even numbers
      if (x >= 2 && isPrime[x - low]) {
        count++;
        if (count - 1 === n) return x; // 0-based index
      }
    }
  }

  // Fallback if the bound was too small (rare with padding)
  return nthPrimeWithExpansion(n);
}

/** Fallback loop that expands bound if ever needed. Very rarely used. */
function nthPrimeWithExpansion(n: number): number {
  let k = n;
  for (;;) {
    const bound = upperBoundForNthPrime(k) * 2; // expand aggressively
    const result = tryNthPrimeUpTo(n, bound);
    if (result !== -1) return result;
    k *= 2;
  }
}

/** Try to find nth prime within [2..upper]. Returns -1 if not found. */
function tryNthPrimeUpTo(n: number, upper: number): number {
  const limit = Math.floor(Math.sqrt(upper));
  const basePrimes = simpleSieve(limit);

  let count = 0;
  if (2 <= upper) {
    if (n === 0) return 2;
    count = 1; // index 0 = 2 already counted
  }

  const SEG = Math.max(32768, limit);
  for (let low = 3; low <= upper; low += SEG) {
    const high = Math.min(low + SEG - 1, upper);
    const isPrime = new Array(high - low + 1).fill(true);

    for (const p of basePrimes) {
      const start = Math.max(p * p, Math.ceil(low / p) * p);
      if (start > high) continue;
      for (let m = start; m <= high; m += p) {
        isPrime[m - low] = false;
      }
    }

    for (let x = low; x <= high; x++) {
      if ((x & 1) === 0) continue;
      if (x >= 2 && isPrime[x - low]) {
        count++;
        if (count - 1 === n) return x;
      }
    }
  }
  return -1;
}

/** Basic sieve up to n (inclusive). Returns all primes <= n. */
function simpleSieve(n: number): number[] {
  if (n < 2) return [];
  const isPrime = new Array(n + 1).fill(true);
  isPrime[0] = false;
  isPrime[1] = false;

  for (let p = 2; p * p <= n; p++) {
    if (isPrime[p]) {
      for (let m = p * p; m <= n; m += p) {
        isPrime[m] = false;
      }
    }
  }
  const primes: number[] = [];
  for (let i = 2; i <= n; i++) {
    if (isPrime[i]) primes.push(i);
  }
  return primes;
}

/** Upper bound for the nth prime (0-based n). Adds padding to be safe for small n. */
function upperBoundForNthPrime(n: number): number {
  // Convert to 1-based index k = n+1
  const k = n + 1;

  if (k <= 5) {
    const small = [2, 3, 5, 7, 11];
    return small[Math.max(0, Math.min(k - 1, small.length - 1))] + 10;
  }

  // Dusart-style bound: p_k < k (ln k + ln ln k) for k >= 6
  const ln = Math.log(k);
  const lnln = Math.log(ln);
  const estimate = k * (ln + lnln);
  return Math.ceil(estimate + 10); // padding
}
