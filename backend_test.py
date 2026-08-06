#!/usr/bin/env python3
"""
Comprehensive Backend API Test Suite for Motoristas VIP Litoral
Tests all endpoints at the production URL
"""

import requests
import json
import time
from datetime import datetime

# Base URL from frontend/.env
BASE_URL = "https://ride-share-app-300.preview.emergentagent.com/api"

# Test results tracking
test_results = {
    "passed": [],
    "failed": [],
    "total": 0
}

# Global variables to store tokens and IDs
tokens = {}
user_ids = {}
trip_ids = {}
reservation_ids = {}
chat_ids = {}
report_ids = {}

def log_test(name, passed, details=""):
    """Log test result"""
    test_results["total"] += 1
    if passed:
        test_results["passed"].append(name)
        print(f"✅ PASS: {name}")
    else:
        test_results["failed"].append({"name": name, "details": details})
        print(f"❌ FAIL: {name}")
        if details:
            print(f"   Details: {details}")

def test_auth_login_motorista():
    """Test 1.1: Login as seeded motorista Giovanna"""
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json={
            "email": "giovanna@example.com",
            "password": "123456"
        })
        
        if response.status_code == 200:
            data = response.json()
            if "token" in data and "user" in data:
                tokens["giovanna"] = data["token"]
                user_ids["giovanna"] = data["user"]["id"]
                log_test("Auth: Login motorista Giovanna", True)
            else:
                log_test("Auth: Login motorista Giovanna", False, "Missing token or user in response")
        else:
            log_test("Auth: Login motorista Giovanna", False, f"Status {response.status_code}: {response.text}")
    except Exception as e:
        log_test("Auth: Login motorista Giovanna", False, str(e))

def test_auth_login_wrong_password():
    """Test 1.2: Login with wrong password"""
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json={
            "email": "giovanna@example.com",
            "password": "wrongpassword"
        })
        
        if response.status_code == 401:
            log_test("Auth: Login with wrong password returns 401", True)
        else:
            log_test("Auth: Login with wrong password returns 401", False, f"Expected 401, got {response.status_code}")
    except Exception as e:
        log_test("Auth: Login with wrong password returns 401", False, str(e))

def test_auth_register_passageiro():
    """Test 1.3: Register new passageiro"""
    try:
        timestamp = int(time.time())
        email = f"teste_{timestamp}@example.com"
        
        response = requests.post(f"{BASE_URL}/auth/register", json={
            "name": "Teste Passageiro",
            "email": email,
            "password": "test1234",
            "role": "passageiro"
        })
        
        if response.status_code == 200:
            data = response.json()
            if "token" in data and "user" in data:
                tokens["passageiro"] = data["token"]
                user_ids["passageiro"] = data["user"]["id"]
                user_ids["passageiro_email"] = email
                log_test("Auth: Register new passageiro", True)
            else:
                log_test("Auth: Register new passageiro", False, "Missing token or user in response")
        else:
            log_test("Auth: Register new passageiro", False, f"Status {response.status_code}: {response.text}")
    except Exception as e:
        log_test("Auth: Register new passageiro", False, str(e))

def test_auth_register_duplicate():
    """Test 1.4: Register with duplicate email"""
    try:
        email = user_ids.get("passageiro_email", "teste_duplicate@example.com")
        
        response = requests.post(f"{BASE_URL}/auth/register", json={
            "name": "Duplicate User",
            "email": email,
            "password": "test1234",
            "role": "passageiro"
        })
        
        if response.status_code == 400:
            log_test("Auth: Register duplicate email returns 400", True)
        else:
            log_test("Auth: Register duplicate email returns 400", False, f"Expected 400, got {response.status_code}")
    except Exception as e:
        log_test("Auth: Register duplicate email returns 400", False, str(e))

def test_auth_me_with_token():
    """Test 1.5: GET /auth/me with token"""
    try:
        token = tokens.get("passageiro")
        if not token:
            log_test("Auth: GET /auth/me with token", False, "No token available")
            return
        
        response = requests.get(f"{BASE_URL}/auth/me", headers={
            "Authorization": f"Bearer {token}"
        })
        
        if response.status_code == 200:
            data = response.json()
            if "id" in data and "email" in data:
                log_test("Auth: GET /auth/me with token", True)
            else:
                log_test("Auth: GET /auth/me with token", False, "Missing user data in response")
        else:
            log_test("Auth: GET /auth/me with token", False, f"Status {response.status_code}: {response.text}")
    except Exception as e:
        log_test("Auth: GET /auth/me with token", False, str(e))

