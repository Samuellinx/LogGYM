import {useState} from 'react';
import {Alert, Image, StyleSheet, Text, View} from 'react-native';
import {ShieldCheck, Wifi, WifiOff} from 'lucide-react-native';

import {Button} from '@/components/Button';
import {Screen} from '@/components/Screen';
import {SectionHeader} from '@/components/SectionHeader';
import {TagChip} from '@/components/TagChip';
import {getAuthCapabilities} from '@/features/auth/authService';
import {exportBackupForCurrentUser, importBackupForCurrentUser} from '@/features/backup/backupService';
import {useAppStore} from '@/store/useAppStore';
import {theme} from '@/theme';
import {toUserMessage} from '@/utils/errors';
import {securityHighlights} from '@/utils/constants';
import {formatSessionDate} from '@/utils/formatters';

export const ProfileScreen = () => {
  const [backupAction, setBackupAction] = useState<'export' | 'import' | null>(null);
  const session = useAppStore(state => state.session);
  const dashboard = useAppStore(state => state.dashboard);
  const workouts = useAppStore(state => state.workouts);
  const history = useAppStore(state => state.history);
  const isOnline = useAppStore(state => state.isOnline);
  const refreshData = useAppStore(state => state.refreshData);
  const signOut = useAppStore(state => state.signOut);

  const authCapabilities = getAuthCapabilities();
  const isBackupBusy = backupAction !== null;

  const handleLogout = () => {
    Alert.alert('Encerrar sessao', 'Deseja realmente sair do LogGYM?', [
      {text: 'Cancelar', style: 'cancel'},
      {
        text: 'Sair',
        style: 'destructive',
        onPress: () => {
          signOut().catch(() => {
            // A limpeza local ja e suficiente; qualquer falha remota nao bloqueia logout.
          });
        },
      },
    ]);
  };

  const handleExportBackup = async () => {
    if (!session?.user) {
      return;
    }

    setBackupAction('export');

    try {
      const result = await exportBackupForCurrentUser(session.user);

      if (!result) {
        return;
      }

      Alert.alert(
        'Backup exportado',
        [
          `${result.fileName} salvo com sucesso.`,
          `${result.workouts} treinos, ${result.workoutSessions} sessoes e ${result.sessionSets} series foram empacotados no JSON.`,
        ].join(' '),
      );
    } catch (error) {
      Alert.alert(
        'Falha ao exportar backup',
        toUserMessage(error, 'Nao foi possivel exportar o backup local.'),
      );
    } finally {
      setBackupAction(null);
    }
  };

  const runImportBackup = async () => {
    if (!session?.user) {
      return;
    }

    setBackupAction('import');

    try {
      const result = await importBackupForCurrentUser(session.user);

      if (!result) {
        return;
      }

      await refreshData();

      Alert.alert(
        'Backup restaurado',
        [
          `${result.workouts} treinos, ${result.workoutSessions} sessoes e ${result.sessionSets} series foram restaurados.`,
          'O backup precisa pertencer exatamente a esta conta para ser aceito.',
        ].join(' '),
      );
    } catch (error) {
      Alert.alert(
        'Falha ao importar backup',
        toUserMessage(error, 'Nao foi possivel restaurar o backup local.'),
      );
    } finally {
      setBackupAction(null);
    }
  };

  const handleImportBackup = () => {
    Alert.alert(
      'Importar backup',
      'Isso vai substituir os treinos e historico locais da conta atual pelos dados do arquivo selecionado. Deseja continuar?',
      [
        {text: 'Cancelar', style: 'cancel'},
        {
          text: 'Importar',
          style: 'destructive',
          onPress: () => {
            runImportBackup().catch(() => undefined);
          },
        },
      ],
    );
  };

  return (
    <Screen>
      <View style={styles.profileCard}>
        {session?.user.photo ? (
          <Image source={{uri: session.user.photo}} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarLabel}>
              {(session?.user.name ?? 'L').slice(0, 1).toUpperCase()}
            </Text>
          </View>
        )}

        <View style={styles.profileCopy}>
          <Text style={styles.name}>{session?.user.name}</Text>
          <Text style={styles.email}>{session?.user.email}</Text>
          <Text style={styles.meta}>
            Ultimo login {formatSessionDate(session?.user.lastLoginAt ?? null)}
          </Text>
        </View>
      </View>

      <View style={styles.statusRow}>
        <TagChip
          label={isOnline ? 'Online' : 'Offline'}
          active
          accentColor={isOnline ? theme.colors.success : theme.colors.warning}
        />
        <TagChip
          label={
            session?.provider === 'google' ? 'Conta Google' : 'Sessao local DEV'
          }
          active
          accentColor={theme.colors.accentSecondary}
        />
        <TagChip
          label={authCapabilities.hasWebClientId ? 'Web client definido' : 'Sem web client'}
          active={authCapabilities.isGoogleConfigured}
        />
      </View>

      <SectionHeader title="Resumo local" subtitle="Indicadores extraidos do SQLite local" />

      <View style={styles.summaryCard}>
        <Text style={styles.summaryText}>{workouts.length} treinos ativos</Text>
        <Text style={styles.summaryText}>{history.length} sessoes no historico</Text>
        <Text style={styles.summaryText}>
          {dashboard?.totalTrackedSets ?? 0} series registradas
        </Text>
      </View>

      <SectionHeader title="Seguranca aplicada" subtitle="Medidas basicas ja embarcadas no app" />

      <View style={styles.securityList}>
        {securityHighlights.map(item => (
          <View key={item} style={styles.securityItem}>
            <ShieldCheck color={theme.colors.accent} size={18} />
            <Text style={styles.securityText}>{item}</Text>
          </View>
        ))}
      </View>

      <View style={styles.networkCard}>
        {isOnline ? (
          <Wifi color={theme.colors.success} size={18} />
        ) : (
          <WifiOff color={theme.colors.warning} size={18} />
        )}
        <Text style={styles.networkText}>
          {isOnline
            ? 'Conexao ativa. O login Google e futuras sincronizacoes podem funcionar normalmente.'
            : 'Sem internet. O app continua operando com os dados locais e a sessao persistida.'}
        </Text>
      </View>

      <SectionHeader
        title="Backup local"
        subtitle="Exporte ou restaure um arquivo JSON validado do LogGYM"
      />

      <View style={styles.backupCard}>
        <Text style={styles.backupTitle}>Backup manual e offline</Text>
        <Text style={styles.backupText}>
          O backup leva seus treinos, exercicios, sessoes e series para um JSON.
          A restauracao so aceita o mesmo email e o mesmo provedor autenticado.
        </Text>
        <Text style={styles.backupHint}>
          Use isso para trocar de aparelho ou manter uma copia externa fora do banco local.
        </Text>
      </View>

      <Button
        variant="secondary"
        label={backupAction === 'export' ? 'Exportando backup...' : 'Exportar backup'}
        onPress={handleExportBackup}
        disabled={!session || isBackupBusy}
      />
      <Button
        variant="secondary"
        label={backupAction === 'import' ? 'Importando backup...' : 'Importar backup'}
        onPress={handleImportBackup}
        disabled={!session || isBackupBusy}
      />

      <Button variant="secondary" label="Atualizar paineis" onPress={refreshData} />
      <Button variant="danger" label="Sair da sessao" onPress={handleLogout} />
    </Screen>
  );
};

const styles = StyleSheet.create({
  profileCard: {
    padding: theme.spacing.lg,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexDirection: 'row',
    gap: theme.spacing.md,
    alignItems: 'center',
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: theme.radius.pill,
  },
  avatarFallback: {
    width: 68,
    height: 68,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(124,255,79,0.12)',
  },
  avatarLabel: {
    ...theme.typography.title,
    color: theme.colors.accent,
  },
  profileCopy: {
    flex: 1,
    gap: 4,
  },
  name: {
    ...theme.typography.title,
    color: theme.colors.text,
  },
  email: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  meta: {
    ...theme.typography.caption,
    color: theme.colors.textSoft,
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  summaryCard: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 8,
  },
  summaryText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  securityList: {
    gap: theme.spacing.sm,
  },
  securityItem: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    alignItems: 'center',
  },
  securityText: {
    flex: 1,
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  networkCard: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    alignItems: 'center',
  },
  networkText: {
    flex: 1,
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  backupCard: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.xs,
  },
  backupTitle: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
  },
  backupText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  backupHint: {
    ...theme.typography.caption,
    color: theme.colors.textSoft,
  },
});
