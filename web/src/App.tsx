import { useState } from 'react';
import LoginForm from './components/LoginForm';

type Role = 'admin' | 'user' | null;

export default function App() {
  const [role, setRole] = useState<Role>(null);
  const [userName, setUserName] = useState<string>('');

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
    <div className="min-h-screen bg-[#f0f2f5]">
      <nav className="flex h-14 items-center justify-between bg-white px-6 shadow-sm">
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

      <main className="mx-auto mt-8 max-w-5xl px-4">
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-bold text-gray-800">
            {role === 'admin' ? 'Panel Administratora' : 'Panel Personelu'}
          </h2>
          <p className="text-gray-600">
            Zalogowano pomyślnie. Tutaj w przyszłości znajdą się narzędzia do zarządzania kolejkami.
          </p>
        </div>
      </main>
    </div>
  );
}