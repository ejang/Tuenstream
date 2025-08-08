export interface YouTubeSearchResult {
  id: string;
  title: string;
  artist: string;
  duration: string;
  thumbnail: string;
}

export class YouTubeAPI {
  async search(query: string, maxResults: number = 10): Promise<YouTubeSearchResult[]> {
    try {
      // Use server-side YouTube API endpoint
      const response = await fetch(`/api/youtube/search?q=${encodeURIComponent(query)}&maxResults=${maxResults}`);
      
      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }
      
      const results = await response.json();
      return results;
    } catch (error) {
      console.error('YouTube search error:', error);
      throw new Error('Failed to search YouTube');
    }
  }

}

// Export a default instance
export const youtubeAPI = new YouTubeAPI();
