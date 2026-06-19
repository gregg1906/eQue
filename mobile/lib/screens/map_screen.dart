import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

// Klasa pomocnicza do przechowywania danych placówki
class Placowka {
  final String nazwa;
  final String adres;
  final LatLng pozycja;
  final int aktywneOkienka;

  Placowka({
    required this.nazwa,
    required this.adres,
    required this.pozycja,
    required this.aktywneOkienka,
  });
}

class MapScreen extends StatefulWidget {
  const MapScreen({super.key});

  @override
  State<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends State<MapScreen> {
  // Lista 3 rzeczywistych placówek Urzędu Miasta Krakowa
  final List<Placowka> _placowki = [
    Placowka(
      nazwa: 'UMK - Wydział Komunikacji',
      adres: 'al. Powstania Warszawskiego 10, Kraków',
      pozycja: const LatLng(50.0614, 19.9650),
      aktywneOkienka: 4,
    ),
    Placowka(
      nazwa: 'UMK - Pałac Wielopolskich',
      adres: 'pl. Wszystkich Świętych 3-4, Kraków',
      pozycja: const LatLng(50.0594, 19.9372),
      aktywneOkienka: 2,
    ),
    Placowka(
      nazwa: 'UMK - Podgórze',
      adres: 'ul. Wielicka 28a, Kraków',
      pozycja: const LatLng(50.0336, 19.9723),
      aktywneOkienka: 3,
    ),
  ];

  // Zmienna przechowująca aktualnie klikniętą placówkę na mapie
  late Placowka _wybranaPlacowka;

  @override
  void initState() {
    super.initState();
    // Domyślnie wybieramy pierwszą placówkę z listy
    _wybranaPlacowka = _placowki.first;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Mapa Placówek UMK'),
      ),
      body: Stack(
        children: [
          FlutterMap(
            options: const MapOptions(
              // Ustawiamy środek mapy w centrum Krakowa
              initialCenter: LatLng(50.0614, 19.9380),
              initialZoom: 12.5,
            ),
            children: [
              TileLayer(
                urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                userAgentPackageName: 'com.example.eque',
              ),
              MarkerLayer(
                markers: _placowki.map((placowka) {
                  // Sprawdzamy, czy ten marker dotyczy wybranej placówki
                  final czyWybrana = placowka == _wybranaPlacowka;
                  
                  return Marker(
                    point: placowka.pozycja,
                    width: 60,
                    height: 60,
                    child: GestureDetector(
                      onTap: () {
                        // Przebudowanie widoku po kliknięciu w inny marker
                        setState(() {
                          _wybranaPlacowka = placowka;
                        });
                      },
                      child: Icon(
                        Icons.location_on,
                        // Wybrany marker jest czerwony i większy, reszta to niebieskie pinezki
                        color: czyWybrana ? Colors.red : const Color(0xFF1877F2),
                        size: czyWybrana ? 50 : 40,
                      ),
                    ),
                  );
                }).toList(),
              ),
            ],
          ),
          // Karta na dole ekranu, która zmienia się dynamicznie w zależności od klikniętego markera
          Positioned(
            bottom: 16,
            left: 16,
            right: 16,
            child: Card(
              color: Colors.white,
              elevation: 4,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Row(
                  children: [
                    const Icon(Icons.account_balance, color: Color(0xFF1877F2), size: 36),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            _wybranaPlacowka.nazwa, 
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)
                          ),
                          const SizedBox(height: 2),
                          Text(
                            _wybranaPlacowka.adres, 
                            style: const TextStyle(color: Colors.black54, fontSize: 13)
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Aktywne okienka: ${_wybranaPlacowka.aktywneOkienka}', 
                            style: const TextStyle(color: Colors.green, fontSize: 12, fontWeight: FontWeight.bold)
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}