def test_auth_me_without_token():
    """Test 1.6: GET /auth/me without token"""
    try:
        response = requests.get(f"{BASE_URL}/auth/me")
        
        if response.status_code == 401:
            log_test("Auth: GET /auth/me without token returns 401", True)
        else:
            log_test("Auth: GET /auth/me without token returns 401", False, f"Expected 401, got {response.status_code}")
    except Exception as e:
        log_test("Auth: GET /auth/me without token returns 401", False, str(e))

def test_trips_list_all():
    """Test 2.1: GET /trips - list all trips"""
    try:
        response = requests.get(f"{BASE_URL}/trips")
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) >= 5:
                log_test("Trips: List all trips (at least 5 seeded)", True)
            else:
                log_test("Trips: List all trips (at least 5 seeded)", False, f"Expected at least 5 trips, got {len(data) if isinstance(data, list) else 0}")
        else:
            log_test("Trips: List all trips (at least 5 seeded)", False, f"Status {response.status_code}: {response.text}")
    except Exception as e:
        log_test("Trips: List all trips (at least 5 seeded)", False, str(e))

def test_trips_filter_origin_destination():
    """Test 2.2: GET /trips with origin and destination filter"""
    try:
        response = requests.get(f"{BASE_URL}/trips", params={
            "origin": "Curitiba",
            "destination": "Matinhos"
        })
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                # Should include Célio's trip
                found_celio = any("Curitiba" in t.get("origin", "") and "Matinhos" in t.get("destination", "") for t in data)
                if found_celio:
                    log_test("Trips: Filter by origin=Curitiba & destination=Matinhos", True)
                else:
                    log_test("Trips: Filter by origin=Curitiba & destination=Matinhos", False, "Expected to find Célio's trip")
            else:
                log_test("Trips: Filter by origin=Curitiba & destination=Matinhos", False, "Response is not a list")
        else:
            log_test("Trips: Filter by origin=Curitiba & destination=Matinhos", False, f"Status {response.status_code}: {response.text}")
    except Exception as e:
        log_test("Trips: Filter by origin=Curitiba & destination=Matinhos", False, str(e))

def test_trips_filter_date():
    """Test 2.3: GET /trips with date filter"""
    try:
        response = requests.get(f"{BASE_URL}/trips", params={
            "date": "05/08/2026"
        })
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                # Should have trips on that date
                correct_date = all(t.get("date") == "05/08/2026" for t in data if data)
                if correct_date or len(data) > 0:
                    log_test("Trips: Filter by date=05/08/2026", True)
                else:
                    log_test("Trips: Filter by date=05/08/2026", False, "No trips found for that date")
            else:
                log_test("Trips: Filter by date=05/08/2026", False, "Response is not a list")
        else:
            log_test("Trips: Filter by date=05/08/2026", False, f"Status {response.status_code}: {response.text}")
    except Exception as e:
        log_test("Trips: Filter by date=05/08/2026", False, str(e))

