import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { getToken } from '../utils/tokenStore';
import { addNotificationResponseListener, getLastNotificationResponse, markNotificationOpened } from '../utils/notifications';
import { SplashScreen } from '../screens/SplashScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { SchedulePickupScreen } from '../screens/SchedulePickupScreen';
import { KnowledgeHubScreen } from '../screens/KnowledgeHubScreen';
import { ArticleDetailScreen } from '../screens/ArticleDetailScreen';
import { QuizScreen } from '../screens/QuizScreen';
import { ReferralScreen } from '../screens/ReferralScreen';
import { OrderTrackingScreen } from '../screens/OrderTrackingScreen';
import { BookingDetailsScreen } from '../screens/BookingDetailsScreen';
import { LegalScreen } from '../screens/LegalScreen';
import { RedeemScreen } from '../screens/RedeemScreen';
import { RedeemHistoryScreen } from '../screens/RedeemHistoryScreen';
import { DonationScreen } from '../screens/DonationScreen';
import { TransferScreen } from '../screens/TransferScreen';
import { AboutUsScreen } from '../screens/AboutUsScreen';
import { FeedbackScreen } from '../screens/FeedbackScreen';
import { UnsubscribeScreen } from '../screens/UnsubscribeScreen';
import { EmailPreferencesScreen } from '../screens/EmailPreferencesScreen';
import { NotFoundScreen } from '../screens/NotFoundScreen';
import { TabNavigator } from './TabNavigator';
import { navigationRef } from './navRef';
import { capturePendingDeepLink, clearPendingDeepLink, hasPendingDeepLink, hasPendingReferral } from '../utils/deepLink';

// Runs at import, before the NavigationContainer resolves the URL — remembers a
// protected deep link (e.g. an email "Track pickup" link) opened while logged out,
// so we can return the user to it after they log in.
capturePendingDeepLink();

const Stack = createNativeStackNavigator();

// GA4 tracking (web only) — gtag.js is loaded in public/index.html with
// send_page_view disabled, so every screen change (not just the first load) is
// reported here as its own page_view, using the React Navigation route name.
function trackPageView(routeName: string | undefined) {
  if (Platform.OS !== 'web' || !routeName || typeof window === 'undefined') return;
  const gtag = (window as any).gtag;
  if (typeof gtag !== 'function') return;
  gtag('event', 'page_view', {
    page_title: routeName,
    page_path: `/${routeName}`,
    page_location: window.location.href,
  });
}

function AuthLoadingScreen() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#16a34a" />
    </View>
  );
}

