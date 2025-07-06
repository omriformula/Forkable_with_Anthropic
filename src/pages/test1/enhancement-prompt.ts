export const CLAUDE_ENHANCEMENT_PROMPT = `

I need you to ENHANCE the attached React component with REAL design tokens from Figma. This is a STYLING enhancement task, NOT a layout redesign task. Follow these critical rules:

## CORE PRINCIPLE: Perfect Layout Preservation > Style Perfection
The existing component structure and layout is PERFECT. Your job is to apply real styling without changing ANY structural decisions.

## ENHANCEMENT METHODOLOGY:

1. **Component Preservation System**
   For EVERY element in the code, classify your approach as:
   - PRESERVE: All component types, hierarchy, structure, layout logic
   - ENHANCE: Colors, fonts, spacing values, border radius, shadows, images
   - REPLACE: Only placeholder/generic values with real design token values

2. **Implementation Rules**
   - PRESERVE ALL: Component structure, layout logic, positioning, sizing logic
   - ENHANCE ONLY: sx prop values, style prop values, color prop values
   - REPLACE ONLY: Generic strings like 'primary', 'secondary', 'default' with real values

3. **Anti-Alteration Directive**
   - NEVER change component types (Button stays Button, Box stays Box)
   - NEVER change component hierarchy or nesting
   - NEVER change layout patterns or positioning logic
   - NEVER change responsive behavior or breakpoints
   - NEVER change functionality or event handlers

4. **Verification Protocol**
   Since you cannot see your output:
   - After each component, insert a comment: "<!-- ENHANCED: [describe what styling was applied] -->"
   - Keep all original component props except styling ones
   - When unsure between two styling approaches, choose the one that changes less

5. **Design Token Application Protocol**
   BEFORE CHANGING ANY STYLING, EXECUTE THIS DECISION TREE:

   A. **IDENTIFY ENHANCEMENT OPPORTUNITIES**
      - Scan for generic color values: 'primary', 'secondary', 'grey.500', etc.
      - Scan for generic font values: 'h1', 'body1', default font weights
      - Scan for generic spacing: theme.spacing(), 'medium', 'large'
      - Scan for placeholder images: generic URLs, missing src attributes
      - Scan for generic border radius: 'borderRadius', default values

   B. **ENHANCEMENT HIERARCHY**
      
      Level 1 - ALWAYS ENHANCE:
      - Color values (text, background, border colors)
      - Font families, sizes, weights
      - Spacing values (padding, margin, gap)
      - Border radius values
      - Shadow values
      
      Level 2 - ENHANCE IF AVAILABLE:
      - Image URLs (replace placeholders with real assets)
      - Gradient backgrounds
      - Custom shadows
      - Icon colors
      
      Level 3 - NEVER CHANGE:
      - Component types or hierarchy
      - Layout patterns (flex, grid, positioning)
      - Responsive behavior
      - Event handlers or functionality

   C. **ENHANCEMENT SEQUENCE**
      FOR each component in the code:
        1. First pass: Identify all style-related props
        2. Check if value is generic (needs enhancement)
        3. Find matching design token
        4. Replace with exact design token value
        5. ONLY if no matching token → keep original value

   D. **EXAMPLE SCENARIOS**
      
      WRONG: <Button variant="contained"> → <Chip variant="filled">
      RIGHT: <Button variant="contained"> → <Button variant="contained" sx={{ backgroundColor: '#FF6B6B' }}>
      
      WRONG: <Box sx={{ p: 2 }}> → <Stack spacing={3}>
      RIGHT: <Box sx={{ p: 2 }}> → <Box sx={{ p: '16px' }}>
      
      WRONG: <Typography variant="h4"> → <Typography variant="h3">
      RIGHT: <Typography variant="h4"> → <Typography variant="h4" sx={{ fontFamily: 'Inter', fontSize: '24px' }}>

   E. **VERIFICATION CHECK**
      Before changing any code, ask:
      - Is this a styling property? → Enhance it
      - Is this a layout/structure property? → Keep it exactly
      - Is this a component type? → Never change it
      
      Only enhance if answer is YES to first question.

   F. **DESIGN TOKEN RULE**
      A color is a color. A font is a font. A spacing is a spacing.
      Apply them precisely, but never change the component that uses them.

6. **Styling Precision**
   - Use exact hex values from design tokens
   - Use exact font family names from design tokens
   - Use exact pixel values from spacing tokens
   - Use exact image URLs from asset tokens
   - Preserve all existing component behavior

7. **Progressive Enhancement**
   Enhance in stages:
   1. First pass: Apply all color values from design tokens
   2. Second pass: Apply all typography values from design tokens
   3. Third pass: Apply all spacing values from design tokens
   4. Fourth pass: Replace placeholder images with real asset URLs
   5. Final pass: Apply shadows, gradients, and advanced styling

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

## DESIGN TOKEN INTEGRATION:
**CRITICAL: Use these exact design tokens for enhancement:**

### Available Colors:
{DESIGN_TOKEN_COLORS}

### Available Typography:
- Font Families: {DESIGN_TOKEN_FONT_FAMILIES}
- Font Sizes: {DESIGN_TOKEN_FONT_SIZES}
- Font Weights: {DESIGN_TOKEN_FONT_WEIGHTS}

### Available Spacing:
{DESIGN_TOKEN_SPACING}

### Available Images:
{DESIGN_TOKEN_IMAGES}

### Available Gradients:
{DESIGN_TOKEN_GRADIENTS}

## REMEMBER:
- You are a stylist, not a restructurer
- Every component choice was perfect - keep them all
- When in doubt, change less
- Perfect layout preservation > Perfect styling
- NO import statements in generated code
- Use design tokens precisely but never change component logic

`; 