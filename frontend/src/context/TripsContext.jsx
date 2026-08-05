import React, { createContext, useContext, useEffect, useState } from 'react';
import { MOCK_TRIPS, MOCK_CHATS } from '../mock';

const TripsContext = createContext(null);

const STORAGE_TRIPS = 'bj_trips';
const STORAGE_RES = 'bj_reservations';
const STORAGE_CHATS = 'bj_chats';
const STORAGE_RATINGS = 'bj_ratings';
const STORAGE_NOTIFS = 'bj_notifications';

const read = (key, fallback) => {
  try {
    const s = localStorage.getItem(key);
    return s ? JSON.parse(s) : fallback;
  } catch (e) {
    return fallback;
  }
};

export const TripsProvider = ({ children }) => {
  const [trips, setTrips] = useState(() => read(STORAGE_TRIPS, MOCK_TRIPS));
  const [reservations, setReservations] = useState(() => read(STORAGE_RES, []));
  const [ratings, setRatings] = useState(() => read(STORAGE_RATINGS, {}));
  const [notifications, setNotifications] = useState(() => read(STORAGE_NOTIFS, []));

  useEffect(() => { localStorage.setItem(STORAGE_TRIPS, JSON.stringify(trips)); }, [trips]);
  useEffect(() => { localStorage.setItem(STORAGE_RES, JSON.stringify(reservations)); }, [reservations]);
  useEffect(() => { localStorage.setItem(STORAGE_RATINGS, JSON.stringify(ratings)); }, [ratings]);
  useEffect(() => { localStorage.setItem(STORAGE_NOTIFS, JSON.stringify(notifications)); }, [notifications]);

  const pushNotification = (userId, type, message, tripId) => {
    if (!userId) return;
    const notif = {
      id: 'n_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      userId, type, message, tripId,
      at: new Date().toISOString(),
      read: false,
    };
    setNotifications((prev) => [notif, ...prev]);
  };

  const getNotificationsFor = (userId) =>
    notifications.filter((n) => n.userId === userId).sort((a, b) => (a.at < b.at ? 1 : -1));

  const markAllNotificationsRead = (userId) => {
    setNotifications((prev) => prev.map((n) => (n.userId === userId ? { ...n, read: true } : n)));
  };

  const clearNotifications = (userId) => {
    setNotifications((prev) => prev.filter((n) => n.userId !== userId));
  };

  const publishTrip = (driver, form) => {
    const newTrip = {
      id: 't_' + Date.now(),
      driverId: driver.id,
      driverName: driver.name,
      driverAvatar: driver.avatar,
      rating: driver.rating || 0,
      driverTrips: driver.trips || 0,
      origin: form.origin,
      destination: form.destination,
      date: form.date,
      time: form.time,
      seatsTotal: Number(form.seatsTotal),
      seatsFilled: 0,
      price: Number(form.price),
      petFriendly: !!form.petFriendly,
      homePickup: !!form.homePickup,
      status: 'ativa',
    };
    setTrips((prev) => [newTrip, ...prev]);
    return newTrip;
  };

  const ensureChatWith = (currentUser, otherUser, initialText) => {
    const chats = read(STORAGE_CHATS, MOCK_CHATS);
    const found = chats.find(
      (c) => c.participants && c.participants.includes(currentUser.id) && c.otherUserId === otherUser.id
    );
    if (found) return found.id;

    const chatId = 'c_' + Date.now();
    const newChat = {
      id: chatId,
      participants: [currentUser.id, otherUser.id],
      otherUserId: otherUser.id,
      otherUserName: otherUser.name,
      otherUserAvatar: otherUser.avatar,
      lastMessage: initialText || 'Olá! Reservei uma vaga na sua viagem.',
      lastTime: 'agora',
      unread: 0,
      messages: [
        {
          id: 'm_' + Date.now(),
          senderId: currentUser.id,
          text: initialText || 'Olá! Reservei uma vaga na sua viagem.',
          time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        },
      ],
    };
    localStorage.setItem(STORAGE_CHATS, JSON.stringify([newChat, ...chats]));
    return chatId;
  };

  const reserveSeat = (tripId, passenger, allUsers) => {
    const trip = trips.find((t) => t.id === tripId);
    if (!trip) return { ok: false, message: 'Viagem não encontrada' };
    if (trip.seatsFilled >= trip.seatsTotal) return { ok: false, message: 'Sem vagas disponíveis' };
    if (trip.driverId === passenger.id) return { ok: false, message: 'Você não pode reservar sua própria viagem' };
    if (reservations.some((r) => r.tripId === tripId && r.passengerId === passenger.id && r.status !== 'cancelada')) {
      return { ok: false, message: 'Você já tem reserva nesta viagem' };
    }

    setTrips((prev) => prev.map((t) => (t.id === tripId ? { ...t, seatsFilled: t.seatsFilled + 1 } : t)));

    const newRes = {
      id: 'r_' + Date.now(),
      tripId,
      passengerId: passenger.id,
      driverId: trip.driverId,
      status: 'confirmada',
      createdAt: new Date().toISOString(),
    };
    setReservations((prev) => [newRes, ...prev]);

    const driver = (allUsers || []).find((u) => u.id === trip.driverId) || {
      id: trip.driverId,
      name: trip.driverName,
      avatar: trip.driverAvatar,
    };
    const chatId = ensureChatWith(
      passenger,
      driver,
      `Olá! Acabei de reservar 1 vaga na viagem ${trip.origin} → ${trip.destination} (${trip.date} · ${trip.time}).`
    );

    pushNotification(
      trip.driverId,
      'reserva',
      `${passenger.name} reservou 1 vaga em ${trip.origin} → ${trip.destination}.`,
      trip.id
    );

    return { ok: true, chatId, reservation: newRes };
  };

  const updateTrip = (tripId, changes) => {
    const trip = trips.find((t) => t.id === tripId);
    if (!trip) return { ok: false, message: 'Viagem não encontrada' };
    const updated = { ...trip, ...changes };
    setTrips((prev) => prev.map((t) => (t.id === tripId ? updated : t)));

    const affected = reservations.filter((r) => r.tripId === tripId && r.status === 'confirmada');
    const parts = [];
    if (changes.time && changes.time !== trip.time) parts.push(`novo horário ${changes.time}`);
    if (changes.date && changes.date !== trip.date) parts.push(`nova data ${changes.date}`);
    if (changes.price !== undefined && Number(changes.price) !== trip.price) parts.push(`novo preço R$ ${changes.price}`);
    const msg = parts.length
      ? `Viagem ${trip.origin} → ${trip.destination} foi atualizada: ${parts.join(', ')}.`
      : `Viagem ${trip.origin} → ${trip.destination} foi atualizada.`;
    affected.forEach((r) => pushNotification(r.passengerId, 'alteracao', msg, tripId));

    return { ok: true, trip: updated, notified: affected.length };
  };

  const cancelTrip = (tripId, reason) => {
    const trip = trips.find((t) => t.id === tripId);
    if (!trip) return { ok: false, message: 'Viagem não encontrada' };
    setTrips((prev) => prev.map((t) => (t.id === tripId ? { ...t, status: 'cancelada', seatsFilled: 0 } : t)));

    const affected = reservations.filter((r) => r.tripId === tripId && r.status === 'confirmada');
    setReservations((prev) => prev.map((r) => (r.tripId === tripId && r.status === 'confirmada' ? { ...r, status: 'cancelada' } : r)));
    const msg = `Viagem ${trip.origin} → ${trip.destination} foi cancelada pelo motorista${reason ? `. Motivo: ${reason}` : '.'}`;
    affected.forEach((r) => pushNotification(r.passengerId, 'cancelamento', msg, tripId));

    return { ok: true, notified: affected.length };
  };

  const cancelReservation = (reservationId) => {
    const res = reservations.find((r) => r.id === reservationId);
    if (!res || res.status === 'cancelada') return;
    setReservations((prev) => prev.map((r) => (r.id === reservationId ? { ...r, status: 'cancelada' } : r)));
    setTrips((prev) => prev.map((t) => (t.id === res.tripId ? { ...t, seatsFilled: Math.max(0, t.seatsFilled - 1) } : t)));
    const trip = trips.find((t) => t.id === res.tripId);
    if (trip) {
      pushNotification(
        trip.driverId,
        'cancelamento',
        `Um passageiro cancelou a reserva em ${trip.origin} → ${trip.destination}.`,
        trip.id
      );
    }
  };

  const completeReservation = (reservationId) => {
    setReservations((prev) => prev.map((r) => (r.id === reservationId ? { ...r, status: 'concluida' } : r)));
  };

  const rateReservation = (reservationId, score, comment, updateUser) => {
    const res = reservations.find((r) => r.id === reservationId);
    if (!res) return;
    const driverId = res.driverId;
    const prevList = ratings[driverId] || [];
    const newList = [...prevList, { score: Number(score), comment, at: new Date().toISOString(), reservationId }];
    const nextRatings = { ...ratings, [driverId]: newList };
    setRatings(nextRatings);

    const avg = newList.reduce((s, x) => s + x.score, 0) / newList.length;
    setTrips((prev) =>
      prev.map((t) => (t.driverId === driverId ? { ...t, rating: Number(avg.toFixed(1)), driverTrips: (t.driverTrips || 0) } : t))
    );
    if (typeof updateUser === 'function') {
      updateUser(driverId, { rating: Number(avg.toFixed(1)), trips: (newList.length) });
    }

    setReservations((prev) =>
      prev.map((r) => (r.id === reservationId ? { ...r, status: 'concluida', ratingGiven: true, ratingScore: score, ratingComment: comment } : r))
    );
  };

  const getRatings = (driverId) => ratings[driverId] || [];

  return (
    <TripsContext.Provider
      value={{
        trips, reservations, notifications,
        publishTrip, reserveSeat, cancelReservation, completeReservation, rateReservation,
        updateTrip, cancelTrip,
        ensureChatWith, getRatings,
        pushNotification, getNotificationsFor, markAllNotificationsRead, clearNotifications,
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
