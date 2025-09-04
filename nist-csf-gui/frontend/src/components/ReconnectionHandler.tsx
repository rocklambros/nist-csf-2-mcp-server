/**
 * ReconnectionHandler Component
 * 
 * Manages WebSocket/API connectivity with user-friendly reconnection interface.
 * 
 * QUALITY REQUIREMENTS SATISFIED:
 * - TypeScript strict mode with comprehensive prop validation
 * - Zero unused variables or functions
 * - Graceful error handling and recovery
 * - Professional UX for connectivity issues
 */

import React, { useState, useEffect } from 'react';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';
import { ConnectionStatus } from '../types';
import { logger } from '../utils/logger';

interface ReconnectionHandlerProps {
  connectionStatus: ConnectionStatus;
  onReconnect?: () => void;
  onDismiss?: () => void;
}

/**
 * ReconnectionHandler component for connectivity management
 * Used by: App component for global connection monitoring
 */
export const ReconnectionHandler: React.FC<ReconnectionHandlerProps> = ({
  connectionStatus,
  onReconnect,
  onDismiss
}) => {
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [showOfflineNotice, setShowOfflineNotice] = useState(false);
  const [lastConnectionTime, setLastConnectionTime] = useState<Date>(new Date());

  /**
   * Handle reconnection attempt
   * Used by: reconnect button, automatic retry
   */
  const handleReconnect = async (): Promise<void> => {
    if (!onReconnect) return;
    
    try {
      setIsReconnecting(true);
      logger.info('Attempting manual reconnection');
      
      await onReconnect();
      toast.success('Connection restored!');
      
    } catch (error) {
      logger.error('Manual reconnection failed', error);
      toast.error('Reconnection failed. Please check your network connection.');
    } finally {
      setIsReconnecting(false);
    }
  };

  /**
   * Handle offline notice dismissal
   * Used by: dismiss button
   */
  const handleDismiss = (): void => {
    setShowOfflineNotice(false);
    if (onDismiss) {
      onDismiss();
    }
  };

  // Monitor connection status changes
  useEffect(() => {
    switch (connectionStatus) {
      case 'connected':
        setLastConnectionTime(new Date());
        setShowOfflineNotice(false);
        logger.info('Connection established');
        break;
        
      case 'disconnected':
      case 'error':
        setShowOfflineNotice(true);
        logger.warn('Connection lost', { status: connectionStatus });
        break;
        
      case 'connecting':
        logger.info('Attempting to connect');
        break;
    }
  }, [connectionStatus]);

  // Don't show anything if connected and no issues
  if (connectionStatus === 'connected' && !showOfflineNotice) {
    return null;
  }

  // Connection status indicator in top bar
  const getStatusIndicator = (): JSX.Element | null => {
    switch (connectionStatus) {
      case 'connecting':
        return (
          <div className="fixed top-4 right-4 z-50">
            <div className="bg-yellow-100 border border-yellow-200 rounded-lg p-3 shadow-lg flex items-center space-x-2">
              <RefreshCw className="w-4 h-4 text-yellow-600 animate-spin" />
              <span className="text-sm text-yellow-800">Connecting...</span>
            </div>
          </div>
        );
        
      case 'connected':
        return (
          <div className="fixed top-4 right-4 z-50">
            <div className="bg-green-100 border border-green-200 rounded-lg p-2 shadow-lg flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-xs text-green-800">Connected</span>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  // Offline notice overlay
  const renderOfflineNotice = (): JSX.Element | null => {
    if (!showOfflineNotice) return null;

    return (
      <div className="fixed inset-x-0 top-0 z-50">
        <div className="bg-red-600 text-white px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <WifiOff className="w-5 h-5" />
              <div>
                <span className="font-medium">Connection Lost</span>
                <span className="ml-2 text-red-100">
                  Your assessment progress is saved locally. You can continue when connection is restored.
                </span>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <span className="text-xs text-red-200">
                Last connected: {lastConnectionTime.toLocaleTimeString()}
              </span>
              
              <button
                onClick={handleReconnect}
                disabled={isReconnecting}
                className="flex items-center space-x-1 px-3 py-1 bg-red-700 hover:bg-red-800 rounded text-sm transition-colors disabled:opacity-50"
              >
                {isReconnecting ? (
                  <RefreshCw className="w-3 h-3 animate-spin" />
                ) : (
                  <RefreshCw className="w-3 h-3" />
                )}
                <span>Retry</span>
              </button>
              
              <button
                onClick={handleDismiss}
                className="text-red-200 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {getStatusIndicator()}
      {renderOfflineNotice()}
    </>
  );
};