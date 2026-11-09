const relative = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });

/** "há pouco", "há 3 horas", "ontem", "há 5 dias". */
export function since(date: Date, now = new Date()): string {
  const minutes = Math.round((now.getTime() - date.getTime()) / 60_000);
  if (minutes < 60) {
    return 'há pouco';
  }
  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return relative.format(-hours, 'hour');
  }
  return relative.format(-Math.round(hours / 24), 'day');
}
