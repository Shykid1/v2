import { DashboardShell } from '@/components/shells/dashboard-shell';

export default function ProviderLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell role="provider">{children}</DashboardShell>;
}
