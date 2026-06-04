import { useState } from 'react';

interface LoginFormProps {
  onLoginSuccess: (role: 'admin' | 'user', username: string) => void;
}

export default function LoginForm({ onLoginSuccess }: LoginFormProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (username === 'admin' && password === 'admin123') {
      onLoginSuccess('admin', 'Administrator');
    } else if (username === 'user' && password === 'user123') {
      onLoginSuccess('user', 'Personel');
    } else {
      setError('Nieprawidłowy login lub hasło.');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f0f2f5] px-4">
      <div className="flex w-full max-w-5xl flex-col lg:flex-row lg:items-center lg:justify-between lg:space-x-12">
        
        <div className="mb-10 text-center lg:mb-0 lg:w-1/2 lg:text-left">
          <h1 className="text-5xl font-bold text-[#1877f2] lg:text-6xl mb-4">
            eQue
          </h1>
          <p className="text-2xl text-gray-700">
            Zarządzaj kolejkami w swojej placówce szybko i wygodnie.
          </p>
        </div>

        <div className="mx-auto w-full max-w-md lg:w-1/2">
          <div className="rounded-xl bg-white p-8 shadow-lg">
            <form onSubmit={handleLogin} className="flex flex-col space-y-4">
              <input
                type="text"
                placeholder="Nazwa użytkownika (np. admin lub user)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="rounded-md border border-gray-300 p-3.5 text-lg outline-none focus:border-[#1877f2] focus:ring-1 focus:ring-[#1877f2]"
                required
              />
              <input
                type="password"
                placeholder="Hasło (np. admin123 lub user123)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-md border border-gray-300 p-3.5 text-lg outline-none focus:border-[#1877f2] focus:ring-1 focus:ring-[#1877f2]"
                required
              />
              
              {error && (
                <p className="text-center text-sm text-red-500">{error}</p>
              )}

              <button
                type="submit"
                className="rounded-md bg-[#1877f2] py-3 text-xl font-bold text-white transition-colors hover:bg-[#166fe5]"
              >
                Zaloguj się
              </button>
              
              <div className="my-4 border-b border-gray-200"></div>
              
              <p className="text-center text-sm text-gray-500">
                System eQue przeznaczony jest wyłącznie dla personelu.
              </p>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}