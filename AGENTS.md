# AGENTS.md

## Project

Repository: `geo-explorer`

This project is developed and maintained with Pi Coding Agent.

The agent must follow the rules in this file for all tasks unless the user explicitly overrides a rule.

---

# Vision Model Policy

The primary coding model may not support image input.

A dedicated visual subagent is available:

`vision-reviewer`

Model:

`zhipu-vision/glm-4.6v-flash`

This agent MUST be used whenever actual image understanding is required.

Examples include:

- reading a reference design
- analyzing screenshots
- comparing screenshots
- visual UI validation
- UI reconstruction
- image-based design analysis

Do not pretend to visually inspect an image using a text-only model.

When the parent model cannot read images directly:

delegate the image task to `vision-reviewer`.

For UI reconstruction, use:

reference image
→ implementation
→ headless screenshot
→ vision-reviewer
→ visual differences
→ parent agent fixes code
→ screenshot again
→ vision-reviewer again

The parent coding model remains responsible for implementation.

The vision-reviewer is responsible for visual analysis.

For significant UI reconstruction tasks, visual QA should use the vision-reviewer before declaring completion.

# 1. Core Principles

Always prefer:

* focused changes
* existing project architecture
* existing assets
* existing tools
* existing plugins
* existing APIs
* existing business logic

Do not unnecessarily rebuild or redesign unrelated parts of the project.

Before changing anything:

1. inspect the current working directory
2. inspect relevant files
3. inspect `git status`
4. understand the current implementation
5. understand the requested target
6. only then modify code

Do not guess file paths, APIs, project structure, or available commands.

---

# 2. Git Safety

Before editing:

```bash
git status
```

After editing:

```bash
git diff
```

Never automatically:

* commit
* push
* reset
* force reset
* delete branches
* clean unrelated files
* overwrite unrelated user changes

unless explicitly requested.

If the working tree already contains user modifications:

preserve them.

Do not revert or overwrite unrelated changes.

---

# 3. Change Scope

Keep changes focused on the requested task.

Do not modify unrelated:

* business logic
* APIs
* data models
* routing
* stores
* tests
* configuration
* assets

unless required.

Prefer:

```text
small correct change
```

over:

```text
large unnecessary rewrite
```

However, if the current presentation structure prevents accurate UI reconstruction, the presentation layer may be refactored.

Prefer:

```text
preserve business logic
+
refactor presentation layer
```

---

# 4. Visual Design Source of Truth

Primary UI design reference directory:

```text
design/reference/expedition-v2
```

These reference images are authoritative.

They are not inspiration.

They are the target implementation.

The goal is:

> Reconstruct the supplied design as faithfully as technically possible.

Do not redesign the reference according to personal preference.

When the current UI conflicts with the reference:

* visual presentation should follow the reference
* business logic should remain intact where possible

---

# 5. Mandatory UI Reconstruction Workflow

For every significant UI task, follow this workflow:

```text
inspect reference
↓
inspect current implementation
↓
analyze visual differences
↓
modify implementation
↓
run application
↓
capture screenshot
↓
compare screenshot with reference
↓
fix major differences
↓
capture screenshot again
```

Do not stop immediately after writing code.

UI implementation is not complete merely because:

* code compiles
* tests pass
* page loads
* components exist

The rendered result must also be visually checked when possible.

---

# 6. Analyze Reference Before Coding

Before changing UI, analyze the reference.

## Layout

Check:

* viewport
* page width
* content width
* horizontal margins
* vertical spacing
* section positions
* section heights
* grid structure
* flex structure
* column proportions
* whitespace
* visual center of gravity
* information density

## Typography

Check:

* title hierarchy
* font size
* font weight
* line height
* text color
* alignment
* secondary text
* label text
* button text

## Components

Check:

* cards
* buttons
* tabs
* navigation
* labels
* badges
* chips
* sidebars
* progress indicators
* timelines
* route markers
* altitude indicators
* floating controls
* dialogs
* images
* maps
* terrain
* 3D scenes

## Visual Style

Check:

