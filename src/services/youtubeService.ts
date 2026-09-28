import AsyncStorage from '@react-native-async-storage/async-storage';

const API = 'https://www.googleapis.com/youtube/v3';
const CHANNEL_ID = 'UCp8El__iNcoGDlD4Lt9h-hg';
// Todo canal tem uma playlist automática com os uploads: o ID é o do canal
// com o prefixo "UC" trocado por "UU".
const UPLOADS_PLAYLIST_ID = 'UU' + CHANNEL_ID.slice(2);

const HOUR = 60 * 60 * 1000;

// A cota da API é por chave, compartilhada entre todos os aparelhos. Os TTLs
// seguram o consumo em ~7 unidades por usuário por dia.
const TTL_SERIES = 24 * HOUR;
const TTL_SERIE_VIDEOS = 24 * HOUR;
const TTL_CULTOS = 3 * HOUR;

// Devocionais do canal têm 5–9 min; cultos e ministrações, 40 min ou mais.
const MIN_CULTO_SECONDS = 20 * 60;

export interface Serie {
  id: string;
  title: string;
  videoCount: number;
  thumbnail?: string;
}

export interface Video {
  id: string;
  title: string;
  publishedAt: string;
  thumbnail?: string;
  durationSeconds: number;
}

export interface CultosPage {
  videos: Video[];
  nextPageToken?: string;
}

export interface WatchProgress {
  video: Video;
  seconds: number;
}

type Thumbnails = Record<string, { url: string } | undefined>;

const pickThumbnail = (t?: Thumbnails) => (t?.medium ?? t?.high ?? t?.default)?.url;

/**
 * "PT1H6M37S" -> 3997; "P1DT2H" -> 93600. Transmissões ao vivo em andamento
 * vêm como "P0D" -> 0. Os dias ficam antes do "T", então não dá para procurar
 * só por "PT".
 */
function parseDuration(iso: string): number {
  const m = iso.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/);
  if (!m) return 0;
  return (
    Number(m[1] ?? 0) * 86400 +
    Number(m[2] ?? 0) * 3600 +
    Number(m[3] ?? 0) * 60 +
    Number(m[4] ?? 0)
  );
}

async function get<T>(path: string, params: Record<string, string>): Promise<T> {
  const key = process.env.EXPO_PUBLIC_YOUTUBE_API_KEY;
  if (!key) {
    throw new Error('EXPO_PUBLIC_YOUTUBE_API_KEY não configurada no .env');
  }
  const query = new URLSearchParams({ ...params, key }).toString();
  const res = await fetch(`${API}/${path}?${query}`);
  // Proxy ou portal de Wi-Fi podem responder HTML: não dá para supor JSON.
  const body = await res.json().catch(() => null);
  if (!res.ok || !body) {
    throw new Error(body?.error?.message ?? `YouTube API respondeu ${res.status}`);
  }
  return body as T;
}

const inFlight = new Map<string, Promise<unknown>>();

/**
 * Pedidos simultâneos pela mesma chave — dois toques, troca rápida de aba,
 * "tentar novamente" — esperam a mesma busca em vez de gastar cota em dobro.
 */
function cached<T>(key: string, ttl: number, load: () => Promise<T>): Promise<T> {
  const pending = inFlight.get(key);
  if (pending) return pending as Promise<T>;
  // Sai do mapa ao terminar, com sucesso ou falha, para que uma nova tentativa
  // depois de um erro de fato busque de novo.
  const promise = readThrough(key, ttl, load).finally(() => inFlight.delete(key));
  inFlight.set(key, promise);
  return promise;
}

/**
 * Serve do cache enquanto estiver dentro do TTL. Vencido, busca de novo; se a
 * busca falhar (sem rede, cota esgotada), devolve o cache vencido mesmo —
 * lista antiga é melhor que tela de erro.
 */
async function readThrough<T>(key: string, ttl: number, load: () => Promise<T>): Promise<T> {
  let entry: { at: number; data: T } | null = null;
  try {
    const raw = await AsyncStorage.getItem(key);
    entry = raw ? JSON.parse(raw) : null;
  } catch {
    entry = null;
  }

  if (entry && Date.now() - entry.at < ttl) return entry.data;

  try {
    const data = await load();
    AsyncStorage.setItem(key, JSON.stringify({ at: Date.now(), data })).catch(() => {});
    return data;
  } catch (error) {
    if (entry) return entry.data;
    throw error;
  }
}

