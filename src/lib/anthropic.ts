import Anthropic from '@anthropic-ai/sdk';

const apiKey = process.env.ANTHROPIC_API_KEY;

if (!apiKey) {
  throw new Error('Missing ANTHROPIC_API_KEY environment variable');
}

export const anthropic = new Anthropic({ apiKey });

// =============================================================================
// DOUBLE DIAMOND METHODOLOGY - CORE SYSTEM PROMPT
// =============================================================================

export const THINKING_SYSTEM_PROMPT = `You are Turbot, an AI thought partner that helps users think through product and experience design challenges — from early ideas through solution concepts and deliverables.

## Core Function

You use a structured methodology based on the Double Diamond and design thinking approaches, but you meet users where they are rather than forcing a linear path.

**Character Traits:** You are an expert in strategic analysis and design thinking. You always take a consultative approach. You appreciate nuance, thoroughness, and comprehensiveness. You do not rush — you take your time and chew on questions. You're also a pragmatist, leaning on your deep expertise to know when a task is complete enough to move on versus when it requires more exploration.

## 8-Stage Pipeline

The pipeline represents the complete journey from research to deliverables:

1. **Extract Insights** - Extract insights from raw data and research
2. **Persona Creation** - Build user profiles from insights
3. **Vision Stories** - Define ideal future states
4. **Problem Framing** - Identify core problems to solve
5. **Journey Analysis** - Map user experiences
6. **Solution Concepting** - Generate and evaluate solution approaches
7. **Solution Definition** - Develop detailed concepts
8. **Strategic Handoff** - Package outputs for specification and development

Users rarely follow this linearly — they enter wherever they are and move fluidly based on what their work needs.

## How You Work

1. **Meet them where they are** — Engage with their idea, problem, or deliverable directly
2. **Work alongside them** — Help develop their thinking at whatever stage they're in
3. **Surface gaps as observations** — "We're assuming X here. Want to dig into that?"
4. **Offer foundation work as strengthening** — "A quick persona might sharpen this. Want to try?"
5. **Track what's been established vs. assumed** — Maintain awareness without enforcing sequence

## Surfacing Thought Products

When you identify key elements in the conversation, explicitly call them out using this format:

- **Insight:** [observation or learning from research or analysis]
- **Assumption:** [something treated as true but unvalidated]
- **Decision:** [a choice that closes off alternatives]
- **Question:** [an open inquiry needing exploration]
- **Tension:** [two valid perspectives in conflict]
- **Idea:** [a possibility worth exploring]
- **Claim:** [an assertion about reality that could be validated]
- **Principle:** [a guiding rule derived from understanding]

This creates a traceable record of thinking that can be referenced later.

## Divergent-Convergent Awareness

In ideation phases, recognize when to pivot from generating options (divergent) to evaluating them (convergent).

**Signals it's time to converge:**
- New ideas are variations of existing ones, not genuinely new directions
- Multiple distinct approaches have been explored (typically 5+ concepts)
- User signals: "Which should we pursue?" or "Help me decide"
- Natural energy shift — the brainstorm feels complete

When you notice these signals, offer the pivot naturally:
> "We've got several directions here. Want to keep exploring, or start figuring out which ones are worth pursuing?"

## Tone

Be a knowledgeable colleague who's genuinely helpful. Direct when giving guidance, encouraging when seeing progress, honest about limitations. Collaborative, not gatekeeping.

- Professional but warm
- Culturally neutral — avoid idioms that may not translate
- Efficient — keep responses focused and relevant
- Action-biased — bias toward doing rather than asking`;

// =============================================================================
// GROUNDING ANALYSIS PROMPT
// =============================================================================

const GROUNDING_SYSTEM_PROMPT = `You are analyzing how well a claim is grounded in existing knowledge.

Your job is to assess:
1. **What supports this claim** — existing insights, evidence, decisions that validate it
2. **What challenges this claim** — contradicting evidence, tensions, concerns
3. **What assumptions this claim makes** — unvalidated beliefs it depends on
4. **What gaps exist** — missing knowledge that would increase confidence

## Assessment Approach

For each piece of existing knowledge, consider:
- Does it directly support, indirectly support, or contradict the claim?
- How strong is this evidence? (anecdotal → statistical)
- What's the source quality?

## Confidence Scoring

Rate overall confidence 0-1 based on:
- 0.0-0.3: Little/no supporting evidence, significant gaps or contradictions
- 0.4-0.6: Some support but also gaps or unvalidated assumptions
- 0.7-0.8: Good support, minor gaps
- 0.9-1.0: Strong evidence, validated assumptions, minimal gaps

## Output Format

**Supporting:**
- [List evidence that supports the claim with strength assessment]

**Challenging:**
- [List evidence that challenges the claim]

**Assumptions:**
- [List assumptions the claim makes that haven't been validated]

**Gaps:**
- [List missing knowledge that would help assess this claim]

**Confidence:** [0-1 score] — [Brief justification]

**Recommended Actions:**
- [Specific steps to strengthen or validate this claim]`;

// =============================================================================
// PERSONA SIMULATION PROMPT
// =============================================================================

const SIM_MODE_PROMPT_TEMPLATE = `You are simulating a user persona for product/design validation.

## Persona Profile
**Name:** {{name}}
{{#if traits}}
**Traits:**
{{traits}}
{{/if}}
{{#if voice}}
**Voice/Communication style:** {{voice}}
{{/if}}

## Sim Mode Behaviors

**Purpose:** Validate or challenge assumptions through persona embodiment. Give candid feedback and do not be shy about focusing on areas that require more research, deeper thought, or validation with real users.

**Key Behaviors:**
- Complete personality embodiment — stay fully in character
- Use authentic voice, knowledge gaps, emotional patterns
- Be candid and unfiltered — don't soften feedback artificially
- Express natural limitations — what this persona wouldn't know or understand

## Response Guidelines

Respond as this person would respond — with their concerns, priorities, language patterns, and perspective.

When you notice something that validates or challenges an idea, call it out:
- **Validation:** [what resonates and why]
- **Concern:** [what worries you and why]
- **Question:** [what you'd want to know]

Be authentic to the persona. Don't be artificially positive or negative. The goal is to help the user think critically and refine their ideas through realistic feedback.`;

// =============================================================================
// THINKING METHOD PROMPTS
// =============================================================================

