import { useState } from 'react';

interface UserData {
  id: string;
  fullName: string;
  role: string;
  password: string;
  locationIds: string[];
}

interface Location {
  id: string;
  name: string;
  userIds: string[];
}

export default function AdminUsers() {
  const [locations, setLocations] = useState<Location[]>(() => {
    const savedLocations = localStorage.getItem('eque_locations');
    if (savedLocations) return JSON.parse(savedLocations);
    return [
      { id: 'loc1', name: 'Hol Główny', userIds: ['usr1', 'usr2'] },
      { id: 'loc2', name: 'Okienko Rejestracji 1', userIds: ['usr2'] },
      { id: 'loc3', name: 'Gabinet Kardiologiczny 12', userIds: ['usr1', 'usr3'] },
    ];
  });

  const [users, setUsers] = useState<UserData[]>(() => {
    const savedUsers = localStorage.getItem('eque_users');
    if (savedUsers) return JSON.parse(savedUsers);
    return [
      { id: 'usr1', fullName: 'Jan Kowalski', role: 'Lekarz kardiolog', locationIds: ['loc1', 'loc3'] },
      { id: 'usr2', fullName: 'Anna Nowak', role: 'Recepcjonistka', locationIds: ['loc1', 'loc2'] },
      { id: 'usr3', fullName: 'Piotr Wiśniewski', role: 'Administrator', locationIds: ['loc3'] },
    ];
  });
  
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  const [newFullName, setNewFullName] = useState('');
  const [newUserRole, setNewUserRole] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [editingUser, setEditingUser] = useState<UserData | null>(null);

  const handleAddUser = () => {
    if (!newFullName.trim()) return;

    const newUser: UserData = {
      id: Date.now().toString(),
      fullName: newFullName,
      role: newUserRole.trim() ? newUserRole : 'Brak przypisanej roli',
      password: newPassword,
      locationIds: [],
    };

    const updatedUsers = [...users, newUser];
    setUsers(updatedUsers);
    localStorage.setItem('eque_users', JSON.stringify(updatedUsers));

    setIsSidePanelOpen(false);
    setNewFullName('');
    setNewUserRole('');
    setNewPassword('');
  };

  const handleDeleteUser = () => {
    if (!editingUser) return;
    if (!window.confirm(`Czy na pewno chcesz usunąć pracownika "${editingUser.fullName}"? Tej operacji nie można cofnąć.`)) return;

    const updatedUsers = users.filter(u => u.id !== editingUser.id);
    setUsers(updatedUsers);
    localStorage.setItem('eque_users', JSON.stringify(updatedUsers));

    const updatedLocations = locations.map((l: Location) => ({
      ...l,
      userIds: (l.userIds || []).filter(id => id !== editingUser.id),
    }));
    setLocations(updatedLocations);
    localStorage.setItem('eque_locations', JSON.stringify(updatedLocations));

    setEditingUser(null);
  };

  const handleSaveEdit = () => {
    if (!editingUser) return;
    
    const updatedUsers = users.map(u => u.id === editingUser.id ? editingUser : u);
    setUsers(updatedUsers);
    localStorage.setItem('eque_users', JSON.stringify(updatedUsers));

    const updatedLocations = locations.map((l: Location) => {
      const filteredUsers = (l.userIds || []).filter(id => id !== editingUser.id);
      if (editingUser.locationIds.includes(l.id)) {
        filteredUsers.push(editingUser.id);
      }
      return { ...l, userIds: Array.from(new Set(filteredUsers)) };
    });
    
    localStorage.setItem('eque_locations', JSON.stringify(updatedLocations));
    setLocations(updatedLocations);
    setEditingUser(null);
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0) return '';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  };

  if (editingUser) {
    return (
      <div className="mx-auto max-w-2xl animate-fade-in">
        <button 
          onClick={() => setEditingUser(null)}
          className="mb-6 flex items-center text-sm font-semibold text-gray-500 transition-colors hover:text-gray-800"
        >
          <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Wróć do listy pracowników
        </button>

        <div className="rounded-xl bg-white p-8 shadow-sm border border-gray-200">
          <div className="mb-6 flex items-center space-x-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-[#1877f2]">
              {getInitials(editingUser.fullName)}
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Edycja pracownika</h2>
          </div>
          
          <div className="flex flex-col space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">Imię i nazwisko</label>
              <input
                type="text"
                value={editingUser.fullName}
                onChange={(e) => setEditingUser({ ...editingUser, fullName: e.target.value })}
                className="w-full rounded-md border border-gray-300 p-3 outline-none focus:border-[#1877f2] focus:ring-1 focus:ring-[#1877f2]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">Hasło</label>
              <input
                type="password"
                value={editingUser.password ?? ''}
                onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })}
                placeholder="Zostaw puste aby nie zmieniać"
                className="w-full rounded-md border border-gray-300 p-3 outline-none focus:border-[#1877f2] focus:ring-1 focus:ring-[#1877f2]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">Stanowisko / Rola</label>
              <input
                type="text"
                value={editingUser.role}
                onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                className="w-full rounded-md border border-gray-300 p-3 outline-none focus:border-[#1877f2] focus:ring-1 focus:ring-[#1877f2]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">Przypisane lokalizacje</label>
              <div className="max-h-60 overflow-y-auto rounded-md border border-gray-300 bg-white">
                {locations.map(loc => (
                  <label key={loc.id} className="flex cursor-pointer items-center px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0">
                    <input
                      type="checkbox"
                      checked={editingUser.locationIds.includes(loc.id)}
                      onChange={(e) => {
                        const newLocationIds = e.target.checked 
                          ? [...editingUser.locationIds, loc.id]
                          : editingUser.locationIds.filter(id => id !== loc.id);
                        setEditingUser({ ...editingUser, locationIds: newLocationIds });
                      }}
                      className="mr-3 h-4 w-4 rounded border-gray-300 text-[#1877f2] focus:ring-[#1877f2]"
                    />
                    <span className="text-sm font-medium text-gray-700">{loc.name}</span>
                  </label>
                ))}
                {locations.length === 0 && <div className="p-4 text-sm text-gray-500">Brak dostępnych lokalizacji</div>}
              </div>
            </div>
          </div>

          <div className="mt-8 flex items-center justify-between border-t border-gray-100 pt-6">
            <button
              onClick={handleDeleteUser}
              className="rounded-md border border-red-200 bg-red-50 px-6 py-2.5 font-semibold text-red-600 transition-colors hover:bg-red-100"
            >
              Usuń pracownika
            </button>
            <div className="flex space-x-3">
              <button
                onClick={() => setEditingUser(null)}
                className="rounded-md bg-white border border-gray-300 px-6 py-2.5 font-semibold text-gray-700 transition-colors hover:bg-gray-50"
              >
                Anuluj
              </button>
              <button
                onClick={handleSaveEdit}
                className="rounded-md bg-[#1877f2] px-6 py-2.5 font-semibold text-white transition-colors hover:bg-[#166fe5]"
              >
                Zapisz zmiany
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative animate-fade-in">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Zarządzanie personelem</h2>
        <button
          onClick={() => setIsSidePanelOpen(true)}
          className="rounded-md bg-[#1877f2] px-4 py-2 font-semibold text-white transition-colors hover:bg-[#166fe5]"
        >
          + Dodaj pracownika
        </button>
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-sm border border-gray-200">
        <ul className="divide-y divide-gray-100">
          {users.map((user) => (
            <li key={user.id}>
              <button 
                onClick={() => setEditingUser(user)}
                className="group flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-blue-50"
              >
                <div className="flex items-center space-x-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-gray-600 font-bold group-hover:bg-blue-200 group-hover:text-[#1877f2] transition-colors">
                    {getInitials(user.fullName)}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800 transition-colors group-hover:text-[#1877f2]">
                      {user.fullName}
                    </p>
                    <p className="text-sm text-gray-500">
                      {user.role} • Dostęp do lokalizacji: {(user.locationIds || []).filter(id => locations.some(l => l.id === id)).length}
                    </p>
                  </div>
                </div>
                <div>
                  <svg className="h-5 w-5 text-gray-400 transition-colors group-hover:text-[#1877f2]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            </li>
          ))}
          {users.length === 0 && (
            <li className="p-6 text-center text-gray-500">Brak dodanych użytkowników.</li>
          )}
        </ul>
      </div>

      {isSidePanelOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity"
          onClick={() => setIsSidePanelOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out ${
          isSidePanelOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h3 className="text-xl font-bold text-gray-800">Nowy pracownik</h3>
          <button onClick={() => setIsSidePanelOpen(false)} className="rounded-md p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="flex flex-col space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">Imię i nazwisko</label>
              <input
                type="text"
                value={newFullName}
                onChange={(e) => setNewFullName(e.target.value)}
                placeholder="np. Anna Nowak"
                className="w-full rounded-md border border-gray-300 p-3 outline-none focus:border-[#1877f2] focus:ring-1 focus:ring-[#1877f2]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">Stanowisko / Rola</label>
              <input
                type="text"
                value={newUserRole}
                onChange={(e) => setNewUserRole(e.target.value)}
                placeholder="np. Recepcjonistka"
                className="w-full rounded-md border border-gray-300 p-3 outline-none focus:border-[#1877f2] focus:ring-1 focus:ring-[#1877f2]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">Hasło</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Hasło do logowania"
                className="w-full rounded-md border border-gray-300 p-3 outline-none focus:border-[#1877f2] focus:ring-1 focus:ring-[#1877f2]"
              />
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 px-6 py-4 flex justify-end space-x-3 bg-gray-50">
          <button onClick={() => setIsSidePanelOpen(false)} className="rounded-md bg-white border border-gray-300 px-4 py-2 font-semibold text-gray-700 transition-colors hover:bg-gray-50">
            Anuluj
          </button>
          <button onClick={handleAddUser} className="rounded-md bg-[#1877f2] px-6 py-2 font-semibold text-white transition-colors hover:bg-[#166fe5]">
            Dodaj
          </button>
        </div>
      </aside>
    </div>
  );
}