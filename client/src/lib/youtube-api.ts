export interface YouTubeSearchResult {
  id: string;
  title: string;
  artist: string;
  duration: string;
  thumbnail: string;
}

export class YouTubeAPI {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async search(query: string, maxResults: number = 10): Promise<YouTubeSearchResult[]> {
    try {
      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=${maxResults}&q=${encodeURIComponent(query)}&type=video&key=${this.apiKey}`;
      
      const searchResponse = await fetch(searchUrl);
      const searchData = await searchResponse.json();

      if (!searchData.items) {
        return [];
      }

      const videoIds = searchData.items.map((item: any) => item.id.videoId).join(',');
      const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoIds}&key=${this.apiKey}`;
      
      const detailsResponse = await fetch(detailsUrl);
      const detailsData = await detailsResponse.json();

      return searchData.items.map((item: any, index: number) => {
        const duration = detailsData.items[index]?.contentDetails?.duration || 'PT0S';
        const formattedDuration = this.formatDuration(duration);
        
        return {
          id: item.id.videoId,
          title: item.snippet.title,
          artist: item.snippet.channelTitle,
          duration: formattedDuration,
          thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
        };
      });
    } catch (error) {
      console.error('YouTube search error:', error);
      throw new Error('Failed to search YouTube');
    }
  }

  private formatDuration(duration: string): string {
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    if (!match) return '0:00';

    const hours = (match[1] || '').replace('H', '');
    const minutes = (match[2] || '').replace('M', '');
    const seconds = (match[3] || '').replace('S', '');

    if (hours) {
      return `${hours}:${minutes.padStart(2, '0')}:${seconds.padStart(2, '0')}`;
    } else {
      return `${minutes || '0'}:${seconds.padStart(2, '0')}`;
    }
  }
}

// Export a default instance using environment variable
const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY || '';
export const youtubeAPI = new YouTubeAPI(apiKey);
