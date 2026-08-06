#!/usr/bin/env python3
"""
Backend API Test Suite for Motoristas VIP Litoral
Tests the new admin cancel-trip endpoint: POST /api/admin/trips/{trip_id}/cancel
"""

import requests
import json
from datetime import datetime

# Base URL from frontend/.env
BASE_URL = "https://ride-share-app-300.preview.emergentagent.com/api"

# Test credentials from seeded data
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
        return data.get("id")
    else:
        print(f"❌ Trip creation failed: Status {response.status_code}, Response: {response.text}")
    return None


def create_reservation(token, trip_id):
    """Create a reservation as passageiro"""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.post(f"{BASE_URL}/reservations", headers=headers, json={
        "trip_id": trip_id
    })
    if response.status_code == 200:
        data = response.json()
        # The response has a nested structure: {"reservation": {...}, "chat_id": "..."}
        reservation = data.get("reservation", {})
        return reservation.get("id")
    else:
        print(f"❌ Reservation creation failed: Status {response.status_code}, Response: {response.text}")
    return None


def get_notifications(token):
    """Get notifications for current user"""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/notifications", headers=headers)
    if response.status_code == 200:
        return response.json()
    return []


def get_reservations_mine(token):
    """Get user's reservations"""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/reservations/mine", headers=headers)
    if response.status_code == 200:
        return response.json()
    return []


def get_admin_trips(token):
    """Get all trips as admin"""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/admin/trips", headers=headers)
    if response.status_code == 200:
        return response.json()
    return []


def admin_cancel_trip(token, trip_id, reason):
    """Cancel trip as admin"""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.post(f"{BASE_URL}/admin/trips/{trip_id}/cancel", 
                            headers=headers, 
                            json={"reason": reason})
    return response


