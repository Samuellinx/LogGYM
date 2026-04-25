import {useEffect, useMemo, useRef, useState, type ChangeEvent} from 'react';
import type {User} from 'firebase/auth';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  ChevronRight,
  Clock3,
  Download,
  Dumbbell,
  FileUp,
  LoaderCircle,
  LogOut,
  Mail,
  PencilLine,
  Play,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  Upload,
  UserRound,
  Wifi,
  WifiOff,
} from 'lucide-react';
import {z} from 'zod';

import './index.css';
import {
  observeAuthState,
  sendResetPasswordEmail,
  signInWithEmailPassword,
  signInWithGooglePopup,
  signOutFromPanel,
  signUpWithEmailPassword,
} from './lib/auth';
import {
  exportBackupForCurrentUser,
  getUserAuthProvider,
  importBackupFileForCurrentUser,
} from './lib/backup';
import {
  buildDashboardSnapshot,
  filterSessionsBySearch,
  filterWorkoutsBySearch,
  formatCompactNumber,
  formatLoad,
  formatSessionDate,
  formatVolume,
} from './lib/dashboard';
import {
  buildExerciseProgressData,
  buildSparklinePath,
} from './lib/exerciseProgress';
import {importTrainingFileForCurrentUser} from './lib/trainingImport';
import {
  addDraftSet,
  buildTrainingSessionDocument,
  createTrainingDraftFromWorkout,
  removeDraftSet,
  updateDraftSet,
} from './lib/trainingSession';
import {
  deleteSessionFromPanel,
  deleteWorkoutFromPanel,
  refreshWorkspaceData,
  saveTrainingSessionFromPanel,
  saveWorkoutFromPanel,
  watchRecentSessions,
  watchWorkouts,
} from './lib/workouts';
import type {
  AuthMode,
  ExerciseProgressData,
  TrainingDraftExercise,
  WorkspaceView,
  WorkoutDocument,
  WorkoutExerciseInput,
  WorkoutSessionDocument,
} from './types';

const signInSchema = z.object({
  email: z.string().trim().email('Use um e-mail válido.'),
  password: z.string().min(8, 'A senha precisa ter pelo menos 8 caracteres.'),
});

const signUpSchema = z
  .object({
    name: z.string().trim().min(2, 'Informe seu nome.'),
    email: z.string().trim().email('Use um e-mail válido.'),
    password: z.string().min(8, 'A senha precisa ter pelo menos 8 caracteres.'),
    confirmPassword: z.string(),
  })
  .refine(values => values.password === values.confirmPassword, {
    message: 'As senhas não conferem.',
    path: ['confirmPassword'],
  });

const resetSchema = z.object({
  email: z.string().trim().email('Use um e-mail válido.'),
});

const accentPalette = [
  '#FF355E',
  '#FF7A00',
  '#FFD60A',
  '#7CFF4F',
  '#00C2FF',
  '#4D7CFE',
  '#B66BFF',
];

const weekdayOptions = [
  'Livre',
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado',
  'Domingo',
];

const modeLabels: Record<AuthMode, string> = {
  signin: 'Entrar',
  signup: 'Criar conta',
  forgot: 'Recuperar',
};

const modeDescriptions: Record<
  AuthMode,
  {title: string; description: string; actionLabel: string}
> = {
  signin: {
    title: 'Entre com a sua conta',
    description: 'Acesse sua conta para manter seus treinos sempre por perto.',
    actionLabel: 'Entrar com e-mail',
  },
  signup: {
    title: 'Crie sua conta',
    description: 'Monte sua base de treinos e deixe tudo pronto para o próximo ciclo.',
    actionLabel: 'Criar conta',
  },
  forgot: {
    title: 'Recupere o acesso',
    description: 'Informe seu e-mail e receba um link para voltar a entrar.',
    actionLabel: 'Enviar link de acesso',
  },
};

const createExerciseDraft = (): WorkoutExerciseInput => ({
  id: crypto.randomUUID(),
  name: '',
  muscleGroup: '',
  baseLoad: '',
  targetReps: '8-10',
  note: '',
  orderIndex: 0,
});

const createWorkoutDraft = (userId = ''): WorkoutDocument => {
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    userId,
    name: '',
    focus: '',
    notes: '',
    accentColor: accentPalette[3],
    scheduledDay: 'Livre',
    exercises: [createExerciseDraft()],
    createdAt: now,
    updatedAt: now,
  };
};

const normalizeWorkoutForSave = (
  workout: WorkoutDocument,
  userId: string,
): WorkoutDocument => {
  const now = new Date().toISOString();

  return {
    ...workout,
    userId,
    name: workout.name.trim(),
    focus: workout.focus.trim() || workout.name.trim(),
    notes: workout.notes.trim(),
    scheduledDay: workout.scheduledDay === 'Livre' ? null : workout.scheduledDay,
    updatedAt: now,
    createdAt: workout.createdAt || now,
    exercises: workout.exercises
      .map((exercise, index) => ({
        ...exercise,
        name: exercise.name.trim(),
        muscleGroup: exercise.muscleGroup.trim(),
        baseLoad: exercise.baseLoad.trim(),
        targetReps: exercise.targetReps.trim(),
        note: exercise.note.trim(),
        orderIndex: index,
      }))
      .filter(exercise => exercise.name.length > 0),
  };
};

const BrandMark = ({compact = false}: {compact?: boolean}) => (
  <div className={compact ? 'brand-mark brand-mark--compact' : 'brand-mark'}>
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="brandStrokeWeb" x1="12" y1="12" x2="52" y2="52">
          <stop offset="0" stopColor="#A6FF63" />
          <stop offset="1" stopColor="#3FD68C" />
        </linearGradient>
      </defs>

      <circle
        cx="32"
        cy="32"
        r="22"
        fill="none"
        stroke="rgba(166,255,99,0.16)"
        strokeWidth="2.5"
      />
      <path
        d="M22 41 L41 23"
        stroke="url(#brandStrokeWeb)"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <circle
        cx="19.5"
        cy="43.5"
        r="7"
        fill="none"
        stroke="url(#brandStrokeWeb)"
        strokeWidth="3.4"
      />
      <circle cx="19.5" cy="43.5" r="2.8" fill="#09110C" />
      <circle
        cx="44.5"
        cy="20.5"
        r="7"
        fill="none"
        stroke="url(#brandStrokeWeb)"
        strokeWidth="3.4"
      />
      <circle cx="44.5" cy="20.5" r="2.8" fill="#09110C" />
      <path
        d="M17 22 L27 31 L34 25 L46 36"
        fill="none"
        stroke="#4FCBFF"
        strokeWidth="3.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M41.5 35.5 H46 V31"
        fill="none"
        stroke="#4FCBFF"
        strokeWidth="3.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </div>
);

type WorkspaceDetailView =
  | {
      kind: 'exercise-progress';
      exerciseName: string;
      returnTo: WorkspaceView;
    }
  | {
      kind: 'training-session';
      workoutId: string;
      returnTo: WorkspaceView;
    }
  | null;

const normalizeToken = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

const formatDateInputValue = (value: string) => value.slice(0, 10);

