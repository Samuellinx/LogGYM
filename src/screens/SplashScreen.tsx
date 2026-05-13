import {useEffect, useRef, type ReactNode} from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {ShieldCheck} from 'lucide-react-native';
import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient as SvgLinearGradient,
  Path,
  Stop,
} from 'react-native-svg';

import {Button} from '@/components/Button';
import {theme} from '@/theme';

interface SplashScreenProps {
  error?: string | null;
  onRetry?: () => void;
}

interface LogoLayerProps {
  children: ReactNode;
  style: object;
}

const createPieceStyle = (
  progress: Animated.Value,
  translateX: number,
  translateY: number,
  rotate: string,
) => ({
  opacity: progress,
  transform: [
    {
      translateX: progress.interpolate({
        inputRange: [0, 1],
        outputRange: [translateX, 0],
      }),
    },
    {
      translateY: progress.interpolate({
        inputRange: [0, 1],
        outputRange: [translateY, 0],
      }),
    },
    {
      rotate: progress.interpolate({
        inputRange: [0, 1],
        outputRange: [rotate, '0deg'],
      }),
    },
    {
      scale: progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0.74, 1],
      }),
    },
  ],
});

const LogoLayer = ({children, style}: LogoLayerProps) => (
  <Animated.View pointerEvents="none" style={[styles.logoLayer, style]}>
    <Svg viewBox="0 0 64 64" width="100%" height="100%">
      <Defs>
        <SvgLinearGradient id="brandStrokeSplash" x1="12" y1="12" x2="52" y2="52">
          <Stop offset="0" stopColor="#A6FF63" />
          <Stop offset="1" stopColor="#3FD68C" />
        </SvgLinearGradient>
      </Defs>
      {children}
    </Svg>
  </Animated.View>
);

const AnimatedSplashBrandMark = ({size = 118}: {size?: number}) => {
  const shellProgress = useRef(new Animated.Value(0)).current;
  const haloProgress = useRef(new Animated.Value(0)).current;
  const barProgress = useRef(new Animated.Value(0)).current;
  const lowerNodeProgress = useRef(new Animated.Value(0)).current;
  const upperNodeProgress = useRef(new Animated.Value(0)).current;
  const pulseProgress = useRef(new Animated.Value(0)).current;
  const chartProgress = useRef(new Animated.Value(0)).current;
  const arrowProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animateIn = (value: Animated.Value, duration = 560) =>
      Animated.timing(value, {
        toValue: 1,
        duration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      });

    const buildAnimation = Animated.sequence([
      animateIn(shellProgress, 360),
      Animated.stagger(95, [
        animateIn(haloProgress),
        animateIn(barProgress),
        animateIn(lowerNodeProgress),
        animateIn(upperNodeProgress),
        animateIn(chartProgress),
        animateIn(arrowProgress),
      ]),
    ]);

    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseProgress, {
          toValue: 1,
          duration: 960,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulseProgress, {
          toValue: 0,
          duration: 960,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );

    buildAnimation.start(({finished}) => {
      if (finished) {
        pulseAnimation.start();
      }
    });

    return () => {
      buildAnimation.stop();
      pulseAnimation.stop();
    };
  }, [
    arrowProgress,
    barProgress,
    chartProgress,
    haloProgress,
    lowerNodeProgress,
    pulseProgress,
    shellProgress,
    upperNodeProgress,
  ]);

  const shellStyle = {
    width: size,
    height: size,
    borderRadius: Math.round(size * 0.32),
    padding: Math.round(size * 0.16),
    opacity: shellProgress,
    transform: [
      {
        scale: shellProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [0.84, 1],
        }),
      },
    ],
  };
  const pulseStyle = {
    opacity: pulseProgress.interpolate({
      inputRange: [0, 1],
      outputRange: [0.22, 0.44],
    }),
    transform: [
      {
        scale: pulseProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.08],
        }),
      },
    ],
  };

  return (
    <View style={styles.logoWrap}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.logoPulse,
          {width: size + 22, height: size + 22, borderRadius: size},
          pulseStyle,
        ]}
      />
      <Animated.View style={[styles.logoShadow, shellStyle]}>
        <LinearGradient
          colors={['#0A0E13', '#102018', '#0C151E']}
          start={{x: 0.1, y: 0}}
          end={{x: 0.9, y: 1}}
          style={styles.logoShell}>
          <View style={styles.logoCanvas}>
            <LogoLayer style={createPieceStyle(haloProgress, -28, -18, '-18deg')}>
              <Circle
                cx="32"
                cy="32"
                r="22"
                fill="none"
                stroke="rgba(166,255,99,0.16)"
                strokeWidth="2.5"
              />
            </LogoLayer>
            <LogoLayer style={createPieceStyle(barProgress, 22, -22, '22deg')}>
              <Path
                d="M22 41 L41 23"
                stroke="url(#brandStrokeSplash)"
                strokeWidth="5"
                strokeLinecap="round"
              />
            </LogoLayer>
            <LogoLayer style={createPieceStyle(lowerNodeProgress, -30, 22, '-28deg')}>
              <G>
                <Circle
                  cx="19.5"
                  cy="43.5"
                  r="7"
                  fill="none"
                  stroke="url(#brandStrokeSplash)"
                  strokeWidth="3.4"
                />
                <Circle cx="19.5" cy="43.5" r="2.8" fill="#09110C" />
              </G>
            </LogoLayer>
            <LogoLayer style={createPieceStyle(upperNodeProgress, 32, -26, '28deg')}>
              <G>
                <Circle
                  cx="44.5"
                  cy="20.5"
                  r="7"
                  fill="none"
                  stroke="url(#brandStrokeSplash)"
                  strokeWidth="3.4"
                />
                <Circle cx="44.5" cy="20.5" r="2.8" fill="#09110C" />
              </G>
            </LogoLayer>
            <LogoLayer style={createPieceStyle(chartProgress, -24, 18, '-16deg')}>
              <Path
                d="M17 22 L27 31 L34 25 L46 36"
                fill="none"
                stroke="#4FCBFF"
                strokeWidth="3.1"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </LogoLayer>
            <LogoLayer style={createPieceStyle(arrowProgress, 18, 18, '16deg')}>
              <Path
                d="M41.5 35.5 H46 V31"
                fill="none"
                stroke="#4FCBFF"
                strokeWidth="3.1"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </LogoLayer>
          </View>
        </LinearGradient>
      </Animated.View>
    </View>
  );
};

