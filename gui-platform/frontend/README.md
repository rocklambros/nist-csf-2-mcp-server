# NIST CSF Assessment GUI - React Frontend

Professional cybersecurity assessment interface with real-time dashboards and stunning executive reporting capabilities.

## 🎯 Features

### Assessment Experience
- **Company-Size-Aware Questions**: Intelligent filtering based on organization size and industry
- **Dual Question Types**: Maturity rating + Implementation status per subcategory
- **Real-time Progress Persistence**: Auto-save with WebSocket synchronization
- **Professional Design**: CISO and board-presentation ready interface

### Executive Dashboards
- **Real-time Updates**: Live progress tracking with WebSocket integration
- **Industry Benchmarking**: Peer comparison with size-appropriate context
- **Risk Heat Maps**: Visual risk assessment with drill-down capability
- **Compliance Reporting**: PDF and CSV export for executive presentation

### Technical Excellence
- **TypeScript Strict Mode**: Complete type safety and prop validation
- **WCAG 2.1 AA Compliance**: Full accessibility support with keyboard navigation
- **Performance Optimized**: <1s page transitions, <2MB bundle size
- **Error Boundaries**: Graceful degradation with recovery options

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm start

# Build for production  
npm run build

# Run tests with coverage
npm test:coverage
```

## 🏗️ Architecture

### Component Structure
```
src/
├── components/           # React UI components
│   ├── ProfileSetup.tsx     # Organization creation wizard
│   ├── AssessmentNavigator.tsx # Function/subcategory navigation
│   ├── QuestionInterface.tsx   # Dual question presentation
│   ├── ProgressTracker.tsx     # Real-time progress monitoring
│   ├── ExecutiveDashboard.tsx  # Executive visualization
│   ├── ReconnectionHandler.tsx # Connectivity management
│   └── ErrorFallback.tsx       # Error boundary fallback
├── hooks/                # Custom React hooks
│   ├── useAssessmentState.ts   # Global state management
│   ├── useWebSocketConnection.ts # Real-time updates
│   └── useBackendAPI.ts        # Backend API integration
├── types/                # TypeScript definitions
├── utils/                # Utilities and helpers
└── __tests__/            # Test suites
```

### State Management
- **Zustand**: Lightweight state management for assessment workflow
- **React Hook Form**: Form state with validation and error handling
- **WebSocket**: Real-time progress synchronization with backend
- **LocalStorage**: Session persistence and recovery

## 📊 Assessment Workflow

### User Journey
1. **Profile Creation**: Organization setup with industry/size context
2. **Function Navigation**: NIST CSF function selection (GV, ID, PR, DE, RS, RC)
3. **Subcategory Assessment**: Dual question presentation per subcategory
4. **Progress Tracking**: Real-time progress with pause/resume capability
5. **Executive Dashboard**: Results visualization with benchmarking

### Question Intelligence
- **Size-Filtered Questions**: Relevant questions based on organization size
- **Industry Context**: Sector-specific guidance and examples
- **Dual Assessment**: Maturity rating + Implementation status per subcategory
- **Progress Persistence**: Mid-subcategory pause with automatic resume

## 🎨 Design System

### Professional Styling
- **Executive-Ready**: Clean, professional design suitable for CISO presentations
- **Brand Colors**: NIST CSF function-specific color coding
- **Typography**: System fonts optimized for readability and presentation
- **Responsive Layout**: Desktop and tablet optimized (1024px+ primary)

### Accessibility Features
- **Keyboard Navigation**: Full keyboard accessibility throughout interface
- **Screen Reader Support**: ARIA labels and semantic HTML structure
- **High Contrast**: Color combinations meeting WCAG AA contrast requirements
- **Focus Management**: Logical tab order and focus indicators

## 🔌 Backend Integration

### API Connectivity
- **REST API**: Full integration with backend at `http://localhost:3001/api`
- **WebSocket**: Real-time updates via `ws://localhost:3001`
- **Error Handling**: Graceful degradation with offline mode support
- **Retry Logic**: Automatic reconnection with exponential backoff

### Data Synchronization
- **Optimistic Updates**: Immediate UI feedback with error rollback
- **Progress Persistence**: Real-time progress saving with WebSocket sync
- **Session Recovery**: Automatic state restoration after disconnection
- **Offline Mode**: Local storage with sync when connection restored

## 🧪 Testing Strategy

### Test Coverage (85%+ Target)
- **Component Tests**: React Testing Library with user interaction testing
- **Hook Tests**: Custom hook functionality and edge cases
- **Integration Tests**: API communication and WebSocket handling
- **Accessibility Tests**: WCAG compliance verification

### Quality Assurance
- **TypeScript**: Strict mode with comprehensive type checking
- **ESLint**: Zero unused variable tolerance with recommended rules
- **Prettier**: Consistent code formatting
- **Performance**: Bundle size monitoring and optimization

## 📱 Responsive Design

### Desktop Experience (Primary)
- **Optimized Layout**: Multi-column layouts with efficient space usage
- **Executive Dashboards**: Full-screen visualizations with detailed metrics
- **Keyboard Shortcuts**: Professional workflow acceleration
- **Print Optimization**: Executive report layouts

### Tablet Support
- **Touch-Friendly**: Appropriate touch targets and gesture support
- **Responsive Grid**: Adaptive layouts for tablet screen sizes
- **Portrait/Landscape**: Optimized for both orientations

## 🎯 User Experience

### Assessment Flow
- **Intuitive Navigation**: Clear progress indicators and next steps
- **Context Help**: Inline guidance and examples throughout assessment
- **Progress Motivation**: Completion estimates and milestone celebrations
- **Professional Confidence**: Executive-ready interface design

### Performance Standards
- **Page Load**: <1 second for all page transitions
- **Real-time Updates**: <500ms WebSocket update rendering
- **Bundle Size**: <2MB optimized production build
- **Accessibility**: 100% keyboard navigable interface

## 🚀 Deployment

The frontend integrates seamlessly with the Docker Compose setup:

```bash
# Start complete assessment platform
docker-compose up

# Frontend available at: http://localhost:3000
# Backend API at: http://localhost:3001
```

The interface provides an intuitive, professional alternative to the technical MCP command-line interface while preserving all assessment functionality and data compatibility.