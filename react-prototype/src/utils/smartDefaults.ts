import { FocusType } from '../types';

export function makeIdentityShort(identity: string): string {
  const cleaned = identity
    .replace(/^I am someone who\s+/i, '')
    .replace(/^I am\s+/i, '')
    .replace(/\.$/, '')
    .trim();
  const stopWords = new Set(['a', 'an', 'the', 'and', 'or', 'but', 'to', 'of', 'in', 'for', 'with', 'my', 'is', 'are', 'be', 'by', 'not', 'no', 'who']);
  const words = cleaned.toLowerCase().split(/\s+/).filter(w => !stopWords.has(w) && w.length > 1);
  return words.slice(0, 3).join(' ') || cleaned.slice(0, 24).trim();
}

export function makeStepCue(flowTrigger: string, previousStepName?: string): string {
  if (!previousStepName) return flowTrigger;
  const lower = previousStepName.charAt(0).toLowerCase() + previousStepName.slice(1);
  return `After ${lower}`;
}

export function makeTinyVersion(actionName: string): string {
  const n = actionName.toLowerCase();
  if (n.includes('water') || n.includes('drink')) return 'one sip';
  if (n.includes('stretch') || n.includes('yoga')) return 'one stretch';
  if (n.includes('meditat') || n.includes('breath')) return 'three deep breaths';
  if (n.includes('write') || n.includes('journal') || n.includes('writing')) return 'write one sentence';
  if (n.includes('read') || n.includes('book')) return 'read one paragraph';
  if (n.includes('clean') || n.includes('tidy') || n.includes('organiz')) return 'clear one item';
  if (n.includes('run') || n.includes('jog')) return 'go outside for 2 minutes';
  if (n.includes('walk')) return 'walk to the end of the street';
  if (n.includes('workout') || n.includes('exercise') || n.includes('gym')) return 'do one rep';
  if (n.includes('plan') || n.includes('review') || n.includes('check')) return 'open planner';
  if (n.includes('shower') || n.includes('cold')) return '10 seconds cold';
  if (n.includes('cook') || n.includes('eat') || n.includes('meal')) return 'prepare one ingredient';
  return 'start for 30 seconds';
}

export function makeFocusEntryStep(title: string, type: FocusType): string {
  const t = title.toLowerCase();
  switch (type) {
    case 'Deep Work':
      if (t.includes('write') || t.includes('writing') || t.includes('thesis') || t.includes('report') || t.includes('essay') || t.includes('draft'))
        return 'Open the document and write one sentence';
      if (t.includes('code') || t.includes('program') || t.includes('develop') || t.includes('build'))
        return 'Open the editor and make one small change';
      return 'Open the document and work for 5 minutes';
    case 'Study':
      return 'Open materials and read one paragraph';
    case 'Admin':
      return 'Open the first item and process one step';
    case 'Health':
      return 'Change clothes and start for 5 minutes';
    case 'Recovery':
      return 'Find a quiet place and sit for 2 minutes';
    default:
      return 'Start for 5 minutes';
  }
}
