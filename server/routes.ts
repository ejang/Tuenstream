import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertRoomSchema, insertParticipantSchema, insertSongSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Create WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  // Store WebSocket connections by room
  const roomConnections = new Map<string, Set<WebSocket>>();

  function broadcastToRoom(roomId: string, message: any) {
    const connections = roomConnections.get(roomId);
    if (connections) {
      const messageStr = JSON.stringify(message);
      connections.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(messageStr);
        }
      });
    }
  }

  wss.on('connection', (ws, req) => {
    let currentRoomId: string | null = null;

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'join_room') {
          currentRoomId = message.roomId;
          
          if (!roomConnections.has(currentRoomId)) {
            roomConnections.set(currentRoomId, new Set());
          }
          roomConnections.get(currentRoomId)!.add(ws);
          
          const room = await storage.getRoom(currentRoomId);
          if (room) {
            ws.send(JSON.stringify({
              type: 'room_state',
              data: room
            }));
          }
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      if (currentRoomId && roomConnections.has(currentRoomId)) {
        roomConnections.get(currentRoomId)!.delete(ws);
        if (roomConnections.get(currentRoomId)!.size === 0) {
          roomConnections.delete(currentRoomId);
        }
      }
    });
  });

  // YouTube search endpoint
  app.get("/api/youtube/search", async (req, res) => {
    try {
      const { q } = req.query;
      if (!q || typeof q !== 'string') {
        return res.status(400).json({ message: "Query parameter 'q' is required" });
      }

      const apiKey = process.env.YOUTUBE_API_KEY || process.env.VITE_YOUTUBE_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ message: "YouTube API key not configured" });
      }

      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=10&q=${encodeURIComponent(q)}&type=video&key=${apiKey}`;
      const videoDetailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&key=${apiKey}`;

      const searchResponse = await fetch(searchUrl);
      const searchData = await searchResponse.json();

      if (!searchData.items) {
        return res.json([]);
      }

      const videoIds = searchData.items.map((item: any) => item.id.videoId).join(',');
      const detailsResponse = await fetch(`${videoDetailsUrl}&id=${videoIds}`);
      const detailsData = await detailsResponse.json();

      const results = searchData.items.map((item: any, index: number) => {
        const duration = detailsData.items[index]?.contentDetails?.duration || 'PT0S';
        const formattedDuration = formatDuration(duration);
        
        return {
          id: item.id.videoId,
          title: item.snippet.title,
          artist: item.snippet.channelTitle,
          duration: formattedDuration,
          thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
        };
      });

      res.json(results);
    } catch (error) {
      console.error('YouTube search error:', error);
      res.status(500).json({ message: "Failed to search YouTube" });
    }
  });

  // Room endpoints
  app.post("/api/rooms", async (req, res) => {
    try {
      const roomData = insertRoomSchema.parse(req.body);
      const room = await storage.createRoom(roomData);
      res.json(room);
    } catch (error) {
      res.status(400).json({ message: "Invalid room data" });
    }
  });

  app.get("/api/rooms/:id", async (req, res) => {
    try {
      const room = await storage.getRoom(req.params.id);
      if (!room) {
        return res.status(404).json({ message: "Room not found" });
      }
      res.json(room);
    } catch (error) {
      res.status(500).json({ message: "Failed to get room" });
    }
  });

  app.get("/api/rooms/code/:code", async (req, res) => {
    try {
      const room = await storage.getRoomByCode(req.params.code);
      if (!room) {
        return res.status(404).json({ message: "Room not found" });
      }
      res.json(room);
    } catch (error) {
      res.status(500).json({ message: "Failed to get room" });
    }
  });

  // Queue endpoints
  app.post("/api/rooms/:roomId/queue", async (req, res) => {
    try {
      const songData = insertSongSchema.parse(req.body);
      const song = await storage.addSongToQueue(req.params.roomId, songData);
      
      if (!song) {
        return res.status(404).json({ message: "Room not found" });
      }

      const room = await storage.getRoom(req.params.roomId);
      broadcastToRoom(req.params.roomId, {
        type: 'queue_updated',
        data: room
      });

      res.json(song);
    } catch (error) {
      res.status(400).json({ message: "Invalid song data" });
    }
  });

  app.delete("/api/rooms/:roomId/queue/:songId", async (req, res) => {
    try {
      const success = await storage.removeFromQueue(req.params.roomId, req.params.songId);
      if (!success) {
        return res.status(404).json({ message: "Room or song not found" });
      }

      const room = await storage.getRoom(req.params.roomId);
      broadcastToRoom(req.params.roomId, {
        type: 'queue_updated',
        data: room
      });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to remove song" });
    }
  });

  app.delete("/api/rooms/:roomId/queue", async (req, res) => {
    try {
      const success = await storage.clearQueue(req.params.roomId);
      if (!success) {
        return res.status(404).json({ message: "Room not found" });
      }

      const room = await storage.getRoom(req.params.roomId);
      broadcastToRoom(req.params.roomId, {
        type: 'queue_updated',
        data: room
      });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to clear queue" });
    }
  });

  // Participant endpoints
  app.post("/api/rooms/:roomId/participants", async (req, res) => {
    try {
      const participantData = insertParticipantSchema.parse(req.body);
      const participant = await storage.addParticipant(req.params.roomId, participantData);
      
      if (!participant) {
        return res.status(404).json({ message: "Room not found" });
      }

      const room = await storage.getRoom(req.params.roomId);
      broadcastToRoom(req.params.roomId, {
        type: 'participants_updated',
        data: room
      });

      res.json(participant);
    } catch (error) {
      res.status(400).json({ message: "Invalid participant data" });
    }
  });

  // Playback control endpoints
  app.post("/api/rooms/:roomId/play", async (req, res) => {
    try {
      const { currentTime } = req.body;
      const success = await storage.updatePlaybackState(req.params.roomId, true, currentTime || 0);
      
      if (!success) {
        return res.status(404).json({ message: "Room not found" });
      }

      broadcastToRoom(req.params.roomId, {
        type: 'playback_state_changed',
        data: { isPlaying: true, currentTime: currentTime || 0 }
      });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to update playback state" });
    }
  });

  app.post("/api/rooms/:roomId/pause", async (req, res) => {
    try {
      const { currentTime } = req.body;
      const success = await storage.updatePlaybackState(req.params.roomId, false, currentTime || 0);
      
      if (!success) {
        return res.status(404).json({ message: "Room not found" });
      }

      broadcastToRoom(req.params.roomId, {
        type: 'playback_state_changed',
        data: { isPlaying: false, currentTime: currentTime || 0 }
      });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to update playback state" });
    }
  });

  app.post("/api/rooms/:roomId/next", async (req, res) => {
    try {
      const room = await storage.getRoom(req.params.roomId);
      if (!room || room.queue.length === 0) {
        return res.status(404).json({ message: "Room not found or queue is empty" });
      }

      const nextSong = room.queue[0];
      await storage.setCurrentTrack(req.params.roomId, nextSong);
      await storage.removeFromQueue(req.params.roomId, nextSong.id);

      const updatedRoom = await storage.getRoom(req.params.roomId);
      broadcastToRoom(req.params.roomId, {
        type: 'track_changed',
        data: updatedRoom
      });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to skip to next track" });
    }
  });

  return httpServer;
}

function formatDuration(duration: string): string {
  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  if (!match) return '0:00';

  const hours = (match[1] || '').replace('H', '');
  const minutes = (match[2] || '').replace('M', '');
  const seconds = (match[3] || '').replace('S', '');

  if (hours) {
    return `${hours}:${minutes.padStart(2, '0')}:${seconds.padStart(2, '0')}`;
  } else {
    return `${minutes || '0'}:${seconds.padStart(2, '0')}`;
  }
}
