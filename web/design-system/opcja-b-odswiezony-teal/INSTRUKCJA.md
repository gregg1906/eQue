# Wdrożenie opcji B „Odświeżony teal” w panelu webowym

Instrukcja dla Claude Code (albo dla człowieka) — jak przenieść design system z tego folderu do `web/`.

**Tryb pracy: całość w jednym przebiegu.** Wykonaj wszystkie kroki po kolei bez zatrzymywania się, bez pytań o potwierdzenie i bez czekania na akceptację między krokami. Właściciel ma kopię zapasową na GitHubie. Niejasności rozstrzygaj samodzielnie na podstawie tej instrukcji i makiety, a decyzje wypisz w podsumowaniu na końcu.

## Pliki w tym folderze

| Plik | Co to jest | Jak używać |
|---|---|---|
| `tokens.css` | Tokeny (kolory, typografia, promienie, cienie, animacje) w formacie Tailwind 4. Zachowuje **wszystkie** nazwy zmiennych z obecnego `web/src/index.css`. | Skopiuj do `web/src/tokens.css` i zaimportuj. |
| `eque-odswiezony-teal.html` | Makieta referencyjna: wygląd i zachowanie wszystkich ekranów. Czysty HTML/JS z danymi przykładowymi. | **Tylko jako wzór.** Nie kopiuj kodu — przenieś wygląd na istniejące komponenty React. Otwórz w przeglądarce, żeby zobaczyć ekrany. |
| `INSTRUKCJA.md` | Ten plik. | — |

Logo zostaje bez zmian (`web/public/logo-mark.svg`). Czcionki bez zmian (Space Grotesk + Manrope).

## Prompt do wklejenia w Claude Code

```
Wdróż w web/ design system z folderu web/design-system/opcja-b-odswiezony-teal/.
Przeczytaj najpierw web/design-system/opcja-b-odswiezony-teal/INSTRUKCJA.md i trzymaj się jej.
- tokens.css podepnij w web/src/index.css zamiast obecnych bloków :root i [data-theme="dark"].
- eque-odswiezony-teal.html to makieta referencyjna (wygląd + zachowanie), nie kod do kopiowania.
  Przenieś wygląd na istniejące komponenty React, logikę API i WebSocketów zostaw.
- Najpierw wydziel wspólne komponenty do src/components/ui, potem ekrany w kolejności z sekcji „Kolejność”.
- Przyciski z białym tekstem: var(--brand-strong), nie var(--brand).
- „Cofnij” zrób po stronie frontu (opis w INSTRUKCJA.md). Nie dodawaj endpointów.
- Dodaj w ws.ts sygnał stanu połączenia dla wskaźnika „Na żywo”.
- Nie modyfikuj mobile/ ani backend/.
- Wykonaj CAŁOŚĆ od razu, w jednym przebiegu: wszystkie kroki od 0 do 10 i wymagania techniczne.
  Nie zatrzymuj się między krokami, nie pytaj o potwierdzenie i nie czekaj na moją akceptację.
  Mam kopię zapasową na GitHubie. Decyzje niejasne rozstrzygaj sam według INSTRUKCJA.md i makiety.
- Na końcu uruchom npm run lint i npm run build, napraw błędy i dopiero wtedy podsumuj,
  co zmieniłeś i czego nie dało się zrobić.
```

## Granice

- Zmieniamy **tylko `web/`**. Katalogi `mobile/` i `backend/` należą do innych osób — nie modyfikować.
- Nie dodajemy endpointów ani nie zmieniamy kontraktu API (`backend/API_SPEC.md`).
- Logika danych (`lib/api.ts`, obsługa zdarzeń WS w komponentach, `useImperativeHandle`/`refetch`) zostaje; zmienia się warstwa wyglądu i interakcji.

## Krok 0 — tokeny

1. Skopiuj `tokens.css` do `web/src/tokens.css`.
2. `web/src/index.css`:
   ```css
   @import "tailwindcss";
   @import "./tokens.css";
   ```
   Usuń stare bloki `:root { … }` i `:root[data-theme="dark"] { … }` oraz zduplikowane `@keyframes` (są w tokens.css). Zostaw style `body`, jeśli coś dodają — tokens.css ma już własne.
3. Sprawdź, że `index.html` dalej ładuje Space Grotesk i Manrope (Manrope 400–800, Space Grotesk 500–700).
4. Przełącznik motywu (`data-theme` w `App.tsx`) działa bez zmian.

