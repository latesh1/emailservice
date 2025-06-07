// emailService.ts
import { ProviderA } from './providers/providerA';
import { ProviderB } from './providers/providerB';
import { rateLimiter } from './utils/rateLimiter';
import { circuitBreaker } from './utils/circuitBreaker';
import { logger } from './utils/logger';
import { idempotencyStore } from './store';

interface EmailPayload {
  id: string;
  to: string;
  subject: string;
  body: string;
}

interface EmailProvider {
  name: string;
  send: (payload: { to: string; subject: string; body: string }) => Promise<string>;
}

export class EmailService {
  private providers: EmailProvider[];

  constructor() {
    this.providers = [ProviderA, ProviderB];
  }

  async sendEmail(data: EmailPayload): Promise<string> {
    const { id, to, subject, body } = data;

    if (this.isDuplicate(id)) {
      logger.log(`Duplicate email detected for ID: ${id}`);
      return 'Duplicate email skipped';
    }

    if (!this.canSend()) {
      logger.log('Rate limit exceeded');
      throw new Error('Rate limit exceeded');
    }

    for (const provider of this.providers) {
      if (circuitBreaker.isOpen(provider.name)) {
        logger.log(`Circuit is open for ${provider.name}`);
        continue;
      }

      try {
        await this.retry(() => provider.send({ to, subject, body }), 3);
        idempotencyStore.set(id, true);
        logger.log(`Email sent via ${provider.name}`);
        return `Email sent via ${provider.name}`;
      } catch (err) {
        const error = err as Error;
        logger.log(`Failed with ${provider.name}: ${error.message}`);
        circuitBreaker.recordFailure(provider.name);
      }
    }

    logger.log('All providers failed');
    throw new Error('All providers failed');
  }

  private isDuplicate(id: string): boolean {
    return idempotencyStore.has(id);
  }

  private canSend(): boolean {
    return rateLimiter.allow();
  }

  private async retry<T>(fn: () => Promise<T>, retries: number, delay = 500): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      if (retries === 0) throw err;
      await new Promise(res => setTimeout(res, delay));
      return this.retry(fn, retries - 1, delay * 2);
    }
  }
}
