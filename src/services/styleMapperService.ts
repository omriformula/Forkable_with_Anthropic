import { ComponentAnalysis, DesignTokens } from './figmaService';

export interface MappedComponent {
  id: string;
  name: string;
  muiComponent: string;
  props: Record<string, any>;
  sx: Record<string, any>;
  children?: MappedComponent[];
  content?: string;
  imageUrl?: string;
}

export interface StyleMapping {
  components: MappedComponent[];
  designSystem: {
    colors: { [key: string]: string };
    gradients?: { [key: string]: string };
    typography: { [key: string]: any };
    spacing: { [key: string]: number };
    baseUnit?: number;
  };
}

class StyleMapperService {
  
  /**
   * Map Figma components to Material-UI components with proper styling
   */
  mapComponentsToMui(
    components: ComponentAnalysis[], 
    designTokens: DesignTokens,
    assetUrls: { [nodeId: string]: string }
  ): StyleMapping {
    console.log('🎭 [STYLE MAPPER] Starting component mapping:', {
      components: components.length,
      designTokens: designTokens,
      assetUrls: Object.keys(assetUrls).length
    });
    
    // Extract design system
    const designSystem = this.buildDesignSystem(designTokens);
    console.log('🎨 [STYLE MAPPER] Design system built:', designSystem);
    
    // Map components
    const mappedComponents = components.map(component => 
      this.mapSingleComponent(component, assetUrls, designSystem)
    ).filter(Boolean) as MappedComponent[];
    
    console.log('🎯 [STYLE MAPPER] Components mapped:', {
      total: mappedComponents.length,
      byType: mappedComponents.reduce((acc, comp) => {
        acc[comp.muiComponent] = (acc[comp.muiComponent] || 0) + 1;
        return acc;
      }, {} as { [key: string]: number })
    });
    
    const result = {
      components: mappedComponents,
      designSystem
    };
    
    console.log('✅ [STYLE MAPPER] Mapping complete');
    return result;
  }

