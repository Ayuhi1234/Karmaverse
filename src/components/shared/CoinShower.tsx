import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing, StyleSheet, Dimensions } from 'react-native';
import { KarmaCoin } from './KarmaCoin';

const COIN_COUNT = 22;
const FALL_DISTANCE = 460;
const { width: SCREEN_W } = Dimensions.get('window');

// Confetti's coin-shaped cousin — used to celebrate a section scrolling into
// view (e.g. Featured Rewards) rather than a one-off event like launch day.
export function CoinShower({ onDone }: { onDone?: () => void }) {
  const pieces = useRef(
    Array.from({ length: COIN_COUNT }, () => ({
      x: Math.random() * SCREEN_W,
      driftX: (Math.random() - 0.5) * 100,
      spin: 180 + Math.random() * 360,
      delay: Math.random() * 400,
      duration: 1600 + Math.random() * 900,
      size: 14 + Math.random() * 14,
      anim: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    const animations = pieces.map((p) =>
      Animated.timing(p.anim, {
        toValue: 1,
        duration: p.duration,
        delay: p.delay,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      })
    );
    Animated.stagger(20, animations).start(() => onDone?.());
  }, []);

  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
      {pieces.map((p, i) => {
        const translateY = p.anim.interpolate({ inputRange: [0, 1], outputRange: [-30, FALL_DISTANCE] });
        const translateX = p.anim.interpolate({ inputRange: [0, 1], outputRange: [0, p.driftX] });
        const rotate = p.anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.spin}deg`] });
        const opacity = p.anim.interpolate({ inputRange: [0, 0.85, 1], outputRange: [1, 1, 0] });
        return (
          <Animated.View
            key={i}
            style={{ position: 'absolute', left: p.x, top: 0, opacity, transform: [{ translateY }, { translateX }, { rotate }] }}
          >
            <KarmaCoin size={p.size} />
          </Animated.View>
        );
      })}
    </View>
  );
}
