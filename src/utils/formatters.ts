import {format, formatDistanceToNowStrict, isToday, isYesterday} from 'date-fns';
import {ptBR} from 'date-fns/locale';

export const formatSessionDate = (value: string | null) => {
  if (!value) {
    return 'Ainda não executado';
  }

  const date = new Date(value);

  if (isToday(date)) {
    return `Hoje, ${format(date, 'HH:mm', {locale: ptBR})}`;
  }

  if (isYesterday(date)) {
    return `Ontem, ${format(date, 'HH:mm', {locale: ptBR})}`;
  }

  return format(date, "dd 'de' MMM", {locale: ptBR});
};

export const formatDateLong = (value: string) =>
  format(new Date(value), "dd 'de' MMM yyyy, HH:mm", {locale: ptBR});

export const formatRelativeTime = (value: string) =>
  formatDistanceToNowStrict(new Date(value), {
    addSuffix: true,
    locale: ptBR,
  });

export const formatLoad = (value: number) =>
  `${value.toLocaleString('pt-BR', {
    minimumFractionDigits: value % 1 === 0 ? 0 : 1,
    maximumFractionDigits: 1,
  })} kg`;

export const formatReps = (value: number) =>
  value.toLocaleString('pt-BR', {
    minimumFractionDigits: value % 1 === 0 ? 0 : 1,
    maximumFractionDigits: 1,
  });

export const formatExercisePerformanceRecord = ({
  load,
  reps,
}: {
  load: number;
  reps: number;
}) => `${formatLoad(load)} - ${formatReps(reps)} reps`;

export const formatVolume = (value: number) =>
  `${Math.round(value).toLocaleString('pt-BR')} kg`;

export const formatCompactNumber = (value: number) =>
  value.toLocaleString('pt-BR', {
    notation: 'compact',
    maximumFractionDigits: 1,
  });

export const titleCase = (value: string) =>
  value
    .split(' ')
    .filter(Boolean)
    .map(word => word[0].toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
