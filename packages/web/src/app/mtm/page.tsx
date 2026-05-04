import { AppShell } from '@/components/layout/AppShell';
import { MtmClient } from './MtmClient';

export default function MtmPage() {
  return (
    <AppShell title="MTM Opportunities">
      <MtmClient />
    </AppShell>
  );
}
