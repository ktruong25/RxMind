import { AppShell } from '@/components/layout/AppShell';
import { PatientsClient } from './PatientsClient';

export default function PatientsPage() {
  return (
    <AppShell title="Patients">
      <PatientsClient />
    </AppShell>
  );
}
