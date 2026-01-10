#!/usr/bin/env node
import 'dotenv/config';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { supabase } from './lib/supabase.js';
import { generateThinkingResponse, extractThoughtProducts, analyzeGrounding, simulatePersona, extractPersonaFeedback, generateNodeSummary, OUTPUT_TEMPLATES, METHOD_PROMPTS, anthropic } from './lib/anthropic.js';
import { enhancePromptWithContext } from './lib/context.js';
import type { ThoughtProductType, ThoughtProductState } from './types.js';

const server = new Server(
  {
    name: 'turbot-mcp',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'turbot_think',
        description:
          'Start or continue a thinking session. Optionally apply a specific method (5whys, scamper, jobs_to_be_done, etc.). Returns AI response, creates a Node, and extracts ThoughtProducts.',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceId: {
              type: 'string',
              description: 'The workspace ID to think within',
            },
            prompt: {
              type: 'string',
              description: 'The thinking prompt or question',
            },
            method: {
              type: 'string',
              enum: [
                '5whys',
                'root_cause',
                'jobs_to_be_done',
                'reframe',
                'scamper',
                'crazy8s',
                'how_might_we',
                'assumption_mapping',
              ],
              description: 'Optional: Apply a specific thinking method or framework',
            },
            threadId: {
              type: 'string',
              description: 'Optional: continue an existing thread',
            },
            fromNodeId: {
              type: 'string',
              description: 'Optional: branch from a specific node',
            },
          },
          required: ['workspaceId', 'prompt'],
        },
      },
      {
        name: 'turbot_capture',
        description: 'Manually capture a thought product (insight, decision, assumption, etc.)',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceId: {
              type: 'string',
              description: 'The workspace ID',
            },
            type: {
              type: 'string',
              enum: [
                'insight',
                'pattern',
                'idea',
                'claim',
                'assumption',
                'decision',
                'question',
                'tension',
                'principle',
              ],
              description: 'The type of thought product',
            },
            content: {
              type: 'string',
              description: 'The content of the thought product',
            },
            nodeId: {
              type: 'string',
              description: 'Optional: link to a specific node',
            },
          },
          required: ['workspaceId', 'type', 'content'],
        },
      },
      {
        name: 'turbot_status',
        description:
          'Get a high-level summary of workspace progress: counts by type/state, what is established vs assumed, and suggested next steps. For listing individual items, use turbot_thought_list, turbot_persona_list, or turbot_output_list.',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceId: {
              type: 'string',
              description: 'The workspace ID to check status for',
            },
          },
          required: ['workspaceId'],
        },
      },
      {
        name: 'turbot_workspace_create',
        description: 'Create a new workspace for a project or initiative',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name for the workspace',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'turbot_workspace_list',
        description: 'List all available workspaces',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'turbot_ground',
        description:
          'Check what supports or challenges a claim based on existing thought products and evidence in the workspace.',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceId: {
              type: 'string',
              description: 'The workspace ID to check against',
            },
            claim: {
              type: 'string',
              description: 'The claim to ground/validate',
            },
          },
          required: ['workspaceId', 'claim'],
        },
      },
      {
        name: 'turbot_trace',
        description: 'Trace the lineage of a thought product - see what influenced it and what it influences.',
        inputSchema: {
          type: 'object',
          properties: {
            thoughtProductId: {
              type: 'string',
              description: 'The thought product ID to trace',
            },
          },
          required: ['thoughtProductId'],
        },
      },
      {
        name: 'turbot_sim',
        description:
          'Talk to a persona for validation. Use turbot_persona_list to see available personas. Provide personaId to use existing, or personaSketch to create a new one.',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceId: {
              type: 'string',
              description: 'The workspace ID',
            },
            prompt: {
              type: 'string',
              description: 'What to ask or present to the persona',
            },
            personaId: {
              type: 'string',
              description: 'Optional: ID of an existing persona to use',
            },
            personaSketch: {
              type: 'string',
              description:
                'Optional: Quick description to create a new persona (e.g., "busy startup founder, technical, skeptical of new tools")',
            },
          },
          required: ['workspaceId', 'prompt'],
        },
      },
      {
        name: 'turbot_create',
        description:
          'Generate a traceable artifact (spec, persona, journey, ADEPT evaluation, etc.) grounded in workspace knowledge.',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceId: {
              type: 'string',
              description: 'The workspace ID',
            },
            type: {
              type: 'string',
              enum: [
                'spec',
                'user_story',
                'journey',
                'problem_frame',
                'design_brief',
                'roadmap',
                'persona_preview',
                'persona',
                'adept',
                'epics',
                'strategic_context',
                'information_architecture',
                'handoff_notes',
                'solution_brief',
                'feature_spec',
                'content_brief',
                'technical_context',
                'positioning',
              ],
              description: 'The type of output to create',
            },
            context: {
              type: 'string',
              description: 'Additional context, concept to evaluate, or requirements for the output',
            },
          },
          required: ['workspaceId', 'type', 'context'],
        },
      },
      {
        name: 'turbot_evidence',
        description:
          'Add supporting or challenging evidence to a thought product.',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceId: {
              type: 'string',
              description: 'The workspace ID',
            },
            thoughtProductId: {
              type: 'string',
              description: 'The thought product to attach evidence to',
            },
            type: {
              type: 'string',
              enum: ['quote', 'observation', 'data'],
              description: 'The type of evidence',
            },
            content: {
              type: 'string',
              description: 'The evidence content',
            },
            source: {
              type: 'string',
              description: 'Optional: where this evidence came from',
            },
            supports: {
              type: 'boolean',
              description: 'true if this supports the thought product, false if it challenges it',
            },
          },
          required: ['workspaceId', 'thoughtProductId', 'type', 'content', 'supports'],
        },
      },
      {
        name: 'turbot_update_state',
        description:
          'Update the state of a thought product (e.g., from surfaced to validated, or to challenged).',
        inputSchema: {
          type: 'object',
          properties: {
            thoughtProductId: {
              type: 'string',
              description: 'The thought product ID to update',
            },
            state: {
              type: 'string',
              enum: ['surfaced', 'claimed', 'supported', 'challenged', 'validated', 'superseded', 'abandoned'],
              description: 'The new state',
            },
            reason: {
              type: 'string',
              description: 'Optional: reason for the state change',
            },
            confidence: {
              type: 'number',
              description: 'Optional: new confidence score (0-1)',
            },
          },
          required: ['thoughtProductId', 'state'],
        },
      },
      {
        name: 'turbot_link',
        description:
          'Create an influence link between two thought products.',
        inputSchema: {
          type: 'object',
          properties: {
            fromId: {
              type: 'string',
              description: 'The thought product that influences',
            },
            toId: {
              type: 'string',
              description: 'The thought product that is influenced',
            },
          },
          required: ['fromId', 'toId'],
        },
      },
      {
        name: 'turbot_notebook_create',
        description:
          'Create a notebook for organizing thought products (e.g., Research Notes, Decision Log, Assumption Register).',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceId: {
              type: 'string',
              description: 'The workspace ID',
            },
            name: {
              type: 'string',
              description: 'Name for the notebook (e.g., "Pricing Research", "Sprint 1 Decisions")',
            },
            description: {
              type: 'string',
              description: 'Optional description of the notebook\'s purpose',
            },
          },
          required: ['workspaceId', 'name'],
        },
      },
      {
        name: 'turbot_notebook_add',
        description:
          'Add a thought product (insight, decision, etc.) to a notebook. Use turbot_thought_list to find thought product IDs.',
        inputSchema: {
          type: 'object',
          properties: {
            notebookId: {
              type: 'string',
              description: 'The notebook ID',
            },
            thoughtProductId: {
              type: 'string',
              description: 'The thought product ID to add',
            },
            annotation: {
              type: 'string',
              description: 'Optional note about why this TP is in this notebook',
            },
          },
          required: ['notebookId', 'thoughtProductId'],
        },
      },
      {
        name: 'turbot_notebook_list',
        description:
          'List all notebooks in a workspace.',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceId: {
              type: 'string',
              description: 'The workspace ID',
            },
          },
          required: ['workspaceId'],
        },
      },
      {
        name: 'turbot_notebook_view',
        description:
          'View the contents of a notebook including all its thought products.',
        inputSchema: {
          type: 'object',
          properties: {
            notebookId: {
              type: 'string',
              description: 'The notebook ID to view',
            },
          },
          required: ['notebookId'],
        },
      },
      {
        name: 'turbot_notebook_note',
        description:
          'Add or update freeform notes on a notebook (scratchpad area).',
        inputSchema: {
          type: 'object',
          properties: {
            notebookId: {
              type: 'string',
              description: 'The notebook ID',
            },
            notes: {
              type: 'string',
              description: 'Markdown content for the notebook\'s freeform notes area',
            },
          },
          required: ['notebookId', 'notes'],
        },
      },
      {
        name: 'turbot_persona_list',
        description:
          'List all personas in a workspace with their details (name, traits, voice). Use this to see what personas are available before using turbot_sim.',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceId: {
              type: 'string',
              description: 'The workspace ID',
            },
          },
          required: ['workspaceId'],
        },
      },
      {
        name: 'turbot_thought_list',
        description:
          'List thought products in a workspace. Filter by type (insight, idea, claim, assumption, decision, question, tension, principle) or state (surfaced, validated, challenged, etc.).',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceId: {
              type: 'string',
              description: 'The workspace ID',
            },
            type: {
              type: 'string',
              enum: ['insight', 'pattern', 'idea', 'claim', 'assumption', 'decision', 'question', 'tension', 'principle'],
              description: 'Filter by thought product type',
            },
            state: {
              type: 'string',
              enum: ['surfaced', 'claimed', 'supported', 'challenged', 'validated', 'superseded', 'abandoned'],
              description: 'Filter by state',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results (default 20)',
            },
          },
          required: ['workspaceId'],
        },
      },
      {
        name: 'turbot_output_list',
        description:
          'List generated outputs in a workspace (specs, journeys, personas, roadmaps, ADEPT evaluations, etc.).',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceId: {
              type: 'string',
              description: 'The workspace ID',
            },
            type: {
              type: 'string',
              enum: ['spec', 'user_story', 'journey', 'problem_frame', 'design_brief', 'roadmap', 'persona', 'adept', 'epics', 'strategic_context', 'information_architecture', 'handoff_notes'],
              description: 'Filter by output type',
            },
          },
          required: ['workspaceId'],
        },
      },
      {
        name: 'turbot_search',
        description:
          'Search thought products by keyword. Returns matching insights, decisions, assumptions, etc.',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceId: {
              type: 'string',
              description: 'The workspace ID',
            },
            query: {
              type: 'string',
              description: 'Search keyword or phrase',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results (default 10)',
            },
          },
          required: ['workspaceId', 'query'],
        },
      },
      {
        name: 'turbot_notebook_remove',
        description:
          'Remove a thought product from a notebook.',
        inputSchema: {
          type: 'object',
          properties: {
            notebookId: {
              type: 'string',
              description: 'The notebook ID',
            },
            thoughtProductId: {
              type: 'string',
              description: 'The thought product ID to remove',
            },
          },
          required: ['notebookId', 'thoughtProductId'],
        },
      },
      {
        name: 'turbot_mode',
        description:
          'Initialize Turbot methodology for this session. Returns Double Diamond guidance, current workspace context, and behavioral mode. Call this at the start of a thinking session to activate the full methodology.',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceId: {
              type: 'string',
              description: 'The workspace ID to load context from',
            },
            mode: {
              type: 'string',
              enum: ['capture', 'think', 'create', 'sim'],
              description: 'Behavioral mode: capture (process data), think (strategic analysis), create (generate deliverables), sim (persona embodiment)',
            },
          },
          required: ['workspaceId'],
        },
      },
      {
        name: 'turbot_pipeline_status',
        description:
          'Show pipeline position in the Double Diamond methodology. Visual status of 4 stages: Discover → Define → Develop → Deliver.',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceId: {
              type: 'string',
              description: 'The workspace ID to check pipeline status for',
            },
          },
          required: ['workspaceId'],
        },
      },
      {
        name: 'turbot_evaluate',
        description:
          'Evaluate a solution concept using the ADEPT framework: Attractive, Doable, Effective, Practical, Targetable. Returns ratings, evidence levels, and de-risking recommendations.',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceId: {
              type: 'string',
              description: 'The workspace ID',
            },
            concept: {
              type: 'string',
              description: 'Description of the solution concept to evaluate',
            },
            compareWith: {
              type: 'array',
              items: { type: 'string' },
              description: 'Optional: other concepts to compare against',
            },
          },
          required: ['workspaceId', 'concept'],
        },
      },
      // === COMPANION APP FEATURES ===
      {
        name: 'turbot_thread_complete',
        description: 'Mark a thread as complete, indicating the thinking session has concluded.',
        inputSchema: {
          type: 'object',
          properties: {
            threadId: {
              type: 'string',
              description: 'The thread ID to mark complete',
            },
          },
          required: ['threadId'],
        },
      },
      {
        name: 'turbot_node_headline',
        description: 'Set a short headline/title for a node to summarize its key point.',
        inputSchema: {
          type: 'object',
          properties: {
            nodeId: {
              type: 'string',
              description: 'The node ID',
            },
            headline: {
              type: 'string',
              description: 'Short headline (max 100 chars)',
            },
          },
          required: ['nodeId', 'headline'],
        },
      },
      {
        name: 'turbot_node_stage',
        description: 'Tag a node with its pipeline stage in the Double Diamond methodology.',
        inputSchema: {
          type: 'object',
          properties: {
            nodeId: {
              type: 'string',
              description: 'The node ID',
            },
            stage: {
              type: 'string',
              enum: ['discover', 'define', 'develop', 'deliver'],
              description: 'Double Diamond pipeline stage',
            },
          },
          required: ['nodeId', 'stage'],
        },
      },
      {
        name: 'turbot_pattern_create',
        description: 'Create a structural pattern between nodes (fork, loop, bridge, join). Forks diverge exploration, loops return to earlier points, bridges connect across threads, joins converge branches.',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceId: {
              type: 'string',
              description: 'The workspace ID',
            },
            type: {
              type: 'string',
              enum: ['fork', 'bridge', 'loop', 'join', 'iteration', 'sidebar', 'link'],
              description: 'Pattern type',
            },
            sourceNodeId: {
              type: 'string',
              description: 'Source node ID',
            },
            targetNodeId: {
              type: 'string',
              description: 'Target node ID (optional for some patterns)',
            },
            label: {
              type: 'string',
              description: 'Optional label for the pattern',
            },
          },
          required: ['workspaceId', 'type', 'sourceNodeId'],
        },
      },
      {
        name: 'turbot_iteration_create',
        description: 'Create a new iteration of a node, preserving version history. Use when refining or evolving a thought.',
        inputSchema: {
          type: 'object',
          properties: {
            nodeId: {
              type: 'string',
              description: 'The node ID to iterate on',
            },
            headline: {
              type: 'string',
              description: 'Updated headline for this iteration',
            },
            summary: {
              type: 'string',
              description: 'Updated summary for this iteration',
            },
          },
          required: ['nodeId'],
        },
      },
      {
        name: 'turbot_link_nodes',
        description: 'Create a link between two nodes, optionally across different threads. Use for connecting related thoughts.',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceId: {
              type: 'string',
              description: 'The workspace ID',
            },
            fromNodeId: {
              type: 'string',
              description: 'Source node ID',
            },
            toNodeId: {
              type: 'string',
              description: 'Target node ID',
            },
            linkType: {
              type: 'string',
              description: 'Type of link (e.g., "supports", "contradicts", "builds_on", "related")',
            },
            description: {
              type: 'string',
              description: 'Optional description of the relationship',
            },
          },
          required: ['workspaceId', 'fromNodeId', 'toNodeId'],
        },
      },
      {
        name: 'turbot_context_add',
        description: 'Add contextual information to the workspace or a specific node. Use for external references, quotes, links, or supporting documentation.',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceId: {
              type: 'string',
              description: 'The workspace ID',
            },
            nodeId: {
              type: 'string',
              description: 'Optional: attach to a specific node',
            },
            type: {
              type: 'string',
              enum: ['quote', 'reference', 'link', 'document', 'note'],
              description: 'Type of context item',
            },
            title: {
              type: 'string',
              description: 'Title or label',
            },
            content: {
              type: 'string',
              description: 'The content or description',
            },
            sourceUrl: {
              type: 'string',
              description: 'Optional source URL',
            },
          },
          required: ['workspaceId', 'type', 'content'],
        },
      },
      {
        name: 'turbot_thread_view',
        description: 'Get complete thread data including nodes, patterns, links, and context for visualization.',
        inputSchema: {
          type: 'object',
          properties: {
            threadId: {
              type: 'string',
              description: 'The thread ID',
            },
          },
          required: ['threadId'],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'turbot_workspace_create': {
      const { name: workspaceName } = args as { name: string };
      const { data, error } = await supabase
        .from('workspaces')
        .insert({ name: workspaceName })
        .select()
        .single();

      if (error) {
        return { content: [{ type: 'text', text: `Error creating workspace: ${error.message}` }] };
      }

      return {
        content: [
          {
            type: 'text',
            text: `Created workspace "${data.name}" with ID: ${data.id}`,
          },
        ],
      };
    }

    case 'turbot_workspace_list': {
      const { data, error } = await supabase
        .from('workspaces')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        return { content: [{ type: 'text', text: `Error listing workspaces: ${error.message}` }] };
      }

      if (!data || data.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: 'No workspaces found. Create one with turbot_workspace_create.',
            },
          ],
        };
      }

      const list = data.map((w) => `- ${w.name} (${w.id})`).join('\n');
      return {
        content: [{ type: 'text', text: `Workspaces:\n${list}` }],
      };
    }

    case 'turbot_capture': {
      const { workspaceId, type, content, nodeId } = args as {
        workspaceId: string;
        type: ThoughtProductType;
        content: string;
        nodeId?: string;
      };

      const { data, error } = await supabase
        .from('thought_products')
        .insert({
          workspace_id: workspaceId,
          type,
          content,
          source_node_id: nodeId || null,
          state: 'surfaced' as ThoughtProductState,
          confidence: 0.5,
          influenced_by: [],
          influences: [],
        })
        .select()
        .single();

      if (error) {
        return {
          content: [{ type: 'text', text: `Error capturing thought product: ${error.message}` }],
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: `Captured ${type}: "${content}"\nID: ${data.id}\nState: surfaced, Confidence: 0.5`,
          },
        ],
      };
    }

    case 'turbot_status': {
      const { workspaceId } = args as { workspaceId: string };

      // Get all thought products for this workspace
      const { data: thoughtProducts, error } = await supabase
        .from('thought_products')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (error) {
        return { content: [{ type: 'text', text: `Error fetching status: ${error.message}` }] };
      }

      // Get personas
      const { data: personas } = await supabase
        .from('personas')
        .select('id, name')
        .eq('workspace_id', workspaceId);

      // Get outputs
      const { data: outputs } = await supabase
        .from('outputs')
        .select('id, type')
        .eq('workspace_id', workspaceId);

      // Get evidence count
      const { data: evidence } = await supabase
        .from('evidence')
        .select('id, supports')
        .eq('workspace_id', workspaceId);

      // Get notebooks
      const { data: notebooks } = await supabase
        .from('notebooks')
        .select('id, name')
        .eq('workspace_id', workspaceId);

      // Get patterns
      const { data: patterns } = await supabase
        .from('patterns')
        .select('id, type')
        .eq('workspace_id', workspaceId);

      // Get cross-thread links
      const { data: links } = await supabase
        .from('cross_thread_links')
        .select('id')
        .eq('workspace_id', workspaceId);

      // Build pipeline status - Double Diamond (4 stages)
      // DISCOVER (diverge): research, insights, patterns
      // DEFINE (converge): frame problems, validate, personas
      // DEVELOP (diverge): ideate, concepts, journeys
      // DELIVER (converge): specs, outputs, handoff
      const hasDiscover = thoughtProducts?.some((tp) => tp.type === 'insight' || tp.type === 'pattern' || tp.type === 'question') || false;
      const hasDefine = thoughtProducts?.some((tp) => tp.type === 'tension' || tp.type === 'principle' || tp.type === 'decision') || (personas?.length || 0) > 0;
      const hasDevelop = thoughtProducts?.some((tp) => tp.type === 'idea' || tp.type === 'assumption') || outputs?.some((o) => o.type === 'journey');
      const hasDeliver = outputs?.some((o) => o.type === 'spec' || o.type === 'design_brief' || o.type === 'feature_spec' || o.type === 'handoff_notes') || false;

      const pipelineStatus = [
        hasDiscover ? '●' : '○',
        hasDefine ? '●' : '○',
        hasDevelop ? '●' : '○',
        hasDeliver ? '●' : '○',
      ];

      const pipelineViz = `◇ DISCOVER ${pipelineStatus[0]} ─── ◇ DEFINE ${pipelineStatus[1]} ─── ◇ DEVELOP ${pipelineStatus[2]} ─── ◇ DELIVER ${pipelineStatus[3]}`;

      if (!thoughtProducts || thoughtProducts.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: `## Pipeline Status\n${pipelineViz}\n\nWorkspace is empty. Use turbot_think or turbot_capture to start building knowledge.`,
            },
          ],
        };
      }

      // Group by type and state
      const byType: Record<string, number> = {};
      const byState: Record<string, number> = {};

      for (const tp of thoughtProducts) {
        byType[tp.type] = (byType[tp.type] || 0) + 1;
        byState[tp.state] = (byState[tp.state] || 0) + 1;
      }

      const typeList = Object.entries(byType)
        .map(([t, c]) => `  ${t}: ${c}`)
        .join('\n');
      const stateList = Object.entries(byState)
        .map(([s, c]) => `  ${s}: ${c}`)
        .join('\n');

      // What's established vs assumed
      const validated = thoughtProducts.filter((tp) =>
        tp.state === 'validated' || tp.state === 'supported'
      );
      const assumed = thoughtProducts.filter((tp) =>
        tp.state === 'surfaced' && tp.type === 'assumption'
      );

      let established = '';
      if (validated.length > 0) {
        established = `\n\n## What's Established\n${validated
          .slice(0, 5)
          .map((tp) => `- [${tp.type}] ${tp.content.substring(0, 60)}...`)
          .join('\n')}`;
      }

      let assumptions = '';
      if (assumed.length > 0) {
        assumptions = `\n\n## What's Assumed (${assumed.length} unvalidated)\n${assumed
          .slice(0, 5)
          .map((a) => `- ${a.content.substring(0, 60)}...`)
          .join('\n')}`;
      }

      // Evidence summary
      const supportingEvidence = evidence?.filter((e) => e.supports).length || 0;
      const challengingEvidence = evidence?.filter((e) => !e.supports).length || 0;
      const evidenceSummary = evidence && evidence.length > 0
        ? `\n\n## Evidence\n${supportingEvidence} supporting, ${challengingEvidence} challenging`
        : '';

      // Notebooks summary
      const notebooksSummary = notebooks && notebooks.length > 0
        ? `\n\n## Notebooks\n${notebooks.map((nb) => `- ${nb.name}`).join('\n')}`
        : '';

      // Suggestions based on Double Diamond progress
      const hasNotebooks = (notebooks?.length || 0) > 0;
      const personaCount = personas?.length || 0;
      let suggestions = '\n\n## Suggested Next Steps\n';
      if (!hasDiscover) {
        suggestions += '1. Start discovering — use turbot_think to explore the problem space\n';
      } else if (!hasDefine && hasDiscover) {
        suggestions += '1. Move to Define — frame problems, validate with turbot_sim, capture decisions\n';
      } else if (assumed.length > 3) {
        suggestions += '1. Validate assumptions — use turbot_ground to check what supports them\n';
      } else if (!hasDevelop && hasDefine) {
        suggestions += '1. Start developing solutions — capture ideas, map journeys with turbot_create\n';
      } else if (hasDevelop && !hasDeliver) {
        suggestions += '1. Move to Deliver — create specs or design briefs with turbot_create\n';
      } else {
        suggestions += '1. Continue exploring with turbot_think\n';
      }
      if (!hasNotebooks && thoughtProducts.length > 5) {
        suggestions += '2. Organize findings with turbot_notebook_create (e.g., "Research Notes", "Decision Log")\n';
      }

      // Patterns summary
      const patternCount = patterns?.length || 0;
      const patternsByType: Record<string, number> = {};
      for (const p of patterns || []) {
        patternsByType[p.type] = (patternsByType[p.type] || 0) + 1;
      }
      const patternsSummary = patternCount > 0
        ? `\n\n## Patterns\n${Object.entries(patternsByType).map(([t, c]) => `  ${t}: ${c}`).join('\n')}`
        : '';

      return {
        content: [
          {
            type: 'text',
            text: `## Pipeline Status\n${pipelineViz}\n\n## Summary\nThought Products: ${thoughtProducts.length} | Personas: ${personas?.length || 0} | Outputs: ${outputs?.length || 0} | Notebooks: ${notebooks?.length || 0} | Patterns: ${patternCount} | Links: ${links?.length || 0}\n\n## By Type\n${typeList}\n\n## By State\n${stateList}${established}${assumptions}${evidenceSummary}${notebooksSummary}${patternsSummary}${suggestions}`,
          },
        ],
      };
    }

    case 'turbot_think': {
      const { workspaceId, prompt, method, threadId } = args as {
        workspaceId: string;
        prompt: string;
        method?: string;
        threadId?: string;
        fromNodeId?: string;
      };

      // Build method-enhanced prompt if method specified
      const methodPrompt = method && METHOD_PROMPTS[method] ? METHOD_PROMPTS[method] : '';
      const promptWithMethod = methodPrompt
        ? `${methodPrompt}\n\n---\n\n**User's Input:**\n${prompt}`
        : prompt;

      let activeThreadId = threadId;
      let conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];

      if (!activeThreadId) {
        // Create a new thread
        const { data: thread, error: threadError } = await supabase
          .from('threads')
          .insert({
            workspace_id: workspaceId,
            title: prompt.substring(0, 50) + (prompt.length > 50 ? '...' : ''),
          })
          .select()
          .single();

        if (threadError) {
          return {
            content: [{ type: 'text', text: `Error creating thread: ${threadError.message}` }],
          };
        }
        activeThreadId = thread.id;
      } else {
        // Load existing conversation history
        const { data: existingMessages } = await supabase
          .from('messages')
          .select('role, content')
          .eq('thread_id', activeThreadId)
          .order('created_at', { ascending: true });

        if (existingMessages) {
          conversationHistory = existingMessages
            .filter((m) => m.role !== 'system')
            .map((m) => ({
              role: m.role as 'user' | 'assistant',
              content: m.content,
            }));
        }
      }

      // Store the user message
      const { data: userMessage, error: userMsgError } = await supabase
        .from('messages')
        .insert({
          thread_id: activeThreadId,
          role: 'user',
          content: prompt,
        })
        .select()
        .single();

      if (userMsgError) {
        return { content: [{ type: 'text', text: `Error creating message: ${userMsgError.message}` }] };
      }

      // Enhance prompt with workspace context (use method-enhanced prompt if specified)
      let enhancedPrompt: string;
      try {
        enhancedPrompt = await enhancePromptWithContext(workspaceId, promptWithMethod);
      } catch {
        enhancedPrompt = promptWithMethod; // Fallback to method-enhanced prompt
      }

      // Generate AI response
      let aiResponse: string;
      try {
        aiResponse = await generateThinkingResponse(enhancedPrompt, conversationHistory);
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : 'Unknown error';
        return { content: [{ type: 'text', text: `Error generating response: ${errMsg}` }] };
      }

      // Store the assistant message
      const { data: assistantMessage, error: assistantMsgError } = await supabase
        .from('messages')
        .insert({
          thread_id: activeThreadId,
          role: 'assistant',
          content: aiResponse,
          model: 'claude-sonnet-4-20250514',
        })
        .select()
        .single();

      if (assistantMsgError) {
        return { content: [{ type: 'text', text: `Error storing response: ${assistantMsgError.message}` }] };
      }

      // Create a node for this exchange
      const { data: node, error: nodeError } = await supabase
        .from('nodes')
        .insert({
          thread_id: activeThreadId,
          message_ids: [userMessage.id, assistantMessage.id],
          position: conversationHistory.length / 2,
        })
        .select()
        .single();

      if (nodeError) {
        return { content: [{ type: 'text', text: `Error creating node: ${nodeError.message}` }] };
      }

      // Generate and store node summary (async, don't block response)
      generateNodeSummary(prompt, aiResponse).then(async (summary) => {
        if (summary) {
          await supabase
            .from('nodes')
            .update({ summary })
            .eq('id', node.id);
        }
      }).catch(() => {
        // Silently ignore summary generation errors
      });

      // Extract and store thought products
      const extractedProducts = extractThoughtProducts(aiResponse);
      const storedProducts: string[] = [];

      for (const product of extractedProducts) {
        const { data: tp, error: tpError } = await supabase
          .from('thought_products')
          .insert({
            workspace_id: workspaceId,
            source_node_id: node.id,
            type: product.type as ThoughtProductType,
            content: product.content,
            state: 'surfaced' as ThoughtProductState,
            confidence: 0.5,
            influenced_by: [],
            influences: [],
          })
          .select()
          .single();

        if (!tpError && tp) {
          storedProducts.push(`${product.type}: ${product.content.substring(0, 50)}...`);
        }
      }

      let productsSummary = '';
      if (storedProducts.length > 0) {
        productsSummary = `\n\n---\nExtracted ${storedProducts.length} thought product(s):\n${storedProducts.map((p) => `- ${p}`).join('\n')}`;
      }

      return {
        content: [
          {
            type: 'text',
            text: `${aiResponse}${productsSummary}\n\n---\nThread: ${activeThreadId} | Node: ${node.id}`,
          },
        ],
      };
    }

    case 'turbot_ground': {
      const { workspaceId, claim } = args as {
        workspaceId: string;
        claim: string;
      };

      // Get all thought products for this workspace
      const { data: thoughtProducts, error: tpError } = await supabase
        .from('thought_products')
        .select('type, content, state')
        .eq('workspace_id', workspaceId);

      if (tpError) {
        return { content: [{ type: 'text', text: `Error fetching thought products: ${tpError.message}` }] };
      }

      // Get all evidence for this workspace
      const { data: evidence, error: evError } = await supabase
        .from('evidence')
        .select('content, source, supports')
        .eq('workspace_id', workspaceId);

      if (evError) {
        return { content: [{ type: 'text', text: `Error fetching evidence: ${evError.message}` }] };
      }

      // Analyze the grounding
      let analysis: string;
      try {
        analysis = await analyzeGrounding(
          claim,
          thoughtProducts || [],
          evidence || []
        );
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : 'Unknown error';
        return { content: [{ type: 'text', text: `Error analyzing claim: ${errMsg}` }] };
      }

      return {
        content: [
          {
            type: 'text',
            text: `Grounding Analysis for: "${claim}"\n\n${analysis}`,
          },
        ],
      };
    }

    case 'turbot_trace': {
      const { thoughtProductId } = args as { thoughtProductId: string };

      // Get the thought product
      const { data: tp, error: tpError } = await supabase
        .from('thought_products')
        .select('*')
        .eq('id', thoughtProductId)
        .single();

      if (tpError || !tp) {
        return { content: [{ type: 'text', text: `Thought product not found: ${thoughtProductId}` }] };
      }

      // Get influencers (what influenced this thought product)
      let influencers: Array<{ id: string; type: string; content: string }> = [];
      if (tp.influenced_by && tp.influenced_by.length > 0) {
        const { data } = await supabase
          .from('thought_products')
          .select('id, type, content')
          .in('id', tp.influenced_by);
        influencers = data || [];
      }

      // Get influenced (what this thought product influences)
      let influenced: Array<{ id: string; type: string; content: string }> = [];
      if (tp.influences && tp.influences.length > 0) {
        const { data } = await supabase
          .from('thought_products')
          .select('id, type, content')
          .in('id', tp.influences);
        influenced = data || [];
      }

      // Get evidence linked to this thought product
      const { data: evidence } = await supabase
        .from('evidence')
        .select('id, type, content, supports, source')
        .eq('thought_product_id', thoughtProductId);

      // Build the trace output
      let output = `Trace for: [${tp.type}] ${tp.content}\n`;
      output += `State: ${tp.state} | Confidence: ${tp.confidence}\n`;
      output += `\n`;

      if (influencers.length > 0) {
        output += `Influenced by (${influencers.length}):\n`;
        output += influencers.map((i) => `  ← [${i.type}] ${i.content.substring(0, 60)}...`).join('\n');
        output += '\n\n';
      } else {
        output += 'Influenced by: (none - this is a root thought)\n\n';
      }

      if (influenced.length > 0) {
        output += `Influences (${influenced.length}):\n`;
        output += influenced.map((i) => `  → [${i.type}] ${i.content.substring(0, 60)}...`).join('\n');
        output += '\n\n';
      } else {
        output += 'Influences: (none yet)\n\n';
      }

      if (evidence && evidence.length > 0) {
        output += `Evidence (${evidence.length}):\n`;
        output += evidence
          .map((e) => `  ${e.supports ? '✓' : '✗'} [${e.type}] ${e.content.substring(0, 50)}...`)
          .join('\n');
      } else {
        output += 'Evidence: (none attached)';
      }

      if (tp.superseded_by) {
        output += `\n\n⚠️ Superseded by: ${tp.superseded_by}`;
      }

      return {
        content: [{ type: 'text', text: output }],
      };
    }

    case 'turbot_sim': {
      const { workspaceId, prompt, personaId, personaSketch } = args as {
        workspaceId: string;
        prompt: string;
        personaId?: string;
        personaSketch?: string;
      };

      let persona: { id: string; name: string; traits: Record<string, unknown>; voice: string | null };

      if (personaId) {
        // Load existing persona
        const { data, error } = await supabase
          .from('personas')
          .select('*')
          .eq('id', personaId)
          .single();

        if (error || !data) {
          return { content: [{ type: 'text', text: `Persona not found: ${personaId}` }] };
        }
        persona = data;
      } else if (personaSketch) {
        // Create persona from sketch (or reuse existing with same name)
        const sketchParts = personaSketch.split(',').map((s) => s.trim());
        const name = sketchParts[0] || 'User';
        const traits: Record<string, string> = {};
        sketchParts.slice(1).forEach((trait, i) => {
          traits[`trait_${i + 1}`] = trait;
        });

        // Check if persona with this name already exists in workspace
        const { data: existingPersona } = await supabase
          .from('personas')
          .select('*')
          .eq('workspace_id', workspaceId)
          .eq('name', name)
          .single();

        if (existingPersona) {
          // Reuse existing persona
          persona = existingPersona;
        } else {
          // Create new persona
          const { data, error } = await supabase
            .from('personas')
            .insert({
              workspace_id: workspaceId,
              name,
              traits,
              voice: personaSketch,
            })
            .select()
            .single();

          if (error || !data) {
            return { content: [{ type: 'text', text: `Error creating persona: ${error?.message}` }] };
          }
          persona = data;
        }
      } else {
        return {
          content: [{ type: 'text', text: 'Either personaId or personaSketch is required' }],
        };
      }

      // Generate persona response
      let response: string;
      try {
        response = await simulatePersona(persona, prompt);
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : 'Unknown error';
        return { content: [{ type: 'text', text: `Error simulating persona: ${errMsg}` }] };
      }

      // Extract feedback and create thought products
      const feedback = extractPersonaFeedback(response);
      const storedFeedback: string[] = [];

      for (const item of feedback) {
        const tpType: ThoughtProductType = item.type === 'validation' ? 'insight' : item.type === 'concern' ? 'tension' : 'question';

        const { error } = await supabase
          .from('thought_products')
          .insert({
            workspace_id: workspaceId,
            type: tpType,
            content: `[From ${persona.name}] ${item.content}`,
            state: 'surfaced' as ThoughtProductState,
            confidence: 0.5,
            influenced_by: [],
            influences: [],
          });

        if (!error) {
          storedFeedback.push(`${item.type}: ${item.content.substring(0, 40)}...`);
        }
      }

      let feedbackSummary = '';
      if (storedFeedback.length > 0) {
        feedbackSummary = `\n\n---\nCaptured ${storedFeedback.length} feedback item(s) as thought products`;
      }

      return {
        content: [
          {
            type: 'text',
            text: `**${persona.name}** responds:\n\n${response}${feedbackSummary}`,
          },
        ],
      };
    }

    case 'turbot_create': {
      const { workspaceId, type, context } = args as {
        workspaceId: string;
        type:
          | 'spec'
          | 'user_story'
          | 'journey'
          | 'problem_frame'
          | 'design_brief'
          | 'roadmap'
          | 'persona_preview'
          | 'persona'
          | 'adept'
          | 'epics'
          | 'strategic_context'
          | 'information_architecture'
          | 'handoff_notes'
          | 'solution_brief'
          | 'feature_spec'
          | 'content_brief'
          | 'technical_context'
          | 'positioning';
        context: string;
      };

      // Get relevant thought products
      const { data: thoughtProducts } = await supabase
        .from('thought_products')
        .select('id, type, content, state, confidence')
        .eq('workspace_id', workspaceId)
        .in('state', ['surfaced', 'validated', 'supported'])
        .order('confidence', { ascending: false })
        .limit(20);

      const tpContext = thoughtProducts && thoughtProducts.length > 0
        ? thoughtProducts.map((tp) => `- [${tp.type}] ${tp.content} (${tp.state})`).join('\n')
        : 'No thought products available.';

      // Use the methodology-aligned output templates
      const template = OUTPUT_TEMPLATES[type] || OUTPUT_TEMPLATES.spec;

      const systemPrompt = `You are creating a ${type.replace('_', ' ')} document grounded in existing research and thinking.

${template}

Ground every section in the provided thought products where relevant. Reference specific insights, decisions, and assumptions by type.

Format the output clearly with markdown headings and bullet points.`;

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: `Context: ${context}\n\nExisting knowledge:\n${tpContext}`,
          },
        ],
      });

      const textBlock = response.content.find((block) => block.type === 'text');
      const outputContent = textBlock ? textBlock.text : '';

      // Store the output
      const { data: output, error } = await supabase
        .from('outputs')
        .insert({
          workspace_id: workspaceId,
          type,
          content: { text: outputContent, context },
          depends_on: thoughtProducts?.map((tp) => tp.id) || [],
          establishes: [],
        })
        .select()
        .single();

      if (error) {
        return { content: [{ type: 'text', text: `Error storing output: ${error.message}` }] };
      }

      // Increment citation counts for all TPs used in this output
      if (thoughtProducts) {
        for (const tp of thoughtProducts) {
          await supabase.rpc('increment_citation_count', { tp_id: tp.id });
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: `${outputContent}\n\n---\nOutput ID: ${output.id}\nGrounded in ${thoughtProducts?.length || 0} thought products`,
          },
        ],
      };
    }

    case 'turbot_evidence': {
      const { workspaceId, thoughtProductId, type, content, source, supports } = args as {
        workspaceId: string;
        thoughtProductId: string;
        type: 'quote' | 'observation' | 'data';
        content: string;
        source?: string;
        supports: boolean;
      };

      const { data, error } = await supabase
        .from('evidence')
        .insert({
          workspace_id: workspaceId,
          thought_product_id: thoughtProductId,
          type,
          content,
          source: source || null,
          supports,
        })
        .select()
        .single();

      if (error) {
        return { content: [{ type: 'text', text: `Error adding evidence: ${error.message}` }] };
      }

      // Increment citation count (TP is now referenced by evidence)
      await supabase.rpc('increment_citation_count', { tp_id: thoughtProductId });

      // Update the thought product's state based on evidence
      const { data: existingEvidence } = await supabase
        .from('evidence')
        .select('supports')
        .eq('thought_product_id', thoughtProductId);

      const supportingCount = existingEvidence?.filter((e) => e.supports).length || 0;
      const challengingCount = existingEvidence?.filter((e) => !e.supports).length || 0;

      let suggestedState = '';
      if (supportingCount > 0 && challengingCount === 0) {
        suggestedState = 'Consider updating state to "supported"';
      } else if (challengingCount > 0 && supportingCount === 0) {
        suggestedState = 'Consider updating state to "challenged"';
      } else if (supportingCount > 0 && challengingCount > 0) {
        suggestedState = 'Mixed evidence — may indicate a tension';
      }

      return {
        content: [
          {
            type: 'text',
            text: `Evidence added (${supports ? 'supporting' : 'challenging'}):\n"${content}"\n\nEvidence ID: ${data.id}\nTotal evidence: ${supportingCount} supporting, ${challengingCount} challenging\n${suggestedState}`,
          },
        ],
      };
    }

    case 'turbot_update_state': {
      const { thoughtProductId, state, reason, confidence } = args as {
        thoughtProductId: string;
        state: ThoughtProductState;
        reason?: string;
        confidence?: number;
      };

      const updateData: Record<string, unknown> = { state };
      if (confidence !== undefined) {
        updateData.confidence = Math.max(0, Math.min(1, confidence));
      }

      const { data, error } = await supabase
        .from('thought_products')
        .update(updateData)
        .eq('id', thoughtProductId)
        .select()
        .single();

      if (error) {
        return { content: [{ type: 'text', text: `Error updating state: ${error.message}` }] };
      }

      let response = `State updated to "${state}"`;
      if (confidence !== undefined) {
        response += ` with confidence ${confidence}`;
      }
      if (reason) {
        response += `\nReason: ${reason}`;
      }
      response += `\n\n[${data.type}] ${data.content}`;

      return {
        content: [{ type: 'text', text: response }],
      };
    }

    case 'turbot_link': {
      const { fromId, toId } = args as {
        fromId: string;
        toId: string;
      };

      // Get the "from" thought product and add toId to its influences
      const { data: fromTp, error: fromError } = await supabase
        .from('thought_products')
        .select('influences, type, content')
        .eq('id', fromId)
        .single();

      if (fromError || !fromTp) {
        return { content: [{ type: 'text', text: `Source thought product not found: ${fromId}` }] };
      }

      // Get the "to" thought product and add fromId to its influenced_by
      const { data: toTp, error: toError } = await supabase
        .from('thought_products')
        .select('influenced_by, type, content')
        .eq('id', toId)
        .single();

      if (toError || !toTp) {
        return { content: [{ type: 'text', text: `Target thought product not found: ${toId}` }] };
      }

      // Update both thought products
      const newInfluences = [...(fromTp.influences || [])];
      if (!newInfluences.includes(toId)) {
        newInfluences.push(toId);
      }

      const newInfluencedBy = [...(toTp.influenced_by || [])];
      if (!newInfluencedBy.includes(fromId)) {
        newInfluencedBy.push(fromId);
      }

      await supabase
        .from('thought_products')
        .update({ influences: newInfluences })
        .eq('id', fromId);

      await supabase
        .from('thought_products')
        .update({ influenced_by: newInfluencedBy })
        .eq('id', toId);

      // Increment citation counts for both TPs (they're now referenced by each other)
      await supabase.rpc('increment_citation_count', { tp_id: fromId });
      await supabase.rpc('increment_citation_count', { tp_id: toId });

      return {
        content: [
          {
            type: 'text',
            text: `Link created:\n[${fromTp.type}] ${fromTp.content.substring(0, 50)}...\n  ↓ influences ↓\n[${toTp.type}] ${toTp.content.substring(0, 50)}...`,
          },
        ],
      };
    }

    case 'turbot_notebook_create': {
      const { workspaceId, name, description } = args as {
        workspaceId: string;
        name: string;
        description?: string;
      };

      const { data, error } = await supabase
        .from('notebooks')
        .insert({
          workspace_id: workspaceId,
          name,
          description: description || null,
        })
        .select()
        .single();

      if (error) {
        return { content: [{ type: 'text', text: `Error creating notebook: ${error.message}` }] };
      }

      return {
        content: [
          {
            type: 'text',
            text: `Notebook created: "${name}"\nID: ${data.id}${description ? `\nDescription: ${description}` : ''}`,
          },
        ],
      };
    }

    case 'turbot_notebook_add': {
      const { notebookId, thoughtProductId, annotation } = args as {
        notebookId: string;
        thoughtProductId: string;
        annotation?: string;
      };

      // Get the thought product to show in response
      const { data: tp } = await supabase
        .from('thought_products')
        .select('type, content')
        .eq('id', thoughtProductId)
        .single();

      if (!tp) {
        return { content: [{ type: 'text', text: `Thought product not found: ${thoughtProductId}` }] };
      }

      // Get current max position in notebook
      const { data: entries } = await supabase
        .from('notebook_entries')
        .select('position')
        .eq('notebook_id', notebookId)
        .order('position', { ascending: false })
        .limit(1);

      const nextPosition = entries && entries.length > 0 ? entries[0].position + 1 : 0;

      const { error } = await supabase
        .from('notebook_entries')
        .insert({
          notebook_id: notebookId,
          thought_product_id: thoughtProductId,
          position: nextPosition,
          annotation: annotation || null,
        });

      if (error) {
        if (error.code === '23505') { // Unique violation
          return { content: [{ type: 'text', text: `This thought product is already in the notebook.` }] };
        }
        return { content: [{ type: 'text', text: `Error adding to notebook: ${error.message}` }] };
      }

      // Increment citation count (TP is now referenced by notebook)
      await supabase.rpc('increment_citation_count', { tp_id: thoughtProductId });

      return {
        content: [
          {
            type: 'text',
            text: `Added to notebook:\n[${tp.type}] ${tp.content.substring(0, 60)}...${annotation ? `\nAnnotation: ${annotation}` : ''}`,
          },
        ],
      };
    }

    case 'turbot_notebook_list': {
      const { workspaceId } = args as { workspaceId: string };

      const { data: notebooks, error } = await supabase
        .from('notebooks')
        .select('id, name, description, updated_at')
        .eq('workspace_id', workspaceId)
        .order('updated_at', { ascending: false });

      if (error) {
        return { content: [{ type: 'text', text: `Error listing notebooks: ${error.message}` }] };
      }

      if (!notebooks || notebooks.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: 'No notebooks in this workspace. Create one with turbot_notebook_create.',
            },
          ],
        };
      }

      // Get entry counts for each notebook
      const notebookList = await Promise.all(
        notebooks.map(async (nb) => {
          const { count } = await supabase
            .from('notebook_entries')
            .select('*', { count: 'exact', head: true })
            .eq('notebook_id', nb.id);

          return `- **${nb.name}** (${count || 0} items)\n  ID: ${nb.id}${nb.description ? `\n  ${nb.description}` : ''}`;
        })
      );

      return {
        content: [
          {
            type: 'text',
            text: `## Notebooks\n\n${notebookList.join('\n\n')}`,
          },
        ],
      };
    }

    case 'turbot_notebook_view': {
      const { notebookId } = args as { notebookId: string };

      // Get notebook details
      const { data: notebook, error: nbError } = await supabase
        .from('notebooks')
        .select('*')
        .eq('id', notebookId)
        .single();

      if (nbError || !notebook) {
        return { content: [{ type: 'text', text: `Notebook not found: ${notebookId}` }] };
      }

      // Get entries with thought products
      const { data: entries } = await supabase
        .from('notebook_entries')
        .select('position, annotation, thought_product_id')
        .eq('notebook_id', notebookId)
        .order('position', { ascending: true });

      let content = `## ${notebook.name}\n`;
      if (notebook.description) {
        content += `*${notebook.description}*\n`;
      }
      content += '\n';

      if (notebook.notes) {
        content += `### Notes\n${notebook.notes}\n\n`;
      }

      if (!entries || entries.length === 0) {
        content += '*No thought products in this notebook yet.*';
      } else {
        content += `### Thought Products (${entries.length})\n\n`;

        for (const entry of entries) {
          const { data: tp } = await supabase
            .from('thought_products')
            .select('type, content, state, confidence')
            .eq('id', entry.thought_product_id)
            .single();

          if (tp) {
            const stateIcon = tp.state === 'validated' ? '✓' : tp.state === 'challenged' ? '⚠' : '';
            content += `${entry.position + 1}. ${stateIcon} [${tp.type}] ${tp.content}\n`;
            content += `   *${tp.state} • confidence: ${tp.confidence}*\n`;
            if (entry.annotation) {
              content += `   📝 ${entry.annotation}\n`;
            }
            content += '\n';
          }
        }
      }

      return {
        content: [{ type: 'text', text: content }],
      };
    }

    case 'turbot_notebook_note': {
      const { notebookId, notes } = args as {
        notebookId: string;
        notes: string;
      };

      const { data, error } = await supabase
        .from('notebooks')
        .update({ notes })
        .eq('id', notebookId)
        .select('name')
        .single();

      if (error) {
        return { content: [{ type: 'text', text: `Error updating notes: ${error.message}` }] };
      }

      return {
        content: [
          {
            type: 'text',
            text: `Notes updated for "${data.name}"`,
          },
        ],
      };
    }

    case 'turbot_thought_list': {
      const { workspaceId, type, state, limit } = args as {
        workspaceId: string;
        type?: string;
        state?: string;
        limit?: number;
      };

      let query = supabase
        .from('thought_products')
        .select('id, type, content, state, confidence, citation_count, created_at')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(limit || 20);

      if (type) {
        query = query.eq('type', type);
      }
      if (state) {
        query = query.eq('state', state);
      }

      const { data: thoughts, error } = await query;

      if (error) {
        return { content: [{ type: 'text', text: `Error: ${error.message}` }] };
      }

      if (!thoughts || thoughts.length === 0) {
        return { content: [{ type: 'text', text: `No thought products found${type ? ` of type "${type}"` : ''}${state ? ` in state "${state}"` : ''}.` }] };
      }

      const thoughtList = thoughts.map((tp) => {
        const citations = tp.citation_count > 0 ? ` (cited ${tp.citation_count}x)` : '';
        return `**[${tp.type.toUpperCase()}]** ${tp.content.substring(0, 150)}${tp.content.length > 150 ? '...' : ''}\n  ID: ${tp.id} | State: ${tp.state} | Confidence: ${tp.confidence}${citations}`;
      }).join('\n\n');

      const filterNote = (type || state) ? `\nFilters: ${type ? `type=${type}` : ''} ${state ? `state=${state}` : ''}` : '';

      return {
        content: [
          {
            type: 'text',
            text: `# Thought Products (${thoughts.length})${filterNote}\n\n${thoughtList}`,
          },
        ],
      };
    }

    case 'turbot_output_list': {
      const { workspaceId, type } = args as {
        workspaceId: string;
        type?: string;
      };

      let query = supabase
        .from('outputs')
        .select('id, type, content, created_at')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (type) {
        query = query.eq('type', type);
      }

      const { data: outputs, error } = await query;

      if (error) {
        return { content: [{ type: 'text', text: `Error: ${error.message}` }] };
      }

      if (!outputs || outputs.length === 0) {
        return { content: [{ type: 'text', text: `No outputs found${type ? ` of type "${type}"` : ''}.\n\nGenerate outputs with turbot_create.` }] };
      }

      const outputList = outputs.map((o) => {
        const preview = typeof o.content === 'object'
          ? JSON.stringify(o.content).substring(0, 100) + '...'
          : String(o.content).substring(0, 100) + '...';
        return `**${o.type.toUpperCase()}** (${new Date(o.created_at).toLocaleDateString()})\n  ID: ${o.id}\n  Preview: ${preview}`;
      }).join('\n\n');

      return {
        content: [
          {
            type: 'text',
            text: `# Outputs (${outputs.length})${type ? `\nFilter: type=${type}` : ''}\n\n${outputList}`,
          },
        ],
      };
    }

    case 'turbot_search': {
      const { workspaceId, query, limit } = args as {
        workspaceId: string;
        query: string;
        limit?: number;
      };

      // Simple text search using ilike
      const { data: thoughts, error } = await supabase
        .from('thought_products')
        .select('id, type, content, state, confidence')
        .eq('workspace_id', workspaceId)
        .ilike('content', `%${query}%`)
        .neq('state', 'abandoned')
        .limit(limit || 10);

      if (error) {
        return { content: [{ type: 'text', text: `Error: ${error.message}` }] };
      }

      if (!thoughts || thoughts.length === 0) {
        return { content: [{ type: 'text', text: `No thought products found matching "${query}".` }] };
      }

      const results = thoughts.map((tp) => {
        return `**[${tp.type.toUpperCase()}]** ${tp.content.substring(0, 200)}${tp.content.length > 200 ? '...' : ''}\n  ID: ${tp.id} | State: ${tp.state}`;
      }).join('\n\n');

      return {
        content: [
          {
            type: 'text',
            text: `# Search Results for "${query}" (${thoughts.length} matches)\n\n${results}`,
          },
        ],
      };
    }

    case 'turbot_notebook_remove': {
      const { notebookId, thoughtProductId } = args as {
        notebookId: string;
        thoughtProductId: string;
      };

      const { error } = await supabase
        .from('notebook_entries')
        .delete()
        .eq('notebook_id', notebookId)
        .eq('thought_product_id', thoughtProductId);

      if (error) {
        return { content: [{ type: 'text', text: `Error removing entry: ${error.message}` }] };
      }

      return {
        content: [
          {
            type: 'text',
            text: `Removed thought product from notebook.`,
          },
        ],
      };
    }

    case 'turbot_persona_list': {
      const { workspaceId } = args as { workspaceId: string };

      const { data: personas, error } = await supabase
        .from('personas')
        .select('id, name, traits, voice, created_at')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (error) {
        return { content: [{ type: 'text', text: `Error fetching personas: ${error.message}` }] };
      }

      if (!personas || personas.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: `No personas in this workspace yet.\n\nCreate one with turbot_sim using a personaSketch, e.g.:\n"busy startup founder, technical background, skeptical of new tools"`,
            },
          ],
        };
      }

      const personaList = personas.map((p) => {
        const traits = p.traits ? Object.values(p.traits).join(', ') : 'No traits defined';
        return `## ${p.name}\n**ID:** ${p.id}\n**Voice:** ${p.voice || 'Not defined'}\n**Traits:** ${traits}\n`;
      }).join('\n---\n\n');

      return {
        content: [
          {
            type: 'text',
            text: `# Personas (${personas.length})\n\n${personaList}\n---\nUse turbot_sim with personaId to talk to a persona.`,
          },
        ],
      };
    }

    case 'turbot_mode': {
      const { workspaceId, mode } = args as {
        workspaceId: string;
        mode?: 'capture' | 'think' | 'create' | 'sim';
      };

      // Get workspace context
      const { data: workspace } = await supabase
        .from('workspaces')
        .select('name')
        .eq('id', workspaceId)
        .single();

      const { data: thoughtProducts } = await supabase
        .from('thought_products')
        .select('type, content, state, confidence')
        .eq('workspace_id', workspaceId)
        .neq('state', 'abandoned')
        .order('created_at', { ascending: false })
        .limit(20);

      const { data: personas } = await supabase
        .from('personas')
        .select('name, voice')
        .eq('workspace_id', workspaceId);

      // Build context summary
      const tps = thoughtProducts || [];
      const validated = tps.filter((tp) => tp.state === 'validated' || tp.state === 'supported');
      const assumed = tps.filter((tp) => tp.type === 'assumption' && tp.state !== 'validated');
      const decisions = tps.filter((tp) => tp.type === 'decision');
      const tensions = tps.filter((tp) => tp.type === 'tension');

      const contextSummary = `
## Current Workspace: ${workspace?.name || 'Unknown'}

### What's Established (${validated.length} items)
${validated.slice(0, 5).map((tp) => `- [${tp.type}] ${tp.content.substring(0, 100)}...`).join('\n') || 'Nothing validated yet'}

### Key Decisions (${decisions.length})
${decisions.slice(0, 3).map((tp) => `- ${tp.content.substring(0, 100)}...`).join('\n') || 'No decisions captured yet'}

### Active Tensions (${tensions.length})
${tensions.slice(0, 3).map((tp) => `- ${tp.content.substring(0, 100)}...`).join('\n') || 'No tensions identified yet'}

### Unvalidated Assumptions (${assumed.length})
${assumed.slice(0, 3).map((tp) => `- ${tp.content.substring(0, 100)}...`).join('\n') || 'No unvalidated assumptions'}

### Available Personas (${personas?.length || 0})
${(personas || []).map((p) => `- ${p.name}: ${p.voice?.substring(0, 50) || 'No voice defined'}...`).join('\n') || 'No personas created yet'}
`;

      // Mode-specific guidance
      const modeGuidance: Record<string, string> = {
        capture: `
## Capture Mode Active
**Purpose:** Process data and create foundational understanding
**Pipeline Stages:** 1-3 (Extract Insights, Persona Creation, Vision Stories)

**Key Behaviors:**
- Auto-process data without asking permission
- Preserve original insights and quotes
- Extract and surface thought products as you go
- Look for patterns across data sources

**Thought Product Surfacing:**
When you identify insights, decisions, assumptions, or tensions, surface them using this format:
- **[INSIGHT]** [content] — Confidence: [0-1]
- **[ASSUMPTION]** [content] — Confidence: [0-1]
- **[DECISION]** [content]
- **[TENSION]** [content]
`,
        think: `
## Think Mode Active
**Purpose:** Strategic thinking and solution concept ideation
**Pipeline Stages:** 4-6 (Problem Framing, Journey Analysis, Solution Concepting)

**Key Behaviors:**
- Apply proven frameworks (Jobs-to-be-Done, 5 Whys, SCAMPER)
- Incorporate persona perspectives in analysis
- Engage in divergent thinking (generate options) then convergent thinking (evaluate and select)
- Notice when it's time to pivot from diverging to converging

**Divergent-Convergent Pivot:**
Watch for these signals that exploration is complete:
- Saturation: new ideas are variations of existing ones
- Coverage: multiple distinct approaches explored (5+ concepts)
- User signal: "which should we pursue?" or "help me decide"

When you see these signals, offer: "We've got several directions. Want to keep exploring, or start evaluating which have the most potential?"

**Thought Product Surfacing:**
Surface thought products as you work:
- **[IDEA]** [content]
- **[CLAIM]** [content] — needs validation
- **[QUESTION]** [content] — open question to resolve
- **[TENSION]** [content] — trade-off to navigate
`,
        create: `
## Create Mode Active
**Purpose:** Generate professional, structured deliverables
**Pipeline Stages:** 7-8 (Solution Definition, Strategic Handoff)

**Key Behaviors:**
- Use structured templates for all deliverables
- Package strategic thinking into actionable outputs
- Flag gaps and open questions for downstream teams
- Reference thought products to ground all claims

**Available Outputs:**
- spec, user_story, journey, problem_frame
- design_brief, roadmap, epics
- persona_preview, persona
- strategic_context, information_architecture, handoff_notes

**Quality Standards:**
- Ground everything in established thought products
- Flag assumptions with [ASSUMPTION] markers
- Use [NEEDS CLARIFICATION] for open questions
- Include traceability to source insights
`,
        sim: `
## Sim Mode Active
**Purpose:** Validate or challenge assumptions through persona embodiment

**Key Behaviors:**
- Complete personality embodiment — use the persona's authentic voice
- Override normal tone guidelines for persona authenticity
- Give candid, unfiltered feedback
- Focus on areas requiring more research or validation
- Surface concerns the persona would genuinely have

**When Embodying a Persona:**
- Use their vocabulary and sentence patterns
- Express their emotional triggers authentically
- Acknowledge their knowledge boundaries (what they wouldn't know)
- React from their context and constraints

**Feedback to Surface:**
- **[VALIDATION]** Things that resonate with this persona
- **[CONCERN]** Issues or friction points they'd experience
- **[QUESTION]** What they'd want to know more about
`,
      };

      const selectedMode = mode || 'think';
      const modeContent = modeGuidance[selectedMode] || modeGuidance.think;

      // Core methodology
      const methodology = `
# Double Diamond Thought Partner

You are now operating as a Double Diamond Thought Partner. Follow this methodology throughout the conversation.

## Core Function
Help users think through product and experience design challenges — from early ideas through solution concepts and deliverables. Use a structured methodology based on the double diamond and design thinking approaches, but meet users where they are rather than forcing a linear path.

## Character Traits
- Expert in strategic analysis and design thinking
- Consultative approach — appreciate nuance, thoroughness, comprehensiveness
- Don't rush — take time to chew on questions
- Pragmatist — know when a task is complete enough to move on

## 8-Stage Pipeline
1. **Extract Insights** - Extract insights from raw data and research
2. **Persona Creation** - Build user profiles from insights
3. **Vision Stories** - Define ideal future states
4. **Problem Framing** - Identify core problems to solve
5. **Journey Analysis** - Map user experiences
6. **Solution Concepting** - Generate and evaluate solution approaches
7. **Solution Definition** - Develop detailed concepts
8. **Strategic Handoff** - Package outputs for specification and development

## Pipeline as Map, Not Rails
Users enter at any point. You:
1. Meet them where they are — engage with their idea, problem, or deliverable
2. Work alongside them — help develop their thinking at whatever stage
3. Surface gaps as observations: "We're assuming X here. Want to dig into that?"
4. Offer foundation work as strengthening: "A quick persona might sharpen this. Want to try?"
5. Track what's established vs. assumed — maintain awareness without enforcing sequence

## Foundation Awareness
- Notice when earlier-stage knowledge is being assumed rather than established
- Surface gaps as opportunities, not blockers
- Frame as strengthening, not correcting: "A quick persona could make this more specific"
- Offer choice, don't redirect: "Want to dig into that, or keep moving?"

## Thought Product Types
As you work, surface these thought products:
- **insight** — Observation grounded in evidence
- **idea** — Potential solution or approach
- **claim** — Statement that needs validation
- **assumption** — Belief we're working with but haven't proven
- **decision** — Commitment that constrains future choices
- **question** — Open inquiry that needs resolution
- **tension** — Trade-off or competing need to navigate
- **principle** — Guiding rule derived from understanding

${modeContent}

${contextSummary}

## Your Task
Apply this methodology throughout our conversation. Surface thought products as you identify them. Track what's established vs. assumed. Suggest next steps aligned with the pipeline. Meet the user where they are.

Ready to begin.
`;

      return {
        content: [
          {
            type: 'text',
            text: methodology,
          },
        ],
      };
    }

    case 'turbot_pipeline_status': {
      const { workspaceId } = args as { workspaceId: string };

      // Get thought products to analyze pipeline position
      const { data: thoughtProducts } = await supabase
        .from('thought_products')
        .select('type, state, confidence')
        .eq('workspace_id', workspaceId);

      // Get personas
      const { data: personas } = await supabase
        .from('personas')
        .select('id, name')
        .eq('workspace_id', workspaceId);

      // Get outputs by type
      const { data: outputs } = await supabase
        .from('outputs')
        .select('type')
        .eq('workspace_id', workspaceId);

      const tps = thoughtProducts || [];
      const personaCount = personas?.length || 0;
      const outputTypes = new Set((outputs || []).map((o) => o.type));

      // Double Diamond: 4 stages
      // DISCOVER (diverge): research, insights, patterns, questions
      const hasDiscover = tps.some((tp) =>
        (tp.type === 'insight' || tp.type === 'pattern' || tp.type === 'question') && tp.state !== 'abandoned'
      );

      // DEFINE (converge): frame problems, personas, decisions, principles
      const hasDefine = tps.some((tp) =>
        (tp.type === 'tension' || tp.type === 'principle' || tp.type === 'decision') && tp.state !== 'abandoned'
      ) || personaCount > 0;

      // DEVELOP (diverge): ideas, concepts, journeys, assumptions to test
      const hasDevelop = tps.some((tp) =>
        (tp.type === 'idea' || tp.type === 'assumption' || tp.type === 'claim') && tp.state !== 'abandoned'
      ) || outputTypes.has('journey');

      // DELIVER (converge): specs, briefs, handoff
      const hasDeliver = outputTypes.has('spec') || outputTypes.has('design_brief') ||
        outputTypes.has('feature_spec') || outputTypes.has('roadmap') ||
        outputTypes.has('epics') || outputTypes.has('handoff_notes');

      // Build visual pipeline - Double Diamond shape
      const stages = [
        { name: 'DISCOVER', done: hasDiscover, mode: 'diverge' },
        { name: 'DEFINE', done: hasDefine, mode: 'converge' },
        { name: 'DEVELOP', done: hasDevelop, mode: 'diverge' },
        { name: 'DELIVER', done: hasDeliver, mode: 'converge' },
      ];

      const pipelineViz = stages
        .map((s) => `◇ ${s.name} ${s.done ? '●' : '○'}`)
        .join(' ─── ');

      // Current focus
      let currentFocus = 'Getting started';
      const activeStage = stages.find((s) => !s.done);
      if (activeStage) {
        currentFocus = `Current stage: ${activeStage.name} (${activeStage.mode})`;
      } else {
        currentFocus = 'All stages complete! Ready for implementation.';
      }

      // What's established vs assumed
      const validated = tps.filter((tp) =>
        tp.state === 'validated' || tp.state === 'supported'
      );
      const assumed = tps.filter((tp) =>
        tp.type === 'assumption' && tp.state !== 'validated' && tp.state !== 'abandoned'
      );

      const validationHealth = tps.length > 0
        ? Math.round((validated.length / tps.length) * 100)
        : 0;

      const healthBar = '█'.repeat(Math.floor(validationHealth / 10)) + '░'.repeat(10 - Math.floor(validationHealth / 10));
      const validationViz = `\n\n## Validation Health\n${healthBar} ${validationHealth}% grounded\n✓ ${validated.length} validated | ⚠ ${assumed.length} assumptions`;

      // Suggestions based on Double Diamond
      let suggestion = '\n\n## Suggested Next Step\n';
      if (!hasDiscover) {
        suggestion += 'Start **discovering** — use `turbot_think` to explore and surface insights.';
      } else if (!hasDefine) {
        suggestion += 'Move to **define** — frame problems, create personas with `turbot_sim`, capture decisions.';
      } else if (assumed.length > 3) {
        suggestion += 'Validate assumptions with `turbot_ground` before developing solutions.';
      } else if (!hasDevelop) {
        suggestion += 'Start **developing** — generate ideas, map journeys with `turbot_create type="journey"`.';
      } else if (!hasDeliver) {
        suggestion += 'Move to **deliver** — create specs with `turbot_create type="spec"` or `type="feature_spec"`.';
      } else {
        suggestion += 'Pipeline complete! Create handoff notes with `turbot_create type="handoff_notes"`.';
      }

      return {
        content: [
          {
            type: 'text',
            text: `## Double Diamond Pipeline\n${pipelineViz}\n\n## Current Focus\n${currentFocus}${validationViz}${suggestion}`,
          },
        ],
      };
    }

    case 'turbot_evaluate': {
      const { workspaceId, concept, compareWith } = args as {
        workspaceId: string;
        concept: string;
        compareWith?: string[];
      };

      // Get context for evaluation
      const { data: thoughtProducts } = await supabase
        .from('thought_products')
        .select('type, content, state, confidence')
        .eq('workspace_id', workspaceId)
        .neq('state', 'abandoned');

      const { data: personas } = await supabase
        .from('personas')
        .select('name, traits, voice')
        .eq('workspace_id', workspaceId);

      // Build context for AI evaluation
      const tpContext = (thoughtProducts || [])
        .map((tp) => `[${tp.type}] ${tp.content}`)
        .join('\n');

      const personaContext = (personas || [])
        .map((p) => `- ${p.name}: ${p.voice || 'No voice defined'}`)
        .join('\n');

      const conceptsToEvaluate = compareWith && compareWith.length > 0
        ? [concept, ...compareWith]
        : [concept];

      const evaluationPrompt = conceptsToEvaluate.length > 1
        ? `Evaluate and compare these solution concepts using the ADEPT framework:\n\n${conceptsToEvaluate.map((c, i) => `Concept ${i + 1}: ${c}`).join('\n\n')}`
        : `Evaluate this solution concept using the ADEPT framework:\n\nConcept: ${concept}`;

      const systemPrompt = `You are an expert product strategist evaluating solution concepts using the ADEPT framework.

## Context
Thought Products:
${tpContext || 'No thought products yet'}

Personas:
${personaContext || 'No personas defined yet'}

## ADEPT Framework
Evaluate each factor:
- **A: Attractive** - How big is the need? (pain size, frequency, TAM, existing solutions)
- **D: Doable** - How fast/easy to build? (complexity, resources, dependencies)
- **E: Effective** - How well does it work? (user benefits, usability, learning curve)
- **P: Practical** - How maintainable? (costs, sustainability, ROI)
- **T: Targetable** - How easily will it reach users? (distribution, adoption barriers)

## Rating Scale
- 🔴 Not Very - Significant challenges or dealbreakers
- 🟡 Somewhat - Promise but also concerns
- 🟢 Very - Positive outlook

## Evidence Levels
- ★ Anecdotal - Hunches, speculations
- ★★ Minimal - Expert opinions, examples
- ★★★ Suggestive - Small tests, interviews
- ★★★★ Representative - Substantial tests
- ★★★★★ Statistical - Comprehensive evidence

${OUTPUT_TEMPLATES.adept}`;

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        system: systemPrompt,
        messages: [{ role: 'user', content: evaluationPrompt }],
      });

      const textBlock = response.content.find((block) => block.type === 'text');
      const evaluation = textBlock ? textBlock.text : 'Unable to generate evaluation';

      // Store as an output
      const { data: output } = await supabase
        .from('outputs')
        .insert({
          workspace_id: workspaceId,
          type: 'adept' as never, // Type workaround until DB schema is updated
          content: {
            concepts: conceptsToEvaluate,
            evaluation,
            generated_at: new Date().toISOString(),
          },
          establishes: [],
          depends_on: [],
        })
        .select()
        .single();

      return {
        content: [
          {
            type: 'text',
            text: `${evaluation}\n\n---\nEvaluation saved. Output ID: ${output?.id || 'not saved'}`,
          },
        ],
      };
    }

    // === COMPANION APP FEATURES ===

    case 'turbot_thread_complete': {
      const { threadId } = args as { threadId: string };

      const { data, error } = await supabase
        .from('threads')
        .update({ state: 'complete' })
        .eq('id', threadId)
        .select()
        .single();

      if (error) {
        return { content: [{ type: 'text', text: `Error completing thread: ${error.message}` }] };
      }

      return {
        content: [
          {
            type: 'text',
            text: `Thread "${data.title || threadId}" marked as complete.`,
          },
        ],
      };
    }

    case 'turbot_node_headline': {
      const { nodeId, headline } = args as { nodeId: string; headline: string };

      const truncatedHeadline = headline.substring(0, 100);
      const { data, error } = await supabase
        .from('nodes')
        .update({ headline: truncatedHeadline })
        .eq('id', nodeId)
        .select()
        .single();

      if (error) {
        return { content: [{ type: 'text', text: `Error setting headline: ${error.message}` }] };
      }

      return {
        content: [
          {
            type: 'text',
            text: `Headline set for node ${nodeId}: "${truncatedHeadline}"`,
          },
        ],
      };
    }

    case 'turbot_node_stage': {
      const { nodeId, stage } = args as { nodeId: string; stage: string };

      const { data, error } = await supabase
        .from('nodes')
        .update({ stage })
        .eq('id', nodeId)
        .select()
        .single();

      if (error) {
        return { content: [{ type: 'text', text: `Error setting stage: ${error.message}` }] };
      }

      return {
        content: [
          {
            type: 'text',
            text: `Node ${nodeId} tagged with stage: ${stage}`,
          },
        ],
      };
    }

    case 'turbot_pattern_create': {
      const { workspaceId, type, sourceNodeId, targetNodeId, label } = args as {
        workspaceId: string;
        type: string;
        sourceNodeId: string;
        targetNodeId?: string;
        label?: string;
      };

      const { data, error } = await supabase
        .from('patterns')
        .insert({
          workspace_id: workspaceId,
          type,
          source_node_id: sourceNodeId,
          target_node_id: targetNodeId || null,
          label: label || null,
          metadata: {},
        })
        .select()
        .single();

      if (error) {
        return { content: [{ type: 'text', text: `Error creating pattern: ${error.message}` }] };
      }

      return {
        content: [
          {
            type: 'text',
            text: `Created ${type} pattern${label ? ` "${label}"` : ''}\nFrom: ${sourceNodeId}${targetNodeId ? `\nTo: ${targetNodeId}` : ''}\nPattern ID: ${data.id}`,
          },
        ],
      };
    }

    case 'turbot_iteration_create': {
      const { nodeId, headline, summary } = args as {
        nodeId: string;
        headline?: string;
        summary?: string;
      };

      // Get current max version for this node
      const { data: existingIterations } = await supabase
        .from('node_iterations')
        .select('version')
        .eq('node_id', nodeId)
        .order('version', { ascending: false })
        .limit(1);

      const nextVersion = existingIterations && existingIterations.length > 0
        ? existingIterations[0].version + 1
        : 1;

      // Get current node state if this is first iteration
      const { data: currentNode } = await supabase
        .from('nodes')
        .select('headline, summary, message_ids')
        .eq('id', nodeId)
        .single();

      // Create the iteration
      const { data, error } = await supabase
        .from('node_iterations')
        .insert({
          node_id: nodeId,
          version: nextVersion,
          headline: headline || currentNode?.headline || null,
          summary: summary || currentNode?.summary || null,
          message_ids: currentNode?.message_ids || [],
        })
        .select()
        .single();

      if (error) {
        return { content: [{ type: 'text', text: `Error creating iteration: ${error.message}` }] };
      }

      // Update the node with new values if provided
      if (headline || summary) {
        await supabase
          .from('nodes')
          .update({
            ...(headline && { headline }),
            ...(summary && { summary }),
          })
          .eq('id', nodeId);
      }

      return {
        content: [
          {
            type: 'text',
            text: `Created iteration v${nextVersion} for node ${nodeId}\nIteration ID: ${data.id}`,
          },
        ],
      };
    }

    case 'turbot_link_nodes': {
      const { workspaceId, fromNodeId, toNodeId, linkType, description } = args as {
        workspaceId: string;
        fromNodeId: string;
        toNodeId: string;
        linkType?: string;
        description?: string;
      };

      const { data, error } = await supabase
        .from('cross_thread_links')
        .insert({
          workspace_id: workspaceId,
          from_node_id: fromNodeId,
          to_node_id: toNodeId,
          link_type: linkType || null,
          description: description || null,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          return { content: [{ type: 'text', text: `Link already exists between these nodes.` }] };
        }
        return { content: [{ type: 'text', text: `Error creating link: ${error.message}` }] };
      }

      return {
        content: [
          {
            type: 'text',
            text: `Linked nodes${linkType ? ` (${linkType})` : ''}\nFrom: ${fromNodeId}\nTo: ${toNodeId}\nLink ID: ${data.id}`,
          },
        ],
      };
    }

    case 'turbot_context_add': {
      const { workspaceId, nodeId, type, title, content, sourceUrl } = args as {
        workspaceId: string;
        nodeId?: string;
        type: string;
        title?: string;
        content: string;
        sourceUrl?: string;
      };

      const { data, error } = await supabase
        .from('context_items')
        .insert({
          workspace_id: workspaceId,
          node_id: nodeId || null,
          type,
          title: title || null,
          content,
          source_url: sourceUrl || null,
          metadata: {},
        })
        .select()
        .single();

      if (error) {
        return { content: [{ type: 'text', text: `Error adding context: ${error.message}` }] };
      }

      return {
        content: [
          {
            type: 'text',
            text: `Added ${type}${title ? `: "${title}"` : ''}\nContext ID: ${data.id}${nodeId ? `\nAttached to node: ${nodeId}` : ''}`,
          },
        ],
      };
    }

    case 'turbot_thread_view': {
      const { threadId } = args as { threadId: string };

      // Get thread with all related data
      const { data: thread, error: threadError } = await supabase
        .from('threads')
        .select('*')
        .eq('id', threadId)
        .single();

      if (threadError) {
        return { content: [{ type: 'text', text: `Error fetching thread: ${threadError.message}` }] };
      }

      // Get nodes
      const { data: nodes } = await supabase
        .from('nodes')
        .select('*')
        .eq('thread_id', threadId)
        .order('position', { ascending: true });

      // Get patterns for nodes in this thread
      const nodeIds = nodes?.map(n => n.id) || [];
      const { data: patterns } = await supabase
        .from('patterns')
        .select('*')
        .eq('workspace_id', thread.workspace_id)
        .or(`source_node_id.in.(${nodeIds.join(',')}),target_node_id.in.(${nodeIds.join(',')})`);

      // Get cross-thread links
      const { data: links } = await supabase
        .from('cross_thread_links')
        .select('*')
        .eq('workspace_id', thread.workspace_id)
        .or(`from_node_id.in.(${nodeIds.join(',')}),to_node_id.in.(${nodeIds.join(',')})`);

      // Get thought products from nodes
      const { data: thoughtProducts } = await supabase
        .from('thought_products')
        .select('*')
        .in('source_node_id', nodeIds);

      // Get context items
      const { data: contextItems } = await supabase
        .from('context_items')
        .select('*')
        .or(`node_id.in.(${nodeIds.join(',')}),workspace_id.eq.${thread.workspace_id}`);

      // Get iterations for all nodes
      const { data: iterations } = await supabase
        .from('node_iterations')
        .select('*')
        .in('node_id', nodeIds)
        .order('version', { ascending: false });

      const result = {
        thread,
        nodes: nodes || [],
        patterns: patterns || [],
        links: links || [],
        thoughtProducts: thoughtProducts || [],
        contextItems: contextItems || [],
        iterations: iterations || [],
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }

    default:
      return {
        content: [{ type: 'text', text: `Unknown tool: ${name}` }],
      };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Turbot MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
