import twilio from 'twilio';

let client: ReturnType<typeof twilio> | null = null;

function getClient() {
  if (!client && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  }
  return client;
}

export async function sendSms(body: string, to?: string): Promise<void> {
  const c = getClient();
  if (!c) {
    console.warn('[twilio] credentials not configured — skipping SMS');
    return;
  }
  const recipient = to ?? process.env.TWILIO_ADMIN_NUMBER ?? process.env.TWILIO_FROM_NUMBER!;
  await c.messages.create({
    body,
    from: process.env.TWILIO_FROM_NUMBER!,
    to: recipient,
  });
}
