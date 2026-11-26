import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Easing, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { KarmaCoin } from '../shared/KarmaCoin';
import { bfAccent } from '../../utils/blackFriday';

const PIECE_COUNT = 44;

function TwoXCoin({ size }: { size: number }) {
  return (
    <LinearGradient
      colors={['#fff1b8', '#f5c542', '#c9961a']}
      start={{ x: 0.15, y: 0.1 }}
      end={{ x: 0.85, y: 0.95 }}
      style={[s.coin, { width: size, height: size, borderRadius: size / 2 }]}
    >
      <View style={[s.ring, { width: size * 0.78, height: size * 0.78, borderRadius: size * 0.39 }]}>
        <Text style={[s.coinText, { fontSize: size * 0.36, lineHeight: size * 0.42 }]}>2X</Text>
      </View>
    </LinearGradient>
  );
}

// Black Friday / Cyber Monday stand-in for the rainbow confetti: gold KarmaCoins and
// gold "2X" coins fall after a soft flash in the festival accent.
export function BFCoinRain({ onDone }: { onDone?: () => void }) {
  const { width: W, height: H } = Dimensions.get('window');
  const flash = useRef(new Animated.Value(0)).current;
  const pieces = useRef(
    Array.from({ length: PIECE_COUNT }, (_, i) => ({
      x: Math.random() * W,
      driftX: (Math.random() - 0.5) * 120,
      flip: 1 + Math.floor(Math.random() * 3),
      tilt: (Math.random() - 0.5) * 50,
      delay: Math.random() * 600,
      duration: 1900 + Math.random() * 1000,
      size: 20 + Math.random() * 18,
      twoX: i % 4 !== 0,
      anim: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(flash, { toValue: 1, duration: 260, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(flash, { toValue: 0, duration: 900, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]).start();
    const falls = pieces.map((p) =>
      Animated.timing(p.anim, {
        toValue: 1,
        duration: p.duration,
        delay: p.delay,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      })
    );
    Animated.parallel(falls).start(() => onDone?.());
  }, []);

  const accent = bfAccent();

  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none', overflow: 'hidden' }]}>
      <Animated.View style={[s.flash, { opacity: flash }]}>
        <LinearGradient colors={[`${accent}66`, `${accent}00`]} style={StyleSheet.absoluteFill} />
      </Animated.View>
      {pieces.map((p, i) => {
        const translateY = p.anim.interpolate({ inputRange: [0, 1], outputRange: [-p.size - 10, H * 0.8] });
        const translateX = p.anim.interpolate({ inputRange: [0, 1], outputRange: [0, p.driftX] });
        const steps = p.flip * 4;
        const scaleX = p.anim.interpolate({
          inputRange: Array.from({ length: steps + 1 }, (_, k) => k / steps),
          outputRange: Array.from({ length: steps + 1 }, (_, k) => (k % 2 ? 0.2 : 1)),
        });
        const opacity = p.anim.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] });
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              left: p.x,
              top: 0,
              opacity,
              transform: [{ translateY }, { translateX }, { rotate: `${p.tilt}deg` }, { scaleX }],
            }}
          >
            {p.twoX ? <TwoXCoin size={p.size} /> : <KarmaCoin size={p.size} />}
          </Animated.View>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  flash: { position: 'absolute', top: 0, left: 0, right: 0, height: 280 },
  coin: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#9a7314',
    boxShadow: '0 2px 6px rgba(0,0,0,0.35)',
  },
  ring: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(122, 88, 8, 0.55)' },
  coinText: { color: '#1a1300', fontWeight: '900', letterSpacing: -0.5 },
});
