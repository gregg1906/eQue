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
    // Definiujemy kolory z Twojego kodu webowego (Tailwind)
    const primaryBlue = Color(0xFF1877F2); // Główny niebieski
    const bgColor = Color(0xFFF0F2F5);     // Jasnoszare tło (FB style)

    return MaterialApp(
      title: 'eQue',
      theme: ThemeData(
        scaffoldBackgroundColor: bgColor, // Tło całej aplikacji
        textTheme: GoogleFonts.nunitoTextTheme(Theme.of(context).textTheme),
        colorScheme: ColorScheme.fromSeed(
          seedColor: primaryBlue, 
          primary: primaryBlue,
        ),
        
        // 1. Stylizacja paska górnego (biały z niebieskim tekstem)
        appBarTheme: const AppBarTheme(
          backgroundColor: Colors.white,
          foregroundColor: Colors.black87,
          elevation: 1,
          shadowColor: Colors.black26,
          centerTitle: true,
        ),
        
        // 2. Stylizacja głównych przycisków
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: primaryBlue,
            foregroundColor: Colors.white,
            elevation: 0,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(8), // rounded-md
            ),
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          ),
        ),

        // 3. Stylizacja przycisków pobocznych (np. Anuluj)
        textButtonTheme: TextButtonThemeData(
          style: TextButton.styleFrom(
            foregroundColor: Colors.grey.shade700, // Ciemnoszary tekst
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(8),
            ),
          ),
        ),

        // 4. Stylizacja okienek (Dialogów)
        dialogTheme: DialogThemeData(
          backgroundColor: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12), // rounded-xl
            side: BorderSide(color: Colors.grey.shade200), // border-gray-200
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
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'eQue',
          style: TextStyle(
            color: Color(0xFF1877F2), // Niebieski napis na białym tle
            fontWeight: FontWeight.bold,
            fontSize: 24,
          ),
        ),
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          // BIAŁA KARTA (Odpowiednik: bg-white p-6 shadow-sm border border-gray-200 rounded-xl z web)
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
              mainAxisSize: MainAxisSize.min, // Karta dopasowuje wysokość do zawartości
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // Ikonka dla ładniejszego wyglądu
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF0F2F5),
                    borderRadius: BorderRadius.circular(50),
                  ),
                  child: const Icon(
                    Icons.people_alt_outlined, 
                    size: 48, 
                    color: Color(0xFF1877F2),
                  ),
                ),
                const SizedBox(height: 20),
                
                const Text(
                  'Panel Pacjenta',
                  style: TextStyle(
                    fontSize: 20, 
                    fontWeight: FontWeight.bold,
                    color: Colors.black87,
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Nie jesteś aktualnie w żadnej kolejce.\nZeskanuj kod, aby dołączyć.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 15,
                    color: Colors.black54, // Odpowiednik text-gray-500
                  ),
                ),
                const SizedBox(height: 28),
                
                SizedBox(
                  width: double.infinity, // Przycisk na całą szerokość karty
                  child: ElevatedButton(
                    onPressed: () {
                      showDialog(
                        context: context,
                        builder: (BuildContext context) {
                          return SkanerDialog(camera: widget.camera);
                        },
                      );
                    },
                    child: const Text(
                      'Ustaw się w kolejce',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                    ),
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

// ============================================================
// NASZE WŁASNE OKIENKO ZE SKANEREM
// ============================================================
class SkanerDialog extends StatefulWidget {
  final CameraDescription camera;
  const SkanerDialog({super.key, required this.camera});

  @override
  State<SkanerDialog> createState() => _SkanerDialogState();
}

class _SkanerDialogState extends State<SkanerDialog> {
  late CameraController _controller;
  late Future<void> _initializeControllerFuture;

  @override
  void initState() {
    super.initState();
    _controller = CameraController(
      widget.camera,
      ResolutionPreset.medium, 
    );
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
              fillColor: const Color(0xFFF0F2F5), // Tło pola tekstowego pod styl webowy
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: BorderSide.none, // Ukrywamy czarną ramkę, zostawiamy tło
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.of(context).pop();
              },
              child: const Text('Anuluj'),
            ),
            ElevatedButton(
              onPressed: () {
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
          borderRadius: BorderRadius.circular(8), // Zmniejszone zaokrąglenie aparatu
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
          onPressed: () {
            _pokazOkienkoReczne(context);
          },
          child: const Text('Dodaj ręcznie', style: TextStyle(fontWeight: FontWeight.w600)),
        ),
        TextButton(
          onPressed: () {
            Navigator.of(context).pop();
          },
          child: const Text('Anuluj'),
        )
      ],
    );
  }
}