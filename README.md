# Global Vision v2 - Next.js + Supabase

Docelowa domena: https://www.mtaquestwebsidex.com

Ten dokument definiuje wersje systemowa projektu (nie statyczny prototyp HTML), oparta o dane, role i prywatnosc.

## Cel v2

Zbudowac aplikacje produkcyjna dla Global Vision z warstwa:
- publiczna
- owner
- curator
- admin

Centralny modul to ABSOLUT jako agregator kuratorowanych tresci z pokoi.

## Stack technologiczny

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Supabase (Auth, Postgres, Storage, RLS)
- Opcjonalnie: OpenAI API (modul dialogow AI)

## Zalozenie strategiczne


## Katalog `prototype/` — referencja wizualna

Wszystkie pliki HTML z poprzednich wersji (legacy) zostały przeniesione do katalogu `prototype/`.
Nie są one częścią runtime aplikacji — służą wyłącznie jako referencja wizualna i historyczna.
Dalszy rozwój realizujemy wyłącznie w architekturze aplikacji danych (Next.js + Supabase).

## Mapa URL (App Router)

- /
- /absolut
- /rooms
- /rooms/[slug]
- /rooms/[slug]/story
- /rooms/[slug]/ai-readonly
- /member/rooms/[slug]
- /admin

## Branding globalny

Kazda strona musi zawierac:
- znak oka
- nazwe Global Vision
- podpis powered by META-GENIUSZ System
- stopke z mtaquestwebsidex.com

## Logika ABSOLUT

ABSOLUT nie jest dekoracyjna podstrona.
To warstwa agregacji wpisow z pokoi.

Zrodla danych do ABSOLUT:
- entries.visibility = curated_public
- entries.visibility = public_room
- opcjonalnie filtr po curations.curator_status = approved

Publiczny uzytkownik widzi tylko tryb read-only.
Owner zachowuje prywatne wpisy i dialogi przypisane do swojego pokoju.

## Role i dostep

Role:
- guest
- owner
- curator
- admin

Reguly:
- guest: tylko curated_public i public_room
- owner: swoje private + publiczne
- curator: tresci do kuracji + panel kuracji
- admin: pelny dostep

## Model danych (minimum)

### profiles
- id (uuid, pk, auth.users)
- role (text)
- display_name (text)
- created_at (timestamptz)

### rooms
- id (uuid, pk)
- owner_id (uuid, fk -> profiles.id)
- title (text)
- slug (text, unique)
- theme (text)
- mission (text)
- visibility (text)
- qr_code_url (text)
- hero_image_url (text)
- created_at (timestamptz)

### entries
- id (uuid, pk)
- room_id (uuid, fk -> rooms.id)
- title (text)
- content (text)
- visibility (text: private|curated_public|public_room)
- is_curated (boolean)
- created_at (timestamptz)

### dialog_messages
- id (uuid, pk)
- entry_id (uuid, fk -> entries.id)
- role (text: user|assistant|system)
- content (text)
- created_at (timestamptz)

### curations
- id (uuid, pk)
- entry_id (uuid, fk -> entries.id)
- curator_status (text)
- featured_level (int)
- published_at (timestamptz)

### consents
- id (uuid, pk)
- room_id (uuid, fk -> rooms.id)
- owner_id (uuid, fk -> profiles.id)
- allow_public_excerpt (boolean)
- allow_anonymous_publication (boolean)
- created_at (timestamptz)

### media_assets
- id (uuid, pk)
- room_id (uuid, fk -> rooms.id)
- kind (text)
- url (text)
- alt (text)
- created_at (timestamptz)

## RLS (wymaganie obowiazkowe)

Wlacz RLS dla tabel:
- profiles
- rooms
- entries
- dialog_messages
- curations
- consents
- media_assets

Minimalne polityki:
- guest select tylko wpisy public_room/curated_public
- owner select dla entries, rooms, dialog_messages po owner_id
- curator select/update dla curations i wpisow do kuracji
- admin full access

## Tryb mock (bez ENV)

Aplikacja musi dzialac bez aktywnego Supabase:
- NEXT_PUBLIC_ENABLE_MOCK_DATA=true
- mockowe rooms
- mockowe entries
- mockowe dialog_messages

Po ustawieniu ENV aplikacja przelacza sie na Supabase.

## Plan migracji ze statycznego HTML

Etap 1: Bootstrap aplikacji
- utworzenie projektu Next.js + TypeScript + Tailwind
- konfiguracja layoutu globalnego i design tokens

Etap 2: Migracja widokow
- przeniesienie stron publicznych do app/
- wdrozenie wspolnego header/footer jako komponentow

Etap 3: Warstwa danych
- schema SQL
- seed demo
- adapter mock/supabase

Etap 4: Auth i role
- logowanie owner/curator/admin
- guards dla /member i /admin

Etap 5: ABSOLUT
- agregacja wpisow curated_public/public_room
- listing read-only

Etap 6: Panele
- member: prywatne wpisy i historia dialogow
- admin: kuracja wpisow i publikacja

## Struktura katalogow (docelowa)

```txt
app/
  (public)/
    page.tsx
    absolut/page.tsx
    rooms/page.tsx
    rooms/[slug]/page.tsx
    rooms/[slug]/story/page.tsx
    rooms/[slug]/ai-readonly/page.tsx
  (member)/
    member/rooms/[slug]/page.tsx
  (admin)/
    admin/page.tsx

components/
  layout/
  absolut/
  rooms/
  ui/

lib/
  auth/
  data/
  supabase/
  mock/
  guards/
  utils/

supabase/
  migrations/
  seed/

tests/
  smoke/
  components/
```

## ENV example

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

OPENAI_API_KEY=

NEXT_PUBLIC_ENABLE_MOCK_DATA=true
```

## Definition of Done (v2)

- routing App Router dziala dla wszystkich sciezek
- ABSOLUT czyta dane z entries z filtrem publicznym
- /member/rooms/[slug] pokazuje prywatne dane ownera
- /admin umozliwia kuracje wpisow
- RLS aktywne na tabelach wrazliwych
- mock mode dziala bez ENV
- lint, typecheck i testy smoke przechodza

## Nastepny krok

Scaffold projektu Next.js w tym repo i migracja obecnego prototypu wizualnego do app/ jako warstwy UI.