export function RootNavigator() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const navRef = navigationRef;
  const routeNameRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const token = await getToken();
        const isValid = !!token && token !== 'undefined' && token !== 'null';
        // Already logged in — the router resolves the deep link directly, so drop
        // any captured URL to avoid a stale redirect on a later in-session login.
        if (isValid) clearPendingDeepLink();
        setIsLoggedIn(isValid);
      } catch (error) {
        console.error('Auth check failed:', error);
        setIsLoggedIn(false);
      }
    };
    checkAuthStatus();
  }, []);

  useEffect(() => {
    // A plain body tap arrives as the DEFAULT action; action buttons send their own id.
    const DEFAULT_ACTION = 'expo.modules.notifications.actions.DEFAULT';

    const routeNotification = (data: any, actionIdentifier?: string) => {
      // Report the open for EVERY tapped push (not just booking ones), before any
      // navigation guard. Fire-and-forget — never await, never block navigation.
      if (data?.notificationId) markNotificationOpened(data.notificationId);

      const nav = navRef.current;
      if (!nav) return;
      const bookingId = data?.bookingId;
      const booking = bookingId ? { _id: bookingId } : undefined;

      // Marketing / engagement pushes name a target in `data.screen`; map it to the
      // right tab or stack route, ignoring anything not on the whitelist.
      const TAB_SCREENS = ['Dashboard', 'Orders', 'Wallet', 'Store'];
      const STACK_SCREENS = ['Quiz', 'Redeem', 'RedeemHistory', 'Referral', 'SchedulePickup', 'KnowledgeHub', 'Donation', 'Transfer', 'AboutUs', 'Profile'];
      const goToScreen = (screen?: string): boolean => {
        if (!screen) return false;
        if (TAB_SCREENS.includes(screen)) { (nav as any).navigate('App', { screen }); return true; }
        if (STACK_SCREENS.includes(screen)) { (nav as any).navigate(screen); return true; }
        return false;
      };

      // An action button was tapped — route by the button, not the default target.
      if (actionIdentifier && actionIdentifier !== DEFAULT_ACTION) {
        switch (actionIdentifier) {
          case 'track':
            if (booking) nav.navigate('OrderTracking', { booking });
            return;
          case 'rate':
          case 'view':
            if (booking) nav.navigate('BookingDetails', { booking });
            return;
          case 'orders':
            nav.navigate('App', { screen: 'Orders' });
            return;
          case 'open_quiz': nav.navigate('Quiz'); return;
          case 'open_redeem': nav.navigate('Redeem'); return;
          case 'open_pickup': nav.navigate('SchedulePickup'); return;
          case 'open_referral': nav.navigate('Referral'); return;
          case 'open':
            if (goToScreen(data?.screen)) return;
            break;
        }
      }

      // Plain tap — route by the event type. In-progress states open live tracking,
      // a completed pickup opens its details, a cancellation opens the orders list.
      switch (data?.type) {
        case 'BOOKING_ACCEPTED':
        case 'AGENT_REACHED':
        case 'BOOKING_PICKED_UP':
        case 'BOOKING_IN_POOL':
          if (booking) { nav.navigate('OrderTracking', { booking }); return; }
          break;
        case 'BOOKING_COMPLETED':
          if (booking) { nav.navigate('BookingDetails', { booking }); return; }
          break;
        case 'BOOKING_CANCEL_SUCCESS':
          nav.navigate('App', { screen: 'Orders' });
          return;
      }

      // Non-transactional (marketing / engagement) push — route by the named screen.
      if (goToScreen(data?.screen)) return;

      // Fallback: any booking-linked push with no/unknown type → booking details.
      if (booking) nav.navigate('BookingDetails', { booking });
    };

    getLastNotificationResponse().then(res => {
      if (res) routeNotification(res.data, res.actionIdentifier);
    });

    const sub = addNotificationResponseListener(routeNotification);
    return () => sub.remove();
  }, []);

  // Web-only URL routing for the public pages — gives them real, shareable, crawlable
  // URLs. Deliberately excludes the `karmacoin://` scheme so the existing manual
  // referral-code deep-link handling in App.tsx (native) is unaffected. The root path
  // ('') must map to whichever screen `initialRouteName` would otherwise pick, or a
  // logged-in user visiting '/' would get bounced to the Splash marketing screen.
  // Every authenticated screen needs an entry here or a cold load / refresh of its
  // URL fails to match and React Navigation falls back to the initial route
  // (Dashboard) — that was KV-016. Tab screens are nested under App; the rest are
  // top-level stack routes. Paths match the route names so the URLs the nav already
  // generates (/Wallet, /Quiz, …) round-trip on refresh, bookmarks and shared links.
  const linking = useMemo(() => ({
    prefixes: Platform.OS === 'web' && typeof window !== 'undefined' ? [window.location.origin] : [],
    config: {
      screens: isLoggedIn
        ? {
            App: {
              path: '',
              screens: {
                Dashboard: 'Dashboard',
                Orders: 'Orders',
                Wallet: 'Wallet',
                Store: 'Store',
              },
            },
            Login: 'login',
            Legal: 'legal/:type',
            Profile: 'Profile',
            SchedulePickup: 'SchedulePickup',
            KnowledgeHub: 'KnowledgeHub',
            ArticleDetail: 'ArticleDetail',
            Quiz: 'Quiz',
            Referral: 'Referral',
            OrderTracking: 'OrderTracking',
            BookingDetails: 'BookingDetails',
            Redeem: 'Redeem',
            RedeemHistory: 'RedeemHistory',
            Donation: 'Donation',
            Transfer: 'Transfer',
            AboutUs: 'AboutUs',
            Feedback: 'feedback',
            Unsubscribe: 'unsubscribe',
            EmailPreferences: 'preferences',
            NotFound: '*',
          }
        : {
            Splash: '', Login: 'login', Legal: 'legal/:type', AboutUs: 'AboutUs',
            // Public, token-based mailer destinations — openable while logged out.
            Feedback: 'feedback', Unsubscribe: 'unsubscribe', EmailPreferences: 'preferences',
            NotFound: '*',
          },
    },
  }), [isLoggedIn]);

  if (isLoggedIn === null) {
    return <AuthLoadingScreen />;
  }

  return (
    <NavigationContainer
      ref={navRef}
      linking={linking}
      documentTitle={{ enabled: false }}
      onReady={() => {
        // A logged-out user who opened a protected email/share link, or a referral
        // link (?ref=), resolves to NotFound (those paths aren't in the logged-out
        // link map). Send them to Login instead — after login, consumePendingDeepLink
        // returns them to a protected link, and the signup form reads the captured
        // referral code.
        if (!isLoggedIn && (hasPendingDeepLink() || hasPendingReferral())) {
          navRef.current?.reset({ index: 0, routes: [{ name: 'Login' }] });
        }
        routeNameRef.current = navRef.current?.getCurrentRoute()?.name;
        trackPageView(routeNameRef.current);
      }}
      onStateChange={() => {
        const previousRouteName = routeNameRef.current;
        const currentRouteName = navRef.current?.getCurrentRoute()?.name;
        if (currentRouteName && currentRouteName !== previousRouteName) {
          trackPageView(currentRouteName);
        }
        routeNameRef.current = currentRouteName;
      }}
    >
      <Stack.Navigator
        screenOptions={{ headerShown: false }}
        initialRouteName={isLoggedIn ? 'App' : 'Splash'}
      >
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="App" component={TabNavigator} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="SchedulePickup" component={SchedulePickupScreen} />
        <Stack.Screen name="KnowledgeHub" component={KnowledgeHubScreen} />
        <Stack.Screen name="ArticleDetail" component={ArticleDetailScreen} />
        <Stack.Screen name="Quiz" component={QuizScreen} />
        <Stack.Screen name="Referral" component={ReferralScreen} />
        <Stack.Screen name="OrderTracking" component={OrderTrackingScreen} />
        <Stack.Screen name="BookingDetails" component={BookingDetailsScreen} />
        <Stack.Screen name="Legal" component={LegalScreen} />
        <Stack.Screen name="Redeem" component={RedeemScreen} />
        <Stack.Screen name="RedeemHistory" component={RedeemHistoryScreen} />
        <Stack.Screen name="Donation" component={DonationScreen} />
        <Stack.Screen name="Transfer" component={TransferScreen} />
        <Stack.Screen name="AboutUs" component={AboutUsScreen} />
        <Stack.Screen name="Feedback" component={FeedbackScreen} />
        <Stack.Screen name="Unsubscribe" component={UnsubscribeScreen} />
        <Stack.Screen name="EmailPreferences" component={EmailPreferencesScreen} />
        <Stack.Screen name="NotFound" component={NotFoundScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#064e3b',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
