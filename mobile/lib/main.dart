import 'dart:async';
import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  final cameras = await availableCameras();
  final firstCamera = cameras.first;

  runApp(MyApp(camera: firstCamera));
}

class MyApp extends StatelessWidget {
  final CameraDescription camera; 
  
  const MyApp({super.key, required this.camera});

  @override
  Widget build(BuildContext context) {
    const primaryBlue = Color(0xFF1877F2); 
    const bgColor = Color(0xFFF0F2F5);     

    return MaterialApp(
      title: 'eQue',
      theme: ThemeData(
        scaffoldBackgroundColor: bgColor,
        textTheme: GoogleFonts.nunitoTextTheme(Theme.of(context).textTheme),
        colorScheme: ColorScheme.fromSeed(
          seedColor: primaryBlue, 
          primary: primaryBlue,
        ),
        appBarTheme: const AppBarTheme(
          backgroundColor: Colors.white,
          foregroundColor: Colors.black87,
          elevation: 1,
          shadowColor: Colors.black26,
          centerTitle: true,
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: primaryBlue,
            foregroundColor: Colors.white,
            elevation: 0,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(8),
            ),
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          ),
        ),
        textButtonTheme: TextButtonThemeData(
          style: TextButton.styleFrom(
            foregroundColor: Colors.grey.shade700, 
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(8),
            ),
          ),
        ),
        dialogTheme: DialogThemeData(
          backgroundColor: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
            side: BorderSide(color: Colors.grey.shade200),
          ),
        ),
      ),
      home: MyHomePage(camera: camera),
    );
  }
}

class MyHomePage extends StatefulWidget {
  final CameraDescription camera; 
  
  const MyHomePage({super.key, required this.camera});

  @override
  State<MyHomePage> createState() => _MyHomePageState();
}

class _MyHomePageState extends State<MyHomePage> {
  bool _wKolejce = false;
  String _numerBiletu = "";
  
  Timer? _odliczanie;
  int _calkowityCzasWSekundach = 0; 
  int _pozostalyCzasWSekundach = 0; 

  @override
  void dispose() {
    _odliczanie?.cancel();
    super.dispose();
  }

  void _dolaczDoKolejki(String wpisanyKod) {
    setState(() {
      _wKolejce = true;
      _numerBiletu = wpisanyKod.toUpperCase(); 
      _calkowityCzasWSekundach = 2*60;
      _pozostalyCzasWSekundach = _calkowityCzasWSekundach;
    });

    _odliczanie?.cancel();

    _odliczanie = Timer.periodic(const Duration(seconds: 1), (timer) {
      setState(() {
        if (_pozostalyCzasWSekundach > 0) {
          _pozostalyCzasWSekundach--;
        } else {
          timer.cancel(); 
        }
      });
    });
  }

  void _opuscKolejke() {
    _odliczanie?.cancel(); 
    setState(() {
      _wKolejce = false;
      _numerBiletu = "";
      _pozostalyCzasWSekundach = 0;
    });
  }

