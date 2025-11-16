import { useQuery } from "@tanstack/react-query";
import SearchSection from "@/components/search-section";
import CurrentlyPlaying from "@/components/currently-playing";
import PlaylistQueue from "@/components/playlist-queue";
import type { Room } from "@shared/schema";

export default function Home() {
  const { data: room, isLoading } = useQuery<Room>({
    queryKey: ["/api/player"],
    refetchInterval: 2000, // Poll every 2 seconds for updates
  });

  if (isLoading) {
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
          <h2 className="text-xl font-medium text-secondary mb-4">Loading player...</h2>
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
                <h1 className="text-xl font-light text-foreground">iPod Music</h1>
                <div className="text-xs text-muted-foreground font-mono">Personal Player</div>
              </div>
            </div>

            <div className="hidden md:flex items-center space-x-4 text-xs">
              <div className="flex items-center space-x-1.5">
                <div className="w-1.5 h-1.5 bg-green-600 rounded-full"></div>
                <span className="text-muted-foreground font-mono text-xs">Ready</span>
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
        <SearchSection />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <CurrentlyPlaying room={room} />
          <PlaylistQueue room={room} />
        </div>

      </main>
    </div>
  );
}
