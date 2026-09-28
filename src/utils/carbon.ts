import { Bus, Zap, Utensils, Recycle, Droplets, Plane, Bike, Leaf } from 'lucide-react-native';
import { showAlert } from './alert';
import { CarbonApiNotReadyError, CarbonCategoryKey, LoggableActivity } from '../services/carbon';

type Icon = typeof Leaf;

// Display config for the six assessment categories — icon colours reuse the
// tile palette already used on Wallet and Profile. Question copy is content only;
// no carbon values or formulas live in the app.
export const CARBON_CATEGORIES: Record<CarbonCategoryKey, {
  label: string; Icon: Icon; color: string; bg: string;
  question: string; support: string; placeholder: string; tip: { title: string; body: string };
}> = {
  transport: {
    label: 'Transport', Icon: Bus, color: '#0ea5e9', bg: '#f0f9ff',
    question: 'How do you usually travel to work or college, and roughly how far each day?',
    support: 'Mention your vehicle and fuel if you know it. Rough distances are fine.',
    placeholder: 'e.g. I travel around 15 km daily on my petrol bike.',
    tip: { title: 'Transport is your biggest source', body: 'Try the metro or bus twice this week, then log it here.' },
  },
  electricity: {
    label: 'Electricity', Icon: Zap, color: '#d97706', bg: '#fffbeb',
    question: 'How much electricity does your home use in a month?',
    support: 'Your bill amount or the units on your bill both work.',
    placeholder: 'e.g. Our bill is around ₹1,800 a month, roughly 220 units.',
    tip: { title: 'Electricity is your biggest source', body: 'Set the AC to 24 °C or higher and switch appliances off at the plug.' },
  },
  diet: {
    label: 'Diet', Icon: Utensils, color: '#e11d48', bg: '#fff1f2',
    question: 'What does a typical week of meals look like for you?',
    support: 'Tell us what you usually eat — veg, non-veg, eggs, dairy — and how often.',
    placeholder: 'e.g. Mostly vegetarian. Chicken twice a week, milk and curd every day.',
    tip: { title: 'Diet is your biggest source', body: 'Add one more plant-based day to your week.' },
  },
  waste: {
    label: 'Waste', Icon: Recycle, color: '#16a34a', bg: '#f0fdf4',
    question: 'How much waste does your home throw out, and do you segregate or recycle any of it?',
    support: 'For example: one small bin a day, wet and dry waste separated.',
    placeholder: 'e.g. About one small bin a day. We give plastic to the kabadiwala.',
    tip: { title: 'Waste is your biggest source', body: 'Schedule a KarmaVerse pickup for your recyclables.' },
  },
  water: {
    label: 'Water', Icon: Droplets, color: '#0284c7', bg: '#f0f9ff',
    question: 'How do you use water at home on a typical day?',
    support: 'Baths or showers, washing machine, gardening — whatever comes to mind.',
    placeholder: 'e.g. One bucket bath a day, washing machine three times a week.',
    tip: { title: 'Water is your biggest source', body: 'Switch to a bucket bath and run full washing-machine loads.' },
  },
  flights: {
    label: 'Flights', Icon: Plane, color: '#7c3aed', bg: '#f3e8ff',
    question: 'How many flights have you taken in the last 12 months?',
    support: 'Rough routes help. "None" is a perfectly good answer.',
    placeholder: 'e.g. Two return trips, Delhi to Mumbai. No international flights.',
    tip: { title: 'Flights are your biggest source', body: 'Take the train for shorter trips when you can.' },
  },
};

export const LOG_OPTIONS: { type: LoggableActivity; title: string; meta: string; Icon: Icon; color: string; bg: string }[] = [
  { type: 'public_transport', title: 'Took public transport', meta: 'Metro, bus or shared auto instead of driving', Icon: Bus, color: '#0ea5e9', bg: '#f0f9ff' },
  { type: 'cycle_walk', title: 'Walked or cycled', meta: 'A short trip without a vehicle', Icon: Bike, color: '#16a34a', bg: '#f0fdf4' },
  { type: 'plant_based_meal', title: 'Had a plant-based meal', meta: 'Dal, sabzi, salad — no meat', Icon: Utensils, color: '#e11d48', bg: '#fff1f2' },
  { type: 'energy_saving', title: 'Saved energy at home', meta: 'AC at 24 °C+, lights and plugs off', Icon: Zap, color: '#d97706', bg: '#fffbeb' },
];

export function activityIcon(type: string): { Icon: Icon; color: string; bg: string } {
  if (type === 'pickup') return { Icon: Recycle, color: '#16a34a', bg: '#f0fdf4' };
  const o = LOG_OPTIONS.find((l) => l.type === type);
  return o ? { Icon: o.Icon, color: o.color, bg: o.bg } : { Icon: Leaf, color: '#16a34a', bg: '#f0fdf4' };
}

export const formatKg = (kg: number) => kg.toLocaleString(undefined, { maximumFractionDigits: 1 });

export const formatDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

// Same "Coming soon!" wording Profile uses for features that aren't live yet.
export function showCarbonError(title: string, error: any) {
  if (error instanceof CarbonApiNotReadyError) {
    showAlert('Coming soon!', "We're finishing carbon tracking — check back soon.");
    return;
  }
  showAlert(title, error?.response?.data?.message || 'Please try again.');
}