interface PlaylistItemsResponse {
  nextPageToken?: string;
  items: { contentDetails: { videoId: string } }[];
}

interface VideosResponse {
  items: {
    id: string;
    snippet: { title: string; publishedAt: string; thumbnails: Thumbnails };
    contentDetails: { duration: string };
  }[];
}

/**
 * Busca uma página de uma playlist já com a duração de cada vídeo. São duas
 * chamadas (2 unidades): playlistItems não traz duração. Vídeos privados ou
 * removidos somem naturalmente, porque /videos não os retorna.
 */
async function fetchPlaylistPage(playlistId: string, pageToken?: string) {
  const page = await get<PlaylistItemsResponse>('playlistItems', {
    part: 'contentDetails',
    playlistId,
    maxResults: '50',
    ...(pageToken ? { pageToken } : {}),
  });

  const ids = page.items.map((i) => i.contentDetails.videoId);
  if (ids.length === 0) return { videos: [], nextPageToken: page.nextPageToken };

  const details = await get<VideosResponse>('videos', {
    part: 'snippet,contentDetails',
    id: ids.join(','),
  });

  const byId = new Map(details.items.map((v) => [v.id, v]));
  const videos: Video[] = [];
  for (const id of ids) {
    const v = byId.get(id);
    if (!v) continue;
    videos.push({
      id,
      title: v.snippet.title,
      publishedAt: v.snippet.publishedAt,
      thumbnail: pickThumbnail(v.snippet.thumbnails),
      durationSeconds: parseDuration(v.contentDetails.duration),
    });
  }
  return { videos, nextPageToken: page.nextPageToken };
}

interface PlaylistsResponse {
  items: {
    id: string;
    snippet: { title: string; thumbnails: Thumbnails };
    contentDetails: { itemCount: number };
  }[];
}

/** As playlists do canal, que são as séries de ministração. */
export function fetchSeries(): Promise<Serie[]> {
  return cached('yt:series', TTL_SERIES, async () => {
    const res = await get<PlaylistsResponse>('playlists', {
      part: 'snippet,contentDetails',
      channelId: CHANNEL_ID,
      maxResults: '50',
    });
    return res.items
      .filter((p) => p.contentDetails.itemCount > 0)
      .map((p) => ({
        id: p.id,
        title: p.snippet.title,
        videoCount: p.contentDetails.itemCount,
        thumbnail: pickThumbnail(p.snippet.thumbnails),
      }));
  });
}

/**
 * Todos os vídeos de uma série. Hoje a maior tem 22, mas elas crescem: sem
 * seguir as páginas, uma série com mais de 50 seria cortada em silêncio.
 */
export function fetchSerieVideos(playlistId: string): Promise<Video[]> {
  return cached(`yt:serie:${playlistId}`, TTL_SERIE_VIDEOS, async () => {
    const all: Video[] = [];
    let pageToken: string | undefined;
    do {
      const page = await fetchPlaylistPage(playlistId, pageToken);
      all.push(...page.videos);
      pageToken = page.nextPageToken;
    } while (pageToken);
    return all;
  });
}

/**
 * Cultos e ministrações completas, do mais recente para o mais antigo. Só a
 * primeira página entra em cache; as seguintes são buscadas sob demanda.
 */
export async function fetchCultos(pageToken?: string): Promise<CultosPage> {
  const load = async () => {
    const page = await fetchPlaylistPage(UPLOADS_PLAYLIST_ID, pageToken);
    return {
      videos: page.videos.filter((v) => v.durationSeconds >= MIN_CULTO_SECONDS),
      nextPageToken: page.nextPageToken,
    };
  };
  return pageToken ? load() : cached('yt:cultos', TTL_CULTOS, load);
}

const PROGRESS_KEY = 'yt:progress';

export async function loadProgress(): Promise<WatchProgress | null> {
  try {
    const raw = await AsyncStorage.getItem(PROGRESS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function saveProgress(progress: WatchProgress | null): Promise<void> {
  try {
    if (progress) {
      await AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
    } else {
      await AsyncStorage.removeItem(PROGRESS_KEY);
    }
  } catch {
    // Perder o "continuar assistindo" não justifica interromper o usuário.
  }
}
