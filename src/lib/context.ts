import { supabase } from './supabase.js';

interface ThoughtProduct {
  id: string;
  type: string;
  content: string;
  state: string;
  confidence: number;
  citation_count: number;
  created_at: string;
}

interface Persona {
  id: string;
  name: string;
  traits: Record<string, unknown>;
  voice: string | null;
}

interface AssembledContext {
  thoughtProducts: string;
  personas: string;
  recentActivity: string;
  full: string;
}

/**
 * Calculate relevance score for a thought product
 * Higher scores = more relevant to include in context
 */
function scoreThoughtProduct(tp: ThoughtProduct, prompt: string): number {
  let score = 0;

  // Base score by state
  const stateScores: Record<string, number> = {
    validated: 10,
    supported: 8,
    surfaced: 5,
    claimed: 6,
    challenged: 7, // Important to surface tensions
    superseded: 1,
    abandoned: 0,
  };
  score += stateScores[tp.state] || 5;

  // Confidence factor
  score += tp.confidence * 5;

  // Type importance
  const typeScores: Record<string, number> = {
    decision: 8, // Decisions constrain the solution space
    principle: 7, // Principles guide thinking
    insight: 6, // Insights are foundational
    assumption: 5, // Assumptions need attention
    tension: 5, // Tensions need navigation
    question: 4, // Open questions
    idea: 3, // Ideas are exploratory
    claim: 3, // Claims need validation
  };
  score += typeScores[tp.type] || 3;

  // Citation count bonus (load-bearing TPs are more important)
  // Logarithmic scale to prevent runaway scores
  const citationBonus = Math.log2((tp.citation_count || 0) + 1) * 3;
  score += citationBonus;

  // Recency decay (exponential decay with half-life of 7 days)
  const ageMs = Date.now() - new Date(tp.created_at).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  const halfLifeDays = 7;
  const recencyMultiplier = Math.pow(0.5, ageDays / halfLifeDays);
  // Base recency score of 10, decaying over time
  score += 10 * recencyMultiplier;

  // Keyword relevance (simple text matching)
  const promptLower = prompt.toLowerCase();
  const contentLower = tp.content.toLowerCase();
  const promptWords = promptLower.split(/\s+/).filter((w) => w.length > 3);
  const matchingWords = promptWords.filter((w) => contentLower.includes(w));
  score += matchingWords.length * 2;

  return score;
}

/**
 * Assemble context from workspace knowledge
 */
export async function assembleContext(
  workspaceId: string,
  prompt: string,
  options: {
    maxThoughtProducts?: number;
    includePersonas?: boolean;
    includeRecentThreads?: boolean;
  } = {}
): Promise<AssembledContext> {
  const {
    maxThoughtProducts = 15,
    includePersonas = true,
    includeRecentThreads = true,
  } = options;

  // Get thought products
  const { data: allTPs } = await supabase
    .from('thought_products')
    .select('id, type, content, state, confidence, citation_count, created_at')
    .eq('workspace_id', workspaceId)
    .neq('state', 'abandoned');

  // Score and sort thought products
  const scoredTPs = (allTPs || [])
    .map((tp) => ({ ...tp, score: scoreThoughtProduct(tp as ThoughtProduct, prompt) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, maxThoughtProducts);

  // Group by type for better organization
  const grouped: Record<string, typeof scoredTPs> = {};
  for (const tp of scoredTPs) {
    if (!grouped[tp.type]) grouped[tp.type] = [];
    grouped[tp.type].push(tp);
  }

  // Format thought products
  let thoughtProductsContext = '';
  if (scoredTPs.length > 0) {
    thoughtProductsContext = '## Relevant Knowledge\n\n';
    for (const [type, tps] of Object.entries(grouped)) {
      thoughtProductsContext += `### ${type.charAt(0).toUpperCase() + type.slice(1)}s\n`;
      for (const tp of tps) {
        const stateIndicator = tp.state === 'validated' ? '✓' : tp.state === 'challenged' ? '⚠' : '';
        thoughtProductsContext += `- ${stateIndicator} ${tp.content}\n`;
      }
      thoughtProductsContext += '\n';
    }
  }

  // Get personas
  let personasContext = '';
  if (includePersonas) {
    const { data: personas } = await supabase
      .from('personas')
      .select('id, name, traits, voice')
      .eq('workspace_id', workspaceId)
      .limit(5);

    if (personas && personas.length > 0) {
      personasContext = '## Active Personas\n\n';
      for (const persona of personas) {
        const traits = Object.entries(persona.traits || {})
          .slice(0, 3)
          .map(([k, v]) => `${v}`)
          .join(', ');
        personasContext += `- **${persona.name}**: ${traits || 'No traits defined'}\n`;
      }
      personasContext += '\n';
    }
  }

  // Get recent activity
  let recentActivity = '';
  if (includeRecentThreads) {
    const { data: recentMessages } = await supabase
      .from('messages')
      .select('role, content, created_at, thread_id')
      .order('created_at', { ascending: false })
      .limit(5);

    // Filter to workspace threads (would need a join, simplified here)
    if (recentMessages && recentMessages.length > 0) {
      recentActivity = '## Recent Thinking\n\n';
      const uniqueContent = new Set<string>();
      for (const msg of recentMessages) {
        if (msg.role === 'assistant' && !uniqueContent.has(msg.content.substring(0, 50))) {
          uniqueContent.add(msg.content.substring(0, 50));
          // Extract key points only
          const firstSentence = msg.content.split('.')[0];
          if (firstSentence.length < 200) {
            recentActivity += `- ${firstSentence}.\n`;
          }
        }
        if (uniqueContent.size >= 3) break;
      }
      recentActivity += '\n';
    }
  }

  // Combine all context
  const full = [thoughtProductsContext, personasContext, recentActivity]
    .filter(Boolean)
    .join('\n');

  return {
    thoughtProducts: thoughtProductsContext,
    personas: personasContext,
    recentActivity,
    full,
  };
}

/**
 * Create an enhanced prompt with assembled context
 */
export async function enhancePromptWithContext(
  workspaceId: string,
  userPrompt: string
): Promise<string> {
  const context = await assembleContext(workspaceId, userPrompt);

  if (!context.full) {
    return userPrompt;
  }

  return `${context.full}---

User's current focus: ${userPrompt}`;
}
