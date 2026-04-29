import {useEffect, useMemo, useRef, useState, type ChangeEvent} from 'react';
import {Component} from 'react';
import type {ErrorInfo, ReactNode} from 'react';
import type {PointerEvent as ReactPointerEvent} from 'react';
import type {User} from 'firebase/auth';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  Download,
  Dumbbell,
  Eye,
  FileUp,
  GripVertical,
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
  X,
} from 'lucide-react';
import {z} from 'zod';

import './index.css';
import {ProfileAvatar} from './components/ProfileAvatar';
import {
  observeAuthState,
  sendResetPasswordEmail,
  signInWithEmailPassword,
  signInWithGooglePopup,
  signOutFromPanel,
  signUpWithEmailPassword,
} from './lib/auth';
import {resolveAuthView} from './lib/authGate';
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
  getDeleteConfirmation,
  type DeleteConfirmationCopy,
} from './lib/deleteConfirmation';
import {
  buildExerciseProgressData,
  buildSparklinePath,
} from './lib/exerciseProgress';
import {
  maskDecimalInput,
  maskIntegerInput,
  maskRepRangeInput,
} from './lib/inputMasks';
import {
  defaultProfileAvatarId,
  profileAvatarCatalog,
} from './lib/profileAvatarCatalog';
import {
  ensureUserProfileDocument,
  updateUserProfileAvatar,
  watchUserProfile,
} from './lib/profile';
import {firebaseAuth} from './lib/firebase';
import {
  createWorkoutExerciseDraft,
  normalizeWorkoutForSave,
  reorderWorkoutExercises,
} from './lib/workoutEditor';
import {importTrainingFileForCurrentUser} from './lib/trainingImport';
import {
  createTrainingDraftSnapshot,
  deleteAllTrainingDraftAutosavesForUser,
  deleteTrainingDraftAutosave,
  getTrainingDraftAutosave,
  hasStartedTrainingDraft,
  restoreTrainingDraftState,
  saveTrainingDraftAutosave,
} from './lib/trainingDraftAutosave';
import {
  addDraftSet,
  buildTrainingCompletionSummary,
  buildTrainingSessionDocument,
  canFinalizeTrainingDraftExercise,
  finalizeTrainingDraftExercise,
  getExercisePerformanceRecordFromSessions,
  mergeTrainingDraftExercisesForSave,
  removeDraftSet,
  updateDraftSet,
  type ExercisePerformanceRecord,
  type TrainingCompletionSummary,
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
import {resolveWorkoutSaveCompletion} from './lib/workoutSaveFlow';
import type {
  AuthMode,
  ExerciseProgressData,
  UserProfileDocument,
  TrainingDraftExerciseState,
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
    actionLabel: 'Criar conta com e-mail',
  },
  forgot: {
    title: 'Recupere o acesso',
    description: 'Informe seu e-mail e receba um link para voltar a entrar.',
    actionLabel: 'Enviar link de acesso',
  },
};

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
    exercises: [createWorkoutExerciseDraft()],
    createdAt: now,
    updatedAt: now,
  };
};

const BrandMark = ({compact = false}: {compact: boolean}) => (
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
type PendingDeleteConfirmation = DeleteConfirmationCopy & {
  onConfirm: () => void;
};
type WorkoutExerciseDragState = {
  exerciseId: string;
  fromIndex: number;
  targetIndex: number;
  pointerId: number;
  startY: number;
};

const normalizeToken = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

const formatDateInputValue = (value: string) => value.slice(0, 10);

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message.trim().length > 0 ? error.message : fallback;

const ErrorModal = ({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) => (
  <div className="error-modal-backdrop" role="presentation">
    <section
      aria-labelledby="error-modal-title"
      aria-modal="true"
      className="error-modal"
      role="dialog">
      <p className="eyebrow">Erro</p>
      <h2 id="error-modal-title">Não foi possível concluir a ação</h2>
      <p>{message}</p>
      <button className="primary-button wide" type="button" onClick={onClose}>
        Entendi
      </button>
    </section>
  </div>
);

const SuccessModal = ({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) => (
  <div className="error-modal-backdrop" role="presentation">
    <section
      aria-labelledby="success-modal-title"
      aria-modal="true"
      className="error-modal success-modal"
      role="dialog">
      <p className="eyebrow">Sucesso</p>
      <h2 id="success-modal-title">Tudo certo</h2>
      <p>{message}</p>
      <button className="primary-button wide" type="button" onClick={onClose}>
        Continuar
      </button>
    </section>
  </div>
);

const formatTrainingMetric = (value: number, suffix = '') => {
  const formatted = Number.isInteger(value)
    ? String(value)
    : value.toFixed(1).replace('.', ',');

  return `${formatted}${suffix}`;
};

const workoutLastSessionTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit',
  minute: '2-digit',
});

const getSessionTimestamp = (session: WorkoutSessionDocument) => {
  const timestamp = new Date(session.performedAt).getTime();

  return Number.isFinite(timestamp) ? timestamp : 0;
};

const getLatestWorkoutSession = (
  workoutId: string,
  sessions: WorkoutSessionDocument[],
) =>
  sessions
    .filter(session => session.workoutId === workoutId)
    .sort((left, right) => getSessionTimestamp(right) - getSessionTimestamp(left))[0] ??
  null;

const formatSuggestedLoad = (value: string) => {
  const load = value.trim();

  return load.length > 0 ? load : 'Não informada';
};

const formatExercisePerformanceRecord = (record: ExercisePerformanceRecord) =>
  `${formatLoad(record.load)} - ${formatTrainingMetric(record.reps)} reps`;

const formatWorkoutLastSessionTime = (value?: string | null) => {
  if (!value) {
    return 'Não realizado';
  }

  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return 'Não realizado';
  }

  return workoutLastSessionTimeFormatter.format(date);
};

const TrainingCompletionModal = ({
  summary,
  onClose,
}: {
  summary: TrainingCompletionSummary;
  onClose: () => void;
}) => (
  <div className="error-modal-backdrop" role="presentation">
    <section
      aria-labelledby="training-completion-title"
      aria-modal="true"
      className="error-modal success-modal training-completion-modal"
      role="dialog">
      <div className="training-completion-badge">
        <Check size={28} />
      </div>
      <p className="eyebrow">Treino finalizado</p>
      <h2 id="training-completion-title">Seu treino foi salvo</h2>
      <p className="training-completion-copy">
        O histórico já foi atualizado com as séries válidas desta execução.
      </p>
      <strong className="training-completion-name">{summary.workoutName}</strong>

      <div className="training-completion-highlight">
        <span>Séries registradas</span>
        <strong>{summary.totalSets}</strong>
      </div>

      <div className="training-completion-grid">
        <div className="training-completion-card">
          <span>Maior carga</span>
          <strong>{formatTrainingMetric(summary.maxLoad, ' kg')}</strong>
        </div>
        <div className="training-completion-card">
          <span>Menor carga</span>
          <strong>{formatTrainingMetric(summary.minLoad, ' kg')}</strong>
        </div>
        <div className="training-completion-card">
          <span>Maior repetição</span>
          <strong>{formatTrainingMetric(summary.maxReps)}</strong>
        </div>
        <div className="training-completion-card">
          <span>Menor repetição</span>
          <strong>{formatTrainingMetric(summary.minReps)}</strong>
        </div>
      </div>

      <div className="training-completion-groups">
        <span>Séries por grupo muscular</span>
        <div className="training-completion-pills">
          {summary.seriesByGroup.map(group => (
            <div key={group.label} className="training-completion-pill">
              <small>{group.label}</small>
              <strong>{group.count}</strong>
            </div>
          ))}
        </div>
      </div>

      <button className="primary-button wide" type="button" onClick={onClose}>
        Continuar
      </button>
    </section>
  </div>
);

