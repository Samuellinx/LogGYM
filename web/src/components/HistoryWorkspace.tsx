import {useMemo} from 'react';
import {BarChart3, LoaderCircle, Search, Sparkles, Trash2} from 'lucide-react';

import {
  filterSessionsBySearch,
  formatLoad,
  formatSessionDate,
  formatVolume,
} from '../lib/dashboard';
import {
  buildHistoryInsights,
  type HistorySessionProgress,
} from '../lib/historyInsights';
import type {WorkspaceView, WorkoutSessionDocument} from '../types';

type HistoryWorkspaceProps = {
  sessions: WorkoutSessionDocument[];
  historySearch: string;
  busyAction: string | null;
  onHistorySearchChange: (value: string) => void;
  onDeleteSession: (sessionItem: WorkoutSessionDocument) => void;
  onOpenExerciseProgress: (
    exerciseName: string,
    returnTo: WorkspaceView,
  ) => void;
};

const normalizeToken = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

const formatSignedInteger = (value: number, suffix: string) => {
  if (value === 0) {
    return `0 ${suffix}`;
  }

  return `${value > 0 ? '+' : '-'}${Math.abs(value)} ${suffix}`;
};

const formatSignedVolume = (value: number) => {
  if (value === 0) {
    return '0 kg';
  }

  return `${value > 0 ? '+' : '-'}${formatVolume(Math.abs(value))}`;
};

const formatSignedPercent = (value: number | null) => {
  if (value === null) {
    return 'sem semana anterior';
  }

  if (value === 0) {
    return '0%';
  }

  return `${value > 0 ? '+' : '-'}${Math.abs(value).toFixed(0)}%`;
};

