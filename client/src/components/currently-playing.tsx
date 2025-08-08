import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useYouTubePlayer } from "@/hooks/use-youtube-player";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Play, Pause, SkipForward, SkipBack } from "lucide-react";
import type { Room } from "@shared/schema";

interface CurrentlyPlayingProps {
  room: Room;
}

export default function CurrentlyPlaying({ room }: CurrentlyPlayingProps) {
  const { toast } = useToast();
  
  const handleVideoEnded = () => {
    // Automatically play next song when current song ends
    nextTrackMutation.mutate();
  };
  
  const { player, isPlayerReady } = useYouTubePlayer(room.currentTrack?.youtubeId || null, handleVideoEnded);

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
          {/* Turntable Design */}
          <div className="aspect-square bg-secondary relative p-8 flex items-center justify-center">
            {/* Hidden YouTube Player */}
            <div id="youtube-player" className="hidden"></div>
            
            {/* Turntable Base */}
            <div className="relative w-full h-full max-w-sm max-h-sm">
              {/* Platter */}
              <div className="absolute inset-4 bg-accent rounded-full border-4 border-primary/20">
                {/* Record */}
                {room.currentTrack ? (
                  <div className={`w-full h-full bg-secondary rounded-full relative overflow-hidden ${room.isPlaying ? 'animate-spin' : ''}`} style={{ animationDuration: '3s', animationTimingFunction: 'linear' }}>
                    {/* Record Grooves */}
                    <div className="absolute inset-2 border border-primary/20 rounded-full"></div>
                    <div className="absolute inset-4 border border-primary/15 rounded-full"></div>
                    <div className="absolute inset-6 border border-primary/10 rounded-full"></div>
                    <div className="absolute inset-8 border border-primary/5 rounded-full"></div>
                    
                    {/* Center Label */}
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-highlight rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                    </div>
                    
                    {/* Album Art (Small) */}
                    <div className="absolute top-4 right-4 w-12 h-8 overflow-hidden rounded">
                      <img src={room.currentTrack.thumbnail} alt="" className="w-full h-full object-cover opacity-60" />
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full bg-accent rounded-full flex items-center justify-center">
                    <div className="text-center text-text">
                      <Play className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm font-medium">No Record</p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Tonearm */}
              <div className="absolute top-4 right-8 w-24 h-1 bg-secondary rounded-full transform origin-right" style={{ transform: `rotate(${room.currentTrack && room.isPlaying ? '25deg' : '45deg'})` }}>
                <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-3 h-3 bg-highlight rounded-full border border-primary"></div>
              </div>
              
              {/* Control Buttons */}
              <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex items-center space-x-2">
                {room.currentTrack && (
                  <Button 
                    onClick={handlePlayPause}
                    disabled={!isPlayerReady || playPauseMutation.isPending}
                    variant="ghost"
                    size="sm"
                    className="w-8 h-8 p-0 bg-primary text-secondary hover:bg-accent border border-accent"
                  >
                    {room.isPlaying ? (
                      <div className="w-2 h-3 bg-secondary"></div>
                    ) : (
                      <div className="w-0 h-0 border-l-[6px] border-l-secondary border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent ml-0.5"></div>
                    )}
                  </Button>
                )}
              </div>
              
              {/* Speed Indicator */}
              <div className="absolute top-2 left-2 text-xs font-mono text-text">
                {room.currentTrack ? '33⅓' : '—'}
              </div>
            </div>
            
            {!room.currentTrack && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-primary">
                  <p className="text-lg font-medium mb-2">Turntable Ready</p>
                  <p className="text-sm opacity-75">Add songs to start playing</p>
                </div>
              </div>
            )}
          </div>

          {/* Track Info & Controls */}
          {room.currentTrack && (
            <div className="p-6 bg-accent/50">
              {/* Track Information */}
              <div className="mb-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-secondary text-lg truncate leading-tight">{room.currentTrack.title}</h3>
                    <p className="text-text truncate text-sm">{room.currentTrack.artist}</p>
                  </div>
                  <div className="ml-4 text-xs text-text text-right">
                    <div className="bg-primary px-2 py-1 rounded text-secondary font-medium">
                      {room.currentTrack.requestedBy}
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="relative">
                    <div className="w-full bg-accent rounded h-0.5">
                      <div 
                        className="bg-highlight h-0.5 rounded transition-all duration-300" 
                        style={{ width: `${Math.min((room.currentTime / (player?.getDuration() || 1)) * 100, 100)}%` }}
                      ></div>
                    </div>
                    {/* Stylus position indicator */}
                    <div 
                      className="absolute top-1/2 transform -translate-y-1/2 w-1 h-3 bg-highlight rounded-full transition-all duration-300"
                      style={{ left: `${Math.min((room.currentTime / (player?.getDuration() || 1)) * 100, 100)}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs font-mono text-text">
                    <span>{formatTime(room.currentTime)}</span>
                    <span>{room.currentTrack.duration}</span>
                  </div>
                </div>
              </div>

              {/* Minimalist Controls */}
              <div className="flex items-center justify-center space-x-8">
                <Button 
                  onClick={handleNext}
                  disabled={room.queue.length === 0 || nextTrackMutation.isPending}
                  variant="ghost"
                  className="group p-3 hover:bg-primary/10 rounded-full transition-all duration-200 disabled:opacity-30"
                >
                  <SkipForward className="w-5 h-5 text-text group-hover:text-secondary transition-colors" />
                </Button>
                
                <div className="text-center">
                  <div className="text-xs text-text mb-1 font-mono">
                    {room.isPlaying ? 'PLAYING' : 'PAUSED'}
                  </div>
                  <div className="w-2 h-2 rounded-full bg-highlight mx-auto"></div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
