import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import api, { apiError } from '../lib/api';
import { useAuth } from './AuthContext';

const TripsContext = createContext(null);

const POLL_MS = 15000;

const normalizeTrip = (t) => ({
  id: t.id,
  driverId: t.driver_id,
  driverName: t.driver_name,
  driverAvatar: t.driver_avatar,
  origin: t.origin,
  destination: t.destination,
  date: t.date,
  time: t.time,
  seatsTotal: t.seats_total,
  seatsFilled: t.seats_filled,
  price: t.price,
  petFriendly: !!t.pet_friendly,
  homePickup: !!t.home_pickup,
  status: t.status,
  rating: Number(t.rating || 0),
  driverTrips: Number(t.driver_trips || 0),
});

const normalizeReservation = (r) => ({
  id: r.id,
  tripId: r.trip_id,
  passengerId: r.passenger_id,
  driverId: r.driver_id,
  status: r.status,
  ratingGiven: !!r.rating_given,
  ratingScore: r.rating_score,
  ratingComment: r.rating_comment,
});

const normalizeChat = (c) => ({
  id: c.id,
  otherUserId: c.other_user_id,
  otherUserName: c.other_user_name,
  otherUserAvatar: c.other_user_avatar,
  lastMessage: c.last_message,
  lastTime: c.last_time,
  unread: c.unread || 0,
  messages: (c.messages || []).map((m) => ({
    id: m.id,
    senderId: m.sender_id,
    text: m.text,
    time: new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
  })),
});

const normalizeNotif = (n) => ({
  id: n.id,
  userId: n.user_id,
  type: n.type,
  message: n.message,
  tripId: n.trip_id,
  at: n.created_at,
  read: !!n.read,
});