export const METHOD_PROMPTS: Record<string, string> = {
  '5whys': `
## Method: 5 Whys Analysis

Apply the 5 Whys technique to dig beneath surface symptoms to root causes.

**Process:**
1. Start with the stated problem or observation
2. Ask "Why does this happen?" and answer
3. For that answer, ask "Why?" again
4. Continue 5 times (or until you hit a root cause)
5. Identify the root cause and potential interventions

**Format your response:**
- **Problem:** [The surface issue]
- **Why 1:** [First layer cause]
- **Why 2:** [Deeper cause]
- **Why 3:** [Deeper still]
- **Why 4:** [Getting to root]
- **Why 5:** [Root cause]
- **Root Cause Insight:** [The fundamental issue]
- **Potential Interventions:** [What could address the root cause]

Surface thought products as you go:
- **[INSIGHT]** for each significant discovery
- **[ASSUMPTION]** for unvalidated beliefs in the chain
- **[TENSION]** for trade-offs revealed
`,

  'root_cause': `
## Method: Root Cause Analysis

Systematically analyze a problem to identify contributing factors and root causes.

**Process:**
1. Define the problem clearly
2. Collect data about what's happening
3. Identify possible causal factors
4. Determine root causes (vs symptoms)
5. Recommend solutions that address root causes

**Categories to consider:**
- People (skills, knowledge, behavior)
- Process (procedures, workflows)
- Tools (technology, equipment)
- Environment (context, constraints)
- Management (policies, incentives)

**Format your response:**
- **Problem Statement:** [Clear definition]
- **Symptoms vs Causes:** [Distinguish surface issues from underlying causes]
- **Contributing Factors:** [List with category]
- **Root Causes:** [The fundamental issues]
- **Recommended Actions:** [Address root causes, not symptoms]

Surface thought products:
- **[INSIGHT]** for root cause discoveries
- **[ASSUMPTION]** for beliefs needing validation
- **[DECISION]** for recommended actions
`,

  'jobs_to_be_done': `
## Method: Jobs-to-be-Done Analysis

Understand what users are trying to accomplish (the "job") independent of any particular solution.

**Core Framework:**
"When [situation], I want to [motivation], so I can [expected outcome]."

**Process:**
1. Identify the functional job (what they're trying to get done)
2. Identify emotional jobs (how they want to feel)
3. Identify social jobs (how they want to be perceived)
4. Map the job stages (before, during, after)
5. Identify where current solutions fall short

**Questions to explore:**
- What are they ultimately trying to achieve?
- What does success look like to them?
- What are they firing (stopping using) to hire this solution?
- What workarounds are they currently using?

**Format your response:**
- **Core Job:** [Functional job statement]
- **Emotional Jobs:** [How they want to feel]
- **Social Jobs:** [How they want to be perceived]
- **Job Stages:** [Before → During → After]
- **Current Solutions & Gaps:** [What's falling short]
- **Opportunity Areas:** [Where to focus]

Surface thought products:
- **[INSIGHT]** for job discoveries
- **[ASSUMPTION]** for hypotheses about motivations
- **[QUESTION]** for areas needing user validation
`,

  'reframe': `
## Method: Problem Reframing

Challenge the initial problem framing to discover more powerful intervention points.

**Reframing Techniques:**
1. **Flip the problem:** What if the opposite were true?
2. **Change the scope:** Zoom in (specific instance) or zoom out (systemic pattern)
3. **Shift perspective:** How would different stakeholders frame this?
4. **Question constraints:** Which constraints are real vs assumed?
5. **Find the problem behind the problem:** What's the deeper issue?

**Process:**
1. State the original problem framing
2. Apply 2-3 reframing techniques
3. Generate alternative framings
4. Evaluate which framing opens more possibilities
5. Recommend a reframed problem statement

**Format your response:**
- **Original Framing:** [How the problem was stated]
- **Reframe 1:** [Alternative framing + rationale]
- **Reframe 2:** [Alternative framing + rationale]
- **Reframe 3:** [Alternative framing + rationale]
- **Recommended Framing:** [Most generative framing]
- **Why This Framing:** [What possibilities it opens]

Surface thought products:
- **[INSIGHT]** for framing discoveries
- **[ASSUMPTION]** for constraints to question
- **[TENSION]** for trade-offs between framings
`,

  'scamper': `
## Method: SCAMPER Ideation

Generate solution ideas by systematically applying transformation lenses.

**SCAMPER Lenses:**
- **S - Substitute:** What can be replaced? Different materials, people, processes?
- **C - Combine:** What can be merged? Features, functions, purposes?
- **A - Adapt:** What can be adjusted? Modified for different context?
- **M - Modify/Magnify/Minimize:** What can be changed in scale, shape, or form?
- **P - Put to other uses:** What else could this be used for? New contexts?
- **E - Eliminate:** What can be removed? Simplified? What's not essential?
- **R - Reverse/Rearrange:** What can be reordered? Flipped? Done backwards?

**Process:**
1. Start with the current solution or concept
2. Apply each lens systematically
3. Generate 1-2 ideas per lens
4. Identify the most promising directions
5. Note which ideas could combine

**Format your response:**
For each lens, generate ideas:
- **Substitute:** [Ideas]
- **Combine:** [Ideas]
- **Adapt:** [Ideas]
- **Modify:** [Ideas]
- **Put to other uses:** [Ideas]
- **Eliminate:** [Ideas]
- **Reverse:** [Ideas]

**Top Concepts:** [3-5 most promising ideas]

Surface thought products:
- **[IDEA]** for each promising concept
- **[ASSUMPTION]** for untested beliefs behind ideas
- **[QUESTION]** for ideas needing exploration
`,

  'crazy8s': `
## Method: Crazy 8s Rapid Ideation

Generate 8 distinct solution concepts quickly to maximize divergent thinking.

**Rules:**
- Quantity over quality — don't self-edit
- Each concept should be meaningfully different
- Sketch the core idea, not the details
- Build on previous ideas or go completely different
- Aim for at least 2-3 "wild" ideas

**Process:**
1. Understand the problem/opportunity
2. Generate 8 distinct concepts rapidly
3. Give each a short name and description
4. Note which feel most promising or novel
5. Identify themes across concepts

**Format your response:**

**Concept 1: [Name]**
[2-3 sentence description]

**Concept 2: [Name]**
[2-3 sentence description]

[...continue through 8]

**Themes Observed:** [Patterns across concepts]
**Most Promising:** [1-2 to develop further]
**Wildest Idea Worth Exploring:** [The unconventional one]

Surface thought products:
- **[IDEA]** for each concept
- **[TENSION]** for trade-offs between approaches
`,

  'how_might_we': `
## Method: How Might We... Questions

Transform insights and problems into generative opportunity questions.

**HMW Formula:**
"How might we [action] for [user] so that [outcome]?"

**Principles:**
- Not too broad (unsolvable) or too narrow (solution embedded)
- Focuses on user benefit, not specific solution
- Opens possibilities rather than constraining
- Can generate multiple solution directions

**Process:**
1. Start with an insight, problem, or need
2. Generate 5-8 HMW variations
3. Vary the scope (narrow to broad)
4. Vary the focus (different aspects of the problem)
5. Select the most generative HMWs

**Variations to try:**
- Change the verb (enable, help, encourage, make it easy to...)
- Change the user (different persona, edge case)
- Change the outcome (different success metric)
- Flip the problem (turn negative into positive)

**Format your response:**
- **Starting Point:** [The insight or problem]
- **HMW 1:** [Question]
- **HMW 2:** [Question]
- **HMW 3:** [Question]
- **HMW 4:** [Question]
- **HMW 5:** [Question]
- **Recommended HMWs:** [Best 2-3 for ideation]
- **Why These:** [What makes them generative]

Surface thought products:
- **[QUESTION]** for each strong HMW
- **[INSIGHT]** for problem understanding gained
`,

  'assumption_mapping': `
## Method: Assumption Mapping

Surface and prioritize the assumptions underlying a concept or strategy.

**Assumption Categories:**
- **Desirability:** Will users want this? (user needs, behaviors, preferences)
- **Viability:** Will this work for the business? (revenue, cost, sustainability)
- **Feasibility:** Can we build this? (technical, operational, resource)

**Risk Assessment:**
- **Confidence:** How sure are we? (evidence level)
- **Impact:** How bad if we're wrong? (severity)
- **Priority:** Confidence × Impact = what to test first

**Process:**
1. List all assumptions behind the concept
2. Categorize (desirability/viability/feasibility)
3. Rate confidence (low/medium/high)
4. Rate impact if wrong (low/medium/high)
5. Prioritize which to validate first

**Format your response:**

| Assumption | Category | Confidence | Impact | Priority |
|------------|----------|------------|--------|----------|
| [Assumption] | Desirability | Low | High | **TEST FIRST** |
| [Continue...] | | | | |

**Highest Risk Assumptions:**
[Top 3-5 that need validation]

**Suggested Validation Methods:**
[How to test each high-priority assumption]

Surface thought products:
- **[ASSUMPTION]** for each identified assumption
- **[QUESTION]** for validation questions
- **[DECISION]** if any assumptions should be accepted/rejected
`,
};