export const SplashScreen = ({error, onRetry}: SplashScreenProps) => (
  <LinearGradient colors={['#04060A', '#101720', '#07110B']} style={styles.container}>
    <AnimatedSplashBrandMark />

    <View style={styles.copy}>
      <Text style={styles.title}>LogGYM</Text>
      <Text style={styles.subtitle}>Preparando seu espaço de treino</Text>
    </View>

    {error ? (
      <View style={styles.errorCard}>
        <ShieldCheck color={theme.colors.warning} size={20} />
        <Text style={styles.errorText}>
          Não foi possível abrir o app agora. Tente novamente.
        </Text>
      </View>
    ) : (
      <ActivityIndicator color={theme.colors.accent} size="large" />
    )}

    {error && onRetry ? (
      <Button fullWidth={false} label="Tentar novamente" onPress={onRetry} />
    ) : null}
  </LinearGradient>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xl,
    gap: theme.spacing.xl,
    overflow: 'hidden',
  },
  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoPulse: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(124,255,79,0.24)',
    backgroundColor: 'rgba(81,199,255,0.05)',
  },
  logoShadow: {
    shadowColor: '#000000',
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: {width: 0, height: 10},
    elevation: 8,
  },
  logoShell: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoCanvas: {
    width: '100%',
    height: '100%',
  },
  logoLayer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  copy: {
    gap: theme.spacing.sm,
    alignItems: 'center',
  },
  title: {
    ...theme.typography.display,
    color: theme.colors.text,
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  errorCard: {
    width: '100%',
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(243,201,106,0.18)',
    backgroundColor: 'rgba(243,201,106,0.12)',
    flexDirection: 'row',
    gap: theme.spacing.sm,
    alignItems: 'center',
  },
  errorText: {
    flex: 1,
    ...theme.typography.body,
    color: '#F9D98B',
  },
});
