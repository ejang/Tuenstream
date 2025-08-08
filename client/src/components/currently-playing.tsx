import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useYouTubePlayer } from "@/hooks/use-youtube-player";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Play, Pause, SkipForward, SkipBack, Bot, Zap } from "lucide-react";
import type { Room } from "@shared/schema";

interface CurrentlyPlayingProps {
  room: Room;
}

export default function CurrentlyPlaying({ room }: CurrentlyPlayingProps) {
  const { toast } = useToast();
  const [localCurrentTime, setLocalCurrentTime] = useState(room.currentTime || 0);
  const lastUpdateTime = useRef(0);
  
  const handleVideoEnded = () => {
    // Automatically play next song when current song ends
    nextTrackMutation.mutate();
  };
  
  const handleTimeUpdate = (currentTime: number) => {
    setLocalCurrentTime(currentTime);
    
    // Update server every 5 seconds to avoid too many requests
    const now = Date.now();
    if (now - lastUpdateTime.current > 5000) {
      lastUpdateTime.current = now;
      // Update server with current playback time
      if (room.isPlaying) {
        fetch(`/api/rooms/${room.id}/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentTime })
        }).catch(console.error);
      }
    }
  };
  
  const { player, isPlayerReady, currentTime } = useYouTubePlayer(
    room.currentTrack?.youtubeId || null, 
    handleVideoEnded,
    handleTimeUpdate
  );
  
  // Sync local time with room state when room changes
  useEffect(() => {
    if (!room.isPlaying) {
      setLocalCurrentTime(room.currentTime || 0);
    }
  }, [room.currentTime, room.isPlaying, room.currentTrack?.id]);

  const playPauseMutation = useMutation({
    mutationFn: async ({ action, currentTime }: { action: 'play' | 'pause'; currentTime: number }) => {
      const response = await apiRequest("POST", `/api/rooms/${room.id}/${action}`, { currentTime });
      return response.json();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update playback state",
        variant: "destructive",
      });
    },
  });

  const nextTrackMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/rooms/${room.id}/next`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rooms", room.id] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to skip to next track",
        variant: "destructive",
      });
    },
  });

  const toggleAutoSelectionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/rooms/${room.id}/toggle-auto-selection`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rooms", room.id] });
      toast({
        title: "AI 자동 선곡",
        description: room.autoSelection ? "AI 자동 선곡이 비활성화되었습니다" : "AI 자동 선곡이 활성화되었습니다",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to toggle auto-selection",
        variant: "destructive",
      });
    },
  });

  const aiRecommendMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/rooms/${room.id}/ai-recommend`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rooms", room.id] });
      toast({
        title: "AI 추천",
        description: "AI가 추천한 곡들이 플레이리스트에 추가되었습니다",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to get AI recommendations",
        variant: "destructive",
      });
    },
  });

  const handlePlayPause = () => {
    if (!player || !isPlayerReady) return;
    
    const currentTime = player.getCurrentTime();
    if (room.isPlaying) {
      player.pauseVideo();
      playPauseMutation.mutate({ action: 'pause', currentTime });
    } else {
      player.playVideo();
      playPauseMutation.mutate({ action: 'play', currentTime });
    }
  };

  const handleNext = () => {
    if (room.queue.length > 0) {
      nextTrackMutation.mutate();
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <section className="lg:col-span-2">
      <h2 className="text-xl font-medium text-secondary mb-6">Now Playing</h2>
      
      <Card className="bg-primary border border-accent minimal-shadow">
        <CardContent className="p-0">
          {/* iPod Design */}
          <div className="bg-primary rounded-2xl p-6 shadow-2xl border border-border">
            {/* Hidden YouTube Player */}
            <div id="youtube-player" className="hidden"></div>
            
            {/* LCD Screen */}
            <div className="bg-secondary rounded-lg p-3 mb-6 shadow-inner border border-accent" style={{ backgroundColor: '#a8b4a8', color: '#000' }}>
              <div className="flex items-center justify-between mb-1">
                <div className="text-xs font-mono opacity-60">iPod</div>
                <div className="text-xs font-mono opacity-60">♪♪♪</div>
              </div>
              
              {room.currentTrack ? (
                <div className="space-y-2">
                  <div className="text-sm font-medium truncate leading-tight" style={{ color: '#000' }}>
                    {room.currentTrack.title}
                  </div>
                  <div className="text-xs truncate opacity-75">
                    {room.currentTrack.artist}
                  </div>
                  
                  {/* Time and Progress Bar - iPod Style */}
                  <div className="mt-3 space-y-1">
                    <div className="flex items-center justify-between text-xs font-mono" style={{ color: '#000' }}>
                      <span className="font-bold">{formatTime(localCurrentTime)}</span>
                      <span className="font-bold">{room.currentTrack.duration}</span>
                    </div>
                    <div className="relative">
                      <div className="w-full h-1 bg-black/20 rounded-full">
                        <div 
                          className="h-1 bg-black rounded-full transition-all duration-300" 
                          style={{ width: `${Math.min((localCurrentTime / (player?.getDuration() || 1)) * 100, 100)}%` }}
                        ></div>
                      </div>
                      {/* Progress indicator dot */}
                      <div 
                        className="absolute top-1/2 transform -translate-y-1/2 w-2 h-2 bg-black rounded-full transition-all duration-300"
                        style={{ left: `${Math.min((localCurrentTime / (player?.getDuration() || 1)) * 100, 100)}%`, marginLeft: '-4px' }}
                      ></div>
                    </div>
                  </div>
                  
                  {/* Playback Status */}
                  <div className="text-center mt-2">
                    <div className="text-xs font-mono opacity-75">
                      {room.isPlaying ? '▶ PLAYING' : '⏸ PAUSED'}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <div className="text-sm" style={{ color: '#000' }}>No music playing</div>
                  <div className="text-xs opacity-75 mt-1">Add songs to start</div>
                </div>
              )}
            </div>
            
            {/* Click Wheel */}
            <div className="relative w-48 h-48 mx-auto">
              {/* Outer Ring */}
              <div className="absolute inset-0 bg-accent rounded-full shadow-inner border border-border">
                {/* Touch Areas */}
                <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-8 h-8 flex items-center justify-center">
                  <div className="text-xs font-bold text-text opacity-60">MENU</div>
                </div>
                <div className="absolute left-2 top-1/2 transform -translate-y-1/2 w-8 h-8 flex items-center justify-center">
                  <SkipBack className="w-4 h-4 text-text opacity-60" />
                </div>
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 w-8 h-8 flex items-center justify-center">
                  <SkipForward className="w-4 h-4 text-text opacity-60" />
                </div>
                <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-8 h-8 flex items-center justify-center">
                  {room.isPlaying ? (
                    <Pause className="w-4 h-4 text-text opacity-60" />
                  ) : (
                    <Play className="w-4 h-4 text-text opacity-60" />
                  )}
                </div>
              </div>
              
              {/* Center Button */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-primary rounded-full shadow-lg border border-border flex items-center justify-center">
                <Button 
                  onClick={handlePlayPause}
                  disabled={!room.currentTrack || !isPlayerReady || playPauseMutation.isPending}
                  variant="ghost"
                  className="w-full h-full rounded-full hover:bg-secondary/50 transition-colors duration-200"
                >
                  {room.isPlaying ? (
                    <Pause className="w-6 h-6 text-text" />
                  ) : (
                    <Play className="w-6 h-6 text-text" />
                  )}
                </Button>
              </div>
              
              {/* Next Button */}
              <Button 
                onClick={handleNext}
                disabled={room.queue.length === 0 || nextTrackMutation.isPending}
                variant="ghost"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 w-8 h-8 p-0 rounded-full hover:bg-primary/50 transition-colors duration-200 disabled:opacity-30"
              >
                <SkipForward className="w-4 h-4 text-text" />
              </Button>
            </div>
          </div>

          {/* Additional Info */}
          {room.currentTrack && (
            <div className="mt-4 p-4 bg-secondary/30 rounded-lg">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Requested by {room.currentTrack.requestedBy}</span>
                <span className="font-mono">
                  {room.isPlaying ? '▶ PLAYING' : '⏸ PAUSED'}
                </span>
              </div>
            </div>
          )}

          {/* AI Controls */}
          <div className="mt-4 p-4 bg-accent/20 rounded-lg border border-accent">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-secondary">AI 자동 선곡</span>
              </div>
              <Switch
                checked={room.autoSelection}
                onCheckedChange={() => toggleAutoSelectionMutation.mutate()}
                disabled={toggleAutoSelectionMutation.isPending}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {room.autoSelection 
                  ? "큐가 비어있을 때 AI가 자동으로 곡을 추천합니다" 
                  : "AI 자동 선곡이 비활성화되어 있습니다"}
              </span>
              <Button
                onClick={() => aiRecommendMutation.mutate()}
                disabled={aiRecommendMutation.isPending}
                variant="outline"
                size="sm"
                className="ml-2 h-7 px-2 text-xs"
              >
                <Zap className="w-3 h-3 mr-1" />
                {aiRecommendMutation.isPending ? "추천 중..." : "지금 추천"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
