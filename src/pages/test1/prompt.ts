export const CLAUDE_ANALYSIS_PROMPT = `

I need you to create an EXACT pixel-perfect clone of attached image. This is a cloning task, not a redesign or optimization task. Follow these critical rules:

## CORE PRINCIPLE: Perfect Visual Match > Clean Code
A partially-editable perfect clone is better than a fully-editable imperfect clone.

## CLONING METHODOLOGY:

1. **Component Triage System**
   For EVERY element on the page, classify it as:
   - GREEN: Standard components you're 100% certain about (basic buttons, simple text, standard forms)
   - YELLOW: Semi-standard components with custom styling (modified cards, styled inputs)
   - RED: Custom/complex/original components (unique animations, custom graphics, non-standard layouts)

2. **Implementation Rules**
   - GREEN components: Code normally
   - YELLOW components: Code with extreme attention to detail, measure everything
   - RED components: IMMEDIATELY screenshot and embed as image. Don't attempt to recreate.

3. **Anti-Optimization Directive**
   - Clone EVERYTHING you see, even if it seems redundant
   - If there are 50 similar items, create 50 items, not a loop with 50 iterations
   - Preserve all quirks, inconsistencies, and "imperfections"
   - Never simplify, never optimize, never "improve"

4. **Verification Protocol**
   Since you cannot see your output:
   - After each major section, insert a comment: "<!-- VERIFICATION NEEDED: [describe what should appear] -->"
   - Use excessive inline styles matching exact values rather than classes you hope work
   - When unsure between two approaches, choose the one that hardcodes more values

5. **Image Asset Extraction Protocol**
   BEFORE SCREENSHOTTING ANY COMPONENT, EXECUTE THIS DECISION TREE:

   A. **IDENTIFY ALL ATOMIC ASSETS FIRST**
      - Scan component for individual images: .jpg, .png, .svg, .gif
      - These include: logos, icons, photos, illustrations
      - ACTION: Extract each atomic image separately
      - ACTION: Note their container structure

   B. **COMPONENT BREAKDOWN HIERARCHY**
      
      Level 1 - ALWAYS EXTRACT INDIVIDUALLY:
      - Logo images
      - Icon images  
      - Photo images
      - Simple geometric shapes with solid colors
      - SVG graphics
      
      Level 2 - BUILD IN CODE:
      - Text overlays
      - Colored backgrounds
      - Borders and shadows
      - Basic containers/cards
      - Spacing and padding
      
      Level 3 - ONLY SCREENSHOT IF:
      - Multiple elements are blended/merged inseparably
      - Complex gradients with text integration
      - Custom artistic compositions
      - Canvas/WebGL renderings
      - After attempting extraction, visual elements overlap incorrectly

   C. **EXTRACTION SEQUENCE**
      FOR each visible component:
        1. First pass: Identify all <img>, <svg>, background-images
        2. Download each atomic image
        3. Rebuild container structure in HTML/CSS
        4. Place atomic images in correct positions
        5. ONLY if result doesn't match → screenshot whole component

   D. **EXAMPLE SCENARIOS**
      
      WRONG: Card with logo → Screenshot entire card
      RIGHT: Card with logo → Code the card, extract logo.png, place logo in card
      
      WRONG: Hero section with background image → Screenshot everything  
      RIGHT: Extract background.jpg, code overlay text, position separately
      
      WRONG: Navigation with brand icon → Screenshot whole nav
      RIGHT: Code nav structure, extract icon.svg, place in nav

   E. **VERIFICATION CHECK**
      Before screenshotting, ask:
      - Can I see distinct image files? → Extract them
      - Is this a standard UI pattern? → Code it
      - Are elements clearly separated? → Build separately
      
      Only screenshot if answer is NO to all.

   F. **ATOMIC ASSET RULE**
      A logo is a logo. An icon is an icon. A photo is a photo.
      Extract them individually, then rebuild their containers.

6. **Layout Precision**
   - Use absolute positioning when relative positioning might shift
   - Hardcode all dimensions in pixels
   - Copy exact color values (use color picker)
   - Preserve all whitespace and margins exactly

7. **Progressive Enhancement**
   Build in stages:
   1. First pass: All layout blocks as colored rectangles with exact dimensions
   2. Second pass: Add all text content
   3. Third pass: Add GREEN components
   4. Fourth pass: Screenshot and place all YELLOW/RED components
   5. Final pass: Interactions and animations (only if 100% confident)

## REACT LIVE ENVIRONMENT CONSTRAINTS:
**CRITICAL: This code will run in a React Live environment with specific limitations:**

1. **NO IMPORT STATEMENTS** - All imports are stripped out automatically
2. **Available Components & Icons:**
   - All Material-UI components are available directly (e.g., Button, TextField, Box)
   - All Material-UI icons are available directly (e.g., Visibility, Google, Microsoft)
   - React hooks are available as useState, useCallback, useEffect, useMemo
   - Common icons are aliased: GoogleIcon maps to Google, MicrosoftIcon maps to Microsoft, VisibilityIcon maps to Visibility, VisibilityOffIcon maps to VisibilityOff

3. **Code Structure Requirements:**
   - Start directly with component definition (no imports)
   - Use function component syntax with arrow functions
   - End with render call (this is added automatically)
   - Use icons directly: Google, Microsoft, Visibility, VisibilityOff (no Icon suffix needed)
   - All Material-UI components available: Button, TextField, Box, Typography, etc.

## REMEMBER:
- You are a photocopier, not a designer
- Every pixel matters
- When in doubt, screenshot
- Perfect clone with 20% editable > Imperfect clone with 100% editable
- NO import statements in generated code
- Use icons directly from scope (Google, Microsoft, Visibility, etc.)

`; 