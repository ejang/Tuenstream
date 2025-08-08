import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useWebSocket } from "@/hooks/use-websocket";
import { useToast } from "@/hooks/use-toast";
import SearchSection from "@/components/search-section";
import CurrentlyPlaying from "@/components/currently-playing";
import PlaylistQueue from "@/components/playlist-queue";
import ParticipantsSection from "@/components/participants-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Radio } from "lucide-react";
import type { Room } from "@shared/schema";

export default function Home() {
  const { roomId } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [participantName, setParticipantName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [roomName, setRoomName] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  const { data: room, isLoading } = useQuery<Room>({
    queryKey: ["/api/rooms", roomId],
    enabled: !!roomId,
  });

  const { connected } = useWebSocket(roomId || null, (message) => {
    if (message.type === 'room_state' || message.type === 'queue_updated' || 
        message.type === 'participants_updated' || message.type === 'track_changed') {
      queryClient.setQueryData(["/api/rooms", roomId], message.data);
    }
  });

  const createRoomMutation = useMutation({
    mutationFn: async ({ code, name, roomName }: { code: string; name: string; roomName: string }) => {
      const response = await apiRequest("POST", "/api/rooms", { code, name: roomName });
      const room = await response.json();
      
      // Add creator as participant
      const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
      await apiRequest("POST", `/api/rooms/${room.id}/participants`, {
        name,
        initials,
      });
      
      return room;
    },
    onSuccess: (room: Room) => {
      setLocation(`/room/${room.id}`);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create room. Room code might already exist.",
        variant: "destructive",
      });
    },
  });

  const joinRoomMutation = useMutation({
    mutationFn: async ({ code, name }: { code: string; name: string }) => {
      const roomResponse = await apiRequest("GET", `/api/rooms/code/${code}`);
      const room = await roomResponse.json();
      
      const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
      await apiRequest("POST", `/api/rooms/${room.id}/participants`, {
        name,
        initials,
      });
      
      return room;
    },
    onSuccess: (room: Room) => {
      setLocation(`/room/${room.id}`);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to join room. Please check the room code.",
        variant: "destructive",
      });
    },
  });

  const handleCreateRoom = () => {
    if (!roomCode.trim() || !participantName.trim() || !roomName.trim()) {
      toast({
        title: "Error",
        description: "Please enter room code, room name, and your name",
        variant: "destructive",
      });
      return;
    }
    createRoomMutation.mutate({ 
      code: roomCode.trim().toUpperCase(), 
      name: participantName.trim(),
      roomName: roomName.trim()
    });
  };

  const handleJoinRoom = () => {
    if (!roomCode.trim() || !participantName.trim()) {
      toast({
        title: "Error",
        description: "Please enter both room code and your name",
        variant: "destructive",
      });
      return;
    }
    joinRoomMutation.mutate({ code: roomCode.trim().toUpperCase(), name: participantName.trim() });
  };

  if (!roomId) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-6">
              <div className="w-16 h-16 bg-primary rounded-2xl shadow-lg border border-border flex items-center justify-center">
                <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center">
                  <div className="w-3 h-3 bg-text rounded-full"></div>
                </div>
              </div>
              <h1 className="text-3xl font-light text-foreground">iPod Music</h1>
            </div>
            <p className="text-muted-foreground mb-8 text-sm">Collaborative music experience • Share and enjoy together</p>
          </div>

          <div className="bg-primary rounded-2xl shadow-lg border border-border overflow-hidden">
            <div className="bg-secondary/20 px-4 py-2 text-center border-b border-border">
              <div className="text-xs font-mono text-muted-foreground">iPod Music</div>
            </div>
            <div className="p-6 space-y-5">
              <Button
                onClick={handleCreateRoom}
                disabled={createRoomMutation.isPending}
                className="w-full bg-accent hover:bg-secondary text-foreground h-12 rounded-xl font-medium shadow-sm border border-border"
              >
                <Radio className="w-4 h-4 mr-2" />
                Create Room
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-primary px-3 text-muted-foreground font-mono">or join existing</span>
                </div>
              </div>

              <div className="space-y-3">
                <Input
                  placeholder="Room Code"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value)}
                  className="bg-input border-border rounded-xl h-12 font-mono text-sm placeholder:text-muted-foreground"
                />
                <Input
                  placeholder="Room Name"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  className="bg-input border-border rounded-xl h-12 text-sm placeholder:text-muted-foreground"
                />
                <Input
                  placeholder="Your Name"
                  value={participantName}
                  onChange={(e) => setParticipantName(e.target.value)}
                  className="bg-input border-border rounded-xl h-12 text-sm placeholder:text-muted-foreground"
                />
                <Button
                  onClick={handleJoinRoom}
                  disabled={joinRoomMutation.isPending}
                  className="w-full bg-text hover:bg-foreground text-primary h-12 rounded-xl font-medium shadow-sm"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Join Room
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 bg-secondary rounded-sm animate-pulse mx-auto mb-4"></div>
          <p className="text-text">Loading room...</p>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-medium text-secondary mb-4">Room not found</h2>
          <Button onClick={() => setLocation("/")} className="bg-secondary text-primary hover:bg-text">
            Go Home
          </Button>
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

        <ParticipantsSection participants={room.participants} />
      </main>
    </div>
  );
}
