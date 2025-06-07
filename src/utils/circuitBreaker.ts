const failureCounts: Record<string, number> = {};
const openCircuits: Record<string, number> = {};

export const circuitBreaker = {
  isOpen(name: string): boolean {
    return !!openCircuits[name] && openCircuits[name] > Date.now();
  },
  recordFailure(name: string) {
    failureCounts[name] = (failureCounts[name] || 0) + 1;
    if (failureCounts[name] >= 3) {
      openCircuits[name] = Date.now() + 30000; // Circuit remains open for 30 seconds
      failureCounts[name] = 0;
    }
  }
};
