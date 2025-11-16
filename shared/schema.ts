import { z } from "zod";

export const songSchema = z.object({
  id: z.string(),
  youtubeId: z.string(),
  title: z.string(),
  artist: z.string(),
  duration: z.string(),
  thumbnail: z.string(),
  requestedBy: z.string(),
  requestedAt: z.date(),
});

export const youtubeSearchResultSchema = z.object({
  id: z.string(),
  title: z.string(),
  artist: z.string(),
  duration: z.string(),
  thumbnail: z.string(),
});

export const playerStateSchema = z.object({
  currentTrack: songSchema.nullable(),
  queue: z.array(songSchema),
  isPlaying: z.boolean(),
  currentTime: z.number(),
  autoSelection: z.boolean(),
});

// Room schema for backward compatibility with frontend
export const roomSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  currentTrack: songSchema.nullable(),
  queue: z.array(songSchema),
  participants: z.array(z.any()), // Empty array for compatibility
  isPlaying: z.boolean(),
  currentTime: z.number(),
  autoSelection: z.boolean(),
  createdAt: z.date(),
});

export const insertSongSchema = songSchema.omit({
  id: true,
  requestedAt: true,
});

export type Song = z.infer<typeof songSchema>;
export type YoutubeSearchResult = z.infer<typeof youtubeSearchResultSchema>;
export type PlayerState = z.infer<typeof playerStateSchema>;
export type Room = z.infer<typeof roomSchema>;
export type InsertSong = z.infer<typeof insertSongSchema>;
