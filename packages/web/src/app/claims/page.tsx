import { AppShell } from '@/components/layout/AppShell';
import { ClaimsClient } from './ClaimsClient';

export default function ClaimsPage() {
  return (
    <AppShell title="Claims">
      <ClaimsClient />
    </AppShell>
  );
}
