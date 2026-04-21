import {StyleSheet, View} from 'react-native';
import Svg, {Defs, LinearGradient, Path, Polyline, Stop} from 'react-native-svg';

import {theme} from '@/theme';

interface SparklineChartProps {
  values: number[];
  width?: number;
  height?: number;
}

export const SparklineChart = ({
  values,
  width = 320,
  height = 120,
}: SparklineChartProps) => {
  if (values.length === 0) {
    return <View style={[styles.empty, {width, height}]} />;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = values.length > 1 ? width / (values.length - 1) : width;

  const points = values.map((value, index) => {
    const x = index * step;
    const y = height - ((value - min) / range) * (height - 12) - 6;
    return `${x},${y}`;
  });

  const areaPath = `${points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point}`)
    .join(' ')} L ${width},${height} L 0,${height} Z`;

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id="sparkline-fill" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#7CFF4F" stopOpacity="0.32" />
          <Stop offset="100%" stopColor="#7CFF4F" stopOpacity="0.02" />
        </LinearGradient>
      </Defs>
      <Path d={areaPath} fill="url(#sparkline-fill)" />
      <Polyline
        points={points.join(' ')}
        fill="none"
        stroke={theme.colors.accent}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

const styles = StyleSheet.create({
  empty: {
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
});
