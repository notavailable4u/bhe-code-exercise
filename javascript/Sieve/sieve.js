//  class Sieve { NthPrime(n) } with 0-based indexing (0 -> 2)
class Sieve {
  NthPrime(n) {
    if (!Number.isInteger(n) || n < 0) {
      throw new RangeError("n must be a non-negative integer (0-based index)");
    }

    // Seed for instant small-n answers and faster warm-up
    const SEED = [2,3,5,7,11,13,17,19,23,29,31,37,41,43,47,53,59,61,67,71,73,79,83,89,97];
    if (n < SEED.length) return SEED[n];

    const upper = upperBoundForNthPrime(n);
    const limit = Math.floor(Math.sqrt(upper));
    const basePrimes = simpleSieve(limit); // includes 2

    // The first 25 primes
    let count = SEED.length;
    let low = Math.max(3, SEED[SEED.length - 1] + 1);
    if ((low & 1) === 0) low++;

    const SEG = 1 << 20; // ~1,048,576 numbers/segment

    while (low <= upper) {
      let high = Math.min(low + SEG - 1, upper);
      if ((high & 1) === 0) high--;
      if (low > high) { low = high + 2; continue; }

      // Store only odds: index i -> value x = low + 2*i
      const size = ((high - low) >> 1) + 1;
      const isComposite = new Uint8Array(size); // 0 = prime, 1 = composite

      for (const p of basePrimes) {
        if (p === 2) continue;              // only odds represented
        const p2 = p * p;
        if (p2 > high) break;
        let start = Math.max(p2, Math.ceil(low / p) * p);
        if ((start & 1) === 0) start += p;  // ensure odd
        for (let m = start; m <= high; m += 2 * p) {
          isComposite[(m - low) >> 1] = 1;
        }
      }

      for (let i = 0; i < size; i++) {
        if (isComposite[i] === 0) {
          const x = low + (i << 1);
          if (x >= 3) {
            count++;
            if (count - 1 === n) return x; // 0-based index
          }
        }
      }

      low = high + 2; // next odd after segment
    }

    // Rare: bound too tight — expand and retry
    return expandAndFind(n);
  }
}

/* -------- helpers -------- */

// Classic sieve up to n (inclusive). Returns all primes <= n.
function simpleSieve(n) {
  if (n < 2) return [];
  const flags = new Uint8Array(n + 1); // 0 = prime, 1 = composite
  flags[0] = 1; flags[1] = 1;
  for (let p = 2; p * p <= n; p++) {
    if (flags[p] === 0) for (let m = p * p; m <= n; m += p) flags[m] = 1;
  }
  const primes = [];
  for (let i = 2; i <= n; i++) if (flags[i] === 0) primes.push(i);
  return primes;
}

// Safe upper bound for the nth prime (0-based n)
function upperBoundForNthPrime(n) {
  const k = n + 1; // 1-based
  if (k <= 5) { const s = [2,3,5,7,11]; return s[k - 1] + 10; }
  const ln = Math.log(k), lnln = Math.log(ln);
  return Math.ceil(k * (ln + lnln) + 10);
}

function expandAndFind(n) {
  let k = n + 1;
  for (;;) {
    const upper = Math.floor(upperBoundForNthPrime(k) * 1.5);
    const res = tryFindUpTo(n, upper);
    if (res !== -1) return res;
    k = Math.floor(k * 1.5) + 1;
  }
}

function tryFindUpTo(n, upper) {
  if (n === 0 && upper >= 2) return 2;

  const limit = Math.floor(Math.sqrt(upper));
  const basePrimes = simpleSieve(limit);

  let count = upper >= 2 ? 1 : 0; // 2 is index 0 if included
  const SEG = 1 << 20;

  for (let low = 3; low <= upper; low += SEG) {
    let high = Math.min(low + SEG - 1, upper);
    if ((high & 1) === 0) high--;
    if (low > high) { low = high + 2; continue; }

    const size = ((high - low) >> 1) + 1;
    const isComposite = new Uint8Array(size);

    for (const p of basePrimes) {
      if (p === 2) continue;
      const p2 = p * p;
      if (p2 > high) break;
      let start = Math.max(p2, Math.ceil(low / p) * p);
      if ((start & 1) === 0) start += p;
      for (let m = start; m <= high; m += 2 * p) {
        isComposite[(m - low) >> 1] = 1;
      }
    }

    for (let i = 0; i < size; i++) {
      if (isComposite[i] === 0) {
        const x = low + (i << 1);
        if (x >= 3) {
          count++;
          if (count - 1 === n) return x;
        }
      }
    }
  }
  return -1;
}

module.exports = Sieve;
