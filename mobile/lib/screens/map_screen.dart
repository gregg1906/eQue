import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:http/http.dart' as http;

class Placowka {
  final String id;
  final String name;
  final String adress;
  final LatLng pozycja;
  final int openedWindows;

  Placowka({
    required this.id,
    required this.name,
    required this.adress,
    required this.pozycja,
    required this.openedWindows,
  });

  // Konstruktor do parsowania JSON-a z API
  factory Placowka.fromJson(Map<String, dynamic> json) {
    return Placowka(
      id: json['id'].toString(),
      name: json['name'] ?? 'Nieznana placówka',
      adress: json['adress'] ?? 'Brak adresu',
      // Mapujemy lat i lng z JSON na obiekt LatLng
      pozycja: LatLng(
        (json['lat'] as num?)?.toDouble() ?? 0.0,
        (json['lng'] as num?)?.toDouble() ?? 0.0,
      ),
      openedWindows: json['openedWindows'] ?? 0,
    );
  }
}

class MapScreen extends StatefulWidget {
  const MapScreen({super.key});

  @override
  State<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends State<MapScreen> {
  List<Placowka> _placowki = [];
  Placowka? _wybranaPlacowka;
  bool _isLoading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _pobierzPlacowkiZAPI();
  }

  Future<void> _pobierzPlacowkiZAPI() async {
    // TUTAJ WKLEJ SWÓJ LINK Z MOCKAPI.IO:
    const String apiUrl = 'https://6a351e41f957779fdb3021c8.mockapi.io/locations';

    try {
      final response = await http.get(Uri.parse(apiUrl)).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        // Dekodujemy JSON z odpowiedzi
        final List<dynamic> data = jsonDecode(response.body);
        
        setState(() {
          // Mapujemy listę JSON na listę obiektów Placowka
          _placowki = data.map((json) => Placowka.fromJson(json)).toList();
          if (_placowki.isNotEmpty) {
            _wybranaPlacowka = _placowki.first;
          }
          _isLoading = false;
        });
      } else {
        setState(() {
          _errorMessage = 'Błąd pobierania danych (Kod: ${response.statusCode})';
          _isLoading = false;
        });
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'Brak połączenia z siecią lub błąd API.';
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Mapa Placówek'),
      ),
      body: _budujCialoEkranu(),
    );
  }

  Widget _budujCialoEkranu() {
    // Stan 1: Ładowanie danych
    if (_isLoading) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CircularProgressIndicator(),
            SizedBox(height: 16),
            Text('Pobieranie placówek z API...'),
          ],
        ),
      );
    }

    // Stan 2: Błąd API
    if (_errorMessage != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.cloud_off, size: 64, color: Colors.redAccent),
            const SizedBox(height: 16),
            Text(_errorMessage!, style: const TextStyle(color: Colors.redAccent, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () {
                setState(() {
                  _isLoading = true;
                  _errorMessage = null;
                });
                _pobierzPlacowkiZAPI();
              },
              child: const Text('Spróbuj ponownie'),
            )
          ],
        ),
      );
    }

    // Stan 3: Sukces - wyświetlanie mapy z danymi
    return Stack(
      children: [
        FlutterMap(
          options: const MapOptions(
            initialCenter: LatLng(50.0614, 19.9380), // Centrum Krakowa
            initialZoom: 12.5,
          ),
          children: [
            TileLayer(
              urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
              userAgentPackageName: 'com.example.eque',
            ),
            MarkerLayer(
              markers: _placowki.map((placowka) {
                final czyWybrana = placowka == _wybranaPlacowka;
                return Marker(
                  point: placowka.pozycja,
                  width: 60,
                  height: 60,
                  child: GestureDetector(
                    onTap: () {
                      setState(() {
                        _wybranaPlacowka = placowka;
                      });
                    },
                    child: Icon(
                      Icons.location_on,
                      color: czyWybrana ? Colors.red : const Color(0xFF1877F2),
                      size: czyWybrana ? 50 : 40,
                    ),
                  ),
                );
              }).toList(),
            ),
          ],
        ),
        if (_wybranaPlacowka != null)
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
                            _wybranaPlacowka!.name,
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            _wybranaPlacowka!.adress,
                            style: const TextStyle(color: Colors.black54, fontSize: 13),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Aktywne okienka: ${_wybranaPlacowka!.openedWindows}',
                            style: const TextStyle(color: Colors.green, fontSize: 12, fontWeight: FontWeight.bold),
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
    );
  }
}