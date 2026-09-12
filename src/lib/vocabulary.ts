import n1Csv from '@assets/n1_1789227949239.csv?raw';
import n2Csv from '@assets/n2_1789227949239.csv?raw';
import n3Csv from '@assets/n3_1789227949240.csv?raw';
import n4Csv from '@assets/n4_1789227949240.csv?raw';
import n5Csv from '@assets/n5_1789227949240.csv?raw';

import kill1 from '@assets/1valorant-1-kill_1789228346602.mp3';
import kill2 from '@assets/valorant-2-kills_1789228346602.mp3';
import kill3 from '@assets/valorant-3-kills_1789228346603.mp3';
import kill4 from '@assets/valorant-4-kills_1789228346603.mp3';
import kill5 from '@assets/valorant-5-kills_1789228346603.mp3';
import wrongSound from '@assets/grrr-angry-clash-royal-king-sound_1789228427019.mp3';
import highResultSound from '@assets/hey-antek-aseng_1789228707118.mp3';
import lowResultSound from '@assets/prabowo-sorry-ye_1789228744784.mp3';

export type Level = 'N1' | 'N2' | 'N3' | 'N4' | 'N5';
export type Word = { id: string; expression: string; reading: string; meaning: string; level: Level; tags: string[] };

const sources: Array<[string, string, Level]> = [
  [n1Csv, 'n1', 'N1'], [n2Csv, 'n2', 'N2'], [n3Csv, 'n3', 'N3'],
  [n4Csv, 'n4', 'N4'], [n5Csv, 'n5', 'N5'],
];

function parseLine(line: string) {
  const cells: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"' && line[i + 1] === '"' && quoted) { cell += '"'; i += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === ',' && !quoted) { cells.push(cell.trim()); cell = ''; }
    else cell += char;
  }
  cells.push(cell.trim());
  return cells;
}

function parseCsv(csv: string, source: string, level: Level): Word[] {
  return csv.split(/\r?\n/).slice(1).map(parseLine).filter((cells) => cells[0] && cells[1]).map((cells, index) => ({
    id: `${source}-${index}-${cells[0]}`,
    expression: cells[0],
    reading: cells[1],
    meaning: cells[2] || 'meaning not listed',
    level,
    tags: cells[3]?.split(/\s+/).filter(Boolean) ?? [],
  }));
}

const seen = new Set<string>();
export const vocabulary: Word[] = sources.flatMap(([csv, source, level]) => parseCsv(csv, source, level)).filter((word) => {
  const key = `${word.expression}|${word.reading}`;
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});

export const feedbackAudio = {
  kills: [kill1, kill2, kill3, kill4, kill5],
  wrong: wrongSound,
  high: highResultSound,
  low: lowResultSound,
};

export function playFeedback(src: string) {
  try {
    const audio = new Audio(src);
    audio.volume = 0.7;
    void audio.play().catch(() => undefined);
  } catch { /* Audio is unavailable in some embedded browsers. */ }
}

export function shuffle<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}