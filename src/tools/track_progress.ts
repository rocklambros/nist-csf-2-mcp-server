import { CSFDatabase } from "../db/database.js";

interface ProgressUpdate {
  subcategory_id: string;
  current_implementation?: string;
  current_maturity?: number;
  status?: 'on_track' | 'at_risk' | 'behind' | 'blocked' | 'completed';
  is_blocked?: boolean;
  blocking_reason?: string;
  notes?: string;
}

interface ProgressSummary {
  profile_id: string;
  total_subcategories: number;
  completed: number;
  on_track: number;
  at_risk: number;
  behind: number;
  blocked: number;
  overall_completion_percentage: number;
  blocked_items: Array<{
    subcategory_id: string;
    blocking_reason: string;
  }>;
  recent_updates: Array<{
    subcategory_id: string;
    status: string;
    completion_percentage: number;
  }>;
  velocity: {
    average_daily_progress: number;
    estimated_days_to_completion: number | null;
  };
}

export async function trackProgress(
  db: CSFDatabase,
  profile_id: string,
  updates: ProgressUpdate[]
): Promise<ProgressSummary> {
  try {
    // Process each update
    const updateResults: Array<{
      subcategory_id: string;
      status: string;
      completion_percentage: number;
    }> = [];

    for (const update of updates) {
      // Calculate completion percentage based on maturity if provided
      let completion_percentage: number | undefined;
      if (update.current_maturity !== undefined) {
        // Assuming target maturity is 5 (can be made configurable)
        completion_percentage = Math.round((update.current_maturity / 5) * 100);
      }

      // Perform UPSERT operation
      db.upsertProgressTracking({
        id: `${profile_id}_${update.subcategory_id}`,
        profile_id,
        subcategory_id: update.subcategory_id,
        current_implementation: update.current_implementation,
        current_maturity: update.current_maturity,
        completion_percentage,
        status: update.status,
        is_blocked: update.is_blocked || false,
        blocking_reason: update.blocking_reason,
        notes: update.notes,
        trend: 'stable'
      });

      // Add to results
      updateResults.push({
        subcategory_id: update.subcategory_id,
        status: update.status || 'on_track',
        completion_percentage: completion_percentage || 0
      });
    }

    // Get overall progress summary
    const progressSummary = db.getProgressSummary(profile_id) || {};
    
    // Get blocked items from progress tracking
    const allProgress = db.getProgressTracking(profile_id);
    const blockedItems = allProgress.filter((item: any) => item.is_blocked === 1);
    
    // Calculate velocity
    const velocity = db.calculateVelocity(profile_id, 30) || {}; // Look back 30 days

    // Construct the response
    const summary: ProgressSummary = {
      profile_id,
      total_subcategories: progressSummary.total_subcategories || 0,
      completed: progressSummary.completed_count || 0,
      on_track: progressSummary.on_track_count || 0,
      at_risk: progressSummary.at_risk_count || 0,
      behind: progressSummary.delayed_count || 0,
      blocked: progressSummary.blocked_count || 0,
      overall_completion_percentage: Math.round(progressSummary.avg_completion || 0),
      blocked_items: blockedItems.map((item: any) => ({
        subcategory_id: item.subcategory_id,
        blocking_reason: item.blocking_reason || 'No reason specified'
      })),
      recent_updates: updateResults,
      velocity: {
        average_daily_progress: velocity.average_daily_progress || 0,
        estimated_days_to_completion: velocity.estimated_days_to_completion
      }
    };

    return summary;
  } catch (error) {
    console.error('Error tracking progress:', error);
    throw new Error(`Failed to track progress: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export const trackProgressTool = {
  name: "track_progress",
  description: "Track implementation progress for NIST CSF subcategories with UPSERT operations",
  inputSchema: {
    type: "object",
    properties: {
      profile_id: {
        type: "string",
        description: "ID of the profile to track progress for"
      },
      updates: {
        type: "array",
        description: "Array of subcategory progress updates",
        items: {
          type: "object",
          properties: {
            subcategory_id: {
              type: "string",
              description: "ID of the subcategory to update"
            },
            current_implementation: {
              type: "string",
              description: "Current implementation level description"
            },
            current_maturity: {
              type: "number",
              description: "Current maturity level (1-5)"
            },
            status: {
              type: "string",
              enum: ["on_track", "at_risk", "behind", "blocked", "completed"],
              description: "Current status of the subcategory implementation"
            },
            is_blocked: {
              type: "boolean",
              description: "Whether this subcategory is blocked"
            },
            blocking_reason: {
              type: "string",
              description: "Reason why the subcategory is blocked"
            },
            notes: {
              type: "string",
              description: "Additional notes about the progress"
            }
          },
          required: ["subcategory_id"]
        }
      }
    },
    required: ["profile_id", "updates"]
  },
  execute: async (args: { profile_id: string; updates: ProgressUpdate[] }, db: CSFDatabase) => {
    return await trackProgress(db, args.profile_id, args.updates);
  }
};