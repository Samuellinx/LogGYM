import {Modal, StyleSheet, Text, View} from 'react-native';

import {Button} from '@/components/Button';
import {theme} from '@/theme';

interface ErrorModalProps {
  visible: boolean;
  message: string;
  onClose: () => void;
}

export const ErrorModal = ({visible, message, onClose}: ErrorModalProps) => (
  <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
    <View style={styles.overlay}>
      <View accessibilityRole="alert" style={styles.modalCard}>
        <Text style={styles.eyebrow}>Erro</Text>
        <Text style={styles.title}>Não foi possível concluir a ação</Text>
        <Text style={styles.description}>{message}</Text>
        <Button variant="primary" label="Entendi" onPress={onClose} />
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
    borderColor: 'rgba(255,111,125,0.32)',
    gap: theme.spacing.md,
  },
  eyebrow: {
    ...theme.typography.caption,
    color: theme.colors.danger,
    textTransform: 'uppercase',
  },
  title: {
    ...theme.typography.title,
    color: theme.colors.text,
  },
  description: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
});
