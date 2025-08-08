import { type Room, type Song, type Participant, type InsertRoom, type InsertParticipant, type InsertSong } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getRoom(id: string): Promise<Room | undefined>;
  getRoomByCode(code: string): Promise<Room | undefined>;
  createRoom(room: InsertRoom): Promise<Room>;
  updateRoom(id: string, updates: Partial<Room>): Promise<Room | undefined>;
  
  addSongToQueue(roomId: string, song: InsertSong): Promise<Song | undefined>;
  removeFromQueue(roomId: string, songId: string): Promise<boolean>;
  clearQueue(roomId: string): Promise<boolean>;
  
  addParticipant(roomId: string, participant: InsertParticipant): Promise<Participant | undefined>;
  removeParticipant(roomId: string, participantId: string): Promise<boolean>;
  
  setCurrentTrack(roomId: string, song: Song | null): Promise<boolean>;
  updatePlaybackState(roomId: string, isPlaying: boolean, currentTime: number): Promise<boolean>;
  
  toggleAutoSelection(roomId: string): Promise<boolean>;
  getRecentTracks(roomId: string, limit?: number): Promise<Song[]>;
}

export class MemStorage implements IStorage {
  private rooms: Map<string, Room>;

  constructor() {
    this.rooms = new Map();
  }

  async getRoom(id: string): Promise<Room | undefined> {
    return this.rooms.get(id);
  }

  async getRoomByCode(code: string): Promise<Room | undefined> {
    return Array.from(this.rooms.values()).find(room => room.code === code);
  }

  async createRoom(insertRoom: InsertRoom): Promise<Room> {
    const id = randomUUID();
    const room: Room = {
      ...insertRoom,
      id,
      currentTrack: null,
      queue: [],
      participants: [],
      isPlaying: false,
      currentTime: 0,
      autoSelection: false,
      createdAt: new Date(),
    };
    this.rooms.set(id, room);
    return room;
  }

  async updateRoom(id: string, updates: Partial<Room>): Promise<Room | undefined> {
    const room = this.rooms.get(id);
    if (!room) return undefined;
    
    const updatedRoom = { ...room, ...updates };
    this.rooms.set(id, updatedRoom);
    return updatedRoom;
  }

  async addSongToQueue(roomId: string, insertSong: InsertSong): Promise<Song | undefined> {
    const room = this.rooms.get(roomId);
    if (!room) return undefined;

    const song: Song = {
      ...insertSong,
      id: randomUUID(),
      requestedAt: new Date(),
    };

    const updatedRoom = {
      ...room,
      queue: [...room.queue, song],
    };
    
    // If no current track is playing, automatically start the first song
    if (!updatedRoom.currentTrack && updatedRoom.queue.length === 1) {
      updatedRoom.currentTrack = song;
      updatedRoom.queue = [];
      updatedRoom.isPlaying = true;
      updatedRoom.currentTime = 0;
    }
    
    this.rooms.set(roomId, updatedRoom);
    
    // Update participant song count
    const participantIndex = updatedRoom.participants.findIndex(p => p.name === song.requestedBy);
    if (participantIndex !== -1) {
      updatedRoom.participants[participantIndex].songsAdded += 1;
      this.rooms.set(roomId, updatedRoom);
    }
    
    return song;
  }

  async removeFromQueue(roomId: string, songId: string): Promise<boolean> {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    const updatedRoom = {
      ...room,
      queue: room.queue.filter(song => song.id !== songId),
    };
    
    this.rooms.set(roomId, updatedRoom);
    return true;
  }

  async clearQueue(roomId: string): Promise<boolean> {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    const updatedRoom = {
      ...room,
      queue: [],
    };
    
    this.rooms.set(roomId, updatedRoom);
    return true;
  }

  async addParticipant(roomId: string, insertParticipant: InsertParticipant): Promise<Participant | undefined> {
    const room = this.rooms.get(roomId);
    if (!room) return undefined;

    // Check if participant already exists
    const existingParticipant = room.participants.find(p => p.name === insertParticipant.name);
    if (existingParticipant) return existingParticipant;

    const participant: Participant = {
      ...insertParticipant,
      id: randomUUID(),
      songsAdded: 0,
      joinedAt: new Date(),
    };

    const updatedRoom = {
      ...room,
      participants: [...room.participants, participant],
    };
    
    this.rooms.set(roomId, updatedRoom);
    return participant;
  }

  async removeParticipant(roomId: string, participantId: string): Promise<boolean> {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    const updatedRoom = {
      ...room,
      participants: room.participants.filter(p => p.id !== participantId),
    };
    
    this.rooms.set(roomId, updatedRoom);
    return true;
  }

  async setCurrentTrack(roomId: string, song: Song | null): Promise<boolean> {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    const updatedRoom = {
      ...room,
      currentTrack: song,
      currentTime: 0,
    };
    
    this.rooms.set(roomId, updatedRoom);
    return true;
  }

  async updatePlaybackState(roomId: string, isPlaying: boolean, currentTime: number): Promise<boolean> {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    const updatedRoom = {
      ...room,
      isPlaying,
      currentTime,
    };
    
    this.rooms.set(roomId, updatedRoom);
    return true;
  }

  async toggleAutoSelection(roomId: string): Promise<boolean> {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    const updatedRoom = {
      ...room,
      autoSelection: !room.autoSelection,
    };
    
    this.rooms.set(roomId, updatedRoom);
    return true;
  }

  async getRecentTracks(roomId: string, limit: number = 5): Promise<Song[]> {
    const room = this.rooms.get(roomId);
    if (!room) return [];

    // For in-memory storage, we'll maintain a simple recent tracks list
    // In a real database, you'd query a separate played_tracks table
    const recentTracks: Song[] = [];
    
    if (room.currentTrack) {
      recentTracks.push(room.currentTrack);
    }
    
    return recentTracks.slice(0, limit);
  }
}

export const storage = new MemStorage();
