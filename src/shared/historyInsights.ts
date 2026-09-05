export type HistoryInsightSession = {
  id: string;
  workoutId?: string | null;
  workoutName: string;
  focus: string;
  performedAt: string;
  totalSets: number;
  totalVolume: number;
  topLoad: number;
};

export type HistoryPeriodSummary = {
  sessions: number;
  totalSets: number;
  totalVolume: number;
  topLoad: number;
};

export type HistoryWeeklyBucket = HistoryPeriodSummary & {
  label: string;
  startsAt: string;
};

export type HistoryFocusDistributionItem = HistoryPeriodSummary & {
  focus: string;
  share: number;
};

export type HistorySessionProgress = {
  previousSessionId: string | null;
  volumeDelta: number | null;
  topLoadDelta: number | null;
  isTopLoadRecord: boolean;
  isFirstForWorkout: boolean;
};

export type HistoryInsights = {
  currentWeek: HistoryPeriodSummary;
  previousWeek: HistoryPeriodSummary;
  comparison: {
    sessionsDelta: number;
    setsDelta: number;
    volumeDelta: number;
    topLoadDelta: number;
    volumePercent: number | null;
  };
  weeklyTrend: HistoryWeeklyBucket[];
  focusDistribution: HistoryFocusDistributionItem[];
  sessionProgress: Record<string, HistorySessionProgress>;
};

export type BuildHistoryInsightsOptions = {
  now?: Date;
  weeksToShow?: number;
};

const padCalendarPart = (value: number) => value.toString().padStart(2, '0');

const extractCalendarDate = (value: string | Date) => {
  if (value instanceof Date) {
    return {
      year: value.getFullYear(),
      month: value.getMonth() + 1,
      day: value.getDate(),
    };
  }

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/u);

  if (!match) {
    return null;
  }

  const [, year, month, day] = match;

  return {
    year: Number(year),
    month: Number(month),
    day: Number(day),
  };
};

const toSessionDate = (value: string | Date) => {
  const calendarDate = extractCalendarDate(value);

  if (calendarDate) {
    return new Date(
      calendarDate.year,
      calendarDate.month - 1,
      calendarDate.day,
      12,
      0,
      0,
      0,
    );
  }

  return new Date(value);
};

const getWeekStart = (reference: Date) => {
  const weekStart = new Date(reference);
  const weekday = weekStart.getDay();
  const offset = weekday === 0 ? -6 : 1 - weekday;
  weekStart.setDate(weekStart.getDate() + offset);
  weekStart.setHours(0, 0, 0, 0);

  return weekStart;
};

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);

  return next;
};

const getSessionTimestamp = (session: HistoryInsightSession) =>
  toSessionDate(session.performedAt).getTime();

const isWithinPeriod = (
  session: HistoryInsightSession,
  start: Date,
  end: Date,
) => {
  const timestamp = getSessionTimestamp(session);

  return timestamp >= start.getTime() && timestamp < end.getTime();
};

const summarizeSessions = (
  sessions: HistoryInsightSession[],
): HistoryPeriodSummary => ({
  sessions: sessions.length,
  totalSets: sessions.reduce((sum, session) => sum + session.totalSets, 0),
  totalVolume: sessions.reduce((sum, session) => sum + session.totalVolume, 0),
  topLoad: sessions.reduce(
    (record, session) => Math.max(record, session.topLoad),
    0,
  ),
});

const getVolumePercent = (currentVolume: number, previousVolume: number) => {
  if (previousVolume <= 0) {
    return currentVolume > 0 ? 100 : null;
  }

  return ((currentVolume - previousVolume) / previousVolume) * 100;
};

const formatWeekLabel = (weekStart: Date) =>
  `${padCalendarPart(weekStart.getDate())}/${padCalendarPart(
    weekStart.getMonth() + 1,
  )}`;

const getWorkoutKey = (session: HistoryInsightSession) =>
  session.workoutId?.trim() ||
  session.workoutName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');