// =============================================================================
// OUTPUT GENERATION PROMPTS
// =============================================================================

export const OUTPUT_TEMPLATES: Record<string, string> = {
  // =============================================================================
  // PERSONA TEMPLATES
  // =============================================================================

  persona_preview: `Generate persona previews based on available research and insights.

# Persona Preview: [Context Description]

Based on available research, I've identified [X] potential personas:

## [Persona Name] "[Handle/Nickname]"
**Who:** [Age/role], [2 key characteristics]
**Context:** [Main situation/challenge - 1 sentence]
**Key Insight:** [Most distinctive behavioral pattern or need]
**Voice:** *"[Representative quote from research]"*

---

## [Persona 2 Name] "[Handle/Nickname]" *(if applicable)*
**Who:** [Age/role], [2 key characteristics]
**Context:** [Main situation/challenge - 1 sentence]
**Key Insight:** [Most distinctive behavioral pattern or need]
**Voice:** *"[Representative quote from research]"*

---

## Next Steps:
Select which persona(s) to develop fully.`,

  persona: `Create a complete persona profile grounded in the provided thought products.

### [Persona Name] "[Handle/Nickname]" [Last Name]

#### Core Identity

##### Demographics
[Age], [Primary Role/Occupation], [Secondary Role/Identity]

##### Key Characteristics
[List of 4-6 defining traits including any challenges/conditions]

##### Primary Context
[Main situation or challenge this persona is dealing with]

#### Activities

##### Daily Routine
[Describe typical day structure including morning, work, evening activities and ongoing habits]

##### Weekly Activities
[List regular weekly commitments with frequency and details]

##### Periodic Activities
[List monthly, quarterly, or seasonal activities and events]

#### Relationships

##### Primary Community/Network
[Describe core relationships, audiences, and collaborative groups]

##### Secondary Network
[Describe professional contacts and industry connections]

##### Support Network
[Describe support people and relevant communities]

#### Channels & Tools

##### Primary Communication
[List main platforms with device types and usage patterns]

##### Information Gathering
[List platforms used for research and information with behaviors]

##### Work & Productivity
[List work tools with device types and any adaptations]

##### Device Preferences
[Describe primary/secondary devices and what they avoid]

#### Conversation Style

##### Rhythm & Flow
[Describe sentence patterns, energy levels, thinking style, and response preferences]

##### Engagement Patterns
[Describe how they ask questions, share experiences, and show interest]

##### Information Processing
[Describe what they need to understand and trust information sources]

#### Voice & Language

##### Vocabulary
[List domain-specific terms, professional language, and emotional expressions they use]

##### Sentence Patterns
[Provide 5 examples of common sentence starters and phrases]

##### Emotional Expression
[Provide examples of how they express 4 key emotions]

#### Motivations & Emotional Triggers

##### What Energizes [Persona]
[List 4 things that excite and motivate them]

##### What Frustrates [Persona]
[List 4 things that cause frustration or distress]

##### What Makes [Persona] Cautious
[List 4 situations that make them hesitant or worried]

#### Emotional Patterns

##### Default State
[Typical emotional state and attitude]

##### When Excited
[How they behave when enthusiastic or hopeful]

##### When Frustrated
[How they express frustration or disappointment]

##### When Helping
[How they behave when assisting others]

##### When Challenged
[How they respond when questioned or confronted]`,

  // =============================================================================
  // JOURNEY TEMPLATE
  // =============================================================================

  journey: `Create a user journey map grounded in the provided thought products.

### Journey Start
[Short description of the persona(s)' starting initial context and the journey they're going on]

### Journey End
[Short description of persona(s)' end state]

### Stages

#### Stage 1: [Name]
##### Short Description
[Use research verbatim when available]

##### Main Goals
- [Goal 1]
- [Goal 2]

##### Main Tasks
- [Task 1]
- [Task 2]

##### Pain Points
- [Pain point with context from insights]

##### Opportunities
- [Where we can improve the experience]

#### Stage 2: [Name]
[Continue pattern for each stage...]

### Stage-by-Stage Analysis
Map each stage to:
- Which thought products (insights, assumptions) inform it
- Where gaps in understanding exist
- What could go wrong

Reference specific personas and their needs throughout.`,

  // =============================================================================
  // ADEPT EVALUATION TEMPLATE
  // =============================================================================

  adept: `Evaluate this solution concept using the ADEPT framework.

# ADEPT Evaluation: [Concept Name]

## Concept Summary
[Brief description of the solution concept being evaluated]

## Factor Assessment

### A: Attractive | [🔴/🟡/🟢] | Evidence: [★ to ★★★★★]
**Question:** How big is the need for this solution?
**Assessment:** [Analysis of pain size/intensity, use case frequency, TAM, existing solutions]
**Evidence basis:** [What this rating is based on - research, assumptions, data]

### D: Doable | [🔴/🟡/🟢] | Evidence: [★ to ★★★★★]
**Question:** How fast and easy is this to build?
**Assessment:** [Analysis of complexity, commitments, time, effort, resources, skills, dependencies]
**Evidence basis:** [What this rating is based on]

### E: Effective | [🔴/🟡/🟢] | Evidence: [★ to ★★★★★]
**Question:** How well does this solution work?
**Assessment:** [Analysis of user benefits, time/cost savings, efficiency, quality, usability, learning curve]
**Evidence basis:** [What this rating is based on]

### P: Practical | [🔴/🟡/🟢] | Evidence: [★ to ★★★★★]
**Question:** How maintainable is this solution?
**Assessment:** [Analysis of building/maintenance costs, sustainability, profitability, ROI, growth potential]
**Evidence basis:** [What this rating is based on]

### T: Targetable | [🔴/🟡/🟢] | Evidence: [★ to ★★★★★]
**Question:** How easily will this reach users?
**Assessment:** [Analysis of discoverability, distribution channels, competitive landscape, unique value prop, adoption barriers]
**Evidence basis:** [What this rating is based on]

## Risk Summary

| Factor | Rating | Evidence | De-Risk Priority |
|--------|--------|----------|------------------|
| [Factor with lowest rating or evidence first] | [🔴/🟡/🟢] | [★ level] | 1 |
| [Next priority] | [🔴/🟡/🟢] | [★ level] | 2 |

## De-Risking Recommendations

### Priority 1: [Factor Name]
**Current concern:** [What makes this rating low or uncertain]
**Recommended action:** [Specific action to reduce uncertainty]
**Research method:** [If applicable, suggested approach]

### Priority 2: [Factor Name]
**Current concern:** [What makes this rating low or uncertain]
**Recommended action:** [Specific action to reduce uncertainty]

## Recommendation

**Verdict:** [Go / Iterate / Park / Drop]

**Rationale:** [2-3 sentences explaining the recommendation based on the ADEPT profile, key risks, and confidence level]

**Next steps:** [If Go or Iterate, what specific actions should follow]`,

  // =============================================================================
  // PROBLEM FRAME TEMPLATE
  // =============================================================================

  problem_frame: `Create a problem frame grounded in the provided thought products.

## Problem Frame Structure

### Current State
What's happening now? Ground in observed behaviors and pain points.

### Desired State
What does success look like? Reference vision and user goals.

### Gap Analysis
What's preventing the desired state? Be specific about blockers.

### Root Causes
Go deeper than symptoms. Use the "5 Whys" approach where helpful.
- Surface cause: [Observable problem]
- Why? [First layer]
- Why? [Deeper cause]
- Root cause: [Fundamental issue]

### Key Constraints
- [Real limitations that bound the solution space]

### Assumptions to Validate
- [ASSUMPTION: Beliefs we're working with but haven't proven]

Reference specific insights and tensions from the thought products.`,

  // =============================================================================
  // SPEC TEMPLATE
  // =============================================================================

  spec: `Create a product specification document grounded in the provided thought products.

## Required Sections

### Problem Statement
What problem are we solving? Ground this in identified pain points and insights.

### Goals & Success Metrics
What does success look like? Reference validated user needs.

### Requirements

**Must Have (P0):**
- [Requirements that are essential — trace to validated needs]

**Should Have (P1):**
- [Important but not critical for launch]

**Nice to Have (P2):**
- [Enhancements for later phases]

### Constraints & Assumptions
- [Known constraints]
- [ASSUMPTION: Items that need validation — flag clearly]

### Open Questions
- [NEEDS CLARIFICATION: Questions for implementation]

Reference specific insights, decisions, and assumptions from the provided thought products.`,

  // =============================================================================
  // USER STORY TEMPLATE
  // =============================================================================

  user_story: `Create user stories grounded in the provided thought products.

## Format
As a [persona], I want [goal] so that [benefit].

## For Each Story Include:

**Acceptance Criteria:**
- [ ] [Observable, testable criteria]

**Priority:** Must / Should / Could

**Grounding:** [Which insights/decisions this traces to]

**Dependencies:** [Other stories this depends on or enables]

**Open Questions:**
- [NEEDS CLARIFICATION: Uncertainties to resolve]

Create stories that map to identified user needs and pain points. Group related stories under epics where appropriate.`,

  // =============================================================================
  // DESIGN BRIEF TEMPLATE
  // =============================================================================

  design_brief: `Create a design brief grounded in the provided thought products.

# Design Brief: [Project/Initiative Name]

## Product Character

### Emotional Qualities
[How should users *feel* when using this product?]

| Quality | Description | Why It Matters |
|---------|-------------|----------------|
| [Emotion] | [What this means] | [Connection to user needs] |
| [Emotion] | [What this means] | [Connection to user needs] |
| [Emotion] | [What this means] | [Connection to user needs] |

**Emotional anti-goals:** [What feelings to actively avoid and why]

### Practical Qualities
[How should the product *behave* in use?]

| Quality | Description | Why It Matters |
|---------|-------------|----------------|
| [Quality] | [What this means in practice] | [Connection to pain points] |
| [Quality] | [What this means in practice] | [Connection to pain points] |

**Practical anti-goals:** [Behaviors to avoid]

### Experiential Qualities
[What should the end-to-end experience be like?]

| Quality | Description | Why It Matters |
|---------|-------------|----------------|
| [Quality] | [What this means for the journey] | [Connection to vision] |
| [Quality] | [What this means for the journey] | [Connection to vision] |

---

## Design Principles

### 1. [Principle Name]
[What this principle means in practice]

**Rationale:** [Why this matters for these users — connect to research]

**Applied:** [Example of how this guides a decision]

### 2. [Principle Name]
[Same structure...]

### 3. [Principle Name]
[Same structure...]

---

## Persona Implications

### [Persona 1 Name]
**Key needs:** [What matters most to them]
**Design implications:** [How this shapes product decisions]
**Watch out for:** [What would alienate or frustrate them]

---

## Experience Architecture

### Navigation Model
[How users move through the product — conceptual, not implementation]

**Primary navigation:** [Top-level concepts users see]

**Key pathways:** [Common flows through the product]
- [Pathway 1]: [Entry] → [Steps] → [Destination]
- [Pathway 2]: [Entry] → [Steps] → [Destination]

### Information Hierarchy
**Primary content:** [What users come for — most prominent]
**Supporting content:** [What aids primary tasks — accessible but secondary]
**System content:** [Settings, meta, admin — minimal presence]

---

## Tensions to Navigate

| Tension | vs. | Guidance |
|---------|-----|----------|
| [Quality A] | [Quality B] | [How to balance] |
| [Quality A] | [Quality B] | [How to balance] |`,

  // =============================================================================
  // ROADMAP TEMPLATE
  // =============================================================================

  roadmap: `Create a product roadmap grounded in the provided thought products.

# Roadmap: [Project/Initiative Name]

## Sequencing Rationale
[Overall logic for how phases are structured — dependencies, risk, value delivery]

---

## Phase 1: [Phase Name]
**Theme:** [One-line description of what this phase accomplishes]

### Journey Coverage
[Which journey stages become functional in this phase]

- [Journey 1]: Stages [X, Y, Z] complete
- [Journey 2]: Stages [A, B] complete

### Epics

| Epic | Rationale |
|------|-----------|
| [Epic 1] | [Why it's in this phase] |
| [Epic 2] | [Why it's in this phase] |

### User Outcome
[What users can accomplish after this phase that they couldn't before]

### Risks & Mitigations
[Key risks in this phase and how they're addressed]

---

## Phase 2: [Phase Name]
**Theme:** [One-line description]

### Journey Coverage
[Additional stages enabled]

### Epics

| Epic | Rationale |
|------|-----------|
| [Epic 3] | [Why this phase] |
| [Epic 4] | [Why this phase] |

### User Outcome
[Expanded capability users gain]

---

## Future / Backlog
**Journey stages not yet scheduled:** [List]

### Parked Concepts
[Ideas evaluated but deferred]

| Concept | Reason Deferred | Revisit When |
|---------|-----------------|--------------|
| [Concept] | [Why not now] | [Trigger for reconsideration] |`,

  // =============================================================================
  // EPICS TEMPLATE
  // =============================================================================

  epics: `Create epics grounded in the provided thought products.

# Epics: [Project/Initiative Name]

## Epic Overview

| Epic | Journey Stage(s) | Phase | Priority |
|------|------------------|-------|----------|
| [Epic 1] | [Stages] | Phase 1 | High |
| [Epic 2] | [Stages] | Phase 1 | High |
| [Epic 3] | [Stages] | Phase 2 | Medium |

---

## Epic: [Epic Name]

### Summary
[2-3 sentence description of what this epic delivers]

### Journey Mapping
**Enables stages:** [Which journey stages this epic makes functional]
**Persona(s):** [Who benefits]

### Problem Addressed
[Specific pain point(s) this epic solves — trace to journey pain points]

### Solution Approach
[High-level approach — what, not how]

### Success Criteria
[Observable, measurable outcomes]

- [ ] [Criterion 1]
- [ ] [Criterion 2]
- [ ] [Criterion 3]

### Priority Signals
**Attractiveness:** [How big is the need?]
**Doability:** [How complex to build?]
**Risk factors:** [What could go wrong?]

### Open Questions
[Assumptions needing validation — use [NEEDS CLARIFICATION] format]

- [NEEDS CLARIFICATION: Question 1]
- [NEEDS CLARIFICATION: Question 2]

### Dependencies
**Depends on:** [Other epics or external factors]
**Enables:** [What this unblocks]

---

## Epic: [Second Epic Name]
[Same structure...]`,

  // =============================================================================
  // STRATEGIC CONTEXT TEMPLATE
  // =============================================================================

  strategic_context: `Create strategic context grounded in the provided thought products.

# Strategic Context: [Project/Initiative Name]

## Problem Landscape

### Core Problem
[Primary problem being solved — one clear statement]

### Contributing Factors
[Underlying causes and contextual factors that create or exacerbate the problem]

- [Factor 1]: [How it contributes]
- [Factor 2]: [How it contributes]
- [Factor 3]: [How it contributes]

### Problem Severity
[Evidence of how significant this problem is — frequency, impact, cost]

---

## User Understanding

### Key Personas
[Summary of primary personas — reference full profiles for detail]

**[Persona 1 Name]**: [One-line description + primary pain point]

**[Persona 2 Name]**: [One-line description + primary pain point]

### Critical Pain Points
[Pain points most relevant to this solution]

1. [Pain point]: [Impact on users]
2. [Pain point]: [Impact on users]
3. [Pain point]: [Impact on users]

### Success Indicators
[What success looks like for users — drawn from vision stories]

- [Indicator]: [How we'd observe this]
- [Indicator]: [How we'd observe this]

---

## Strategic Rationale

### Why This Solution
[Why this approach was chosen over alternatives]

### Why Now
[Urgency factors, market timing, organizational readiness]

### Expected Outcomes
[Business and user outcomes this initiative should produce]`,

  // =============================================================================
  // INFORMATION ARCHITECTURE TEMPLATE
  // =============================================================================

  information_architecture: `Create information architecture grounded in the provided thought products.

# Information Architecture: [Project/Initiative Name]

## Core Entities

| Entity | Description | Key Attributes |
|--------|-------------|----------------|
| [Entity] | [What it is] | [Primary properties] |
| [Entity] | [What it is] | [Primary properties] |
| [Entity] | [What it is] | [Primary properties] |

### Entity Details

#### [Entity Name]
**Description:** [What this entity represents]
**Key attributes:**
- [Attribute]: [Description, data type, constraints]
- [Attribute]: [Description, data type, constraints]

**Relationships:**
- [Relationship verb] → [Other entity] (cardinality)
- [Relationship verb] → [Other entity] (cardinality)

---

## Entity Relationships

### Relationship Diagram
\`\`\`
[Entity A] ──owns──> [Entity B]
[Entity B] ──belongs to──> [Entity C]
[Entity A] ──can access──> [Entity C]
\`\`\`

### Relationship Details

| From | Relationship | To | Cardinality | Description |
|------|--------------|-----|-------------|-------------|
| [Entity] | [verb] | [Entity] | [1:1, 1:N, N:N] | [What this means] |

---

## Taxonomy

### [Category Domain 1]
[What this taxonomy classifies]

\`\`\`
[Top-level category]
├── [Subcategory]
│   ├── [Sub-subcategory]
│   └── [Sub-subcategory]
└── [Subcategory]
\`\`\`

---

## Content Types

### [Content Type Name]
**Purpose:** [Why this content exists]
**Attributes:**
- [Attribute]: [Description]
- [Attribute]: [Description]

**Relationships:** [What it connects to]
**Lifecycle:** [Created by, modified by, archived when]

---

## Controlled Vocabularies

| Domain | Terms | Usage Guidance |
|--------|-------|----------------|
| [Domain] | [Term 1, Term 2, Term 3...] | [When/how to use] |`,

  // =============================================================================
  // HANDOFF NOTES TEMPLATE
  // =============================================================================

  handoff_notes: `Create handoff notes grounded in the provided thought products.

# Handoff Notes: [Project/Initiative Name]

## What's Validated
[Insights and decisions backed by research or testing]

### Research-Backed Insights
- [Insight]: [Source/evidence]
- [Insight]: [Source/evidence]
- [Insight]: [Source/evidence]

### Validated Decisions
- [Decision]: [How it was validated]
- [Decision]: [How it was validated]

---

## What's Assumed
[Hypotheses not yet validated — flag for attention during implementation]

| Assumption | Risk Level | Validation Approach |
|------------|------------|---------------------|
| [Assumption] | High | [How to test] |
| [Assumption] | Medium | [How to test] |
| [Assumption] | Low | [How to test] |

### High-Risk Assumptions
[Detail on the most critical assumptions]

**[Assumption]**
- Why it matters: [Impact if wrong]
- Current confidence: [Low/Medium]
- Suggested validation: [Specific approach]

---

## Out of Scope
[Explicitly excluded from this initiative]

### Excluded from Solution
[Ideas or features considered but not included]

| Item | Reason Excluded | Future Consideration |
|------|-----------------|---------------------|
| [Item] | [Why not included] | [When to revisit] |

### Boundaries
[Explicit boundaries for specs]

- DO NOT: [Boundary]
- DO NOT: [Boundary]

---

## Open Questions for Implementation
[Questions that need resolution during specification or development]

- [NEEDS CLARIFICATION: Question]
- [NEEDS CLARIFICATION: Question]
- [NEEDS CLARIFICATION: Question]`,

  // =============================================================================
  // SOLUTION BRIEF TEMPLATE
  // =============================================================================

  solution_brief: `Create a solution brief that aligns the team on what we're building and why.

# Solution Brief: [Solution Name]

## The Problem We're Solving

### Problem Statement
[One clear statement of the core problem]

### Who Experiences This
[Primary personas affected — reference persona profiles]

### Evidence of the Problem
[Key insights that validate this is a real problem worth solving]
- [Insight]: [Source]
- [Insight]: [Source]

### Cost of Not Solving
[What happens if we don't address this — business and user impact]

---

## Our Solution

### Solution Summary
[2-3 sentence description of what we're building]

### How It Works
[High-level description of the solution approach]

1. [Step/component 1]
2. [Step/component 2]
3. [Step/component 3]

### Why This Approach
[Rationale for choosing this solution over alternatives]

**Alternatives Considered:**
| Alternative | Why Not |
|-------------|---------|
| [Option] | [Reason] |

---

## User Value

### Primary Value Proposition
[What users get — tied to their jobs-to-be-done]

### Journey Impact
[Which journey stages this improves and how]

| Stage | Current Pain | After Solution |
|-------|--------------|----------------|
| [Stage] | [Pain] | [Improvement] |

---

## Scope & Boundaries

### In Scope (Phase 1)
- [Feature/capability]
- [Feature/capability]

### Out of Scope
- [Explicitly excluded item]
- [Explicitly excluded item]

### Key Decisions Made
[Decisions that constrain the solution — with rationale]

| Decision | Rationale | Confidence |
|----------|-----------|------------|
| [Decision] | [Why] | [High/Medium/Low] |

---

## Assumptions & Risks

### Critical Assumptions
[Beliefs we're acting on that need validation]

| Assumption | Risk if Wrong | Validation Plan |
|------------|---------------|-----------------|
| [Assumption] | [Impact] | [How to test] |

### Open Questions
- [NEEDS CLARIFICATION: Question]
- [NEEDS CLARIFICATION: Question]

---

## Success Metrics

### Primary Metric
[The one number that tells us this worked]

### Supporting Metrics
- [Metric]: [Target] — [Why it matters]
- [Metric]: [Target] — [Why it matters]

---

## Next Steps
[Immediate actions to move forward]

1. [Action]
2. [Action]
3. [Action]`,

  // =============================================================================
  // FEATURE SPEC TEMPLATE
  // =============================================================================

  feature_spec: `Create a detailed feature specification grounded in user needs.

# Feature Spec: [Feature Name]

## Overview

### Purpose
[What this feature does and why it matters — 1-2 sentences]

### User Story
As a [persona], I want to [action] so that [benefit].

### Journey Context
[Where this feature fits in the user journey]
- **Journey Stage:** [Stage name]
- **User Goal:** [What they're trying to accomplish]
- **Current Pain:** [What's broken today]

---

## Requirements

### Functional Requirements

#### Must Have (P0)
| ID | Requirement | Acceptance Criteria | Traces To |
|----|-------------|---------------------|-----------|
| F1 | [Requirement] | [How we know it works] | [Insight/Decision ID] |
| F2 | [Requirement] | [Criteria] | [Source] |

#### Should Have (P1)
| ID | Requirement | Acceptance Criteria | Traces To |
|----|-------------|---------------------|-----------|
| F3 | [Requirement] | [Criteria] | [Source] |

#### Could Have (P2)
| ID | Requirement | Acceptance Criteria | Traces To |
|----|-------------|---------------------|-----------|
| F4 | [Requirement] | [Criteria] | [Source] |

### Non-Functional Requirements
- **Performance:** [Requirements]
- **Accessibility:** [Requirements]
- **Security:** [Requirements]

---

## User Flows

### Primary Flow
1. User [action]
2. System [response]
3. User [action]
4. System [response]
5. [Success state]

### Alternate Flows
**[Scenario Name]:**
- Trigger: [What causes this flow]
- Flow: [Steps]
- Outcome: [Result]

### Error States
| Error Condition | User Sees | Recovery Path |
|-----------------|-----------|---------------|
| [Condition] | [Message/State] | [What user can do] |

---

## Edge Cases

| Edge Case | Expected Behavior | Notes |
|-----------|-------------------|-------|
| [Case] | [Behavior] | [Any context] |
| [Case] | [Behavior] | [Context] |

---

## Content Requirements

| Element | Content | Voice/Tone Notes |
|---------|---------|------------------|
| [Button/Label] | [Text] | [Guidance] |
| [Error message] | [Text] | [Guidance] |
| [Empty state] | [Text] | [Guidance] |

---

## Assumptions

| Assumption | Confidence | Impact if Wrong |
|------------|------------|-----------------|
| [Assumption] | [H/M/L] | [Impact] |

---

## Open Questions

- [NEEDS CLARIFICATION: Question for design]
- [NEEDS CLARIFICATION: Question for engineering]
- [NEEDS CLARIFICATION: Question for product]

---

## Dependencies

**Depends On:**
- [Other feature/system]

**Enables:**
- [What this unblocks]`,

  // =============================================================================
  // CONTENT BRIEF TEMPLATE
  // =============================================================================

  content_brief: `Create a content brief to guide content creation.

# Content Brief: [Content Area/Feature]

## Context

### Purpose
[What this content needs to accomplish]

### Target Persona(s)
[Who will read/use this content — reference persona profiles]

**Primary:** [Persona name] — [Key trait relevant to content]
**Secondary:** [Persona name] — [Key trait]

### User Mindset
[What state of mind is the user in when encountering this content?]
- **Emotional state:** [Anxious, curious, frustrated, hopeful...]
- **Knowledge level:** [Novice, intermediate, expert]
- **Context:** [Where they're coming from, what they just did]

---

## Voice & Tone

### Brand Voice
[Overall brand voice characteristics]
- [Characteristic 1]: [What this means in practice]
- [Characteristic 2]: [What this means]
- [Characteristic 3]: [What this means]

### Tone for This Context
[How the voice should flex for this specific content]

| Dimension | Dial Setting | Because... |
|-----------|--------------|------------|
| Formal ↔ Casual | [Where on spectrum] | [Rationale] |
| Serious ↔ Playful | [Where] | [Rationale] |
| Technical ↔ Simple | [Where] | [Rationale] |
| Authoritative ↔ Friendly | [Where] | [Rationale] |

### Voice Examples
**Do say:** "[Example phrase that fits]"
**Don't say:** "[Example phrase that doesn't fit]"

---

## Key Messages

### Primary Message
[The one thing users should take away]

### Supporting Messages
1. [Message] — supports primary by [how]
2. [Message] — supports primary by [how]
3. [Message] — supports primary by [how]

### Proof Points
[Evidence that backs up the messages]
- [Claim]: [Evidence/source]
- [Claim]: [Evidence/source]

---

## Content Inventory

| Content Element | Purpose | Word Count | Priority |
|-----------------|---------|------------|----------|
| [Headline] | [Purpose] | [~X words] | P0 |
| [Body copy] | [Purpose] | [~X words] | P0 |
| [CTA] | [Purpose] | [~X words] | P0 |
| [Help text] | [Purpose] | [~X words] | P1 |

---

## Terminology

### Use These Terms
| Term | Definition | Why |
|------|------------|-----|
| [Term] | [What it means] | [Why this term] |

### Avoid These Terms
| Don't Use | Use Instead | Why |
|-----------|-------------|-----|
| [Term] | [Alternative] | [Reason] |

---

## SEO/Discoverability
[If applicable]

**Target Keywords:** [Keywords]
**Search Intent:** [What users are looking for]

---

## Constraints

- [Character limits, if any]
- [Legal/compliance requirements]
- [Localization considerations]

---

## Success Criteria

[How we know the content is working]
- [Metric/signal]
- [Metric/signal]`,

  // =============================================================================
  // TECHNICAL CONTEXT TEMPLATE
  // =============================================================================

  technical_context: `Create technical context to help engineers make good tradeoff decisions.

# Technical Context: [Feature/System Name]

## Why This Document

This provides the strategic context behind the requirements. Use it to:
- Understand *why* decisions were made
- Make informed tradeoffs during implementation
- Know which assumptions to validate if you hit edge cases

---

## User Context

### Who We're Building For
[Relevant persona characteristics for technical decisions]

**[Persona Name]:**
- Tech savvy: [Level]
- Patience for complexity: [Level]
- Typical device/environment: [Context]
- Key constraint: [What matters most to them]

### Mental Model
[How users think about this — affects information architecture and interaction design]

> Users think of this as [mental model]. They expect [behavior] because [reason].

### What Users Are Actually Trying to Do
[Jobs-to-be-done framing]

**Primary job:** [Job statement]
**Success looks like:** [Observable outcome]
**Failure looks like:** [What to avoid]

---

## Decision Context

### Key Decisions Already Made

| Decision | Why | Confidence | Revisit If... |
|----------|-----|------------|---------------|
| [Decision] | [Rationale grounded in research] | [H/M/L] | [Trigger for reconsidering] |
| [Decision] | [Rationale] | [Level] | [Trigger] |

### Decisions Left to Engineering

These are intentionally left to implementation:
- [Area]: [Guidance on what matters]
- [Area]: [Guidance]

---

## Assumptions That Affect Implementation

| Assumption | Why We Believe It | Risk if Wrong | Your Call |
|------------|-------------------|---------------|-----------|
| [Assumption] | [Evidence] | [Impact] | [What engineer should do if this seems wrong] |

---

## What's Flexible vs. Fixed

### Fixed (Don't Change Without Discussion)
- [Constraint]: [Why it's fixed]
- [Constraint]: [Why]

### Flexible (Use Your Judgment)
- [Area]: [Guidance on what matters]
- [Area]: [Guidance]

---

## Performance Context

### What Users Will Notice
- [Threshold]: [What's acceptable]
- [Threshold]: [What's acceptable]

### What Users Won't Notice
- [Area where you have flexibility]

---

## Error Handling Philosophy

[How to think about errors for this feature]

**User expectation:** [What users expect when things go wrong]
**Recovery priority:** [What matters most — data preservation, quick recovery, clear communication]

---

## Edge Cases Worth Knowing

| Scenario | Frequency | User Expectation |
|----------|-----------|------------------|
| [Edge case] | [Rare/Occasional/Common] | [What they'd expect] |

---

## Questions to Ask Product

If you encounter these situations, check back:
- [Situation]: [Why it needs product input]
- [Situation]: [Why]

---

## Related Context

- [Link to persona profile]
- [Link to journey map]
- [Link to solution brief]`,

  // =============================================================================
  // POSITIONING TEMPLATE
  // =============================================================================

  positioning: `Create a positioning statement grounded in validated user insights.

# Positioning: [Product/Feature Name]

## Positioning Statement

**For** [target persona]
**Who** [key need or problem — grounded in research]
**[Product/Feature]** is a [category]
**That** [primary benefit]
**Unlike** [primary alternative]
**We** [key differentiator]

---

## Target Audience

### Primary Persona
**[Persona Name]**
- **Who they are:** [Brief description]
- **Their situation:** [Context that makes them a fit]
- **Their pain:** [The problem we solve for them]
- **Evidence:** [Research source that validates this]

### Secondary Persona
**[Persona Name]**
- [Same structure]

### Who This Is NOT For
[Explicit anti-personas — who should not use this]
- [Anti-persona]: [Why not]

---

## The Problem We Solve

### Problem Statement
[Clear statement of the problem — grounded in insights]

### Evidence of the Problem
| Insight | Source | Strength |
|---------|--------|----------|
| [Insight] | [Where this came from] | [★ to ★★★★★] |
| [Insight] | [Source] | [Strength] |

### Current Alternatives
[How people solve this today]

| Alternative | What Works | What's Broken |
|-------------|------------|---------------|
| [Solution] | [Strengths] | [Weaknesses we exploit] |
| [Solution] | [Strengths] | [Weaknesses] |

---

## Our Unique Value

### Primary Differentiator
[The one thing that makes us different — grounded in decisions and capabilities]

### Supporting Differentiators
1. [Differentiator]: [Evidence/grounding]
2. [Differentiator]: [Evidence]
3. [Differentiator]: [Evidence]

### Why Now?
[What makes this the right time — market/technology/behavior shifts]

---

## Key Messages

### Headline Message
[The primary message — what we lead with]

### Supporting Messages

| Message | Audience | Proof Point |
|---------|----------|-------------|
| [Message] | [Who it resonates with] | [Evidence that backs it up] |
| [Message] | [Audience] | [Proof] |
| [Message] | [Audience] | [Proof] |

### Messages to Avoid
[What not to say and why]
- [Message to avoid]: [Why — could be unvalidated, off-brand, etc.]

---

## Competitive Frame

### Category
[How we describe what category we're in]

**We say:** "[Category description]"
**Because:** [Why this framing helps us]

### Competitive Positioning Map

| Dimension | Us | Competitor A | Competitor B |
|-----------|----|--------------| -------------|
| [Dimension 1] | [Position] | [Position] | [Position] |
| [Dimension 2] | [Position] | [Position] | [Position] |

---

## Proof Points

[Evidence that backs up our positioning]

| Claim | Proof | Source |
|-------|-------|--------|
| [Claim we make] | [Evidence] | [Where it comes from] |

---

## Assumptions in This Positioning

| Assumption | Confidence | Validation Needed |
|------------|------------|-------------------|
| [Assumption] | [H/M/L] | [How to validate] |

---

## Usage Guidance

**Use this positioning for:**
- [Context: website, sales, etc.]

**Adapt for:**
- [Audience]: [How to flex]

**Review when:**
- [Trigger for revisiting positioning]`,
};

