export type AssistantIntent = 'action' | 'query' | 'app_help' | 'chat';

export interface ClassifyIntentResult {
  intent: AssistantIntent;
  confidence: number;
  reason: string;
}

/**
 * Classifies the user's command into action, query, app_help, or chat.
 * Employs a rules-first architecture to provide zero-latency, 0-cost routing.
 */
export function classifyIntent(
  message: string,
  _context?: { screen?: string; gearId?: string }
): ClassifyIntentResult {
  const clean = message.trim();
  const lower = clean.toLowerCase();

  // 0. Explicit Action Commands (including Preference updates and deletion attempts)
  const explicitActionPatterns = [
    /\b(only show (me )?.+(listings|deals|gear))\b/i,
    /\b(change|set|switch|update) (my )?(region|marketplace region|shipping|country) to\b/i,
    /\b(set|change|switch) (the )?(bot|assistant|persona|personality) to\b/i,
    /\b(make (the )?(bot|assistant) (blunt|chatty|dry|hank|vee))\b/i,
    /\b(follow|unfollow) (brand|brands)\b/i,
    /\b(add|follow) .+ (to|in) (my )?(favorite|favourite) (players|artists)\b/i,
    /\b(follow|add) (fender|gibson|prs|marshall|boss|ibanez|taylor|martin|gretsch|vox|orange)\b/i,
    /\b(delete|remove|erase|destroy) (all|my) (gear|rig|instruments|account|items)\b/i,
  ];

  for (const pattern of explicitActionPatterns) {
    if (pattern.test(lower)) {
      return {
        intent: 'action',
        confidence: 0.95,
        reason: `Matched explicit action pattern: ${pattern}`,
      };
    }
  }

  // 1. App Help Intent (Rules)
  // Questions about how Ryff works, settings, policies, features, etc.
  const appHelpPatterns = [
    /\b(how do i|how can i|how to|where do i|where can i|where is)\b/i,
    /\b(how does (this|the) app|how does ryff work|what is ryff)\b/i,
    /\b(what is (the )?rig passport|what is (a )?passport)\b/i,
    /\b(who is hank|who is vee|difference between hank and vee)\b/i,
    /\b(how (do i|can i|to) (change|set) (my )?(region|shipping)|explain (the )?marketplace region)\b/i,
    /\b(how to undo|how do i undo|can i undo|undo an action)\b/i,
    /\b(serial number privacy|are serial numbers public|hide serial)\b/i,
    /\b(command input mode|voice input mode|turn off voice)\b/i,
    /\b(how (do i|can i|to) (change|set) (bot|assistant) personality)\b/i,
    /\b(how to add gear|how do i add gear|how to log maintenance)\b/i,
    /\b(help\b|app help|support|faq)\b/i,
  ];

  for (const pattern of appHelpPatterns) {
    if (pattern.test(lower)) {
      return {
        intent: 'app_help',
        confidence: 0.95,
        reason: `Matched app help pattern: ${pattern}`,
      };
    }
  }

  // 2. Query Intent (Questions about user's own gear, logs, or deals)
  const queryPatterns = [
    /\b(when did i|when was the last time|last time i)\b/i,
    /\b(what('s| is) (the )?tuning|what tuning)\b/i,
    /\b(what strings|what gauge|what brand of strings)\b/i,
    /\b(did i (restring|change strings|service|adjust))\b/i,
    /\b(when was (my|the|this) (guitar|bass|amp|strat|prs|les paul))\b/i,
    /\b(show (me )?(maintenance|history|logs|service history))\b/i,
    /\b(what gear do i own|what instruments do i have|list my gear)\b/i,
    /\b(any deals|check deals|what are my wants|show my wants|search deals)\b/i,
    /\b(what pickups|what pickup)\b/i,
  ];

  for (const pattern of queryPatterns) {
    if (pattern.test(lower)) {
      return {
        intent: 'query',
        confidence: 0.95,
        reason: `Matched query pattern: ${pattern}`,
      };
    }
  }

  // If message contains a question mark and explicitly asks about user's gear / restring / deals:
  if (lower.includes('?')) {
    if (
      lower.includes('restrung') ||
      lower.includes('last changed') ||
      lower.includes('string change') ||
      lower.includes('deal') ||
      lower.includes('want') ||
      lower.includes('tuning') ||
      lower.includes('pickup')
    ) {
      return {
        intent: 'query',
        confidence: 0.85,
        reason: 'Question inquiring about gear specs or deals',
      };
    }

    // 3. Open Chat Intent (Conversational tone, gear debates, opinions)
    const chatPatterns = [
      /\b(should i buy|what do you think of|which is better|tell me about)\b/i,
      /\b(is .+ worth it|compare|recommend me|what's your opinion)\b/i,
      /\b(hello|hi|hey|who are you|tell me a joke)\b/i,
      /\b(tone debate|tube vs digital|modelling vs tube)\b/i,
    ];

    for (const pattern of chatPatterns) {
      if (pattern.test(lower)) {
        return {
          intent: 'chat',
          confidence: 0.9,
          reason: `Matched open chat pattern: ${pattern}`,
        };
      }
    }

    // Generic question fallback
    return {
      intent: 'chat',
      confidence: 0.7,
      reason: 'General question defaulting to Backstage chat',
    };
  }

  // 4. Action Intent (Default for statements)
  // Statements modifying gear, adding maintenance, or adding wants
  return {
    intent: 'action',
    confidence: 0.85,
    reason: 'Command statement directed to tool-calling action engine',
  };
}
