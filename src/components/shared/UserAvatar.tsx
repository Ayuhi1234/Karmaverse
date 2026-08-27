import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Path, Ellipse, ClipPath, Defs, LinearGradient, Stop, G, Rect } from 'react-native-svg';

// A WhatsApp-style default avatar that reflects the user's gender: a white
// silhouette (face + shoulders) with hair — short for male, shoulder-length for
// female — on a saturated gender-coloured circle. Reads well on both the green
// dashboard header and the white profile card.
type Gender = string | null | undefined;

const HAIR = 'rgba(15,23,42,0.34)'; // dark, semi-transparent — reads as hair on the white face
const BODY = '#ffffff';

function grad(gender: Gender): [string, string] {
  const g = String(gender || '').toLowerCase();
  if (g === 'male') return ['#60a5fa', '#2563eb'];
  if (g === 'female') return ['#f472b6', '#db2777'];
  return ['#34d399', '#059669']; // other / not specified — brand green
}

// Shoulders reach the bottom edge so there's no gap under the circle.
const SHOULDERS = 'M50 52 C32 52 19 66 19 100 L81 100 C81 66 68 52 50 52 Z';

export function UserAvatar({ gender, size = 48, ring }: { gender?: Gender; size?: number; ring?: boolean }) {
  const [c1, c2] = grad(gender);
  const female = String(gender || '').toLowerCase() === 'female';
  return (
    <View style={[{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden' }, ring && { borderWidth: 3, borderColor: 'rgba(255,255,255,0.95)' }]}>
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
          <Path d={SHOULDERS} fill={BODY} />

          {female ? (
            <>
              {/* Hair behind the head + two locks falling onto the shoulders */}
              <Circle cx="50" cy="37" r="19" fill={HAIR} />
              <Ellipse cx="32" cy="55" rx="6" ry="14" fill={HAIR} />
              <Ellipse cx="68" cy="55" rx="6" ry="14" fill={HAIR} />
              <Circle cx="50" cy="40" r="14" fill={BODY} />
            </>
          ) : (
            <>
              <Circle cx="50" cy="38" r="15" fill={BODY} />
              {/* Short hair cap */}
              <Path d="M35 38 C35 24 65 24 65 38 C61 31 56 28 50 28 C44 28 39 31 35 38 Z" fill={HAIR} />
            </>
          )}
        </G>
      </Svg>
    </View>
  );
}