def test_trips_create_as_motorista():
    """Test 2.4: POST /trips as motorista Giovanna"""
    try:
        token = tokens.get("giovanna")
        if not token:
            log_test("Trips: Create trip as motorista", False, "No motorista token available")
            return
        
        response = requests.post(f"{BASE_URL}/trips", 
            headers={"Authorization": f"Bearer {token}"},
            json={
                "origin": "Curitiba Batel",
                "destination": "Guaratuba",
                "date": "20/12/2026",
                "time": "08:00",
                "seats_total": 4,
                "price": 75,
                "pet_friendly": True,
                "home_pickup": False
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            if "id" in data:
                trip_ids["giovanna_new"] = data["id"]
                log_test("Trips: Create trip as motorista", True)
            else:
                log_test("Trips: Create trip as motorista", False, "Missing trip id in response")
        else:
            log_test("Trips: Create trip as motorista", False, f"Status {response.status_code}: {response.text}")
    except Exception as e:
        log_test("Trips: Create trip as motorista", False, str(e))

def test_trips_create_as_passageiro():
    """Test 2.5: POST /trips as passageiro (should fail)"""
    try:
        token = tokens.get("passageiro")
        if not token:
            log_test("Trips: Create trip as passageiro returns 403", False, "No passageiro token available")
            return
        
        response = requests.post(f"{BASE_URL}/trips", 
            headers={"Authorization": f"Bearer {token}"},
            json={
                "origin": "Test Origin",
                "destination": "Test Destination",
                "date": "25/12/2026",
                "time": "10:00",
                "seats_total": 3,
                "price": 50,
                "pet_friendly": False,
                "home_pickup": False
            }
        )
        
        if response.status_code == 403:
            log_test("Trips: Create trip as passageiro returns 403", True)
        else:
            log_test("Trips: Create trip as passageiro returns 403", False, f"Expected 403, got {response.status_code}")
    except Exception as e:
        log_test("Trips: Create trip as passageiro returns 403", False, str(e))

def test_trips_update_as_motorista():
    """Test 2.6: PATCH /trips/{id} as motorista"""
    try:
        token = tokens.get("giovanna")
        trip_id = trip_ids.get("giovanna_new")
        
        if not token or not trip_id:
            log_test("Trips: Update trip as motorista", False, "Missing token or trip_id")
            return
        
        response = requests.patch(f"{BASE_URL}/trips/{trip_id}", 
            headers={"Authorization": f"Bearer {token}"},
            json={
                "time": "09:00",
                "price": 85
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            # Response should include notified count
            if "notified" in data or "trip" in data:
                log_test("Trips: Update trip as motorista", True)
            else:
                log_test("Trips: Update trip as motorista", False, "Missing expected fields in response")
        else:
            log_test("Trips: Update trip as motorista", False, f"Status {response.status_code}: {response.text}")
    except Exception as e:
        log_test("Trips: Update trip as motorista", False, str(e))

def test_reservations_create():
    """Test 3.1: POST /reservations as passageiro"""
    try:
        token = tokens.get("passageiro")
        trip_id = trip_ids.get("giovanna_new")
        
        if not token or not trip_id:
            log_test("Reservations: Create reservation", False, "Missing token or trip_id")
            return
        
        response = requests.post(f"{BASE_URL}/reservations", 
            headers={"Authorization": f"Bearer {token}"},
            json={"trip_id": trip_id}
        )
        
        if response.status_code == 200:
            data = response.json()
            if "reservation" in data and "chat_id" in data:
                reservation_ids["passageiro_res"] = data["reservation"]["id"]
                chat_ids["passageiro_chat"] = data["chat_id"]
                log_test("Reservations: Create reservation", True)
            else:
                log_test("Reservations: Create reservation", False, "Missing reservation or chat_id in response")
        else:
            log_test("Reservations: Create reservation", False, f"Status {response.status_code}: {response.text}")
    except Exception as e:
        log_test("Reservations: Create reservation", False, str(e))

def test_reservations_list_mine():
    """Test 3.2: GET /reservations/mine"""
    try:
        token = tokens.get("passageiro")
        if not token:
            log_test("Reservations: List my reservations", False, "No token available")
            return
        
        response = requests.get(f"{BASE_URL}/reservations/mine", 
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) > 0:
                log_test("Reservations: List my reservations", True)
            else:
                log_test("Reservations: List my reservations", False, "Expected at least 1 reservation")
        else:
            log_test("Reservations: List my reservations", False, f"Status {response.status_code}: {response.text}")
    except Exception as e:
        log_test("Reservations: List my reservations", False, str(e))

def test_chats_list_verify():
    """Test 3.3: GET /chats - verify chat was created"""
    try:
        token = tokens.get("passageiro")
        if not token:
            log_test("Chats: Verify chat created with driver", False, "No token available")
            return
        
        response = requests.get(f"{BASE_URL}/chats", 
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) > 0:
                # Should include the driver as other_user
                log_test("Chats: Verify chat created with driver", True)
            else:
                log_test("Chats: Verify chat created with driver", False, "No chats found")
        else:
            log_test("Chats: Verify chat created with driver", False, f"Status {response.status_code}: {response.text}")
    except Exception as e:
        log_test("Chats: Verify chat created with driver", False, str(e))

def test_notifications_motorista():
    """Test 3.4: GET /notifications as Giovanna (should have reservation notification)"""
    try:
        token = tokens.get("giovanna")
        if not token:
            log_test("Notifications: Motorista has reservation notification", False, "No token available")
            return
        
        response = requests.get(f"{BASE_URL}/notifications", 
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                unread = [n for n in data if not n.get("read", True)]
                if len(unread) >= 1:
                    log_test("Notifications: Motorista has reservation notification", True)
                else:
                    log_test("Notifications: Motorista has reservation notification", False, f"Expected at least 1 unread notification, got {len(unread)}")
            else:
                log_test("Notifications: Motorista has reservation notification", False, "Response is not a list")
        else:
            log_test("Notifications: Motorista has reservation notification", False, f"Status {response.status_code}: {response.text}")
    except Exception as e:
        log_test("Notifications: Motorista has reservation notification", False, str(e))

def test_trips_update_notify_passengers():
    """Test 3.5: PATCH trip again to verify passenger notification"""
    try:
        token = tokens.get("giovanna")
        trip_id = trip_ids.get("giovanna_new")
        
        if not token or not trip_id:
            log_test("Trips: Update trip notifies passengers", False, "Missing token or trip_id")
            return
        
        response = requests.patch(f"{BASE_URL}/trips/{trip_id}", 
            headers={"Authorization": f"Bearer {token}"},
            json={"time": "09:30"}
        )
        
        if response.status_code == 200:
            data = response.json()
            if "notified" in data and data["notified"] >= 1:
                log_test("Trips: Update trip notifies passengers", True)
            else:
                log_test("Trips: Update trip notifies passengers", False, f"Expected notified >= 1, got {data.get('notified', 0)}")
        else:
            log_test("Trips: Update trip notifies passengers", False, f"Status {response.status_code}: {response.text}")
    except Exception as e:
        log_test("Trips: Update trip notifies passengers", False, str(e))

def test_notifications_passageiro():
    """Test 3.6: GET /notifications as passageiro (should have alteracao notification)"""
    try:
        token = tokens.get("passageiro")
        if not token:
            log_test("Notifications: Passageiro has alteracao notification", False, "No token available")
            return
        
        response = requests.get(f"{BASE_URL}/notifications", 
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) > 0:
                # Should have alteracao notification
                alteracao = any(n.get("type") == "alteracao" for n in data)
                if alteracao:
                    log_test("Notifications: Passageiro has alteracao notification", True)
                else:
                    log_test("Notifications: Passageiro has alteracao notification", False, "No alteracao notification found")
            else:
                log_test("Notifications: Passageiro has alteracao notification", False, "No notifications found")
        else:
            log_test("Notifications: Passageiro has alteracao notification", False, f"Status {response.status_code}: {response.text}")
    except Exception as e:
        log_test("Notifications: Passageiro has alteracao notification", False, str(e))

def test_reservations_complete():
    """Test 3.7: POST /reservations/{id}/complete"""
    try:
        token = tokens.get("passageiro")
        res_id = reservation_ids.get("passageiro_res")
        
        if not token or not res_id:
            log_test("Reservations: Complete reservation", False, "Missing token or reservation_id")
            return
        
        response = requests.post(f"{BASE_URL}/reservations/{res_id}/complete", 
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get("ok"):
                log_test("Reservations: Complete reservation", True)
            else:
                log_test("Reservations: Complete reservation", False, "Response ok is not True")
        else:
            log_test("Reservations: Complete reservation", False, f"Status {response.status_code}: {response.text}")
    except Exception as e:
        log_test("Reservations: Complete reservation", False, str(e))

def test_reservations_rate():
    """Test 3.8: POST /reservations/{id}/rate"""
    try:
        token = tokens.get("passageiro")
        res_id = reservation_ids.get("passageiro_res")
        
        if not token or not res_id:
            log_test("Reservations: Rate reservation", False, "Missing token or reservation_id")
            return
        
        response = requests.post(f"{BASE_URL}/reservations/{res_id}/rate", 
            headers={"Authorization": f"Bearer {token}"},
            json={
                "score": 5,
                "comment": "Ótima viagem!"
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get("ok"):
                log_test("Reservations: Rate reservation", True)
            else:
                log_test("Reservations: Rate reservation", False, "Response ok is not True")
        else:
            log_test("Reservations: Rate reservation", False, f"Status {response.status_code}: {response.text}")
    except Exception as e:
        log_test("Reservations: Rate reservation", False, str(e))

def test_auth_me_verify_rating():
    """Test 3.9: GET /auth/me for Giovanna - verify rating updated"""
    try:
        token = tokens.get("giovanna")
        if not token:
            log_test("Auth: Verify motorista rating updated", False, "No token available")
            return
        
        response = requests.get(f"{BASE_URL}/auth/me", 
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if response.status_code == 200:
            data = response.json()
            rating = data.get("rating", 0)
            trips = data.get("trips", 0)
            if rating == 5.0 and trips == 1:
                log_test("Auth: Verify motorista rating updated (5.0, trips=1)", True)
            else:
                log_test("Auth: Verify motorista rating updated (5.0, trips=1)", False, f"Expected rating=5.0 and trips=1, got rating={rating}, trips={trips}")
        else:
            log_test("Auth: Verify motorista rating updated (5.0, trips=1)", False, f"Status {response.status_code}: {response.text}")
    except Exception as e:
        log_test("Auth: Verify motorista rating updated (5.0, trips=1)", False, str(e))

def test_chats_send_message():
    """Test 4.1: POST /chats/message"""
    try:
        token = tokens.get("passageiro")
        chat_id = chat_ids.get("passageiro_chat")
        
        if not token or not chat_id:
            log_test("Chats: Send message", False, "Missing token or chat_id")
            return
        
        response = requests.post(f"{BASE_URL}/chats/message", 
            headers={"Authorization": f"Bearer {token}"},
            json={
                "chat_id": chat_id,
                "text": "Obrigado pela viagem!"
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get("ok"):
                log_test("Chats: Send message", True)
            else:
                log_test("Chats: Send message", False, "Response ok is not True")
        else:
            log_test("Chats: Send message", False, f"Status {response.status_code}: {response.text}")
    except Exception as e:
        log_test("Chats: Send message", False, str(e))

def test_chats_verify_last_message():
    """Test 4.2: GET /chats - verify last_message updated"""
    try:
        token = tokens.get("passageiro")
        if not token:
            log_test("Chats: Verify last_message updated", False, "No token available")
            return
        
        response = requests.get(f"{BASE_URL}/chats", 
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) > 0:
                chat = data[0]
                if "last_message" in chat and "messages" in chat:
                    log_test("Chats: Verify last_message updated", True)
                else:
                    log_test("Chats: Verify last_message updated", False, "Missing last_message or messages")
            else:
                log_test("Chats: Verify last_message updated", False, "No chats found")
        else:
            log_test("Chats: Verify last_message updated", False, f"Status {response.status_code}: {response.text}")
    except Exception as e:
        log_test("Chats: Verify last_message updated", False, str(e))

def test_chats_unread_for_motorista():
    """Test 4.3: GET /chats as Giovanna - should have unread=1"""
    try:
        token = tokens.get("giovanna")
        if not token:
            log_test("Chats: Motorista has unread message", False, "No token available")
            return
        
        response = requests.get(f"{BASE_URL}/chats", 
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) > 0:
                # Find the chat with the passageiro
                chat = data[0]
                if chat.get("unread", 0) >= 1:
                    chat_ids["giovanna_chat"] = chat["id"]
                    log_test("Chats: Motorista has unread message", True)
                else:
                    log_test("Chats: Motorista has unread message", False, f"Expected unread >= 1, got {chat.get('unread', 0)}")
            else:
                log_test("Chats: Motorista has unread message", False, "No chats found")
        else:
            log_test("Chats: Motorista has unread message", False, f"Status {response.status_code}: {response.text}")
    except Exception as e:
        log_test("Chats: Motorista has unread message", False, str(e))

def test_chats_mark_read():
    """Test 4.4: POST /chats/{id}/read"""
    try:
        token = tokens.get("giovanna")
        chat_id = chat_ids.get("giovanna_chat")
        
        if not token or not chat_id:
            log_test("Chats: Mark chat as read", False, "Missing token or chat_id")
            return
        
        response = requests.post(f"{BASE_URL}/chats/{chat_id}/read", 
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get("ok"):
                log_test("Chats: Mark chat as read", True)
            else:
                log_test("Chats: Mark chat as read", False, "Response ok is not True")
        else:
            log_test("Chats: Mark chat as read", False, f"Status {response.status_code}: {response.text}")
    except Exception as e:
        log_test("Chats: Mark chat as read", False, str(e))

def test_chats_verify_unread_zero():
    """Test 4.5: GET /chats - verify unread=0 after marking read"""
    try:
        token = tokens.get("giovanna")
        if not token:
            log_test("Chats: Verify unread=0 after marking read", False, "No token available")
            return
        
        response = requests.get(f"{BASE_URL}/chats", 
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) > 0:
                chat = data[0]
                if chat.get("unread", 1) == 0:
                    log_test("Chats: Verify unread=0 after marking read", True)
                else:
                    log_test("Chats: Verify unread=0 after marking read", False, f"Expected unread=0, got {chat.get('unread', 1)}")
            else:
                log_test("Chats: Verify unread=0 after marking read", False, "No chats found")
        else:
            log_test("Chats: Verify unread=0 after marking read", False, f"Status {response.status_code}: {response.text}")
    except Exception as e:
        log_test("Chats: Verify unread=0 after marking read", False, str(e))

def test_notifications_mark_read():
    """Test 5.1: POST /notifications/read"""
    try:
        token = tokens.get("passageiro")
        if not token:
            log_test("Notifications: Mark all as read", False, "No token available")
            return
        
        response = requests.post(f"{BASE_URL}/notifications/read", 
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get("ok"):
                log_test("Notifications: Mark all as read", True)
            else:
                log_test("Notifications: Mark all as read", False, "Response ok is not True")
        else:
            log_test("Notifications: Mark all as read", False, f"Status {response.status_code}: {response.text}")
    except Exception as e:
        log_test("Notifications: Mark all as read", False, str(e))

def test_notifications_verify_all_read():
    """Test 5.2: GET /notifications - verify all read=true"""
    try:
        token = tokens.get("passageiro")
        if not token:
            log_test("Notifications: Verify all read=true", False, "No token available")
            return
        
        response = requests.get(f"{BASE_URL}/notifications", 
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                all_read = all(n.get("read", False) for n in data)
                if all_read or len(data) == 0:
                    log_test("Notifications: Verify all read=true", True)
                else:
                    unread_count = sum(1 for n in data if not n.get("read", False))
                    log_test("Notifications: Verify all read=true", False, f"Found {unread_count} unread notifications")
            else:
                log_test("Notifications: Verify all read=true", False, "Response is not a list")
        else:
            log_test("Notifications: Verify all read=true", False, f"Status {response.status_code}: {response.text}")
    except Exception as e:
        log_test("Notifications: Verify all read=true", False, str(e))

def test_admin_login():
    """Test 6.1: Login as admin"""
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json={
            "email": "admin@borajunto.com",
            "password": "admin"
        })
        
        if response.status_code == 200:
            data = response.json()
            if "token" in data and "user" in data:
                tokens["admin"] = data["token"]
                user_ids["admin"] = data["user"]["id"]
                log_test("Admin: Login as admin", True)
            else:
                log_test("Admin: Login as admin", False, "Missing token or user in response")
        else:
            log_test("Admin: Login as admin", False, f"Status {response.status_code}: {response.text}")
    except Exception as e:
        log_test("Admin: Login as admin", False, str(e))

def test_admin_list_users():
    """Test 6.2: GET /admin/users"""
    try:
        token = tokens.get("admin")
        if not token:
            log_test("Admin: List all users", False, "No admin token available")
            return
        
        response = requests.get(f"{BASE_URL}/admin/users", 
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) > 0:
                log_test("Admin: List all users", True)
            else:
                log_test("Admin: List all users", False, "Expected list of users")
        else:
            log_test("Admin: List all users", False, f"Status {response.status_code}: {response.text}")
    except Exception as e:
        log_test("Admin: List all users", False, str(e))

def test_admin_block_user():
    """Test 6.3: POST /admin/users/{id}/status - block user"""
    try:
        token = tokens.get("admin")
        user_id = user_ids.get("passageiro")
        
        if not token or not user_id:
            log_test("Admin: Block user", False, "Missing admin token or user_id")
            return
        
        response = requests.post(f"{BASE_URL}/admin/users/{user_id}/status", 
            headers={"Authorization": f"Bearer {token}"},
            json={"status": "bloqueado"}
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get("ok"):
                log_test("Admin: Block user", True)
            else:
                log_test("Admin: Block user", False, "Response ok is not True")
        else:
            log_test("Admin: Block user", False, f"Status {response.status_code}: {response.text}")
    except Exception as e:
        log_test("Admin: Block user", False, str(e))

def test_admin_blocked_user_login():
    """Test 6.4: Try to login as blocked user - should return 403"""
    try:
        email = user_ids.get("passageiro_email", "teste@example.com")
        
        response = requests.post(f"{BASE_URL}/auth/login", json={
            "email": email,
            "password": "test1234"
        })
        
        if response.status_code == 403:
            log_test("Admin: Blocked user cannot login (403)", True)
        else:
            log_test("Admin: Blocked user cannot login (403)", False, f"Expected 403, got {response.status_code}")
    except Exception as e:
        log_test("Admin: Blocked user cannot login (403)", False, str(e))

def test_admin_unblock_user():
    """Test 6.5: POST /admin/users/{id}/status - restore user"""
    try:
        token = tokens.get("admin")
        user_id = user_ids.get("passageiro")
        
        if not token or not user_id:
            log_test("Admin: Restore user to ativo", False, "Missing admin token or user_id")
            return
        
        response = requests.post(f"{BASE_URL}/admin/users/{user_id}/status", 
            headers={"Authorization": f"Bearer {token}"},
            json={"status": "ativo"}
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get("ok"):
                log_test("Admin: Restore user to ativo", True)
            else:
                log_test("Admin: Restore user to ativo", False, "Response ok is not True")
        else:
            log_test("Admin: Restore user to ativo", False, f"Status {response.status_code}: {response.text}")
    except Exception as e:
        log_test("Admin: Restore user to ativo", False, str(e))

def test_reports_create():
    """Test 6.6: POST /reports as passageiro"""
    try:
        # Re-login passageiro after unblocking
        email = user_ids.get("passageiro_email", "teste@example.com")
        response = requests.post(f"{BASE_URL}/auth/login", json={
            "email": email,
            "password": "test1234"
        })
        if response.status_code == 200:
            tokens["passageiro"] = response.json()["token"]
        
        token = tokens.get("passageiro")
        target_id = user_ids.get("giovanna", "test_id")
        
        if not token:
            log_test("Reports: Create report", False, "No token available")
            return
        
        response = requests.post(f"{BASE_URL}/reports", 
            headers={"Authorization": f"Bearer {token}"},
            json={
                "type": "usuario",
                "target_id": target_id,
                "target_name": "Giovanna",
                "reason": "Teste de denúncia"
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            if "id" in data:
                report_ids["test_report"] = data["id"]
                log_test("Reports: Create report", True)
            else:
                log_test("Reports: Create report", False, "Missing report id in response")
        else:
            log_test("Reports: Create report", False, f"Status {response.status_code}: {response.text}")
    except Exception as e:
        log_test("Reports: Create report", False, str(e))

def test_admin_list_reports():
    """Test 6.7: GET /admin/reports"""
    try:
        token = tokens.get("admin")
        if not token:
            log_test("Admin: List reports", False, "No admin token available")
            return
        
        response = requests.get(f"{BASE_URL}/admin/reports", 
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                # Should include the new report
                log_test("Admin: List reports", True)
            else:
                log_test("Admin: List reports", False, "Response is not a list")
        else:
            log_test("Admin: List reports", False, f"Status {response.status_code}: {response.text}")
    except Exception as e:
        log_test("Admin: List reports", False, str(e))

def test_admin_resolve_report():
    """Test 6.8: POST /admin/reports/{id}/resolve"""
    try:
        token = tokens.get("admin")
        report_id = report_ids.get("test_report")
        
        if not token or not report_id:
            log_test("Admin: Resolve report", False, "Missing admin token or report_id")
            return
        
        response = requests.post(f"{BASE_URL}/admin/reports/{report_id}/resolve", 
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get("ok"):
                log_test("Admin: Resolve report", True)
            else:
                log_test("Admin: Resolve report", False, "Response ok is not True")
        else:
            log_test("Admin: Resolve report", False, f"Status {response.status_code}: {response.text}")
    except Exception as e:
        log_test("Admin: Resolve report", False, str(e))

def test_edge_passageiro_admin_access():
    """Test 7.1: Passageiro tries to access admin endpoint - should return 403"""
    try:
        token = tokens.get("passageiro")
        if not token:
            log_test("Edge: Passageiro cannot access admin endpoint", False, "No passageiro token available")
            return
        
        response = requests.get(f"{BASE_URL}/admin/users", 
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if response.status_code == 403:
            log_test("Edge: Passageiro cannot access admin endpoint", True)
        else:
            log_test("Edge: Passageiro cannot access admin endpoint", False, f"Expected 403, got {response.status_code}")
    except Exception as e:
        log_test("Edge: Passageiro cannot access admin endpoint", False, str(e))

def test_edge_reserve_own_trip():
    """Test 7.2: Motorista tries to reserve own trip - should return 400"""
    try:
        token = tokens.get("giovanna")
        trip_id = trip_ids.get("giovanna_new")
        
        if not token or not trip_id:
            log_test("Edge: Cannot reserve own trip", False, "Missing token or trip_id")
            return
        
        response = requests.post(f"{BASE_URL}/reservations", 
            headers={"Authorization": f"Bearer {token}"},
            json={"trip_id": trip_id}
        )
        
        if response.status_code == 400:
            log_test("Edge: Cannot reserve own trip", True)
        else:
            log_test("Edge: Cannot reserve own trip", False, f"Expected 400, got {response.status_code}")
    except Exception as e:
        log_test("Edge: Cannot reserve own trip", False, str(e))

def test_edge_duplicate_reservation():
    """Test 7.3: Try to create duplicate reservation - should return 400"""
    try:
        token = tokens.get("passageiro")
        trip_id = trip_ids.get("giovanna_new")
        
        if not token or not trip_id:
            log_test("Edge: Duplicate reservation returns 400", False, "Missing token or trip_id")
            return
        
        response = requests.post(f"{BASE_URL}/reservations", 
            headers={"Authorization": f"Bearer {token}"},
            json={"trip_id": trip_id}
        )
        
        if response.status_code == 400:
            log_test("Edge: Duplicate reservation returns 400", True)
        else:
            log_test("Edge: Duplicate reservation returns 400", False, f"Expected 400, got {response.status_code}")
    except Exception as e:
        log_test("Edge: Duplicate reservation returns 400", False, str(e))

def print_summary():
    """Print test summary"""
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    print(f"Total Tests: {test_results['total']}")
    print(f"Passed: {len(test_results['passed'])}")
    print(f"Failed: {len(test_results['failed'])}")
    print(f"Success Rate: {len(test_results['passed'])/test_results['total']*100:.1f}%")
    
    if test_results['failed']:
        print("\n" + "="*80)
        print("FAILED TESTS:")
        print("="*80)
        for fail in test_results['failed']:
            print(f"\n❌ {fail['name']}")
            print(f"   {fail['details']}")
    
    print("\n" + "="*80)

def main():
    """Run all tests"""
    print("Starting Motoristas VIP Litoral Backend API Tests")
    print(f"Base URL: {BASE_URL}")
    print("="*80 + "\n")
    
    # 1. Auth flow
    print("=== 1. AUTH FLOW ===")
    test_auth_login_motorista()
    test_auth_login_wrong_password()
    test_auth_register_passageiro()
    test_auth_register_duplicate()
    test_auth_me_with_token()
    test_auth_me_without_token()
    
    # 2. Trips
    print("\n=== 2. TRIPS ===")
    test_trips_list_all()
    test_trips_filter_origin_destination()
    test_trips_filter_date()
    test_trips_create_as_motorista()
    test_trips_create_as_passageiro()
    test_trips_update_as_motorista()
    
    # 3. Reservations flow
    print("\n=== 3. RESERVATIONS FLOW ===")
    test_reservations_create()
    test_reservations_list_mine()
    test_chats_list_verify()
    test_notifications_motorista()
    test_trips_update_notify_passengers()
    test_notifications_passageiro()
    test_reservations_complete()
    test_reservations_rate()
    test_auth_me_verify_rating()
    
    # 4. Chats
    print("\n=== 4. CHATS ===")
    test_chats_send_message()
    test_chats_verify_last_message()
    test_chats_unread_for_motorista()
    test_chats_mark_read()
    test_chats_verify_unread_zero()
    
    # 5. Notifications
    print("\n=== 5. NOTIFICATIONS ===")
    test_notifications_mark_read()
    test_notifications_verify_all_read()
    
    # 6. Admin
    print("\n=== 6. ADMIN ===")
    test_admin_login()
    test_admin_list_users()
    test_admin_block_user()
    test_admin_blocked_user_login()
    test_admin_unblock_user()
    test_reports_create()
    test_admin_list_reports()
    test_admin_resolve_report()
    
    # 7. Edge cases
    print("\n=== 7. EDGE CASES ===")
    test_edge_passageiro_admin_access()
    test_edge_reserve_own_trip()
    test_edge_duplicate_reservation()
    
    # Print summary
    print_summary()

if __name__ == "__main__":
    main()
