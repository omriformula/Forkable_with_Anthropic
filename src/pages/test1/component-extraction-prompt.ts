export const CLAUDE_COMPONENT_EXTRACTION_PROMPT = `

I need you to ANALYZE the attached React component code and EXTRACT all individual reusable components. This is a component discovery task, not a code generation task. Follow these critical rules:

## CORE PRINCIPLE: Component Identification > Code Refactoring
Your job is to identify and catalog existing components, NOT to restructure or optimize the code.

## EXTRACTION METHODOLOGY:

1. **Component Classification System**
   For EVERY UI element in the code, classify it as:
   - ATOMIC: Basic building blocks (Button, Input, Icon, Text, Image)
   - MOLECULAR: Simple combinations (SearchBox, FormField, Navigation Item)
   - ORGANISM: Complex sections (Header, Sidebar, Card, Form, List)
   - TEMPLATE: Full layout sections (Hero Section, Dashboard, Login Form)

2. **Identification Rules**
   - ATOMIC: Single-purpose, no internal components (Button, TextField, Typography)
   - MOLECULAR: 2-5 atomic components working together (IconButton with text)
   - ORGANISM: Multiple molecular/atomic components in functional groups
   - TEMPLATE: Large sections that could be standalone pages/views

3. **Extraction Criteria**
   - Component must be visually distinct
   - Component must serve a specific purpose
   - Component must be potentially reusable
   - Component must have clear boundaries in the code

4. **Analysis Protocol**
   For each identified component:
   - Extract the exact JSX code
   - Identify props and dependencies
   - Determine component type and category
   - Note any state or functionality
   - Describe visual appearance and purpose

5. **Component Discovery Process**
   EXECUTE THIS SYSTEMATIC SCAN:

   A. **TOP-LEVEL STRUCTURE ANALYSIS**
      - Identify main layout sections (header, main, footer, sidebar)
      - Find major content areas (hero, features, forms, lists)
      - Mark navigation and interactive elements
      - Note repeated patterns or elements

   B. **COMPONENT HIERARCHY MAPPING**
      
      Level 1 - SCAN FOR TEMPLATES:
      - Full page sections (Login screen, Dashboard, Profile)
      - Major layout components (Header + Main + Footer)
      - Complete feature areas (Shopping cart, User profile)
      
      Level 2 - SCAN FOR ORGANISMS:
      - Navigation bars, sidebars, headers
      - Forms with multiple fields
      - Cards with multiple content types
      - Lists with complex items
      - Feature sections with multiple elements
      
      Level 3 - SCAN FOR MOLECULES:
      - Form input groups (label + input + helper text)
      - Button groups or toolbars
      - Search boxes (input + icon + button)
      - Menu items with icons and text
      - Social media links with icons
      
      Level 4 - SCAN FOR ATOMS:
      - Individual buttons, inputs, icons
      - Typography elements (headings, paragraphs)
      - Images, avatars, logos
      - Basic containers and dividers

   C. **CODE EXTRACTION SEQUENCE**
      FOR each identified component:
        1. Locate exact JSX boundaries in code
        2. Extract complete component code including styling
        3. Identify any required props or state
        4. Note any Material-UI components used
        5. Check for any custom styling or themes
        6. Verify component is self-contained

   D. **COMPONENT CATALOGING**
      
      For each component, provide:
      - **Name**: Descriptive component name
      - **Type**: Atom/Molecule/Organism/Template
      - **Category**: Button/Form/Navigation/Display/Layout/etc.
      - **Description**: What it does and how it looks
      - **Code**: Complete JSX code snippet
      - **Props**: Required and optional props
      - **Dependencies**: Any external dependencies or imports needed

   E. **REUSABILITY ASSESSMENT**
      For each component, evaluate:
      - How easily could this be extracted?
      - What props would make it configurable?
      - Are there any hardcoded values that should be props?
      - Could this be used in other contexts?

   F. **COMPONENT RELATIONSHIP MAPPING**
      - Which components contain other components?
      - Which components are standalone?
      - What's the parent-child relationship?
      - Which components could be composed together?

6. **Output Structure**
   Organize findings as:
   1. **Component Inventory**: List all discovered components
   2. **Component Details**: Full specifications for each
   3. **Hierarchy Map**: How components relate to each other
   4. **Reusability Index**: Which components are most reusable

## REACT LIVE ENVIRONMENT AWARENESS:
**CRITICAL: Extracted components must work in React Live environment:**

1. **NO IMPORT STATEMENTS** - Components use available scope only
2. **Material-UI Ready** - All components use MUI components directly
3. **Self-Contained** - Each component should work independently
4. **Prop-Driven** - Identify what should be configurable via props

## CRITICAL JSON FORMATTING REQUIREMENTS:
**ABSOLUTELY ESSENTIAL - FOLLOW THESE RULES EXACTLY:**

1. **NO TEMPLATE LITERALS** - Do NOT use backticks in JSON
2. **ESCAPE ALL QUOTES** - Use backslash before quotes inside strings
3. **SINGLE-LINE STRINGS** - Put all JSX code on one line
4. **PROPER JSON ESCAPING** - Escape all special characters
5. **VALID JSON ONLY** - Your response must parse with JSON.parse()

## COMPONENT EXTRACTION FORMAT:

For each component, provide this exact structure:

{
  "name": "ComponentName",
  "type": "atom|molecule|organism|template", 
  "category": "button|form|navigation|display|layout|interactive",
  "description": "Brief description of component purpose and appearance",
  "reusabilityScore": 1-10,
  "code": "Complete JSX code snippet with all quotes escaped",
  "props": {
    "required": ["prop1", "prop2"],
    "optional": ["prop3", "prop4"]
  },
  "dependencies": ["MUI components used"],
  "styling": "Description of visual styling",
  "functionality": "Description of any interactive behavior"
}

## EXAMPLE OF PROPER CODE FORMATTING:
Always use double quotes for the code field, never template literals.
Escape all quotes inside the JSX code using backslash.
Keep JSX code on a single line within the JSON string.

## ANALYSIS GUIDELINES:

- **Be Thorough**: Don't miss any reusable elements
- **Be Specific**: Each component should have clear boundaries
- **Be Practical**: Focus on components that could actually be reused
- **Be Accurate**: Extract exact code without modifications
- **Be Descriptive**: Help users understand what each component does

## REMEMBER:
- You are a component archaeologist, not a code architect
- Every element has potential value - catalog everything
- Exact code extraction > Clean abstractions
- Reusability assessment > Perfect organization
- Focus on what exists, not what could be better
- **MOST IMPORTANT**: Your output must be valid JSON that can be parsed by JSON.parse()

`; 