* backgrounds
* borders
* border radius
* shadows
* gradients
* overlays
* opacity
* image cropping
* icon scale
* visual depth

Do not begin implementation before understanding the major visual hierarchy.

---

# 7. No Redesign Rule

Do not redesign the reference.

Do not make changes simply because another style appears:

* cleaner
* more modern
* prettier
* more practical
* more fashionable

Do NOT:

* invent a new page layout
* change column proportions without evidence
* add unnecessary cards
* remove intentional whitespace
* add glassmorphism unless present
* add neon effects unless present
* add large decorative gradients unless present
* add excessive animation
* add floating decoration not shown in the reference
* increase information density without reason
* replace the visual hierarchy
* introduce a different design system

When uncertain:

> Prefer the reference image over personal interpretation.

---

# 8. Layout Before Details

Fix visual differences in this order:

1. overall composition
2. page structure
3. width and height
4. major positioning
5. column proportions
6. spacing
7. typography
8. image size and crop
9. icons
10. colors
11. borders
12. radius
13. shadows
14. minor polish

Do not spend time tuning tiny shadows while the overall layout is still wrong.

---

# 9. Avoid CSS Patching

Avoid solving major layout problems with accumulated hacks such as:

```css
margin-left: 13px;
top: -7px;
transform: translate(...);
!important;
```

If many positional hacks become necessary:

reassess the parent layout.

Prefer correcting:

* DOM structure
* Grid
* Flex
* container sizing
* parent alignment

instead of compensating every child individually.

---

# 10. Assets

Before creating new visual assets, inspect existing project assets.

Prefer existing:

* PNG
* JPG
* JPEG
* WebP
* SVG
* icons
* illustrations
* textures
* maps
* terrain assets
* 3D assets

Do not recreate an asset with CSS or placeholder graphics if the correct asset already exists.

Do not create unnecessary new artwork.

---

# 11. Existing UI Structure

Do not allow an incorrect existing UI structure to dictate the final result.

It is acceptable to:

* restructure WXML
* restructure DOM
* split components
* merge components
* rewrite layout styles
* change Grid
* change Flex
* reorganize presentation components

when required for visual fidelity.

Preserve unrelated business behavior.

---

# 12. Geo Explorer Visual Rules

This project contains immersive geography and expedition experiences.

For:

* maps
* terrain
* mountains
* expeditions
* routes
* altitude
* waypoints
* 3D scenes

do not replace geographically meaningful structures with generic dashboard UI.

Preserve the hierarchy of:

```text
terrain
↓
route
↓
current position
↓
waypoint
↓
altitude
↓
destination
↓
environment
↓
supporting information
```

The immersive scene should remain the visual focus when the reference is designed that way.

UI overlays should not unnecessarily dominate the terrain or main scene.

---

# 13. Everest / Expedition Specific Rules

When working on Everest or expedition screens:

always inspect:

```text
design/reference/expedition-v2
```

before modifying the UI.

Pay special attention to:

* mountain composition
* route placement
* waypoint positions
* altitude indicators
* current position
* visual depth
* HUD placement
* right-side information rail
* foreground/background hierarchy
* overlay transparency
* card density
* information density

Do not convert the expedition interface into a generic dashboard.

---

# 14. Visual Validation

For significant visual changes, use screenshot-based validation when available.

Expected process:

```text
reference image
↓
implementation
↓
run application
↓
capture screenshot
↓
compare
↓
identify largest differences
↓
fix
↓
capture again
```

Do not judge visual accuracy solely from source code.

---

# 15. Screenshot Comparison Checklist

Before finishing a UI task, compare:

* [ ] overall composition
* [ ] content width
* [ ] horizontal margins
* [ ] section heights
* [ ] visual focal point
* [ ] column proportions
* [ ] component positions
* [ ] card dimensions
* [ ] image dimensions
* [ ] image crop
* [ ] typography hierarchy
* [ ] font size
* [ ] font weight
* [ ] line height
* [ ] spacing
* [ ] borders
* [ ] border radius
* [ ] colors
* [ ] shadows
* [ ] icons
* [ ] information density
* [ ] whitespace
* [ ] visual balance

