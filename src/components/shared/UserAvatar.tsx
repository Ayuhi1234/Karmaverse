import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Path, ClipPath, Defs, G, Rect } from 'react-native-svg';

// A WhatsApp-style default avatar that reflects the user's gender: a clean
// silhouette (face + body) with hair — short for male, shoulder-length for
// female — on a soft gender-tinted circle. Used wherever we used the initials.
type Gender = string | null | undefined;

function palette(gender: Gender) {
  const g = String(gender || '').toLowerCase();
  if (g === 'male') return { bg: '#dbeafe', body: '#3b82f6', hair: '#1e3a8a', female: false };
  if (g === 'female') return { bg: '#fce7f3', body: '#ec4899', hair: '#831843', female: true };
  // Other / not specified — neutral brand green, no long hair.
  return { bg: '#dcfce7', body: '#10b981', hair: '#065f46', female: false };
}

export function UserAvatar({ gender, size = 48, ring }: { gender?: Gender; size?: number; ring?: boolean }) {
  const c = palette(gender);
  return (
    <View style={[{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden' }, ring && { borderWidth: 3, borderColor: 'rgba(255,255,255,0.9)' }]}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <ClipPath id="clip"><Circle cx="50" cy="50" r="50" /></ClipPath>
        </Defs>
        <G clipPath="url(#clip)">
          <Rect x="0" y="0" width="100" height="100" fill={c.bg} />

          {c.female ? (
            <>
              {/* Hair (behind) — frames the head and falls to the shoulders */}
              <Path
                d="M33 46 C33 26 67 26 67 46 C70 46 70 64 65 70 L65 49 C65 39 58 33 50 33 C42 33 35 39 35 49 L35 70 C30 64 30 46 33 46 Z"
                fill={c.hair}
              />
              {/* Face */}
              <Circle cx="50" cy="44" r="14" fill={c.body} />
              {/* Body / shoulders */}
              <Path d="M50 60 C33 60 21 72 21 92 L79 92 C79 72 67 60 50 60 Z" fill={c.body} />
            </>
          ) : (
            <>
              {/* Face */}
              <Circle cx="50" cy="41" r="15" fill={c.body} />
              {/* Short hair on top */}
              <Path d="M35 40 C35 27 65 27 65 40 C61 34 56 31 50 31 C44 31 39 34 35 40 Z" fill={c.hair} />
              {/* Body / shoulders */}
              <Path d="M50 58 C33 58 21 71 21 91 L79 91 C79 71 67 58 50 58 Z" fill={c.body} />
            </>
          )}
        </G>
      </Svg>
    </View>
  );
}
