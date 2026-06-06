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
    return MaterialApp(
      title: 'Your Turn',
      theme: ThemeData(
        textTheme: GoogleFonts.nunitoTextTheme(Theme.of(context).textTheme),
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.lightBlueAccent),
      ),
      home: MyHomePage(title: 'Your Turn', camera: camera),
    );
  }
}

class MyHomePage extends StatefulWidget {
  final String title;
  final CameraDescription camera; 
  
  const MyHomePage({super.key, required this.title, required this.camera});

  @override
  State<MyHomePage> createState() => _MyHomePageState();
}

class _MyHomePageState extends State<MyHomePage> {
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        centerTitle: true,
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
        title: Column(
          children: [
            Text(widget.title),
            const Text(
              'Aplikacja do zarządzania kolejkami',
              style: TextStyle(fontSize: 14),
            )
          ],
        ),
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Text('Nie jesteś aktualnie w żadnej kolejce'),
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: () {
                // Wywołujemy nasz własny widget okienka i przekazujemy mu aparat!
                showDialog(
                  context: context,
                  builder: (BuildContext context) {
                    return SkanerDialog(camera: widget.camera);
                  },
                );
              },
              child: const Text('Ustaw się w kolejce'),
            )
          ],
        ),
      ),
    );
  }
}

// ============================================================
// NASZE WŁASNE OKIENKO ZE SKANEREM (StatefulWidget)
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
      ResolutionPreset.medium, // Średnia jakość w zupełności wystarczy do kodów QR
    );
    _initializeControllerFuture = _controller.initialize();
  }

  // To najważniejsza funkcja! Kiedy użytkownik zamyka okienko (klika "Anuluj" lub tło), 
  // aparat jest bezpiecznie wyłączany.
  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _qrTextCode(BuildContext context){
  final TextEditingController codeController = TextEditingController();
  Navigator.of(context).pop();
  showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: const Text('Wprowadź kod ręcznie'),
          content: TextField(
            controller: codeController, // Tutaj podpinamy nasz kontroler
            decoration: InputDecoration(
              hintText: 'Wpisz swój kod...',
              prefixIcon: const Icon(Icons.keyboard),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
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
                final String wpisanyKod =codeController.text;
                print('Użytkownik wpisał kod: $wpisanyKod');
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
      title: const Text('Zeskanuj kod QR', textAlign: TextAlign.center),
      // Używamy SizedBox, żeby ograniczyć wielkość aparatu w okienku
      content: SizedBox(
        width: 300,
        height: 300,
        // ClipRRect zaokrągla rogi naszego aparatu, żeby wyglądał elegancko
        child: ClipRRect(
          borderRadius: BorderRadius.circular(12),
          child: FutureBuilder<void>(
            future: _initializeControllerFuture,
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.done) {
                // Jeśli gotowe - pokazujemy podgląd
                return CameraPreview(_controller);
              } else {
                // Kręciołek podczas włączania aparatu
                return const Center(child: CircularProgressIndicator());
              }
            },
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () {
            _qrTextCode(context);
          },
          child: const Text('Dodaj kod ręcznie'),
        ),
        TextButton(
          onPressed: (){
            Navigator.of(context).pop();
          },
          child: const Text('Anuluj'),
          )
      ],
    );
  }
}