  void _potwierdzOpuszczenieKolejki(BuildContext context) {
    showDialog(
      context: context,
      builder: (BuildContext dialogContext) {
        return AlertDialog(
          title: const Text('Opuścić kolejkę?', style: TextStyle(fontWeight: FontWeight.bold)),
          content: const Text('Czy na pewno chcesz zrezygnować z miejsca w kolejce? Tej operacji nie będzie można cofnąć.'),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.of(dialogContext).pop();
              },
              child: const Text('Zostaję'),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.redAccent,
              ),
              onPressed: () {
                Navigator.of(dialogContext).pop();
                _opuscKolejke();                   
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
    int minuty = _pozostalyCzasWSekundach ~/ 60;
    int sekundy = _pozostalyCzasWSekundach % 60;
    String tekstCzasu = "$minuty:${sekundy.toString().padLeft(2, '0')}";

    double postep = _calkowityCzasWSekundach > 0 
        ? _pozostalyCzasWSekundach / _calkowityCzasWSekundach 
        : 0.0;

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'eQue',
          style: TextStyle(
            color: Color(0xFF1877F2),
            fontWeight: FontWeight.bold,
            fontSize: 24,
          ),
        ),
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Container(
            width: double.infinity,
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
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                if (!_wKolejce) ...[
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF0F2F5),
                      borderRadius: BorderRadius.circular(50),
                    ),
                    child: const Icon(Icons.people_alt_outlined, size: 48, color: Color(0xFF1877F2)),
                  ),
                  const SizedBox(height: 20),
                  const Text('Panel Pacjenta', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  const Text('Nie jesteś aktualnie w żadnej kolejce.\nZeskanuj kod, aby dołączyć.', textAlign: TextAlign.center, style: TextStyle(fontSize: 15, color: Colors.black54)),
                  const SizedBox(height: 28),
                  
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () {
                        showDialog(
                          context: context,
                          builder: (BuildContext context) {
                            return SkanerDialog(
                              camera: widget.camera,
                              onKodZeskanowany: _dolaczDoKolejki, 
                            );
                          },
                        );
                      },
                      child: const Text('Ustaw się w kolejce', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                    ),
                  )
                ] else ...[
                  const Text(
                    'Twój numer biletowy:',
                    style: TextStyle(fontSize: 14, color: Colors.black54),
                  ),
                  Text(
                    _numerBiletu, 
                    style: const TextStyle(
                      fontSize: 56, 
                      fontWeight: FontWeight.w900, 
                      color: Color(0xFF1877F2),
                      letterSpacing: 2,
                    ),
                  ),
                  const Divider(height: 40, thickness: 1),
                  
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
                          Text(
                            _pozostalyCzasWSekundach > 0 ? 'Pozostały czas' : 'Status kolejki', 
                            style: const TextStyle(fontSize: 11, color: Colors.black54, fontWeight: FontWeight.bold)
                          ),
                          Text(
                            _pozostalyCzasWSekundach > 0 ? tekstCzasu : 'Zaraz Twoja kolej!', 
                            style: TextStyle(
                              fontSize: 14, 
                              fontWeight: FontWeight.w900, 
                              color: _pozostalyCzasWSekundach > 0 ? const Color(0xFF1877F2) : Colors.green,
                            )
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      
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
                              valueColor: AlwaysStoppedAnimation<Color>(
                                _pozostalyCzasWSekundach > 0 ? const Color(0xFF1877F2) : Colors.green
                              ), 
                            ),
                          );
                        },
                      ),
                    ],
                  ),
                  
                  const SizedBox(height: 32),
                  
                  TextButton.icon(
                    onPressed: () => _potwierdzOpuszczenieKolejki(context),
                    icon: const Icon(Icons.exit_to_app, color: Colors.redAccent),
                    label: const Text('Zrezygnuj z kolejki', style: TextStyle(color: Colors.redAccent, fontWeight: FontWeight.bold)),
                  )
                ]
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class SkanerDialog extends StatefulWidget {
  final CameraDescription camera;
  final Function(String) onKodZeskanowany; 
  
  const SkanerDialog({
    super.key, 
    required this.camera, 
    required this.onKodZeskanowany,
  });

  @override
  State<SkanerDialog> createState() => _SkanerDialogState();
}

class _SkanerDialogState extends State<SkanerDialog> {
  late CameraController _controller;
  late Future<void> _initializeControllerFuture;

  @override
  void initState() {
    super.initState();
    _controller = CameraController(widget.camera, ResolutionPreset.medium);
    _initializeControllerFuture = _controller.initialize();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _pokazOkienkoReczne(BuildContext glownyContext) {
    final TextEditingController kodController = TextEditingController();

    Navigator.of(glownyContext).pop();

    showDialog(
      context: glownyContext,
      builder: (BuildContext context) {
        return AlertDialog(
          title: const Text('Wprowadź kod ręcznie', style: TextStyle(fontWeight: FontWeight.bold)),
          content: TextField(
            controller: kodController, 
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
                final String wpisanyKod = kodController.text;
                if(wpisanyKod.isNotEmpty) {
                  widget.onKodZeskanowany(wpisanyKod);
                }
                Navigator.of(context).pop();
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
    return AlertDialog(
      title: const Text('Zeskanuj kod QR', textAlign: TextAlign.center, style: TextStyle(fontWeight: FontWeight.bold)),
      content: SizedBox(
        width: 300,
        height: 300,
        child: ClipRRect(
          borderRadius: BorderRadius.circular(8),
          child: FutureBuilder<void>(
            future: _initializeControllerFuture,
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.done) {
                return CameraPreview(_controller);
              } else {
                return const Center(child: CircularProgressIndicator());
              }
            },
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => _pokazOkienkoReczne(context),
          child: const Text('Dodaj ręcznie', style: TextStyle(fontWeight: FontWeight.w600)),
        ),
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Anuluj'),
        )
      ],
    );
  }
}