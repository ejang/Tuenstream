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
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-medium text-secondary">Queue</h2>
        <div className="text-sm text-text">
          <span>{room.queue.length} songs</span>
        </div>
      </div>

      <Card className="bg-primary border border-accent minimal-shadow">
        <CardContent className="p-0">
          {room.queue.length === 0 ? (
            <div className="p-8 text-center text-text">
              <div className="w-12 h-12 border-2 border-accent rounded-full flex items-center justify-center mx-auto mb-4">
                <Play className="w-6 h-6" />
              </div>
              <p className="font-medium">Queue is empty</p>
              <p className="text-sm mt-1">Search and add songs to get started</p>
            </div>
          ) : (
            <>
              <div className="max-h-96 overflow-y-auto">
                {room.queue.map((song, index) => (
                  <div 
                    key={song.id} 
                    className="flex items-center p-4 border-b border-accent last:border-b-0 hover:bg-gray-50 transition-colors duration-200 group"
                  >
                    <div className="w-8 text-center">
                      {index === 0 ? (
                        <div className="w-6 h-6 bg-highlight text-primary text-xs font-medium rounded-full flex items-center justify-center">
                          <Play className="w-3 h-3" />
                        </div>
                      ) : (
                        <span className="text-sm text-text font-medium">{index + 1}</span>
                      )}
                    </div>
                    <div className="ml-3 flex-1 min-w-0">
                      <p className="font-medium text-secondary text-sm truncate">{song.title}</p>
                      <p className="text-xs text-text truncate">{song.artist}</p>
                      <p className="text-xs text-text mt-1">Added by <span className="font-medium">{song.requestedBy}</span></p>
                    </div>
                    <div className="ml-2 flex items-center space-x-2">
                      <span className="text-xs text-text">{song.duration}</span>
                      <Button
                        onClick={() => handleRemoveSong(song.id)}
                        disabled={removeSongMutation.isPending}
                        variant="ghost"
                        size="sm"
                        className="w-6 h-6 p-0 opacity-0 group-hover:opacity-100 text-text hover:text-destructive transition-all"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Queue Controls */}
              <div className="border-t border-accent p-4">
                <div className="flex items-center justify-between text-sm">
                  <Button
                    onClick={handleClearQueue}
                    disabled={clearQueueMutation.isPending}
                    variant="ghost"
                    size="sm"
                    className="text-text hover:text-secondary transition-colors"
                  >
                    Clear queue
                  </Button>
                  <div className="text-text">
                    Total: <span className="font-medium">{calculateTotalDuration()}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
