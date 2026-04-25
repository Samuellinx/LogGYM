import {useState} from 'react';
import {Alert, Image, StyleSheet, Text, View} from 'react-native';
import {Upload, Wifi, WifiOff} from 'lucide-react-native';

import {Button} from '@/components/Button';
import {Screen} from '@/components/Screen';
import {SectionHeader} from '@/components/SectionHeader';
import {TagChip} from '@/components/TagChip';
import {
  exportBackupForCurrentUser,
  importBackupForCurrentUser,
} from '@/features/backup/backupService';
import {pickProfilePhotoDataUrl} from '@/features/auth/profilePhotoService';
import {importTrainingFileForCurrentUser} from '@/features/imports/trainingImportService';
import {useAppStore} from '@/store/useAppStore';
import {theme} from '@/theme';
import {toUserMessage} from '@/utils/errors';
import {formatSessionDate} from '@/utils/formatters';

export const ProfileScreen = () => {
  const [activeAction, setActiveAction] = useState<
    'export' | 'backup-import' | 'training-import' | 'profile-photo' | null
  >(null);
  const session = useAppStore(state => state.session);
  const dashboard = useAppStore(state => state.dashboard);
  const workouts = useAppStore(state => state.workouts);
  const history = useAppStore(state => state.history);
  const isOnline = useAppStore(state => state.isOnline);
  const refreshData = useAppStore(state => state.refreshData);
  const signOut = useAppStore(state => state.signOut);
  const updateProfilePhoto = useAppStore(state => state.updateProfilePhoto);
  const isBusy = activeAction !== null;

  const handleLogout = () => {
    Alert.alert('Sair da conta', 'Deseja realmente sair do LogGYM?', [
      {text: 'Cancelar', style: 'cancel'},
      {
        text: 'Sair',
        style: 'destructive',
        onPress: () => {
          signOut().catch(() => {
            // A limpeza local já é suficiente; qualquer falha remota não bloqueia logout.
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
        'Cópia salva',
        [
          'Sua cópia foi exportada com sucesso.',
          `Arquivo: ${result.fileName}.`,
          `Conteúdo: ${result.workouts} treinos, ${result.workoutExercises} exercícios, ${result.workoutSessions} sessões e ${result.sessionSets} séries.`,
        ].join(' '),
      );
    } catch (error) {
      Alert.alert(
        'Não foi possível salvar sua cópia',
        toUserMessage(error, 'Não foi possível exportar seus treinos agora.'),
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
        'Cópia restaurada',
        [
          'A restauração foi concluída com sucesso.',
          `Foram aplicados ${result.workouts} treinos, ${result.workoutExercises} exercícios, ${result.workoutSessions} sessões e ${result.sessionSets} séries.`,
          'Os dados atuais da conta neste aparelho foram substituídos pelo conteúdo do arquivo selecionado.',
        ].join(' '),
      );
    } catch (error) {
      Alert.alert(
        'Não foi possível restaurar sua cópia',
        toUserMessage(error, 'Não foi possível restaurar seus treinos agora.'),
      );
    } finally {
      setActiveAction(null);
    }
  };

  const handleImportBackup = () => {
    Alert.alert(
      'Restaurar cópia',
      'Isso vai substituir os treinos e o histórico atuais pelos dados do arquivo selecionado. Deseja continuar?',
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
          'A importação do arquivo foi concluída com sucesso.',
          `Arquivo: ${result.fileName}.`,
          `Resultado: ${result.workouts} treinos e ${result.exercises} exercícios importados.`,
          result.skippedWorkouts > 0
            ? `${result.skippedWorkouts} treino(s) incompleto(s) foram ignorados.`
            : 'Tudo que foi reconhecido já está salvo na sua conta.',
        ].join(' '),
      );
    } catch (error) {
      Alert.alert(
        'Não foi possível importar o arquivo',
        toUserMessage(
          error,
          'Não foi possível converter esse arquivo em estrutura de treino agora.',
        ),
      );
    } finally {
      setActiveAction(null);
    }
  };

  const handleProfilePhotoUpload = async () => {
    if (!session?.user) {
      return;
    }

    setActiveAction('profile-photo');

    try {
      const photoDataUrl = await pickProfilePhotoDataUrl();

      if (!photoDataUrl) {
        return;
      }

      await updateProfilePhoto(photoDataUrl);

      Alert.alert(
        'Foto atualizada',
        'Sua foto de perfil foi salva com sucesso e já está disponível nesta conta.',
      );
    } catch (error) {
      Alert.alert(
        'Não foi possível atualizar a foto',
        toUserMessage(error, 'Não foi possível atualizar a foto de perfil agora.'),
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
            Último login {formatSessionDate(session?.user.lastLoginAt ?? null)}
          </Text>
          <Button
            fullWidth={false}
            variant="secondary"
            label={
              activeAction === 'profile-photo' ? 'Salvando foto...' : 'Adicionar foto'
            }
            icon={<Upload color={theme.colors.text} size={16} />}
            onPress={handleProfilePhotoUpload}
            disabled={!session || isBusy}
          />
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

      <SectionHeader title="Seu resumo" subtitle="Visão geral do que já está salvo" />

      <View style={styles.summaryCard}>
        <Text style={styles.summaryText}>{workouts.length} Treinos ativos</Text>
        <Text style={styles.summaryText}>{history.length} sessões no histórico</Text>
        <Text style={styles.summaryText}>
          {dashboard?.totalTrackedSets ?? 0} séries registradas
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
            : 'Sem internet no momento. O que já está salvo continua disponível neste aparelho e será sincronizado quando a conexão voltar.'}
        </Text>
      </View>

      <SectionHeader
        title="Sua cópia dos treinos"
        subtitle="Guarde ou recupere seus dados quando precisar"
      />

      <View style={styles.backupCard}>
        <Text style={styles.backupTitle}>Backup manual</Text>
        <Text style={styles.backupText}>
          Exporte um arquivo com seus treinos, exercícios, sessões e séries para
          manter uma cópia segura fora do app.
        </Text>
        <Text style={styles.backupHint}>
          Ao restaurar, somente a conta atual pode usar esse arquivo.
        </Text>
      </View>

      <Button
        variant="secondary"
        label={activeAction === 'export' ? 'Salvando cópia...' : 'Exportar cópia'}
        onPress={handleExportBackup}
        disabled={!session || isBusy}
      />
      <Button
        variant="secondary"
        label={
          activeAction === 'backup-import' ? 'Restaurando cópia...' : 'Importar cópia'
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
          Exercício, Carga, Repetições, Dia e Cor.
        </Text>
        <Text style={styles.backupHint}>
          O app organiza o conteúdo em estrutura de treino e ignora blocos vazios
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
