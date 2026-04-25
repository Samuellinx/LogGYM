import type {PropsWithChildren, ReactElement, RefObject} from 'react';
import type {RefreshControlProps, ScrollView, StyleProp, ViewStyle} from 'react-native';
import {ScrollView as NativeScrollView, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {theme} from '@/theme';

interface ScreenProps extends PropsWithChildren {
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  refreshControl?: ReactElement<RefreshControlProps>;
  scrollViewRef?: RefObject<ScrollView | null>;
}

export const Screen = ({
  children,
  scroll = true,
  style,
  contentContainerStyle,
  refreshControl,
  scrollViewRef,
}: ScreenProps) => {
  if (!scroll) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={[styles.safe, style]}>
        <View style={[styles.content, contentContainerStyle]}>{children}</View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.safe, style]}>
      <NativeScrollView
        ref={scrollViewRef}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl}
        contentContainerStyle={[styles.content, contentContainerStyle]}>
        {children}
      </NativeScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.xxl,
    gap: theme.spacing.md,
  },
});
