import {
  createAudioPlayer,
  type AudioMetadata,
  type AudioPlayer,
  type AudioSource,
  type AudioStatus,
} from 'expo-audio';
import { create } from 'zustand';

import { getTrackById } from '@/db/repositories/tracksRepo';
import { uriFromRelative } from '@/download/fs';
import { logger } from '@/lib/logger';
import type { RepeatMode, Track } from '@/types/models';

type PlayerStore = {
  currentTrackId: string | null;
  currentIndex: number;
  isPlaying: boolean;
  isBuffering: boolean;
  positionSec: number;
  durationSec: number;
  shuffle: boolean;
  repeat: RepeatMode;
  queueTrackIds: string[];
  originalOrder: string[];

  setQueueAndPlay: (trackIds: string[], startIndex: number) => void;
  togglePlay: () => void;
  next: () => void;
  previous: () => void;
  seek: (sec: number) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  jumpTo: (index: number) => void;
  addToQueue: (trackId: string) => void;
  playNext: (trackId: string) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
};

let player: AudioPlayer | null = null;
let subscription: { remove: () => void } | null = null;

function ensurePlayer(): AudioPlayer {
  if (player) return player;
  player = createAudioPlayer(null, { updateInterval: 500 });
  subscription = player.addListener('playbackStatusUpdate', handleStatus);
  return player;
}

function sourceForTrack(track: Track): AudioSource | null {
  if (track.downloadState === 'downloaded' && track.relativePath) {
    return { uri: uriFromRelative(track.relativePath) };
  }
  if (track.streamUrl) return { uri: track.streamUrl };
  if (track.isDownloadable === 1 && track.downloadUrl) return { uri: track.downloadUrl };
  return null;
}

function metaForTrack(track: Track): AudioMetadata {
  return {
    title: track.title,
    artist: track.artist ?? undefined,
    albumTitle: track.album ?? undefined,
    artworkUrl: track.artworkUrl ?? undefined,
  };
}