  /**
   * Build design system from extracted tokens
   */
  private buildDesignSystem(designTokens: DesignTokens) {
    // Enhanced color processing with semantic detection
    const colors: { [key: string]: string } = {};
    const gradients: { [key: string]: string } = {};
    
    // Intelligent color categorization
    designTokens.colors.forEach((color) => {
      const hex = color.toLowerCase();
      
      // Orange/primary colors (common in payment/action UIs)
      if (hex.includes('ff7f00') || hex.includes('ff8c00') || hex.includes('ff8000') || hex.includes('ff9500')) {
        colors.primary = color;
        colors.accent = color;
      }
      // White backgrounds
      else if (hex === '#ffffff' || hex === '#fff') {
        colors.background = color;
        colors.surface = color;
      }
      // Black/dark text
      else if (hex === '#000000' || hex === '#000') {
        colors.text = color;
        colors.onSurface = color;
      }
      // Gray variations for secondary text and borders
      else if (hex.includes('f0f0f0') || hex.includes('e0e0e0') || hex.includes('cccccc')) {
        colors.secondary = color;
        colors.border = color;
      }
      // Text secondary colors (grayish blues, etc.)
      else if (hex.match(/^#[a-f0-9]{6}$/) && !colors.textSecondary) {
        // Detect if this is likely a text color (medium lightness, not too saturated)
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        
        if (luminance > 0.3 && luminance < 0.7) {
          colors.textSecondary = color;
        }
      }
    });
    
    // Process gradients
    designTokens.gradients?.forEach((gradient, index) => {
      // Detect gradient type
      if (gradient.includes('135deg') && gradient.includes('#FF')) {
        gradients.primary = gradient;
        gradients.card = gradient;
      } else {
        gradients[`gradient${index}`] = gradient;
      }
    });
    
    // Enhanced typography processing with Material-UI mapping
    const typography: { [key: string]: any } = {};
    
    // Process font families
    const primaryFont = designTokens.fontFamilies?.[0] || 'Roboto';
    typography.fontFamily = primaryFont;
    
    // Process font sizes with semantic meaning
    const sortedSizes = (designTokens.fontSizes || []).sort((a, b) => a - b);
    if (sortedSizes.length > 0) {
      typography.h1 = { fontSize: sortedSizes[sortedSizes.length - 1] || 32 };
      typography.h2 = { fontSize: sortedSizes[sortedSizes.length - 2] || 24 };
      typography.h3 = { fontSize: sortedSizes[sortedSizes.length - 3] || 20 };
      typography.h4 = { fontSize: sortedSizes[Math.floor(sortedSizes.length / 2)] || 18 };
      typography.h5 = { fontSize: sortedSizes[Math.floor(sortedSizes.length / 3)] || 16 };
      typography.h6 = { fontSize: sortedSizes[Math.floor(sortedSizes.length / 4)] || 14 };
      typography.body1 = { fontSize: sortedSizes[1] || 16 };
      typography.body2 = { fontSize: sortedSizes[0] || 14 };
      typography.caption = { fontSize: Math.min(...sortedSizes) || 12 };
    }
    
    // Process font weights
    const weights = designTokens.fontWeights || [400, 500, 600, 700];
    typography.fontWeights = {
      light: Math.min(...weights.filter(w => w < 500)) || 300,
      regular: weights.find(w => w >= 400 && w < 500) || 400,
      medium: weights.find(w => w >= 500 && w < 600) || 500,
      semiBold: weights.find(w => w >= 600 && w < 700) || 600,
      bold: weights.find(w => w >= 700) || 700
    };
    
    // Enhanced spacing system with base unit detection
    const spacingValues = designTokens.spacing || [];
    const baseUnit = this.detectBaseSpacingUnit(spacingValues);
    const spacing = this.createSpacingScale(baseUnit, spacingValues);
    
    return {
      colors,
      gradients,
      typography,
      spacing,
      baseUnit
    };
  }

  /**
   * Detect the base spacing unit from spacing values
   */
  private detectBaseSpacingUnit(spacingValues: number[]): number {
    if (spacingValues.length === 0) return 8; // Default Material-UI base
    
    // Find the GCD (Greatest Common Divisor) of spacing values
    const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
    const findGCD = (arr: number[]): number => arr.reduce(gcd);
    
    // Filter out very small and very large values
    const filtered = spacingValues.filter(v => v >= 2 && v <= 100);
    if (filtered.length === 0) return 8;
    
    const baseUnit = findGCD(filtered);
    
    // Ensure base unit is reasonable (common values are 4, 8, 12, 16)
    if (baseUnit >= 4 && baseUnit <= 16) return baseUnit;
    if (baseUnit < 4) return 4;
    if (baseUnit > 16) return 8;
    
    return 8;
  }

  /**
   * Create a spacing scale based on detected patterns
   */
  private createSpacingScale(baseUnit: number, spacingValues: number[]): { [key: string]: number } {
    const scale: { [key: string]: number } = {};
    
    // Create semantic spacing names
    scale.xs = baseUnit * 0.5;
    scale.sm = baseUnit;
    scale.md = baseUnit * 2;
    scale.lg = baseUnit * 3;
    scale.xl = baseUnit * 4;
    scale.xxl = baseUnit * 6;
    
    // Add detected values with semantic names
    const sortedValues = [...new Set(spacingValues)].sort((a, b) => a - b);
    sortedValues.forEach((value, index) => {
      if (value <= baseUnit * 0.5) scale.xs = value;
      else if (value <= baseUnit * 1.5) scale.sm = value;
      else if (value <= baseUnit * 2.5) scale.md = value;
      else if (value <= baseUnit * 3.5) scale.lg = value;
      else if (value <= baseUnit * 5) scale.xl = value;
      else if (value <= baseUnit * 8) scale.xxl = value;
    });
    
    return scale;
  }

  /**
   * Map single Figma component to Material-UI
   */
  private mapSingleComponent(
    component: ComponentAnalysis, 
    assetUrls: { [nodeId: string]: string },
    designSystem: any
  ): MappedComponent | null {
    
    const styling = component.properties.styling;
    const bounds = component.bounds;
    
    // Determine MUI component type
    const muiComponent = this.determineMuiComponent(component);
    
    // Build sx styling object
    const sx = this.buildSxStyling(styling, bounds, designSystem);
    
    // Build props
    const props = this.buildComponentProps(component, assetUrls);
    
    // Extract text content
    const content = this.extractTextContent(component);
    
    // Get image URL if available
    const imageUrl = assetUrls[component.id];

    return {
      id: component.id,
      name: component.name,
      muiComponent,
      props,
      sx,
      content,
      imageUrl
    };
  }

  /**
   * Determine appropriate Material-UI component - GENERIC VERSION
   */
  private determineMuiComponent(component: ComponentAnalysis): string {
    const name = component.name.toLowerCase();
    const type = component.type;
    const hasText = component.properties.characters;
    const bounds = component.bounds;
    
    // Generic button detection (not payment-specific)
    if (name.includes('button') || name.includes('btn') || 
        type === 'INSTANCE' ||
        (bounds && bounds.width > 100 && bounds.height > 40 && bounds.height < 80)) {
      return 'Button';
    }
    
    // Generic card/container detection
    if (name.includes('card') || name.includes('container') || 
        type === 'FRAME' ||
        (type === 'RECTANGLE' && bounds && bounds.width > 150 && bounds.height > 80)) {
      return 'Card';
    }
    
    // Text detection
    if (type === 'TEXT' || hasText) {
      return 'Typography';
    }
    
    // Image detection
    if (type === 'RECTANGLE' && component.properties.styling?.images) {
      return 'Box'; // Will contain image
    }
    
    // Icon detection
    if (type === 'INSTANCE' && bounds && bounds.width < 50 && bounds.height < 50) {
      return 'IconButton';
    }
    
    // Container detection
    if (type === 'FRAME' || type === 'GROUP') {
      return 'Box';
    }
    
    return 'Box'; // Default fallback
  }

  /**
   * Build Material-UI sx styling object
   */
  private buildSxStyling(styling: any, bounds: any, designSystem: any): Record<string, any> {
    const sx: Record<string, any> = {};
    
    // Dimensions
    if (bounds) {
      sx.width = bounds.width;
      sx.height = bounds.height;
      sx.minWidth = bounds.width;
      sx.minHeight = bounds.height;
    }
    
    // Colors
    if (styling?.colors) {
      if (styling.colors.background) {
        sx.backgroundColor = styling.colors.background;
      }
      if (styling.colors.text) {
        sx.color = styling.colors.text;
      }
      if (styling.colors.border) {
        sx.borderColor = styling.colors.border;
      }
    }
    
    // Typography
    if (styling?.typography) {
      if (styling.typography.fontFamily) {
        sx.fontFamily = styling.typography.fontFamily;
      }
      if (styling.typography.fontSize) {
        sx.fontSize = styling.typography.fontSize;
      }
      if (styling.typography.fontWeight) {
        sx.fontWeight = styling.typography.fontWeight;
      }
      if (styling.typography.textAlign) {
        sx.textAlign = styling.typography.textAlign;
      }
    }
    
    // Spacing
    if (styling?.spacing?.padding) {
      const p = styling.spacing.padding;
      sx.padding = `${p.top}px ${p.right}px ${p.bottom}px ${p.left}px`;
    }
    
    // Borders
    if (styling?.borders) {
      if (styling.borders.radius) {
        sx.borderRadius = styling.borders.radius;
      }
      if (styling.borders.width) {
        sx.border = `${styling.borders.width}px ${styling.borders.style || 'solid'} ${styling.borders.color || '#000'}`;
      }
    }
    
    // Shadows
    if (styling?.shadows && styling.shadows.length > 0) {
      sx.boxShadow = styling.shadows.join(', ');
    }
    
    return sx;
  }

  /**
   * Build component props - GENERIC VERSION
   */
  private buildComponentProps(component: ComponentAnalysis, assetUrls: { [nodeId: string]: string }): Record<string, any> {
    const props: Record<string, any> = {};
    const name = component.name.toLowerCase();
    const bounds = component.bounds;
    const hasText = component.properties.characters;
    
    // Generic button props
    if (name.includes('button') || name.includes('btn')) {
      // Determine variant based on styling or naming patterns
      props.variant = name.includes('primary') || name.includes('main') ? 'contained' : 'outlined';
      props.size = bounds && bounds.height > 60 ? 'large' : 'medium';
      
      // Full width detection for wide buttons
      if (bounds && bounds.width > 250) {
        props.fullWidth = true;
      }
    }
    
    // Generic card props
    if (name.includes('card') || name.includes('container')) {
      props.variant = 'outlined';
      props.sx = { 
        ...props.sx,
        cursor: 'pointer',
        '&:hover': {
          borderColor: 'primary.main'
        }
      };
      
      // Selected state detection (generic)
      if (name.includes('selected') || name.includes('active')) {
        props.sx = {
          ...props.sx,
          borderColor: 'primary.main',
          borderWidth: 2,
          position: 'relative'
        };
      }
    }
    
    // Generic typography props
    if (component.type === 'TEXT' && hasText) {
      const fontSize = component.properties.styling?.typography?.fontSize || 16;
      const fontWeight = component.properties.styling?.typography?.fontWeight || 400;
      
      // Determine variant based on font size and weight
      if (fontSize >= 24 || fontWeight >= 600) {
        props.variant = 'h4';
      } else if (fontSize >= 20 || fontWeight >= 500) {
        props.variant = 'h5';
      } else if (fontSize >= 18) {
        props.variant = 'h6';
      } else {
        props.variant = 'body1';
      }
      
      // Bold text detection
      if (fontWeight >= 600) {
        props.fontWeight = 'bold';
      }
    }
    
    return props;
  }

  /**
   * Extract text content from component - GENERIC VERSION
   */
  private extractTextContent(component: ComponentAnalysis): string | undefined {
    // Return actual text content from Figma
    if (component.type === 'TEXT' && component.properties.characters) {
      return component.properties.characters;
    }
    
    // For non-text components, return the component name if it's descriptive
    const name = component.name;
    if (name && name !== 'Rectangle' && name !== 'Frame' && name !== 'Group') {
      return name;
    }
    
    return undefined;
  }

  /**
   * Generate appropriate asset URL for component - GENERIC VERSION
   */
  generateAssetUrl(component: ComponentAnalysis, assetUrls: { [nodeId: string]: string }): string | undefined {
    // Return actual asset URL from Figma if available
    if (assetUrls[component.id]) {
      return assetUrls[component.id];
    }
    
    // For icon-sized components, use generic icon placeholders
    const bounds = component.bounds;
    if (bounds && bounds.width <= 50 && bounds.height <= 50) {
      return undefined; // Let Material-UI handle icons
    }
    
    return undefined;
  }
}

export default StyleMapperService; 