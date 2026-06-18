import {
  BarChart3,
  ClipboardList,
  Droplets,
  Home,
  Map,
  Radio,
  Settings,
  ShieldCheck,
  Truck,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import type { Role } from '@/lib/types';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV: Record<Role, NavItem[]> = {
  household: [
    { href: '/household', label: 'My pits', icon: Droplets },
    { href: '/household/request', label: 'Request desludging', icon: Truck },
    { href: '/household/jobs', label: 'Jobs', icon: ClipboardList },
    { href: '/household/settings', label: 'Settings', icon: Settings },
  ],
  provider: [
    { href: '/provider', label: 'Jobs', icon: Truck },
    { href: '/provider/earnings', label: 'Earnings', icon: Wallet },
    { href: '/provider/account', label: 'Account', icon: Settings },
  ],
  admin: [
    { href: '/admin', label: 'Overview', icon: Map },
    { href: '/admin/dispatch', label: 'Dispatch', icon: Radio },
    { href: '/admin/facilities', label: 'Facilities', icon: Droplets },
    { href: '/admin/providers', label: 'Providers', icon: Truck },
    { href: '/admin/users', label: 'Users', icon: Users },
    { href: '/admin/reports', label: 'Reports', icon: BarChart3 },
    { href: '/admin/settings', label: 'Settings', icon: Settings },
  ],
  district_officer: [
    { href: '/district', label: 'Overview', icon: Map },
    { href: '/district/facilities', label: 'Monitoring', icon: Droplets },
    { href: '/district/alerts', label: 'Regulation', icon: ShieldCheck },
    { href: '/district/reports', label: 'Reports', icon: BarChart3 },
  ],
};

export const ROLE_HOME: Record<Role, string> = {
  household: '/household',
  provider: '/provider',
  admin: '/admin',
  district_officer: '/district',
};

export { Home };
