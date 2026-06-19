import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import '../main.dart'; 

class QueueStatusScreen extends StatefulWidget {
  final String numerBiletu;

  const QueueStatusScreen({super.key, required this.numerBiletu});

  @override
  State<QueueStatusScreen> createState() => _QueueStatusScreenState();
}

class _QueueStatusScreenState extends State<QueueStatusScreen> {
  Timer? _odliczanie;
  final int _czasNaOsobeWSekundach = 15;
  int _czasObecnejOsobyWSekundach = 0;
  int _osobyPrzedNami = 3;
  int _poczatkoweOsoby = 3;

  @override
  void initState() {
    super.initState();
    _czasObecnejOsobyWSekundach = _czasNaOsobeWSekundach;
    _startTimer();
  }

  @override
  void dispose() {
    _odliczanie?.cancel();
    super.dispose();
  }

  void _startTimer() {
    _odliczanie = Timer.periodic(const Duration(seconds: 1), (timer) {
      setState(() {
        if (_osobyPrzedNami > 0) {
          _czasObecnejOsobyWSekundach--;
          if (_czasObecnejOsobyWSekundach <= 0) {
            _osobyPrzedNami--;
            if (_osobyPrzedNami > 0) {
              _czasObecnejOsobyWSekundach = _czasNaOsobeWSekundach;
              _pokazPowiadomienie(_osobyPrzedNami);
            } else {
              _pokazPowiadomienie(0);
            }
          }
        } else {
          timer.cancel();
        }
      });
    });
  }

  Future<void> _pokazPowiadomienie(int ileOsobZostalo) async {
    const AndroidNotificationDetails androidPlatformChannelSpecifics = AndroidNotificationDetails(
      'eque_kolejka_kanal',
      'Powiadomienia o kolejce',
      channelDescription: 'Informuje, gdy kolejka przesuwa się do przodu',
      importance: Importance.max,
      priority: Priority.high,
      color: Color(0xFF1877F2),
    );
    const NotificationDetails platformChannelSpecifics = NotificationDetails(android: androidPlatformChannelSpecifics);

    if (ileOsobZostalo > 0) {
      await flutterLocalNotificationsPlugin.show(
        id: 0,
        title: 'Kolejka posuwa się do przodu!',
        body: 'Osoba przed Tobą została obsłużona. Zostało osób: $ileOsobZostalo.',
        notificationDetails: platformChannelSpecifics,
      );
    } else {
      await flutterLocalNotificationsPlugin.show(
        id: 1,
        title: '🔔 ZARAZ TWOJA KOLEJ!',
        body: 'Podejdź do wyznaczonego stanowiska (Okienko 3).',
        notificationDetails: platformChannelSpecifics,
      );
    }
  }

  void _potwierdzOpuszczenieKolejki() {
    showDialog(
      context: context,
      builder: (BuildContext dialogContext) {
        return AlertDialog(
          title: const Text('Opuścić kolejkę?', style: TextStyle(fontWeight: FontWeight.bold)),
          content: const Text('Czy na pewno chcesz zrezygnować z miejsca w kolejce? Tej operacji nie będzie można cofnąć.'),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(),
              child: const Text('Zostaję'),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: Colors.redAccent),
              onPressed: () {
                _odliczanie?.cancel();
                flutterLocalNotificationsPlugin.cancelAll();
                Navigator.of(dialogContext).pop();
                Navigator.of(context).pop(); 
              },
              child: const Text('Tak, rezygnuję'),
            ),
          ],
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    int calkowityPozostalyCzas = 0;
    if (_osobyPrzedNami > 0) {
      calkowityPozostalyCzas = ((_osobyPrzedNami - 1) * _czasNaOsobeWSekundach) + _czasObecnejOsobyWSekundach;
    }

    int minuty = calkowityPozostalyCzas ~/ 60;
    int sekundy = calkowityPozostalyCzas % 60;
    String tekstCzasu = "$minuty:${sekundy.toString().padLeft(2, '0')}";

    double postep = _poczatkoweOsoby > 0 ? calkowityPozostalyCzas / (_poczatkoweOsoby * _czasNaOsobeWSekundach) : 0.0;

    return Scaffold(
      appBar: AppBar(title: const Text('Status Twojej Wizyty')),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.grey.shade200),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.04),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text('Twój numer biletowy:', style: TextStyle(fontSize: 14, color: Colors.black54)),
                Text(
                  widget.numerBiletu,
                  style: const TextStyle(fontSize: 56, fontWeight: FontWeight.w900, color: Color(0xFF1877F2), letterSpacing: 2),
                ),
                const Divider(height: 40, thickness: 1),
                if (_osobyPrzedNami > 0) ...[
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('STANOWISKO', style: TextStyle(fontSize: 11, color: Colors.black54, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 4),
                      const Text('Okienko 3 (Rejestracja)', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.black87)),
                      const SizedBox(height: 24),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('OSOBY PRZED TOBĄ', style: TextStyle(fontSize: 11, color: Colors.black54, fontWeight: FontWeight.bold)),
                              const SizedBox(height: 4),
                              Row(
                                children: [
                                  const Icon(Icons.people, size: 20, color: Colors.black87),
                                  const SizedBox(width: 6),
                                  Text('$_osobyPrzedNami', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: Colors.black87)),
                                ],
                              ),
                            ],
                          ),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              const Text('SZAC. CZAS', style: TextStyle(fontSize: 11, color: Colors.black54, fontWeight: FontWeight.bold)),
                              const SizedBox(height: 4),
                              Text(tekstCzasu, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: Color(0xFF1877F2))),
                            ],
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      TweenAnimationBuilder<double>(
                        tween: Tween<double>(begin: postep, end: postep),
                        duration: const Duration(milliseconds: 500),
                        builder: (context, value, child) {
                          return ClipRRect(
                            borderRadius: BorderRadius.circular(8),
                            child: LinearProgressIndicator(
                              value: value,
                              minHeight: 12,
                              backgroundColor: Colors.grey.shade200,
                              valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF1877F2)),
                            ),
                          );
                        },
                      ),
                    ],
                  ),
                ] else ...[
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
                    decoration: BoxDecoration(
                      color: Colors.green.shade50,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.green.shade400, width: 2),
                    ),
                    child: const Column(
                      children: [
                        Icon(Icons.check_circle, color: Colors.green, size: 64),
                        SizedBox(height: 16),
                        Text('TWOJA KOLEJ!', style: TextStyle(fontSize: 28, fontWeight: FontWeight.w900, color: Colors.green)),
                        SizedBox(height: 8),
                        Text('Podejdź do punktu obsługi\n(Okienko 3)', textAlign: TextAlign.center, style: TextStyle(fontSize: 16, color: Colors.black87, fontWeight: FontWeight.bold)),
                      ],
                    ),
                  ),
                ],
                const SizedBox(height: 32),
                if (_osobyPrzedNami > 0)
                  TextButton.icon(
                    onPressed: _potwierdzOpuszczenieKolejki,
                    icon: const Icon(Icons.exit_to_app, color: Colors.redAccent),
                    label: const Text('Zrezygnuj z kolejki', style: TextStyle(color: Colors.redAccent, fontWeight: FontWeight.bold)),
                  )
                else
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
                      onPressed: () => Navigator.of(context).pop(),
                      child: const Text('Zakończ wizytę', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                    ),
                  )
              ],
            ),
          ),
        ),
      ),
    );
  }
}