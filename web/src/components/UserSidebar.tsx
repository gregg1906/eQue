import SideNav from './ui/SideNav';

interface UserSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userName: string;
  onLogout: () => void;
  onRefresh?: () => Promise<void> | void;
  /** Liczba czekających we wszystkich lokalizacjach operatora (licznik przy „Kolejka na żywo”). */
  waitingCount?: number;
  open: boolean;
  onClose: () => void;
}

export default function UserSidebar({ activeTab, setActiveTab, userName, onLogout, onRefresh, waitingCount, open, onClose }: UserSidebarProps) {
  return (
    <SideNav
      label="Nawigacja operatora"
      groups={[
        {
          items: [
            { key: 'strona_glowna', label: 'Pulpit', icon: 'grid' },
            { key: 'kolejka', label: 'Kolejka na żywo', icon: 'queue', count: waitingCount },
          ],
        },
        { label: 'Konto', items: [{ key: 'ustawienia', label: 'Ustawienia', icon: 'cog' }] },
      ]}
      activeTab={activeTab}
      onSelect={setActiveTab}
      userName={userName}
      onLogout={onLogout}
      onRefresh={onRefresh}
      open={open}
      onClose={onClose}
    />
  );
}
