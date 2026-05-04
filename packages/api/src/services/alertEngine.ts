import { query } from '../db';
import { sendSms } from './notifications/twilio';
import { sendEmail } from './notifications/sendgrid';

export async function runAlertEngine(): Promise<{ created: number; notified: number }> {
  let created = 0;
  let notified = 0;

  // ── Expiry alerts ──────────────────────────────────────────────────────────
  const windows = [
    { days: 0,  type: 'expired',    severity: 'critical', label: 'EXPIRED' },
    { days: 30, type: 'expiry_30',  severity: 'high',     label: 'expiring in 30 days' },
    { days: 60, type: 'expiry_60',  severity: 'medium',   label: 'expiring in 60 days' },
    { days: 90, type: 'expiry_90',  severity: 'low',      label: 'expiring in 90 days' },
  ] as const;

  for (const w of windows) {
    const { rows: items } = await query(
      `SELECT i.id, i.expiry_date, i.quantity, p.generic_name, p.brand_name
       FROM inventory i
       JOIN products p ON p.id = i.product_id
       WHERE i.status = 'active'
         AND (
           $1 = 0
             AND i.expiry_date < NOW()
           OR
           $1 > 0
             AND i.expiry_date BETWEEN NOW() AND NOW() + ($1 || ' days')::INTERVAL
         )
         AND NOT EXISTS (
           SELECT 1 FROM alerts a
           WHERE a.inventory_id = i.id
             AND a.type = $2
             AND a.created_at > NOW() - INTERVAL '1 day'
         )`,
      [w.days, w.type]
    );

    for (const item of items) {
      const name = item.brand_name ?? item.generic_name;
      const title = `${name} is ${w.label}`;
      const body = `Lot expires ${item.expiry_date}. Qty on hand: ${item.quantity}.`;

      await query(
        `INSERT INTO alerts (inventory_id, type, severity, title, body)
         VALUES ($1,$2,$3,$4,$5)`,
        [item.id, w.type, w.severity, title, body]
      );
      created++;
    }
  }

  // ── Non-adherence alerts ───────────────────────────────────────────────────
  const { rows: nonAdherent } = await query(`
    SELECT DISTINCT pt.id AS patient_id, pt.first_name, pt.last_name
    FROM patients pt
    JOIN prescriptions rx ON rx.patient_id = pt.id
    WHERE pt.active = true
      AND rx.status = 'active'
      AND rx.next_fill_due < NOW() - INTERVAL '7 days'
      AND NOT EXISTS (
        SELECT 1 FROM alerts a
        WHERE a.patient_id = pt.id
          AND a.type = 'non_adherent'
          AND a.created_at > NOW() - INTERVAL '7 days'
      )
  `);

  for (const pt of nonAdherent) {
    await query(
      `INSERT INTO alerts (patient_id, type, severity, title, body)
       VALUES ($1,'non_adherent','medium',$2,$3)`,
      [
        pt.patient_id,
        `${pt.first_name} ${pt.last_name} may be non-adherent`,
        'Patient has overdue refills — consider outreach.',
      ]
    );
    created++;
  }

  // ── Notify via SMS/email ───────────────────────────────────────────────────
  const { rows: unnotified } = await query<{
    id: string; title: string; body: string | null;
    notified_sms: boolean; notified_email: boolean;
  }>(`
    SELECT * FROM alerts
    WHERE acknowledged = false
      AND (notified_sms = false OR notified_email = false)
      AND severity IN ('high','critical')
      AND created_at > NOW() - INTERVAL '1 hour'
  `);

  for (const alert of unnotified) {
    try {
      if (process.env.TWILIO_ACCOUNT_SID && !alert.notified_sms) {
        await sendSms(`[RxMind] ${alert.title}: ${alert.body ?? ''}`);
        await query('UPDATE alerts SET notified_sms=true WHERE id=$1', [alert.id]);
        notified++;
      }
      if (process.env.SENDGRID_API_KEY && !alert.notified_email) {
        await sendEmail(alert.title, `<p>${alert.body ?? ''}</p>`);
        await query('UPDATE alerts SET notified_email=true WHERE id=$1', [alert.id]);
        notified++;
      }
    } catch (err) {
      console.error('[alertEngine] notify error', err);
    }
  }

  console.log(`[alertEngine] created=${created} notified=${notified}`);
  return { created, notified };
}
