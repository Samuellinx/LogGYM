import {CalendarDays, Check, Clock3, X} from 'lucide-react';

import type {DeleteConfirmationCopy} from '../lib/deleteConfirmation';
import {
  formatExercisePerformanceRecord,
  formatSuggestedLoad,
  formatTrainingMetric,
} from '../lib/trainingFormat';
import {
  getExercisePerformanceRecordFromSessions,
  resolveSessionFinishedAt,
  type TrainingCompletionSummary,
} from '../lib/trainingSession';
import type {WorkoutDocument, WorkoutSessionDocument} from '../types';

type BasicModalProps = {
  message: string;
  onClose: () => void;
};

export const ErrorModal = ({message, onClose}: BasicModalProps) => (
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

export const SuccessModal = ({
  message,
  actionLabel = 'Continuar',
  onClose,
}: BasicModalProps & {
  actionLabel?: string;
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
        {actionLabel}
      </button>
    </section>
  </div>
);

export const DeleteConfirmationModal = ({
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

const workoutLastSessionTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const getSessionTimestamp = (session: WorkoutSessionDocument) => {
  const timestamp = new Date(session.performedAt).getTime();

  return Number.isFinite(timestamp) ? timestamp : 0;
};

const getSessionFinishedTimestamp = (session: WorkoutSessionDocument) => {
  const timestamp = new Date(resolveSessionFinishedAt(session) ?? '').getTime();

  return Number.isFinite(timestamp) ? timestamp : 0;
};

const getLatestWorkoutSession = (
  workoutId: string,
  sessions: WorkoutSessionDocument[],
) =>
  sessions
    .filter(session => session.workoutId === workoutId)
    .sort((left, right) => {
      const performedDelta = getSessionTimestamp(right) - getSessionTimestamp(left);

      return performedDelta !== 0
        ? performedDelta
        : getSessionFinishedTimestamp(right) - getSessionFinishedTimestamp(left);
    })[0] ?? null;

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

export const TrainingCompletionModal = ({
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
      <button
        aria-label="Fechar informações do treino"
        className="training-completion-close"
        type="button"
        onClick={onClose}>
        <X size={16} />
        Fechar
      </button>

      <div className="training-completion-scroll">
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
      </div>

      <button className="primary-button wide" type="button" onClick={onClose}>
        Continuar
      </button>
    </section>
  </div>
);

export const WorkoutConsultModal = ({
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
            Finalizado em:{' '}
            <strong>
              {formatWorkoutLastSessionTime(
                latestSession ? resolveSessionFinishedAt(latestSession) : null,
              )}
            </strong>
          </span>
        </div>

        <div className="workout-consult-notes">
          <span>Observações</span>
          <p>{workout.notes || 'Sem observações extras para este treino.'}</p>
        </div>

        <div className="workout-consult-exercises">
          <span className="workout-consult-section-title">Exercícios</span>
          {workout.exercises.map((exercise, index) => {
            const registeredPerformanceRecord = getExercisePerformanceRecordFromSessions(
              workout.id,
              exercise,
              sessions,
            );

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
                    ? `Maior carga registrada: ${formatExercisePerformanceRecord(
                        registeredPerformanceRecord,
                      )}`
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
