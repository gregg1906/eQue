import { useState } from 'react';
import LoginForm from './components/LoginForm';
import AdminDashboard from './components/AdminDashboard';
import Sidebar from './components/Sidebar';

type Role = 'admin' | 'user' | null;

export default function App() {
  const [role, setRole] = useState<Role>(null);
  const [userName, setUserName] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('strona_glowna');

  const handleLoginSuccess = (loggedRole: Role, loggedName: string) => {
    setRole(loggedRole);
    setUserName(loggedName);
  };

  const handleLogout = () => {
    setRole(null);
    setUserName('');
  };

  if (!role) {
    return <LoginForm onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f0f2f5]">
      <nav className="flex h-14 flex-shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6 shadow-sm z-20">
        <h1 className="text-2xl font-bold text-[#1877f2]">eQue</h1>
        <div className="flex items-center space-x-4">
          <span className="font-semibold text-gray-700">Witaj, {userName}!</span>
          <button 
            onClick={handleLogout}
            className="rounded-md bg-gray-200 px-4 py-1.5 font-semibold text-gray-700 transition hover:bg-gray-300"
          >
            Wyloguj
          </button>
        </div>
      </nav>

      <div className="flex flex-1 overflow-hidden">
        {role === 'admin' && (
          <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        )}

        <main className="flex-1 overflow-y-auto px-4 py-8">
          <div className="mx-auto w-full max-w-5xl">
            {role === 'admin' ? (
              activeTab === 'strona_glowna' ? (
                <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-200">
                  <p className="text-gray-500">Strona główna (w przygotowaniu)</p>
                </div>
              ) : activeTab === 'tablety' ? (
                <AdminDashboard />
              ) : activeTab === 'lokalizacje' ? (
                <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-200">
                  <p className="text-gray-500">Moduł lokalizacji (w przygotowaniu)</p>
                </div>
              ) : activeTab === 'uzytkownicy' ? (
                <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-200">
                  <p className="text-gray-500">Moduł użytkowników (w przygotowaniu)</p>
                </div>
              ) : (
                <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-200">
                  <p className="text-gray-500">Pusta zakładka</p>
                </div>
              )
            ) : (
              <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-200">
                <h2 className="mb-4 text-xl font-bold text-gray-800">
                  Panel Personelu (Użytkownika)
                </h2>
                <p className="text-gray-600">
                  Zalogowano pomyślnie. Wkrótce dodamy tutaj podgląd i zarządzanie kolejką pacjentów.
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}