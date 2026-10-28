import SideNav, { type NavGroup } from './ui/SideNav';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userName: string;
  onLogout: () => void;
  open: boolean;
  onClose: () => void;
}

const GROUPS: NavGroup[] = [
  { items: [{ key: 'strona_glowna', label: 'Pulpit', icon: 'grid' }] },
  {
    label: 'Konfiguracja',
    items: [
      { key: 'lokalizacje', label: 'Lokalizacje', icon: 'pin' },
      { key: 'tablety', label: 'Tablety', icon: 'tablet' },
      { key: 'uzytkownicy', label: 'Użytkownicy', icon: 'users' },
    ],
  },
  { label: 'Konto', items: [{ key: 'ustawienia', label: 'Ustawienia', icon: 'cog' }] },
];

export default function Sidebar({ activeTab, setActiveTab, userName, onLogout, open, onClose }: SidebarProps) {
  return (
    <SideNav
      label="Nawigacja administratora"
      groups={GROUPS}
      activeTab={activeTab}
      onSelect={setActiveTab}
      userName={userName}
      roleLabel="Administrator"
      onLogout={onLogout}
      open={open}
      onClose={onClose}
    />
  );
}