If major differences remain:

continue fixing.

Do not stop after the first implementation pass when the mismatch is obvious.

---

# 16. WeChat Mini Program Visual QA

For WeChat Mini Program UI tasks:

the rendered result in WeChat Developer Tools is the final visual validation target.

Use available automation tooling such as:

```text
miniprogram-automator
```

for runtime inspection and screenshots when possible.

Preferred workflow:

```text
reference design
↓
inspect current implementation
↓
modify WXML / WXSS / TS
↓
run in WeChat Developer Tools
↓
capture screenshot
↓
compare with reference
↓
fix major differences
↓
capture again
```

For screenshot capture with `miniprogram-automator`, prefer:

```text
miniProgram.screenshot()
```

Do not assume browser screenshots are equivalent to the actual WeChat Mini Program rendering environment.

---

# 17. Test Execution Policy

All automated testing must run in headless, background, hidden, virtual-display, or offscreen mode by default.

This rule applies to:

* browser tests
* Playwright
* Puppeteer
* Chromium
* Chrome
* Edge
* Electron
* desktop applications
* GUI tests
* WebView tests
* client automation
* screenshot automation
* visual regression
* integration tests involving UI
* development-tool automation
* emulator-based automation

Default behavior:

> Automated tests must not display UI to the user.

---

# 18. Never Show Test Windows

During automated testing:

1. Never intentionally launch a visible browser window.
2. Never intentionally launch a visible desktop application window.
3. Never bring automated test windows to the foreground.
4. Never steal keyboard focus.
5. Never require manual interaction during automated testing.
6. Never open Chrome, Edge, Electron, or another client visibly just to validate a change.
7. Never use headed mode unless explicitly requested by the user.

The user should be able to continue using the computer normally while automated tests run.

---

# 19. Browser Testing

For browser automation, always prefer headless mode.

Examples:

```text
headless = true
```

Prefer:

```text
Playwright headless
Puppeteer headless
Chrome --headless
Chromium --headless
```

Do not use:

```text
headless = false
```

unless the user explicitly requests visible browser execution.

---

# 20. Desktop / Client Testing

For desktop applications, Electron, WebViews, emulators, or other GUI clients:

prefer in this order:

1. headless mode
2. background execution
3. offscreen rendering
4. hidden window
5. virtual display

Do not expose the application UI on the user's desktop during normal automated testing.

If the framework does not support true headless mode:

use the least intrusive background/offscreen option available.

---

# 21. Visual Testing Must Also Be Invisible

Visual validation does not require visible test windows.

Preferred visual QA workflow:

```text
run headless / offscreen
↓
capture screenshot
↓
inspect screenshot
↓
compare against reference
↓
fix
```

A visible browser or client window is not required merely because screenshots are needed.

---

# 22. If Headless Is Impossible

If a specific test, client, emulator, or development tool genuinely cannot perform the required operation without displaying UI:

do not silently open it.

Instead:

1. identify the limitation
2. explain which operation requires visible UI
3. avoid opening it automatically
4. continue with any possible non-interactive validation
5. report the remaining limitation

Do not unexpectedly interrupt the user's desktop session.

---

# 23. Chrome DevTools MCP

When using Chrome DevTools MCP for automated validation:

Chrome DevTools MCP must run headless by default. The project config
(`.pi/mcp.json`) launches it with `--headless=true --isolated=true`, so
screenshots are captured without any visible Chrome window.

Do not expose a visible Chrome window and do not steal window focus
unless the user explicitly requests headed execution.

Use Chrome DevTools MCP for:

* navigation
* page inspection
* screenshots
* console inspection
* network inspection
* rendered-page validation

without foreground UI whenever possible.

All Chrome DevTools MCP validation runs headless. Headed (visible) mode
is used only when the user explicitly requests it.

---

# 24. WeChat Developer Tools Execution Policy

For WeChat Mini Program validation:

do not automatically foreground WeChat Developer Tools during normal test execution.

Prefer:

* CLI automation
* background automation
* automation WebSocket
* screenshot-based inspection

