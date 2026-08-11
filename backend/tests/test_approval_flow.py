"""Backend tests for Driver Approval flow, Auth guards, Immediate Trip Deletion, and Admin Batch Deletion.

Covers:
- P0 Driver registration/approval flow
- P0 Auth guard for pending users
- P1 Immediate trip deletion (cleanup_expired_trips)
- P1 Admin batch delete user/trip endpoints
"""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://ride-share-app-300.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"

ADMIN_EMAIL = 'admin@borajunto.com'
ADMIN_PASS = 'admin'
DRIVER_EMAIL = 'giovanna@example.com'
DRIVER_PASS = '123456'
PASSENGER_EMAIL = 'magobranco322@gmail.com'
PASSENGER_PASS = '123456'


def _login(email, password):
    r = requests.post(f"{API}/auth/login", json={'email': email, 'password': password}, timeout=20)
    return r


def _auth(token):
    return {'Authorization': f'Bearer {token}'}


@pytest.fixture(scope='session')
def admin_token():
    r = _login(ADMIN_EMAIL, ADMIN_PASS)
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    return r.json()['token']


@pytest.fixture(scope='session')
def driver_token():
    r = _login(DRIVER_EMAIL, DRIVER_PASS)
    assert r.status_code == 200, f"Driver login failed: {r.status_code} {r.text}"
    return r.json()['token']


def _rand_email(prefix):
    return f"TEST_{prefix}_{uuid.uuid4().hex[:10]}@example.com"


# --- Cleanup helper ---
def _cleanup_user(admin_token, user_id):
    try:
        requests.delete(f"{API}/admin/users/{user_id}", headers=_auth(admin_token), timeout=20)
    except Exception:
        pass


