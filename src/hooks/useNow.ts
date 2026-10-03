import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

export type Granularity = 'minute' | 'day';

const pad = (n: number) => String(n).padStart(2, '0');

function keyOf(d: Date, granularity: Granularity): string {
  const day = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return granularity === 'day' ? day : `${day} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * A hora atual, que anda sozinha. As abas ficam montadas o dia inteiro (e o
 * app pode voltar do segundo plano no dia seguinte): sem isso, "faltam 5 min",
 * "acontecendo agora", a saudação e o versículo do dia ficariam parados.
 *
 * Só redesenha quando o minuto (ou o dia) muda, e na volta do segundo plano.
 */
export function useNow(granularity: Granularity = 'minute'): Date {
  const [state, setState] = useState(() => {
    const date = new Date();
    return { key: keyOf(date, granularity), date };
  });

  useEffect(() => {
    const tick = () => {
      const date = new Date();
      const key = keyOf(date, granularity);
      // Mesmo minuto: devolve o estado anterior e o React não redesenha.
      setState((prev) => (prev.key === key ? prev : { key, date }));
    };
    tick();
    const id = setInterval(tick, 15000);
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') tick();
    });
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [granularity]);

  return state.date;
}
