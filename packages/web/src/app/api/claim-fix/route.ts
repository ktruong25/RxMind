import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;

const DEMO_FIXES: Record<string, string> = {
  '75': '• Call the prescriber\'s office to initiate a prior authorization request with the patient\'s insurance.\n• Obtain the PA form from the payer\'s provider portal.\n• Prescriber must document medical necessity — include diagnosis codes and prior therapy failures.\n• Submit PA and reprocess claim once approved. Typical turnaround: 24–72 hours.',
  '76': '• Verify the patient\'s plan year and benefit limits — plan cap may have been hit.\n• Call the PBM member services line to confirm remaining benefit.\n• If exhausted, discuss generic alternatives or manufacturer copay cards with the prescriber.',
  '88': '• Review the DUR alert — identify the interacting drug pair flagged.\n• Contact the prescriber to confirm clinical intent and request an override if appropriate.\n• If override granted, resubmit with DUR override code "1P" and the prescriber\'s NPI.',
  '70': '• Verify the drug is in the patient\'s formulary — check the payer\'s drug list online.\n• Request a formulary exception from the prescriber if medically necessary.\n• Identify a covered alternative and contact prescriber for a new Rx.',
  '41': '• Confirm the last fill date and days supply — refill may genuinely be too early.\n• If clinically justified, call the PBM to request an override code.\n• Resubmit with override code "2" (vacation supply) or "7" (emergency supply).',
  '07': '• Verify the member ID on the patient\'s insurance card against what was submitted.\n• Call insurance member services to confirm eligibility and correct ID format.\n• Update the member ID in the patient profile and resubmit.',
};

export async function POST(req: Request) {
  const { claim } = await req.json();

  if (!groq) {
    const fix = DEMO_FIXES[claim.reject_code ?? ''] ??
      '• Verify all claim fields against the patient\'s current insurance card.\n• Contact the PBM directly for the specific rejection reason.\n• Confirm patient eligibility is active for the date of service.\n• Resubmit once the identified issue is corrected.';
    return NextResponse.json({ suggestion: fix });
  }

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    max_tokens: 400,
    messages: [{
      role: 'user',
      content: `You are a pharmacy billing specialist. Given this rejected insurance claim, provide specific, actionable steps to resolve the rejection. Be concise — 3-5 bullet points maximum.

Claim details:
- Reject code: ${claim.reject_code ?? 'unknown'}
- Reject message: ${claim.reject_message ?? 'unknown'}
- BIN: ${claim.bin ?? 'unknown'}, PCN: ${claim.pcn ?? 'unknown'}
- NDC: ${claim.ndc ?? 'unknown'}
- Rx number: ${claim.rx_number ?? 'unknown'}

Resolution steps:`,
    }],
  });

  return NextResponse.json({ suggestion: completion.choices[0].message.content });
}