Po tym kroku aplikacja powinna wyglądać prawie jak dziś. Przejdź od razu do kroku 1.

## Krok 1 — wspólne komponenty `src/components/ui/`

Dziś te same style są kopiowane w każdym pliku (`StatusBadge`, `MiniBadge`, `StatusPill`, `Switch`, `SlidePanel`, `Field`, `btnPrimary`, `inputStyle`…). Zamień je na jeden zestaw:

| Komponent | Wzór w makiecie | Zastępuje dzisiejsze |
|---|---|---|
| `Button` (warianty: `primary`, `secondary`, `ghost`, `danger`; rozmiary `sm`, `md`, `lg`; opcjonalny `kbd`) | Komponenty → Przyciski | `btnPrimary`, `btnDanger`, `btnSecondary`, przyciski w linii w każdym pliku, `AddIconButton` |
| `StatusPill` (tony: `waiting`, `serving`, `served`, `skipped`, `paused`, `online`, `offline`, `neutral`) | Kolor → tabela statusów | `StatusPill` (UserQueue), `StatusBadge` (AdminLocations, AdminDashboard, AdminUsers), `MiniBadge` (AdminHome, UserHome) |
| `TicketCode` (rozmiary: list 20 px, hero `--text-code`) | Kod na liście / panel obsługi | ręcznie stylowane `ticket_code` |
| `QueueLetter` | kółko z literą „A” | `QueueCodeBadge` |
| `Switch` | Komponenty → włącznik | 3 kopie `Switch` |
| `Segmented` | przełącznik lokalizacji / list | zakładki „Oczekujący/Zakończone”, wybór lokalizacji (`Select` w UserQueue) |
| `Field` + `Input` + `Textarea` | Pola formularza (etykieta nad, błąd pod z instrukcją) | `Field`, `inputStyle`, `labelStyle`, `onFocus/onBlur` zmieniające `borderColor` (zastąpić CSS `:focus`) |
| `Drawer` | Lokalizacje → panel edycji | 3 kopie `SlidePanel` |
| `Toast` + `useToast()` | Powiadomienie z „Cofnij” | `alertDialog` dla błędów i sukcesów |
| `LiveIndicator` | „Na żywo” / „Łączenie ponownie…” | `RefreshButton` + `RefreshOverlay` w `App.tsx` |
| `CommandPalette` (Ctrl/Cmd+K) | lupa w nagłówku | `SearchBox` (rozwijana ikonka) |
| `EmptyState` | „Nikt nie czeka” | `EmptyState` w UserQueue i różne `<p>Brak…</p>` |

Zasady dla komponentów:
- Style przez klasy Tailwind z tokenów lub CSS — **bez `onMouseEnter/onMouseLeave` zmieniających `style`**. Hover i focus w CSS (`:hover`, `:focus-visible`).
- Statusy pisane zdaniem („Oczekuje”), bez `textTransform: 'uppercase'` i bez CAPS w tekstach.
- Każdy przycisk akcji ma podpis słowny (ikona opcjonalnie obok), nie tylko ikonę. Wyjątek: zamknij panel, wyloguj — z `aria-label`.
- Jedna skala tekstu: 12 / 13 / 15 / 17 / 20 / 25 / 32 px (`text-xs` … `text-2xl`). Nie używać 12,5 / 13,5 / 14,5 px.
- `confirmDialog` zostaje **tylko** dla akcji nieodwracalnych (usuń lokalizację, usuń użytkownika, usuń tablet, reset tokenu parowania). Dezaktywacja może zostać z potwierdzeniem, bo odłącza przypisania.

## Kolejność i mapowanie ekranów

