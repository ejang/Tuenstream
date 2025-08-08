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
  const { player, isPlayerReady } = useYouTubePlayer(room.currentTrack?.youtubeId || null);

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
          {/* Video Player Area */}
          <div className="aspect-video bg-secondary relative">
            <div id="youtube-player" className="w-full h-full"></div>
            {!room.currentTrack && (
              <div className="absolute inset-0 flex items-center justify-center bg-secondary">
                <div className="text-center text-primary">
                  <div className="w-16 h-16 border-2 border-primary rounded-full flex items-center justify-center mx-auto mb-4">
                    <Play className="w-8 h-8" />
                  </div>
                  <p className="text-lg font-medium">No track playing</p>
                  <p className="text-sm opacity-75">Add songs to the queue to start playing</p>
                </div>
              </div>
            )}
          </div>

          {/* Player Controls */}
          {room.currentTrack && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium text-secondary text-lg truncate">{room.currentTrack.title}</h3>
                  <p className="text-text truncate">{room.currentTrack.artist}</p>
                </div>
                <div className="ml-4 text-sm text-text">
                  <span>Added by {room.currentTrack.requestedBy}</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="w-full bg-accent rounded-full h-1">
                  <div 
                    className="bg-highlight h-1 rounded-full transition-all duration-300" 
                    style={{ width: `${Math.min((room.currentTime / (player?.getDuration() || 1)) * 100, 100)}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-text">
                  <span>{formatTime(room.currentTime)}</span>
                  <span>{room.currentTrack.duration}</span>
                </div>
              </div>

              {/* Control Buttons */}
              <div className="flex items-center justify-center space-x-6 mt-6">
                <Button 
                  onClick={() => {}} 
                  disabled
                  variant="ghost"
                  size="sm"
                  className="p-2 text-text hover:text-secondary transition-colors"
                >
                  <SkipBack className="w-5 h-5" />
                </Button>
                
                <Button 
                  onClick={handlePlayPause}
                  disabled={!isPlayerReady || playPauseMutation.isPending}
                  className="p-3 bg-secondary text-primary rounded-full hover:bg-text transition-colors"
                >
                  {room.isPlaying ? (
                    <Pause className="w-6 h-6" />
                  ) : (
                    <Play className="w-6 h-6" />
                  )}
                </Button>
                
                <Button 
                  onClick={handleNext}
                  disabled={room.queue.length === 0 || nextTrackMutation.isPending}
                  variant="ghost"
                  size="sm"
                  className="p-2 text-text hover:text-secondary transition-colors disabled:opacity-50"
                >
                  <SkipForward className="w-5 h-5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
