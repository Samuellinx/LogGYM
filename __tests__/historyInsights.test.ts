import {
  buildHistoryInsights as buildMobileHistoryInsights,
} from '@/features/workouts/historyInsights';
import {
  buildHistoryInsights as buildWebHistoryInsights,
} from '../web/src/lib/historyInsights';

const sessions = [
  {
    id: 'session-5',
    workoutId: 'legs-1',
    workoutName: 'Pernas 1',
    focus: 'Pernas',
    performedAt: '2026-05-20T12:00:00.000Z',
    totalSets: 15,
    totalVolume: 9000,
    topLoad: 120,
  },
  {
    id: 'session-4',
    workoutId: 'chest-1',
    workoutName: 'Peito 1',
    focus: 'Peito',
    performedAt: '2026-05-19T12:00:00.000Z',
    totalSets: 12,
    totalVolume: 6000,
    topLoad: 80,
  },
  {
    id: 'session-3',
    workoutId: 'back-1',
    workoutName: 'Costas 1',
    focus: 'Costas',
    performedAt: '2026-05-13T12:00:00.000Z',
    totalSets: 8,
    totalVolume: 4000,
    topLoad: 70,
  },
  {
    id: 'session-2',
    workoutId: 'chest-1',
    workoutName: 'Peito 1',
    focus: 'Peito',
    performedAt: '2026-05-12T12:00:00.000Z',
    totalSets: 10,
    totalVolume: 5000,
    topLoad: 75,
  },
  {
    id: 'session-1',
    workoutId: 'chest-1',
    workoutName: 'Peito 1',
    focus: 'Peito',
    performedAt: '2026-05-06T12:00:00.000Z',
    totalSets: 9,
    totalVolume: 4500,
    topLoad: 70,
  },
];

describe('history insights', () => {
  it('builds the same weekly progress summary for mobile and web', () => {
    const options = {now: new Date('2026-05-21T12:00:00.000Z'), weeksToShow: 3};
    const mobileInsights = buildMobileHistoryInsights(sessions, options);
    const webInsights = buildWebHistoryInsights(sessions, options);

    expect(webInsights).toEqual(mobileInsights);
    expect(webInsights.currentWeek.sessions).toBe(2);
    expect(webInsights.currentWeek.totalVolume).toBe(15000);
    expect(webInsights.currentWeek.totalSets).toBe(27);
    expect(webInsights.currentWeek.topLoad).toBe(120);
    expect(webInsights.previousWeek.sessions).toBe(2);
    expect(webInsights.previousWeek.totalVolume).toBe(9000);
    expect(webInsights.comparison.volumeDelta).toBe(6000);
    expect(webInsights.comparison.setsDelta).toBe(9);
    expect(webInsights.comparison.sessionsDelta).toBe(0);
    expect(webInsights.comparison.volumePercent).toBeCloseTo(66.67, 1);
    expect(webInsights.weeklyTrend.map(week => week.label)).toEqual([
      '04/05',
      '11/05',
      '18/05',
    ]);
    expect(webInsights.weeklyTrend.map(week => week.totalVolume)).toEqual([
      4500,
      9000,
      15000,
    ]);
    expect(webInsights.focusDistribution[0]).toMatchObject({
      focus: 'Pernas',
      sessions: 1,
      totalVolume: 9000,
      share: 0.6,
    });
    expect(webInsights.focusDistribution[1]).toMatchObject({
      focus: 'Peito',
      sessions: 1,
      totalVolume: 6000,
      share: 0.4,
    });
    expect(webInsights.sessionProgress['session-4']).toMatchObject({
      previousSessionId: 'session-2',
      volumeDelta: 1000,
      topLoadDelta: 5,
      isTopLoadRecord: true,
      isFirstForWorkout: false,
    });
    expect(webInsights.sessionProgress['session-1']).toMatchObject({
      previousSessionId: null,
      isFirstForWorkout: true,
      isTopLoadRecord: false,
    });
  });
});
