import sgMail from '@sendgrid/mail';

let initialized = false;

function init() {
  if (!initialized && process.env.SENDGRID_API_KEY) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    initialized = true;
  }
}

export async function sendEmail(subject: string, html: string, to?: string): Promise<void> {
  init();
  if (!initialized) {
    console.warn('[sendgrid] API key not configured — skipping email');
    return;
  }
  const recipient = to ?? process.env.SENDGRID_ADMIN_EMAIL ?? process.env.SENDGRID_FROM_EMAIL!;
  await sgMail.send({
    to: recipient,
    from: process.env.SENDGRID_FROM_EMAIL!,
    subject: `[RxMind] ${subject}`,
    html,
  });
}
