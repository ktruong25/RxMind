import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;

export async function POST(req: Request) {
  if (!groq) {
    return NextResponse.json({
      briefing: 'Good morning. You have 12 expired inventory items totaling $4,832 at cost that need immediate shelf pulls — Atorvastatin LOT-C0034 and Metformin LOT-A2241 are the priority. Amlodipine expires in 6 days, so flag that for a wholesaler return. Four non-adherent patients need outreach today, with Maria Johnson overdue on three medications. You have 14 open MTM opportunities — James Okafor is your strongest CMR candidate with 7 chronic meds on Medicare Part D.',
    });
  }

  const body = await req.json();
  const { summary } = body as {
    summary: {
      expiringSoon: number;
      expiredValue: number;
      rejectedClaims: number;
      nonAdherentPatients: number;
      openMtm: number;
      topAlerts: string[];
    };
  };

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    max_tokens: 512,
    messages: [{
      role: 'user',
      content: `You are a clinical pharmacy assistant. Generate a concise morning briefing paragraph (3-5 sentences) for a pharmacist based on this dashboard summary. Be direct and prioritize action items.

Dashboard data:
- Items expiring within 90 days: ${summary.expiringSoon}
- Expired inventory value at risk: $${summary.expiredValue.toFixed(2)}
- Rejected insurance claims needing resolution: ${summary.rejectedClaims}
- Non-adherent patients needing outreach: ${summary.nonAdherentPatients}
- Open MTM opportunities: ${summary.openMtm}
- Top alerts: ${summary.topAlerts.join('; ')}

Write the briefing now:`,
    }],
  });

  return NextResponse.json({ briefing: completion.choices[0].message.content });
}
