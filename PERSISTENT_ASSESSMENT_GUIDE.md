# Persistent Comprehensive Assessment Guide

## Overview
The persistent comprehensive assessment feature allows users to complete NIST CSF 2.0 assessments over multiple sessions, automatically saving progress after each question answered.

## Key Features

### 🔄 **Resume Capability**
- Start an assessment and return days/weeks later
- Automatically resume from the exact question where you left off
- Complete progress preservation across chat sessions

### 📊 **Progress Tracking** 
- Real-time completion percentage
- Question count tracking (answered/total)
- Progress breakdown by CSF function and category
- Time tracking and estimation

### ⏸️ **Session Management**
- Pause assessment at any time
- Multiple session states (in_progress, paused, completed)
- Automatic session recovery

## Usage Workflow

### 1. Start Assessment
First, create an assessment workflow:
```
start_assessment_workflow({
  "org_name": "Your Organization",
  "sector": "Technology", 
  "size": "medium",
  "contact_name": "Your Name",
  "contact_email": "your@email.com"
})
```

This returns a `workflow_id` that you'll use for all subsequent operations.

### 2. Begin Persistent Assessment
```
persistent_comprehensive_assessment({
  "workflow_id": "your-workflow-id",
  "action": "start"
})
```

**Response includes:**
- Total number of questions
- First question to answer
- Progress tracking information
- Estimated completion time

### 3. Answer Questions
For each question, save your response:
```
persistent_comprehensive_assessment({
  "workflow_id": "your-workflow-id", 
  "action": "answer",
  "question_id": "question-id-from-response",
  "response_value": "your-answer",
  "confidence_level": "high",
  "notes": "Optional notes about your response"
})
```

**Automatic Progress Saving:**
- Progress saved immediately after each answer
- Next question automatically presented
- Completion percentage updated in real-time

### 4. Pause Assessment
```
persistent_comprehensive_assessment({
  "workflow_id": "your-workflow-id",
  "action": "pause"
})
```

### 5. Resume Assessment (Later Session)
```
persistent_comprehensive_assessment({
  "workflow_id": "your-workflow-id",
  "action": "resume"
})
```

**Resume Response:**
- Current progress summary
- Next unanswered question
- Time estimation for completion
- Detailed progress breakdown

### 6. Check Progress Anytime
```
persistent_comprehensive_assessment({
  "workflow_id": "your-workflow-id",
  "action": "get_progress"
})
```

## Example Complete Workflow

```javascript
// 1. Start workflow
const workflow = await start_assessment_workflow({
  org_name: "Tech Corp",
  sector: "Technology",
  size: "medium",
  contact_name: "John Doe", 
  contact_email: "john@techcorp.com"
});

const workflowId = workflow.workflow_id;

// 2. Initialize persistent assessment
const assessment = await persistent_comprehensive_assessment({
  workflow_id: workflowId,
  action: "start"
});

// 3. Answer first few questions
await persistent_comprehensive_assessment({
  workflow_id: workflowId,
  action: "answer",
  question_id: assessment.next_question.question_id,
  response_value: "4", // Rating 1-5
  confidence_level: "high"
});

// 4. Pause for later
await persistent_comprehensive_assessment({
  workflow_id: workflowId,
  action: "pause"
});

// --- Return days later ---

// 5. Resume exactly where you left off
const resumed = await persistent_comprehensive_assessment({
  workflow_id: workflowId,
  action: "resume"
});

// Shows: "Progress: 15/424 questions completed (4%)"
// Presents next unanswered question automatically
```

## Response Structure

### Assessment Status Response
```json
{
  "success": true,
  "workflow_id": "workflow-abc123",
  "session_state": "in_progress",
  "progress": {
    "total_questions": 424,
    "questions_answered": 156, 
    "completion_percentage": 37,
    "current_question_index": 157
  },
  "next_question": {
    "question_id": "q-gv-oc-01-001",
    "question_text": "Has your organization established...",
    "question_type": "maturity_rating",
    "subcategory_id": "GV.OC-01",
    "help_text": "Consider the following aspects..."
  },
  "can_resume": true,
  "estimated_time_remaining_minutes": 534
}
```

### Detailed Progress Breakdown
```json
{
  "overall": { "answered": 156, "total": 424, "percentage": 37 },
  "by_function": [
    { "function_id": "GV", "answered": 45, "total": 71, "percentage": 63 },
    { "function_id": "ID", "answered": 32, "total": 68, "percentage": 47 },
    { "function_id": "PR", "answered": 28, "total": 85, "percentage": 33 }
  ],
  "by_category": [
    { "category_id": "GV.OC", "answered": 8, "total": 10, "percentage": 80 },
    { "category_id": "GV.RM", "answered": 6, "total": 12, "percentage": 50 }
  ]
}
```

## Benefits

### ✅ **User Experience**
- No need to complete entire assessment in one session
- Flexible scheduling around availability
- Progress visibility and motivation
- No risk of losing work

### ✅ **Data Integrity** 
- Transaction-safe progress saving
- Complete audit trail of responses
- Timestamped question completion
- Confidence level tracking

### ✅ **Assessment Quality**
- Time tracking per question for quality insights
- Optional notes for detailed context
- Confidence levels for response validation
- Comprehensive progress analytics

### ✅ **Enterprise Ready**
- Session cleanup for old/abandoned assessments
- Performance-optimized with proper indexing
- Scalable design for multiple concurrent users
- Complete integration with existing NIST CSF tools

## Database Tables

The implementation adds two new tables:

- `assessment_sessions`: High-level session tracking
- `question_progress`: Individual question state and responses

Both integrate seamlessly with existing question_bank and profile structures.