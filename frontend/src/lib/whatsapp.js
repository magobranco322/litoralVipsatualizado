// Utilities to build WhatsApp deep links (wa.me).

// Keep only digits, normalise Brazilian phone numbers to include country code 55.
export const normalizePhone = (phone) => {
  const digits = (phone || '').toString().replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('00')) return digits.slice(2);
  if (digits.startsWith('55')) return digits;
  // Assume Brazilian number if 10 or 11 digits (with area code)
  if (digits.length === 10 || digits.length === 11) return '55' + digits;
  return digits;
};

export const hasValidPhone = (phone) => normalizePhone(phone).length >= 12;

export const buildWhatsAppLink = (phone, message) => {
  const p = normalizePhone(phone);
  if (!p) return null;
  const text = encodeURIComponent((message || '').trim());
  return `https://wa.me/${p}${text ? `?text=${text}` : ''}`;
};

export const buildReservationMessage = ({ passengerName, driverName, origin, destination, date, time }) => {
  return (
    `Olá ${driverName || ''}!\n\n` +
    `Sou ${passengerName || 'um passageiro'} e acabei de reservar 1 vaga na sua viagem:\n\n` +
    `📍 ${origin} → ${destination}\n` +
    `🗓️ ${date} às ${time}\n\n` +
    `Confirmado pelo app *Motoristas VIP Litoral* 🚗`
  );
};

export const openWhatsApp = (phone, message) => {
  const link = buildWhatsAppLink(phone, message);
  if (!link) return false;
  try {
    window.open(link, '_blank', 'noopener,noreferrer');
    return true;
  } catch (e) {
    return false;
  }
};
