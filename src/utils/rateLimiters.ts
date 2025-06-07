let tokens = 5;        // <-- Add this line
let lastRefill = Date.now();

export const rateLimiter = {
  allow() {
    const now = Date.now();
    if (now - lastRefill > 60000) {
      tokens = 5;
      lastRefill = now;
    }
    if (tokens > 0) {
      tokens--;
      return true;
    }
    return false;
  }
};
