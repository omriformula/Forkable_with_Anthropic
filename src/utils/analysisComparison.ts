import { SemanticGroupingResult } from '../services/semanticGroupingService';
import { GPTVisionAnalysis } from '../services/gptVisionService';

export interface ComparisonMetrics {
  improvement: {
    componentCount: number;
    confidenceChange: number;
    processingEfficiency: number;
  };
  coverage: {
    textElementsCovered: number;
    interactiveElementsCovered: number;
    structuralElementsCovered: number;
  };
  accuracy: {
    stage3AAccuracy: number;
    stage3BAccuracy: number;
    overallImprovement: number;
  };
  performance: {
    stage3ATime: number;
    stage3BTime: number;
    totalTime: number;
  };
}

/**
 * Compare Stage 3A (Semantic Grouping) vs Stage 3B (Visual Validation) results
 */
export function compareStageResults(
  semanticGrouping: SemanticGroupingResult,
  gptAnalysis: GPTVisionAnalysis,
  stage3BProcessingTime: number = 0
): ComparisonMetrics {
  
  // Calculate improvements
  const componentCountImprovement = gptAnalysis.components.length - semanticGrouping.groups.length;
  const confidenceChange = gptAnalysis.confidence - semanticGrouping.confidence;
  
  // Calculate coverage metrics
  const textElementsCovered = countElementType(gptAnalysis.components, 'text');
  const interactiveElementsCovered = countElementType(gptAnalysis.components, ['button', 'input', 'navigation']);
  const structuralElementsCovered = countElementType(gptAnalysis.components, ['card', 'container', 'list']);
  
  // Estimate accuracy improvements (this would be better with ground truth data)
  const stage3AAccuracy = estimateAccuracy(semanticGrouping);
  const stage3BAccuracy = estimateAccuracy(gptAnalysis);
  
  return {
    improvement: {
      componentCount: componentCountImprovement,
      confidenceChange: confidenceChange * 100, // Convert to percentage points
      processingEfficiency: calculateEfficiency(semanticGrouping, gptAnalysis)
    },
    coverage: {
      textElementsCovered,
      interactiveElementsCovered,
      structuralElementsCovered
    },
    accuracy: {
      stage3AAccuracy,
      stage3BAccuracy,
      overallImprovement: stage3BAccuracy - stage3AAccuracy
    },
    performance: {
      stage3ATime: semanticGrouping.processingTime,
      stage3BTime: stage3BProcessingTime,
      totalTime: semanticGrouping.processingTime + stage3BProcessingTime
    }
  };
}

/**
 * Count elements of specific types
 */
function countElementType(components: any[], types: string | string[]): number {
  const typeArray = Array.isArray(types) ? types : [types];
  return components.filter(comp => typeArray.includes(comp.type)).length;
}

/**
 * Estimate accuracy based on component completeness and confidence
 */
function estimateAccuracy(result: SemanticGroupingResult | GPTVisionAnalysis): number {
  if ('groups' in result) {
    // Stage 3A - Semantic Grouping
    const completenessScore = Math.min(result.groups.length / 8, 1.0); // Assume 8 is ideal
    const confidenceScore = result.confidence;
    return (completenessScore + confidenceScore) / 2 * 100;
  } else {
    // Stage 3B - GPT Vision
    const completenessScore = Math.min(result.components.length / 8, 1.0);
    const confidenceScore = result.confidence;
    const materialUIMappingScore = result.components.filter(c => c.materialUIMapping?.component).length / result.components.length;
    return (completenessScore + confidenceScore + materialUIMappingScore) / 3 * 100;
  }
}

/**
 * Calculate processing efficiency gain
 */
function calculateEfficiency(semanticGrouping: SemanticGroupingResult, gptAnalysis: GPTVisionAnalysis): number {
  const semanticEfficiency = semanticGrouping.groups.length / (semanticGrouping.processingTime / 1000); // groups per second
  const visionEfficiency = gptAnalysis.components.length / 60; // Assume 60 seconds for vision analysis
  return ((visionEfficiency - semanticEfficiency) / semanticEfficiency) * 100;
}

/**
 * Generate a human-readable analysis report
 */
export function generateAnalysisReport(metrics: ComparisonMetrics): string {
  return `
🔍 **Two-Stage Analysis Report**

**📊 Improvement Metrics:**
• Component Detection: ${metrics.improvement.componentCount > 0 ? '+' : ''}${metrics.improvement.componentCount} components
• Confidence Boost: ${metrics.improvement.confidenceChange > 0 ? '+' : ''}${metrics.improvement.confidenceChange.toFixed(1)}%
• Processing Efficiency: ${metrics.improvement.processingEfficiency.toFixed(1)}%

**🎯 Coverage Analysis:**
• Text Elements: ${metrics.coverage.textElementsCovered} identified
• Interactive Elements: ${metrics.coverage.interactiveElementsCovered} identified  
• Structural Elements: ${metrics.coverage.structuralElementsCovered} identified

**✅ Accuracy Comparison:**
• Stage 3A (Semantic): ${metrics.accuracy.stage3AAccuracy.toFixed(1)}%
• Stage 3B (Visual): ${metrics.accuracy.stage3BAccuracy.toFixed(1)}%
• Overall Improvement: +${metrics.accuracy.overallImprovement.toFixed(1)}%

**⚡ Performance:**
• Stage 3A Time: ${(metrics.performance.stage3ATime / 1000).toFixed(1)}s
• Stage 3B Time: ${(metrics.performance.stage3BTime / 1000).toFixed(1)}s
• Total Processing: ${(metrics.performance.totalTime / 1000).toFixed(1)}s

**🎉 Summary:**
${metrics.improvement.componentCount > 0 ? 
  `The two-stage approach successfully enhanced component detection by ${metrics.improvement.componentCount} components with a ${metrics.improvement.confidenceChange.toFixed(1)}% confidence boost!` :
  `The two-stage approach validated and refined the semantic groups with improved confidence.`}
`;
}

/**
 * Identify potential issues or improvements
 */
export function identifyIssues(metrics: ComparisonMetrics): string[] {
  const issues: string[] = [];
  
  if (metrics.accuracy.overallImprovement < 5) {
    issues.push("Low accuracy improvement - consider enhancing prompts");
  }
  
  if (metrics.coverage.textElementsCovered < 2) {
    issues.push("Missing text elements - Stage 3A might need better text analysis");
  }
  
  if (metrics.coverage.interactiveElementsCovered < 3) {
    issues.push("Missing interactive elements - check button/input detection");
  }
  
  if (metrics.performance.totalTime > 45000) { // 45 seconds
    issues.push("Processing time too high - consider optimization");
  }
  
  if (metrics.improvement.confidenceChange < 0) {
    issues.push("Confidence decreased - Stage 3B might be contradicting Stage 3A");
  }
  
  return issues;
} 