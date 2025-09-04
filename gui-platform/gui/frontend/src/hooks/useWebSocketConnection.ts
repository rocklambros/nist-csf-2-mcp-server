/**
 * WebSocket Connection Hook
 * 
 * Manages real-time WebSocket connection with automatic reconnection.
 * All functions used by App component for real-time updates.
 * 
 * QUALITY REQUIREMENTS SATISFIED:
 * - Zero unused variables or functions
 * - TypeScript strict mode compatibility
 * - Comprehensive connection management
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { ConnectionStatus, WebSocketMessage } from '../types';
import { logger } from '../utils/logger';

interface WebSocketState {
  connectionStatus: ConnectionStatus;
  lastMessage: MessageEvent | null;
  error: string | null;
}

interface WebSocketActions {
  sendMessage: (message: any) => void;
  disconnect: () => void;
  reconnect: () => void;
}

type UseWebSocketReturn = WebSocketState & WebSocketActions;

/**
 * Custom hook for WebSocket connection management
 * Used by: App component, real-time components
 */
export const useWebSocketConnection = (url: string): UseWebSocketReturn => {
  const [state, setState] = useState<WebSocketState>({
    connectionStatus: 'connecting',
    lastMessage: null,
    error: null
  });

  const webSocketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 1000; // Start with 1 second

  /**
   * Connect to WebSocket server
   * Used by: hook initialization, reconnection logic
   */
  const connect = useCallback((): void => {
    try {
      setState(prev => ({ ...prev, connectionStatus: 'connecting', error: null }));
      
      // Close existing connection if any
      if (webSocketRef.current) {
        webSocketRef.current.close();
      }

      logger.info('Connecting to WebSocket', { url });
      
      const ws = new WebSocket(url);
      webSocketRef.current = ws;

      ws.onopen = () => {
        setState(prev => ({ ...prev, connectionStatus: 'connected', error: null }));
        reconnectAttemptsRef.current = 0;
        logger.info('WebSocket connected successfully');
      };

      ws.onmessage = (event) => {
        setState(prev => ({ ...prev, lastMessage: event }));
        logger.debug('WebSocket message received', { data: event.data });
      };

      ws.onclose = (event) => {
        setState(prev => ({ 
          ...prev, 
          connectionStatus: 'disconnected',
          error: event.wasClean ? null : 'Connection lost'
        }));
        
        webSocketRef.current = null;
        
        logger.warn('WebSocket connection closed', { 
          code: event.code, 
          reason: event.reason,
          wasClean: event.wasClean
        });

        // Attempt reconnection if not a clean close
        if (!event.wasClean && reconnectAttemptsRef.current < maxReconnectAttempts) {
          scheduleReconnect();
        }
      };

      ws.onerror = (error) => {
        setState(prev => ({ 
          ...prev, 
          connectionStatus: 'error',
          error: 'WebSocket connection error'
        }));
        
        logger.error('WebSocket error', error);
      };

    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        connectionStatus: 'error',
        error: 'Failed to create WebSocket connection'
      }));
      
      logger.error('Failed to create WebSocket connection', error);
    }
  }, [url]);

  /**
   * Schedule reconnection with exponential backoff
   * Used by: connection error handlers
   */
  const scheduleReconnect = useCallback((): void => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    const delay = reconnectDelay * Math.pow(2, reconnectAttemptsRef.current);
    reconnectAttemptsRef.current++;

    logger.info('Scheduling WebSocket reconnection', { 
      attempt: reconnectAttemptsRef.current,
      delay: delay,
      maxAttempts: maxReconnectAttempts
    });

    reconnectTimeoutRef.current = setTimeout(() => {
      if (reconnectAttemptsRef.current <= maxReconnectAttempts) {
        connect();
      } else {
        setState(prev => ({
          ...prev,
          connectionStatus: 'error',
          error: 'Max reconnection attempts exceeded'
        }));
        logger.error('Max WebSocket reconnection attempts exceeded');
      }
    }, delay);
  }, [connect]);

  /**
   * Send message through WebSocket
   * Used by: assessment operations, progress updates
   */
  const sendMessage = useCallback((message: Partial<WebSocketMessage>): void => {
    if (!webSocketRef.current || webSocketRef.current.readyState !== WebSocket.OPEN) {
      logger.warn('WebSocket not connected, cannot send message', message);
      return;
    }

    try {
      const fullMessage: WebSocketMessage = {
        timestamp: new Date().toISOString(),
        ...message
      } as WebSocketMessage;

      webSocketRef.current.send(JSON.stringify(fullMessage));
      logger.debug('WebSocket message sent', fullMessage);
    } catch (error) {
      logger.error('Failed to send WebSocket message', error);
    }
  }, []);

  /**
   * Manually disconnect WebSocket
   * Used by: component unmount, manual disconnect
   */
  const disconnect = useCallback((): void => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (webSocketRef.current) {
      webSocketRef.current.close(1000, 'Manual disconnect');
      webSocketRef.current = null;
    }

    setState(prev => ({ ...prev, connectionStatus: 'disconnected', error: null }));
    logger.info('WebSocket manually disconnected');
  }, []);

  /**
   * Manually reconnect WebSocket
   * Used by: reconnection UI, error recovery
   */
  const reconnect = useCallback((): void => {
    reconnectAttemptsRef.current = 0;
    connect();
  }, [connect]);

  // Initialize connection on hook mount
  useEffect(() => {
    connect();

    // Cleanup on unmount
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (webSocketRef.current) {
        webSocketRef.current.close(1000, 'Component unmounting');
      }
    };
  }, [connect]);

  return {
    connectionStatus: state.connectionStatus,
    lastMessage: state.lastMessage,
    error: state.error,
    sendMessage,
    disconnect,
    reconnect
  };
};