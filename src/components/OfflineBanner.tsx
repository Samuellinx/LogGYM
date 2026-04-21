import {StyleSheet, Text, View} from 'react-native';
import {CloudOff} from 'lucide-react-native';

import {theme} from '@/theme';

interface OfflineBannerProps {
  visible: boolean;
}

export const OfflineBanner = ({visible}: OfflineBannerProps) => {
  if (!visible) {
    return null;
  }

  return (
    <View style={styles.container}>
      <CloudOff color={theme.colors.warning} size={16} />
      <Text style={styles.label}>
        Sem internet no momento. Seus treinos continuam disponiveis neste aparelho.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.md,
    backgroundColor: 'rgba(243,201,106,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(243,201,106,0.18)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  label: {
    flex: 1,
    color: '#F9D98B',
    ...theme.typography.caption,
  },
});
