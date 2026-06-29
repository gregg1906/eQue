interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const NAV = [
  {
    key: 'strona_glowna',
    label: 'Strona główna',
    icon: (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
      </svg>
    ),
  },
  {
    key: 'tablety',
    label: 'Tablety',
    icon: (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="2" width="16" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>
      </svg>
    ),
  },
  {
    key: 'lokalizacje',
    label: 'Lokalizacje',
    icon: (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a7 7 0 017 7c0 5.25-7 13-7 13S5 14.25 5 9a7 7 0 017-7z"/><circle cx="12" cy="9" r="2.5"/>
      </svg>
    ),
  },
  {
    key: 'uzytkownicy',
    label: 'Użytkownicy',
    icon: (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
      </svg>
    ),
  },
];

export default function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  return (
    <aside style={{
      width: 232,
      flexShrink: 0,
      background: 'var(--surface-card)',
      borderRight: '1px solid var(--border-subtle)',
      display: 'flex',
      flexDirection: 'column',
      padding: '16px 12px',
    }}>
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV.map((item) => {
          const active = activeTab === item.key;
          return (
            <button
              key={item.key}
              onClick={() => setActiveTab(item.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 11,
                padding: '10px 12px',
                border: 'none',
                cursor: 'pointer',
                borderRadius: 'var(--radius-md)',
                textAlign: 'left',
                width: '100%',
                background: active ? 'var(--brand-subtle)' : 'transparent',
                color: active ? 'var(--text-brand)' : 'var(--text-body)',
                fontFamily: 'var(--font-ui)',
                fontSize: 14.5,
                fontWeight: active ? 700 : 600,
                transition: `background var(--dur-fast) var(--ease-out)`,
              }}
              onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--surface-sunken)'; }}
              onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
            >
              {item.icon}
              {item.label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
