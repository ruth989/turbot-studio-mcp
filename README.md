# Turbot MCP Server

An MCP (Model Context Protocol) server that brings Double Diamond design thinking methodology to AI coding assistants. Helps engineers **think through what to build** with structured reasoning, evidence-grounded decisions, and traceable lineage.

## What It Does

Turbot exposes design thinking tools to Claude Desktop, Claude Code, and other MCP-compatible clients:

- **Structured Thinking**: Apply methods like 5 Whys, SCAMPER, Jobs-to-be-Done, and How Might We
- **Thought Products**: Capture and track insights, decisions, assumptions, tensions, and questions
- **Evidence Grounding**: Link claims to supporting/challenging evidence with confidence scores
- **Persona Simulation**: Validate ideas against user personas
- **Output Generation**: Create specs, briefs, roadmaps, and other deliverables grounded in your research
- **Traceability**: See what influenced each decision and what depends on it

## Quick Start

### Prerequisites

- Node.js 18+
- [Supabase](https://supabase.com) account (free tier works)
- [Anthropic API key](https://console.anthropic.com/)

### 1. Install

```bash
npm install -g @turbot/mcp-server
```

### 2. Set Up Supabase

Create a new Supabase project and run the migrations in order:

```bash
# Clone for migrations
git clone https://github.com/ruthkaufman/turbot-studio.git
cd turbot-studio/supabase/migrations

# Run each migration in Supabase SQL Editor:
# 001_initial_schema.sql
# 002_outputs.sql
# 003_notebooks.sql
# 004_citation_count.sql
# 005_new_output_types.sql
```

### 3. Configure Environment

Create a `.env` file or set environment variables:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
ANTHROPIC_API_KEY=your-anthropic-api-key
```

### 4. Add to Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "turbot": {
      "command": "turbot-studio",
      "env": {
        "SUPABASE_URL": "https://your-project.supabase.co",
        "SUPABASE_ANON_KEY": "your-anon-key",
        "ANTHROPIC_API_KEY": "your-anthropic-api-key"
      }
    }
  }
}
```

Restart Claude Desktop.

## Available Tools

### Core Thinking
| Tool | Description |
|------|-------------|
| `turbot_think` | Start a thinking session with optional method (5whys, scamper, jobs_to_be_done, etc.) |
| `turbot_capture` | Manually capture a thought product (insight, decision, assumption, etc.) |
| `turbot_mode` | Get methodology guidance for current context |

### Workspace Management
| Tool | Description |
|------|-------------|
| `turbot_workspace_create` | Create a new workspace for a project |
| `turbot_workspace_list` | List all workspaces |
| `turbot_status` | Get workspace progress summary |
| `turbot_pipeline_status` | Visual 8-stage Double Diamond pipeline |

### Validation & Evidence
| Tool | Description |
|------|-------------|
| `turbot_ground` | Check what supports or challenges a claim |
| `turbot_evidence` | Add evidence to a thought product |
| `turbot_trace` | Trace lineage of a thought product |
| `turbot_link` | Connect related thought products |
| `turbot_update_state` | Update thought product state (validated, challenged, etc.) |

### Personas & Simulation
| Tool | Description |
|------|-------------|
| `turbot_sim` | Talk to a persona for validation |
| `turbot_persona_list` | List personas in workspace |

### Output Generation
| Tool | Description |
|------|-------------|
| `turbot_create` | Generate outputs (spec, persona, journey, roadmap, etc.) |
| `turbot_evaluate` | ADEPT framework evaluation |
| `turbot_output_list` | List generated outputs |

### Search & Discovery
| Tool | Description |
|------|-------------|
| `turbot_thought_list` | List thought products with filters |
| `turbot_search` | Search across all content |

### Notebooks
| Tool | Description |
|------|-------------|
| `turbot_notebook_create` | Create a notebook for organizing thoughts |
| `turbot_notebook_add` | Add thought products to notebook |
| `turbot_notebook_list` | List notebooks |
| `turbot_notebook_view` | View notebook contents |
| `turbot_notebook_note` | Add freeform notes |
| `turbot_notebook_remove` | Remove items from notebook |

## Thinking Methods

Use with `turbot_think`:

| Method | Use When |
|--------|----------|
| `5whys` | Finding root causes of problems |
| `root_cause` | Systematic problem analysis |
| `jobs_to_be_done` | Understanding user motivations |
| `reframe` | Shifting perspective on a problem |
| `scamper` | Generating creative variations |
| `crazy8s` | Rapid ideation |
| `how_might_we` | Converting problems to opportunities |
| `assumption_mapping` | Identifying and prioritizing assumptions to test |

## Output Types

Use with `turbot_create`:

| Type | Description |
|------|-------------|
| `spec` | Technical specification |
| `user_story` | User story with acceptance criteria |
| `journey` | User journey map |
| `problem_frame` | Problem framing document |
| `design_brief` | Design brief |
| `roadmap` | Product roadmap |
| `persona` / `persona_preview` | User persona |
| `epics` | Epic breakdown |
| `strategic_context` | Strategic context for stakeholders |
| `information_architecture` | IA document |
| `handoff_notes` | Engineering handoff |
| `solution_brief` | Solution overview |
| `feature_spec` | Detailed feature spec |
| `content_brief` | Content/copy guidance |
| `technical_context` | Technical decision context |
| `positioning` | GTM positioning |
| `adept` | ADEPT evaluation |

## Example Usage

In Claude Desktop:

```
User: I'm building a new feature for user onboarding. Help me think through it.

Claude: Let me create a workspace and start thinking through this systematically.
[Calls turbot_workspace_create]
[Calls turbot_think with jobs_to_be_done method]
[Captures insights and assumptions]
[Calls turbot_sim to validate with a persona]
[Calls turbot_create type="solution_brief"]
```

## Development

```bash
git clone https://github.com/ruthkaufman/turbot-studio.git
cd turbot-studio
npm install
cp .env.example .env
# Edit .env with your credentials
npm run build
npm start
```

## License

MIT

## Contributing

Issues and PRs welcome at [github.com/ruthkaufman/turbot-studio](https://github.com/ruthkaufman/turbot-studio)
