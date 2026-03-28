# Work History - Global Vision (MTAQuestWebsideX)

Data aktualizacji: 2026-03-28
Status: pre-production application core

## 1. Bootstrap i architektura aplikacji
- Potwierdzono i utrzymano architekture Next.js App Router.
- Utrzymano podzial stref: public, member, admin.
- Uporzadkowano dzialanie layoutu i shella aplikacji.

Kluczowe obszary:
- app/
- components/layout/
- lib/

## 2. Warstwa danych: adapter mock|supabase
- Wdrozono adapter danych w repository z fallbackiem dla odczytow publicznych.
- Dodano klienta Supabase po stronie serwera.
- Uporzadkowano logike ENV i trybow uruchomienia (mock vs supabase).

Kluczowe pliki:
- lib/data/repository.ts
- lib/supabase/server.ts
- lib/env.ts

## 3. Bezpieczenstwo dostepu: auth + role guards
- Dodano helpery auth/role po stronie serwera.
- Dodano middleware chroniace strefy /member oraz /admin.
- Dodano defense-in-depth: guardy bezposrednio w stronach chronionych.
- Dodano owner scoping dla /member/rooms/[slug].

Kluczowe pliki:
- lib/auth/server.ts
- lib/auth/roles.ts
- middleware.ts
- app/(member)/member/rooms/[slug]/page.tsx
- app/(admin)/admin/page.tsx

## 4. SQL hardening: RBAC + RLS + RPC + audit
- Dodano migracje domykajaca polityki RLS i model RBAC.
- Dodano audit_log i helpery logowania operacji.
- Dodano funkcje RPC do kuracji i publikacji (approve/publish/reject/revoke).

Kluczowe pliki:
- supabase/migrations/002_rbac_rls_rpc.sql

## 5. Admin operations (mutacje RPC)
- Podpieto panel /admin do mutacji RPC przez Server Actions.
- Dodano akcje: Approve, Publish, Reject, Revoke.
- Dodano rewalidacje tras po operacjach.
- Dodano mapowanie statusow i obsluge bledow.

Kluczowe pliki:
- app/(admin)/admin/actions.ts
- app/(admin)/admin/page.tsx
- lib/data/repository.ts

## 6. Etap 4.1 i 4.2: UX panelu admin
- Dodano warunkowe renderowanie akcji zaleznie od stanu rekordu.
- Dodano pending state przy submit.
- Dodano potwierdzenia dla akcji krytycznych (Publish/Revoke).
- Dodano czytelne komunikaty sukcesu i bledow.

Kluczowe pliki:
- components/admin/AdminSubmitButton.tsx
- app/(admin)/admin/page.tsx
- app/(admin)/admin/actions.ts

## 7. Admin audit
- Dodano nowa trase /admin/audit.
- Dodano filtrowanie po actor_id, action, entity_type, zakresie dat.
- Dodano paginacje i podglad payload.
- Ograniczono dostep do /admin/audit tylko dla admin.

Kluczowe pliki:
- app/(admin)/admin/audit/page.tsx
- lib/data/repository.ts
- middleware.ts

## 8. Auth UX
- Dodano strone logowania /login.
- Dodano akcje logowania haslem i wylogowania.
- Dodano redirect po roli i obsluge parametru next.
- Dodano stan uzytkownika w naglowku (rola, email, logout/login).

Kluczowe pliki:
- app/(public)/login/page.tsx
- app/(public)/login/actions.ts
- lib/auth/actions.ts
- lib/auth/server.ts
- components/layout/SiteHeader.tsx

## 9. Member write-flow
- Dodano operacje ownera po stronie SQL (upsert entry, request curation, consent upsert).
- Dodano server actions dla member.
- Dodano formularze tworzenia/edycji wpisu, zgody publikacyjne oraz zgloszenie do kuracji.
- Dodano komunikaty sukcesu i bledow w strefie member.

Kluczowe pliki:
- supabase/migrations/003_member_write_flow.sql
- app/(member)/member/rooms/[slug]/actions.ts
- app/(member)/member/rooms/[slug]/page.tsx
- lib/data/repository.ts

## 10. Walidacja techniczna (iteracyjnie po etapach)
- Wielokrotnie uruchamiano:
  - npm run lint
  - npm run typecheck
  - npm run build
- Bledy typow i integracyjne byly naprawiane na biezaco az do stanu zielonego.

## 11. Obecny stan repo
- Repo jest operacyjnym rdzeniem pre-produkcyjnym.
- Dziala pelna sciezka public + member + admin z kontrola roli.
- Dzialaja mutacje admin i podstawowy write-flow member.
- Dziala audyt operacyjny i podstawowy UX auth.

## 12. Najblizsze kroki (rekomendacja)
1. Testy bezpieczenstwa RBAC/RLS (krytyczne scenariusze roli i widocznosci danych).
2. Rozszerzenie UX member (lepszy workflow kuracji i historii zmian).
3. Domkniecie porzadkow legacy HTML/CSS po stabilizacji nowych sciezek.
4. Dalsze utwardzanie monitoringu i obserwowalnosci (audit dashboard+metryki).
