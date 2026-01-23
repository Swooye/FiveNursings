
import { NursingScores } from "../types";

/**
 * Simulates an API call to a wearable provider (Apple HealthKit / Fitbit API)
 * to fetch the latest sleep and activity metrics.
 */
export const fetchWearableMetrics = async (): Promise<{ scores: Partial<NursingScores>, steps: number, sleepHours: number }> => {
  // Simulate network latency
  await new Promise(resolve => setTimeout(resolve, 1500));

  // Randomly generate some realistic health data
  const steps = Math.floor(Math.random() * 8000) + 2000;
  const sleepHours = (Math.random() * 3 + 5).toFixed(1);
  
  // Calculate impact on scores
  const sleepScore = Math.min(100, Math.floor((Number(sleepHours) / 8) * 100));
  const exerciseScore = Math.min(100, Math.floor((steps / 10000) * 100));

  return {
    scores: {
      sleep: sleepScore,
      exercise: exerciseScore
    },
    steps,
    sleepHours: Number(sleepHours)
  };
};
