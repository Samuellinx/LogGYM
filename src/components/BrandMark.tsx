import type {StyleProp, ViewStyle} from 'react-native';
import {StyleSheet, View} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgLinearGradient,
  Path,
  Stop,
} from 'react-native-svg';

import {theme} from '@/theme';

interface BrandMarkProps {
  size?: number;
  style?: StyleProp<ViewStyle>;
}

export const BrandMark = ({size = 92, style}: BrandMarkProps) => {
  const borderRadius = Math.round(size * 0.32);
  const padding = Math.round(size * 0.16);

  return (
    <View style={[styles.shadow, style]}>
      <LinearGradient
        colors={['#0A0E13', '#102018', '#0C151E']}
        start={{x: 0.1, y: 0}}
        end={{x: 0.9, y: 1}}
        style={[
          styles.shell,
          {
            width: size,
            height: size,
            borderRadius,
            padding,
          },
        ]}>
        <Svg viewBox="0 0 64 64" width="100%" height="100%">
          <Defs>
            <SvgLinearGradient id="brandStroke" x1="12" y1="12" x2="52" y2="52">
              <Stop offset="0" stopColor="#A6FF63" />
              <Stop offset="1" stopColor="#3FD68C" />
            </SvgLinearGradient>
          </Defs>

          <Circle
            cx="32"
            cy="32"
            r="22"
            fill="none"
            stroke="rgba(166,255,99,0.16)"
            strokeWidth="2.5"
          />

          <Path
            d="M22 41 L41 23"
            stroke="url(#brandStroke)"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <Circle
            cx="19.5"
            cy="43.5"
            r="7"
            fill="none"
            stroke="url(#brandStroke)"
            strokeWidth="3.4"
          />
          <Circle cx="19.5" cy="43.5" r="2.8" fill="#09110C" />
          <Circle
            cx="44.5"
            cy="20.5"
            r="7"
            fill="none"
            stroke="url(#brandStroke)"
            strokeWidth="3.4"
          />
          <Circle cx="44.5" cy="20.5" r="2.8" fill="#09110C" />

          <Path
            d="M17 22 L27 31 L34 25 L46 36"
            fill="none"
            stroke="#4FCBFF"
            strokeWidth="3.1"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M41.5 35.5 H46 V31"
            fill="none"
            stroke="#4FCBFF"
            strokeWidth="3.1"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  shadow: {
    shadowColor: '#000000',
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: {width: 0, height: 10},
    elevation: 8,
  },
  shell: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
  },
});