| # | Plik w `web/src/` | Sekcja makiety | Co zmienić |
|---|---|---|---|
| 1 | `components/UserQueue.tsx` | **Kolejka na żywo** (główny ekran) | Panel „Teraz obsługiwany” w pełnym `--serving-panel` (teal-700) z białym kodem `--text-code`, pulsującą kropką i czasem czekania. Przyciski na panelu: biały „Obsłużono, wezwij następnego” (kbd Enter) i obrysowany „Nie zgłosił się” (kbd N). Gdy nikt nie jest obsługiwany: biały panel z przyciskiem „Wezwij A06”. Wstrzymane zapisy: pasek na górze panelu z wyjaśnieniem. Lokalizacje jako `Segmented` z liczbą czekających zamiast `Select`. Lista: numer pozycji, kod, imię (lub „Bez nazwiska”), godzina dołączenia, czas czekania (bursztynowy od 15 min), przycisk „Wezwij” widoczny na hover/focus i zawsze w pierwszym wierszu. Bez pigułki „OCZEKUJE” w każdym wierszu. Prawa kolumna: karta „Nowe zapisy” z `Switch` (zastępuje przycisk „Wstrzymaj zapisy”), „Twoja zmiana” (obsłużono / nie zgłosiło się + pasek postępu), „Skróty”. Skróty klawiszowe: Enter, N, P (nieaktywne, gdy fokus jest w polu tekstowym). |
| 2 | `components/AdminHome.tsx` | **Pozostałe ekrany → Pulpit administratora** | Zamiast 4 kafelków `StatCard`: jedna linia podsumowania (osoby czekające, kioski online „3 z 4”, operatorzy online). Najpierw karta „Wymaga uwagi” — każdy problem z przyciskiem naprawy, który przełącza na właściwą zakładkę (np. „Przypisz tablet” → Lokalizacje z otwartym panelem). Potem tabela „Lokalizacje teraz”: litera, nazwa, teraz obsługiwany, czeka, najdłużej, kiosk, zapisy. |
| 2b | `components/UserHome.tsx` | jak wyżej, wersja operatora | Ta sama struktura: linia podsumowania, „Najdłużej czekający”, tabela lokalizacji. Brak lokalizacji → `EmptyState` z informacją, do kogo się zwrócić (nie czerwony tekst). |
| 3 | `components/AdminLocations.tsx` | **Pozostałe ekrany → Lokalizacje** | Tabela: litera w kółku + nazwa + opis, kiosk (z kropką online/offline), operatorzy (imiona), status. Kliknięcie wiersza (i Enter na wierszu) otwiera `Drawer`. Usunąć `Switch` i ikonę ołówka z wiersza — aktywacja/dezaktywacja i edycja w panelu. Nad tabelą: stałe pole wyszukiwania + `Segmented` (Wszystkie / Aktywne / Dezaktywowane). W panelu: notatka o kodzie kolejki, pola, kiosk (`Select`), operatorzy (checklista), na dole sekcja „Usuń lokalizację”. Stopka: „Anuluj” / „Zapisz zmiany”. Po zapisie toast „Zapisano zmiany: <nazwa>.” |
| 4 | `components/AdminUsers.tsx` | wzór jak Lokalizacje | Ta sama tabela + `Drawer`. Avatar z kropką online. Rola jako `StatusPill neutral`. |
| 5 | `components/AdminDashboard.tsx` (Tablety) | wzór jak Lokalizacje + statusy | Siatkę kart można zostawić lub zamienić na tabelę jak w Lokalizacjach (preferowana tabela — spójność). Status: Online / Offline / Dezaktywowany jako `StatusPill`, „Widziano 4 min temu” jako podpis. Okno „Dodaj nowy tablet” → `Drawer` z krokiem „Tablet utworzony” i polem tokenu z przyciskiem „Kopiuj” (toast „Skopiowano token.”). |
| 6 | `components/LoginForm.tsx` | **Pozostałe ekrany → Logowanie** | Dwie kolumny: lewa w `--serving-panel` z logo, dużym białym „A05” i jednym zdaniem; prawa z formularzem. Na wąskim ekranie lewa kolumna nad formularzem. Błąd w ramce nad polami: „Login lub hasło są nieprawidłowe. Sprawdź, czy nie masz włączonego Caps Lock.” Usuń placeholdery `admin` / `admin123` z pól. Przycisk `--brand-strong`. |
| 7 | `components/Sidebar.tsx`, `UserSidebar.tsx` | menu w makiecie | Szerokość 224–248 px. Grupy „Konfiguracja” i „Konto” (admin). Aktywna pozycja: tło `--brand-subtle`, tekst `--text-brand`, licznik po prawej (np. liczba czekających przy „Kolejka na żywo”). Avatar z zieloną kropką. Poniżej 860 px menu chowa się (hamburger lub dolny pasek). |
| 8 | `App.tsx` (nagłówek) | nagłówek ekranów | Tytuł 25 px Space Grotesk. Po prawej: `LiveIndicator` zamiast „Odśwież”, podpisany przycisk „Dodaj lokalizację / użytkownika / tablet” zamiast ikony plusa, przycisk palety poleceń z `Ctrl K`. `RefreshOverlay` usunąć — ręczne odświeżenie tylko jako akcja w `LiveIndicator`, gdy połączenie nie wraca. |
| 9 | `components/AdminSettings.tsx` | — | Tylko podmiana na wspólne komponenty (`Field`, `Button`, `Segmented` dla motywu jasny/ciemny/systemowy). |
| 10 | `lib/dialogs.tsx`, `components/ui/Select.tsx` | Komponenty | Przestylować na tokeny (promień 14 px dla okna, 10 px dla kontrolek, `--shadow-xl`). Zachowanie bez zmian. |

