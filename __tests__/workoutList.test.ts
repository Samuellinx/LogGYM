import {prioritizeStartedWorkouts} from '@/features/workouts/workoutList';
import {prioritizeStartedWorkouts as prioritizeStartedWebWorkouts} from '../web/src/lib/workoutList';

describe('workout list ordering', () => {
  const workouts = [
    {id: 'upper', name: 'Upper'},
    {id: 'legs', name: 'Legs'},
    {id: 'push', name: 'Push'},
    {id: 'pull', name: 'Pull'},
  ];

  it('moves started mobile workouts to the top and preserves the existing order', () => {
    const ordered = prioritizeStartedWorkouts(workouts, ['push', 'legs']);

    expect(ordered.map(workout => workout.id)).toEqual([
      'legs',
      'push',
      'upper',
      'pull',
    ]);
    expect(workouts.map(workout => workout.id)).toEqual([
      'upper',
      'legs',
      'push',
      'pull',
    ]);
  });

  it('moves started web workouts to the top and accepts a Set of started ids', () => {
    const ordered = prioritizeStartedWebWorkouts(
      workouts,
      new Set(['pull', 'upper']),
    );

    expect(ordered.map(workout => workout.id)).toEqual([
      'upper',
      'pull',
      'legs',
      'push',
    ]);
  });
});
