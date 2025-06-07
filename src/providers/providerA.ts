interface EmailData {
  to: string;
  subject: string;
  body: string;
}

export const ProviderA = {
  name: 'ProviderA',
  async send({ to, subject, body }: EmailData): Promise<string> {
    // Simulate random failure
    if (Math.random() < 0.7) {
      throw new Error('ProviderA failed');
    }
    return `Sent by ProviderA to ${to}`;
  }
};
