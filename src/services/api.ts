import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { navigationRef } from '../navigation/navRef';

// Backend base URL. Defaults to PRODUCTION so the web/site build (Netlify) and the
// production APK always hit production. QA/preview APK builds override this via the
// EXPO_PUBLIC_API_URL env set in eas.json's `preview` profile (points to testing,
// where in-progress features like the streak two-wallet system are deployed first).
export const BACKEND_BASE =
  process.env.EXPO_PUBLIC_API_URL || 'https://karmacoin-backend-productionn.onrender.com';
const BASE_URL = BACKEND_BASE;

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 60000, // 60 seconds timeout to allow Render free tier to wake up
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auth endpoints must behave exactly like Postman: no stale Authorization header
// on the way in, and a 401 (e.g. wrong password) must NOT wipe stored state.
// A leftover token being sent to /auth/login was making the backend reject an
// otherwise-valid login that worked fine in Postman.
const isAuthEndpoint = (url?: string) => {
  if (!url) return false;
  return [
    '/auth/login',
    '/auth/register',
    '/auth/check-user',
    '/auth/send-otp',
    '/auth/verify-otp',
    '/auth/google-login',
    '/auth/facebook-login',
    '/auth/reset-password',
  ].some((e) => url.includes(e));
};

// Add a request interceptor to automatically add the JWT token to headers
api.interceptors.request.use(
  async (config) => {
    if (!isAuthEndpoint(config.url)) {
      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle errors globally (e.g., token expiry)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401 && !isAuthEndpoint(error.config?.url)) {
      // Token expired or invalid on a protected route — clear it and send the
      // user back to Login so they re-authenticate (e.g. a stale token from a
      // previous backend). Without this the app sits in a broken logged-in state.
      await AsyncStorage.removeItem('userToken');
      try {
        const current = navigationRef.current?.getCurrentRoute?.()?.name;
        if (navigationRef.current && current && !['Login', 'Splash'].includes(current)) {
          navigationRef.current.reset({ index: 0, routes: [{ name: 'Login' }] });
        }
      } catch (_) { /* navigator not ready */ }
    }
    return Promise.reject(error);
  }
);

export default api;
