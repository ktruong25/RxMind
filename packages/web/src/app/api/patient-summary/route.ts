import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;

export async function POST(req: Request) {
  const { patient, prescriptions } = await req.json();

  if (!groq) {
    const name = `${patient.first_name} ${patient.last_name}`;
    const rxCount = prescriptions?.length ?? 0;
    return NextResponse.json({
      summary: `${name} is a ${patient.gender === 'F' ? 'female' : 'male'} patient currently on ${rxCount} active prescription${rxCount !== 1 ? 's' : ''}. ${patient.allergy_list?.length ? `Documented allergies include ${patient.allergy_list.join(' and ')} — verify before dispensing any new prescriptions.` : 'No known drug allergies on file.'} Review adherence status for any overdue fills and consider MTM referral if the patient is on 5 or more chronic medications.`,
    });
  }

  const rxLines = prescriptions?.map((rx: { generic_name?: string; brand_name?: string; adherence_status?: string; next_fill_due?: string }) =>
    `- ${rx.generic_name ?? rx.brand_name}: ${rx.adherence_status ?? 'unknown'} adherence, next fill ${rx.next_fill_due ?? 'unknown'}`
  ).join('\n') ?? 'No active prescriptions';

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    max_tokens: 600,
    messages: [{
      role: 'user',
      content: `You are a clinical pharmacist. Generate a brief clinical summary (4-6 sentences) for a patient profile review. Flag any adherence concerns, drug interactions to watch, or MTM opportunities. Be clinical and concise.

Patient: ${patient.first_name} ${patient.last_name}, DOB: ${patient.dob ?? 'unknown'}
Allergies: ${patient.allergy_list?.join(', ') || 'NKDA'}
Active prescriptions and adherence:
${rxLines}

Clinical summary:`,
    }],
  });

  return NextResponse.json({ summary: completion.choices[0].message.content });
}
