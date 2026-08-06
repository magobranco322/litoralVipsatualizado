#!/usr/bin/env python3
"""
Test Suite for Automatic Trip Expiration Cleanup
Tests that trips older than 3 hours past their scheduled departure are automatically deleted
when GET /api/trips or GET /api/admin/trips is called.
"""

import requests
import json
from datetime import datetime, timedelta

# Base URL from frontend/.env
BASE_URL = "https://ride-share-app-300.preview.emergentagent.com/api"

# Test credentials
ADMIN_EMAIL = "admin@borajunto.com"
ADMIN_PASSWORD = "admin"
MOTORISTA_EMAIL = "giovanna@example.com"
MOTORISTA_PASSWORD = "123456"
PASSAGEIRO_EMAIL = "magobranco322@gmail.com"
PASSAGEIRO_PASSWORD = "123456"

# Test counters
tests_passed = 0
tests_failed = 0
test_results = []


def log_test(test_name, passed, details=""):
    """Log test result"""
    global tests_passed, tests_failed
    if passed:
        tests_passed += 1
        status = "✅ PASS"
    else:
        tests_failed += 1
        status = "❌ FAIL"
    
    result = f"{status}: {test_name}"
    if details:
        result += f" - {details}"
    test_results.append(result)
    print(result)


def login(email, password):
    """Login and return token"""
    response = requests.post(f"{BASE_URL}/auth/login", json={
        "email": email,
        "password": password
    })
    if response.status_code == 200:
        data = response.json()
        return data.get("token")
    return None


def create_trip(token, origin, destination, date, time, seats_total, price):
    """Create a new trip as motorista"""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.post(f"{BASE_URL}/trips", headers=headers, json={
        "origin": origin,
        "destination": destination,
        "date": date,
        "time": time,
        "seats_total": seats_total,
        "price": price,
        "pet_friendly": False,
        "home_pickup": False
    })
    if response.status_code == 200:
        data = response.json()
        return data.get("id"), response
    else:
        print(f"❌ Trip creation failed: Status {response.status_code}, Response: {response.text}")
    return None, response


def create_reservation(token, trip_id):
    """Create a reservation as passageiro"""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.post(f"{BASE_URL}/reservations", headers=headers, json={
        "trip_id": trip_id
    })
    if response.status_code == 200:
        data = response.json()
        reservation = data.get("reservation", {})
        return reservation.get("id"), response
    else:
        print(f"❌ Reservation creation failed: Status {response.status_code}, Response: {response.text}")
    return None, response


def get_trips(token=None):
    """Get all trips (public endpoint, but can use token)"""
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    response = requests.get(f"{BASE_URL}/trips", headers=headers)
    if response.status_code == 200:
        return response.json(), response
    return [], response


def get_admin_trips(token):
    """Get all trips as admin"""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/admin/trips", headers=headers)
    if response.status_code == 200:
        return response.json(), response
    return [], response


def get_my_reservations(token):
    """Get user's reservations"""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/reservations/mine", headers=headers)
    if response.status_code == 200:
        return response.json(), response
    return [], response


def calculate_recent_trip_time():
    """Calculate a date/time that is 1 hour ago in Brazil time (UTC-3)
    This should be within the 3-hour grace period and NOT be deleted.
    """
    # Current UTC time
    now_utc = datetime.utcnow()
    # Convert to Brazil time (UTC-3)
    now_brt = now_utc - timedelta(hours=3)
    # Go back 1 hour
    recent_brt = now_brt - timedelta(hours=1)
    # Format as DD/MM/YYYY and HH:MM
    date_str = recent_brt.strftime("%d/%m/%Y")
    time_str = recent_brt.strftime("%H:%M")
    return date_str, time_str


