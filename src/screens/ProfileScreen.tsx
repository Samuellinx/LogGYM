import {useState} from 'react';
import {Alert, Image, StyleSheet, Text, View} from 'react-native';
import {Wifi, WifiOff} from 'lucide-react-native';

import {Button} from '@/components/Button';
import {Screen} from '@/components/Screen';
import {SectionHeader} from '@/components/SectionHeader';
import {TagChip} from '@/components/TagChip';
import {
  exportBackupForCurrentUser,
  importBackupForCurrentUser,
} from '@/features/backup/backupService';
import {importTrainingFileForCurrentUser} from '@/features/imports/trainingImportService';
import {useAppStore} from '@/store/useAppStore';
import {theme} from '@/theme';
import {toUserMessage} from '@/utils/errors';
import {formatSessionDate} from '@/utils/formatters';

export const ProfileScreen = () => {
  const [activeAction, setActiveAction] = useState<
    'export' | 'backup-import' | 'training-import' | null
  >(null);
  const session = useAppStore(state => state.session);
  const dashboard = useAppStore(state => state.dashboard);
  const workouts = useAppStore(state => state.workouts);
  const history = useAppStore(state => state.history);
  const isOnline = useAppStore(state => state.isOnline);
  const refreshData = useAppStore(state => state.refreshData);
  const signOut = useAppStore(state => state.signOut);
  const isBusy = activeAction !== null;

  const handleLogout = () => {
    Alert.alert('Sair da conta', 'Deseja realmente sair do LogGYM?', [
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

    setActiveAction('export');

    try {
      const result = await exportBackupForCurrentUser(session.user);

      if (!result) {
        return;
      }

      Alert.alert(
        'Copia salva',
        [
          `${result.fileName} salvo com sucesso.`,
          `${result.workouts} treinos, ${result.workoutSessions} sessoes e ${result.sessionSets} series foram incluidos nesse arquivo.`,
        ].join(' '),
      );
    } catch (error) {
      Alert.alert(
        'Nao foi possivel salvar sua copia',
        toUserMessage(error, 'Nao foi possivel exportar seus treinos agora.'),
      );
    } finally {
      setActiveAction(null);
    }
  };

  const runImportBackup = async () => {
    if (!session?.user) {
      return;
    }

    setActiveAction('backup-import');

    try {
      const result = await importBackupForCurrentUser(session.user);

      if (!result) {
        return;
      }

      await refreshData();

      Alert.alert(
        'Copia restaurada',
        [
          `${result.workouts} treinos, ${result.workoutSessions} sessoes e ${result.sessionSets} series foram restaurados.`,
          'A restauracao so aceita arquivos da sua propria conta.',
        ].join(' '),
      );
    } catch (error) {
      Alert.alert(
        'Nao foi possivel restaurar sua copia',
        toUserMessage(error, 'Nao foi possivel restaurar seus treinos agora.'),
      );
    } finally {
      setActiveAction(null);
    }
  };

  const handleImportBackup = () => {
    Alert.alert(
      'Restaurar copia',
      'Isso vai substituir os treinos e o historico atuais pelos dados do arquivo selecionado. Deseja continuar?',
      [
        {text: 'Cancelar', style: 'cancel'},
        {
          text: 'Restaurar',
          style: 'destructive',
          onPress: () => {
            runImportBackup().catch(() => undefined);
          },
        },
      ],
    );
  };

  const handleImportTrainingFile = async () => {
    if (!session?.user) {
      return;
    }

    setActiveAction('training-import');

    try {
      const result = await importTrainingFileForCurrentUser(session.user);

      if (!result) {
        return;
      }

      await refreshData();

      Alert.alert(
        'Treinos importados',
        [
          `${result.fileName} gerou ${result.workouts} treinos com ${result.exercises} exercicios prontos para uso.`,
          result.skippedWorkouts > 0
            ? `${result.skippedWorkouts} treino(s) incompleto(s) foram ignorados.`
            : 'Tudo que foi reconhecido ja esta salvo na sua conta.',
        ].join(' '),
      );
    } catch (error) {
      Alert.alert(
        'Nao foi possivel importar o arquivo',
        toUserMessage(
          error,
          'Nao foi possivel converter esse arquivo em estrutura de treino agora.',
        ),
      );
    } finally {
      setActiveAction(null);
    }
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
            session?.provider === 'google'
              ? 'Conta Google'
              : session?.provider === 'password'
                ? 'Conta por e-mail'
                : 'Conta de teste'
          }
          active
          accentColor={theme.colors.accentSecondary}
        />
      </View>

      <SectionHeader title="Seu resumo" subtitle="Visao geral do que ja esta salvo" />

      <View style={styles.summaryCard}>
        <Text style={styles.summaryText}>{workouts.length} treinos ativos</Text>
        <Text style={styles.summaryText}>{history.length} sessoes no historico</Text>
        <Text style={styles.summaryText}>
          {dashboard?.totalTrackedSets ?? 0} series registradas
        </Text>
      </View>

      <View style={styles.networkCard}>
        {isOnline ? (
          <Wifi color={theme.colors.success} size={18} />
        ) : (
          <WifiOff color={theme.colors.warning} size={18} />
        )}
        <Text style={styles.networkText}>
          {isOnline
            ? 'Tudo certo para continuar usando o app e manter seus treinos sincronizados.'
            : 'Sem internet no momento. O que ja esta salvo continua disponivel neste aparelho e sera sincronizado quando a conexao voltar.'}
        </Text>
      </View>

      <SectionHeader
        title="Sua copia dos treinos"
        subtitle="Guarde ou recupere seus dados quando precisar"
      />

      <View style={styles.backupCard}>
        <Text style={styles.backupTitle}>Backup manual</Text>
        <Text style={styles.backupText}>
          Exporte um arquivo com seus treinos, exercicios, sessoes e series para
          manter uma copia segura fora do app.
        </Text>
        <Text style={styles.backupHint}>
          Ao restaurar, somente a conta atual pode usar esse arquivo.
        </Text>
      </View>

      <Button
        variant="secondary"
        label={activeAction === 'export' ? 'Salvando copia...' : 'Exportar copia'}
        onPress={handleExportBackup}
        disabled={!session || isBusy}
      />
      <Button
        variant="secondary"
        label={
          activeAction === 'backup-import' ? 'Restaurando copia...' : 'Importar copia'
        }
        onPress={handleImportBackup}
        disabled={!session || isBusy}
      />

      <SectionHeader
        title="Importar treino externo"
        subtitle="Converta texto ou planilha em treinos prontos no app"
      />

      <View style={styles.backupCard}>
        <Text style={styles.backupTitle}>Arquivos aceitos</Text>
        <Text style={styles.backupText}>
          Importe arquivos .txt, .csv, .xls ou .xlsx com colunas como Treino,
          Exercicio, Carga, Repeticoes, Dia e Cor.
        </Text>
        <Text style={styles.backupHint}>
          O app organiza o conteudo em estrutura de treino e ignora blocos vazios
          ou incompletos.
        </Text>
      </View>

      <Button
        variant="secondary"
        label={
          activeAction === 'training-import'
            ? 'Importando treino...'
            : 'Importar treino de arquivo'
        }
        onPress={handleImportTrainingFile}
        disabled={!session || isBusy}
      />

      <Button variant="secondary" label="Atualizar dados" onPress={refreshData} />
      <Button variant="danger" label="Sair" onPress={handleLogout} />
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
