import SideNav from './ui/SideNav';
import type { QueueSummary } from '../lib/useQueueSummaries';

interface UserSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userName: string;
  onLogout: () => void;
  onRefresh?: () => Promise<void> | void;
  /** Kolejki operatora z liczbą czekających — zakładki w grupie „Kolejki”. */
  queues?: QueueSummary[];
  open: boolean;
  onClose: () => void;
}

export default function UserSidebar({ activeTab, setActiveTab, userName, onLogout, onRefresh, queues, open, onClose }: UserSidebarProps) {
  return (
    <SideNav
      label="Nawigacja operatora"
      groups={[
        { items: [{ key: 'strona_glowna', label: 'Pulpit', icon: 'grid' }] },
        ...(queues && queues.length > 0 ? [{
          label: 'Kolejki',
          items: queues.map(q => ({
            key: `kolejka:${q.id}`,
            label: q.name,
            letter: q.queue_code,
            count: q.waiting > 0 ? q.waiting : undefined, // przy pustej kolejce bez liczby
            ariaLabel: `${q.queue_code} ${q.name}, czeka: ${q.waiting}`,
          })),
        }] : []),
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
