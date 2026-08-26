# YUSRA — Design System & Frontend Architecture

> **Document Status:** Active  
> **Version:** 1.0  
> **Last Updated:** 2026-08-25

---

## 1. Design Philosophy

**"Earthy & Serene meets Minimalist Premium"**

Yusra's UI is a single-window desktop application that balances high-tech sophistication with organic warmth. The design draws inspiration from the Yusra logo — a geometric hexagonal form suggesting an abstract bird in flight — translating its clean lines, interlocking shapes, and subtle gradient into a digital interface that feels both futuristic and grounded.

**Core Principles:**
- **Cognitive Load Management:** Limit initial interactions to 3–5 core screens. No step in onboarding has more than 2 actions.
- **Progressive Disclosure:** Introduce advanced features, deep configurations, and permissions contextually as the user explores.
- **Value Demonstration First:** Deliver a tangible "Aha! Moment" early in the flow before asking for heavy commitments like permissions.
- **Frictionless Backtracking:** Allow users to easily skip non-essential steps (like personality customization) or change answers retroactively.

**Brand Identity:**
The Yusra logo mark — an interlocking hexagonal glyph — is the visual seed for the entire design system. Its geometric precision translates to clean grid layouts and crisp edges; its interlocking forms translate to layered glassmorphism; its subtle light-on-dark tracing translates to the refractive edge treatment on every glass panel. The logo is never diluted — it always appears at full fidelity on the `#1C1C1E` canvas.

---

## 2. Color System (60-30-10 Rule)

### 60% — Dominant Base: Deep Space Gray

The canvas that everything sits on. It recedes, creating infinite depth behind the content.

| Token | Hex | Usage |
|-------|-----|-------|
| `--bg-primary` | `#1C1C1E` | Main window background, sidebar base |
| `--bg-secondary` | `#2C2C2E` | Elevated surfaces, cards, code panes |
| `--bg-tertiary` | `#3A3A3C` | Hover states, active panel backgrounds |
| `--bg-overlay` | `rgba(28, 28, 30, 0.85)` | Modal backdrops, command bar blur layer |

