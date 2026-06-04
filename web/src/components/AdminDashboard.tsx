import { useState } from 'react';

interface Device {
  id: string;
  name: string;
  location: string;
}

export default function AdminDashboard() {
  const [devices, setDevices] = useState<Device[]>([
    { id: '1', name: 'Tablet Wejściowy', location: 'Hol Główny' },
    { id: '2', name: 'Tablet Rejestracja', location: 'Okienko 1' },
    { id: '3', name: 'Kiosk Kardiologia', location: 'Piętro 2' },
  ]);
  
  const [isPopupOpen, setIsPopupOpen] = useState(false);

  const handleSimulateScan = () => {
    const newDevice: Device = {
      id: Date.now().toString(),
      name: `Nowy Tablet (${devices.length + 1})`,
      location: 'Nieprzypisany',
    };
    
    setDevices([...devices, newDevice]);
    setIsPopupOpen(false);
  };

  return (
    <div className="relative">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Zarządzanie tabletami</h2>
        <button
          onClick={() => setIsPopupOpen(true)}
          className="rounded-md bg-[#1877f2] px-4 py-2 font-semibold text-white transition-colors hover:bg-[#166fe5]"
        >
          + Dodaj urządzenie
        </button>
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-sm border border-gray-200">
        <ul className="divide-y divide-gray-100">
          {devices.map((device) => (
            <li key={device.id} className="flex items-center justify-between p-4 transition-colors hover:bg-gray-50">
              <div>
                <p className="font-semibold text-gray-800">{device.name}</p>
                <p className="text-sm text-gray-500">Lokalizacja: {device.location}</p>
              </div>
              <div className="flex space-x-2">
                <button className="rounded-md bg-gray-100 px-3 py-1.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-200">
                  Edytuj
                </button>
                <button className="rounded-md bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100">
                  Usuń
                </button>
              </div>
            </li>
          ))}
          {devices.length === 0 && (
            <li className="p-6 text-center text-gray-500">Brak dodanych urządzeń.</li>
          )}
        </ul>
      </div>

      {isPopupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl">
            <h3 className="mb-2 text-center text-xl font-bold text-gray-800">Skonfiguruj nowe urządzenie</h3>
            <p className="mb-6 text-center text-sm text-gray-500">
              Uruchom aplikację eQue na nowym tablecie i zeskanuj poniższy kod, aby połączyć je z systemem.
            </p>
            
            <div className="mx-auto mb-8 flex h-48 w-48 items-center justify-center rounded-lg border-4 border-dashed border-gray-300 bg-gray-50">
              <svg className="h-24 w-24 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 3h6v6H3V3zm12 0h6v6h-6V3zM3 15h6v6H3v-6zm12 0h6v6h-6v-6z" />
              </svg>
            </div>

            <div className="flex justify-between space-x-3">
              <button
                onClick={() => setIsPopupOpen(false)}
                className="flex-1 rounded-md bg-gray-200 py-2.5 font-semibold text-gray-700 transition-colors hover:bg-gray-300"
              >
                Wstecz
              </button>
              <button
                onClick={handleSimulateScan}
                className="flex-1 rounded-md bg-[#1877f2] py-2.5 font-semibold text-white transition-colors hover:bg-[#166fe5]"
              >
                Zeskanowano
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}