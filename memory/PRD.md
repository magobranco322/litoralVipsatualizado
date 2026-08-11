# Motoristas VIP Litoral — PRD

## Original problem statement
Pixel-perfect clone of BoraJunto / Motoristas VIP Litoral: ride-sharing web app for the Brazilian coast (litoral), with:
- Driver + Passenger registration (with photo/avatar)
- Trip creation, search (date + origin/destination filters), reservation
- Real-time chat and notifications
- WhatsApp deep-link for booking
- Admin moderation panel (users, trips, reports)
- 24h approval flow for new drivers

## Personas
- **Passageiro**: searches trips, reserves seats, chats with driver, rates trips
- **Motorista**: publishes trips, manages reservations, chats. Requires admin approval before login
- **Admin (Moderação)**: approves/rejects drivers, moderates users/trips/reports, cancels/removes trips, sends messages

## Tech Stack
- Frontend: React (CRA) + Tailwind + Shadcn UI, React Router, Context API
- Backend: FastAPI + Motor (async MongoDB), JWT, bcrypt
- PWA: manifest.json + service-worker.js
- WhatsApp: `wa.me` deep links

## Data Model (MongoDB collections)
- `users` `{id, name, email, password_hash, role[passageiro|motorista|admin], avatar, phone, city, status[ativo|bloqueado|pendente], rating, trips, verified, created_at}`
- `trips` `{id, driver_id, origin, destination, date, time, seats_total, seats_filled, price, status[ativa|cancelada], ...}`
- `reservations` `{id, trip_id, passenger_id, driver_id, status[confirmada|cancelada|concluida], rating_given, rating_score}`
- `chats` `{id, participants[], type, trip_id?}`
- `messages` `{id, chat_id, sender_id, text, timestamp}`
- `notifications` `{id, user_id, type, message, trip_id?, read, created_at}`
- `reports` `{id, reporter_id, target_id, type[usuario|viagem|mensagem], reason, status[pendente|resolvida], created_at}`

## Completed (as of Feb 2026)
- [x] Auth JWT + bcrypt (register/login/me)
- [x] Trip publish / search (date + origin + destination filters) / reserve / cancel / complete / rate
- [x] Real-time chat between users, admin-to-user chat
- [x] Notifications for reservations/cancellations/moderation
- [x] PWA (manifest, service worker, install banner, iOS instructions, splash screen)
- [x] WhatsApp deep-link on reservation confirmation
- [x] Moderation panel: Aprovações, Viagens, Motoristas, Passageiros, Denúncias tabs with counters
- [x] Admin can remove/cancel trips, block/remove users, message users, resolve/dismiss reports
- [x] Auto-cleanup of expired trips (batch operations, per-process lock) — no grace period
- [x] **24h Driver Approval Flow** (2026-02-11)
  - New motorista registers → status `pendente`, no token issued, `requires_approval=true`
  - Login blocked with 403 "Cadastro em análise pela moderação"
  - `/auth/me` also blocks pendente/bloqueado users
  - Admin endpoints: `GET /admin/pending`, `POST /admin/pending/{id}/approve` (→ ativo, verified), `POST /admin/pending/{id}/reject` (→ bloqueado)
  - Frontend: dedicated "Cadastro em análise" screen on LoginPage (form hidden when `pendingApproval=true`)
  - Frontend: "Aprovações" tab in Moderation panel with Aprovar / Rejeitar buttons
- [x] Backend tests suite: `/app/backend/tests/test_approval_flow.py` (10 tests, 100% pass)

## Roadmap
### P1 — next up
- Passenger boarding feature: driver marks passenger as "embarcado" on trip day (deferred from this session per user)
- Refactor `server.py` (~1010 lines) into modules: `routes/auth.py`, `routes/trips.py`, `routes/admin.py`, `routes/chat.py`, `models.py`

### P2 — later
- Validate that trip date/time is in the future on POST /api/trips (currently allowed, immediately cleaned up)
- Add `try/except` + logging around cascade in `admin_delete_user` for partial-failure resilience
- Consider Redis-based distributed lock for `cleanup_expired_trips` in multi-worker deploys
- Email notification when driver is approved/rejected
- Push notifications (Web Push API) via PWA

## Test credentials
See `/app/memory/test_credentials.md`
