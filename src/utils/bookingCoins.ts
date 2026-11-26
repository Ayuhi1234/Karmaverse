import { isBlackFridayBooking } from './blackFriday';

// Coins to show for a booking: what was credited once it is completed, otherwise
// the estimate saved when it was booked (cancelled bookings keep their estimate).
// null when the booking has neither.
export function bookingCoins(booking: any): number | null {
  const positive = (v: unknown) => (typeof v === 'number' && v > 0 ? v : null);
  if (booking?.status === 'COMPLETED' && typeof booking.totalKarmaCoins === 'number') return booking.totalKarmaCoins;
  const est = positive(booking?.estimatedKarmaCoins) ?? positive(booking?.totalKarmaCoins);
  return est != null && isBoostedBooking(booking) ? est * 2 : est;
}

// Bookings made during Black Friday earn 2X. The backend adds the bonus when it credits the
// pickup, so only the estimate shown before then is doubled; credited and cancelled bookings
// show what they are.
export function isBoostedBooking(booking: any): boolean {
  const status = String(booking?.status || '').toUpperCase();
  if (status === 'COMPLETED' || status.startsWith('CANCEL')) return false;
  return isBlackFridayBooking(booking?.createdAt);
}

export const formatBookingCoins = (coins: number | null) =>
  coins == null ? '—' : `+${coins.toLocaleString('en-IN')}`;
