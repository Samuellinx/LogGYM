import {Modal, StyleSheet, Text, View} from 'react-native';

import {Button} from '@/components/Button';
import {theme} from '@/theme';

interface SuccessModalProps {
  visible: boolean;
  message: string;
  actionLabel?: string;
  onClose: () => void;
}

export const SuccessModal = ({
  visible,
  message,
  actionLabel = 'Continuar',
  onClose,
}: SuccessModalProps) => (
  <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
    <View style={styles.overlay}>
      <View accessibilityRole="alert" style={styles.modalCard}>
        <Text style={styles.eyebrow}>Sucesso</Text>
        <Text style={styles.title}>{message}</Text>
        <Button variant="primary" label={actionLabel} onPress={onClose} />
      </View>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.overlay,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    padding: theme.spacing.lg,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(57,217,138,0.32)',
    gap: theme.spacing.md,
  },
  eyebrow: {
    ...theme.typography.caption,
    color: theme.colors.success,
    textTransform: 'uppercase',
  },
  title: {
    ...theme.typography.title,
    color: theme.colors.text,
  },
});
