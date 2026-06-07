import { useState } from 'react';

interface UserSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function UserSidebar({ activeTab, setActiveTab }: UserSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside className={`${isCollapsed ? 'w-20' : 'w-64'} flex flex-col flex-shrink-0 border-r border-gray-200 bg-white shadow-sm z-10 transition-all duration-300 overflow-hidden`}>
      <div className="flex h-14 items-center px-6 border-b border-gray-100">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {isCollapsed ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M6 5l7 7-7 7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7M18 19l-7-7 7-7" />
            )}
          </svg>
        </button>
      </div>

      <nav className="flex-1 py-4">
        <button
          onClick={() => setActiveTab('strona_glowna')}
          title={isCollapsed ? 'Strona główna' : ''}
          className={`flex w-full items-center px-6 py-3 space-x-4 transition-colors ${
            activeTab === 'strona_glowna'
              ? 'bg-blue-50 border-l-4 border-[#1877f2] text-[#1877f2]'
              : 'border-l-4 border-transparent text-gray-700 hover:bg-gray-50 hover:text-gray-900'
          }`}
        >
          <svg className="h-6 w-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          {!isCollapsed && <span className="font-semibold whitespace-nowrap">Strona główna</span>}
        </button>

        <button
          onClick={() => setActiveTab('kolejka')}
          title={isCollapsed ? 'Kolejka' : ''}
          className={`flex w-full items-center px-6 py-3 space-x-4 transition-colors ${
            activeTab === 'kolejka'
              ? 'bg-blue-50 border-l-4 border-[#1877f2] text-[#1877f2]'
              : 'border-l-4 border-transparent text-gray-700 hover:bg-gray-50 hover:text-gray-900'
          }`}
        >
          <svg className="h-6 w-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          {!isCollapsed && <span className="font-semibold whitespace-nowrap">Kolejka</span>}
        </button>
      </nav>
    </aside>
  );
}
