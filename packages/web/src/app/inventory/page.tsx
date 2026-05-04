import { AppShell } from '@/components/layout/AppShell';
import { InventoryClient } from './InventoryClient';

export default function InventoryPage() {
  return (
    <AppShell title="Inventory">
      <InventoryClient />
    </AppShell>
  );
}