If WeChat Developer Tools cannot perform a required action without visible UI:

do not unexpectedly bring it to the foreground.

Report the limitation instead.

---

# 25. Non-Interactive Default

All automated validation must be non-interactive by default.

This includes:

```text
browser
desktop client
Electron
WebView
WeChat Mini Program
emulator
visual regression
screenshot testing
```

The expected default is:

```text
silent
background
headless
offscreen
no focus stealing
no visible windows
```

Only change this behavior when the user explicitly requests visible execution.

---

# 26. Existing Pi Tools and Plugins

Prefer using already installed Pi capabilities before introducing new tooling.

Available packages may include:

```text
pi-web-access
pi-mcp-adapter
@juicesharp/rpiv-todo
pi-subagents
pi-lens
```

Use existing capabilities when appropriate.

Examples:

```text
pi-web-access
→ web research

pi-mcp-adapter
→ MCP integrations

rpiv-todo
→ task tracking

pi-subagents
→ parallel analysis / review / research

pi-lens
→ diagnostics / LSP / lint / structural inspection
```

Do not add another dependency when an existing installed capability already solves the task adequately.

---

# 27. Subagents

For larger tasks, subagents may be used for focused work.

Useful roles:

```text
scout
→ inspect repository and implementation

researcher
→ external research

worker
→ implementation

reviewer
→ review changes

oracle
→ challenge assumptions
```

Do not create unnecessary subagents for trivial tasks.

Use subagents when they improve accuracy or parallelism.

---

# 28. UI Task Planning

Before significant UI implementation, briefly determine:

```text
Reference:
Which design image is the target?

Current:
Which files currently implement the screen?

Differences:
What are the largest visual mismatches?

Validation:
How will the final rendered result be checked?
```

Then begin implementation.

Do not spend excessive time writing plans instead of making progress.

---

# 29. Testing

After making changes:

run the most relevant available validation.

Examples:

* type checking
* unit tests
* lint
* build
* project-specific tests
* screenshot validation

All automated tests must follow the headless / background execution policy.

Do not claim a test passed unless it was actually executed.

If a test cannot be executed:

state why.

---

# 30. Do Not Add Tests Without Need

Do not automatically create new tests for every change.

Only add or modify tests when:

* the task explicitly requests tests
* regression risk warrants it
* the existing project convention clearly requires it

Do not create excessive test code merely to demonstrate activity.

When tests are run:

they must be headless / invisible by default.

---

# 31. Responsive Behavior

If the supplied design is desktop-first:

match the desktop reference first.

Do not distort the desktop implementation prematurely for responsive behavior.

After the primary reference is reproduced, ensure reasonable behavior for:

* desktop
* tablet
* mobile

unless the task specifies otherwise.

---

# 32. Completion Criteria

A UI task is not complete solely because the code compiles.

Before finishing, confirm:

```text
1. Did I inspect the correct design reference?
2. Does the overall composition match?
3. Does the main content area have the correct size?
4. Are major components positioned correctly?
5. Are spacing and proportions close to the reference?
6. Does typography follow the same hierarchy?
7. Are images and visual assets used correctly?
8. Is the information density similar?
9. Did I visually inspect the rendered result when possible?
10. Did automated validation run without displaying UI?
11. Are there still obvious differences I can reasonably fix?
```

If obvious fixable differences remain:

continue fixing.

---

# 33. Final Response Format

After significant changes, summarize:

```text
Reference
- design reference used

Changed
- files modified

Implementation
- what was changed

Visual corrections
- major visual differences corrected

Validation
- tests/build/typecheck performed
- screenshot validation performed
- whether tests ran headless/background

Remaining differences
- known differences that remain
- reason they remain
```

Do not only respond:

```text
Done.
```

---

# 34. Core Rules

Design reference != inspiration.

Design reference = visual specification.

Do not redesign.

Reconstruct.

Do not stop after coding.

Validate the rendered result.

All automated tests are headless / background by default.

Do not display test UI.

Do not steal focus.

Do not open visible browsers or clients unless explicitly requested.
