# Wykorzystujemy oficjalny obraz z preinstalowanym Flutterem
FROM ghcr.io/cirruslabs/flutter:stable AS dev

WORKDIR /app

# Kopiujemy pliki konfiguracyjne i pobieramy zależności
COPY pubspec.* ./
RUN flutter pub get

# Kopiujemy resztę kodu
COPY . .

# Uruchamiamy aplikację w trybie web-server
CMD ["flutter", "run", "-d", "web-server", "--web-hostname", "0.0.0.0", "--web-port", "3000"]