**Rationale:** Deep Space Gray creates a sleek, high-end, minimal canvas. It is warmer than pure black (#000000) and more grounded than the PRD's original Deep Carbon (#0A0A0C), fitting the "Earthy" directive. The logo's dark-on-dark edge tracing thrives against this base.

### 30% — Secondary Tone: Pure/Pearl White

The content layer — text, borders, and balance.

| Token | Hex | Usage |
|-------|-----|-------|
| `--text-primary` | `#F5F5F7` | Primary text, headings, labels |
| `--text-secondary` | `#A1A1A6` | Secondary text, captions, hints |
| `--text-tertiary` | `#636366` | Placeholders, disabled states, timestamps |
| `--surface-glass` | `rgba(245, 245, 247, 0.06)` | Glassmorphic panel fill |
| `--surface-glass-hover` | `rgba(245, 245, 247, 0.10)` | Glass panel hover state |
| `--border-subtle` | `rgba(245, 245, 247, 0.08)` | Panel borders, dividers |
| `--border-refractive` | `rgba(255, 255, 255, 0.12)` | Top-edge light refraction on glass panels |

**Rationale:** Pearl White (#F5F5F7) is softer than pure #FFFFFF, creating a warmer, more organic feel. The slight warmth prevents the dark interface from feeling sterile — the "Serene" in the design philosophy.

### 10% — Accent: Moss Green / Tea Green

Used exclusively for active states, focus rings, and highlights. Never for large surface fills.

| Token | Hex | Usage |
|-------|-----|-------|
| `--accent-moss` | `#4A5D23` | Primary accent — active states, selected items, CTA buttons |
| `--accent-moss-light` | `#5A7028` | Accent hover state |
| `--accent-moss-dark` | `#3A4A1B` | Accent pressed state |
| `--accent-tea` | `#8993A3` | Secondary accent — focus rings, secondary CTAs, badges |
| `--accent-tea-light` | `#9AA3B3` | Secondary accent hover |
| `--accent-glow` | `rgba(74, 93, 35, 0.15)` | Soft glow behind hovered/active elements |
| `--accent-border` | `rgba(74, 93, 35, 0.40)` | Active borders, focus indicators |
| `--accent-text` | `#F5F5F7` | Text on accent-colored backgrounds |

**Rationale:** Moss Green is organic, calming, and distinctly different from typical tech blue/cyan. It is the "Earthy" accent — the color of growth, nature, and quiet power. Used sparingly (10%), it creates visual hierarchy without overwhelming the serene atmosphere. Tea Gray (#8993A3) serves as a neutral secondary accent for less prominent interactive states.

### Color Contrast Matrix (WCAG 2.1 AA)

| Element | Foreground | Background | Ratio | Pass |
|---------|------------|------------|-------|------|
| Primary Text | `#F5F5F7` | `#1C1C1E` | 12.5:1 | ✓ AAA |
| Secondary Text | `#A1A1A6` | `#1C1C1E` | 5.2:1 | ✓ AA |
| Tertiary Text | `#636366` | `#1C1C1E` | 3.1:1 | — Large text only |
| Accent on Dark | `#4A5D23` | `#1C1C1E` | 3.8:1 | ✓ Large text |
| White on Accent | `#F5F5F7` | `#4A5D23` | 4.6:1 | ✓ AA |
| Tea on Dark | `#8993A3` | `#1C1C1E` | 4.5:1 | ✓ AA |

---

## 3. Glassmorphism System

### Panel Composition

Every glass panel in Yusra shares this base construction:

```css
.glass-panel {
  position: relative;
  background: var(--surface-glass);
  backdrop-filter: blur(var(--glass-blur, 40px));
  -webkit-backdrop-filter: blur(var(--glass-blur, 40px));
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg, 16px);
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
}
```

### Glass Intensity Levels

| Level | Token | Blur | Fill Opacity | Border Opacity | Usage |
|-------|-------|------|-------------|----------------|-------|
| Light | `--glass-light` | 20px | 0.04 | 0.06 | Tooltips, subtle overlays, inline badges |
| Medium | `--glass-medium` | 40px | 0.06 | 0.08 | Sidebar, cards, chat bubbles, panels |
| Heavy | `--glass-heavy` | 60px | 0.08 | 0.10 | Command bar, modals, danger loop overlay |

### Refractive Edge

A signature detail — every glass panel has a subtle 1px top border that simulates light refracting through the glass surface. This is what makes Yusra's glass feel physical, not flat:

```css
.glass-panel::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    var(--border-refractive) 50%,
    transparent 100%
  );
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  pointer-events: none;
}
```

### Shadow System

| Elevation | Token | Shadow | Usage |
|-----------|-------|--------|-------|
| Level 1 | `--shadow-1` | `0 2px 8px rgba(0, 0, 0, 0.15)` | Buttons, inline cards |
| Level 2 | `--shadow-2` | `0 8px 24px rgba(0, 0, 0, 0.25)` | Dropdowns, popovers, sidebar |
| Level 3 | `--shadow-3` | `0 16px 48px rgba(0, 0, 0, 0.35)` | Modals, command bar, danger loop |
| Inset | `--shadow-inset` | `inset 0 1px 0 rgba(255, 255, 255, 0.05)` | Inner highlight on all glass panels |

---

## 4. Typography

### Font Stack

| Role | Font Family | Fallbacks | Weights |
|------|-------------|-----------|---------|
| **Display** | Space Grotesk | -apple-system, BlinkMacSystemFont, sans-serif | 700 |
| **Heading** | Space Grotesk | -apple-system, BlinkMacSystemFont, sans-serif | 600 |
| **Body** | Inter | -apple-system, BlinkMacSystemFont, sans-serif | 400, 500, 600 |
| **Mono** | JetBrains Mono | SF Mono, 'Cascadia Code', Consolas, monospace | 400, 500 |

### Type Scale

| Token | Size | Line Height | Letter Spacing | Usage |
|-------|------|-------------|----------------|-------|
| `--text-5xl` | 48px | 1.1 | -0.03em | Onboarding hero headline |
| `--text-4xl` | 36px | 1.15 | -0.02em | Section headlines, empty states |
| `--text-3xl` | 30px | 1.2 | -0.02em | Panel titles, onboarding step headers |
| `--text-2xl` | 24px | 1.3 | -0.01em | Card headers, sidebar section titles |
| `--text-xl` | 20px | 1.4 | -0.01em | Sub-headers, chat message author names |
| `--text-lg` | 18px | 1.5 | 0 | Large body text, command bar input |
| `--text-base` | 16px | 1.5 | 0 | Body text, chat messages, terminal output |
| `--text-sm` | 14px | 1.5 | 0 | Labels, metadata, sidebar items |
| `--text-xs` | 12px | 1.4 | 0.01em | Timestamps, badges, fine print |

### Yusra Logo Typography

- **Logo Mark:** Pure SVG — the geometric hexagonal glyph, rendered at any size
- **Wordmark:** Space Grotesk 700, letter-spacing: -0.02em, color: `--text-primary`
- **Logo on Dark:** Pearl White (#F5F5F7) on Deep Space Gray (#1C1C1E)
- **Logo on Light:** Deep Space Gray (#1C1C1E) on Pearl White (#F5F5F7) (for potential light mode export)

---

## 5. Iconography

**Library:** Lucide React  
**Style:** Outline only  
**Default Stroke Width:** 1.5px  
**Sizes:** 16px (compact), 20px (default), 24px (emphasis), 32px (empty states)  
**Color:** Inherits from text color via `currentColor`; accent color for active/selected states

### Custom Icons (SVG)
- **Yusra Logo Mark:** Custom SVG based on the geometric hexagonal form
- **Voice Indicator:** Animated waveform using SVG `<path>` + CSS animation
- **Loading State:** Pulsing/breathing hexagon animation
- **Personality Icons:** Three custom glyphs representing Yusra, Singularity, Custom

---

## 6. Spacing & Layout Tokens

### Spacing Scale (4px base)

| Token | Value | Usage |
|-------|-------|-------|
| `--space-1` | 4px | Tight inline spacing |
| `--space-2` | 8px | Icon gaps, small padding |
| `--space-3` | 12px | Internal card padding |
| `--space-4` | 16px | Standard padding, gaps |
| `--space-5` | 20px | Section spacing |
| `--space-6` | 24px | Panel padding, sidebar width units |
| `--space-8` | 32px | Large gaps |
| `--space-10` | 40px | Section dividers |
| `--space-12` | 48px | Major section spacing |
| `--space-16` | 64px | Page-level padding |

### Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | 8px | Small buttons, badges, inputs |
| `--radius-md` | 12px | Cards, chat bubbles |
| `--radius-lg` | 16px | Glass panels, modals |
| `--radius-xl` | 24px | Command bar, large cards |
| `--radius-full` | 9999px | Circular avatars, pills |

---

## 7. Onboarding Flow

### Step 01 — Value Proposition & Introduction

**Screen:** Full-window dark canvas with centered content  
**Duration:** 3 seconds auto-advance (with manual skip)

**Layout:**
- Centered Yusra logo mark (hexagonal glyph), 120px, with subtle breathing animation (scale 1.0 → 1.02 → 1.0, 4s loop)
- Headline: **"Your Personal AI Entity"** — Space Grotesk 700, 48px, `--text-primary`
- Subheadline: **"100% offline. Private. Powerful."** — Inter 400, 18px, `--text-secondary`
- Primary CTA: **"Get Started"** — Full-width glass button, `--accent-moss` background, 48px height
- Skip link: *"I've done this before"* — text-only, `--text-tertiary`, bottom of screen

**Animation:**
- Logo enters from Z-axis with perspective rotation (rotateX: -15° → 0°), spring physics
- Text fades in with 200ms stagger after logo settles
- CTA slides up from below with fade

### Step 02 — Personality Selection

**Screen:** Three-column card layout  
**Section Header:** **"Choose Your Yusra"** — Space Grotesk 600, 30px

**Personality Cards:**

| # | Name | Tagline | Visual | Accent |
|---|------|---------|--------|--------|
| 1 | **Yusra** | *"The original. Calm, precise, and endlessly capable."* | Geometric hexagonal pattern (logo derivative) | Moss Green |
| 2 | **Singularity** | *"Yusra with your traits. She learns who you are."* | Flowing organic pattern | Tea Green |
| 3 | **Custom** | *"Build from scratch. Define every behavior."* | Blank canvas with editable accent color | User's choice |

**Card Design:**
- Glassmorphic panels (`glass-medium`), 16:9 aspect ratio, 240px min-width
- Each card: icon (40px) + name (Space Grotesk 600, 20px) + tagline (Inter 400, 14px)
- **Hover:** `scale(1.02)` + accent border glow + `--accent-glow` box-shadow
- **Selected:** Full accent border (2px `--accent-moss`) + checkmark overlay (top-right) + elevated shadow
- Cards are mutually exclusive (single select)

**Animation:**
- Cards enter with staggered 3D rotation from Y-axis (rotateY: 15° → 0°), 100ms stagger between cards
- Selected card scales down slightly on click (spring bounce)

### Step 03 — Consent & Authorization

**Screen:** Single-column explanation cards  
**Section Header:** **"What Yusra Needs"** — Space Grotesk 600, 30px  
**Subtext:** *"Yusra runs entirely on your device. These permissions keep her local."* — Inter 400, `--text-secondary`

**Permission Cards:**

| Permission | Icon | Title | Description | Default |
|------------|------|-------|-------------|---------|
| File System | FolderOpen | *"File Access"* | "Read and write files you explicitly approve. She never touches anything without asking." | OFF |
| Shell Execution | Terminal | *"Terminal Access"* | "Run commands you request. Risky operations always require your confirmation." | OFF |
| Local Models | HardDrive | *"Model Storage"* | "Download and store AI models on your device. Sizes range from 1GB to 8GB." | OFF |

**Card Design:**
- Horizontal layout: Icon (24px, `--accent-moss`) | Title + Description | Toggle switch
- Each toggle starts OFF (opt-in only) — toggle uses `--accent-moss` when ON
- Clear, plain-language explanation of why each permission is needed
- "Skip for now" link at bottom — all permissions can be granted later in Settings

**Animation:**
- Cards slide in from left with fade, 100ms stagger
- Toggles animate with spring physics on state change

### Step 04 — Interactive Activation (The Aha! Moment)

**Screen:** Split pane — preview of the main workspace  
**Section Header:** **"Let's try something"** — Space Grotesk 600, 24px

**Layout:**
- Left pane (60%): Chat interface with Yusra avatar and greeting
- Right pane (40%): Live code/terminal view (dimmed initially)

**Flow:**
1. Yusra greets: *"Hi! I'm Yusra. Let me show you what I can do. Ask me to create a file called 'hello.txt'."*
2. User types: *"Create a file called hello.txt with Hello, World!"*
3. Right pane activates — shows Yusra writing the code (syntax-highlighted, animated line-by-line)
4. Terminal shows execution: `$ echo "Hello, World!" > hello.txt` → `✓ Created hello.txt`
5. Yusra responds: *"Done. The file is on your Desktop. You're ready."*
6. Celebration: Subtle particle effect (floating hexagons) + checkmark animation

**Animation:**
- Split pane transition from single-column with smooth width animation
- Code appears character-by-character (typing effect, 30ms per char)
- Terminal output appears with typewriter effect
- Particle celebration: 12-15 small hexagons float upward and fade

### Step 05 — Completion & Transition

**Screen:** Summary and transition  
**Layout:**
- Completion checklist (animated, sequential):
  - [x] Personality selected ✓
  - [x] Permissions configured ✓
  - [x] First task completed ✓
- Primary CTA: **"Enter Yusra"** — Full-width glass button, `--accent-moss`
- Subtle loading bar as main UI loads in background

**Animation:**
- Checklist items animate in sequentially (200ms stagger, checkmark draws in)
- On CTA click: 3D rotation transition (rotateY: 0° → 90° → -90° → 0°) into main workspace
- Main workspace fades in behind the transition

---

## 8. Main Application Layout

### Window Structure

```
┌──────────────────────────────────────────────────────────────┐
│ [Logo] Yusra                          [Settings] [—] [□] [×] │
├────────────┬─────────────────────────────────────────────────┤
│            │                                                 │
│  Sidebar   │               Main Workspace                    │
│  (240px)   │                                                 │
│            │  ┌───────────────────┬────────────────────────┐ │
│  ┌──────┐  │  │                   │                        │ │
│  │ Chat │  │  │   Chat Pane       │   Code/Terminal Pane   │ │
│  ├──────┤  │  │                   │                        │ │
│  │ Code │  │  │   (50%)           │   (50%)                │ │
│  ├──────┤  │  │                   │                        │ │
│  │Memory│  │  └───────────────────┴────────────────────────┘ │
│  │Graph │  │                                                 │
│  ├──────┤  │  ┌────────────────────────────────────────────┐ │
│  │Files │  │  │    Command Bar (Ctrl+Space, floating)      │ │
│  └──────┘  │  └────────────────────────────────────────────┘ │
│            │                                                 │
└────────────┴─────────────────────────────────────────────────┘
```

### Title Bar

- **Height:** 48px
- **Background:** Transparent (window drag region)
- **Left:** Yusra logo mark (24px) + "Yusra" wordmark (Space Grotesk 600, 16px)
- **Right:** Settings icon, minimize, maximize, close
- **Style:** Frameless window (Tauri decorations disabled, custom title bar)

### Sidebar (240px, Collapsible)

| Section | Icon | Content |
|---------|------|---------|
| **Chat** | MessageSquare | Conversation list, active chat highlighted |
| **Code** | Code2 | Recent code executions, saved scripts |
| **Memory** | Brain | Memory graph visualizer (React Flow) |
| **Files** | FolderOpen | File browser, recent files |

**States:**
- **Expanded (240px):** Icons + labels, section headers
- **Collapsed (64px):** Icons only, tooltips on hover
- **Active Item:** `--accent-moss` left border (3px) + `--accent-glow` background
- **Hover:** `--text-secondary` → `--text-primary` transition + `--surface-glass-hover` background
- **Transition:** Width animates with spring physics (200ms)

### Split Pane Workspace

- **Left Pane (Chat):** 50% default width, resizable 30%–70%
- **Right Pane (Code/Terminal):** 50% default width, resizable 30%–70%
- **Divider:** 4px wide, cursor: col-resize, `--accent-moss` on hover
- **Divider Handle:** 16px tall pill (centered), `--bg-tertiary`, visible on hover

### Command Bar (Omni-Overlay)

- **Trigger:** `Ctrl+Space` (global hotkey)
- **Position:** Top center, 60% width, max 640px
- **Design:** Glassmorphic panel (`glass-heavy`), 16px padding, `--radius-xl`
- **Behavior:**
  - Drops down from top with spring animation
  - Background blurs (adds `--bg-overlay` to window)
  - Escape or `Ctrl+Space` again closes
- **Input:** JetBrains Mono, 18px, `--text-primary`, placeholder: *"Ask Yusra anything..."*
- **Results:** Below input, glass panels with command preview, keyboard navigation
- **Recent Commands:** Shown as chips below input

### Chat Pane

- **Messages:** Glass bubbles — user messages right-aligned (`--bg-secondary`), Yusra left-aligned (`--surface-glass`)
- **Avatar:** Yusra logo mark (20px) next to her messages
- **Input Area:** Bottom of pane, glass panel, multiline auto-resize textarea, send button (Moss Green)
- **Typing Indicator:** Three pulsing dots (Moss Green)
- **Code Blocks:** JetBrains Mono, `--bg-tertiary` background, copy button

### Code/Terminal Pane

- **Code View:** Syntax-highlighted, line numbers, copy button
- **Terminal View:** JetBrains Mono, green-on-dark terminal aesthetic
- **Toggle:** Tab bar to switch between Code and Terminal views
- **Execution Status:** Animated indicator (spinning hexagon while running, checkmark when done)

### Memory Graph Visualizer

- **Library:** React Flow
- **Nodes:** Glassmorphic cards (160px × 80px), showing memory snippet + timestamp
- **Edges:** Animated dashed lines, `--accent-tea` color, opacity fades with age
- **Interaction:** Drag nodes, zoom/pan, click to expand memory detail
- **Color Coding:**
  - Recent (< 1 day): `--accent-moss` border
  - Recent (< 7 days): `--accent-tea` border
  - Older: `--text-tertiary` border
- **Empty State:** Hexagonal wireframe with "Your memory graph will grow here"

### Danger Loop Modal

- **Trigger:** Risky command detection (High or Critical risk level)
- **Visual:** Full-screen dim overlay (`--bg-overlay`), centered modal
- **Modal:** Glassmorphic panel (`glass-heavy`), 480px wide, `--radius-xl`
- **Warning Icon:** Large hexagon with ⚠️ (Moss Green, 48px)
- **Title:** **"Command Requires Approval"** — Space Grotesk 600, 24px
- **Message:** Plain-language explanation of the risk
- **Command Display:** JetBrains Mono, syntax-highlighted, `--bg-tertiary` background, scrollable
- **Actions:**
  - **"Approve"** — `--accent-moss` background, right side
  - **"Deny"** — Ghost button, left side
- **Animation:** Modal drops from top with spring physics, background blur increases

### LLM Fit Manager (Settings Panel)

- **Location:** Settings → Models tab
- **Device Gauge:** Circular progress ring showing RAM/CPU utilization
  - Green zone (< 60%): `--accent-moss`
  - Yellow zone (60–80%): `--accent-tea`
  - Red zone (> 80%): `--text-tertiary`
- **Model List:** Downloaded models as glass cards with:
  - Model name, size, quantization type
  - Performance score (tokens/sec)
  - Active indicator (Moss Green dot)
- **Actions:** "Find Best Model" button, download progress bar, load/unload toggle
- **Empty State:** "No models downloaded yet. Click 'Find Best Model' to get started."

---

## 9. Animation & Motion

### Framer Motion Configuration

```typescript
// Spring physics — natural, organic feel
const spring = {
  type: "spring",
  stiffness: 300,
  damping: 30,
  mass: 0.8
};

// Easing curves — smooth, premium transitions
const ease = {
  default: [0.4, 0, 0.2, 1],      // Standard
  enter: [0, 0, 0.2, 1],           // Ease out
  exit: [0.4, 0, 1, 1],            // Ease in
  bounce: [0.68, -0.55, 0.27, 1.55] // Bounce
};

// Durations
const duration = {
  instant: 100,
  fast: 200,
  normal: 300,
  slow: 500,
  dramatic: 800
};
```

### 3D Transitions

| Element | Animation | Parameters |
|---------|-----------|------------|
| Onboarding steps | Y-axis rotation | rotateY: ±15°, spring |
| Panel transitions | Z-axis movement | translateZ: ±20px, 300ms |
| Card hovers | Scale + tilt | scale(1.02), rotate(±2°), spring |
| Modal entry | Drop from top | translateY: -40px → 0, spring |
| Sidebar collapse | Width shrink | 240px → 64px, spring |
| Command bar | Drop down | translateY: -20px → 0, spring |

### Micro-Interactions

- **Button hover:** Scale(1.02) + accent glow, 200ms
- **Button press:** Scale(0.98), 100ms
- **Toggle switch:** Spring animation, 300ms
- **Focus ring:** Outline offset 2px + accent glow, 150ms
- **Typing indicator:** Three dots pulsing in sequence, 600ms loop
- **Loading spinner:** Rotating hexagon, 1200ms loop

### Reduced Motion

- All animations respect `prefers-reduced-motion: reduce` system setting
- Toggle in Settings: **"Reduce Motion"** — disables all 3D transitions, replaces with simple fades
- When enabled:
  - All `rotateX/Y/Z` → opacity fade
  - All `scale` → instant state change
  - All spring physics → linear 200ms
  - Particle effects → disabled

---

## 10. Responsive Behavior

### Window Size Breakpoints

| Mode | Width | Behavior |
|------|-------|----------|
| **Compact** | < 900px | Sidebar collapsed (64px), single pane mode |
| **Standard** | 900–1400px | Full sidebar (240px), split pane |
| **Wide** | > 1400px | Full sidebar, split pane with generous padding |

### Compact Mode Adaptations (< 900px)

- Sidebar: Auto-collapses to 64px (icon-only)
- Split pane: Stacks vertically (chat on top, code below)
- Command bar: Full width with 16px margin
- Onboarding: Single-column layout, cards stack vertically

### Wide Mode Adaptations (> 1400px)

- Maximum content width: 1200px (centered with auto margins)
- Extra padding: 48px on sides
- Chat/Code panes: Max 560px each

---

## 11. Frontend Architecture Rules

### Technology Stack

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| Framework | Tauri | 2.x | Native desktop wrapper, Rust IPC bridge |
| UI Library | React | 18.x | Component rendering |
| Build Tool | Vite | 5.x | Fast dev server, optimized builds |
| Styling | TailwindCSS | 3.x | Utility-first CSS with design tokens |
| Animation | Framer Motion | 11.x | Physics-based animations |
| Icons | Lucide React | Latest | Consistent icon set |
| State | Zustand | 4.x | Lightweight global state |
| Graph | React Flow | 11.x | Memory graph visualization |
| Markdown | react-markdown | Latest | Chat message rendering |
| Code Highlight | Shiki | Latest | Syntax highlighting |
| Fonts | Google Fonts | — | Space Grotesk, Inter, JetBrains Mono |

### CRITICAL RULE: Zero Direct LLM/Voice/Shell Calls

**ABSOLUTE CONSTRAINT — NO EXCEPTIONS:**

The frontend makes **ZERO** direct HTTP calls to LLMs, voice services, or shell execution. The frontend is a pure presentation layer. Every interaction with the Rust backend goes through Tauri IPC:

```
Frontend (React / TypeScript)
    │
    │  Tauri invoke()
    │
    ├── invoke("llm_chat", { prompt, personality, context })
    ├── invoke("llm_complete", { prompt, model })
    ├── invoke("llm_stream_chat", { prompt, personality })
    ├── invoke("voice_tts", { text, voice })
    ├── invoke("voice_stt", { audio_data })
    ├── invoke("shell_execute", { command, cwd })
    ├── invoke("file_read", { path })
    ├── invoke("file_write", { path, content })
    ├── invoke("file_list", { dir })
    ├── invoke("model_list")
    ├── invoke("model_download", { model_id })
    ├── invoke("model_load", { model_path })
    ├── invoke("memory_search", { query })
    ├── invoke("memory_store", { prompt, response })
    ├── invoke("get_persona")
    ├── invoke("set_persona", { persona_type, config })
    ├── invoke("get_settings")
    └── invoke("update_settings", { key, value })
    │
    ▼
Tauri IPC Bridge (type-safe, async)
    │
    ▼
Rust Backend (src-tauri/src/)
```

**Why this matters:**
1. **Security:** No API keys or endpoints exposed to the frontend (inspector, DevTools)
2. **Offline guarantee:** All LLM calls are local; frontend cannot accidentally call cloud APIs
3. **Type safety:** Tauri IPC generates TypeScript types from Rust structs
4. **Performance:** Rust handles all heavy computation; frontend stays at 60fps

### State Management (Zustand)

| Store | Purpose | Persistence |
|-------|---------|-------------|
| `useAppStore` | Window state, active view, sidebar collapsed | No |
| `useChatStore` | Conversation history, active chat, streaming state | SQLite (via IPC) |
| `useMemoryStore` | Memory graph nodes/edges | SQLite (via IPC) |
| `useModelStore` | Downloaded models, active model, download progress | SQLite (via IPC) |
| `useOnboardingStore` | Current step, selections, completion state | localStorage |
| `useSettingsStore` | All user preferences | SQLite (via IPC) |
| `usePersonaStore` | Active persona, personality config | SQLite (via IPC) |
| `useDangerStore` | Pending confirmations, risk levels | In-memory only |

### Component Structure

```
src/
├── components/
│   ├── ui/                    # Reusable primitives
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Modal.tsx
│   │   ├── Toggle.tsx
│   │   ├── Input.tsx
│   │   ├── Badge.tsx
│   │   ├── Tooltip.tsx
│   │   ├── GlassPanel.tsx
│   │   └── LoadingSpinner.tsx
│   ├── layout/
│   │   ├── TitleBar.tsx
│   │   ├── Sidebar.tsx
│   │   ├── SidebarSection.tsx
│   │   ├── CommandBar.tsx
│   │   └── SplitPane.tsx
│   ├── chat/
│   │   ├── ChatPane.tsx
│   │   ├── MessageList.tsx
│   │   ├── MessageBubble.tsx
│   │   ├── ChatInput.tsx
│   │   ├── TypingIndicator.tsx
│   │   └── CodeBlock.tsx
│   ├── code/
│   │   ├── CodePane.tsx
│   │   ├── CodeViewer.tsx
│   │   ├── Terminal.tsx
│   │   ├── SyntaxHighlighter.tsx
│   │   └── ExecutionStatus.tsx
│   ├── memory/
│   │   ├── MemoryGraph.tsx
│   │   ├── MemoryNode.tsx
│   │   ├── MemoryEdge.tsx
│   │   └── MemoryDetail.tsx
│   ├── onboarding/
│   │   ├── OnboardingFlow.tsx
│   │   ├── WelcomeStep.tsx
│   │   ├── PersonalityStep.tsx
│   │   ├── PermissionsStep.tsx
│   │   ├── ActivationStep.tsx
│   │   ├── CompletionStep.tsx
│   │   └── PersonalityCard.tsx
│   ├── settings/
│   │   ├── SettingsPanel.tsx
│   │   ├── InferenceSettings.tsx
│   │   ├── TerminalSettings.tsx
│   │   ├── UISettings.tsx
│   │   └── ModelManager.tsx
│   └── danger/
│       ├── DangerModal.tsx
│       └── CommandPreview.tsx
├── hooks/
│   ├── useIPC.ts              # Typed wrapper for invoke()
│   ├── useStreamingChat.ts    # SSE/streaming chat hook
│   ├── useKeyboard.ts         # Global keyboard shortcuts
│   ├── useWindowResize.ts     # Responsive breakpoint detection
│   └── useVoiceInput.ts       # Microphone audio capture
├── stores/
│   ├── appStore.ts
│   ├── chatStore.ts
│   ├── memoryStore.ts
│   ├── modelStore.ts
│   ├── onboardingStore.ts
│   ├── settingsStore.ts
│   ├── personaStore.ts
│   └── dangerStore.ts
├── lib/
│   ├── types.ts               # Shared TypeScript types
│   ├── constants.ts           # Design tokens, breakpoints
│   ├── ipc.ts                 # Typed invoke wrappers
│   └── utils.ts               # Formatting, helpers
├── styles/
│   ├── globals.css            # Base styles, font imports
│   └── tailwind.config.ts     # Design token integration
├── App.tsx
└── main.tsx
```

### Tailwind Configuration

All design tokens are enforced through Tailwind — no arbitrary values in components:

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        space: {
          50: '#F5F5F7',   // text-primary
          100: '#A1A1A6',  // text-secondary
          200: '#636366',  // text-tertiary
          300: '#3A3A3C',  // bg-tertiary
          400: '#2C2C2E',  // bg-secondary
          500: '#1C1C1E',  // bg-primary
        },
        moss: {
          DEFAULT: '#4A5D23',
          light: '#5A7028',
          dark: '#3A4A1B',
          glow: 'rgba(74, 93, 35, 0.15)',
        },
        tea: {
          DEFAULT: '#8993A3',
          light: '#9AA3B3',
          dark: '#7A8393',
        },
      },
      fontFamily: {
        display: ['Space Grotesk', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      backdropBlur: {
        'glass-light': '20px',
        'glass-medium': '40px',
        'glass-heavy': '60px',
      },
      borderRadius: {
        'sm': '8px',
        'md': '12px',
        'lg': '16px',
        'xl': '24px',
      },
      boxShadow: {
        'glass-1': '0 2px 8px rgba(0, 0, 0, 0.15)',
        'glass-2': '0 8px 24px rgba(0, 0, 0, 0.25)',
        'glass-3': '0 16px 48px rgba(0, 0, 0, 0.35)',
        'accent-glow': '0 0 20px rgba(74, 93, 35, 0.15)',
      },
    },
  },
  plugins: [],
};

export default config;
```

---

## 12. Accessibility

### WCAG 2.1 AA Compliance

| Criterion | Implementation |
|-----------|----------------|
| Contrast | All text meets 4.5:1 minimum (see Color Contrast Matrix) |
| Focus | Visible focus rings using `--accent-tea` outline + `--accent-glow` shadow |
| Keyboard | Full tab order, Escape closes modals/command bar, arrow keys navigate lists |
| Screen Reader | ARIA labels on all interactive elements, roles on custom components |
| Motion | Respects `prefers-reduced-motion`, toggle in Settings |
| Touch | Min 44×44px tap targets (applicable for future mobile port) |

### Color Independence

- Never use color alone to convey information
- Always pair color with icon, text, or pattern
- Example: Error state = red border + ⚠️ icon + "Error" text

---

## 13. Design Tokens Reference (CSS Custom Properties)

```css
:root {
  /* === Colors: 60% Base === */
  --bg-primary: #1C1C1E;
  --bg-secondary: #2C2C2E;
  --bg-tertiary: #3A3A3C;
  --bg-overlay: rgba(28, 28, 30, 0.85);

  /* === Colors: 30% Secondary === */
  --text-primary: #F5F5F7;
  --text-secondary: #A1A1A6;
  --text-tertiary: #636366;
  --surface-glass: rgba(245, 245, 247, 0.06);
  --surface-glass-hover: rgba(245, 245, 247, 0.10);
  --border-subtle: rgba(245, 245, 247, 0.08);
  --border-refractive: rgba(255, 255, 255, 0.12);

  /* === Colors: 10% Accent === */
  --accent-moss: #4A5D23;
  --accent-moss-light: #5A7028;
  --accent-moss-dark: #3A4A1B;
  --accent-tea: #8993A3;
  --accent-tea-light: #9AA3B3;
  --accent-glow: rgba(74, 93, 35, 0.15);
  --accent-border: rgba(74, 93, 35, 0.40);
  --accent-text: #F5F5F7;

  /* === Glass === */
  --glass-blur: 40px;

  /* === Typography === */
  --font-display: 'Space Grotesk', sans-serif;
  --font-body: 'Inter', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  /* === Spacing === */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;

  /* === Border Radius === */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 24px;
  --radius-full: 9999px;

  /* === Shadows === */
  --shadow-1: 0 2px 8px rgba(0, 0, 0, 0.15);
  --shadow-2: 0 8px 24px rgba(0, 0, 0, 0.25);
  --shadow-3: 0 16px 48px rgba(0, 0, 0, 0.35);
  --shadow-inset: inset 0 1px 0 rgba(255, 255, 255, 0.05);

  /* === Layout === */
  --sidebar-width: 240px;
  --sidebar-collapsed: 64px;
  --titlebar-height: 48px;
  --command-bar-width: 640px;
}
```

---

*End of DESIGN.md*