const getHistorySessionProgressLabel = (progress?: HistorySessionProgress) => {
  if (!progress) {
    return 'Sem comparação';
  }

  if (progress.isFirstForWorkout) {
    return 'Primeira execução deste treino';
  }

  if (progress.volumeDelta === null) {
    return 'Sem execução anterior';
  }

  return `${formatSignedVolume(progress.volumeDelta)} vs treino anterior`;
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

export const HistoryWorkspace = ({
  sessions,
  historySearch,
  busyAction,
  onHistorySearchChange,
  onDeleteSession,
  onOpenExerciseProgress,
}: HistoryWorkspaceProps) => {
  const filteredHistory = useMemo(
    () => filterSessionsBySearch(sessions, historySearch),
    [historySearch, sessions],
  );
  const historyInsights = useMemo(
    () => buildHistoryInsights(filteredHistory),
    [filteredHistory],
  );
  const maxWeeklyHistoryVolume = useMemo(
    () =>
      Math.max(
        ...historyInsights.weeklyTrend.map(week => week.totalVolume),
        1,
      ),
    [historyInsights],
  );
  const historyTotalVolume = useMemo(
    () => filteredHistory.reduce((sum, sessionItem) => sum + sessionItem.totalVolume, 0),
    [filteredHistory],
  );

  return (
    <div className="history-layout">
      <section className="column-panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Histórico</p>
            <h2>Progresso dos treinos</h2>
          </div>

          <label className="search-box">
            <Search size={20} />
            <input
              placeholder="Supino, legs, upper..."
              value={historySearch}
              onChange={event => onHistorySearchChange(event.target.value)}
            />
          </label>
        </div>

        <div className="history-summary">
          <strong>{filteredHistory.length} sessões no filtro</strong>
          <p>{formatVolume(historyTotalVolume)} de volume total registrado</p>
        </div>

        <div className="workspace-metrics history-metrics-grid">
          <article className="metric-card history-insight-card">
            <span>Treinos na semana</span>
            <strong>{historyInsights.currentWeek.sessions}</strong>
            <small>
              {formatSignedInteger(historyInsights.comparison.sessionsDelta, 'sessões')}
            </small>
          </article>
          <article className="metric-card history-insight-card">
            <span>Volume semanal</span>
            <strong>{formatVolume(historyInsights.currentWeek.totalVolume)}</strong>
            <small>{formatSignedPercent(historyInsights.comparison.volumePercent)}</small>
          </article>
          <article className="metric-card history-insight-card">
            <span>Séries concluídas</span>
            <strong>{historyInsights.currentWeek.totalSets}</strong>
            <small>{formatSignedInteger(historyInsights.comparison.setsDelta, 'séries')}</small>
          </article>
          <article className="metric-card history-insight-card">
            <span>Maior carga</span>
            <strong>{formatLoad(historyInsights.currentWeek.topLoad)}</strong>
            <small>{formatSignedVolume(historyInsights.comparison.topLoadDelta)}</small>
          </article>
        </div>
      </section>

      <section className="history-insight-grid">
        <div className="column-panel history-progress-panel">
          <div className="panel-head secondary">
            <div>
              <p className="eyebrow">Semana a semana</p>
              <h2>Volume e consistência recente</h2>
            </div>
            <BarChart3 size={20} />
          </div>

          <div className="history-week-list">
            {historyInsights.weeklyTrend.map(week => {
              const barWidth = (week.totalVolume / maxWeeklyHistoryVolume) * 100;

              return (
                <div className="history-week-row" key={week.startsAt}>
                  <span>{week.label}</span>
                  <div className="history-week-track" aria-hidden="true">
                    <div
                      className="history-week-bar"
                      style={{width: `${barWidth}%`}}
                    />
                  </div>
                  <strong>
                    {week.sessions}x - {formatVolume(week.totalVolume)}
                  </strong>
                </div>
              );
            })}
          </div>
        </div>

        <div className="column-panel history-progress-panel">
          <div className="panel-head secondary">
            <div>
              <p className="eyebrow">Foco da semana</p>
              <h2>Distribuição por volume</h2>
            </div>
            <Sparkles size={20} />
          </div>

          {historyInsights.focusDistribution.length ? (
            <div className="history-focus-list">
              {historyInsights.focusDistribution.map(item => (
                <div className="history-focus-row" key={item.focus}>
                  <div>
                    <strong>{item.focus}</strong>
                    <span>
                      {item.sessions} sessões - {item.totalSets} séries
                    </span>
                  </div>
                  <em>{Math.round(item.share * 100)}%</em>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-card">
              Conclua treinos nesta semana para ver os focos mais treinados.
            </div>
          )}
        </div>
      </section>

      <section className="column-panel">
        <div className="panel-head secondary">
          <div>
            <p className="eyebrow">Sessões</p>
            <h2>Treinos salvos</h2>
          </div>
        </div>

        <div className="session-list session-list--history">
          {filteredHistory.length ? (
            filteredHistory.map(sessionItem => {
              const sessionProgress = historyInsights.sessionProgress[sessionItem.id];

              return (
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
                        onClick={() => onDeleteSession(sessionItem)}>
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

                  <div className="history-progress-badges">
                    <span className="soft-chip">
                      {getHistorySessionProgressLabel(sessionProgress)}
                    </span>
                    {sessionProgress?.isTopLoadRecord ? (
                      <span className="soft-chip soft-chip--accent">Recorde de carga</span>
                    ) : null}
                  </div>

                  {sessionItem.overallNotes ? (
                    <p className="session-card-note">{sessionItem.overallNotes}</p>
                  ) : null}

                  <div className="chip-row">
                    {sessionItem.exercises.map(exercise => (
                      <button
                        key={`${sessionItem.id}-${exercise.exerciseName}`}
                        type="button"
                        className="soft-chip soft-chip--button"
                        onClick={() =>
                          onOpenExerciseProgress(exercise.exerciseName, 'history')
                        }>
                        {exercise.exerciseName}
                      </button>
                    ))}
                  </div>
                </article>
              );
            })
          ) : (
            <div className="empty-card">
              Sem execuções para mostrar. Conclua um treino para preencher o histórico.
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
