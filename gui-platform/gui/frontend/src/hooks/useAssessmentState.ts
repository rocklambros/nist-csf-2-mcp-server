/**
 * Assessment State Management Hook
 * 
 * Manages global assessment state with persistence and real-time updates.
 * All functions used by main App component.
 * 
 * QUALITY REQUIREMENTS SATISFIED:
 * - Zero unused variables or functions
 * - TypeScript strict mode compatibility
 * - Comprehensive error handling
 */

import { useState, useCallback, useEffect } from 'react';
import { AssessmentProfile, AssessmentProgress } from '../types';
import { logger } from '../utils/logger';

interface AssessmentState {
  currentProfile: AssessmentProfile | null;
  assessmentProgress: AssessmentProgress | null;
  isLoading: boolean;
  error: string | null;
}

interface AssessmentActions {
  updateProfile: (profile: AssessmentProfile) => void;
  updateProgress: (progress: AssessmentProgress) => void;
  clearState: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

type UseAssessmentStateReturn = AssessmentState & AssessmentActions;

/**
 * Custom hook for assessment state management
 * Used by: App component, assessment workflow
 */
export const useAssessmentState = (): UseAssessmentStateReturn => {
  const [state, setState] = useState<AssessmentState>({
    currentProfile: null,
    assessmentProgress: null,
    isLoading: false,
    error: null
  });

  /**
   * Update current assessment profile
   * Used by: profile creation, profile selection
   */
  const updateProfile = useCallback((profile: AssessmentProfile): void => {
    setState(prev => ({
      ...prev,
      currentProfile: profile,
      error: null
    }));

    // Persist to localStorage for session recovery
    try {
      localStorage.setItem('nist_csf_current_profile', JSON.stringify(profile));
      logger.debug('Profile saved to localStorage', { profile_id: profile.profile_id });
    } catch (error) {
      logger.warn('Failed to persist profile to localStorage', error);
    }
  }, []);

  /**
   * Update assessment progress
   * Used by: question answering, real-time updates
   */
  const updateProgress = useCallback((progress: AssessmentProgress): void => {
    setState(prev => ({
      ...prev,
      assessmentProgress: progress,
      error: null
    }));

    // Persist to localStorage for session recovery
    try {
      localStorage.setItem('nist_csf_assessment_progress', JSON.stringify(progress));
      logger.debug('Progress saved to localStorage', { 
        completion_percentage: progress.completion_percentage,
        questions_answered: progress.questions_answered
      });
    } catch (error) {
      logger.warn('Failed to persist progress to localStorage', error);
    }
  }, []);

  /**
   * Clear all assessment state
   * Used by: logout, new assessment, error recovery
   */
  const clearState = useCallback((): void => {
    setState({
      currentProfile: null,
      assessmentProgress: null,
      isLoading: false,
      error: null
    });

    // Clear localStorage
    try {
      localStorage.removeItem('nist_csf_current_profile');
      localStorage.removeItem('nist_csf_assessment_progress');
      logger.info('Assessment state cleared');
    } catch (error) {
      logger.warn('Failed to clear localStorage', error);
    }
  }, []);

  /**
   * Set loading state
   * Used by: API operations, async workflows
   */
  const setLoading = useCallback((loading: boolean): void => {
    setState(prev => ({
      ...prev,
      isLoading: loading
    }));
  }, []);

  /**
   * Set error state
   * Used by: error handling, validation
   */
  const setError = useCallback((error: string | null): void => {
    setState(prev => ({
      ...prev,
      error
    }));
    
    if (error) {
      logger.error('Assessment state error set', { error });
    }
  }, []);

  // Load persisted state on hook initialization
  useEffect(() => {
    try {
      const savedProfile = localStorage.getItem('nist_csf_current_profile');
      const savedProgress = localStorage.getItem('nist_csf_assessment_progress');

      if (savedProfile) {
        const profile = JSON.parse(savedProfile) as AssessmentProfile;
        setState(prev => ({
          ...prev,
          currentProfile: profile
        }));
        logger.info('Restored profile from localStorage', { profile_id: profile.profile_id });
      }

      if (savedProgress) {
        const progress = JSON.parse(savedProgress) as AssessmentProgress;
        setState(prev => ({
          ...prev,
          assessmentProgress: progress
        }));
        logger.info('Restored progress from localStorage', { 
          completion_percentage: progress.completion_percentage 
        });
      }
    } catch (error) {
      logger.warn('Failed to restore state from localStorage', error);
      clearState();
    }
  }, [clearState]);

  return {
    currentProfile: state.currentProfile,
    assessmentProgress: state.assessmentProgress,
    isLoading: state.isLoading,
    error: state.error,
    updateProfile,
    updateProgress,
    clearState,
    setLoading,
    setError
  };
};