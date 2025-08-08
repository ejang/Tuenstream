import { useEffect, useRef, useState } from "react";

interface WebSocketMessage {
  type: string;
  data: any;
}

export function useWebSocket(roomId: string | null, onMessage: (message: WebSocketMessage) => void) {
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const onMessageRef = useRef(onMessage);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  // Keep onMessage ref current
  onMessageRef.current = onMessage;

  useEffect(() => {
    if (!roomId) return;

    const connect = () => {
      // Prevent too many reconnection attempts
      if (reconnectAttempts.current >= maxReconnectAttempts) {
        console.log('Max reconnection attempts reached');
        return;
      }

      try {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        
        wsRef.current = new WebSocket(wsUrl);

        wsRef.current.onopen = () => {
          setConnected(true);
          reconnectAttempts.current = 0; // Reset on successful connection
          console.log('WebSocket connected');
          
          // Join the room with a small delay to ensure connection is ready
          setTimeout(() => {
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
              wsRef.current.send(JSON.stringify({
                type: 'join_room',
                roomId: roomId
              }));
            }
          }, 100);
        };

        wsRef.current.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            onMessageRef.current(message);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        wsRef.current.onclose = (event) => {
          setConnected(false);
          console.log('WebSocket disconnected', event.code, event.reason);
          
          // Only attempt to reconnect if it wasn't a normal closure and we haven't exceeded attempts
          if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
            reconnectAttempts.current++;
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000); // Exponential backoff
            
            reconnectTimeoutRef.current = setTimeout(() => {
              console.log(`Attempting to reconnect... (${reconnectAttempts.current}/${maxReconnectAttempts})`);
              connect();
            }, delay);
          }
        };

        wsRef.current.onerror = (error) => {
          console.error('WebSocket error:', error);
          setConnected(false);
        };
      } catch (error) {
        console.error('Failed to create WebSocket:', error);
        setConnected(false);
      }
    };

    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close(1000, 'Component unmounting');
      }
    };
  }, [roomId]);

  return { connected };
}
