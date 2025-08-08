import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export function useYouTubePlayer(videoId: string | null, onEnded?: () => void, onTimeUpdate?: (currentTime: number) => void) {
  const [player, setPlayer] = useState<any>(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const playerInitialized = useRef(false);
  const timeUpdateInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Load YouTube IFrame API if not already loaded
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }

    const initializePlayer = () => {
      if (playerInitialized.current || !window.YT?.Player) return;
      
      playerInitialized.current = true;
      
      const newPlayer = new window.YT.Player('youtube-player', {
        height: '100%',
        width: '100%',
        videoId: videoId || '',
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
        },
        events: {
          onReady: () => {
            setIsPlayerReady(true);
          },
          onStateChange: (event: any) => {
            // YouTube Player States: -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (cued)
            if (event.data === 0 && onEnded) { // Video ended
              onEnded();
            }
            
            // Start/stop time tracking based on player state
            if (event.data === 1) { // Playing
              startTimeTracking();
            } else { // Paused, ended, etc.
              stopTimeTracking();
            }
          },
        },
      });
      
      setPlayer(newPlayer);
    };

    const startTimeTracking = () => {
      if (timeUpdateInterval.current) {
        clearInterval(timeUpdateInterval.current);
      }
      
      timeUpdateInterval.current = setInterval(() => {
        if (player && isPlayerReady && typeof player.getCurrentTime === 'function') {
          try {
            const time = player.getCurrentTime();
            if (time !== undefined && time >= 0) {
              setCurrentTime(time);
              if (onTimeUpdate) {
                onTimeUpdate(time);
              }
            }
          } catch (error) {
            console.log('Error getting current time:', error);
          }
        }
      }, 500); // Update every 500ms for smoother movement
    };

    const stopTimeTracking = () => {
      if (timeUpdateInterval.current) {
        clearInterval(timeUpdateInterval.current);
        timeUpdateInterval.current = null;
      }
    };

    if (window.YT?.Player) {
      initializePlayer();
    } else {
      window.onYouTubeIframeAPIReady = initializePlayer;
    }

    return () => {
      stopTimeTracking();
      if (player) {
        player.destroy();
      }
    };
  }, []);

  useEffect(() => {
    if (player && isPlayerReady && videoId) {
      player.loadVideoById(videoId);
    }
  }, [player, isPlayerReady, videoId]);

  return { player, isPlayerReady, currentTime };
}
