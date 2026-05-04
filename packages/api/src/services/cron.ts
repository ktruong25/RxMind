import cron from 'node-cron';
import { runAlertEngine } from './alertEngine';

export function startCron() {
  // Daily at 8:00 AM
  cron.schedule('0 8 * * *', async () => {
    console.log('[cron] running daily alert engine');
    try {
      const result = await runAlertEngine();
      console.log('[cron] alert engine done', result);
    } catch (err) {
      console.error('[cron] alert engine error', err);
    }
  }, { timezone: 'America/New_York' });

  console.log('[cron] scheduled daily alert engine at 08:00 ET');
}
