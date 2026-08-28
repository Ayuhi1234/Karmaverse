import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, Pressable, Platform, View, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Truck, ArrowRight, Leaf } from 'lucide-react-native';

// The primary "Schedule a pickup" CTA on the dashboard. Gives an eco-themed,
// pseudo-3D treatment (raised gradient + shadow, a gently rolling truck, a
// trailing leaf, a soft shine sweep and a breathing pulse) using the core
// Animated API with eased curves so every motion feels smooth, not mechanical.
export function AnimatedPickupCta({ label, onPress }: { label: string; onPress: () => void }) {
  const native = Platform.OS !== 'web';
  const drive = useRef(new Animated.Value(0)).current;   // truck rolls forward + gentle bob
  const shine = useRef(new Animated.Value(0)).current;   // light band sweep
  const breathe = useRef(new Animated.Value(0)).current; // idle scale to draw the eye
  const press = useRef(new Animated.Value(0)).current;   // tactile press-in
  const leaf = useRef(new Animated.Value(0)).current;    // eco leaf puff trailing the truck

  useEffect(() => {
    const d = Animated.loop(Animated.sequence([
      Animated.timing(drive, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: native }),
      Animated.timing(drive, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: native }),
    ]));
    const s = Animated.loop(Animated.sequence([
      Animated.delay(1200),
      Animated.timing(shine, { toValue: 1, duration: 1300, easing: Easing.inOut(Easing.ease), useNativeDriver: native }),
      Animated.timing(shine, { toValue: 0, duration: 0, useNativeDriver: native }),
      Animated.delay(2000),
    ]));
    const b = Animated.loop(Animated.sequence([
      Animated.timing(breathe, { toValue: 1, duration: 1900, easing: Easing.inOut(Easing.sin), useNativeDriver: native }),
      Animated.timing(breathe, { toValue: 0, duration: 1900, easing: Easing.inOut(Easing.sin), useNativeDriver: native }),
    ]));
    const l = Animated.loop(Animated.sequence([
      Animated.delay(500),
      Animated.timing(leaf, { toValue: 1, duration: 1800, easing: Easing.out(Easing.quad), useNativeDriver: native }),
      Animated.timing(leaf, { toValue: 0, duration: 0, useNativeDriver: native }),
      Animated.delay(700),
    ]));
    d.start(); s.start(); b.start(); l.start();
    return () => { d.stop(); s.stop(); b.stop(); l.stop(); };
  }, []);

  const scale = Animated.multiply(
    breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.025] }),
    press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.955] }),
  );
  // Smooth continuous roll: forward drift with a soft up-down bob.
  const truckX = drive.interpolate({ inputRange: [0, 1], outputRange: [-2, 5] });
  const truckY = drive.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -1.5, 0] });
  const shineX = shine.interpolate({ inputRange: [0, 1], outputRange: [-160, 320] });
  const shineOpacity = shine.interpolate({ inputRange: [0, 0.15, 0.85, 1], outputRange: [0, 1, 1, 0] });
  const leafOpacity = leaf.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0, 0.85, 0] });
  const leafX = leaf.interpolate({ inputRange: [0, 1], outputRange: [0, -22] });
  const leafY = leaf.interpolate({ inputRange: [0, 1], outputRange: [0, -14] });
  const leafRotate = leaf.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-35deg'] });

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={() => Animated.timing(press, { toValue: 1, duration: 110, easing: Easing.out(Easing.quad), useNativeDriver: native }).start()}
        onPressOut={() => Animated.spring(press, { toValue: 0, friction: 5, tension: 90, useNativeDriver: native }).start()}
      >
        <LinearGradient
          colors={['#22c55e', '#16a34a', '#15803d']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={s.cta}
        >
          <View style={s.topHighlight} pointerEvents="none" />
          <Animated.View
            pointerEvents="none"
            style={[s.shine, { opacity: shineOpacity, transform: [{ translateX: shineX }, { rotate: '18deg' }] }]}
          />
          <Animated.View
            pointerEvents="none"
            style={{ position: 'absolute', left: 22, opacity: leafOpacity, transform: [{ translateX: leafX }, { translateY: leafY }, { rotate: leafRotate }] }}
          >
            <Leaf size={12} color="#bbf7d0" />
          </Animated.View>
          <Animated.View style={{ transform: [{ translateX: truckX }, { translateY: truckY }] }}>
            <Truck size={19} color="white" />
          </Animated.View>
          <Text style={s.text}>{label}</Text>
          <ArrowRight size={16} color="white" />
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
    paddingVertical: 15,
    overflow: 'hidden',
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 9,
  },
  topHighlight: { position: 'absolute', top: 0, left: 0, right: 0, height: '45%', backgroundColor: 'rgba(255,255,255,0.14)' },
  shine: { position: 'absolute', top: -24, bottom: -24, width: 55, backgroundColor: 'rgba(255,255,255,0.28)' },
  text: { color: 'white', fontSize: 14, fontWeight: '900', letterSpacing: 0.2 },
});
