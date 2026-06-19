import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'queue_status_screen.dart';

class ScanScreen extends StatefulWidget {
  final CameraDescription camera;

  const ScanScreen({super.key, required this.camera});

  @override
  State<ScanScreen> createState() => _ScanScreenState();
}

class _ScanScreenState extends State<ScanScreen> {
  late CameraController _controller;
  late Future<void> _initializeControllerFuture;
  final TextEditingController _kodController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _controller = CameraController(widget.camera, ResolutionPreset.medium);
    _initializeControllerFuture = _controller.initialize();
  }

  @override
  void dispose() {
    _controller.dispose();
    _kodController.dispose();
    super.dispose();
  }

  void _przejdzDoKolejki(String kod) {
    if (kod.isEmpty) return;
    // pushReplacement sprawia, że po wejściu w stan kolejki, przycisk "wstecz" nie cofnie nas do skanera
    Navigator.pushReplacement(
      context,
      MaterialPageRoute(
        builder: (context) => QueueStatusScreen(numerBiletu: kod.toUpperCase()),
      ),
    );
  }

  void _pokazOkienkoReczne() {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: const Text('Wprowadź kod ręcznie', style: TextStyle(fontWeight: FontWeight.bold)),
          content: TextField(
            controller: _kodController,
            decoration: InputDecoration(
              hintText: 'Wpisz kod np. A12...',
              prefixIcon: const Icon(Icons.keyboard, color: Colors.grey),
              filled: true,
              fillColor: const Color(0xFFF0F2F5),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: BorderSide.none,
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Anuluj'),
            ),
            ElevatedButton(
              onPressed: () {
                final String wpisanyKod = _kodController.text;
                Navigator.of(context).pop();
                _przejdzDoKolejki(wpisanyKod);
              },
              child: const Text('Zatwierdź'),
            ),
          ],
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Zeskanuj kod QR'),
      ),
      body: Column(
        children: [
          Expanded(
            child: FutureBuilder<void>(
              future: _initializeControllerFuture,
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.done) {
                  return Center(
                    child: Container(
                      margin: const EdgeInsets.all(24),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: const Color(0xFF1877F2), width: 3),
                      ),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(13),
                        child: CameraPreview(_controller),
                      ),
                    ),
                  );
                } else {
                  return const Center(child: CircularProgressIndicator());
                }
              },
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(24.0),
            child: Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      side: const BorderSide(color: Color(0xFF1877F2)),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    onPressed: _pokazOkienkoReczne,
                    icon: const Icon(Icons.keyboard, color: Color(0xFF1877F2)),
                    label: const Text('Wpisz kod ręcznie', style: TextStyle(color: Color(0xFF1877F2), fontWeight: FontWeight.bold)),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}