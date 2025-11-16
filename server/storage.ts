import { type Song, type InsertSong } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getCurrentTrack(): Promise<Song | null>;
  setCurrentTrack(song: Song | null): Promise<boolean>;

  getQueue(): Promise<Song[]>;
  addSongToQueue(song: InsertSong): Promise<Song>;
  removeFromQueue(songId: string): Promise<boolean>;
  clearQueue(): Promise<boolean>;

  getPlaybackState(): Promise<{ isPlaying: boolean; currentTime: number }>;
  updatePlaybackState(isPlaying: boolean, currentTime: number): Promise<boolean>;

  getAutoSelection(): Promise<boolean>;
  toggleAutoSelection(): Promise<boolean>;
  getRecentTracks(limit?: number): Promise<Song[]>;
}

interface AppState {
  currentTrack: Song | null;
  queue: Song[];
  isPlaying: boolean;
  currentTime: number;
  autoSelection: boolean;
  playHistory: Song[];
}

export class MemStorage implements IStorage {
  private state: AppState;

  constructor() {
    this.state = {
      currentTrack: null,
      queue: [],
      isPlaying: false,
      currentTime: 0,
      autoSelection: false,
      playHistory: [],
    };
  }

  async getCurrentTrack(): Promise<Song | null> {
    return this.state.currentTrack;
  }

  async setCurrentTrack(song: Song | null): Promise<boolean> {
    // Add current track to history if exists
    if (this.state.currentTrack) {
      this.state.playHistory.unshift(this.state.currentTrack);
      // Keep only last 10 tracks
      this.state.playHistory = this.state.playHistory.slice(0, 10);
    }

    this.state.currentTrack = song;
    this.state.currentTime = 0;
    return true;
  }

  async getQueue(): Promise<Song[]> {
    return this.state.queue;
  }

  async addSongToQueue(insertSong: InsertSong): Promise<Song> {
    const song: Song = {
      ...insertSong,
      id: randomUUID(),
      requestedAt: new Date(),
    };

    this.state.queue.push(song);

    // If no current track is playing, automatically start the first song
    if (!this.state.currentTrack && this.state.queue.length === 1) {
      this.state.currentTrack = song;
      this.state.queue = [];
      this.state.isPlaying = true;
      this.state.currentTime = 0;
    }

    return song;
  }

  async removeFromQueue(songId: string): Promise<boolean> {
    this.state.queue = this.state.queue.filter(song => song.id !== songId);
    return true;
  }

  async clearQueue(): Promise<boolean> {
    this.state.queue = [];
    return true;
  }

  async getPlaybackState(): Promise<{ isPlaying: boolean; currentTime: number }> {
    return {
      isPlaying: this.state.isPlaying,
      currentTime: this.state.currentTime,
    };
  }

  async updatePlaybackState(isPlaying: boolean, currentTime: number): Promise<boolean> {
    this.state.isPlaying = isPlaying;
    this.state.currentTime = currentTime;
    return true;
  }

  async getAutoSelection(): Promise<boolean> {
    return this.state.autoSelection;
  }

  async toggleAutoSelection(): Promise<boolean> {
    this.state.autoSelection = !this.state.autoSelection;
    return true;
  }

  async getRecentTracks(limit: number = 5): Promise<Song[]> {
    return this.state.playHistory.slice(0, limit);
  }

  // Helper method to get all state (for API response)
  // Returns Room-compatible format for backward compatibility with frontend
  async getAllState() {
    return {
      id: "default",
      code: "MUSIC",
      name: "iPod Music",
      currentTrack: this.state.currentTrack,
      queue: this.state.queue,
      participants: [],
      isPlaying: this.state.isPlaying,
      currentTime: this.state.currentTime,
      autoSelection: this.state.autoSelection,
      createdAt: new Date(),
    };
  }
}

export const storage = new MemStorage();