// =============================================================================
// CORE FUNCTIONS
// =============================================================================

export async function generateThinkingResponse(
  prompt: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<string> {
  const messages = [
    ...conversationHistory,
    { role: 'user' as const, content: prompt },
  ];

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    system: THINKING_SYSTEM_PROMPT,
    messages,
  });

  const textBlock = response.content.find((block) => block.type === 'text');
  return textBlock ? textBlock.text : '';
}

export function extractThoughtProducts(
  response: string
): Array<{ type: string; content: string }> {
  const products: Array<{ type: string; content: string }> = [];

  const patterns = [
    { type: 'insight', regex: /\*\*Insight:\*\*\s*(.+?)(?=\n\n|\*\*[A-Z]|$)/gi },
    { type: 'assumption', regex: /\*\*Assumption:\*\*\s*(.+?)(?=\n\n|\*\*[A-Z]|$)/gi },
    { type: 'decision', regex: /\*\*Decision:\*\*\s*(.+?)(?=\n\n|\*\*[A-Z]|$)/gi },
    { type: 'question', regex: /\*\*Question:\*\*\s*(.+?)(?=\n\n|\*\*[A-Z]|$)/gi },
    { type: 'tension', regex: /\*\*Tension:\*\*\s*(.+?)(?=\n\n|\*\*[A-Z]|$)/gi },
    { type: 'idea', regex: /\*\*Idea:\*\*\s*(.+?)(?=\n\n|\*\*[A-Z]|$)/gi },
    { type: 'claim', regex: /\*\*Claim:\*\*\s*(.+?)(?=\n\n|\*\*[A-Z]|$)/gi },
    { type: 'principle', regex: /\*\*Principle:\*\*\s*(.+?)(?=\n\n|\*\*[A-Z]|$)/gi },
  ];

  for (const { type, regex } of patterns) {
    let match;
    while ((match = regex.exec(response)) !== null) {
      products.push({ type, content: match[1].trim() });
    }
  }

  return products;
}

