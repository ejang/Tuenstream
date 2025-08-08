import { GoogleGenAI } from "@google/genai";
import type { Song } from "@shared/schema";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface AIRecommendationRequest {
  currentTrack?: Song | null;
  recentTracks: Song[];
  preferredGenres?: string[];
}

export async function getAIMusicRecommendations(
  request: AIRecommendationRequest,
  maxResults: number = 3
): Promise<string[]> {
  try {
    const { currentTrack, recentTracks, preferredGenres } = request;
    
    // Build context for AI
    let context = "당신은 음악 추천 전문가입니다. 사용자의 음악 취향을 분석하여 비슷한 장르나 스타일의 곡을 추천해주세요.\n\n";
    
    if (currentTrack) {
      context += `현재 재생 중인 곡: "${currentTrack.title}" by ${currentTrack.artist}\n`;
    }
    
    if (recentTracks.length > 0) {
      context += "최근 재생된 곡들:\n";
      recentTracks.slice(0, 5).forEach((track, index) => {
        context += `${index + 1}. "${track.title}" by ${track.artist}\n`;
      });
    }
    
    if (preferredGenres && preferredGenres.length > 0) {
      context += `선호하는 장르: ${preferredGenres.join(", ")}\n`;
    }
    
    context += `\n위의 정보를 바탕으로 비슷한 스타일의 음악 ${maxResults}곡을 추천해주세요. `;
    context += "각 곡은 다음 형식으로 응답해주세요:\n";
    context += '"곡 제목" - 아티스트명\n';
    context += "실제로 존재하는 곡만 추천해주세요. 한국어와 영어 곡 모두 괜찮습니다.";

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: context,
    });

    const recommendations = response.text || "";
    
    // Parse recommendations into search queries
    const queries = recommendations
      .split('\n')
      .filter(line => line.trim() && (line.includes('-') || line.includes('by')))
      .map(line => {
        // Clean up the line and extract song info
        const cleaned = line.trim().replace(/^\d+\.\s*/, '').replace(/['"]/g, '');
        return cleaned;
      })
      .filter(query => query.length > 0)
      .slice(0, maxResults);

    return queries;
  } catch (error) {
    console.error('AI recommendation error:', error);
    // Fallback recommendations
    return [
      "popular korean music 2024",
      "trending pop songs",
      "chill music playlist"
    ];
  }
}

export async function shouldTriggerAutoSelection(
  room: { queue: Song[]; currentTrack: Song | null; autoSelection?: boolean }
): Promise<boolean> {
  // Only trigger if auto-selection is enabled and queue is low
  return !!(room.autoSelection && room.queue.length <= 1 && room.currentTrack);
}