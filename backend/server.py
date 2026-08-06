from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Literal
from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
from starlette.middleware.cors import CORSMiddleware
from passlib.context import CryptContext
from dotenv import load_dotenv
from pathlib import Path
import os
import uuid
import jwt
import logging

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ.get('DB_NAME', 'test_database')
JWT_SECRET = os.environ.get('JWT_SECRET', 'change_me')
JWT_ALGO = 'HS256'
JWT_TTL_HOURS = 24 * 30

# Timezone helpers: date/time in trips are stored as Brazil local time (BRT = UTC-3).
BRAZIL_TZ_OFFSET_HOURS = 3
# Keep expired trips visible this many hours after their scheduled departure before deleting.
TRIP_EXPIRE_GRACE_HOURS = 3

_cleanup_running = False


def _departure_utc(date_str: str, time_str: str):
    """Parse a trip's date (DD/MM/YYYY) and time (HH:MM) as Brazil-local and return UTC datetime."""
    if not date_str or not time_str:
        return None
    try:
        parts = date_str.split('/')
        if len(parts) != 3:
            return None
        d, m, y = int(parts[0]), int(parts[1]), int(parts[2])
        hm = time_str.split(':')
        h = int(hm[0]) if len(hm) >= 1 else 0
        mi = int(hm[1]) if len(hm) >= 2 else 0
        naive = datetime(y, m, d, h, mi)
        return naive + timedelta(hours=BRAZIL_TZ_OFFSET_HOURS)
    except Exception:
        return None


async def cleanup_expired_trips():
    """Delete trips whose departure time (plus grace period) has passed.
    Concurrent-safe via a simple module-level flag.
    """
    global _cleanup_running
    if _cleanup_running:
        return 0
    _cleanup_running = True
    removed = 0
    try:
        now_utc = datetime.utcnow()
        threshold = now_utc - timedelta(hours=TRIP_EXPIRE_GRACE_HOURS)
        cursor = db.trips.find({}, {'_id': 0, 'id': 1, 'date': 1, 'time': 1})
        expired_ids = []
        async for t in cursor:
            dep = _departure_utc(t.get('date', ''), t.get('time', ''))
            if dep is not None and dep < threshold:
                expired_ids.append(t['id'])
        for tid in expired_ids:
            # Mark any confirmed reservation as concluida so history remains meaningful
            await db.reservations.update_many(
                {'trip_id': tid, 'status': 'confirmada'},
                {'$set': {'status': 'concluida'}},
            )
            await db.trips.delete_one({'id': tid})
            removed += 1
        if removed:
            logger.info(f'Expired trips cleanup: removed {removed}')
    finally:
        _cleanup_running = False
    return removed

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

pwd_ctx = CryptContext(schemes=['bcrypt'], deprecated='auto')
bearer = HTTPBearer(auto_error=False)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('vip_litoral')

app = FastAPI(title='Motoristas VIP Litoral API')
api = APIRouter(prefix='/api')

# ---------- Models ----------

Role = Literal['passageiro', 'motorista', 'admin']
UserStatus = Literal['ativo', 'bloqueado', 'pendente']
TripStatus = Literal['ativa', 'cancelada']
ResStatus = Literal['confirmada', 'cancelada', 'concluida']
NotifType = Literal['reserva', 'alteracao', 'cancelamento', 'info']
ReportType = Literal['usuario', 'viagem', 'mensagem']
ReportStatus = Literal['pendente', 'resolvida']


class RegisterIn(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=4)
    role: Role = 'passageiro'
    avatar: Optional[str] = None


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    name: str
    email: EmailStr
    role: Role
    rating: float = 0.0
    trips: int = 0
    avatar: str
    status: UserStatus = 'ativo'
    verified: bool = False
    phone: str = ''
    city: str = ''
    created_at: datetime


class UserPatch(BaseModel):
    name: Optional[str] = None
    avatar: Optional[str] = None
    phone: Optional[str] = None
    city: Optional[str] = None


class TripIn(BaseModel):
    origin: str
    destination: str
    date: str
    time: str
    seats_total: int = Field(ge=1, le=8)
    price: float = Field(ge=10)
    pet_friendly: bool = False
    home_pickup: bool = False


class TripPatch(BaseModel):
    date: Optional[str] = None
    time: Optional[str] = None
    price: Optional[float] = None
    seats_total: Optional[int] = None
    pet_friendly: Optional[bool] = None
    home_pickup: Optional[bool] = None


class TripOut(BaseModel):
    id: str
    driver_id: str
    driver_name: str
    driver_avatar: str
    origin: str
    destination: str
    date: str
    time: str
    seats_total: int
    seats_filled: int
    price: float
    pet_friendly: bool
    home_pickup: bool
    status: TripStatus
    rating: float = 0.0
    driver_trips: int = 0
    created_at: datetime


