YUSRA — AI Developer Contract & Execution Plan
You are an elite developer assigned to build the Yusra Desktop Application. You must strictly follow the PRD.md and your specific Phase below.

CRITICAL RULES FOR ALL AI AGENTS
NO MOCKS (Unless Frontend Phase 1): The frontend may use mock data temporarily to allow visual testing. The backend must be 100% real logic.
NO HALLUCINATIONS: Do not claim a file is written unless you have used the file-writing tool. Do not claim a build succeeds unless you see the output.
STRICT DESIGN: Follow the Deep Carbon color palette exactly.
USE SKILLS: You have access to a global library of skills. You MUST load and apply them using /skill <skill-name> before writing code.
PHASE 1: FRONTEND DEVELOPER (Run First)
Model: MiniMax M3 or M2.7Directory: C:\Users\admin\OneDrive\Desktop\Yusra

STEP 0: LOAD SKILLS & GITHUB SETUP
Load required skills:
/skill tauri-desktop
/skill tailwindcss
/skill design-systems
/skill core-workflow
/skill ponytail
Check if a GitHub repo named Yusra exists under HASH-CREATES.
If it does NOT exist: Initialize git, create the repo (gh repo create Yusra --public --source . --remote origin --push), and commit the existing PRD.md, DEV.md, and assets.
If it DOES exist: Ask the user if they want to continue in it or overwrite it.
STEP 1: ANALYZE ASSETS
Look in the root directory for Yusra Logo .png. This is the official logo.
Look in the Ui example folder. View the .png screenshots and read ONBOARDING STRUCTURE.json. You must replicate the layout, aesthetic, and flow shown in these examples.
STEP 2: INITIALIZE TAURI + REACT
Run: cmd.exe /c "C:\tmp\rustenv.bat npm create tauri-app@latest . -- --template react-ts"
Install frontend deps: cd C:\Users\admin\OneDrive\Desktop\Yusra; npm install tailwindcss framer-motion lucide-react react-flow d3
STEP 3: BUILD THE UI (Deep Carbon Liquid Glass)
Configure tailwind.config.js with the exact hex codes from PRD.md.
Onboarding: Build the 5-step flow from ONBOARDING STRUCTURE.json. Use Framer Motion for 3D rotateY perspective transitions between steps. Use Yusra Logo .png in the hero section.
Main Layout: Build the Split Pane layout (Chat on left, Code/Terminal on right).
Command Bar: Implement a floating, glassmorphic search bar at the top triggered by Ctrl+Space.
Settings: Build the LLM Fit Manager UI and User Tweakable Settings UI.
Glass Styling: Use CSS backdrop-filter: blur(40px) and background: rgba(20, 20, 24, 0.7) for all panels.
STEP 4: MOCK THE BRIDGE & BUILD
Create a src/lib/mockApi.ts that returns promises with fake data so the UI is fully interactive.
Run cmd.exe /c "C:\tmp\rustenv.bat npm run tauri dev" to ensure the desktop app opens and renders perfectly.
Commit and push all frontend code to GitHub.