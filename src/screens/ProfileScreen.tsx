import {useEffect, useState} from 'react';
import {Alert, Pressable, StyleSheet, Text, View} from 'react-native';
import {Wifi, WifiOff} from 'lucide-react-native';

import {Button} from '@/components/Button';
import {ProfileAvatar} from '@/components/ProfileAvatar';
import {Screen} from '@/components/Screen';
import {SectionHeader} from '@/components/SectionHeader';
import {TagChip} from '@/components/TagChip';
import {TextField} from '@/components/TextField';
import {
  exportBackupForCurrentUser,
  importBackupForCurrentUser,
} from '@/features/backup/backupService';
import {
  defaultProfileAvatarId,
  profileAvatarCatalog,
} from '@/features/auth/profileAvatarCatalog';
import {
  exportTrainingTextForCurrentUser,
  importTrainingFileForCurrentUser,
} from '@/features/imports/trainingImportService';
import {useAppStore} from '@/store/useAppStore';
import {theme} from '@/theme';
import {toUserMessage} from '@/utils/errors';
import {formatSessionDate} from '@/utils/formatters';

export const ProfileScreen = () => {
  const [activeAction, setActiveAction] = useState<
    | 'export'
    | 'backup-import'
    | 'training-export'
    | 'training-import'
    | 'profile-avatar'
    | null
  >(null);
  const [backupPassword, setBackupPassword] = useState('');
  const [backupPasswordConfirm, setBackupPasswordConfirm] = useState('');
  const session = useAppStore(state => state.session);
  const dashboard = useAppStore(state => state.dashboard);
  const workouts = useAppStore(state => state.workouts);
  const history = useAppStore(state => state.history);
  const isOnline = useAppStore(state => state.isOnline);
  const refreshData = useAppStore(state => state.refreshData);
  const signOut = useAppStore(state => state.signOut);
  const updateProfileAvatar = useAppStore(state => state.updateProfileAvatar);
  const showError = useAppStore(state => state.showError);
  const isBusy = activeAction !== null;
  const selectedAvatarId = session?.user.avatarId ?? defaultProfileAvatarId;
  const [avatarDraftId, setAvatarDraftId] = useState(selectedAvatarId);
  const [isAvatarPickerCollapsed, setIsAvatarPickerCollapsed] = useState(true);
  const selectedAvatar =
    profileAvatarCatalog.find(avatar => avatar.id === avatarDraftId) ??
    profileAvatarCatalog.find(avatar => avatar.id === selectedAvatarId) ??
    profileAvatarCatalog[0];
  const visibleAvatars = isAvatarPickerCollapsed
    ? selectedAvatar
      ? [selectedAvatar]
      : []
    : profileAvatarCatalog;

  useEffect(() => {
    setAvatarDraftId(selectedAvatarId);
    setIsAvatarPickerCollapsed(true);
  }, [selectedAvatarId]);

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
      const result = await exportBackupForCurrentUser(
        session.user,
        backupPassword,
        backupPasswordConfirm,
      );
      setBackupPassword('');
      setBackupPasswordConfirm('');

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
      showError(
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
      const result = await importBackupForCurrentUser(session.user, backupPassword);
      setBackupPassword('');

      if (!result) {
        return;
      }

      await refreshData();

      Alert.alert(
        'Cópia restaurada',
        [
          'A restauração foi concluída com sucesso.',
          `Foram aplicados ${result.workouts} treinos, ${result.workoutSessions} sessões e ${result.sessionSets} séries.`,
          'Os dados atuais da conta neste aparelho foram substituídos pelo conteúdo do arquivo selecionado.',
        ].join(' '),
      );
    } catch (error) {
      showError(
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
      showError(
        toUserMessage(
          error,
          'Não foi possível converter esse arquivo em estrutura de treino agora.',
        ),
      );
    } finally {
      setActiveAction(null);
    }
  };

  const handleExportTrainingText = async () => {
    if (!session?.user) {
      return;
    }

    setActiveAction('training-export');

    try {
      const result = await exportTrainingTextForCurrentUser(session.user);

      if (!result) {
        return;
      }

      Alert.alert(
        'TXT de treinos exportado',
        [
          'O arquivo de texto foi salvo com sucesso.',
          `Arquivo: ${result.fileName}.`,
          `Conteúdo: ${result.workouts} treinos e ${result.exercises} exercícios.`,
          'Esse TXT pode ser usado fora do app e importado novamente pelo LogGYM.',
        ].join(' '),
      );
    } catch (error) {
      showError(
        toUserMessage(
          error,
          'Não foi possível exportar seus treinos em TXT agora.',
        ),
      );
    } finally {
      setActiveAction(null);
    }
  };

  const handleSelectAvatar = (avatarId: string) => {
    if (!session?.user || isBusy) {
      return;
    }

    setAvatarDraftId(avatarId);
  };

  const handleEditAvatar = () => {
    if (!session?.user || isBusy) {
      return;
    }

    setAvatarDraftId(selectedAvatarId);
    setIsAvatarPickerCollapsed(false);
  };

  const handleConfirmAvatar = async () => {
    if (!session?.user || isBusy) {
      return;
    }

    if (avatarDraftId === selectedAvatarId) {
      setIsAvatarPickerCollapsed(true);
      return;
    }

    setActiveAction('profile-avatar');

    try {
      await updateProfileAvatar(avatarDraftId);
      setIsAvatarPickerCollapsed(true);
      Alert.alert(
        'Avatar atualizado',
        'Seu personagem de perfil foi salvo com sucesso nesta conta.',
      );
    } catch (error) {
      showError(
        toUserMessage(error, 'Não foi possível atualizar o avatar do perfil agora.'),
      );
    } finally {
      setActiveAction(null);
    }
  };

  return (
    <Screen>
      <View style={styles.profileCard}>
        <ProfileAvatar avatarId={avatarDraftId} size={86} />

        <View style={styles.profileCopy}>
          <Text style={styles.name}>{session?.user.name}</Text>
          <Text style={styles.email}>{session?.user.email}</Text>
          <Text style={styles.meta}>
            Último login {formatSessionDate(session?.user.lastLoginAt ?? null)}
          </Text>
          <Text style={styles.avatarHint}>
            {isAvatarPickerCollapsed
              ? 'Avatar confirmado para esta conta.'
              : 'Escolha um personagem e confirme para salvar.'}
          </Text>
        </View>
      </View>

      <View style={styles.avatarPickerCard}>
        <Text style={styles.avatarPickerTitle}>Seu avatar</Text>
        <Text style={styles.avatarPickerText}>
          {isAvatarPickerCollapsed
            ? 'Apenas o avatar confirmado fica visível. Edite para trocar.'
            : 'Toque em um personagem e valide a escolha para salvar.'}
        </Text>

        <View style={styles.avatarGrid}>
          {visibleAvatars.map(avatar => {
            const isSelected = avatar.id === avatarDraftId;

            return (
              <Pressable
                key={avatar.id}
                onPress={() => handleSelectAvatar(avatar.id)}
                disabled={!session || isBusy}
                style={({pressed}) => [
                  styles.avatarOption,
                  isSelected ? styles.avatarOptionSelected : null,
                  pressed && !isBusy ? styles.avatarOptionPressed : null,
                ]}>
                <ProfileAvatar
                  avatarId={avatar.id}
                  size={64}
                  selected={isSelected}
                />
                <Text style={styles.avatarOptionLabel}>{avatar.name}</Text>
              </Pressable>
            );
          })}
        </View>

        {isAvatarPickerCollapsed ? (
          <Button
            variant="secondary"
            label="Trocar avatar"
            onPress={handleEditAvatar}
            disabled={!session || isBusy}
          />
        ) : (
          <Button
            variant="primary"
            label={
              activeAction === 'profile-avatar'
                ? 'Validando avatar...'
                : 'Validar avatar'
            }
            onPress={handleConfirmAvatar}
            disabled={!session || isBusy}
          />
        )}
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
          Exporte um arquivo criptografado com seus treinos, exercícios, sessões e
          séries para manter uma cópia segura fora do app.
        </Text>
        <Text style={styles.backupHint}>
          Ao restaurar, somente a conta atual pode usar esse arquivo.
        </Text>
      </View>

      <View style={styles.backupCard}>
        <TextField
          label="Senha da cópia"
          value={backupPassword}
          onChangeText={setBackupPassword}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isBusy}
        />
        <TextField
          label="Confirmar senha da cópia"
          value={backupPasswordConfirm}
          onChangeText={setBackupPasswordConfirm}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isBusy}
        />
        <Text style={styles.backupHint}>
          Use essa senha para exportar e para restaurar a mesma cópia protegida.
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
        title="Importar ou exportar treino externo"
        subtitle="Use texto ou planilha para levar treinos para fora ou para dentro do app"
      />

      <View style={styles.backupCard}>
        <Text style={styles.backupTitle}>Arquivo TXT de treino</Text>
        <Text style={styles.backupText}>
          Exporte seus treinos em .txt para ler fora do app ou importar novamente
          depois.
        </Text>
        <Text style={styles.backupText}>
          Importe arquivos .txt, .csv, .xls ou .xlsx com colunas como Treino,
          Exercício, Carga, Repetições, Dia e Cor.
        </Text>
        <Text style={styles.backupHint}>
          O app organiza o conteúdo em estrutura de treino e ignora blocos vazios ou
          incompletos.
        </Text>
      </View>

      <Button
        variant="secondary"
        label={
          activeAction === 'training-export'
            ? 'Exportando TXT...'
            : 'Exportar treinos em TXT'
        }
        onPress={handleExportTrainingText}
        disabled={!session || isBusy}
      />

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
  avatarHint: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  avatarPickerCard: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.sm,
  },
  avatarPickerTitle: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
  },
  avatarPickerText: {
    ...theme.typography.caption,
    color: theme.colors.textSoft,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  avatarOption: {
    width: '22%',
    minWidth: 66,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  avatarOptionSelected: {
    backgroundColor: 'rgba(81,199,255,0.08)',
    borderColor: 'rgba(81,199,255,0.28)',
  },
  avatarOptionPressed: {
    opacity: 0.88,
  },
  avatarOptionLabel: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
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