# ============ Driver Registration Approval Flow ============
class TestDriverApprovalFlow:
    def test_driver_registration_returns_requires_approval(self, admin_token):
        email = _rand_email('driver_reg')
        r = requests.post(f"{API}/auth/register", json={
            'name': 'TEST Driver Reg', 'email': email, 'password': '123456', 'role': 'motorista'
        }, timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get('requires_approval') is True
        assert data.get('token') in (None, '')
        assert data['user']['status'] == 'pendente'
        assert data['user']['role'] == 'motorista'
        _cleanup_user(admin_token, data['user']['id'])

    def test_passenger_registration_returns_token_immediately(self, admin_token):
        email = _rand_email('pax_reg')
        r = requests.post(f"{API}/auth/register", json={
            'name': 'TEST Pax Reg', 'email': email, 'password': '123456', 'role': 'passageiro'
        }, timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get('requires_approval') is False
        assert isinstance(data.get('token'), str) and len(data['token']) > 0
        assert data['user']['status'] == 'ativo'
        _cleanup_user(admin_token, data['user']['id'])

    def test_pending_driver_login_blocked_403(self, admin_token):
        email = _rand_email('pend_login')
        reg = requests.post(f"{API}/auth/register", json={
            'name': 'TEST Pending Login', 'email': email, 'password': '123456', 'role': 'motorista'
        }, timeout=20).json()
        r = _login(email, '123456')
        assert r.status_code == 403, f"Expected 403, got {r.status_code}: {r.text}"
        assert 'análise' in r.text.lower() or 'moderação' in r.text.lower() or 'moderac' in r.text.lower()
        _cleanup_user(admin_token, reg['user']['id'])


# ============ Admin Pending Endpoints ============
class TestAdminPendingEndpoints:
    def test_pending_list_admin_only(self, admin_token):
        # Non-admin (driver) forbidden
        dtok = _login(DRIVER_EMAIL, DRIVER_PASS).json()['token']
        r = requests.get(f"{API}/admin/pending", headers=_auth(dtok), timeout=20)
        assert r.status_code == 403

        # Admin OK
        r = requests.get(f"{API}/admin/pending", headers=_auth(admin_token), timeout=20)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_approve_driver_can_login(self, admin_token):
        email = _rand_email('approve')
        reg = requests.post(f"{API}/auth/register", json={
            'name': 'TEST Approve', 'email': email, 'password': '123456', 'role': 'motorista'
        }, timeout=20).json()
        uid = reg['user']['id']

        # Ensure user appears in pending list
        pending = requests.get(f"{API}/admin/pending", headers=_auth(admin_token), timeout=20).json()
        assert any(u['id'] == uid for u in pending)

        # Approve
        r = requests.post(f"{API}/admin/pending/{uid}/approve", headers=_auth(admin_token), timeout=20)
        assert r.status_code == 200

        # Now login should succeed
        lr = _login(email, '123456')
        assert lr.status_code == 200, lr.text
        me = requests.get(f"{API}/auth/me", headers=_auth(lr.json()['token']), timeout=20).json()
        assert me['status'] == 'ativo'
        assert me['verified'] is True

        _cleanup_user(admin_token, uid)

    def test_reject_driver_login_blocked(self, admin_token):
        email = _rand_email('reject')
        reg = requests.post(f"{API}/auth/register", json={
            'name': 'TEST Reject', 'email': email, 'password': '123456', 'role': 'motorista'
        }, timeout=20).json()
        uid = reg['user']['id']

        r = requests.post(f"{API}/admin/pending/{uid}/reject", headers=_auth(admin_token), timeout=20)
        assert r.status_code == 200

        lr = _login(email, '123456')
        assert lr.status_code == 403
        assert 'bloquead' in lr.text.lower()

        _cleanup_user(admin_token, uid)


# ============ Auth Guard For Pending Users ============
class TestAuthGuardPending:
    def test_me_with_pending_user_token_returns_403(self, admin_token):
        # We can't easily get a token for a pending user through register (no token issued).
        # Simulate: register a passenger (token issued), then admin sets status='pendente' via /admin/users/{id}/status,
        # then /auth/me with that token should be 403.
        email = _rand_email('guard')
        reg = requests.post(f"{API}/auth/register", json={
            'name': 'TEST Guard', 'email': email, 'password': '123456', 'role': 'passageiro'
        }, timeout=20).json()
        token = reg['token']
        uid = reg['user']['id']

        # Confirm /auth/me works while ativo
        r_ok = requests.get(f"{API}/auth/me", headers=_auth(token), timeout=20)
        assert r_ok.status_code == 200

        # Flip to pendente via admin
        r_set = requests.post(f"{API}/admin/users/{uid}/status",
                              headers=_auth(admin_token), json={'status': 'pendente'}, timeout=20)
        assert r_set.status_code == 200

        r = requests.get(f"{API}/auth/me", headers=_auth(token), timeout=20)
        assert r.status_code == 403
        assert 'análise' in r.text.lower() or 'moderação' in r.text.lower() or 'moderac' in r.text.lower()

        # Also test bloqueado
        requests.post(f"{API}/admin/users/{uid}/status",
                      headers=_auth(admin_token), json={'status': 'bloqueado'}, timeout=20)
        r2 = requests.get(f"{API}/auth/me", headers=_auth(token), timeout=20)
        assert r2.status_code == 403
        assert 'bloquead' in r2.text.lower()

        _cleanup_user(admin_token, uid)


# ============ Immediate Trip Deletion ============
class TestImmediateTripDeletion:
    def test_past_trip_is_deleted_on_list(self, admin_token, driver_token):
        # Create a trip in the past via giovanna
        past_date = '01/01/2020'
        payload = {
            'origin': 'TEST Santos', 'destination': 'TEST São Paulo',
            'date': past_date, 'time': '08:00',
            'seats_total': 3, 'price': 50.0,
            'pet_friendly': False, 'home_pickup': False,
        }
        cr = requests.post(f"{API}/trips", headers=_auth(driver_token), json=payload, timeout=20)
        assert cr.status_code == 200, cr.text
        trip_id = cr.json()['id']

        # Trigger cleanup by listing trips
        lr = requests.get(f"{API}/trips", timeout=20)
        assert lr.status_code == 200
        # small delay to be safe
        time.sleep(0.5)

        # Verify not in listing
        lr2 = requests.get(f"{API}/trips?include_cancelled=true", timeout=20)
        assert trip_id not in [t['id'] for t in lr2.json()]

        # Verify not in admin/trips
        ar = requests.get(f"{API}/admin/trips", headers=_auth(admin_token), timeout=20)
        assert ar.status_code == 200
        assert trip_id not in [t['id'] for t in ar.json()]


# ============ Admin Batch Deletion (N+1 fix) ============
class TestAdminBatchDeletion:
    def test_delete_driver_removes_all_trips_and_notifies(self, admin_token):
        # 1) Register + approve a driver
        d_email = _rand_email('batch_driver')
        reg = requests.post(f"{API}/auth/register", json={
            'name': 'TEST Batch Driver', 'email': d_email, 'password': '123456', 'role': 'motorista'
        }, timeout=20).json()
        d_uid = reg['user']['id']
        requests.post(f"{API}/admin/pending/{d_uid}/approve", headers=_auth(admin_token), timeout=20)
        d_tok = _login(d_email, '123456').json()['token']

        # 2) Create 3 future trips
        future_date = '31/12/2099'
        trip_ids = []
        for i in range(3):
            r = requests.post(f"{API}/trips", headers=_auth(d_tok), json={
                'origin': f'TEST O{i}', 'destination': f'TEST D{i}',
                'date': future_date, 'time': f'1{i}:00',
                'seats_total': 3, 'price': 50.0, 'pet_friendly': False, 'home_pickup': False,
            }, timeout=20)
            assert r.status_code == 200
            trip_ids.append(r.json()['id'])

        # 3) Passenger reserves one trip
        pax_tok = _login(PASSENGER_EMAIL, PASSENGER_PASS).json()['token']
        pax_me = requests.get(f"{API}/auth/me", headers=_auth(pax_tok), timeout=20).json()
        pax_id = pax_me['id']
        res = requests.post(f"{API}/reservations", headers=_auth(pax_tok),
                            json={'trip_id': trip_ids[0]}, timeout=20)
        # reservations endpoint may be named differently - fallback attempt if 404
        if res.status_code == 404:
            res = requests.post(f"{API}/trips/{trip_ids[0]}/reserve", headers=_auth(pax_tok), timeout=20)
        assert res.status_code in (200, 201), f"Reservation failed: {res.status_code} {res.text}"

        # 4) Count pax notifications before delete
        n_before = requests.get(f"{API}/notifications", headers=_auth(pax_tok), timeout=20).json()
        n_before_count = len(n_before) if isinstance(n_before, list) else 0

        # 5) Admin deletes driver
        dr = requests.delete(f"{API}/admin/users/{d_uid}", headers=_auth(admin_token), timeout=30)
        assert dr.status_code == 200, dr.text
        body = dr.json()
        assert body.get('ok') is True
        assert body.get('trips_removed') == 3

        # 6) Verify trips gone in admin/trips
        at = requests.get(f"{API}/admin/trips", headers=_auth(admin_token), timeout=20).json()
        remaining_ids = {t['id'] for t in at}
        assert not any(tid in remaining_ids for tid in trip_ids)

        # 7) Verify passenger got a cancellation notification
        n_after = requests.get(f"{API}/notifications", headers=_auth(pax_tok), timeout=20).json()
        assert isinstance(n_after, list) and len(n_after) > n_before_count
        assert any(n.get('type') == 'cancelamento' and n.get('trip_id') == trip_ids[0] for n in n_after)

        # 8) Verify user is gone
        lr = _login(d_email, '123456')
        assert lr.status_code == 401

    def test_delete_trip_notifies_confirmed_passengers(self, admin_token):
        # Driver publishes a trip
        d_email = _rand_email('trip_del')
        reg = requests.post(f"{API}/auth/register", json={
            'name': 'TEST TripDel Driver', 'email': d_email, 'password': '123456', 'role': 'motorista'
        }, timeout=20).json()
        d_uid = reg['user']['id']
        requests.post(f"{API}/admin/pending/{d_uid}/approve", headers=_auth(admin_token), timeout=20)
        d_tok = _login(d_email, '123456').json()['token']

        r = requests.post(f"{API}/trips", headers=_auth(d_tok), json={
            'origin': 'TEST TD-O', 'destination': 'TEST TD-D',
            'date': '31/12/2099', 'time': '10:00',
            'seats_total': 3, 'price': 60.0, 'pet_friendly': False, 'home_pickup': False,
        }, timeout=20)
        trip_id = r.json()['id']

        # Passenger reserves
        pax_tok = _login(PASSENGER_EMAIL, PASSENGER_PASS).json()['token']
        res = requests.post(f"{API}/reservations", headers=_auth(pax_tok),
                            json={'trip_id': trip_id}, timeout=20)
        if res.status_code == 404:
            res = requests.post(f"{API}/trips/{trip_id}/reserve", headers=_auth(pax_tok), timeout=20)
        assert res.status_code in (200, 201), res.text

        n_before = requests.get(f"{API}/notifications", headers=_auth(pax_tok), timeout=20).json()
        n_before_count = len(n_before) if isinstance(n_before, list) else 0

        # Admin deletes trip
        dr = requests.delete(f"{API}/admin/trips/{trip_id}", headers=_auth(admin_token), timeout=20)
        assert dr.status_code == 200, dr.text
        assert dr.json().get('notified') == 1

        # Passenger got cancellation notif
        n_after = requests.get(f"{API}/notifications", headers=_auth(pax_tok), timeout=20).json()
        assert len(n_after) > n_before_count
        assert any(n.get('trip_id') == trip_id and n.get('type') == 'cancelamento' for n in n_after)

        # Cleanup driver
        _cleanup_user(admin_token, d_uid)