const WorkoutConsultModal = ({
  workout,
  sessions,
  onClose,
}: {
  workout: WorkoutDocument;
  sessions: WorkoutSessionDocument[];
  onClose: () => void;
}) => {
  const latestSession = getLatestWorkoutSession(workout.id, sessions);

  return (
    <div className="error-modal-backdrop" role="presentation">
      <section
        aria-labelledby="workout-consult-title"
        aria-modal="true"
        className="error-modal workout-consult-modal"
        role="dialog">
        <div className="workout-consult-head">
          <div>
            <p className="eyebrow">Consulta de treino</p>
            <h2 id="workout-consult-title">{workout.name}</h2>
            <p>
              {workout.focus} - {workout.exercises.length} exercícios
            </p>
          </div>
          <button className="workout-consult-close" type="button" onClick={onClose}>
            <X size={16} />
            Fechar
          </button>
        </div>

        <div className="workout-consult-meta">
          <span>
            <CalendarDays size={16} />
            Dia: <strong>{workout.scheduledDay || 'Livre'}</strong>
            <Clock3 size={16} />
            Horario ultimo treino:{' '}
            <strong>{formatWorkoutLastSessionTime(latestSession?.performedAt)}</strong>
          </span>
        </div>

        <div className="workout-consult-notes">
          <span>Observações</span>
          <p>{workout.notes || 'Sem observações extras para este treino.'}</p>
        </div>

        <div className="workout-consult-exercises">
          <span className="workout-consult-section-title">Exercícios</span>
          {workout.exercises.map((exercise, index) => {
            const registeredPerformanceRecord = getExercisePerformanceRecordFromSessions(workout.id, exercise, sessions);

            return (
              <article className="workout-consult-exercise" key={exercise.id}>
                <div className="workout-consult-exercise-head">
                  <span>{index + 1}</span>
                  <div>
                    <strong>{exercise.name}</strong>
                    <p>
                      {exercise.muscleGroup} - alvo{' '}
                      {exercise.targetReps || 'não informado'}
                    </p>
                  </div>
                </div>

                <p className="workout-consult-load">
                  {registeredPerformanceRecord !== null
                    ? `Maior carga registrada: ${formatExercisePerformanceRecord(registeredPerformanceRecord)}`
                    : `Carga sugerida: ${formatSuggestedLoad(exercise.baseLoad)}`}
                </p>

                {exercise.note ? (
                  <p className="workout-consult-exercise-note">{exercise.note}</p>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
};

const DeleteConfirmationModal = ({
  title,
  description,
  confirmLabel,
  onConfirm,
  onCancel,
}: DeleteConfirmationCopy & {
  onConfirm: () => void;
  onCancel: () => void;
}) => (
  <div className="error-modal-backdrop" role="presentation">
    <section
      aria-labelledby="delete-confirmation-title"
      aria-modal="true"
      className="error-modal delete-confirmation-modal"
      role="dialog">
      <p className="eyebrow">Confirmação</p>
      <h2 id="delete-confirmation-title">{title}</h2>
      <p>{description}</p>
      <div className="modal-actions">
        <button className="secondary-button" type="button" onClick={onCancel}>
          Cancelar
        </button>
        <button className="danger-button" type="button" onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </section>
  </div>
);

class AppErrorBoundary extends Component<
  {children: ReactNode},
  {errorMessage: string | null}
> {
  state = {
    errorMessage: null,
  };

  static getDerivedStateFromError(error: unknown) {
    return {
      errorMessage: getErrorMessage(
        error,
        'O app encontrou uma falha inesperada ao montar esta tela.',
      ),
    };
  }

  componentDidCatch(error: unknown, errorInfo: ErrorInfo) {
    console.error('Erro capturado pelo LogGYM:', error, errorInfo);
  }

  render() {
    if (this.state.errorMessage) {
      return (
        <div className="panel-shell panel-shell--auth">
          <ErrorModal
            message={this.state.errorMessage}
            onClose={() => this.setState({errorMessage: null})}
          />
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  const [authMode, setAuthMode] = useState<AuthMode>('signin');
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>('dashboard');
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfileDocument | null>(null);
  const [profileAvatarId, setProfileAvatarId] = useState<string>(defaultProfileAvatarId);
  const [profileAvatarDraftId, setProfileAvatarDraftId] =
    useState<string>(defaultProfileAvatarId);
  const [isAvatarPickerCollapsed, setIsAvatarPickerCollapsed] = useState(false);
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successModalMessage, setSuccessModalMessage] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] =
    useState<PendingDeleteConfirmation | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [trainingCompletionSummary, setTrainingCompletionSummary] =
    useState<TrainingCompletionSummary | null>(null);
  const [backupPassword, setBackupPassword] = useState('');
  const [backupPasswordConfirm, setBackupPasswordConfirm] = useState('');
  const [dashboardSearch, setDashboardSearch] = useState('');
  const [workoutSearch, setWorkoutSearch] = useState('');
  const [historySearch, setHistorySearch] = useState('');
  const [detailView, setDetailView] = useState<WorkspaceDetailView>(null);
  const [consultWorkout, setConsultWorkout] = useState<WorkoutDocument | null>(null);
  const [workouts, setWorkouts] = useState<WorkoutDocument[]>([]);
  const [sessions, setSessions] = useState<WorkoutSessionDocument[]>([]);
  const [editorWorkout, setEditorWorkout] = useState<WorkoutDocument>(() =>
    createWorkoutDraft(),
  );
  const [isWorkoutEditorOpen, setIsWorkoutEditorOpen] = useState(false);
  const [workoutExerciseDrag, setWorkoutExerciseDrag] =
    useState<WorkoutExerciseDragState | null>(null);
  const [trainingPendingDrafts, setTrainingPendingDrafts] = useState<
    TrainingDraftExerciseState['pendingExercises']
  >([]);
  const [trainingCompletedDrafts, setTrainingCompletedDrafts] = useState<
    TrainingDraftExerciseState['completedExercises']
  >([]);
  const [trainingPendingFocusIndex, setTrainingPendingFocusIndex] = useState<number | null>(
    null,
  );
  const [trainingPerformedAt, setTrainingPerformedAt] = useState(
    formatDateInputValue(new Date().toISOString()),
  );
  const [trainingOverallNotes, setTrainingOverallNotes] = useState('');
  const backupInputRef = useRef<HTMLInputElement | null>(null);
  const trainingImportInputRef = useRef<HTMLInputElement | null>(null);
  const workoutExerciseRefs = useRef<Array<HTMLElement | null>>([]);
  const workoutExerciseHoldTimerRef = useRef<number | null>(null);
  const workoutExercisePointerRef = useRef<{
    exerciseId: string;
    fromIndex: number;
    pointerId: number;
    startY: number;
  } | null>(null);
  const workoutExerciseDragRef = useRef<WorkoutExerciseDragState | null>(null);
  const trainingExerciseRefs = useRef<Array<HTMLElement | null>>([]);
  const trainingExerciseLoadInputRefs = useRef<Array<HTMLInputElement | null>>([]);

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
        setIsAuthReady(true);
        setUserProfile(null);
        setProfileAvatarId(defaultProfileAvatarId);
        setProfileAvatarDraftId(defaultProfileAvatarId);
        setIsAvatarPickerCollapsed(false);

        if (!nextUser) {
          setWorkouts([]);
          setSessions([]);
          setEditorWorkout(createWorkoutDraft());
          setIsWorkoutEditorOpen(false);
          setWorkoutExerciseDrag(null);
          setWorkspaceView('dashboard');
          setDetailView(null);
          setConsultWorkout(null);
          setTrainingPendingDrafts([]);
          setTrainingCompletedDrafts([]);
          setTrainingPendingFocusIndex(null);
          setTrainingOverallNotes('');
          setTrainingPerformedAt(formatDateInputValue(new Date().toISOString()));
        }
      }),
    [],
  );

  useEffect(() => {
    if (!user) {
      return;
    }

    void ensureUserProfileDocument(user).catch(() => undefined);

    const unsubscribeProfile = watchUserProfile(user.uid, profile => {
      setUserProfile(profile);
      const nextAvatarId = profile?.avatarId ?? defaultProfileAvatarId;

      setProfileAvatarId(nextAvatarId);
      setProfileAvatarDraftId(nextAvatarId);
      setIsAvatarPickerCollapsed(true);
    });

    return () => {
      unsubscribeProfile();
    };
  }, [user]);

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
    return () => {
      if (workoutExerciseHoldTimerRef.current) {
        window.clearTimeout(workoutExerciseHoldTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    document.body.classList.toggle(
      'is-workout-exercise-dragging',
      Boolean(workoutExerciseDrag),
    );

    return () => {
      document.body.classList.remove('is-workout-exercise-dragging');
    };
  }, [workoutExerciseDrag]);

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
  const startedWorkoutIds = !user
    ? new Set<string>()
    : new Set(
        workouts
          .filter(workout =>
            hasStartedTrainingDraft(getTrainingDraftAutosave(user.uid, workout.id)),
          )
          .map(workout => workout.id),
      );

  useEffect(() => {
    if (!user || detailView?.kind !== 'training-session' || !activeTrainingWorkout) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      saveTrainingDraftAutosave(
        createTrainingDraftSnapshot({
          userId: user.uid,
          workoutId: activeTrainingWorkout.id,
          performedAt: trainingPerformedAt,
          overallNotes: trainingOverallNotes,
          pendingExercises: trainingPendingDrafts,
          completedExercises: trainingCompletedDrafts,
          updatedAt: new Date().toISOString(),
        }),
      );
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [
    activeTrainingWorkout,
    detailView,
    trainingCompletedDrafts,
    trainingOverallNotes,
    trainingPendingDrafts,
    trainingPerformedAt,
    user,
  ]);

  useEffect(() => {
    if (trainingPendingFocusIndex === null) {
      return;
    }

    const targetExercise = trainingExerciseRefs.current[trainingPendingFocusIndex];

    if (!targetExercise) {
      return;
    }

    targetExercise.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });

    const focusTimeoutId = window.setTimeout(() => {
      trainingExerciseLoadInputRefs.current[trainingPendingFocusIndex]?.focus();
      setTrainingPendingFocusIndex(null);
    }, 180);

    return () => window.clearTimeout(focusTimeoutId);
  }, [trainingPendingFocusIndex, trainingPendingDrafts]);

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

    return (
      userProfile?.givenName?.trim() ||
      userProfile?.name?.trim().split(/\s+/)[0] ||
      user.displayName?.trim().split(/\s+/)[0] ||
      user.email?.split('@')[0] ||
      'Atleta'
    );
  }, [user, userProfile]);

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
        'Revise volume, séries e observações das sessões já concluídas em um painel direto.',
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
          description: exerciseProgress?.lastPerformedAt
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
  const selectedProfileAvatar =
    profileAvatarCatalog.find(avatar => avatar.id === profileAvatarDraftId) ??
    profileAvatarCatalog.find(avatar => avatar.id === profileAvatarId) ??
    profileAvatarCatalog[0];
  const authView = resolveAuthView({isAuthReady, user});
  const visibleProfileAvatars = isAvatarPickerCollapsed
    ? selectedProfileAvatar
      ? [selectedProfileAvatar]
      : []
    : profileAvatarCatalog;

  const clearFeedback = () => {
    setErrorMessage(null);
    setSuccessModalMessage(null);
    setDeleteConfirmation(null);
    setStatusMessage(null);
  };

  const showError = (error: unknown, fallback: string) => {
    setErrorMessage(getErrorMessage(error, fallback));
  };

  const requestDeleteConfirmation = (
    confirmation: DeleteConfirmationCopy,
    onConfirm: () => void,
  ) => {
    setDeleteConfirmation({...confirmation, onConfirm});
  };

  const confirmDeleteAction = () => {
    const pendingConfirmation = deleteConfirmation;

    if (!pendingConfirmation) {
      return;
    }

    setDeleteConfirmation(null);
    pendingConfirmation.onConfirm();
  };

  useEffect(() => {
    const handleWindowError = (event: ErrorEvent) => {
      setErrorMessage(
        getErrorMessage(
          event.error,
          event.message || 'O app encontrou uma falha inesperada na tela atual.',
        ),
      );
      event.preventDefault();
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      setErrorMessage(
        getErrorMessage(
          event.reason,
          'Uma operação do app falhou antes de ser concluída. Tente novamente.',
        ),
      );
      event.preventDefault();
    };

    window.addEventListener('error', handleWindowError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleWindowError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  const handleGoogleLogin = async () => {
    clearFeedback();
    setBusyAction('google');

    try {
      await signInWithGooglePopup();
    } catch (error) {
      showError(error, 'Não foi possível entrar agora.');
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
      showError(error, 'Não foi possível entrar agora.');
    } finally {
      setBusyAction(null);
    }
  });

  const handleSignUp = signUpForm.handleSubmit(async values => {
    clearFeedback();
    setBusyAction('signup');

    try {
      await signUpWithEmailPassword(values.name, values.email, values.password);
      if (firebaseAuth.currentUser) {
        const profile = await ensureUserProfileDocument(
          firebaseAuth.currentUser,
          defaultProfileAvatarId,
          values.name,
        );
        setUserProfile(profile);
      }
      signUpForm.reset();
      setAuthMode('signin');
      setStatusMessage('Conta criada. Agora sua área já está pronta para receber treinos.');
    } catch (error) {
      showError(error, 'Não foi possível criar sua conta.');
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
      showError(error, 'Não foi possível enviar o link agora.');
    } finally {
      setBusyAction(null);
    }
  });

  const handleLogout = async () => {
    if (!user) {
      return;
    }

    clearFeedback();
    setBusyAction('logout');

    try {
      await signOutFromPanel();
      deleteAllTrainingDraftAutosavesForUser(user.uid);
      setStatusMessage(null);
    } catch (error) {
      showError(error, 'Não foi possível sair da conta.');
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
      showError(error, 'Não foi possível atualizar os dados agora.');
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
      const result = await exportBackupForCurrentUser(
        user,
        backupPassword,
        backupPasswordConfirm,
      );
      setBackupPassword('');
      setBackupPasswordConfirm('');
      setStatusMessage(
        `Download da cópia protegida iniciado. Arquivo: ${result.fileName}. Conteúdo: ${result.workouts} treinos, ${result.workoutExercises} exercícios, ${result.workoutSessions} sessões e ${result.sessionSets} séries.`,
      );
    } catch (error) {
      showError(error, 'Não foi possível exportar seus treinos agora.');
    } finally {
      setBusyAction(null);
    }
  };

  const handleStartBackupImport = () => {
    if (busyAction) {
      return;
    }

    requestDeleteConfirmation(
      {
        title: 'Restaurar cópia?',
        description:
          'Isso vai substituir os treinos e o histórico atuais pelos dados do arquivo selecionado.',
        confirmLabel: 'Restaurar cópia',
      },
      () => backupInputRef.current?.click(),
    );
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
      const result = await importBackupFileForCurrentUser(user, file, backupPassword);
      setBackupPassword('');
      setBackupPasswordConfirm('');
      const refreshed = await refreshWorkspaceData(user.uid);
      setWorkouts(refreshed.workouts);
      setSessions(refreshed.sessions);
      setStatusMessage(
        `Restauração concluída com sucesso. Foram aplicados ${result.workouts} treinos, ${result.workoutExercises} exercícios, ${result.workoutSessions} sessões e ${result.sessionSets} séries. Os dados atuais da conta foram substituídos pelo conteúdo do arquivo.`,
      );
    } catch (error) {
      showError(error, 'Não foi possível restaurar sua cópia agora.');
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
        `Importação concluída com sucesso. Arquivo: ${result.fileName}. Resultado: ${result.workouts} treinos e ${result.exercises} exercícios importados.${result.skippedWorkouts > 0 ? ` ${result.skippedWorkouts} treino(s) incompleto(s) foram ignorados.` : ''}`,
      );
    } catch (error) {
      showError(error, 'Não foi possível importar o arquivo agora.');
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

  const setWorkoutExerciseDragState = (state: WorkoutExerciseDragState | null) => {
    workoutExerciseDragRef.current = state;
    setWorkoutExerciseDrag(state);
  };

  const clearWorkoutExerciseHoldTimer = () => {
    if (!workoutExerciseHoldTimerRef.current) {
      return;
    }

    window.clearTimeout(workoutExerciseHoldTimerRef.current);
    workoutExerciseHoldTimerRef.current = null;
  };

  const getWorkoutExerciseDropIndex = (clientY: number, fallbackIndex: number) => {
    const maxIndex = editorWorkout.exercises.length - 1;

    for (const [index, element] of workoutExerciseRefs.current.entries()) {
      if (!element) {
        continue;
      }

      const bounds = element.getBoundingClientRect();

      if (clientY < bounds.top + bounds.height / 2) {
        return Math.max(0, Math.min(maxIndex, index));
      }
    }

    return Math.max(0, Math.min(maxIndex, fallbackIndex));
  };

  const reorderEditorExercise = (exerciseId: string, targetIndex: number) => {
    setEditorWorkout(current => {
      const fromIndex = current.exercises.findIndex(exercise => exercise.id === exerciseId);

      if (fromIndex < 0) {
        return current;
      }

      return {
        ...current,
        exercises: reorderWorkoutExercises(current.exercises, fromIndex, targetIndex),
      };
    });
  };

  const startWorkoutExerciseHold = (event: ReactPointerEvent<HTMLElement>) => {
    const exerciseId = event.currentTarget.dataset.exerciseId;
    const fromIndex = Number(event.currentTarget.dataset.exerciseIndex);

    if (
      !exerciseId ||
      !Number.isInteger(fromIndex) ||
      editorWorkout.exercises.length <= 1 ||
      (event.pointerType === 'mouse' && event.button !== 0)
    ) {
      return;
    }

    clearWorkoutExerciseHoldTimer();
    workoutExercisePointerRef.current = {
      exerciseId,
      fromIndex,
      pointerId: event.pointerId,
      startY: event.clientY,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    workoutExerciseHoldTimerRef.current = window.setTimeout(() => {
      setWorkoutExerciseDragState({
        exerciseId,
        fromIndex,
        targetIndex: fromIndex,
        pointerId: event.pointerId,
        startY: event.clientY,
      });
      workoutExerciseHoldTimerRef.current = null;
    }, 1000);
  };

  const moveWorkoutExerciseDrag = (event: ReactPointerEvent<HTMLElement>) => {
    const pointer = workoutExercisePointerRef.current;

    if (!pointer || pointer.pointerId !== event.pointerId) {
      return;
    }

    const currentDrag = workoutExerciseDragRef.current;

    if (!currentDrag) {
      if (Math.abs(event.clientY - pointer.startY) > 8) {
        clearWorkoutExerciseHoldTimer();
      }

      return;
    }

    event.preventDefault();
    setWorkoutExerciseDragState({
      ...currentDrag,
      targetIndex: getWorkoutExerciseDropIndex(event.clientY, currentDrag.targetIndex),
    });
  };

  const finishWorkoutExerciseDrag = (event: ReactPointerEvent<HTMLElement>) => {
    const pointer = workoutExercisePointerRef.current;

    if (
      pointer?.pointerId === event.pointerId &&
      event.currentTarget.hasPointerCapture(event.pointerId)
    ) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    clearWorkoutExerciseHoldTimer();

    const currentDrag = workoutExerciseDragRef.current;

    if (currentDrag && currentDrag.fromIndex !== currentDrag.targetIndex) {
      reorderEditorExercise(currentDrag.exerciseId, currentDrag.targetIndex);
    }

    workoutExercisePointerRef.current = null;
    setWorkoutExerciseDragState(null);
  };

  const updateExercise = (
    exerciseId: string,
    field: keyof WorkoutExerciseInput,
    value: string,
  ) => {
    setEditorWorkout(current => ({
      ...current,
      exercises: current.exercises.map(exercise =>
        exercise.id === exerciseId ? { ...exercise, [field]: value } : exercise,
      ),
    }));
  };

  const addExercise = () => {
    setEditorWorkout(current => ({
      ...current,
      exercises: [...current.exercises, createWorkoutExerciseDraft()],
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

  const requestRemoveExercise = (exercise: WorkoutExerciseInput, index: number) => {
    requestDeleteConfirmation(
      getDeleteConfirmation({
        type: 'exercise',
        name: exercise.name || `Exercício ${index + 1}`,
      }),
      () => removeExercise(exercise.id),
    );
  };

  const openWorkoutCreationEditor = () => {
    clearFeedback();
    setEditorWorkout(createWorkoutDraft(user?.uid ?? ''));
    setWorkoutExerciseDragState(null);
    setIsWorkoutEditorOpen(true);
    setWorkspaceView('workouts');
  };

  const closeWorkoutEditor = () => {
    setEditorWorkout(createWorkoutDraft(user?.uid ?? ''));
    setIsWorkoutEditorOpen(false);
    setWorkoutExerciseDragState(null);
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

      const saveCompletion = resolveWorkoutSaveCompletion({
        savedWorkoutId: normalizedWorkout.id,
        existingWorkoutIds: workouts.map(workout => workout.id),
      });

      await saveWorkoutFromPanel(user, normalizedWorkout);
      if (saveCompletion.shouldCloseEditor) {
        setSuccessModalMessage(saveCompletion.successMessage);
        closeWorkoutEditor();
      } else {
        setStatusMessage(saveCompletion.successMessage);
        setEditorWorkout(normalizedWorkout);
        setIsWorkoutEditorOpen(true);
      }
      setWorkspaceView('workouts');
    } catch (error) {
      showError(error, 'Não foi possível salvar o treino.');
    } finally {
      setBusyAction(null);
    }
  };

  const handleEditWorkout = (workout: WorkoutDocument) => {
    clearFeedback();
    setConsultWorkout(null);
    setWorkoutExerciseDragState(null);
    setWorkspaceView('workouts');
    setIsWorkoutEditorOpen(true);
    setEditorWorkout({
      ...workout,
      scheduledDay: workout.scheduledDay ?? 'Livre',
      exercises: workout.exercises.length ? workout.exercises : [createWorkoutExerciseDraft()],
    });
  };

  const executeDeleteWorkout = async (workoutId: string) => {
    if (!user) {
      return;
    }

    clearFeedback();
    setBusyAction(`delete-${workoutId}`);

    try {
      await deleteWorkoutFromPanel(user.uid, workoutId);

      if (editorWorkout.id === workoutId && isWorkoutEditorOpen) {
        closeWorkoutEditor();
      }

      setStatusMessage('Treino removido da sua rotina.');
    } catch (error) {
      showError(error, 'Não foi possível excluir o treino.');
    } finally {
      setBusyAction(null);
    }
  };

  const requestDeleteWorkout = (workout: WorkoutDocument) => {
    requestDeleteConfirmation(
      getDeleteConfirmation({
        type: 'workout',
        name: workout.name || 'este treino',
      }),
      () => void executeDeleteWorkout(workout.id),
    );
  };

  const handleConsultWorkout = (workout: WorkoutDocument) => {
    clearFeedback();
    setConsultWorkout(workout);
  };

  const handleSelectTab = (view: WorkspaceView) => {
    setDetailView(null);
    setConsultWorkout(null);
    setWorkoutExerciseDragState(null);
    setWorkspaceView(view);
    setIsWorkoutEditorOpen(false);
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
    setConsultWorkout(null);
    const savedDraft = user ? getTrainingDraftAutosave(user.uid, workout.id) : null;
    const restoredDraftState = restoreTrainingDraftState(workout, savedDraft);

    setTrainingPendingDrafts(restoredDraftState.pendingExercises);
    setTrainingCompletedDrafts(restoredDraftState.completedExercises);
    setTrainingOverallNotes(savedDraft?.overallNotes ?? '');
    setTrainingPerformedAt(
      savedDraft
        ? formatDateInputValue(savedDraft.performedAt)
        : formatDateInputValue(new Date().toISOString()),
    );
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

  const executeDeleteSession = async (sessionItem: WorkoutSessionDocument) => {
    if (!user) {
      return;
    }

    clearFeedback();
    setBusyAction(`delete-session-${sessionItem.id}`);

    try {
      await deleteSessionFromPanel(user.uid, sessionItem.id);
      setStatusMessage('Execução removida do histórico.');
    } catch (error) {
      showError(error, 'Não foi possível excluir a execução.');
    } finally {
      setBusyAction(null);
    }
  };

  const requestDeleteSession = (sessionItem: WorkoutSessionDocument) => {
    requestDeleteConfirmation(
      getDeleteConfirmation({
        type: 'session',
        name: `${sessionItem.workoutName} de ${formatSessionDate(sessionItem.performedAt)}`,
      }),
      () => void executeDeleteSession(sessionItem),
    );
  };

  const handleSaveTrainingSession = async () => {
    if (!user || !activeTrainingWorkout) {
      return;
    }

    clearFeedback();
    setBusyAction('save-session');

    try {
      const exercisesForSave = mergeTrainingDraftExercisesForSave({
        pendingExercises: trainingPendingDrafts,
        completedExercises: trainingCompletedDrafts,
      });
      const summary = buildTrainingCompletionSummary(
        activeTrainingWorkout.name,
        exercisesForSave,
      );
      const sessionDocument = buildTrainingSessionDocument({
        userId: user.uid,
        workout: activeTrainingWorkout,
        performedAt: trainingPerformedAt,
        overallNotes: trainingOverallNotes,
        exercises: exercisesForSave,
      });

      await saveTrainingSessionFromPanel(user.uid, sessionDocument);
      await deleteTrainingDraftAutosave(user.uid, activeTrainingWorkout.id);
      setTrainingCompletionSummary(summary);
    } catch (error) {
      showError(error, 'Não foi possível salvar a execução.');
    } finally {
      setBusyAction(null);
    }
  };

  const handleCloseTrainingCompletionModal = () => {
    setTrainingCompletionSummary(null);
    setStatusMessage('Execução salva com sucesso.');
    setDetailView(null);
    setWorkspaceView('history');
    setHistorySearch('');
  };

  const handleFinishTrainingExercise = (exerciseIndex: number) => {
    clearFeedback();

    const exercise = trainingPendingDrafts[exerciseIndex];

    if (!exercise || !canFinalizeTrainingDraftExercise(exercise)) {
      setErrorMessage(
        'Preencha carga e reps válidos em todas as séries antes de finalizar o exercício.',
      );
      return;
    }

    const nextDraftState = finalizeTrainingDraftExercise(
      {
        pendingExercises: trainingPendingDrafts,
        completedExercises: trainingCompletedDrafts,
      },
      exerciseIndex,
    );

    if (!nextDraftState) {
      return;
    }

    setTrainingPendingDrafts(nextDraftState.pendingExercises);
    setTrainingCompletedDrafts(nextDraftState.completedExercises);

    if (nextDraftState.pendingExercises.length === 0) {
      return;
    }

    const targetExerciseIndex = Math.min(
      exerciseIndex,
      nextDraftState.pendingExercises.length - 1,
    );

    setTrainingPendingFocusIndex(targetExerciseIndex);
  };

  const handleProfileAvatarSelected = (avatarId: string) => {
    if (!user || isBusy) {
      return;
    }

    clearFeedback();
    setProfileAvatarDraftId(avatarId);
  };

  const handleEditProfileAvatar = () => {
    if (!user || isBusy) {
      return;
    }

    clearFeedback();
    setProfileAvatarDraftId(profileAvatarId);
    setIsAvatarPickerCollapsed(false);
  };

  const handleConfirmProfileAvatar = async () => {
    if (!user || isBusy) {
      return;
    }

    clearFeedback();

    if (profileAvatarDraftId === profileAvatarId) {
      setIsAvatarPickerCollapsed(true);
      setStatusMessage('Avatar confirmado.');
      return;
    }

    setBusyAction('profile-avatar');

    try {
      const updatedProfile = await updateUserProfileAvatar(user, profileAvatarDraftId);
      setProfileAvatarId(updatedProfile.avatarId);
      setProfileAvatarDraftId(updatedProfile.avatarId);
      setIsAvatarPickerCollapsed(true);
      setStatusMessage('Avatar atualizado com sucesso.');
    } catch (error) {
      showError(error, 'Não foi possível atualizar o avatar agora.');
    } finally {
      setBusyAction(null);
    }
  };

  const executeClearTrainingDraft = (workoutId: string) => {
    if (!user) {
      return;
    }

    clearFeedback();
    deleteTrainingDraftAutosave(user.uid, workoutId);
    setStatusMessage('Rascunho do treino limpo.');
  };

  const requestClearTrainingDraft = (workout: WorkoutDocument) => {
    requestDeleteConfirmation(
      getDeleteConfirmation({
        type: 'training-draft',
        name: workout.name || 'este treino',
      }),
      () => executeClearTrainingDraft(workout.id),
    );
  };

  const requestRemoveDraftSet = (
    exerciseName: string,
    exerciseIndex: number,
    setIndex: number,
    seriesNumber: number,
  ) => {
    requestDeleteConfirmation(
      getDeleteConfirmation({
        type: 'training-set',
        name: `${seriesNumber} de ${exerciseName || 'exercício'}`,
      }),
      () =>
        setTrainingPendingDrafts(current =>
          removeDraftSet(current, exerciseIndex, setIndex),
        ),
    );
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
              ? 'Consulte os treinos encontrados pela busca.'
              : 'Os treinos mais recentes ficam sempre prontos para consulta rápida.'}
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
          <small>Distribuídos entre todas as rotinas.</small>
        </article>
        <article className="metric-card">
          <span>Últimas séries</span>
          <strong>{totalTrackedSets}</strong>
          <small>Volume recente registrado na sua conta.</small>
        </article>
      </section>

      <section
        className={
          isWorkoutEditorOpen ? 'workspace-grid' : 'workspace-grid workspace-grid--single'
        }>
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
                      className={
                        startedWorkoutIds.has(workout.id)
                          ? 'primary-button primary-button--resume'
                          : 'primary-button'
                      }
                      onClick={() => openTrainingSession(workout, 'workouts')}>
                      <Play size={16} />
                      {startedWorkoutIds.has(workout.id) ? 'Continuar treino' : 'Iniciar treino'}
                    </button>
                    <button
                      type="button"
                      className="primary-button primary-button--consult"
                      onClick={() => handleConsultWorkout(workout)}>
                      <Eye size={16} />
                      Consultar treino
                    </button>
                    <button
                      type="button"
                      className="danger-button"
                      disabled={!startedWorkoutIds.has(workout.id)}
                      onClick={() => requestClearTrainingDraft(workout)}>
                      <Trash2 size={16} />
                      Limpar treino
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
                      onClick={() => requestDeleteWorkout(workout)}>
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
                Sua biblioteca ainda está vazia. Crie o primeiro treino para começar.
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
                    <span>{formatSessionDate(sessionItem.performedAt)}</span>
                  </div>
                  <p>
                    {sessionItem.totalSets} séries - pico de {formatLoad(sessionItem.topLoad)}
                  </p>
                </article>
              ))
            ) : (
              <div className="empty-card">
                Suas Últimas sessões vão aparecer aqui assim que você concluir treinos.
              </div>
            )}
          </div>
        </div>

        {isWorkoutEditorOpen ? (
          <div className="column-panel editor">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Editor</p>
                <h2>{editorTitle}</h2>
              </div>
              <button type="button" className="ghost-button" onClick={closeWorkoutEditor}>
                Fechar
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
            {editorWorkout.exercises.map((exercise, index) => {
              const isDragging = workoutExerciseDrag?.exerciseId === exercise.id;
              const isDropTarget =
                workoutExerciseDrag?.targetIndex === index &&
                workoutExerciseDrag.exerciseId !== exercise.id;

              return (
                <article
                  className={[
                    'exercise-card',
                    'workout-editor-exercise-card',
                    isDragging ? 'exercise-card--dragging' : '',
                    isDropTarget ? 'exercise-card--drop-target' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  key={exercise.id}
                  ref={element => {
                    workoutExerciseRefs.current[index] = element;
                  }}>
                  <div className="exercise-card-head">
                    <div className="exercise-card-title-row">
                      <button
                        type="button"
                        className={
                          isDragging
                            ? 'exercise-drag-handle active'
                            : 'exercise-drag-handle'
                        }
                        aria-label={`Segurar e arrastar exercício ${index + 1}`}
                        data-exercise-id={exercise.id}
                        data-exercise-index={index}
                        onPointerDown={startWorkoutExerciseHold}
                        onPointerMove={moveWorkoutExerciseDrag}
                        onPointerUp={finishWorkoutExerciseDrag}
                        onPointerCancel={finishWorkoutExerciseDrag}>
                        <GripVertical size={16} />
                        <span>Segure 1s</span>
                      </button>
                      <strong>Exercício {index + 1}</strong>
                    </div>
                    {editorWorkout.exercises.length > 1 ? (
                      <button
                        type="button"
                        className="danger-button subtle"
                        onClick={() => requestRemoveExercise(exercise, index)}>
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
                        updateExercise(
                          exercise.id,
                          'baseLoad',
                          maskDecimalInput(event.target.value),
                        )
                      }
                      inputMode="decimal"
                      placeholder="Ex: 20"
                    />
                  </label>
                  <label>
                    <span>Faixa de reps</span>
                    <input
                      value={exercise.targetReps}
                      onChange={event =>
                        updateExercise(
                          exercise.id,
                          'targetReps',
                          maskRepRangeInput(event.target.value),
                        )
                      }
                      inputMode="numeric"
                      placeholder="Ex: 8-10"
                    />
                  </label>
                </div>

                <label className="stacked-field">
                  <span>Observação</span>
                  <textarea
                    value={exercise.note}
                    onChange={event => updateExercise(exercise.id, 'note', event.target.value)}
                    rows={3}
                    placeholder="Dicas curtas para a execução."
                  />
                </label>
                </article>
              );
            })}
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
        ) : null}
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
                    <div className="history-card-metrics">
                      <strong>Maior carga - {formatLoad(sessionItem.topLoad)}</strong>
                      <strong>
                        Total levantado - {formatVolume(sessionItem.totalVolume)}
                      </strong>
                    </div>
                    <button
                      type="button"
                      className="danger-button subtle"
                      disabled={busyAction === `delete-session-${sessionItem.id}`}
                      onClick={() => requestDeleteSession(sessionItem)}>
                      {busyAction === `delete-session-${sessionItem.id}` ? (
                        <LoaderCircle className="spin" size={16} />
                      ) : (
                        <Trash2 size={16} />
                      )}
                      Excluir
                    </button>
                  </div>
                </div>

                <p>{sessionItem.totalSets} séries</p>

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
              <small>soma de carga x repetições</small>
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

            <div className="training-session-actions">
              <label className="training-date-field">
                <span>Data</span>
                <input
                  type="date"
                  value={trainingPerformedAt}
                  onChange={event => setTrainingPerformedAt(event.target.value)}
                />
              </label>
              <button
                type="button"
                className="primary-button"
                disabled={busyAction === 'save-session'}
                onClick={handleSaveTrainingSession}>
                {busyAction === 'save-session' ? (
                  <LoaderCircle className="spin" size={16} />
                ) : (
                  <Play size={16} />
                )}
                {busyAction === 'save-session' ? 'Salvando treino...' : 'Salvar treino'}
              </button>
            </div>
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
              placeholder="Como o treino se comportou hoje"
            />
          </label>

          <div className="exercise-stack">
            {trainingPendingDrafts.length ? (
              trainingPendingDrafts.map((exercise, exerciseIndex) => {
                const performedRecord = getExercisePerformanceRecordFromSessions(activeTrainingWorkout.id, exercise, sessions);

                return (
                  <article
                    className="exercise-card training-exercise-card"
                    key={exercise.workoutExerciseId}
                    ref={element => {
                      trainingExerciseRefs.current[exerciseIndex] = element;
                    }}>
                    <div className="exercise-card-head">
                      <div>
                        <strong>{exercise.exerciseName}</strong>
                        <p className="exercise-meta-text">
                          {exercise.muscleGroup} - alvo {exercise.targetReps}
                        </p>
                      </div>
                      <div className="training-exercise-actions">
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => handleFinishTrainingExercise(exerciseIndex)}>
                          <ChevronRight size={16} />
                          Finalizar exercício
                        </button>
                        <button
                          type="button"
                          className="ghost-button"
                          onClick={() =>
                            setTrainingPendingDrafts(current =>
                              addDraftSet(current, exerciseIndex),
                            )
                          }>
                          <Plus size={16} />
                          Nova série
                        </button>
                      </div>
                    </div>

                    {exercise.hint ? (
                      <p className="training-support-text">{exercise.hint}</p>
                    ) : null}
                    {performedRecord ? (
                      <p className="training-support-text training-support-text--record">
                        Maior carga realizada: {formatExercisePerformanceRecord(performedRecord)}
                      </p>
                    ) : null}
                    {exercise.baseLoad ? (
                      <p className="training-support-text training-support-text--accent">
                        Carga sugerida: {exercise.baseLoad}
                      </p>
                    ) : null}

                  <div className="training-set-stack">
                    {exercise.sets.map((setItem, setIndex) => (
                      <div className="training-set-card" key={setItem.id}>
                        <div className="exercise-card-head">
                          <strong>Série - {setItem.seriesNumber}</strong>
                          <button
                            type="button"
                            className="danger-button subtle"
                            onClick={() =>
                              requestRemoveDraftSet(
                                exercise.exerciseName,
                                exerciseIndex,
                                setIndex,
                                setItem.seriesNumber,
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
                              ref={element => {
                                if (setIndex === 0) {
                                  trainingExerciseLoadInputRefs.current[exerciseIndex] = element;
                                }
                              }}
                              value={setItem.load}
                              onChange={event =>
                                setTrainingPendingDrafts(current =>
                                  updateDraftSet(
                                    current,
                                    exerciseIndex,
                                    setIndex,
                                    'load',
                                    maskDecimalInput(event.target.value),
                                  ),
                                )
                              }
                              inputMode="decimal"
                              placeholder="0"
                            />
                          </label>
                          <label>
                            <span>Reps</span>
                            <input
                              value={setItem.reps}
                              onChange={event =>
                                setTrainingPendingDrafts(current =>
                                  updateDraftSet(
                                    current,
                                    exerciseIndex,
                                    setIndex,
                                    'reps',
                                    maskIntegerInput(event.target.value),
                                  ),
                                )
                              }
                              inputMode="numeric"
                              placeholder="0"
                            />
                          </label>
                        </div>

                        <label className="stacked-field">
                          <span>Anotação da série</span>
                          <textarea
                            value={setItem.note}
                            onChange={event =>
                              setTrainingPendingDrafts(current =>
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
                );
              })
            ) : (
              <div className="empty-card">
                Todos os exercícios foram finalizados. Salve o treino para concluir a sessão.
              </div>
            )}
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
            {busyAction === 'save-session' ? 'Salvando treino...' : 'Salvar treino'}
          </button>
        </div>
      )}
    </section>
  );

  const renderProfileWorkspace = () => (
    <section className="profile-layout">
      <div className="profile-card">
        <div className="profile-avatar">
          <ProfileAvatar avatarId={profileAvatarDraftId} size={88} />
        </div>

        <div className="profile-copy">
          <strong>{userProfile?.name?.trim() || user?.displayName?.trim() || user?.email || 'Atleta'}</strong>
          <p>{user?.email}</p>
          <span>Último login {lastLoginLabel}</span>
          <span className="profile-avatar-support">
            {busyAction === 'profile-avatar'
              ? 'Salvando avatar...'
              : isAvatarPickerCollapsed
                ? 'Avatar confirmado para esta conta.'
                : 'Escolha um personagem e confirme para salvar.'}
          </span>
        </div>
      </div>

      <div className="profile-avatar-picker">
        <div className="profile-avatar-picker-copy">
          <strong>Seu avatar</strong>
          <span>
            {isAvatarPickerCollapsed
              ? 'Apenas o avatar confirmado fica visível. Edite para trocar.'
              : 'Toque em um personagem e valide a escolha para salvar.'}
          </span>
        </div>

        <div className="profile-avatar-grid">
          {visibleProfileAvatars.map(avatar => {
            const isSelected = avatar.id === profileAvatarDraftId;

            return (
              <button
                key={avatar.id}
                type="button"
                className={isSelected ? 'profile-avatar-option active' : 'profile-avatar-option'}
                disabled={!user || isBusy}
                onClick={() => handleProfileAvatarSelected(avatar.id)}>
                <span className="profile-avatar-option-preview">
                  <ProfileAvatar avatarId={avatar.id} size={64} />
                </span>
                <span>{avatar.name}</span>
              </button>
            );
          })}
        </div>

        <div className="profile-avatar-actions">
          {isAvatarPickerCollapsed ? (
            <button
              type="button"
              className="secondary-button wide"
              disabled={!user || isBusy}
              onClick={handleEditProfileAvatar}>
              Trocar avatar
            </button>
          ) : (
            <button
              type="button"
              className="primary-button wide"
              disabled={!user || isBusy}
              onClick={handleConfirmProfileAvatar}>
              {busyAction === 'profile-avatar' ? (
                <LoaderCircle className="spin" size={16} />
              ) : null}
              {busyAction === 'profile-avatar' ? 'Validando avatar...' : 'Validar avatar'}
            </button>
          )}
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
          <h2>Visão geral do que já está salvo</h2>
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
          Exporte um arquivo criptografado com seus treinos, exercícios, sessões e séries para
          manter uma cópia segura fora do app.
        </p>
        <span>Ao restaurar, somente a conta atual pode usar esse arquivo.</span>
      </div>

      <div className="profile-info-card">
        <label className="field-label">
          <span>Senha da cópia</span>
          <input
            type="password"
            autoComplete="new-password"
            value={backupPassword}
            onChange={event => setBackupPassword(event.target.value)}
            disabled={Boolean(busyAction)}
          />
        </label>
        <label className="field-label">
          <span>Confirmar senha da cópia</span>
          <input
            type="password"
            autoComplete="new-password"
            value={backupPasswordConfirm}
            onChange={event => setBackupPasswordConfirm(event.target.value)}
            disabled={Boolean(busyAction)}
          />
        </label>
        <span>Use a mesma senha para exportar e restaurar backups protegidos.</span>
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
        accept="application/json,.json,.lgbak"
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
    <div
      className={
        authView === 'workspace'
          ? 'panel-shell panel-shell--workspace'
          : 'panel-shell panel-shell--auth'
      }>
      {errorMessage ? (
        <ErrorModal message={errorMessage} onClose={() => setErrorMessage(null)} />
      ) : null}
      {successModalMessage ? (
        <SuccessModal
          message={successModalMessage}
          onClose={() => setSuccessModalMessage(null)}
        />
      ) : null}
      {deleteConfirmation ? (
        <DeleteConfirmationModal
          title={deleteConfirmation.title}
          description={deleteConfirmation.description}
          confirmLabel={deleteConfirmation.confirmLabel}
          onConfirm={confirmDeleteAction}
          onCancel={() => setDeleteConfirmation(null)}
        />
      ) : null}
      {consultWorkout ? (
        <WorkoutConsultModal
          workout={consultWorkout}
          sessions={sessions}
          onClose={() => setConsultWorkout(null)}
        />
      ) : null}
      {authView === 'loading' ? (
        <main className="auth-stage">
          <section className="auth-panel auth-panel--loading" aria-live="polite">
            <div className="auth-brand">
              <BrandMark compact />
              <div>
                <p className="eyebrow">LogGYM</p>
                <h2>Restaurando sua sessão</h2>
              </div>
            </div>
            <p className="support-copy">Carregando seus treinos salvos.</p>
            <LoaderCircle className="spin auth-loading-icon" size={28} />
          </section>
        </main>
      ) : authView === 'workspace' ? (
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
                <button
                  className="ghost-button"
                  type="button"
                  onClick={openWorkoutCreationEditor}>
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

          {trainingCompletionSummary ? (
            <TrainingCompletionModal
              summary={trainingCompletionSummary}
              onClose={handleCloseTrainingCompletionModal}
            />
          ) : null}
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
                  <input
                    autoComplete="email"
                    placeholder="você@exemplo.com"
                    {...signInForm.register('email')}
                  />
                  <small>{signInForm.formState.errors.email?.message ?? ''}</small>
                </label>
                <label>
                  <span>Senha</span>
                  <input
                    type="password"
                    autoComplete="current-password"
                    placeholder="Sua senha"
                    {...signInForm.register('password')}
                  />
                  <small>{signInForm.formState.errors.password?.message ?? ''}</small>
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
                  <input
                    autoComplete="name"
                    placeholder="Seu nome"
                    {...signUpForm.register('name')}
                  />
                  <small>{signUpForm.formState.errors.name?.message ?? ''}</small>
                </label>
                <label>
                  <span>E-mail</span>
                  <input
                    autoComplete="email"
                    placeholder="você@exemplo.com"
                    {...signUpForm.register('email')}
                  />
                  <small>{signUpForm.formState.errors.email?.message ?? ''}</small>
                </label>
                <label>
                  <span>Senha</span>
                  <input
                    type="password"
                    autoComplete="new-password"
                    placeholder="Mínimo de 8 caracteres"
                    {...signUpForm.register('password')}
                  />
                  <small>{signUpForm.formState.errors.password?.message ?? ''}</small>
                </label>
                <label>
                  <span>Confirmar senha</span>
                  <input
                    type="password"
                    autoComplete="new-password"
                    placeholder="Repita a senha"
                    {...signUpForm.register('confirmPassword')}
                  />
                  <small>{signUpForm.formState.errors.confirmPassword?.message ?? ''}</small>
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
                  <input
                    autoComplete="email"
                    placeholder="você@exemplo.com"
                    {...resetForm.register('email')}
                  />
                  <small>{resetForm.formState.errors.email?.message ?? ''}</small>
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

const AppWithErrorBoundary = () => (
  <AppErrorBoundary>
    <App />
  </AppErrorBoundary>
);

export default AppWithErrorBoundary;
