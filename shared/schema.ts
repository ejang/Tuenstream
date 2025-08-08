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

export const participantSchema = z.object({
  id: z.string(),
  name: z.string(),
  initials: z.string(),
  songsAdded: z.number(),
  joinedAt: z.date(),
});

export const roomSchema = z.object({
  id: z.string(),
  code: z.string(),
  currentTrack: songSchema.nullable(),
  queue: z.array(songSchema),
  participants: z.array(participantSchema),
  isPlaying: z.boolean(),
  currentTime: z.number(),
  autoSelection: z.boolean().default(false),
  createdAt: z.date(),
});

export const youtubeSearchResultSchema = z.object({
  id: z.string(),
  title: z.string(),
  artist: z.string(),
  duration: z.string(),
  thumbnail: z.string(),
});

export const insertSongSchema = songSchema.omit({
  id: true,
  requestedAt: true,
});

export const insertParticipantSchema = participantSchema.omit({
  id: true,
  songsAdded: true,
  joinedAt: true,
});

export const insertRoomSchema = roomSchema.omit({
  id: true,
  currentTrack: true,
  queue: true,
  participants: true,
  isPlaying: true,
  currentTime: true,
  autoSelection: true,
  createdAt: true,
});

export type Song = z.infer<typeof songSchema>;
export type Participant = z.infer<typeof participantSchema>;
export type Room = z.infer<typeof roomSchema>;
export type YoutubeSearchResult = z.infer<typeof youtubeSearchResultSchema>;
export type InsertSong = z.infer<typeof insertSongSchema>;
export type InsertParticipant = z.infer<typeof insertParticipantSchema>;
export type InsertRoom = z.infer<typeof insertRoomSchema>;
