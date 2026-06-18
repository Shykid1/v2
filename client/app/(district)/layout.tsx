import { DashboardShell } from '@/components/shells/dashboard-shell';

export default function DistrictLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell role="district_officer">{children}</DashboardShell>;
}
