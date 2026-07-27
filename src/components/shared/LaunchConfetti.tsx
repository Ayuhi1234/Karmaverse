import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing, StyleSheet, Dimensions } from 'react-native';

const COLORS = ['#f59e0b', '#ec4899', '#8b5cf6', '#22c55e', '#38bdf8', '#facc15'];
const PIECE_COUNT = 90;
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

export function LaunchConfetti({ onDone }: { onDone?: () => void }) {
  const pieces = useRef(
    Array.from({ length: PIECE_COUNT }, (_, i) => ({
      x: Math.random() * SCREEN_W,
      driftX: (Math.random() - 0.5) * 140,
      spin: 360 + Math.random() * 360,
      delay: Math.random() * 300,
      duration: 1800 + Math.random() * 900,
      color: COLORS[i % COLORS.length],
      width: 6 + Math.random() * 6,
      height: 10 + Math.random() * 8,
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
    Animated.stagger(15, animations).start(() => onDone?.());
  }, []);

  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
      {pieces.map((p, i) => {
        const translateY = p.anim.interpolate({ inputRange: [0, 1], outputRange: [-20, SCREEN_H * 0.65] });
        const translateX = p.anim.interpolate({ inputRange: [0, 1], outputRange: [0, p.driftX] });
        const rotate = p.anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.spin}deg`] });
        const opacity = p.anim.interpolate({ inputRange: [0, 0.85, 1], outputRange: [1, 1, 0] });
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              left: p.x,
              top: 0,
              width: p.width,
              height: p.height,
              backgroundColor: p.color,
              borderRadius: 2,
              opacity,
              transform: [{ translateY }, { translateX }, { rotate }],
            }}
          />
        );
      })}
    </View>
  );
}
