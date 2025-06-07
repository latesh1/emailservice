interface EmailData {
  to: string;
  subject: string;
  body: string;
}

export const ProviderB = {
  name: 'ProviderB',
  async send({ to, subject, body }: EmailData): Promise<string> {
    // Simulate random failure
    if (Math.random() < 0.5) {
      throw new Error('ProviderB failed');
    }
    return `Sent by ProviderB to ${to}`;
  }
};
