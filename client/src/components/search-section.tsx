import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus } from "lucide-react";
import type { YoutubeSearchResult } from "@shared/schema";

export default function SearchSection() {
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const { data: searchResults = [], isLoading: isSearching } = useQuery<YoutubeSearchResult[]>({
    queryKey: ["/api/youtube/search", searchQuery],
    queryFn: async () => {
      const response = await fetch(`/api/youtube/search?q=${encodeURIComponent(searchQuery)}`);
      if (!response.ok) {
        throw new Error('검색 실패');
      }
      return response.json();
    },
    enabled: searchQuery.length > 2,
    staleTime: 60000, // Cache for 1 minute
  });

  const addToQueueMutation = useMutation({
    mutationFn: async (song: YoutubeSearchResult) => {
      const response = await apiRequest("POST", "/api/queue", {
        youtubeId: song.id,
        title: song.title,
        artist: song.artist,
        duration: song.duration,
        thumbnail: song.thumbnail,
        requestedBy: "You",
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/player"] });
      // Clear search results after adding song
      setSearchQuery("");
      toast({
        title: "Song added",
        description: "Song has been added to the queue",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add song to queue",
        variant: "destructive",
      });
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Query will automatically trigger due to enabled condition
  };

  const handleAddToQueue = (song: YoutubeSearchResult) => {
    addToQueueMutation.mutate(song);
  };

  return (
    <section className="mb-10">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-lg font-light text-foreground mb-5 text-center">Search Music</h2>

        <div className="bg-primary rounded-2xl shadow-lg border border-border overflow-hidden">
          <div className="bg-secondary/20 px-3 py-1.5 text-center border-b border-border">
            <div className="text-xs font-mono text-muted-foreground">YouTube Music Search</div>
          </div>
          <div className="p-4">
            <form onSubmit={handleSearch} className="space-y-3">
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Artist, song, album..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2.5 pr-11 bg-input border-border rounded-lg text-foreground text-sm focus:ring-2 focus:ring-text/20 focus:border-text transition-all duration-200"
                />
                <Button
                  type="submit"
                  className="absolute right-1.5 top-1/2 transform -translate-y-1/2 p-1.5 bg-accent hover:bg-secondary text-foreground rounded-md transition-colors duration-200"
                >
                  <Search className="w-3 h-3" />
                </Button>
              </div>
            </form>
          </div>
        </div>

        {isSearching && (
          <div className="mt-4 text-center">
            <div className="inline-flex items-center space-x-2 text-muted-foreground">
              <div className="w-3 h-3 border border-border border-t-text rounded-full animate-spin"></div>
              <span className="text-xs font-mono">Searching...</span>
            </div>
          </div>
        )}

        {searchResults.length > 0 && (
          <div className="mt-4 space-y-2 fade-in">
            {searchResults.map((result) => (
              <div key={result.id} className="bg-primary border border-border rounded-lg shadow-sm hover:shadow-md transition-all duration-200">
                <div className="flex items-center p-3">
                  <img
                    src={result.thumbnail}
                    alt="Song thumbnail"
                    className="w-12 h-9 object-cover rounded border border-border"
                  />
                  <div className="ml-3 flex-1 min-w-0">
                    <h3 className="font-medium text-foreground text-sm truncate leading-tight">{result.title}</h3>
                    <p className="text-xs text-muted-foreground truncate">{result.artist}</p>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">{result.duration}</p>
                  </div>
                  <Button
                    onClick={() => handleAddToQueue(result)}
                    disabled={addToQueueMutation.isPending}
                    className="ml-3 px-3 py-1.5 bg-text text-primary rounded-md hover:bg-foreground transition-colors duration-200 text-xs font-medium"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {searchQuery.length > 2 && !isSearching && searchResults.length === 0 && (
          <div className="mt-4 text-center">
            <p className="text-muted-foreground text-xs font-mono">No results for "{searchQuery}"</p>
          </div>
        )}
      </div>
    </section>
  );
}