const buildSessionProgress = (sessions: HistoryInsightSession[]) => {
  const grouped = new Map<string, HistoryInsightSession[]>();
  const progress: Record<string, HistorySessionProgress> = {};

  sessions.forEach(session => {
    const key = getWorkoutKey(session);
    const group = grouped.get(key) ?? [];
    group.push(session);
    grouped.set(key, group);
  });

  grouped.forEach(group => {
    const orderedGroup = [...group].sort(
      (left, right) => getSessionTimestamp(left) - getSessionTimestamp(right),
    );

    orderedGroup.forEach((session, index) => {
      const previousSession = orderedGroup[index - 1] ?? null;
      const previousTopLoad = orderedGroup
        .slice(0, index)
        .reduce((record, item) => Math.max(record, item.topLoad), 0);

      progress[session.id] = {
        previousSessionId: previousSession?.id ?? null,
        volumeDelta: previousSession
          ? session.totalVolume - previousSession.totalVolume
          : null,
        topLoadDelta: previousSession ? session.topLoad - previousSession.topLoad : null,
        isTopLoadRecord: previousTopLoad > 0 && session.topLoad > previousTopLoad,
        isFirstForWorkout: !previousSession,
      };
    });
  });

  return progress;
};

const buildWeeklyTrend = (
  sessions: HistoryInsightSession[],
  currentWeekStart: Date,
  weeksToShow: number,
) =>
  Array.from({length: weeksToShow}, (_, index) => {
    const weekStart = addDays(currentWeekStart, (index - weeksToShow + 1) * 7);
    const weekEnd = addDays(weekStart, 7);
    const summary = summarizeSessions(
      sessions.filter(session => isWithinPeriod(session, weekStart, weekEnd)),
    );

    return {
      ...summary,
      label: formatWeekLabel(weekStart),
      startsAt: weekStart.toISOString(),
    };
  });

const buildFocusDistribution = (sessions: HistoryInsightSession[]) => {
  const currentWeekSummary = summarizeSessions(sessions);
  const grouped = new Map<string, HistoryInsightSession[]>();

  sessions.forEach(session => {
    const focus = session.focus.trim() || 'Treino';
    const group = grouped.get(focus) ?? [];
    group.push(session);
    grouped.set(focus, group);
  });

  return [...grouped.entries()]
    .map(([focus, focusSessions]) => {
      const summary = summarizeSessions(focusSessions);
      const baseTotal = currentWeekSummary.totalVolume || currentWeekSummary.totalSets;
      const focusTotal = currentWeekSummary.totalVolume
        ? summary.totalVolume
        : summary.totalSets;

      return {
        ...summary,
        focus,
        share: baseTotal > 0 ? focusTotal / baseTotal : 0,
      };
    })
    .sort((left, right) => right.totalVolume - left.totalVolume)
    .slice(0, 5);
};

export const buildHistoryInsights = (
  sessions: HistoryInsightSession[],
  {now = new Date(), weeksToShow = 8}: BuildHistoryInsightsOptions = {},
): HistoryInsights => {
  const currentWeekStart = getWeekStart(now);
  const nextWeekStart = addDays(currentWeekStart, 7);
  const previousWeekStart = addDays(currentWeekStart, -7);
  const currentWeekSessions = sessions.filter(session =>
    isWithinPeriod(session, currentWeekStart, nextWeekStart),
  );
  const previousWeekSessions = sessions.filter(session =>
    isWithinPeriod(session, previousWeekStart, currentWeekStart),
  );
  const currentWeek = summarizeSessions(currentWeekSessions);
  const previousWeek = summarizeSessions(previousWeekSessions);

  return {
    currentWeek,
    previousWeek,
    comparison: {
      sessionsDelta: currentWeek.sessions - previousWeek.sessions,
      setsDelta: currentWeek.totalSets - previousWeek.totalSets,
      volumeDelta: currentWeek.totalVolume - previousWeek.totalVolume,
      topLoadDelta: currentWeek.topLoad - previousWeek.topLoad,
      volumePercent: getVolumePercent(
        currentWeek.totalVolume,
        previousWeek.totalVolume,
      ),
    },
    weeklyTrend: buildWeeklyTrend(sessions, currentWeekStart, weeksToShow),
    focusDistribution: buildFocusDistribution(currentWeekSessions),
    sessionProgress: buildSessionProgress(sessions),
  };
};