class ReservationOut(BaseModel):
    id: str
    trip_id: str
    passenger_id: str
    driver_id: str
    status: ResStatus
    rating_given: bool = False
    rating_score: Optional[int] = None
    rating_comment: Optional[str] = None
    created_at: datetime


class RateIn(BaseModel):
    score: int = Field(ge=1, le=5)
    comment: Optional[str] = ''


class CancelTripIn(BaseModel):
    reason: Optional[str] = None


class MessageOut(BaseModel):
    id: str
    sender_id: str
    text: str
    created_at: datetime


class ChatOut(BaseModel):
    id: str
    other_user_id: str
    other_user_name: str
    other_user_avatar: str
    last_message: str
    last_time: datetime
    unread: int = 0
    messages: List[MessageOut] = []


class SendMessageIn(BaseModel):
    chat_id: Optional[str] = None
    other_user_id: Optional[str] = None
    text: str


class EnsureChatIn(BaseModel):
    other_user_id: str
    initial_message: Optional[str] = None


class NotificationOut(BaseModel):
    id: str
    user_id: str
    type: NotifType
    message: str
    trip_id: Optional[str] = None
    read: bool = False
    created_at: datetime


class ReportIn(BaseModel):
    type: ReportType
    target_id: str
    target_name: str
    reason: str


class ReportOut(BaseModel):
    id: str
    type: ReportType
    target_id: str
    target_name: str
    reporter_id: str
    reporter_name: str
    reason: str
    status: ReportStatus
    created_at: datetime


class StatusPatch(BaseModel):
    status: UserStatus


# ---------- Helpers ----------

def gen_id() -> str:
    return uuid.uuid4().hex


def hash_password(p: str) -> str:
    return pwd_ctx.hash(p)


def verify_password(p: str, hashed: str) -> bool:
    try:
        return pwd_ctx.verify(p, hashed)
    except Exception:
        return False


