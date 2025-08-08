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
  const [totalDuration, setTotalDuration] = useState(0);
  const startTime = useRef<number>(0);
  const localTimer = useRef<NodeJS.Timeout | null>(null);
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
  
  const { player, isPlayerReady, currentTime, needsUserInteraction, isMobile, isLoading, playerState } = useYouTubePlayer(
    room.currentTrack?.youtubeId || null, 
    handleVideoEnded,
    handleTimeUpdate
  );
  
  // Parse duration string to seconds
  const parseDurationToSeconds = (duration: string): number => {
    const parts = duration.split(':').map(Number);
    if (parts.length === 2) {
      return parts[0] * 60 + parts[1]; // mm:ss
    } else if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2]; // hh:mm:ss
    }
    return 0;
  };

  // Set total duration when track changes
  useEffect(() => {
    if (room.currentTrack?.duration) {
      const seconds = parseDurationToSeconds(room.currentTrack.duration);
      setTotalDuration(seconds);
    }
  }, [room.currentTrack?.duration]);

  // Local timer for progress tracking
  useEffect(() => {
    if (room.isPlaying && room.currentTrack && !isLoading) {
      if (!startTime.current) {
        startTime.current = Date.now() - (room.currentTime || 0) * 1000;
      }
      
      localTimer.current = setInterval(() => {
        const elapsed = (Date.now() - startTime.current) / 1000;
        setLocalCurrentTime(Math.min(elapsed, totalDuration));
      }, 100); // Update every 100ms for smooth animation
    } else {
      if (localTimer.current) {
        clearInterval(localTimer.current);
        localTimer.current = null;
      }
      startTime.current = 0;
      if (!room.isPlaying || isLoading) {
        setLocalCurrentTime(room.currentTime || 0);
      }
    }

    return () => {
      if (localTimer.current) {
        clearInterval(localTimer.current);
        localTimer.current = null;
      }
    };
  }, [room.isPlaying, room.currentTrack?.id, totalDuration, isLoading]);

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

  const previousTrackMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/rooms/${room.id}/previous`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rooms", room.id] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to go to previous track",
        variant: "destructive",
      });
    },
  });

  const restartTrackMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/rooms/${room.id}/sync`, {
        currentTime: 0
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rooms", room.id] });
      if (player && isPlayerReady) {
        player.seekTo(0);
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to restart track",
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
      // On mobile, show notice if user interaction needed
      if (isMobile && needsUserInteraction) {
        toast({
          title: "모바일 재생 안내",
          description: "YouTube 플레이어를 직접 터치해서 재생해주세요",
        });
        return;
      }
      player.playVideo();
      playPauseMutation.mutate({ action: 'play', currentTime });
    }
  };

  const handleNext = () => {
    if (room.queue.length > 0) {
      nextTrackMutation.mutate();
    }
  };

  const handlePrevious = () => {
    // Restart current track from beginning (iPod-style behavior)
    if (room.currentTrack) {
      previousTrackMutation.mutate();
    }
  };

  const handleMenu = () => {
    toast({
      title: "방 정보",
      description: `방 코드: ${room.code} | 참가자: ${room.participants?.length || 0}명 | 대기열: ${room.queue.length}곡`,
    });
  };

  const handleBottomButton = () => {
    // Bottom button acts as a secondary control - show queue info
    const queueInfo = room.queue.length > 0 
      ? `다음 곡: ${room.queue[0]?.title}` 
      : "대기열이 비어있습니다";
    
    toast({
      title: "대기열 정보",
      description: queueInfo,
    });
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
            {/* YouTube Player - visible on mobile for user interaction */}
            <div 
              id="youtube-player" 
              className={isMobile ? "w-full h-40 mb-4 rounded-lg overflow-hidden" : "hidden"}
            ></div>
            
            {/* Mobile interaction notice */}
            {isMobile && needsUserInteraction && room.currentTrack && (
              <div className="mb-4 p-3 bg-blue-500/20 border border-blue-500/30 rounded-lg text-center">
                <p className="text-sm text-blue-300 mb-2">📱 모바일에서 음악을 들으려면</p>
                <p className="text-xs text-blue-200">위의 YouTube 플레이어를 터치해서 재생해주세요</p>
              </div>
            )}
            
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
                  
                  {/* Loading State */}
                  {isLoading ? (
                    <div className="mt-3 space-y-2">
                      <div className="text-center">
                        <div className="text-xs font-mono opacity-75 animate-pulse">
                          {!isPlayerReady ? '로딩 중...' : 
                           playerState === 3 ? '버퍼링 중...' : 
                           '음악 준비 중...'}
                        </div>
                      </div>
                      <div className="relative">
                        {/* Loading progress bar */}
                        <div className="w-full h-1 bg-black/15 rounded-full"></div>
                        <div className="absolute top-0 h-1 bg-black/30 rounded-full animate-pulse" style={{ width: '30%' }}></div>
                      </div>
                    </div>
                  ) : (
                    /* Time and Progress Bar - iPod Style */
                    <div className="mt-3 space-y-1">
                      <div className="flex items-center justify-between text-xs font-mono" style={{ color: '#000' }}>
                        <span className="font-bold">{formatTime(localCurrentTime)}</span>
                        <span className="font-bold">{room.currentTrack.duration}</span>
                      </div>
                      <div className="relative">
                        {/* Background track */}
                        <div className="w-full h-1 bg-black/15 rounded-full"></div>
                        
                        {/* Filled progress bar */}
                        <div 
                          className="absolute top-0 h-1 bg-black/30 rounded-full transition-all duration-200 ease-linear" 
                          style={{ width: `${totalDuration > 0 ? Math.min((localCurrentTime / totalDuration) * 100, 100) : 0}%` }}
                        ></div>
                        
                        {/* Moving progress dot */}
                        <div 
                          className="absolute top-1/2 transform -translate-y-1/2 w-3 h-3 bg-black rounded-full shadow-sm transition-all duration-200 ease-out"
                          style={{ 
                            left: `${totalDuration > 0 ? Math.min((localCurrentTime / totalDuration) * 100, 100) : 0}%`, 
                            marginLeft: '-6px',
                            opacity: room.isPlaying ? 1 : 0.7
                          }}
                        ></div>
                      </div>
                    </div>
                  )}
                  
                  {/* Playback Status */}
                  <div className="text-center mt-2">
                    <div className="text-xs font-mono opacity-75">
                      {isLoading ? 
                        (!isPlayerReady ? '로딩 중...' : 
                         playerState === 3 ? '버퍼링 중...' : 
                         '준비 중...') :
                        (room.isPlaying ? '▶ PLAYING' : '⏸ PAUSED')
                      }
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
                {/* Touch Areas - Now Interactive */}
                {/* MENU Button */}
                <Button
                  onClick={handleMenu}
                  variant="ghost"
                  className="absolute top-2 left-1/2 transform -translate-x-1/2 w-8 h-8 p-0 rounded-full hover:bg-primary/50 transition-colors duration-200"
                >
                  <div className="text-xs font-bold text-text opacity-60">MENU</div>
                </Button>
                
                {/* Previous Track Button */}
                <Button
                  onClick={handlePrevious}
                  disabled={!room.currentTrack || previousTrackMutation.isPending || restartTrackMutation.isPending || isLoading}
                  variant="ghost"
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 w-8 h-8 p-0 rounded-full hover:bg-primary/50 transition-colors duration-200 disabled:opacity-30"
                >
                  <SkipBack className="w-4 h-4 text-text opacity-60" />
                </Button>
                
                {/* Next Track Button (moved from below) */}
                <Button 
                  onClick={handleNext}
                  disabled={room.queue.length === 0 || nextTrackMutation.isPending || isLoading}
                  variant="ghost"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 w-8 h-8 p-0 rounded-full hover:bg-primary/50 transition-colors duration-200 disabled:opacity-30"
                >
                  <SkipForward className="w-4 h-4 text-text opacity-60" />
                </Button>
                
                {/* Bottom Button - Queue Info */}
                <Button
                  onClick={handleBottomButton}
                  variant="ghost"
                  className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-8 h-8 p-0 rounded-full hover:bg-primary/50 transition-colors duration-200"
                >
                  {room.isPlaying ? (
                    <Pause className="w-4 h-4 text-text opacity-60" />
                  ) : (
                    <Play className="w-4 h-4 text-text opacity-60" />
                  )}
                </Button>
              </div>
              
              {/* Center Button */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-primary rounded-full shadow-lg border border-border flex items-center justify-center">
                <Button 
                  onClick={handlePlayPause}
                  disabled={!room.currentTrack || !isPlayerReady || playPauseMutation.isPending || isLoading}
                  variant="ghost"
                  className="w-full h-full rounded-full hover:bg-secondary/50 transition-colors duration-200"
                >
                  {isLoading ? (
                    <div className="w-6 h-6 flex items-center justify-center">
                      <div className="w-3 h-3 border-2 border-text border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  ) : room.isPlaying ? (
                    <Pause className="w-6 h-6 text-text" />
                  ) : (
                    <Play className="w-6 h-6 text-text" />
                  )}
                </Button>
              </div>
              
              {/* Next Button moved to Touch Areas above */}
            </div>
          </div>

          {/* Additional Info */}
          {room.currentTrack && (
            <div className="mt-4 p-4 bg-secondary/30 rounded-lg">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Requested by {room.currentTrack.requestedBy}</span>
                <span className="font-mono">
                  {isLoading ? 
                    (!isPlayerReady ? '로딩 중...' : 
                     playerState === 3 ? '버퍼링 중...' : 
                     '준비 중...') :
                    (room.isPlaying ? '▶ PLAYING' : '⏸ PAUSED')
                  }
                </span>
              </div>
            </div>
          )}

          {/* AI Controls - Enhanced Visibility */}
          <div className="mt-4 p-5 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl border-2 border-blue-400/30 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Bot className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <span className="text-base font-semibold text-foreground">AI 자동 선곡</span>
                  <div className="text-xs text-blue-300 mt-0.5">
                    {room.autoSelection ? "✨ 활성화됨" : "💤 비활성화됨"}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-xs text-muted-foreground">
                  {room.autoSelection ? "ON" : "OFF"}
                </div>
                <Switch
                  checked={room.autoSelection}
                  onCheckedChange={() => toggleAutoSelectionMutation.mutate()}
                  disabled={toggleAutoSelectionMutation.isPending}
                  className="data-[state=checked]:bg-blue-500"
                />
              </div>
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