function App() {
  const [authMode, setAuthMode] = useState<AuthMode>('signin');
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>('dashboard');
  const [user, setUser] = useState<User | null>(null);
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [dashboardSearch, setDashboardSearch] = useState('');
  const [workoutSearch, setWorkoutSearch] = useState('');
  const [historySearch, setHistorySearch] = useState('');
  const [detailView, setDetailView] = useState<WorkspaceDetailView>(null);
  const [workouts, setWorkouts] = useState<WorkoutDocument[]>([]);
  const [sessions, setSessions] = useState<WorkoutSessionDocument[]>([]);
  const [editorWorkout, setEditorWorkout] = useState<WorkoutDocument>(() =>
    createWorkoutDraft(),
  );
  const [trainingDrafts, setTrainingDrafts] = useState<TrainingDraftExercise[]>([]);
  const [trainingPerformedAt, setTrainingPerformedAt] = useState(
    formatDateInputValue(new Date().toISOString()),
  );
  const [trainingOverallNotes, setTrainingOverallNotes] = useState('');
  const backupInputRef = useRef<HTMLInputElement | null>(null);
  const trainingImportInputRef = useRef<HTMLInputElement | null>(null);

  const signInForm = useForm<z.infer<typeof signInSchema>>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const signUpForm = useForm<z.infer<typeof signUpSchema>>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const resetForm = useForm<z.infer<typeof resetSchema>>({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      email: '',
    },
  });

  useEffect(
    () =>
      observeAuthState(nextUser => {
        setUser(nextUser);

        if (!nextUser) {
          setWorkouts([]);
          setSessions([]);
          setEditorWorkout(createWorkoutDraft());
          setWorkspaceView('dashboard');
          setDetailView(null);
          setTrainingDrafts([]);
          setTrainingOverallNotes('');
          setTrainingPerformedAt(formatDateInputValue(new Date().toISOString()));
        }
      }),
    [],
  );

  useEffect(() => {
    const syncOnlineStatus = () => setIsOnline(window.navigator.onLine);

    window.addEventListener('online', syncOnlineStatus);
    window.addEventListener('offline', syncOnlineStatus);

    return () => {
      window.removeEventListener('online', syncOnlineStatus);
      window.removeEventListener('offline', syncOnlineStatus);
    };
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }

    const unsubscribeWorkouts = watchWorkouts(user.uid, setWorkouts);
    const unsubscribeSessions = watchRecentSessions(user.uid, setSessions);

    return () => {
      unsubscribeWorkouts();
      unsubscribeSessions();
    };
  }, [user]);

  const filteredWorkouts = useMemo(() => {
    return filterWorkoutsBySearch(workouts, workoutSearch);
  }, [workoutSearch, workouts]);

  const totalExercises = useMemo(
    () => workouts.reduce((sum, workout) => sum + workout.exercises.length, 0),
    [workouts],
  );

  const dashboardSnapshot = useMemo(
    () => buildDashboardSnapshot(workouts, sessions, dashboardSearch),
    [dashboardSearch, sessions, workouts],
  );
  const totalTrackedSets = dashboardSnapshot.totalTrackedSets;

  const filteredHistory = useMemo(
    () => filterSessionsBySearch(sessions, historySearch),
    [historySearch, sessions],
  );
  const exerciseProgress = useMemo<ExerciseProgressData | null>(
    () =>
      detailView?.kind === 'exercise-progress'
        ? buildExerciseProgressData(sessions, detailView.exerciseName)
        : null,
    [detailView, sessions],
  );
  const activeTrainingWorkout = useMemo(
    () =>
      detailView?.kind === 'training-session'
        ? workouts.find(workout => workout.id === detailView.workoutId) ?? null
        : null,
    [detailView, workouts],
  );

  const historyTotalVolume = useMemo(
    () => filteredHistory.reduce((sum, sessionItem) => sum + sessionItem.totalVolume, 0),
    [filteredHistory],
  );
  const progressChartPath = useMemo(
    () =>
      exerciseProgress
        ? buildSparklinePath(exerciseProgress.points.map(point => point.load))
        : '',
    [exerciseProgress],
  );
  const recentProgressPoints = useMemo(
    () => (exerciseProgress ? [...exerciseProgress.points].reverse().slice(0, 6) : []),
    [exerciseProgress],
  );

  const recentSessions = useMemo(() => sessions.slice(0, 5), [sessions]);

  const firstName = useMemo(() => {
    if (!user) {
      return 'Atleta';
    }

    return user.displayName?.trim().split(/\s+/)[0] || user.email?.split('@')[0] || 'Atleta';
  }, [user]);

  const accountProviderLabel = useMemo(() => {
    if (!user) {
      return 'Conta por e-mail';
    }

    const provider = getUserAuthProvider(user);

    if (provider === 'google') {
      return 'Conta Google';
    }

    if (provider === 'dev-local') {
      return 'Conta de teste';
    }

    return 'Conta por e-mail';
  }, [user]);

  const lastLoginLabel = useMemo(() => {
    if (!user?.metadata.lastSignInTime) {
      return 'Agora mesmo';
    }

    return new Date(user.metadata.lastSignInTime).toLocaleString('pt-BR');
  }, [user]);

  const editorTitle = workouts.some(item => item.id === editorWorkout.id)
    ? 'Refinar treino'
    : 'Criar treino';
  const dashboardSubtitle = dashboardSnapshot.lastSession
    ? `Última sessão: ${formatSessionDate(dashboardSnapshot.lastSession.performedAt)}`
    : 'Seu espaço está pronto para receber o primeiro treino.';
  const workspaceContent: Record<
    WorkspaceView,
    {eyebrow: string; title: string; description: string}
  > = {
    dashboard: {
      eyebrow: 'Dashboard',
      title: `Bem vindo, ${firstName}.`,
      description: dashboardSubtitle,
    },
    workouts: {
      eyebrow: 'Treinos',
      title: 'Biblioteca de treinos pronta para editar.',
      description:
        'Organize treinos, refine exercícios e mantenha sua estrutura pronta para a próxima sessão.',
    },
    history: {
      eyebrow: 'Histórico',
      title: 'Consulte tudo o que já foi executado.',
      description:
        'Revise volume, séries e observações das sessões já concluidas em um painel direto.',
    },
    profile: {
      eyebrow: 'Perfil',
      title: 'Seu espaço pessoal no LogGYM.',
      description:
        'Acompanhe sua conta, exporte backups, restaure cópias e importe treinos externos em um único lugar.',
    },
  };
  const detailContent =
    detailView?.kind === 'exercise-progress'
        ? {
            eyebrow: 'Exercício',
            title: detailView.exerciseName,
            description:
              exerciseProgress?.lastPerformedAt
              ? `Última execução: ${formatSessionDate(exerciseProgress.lastPerformedAt)}`
              : 'Sem histórico suficiente para este exercício.',
          }
      : detailView?.kind === 'training-session'
        ? {
            eyebrow: 'Execução',
            title: activeTrainingWorkout?.name ?? 'Iniciar treino',
            description: activeTrainingWorkout
              ? `${activeTrainingWorkout.focus} - ${activeTrainingWorkout.exercises.length} exercícios`
              : 'Selecione um treino para começar a registrar as séries.',
          }
        : null;
  const shellContent = detailContent ?? workspaceContent[workspaceView];
  const shouldShowHeroStatusChips = !detailView && workspaceView === 'profile';
  const shouldShowHeroTitle = Boolean(detailView) || workspaceView === 'dashboard';

  const modeContent = modeDescriptions[authMode];
  const isBusy = busyAction !== null;

  const clearFeedback = () => {
    setErrorMessage(null);
    setStatusMessage(null);
  };

  const handleGoogleLogin = async () => {
    clearFeedback();
    setBusyAction('google');

    try {
      await signInWithGooglePopup();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Não foi possível entrar agora.',
      );
    } finally {
      setBusyAction(null);
    }
  };

  const handleEmailLogin = signInForm.handleSubmit(async values => {
    clearFeedback();
    setBusyAction('signin');

    try {
      await signInWithEmailPassword(values.email, values.password);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Não foi possível entrar agora.',
      );
    } finally {
      setBusyAction(null);
    }
  });

  const handleSignUp = signUpForm.handleSubmit(async values => {
    clearFeedback();
    setBusyAction('signup');

    try {
      await signUpWithEmailPassword(values.name, values.email, values.password);
      signUpForm.reset();
      setAuthMode('signin');
      setStatusMessage('Conta criada. Agora sua área já está pronta para receber treinos.');
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Não foi possível criar sua conta.',
      );
    } finally {
      setBusyAction(null);
    }
  });

  const handleResetPassword = resetForm.handleSubmit(async values => {
    clearFeedback();
    setBusyAction('forgot');

    try {
      await sendResetPasswordEmail(values.email);
      resetForm.reset();
      setAuthMode('signin');
      setStatusMessage(
        'Se existir uma conta com esse e-mail, o link de redefinição foi enviado.',
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Não foi possível enviar o link agora.',
      );
    } finally {
      setBusyAction(null);
    }
  });

  const handleLogout = async () => {
    clearFeedback();
    setBusyAction('logout');

    try {
      await signOutFromPanel();
      setStatusMessage(null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Não foi possível sair da conta.',
      );
    } finally {
      setBusyAction(null);
    }
  };

  const handleRefreshData = async () => {
    if (!user) {
      return;
    }

    clearFeedback();
    setBusyAction('refresh');

    try {
      const data = await refreshWorkspaceData(user.uid);
      setWorkouts(data.workouts);
      setSessions(data.sessions);
      setStatusMessage('Dados atualizados com sucesso.');
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Não foi possível atualizar os dados agora.',
      );
    } finally {
      setBusyAction(null);
    }
  };

  const handleExportBackup = async () => {
    if (!user) {
      return;
    }

    clearFeedback();
    setBusyAction('export');

    try {
      const result = await exportBackupForCurrentUser(user);
      setStatusMessage(
        `${result.fileName} salvo com ${result.workouts} treinos, ${result.workoutSessions} sessões e ${result.sessionSets} séries.`,
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Não foi possível exportar seus treinos agora.',
      );
    } finally {
      setBusyAction(null);
    }
  };

  const handleStartBackupImport = () => {
    if (busyAction) {
      return;
    }

    const confirmed = window.confirm(
      'Isso vai substituir os treinos e o histórico atuais pelos dados do arquivo selecionado. Deseja continuar?',
    );

    if (!confirmed) {
      return;
    }

    backupInputRef.current?.click();
  };

  const handleBackupFileSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file || !user) {
      return;
    }

    clearFeedback();
    setBusyAction('backup-import');

    try {
      const result = await importBackupFileForCurrentUser(user, file);
      const refreshed = await refreshWorkspaceData(user.uid);
      setWorkouts(refreshed.workouts);
      setSessions(refreshed.sessions);
      setStatusMessage(
        `${result.workouts} treinos, ${result.workoutSessions} sessões e ${result.sessionSets} séries foram restaurados.`,
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Não foi possível restaurar sua cópia agora.',
      );
    } finally {
      setBusyAction(null);
    }
  };

  const handleTrainingFileSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file || !user) {
      return;
    }

    clearFeedback();
    setBusyAction('training-import');

    try {
      const result = await importTrainingFileForCurrentUser(user, file);
      const refreshed = await refreshWorkspaceData(user.uid);
      setWorkouts(refreshed.workouts);
      setSessions(refreshed.sessions);
      setStatusMessage(
        `${result.fileName} gerou ${result.workouts} treinos com ${result.exercises} exercícios prontos para uso.`,
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Não foi possível importar o arquivo agora.',
      );
    } finally {
      setBusyAction(null);
    }
  };

  const updateEditor = (field: keyof WorkoutDocument, value: string | null) => {
    setEditorWorkout(current => ({
      ...current,
      [field]: value,
    }));
  };

  const updateExercise = (
    exerciseId: string,
    field: keyof WorkoutExerciseInput,
    value: string,
  ) => {
    setEditorWorkout(current => ({
      ...current,
      exercises: current.exercises.map(exercise =>
        exercise.id === exerciseId ? {...exercise, [field]: value} : exercise,
      ),
    }));
  };

  const addExercise = () => {
    setEditorWorkout(current => ({
      ...current,
      exercises: [...current.exercises, createExerciseDraft()],
    }));
  };

  const removeExercise = (exerciseId: string) => {
    setEditorWorkout(current => ({
      ...current,
      exercises:
        current.exercises.length === 1
          ? current.exercises
          : current.exercises.filter(exercise => exercise.id !== exerciseId),
    }));
  };

  const resetEditor = () => {
    setEditorWorkout(createWorkoutDraft(user?.uid ?? ''));
    setWorkspaceView('workouts');
  };

  const handleSaveWorkout = async () => {
    if (!user) {
      return;
    }

    clearFeedback();
    setBusyAction('save-workout');

    try {
      const normalizedWorkout = normalizeWorkoutForSave(editorWorkout, user.uid);

      if (normalizedWorkout.name.length < 2) {
        throw new Error('Defina um nome mais claro para o treino.');
      }

      if (normalizedWorkout.exercises.length === 0) {
        throw new Error('Adicione pelo menos um exercício antes de salvar.');
      }

      await saveWorkoutFromPanel(user, normalizedWorkout);
      setStatusMessage('Treino salvo com sucesso.');
      setEditorWorkout(normalizedWorkout);
      setWorkspaceView('workouts');
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Não foi possível salvar o treino.',
      );
    } finally {
      setBusyAction(null);
    }
  };

  const handleEditWorkout = (workout: WorkoutDocument) => {
    clearFeedback();
    setWorkspaceView('workouts');
    setEditorWorkout({
      ...workout,
      scheduledDay: workout.scheduledDay ?? 'Livre',
      exercises: workout.exercises.length ? workout.exercises : [createExerciseDraft()],
    });
  };

  const handleDeleteWorkout = async (workoutId: string) => {
    if (!user) {
      return;
    }

    if (!window.confirm('Tem certeza que deseja excluir este treino?')) {
      return;
    }

    clearFeedback();
    setBusyAction(`delete-${workoutId}`);

    try {
      await deleteWorkoutFromPanel(user.uid, workoutId);

      if (editorWorkout.id === workoutId) {
        resetEditor();
      }

      setStatusMessage('Treino removido da sua rotina.');
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Não foi possível excluir o treino.',
      );
    } finally {
      setBusyAction(null);
    }
  };

  const handleSelectTab = (view: WorkspaceView) => {
    setDetailView(null);
    setWorkspaceView(view);
  };

  const openExerciseProgress = (exerciseName: string, returnTo: WorkspaceView) => {
    clearFeedback();
    setDetailView({
      kind: 'exercise-progress',
      exerciseName,
      returnTo,
    });
  };

  const openTrainingSession = (workout: WorkoutDocument, returnTo: WorkspaceView) => {
    clearFeedback();
    setTrainingDrafts(createTrainingDraftFromWorkout(workout));
    setTrainingOverallNotes('');
    setTrainingPerformedAt(formatDateInputValue(new Date().toISOString()));
    setDetailView({
      kind: 'training-session',
      workoutId: workout.id,
      returnTo,
    });
  };

  const closeDetailView = () => {
    if (!detailView) {
      return;
    }

    setDetailView(null);
    setWorkspaceView(detailView.returnTo);
  };

  const handleDeleteSession = async (sessionItem: WorkoutSessionDocument) => {
    if (!user) {
      return;
    }

    const confirmed = window.confirm(
      `Excluir a execução ${sessionItem.workoutName} de ${formatSessionDate(
        sessionItem.performedAt,
      )}?`,
    );

    if (!confirmed) {
      return;
    }

    clearFeedback();
    setBusyAction(`delete-session-${sessionItem.id}`);

    try {
      await deleteSessionFromPanel(user.uid, sessionItem.id);
      setStatusMessage('Execução removida do histórico.');
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Não foi possível excluir a execução.',
      );
    } finally {
      setBusyAction(null);
    }
  };

  const handleSaveTrainingSession = async () => {
    if (!user || !activeTrainingWorkout) {
      return;
    }

    clearFeedback();
    setBusyAction('save-session');

    try {
      const sessionDocument = buildTrainingSessionDocument({
        userId: user.uid,
        workout: activeTrainingWorkout,
        performedAt: trainingPerformedAt,
        overallNotes: trainingOverallNotes,
        exercises: trainingDrafts,
      });

      await saveTrainingSessionFromPanel(user.uid, sessionDocument);
      setStatusMessage('Execução salva com sucesso.');
      setDetailView(null);
      setWorkspaceView('history');
      setHistorySearch('');
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Não foi possível salvar a execução.',
      );
    } finally {
      setBusyAction(null);
    }
  };

  const getHistorySecondaryText = (sessionItem: WorkoutSessionDocument) => {
    const normalizedWorkoutName = normalizeToken(sessionItem.workoutName);
    const normalizedFocus = normalizeToken(sessionItem.focus);
    const dateLabel = formatSessionDate(sessionItem.performedAt);

    if (!sessionItem.focus || normalizedWorkoutName === normalizedFocus) {
      return dateLabel;
    }

    return `${sessionItem.focus} - ${dateLabel}`;
  };

  const renderDashboardWorkspace = () => (
    <>
      <section className="workspace-metrics workspace-metrics--dashboard">
        <button
          type="button"
          className="metric-card metric-card--action"
          onClick={() => handleSelectTab('history')}>
          <span>Semana</span>
          <strong>{dashboardSnapshot.weeklySessions}</strong>
          <small>Sessões registradas</small>
        </button>
        <button
          type="button"
          className="metric-card metric-card--action"
          onClick={() => handleSelectTab('history')}>
          <span>Sets</span>
          <strong>{formatCompactNumber(dashboardSnapshot.totalTrackedSets)}</strong>
          <small>Sessões salvas</small>
        </button>
        <button
          type="button"
          className="metric-card metric-card--action"
          onClick={() => handleSelectTab('workouts')}>
          <span>Templates</span>
          <strong>{dashboardSnapshot.totalTemplates}</strong>
          <small>Treinos ativos</small>
        </button>
        <button
          type="button"
          className="metric-card metric-card--action"
          onClick={() => handleSelectTab('history')}>
          <span>Histórico</span>
          <strong>{dashboardSnapshot.totalSessions}</strong>
          <small>execuções totais</small>
        </button>
      </section>

      <section className="dashboard-layout">
        <div className="column-panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Buscar treinos</p>
              <h2>{dashboardSearch.trim() ? 'Resultados da busca' : 'Treinos em foco'}</h2>
            </div>

            <label className="search-box">
              <Search size={16} />
              <input
                placeholder="Nome, foco ou anotação"
                value={dashboardSearch}
                onChange={event => setDashboardSearch(event.target.value)}
              />
            </label>
          </div>

          <p className="editor-support">
            {dashboardSearch.trim()
              ? 'Toque em um treino para abrir o editor ou limpar a busca.'
              : 'Os treinos mais recentes ficam sempre prontos para consulta rapida.'}
          </p>

          <div className="workout-list">
            {dashboardSnapshot.highlightedWorkouts.length ? (
              dashboardSnapshot.highlightedWorkouts.map(workout => (
                <article className="workout-card" key={workout.id}>
                  <div
                    className="workout-accent"
                    style={{
                      background: `linear-gradient(180deg, ${workout.accentColor}, transparent)`,
                    }}
                  />

                  <div className="workout-card-top">
                    <div>
                      <strong>{workout.name}</strong>
                      <p>
                        {workout.focus} - {workout.exercises.length} exercícios
                      </p>
                    </div>
                    <ChevronRight size={18} />
                  </div>

                  <p className="workout-notes">
                    {workout.notes || 'Sem observações extras para este treino.'}
                  </p>

                  <div className="chip-row">
                    <span className="soft-chip">
                      <CalendarDays size={14} />
                      {workout.scheduledDay || 'Livre'}
                    </span>
                    <span className="soft-chip">
                      <Clock3 size={14} />
                      Atualizado {formatSessionDate(workout.updatedAt)}
                    </span>
                  </div>

                  <div className="card-actions">
                    <button
                      type="button"
                      className="primary-button"
                      onClick={() => openTrainingSession(workout, 'dashboard')}>
                      <Play size={16} />
                      Iniciar treino
                    </button>
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => handleEditWorkout(workout)}>
                      <PencilLine size={16} />
                      Abrir no editor
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <div className="empty-card">
                {dashboardSearch.trim()
                  ? 'Nenhum treino encontrado para esta busca.'
                  : 'Crie seu primeiro treino para montar o dashboard.'}
              </div>
            )}
          </div>
        </div>

        <div className="dashboard-insights">
          <div className="column-panel">
            <div className="panel-head secondary">
              <div>
                <p className="eyebrow">Recordes</p>
                <h2>Cargas máximas observadas</h2>
              </div>
            </div>

            <div className="dashboard-mini-grid">
              {dashboardSnapshot.personalRecords.length ? (
                dashboardSnapshot.personalRecords.map(record => (
                  <button
                    key={record.exerciseName}
                    type="button"
                    className="dashboard-mini-card"
                    onClick={() => openExerciseProgress(record.exerciseName, 'dashboard')}>
                    <span>{record.exerciseName}</span>
                    <strong>{formatLoad(record.maxLoad)}</strong>
                  </button>
                ))
              ) : (
                <div className="empty-card">
                  Registre sessões para liberar os recordes do seu histórico.
                </div>
              )}
            </div>
          </div>

          <div className="column-panel">
            <div className="panel-head secondary">
              <div>
                <p className="eyebrow">Exercícios recentes</p>
                <h2>Atividade mais recente do histórico</h2>
              </div>
            </div>

            <div className="dashboard-mini-list">
              {dashboardSnapshot.recentExercises.length ? (
                dashboardSnapshot.recentExercises.map(item => (
                  <button
                    key={item.exerciseName}
                    type="button"
                    className="dashboard-activity-card"
                    onClick={() => openExerciseProgress(item.exerciseName, 'dashboard')}>
                    <div className="dashboard-activity-head">
                      <strong>{item.exerciseName}</strong>
                      <span className="soft-chip soft-chip--accent">{formatLoad(item.maxLoad)}</span>
                    </div>
                    <p>
                      {item.totalSets} séries - {formatSessionDate(item.lastPerformedAt)}
                    </p>
                  </button>
                ))
              ) : (
                <div className="empty-card">
                  Assim que você concluir treinos, os exercícios recentes aparecem aqui.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );

  const renderWorkoutsWorkspace = () => (
    <>
      <section className="workspace-metrics">
        <article className="metric-card">
          <span>Treinos ativos</span>
          <strong>{workouts.length}</strong>
          <small>Biblioteca pronta para a semana.</small>
        </article>
        <article className="metric-card">
          <span>Exercícios no plano</span>
          <strong>{totalExercises}</strong>
          <small>Distribuidos entre todas as rotinas.</small>
        </article>
        <article className="metric-card">
          <span>Últimas séries</span>
          <strong>{totalTrackedSets}</strong>
          <small>Volume recente registrado na sua conta.</small>
        </article>
      </section>

      <section className="workspace-grid">
        <div className="column-panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Biblioteca</p>
              <h2>Seus treinos</h2>
            </div>

            <label className="search-box">
              <Search size={16} />
              <input
                placeholder="Buscar treino, foco ou exercício"
                value={workoutSearch}
                onChange={event => setWorkoutSearch(event.target.value)}
              />
            </label>
          </div>

          <div className="workout-list">
            {filteredWorkouts.length ? (
              filteredWorkouts.map(workout => (
                <article className="workout-card" key={workout.id}>
                  <div
                    className="workout-accent"
                    style={{
                      background: `linear-gradient(180deg, ${workout.accentColor}, transparent)`,
                    }}
                  />

                  <div className="workout-card-top">
                    <div>
                      <strong>{workout.name}</strong>
                      <p>
                        {workout.focus} - {workout.exercises.length} exercícios
                      </p>
                    </div>
                    <ChevronRight size={18} />
                  </div>

                  <p className="workout-notes">
                    {workout.notes || 'Sem observações extras para este treino.'}
                  </p>

                  <div className="chip-row">
                    <span className="soft-chip">
                      <CalendarDays size={14} />
                      {workout.scheduledDay || 'Livre'}
                    </span>
                    <span className="soft-chip">
                      <Clock3 size={14} />
                      Atualizado {new Date(workout.updatedAt).toLocaleDateString('pt-BR')}
                    </span>
                  </div>

                  <div className="card-actions">
                    <button
                      type="button"
                      className="primary-button"
                      onClick={() => openTrainingSession(workout, 'workouts')}>
                      <Play size={16} />
                      Iniciar treino
                    </button>
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => handleEditWorkout(workout)}>
                      <PencilLine size={16} />
                      Editar
                    </button>
                    <button
                      type="button"
                      className="danger-button"
                      disabled={busyAction === `delete-${workout.id}`}
                      onClick={() => handleDeleteWorkout(workout.id)}>
                      {busyAction === `delete-${workout.id}` ? (
                        <LoaderCircle className="spin" size={16} />
                      ) : (
                        <Trash2 size={16} />
                      )}
                      Excluir
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <div className="empty-card">
                Sua biblioteca ainda esta vazia. Crie o primeiro treino para comecar.
              </div>
            )}
          </div>

          <div className="panel-head secondary">
            <div>
              <p className="eyebrow">Movimento recente</p>
              <h2>Últimas sessões</h2>
            </div>
          </div>

          <div className="session-list">
            {recentSessions.length ? (
              recentSessions.map(sessionItem => (
                <article className="session-card" key={sessionItem.id}>
                  <div className="session-card-top">
                    <strong>{sessionItem.workoutName}</strong>
                    <span>{new Date(sessionItem.performedAt).toLocaleDateString('pt-BR')}</span>
                  </div>
                  <p>
                    {sessionItem.totalSets} séries - pico de {formatLoad(sessionItem.topLoad)}
                  </p>
                </article>
              ))
            ) : (
              <div className="empty-card">
                Suas últimas sessões vão aparecer aqui assim que você concluir treinos.
              </div>
            )}
          </div>
        </div>

        <div className="column-panel editor">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Editor</p>
              <h2>{editorTitle}</h2>
            </div>
            <button type="button" className="ghost-button" onClick={resetEditor}>
              Limpar
            </button>
          </div>

          <p className="editor-support">
            Preencha o essencial e refine os detalhes na ordem que fizer mais sentido para você.
          </p>

          <div className="editor-grid">
            <label>
              <span>Nome do treino</span>
              <input
                value={editorWorkout.name}
                onChange={event => updateEditor('name', event.target.value)}
                placeholder="Ex: Upper forte"
              />
            </label>
            <label>
              <span>Foco</span>
              <input
                value={editorWorkout.focus}
                onChange={event => updateEditor('focus', event.target.value)}
                placeholder="Ex: Peito, Costas, Pernas"
              />
            </label>
            <label>
              <span>Dia sugerido</span>
              <select
                value={editorWorkout.scheduledDay ?? 'Livre'}
                onChange={event => updateEditor('scheduledDay', event.target.value || 'Livre')}>
                {weekdayOptions.map(option => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <div>
              <span>Cor do treino</span>
              <div className="accent-palette">
                {accentPalette.map(color => (
                  <button
                    key={color}
                    type="button"
                    className={
                      editorWorkout.accentColor === color
                        ? 'color-swatch active'
                        : 'color-swatch'
                    }
                    style={{background: color}}
                    onClick={() => updateEditor('accentColor', color)}
                    aria-label={`Selecionar cor ${color}`}
                  />
                ))}
              </div>
            </div>
          </div>

          <label className="stacked-field">
            <span>Notas</span>
            <textarea
              value={editorWorkout.notes}
              onChange={event => updateEditor('notes', event.target.value)}
              placeholder="Observações que ajudam durante a execução."
              rows={4}
            />
          </label>

          <div className="exercise-head">
            <div>
              <p className="eyebrow">Estrutura</p>
              <h3>Exercícios do treino</h3>
            </div>
            <button type="button" className="ghost-button" onClick={addExercise}>
              <Plus size={16} />
              Adicionar exercício
            </button>
          </div>

          <div className="exercise-stack">
            {editorWorkout.exercises.map((exercise, index) => (
              <article className="exercise-card" key={exercise.id}>
                <div className="exercise-card-head">
                  <strong>Exercício {index + 1}</strong>
                  {editorWorkout.exercises.length > 1 ? (
                    <button
                      type="button"
                      className="danger-button subtle"
                      onClick={() => removeExercise(exercise.id)}>
                      <Trash2 size={14} />
                      Remover
                    </button>
                  ) : null}
                </div>

                <div className="editor-grid">
                  <label>
                    <span>Nome</span>
                    <input
                      value={exercise.name}
                      onChange={event => updateExercise(exercise.id, 'name', event.target.value)}
                      placeholder="Ex: Supino inclinado"
                    />
                  </label>
                  <label>
                    <span>Grupo / tipo</span>
                    <input
                      value={exercise.muscleGroup}
                      onChange={event =>
                        updateExercise(exercise.id, 'muscleGroup', event.target.value)
                      }
                      placeholder="Ex: Peito"
                    />
                  </label>
                  <label>
                    <span>Carga</span>
                    <input
                      value={exercise.baseLoad}
                      onChange={event =>
                        updateExercise(exercise.id, 'baseLoad', event.target.value)
                      }
                      placeholder="Ex: 20 kg"
                    />
                  </label>
                  <label>
                    <span>Faixa de reps</span>
                    <input
                      value={exercise.targetReps}
                      onChange={event =>
                        updateExercise(exercise.id, 'targetReps', event.target.value)
                      }
                      placeholder="Ex: 8-10"
                    />
                  </label>
                </div>

                <label className="stacked-field">
                  <span>Observacao</span>
                  <textarea
                    value={exercise.note}
                    onChange={event => updateExercise(exercise.id, 'note', event.target.value)}
                    rows={3}
                    placeholder="Dicas curtas para a execução."
                  />
                </label>
              </article>
            ))}
          </div>

          <button
            type="button"
            className="primary-button wide"
            disabled={busyAction === 'save-workout'}
            onClick={handleSaveWorkout}>
            {busyAction === 'save-workout' ? (
              <LoaderCircle className="spin" size={16} />
            ) : (
              <Mail size={16} />
            )}
            Salvar treino
          </button>
        </div>
      </section>
    </>
  );

  const renderHistoryWorkspace = () => (
    <section className="history-layout">
      <div className="column-panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Histórico</p>
            <h2>Treinos salvos</h2>
          </div>

          <label className="search-box">
            <Search size={20} />
            <input
              placeholder="Supino, legs, upper..."
              value={historySearch}
              onChange={event => setHistorySearch(event.target.value)}
            />
          </label>
        </div>

        <div className="history-summary">
          <strong>{filteredHistory.length} - sessões</strong>
          <p>{formatVolume(historyTotalVolume)} de volume total</p>
        </div>

        <div className="session-list session-list--history">
          {filteredHistory.length ? (
            filteredHistory.map(sessionItem => (
              <article className="session-card session-card--history" key={sessionItem.id}>
                <div className="session-card-top session-card-top--history">
                  <div className="session-card-copy">
                    <strong>{sessionItem.workoutName}</strong>
                    <span>{getHistorySecondaryText(sessionItem)}</span>
                  </div>

                  <div className="history-card-actions">
                    <strong>{formatLoad(sessionItem.topLoad)}</strong>
                    <button
                      type="button"
                      className="danger-button subtle"
                      disabled={busyAction === `delete-session-${sessionItem.id}`}
                      onClick={() => handleDeleteSession(sessionItem)}>
                      {busyAction === `delete-session-${sessionItem.id}` ? (
                        <LoaderCircle className="spin" size={16} />
                      ) : (
                        <Trash2 size={16} />
                      )}
                      Excluir
                    </button>
                  </div>
                </div>

                <p>
                  {sessionItem.totalSets} séries - {formatVolume(sessionItem.totalVolume)}
                </p>

                {sessionItem.overallNotes ? (
                  <p className="session-card-note">{sessionItem.overallNotes}</p>
                ) : null}

                <div className="chip-row">
                  {sessionItem.exercises.map(exercise => (
                    <button
                      key={`${sessionItem.id}-${exercise.exerciseName}`}
                      type="button"
                      className="soft-chip soft-chip--button"
                      onClick={() => openExerciseProgress(exercise.exerciseName, 'history')}>
                      {exercise.exerciseName}
                    </button>
                  ))}
                </div>
              </article>
            ))
          ) : (
            <div className="empty-card">
              Sem execuções para mostrar. Conclua um treino para preencher o histórico.
            </div>
          )}
        </div>
      </div>
    </section>
  );

  const renderExerciseProgressWorkspace = () => (
    <section className="exercise-progress-layout">
      {!exerciseProgress ? (
        <div className="empty-card">
          Sem histórico suficiente para este exercício. Assim que você registrar séries, os
          indicadores aparecem aqui.
        </div>
      ) : (
        <>
          <section className="workspace-metrics">
            <article className="metric-card">
              <span>Recorde</span>
              <strong>{formatLoad(exerciseProgress.recordLoad)}</strong>
              <small>maior carga registrada</small>
            </article>
            <article className="metric-card">
              <span>Reps medias</span>
              <strong>{exerciseProgress.averageReps.toFixed(1)}</strong>
              <small>média por série</small>
            </article>
            <article className="metric-card">
              <span>Volume</span>
              <strong>{formatVolume(exerciseProgress.totalVolume)}</strong>
              <small>soma de carga x repeticoes</small>
            </article>
          </section>

          <section className="exercise-progress-grid">
            <div className="column-panel">
              <div className="panel-head secondary">
                <div>
                  <p className="eyebrow">Curva de carga</p>
                  <h2>Progresso recente</h2>
                </div>
              </div>

              <div className="progress-chart-card">
                <div className="progress-chart-head">
                  <BarChart3 size={18} />
                  <span>Cargas registradas por série</span>
                </div>
                <svg viewBox="0 0 640 140" className="progress-chart" aria-hidden="true">
                  <path d={progressChartPath} className="progress-chart-line" />
                </svg>
              </div>
            </div>

            <div className="column-panel">
              <div className="panel-head secondary">
                <div>
                  <p className="eyebrow">Últimas séries</p>
                  <h2>Comparativo recente</h2>
                </div>
              </div>

              <div className="progress-point-list">
                {recentProgressPoints.map(point => (
                  <article
                    className="progress-point-card"
                    key={`${point.workoutName}-${point.performedAt}-${point.load}-${point.reps}`}>
                    <div className="progress-point-head">
                      <strong>{point.workoutName}</strong>
                      <span>{formatLoad(point.load)}</span>
                    </div>
                    <p>
                      {point.reps} reps - {formatSessionDate(point.performedAt)}
                    </p>
                    {point.note ? <small>{point.note}</small> : null}
                  </article>
                ))}
              </div>
            </div>
          </section>
        </>
      )}
    </section>
  );

  const renderTrainingSessionWorkspace = () => (
    <section className="training-session-layout">
      {!activeTrainingWorkout ? (
        <div className="empty-card">
          Não foi possível carregar o treino para execução.
        </div>
      ) : (
        <div className="column-panel training-session-panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Sessão</p>
              <h2>{activeTrainingWorkout.name}</h2>
            </div>

            <label className="training-date-field">
              <span>Data</span>
              <input
                type="date"
                value={trainingPerformedAt}
                onChange={event => setTrainingPerformedAt(event.target.value)}
              />
            </label>
          </div>

          <p className="editor-support">
            {activeTrainingWorkout.focus} - {activeTrainingWorkout.exercises.length} exercícios
          </p>

          <label className="stacked-field">
            <span>Notas gerais da execução</span>
            <textarea
              value={trainingOverallNotes}
              onChange={event => setTrainingOverallNotes(event.target.value)}
              rows={4}
              placeholder="Como o treino se comportou hoje?"
            />
          </label>

          <div className="exercise-stack">
            {trainingDrafts.map((exercise, exerciseIndex) => (
              <article className="exercise-card training-exercise-card" key={exercise.workoutExerciseId}>
                <div className="exercise-card-head">
                  <div>
                    <strong>{exercise.exerciseName}</strong>
                    <p className="exercise-meta-text">
                      {exercise.muscleGroup} - alvo {exercise.targetReps}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() =>
                      setTrainingDrafts(current => addDraftSet(current, exerciseIndex))
                    }>
                    <Plus size={16} />
                    Nova série
                  </button>
                </div>

                {exercise.hint ? <p className="training-support-text">{exercise.hint}</p> : null}
                {exercise.baseLoad ? (
                  <p className="training-support-text training-support-text--accent">
                    Carga sugerida: {exercise.baseLoad}
                  </p>
                ) : null}

                <div className="training-set-stack">
                  {exercise.sets.map((setItem, setIndex) => (
                    <div
                      className="training-set-card"
                      key={`${exercise.workoutExerciseId}-${setIndex}`}>
                      <div className="exercise-card-head">
                        <strong>Série {setIndex + 1}</strong>
                        <button
                          type="button"
                          className="danger-button subtle"
                          onClick={() =>
                            setTrainingDrafts(current =>
                              removeDraftSet(current, exerciseIndex, setIndex),
                            )
                          }>
                          <Trash2 size={14} />
                          Remover
                        </button>
                      </div>

                      <div className="editor-grid">
                        <label>
                          <span>Carga</span>
                          <input
                            value={setItem.load}
                            onChange={event =>
                              setTrainingDrafts(current =>
                                updateDraftSet(
                                  current,
                                  exerciseIndex,
                                  setIndex,
                                  'load',
                                  event.target.value,
                                ),
                              )
                            }
                            placeholder="0"
                          />
                        </label>
                        <label>
                          <span>Reps</span>
                          <input
                            value={setItem.reps}
                            onChange={event =>
                              setTrainingDrafts(current =>
                                updateDraftSet(
                                  current,
                                  exerciseIndex,
                                  setIndex,
                                  'reps',
                                  event.target.value,
                                ),
                              )
                            }
                            placeholder="0"
                          />
                        </label>
                      </div>

                      <label className="stacked-field">
                        <span>Anotação da série</span>
                        <textarea
                          value={setItem.note}
                          onChange={event =>
                            setTrainingDrafts(current =>
                              updateDraftSet(
                                current,
                                exerciseIndex,
                                setIndex,
                                'note',
                                event.target.value,
                              ),
                            )
                          }
                          rows={3}
                          placeholder="Ex: última repetição travou."
                        />
                      </label>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>

          <button
            type="button"
            className="primary-button wide"
            disabled={busyAction === 'save-session'}
            onClick={handleSaveTrainingSession}>
            {busyAction === 'save-session' ? (
              <LoaderCircle className="spin" size={16} />
            ) : (
              <Play size={16} />
            )}
            {busyAction === 'save-session' ? 'Salvando execução...' : 'Salvar execução'}
          </button>
        </div>
      )}
    </section>
  );

  const renderProfileWorkspace = () => (
    <section className="profile-layout">
      <div className="profile-card">
        {user?.photoURL ? (
          <img src={user.photoURL} alt={user.displayName ?? 'Perfil'} className="profile-avatar" />
        ) : (
          <div className="profile-avatar profile-avatar--fallback">
            {(user?.displayName ?? user?.email ?? 'L').slice(0, 1).toUpperCase()}
          </div>
        )}

        <div className="profile-copy">
          <strong>{user?.displayName?.trim() || user?.email || 'Atleta'}</strong>
          <p>{user?.email}</p>
          <span>Último login {lastLoginLabel}</span>
        </div>
      </div>

      <div className="chip-row">
        <span className="soft-chip soft-chip--accent">
          {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
          {isOnline ? 'Online' : 'Offline'}
        </span>
        <span className="soft-chip">
          <UserRound size={14} />
          {accountProviderLabel}
        </span>
      </div>

      <div className="profile-section-head">
        <div>
          <p className="eyebrow">Seu resumo</p>
          <h2>Visao geral do que já está salvo</h2>
        </div>
      </div>

      <div className="profile-summary-card">
        <p>{workouts.length} Treinos ativos</p>
        <p>{sessions.length} sessões no histórico</p>
        <p>{totalTrackedSets} séries registradas</p>
      </div>

      <div className="profile-network-card">
        {isOnline ? <Wifi size={18} /> : <WifiOff size={18} />}
        <p>
          {isOnline
            ? 'Tudo certo para continuar usando o app e manter seus treinos sincronizados.'
            : 'Sem internet no momento. O que já está salvo continua visível e volta a sincronizar quando a conexão retornar.'}
        </p>
      </div>

      <div className="profile-section-head">
        <div>
          <p className="eyebrow">Sua cópia dos treinos</p>
          <h2>Guarde ou recupere seus dados quando precisar</h2>
        </div>
      </div>

      <div className="profile-info-card">
        <strong>Backup manual</strong>
        <p>
          Exporte um arquivo com seus treinos, exercícios, sessões e séries para manter uma cópia
          segura fora do app.
        </p>
        <span>Ao restaurar, somente a conta atual pode usar esse arquivo.</span>
      </div>

      <div className="profile-action-stack">
        <button
          type="button"
          className="secondary-button wide"
          disabled={!user || isBusy}
          onClick={handleExportBackup}>
          {busyAction === 'export' ? (
            <LoaderCircle className="spin" size={16} />
          ) : (
            <Download size={16} />
          )}
          {busyAction === 'export' ? 'Salvando cópia...' : 'Exportar cópia'}
        </button>

        <button
          type="button"
          className="secondary-button wide"
          disabled={!user || isBusy}
          onClick={handleStartBackupImport}>
          {busyAction === 'backup-import' ? (
            <LoaderCircle className="spin" size={16} />
          ) : (
            <Upload size={16} />
          )}
          {busyAction === 'backup-import' ? 'Restaurando cópia...' : 'Importar cópia'}
        </button>
      </div>

      <div className="profile-section-head">
        <div>
          <p className="eyebrow">Importar treino externo</p>
          <h2>Converta texto ou planilha em treinos prontos no app</h2>
        </div>
      </div>

      <div className="profile-info-card">
        <strong>Arquivos aceitos</strong>
        <p>
          Importe arquivos .txt, .csv, .xls ou .xlsx com colunas como Treino, Exercício, Carga,
          Repetições, Dia e Cor.
        </p>
        <span>O LogGYM organiza o conteúdo em estrutura de treino e ignora blocos vazios.</span>
      </div>

      <div className="profile-action-stack">
        <button
          type="button"
          className="secondary-button wide"
          disabled={!user || isBusy}
          onClick={() => trainingImportInputRef.current?.click()}>
          {busyAction === 'training-import' ? (
            <LoaderCircle className="spin" size={16} />
          ) : (
            <FileUp size={16} />
          )}
          {busyAction === 'training-import'
            ? 'Importando treino...'
            : 'Importar treino de arquivo'}
        </button>

        <button
          type="button"
          className="secondary-button wide"
          disabled={!user || isBusy}
          onClick={handleRefreshData}>
          {busyAction === 'refresh' ? (
            <LoaderCircle className="spin" size={16} />
          ) : (
            <RefreshCw size={16} />
          )}
          {busyAction === 'refresh' ? 'Atualizando dados...' : 'Atualizar dados'}
        </button>

        <button
          type="button"
          className="danger-button wide"
          disabled={!user || isBusy}
          onClick={handleLogout}>
          {busyAction === 'logout' ? (
            <LoaderCircle className="spin" size={16} />
          ) : (
            <LogOut size={16} />
          )}
          Sair
        </button>
      </div>

      <input
        ref={backupInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden-file-input"
        onChange={handleBackupFileSelected}
      />
      <input
        ref={trainingImportInputRef}
        type="file"
        accept=".txt,.csv,.xls,.xlsx,text/plain,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="hidden-file-input"
        onChange={handleTrainingFileSelected}
      />
    </section>
  );

  return (
    <div className={user ? 'panel-shell panel-shell--workspace' : 'panel-shell panel-shell--auth'}>
      {user ? (
        <main className="workspace-panel">
          <section className="workspace-hero">
            <div className="workspace-hero-copy">
              {workspaceView === 'dashboard' && !detailView ? (
                <div className="brand-lockup brand-lockup--dashboard">
                  <div className="brand-lockup-row">
                    <BrandMark compact />
                    <p className="eyebrow">{shellContent.eyebrow}</p>
                  </div>
                  <h1>{shellContent.title}</h1>
                </div>
              ) : (
                <div className="brand-lockup">
                  <BrandMark compact />
                  <div className="brand-copy">
                    <p className="eyebrow">{shellContent.eyebrow}</p>
                    {shouldShowHeroTitle ? <h1>{shellContent.title}</h1> : null}
                  </div>
                </div>
              )}

              <p className="hero-copy">{shellContent.description}</p>

              {shouldShowHeroStatusChips ? (
                <div className="chip-row">
                  <span className="soft-chip soft-chip--accent">
                    {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
                    {isOnline ? 'Online' : 'Offline'}
                  </span>
                  <span className="soft-chip">
                    <UserRound size={14} />
                    {accountProviderLabel}
                  </span>
                </div>
              ) : null}
            </div>

            <div className="header-actions">
              {detailView ? (
                <button className="ghost-button" type="button" onClick={closeDetailView}>
                  <ArrowLeft size={16} />
                  Voltar
                </button>
              ) : workspaceView === 'workouts' ? (
                <button className="ghost-button" type="button" onClick={resetEditor}>
                  <Plus size={16} />
                  Novo treino
                </button>
              ) : (
                <button
                  className="ghost-button"
                  type="button"
                  disabled={busyAction === 'refresh'}
                  onClick={handleRefreshData}>
                  {busyAction === 'refresh' ? (
                    <LoaderCircle className="spin" size={16} />
                  ) : (
                    <RefreshCw size={16} />
                  )}
                  Atualizar dados
                </button>
              )}
              <button
                className="secondary-button"
                type="button"
                disabled={busyAction === 'logout'}
                onClick={handleLogout}>
                {busyAction === 'logout' ? (
                  <LoaderCircle className="spin" size={16} />
                ) : (
                  <LogOut size={16} />
                )}
                Sair
              </button>
            </div>
          </section>

          {errorMessage ? <div className="feedback error">{errorMessage}</div> : null}
          {statusMessage ? <div className="feedback success">{statusMessage}</div> : null}

          {!detailView ? (
            <nav className="workspace-tabs" aria-label="Navegacao do painel">
              <button
                type="button"
                className={workspaceView === 'dashboard' ? 'tab-chip active' : 'tab-chip'}
                onClick={() => handleSelectTab('dashboard')}>
                Dashboard
              </button>
              <button
                type="button"
                className={workspaceView === 'workouts' ? 'tab-chip active' : 'tab-chip'}
                onClick={() => handleSelectTab('workouts')}>
                Treinos
              </button>
              <button
                type="button"
                className={workspaceView === 'history' ? 'tab-chip active' : 'tab-chip'}
                onClick={() => handleSelectTab('history')}>
                Histórico
              </button>
              <button
                type="button"
                className={workspaceView === 'profile' ? 'tab-chip active' : 'tab-chip'}
                onClick={() => handleSelectTab('profile')}>
                Perfil
              </button>
            </nav>
          ) : null}

          {detailView?.kind === 'exercise-progress'
            ? renderExerciseProgressWorkspace()
            : detailView?.kind === 'training-session'
              ? renderTrainingSessionWorkspace()
              : workspaceView === 'dashboard'
                ? renderDashboardWorkspace()
                : workspaceView === 'workouts'
                  ? renderWorkoutsWorkspace()
                  : workspaceView === 'history'
                    ? renderHistoryWorkspace()
                    : renderProfileWorkspace()}
        </main>
      ) : (
        <main className="auth-stage">
          <section className="auth-panel">
            <div className="auth-head">
              <div className="auth-brand">
                <BrandMark compact />
                <div>
                  <p className="eyebrow">LogGYM</p>
                  <h2>{modeContent.title}</h2>
                </div>
              </div>
              <p className="support-copy">{modeContent.description}</p>
            </div>

            {errorMessage ? <div className="feedback error">{errorMessage}</div> : null}
            {statusMessage ? <div className="feedback success">{statusMessage}</div> : null}

            <div className="auth-tabs">
              {(Object.keys(modeLabels) as AuthMode[]).map(mode => (
                <button
                  key={mode}
                  className={authMode === mode ? 'tab-chip active' : 'tab-chip'}
                  type="button"
                  onClick={() => setAuthMode(mode)}>
                  {modeLabels[mode]}
                </button>
              ))}
            </div>

            <button
              className="primary-button wide"
              type="button"
              disabled={busyAction === 'google'}
              onClick={handleGoogleLogin}>
              {busyAction === 'google' ? (
                <LoaderCircle className="spin" size={16} />
              ) : (
                <Sparkles size={16} />
              )}
              Entrar com Google
            </button>

            <div className="auth-divider">
              <span>ou siga com e-mail</span>
            </div>

            {authMode === 'signin' ? (
              <form className="auth-form" onSubmit={handleEmailLogin}>
                <label>
                  <span>E-mail</span>
                  <input placeholder="você@exemplo.com" {...signInForm.register('email')} />
                  <small>{signInForm.formState.errors.email?.message}</small>
                </label>
                <label>
                  <span>Senha</span>
                  <input
                    type="password"
                    placeholder="Sua senha"
                    {...signInForm.register('password')}
                  />
                  <small>{signInForm.formState.errors.password?.message}</small>
                </label>
                <button className="secondary-button wide" type="submit">
                  {busyAction === 'signin' ? (
                    <LoaderCircle className="spin" size={16} />
                  ) : (
                    <Mail size={16} />
                  )}
                  {modeContent.actionLabel}
                </button>
              </form>
            ) : null}

            {authMode === 'signup' ? (
              <form className="auth-form" onSubmit={handleSignUp}>
                <label>
                  <span>Nome</span>
                  <input placeholder="Seu nome" {...signUpForm.register('name')} />
                  <small>{signUpForm.formState.errors.name?.message}</small>
                </label>
                <label>
                  <span>E-mail</span>
                  <input placeholder="você@exemplo.com" {...signUpForm.register('email')} />
                  <small>{signUpForm.formState.errors.email?.message}</small>
                </label>
                <label>
                  <span>Senha</span>
                  <input
                    type="password"
                    placeholder="Mínimo de 8 caracteres"
                    {...signUpForm.register('password')}
                  />
                  <small>{signUpForm.formState.errors.password?.message}</small>
                </label>
                <label>
                  <span>Confirmar senha</span>
                  <input
                    type="password"
                    placeholder="Repita a senha"
                    {...signUpForm.register('confirmPassword')}
                  />
                  <small>{signUpForm.formState.errors.confirmPassword?.message}</small>
                </label>
                <button className="secondary-button wide" type="submit">
                  {busyAction === 'signup' ? (
                    <LoaderCircle className="spin" size={16} />
                  ) : (
                    <Plus size={16} />
                  )}
                  {modeContent.actionLabel}
                </button>
              </form>
            ) : null}

            {authMode === 'forgot' ? (
              <form className="auth-form" onSubmit={handleResetPassword}>
                <label>
                  <span>E-mail</span>
                  <input placeholder="você@exemplo.com" {...resetForm.register('email')} />
                  <small>{resetForm.formState.errors.email?.message}</small>
                </label>
                <button className="secondary-button wide" type="submit">
                  {busyAction === 'forgot' ? (
                    <LoaderCircle className="spin" size={16} />
                  ) : (
                    <Mail size={16} />
                  )}
                  {modeContent.actionLabel}
                </button>
              </form>
            ) : null}

            <div className="auth-footer-note">
              <Dumbbell size={16} />
              <span>Seu planejamento sempre pronto para a próxima sessão.</span>
            </div>
          </section>
        </main>
      )}
    </div>
  );
}

export default App;