export async function analyzeGrounding(
  claim: string,
  thoughtProducts: Array<{ type: string; content: string; state: string }>,
  evidence: Array<{ content: string; source: string | null; supports: boolean }>
): Promise<string> {
  const tpContext = thoughtProducts.length > 0
    ? `Existing thought products:\n${thoughtProducts.map((tp) => `- [${tp.type}] ${tp.content} (state: ${tp.state})`).join('\n')}`
    : 'No existing thought products in this workspace.';

  const evidenceContext = evidence.length > 0
    ? `\n\nExisting evidence:\n${evidence.map((e) => `- ${e.supports ? 'Supporting' : 'Challenging'}: ${e.content}${e.source ? ` (source: ${e.source})` : ''}`).join('\n')}`
    : '';

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: GROUNDING_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Analyze how well this claim is grounded:\n\n"${claim}"\n\n${tpContext}${evidenceContext}`,
      },
    ],
  });

  const textBlock = response.content.find((block) => block.type === 'text');
  return textBlock ? textBlock.text : '';
}

export async function simulatePersona(
  persona: { name: string; traits: Record<string, unknown>; voice?: string | null },
  prompt: string
): Promise<string> {
  const traitsDescription = Object.entries(persona.traits)
    .map(([key, value]) => `- ${key}: ${value}`)
    .join('\n');

  // Build the system prompt from template
  let systemPrompt = SIM_MODE_PROMPT_TEMPLATE
    .replace('{{name}}', persona.name)
    .replace('{{#if traits}}\n{{traits}}\n{{/if}}', traitsDescription ? traitsDescription : '')
    .replace('{{#if voice}}\n**Voice/Communication style:** {{voice}}\n{{/if}}',
      persona.voice ? `**Voice/Communication style:** ${persona.voice}` : '');

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: systemPrompt,
    messages: [
      { role: 'user', content: prompt },
    ],
  });

  const textBlock = response.content.find((block) => block.type === 'text');
  return textBlock ? textBlock.text : '';
}

export function extractPersonaFeedback(
  response: string
): Array<{ type: 'validation' | 'concern' | 'question'; content: string }> {
  const feedback: Array<{ type: 'validation' | 'concern' | 'question'; content: string }> = [];

  const patterns = [
    { type: 'validation' as const, regex: /\*\*Validation:\*\*\s*(.+?)(?=\n\n|\*\*[A-Z]|$)/gi },
    { type: 'concern' as const, regex: /\*\*Concern:\*\*\s*(.+?)(?=\n\n|\*\*[A-Z]|$)/gi },
    { type: 'question' as const, regex: /\*\*Question:\*\*\s*(.+?)(?=\n\n|\*\*[A-Z]|$)/gi },
  ];

  for (const { type, regex } of patterns) {
    let match;
    while ((match = regex.exec(response)) !== null) {
      feedback.push({ type, content: match[1].trim() });
    }
  }

  return feedback;
}

/**
 * Generate a concise summary of a thinking exchange (node)
 * Used for context continuity when continuing threads
 */
export async function generateNodeSummary(
  userPrompt: string,
  aiResponse: string
): Promise<string> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 150,
    system: `Summarize this thinking exchange in 1-2 sentences. Focus on:
- The key question or topic explored
- The main conclusion, decision, or insight reached
- Any important thought products surfaced (decisions, assumptions, tensions)

Be concise but capture what would be important for context continuity.`,
    messages: [
      {
        role: 'user',
        content: `User asked: "${userPrompt.substring(0, 500)}${userPrompt.length > 500 ? '...' : ''}"\n\nResponse (abbreviated): "${aiResponse.substring(0, 1000)}${aiResponse.length > 1000 ? '...' : ''}"`,
      },
    ],
  });

  const textBlock = response.content.find((block) => block.type === 'text');
  return textBlock ? textBlock.text : '';
}
