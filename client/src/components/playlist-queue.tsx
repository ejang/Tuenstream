import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Play, Trash2 } from "lucide-react";
import type { Room } from "@shared/schema";

interface PlaylistQueueProps {
  room: Room;
}

export default function PlaylistQueue({ room }: PlaylistQueueProps) {
  const { toast } = useToast();

  const clearQueueMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", `/api/rooms/${room.id}/queue`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rooms", room.id] });
      toast({
        title: "Queue cleared",
        description: "All songs have been removed from the queue",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to clear queue",
        variant: "destructive",
      });
    },
  });

  const removeSongMutation = useMutation({
    mutationFn: async (songId: string) => {
      const response = await apiRequest("DELETE", `/api/rooms/${room.id}/queue/${songId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rooms", room.id] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove song",
        variant: "destructive",
      });
    },
  });

  const handleClearQueue = () => {
    if (window.confirm("Are you sure you want to clear the entire queue?")) {
      clearQueueMutation.mutate();
    }
  };

  const handleRemoveSong = (songId: string) => {
    removeSongMutation.mutate(songId);
  };

  const calculateTotalDuration = () => {
    const totalSeconds = room.queue.reduce((total, song) => {
      const [minutes, seconds] = song.duration.split(':').map(Number);
      return total + (minutes * 60) + (seconds || 0);
    }, 0);
    
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${(totalSeconds % 60).toString().padStart(2, '0')}`;
    }
    return `${minutes}:${(totalSeconds % 60).toString().padStart(2, '0')}`;
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-light text-foreground">Up Next</h2>
        <div className="text-xs font-mono text-muted-foreground bg-secondary/30 px-2 py-1 rounded">
          {room.queue.length}
        </div>
      </div>

      <div className="bg-primary rounded-2xl shadow-lg border border-border overflow-hidden">
        <div className="bg-secondary/20 px-3 py-1.5 text-center border-b border-border">
          <div className="text-xs font-mono text-muted-foreground">Playlist Queue</div>
        </div>
        <div className="p-0">
          {room.queue.length === 0 ? (
            <div className="p-6 text-center">
              <div className="w-10 h-10 border border-border rounded-full flex items-center justify-center mx-auto mb-3 bg-accent">
                <Play className="w-4 h-4 text-muted-foreground" />
              </div>
              <p className="font-medium text-foreground text-sm">Queue Empty</p>
              <p className="text-xs text-muted-foreground mt-1">Add songs to start playing</p>
            </div>
          ) : (
            <>
              <div className="max-h-80 overflow-y-auto">
                {room.queue.map((song, index) => (
                  <div 
                    key={song.id} 
                    className="flex items-center p-3 border-b border-border last:border-b-0 hover:bg-secondary/10 transition-colors duration-200 group"
                  >
                    <div className="w-6 text-center">
                      {index === 0 ? (
                        <div className="w-4 h-4 bg-text text-primary text-xs font-bold rounded-full flex items-center justify-center">
                          <Play className="w-2 h-2" />
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground font-mono">{index + 1}</span>
                      )}
                    </div>
                    <div className="ml-2 flex-1 min-w-0">
                      <p className="font-medium text-foreground text-xs truncate leading-tight">{song.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{song.artist}</p>
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">{song.requestedBy}</p>
                    </div>
                    <div className="ml-2 flex items-center space-x-2">
                      <span className="text-xs text-muted-foreground font-mono">{song.duration}</span>
                      <Button
                        onClick={() => handleRemoveSong(song.id)}
                        disabled={removeSongMutation.isPending}
                        variant="ghost"
                        size="sm"
                        className="w-5 h-5 p-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all rounded"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Queue Controls */}
              <div className="border-t border-border p-3 bg-secondary/10">
                <div className="flex items-center justify-between text-xs">
                  <Button
                    onClick={handleClearQueue}
                    disabled={clearQueueMutation.isPending}
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-foreground transition-colors p-1 h-auto font-mono"
                  >
                    Clear All
                  </Button>
                  <div className="text-muted-foreground font-mono">
                    Total: {calculateTotalDuration()}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
