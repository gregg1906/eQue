import SideNav from './ui/SideNav';

interface UserSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userName: string;
  onLogout: () => void;
  /** Liczba czekających we wszystkich lokalizacjach operatora (licznik przy „Kolejka na żywo”). */
  waitingCount?: number;
  open: boolean;
  onClose: () => void;
}

export default function UserSidebar({ activeTab, setActiveTab, userName, onLogout, waitingCount, open, onClose }: UserSidebarProps) {
  return (
    <SideNav
      label="Nawigacja operatora"
      groups={[
        {
          items: [
            { key: 'kolejka', label: 'Kolejka na żywo', icon: 'queue', count: waitingCount },
            { key: 'strona_glowna', label: 'Pulpit', icon: 'grid' },
          ],
        },
        { label: 'Konto', items: [{ key: 'ustawienia', label: 'Ustawienia', icon: 'cog' }] },
      ]}
      activeTab={activeTab}
      onSelect={setActiveTab}
      userName={userName}
      roleLabel="Operator"
      onLogout={onLogout}
      open={open}
      onClose={onClose}
    />
  );
}
