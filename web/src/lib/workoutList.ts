type WorkoutListItem = {
  id: string;
};

export const prioritizeStartedWorkouts = <TWorkout extends WorkoutListItem>(
  workouts: readonly TWorkout[],
  startedWorkoutIds: Iterable<string>,
): TWorkout[] => {
  const startedIds = new Set(startedWorkoutIds);
  const startedWorkouts: TWorkout[] = [];
  const remainingWorkouts: TWorkout[] = [];

  workouts.forEach(workout => {
    if (startedIds.has(workout.id)) {
      startedWorkouts.push(workout);
      return;
    }

    remainingWorkouts.push(workout);
  });

  return [...startedWorkouts, ...remainingWorkouts];
};
