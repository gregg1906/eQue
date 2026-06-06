import { useState } from 'react';

interface Location {
  id: string;
  name: string;
}

interface UserData {
  id: string;
  fullName: string;
  locationIds: string[];
}

interface QueueEntry {
  id: number;
  name: string;
  appointmentTime: string;
}

const INITIAL_QUEUE: QueueEntry[] = [
  { id: 1, name: 'Piotr Kowalski',      appointmentTime: '09:15' },
  { id: 2, name: 'Maria Wiśniewska',    appointmentTime: '09:30' },
  { id: 3, name: 'Tomasz Dąbrowski',    appointmentTime: '09:45' },
  { id: 4, name: 'Zofia Jabłońska',     appointmentTime: '10:00' },
  { id: 5, name: 'Krzysztof Nowak',     appointmentTime: '11:15' },
  { id: 6, name: 'Barbara Malinowska',  appointmentTime: '12:30' },
];

export default function UserQueue({ userName }: { userName: string }) {
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [queues, setQueues] = useState<Record<string, QueueEntry[]>>({});

  const [allLocations] = useState<Location[]>(() => {
    const saved = localStorage.getItem('eque_locations');
    return saved ? JSON.parse(saved) : [];
  });

  const [allUsers] = useState<UserData[]>(() => {
    const saved = localStorage.getItem('eque_users');
    return saved ? JSON.parse(saved) : [];
  });

  const currentUser = allUsers.find(u => u.fullName === userName);
  const assignedLocationIds = currentUser?.locationIds || [];
  const availableLocations = allLocations.filter(l => assignedLocationIds.includes(l.id));

  const currentQueue = selectedLocationId
    ? (queues[selectedLocationId] ?? INITIAL_QUEUE)
    : [];

  const handleServed = (id: number) => {
    setQueues(prev => ({
      ...prev,
      [selectedLocationId]: (prev[selectedLocationId] ?? INITIAL_QUEUE).filter(e => e.id !== id),
    }));
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex items-center justify-between gap-6">
        <h2 className="text-2xl font-bold text-gray-800 whitespace-nowrap">Kolejka pacjentów</h2>

        {availableLocations.length === 0 ? (
          <p className="text-sm font-semibold text-red-500">
            Nie masz przypisanych żadnych lokalizacji. Skontaktuj się z administratorem.
          </p>
        ) : (
          <select
            value={selectedLocationId}
            onChange={(e) => setSelectedLocationId(e.target.value)}
            className="rounded-md border border-gray-300 p-2.5 outline-none focus:border-[#1877f2] focus:ring-1 focus:ring-[#1877f2] bg-white text-sm font-medium text-gray-700 min-w-48"
          >
            <option value="">-- Wybierz lokalizację --</option>
            {availableLocations.map(loc => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </select>
        )}
      </div>

      {selectedLocationId && (
        currentQueue.length === 0 ? (
          <div className="rounded-xl bg-white p-10 shadow-sm border border-gray-200 text-center">
            <svg className="mx-auto mb-3 h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="font-semibold text-gray-500">Kolejka jest pusta</p>
            <p className="mt-1 text-sm text-gray-400">Wszyscy pacjenci zostali obsłużeni.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl bg-white shadow-sm border border-gray-200">
            <ul className="divide-y divide-gray-100">
              {currentQueue.map((entry, index) => (
                <li key={entry.id} className="flex items-center justify-between p-4">
                  <div className="flex items-center space-x-4">
                    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-[#1877f2]">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-semibold text-gray-800">{entry.name}</p>
                      <p className="text-sm text-gray-500">
                        Wizyta: <span className="font-medium text-gray-700">{entry.appointmentTime}</span>
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleServed(entry.id)}
                    className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    Obsłużono
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )
      )}
    </div>
  );
}
