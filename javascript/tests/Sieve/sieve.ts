// Segmented sieve that returns the Nth prime with 0-based indexing (0 -> 2).
// Designed to handle large queries like n = 10_000_000 efficiently.
//
// Implementation notes:
// - We write TypeScript with ES import/export *syntax*, but the project compiles to CommonJS.
//   This file uses `module.exports = Sieve` at the bottom to match your test's `require(...)`.
//
// - Strategy:
//   1) Use a mathematical upper bound for p_(n+1): p_k < k (ln k + ln ln k) for k >= 6 (PNT/Dusart).
//   2) Sieve up to sqrt(upper) to get base primes (classic sieve).
//   3) Segmented sieve from 3..upper, storing only odd numbers, marking multiples with base primes.
//   4) Count primes until we hit index n (0-based), then return.
//
// - Complexity:
//   Base sieve up to ~sqrt(upper) is small even for big n (e.g., ~1.4e4 when n ~ 1e7).
//   The main pass scans ~upper/2 bits; segmentation keeps memory small.
//
// - Inputs:
//   n must be a non-negative integer; we throw RangeError otherwise.

class Sieve {
  public NthPrime(n: number): number {
    if (!Number.isInteger(n) || n < 0) {
      throw new RangeError("n must be a non-negative integer (0-based index)");
    }
    if (n === 0) return 2;
    if (n === 1) return 3;

    // Convert to 1-based index for bounds math
    const k = n + 1;
    const upper = this.upperBoundForNthPrime(k);

    // Base primes up to sqrt(upper)
    const limit = Math.floor(Math.sqrt(upper));
    const basePrimes = this.simpleSieve(limit); // includes 2 and odd primes

    // We'll count primes with 0-based indexing:
    // index 0 = 2 (already handled), start counting from 3 upwards.
    let found = 1; // prime 2 already counts for index 0

    // Segmentation parameters
    // Choose a segment width in *numbers*; we store only odds inside.
    // Using ~2^20 (~1,048,576) for good perf/memory balance.
    const SEGMENT_WIDTH = 1 << 20;

    // Start at 3 and ensure odd segment bounds
    let low = 3;
    while (low <= upper) {
      let high = Math.min(low + SEGMENT_WIDTH - 1, upper);
      if ((low & 1) === 0) low += 1; // make low odd
      if ((high & 1) === 0) high -= 1; // make high odd
      if (low > high) break;

      // Represent only odds in [low..high]:
      // index i corresponds to number x = low + 2*i
      const size = ((high - low) >> 1) + 1;
      const isPrime = new Uint8Array(size); // 0 = prime (unmarked), 1 = composite

      // Mark composites using base primes
      for (const p of basePrimes) {
        if (p === 2) continue; // we only store odds, skip even prime
        const p2 = p * p;
        if (p2 > high) break;

        // First multiple of p in [low..high]
        let start = Math.max(p2, Math.ceil(low / p) * p);
        // Make sure start is odd (since we only represent odds)
        if ((start & 1) === 0) start += p;

        // Step by 2p to stay on odd multiples
        for (let m = start; m <= high; m += 2 * p) {
          const idx = (m - low) >> 1;
          isPrime[idx] = 1;
        }
      }

      // Count primes in this segment
      for (let i = 0; i < size; i++) {
        if (isPrime[i] === 0) {
          const x = low + (i << 1);
          if (x >= 3) {
            found++;
            if (found - 1 === n) {
              return x;
            }
          }
        }
      }

      low = high + 2; // next odd after current high
    }

    // If we somehow didn't find it (upper bound too tight, which is unlikely),
    // expand and retry (rare fallback).
    return this.expandAndFind(n);
  }

  // ---------- Helpers ----------

  // Classic sieve up to n (inclusive). Returns all primes <= n.
  private simpleSieve(n: number): number[] {
    if (n < 2) return [];
    const isPrime = new Uint8Array(n + 1);
    isPrime[0] = 1;
    isPrime[1] = 1;

    for (let p = 2; p * p <= n; p++) {
      if (isPrime[p] === 0) {
        for (let m = p * p; m <= n; m += p) {
          isPrime[m] = 1;
        }
      }
    }

    const primes: number[] = [];
    for (let i = 2; i <= n; i++) {
      if (isPrime[i] === 0) primes.push(i);
    }
    return primes;
  }

  // Upper bound for the k-th prime (k is 1-based).
  // For k >= 6: p_k < k (ln k + ln ln k).
  // We add a small safety pad.
  private upperBoundForNthPrime(k: number): number {
    if (k <= 5) {
      // exact small caps, then pad to ensure the segment includes them
      const small = [2, 3, 5, 7, 11];
      return small[k - 1] + 10;
    }
    const ln = Math.log(k);
    const lnln = Math.log(ln);
    const estimate = k * (ln + lnln);
    return Math.ceil(estimate + 10); // small pad keeps us safely above p_k
  }

  // Rare fallback if the first bound was too tight (shouldn't happen with the pad).
  private expandAndFind(n: number): number {
    let k = n + 1;
    for (;;) {
      const upper = (this.upperBoundForNthPrime(k) * 3) >> 1; // ~1.5x
      const res = this.tryFindUpTo(n, upper);
      if (res !== -1) return res;
      k = Math.floor(k * 1.5) + 1;
    }
  }

  // Try to find nth prime within [2..upper]; returns -1 if not found.
  private tryFindUpTo(n: number, upper: number): number {
    if (n === 0 && upper >= 2) return 2;

    const limit = Math.floor(Math.sqrt(upper));
    const basePrimes = this.simpleSieve(limit);

    let found = 0;
    if (upper >= 2) found = 1; // 2 is index 0

    const SEGMENT_WIDTH = 1 << 20;

    let low = 3;
    while (low <= upper) {
      let high = Math.min(low + SEGMENT_WIDTH - 1, upper);
      if ((low & 1) === 0) low += 1;
      if ((high & 1) === 0) high -= 1;
      if (low > high) break;

      const size = ((high - low) >> 1) + 1;
      const isPrime = new Uint8Array(size);

      for (const p of basePrimes) {
        if (p === 2) continue;
        const p2 = p * p;
        if (p2 > high) break;
        let start = Math.max(p2, Math.ceil(low / p) * p);
        if ((start & 1) === 0) start += p;
        for (let m = start; m <= high; m += 2 * p) {
          const idx = (m - low) >> 1;
          isPrime[idx] = 1;
        }
      }

      for (let i = 0; i < size; i++) {
        if (isPrime[i] === 0) {
          const x = low + (i << 1);
          if (x >= 3) {
            found++;
            if (found - 1 === n) return x;
          }
        }
      }

      low = high + 2;
    }

    return -1;
  }
}

module.exports = Sieve;