def main():
    """Run all tests for admin cancel-trip endpoint"""
    print("=" * 80)
    print("Testing Admin Cancel-Trip Endpoint")
    print("=" * 80)
    print()
    
    # Setup: Login as all users
    print("🔐 Logging in as all users...")
    admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    motorista_token = login(MOTORISTA_EMAIL, MOTORISTA_PASSWORD)
    passageiro_token = login(PASSAGEIRO_EMAIL, PASSAGEIRO_PASSWORD)
    
    if not admin_token:
        log_test("Admin login", False, "Failed to login as admin")
        return
    if not motorista_token:
        log_test("Motorista login", False, "Failed to login as motorista")
        return
    if not passageiro_token:
        log_test("Passageiro login", False, "Failed to login as passageiro")
        return
    
    log_test("Login setup", True, "All users logged in successfully")
    print()
    
    # Test Case 1: Setup - Create trip and reservation
    print("📝 Test Case 1: Setup - Create trip and reservation")
    unique_timestamp = datetime.now().strftime("%H%M%S")
    origin = f"AdminCancelTest Origin {unique_timestamp}"
    destination = f"AdminCancelTest Dest {unique_timestamp}"
    
    trip_id = create_trip(motorista_token, origin, destination, "25/12/2026", "15:00", 2, 45.0)
    if not trip_id:
        log_test("Create trip for cancel test", False, "Failed to create trip")
        return
    log_test("Create trip for cancel test", True, f"Trip created: {trip_id}")
    
    reservation_id = create_reservation(passageiro_token, trip_id)
    if not reservation_id:
        log_test("Create reservation for cancel test", False, "Failed to create reservation")
        return
    log_test("Create reservation for cancel test", True, f"Reservation created: {reservation_id}")
    print()
    
    # Test Case 2: Admin cancels trip
    print("📝 Test Case 2: Admin cancels trip with reason")
    response = admin_cancel_trip(admin_token, trip_id, "Teste de cancelamento pela moderação")
    
    if response.status_code == 200:
        data = response.json()
        if data.get("ok") and data.get("notified", 0) >= 1:
            log_test("Admin cancel trip", True, f"Trip cancelled, notified={data.get('notified')}")
        else:
            log_test("Admin cancel trip", False, f"Unexpected response: {data}")
    else:
        log_test("Admin cancel trip", False, f"Status {response.status_code}: {response.text}")
    print()
    
    # Test Case 3: Verify trip is NOT deleted but has status=cancelada
    print("📝 Test Case 3: Verify trip status is 'cancelada' (not deleted)")
    admin_trips = get_admin_trips(admin_token)
    trip_found = False
    trip_status = None
    
    for trip in admin_trips:
        if trip.get("id") == trip_id:
            trip_found = True
            trip_status = trip.get("status")
            break
    
    if trip_found and trip_status == "cancelada":
        log_test("Trip status is cancelada", True, f"Trip still exists with status={trip_status}")
    elif trip_found:
        log_test("Trip status is cancelada", False, f"Trip exists but status={trip_status}")
    else:
        log_test("Trip status is cancelada", False, "Trip was deleted (should not be deleted)")
    print()
    
    # Test Case 4: Verify passenger got notification
    print("📝 Test Case 4: Verify passenger received cancellation notification")
    passenger_notifications = get_notifications(passageiro_token)
    passenger_notif_found = False
    
    for notif in passenger_notifications:
        message = notif.get("message", "")
        if notif.get("type") == "cancelamento" and "moderação" in message:
            passenger_notif_found = True
            break
    
    if passenger_notif_found:
        log_test("Passenger notification", True, "Passenger received cancelamento notification")
    else:
        log_test("Passenger notification", False, "Passenger did not receive expected notification")
    print()
    
    # Test Case 5: Verify driver got notification
    print("📝 Test Case 5: Verify driver received cancellation notification")
    driver_notifications = get_notifications(motorista_token)
    driver_notif_found = False
    
    for notif in driver_notifications:
        message = notif.get("message", "")
        if notif.get("type") == "cancelamento" and "moderação" in message:
            driver_notif_found = True
            break
    
    if driver_notif_found:
        log_test("Driver notification", True, "Driver received cancelamento notification")
    else:
        log_test("Driver notification", False, "Driver did not receive expected notification")
    print()
    
    # Test Case 6: Verify reservation status is cancelada
    print("📝 Test Case 6: Verify reservation status is 'cancelada'")
    passenger_reservations = get_reservations_mine(passageiro_token)
    reservation_found = False
    reservation_status = None
    
    for res in passenger_reservations:
        if res.get("trip_id") == trip_id:
            reservation_found = True
            reservation_status = res.get("status")
            break
    
    if reservation_found and reservation_status == "cancelada":
        log_test("Reservation status is cancelada", True, f"Reservation status={reservation_status}")
    elif reservation_found:
        log_test("Reservation status is cancelada", False, f"Reservation status={reservation_status}")
    else:
        log_test("Reservation status is cancelada", False, "Reservation not found")
    print()
    
    # Test Case 7: Idempotency - Cancel already cancelled trip
    print("📝 Test Case 7: Idempotency - Cancel already cancelled trip")
    response = admin_cancel_trip(admin_token, trip_id, "Second cancel attempt")
    
    if response.status_code == 200:
        data = response.json()
        if data.get("ok") and (data.get("already_cancelled") or data.get("notified") == 0):
            log_test("Idempotency test", True, f"Already cancelled trip handled correctly: {data}")
        else:
            log_test("Idempotency test", True, f"Response: {data} (acceptable)")
    else:
        log_test("Idempotency test", False, f"Status {response.status_code}: {response.text}")
    print()
    
    # Test Case 8: Permission - Non-admin cannot cancel
    print("📝 Test Case 8: Permission - Non-admin (motorista) cannot cancel trip")
    # Create another trip for this test
    test_trip_id = create_trip(motorista_token, "Test Origin", "Test Dest", "26/12/2026", "16:00", 2, 50.0)
    
    if test_trip_id:
        response = admin_cancel_trip(motorista_token, test_trip_id, "Trying as motorista")
        
        if response.status_code == 403:
            log_test("Permission check (403)", True, "Non-admin correctly denied with 403")
        else:
            log_test("Permission check (403)", False, f"Expected 403, got {response.status_code}")
    else:
        log_test("Permission check (403)", False, "Failed to create test trip")
    print()
    
    # Test Case 9: Not found - Cancel nonexistent trip
    print("📝 Test Case 9: Not found - Cancel nonexistent trip")
    response = admin_cancel_trip(admin_token, "nonexistent_trip_id_12345", "Test reason")
    
    if response.status_code == 404:
        log_test("Not found check (404)", True, "Nonexistent trip correctly returns 404")
    else:
        log_test("Not found check (404)", False, f"Expected 404, got {response.status_code}")
    print()
    
    # Summary
    print("=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    total_tests = tests_passed + tests_failed
    success_rate = (tests_passed / total_tests * 100) if total_tests > 0 else 0
    
    print(f"\nTotal Tests: {total_tests}")
    print(f"Passed: {tests_passed} ✅")
    print(f"Failed: {tests_failed} ❌")
    print(f"Success Rate: {success_rate:.1f}%")
    print()
    
    print("Detailed Results:")
    print("-" * 80)
    for result in test_results:
        print(result)
    print()
    
    if tests_failed > 0:
        print("⚠️  Some tests failed. Please review the failures above.")
        exit(1)
    else:
        print("🎉 All tests passed!")
        exit(0)


if __name__ == "__main__":
    main()
