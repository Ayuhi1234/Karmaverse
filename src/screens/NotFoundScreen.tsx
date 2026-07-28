import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Compass, Home } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function NotFoundScreen({ navigation }: any) {
  const goHome = async () => {
    // Reset (not navigate) so the dead URL doesn't linger in the back stack. Send
    // logged-in users to the app home, guests to the landing page.
    const token = await AsyncStorage.getItem('userToken');
    navigation.reset({ index: 0, routes: [{ name: token ? 'App' : 'Splash' }] });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#064e3b" />
      <LinearGradient colors={['#064e3b', '#15803d']} style={StyleSheet.absoluteFillObject} />
      <View style={styles.content}>
        <View style={styles.iconBg}>
          <Compass size={44} color="#4ade80" />
        </View>
        <Text style={styles.code}>404</Text>
        <Text style={styles.title}>Page not found</Text>
        <Text style={styles.sub}>
          The page you're looking for doesn't exist or may have moved. Let's get you back on track.
        </Text>
        <TouchableOpacity style={styles.btn} onPress={goHome} activeOpacity={0.85}>
          <Home size={18} color="#052e16" />
          <Text style={styles.btnText}>Back to home</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, maxWidth: 520, width: '100%', alignSelf: 'center' },
  iconBg: { width: 88, height: 88, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  code: { color: 'white', fontSize: 56, fontWeight: '900', letterSpacing: 2 },
  title: { color: 'white', fontSize: 24, fontWeight: '900', marginTop: 6, marginBottom: 10 },
  sub: { color: 'rgba(255,255,255,0.75)', fontSize: 14, fontWeight: '500', textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#4ade80', borderRadius: 16, paddingVertical: 15, paddingHorizontal: 32 },
  btnText: { color: '#052e16', fontSize: 15, fontWeight: '900' },
});