function shuffleArray<T>(input: T[]): T[] {
  const arr = [...input];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

function loadIndex(index: number, autoPlay: boolean): void {
  const state = usePlayer.getState();
  const trackId = state.queueTrackIds[index];
  if (!trackId) return;
  const track = getTrackById(trackId);
  if (!track) return;
  const source = sourceForTrack(track);
  if (!source) {
    logger.warn('No playable source for track', { trackId });
    return;
  }
  const audioPlayer = ensurePlayer();
  audioPlayer.replace(source);
  audioPlayer.setActiveForLockScreen(true, metaForTrack(track), {
    showSeekForward: true,
    showSeekBackward: true,
  });
  usePlayer.setState({
    currentIndex: index,
    currentTrackId: trackId,
    positionSec: 0,
    durationSec: track.durationSec ?? 0,
    isPlaying: autoPlay,
  });
  if (autoPlay) audioPlayer.play();
}

function goNext(auto: boolean): void {
  const state = usePlayer.getState();
  const count = state.queueTrackIds.length;
  if (count === 0) return;
  const atEnd = state.currentIndex >= count - 1;
  if (atEnd) {
    if (state.repeat === 'queue' || !auto) {
      loadIndex(0, true);
    } else {
      ensurePlayer().pause();
      usePlayer.setState({ isPlaying: false });
    }
    return;
  }
  loadIndex(state.currentIndex + 1, true);
}

function goPrevious(): void {
  const state = usePlayer.getState();
  if (state.positionSec > 3) {
    void ensurePlayer().seekTo(0);
    usePlayer.setState({ positionSec: 0 });
    return;
  }
  let prevIndex = state.currentIndex - 1;
  if (prevIndex < 0) prevIndex = state.repeat === 'queue' ? state.queueTrackIds.length - 1 : 0;
  loadIndex(prevIndex, true);
}

function handleStatus(status: AudioStatus): void {
  const prev = usePlayer.getState();
  usePlayer.setState({
    isPlaying: status.playing,
    isBuffering: status.isBuffering,
    positionSec: Number.isFinite(status.currentTime) ? status.currentTime : prev.positionSec,
    durationSec:
      Number.isFinite(status.duration) && status.duration > 0 ? status.duration : prev.durationSec,
  });
  if (status.didJustFinish) {
    if (usePlayer.getState().repeat === 'track') {
      const audioPlayer = ensurePlayer();
      void audioPlayer.seekTo(0).then(() => audioPlayer.play());
    } else {
      goNext(true);
    }
  }
}

export const usePlayer = create<PlayerStore>((set, get) => ({
  currentTrackId: null,
  currentIndex: 0,
  isPlaying: false,
  isBuffering: false,
  positionSec: 0,
  durationSec: 0,
  shuffle: false,
  repeat: 'off',
  queueTrackIds: [],
  originalOrder: [],

  setQueueAndPlay: (trackIds, startIndex) => {
    if (trackIds.length === 0) return;
    const index = Math.max(0, Math.min(startIndex, trackIds.length - 1));
    set({ queueTrackIds: trackIds, originalOrder: trackIds, currentIndex: index, shuffle: false });
    loadIndex(index, true);
  },

  togglePlay: () => {
    const state = get();
    const audioPlayer = ensurePlayer();
    if (!state.currentTrackId) {
      if (state.queueTrackIds.length > 0) loadIndex(state.currentIndex, true);
      return;
    }
    if (state.isPlaying) {
      audioPlayer.pause();
      set({ isPlaying: false });
    } else {
      audioPlayer.play();
      set({ isPlaying: true });
    }
  },

  next: () => goNext(false),
  previous: () => goPrevious(),

  seek: (sec) => {
    void ensurePlayer().seekTo(sec);
    set({ positionSec: sec });
  },

  toggleShuffle: () => {
    const state = get();
    const current = state.queueTrackIds[state.currentIndex];
    if (!state.shuffle) {
      const rest = state.queueTrackIds.filter((_, i) => i !== state.currentIndex);
      const shuffled = shuffleArray(rest);
      const nextQueue = current ? [current, ...shuffled] : shuffled;
      set({ shuffle: true, queueTrackIds: nextQueue, currentIndex: current ? 0 : state.currentIndex });
    } else {
      const restored = [...state.originalOrder];
      const nextIndex = current ? restored.indexOf(current) : state.currentIndex;
      set({ shuffle: false, queueTrackIds: restored, currentIndex: nextIndex >= 0 ? nextIndex : 0 });
    }
  },

  cycleRepeat: () => {
    const order: RepeatMode[] = ['off', 'queue', 'track'];
    const index = order.indexOf(get().repeat);
    set({ repeat: order[(index + 1) % order.length] });
  },

  jumpTo: (index) => loadIndex(index, true),

  addToQueue: (trackId) => {
    const state = get();
    if (state.queueTrackIds.includes(trackId)) return;
    set({
      queueTrackIds: [...state.queueTrackIds, trackId],
      originalOrder: [...state.originalOrder, trackId],
    });
    if (!state.currentTrackId) loadIndex(state.queueTrackIds.length, true);
  },

  playNext: (trackId) => {
    const state = get();
    const currentId = state.currentTrackId;
    if (trackId === currentId) return; // already the current track
    const queue = state.queueTrackIds.filter((id) => id !== trackId);
    const order = state.originalOrder.filter((id) => id !== trackId);
    if (!currentId) {
      queue.unshift(trackId);
      order.unshift(trackId);
      set({ queueTrackIds: queue, originalOrder: order, currentIndex: 0 });
      loadIndex(0, true);
      return;
    }
    // Insert right after the still-playing track, then recompute its index so
    // currentIndex never drifts away from currentTrackId (e.g. re-queueing an
    // earlier track shifts later elements left). Keep originalOrder in sync so a
    // later un-shuffle restores a correct, complete list.
    const currentPos = queue.indexOf(currentId);
    const insertAt = currentPos >= 0 ? currentPos + 1 : state.currentIndex + 1;
    queue.splice(insertAt, 0, trackId);
    const orderPos = order.indexOf(currentId);
    order.splice(orderPos >= 0 ? orderPos + 1 : order.length, 0, trackId);
    const newIndex = queue.indexOf(currentId);
    set({
      queueTrackIds: queue,
      originalOrder: order,
      currentIndex: newIndex >= 0 ? newIndex : state.currentIndex,
    });
  },

  removeFromQueue: (index) => {
    const state = get();
    if (index < 0 || index >= state.queueTrackIds.length) return;
    const removedId = state.queueTrackIds[index];
    const removingCurrent = index === state.currentIndex;
    const queue = state.queueTrackIds.filter((_, i) => i !== index);
    const order = state.originalOrder.filter((id) => id !== removedId);
    let currentIndex = state.currentIndex;
    if (index < state.currentIndex) currentIndex -= 1;
    if (queue.length === 0) {
      ensurePlayer().pause();
      set({ queueTrackIds: [], originalOrder: [], currentIndex: 0, currentTrackId: null, isPlaying: false });
      return;
    }
    const clamped = Math.min(currentIndex, queue.length - 1);
    set({ queueTrackIds: queue, originalOrder: order, currentIndex: clamped });
    if (removingCurrent) loadIndex(clamped, state.isPlaying);
  },

  clearQueue: () => {
    if (subscription) {
      subscription.remove();
      subscription = null;
    }
    if (player) {
      player.pause();
      player.remove();
      player = null;
    }
    set({
      queueTrackIds: [],
      originalOrder: [],
      currentIndex: 0,
      currentTrackId: null,
      isPlaying: false,
      positionSec: 0,
      durationSec: 0,
    });
  },
}));
