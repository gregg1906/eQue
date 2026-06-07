import { useState } from 'react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
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
          title={isCollapsed ? "Strona główna" : ""}
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
          onClick={() => setActiveTab('tablety')}
          title={isCollapsed ? "Tablety" : ""}
          className={`flex w-full items-center px-6 py-3 space-x-4 transition-colors ${
            activeTab === 'tablety' 
              ? 'bg-blue-50 border-l-4 border-[#1877f2] text-[#1877f2]' 
              : 'border-l-4 border-transparent text-gray-700 hover:bg-gray-50 hover:text-gray-900'
          }`}
        >
          <svg className="h-6 w-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          {!isCollapsed && <span className="font-semibold whitespace-nowrap">Tablety</span>}
        </button>
        
        <button
          onClick={() => setActiveTab('lokalizacje')}
          title={isCollapsed ? "Lokalizacje" : ""}
          className={`flex w-full items-center px-6 py-3 space-x-4 transition-colors ${
            activeTab === 'lokalizacje' 
              ? 'bg-blue-50 border-l-4 border-[#1877f2] text-[#1877f2]' 
              : 'border-l-4 border-transparent text-gray-700 hover:bg-gray-50 hover:text-gray-900'
          }`}
        >
          <svg className="h-6 w-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {!isCollapsed && <span className="font-semibold whitespace-nowrap">Lokalizacje</span>}
        </button>

        <button
          onClick={() => setActiveTab('uzytkownicy')}
          title={isCollapsed ? "Użytkownicy" : ""}
          className={`flex w-full items-center px-6 py-3 space-x-4 transition-colors ${
            activeTab === 'uzytkownicy' 
              ? 'bg-blue-50 border-l-4 border-[#1877f2] text-[#1877f2]' 
              : 'border-l-4 border-transparent text-gray-700 hover:bg-gray-50 hover:text-gray-900'
          }`}
        >
          <svg className="h-6 w-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          {!isCollapsed && <span className="font-semibold whitespace-nowrap">Użytkownicy</span>}
        </button>
      </nav>
    </aside>
  );
}