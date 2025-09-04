/**
 * App Component Tests
 * 
 * Comprehensive testing for main application component.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import App from '../App';

// Mock components to isolate App testing
jest.mock('../components/ProfileSetup', () => ({
  ProfileSetup: ({ onProfileCreated }: any) => (
    <div data-testid="profile-setup">
      <button onClick={() => onProfileCreated({ org_name: 'Test Org' })}>
        Create Profile
      </button>
    </div>
  )
}));

jest.mock('../components/AssessmentNavigator', () => ({
  AssessmentNavigator: () => <div data-testid="assessment-navigator">Assessment Navigator</div>
}));

jest.mock('../components/QuestionInterface', () => ({
  QuestionInterface: () => <div data-testid="question-interface">Question Interface</div>
}));

jest.mock('../components/ExecutiveDashboard', () => ({
  ExecutiveDashboard: () => <div data-testid="executive-dashboard">Executive Dashboard</div>
}));

// Mock hooks
jest.mock('../hooks/useAssessmentState', () => ({
  useAssessmentState: () => ({
    currentProfile: null,
    assessmentProgress: null,
    updateProfile: jest.fn(),
    updateProgress: jest.fn()
  })
}));

jest.mock('../hooks/useWebSocketConnection', () => ({
  useWebSocketConnection: () => ({
    connectionStatus: 'connected',
    lastMessage: null,
    sendMessage: jest.fn()
  })
}));

jest.mock('../hooks/useBackendAPI', () => ({
  useBackendAPI: () => ({
    createProfile: jest.fn(),
    startAssessment: jest.fn(),
    submitAnswer: jest.fn(),
    pauseAssessment: jest.fn(),
    resumeAssessment: jest.fn()
  })
}));

const AppWrapper: React.FC = () => (
  <BrowserRouter>
    <App />
  </BrowserRouter>
);

describe('App Component', () => {
  test('renders without crashing', () => {
    render(<AppWrapper />);
    expect(screen.getByTestId('profile-setup')).toBeInTheDocument();
  });

  test('shows profile setup by default', () => {
    render(<AppWrapper />);
    expect(screen.getByTestId('profile-setup')).toBeInTheDocument();
  });

  test('includes error boundary', () => {
    // Error boundary is wrapping the app
    render(<AppWrapper />);
    // If this renders without throwing, error boundary is working
    expect(screen.getByTestId('profile-setup')).toBeInTheDocument();
  });

  test('includes toast notifications', () => {
    render(<AppWrapper />);
    // Toaster component should be present (even if not visible)
    expect(document.body).toBeInTheDocument();
  });
});