def run_tests():
    """Run all trip expiration tests"""
    print("\n" + "="*80)
    print("TRIP EXPIRATION CLEANUP TEST SUITE")
    print("="*80 + "\n")

    # Login
    print("🔐 Logging in...")
    motorista_token = login(MOTORISTA_EMAIL, MOTORISTA_PASSWORD)
    passageiro_token = login(PASSAGEIRO_EMAIL, PASSAGEIRO_PASSWORD)
    admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)

    if not motorista_token or not passageiro_token or not admin_token:
        print("❌ Failed to login. Cannot proceed with tests.")
        return

    print("✅ All users logged in successfully\n")

    # Test 1: Create expired trip
    print("📝 Test 1: Creating expired trip (01/01/2020 10:00)...")
    expired_trip_id, resp = create_trip(
        motorista_token,
        "ExpiredTest Origin",
        "ExpiredTest Dest",
        "01/01/2020",
        "10:00",
        3,
        50
    )
    log_test(
        "Create expired trip",
        expired_trip_id is not None,
        f"Trip ID: {expired_trip_id}" if expired_trip_id else f"Failed: {resp.status_code}"
    )

    # Test 2: Create future trip
    print("\n📝 Test 2: Creating future trip (01/01/2099 10:00)...")
    future_trip_id, resp = create_trip(
        motorista_token,
        "FutureTest Origin",
        "FutureTest Dest",
        "01/01/2099",
        "10:00",
        3,
        50
    )
    log_test(
        "Create future trip",
        future_trip_id is not None,
        f"Trip ID: {future_trip_id}" if future_trip_id else f"Failed: {resp.status_code}"
    )

    if not expired_trip_id or not future_trip_id:
        print("\n❌ Cannot proceed without both trips created.")
        return

    # Test 3: Create reservation for expired trip BEFORE cleanup
    print("\n📝 Test 3: Creating reservation for expired trip (before cleanup)...")
    reservation_id, resp = create_reservation(passageiro_token, expired_trip_id)
    log_test(
        "Create reservation for expired trip",
        reservation_id is not None,
        f"Reservation ID: {reservation_id}" if reservation_id else f"Failed: {resp.status_code}"
    )

    if not reservation_id:
        print("\n⚠️  Warning: Could not create reservation. Continuing with other tests...")

    # Test 4: Trigger cleanup via GET /api/trips
    print("\n📝 Test 4: Triggering cleanup via GET /api/trips...")
    trips_before_cleanup, resp = get_trips()
    log_test(
        "GET /api/trips triggers cleanup",
        resp.status_code == 200,
        f"Status: {resp.status_code}, Trips count: {len(trips_before_cleanup)}"
    )

    # Test 5: Verify expired trip is deleted
    print("\n📝 Test 5: Verifying expired trip is deleted...")
    trips_after_cleanup, resp = get_trips()
    expired_trip_exists = any(t.get('id') == expired_trip_id for t in trips_after_cleanup)
    log_test(
        "Expired trip deleted from GET /api/trips",
        not expired_trip_exists,
        f"Expired trip {'FOUND (FAIL)' if expired_trip_exists else 'NOT FOUND (PASS)'}"
    )

    # Test 6: Verify future trip still exists
    print("\n📝 Test 6: Verifying future trip still exists...")
    future_trip_exists = any(t.get('id') == future_trip_id for t in trips_after_cleanup)
    log_test(
        "Future trip still exists",
        future_trip_exists,
        f"Future trip {'FOUND (PASS)' if future_trip_exists else 'NOT FOUND (FAIL)'}"
    )

    # Test 7: Verify via admin endpoint
    print("\n📝 Test 7: Verifying via GET /api/admin/trips...")
    admin_trips, resp = get_admin_trips(admin_token)
    expired_in_admin = any(t.get('id') == expired_trip_id for t in admin_trips)
    future_in_admin = any(t.get('id') == future_trip_id for t in admin_trips)
    log_test(
        "Admin endpoint: expired trip deleted",
        not expired_in_admin,
        f"Expired trip {'FOUND (FAIL)' if expired_in_admin else 'NOT FOUND (PASS)'}"
    )
    log_test(
        "Admin endpoint: future trip exists",
        future_in_admin,
        f"Future trip {'FOUND (PASS)' if future_in_admin else 'NOT FOUND (FAIL)'}"
    )

    # Test 8: Verify reservation status is 'concluida'
    if reservation_id:
        print("\n📝 Test 8: Verifying reservation status is 'concluida'...")
        my_reservations, resp = get_my_reservations(passageiro_token)
        reservation = next((r for r in my_reservations if r.get('id') == reservation_id), None)
        if reservation:
            status = reservation.get('status')
            log_test(
                "Reservation status is 'concluida'",
                status == 'concluida',
                f"Status: {status}"
            )
            log_test(
                "Reservation still exists (not deleted)",
                True,
                "Reservation found in user's list"
            )
        else:
            log_test(
                "Reservation status check",
                False,
                "Reservation not found in user's list"
            )

    # Test 9: Create recent trip within grace period
    print("\n📝 Test 9: Creating recent trip within 3-hour grace period...")
    recent_date, recent_time = calculate_recent_trip_time()
    print(f"   Recent trip time: {recent_date} {recent_time} (Brazil time, 1 hour ago)")
    recent_trip_id, resp = create_trip(
        motorista_token,
        "RecentTest Origin",
        "RecentTest Dest",
        recent_date,
        recent_time,
        3,
        50
    )
    log_test(
        "Create recent trip (1 hour ago)",
        recent_trip_id is not None,
        f"Trip ID: {recent_trip_id}" if recent_trip_id else f"Failed: {resp.status_code}"
    )

    # Test 10: Verify recent trip survives cleanup
    if recent_trip_id:
        print("\n📝 Test 10: Verifying recent trip survives cleanup...")
        trips_after_recent, resp = get_trips()
        recent_trip_exists = any(t.get('id') == recent_trip_id for t in trips_after_recent)
        log_test(
            "Recent trip (within grace period) NOT deleted",
            recent_trip_exists,
            f"Recent trip {'FOUND (PASS)' if recent_trip_exists else 'NOT FOUND (FAIL)'}"
        )

    # Summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    print(f"✅ Passed: {tests_passed}")
    print(f"❌ Failed: {tests_failed}")
    print(f"📊 Total: {tests_passed + tests_failed}")
    print(f"📈 Success Rate: {(tests_passed / (tests_passed + tests_failed) * 100):.1f}%")
    print("="*80 + "\n")

    # Detailed results
    print("DETAILED RESULTS:")
    print("-" * 80)
    for result in test_results:
        print(result)
    print("-" * 80 + "\n")

    # Evidence summary
    print("EVIDENCE SUMMARY:")
    print("-" * 80)
    print(f"Expired Trip ID: {expired_trip_id}")
    print(f"Future Trip ID: {future_trip_id}")
    if reservation_id:
        print(f"Reservation ID: {reservation_id}")
    if recent_trip_id:
        print(f"Recent Trip ID: {recent_trip_id}")
    print("-" * 80 + "\n")

    return tests_passed, tests_failed


if __name__ == "__main__":
    run_tests()
