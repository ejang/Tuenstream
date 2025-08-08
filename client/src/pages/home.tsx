import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useWebSocket } from "@/hooks/use-websocket";
import { useToast } from "@/hooks/use-toast";
import SearchSection from "@/components/search-section";
import CurrentlyPlaying from "@/components/currently-playing";
import PlaylistQueue from "@/components/playlist-queue";
import { Users } from "lucide-react";
import type { Room } from "@shared/schema";

export default function Home() {
  const { toast } = useToast();
  const [defaultRoomId, setDefaultRoomId] = useState<string | null>(null);

  const { data: room, isLoading } = useQuery<Room>({
    queryKey: ["/api/rooms", defaultRoomId],
    enabled: !!defaultRoomId,
  });

  const { connected } = useWebSocket(defaultRoomId || null, (message) => {
    if (message.type === 'room_state' || message.type === 'queue_updated' || 
        message.type === 'participants_updated' || message.type === 'track_changed') {
      queryClient.setQueryData(["/api/rooms", defaultRoomId], message.data);
    }
  });

  const createDefaultRoomMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/rooms", { 
        code: "MUSIC", 
        name: "iPod Music Room" 
      });
      const room = await response.json();
      
      // Add default participant
      await apiRequest("POST", `/api/rooms/${room.id}/participants`, {
        name: "Music Lover",
        initials: "ML",
      });
      
      return room;
    },
    onSuccess: (room: Room) => {
      setDefaultRoomId(room.id);
    },
    onError: () => {
      // Try to join existing default room
      joinDefaultRoomMutation.mutate();
    },
  });

  const joinDefaultRoomMutation = useMutation({
    mutationFn: async () => {
      const roomResponse = await apiRequest("GET", "/api/rooms/code/MUSIC");
      const room = await roomResponse.json();
      return room;
    },
    onSuccess: (room: Room) => {
      setDefaultRoomId(room.id);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to initialize music room",
        variant: "destructive",
      });
    },
  });

  // Initialize default room on mount
  useEffect(() => {
    if (!defaultRoomId) {
      createDefaultRoomMutation.mutate();
    }
  }, []);

  if (!defaultRoomId || isLoading) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="text-center">
          <div className="flex items-center justify-center space-x-3 mb-6">
            <div className="w-16 h-16 bg-primary rounded-2xl shadow-lg border border-border flex items-center justify-center">
              <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center animate-pulse">
                <div className="w-3 h-3 bg-text rounded-full"></div>
              </div>
            </div>
            <h1 className="text-3xl font-light text-foreground">iPod Music</h1>
          </div>
          <p className="text-muted-foreground text-sm">Starting your music experience...</p>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-medium text-secondary mb-4">Initializing music room...</h2>
          <div className="w-8 h-8 bg-secondary rounded-sm animate-pulse mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary">
      {/* Header */}
      <header className="border-b border-border bg-primary shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center space-x-3">
              <div className="w-7 h-7 bg-accent rounded-lg flex items-center justify-center">
                <div className="w-3 h-3 bg-text rounded-full"></div>
              </div>
              <div>
                <h1 className="text-xl font-light text-foreground">{room.name}</h1>
                <div className="text-xs text-muted-foreground font-mono">{room.code}</div>
              </div>
            </div>

            <div className="hidden md:flex items-center space-x-4 text-xs">
              <div className="flex items-center space-x-1.5 bg-secondary/30 px-2 py-1 rounded">
                <Users className="w-3 h-3 text-muted-foreground" />
                <span className="text-muted-foreground font-mono">{room.participants.length}</span>
              </div>
              <div className="w-px h-3 bg-border"></div>
              <div className="flex items-center space-x-1.5">
                <div className="w-1.5 h-1.5 bg-green-600 rounded-full"></div>
                <span className="text-muted-foreground font-mono text-xs">Live</span>
              </div>
            </div>

            <button className="md:hidden p-2 text-muted-foreground hover:text-foreground transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <SearchSection roomId={room.id} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <CurrentlyPlaying room={room} />
          <PlaylistQueue room={room} />
        </div>

      </main>
    </div>
  );
}
