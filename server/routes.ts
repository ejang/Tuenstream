import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertRoomSchema, insertParticipantSchema, insertSongSchema } from "@shared/schema";
import { getAIMusicRecommendations, shouldTriggerAutoSelection } from "./ai-service";

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
          
          if (currentRoomId) {
            if (!roomConnections.has(currentRoomId)) {
              roomConnections.set(currentRoomId, new Set());
            }
            const roomWs = roomConnections.get(currentRoomId);
            if (roomWs) {
              roomWs.add(ws);
            }
            
            const room = await storage.getRoom(currentRoomId);
            if (room) {
              ws.send(JSON.stringify({
                type: 'room_state',
                data: room
              }));
            }
          }
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      if (currentRoomId && roomConnections.has(currentRoomId)) {
        const roomWs = roomConnections.get(currentRoomId);
        if (roomWs) {
          roomWs.delete(ws);
          if (roomWs.size === 0) {
            roomConnections.delete(currentRoomId);
          }
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

      const apiKey = process.env.GOOGLE_API_KEY || process.env.YOUTUBE_API_KEY || process.env.VITE_YOUTUBE_API_KEY;
      
      if (!apiKey) {
        console.error('YouTube API key not configured');
        return res.status(500).json({ message: "YouTube API key not configured" });
      }

      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=10&q=${encodeURIComponent(q)}&type=video&key=${apiKey}`;
      
      const searchResponse = await fetch(searchUrl);
      const searchData = await searchResponse.json();

      if (!searchResponse.ok) {
        if (searchData.error?.code === 403 && searchData.error?.errors?.[0]?.reason === 'quotaExceeded') {
          return res.status(503).json({ 
            message: "YouTube API 일일 할당량이 초과되었습니다. 내일 다시 시도해주세요.", 
            error: "QUOTA_EXCEEDED" 
          });
        }
        return res.status(500).json({ message: "YouTube API error", error: searchData });
      }

      if (!searchData.items || searchData.items.length === 0) {
        return res.json([]);
      }

      const videoIds = searchData.items.map((item: any) => item.id.videoId).join(',');
      const videoDetailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&key=${apiKey}`;
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
      res.status(500).json({ message: "Failed to search YouTube", error: error instanceof Error ? error.message : String(error) });
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

  app.post("/api/rooms/:roomId/sync", async (req, res) => {
    try {
      const { currentTime } = req.body;
      const success = await storage.updatePlaybackState(req.params.roomId, true, currentTime || 0);
      
      if (!success) {
        return res.status(404).json({ message: "Room not found" });
      }

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to sync playback time" });
    }
  });

  app.post("/api/rooms/:roomId/next", async (req, res) => {
    try {
      const room = await storage.getRoom(req.params.roomId);
      if (!room) {
        return res.status(404).json({ message: "Room not found" });
      }

      if (room.queue.length > 0) {
        const nextSong = room.queue[0];
        await storage.setCurrentTrack(req.params.roomId, nextSong);
        await storage.removeFromQueue(req.params.roomId, nextSong.id);
        await storage.updatePlaybackState(req.params.roomId, true, 0);
      } else {
        // No more songs in queue, stop playing
        await storage.setCurrentTrack(req.params.roomId, null);
        await storage.updatePlaybackState(req.params.roomId, false, 0);
      }

      const updatedRoom = await storage.getRoom(req.params.roomId);
      
      // Check if we should trigger AI auto-selection
      if (updatedRoom && await shouldTriggerAutoSelection(updatedRoom)) {
        try {
          await addAISongsToQueue(req.params.roomId);
        } catch (error) {
          console.error('AI auto-selection failed:', error);
        }
      }

      const finalRoom = await storage.getRoom(req.params.roomId);
      broadcastToRoom(req.params.roomId, {
        type: 'track_changed',
        data: finalRoom
      });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to skip to next track" });
    }
  })

  // AI Auto-selection endpoints
  app.post("/api/rooms/:roomId/toggle-auto-selection", async (req, res) => {
    try {
      const success = await storage.toggleAutoSelection(req.params.roomId);
      if (!success) {
        return res.status(404).json({ message: "Room not found" });
      }

      const room = await storage.getRoom(req.params.roomId);
      broadcastToRoom(req.params.roomId, {
        type: 'auto_selection_toggled',
        data: room
      });

      res.json({ success: true, autoSelection: room?.autoSelection });
    } catch (error) {
      res.status(500).json({ message: "Failed to toggle auto-selection" });
    }
  });

  app.post("/api/rooms/:roomId/ai-recommend", async (req, res) => {
    try {
      await addAISongsToQueue(req.params.roomId);
      
      const room = await storage.getRoom(req.params.roomId);
      broadcastToRoom(req.params.roomId, {
        type: 'queue_updated',
        data: room
      });

      res.json({ success: true });
    } catch (error) {
      console.error('AI recommendation error:', error);
      res.status(500).json({ message: "Failed to get AI recommendations" });
    }
  });

  return httpServer;
}

async function addAISongsToQueue(roomId: string) {
  const room = await storage.getRoom(roomId);
  if (!room) return;

  const recentTracks = await storage.getRecentTracks(roomId, 3);
  const recommendations = await getAIMusicRecommendations({
    currentTrack: room.currentTrack,
    recentTracks,
  }, 2);

  const apiKey = process.env.GOOGLE_API_KEY || process.env.YOUTUBE_API_KEY || process.env.VITE_YOUTUBE_API_KEY;
  if (!apiKey) return;

  // Search for each recommendation and add the first result
  for (const query of recommendations) {
    try {
      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=1&q=${encodeURIComponent(query)}&type=video&key=${apiKey}`;
      const searchResponse = await fetch(searchUrl);
      const searchData = await searchResponse.json();

      if (searchData.items && searchData.items.length > 0) {
        const item = searchData.items[0];
        
        // Get video details for duration
        const videoDetailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${item.id.videoId}&key=${apiKey}`;
        const detailsResponse = await fetch(videoDetailsUrl);
        const detailsData = await detailsResponse.json();
        
        const duration = detailsData.items[0]?.contentDetails?.duration || 'PT0S';
        const formattedDuration = formatDuration(duration);

        const songData = {
          youtubeId: item.id.videoId,
          title: item.snippet.title,
          artist: item.snippet.channelTitle,
          duration: formattedDuration,
          thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
          requestedBy: "AI 🤖",
        };

        await storage.addSongToQueue(roomId, songData);
      }
    } catch (error) {
      console.error('Error adding AI recommendation:', error);
    }
  }
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
