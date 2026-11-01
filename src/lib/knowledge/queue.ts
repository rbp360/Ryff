import { after } from 'next/server';
import { syncRigItemKnowledge } from './sync';

/**
 * Schedule a non-blocking knowledge sync for a rig item. Uses Next's after() inside a request scope
 * (so serverless runtimes finish the work), falling back to a detached promise elsewhere (CLI/tests).
 */
export function queueRigKnowledgeSync(rigItemId: number): void {
  const run = () =>
    syncRigItemKnowledge(rigItemId).catch((err) =>
      console.warn(`[Knowledge] queued sync failed for rig_item ${rigItemId}:`, err instanceof Error ? err.message : err)
    );
  try {
    after(run);
  } catch {
    void run();
  }
}