def create_token(user_id: str) -> str:
    payload = {
        'sub': user_id,
        'iat': int(datetime.utcnow().timestamp()),
        'exp': int((datetime.utcnow() + timedelta(hours=JWT_TTL_HOURS)).timestamp()),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


def decode_token(token: str) -> Optional[str]:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
        return payload.get('sub')
    except jwt.PyJWTError:
        return None


def user_public(u: dict) -> dict:
    return {
        'id': u['id'], 'name': u['name'], 'email': u['email'], 'role': u['role'],
        'rating': float(u.get('rating', 0.0)), 'trips': int(u.get('trips', 0)),
        'avatar': u.get('avatar', ''), 'status': u.get('status', 'ativo'),
        'verified': bool(u.get('verified', False)),
        'phone': u.get('phone', '') or '',
        'city': u.get('city', '') or '',
        'created_at': u.get('created_at') or datetime.utcnow(),
    }


async def get_current_user(cred: Optional[HTTPAuthorizationCredentials] = Depends(bearer)) -> dict:
    if not cred or not cred.credentials:
        raise HTTPException(status_code=401, detail='Não autenticado')
    user_id = decode_token(cred.credentials)
    if not user_id:
        raise HTTPException(status_code=401, detail='Token inválido')
    u = await db.users.find_one({'id': user_id}, {'_id': 0})
    if not u:
        raise HTTPException(status_code=401, detail='Usuário não encontrado')
    if u.get('status') == 'bloqueado':
        raise HTTPException(status_code=403, detail='Conta bloqueada. Contate o suporte.')
    return u


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get('role') != 'admin':
        raise HTTPException(status_code=403, detail='Somente administradores')
    return user


async def add_notification(user_id: str, ntype: NotifType, message: str, trip_id: Optional[str] = None):
    if not user_id:
        return
    notif = {
        'id': gen_id(), 'user_id': user_id, 'type': ntype,
        'message': message, 'trip_id': trip_id,
        'read': False, 'created_at': datetime.utcnow(),
    }
    await db.notifications.insert_one(notif)


async def recompute_driver_rating(driver_id: str):
    cursor = db.reservations.find({'driver_id': driver_id, 'rating_given': True})
    scores = []
    async for r in cursor:
        if r.get('rating_score') is not None:
            scores.append(int(r['rating_score']))
    if scores:
        avg = round(sum(scores) / len(scores), 1)
        await db.users.update_one({'id': driver_id}, {'$set': {'rating': avg, 'trips': len(scores)}})
        await db.trips.update_many({'driver_id': driver_id}, {'$set': {'rating': avg, 'driver_trips': len(scores)}})


# ---------- Auth ----------

@api.post('/auth/register')
async def register(payload: RegisterIn):
    existing = await db.users.find_one({'email': payload.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail='E-mail já cadastrado')
    if payload.role not in ('passageiro', 'motorista'):
        raise HTTPException(status_code=400, detail='Papel inválido')
    user_id = gen_id()
    avatar = payload.avatar or f'https://api.dicebear.com/7.x/initials/svg?seed={payload.name}'
    user_doc = {
        'id': user_id, 'name': payload.name.strip(), 'email': payload.email.lower(),
        'password_hash': hash_password(payload.password), 'role': payload.role,
        'rating': 0.0, 'trips': 0, 'avatar': avatar, 'status': 'ativo',
        'verified': False, 'created_at': datetime.utcnow(),
    }
    await db.users.insert_one(user_doc)
    token = create_token(user_id)
    return {'token': token, 'user': user_public(user_doc)}


@api.post('/auth/login')
async def login(payload: LoginIn):
    u = await db.users.find_one({'email': payload.email.lower()})
    if not u or not verify_password(payload.password, u.get('password_hash', '')):
        raise HTTPException(status_code=401, detail='E-mail ou senha inválidos')
    if u.get('status') == 'bloqueado':
        raise HTTPException(status_code=403, detail='Conta bloqueada. Contate o suporte.')
    token = create_token(u['id'])
    return {'token': token, 'user': user_public(u)}


@api.get('/auth/me')
async def me(user: dict = Depends(get_current_user)):
    return user_public(user)


@api.patch('/users/me')
async def patch_me(payload: UserPatch, user: dict = Depends(get_current_user)):
    updates = {k: v for k, v in payload.dict().items() if v is not None}
    if not updates:
        return user_public(user)
    await db.users.update_one({'id': user['id']}, {'$set': updates})
    if 'avatar' in updates:
        await db.trips.update_many({'driver_id': user['id']}, {'$set': {'driver_avatar': updates['avatar']}})
    if 'name' in updates:
        await db.trips.update_many({'driver_id': user['id']}, {'$set': {'driver_name': updates['name']}})
    fresh = await db.users.find_one({'id': user['id']}, {'_id': 0})
    return user_public(fresh)


@api.get('/users')
async def list_users(user: dict = Depends(get_current_user)):
    docs = await db.users.find({}, {'_id': 0, 'password_hash': 0}).to_list(500)
    return [user_public(u) for u in docs]


# ---------- Trips ----------

def _norm_date_iso(d: str) -> str:
    # Accept DD/MM/YYYY or YYYY-MM-DD, return DD/MM/YYYY as display
    if not d:
        return ''
    if '/' in d:
        return d
    parts = d.split('-')
    if len(parts) == 3:
        return f'{parts[2]}/{parts[1]}/{parts[0]}'
    return d


@api.get('/trips')
async def list_trips(
    origin: Optional[str] = None,
    destination: Optional[str] = None,
    date: Optional[str] = None,
    pet: Optional[bool] = None,
    home: Optional[bool] = None,
    sort: Optional[str] = None,
    include_cancelled: bool = False,
):
    await cleanup_expired_trips()
    q: dict = {}
    if not include_cancelled:
        q['status'] = 'ativa'
    if origin:
        q['origin'] = {'$regex': origin, '$options': 'i'}
    if destination:
        q['destination'] = {'$regex': destination, '$options': 'i'}
    if date:
        q['date'] = _norm_date_iso(date)
    if pet is True:
        q['pet_friendly'] = True
    if home is True:
        q['home_pickup'] = True

    sort_field = 'created_at'
    direction = -1
    if sort == 'price':
        sort_field, direction = 'price', 1
    elif sort == 'rating':
        sort_field, direction = 'rating', -1

    docs = await db.trips.find(q, {'_id': 0}).sort(sort_field, direction).to_list(500)
    return docs


@api.post('/trips')
async def create_trip(payload: TripIn, user: dict = Depends(get_current_user)):
    if user['role'] != 'motorista':
        raise HTTPException(status_code=403, detail='Somente motoristas publicam viagens')
    trip = {
        'id': gen_id(),
        'driver_id': user['id'], 'driver_name': user['name'], 'driver_avatar': user.get('avatar', ''),
        'origin': payload.origin.strip(), 'destination': payload.destination.strip(),
        'date': _norm_date_iso(payload.date), 'time': payload.time,
        'seats_total': payload.seats_total, 'seats_filled': 0,
        'price': float(payload.price),
        'pet_friendly': payload.pet_friendly, 'home_pickup': payload.home_pickup,
        'status': 'ativa', 'rating': float(user.get('rating', 0.0)),
        'driver_trips': int(user.get('trips', 0)), 'created_at': datetime.utcnow(),
    }
    await db.trips.insert_one(trip)
    trip.pop('_id', None)
    return trip


@api.patch('/trips/{trip_id}')
async def update_trip(trip_id: str, payload: TripPatch, user: dict = Depends(get_current_user)):
    trip = await db.trips.find_one({'id': trip_id}, {'_id': 0})
    if not trip:
        raise HTTPException(status_code=404, detail='Viagem não encontrada')
    if trip['driver_id'] != user['id']:
        raise HTTPException(status_code=403, detail='Apenas o motorista pode editar')
    updates = {}
    change_parts = []
    if payload.date is not None and _norm_date_iso(payload.date) != trip['date']:
        updates['date'] = _norm_date_iso(payload.date)
        change_parts.append(f'nova data {updates["date"]}')
    if payload.time is not None and payload.time != trip['time']:
        updates['time'] = payload.time
        change_parts.append(f'novo horário {payload.time}')
    if payload.price is not None and float(payload.price) != trip['price']:
        if payload.price < 10:
            raise HTTPException(status_code=400, detail='Valor mínimo R$ 10,00')
        updates['price'] = float(payload.price)
        change_parts.append(f'novo preço R$ {updates["price"]}')
    if payload.seats_total is not None and payload.seats_total != trip['seats_total']:
        updates['seats_total'] = payload.seats_total
    if payload.pet_friendly is not None:
        updates['pet_friendly'] = payload.pet_friendly
    if payload.home_pickup is not None:
        updates['home_pickup'] = payload.home_pickup
    if not updates:
        return trip
    await db.trips.update_one({'id': trip_id}, {'$set': updates})
    msg_core = f'Viagem {trip["origin"]} → {trip["destination"]} foi atualizada'
    msg = f'{msg_core}: {", ".join(change_parts)}.' if change_parts else msg_core + '.'
    notified = 0
    async for r in db.reservations.find({'trip_id': trip_id, 'status': 'confirmada'}):
        await add_notification(r['passenger_id'], 'alteracao', msg, trip_id)
        notified += 1
    fresh = await db.trips.find_one({'id': trip_id}, {'_id': 0})
    return {'trip': fresh, 'notified': notified}


@api.post('/trips/{trip_id}/cancel')
async def cancel_trip(trip_id: str, payload: CancelTripIn, user: dict = Depends(get_current_user)):
    trip = await db.trips.find_one({'id': trip_id}, {'_id': 0})
    if not trip:
        raise HTTPException(status_code=404, detail='Viagem não encontrada')
    if trip['driver_id'] != user['id']:
        raise HTTPException(status_code=403, detail='Apenas o motorista pode cancelar')
    await db.trips.update_one({'id': trip_id}, {'$set': {'status': 'cancelada', 'seats_filled': 0}})
    reason = (payload.reason or '').strip()
    msg = f'Viagem {trip["origin"]} → {trip["destination"]} foi cancelada pelo motorista' + (f'. Motivo: {reason}' if reason else '.')
    notified = 0
    async for r in db.reservations.find({'trip_id': trip_id, 'status': 'confirmada'}):
        await add_notification(r['passenger_id'], 'cancelamento', msg, trip_id)
        notified += 1
    await db.reservations.update_many({'trip_id': trip_id, 'status': 'confirmada'}, {'$set': {'status': 'cancelada'}})
    return {'notified': notified}


# ---------- Reservations ----------

@api.get('/reservations/mine')
async def my_reservations(user: dict = Depends(get_current_user)):
    docs = await db.reservations.find({'passenger_id': user['id']}, {'_id': 0}).sort('created_at', -1).to_list(500)
    return docs


@api.get('/reservations/incoming')
async def incoming_reservations(user: dict = Depends(get_current_user)):
    docs = await db.reservations.find({'driver_id': user['id']}, {'_id': 0}).sort('created_at', -1).to_list(500)
    return docs


class ReserveIn(BaseModel):
    trip_id: str


@api.post('/reservations')
async def reserve(payload: ReserveIn, user: dict = Depends(get_current_user)):
    trip = await db.trips.find_one({'id': payload.trip_id}, {'_id': 0})
    if not trip:
        raise HTTPException(status_code=404, detail='Viagem não encontrada')
    if trip['driver_id'] == user['id']:
        raise HTTPException(status_code=400, detail='Você não pode reservar sua própria viagem')
    if trip['status'] != 'ativa':
        raise HTTPException(status_code=400, detail='Viagem não está ativa')
    if trip['seats_filled'] >= trip['seats_total']:
        raise HTTPException(status_code=400, detail='Sem vagas disponíveis')
    existing = await db.reservations.find_one({'trip_id': payload.trip_id, 'passenger_id': user['id'], 'status': {'$ne': 'cancelada'}})
    if existing:
        raise HTTPException(status_code=400, detail='Você já tem reserva nesta viagem')

    res = {
        'id': gen_id(), 'trip_id': trip['id'], 'passenger_id': user['id'],
        'driver_id': trip['driver_id'], 'status': 'confirmada',
        'rating_given': False, 'rating_score': None, 'rating_comment': None,
        'created_at': datetime.utcnow(),
    }
    await db.reservations.insert_one(res)
    await db.trips.update_one({'id': trip['id']}, {'$inc': {'seats_filled': 1}})

    # ensure chat + initial message
    chat_id = await _ensure_chat(user, trip['driver_id'], f'Olá! Acabei de reservar 1 vaga na viagem {trip["origin"]} → {trip["destination"]} ({trip["date"]} · {trip["time"]}).')

    await add_notification(trip['driver_id'], 'reserva', f'{user["name"]} reservou 1 vaga em {trip["origin"]} → {trip["destination"]}.', trip['id'])

    res.pop('_id', None)
    return {'reservation': res, 'chat_id': chat_id}


@api.post('/reservations/{res_id}/cancel')
async def cancel_reservation(res_id: str, user: dict = Depends(get_current_user)):
    res = await db.reservations.find_one({'id': res_id}, {'_id': 0})
    if not res:
        raise HTTPException(status_code=404, detail='Reserva não encontrada')
    if res['passenger_id'] != user['id']:
        raise HTTPException(status_code=403, detail='Apenas o passageiro pode cancelar')
    if res['status'] == 'cancelada':
        return {'ok': True}
    await db.reservations.update_one({'id': res_id}, {'$set': {'status': 'cancelada'}})
    trip = await db.trips.find_one({'id': res['trip_id']}, {'_id': 0})
    if trip and trip['seats_filled'] > 0:
        await db.trips.update_one({'id': trip['id']}, {'$inc': {'seats_filled': -1}})
    if trip:
        await add_notification(trip['driver_id'], 'cancelamento', f'Um passageiro cancelou a reserva em {trip["origin"]} → {trip["destination"]}.', trip['id'])
    return {'ok': True}


@api.post('/reservations/{res_id}/complete')
async def complete_reservation(res_id: str, user: dict = Depends(get_current_user)):
    res = await db.reservations.find_one({'id': res_id}, {'_id': 0})
    if not res:
        raise HTTPException(status_code=404, detail='Reserva não encontrada')
    if res['passenger_id'] != user['id'] and res['driver_id'] != user['id']:
        raise HTTPException(status_code=403, detail='Sem permissão')
    await db.reservations.update_one({'id': res_id}, {'$set': {'status': 'concluida'}})
    return {'ok': True}


@api.post('/reservations/{res_id}/rate')
async def rate_reservation(res_id: str, payload: RateIn, user: dict = Depends(get_current_user)):
    res = await db.reservations.find_one({'id': res_id}, {'_id': 0})
    if not res:
        raise HTTPException(status_code=404, detail='Reserva não encontrada')
    if res['passenger_id'] != user['id']:
        raise HTTPException(status_code=403, detail='Apenas o passageiro pode avaliar')
    if res.get('rating_given'):
        raise HTTPException(status_code=400, detail='Reserva já avaliada')
    await db.reservations.update_one(
        {'id': res_id},
        {'$set': {'status': 'concluida', 'rating_given': True, 'rating_score': int(payload.score), 'rating_comment': (payload.comment or '').strip()}},
    )
    await recompute_driver_rating(res['driver_id'])
    return {'ok': True}


# ---------- Chats ----------

def _sort_participants(a: str, b: str) -> List[str]:
    return sorted([a, b])


async def _ensure_chat(current_user: dict, other_id: str, initial_text: Optional[str]) -> str:
    parts = _sort_participants(current_user['id'], other_id)
    chat = await db.chats.find_one({'participants': parts})
    if chat:
        return chat['id']
    other = await db.users.find_one({'id': other_id}, {'_id': 0})
    other_name = other['name'] if other else 'Usuário'
    other_avatar = other.get('avatar', '') if other else ''
    now = datetime.utcnow()
    text = (initial_text or 'Olá!').strip()
    chat_id = gen_id()
    msg = {'id': gen_id(), 'sender_id': current_user['id'], 'text': text, 'created_at': now}
    chat_doc = {
        'id': chat_id, 'participants': parts, 'messages': [msg],
        'last_message': text, 'last_time': now,
        'meta': {
            current_user['id']: {'other_id': other_id, 'other_name': other_name, 'other_avatar': other_avatar, 'unread': 0, 'last_read': now},
            other_id: {'other_id': current_user['id'], 'other_name': current_user['name'], 'other_avatar': current_user.get('avatar', ''), 'unread': 1, 'last_read': None},
        },
        'created_at': now,
    }
    await db.chats.insert_one(chat_doc)
    return chat_id


@api.post('/chats/ensure')
async def ensure_chat_endpoint(payload: EnsureChatIn, user: dict = Depends(get_current_user)):
    chat_id = await _ensure_chat(user, payload.other_user_id, payload.initial_message)
    return {'chat_id': chat_id}


def _chat_to_out(chat: dict, uid: str) -> dict:
    meta = (chat.get('meta') or {}).get(uid) or {}
    return {
        'id': chat['id'],
        'other_user_id': meta.get('other_id', ''),
        'other_user_name': meta.get('other_name', ''),
        'other_user_avatar': meta.get('other_avatar', ''),
        'last_message': chat.get('last_message', ''),
        'last_time': chat.get('last_time') or chat.get('created_at'),
        'unread': int(meta.get('unread', 0)),
        'messages': [
            {'id': m['id'], 'sender_id': m['sender_id'], 'text': m['text'], 'created_at': m['created_at']}
            for m in (chat.get('messages') or [])
        ],
    }


@api.get('/chats')
async def list_chats(user: dict = Depends(get_current_user)):
    docs = await db.chats.find({'participants': user['id']}, {'_id': 0}).sort('last_time', -1).to_list(500)
    return [_chat_to_out(c, user['id']) for c in docs]


@api.post('/chats/message')
async def send_message(payload: SendMessageIn, user: dict = Depends(get_current_user)):
    if not payload.text or not payload.text.strip():
        raise HTTPException(status_code=400, detail='Mensagem vazia')
    text = payload.text.strip()
    chat_id = payload.chat_id
    if not chat_id and payload.other_user_id:
        chat_id = await _ensure_chat(user, payload.other_user_id, None)
    if not chat_id:
        raise HTTPException(status_code=400, detail='Informe chat_id ou other_user_id')
    chat = await db.chats.find_one({'id': chat_id})
    if not chat or user['id'] not in chat.get('participants', []):
        raise HTTPException(status_code=404, detail='Chat não encontrado')
    now = datetime.utcnow()
    msg = {'id': gen_id(), 'sender_id': user['id'], 'text': text, 'created_at': now}
    other_id = [p for p in chat['participants'] if p != user['id']][0]
    await db.chats.update_one(
        {'id': chat_id},
        {
            '$push': {'messages': msg},
            '$set': {'last_message': text, 'last_time': now, f'meta.{user["id"]}.unread': 0, f'meta.{user["id"]}.last_read': now},
            '$inc': {f'meta.{other_id}.unread': 1},
        },
    )
    return {'ok': True, 'chat_id': chat_id, 'message': msg}


@api.post('/chats/{chat_id}/read')
async def mark_chat_read(chat_id: str, user: dict = Depends(get_current_user)):
    await db.chats.update_one(
        {'id': chat_id, 'participants': user['id']},
        {'$set': {f'meta.{user["id"]}.unread': 0, f'meta.{user["id"]}.last_read': datetime.utcnow()}},
    )
    return {'ok': True}


# ---------- Notifications ----------

@api.get('/notifications')
async def list_notifications(user: dict = Depends(get_current_user)):
    docs = await db.notifications.find({'user_id': user['id']}, {'_id': 0}).sort('created_at', -1).to_list(200)
    return docs


@api.post('/notifications/read')
async def mark_notifications_read(user: dict = Depends(get_current_user)):
    await db.notifications.update_many({'user_id': user['id'], 'read': False}, {'$set': {'read': True}})
    return {'ok': True}


@api.delete('/notifications')
async def clear_notifications(user: dict = Depends(get_current_user)):
    await db.notifications.delete_many({'user_id': user['id']})
    return {'ok': True}


# ---------- Reports & Admin ----------

@api.post('/reports')
async def create_report(payload: ReportIn, user: dict = Depends(get_current_user)):
    doc = {
        'id': gen_id(), 'type': payload.type,
        'target_id': payload.target_id, 'target_name': payload.target_name,
        'reporter_id': user['id'], 'reporter_name': user['name'],
        'reason': payload.reason.strip(), 'status': 'pendente',
        'created_at': datetime.utcnow(),
    }
    await db.reports.insert_one(doc)
    doc.pop('_id', None)
    return doc


@api.get('/admin/users')
async def admin_users(user: dict = Depends(require_admin)):
    docs = await db.users.find({}, {'_id': 0, 'password_hash': 0}).sort('created_at', -1).to_list(500)
    return [user_public(u) for u in docs]


@api.post('/admin/users/{user_id}/status')
async def admin_user_status(user_id: str, payload: StatusPatch, user: dict = Depends(require_admin)):
    await db.users.update_one({'id': user_id}, {'$set': {'status': payload.status}})
    return {'ok': True}


@api.delete('/admin/users/{user_id}')
async def admin_delete_user(user_id: str, user: dict = Depends(require_admin)):
    target = await db.users.find_one({'id': user_id}, {'_id': 0})
    if not target:
        raise HTTPException(status_code=404, detail='Usuário não encontrado')
    if target.get('role') == 'admin':
        raise HTTPException(status_code=400, detail='Não é possível remover administradores')
    if target['id'] == user['id']:
        raise HTTPException(status_code=400, detail='Você não pode remover a própria conta')

    # Cancel and delete all trips published by this user (if driver)
    trips_removed = 0
    async for t in db.trips.find({'driver_id': user_id}, {'_id': 0, 'id': 1, 'origin': 1, 'destination': 1}):
        msg = f'Viagem {t["origin"]} → {t["destination"]} foi removida pela moderação.'
        async for r in db.reservations.find({'trip_id': t['id'], 'status': 'confirmada'}):
            await add_notification(r['passenger_id'], 'cancelamento', msg, t['id'])
        await db.reservations.update_many({'trip_id': t['id']}, {'$set': {'status': 'cancelada'}})
        await db.trips.delete_one({'id': t['id']})
        trips_removed += 1

    # Delete user's own reservations (as passenger)
    await db.reservations.delete_many({'passenger_id': user_id})
    # Delete user's chats and messages
    await db.chats.delete_many({'participants': user_id})
    # Delete user's notifications and reports made
    await db.notifications.delete_many({'user_id': user_id})
    await db.reports.delete_many({'reporter_id': user_id})
    # Finally delete the user
    await db.users.delete_one({'id': user_id})
    return {'ok': True, 'trips_removed': trips_removed}


@api.get('/admin/reports')
async def admin_reports(user: dict = Depends(require_admin)):
    docs = await db.reports.find({}, {'_id': 0}).sort('created_at', -1).to_list(500)
    return docs


@api.post('/admin/reports/{report_id}/resolve')
async def admin_resolve(report_id: str, user: dict = Depends(require_admin)):
    await db.reports.update_one({'id': report_id}, {'$set': {'status': 'resolvida'}})
    return {'ok': True}


@api.delete('/admin/reports/{report_id}')
async def admin_delete_report(report_id: str, user: dict = Depends(require_admin)):
    await db.reports.delete_one({'id': report_id})
    return {'ok': True}


@api.get('/admin/trips')
async def admin_list_trips(user: dict = Depends(require_admin)):
    await cleanup_expired_trips()
    docs = await db.trips.find({}, {'_id': 0}).sort('created_at', -1).to_list(1000)
    return docs


@api.delete('/admin/trips/{trip_id}')
async def admin_delete_trip(trip_id: str, user: dict = Depends(require_admin)):
    trip = await db.trips.find_one({'id': trip_id}, {'_id': 0})
    if not trip:
        raise HTTPException(status_code=404, detail='Viagem não encontrada')
    notified = 0
    msg = f'Viagem {trip["origin"]} → {trip["destination"]} foi removida pela moderação.'
    async for r in db.reservations.find({'trip_id': trip_id, 'status': 'confirmada'}):
        await add_notification(r['passenger_id'], 'cancelamento', msg, trip_id)
        notified += 1
    await db.reservations.update_many({'trip_id': trip_id, 'status': 'confirmada'}, {'$set': {'status': 'cancelada'}})
    await db.trips.delete_one({'id': trip_id})
    return {'ok': True, 'notified': notified}


@api.post('/admin/trips/{trip_id}/cancel')
async def admin_cancel_trip(trip_id: str, payload: CancelTripIn, user: dict = Depends(require_admin)):
    trip = await db.trips.find_one({'id': trip_id}, {'_id': 0})
    if not trip:
        raise HTTPException(status_code=404, detail='Viagem não encontrada')
    if trip['status'] == 'cancelada':
        return {'ok': True, 'notified': 0, 'already_cancelled': True}
    await db.trips.update_one({'id': trip_id}, {'$set': {'status': 'cancelada', 'seats_filled': 0}})
    reason = (payload.reason or '').strip()
    msg = f'Viagem {trip["origin"]} → {trip["destination"]} foi cancelada pela moderação' + (f'. Motivo: {reason}' if reason else '.')
    notified = 0
    async for r in db.reservations.find({'trip_id': trip_id, 'status': 'confirmada'}):
        await add_notification(r['passenger_id'], 'cancelamento', msg, trip_id)
        notified += 1
    await add_notification(trip['driver_id'], 'cancelamento', f'Sua viagem {trip["origin"]} → {trip["destination"]} foi cancelada pela moderação' + (f'. Motivo: {reason}' if reason else '.'), trip_id)
    await db.reservations.update_many({'trip_id': trip_id, 'status': 'confirmada'}, {'$set': {'status': 'cancelada'}})
    return {'ok': True, 'notified': notified}


@api.get('/admin/pending')
async def admin_pending(user: dict = Depends(require_admin)):
    docs = await db.users.find({'status': 'pendente'}, {'_id': 0, 'password_hash': 0}).to_list(200)
    return [user_public(u) for u in docs]


@api.post('/admin/pending/{user_id}/approve')
async def admin_approve(user_id: str, user: dict = Depends(require_admin)):
    await db.users.update_one({'id': user_id}, {'$set': {'status': 'ativo', 'verified': True}})
    return {'ok': True}


@api.post('/admin/pending/{user_id}/reject')
async def admin_reject(user_id: str, user: dict = Depends(require_admin)):
    await db.users.update_one({'id': user_id}, {'$set': {'status': 'bloqueado'}})
    return {'ok': True}


# ---------- Seed ----------

SEED_USERS = [
    {'name': 'Giovanna Carolina Martins', 'email': 'giovanna@example.com', 'password': '123456', 'role': 'motorista', 'avatar': 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop'},
    {'name': 'Célio Silva', 'email': 'celio@example.com', 'password': '123456', 'role': 'motorista', 'avatar': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop'},
    {'name': 'Ricardo Alves', 'email': 'ricardo@example.com', 'password': '123456', 'role': 'motorista', 'avatar': 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop'},
    {'name': 'Mago Branco', 'email': 'magobranco322@gmail.com', 'password': '123456', 'role': 'passageiro', 'avatar': 'https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=200&h=200&fit=crop'},
    {'name': 'Ana Beatriz', 'email': 'ana@example.com', 'password': '123456', 'role': 'passageiro', 'avatar': 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop'},
    {'name': 'Admin VIP Litoral', 'email': 'admin@borajunto.com', 'password': 'admin', 'role': 'admin', 'avatar': 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop'},
]


async def seed_if_empty():
    count = await db.users.count_documents({})
    if count > 0:
        logger.info(f'Skipping seed: {count} users already exist')
        return
    logger.info('Seeding initial demo data...')
    id_map: dict = {}
    for s in SEED_USERS:
        uid = gen_id()
        id_map[s['email']] = uid
        await db.users.insert_one({
            'id': uid, 'name': s['name'], 'email': s['email'].lower(),
            'password_hash': hash_password(s['password']), 'role': s['role'],
            'rating': 0.0, 'trips': 0, 'avatar': s['avatar'], 'status': 'ativo',
            'verified': True, 'created_at': datetime.utcnow(),
        })
    giovanna = id_map['giovanna@example.com']
    celio = id_map['celio@example.com']
    ricardo = id_map['ricardo@example.com']
    trips_seed = [
        {'driver_id': giovanna, 'origin': 'Matinhos', 'destination': 'Curitiba', 'date': '05/08/2026', 'time': '18:00', 'seats_total': 4, 'price': 70.0, 'pet_friendly': True, 'home_pickup': True},
        {'driver_id': celio, 'origin': 'Curitiba posto shell via sul', 'destination': 'Matinhos', 'date': '05/08/2026', 'time': '18:00', 'seats_total': 4, 'price': 65.0, 'pet_friendly': False, 'home_pickup': False},
        {'driver_id': ricardo, 'origin': 'Curitiba - Centro', 'destination': 'Guaratuba', 'date': '10/08/2026', 'time': '07:30', 'seats_total': 4, 'price': 55.0, 'pet_friendly': True, 'home_pickup': True},
        {'driver_id': ricardo, 'origin': 'Pontal do Paraná', 'destination': 'Curitiba - Rodoviária', 'date': '12/08/2026', 'time': '19:00', 'seats_total': 3, 'price': 80.0, 'pet_friendly': False, 'home_pickup': False},
        {'driver_id': giovanna, 'origin': 'Curitiba - Batel', 'destination': 'Praia de Leste', 'date': '15/08/2026', 'time': '06:00', 'seats_total': 4, 'price': 60.0, 'pet_friendly': True, 'home_pickup': False},
    ]
    for t in trips_seed:
        drv = await db.users.find_one({'id': t['driver_id']})
        await db.trips.insert_one({
            'id': gen_id(),
            'driver_id': t['driver_id'], 'driver_name': drv['name'], 'driver_avatar': drv['avatar'],
            'origin': t['origin'], 'destination': t['destination'],
            'date': t['date'], 'time': t['time'],
            'seats_total': t['seats_total'], 'seats_filled': 0,
            'price': t['price'],
            'pet_friendly': t['pet_friendly'], 'home_pickup': t['home_pickup'],
            'status': 'ativa', 'rating': 0.0, 'driver_trips': 0,
            'created_at': datetime.utcnow(),
        })
    logger.info('Seed complete.')


@api.get('/')
async def root():
    return {'app': 'Motoristas VIP Litoral', 'status': 'ok'}


app.include_router(api)


@app.get('/health')
async def health():
    return {'status': 'ok'}


@app.get('/')
async def app_root():
    return {'app': 'Motoristas VIP Litoral', 'status': 'ok'}


app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=['*'],
    allow_methods=['*'],
    allow_headers=['*'],
)


@app.on_event('startup')
async def on_start():
    await seed_if_empty()
    await cleanup_expired_trips()


@app.on_event('shutdown')
async def on_shutdown():
    client.close()
