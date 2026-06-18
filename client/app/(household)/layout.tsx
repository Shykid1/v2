import { DashboardShell } from '@/components/shells/dashboard-shell';

export default function HouseholdLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell role="household">{children}</DashboardShell>;
}
