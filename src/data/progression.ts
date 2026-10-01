import { lessons, type LearnerSkillLevel, type Progress } from './academy';

export const learnerSkillLevels: {
  id: LearnerSkillLevel;
  label: string;
  description: string;
}[] = [
  { id: 'beginner', label: 'Beginner', description: 'I’m new to coding.' },
  { id: 'intermediate', label: 'Intermediate', description: 'I know some basics and want more practice.' },
  { id: 'pro', label: 'Pro', description: 'I have coding experience and want a quick refresher.' },
];

const levelNames = [
  'Newcomer',
  'Curious Coder',
  'Code Scout',
  'Idea Builder',
  'Logic Learner',
  'Pattern Finder',
  'Problem Solver',
  'Code Creator',
  'Project Maker',
  'Meta Master',
];

export const milestoneRewards = [
  {
    id: 'first-step',
    title: 'First Steps',
    description: 'Complete your first lesson.',
    lessonsRequired: 1,
    xpReward: 50,
  },
  {
    id: 'foundation-builder',
    title: 'Foundation Builder',
    description: 'Complete three different lessons.',
    lessonsRequired: 3,
    xpReward: 100,
  },
  {
    id: 'trailblazer',
    title: 'Trailblazer',
    description: `Complete all ${lessons.length} foundation lessons.`,
    lessonsRequired: lessons.length,
    xpReward: 150,
  },
];

export function getProgressionStats(progress: Progress) {
  const completedLessonCount = new Set(progress.completedLessonIds).size;
  const rewards = milestoneRewards.map((reward) => ({
    ...reward,
    progress: Math.min(completedLessonCount, reward.lessonsRequired),
    earned: completedLessonCount >= reward.lessonsRequired,
  }));
  const xp = completedLessonCount * 100
    + rewards.reduce((total, reward) => total + (reward.earned ? reward.xpReward : 0), 0);
  const level = Math.min(levelNames.length, Math.floor(xp / 100) + 1);
  const xpIntoLevel = level === levelNames.length ? 100 : xp % 100;

  return {
    completedLessonCount,
    xp,
    level,
    levelName: levelNames[level - 1],
    xpIntoLevel,
    xpToNextLevel: level === levelNames.length ? 0 : 100 - xpIntoLevel,
    levelProgress: xpIntoLevel,
    rewards,
    earnedRewardCount: rewards.filter((reward) => reward.earned).length,
  };
}