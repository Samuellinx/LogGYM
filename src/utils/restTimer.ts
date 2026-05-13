export const defaultRestTimerSeconds = 30;

export const restTimerPresets = [
  {label: '30s', seconds: 30},
  {label: '1 min', seconds: 60},
  {label: '2 min', seconds: 120},
  {label: '3 min', seconds: 180},
  {label: '4 min', seconds: 240},
] as const;

export const formatRestTimerTime = (seconds: number) => {
  const normalizedSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(normalizedSeconds / 60);
  const remainingSeconds = normalizedSeconds % 60;

  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
};
