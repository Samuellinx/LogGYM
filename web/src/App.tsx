import {useEffect, useMemo, useState} from 'react';
import type {User} from 'firebase/auth';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {
  CloudCog,
  Dumbbell,
  History,
  LoaderCircle,
  LogOut,
  Mail,
  PencilLine,
  Plus,
  Search,
  Trash2,
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
import {deleteWorkoutFromPanel, saveWorkoutFromPanel, watchRecentSessions, watchWorkouts} from './lib/workouts';
import type {AuthMode, WorkoutDocument, WorkoutExerciseInput, WorkoutSessionDocument} from './types';

const signInSchema = z.object({
  email: z.string().trim().email('Use um e-mail valido.'),
  password: z.string().min(8, 'A senha precisa ter pelo menos 8 caracteres.'),
});

const signUpSchema = z
  .object({
    name: z.string().trim().min(2, 'Informe seu nome.'),
    email: z.string().trim().email('Use um e-mail valido.'),
    password: z.string().min(8, 'A senha precisa ter pelo menos 8 caracteres.'),
    confirmPassword: z.string(),
  })
  .refine(values => values.password === values.confirmPassword, {
    message: 'As senhas nao conferem.',
    path: ['confirmPassword'],
  });

const resetSchema = z.object({
  email: z.string().trim().email('Use um e-mail valido.'),
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
  'Terca',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sabado',
  'Domingo',
];

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

const modeLabels: Record<AuthMode, string> = {
  signin: 'Entrar',
  signup: 'Criar conta',
  forgot: 'Esqueci a senha',
};

function App() {
  const [authMode, setAuthMode] = useState<AuthMode>('signin');
  const [user, setUser] = useState<User | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [workouts, setWorkouts] = useState<WorkoutDocument[]>([]);
  const [recentSessions, setRecentSessions] = useState<WorkoutSessionDocument[]>([]);
  const [editorWorkout, setEditorWorkout] = useState<WorkoutDocument>(() =>
    createWorkoutDraft(),
  );

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
          setRecentSessions([]);
          setEditorWorkout(createWorkoutDraft());
        }
      }),
    [],
  );

  useEffect(() => {
    if (!user) {
      return;
    }

    const unsubscribeWorkouts = watchWorkouts(user.uid, setWorkouts);
    const unsubscribeSessions = watchRecentSessions(user.uid, sessions =>
      setRecentSessions(sessions.slice(0, 5)),
    );

    return () => {
      unsubscribeWorkouts();
      unsubscribeSessions();
    };
  }, [user]);

  const filteredWorkouts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return workouts;
    }

    return workouts.filter(workout =>
      `${workout.name} ${workout.focus} ${workout.notes} ${workout.exercises
        .map(exercise => exercise.name)
        .join(' ')}`.toLowerCase().includes(normalizedSearch),
    );
  }, [search, workouts]);

  const totalExercises = useMemo(
    () => workouts.reduce((sum, workout) => sum + workout.exercises.length, 0),
    [workouts],
  );

  const totalTrackedSets = useMemo(
    () => recentSessions.reduce((sum, sessionItem) => sum + sessionItem.totalSets, 0),
    [recentSessions],
  );

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
      setErrorMessage(error instanceof Error ? error.message : 'Falha ao entrar com Google.');
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
      setErrorMessage(error instanceof Error ? error.message : 'Falha ao entrar com e-mail.');
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
      setStatusMessage('Conta criada. O painel foi liberado para esta conta.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Falha ao criar a conta.');
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
        'Se existir uma conta com esse e-mail, o link de redefinicao foi enviado.',
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Falha ao enviar o e-mail.',
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
      setErrorMessage(error instanceof Error ? error.message : 'Falha ao sair da conta.');
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
        throw new Error('Adicione pelo menos um exercicio antes de salvar.');
      }

      await saveWorkoutFromPanel(user, normalizedWorkout);
      setStatusMessage('Treino salvo e pronto para sincronizar com o app.');
      setEditorWorkout(normalizedWorkout);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Falha ao salvar o treino.');
    } finally {
      setBusyAction(null);
    }
  };

  const handleEditWorkout = (workout: WorkoutDocument) => {
    clearFeedback();
    setEditorWorkout({
      ...workout,
      scheduledDay: workout.scheduledDay ?? 'Livre',
      exercises: workout.exercises.length
        ? workout.exercises
        : [createExerciseDraft()],
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

      setStatusMessage('Treino excluido do painel e da sincronizacao.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Falha ao excluir o treino.');
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <div className="panel-shell">
      <aside className="marketing-panel">
        <div className="brand-lockup">
          <div className="brand-badge">
            <Dumbbell size={24} />
          </div>
          <div>
            <p className="eyebrow">LogGYM Control Center</p>
            <h1>Painel web para editar treinos por usuario.</h1>
          </div>
        </div>

        <p className="hero-copy">
          Cadastre seus templates no navegador, mantenha tudo em Firestore e deixe o app mobile puxar o mesmo conteudo por conta.
        </p>

        <div className="hero-grid">
          <article className="hero-card">
            <CloudCog size={18} />
            <strong>Firebase compartilhado</strong>
            <span>Auth + Firestore com escopo por usuario e regras restritivas.</span>
          </article>
          <article className="hero-card">
            <PencilLine size={18} />
            <strong>Editor rapido</strong>
            <span>Crie foco, dia, cor e lista de exercicios em poucos toques.</span>
          </article>
          <article className="hero-card">
            <History size={18} />
            <strong>Visao de uso</strong>
            <span>Veja quantos treinos e execucoes recentes estao vinculados a conta.</span>
          </article>
        </div>

        <div className="hero-footer">
          <p>Android package esperado no Firebase: <code>com.loggym</code></p>
          <p>Em DEV web, lembre de autorizar <code>localhost</code> no Firebase Auth.</p>
        </div>
      </aside>

      <main className="workspace-panel">
        {user ? (
          <>
            <header className="workspace-header">
              <div>
                <p className="eyebrow">Sessao ativa</p>
                <h2>{user.displayName || user.email}</h2>
                <p className="support-copy">
                  Tudo o que voce salvar aqui vai para o mesmo usuario do app.
                </p>
              </div>

              <div className="header-actions">
                <button
                  className="ghost-button"
                  type="button"
                  onClick={resetEditor}>
                  <Plus size={16} />
                  Novo treino
                </button>
                <button
                  className="primary-button"
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
            </header>

            {errorMessage ? <div className="feedback error">{errorMessage}</div> : null}
            {statusMessage ? <div className="feedback success">{statusMessage}</div> : null}

            <section className="workspace-metrics">
              <article className="metric-card">
                <span>Treinos</span>
                <strong>{workouts.length}</strong>
              </article>
              <article className="metric-card">
                <span>Exercicios cadastrados</span>
                <strong>{totalExercises}</strong>
              </article>
              <article className="metric-card">
                <span>Series recentes</span>
                <strong>{totalTrackedSets}</strong>
              </article>
            </section>

            <section className="workspace-grid">
              <div className="column-panel">
                <div className="panel-head">
                  <div>
                    <p className="eyebrow">Treinos salvos</p>
                    <h3>Biblioteca sincronizada</h3>
                  </div>
                  <label className="search-box">
                    <Search size={16} />
                    <input
                      placeholder="Buscar treino, foco ou exercicio"
                      value={search}
                      onChange={event => setSearch(event.target.value)}
                    />
                  </label>
                </div>

                <div className="workout-list">
                  {filteredWorkouts.length ? (
                    filteredWorkouts.map(workout => (
                      <article className="workout-card" key={workout.id}>
                        <div className="workout-card-top">
                          <div className="accent-dot" style={{background: workout.accentColor}} />
                          <div>
                            <strong>{workout.name}</strong>
                            <p>
                              {workout.focus} · {workout.exercises.length} exercicios
                            </p>
                          </div>
                        </div>
                        <p className="workout-notes">
                          {workout.notes || 'Sem observacoes extras.'}
                        </p>
                        <div className="chip-row">
                          <span className="soft-chip">
                            {workout.scheduledDay || 'Livre'}
                          </span>
                          <span className="soft-chip">
                            Atualizado {new Date(workout.updatedAt).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                        <div className="card-actions">
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
                      Nenhum treino encontrado para esta busca.
                    </div>
                  )}
                </div>

                <div className="panel-head secondary">
                  <div>
                    <p className="eyebrow">Execucoes</p>
                    <h3>Historico recente</h3>
                  </div>
                </div>

                <div className="session-list">
                  {recentSessions.length ? (
                    recentSessions.map(sessionItem => (
                      <article className="session-card" key={sessionItem.id}>
                        <strong>{sessionItem.workoutName}</strong>
                        <p>
                          {new Date(sessionItem.performedAt).toLocaleDateString('pt-BR')} ·{' '}
                          {sessionItem.totalSets} series · pico {sessionItem.topLoad} kg
                        </p>
                      </article>
                    ))
                  ) : (
                    <div className="empty-card">
                      As execucoes feitas no app vao aparecer aqui quando forem sincronizadas.
                    </div>
                  )}
                </div>
              </div>

              <div className="column-panel editor">
                <div className="panel-head">
                  <div>
                    <p className="eyebrow">Editor</p>
                    <h3>{workouts.some(item => item.id === editorWorkout.id) ? 'Editar treino' : 'Novo treino'}</h3>
                  </div>
                  <button type="button" className="ghost-button" onClick={resetEditor}>
                    Limpar
                  </button>
                </div>

                <div className="editor-grid">
                  <label>
                    <span>Nome do treino</span>
                    <input
                      value={editorWorkout.name}
                      onChange={event => updateEditor('name', event.target.value)}
                      placeholder="Ex: Upper pesado"
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
                      onChange={event =>
                        updateEditor('scheduledDay', event.target.value || 'Livre')
                      }>
                      {weekdayOptions.map(option => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div>
                    <span>Cor destaque</span>
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
                    placeholder="Observacoes que devem aparecer no app."
                    rows={4}
                  />
                </label>

                <div className="exercise-head">
                  <div>
                    <p className="eyebrow">Exercicios</p>
                    <h4>Monte o treino como ele deve aparecer no app</h4>
                  </div>
                  <button type="button" className="ghost-button" onClick={addExercise}>
                    <Plus size={16} />
                    Adicionar exercicio
                  </button>
                </div>

                <div className="exercise-stack">
                  {editorWorkout.exercises.map((exercise, index) => (
                    <article className="exercise-card" key={exercise.id}>
                      <div className="exercise-card-head">
                        <strong>Exercicio {index + 1}</strong>
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
                            onChange={event =>
                              updateExercise(exercise.id, 'name', event.target.value)
                            }
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
                            placeholder="Ex: 20 kg | 2 plates"
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
                        <span>Observacao do exercicio</span>
                        <textarea
                          value={exercise.note}
                          onChange={event =>
                            updateExercise(exercise.id, 'note', event.target.value)
                          }
                          rows={3}
                          placeholder="Dica que deve aparecer durante a execucao."
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
        ) : (
          <section className="auth-panel">
            <div className="auth-head">
              <p className="eyebrow">Conta compartilhada</p>
              <h2>Entre para gerenciar os treinos que vao aparecer no app.</h2>
              <p className="support-copy">
                Use o mesmo Firebase Auth do LogGYM mobile: Google ou e-mail/senha.
              </p>
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
                <CloudCog size={16} />
              )}
              Entrar com Google
            </button>

            {authMode === 'signin' ? (
              <form className="auth-form" onSubmit={handleEmailLogin}>
                <label>
                  <span>E-mail</span>
                  <input placeholder="voce@exemplo.com" {...signInForm.register('email')} />
                  <small>{signInForm.formState.errors.email?.message}</small>
                </label>
                <label>
                  <span>Senha</span>
                  <input type="password" placeholder="Sua senha" {...signInForm.register('password')} />
                  <small>{signInForm.formState.errors.password?.message}</small>
                </label>
                <button className="secondary-button wide" type="submit">
                  {busyAction === 'signin' ? (
                    <LoaderCircle className="spin" size={16} />
                  ) : (
                    <Mail size={16} />
                  )}
                  Entrar com e-mail
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
                  <input placeholder="voce@exemplo.com" {...signUpForm.register('email')} />
                  <small>{signUpForm.formState.errors.email?.message}</small>
                </label>
                <label>
                  <span>Senha</span>
                  <input type="password" placeholder="Minimo de 8 caracteres" {...signUpForm.register('password')} />
                  <small>{signUpForm.formState.errors.password?.message}</small>
                </label>
                <label>
                  <span>Confirmar senha</span>
                  <input type="password" placeholder="Repita a senha" {...signUpForm.register('confirmPassword')} />
                  <small>{signUpForm.formState.errors.confirmPassword?.message}</small>
                </label>
                <button className="secondary-button wide" type="submit">
                  {busyAction === 'signup' ? (
                    <LoaderCircle className="spin" size={16} />
                  ) : (
                    <Plus size={16} />
                  )}
                  Criar conta
                </button>
              </form>
            ) : null}

            {authMode === 'forgot' ? (
              <form className="auth-form" onSubmit={handleResetPassword}>
                <label>
                  <span>E-mail</span>
                  <input placeholder="voce@exemplo.com" {...resetForm.register('email')} />
                  <small>{resetForm.formState.errors.email?.message}</small>
                </label>
                <button className="secondary-button wide" type="submit">
                  {busyAction === 'forgot' ? (
                    <LoaderCircle className="spin" size={16} />
                  ) : (
                    <Mail size={16} />
                  )}
                  Enviar link de redefinicao
                </button>
              </form>
            ) : null}
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
