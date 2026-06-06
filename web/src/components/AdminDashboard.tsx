import { useState } from 'react';

interface Device {
  id: string;
  name: string;
  locationId: string;
}

interface Location {
  id: string;
  name: string;
}

export default function AdminDashboard() {
  const [locations] = useState<Location[]>(() => {
    const savedLocations = localStorage.getItem('eque_locations');
    if (savedLocations) return JSON.parse(savedLocations);
    return [
      { id: 'loc1', name: 'Hol Główny' },
      { id: 'loc2', name: 'Okienko Rejestracji 1' },
      { id: 'loc3', name: 'Gabinet Kardiologiczny 12' }
    ];
  });

  const [devices, setDevices] = useState<Device[]>(() => {
    const savedDevices = localStorage.getItem('eque_devices');
    if (savedDevices) return JSON.parse(savedDevices);
    return [
      { id: 'dev1', name: 'Tablet Wejściowy', locationId: 'loc1' },
      { id: 'dev2', name: 'Tablet Rejestracja', locationId: 'loc2' },
      { id: 'dev3', name: 'Kiosk Kardiologia', locationId: 'loc3' },
    ];
  });
  
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);

  const handleSimulateScan = () => {
    const newDevice: Device = {
      id: Date.now().toString(),
      name: '',
      locationId: '',
    };
    
    const updatedDevices = [...devices, newDevice];
    setDevices(updatedDevices);
    localStorage.setItem('eque_devices', JSON.stringify(updatedDevices));
    setIsPopupOpen(false);
  };

  const handleSaveEdit = () => {
    if (!editingDevice) return;
    
    const updatedDevices = devices.map(d => d.id === editingDevice.id ? editingDevice : d);
    setDevices(updatedDevices);
    localStorage.setItem('eque_devices', JSON.stringify(updatedDevices));
    setEditingDevice(null);
  };

  const getLocationName = (locId: string) => {
    const loc = locations.find(l => l.id === locId);
    return loc ? loc.name : '';
  };

  if (editingDevice) {
    return (
      <div className="mx-auto max-w-2xl animate-fade-in">
        <button 
          onClick={() => setEditingDevice(null)}
          className="mb-6 flex items-center text-sm font-semibold text-gray-500 transition-colors hover:text-gray-800"
        >
          <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Wróć do listy tabletów
        </button>

        <div className="rounded-xl bg-white p-8 shadow-sm border border-gray-200">
          <h2 className="mb-6 text-2xl font-bold text-gray-800">Edycja tabletu</h2>
          
          <div className="flex flex-col space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">Nazwa urządzenia</label>
              <input
                type="text"
                value={editingDevice.name}
                onChange={(e) => setEditingDevice({ ...editingDevice, name: e.target.value })}
                placeholder="np. Tablet Rejestracja"
                className="w-full rounded-md border border-gray-300 p-3 outline-none focus:border-[#1877f2] focus:ring-1 focus:ring-[#1877f2]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">Przypisana lokalizacja</label>
              <select
                value={editingDevice.locationId}
                onChange={(e) => setEditingDevice({ ...editingDevice, locationId: e.target.value })}
                className="w-full rounded-md border border-gray-300 p-3 outline-none focus:border-[#1877f2] focus:ring-1 focus:ring-[#1877f2] bg-white"
              >
                <option value="" disabled>Nieprzypisany do żadnej lokacji</option>
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-8 flex justify-end space-x-3 border-t border-gray-100 pt-6">
            <button
              onClick={() => setEditingDevice(null)}
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
          {devices.map((device) => {
            const isNameMissing = !device.name || device.name.startsWith('Nowy Tablet (');
            const isLocMissing = !device.locationId;
            
            return (
              <li key={device.id}>
                <button 
                  onClick={() => setEditingDevice(device)}
                  className="group flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-blue-50"
                >
                  <div>
                    <p className={`font-semibold transition-colors group-hover:text-[#1877f2] ${isNameMissing ? 'text-red-500' : 'text-gray-800'}`}>
                      {isNameMissing ? 'Nazwa nie została ustawiona' : device.name}
                    </p>
                    <p className={`text-sm ${isLocMissing ? 'text-red-500 font-medium' : 'text-gray-500'}`}>
                      Lokalizacja: {isLocMissing ? 'Nieprzypisany do żadnej lokacji' : getLocationName(device.locationId)}
                    </p>
                  </div>
                  <div>
                    <svg 
                      className="h-5 w-5 text-gray-400 transition-colors group-hover:text-[#1877f2]" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              </li>
            );
          })}
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