import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Plus } from "lucide-react";
import type { YoutubeSearchResult } from "@shared/schema";

interface SearchSectionProps {
  roomId: string;
}

export default function SearchSection({ roomId }: SearchSectionProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const { data: searchResults = [], isLoading: isSearching } = useQuery<YoutubeSearchResult[]>({
    queryKey: ["/api/youtube/search", searchQuery],
    enabled: searchQuery.length > 2,
    staleTime: 60000, // Cache for 1 minute
  });

  const addToQueueMutation = useMutation({
    mutationFn: async (song: YoutubeSearchResult) => {
      const participantName = "User"; // In a real app, this would come from authentication
      const response = await apiRequest("POST", `/api/rooms/${roomId}/queue`, {
        youtubeId: song.id,
        title: song.title,
        artist: song.artist,
        duration: song.duration,
        thumbnail: song.thumbnail,
        requestedBy: participantName,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rooms", roomId] });
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
    <section className="mb-12">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-xl font-medium text-secondary mb-6 text-center">Add Music to Queue</h2>
        
        <Card className="bg-primary border border-accent minimal-shadow">
          <CardContent className="p-6">
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Search for songs on YouTube..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-3 pr-12 border border-accent rounded-md text-secondary bg-primary input-focus focus:outline-none focus:border-highlight transition-all duration-200"
                />
                <Button 
                  type="submit" 
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 px-4 py-2 bg-secondary text-primary rounded-md hover:bg-text transition-colors duration-200"
                >
                  <Search className="w-4 h-4" />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {isSearching && (
          <div className="mt-6 text-center">
            <div className="inline-flex items-center space-x-2 text-text">
              <div className="w-4 h-4 border border-accent border-t-secondary rounded-full animate-spin"></div>
              <span>Searching...</span>
            </div>
          </div>
        )}

        {searchResults.length > 0 && (
          <div className="mt-6 space-y-3 fade-in">
            {searchResults.map((result) => (
              <Card key={result.id} className="bg-primary border border-accent minimal-shadow hover:border-text transition-colors duration-200">
                <CardContent className="p-0">
                  <div className="flex items-center p-4">
                    <img 
                      src={result.thumbnail} 
                      alt="Song thumbnail" 
                      className="w-20 h-15 object-cover rounded-md"
                    />
                    <div className="ml-4 flex-1 min-w-0">
                      <h3 className="font-medium text-secondary truncate">{result.title}</h3>
                      <p className="text-sm text-text truncate">{result.artist}</p>
                      <p className="text-xs text-text mt-1">{result.duration}</p>
                    </div>
                    <Button 
                      onClick={() => handleAddToQueue(result)}
                      disabled={addToQueueMutation.isPending}
                      className="ml-4 px-6 py-2 bg-highlight text-primary rounded-md hover:bg-orange-600 transition-colors duration-200 font-medium"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {searchQuery.length > 2 && !isSearching && searchResults.length === 0 && (
          <div className="mt-6 text-center">
            <p className="text-text">No results found for "{searchQuery}"</p>
          </div>
        )}
      </div>
    </section>
  );
}
