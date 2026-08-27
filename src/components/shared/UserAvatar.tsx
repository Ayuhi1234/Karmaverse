import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Path, Ellipse, ClipPath, Defs, LinearGradient, Stop, G, Rect } from 'react-native-svg';

// A WhatsApp-style default avatar that reflects the user's gender: a white
// silhouette (face + shoulders) with hair — short for male, shoulder-length for
// female — on a saturated gender-coloured circle. Reads well on both the green
// dashboard header and the white profile card.
type Gender = string | null | undefined;

const HAIR = 'rgba(15,23,42,0.38)'; // dark, semi-transparent — reads as hair on the white face
const BODY = '#ffffff';

function grad(gender: Gender): [string, string] {
  const g = String(gender || '').toLowerCase();
  if (g === 'male') return ['#60a5fa', '#2563eb'];
  if (g === 'female') return ['#f472b6', '#db2777'];
  return ['#34d399', '#059669']; // other / not specified — brand green
}

export function UserAvatar({ gender, size = 48, ring }: { gender?: Gender; size?: number; ring?: boolean }) {
  const [c1, c2] = grad(gender);
  const female = String(gender || '').toLowerCase() === 'female';
  return (
    <View style={[{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden' }, ring && { borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.95)' }]}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <ClipPath id="clip"><Circle cx="50" cy="50" r="50" /></ClipPath>
          <LinearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={c1} />
            <Stop offset="1" stopColor={c2} />
          </LinearGradient>
        </Defs>
        <G clipPath="url(#clip)">
          <Rect x="0" y="0" width="100" height="100" fill="url(#bg)" />

          {/* Shoulders — a wide rounded body, clipped by the circle at the bottom */}
          <Ellipse cx="50" cy="108" rx="35" ry="42" fill={BODY} />

          {female ? (
            <>
              {/* Hair behind the head + two locks onto the shoulders */}
              <Circle cx="50" cy="38" r="19" fill={HAIR} />
              <Ellipse cx="33" cy="54" rx="6.5" ry="13" fill={HAIR} />
              <Ellipse cx="67" cy="54" rx="6.5" ry="13" fill={HAIR} />
              <Circle cx="50" cy="41" r="15" fill={BODY} />
            </>
          ) : (
            <>
              <Circle cx="50" cy="39" r="16" fill={BODY} />
              {/* Short hair cap */}
              <Path d="M34 39 C34 24 66 24 66 39 C61 31 56 28 50 28 C44 28 39 31 34 39 Z" fill={HAIR} />
            </>
          )}
        </G>
      </Svg>
    </View>
  );
}
