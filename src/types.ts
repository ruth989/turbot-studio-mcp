// Database types matching our Supabase schema

export type ThoughtProductType =
  | 'insight'
  | 'idea'
  | 'claim'
  | 'assumption'
  | 'decision'
  | 'question'
  | 'tension'
  | 'principle';

export type ThoughtProductState =
  | 'surfaced'
  | 'claimed'
  | 'supported'
  | 'challenged'
  | 'validated'
  | 'superseded'
  | 'abandoned';

export type EvidenceType = 'quote' | 'observation' | 'data';

export type OutputType =
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

export type MessageRole = 'user' | 'assistant' | 'system';

export type ThreadState = 'active' | 'complete';

export type PipelineStage =
  | 'insights'
  | 'personas'
  | 'vision'
  | 'problems'
  | 'journeys'
  | 'concepting'
  | 'definition'
  | 'handoff';

export type PatternType =
  | 'fork'
  | 'bridge'
  | 'loop'
  | 'join'
  | 'iteration'
  | 'sidebar'
  | 'link';

export type ContextItemType = 'quote' | 'reference' | 'link' | 'document' | 'note';

// Row types
export interface Workspace {
  id: string;
  name: string;
  created_at: string;
}

export interface Thread {
  id: string;
  workspace_id: string;
  title: string | null;
  state: ThreadState;
  spawned_from_node_id: string | null;
  created_at: string;
}

export interface Node {
  id: string;
  thread_id: string;
  message_ids: string[];
  position: number;
  headline: string | null;
  summary: string | null;
  stage: PipelineStage | null;
  created_at: string;
}

export interface Message {
  id: string;
  thread_id: string;
  role: MessageRole;
  content: string;
  model: string | null;
  created_at: string;
}

export interface ThoughtProduct {
  id: string;
  workspace_id: string;
  source_node_id: string | null;
  type: ThoughtProductType;
  content: string;
  summary: string | null;
  state: ThoughtProductState;
  confidence: number;
  influenced_by: string[];
  influences: string[];
  superseded_by: string | null;
  citation_count: number;
  created_at: string;
}

export interface Evidence {
  id: string;
  workspace_id: string;
  thought_product_id: string;
  type: EvidenceType;
  content: string;
  source: string | null;
  supports: boolean;
  created_at: string;
}

export interface Persona {
  id: string;
  workspace_id: string;
  source_node_id: string | null;
  name: string;
  traits: Record<string, unknown>;
  voice: string | null;
  created_at: string;
}

export interface Output {
  id: string;
  workspace_id: string;
  source_node_id: string | null;
  type: OutputType;
  content: Record<string, unknown>;
  establishes: string[];
  depends_on: string[];
  created_at: string;
}

export interface Notebook {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotebookEntry {
  id: string;
  notebook_id: string;
  thought_product_id: string;
  position: number;
  annotation: string | null;
  added_at: string;
}

export interface NodeIteration {
  id: string;
  node_id: string;
  version: number;
  headline: string | null;
  summary: string | null;
  message_ids: string[];
  created_at: string;
}

export interface Pattern {
  id: string;
  workspace_id: string;
  type: PatternType;
  label: string | null;
  source_node_id: string;
  target_node_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface CrossThreadLink {
  id: string;
  workspace_id: string;
  from_node_id: string;
  to_node_id: string;
  link_type: string | null;
  description: string | null;
  created_at: string;
}

export interface ContextItem {
  id: string;
  workspace_id: string;
  node_id: string | null;
  type: ContextItemType;
  title: string | null;
  content: string;
  source_url: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

// Supabase Database type for typed client
export interface Database {
  public: {
    Tables: {
      workspaces: {
        Row: Workspace;
        Insert: Omit<Workspace, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Omit<Workspace, 'id'>>;
      };
      threads: {
        Row: Thread;
        Insert: Omit<Thread, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Omit<Thread, 'id'>>;
      };
      nodes: {
        Row: Node;
        Insert: Omit<Node, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Omit<Node, 'id'>>;
      };
      messages: {
        Row: Message;
        Insert: Omit<Message, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Omit<Message, 'id'>>;
      };
      thought_products: {
        Row: ThoughtProduct;
        Insert: Omit<ThoughtProduct, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Omit<ThoughtProduct, 'id'>>;
      };
      evidence: {
        Row: Evidence;
        Insert: Omit<Evidence, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Omit<Evidence, 'id'>>;
      };
      personas: {
        Row: Persona;
        Insert: Omit<Persona, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Omit<Persona, 'id'>>;
      };
      outputs: {
        Row: Output;
        Insert: Omit<Output, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Omit<Output, 'id'>>;
      };
      node_iterations: {
        Row: NodeIteration;
        Insert: Omit<NodeIteration, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Omit<NodeIteration, 'id'>>;
      };
      patterns: {
        Row: Pattern;
        Insert: Omit<Pattern, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Omit<Pattern, 'id'>>;
      };
      cross_thread_links: {
        Row: CrossThreadLink;
        Insert: Omit<CrossThreadLink, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Omit<CrossThreadLink, 'id'>>;
      };
      context_items: {
        Row: ContextItem;
        Insert: Omit<ContextItem, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Omit<ContextItem, 'id'>>;
      };
    };
  };
}