## Wymagania techniczne, których nie ma w makiecie

### „Cofnij” bez nowego endpointu

Backend ma tylko `POST /admin/tickets/{id}/call`, `/complete`, `/cancel` — bez cofania. Rozwiązanie po stronie webu:

1. Po kliknięciu (lub skrócie) od razu zaktualizuj UI optymistycznie i pokaż toast z „Cofnij” na 6 s.
2. Żądanie do API wyślij dopiero po 6 s (`setTimeout`) albo natychmiast, gdy operator wykona kolejną akcję (najpierw wyślij oczekującą).
3. „Cofnij” = `clearTimeout` + przywrócenie poprzedniego stanu kolejki w UI.
4. `beforeunload` / `visibilitychange: hidden` → wyślij wszystkie oczekujące akcje od razu (`fetch` z `keepalive: true`).
5. Jeśli API zwróci błąd → przywróć stan i pokaż toast błędu z opisem z `ApiError`.
6. To samo dla „Wstrzymaj / wznów zapisy” (`pause-queue` / `resume-queue`).

Kolejność ma znaczenie: „Obsłużono, wezwij następnego” = `complete` obecnego, potem `call` pierwszego oczekującego — jako jedna oczekująca akcja.

### Stan połączenia w `lib/ws.ts`

Dodaj obok `onReconnect`:

```ts
type WsStatus = 'connected' | 'reconnecting';
onStatus(handler: (s: WsStatus) => void): () => void
```

Emituj `'connected'` w `onopen`, `'reconnecting'` w `onclose`. `LiveIndicator` pokazuje „Na żywo” / „Łączenie ponownie…”, a po ~10 s bez połączenia dokłada przycisk „Odśwież dane” (wywołuje dotychczasowe `contentRef.current.refetch()`).

### Skróty klawiszowe

- Hook `useHotkeys` w `UserQueue`: Enter (obsłużono i wezwij / wezwij pierwszego), N (nie zgłosił się), P (wstrzymaj/wznów).
- Ignoruj, gdy `event.target` to `input`, `textarea`, `select` lub element `contenteditable`, gdy otwarty jest dialog lub paleta, oraz gdy wciśnięto Ctrl/Cmd/Alt.
- Ctrl/Cmd+K globalnie w `App.tsx` → `CommandPalette` (pozycje: zakładki, lokalizacje, akcje operatora, motyw).

### Ograniczenia danych

- Lista „Zakończone” i liczniki „Twoja zmiana” dalej korzystają z `lib/ticketActivity.ts` (tylko pamięć przeglądarki) — backend nie zwraca historii biletów. Zostawić podpis w pustym stanie.
- „Kiosk offline od X min” na pulpicie: z `last_seen_at` tabletu (`TabletResponse`).
- „Operatorzy online”: `UserResponse.online`.

## Dostępność i jakość (sprawdzić na końcu, przed podsumowaniem)

- Biały tekst nigdy na `--brand` (#0FB5AB, 2,5:1). Na przyciskach `--brand-strong` (#0C7B74, 5:1).
- Widoczny `:focus-visible` (obrys `--focus-ring`) na każdym interaktywnym elemencie; wiersze tabel otwierające panel mają `tabIndex={0}` i obsługę Enter.
- `Drawer`: Esc zamyka, fokus wraca do wiersza, fokus trafia na pierwsze pole po otwarciu.
- `prefers-reduced-motion` respektowane (jest w tokens.css).
- Oba motywy (jasny i ciemny) sprawdzone na każdym ekranie.
- Szerokość 390 px: brak poziomego przewijania strony (tabele mogą przewijać się w swoim kontenerze).
- `npm run lint` i `npm run build` przechodzą na końcu (napraw błędy przed podsumowaniem).

## Na koniec

Po wykonaniu wszystkich kroków napisz krótkie podsumowanie: zmienione i nowe pliki, decyzje podjęte samodzielnie, rzeczy pominięte lub wymagające zmian w backendzie.
