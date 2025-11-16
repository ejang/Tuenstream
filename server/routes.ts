import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertSongSchema } from "@shared/schema";
import { getAIMusicRecommendations } from "./ai-service";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

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

  // Get player state
  app.get("/api/player", async (req, res) => {
    try {
      const state = await storage.getAllState();
      res.json(state);
    } catch (error) {
      res.status(500).json({ message: "Failed to get player state" });
    }
  });

  // Queue endpoints
  app.post("/api/queue", async (req, res) => {
    try {
      const songData = insertSongSchema.parse(req.body);
      const song = await storage.addSongToQueue(songData);
      res.json(song);
    } catch (error) {
      res.status(400).json({ message: "Invalid song data" });
    }
  });

  app.delete("/api/queue/:songId", async (req, res) => {
    try {
      const success = await storage.removeFromQueue(req.params.songId);
      if (!success) {
        return res.status(404).json({ message: "Song not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to remove song" });
    }
  });

  app.delete("/api/queue", async (req, res) => {
    try {
      const success = await storage.clearQueue();
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to clear queue" });
    }
  });

  // Playback control endpoints
  app.post("/api/playback/play", async (req, res) => {
    try {
      const { currentTime } = req.body;
      const success = await storage.updatePlaybackState(true, currentTime || 0);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to update playback state" });
    }
  });

  app.post("/api/playback/pause", async (req, res) => {
    try {
      const { currentTime } = req.body;
      const success = await storage.updatePlaybackState(false, currentTime || 0);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to update playback state" });
    }
  });

  app.post("/api/playback/sync", async (req, res) => {
    try {
      const { currentTime } = req.body;
      const success = await storage.updatePlaybackState(true, currentTime || 0);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to sync playback time" });
    }
  });

  app.post("/api/playback/next", async (req, res) => {
    try {
      const queue = await storage.getQueue();

      if (queue.length > 0) {
        const nextSong = queue[0];
        await storage.setCurrentTrack(nextSong);
        await storage.removeFromQueue(nextSong.id);
        await storage.updatePlaybackState(true, 0);
      } else {
        // No more songs in queue, stop playing
        await storage.setCurrentTrack(null);
        await storage.updatePlaybackState(false, 0);
      }

      // Check if we should trigger AI auto-selection
      const autoSelection = await storage.getAutoSelection();
      const updatedQueue = await storage.getQueue();
      const currentTrack = await storage.getCurrentTrack();

      if (autoSelection && updatedQueue.length <= 1 && currentTrack) {
        try {
          await addAISongsToQueue();
        } catch (error) {
          console.error('AI auto-selection failed:', error);
        }
      }

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to skip to next track" });
    }
  });

  app.post("/api/playback/previous", async (req, res) => {
    try {
      const currentTrack = await storage.getCurrentTrack();

      // Restart current track from beginning (iPod-style behavior)
      if (currentTrack) {
        await storage.updatePlaybackState(true, 0);
      }

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to restart track" });
    }
  });

  // AI Auto-selection endpoints
  app.post("/api/auto-selection/toggle", async (req, res) => {
    try {
      const success = await storage.toggleAutoSelection();
      const autoSelection = await storage.getAutoSelection();
      res.json({ success: true, autoSelection });
    } catch (error) {
      res.status(500).json({ message: "Failed to toggle auto-selection" });
    }
  });

  app.post("/api/ai-recommend", async (req, res) => {
    try {
      await addAISongsToQueue();
      res.json({ success: true });
    } catch (error) {
      console.error('AI recommendation error:', error);
      res.status(500).json({ message: "Failed to get AI recommendations" });
    }
  });

  return httpServer;
}

async function addAISongsToQueue() {
  const currentTrack = await storage.getCurrentTrack();
  const recentTracks = await storage.getRecentTracks(3);

  const recommendations = await getAIMusicRecommendations({
    currentTrack,
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

        await storage.addSongToQueue(songData);
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
