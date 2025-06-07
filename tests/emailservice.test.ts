import { EmailService } from '../src/emailservice';
import { idempotencyStore } from '../src/store';
import { circuitBreaker } from '../src/utils/circuitBreaker';
import { rateLimiter } from '../src/utils/rateLimiter';

jest.setTimeout(20000); // Increase timeout for retries/backoff

describe('EmailService', () => {
  let service: EmailService;

  beforeEach(() => {
    service = new EmailService();
    idempotencyStore.clear();

    // Reset circuit breaker state
    (circuitBreaker as any).failureCounts = {};
    (circuitBreaker as any).openCircuits = {};

    // Reset rate limiter tokens and lastRefill
    (rateLimiter as any).tokens = 5;
    (rateLimiter as any).lastRefill = Date.now();
  });

  it('should send email successfully', async () => {
    const result = await service.sendEmail({
      id: 'email1',
      to: 'user@example.com',
      subject: 'Hello',
      body: 'Test body',
    });
    expect(typeof result).toBe('string');
    expect(idempotencyStore.has('email1')).toBe(true);
  });

  it('should skip duplicate emails based on idempotency', async () => {
    await service.sendEmail({
      id: 'email2',
      to: 'user@example.com',
      subject: 'First',
      body: 'Test',
    });
    const result = await service.sendEmail({
      id: 'email2',
      to: 'user@example.com',
      subject: 'Second',
      body: 'Test again',
    });
    expect(result).toBe('Duplicate email skipped');
  });

  it('should enforce rate limiting', async () => {
    // Exhaust tokens
    for (let i = 0; i < 5; i++) {
      await service.sendEmail({
        id: `email${i + 10}`,
        to: 'user@example.com',
        subject: 'Test',
        body: 'Body',
      });
    }
    await expect(
      service.sendEmail({
        id: 'email_over_limit',
        to: 'user@example.com',
        subject: 'Fail',
        body: 'Should fail',
      }),
    ).rejects.toThrow('Rate limit exceeded');
  });

  it('should fallback to second provider if first fails', async () => {
    // Force the first provider to fail by opening its circuit
    circuitBreaker.recordFailure('ProviderA');
    circuitBreaker.recordFailure('ProviderA');
    circuitBreaker.recordFailure('ProviderA');

    const result = await service.sendEmail({
      id: 'email_fallback',
      to: 'user@example.com',
      subject: 'Fallback',
      body: 'Testing fallback',
    });
    expect(result).toMatch(/ProviderB/);
  });

  it('should throw error if all providers fail', async () => {
    // Open circuits for both providers to simulate failure
    circuitBreaker.recordFailure('ProviderA');
    circuitBreaker.recordFailure('ProviderA');
    circuitBreaker.recordFailure('ProviderA');

    circuitBreaker.recordFailure('ProviderB');
    circuitBreaker.recordFailure('ProviderB');
    circuitBreaker.recordFailure('ProviderB');

    await expect(
      service.sendEmail({
        id: 'email_fail_all',
        to: 'user@example.com',
        subject: 'Fail All',
        body: 'Testing all fail',
      }),
    ).rejects.toThrow('All providers failed');
  });
});
