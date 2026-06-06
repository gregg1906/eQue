import { useState } from 'react';

interface Location {
  id: string;
  name: string;
  description: string;
  userIds: string[];
}

interface UserData {
  id: string;
  fullName: string;
  locationIds: string[];
}

export default function AdminLocations() {
  const [users, setUsers] = useState<UserData[]>(() => {
    const savedUsers = localStorage.getItem('eque_users');
    if (savedUsers) return JSON.parse(savedUsers);
    return [
      { id: 'usr1', fullName: 'Jan Kowalski', locationIds: ['loc1', 'loc3'] },
      { id: 'usr2', fullName: 'Anna Nowak', locationIds: ['loc1', 'loc2'] },
      { id: 'usr3', fullName: 'Piotr Wiśniewski', locationIds: ['loc3'] },
    ];
  });
  
  const [locations, setLocations] = useState<Location[]>(() => {
    const savedLocations = localStorage.getItem('eque_locations');
    if (savedLocations) return JSON.parse(savedLocations);
    return [
      { id: 'loc1', name: 'Hol Główny', description: 'Parter, przy wejściu A', userIds: ['usr1', 'usr2'] },
      { id: 'loc2', name: 'Okienko Rejestracji 1', description: 'Parter, skrzydło wschodnie', userIds: ['usr2'] },
      { id: 'loc3', name: 'Gabinet Kardiologiczny 12', description: 'Piętro 2', userIds: ['usr1', 'usr3'] },
    ];
  });
  
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);

  const handleAddLocation = () => {
    if (!newName.trim()) return;

    const newLocation: Location = {
      id: Date.now().toString(),
      name: newName,
      description: newDescription.trim() ? newDescription : 'Brak opisu',
      userIds: selectedUserIds,
    };
    
    const updatedLocations = [...locations, newLocation];
    setLocations(updatedLocations);
    localStorage.setItem('eque_locations', JSON.stringify(updatedLocations));
    
    const updatedUsers = users.map((u: UserData) => {
      if (selectedUserIds.includes(u.id)) {
        return { ...u, locationIds: Array.from(new Set([...(u.locationIds || []), newLocation.id])) };
      }
      return u;
    });
    localStorage.setItem('eque_users', JSON.stringify(updatedUsers));
    setUsers(updatedUsers);
    
    setIsSidePanelOpen(false);
    setNewName('');
    setNewDescription('');
    setSelectedUserIds([]);
  };

  const handleSaveEdit = () => {
    if (!editingLocation) return;
    
    const updatedLocations = locations.map(l => l.id === editingLocation.id ? editingLocation : l);
    setLocations(updatedLocations);
    localStorage.setItem('eque_locations', JSON.stringify(updatedLocations));

    const updatedUsers = users.map((u: UserData) => {
      const filteredLocs = (u.locationIds || []).filter(id => id !== editingLocation.id);
      if (editingLocation.userIds.includes(u.id)) {
        filteredLocs.push(editingLocation.id);
      }
      return { ...u, locationIds: Array.from(new Set(filteredLocs)) };
    });
    
    localStorage.setItem('eque_users', JSON.stringify(updatedUsers));
    setUsers(updatedUsers);
    setEditingLocation(null);
  };

  if (editingLocation) {
    return (
      <div className="mx-auto max-w-2xl animate-fade-in">
        <button 
          onClick={() => setEditingLocation(null)}
          className="mb-6 flex items-center text-sm font-semibold text-gray-500 transition-colors hover:text-gray-800"
        >
          <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Wróć do listy lokalizacji
        </button>

        <div className="rounded-xl bg-white p-8 shadow-sm border border-gray-200">
          <h2 className="mb-6 text-2xl font-bold text-gray-800">Edycja lokalizacji</h2>
          
          <div className="flex flex-col space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">Nazwa lokalizacji</label>
              <input
                type="text"
                value={editingLocation.name}
                onChange={(e) => setEditingLocation({ ...editingLocation, name: e.target.value })}
                className="w-full rounded-md border border-gray-300 p-3 outline-none focus:border-[#1877f2] focus:ring-1 focus:ring-[#1877f2]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">Opis</label>
              <textarea
                value={editingLocation.description}
                onChange={(e) => setEditingLocation({ ...editingLocation, description: e.target.value })}
                rows={3}
                className="w-full rounded-md border border-gray-300 p-3 outline-none focus:border-[#1877f2] focus:ring-1 focus:ring-[#1877f2]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">Przypisani użytkownicy</label>
              <div className="max-h-60 overflow-y-auto rounded-md border border-gray-300 bg-white">
                {users.map(user => (
                  <label key={user.id} className="flex cursor-pointer items-center px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0">
                    <input
                      type="checkbox"
                      checked={editingLocation.userIds.includes(user.id)}
                      onChange={(e) => {
                        const newUserIds = e.target.checked 
                          ? [...editingLocation.userIds, user.id]
                          : editingLocation.userIds.filter(id => id !== user.id);
                        setEditingLocation({ ...editingLocation, userIds: newUserIds });
                      }}
                      className="mr-3 h-4 w-4 rounded border-gray-300 text-[#1877f2] focus:ring-[#1877f2]"
                    />
                    <span className="text-sm font-medium text-gray-700">{user.fullName}</span>
                  </label>
                ))}
                {users.length === 0 && <div className="p-4 text-sm text-gray-500">Brak dostępnych użytkowników</div>}
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-end space-x-3 border-t border-gray-100 pt-6">
            <button
              onClick={() => setEditingLocation(null)}
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
    );
  }

  return (
    <div className="relative animate-fade-in">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Zarządzanie lokalizacjami</h2>
        <button
          onClick={() => setIsSidePanelOpen(true)}
          className="rounded-md bg-[#1877f2] px-4 py-2 font-semibold text-white transition-colors hover:bg-[#166fe5]"
        >
          + Dodaj lokalizację
        </button>
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-sm border border-gray-200">
        <ul className="divide-y divide-gray-100">
          {locations.map((location) => (
            <li key={location.id}>
              <button 
                onClick={() => setEditingLocation(location)}
                className="group flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-blue-50"
              >
                <div>
                  <p className="font-semibold text-gray-800 transition-colors group-hover:text-[#1877f2]">
                    {location.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {location.description} • Przypisani użytkownicy: {(location.userIds || []).length}
                  </p>
                </div>
                <div>
                  <svg className="h-5 w-5 text-gray-400 transition-colors group-hover:text-[#1877f2]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            </li>
          ))}
          {locations.length === 0 && (
            <li className="p-6 text-center text-gray-500">Brak dodanych lokalizacji.</li>
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
          <h3 className="text-xl font-bold text-gray-800">Nowa lokalizacja</h3>
          <button onClick={() => setIsSidePanelOpen(false)} className="rounded-md p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="flex flex-col space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">Nazwa lokalizacji</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="np. Gabinet 12"
                className="w-full rounded-md border border-gray-300 p-3 outline-none focus:border-[#1877f2] focus:ring-1 focus:ring-[#1877f2]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">Opis (opcjonalnie)</label>
              <textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="np. Piętro 1, skrzydło wschodnie"
                rows={3}
                className="w-full rounded-md border border-gray-300 p-3 outline-none focus:border-[#1877f2] focus:ring-1 focus:ring-[#1877f2]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">Przypisz użytkowników (Opcjonalne)</label>
              <div className="max-h-48 overflow-y-auto rounded-md border border-gray-300 bg-white">
                {users.map(user => (
                  <label key={user.id} className="flex cursor-pointer items-center px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0">
                    <input
                      type="checkbox"
                      checked={selectedUserIds.includes(user.id)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedUserIds([...selectedUserIds, user.id]);
                        else setSelectedUserIds(selectedUserIds.filter(id => id !== user.id));
                      }}
                      className="mr-3 h-4 w-4 rounded border-gray-300 text-[#1877f2] focus:ring-[#1877f2]"
                    />
                    <span className="text-sm font-medium text-gray-700">{user.fullName}</span>
                  </label>
                ))}
                {users.length === 0 && <div className="p-4 text-sm text-gray-500">Brak dostępnych użytkowników</div>}
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 px-6 py-4 flex justify-end space-x-3 bg-gray-50">
          <button onClick={() => setIsSidePanelOpen(false)} className="rounded-md bg-white border border-gray-300 px-4 py-2 font-semibold text-gray-700 transition-colors hover:bg-gray-50">
            Anuluj
          </button>
          <button onClick={handleAddLocation} className="rounded-md bg-[#1877f2] px-6 py-2 font-semibold text-white transition-colors hover:bg-[#166fe5]">
            Dodaj
          </button>
        </div>
      </aside>
    </div>
  );
}