export const TripsProvider = ({ children }) => {
  const { user } = useAuth();
  const [trips, setTrips] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [chats, setChats] = useState([]);
  const pollRef = useRef(null);

  const refreshTrips = useCallback(async (params) => {
    try {
      const { data } = await api.get('/trips', { params });
      setTrips((data || []).map(normalizeTrip));
    } catch (e) { /* ignore */ }
  }, []);

  const refreshReservations = useCallback(async () => {
    if (!user) { setReservations([]); return; }
    try {
      const paths = ['/reservations/mine'];
      if (user.role === 'motorista') paths.push('/reservations/incoming');
      const responses = await Promise.all(paths.map((p) => api.get(p)));
      const merged = [];
      const seen = new Set();
      responses.forEach((r) => (r.data || []).forEach((res) => {
        if (!seen.has(res.id)) { seen.add(res.id); merged.push(normalizeReservation(res)); }
      }));
      setReservations(merged);
    } catch (e) { /* ignore */ }
  }, [user]);

  const refreshNotifications = useCallback(async () => {
    if (!user) { setNotifications([]); return; }
    try {
      const { data } = await api.get('/notifications');
      setNotifications((data || []).map(normalizeNotif));
    } catch (e) { /* ignore */ }
  }, [user]);

  const refreshChats = useCallback(async () => {
    if (!user) { setChats([]); return; }
    try {
      const { data } = await api.get('/chats');
      setChats((data || []).map(normalizeChat));
    } catch (e) { /* ignore */ }
  }, [user]);

  const refreshAll = useCallback(async () => {
    await Promise.all([refreshTrips(), refreshReservations(), refreshNotifications(), refreshChats()]);
  }, [refreshTrips, refreshReservations, refreshNotifications, refreshChats]);

  useEffect(() => {
    refreshTrips();
  }, [refreshTrips]);

  useEffect(() => {
    if (user) {
      refreshReservations();
      refreshNotifications();
      refreshChats();
    } else {
      setReservations([]);
      setNotifications([]);
      setChats([]);
    }
  }, [user, refreshReservations, refreshNotifications, refreshChats]);

  // Polling for updates while logged in
  useEffect(() => {
    if (!user) return undefined;
    pollRef.current = setInterval(() => {
      refreshTrips();
      refreshReservations();
      refreshNotifications();
      refreshChats();
    }, POLL_MS);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [user, refreshTrips, refreshReservations, refreshNotifications, refreshChats]);

  const publishTrip = async (_driver, form) => {
    try {
      const payload = {
        origin: form.origin, destination: form.destination,
        date: form.date, time: form.time,
        seats_total: Number(form.seatsTotal),
        price: Number(form.price),
        pet_friendly: !!form.petFriendly, home_pickup: !!form.homePickup,
      };
      const { data } = await api.post('/trips', payload);
      await refreshTrips();
      return { ok: true, trip: data };
    } catch (e) {
      return { ok: false, message: apiError(e) };
    }
  };

  const reserveSeat = async (tripId) => {
    try {
      const { data } = await api.post('/reservations', { trip_id: tripId });
      await Promise.all([refreshTrips(), refreshReservations(), refreshChats(), refreshNotifications()]);
      return { ok: true, chatId: data.chat_id, reservation: data.reservation };
    } catch (e) {
      return { ok: false, message: apiError(e) };
    }
  };

  const cancelReservation = async (reservationId) => {
    try {
      await api.post(`/reservations/${reservationId}/cancel`);
      await Promise.all([refreshTrips(), refreshReservations()]);
    } catch (e) { /* ignore */ }
  };

  const completeReservation = async (reservationId) => {
    try {
      await api.post(`/reservations/${reservationId}/complete`);
      await refreshReservations();
    } catch (e) { /* ignore */ }
  };

  const rateReservation = async (reservationId, score, comment) => {
    try {
      await api.post(`/reservations/${reservationId}/rate`, { score, comment });
      await Promise.all([refreshReservations(), refreshTrips()]);
      return { ok: true };
    } catch (e) {
      return { ok: false, message: apiError(e) };
    }
  };

  const updateTrip = async (tripId, changes) => {
    try {
      const payload = {};
      if (changes.date !== undefined) payload.date = changes.date;
      if (changes.time !== undefined) payload.time = changes.time;
      if (changes.price !== undefined) payload.price = Number(changes.price);
      const { data } = await api.patch(`/trips/${tripId}`, payload);
      await refreshTrips();
      return { ok: true, trip: data.trip, notified: data.notified };
    } catch (e) {
      return { ok: false, message: apiError(e) };
    }
  };

  const cancelTrip = async (tripId, reason) => {
    try {
      const { data } = await api.post(`/trips/${tripId}/cancel`, { reason });
      await Promise.all([refreshTrips(), refreshReservations()]);
      return { ok: true, notified: data.notified };
    } catch (e) {
      return { ok: false, message: apiError(e) };
    }
  };

  const ensureChatWith = async (otherUserId, initialMessage) => {
    try {
      const { data } = await api.post('/chats/ensure', { other_user_id: otherUserId, initial_message: initialMessage });
      await refreshChats();
      return data.chat_id;
    } catch (e) {
      return null;
    }
  };

  const sendMessage = async (chatId, text) => {
    try {
      await api.post('/chats/message', { chat_id: chatId, text });
      await refreshChats();
      return { ok: true };
    } catch (e) {
      return { ok: false, message: apiError(e) };
    }
  };

  const markChatRead = async (chatId) => {
    try {
      await api.post(`/chats/${chatId}/read`);
      await refreshChats();
    } catch (e) { /* ignore */ }
  };

  const getNotificationsFor = () => notifications;
  const markAllNotificationsRead = async () => {
    try {
      await api.post('/notifications/read');
      await refreshNotifications();
    } catch (e) { /* ignore */ }
  };
  const clearNotifications = async () => {
    try {
      await api.delete('/notifications');
      await refreshNotifications();
    } catch (e) { /* ignore */ }
  };

  return (
    <TripsContext.Provider
      value={{
        trips, reservations, notifications, chats,
        publishTrip, reserveSeat, cancelReservation, completeReservation, rateReservation,
        updateTrip, cancelTrip,
        ensureChatWith, sendMessage, markChatRead,
        getNotificationsFor, markAllNotificationsRead, clearNotifications,
        refreshTrips, refreshAll, refreshReservations, refreshChats, refreshNotifications,
      }}
    >
      {children}
    </TripsContext.Provider>
  );
};

export const useTrips = () => {
  const ctx = useContext(TripsContext);
  if (!ctx) throw new Error('useTrips must be used within TripsProvider');
  return ctx;
};
