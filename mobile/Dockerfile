# Wykorzystujemy oficjalny obraz z preinstalowanym Flutterem
FROM ghcr.io/cirruslabs/flutter:3.19.0 AS dev

WORKDIR /app

# Kopiujemy pliki konfiguracyjne i pobieramy zależności
COPY pubspec.* ./
RUN flutter pub get

# Kopiujemy resztę kodu
COPY . .

# Uruchamiamy aplikację w trybie web-server
CMD ["flutter", "run", "-d", "web-server", "--web-hostname", "0.0.0.0", "--web-port", "3000"]