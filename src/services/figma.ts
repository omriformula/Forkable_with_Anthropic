export interface FigmaConfig {
  pat: string;
  fileId: string;
  nodeId?: string;
}

export interface FigmaFileResponse {
  name: string;
  lastModified: string;
  thumbnailUrl: string;
  version: string;
  document: {
    id: string;
    name: string;
    type: string;
    children: any[];
  };
}

export interface FigmaImageResponse {
  err?: string;
  images: Record<string, string>;
  status?: number;
}

export class FigmaService {
  private baseUrl = 'https://api.figma.com/v1';

  private async makeRequest(endpoint: string, pat: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: {
        'X-Figma-Token': pat,
      },
    });

    if (!response.ok) {
      throw new Error(`Figma API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getFile(config: FigmaConfig): Promise<FigmaFileResponse> {
    return this.makeRequest(`/files/${config.fileId}`, config.pat);
  }

  async getFileNodes(config: FigmaConfig, nodeIds: string[]): Promise<any> {
    const nodeIdsParam = nodeIds.join(',');
    return this.makeRequest(`/files/${config.fileId}/nodes?ids=${nodeIdsParam}`, config.pat);
  }

  async getImages(config: FigmaConfig, nodeIds: string[], format: 'png' | 'svg' | 'pdf' = 'png', scale: number = 2): Promise<FigmaImageResponse> {
    const nodeIdsParam = nodeIds.join(',');
    const endpoint = `/images/${config.fileId}?ids=${nodeIdsParam}&format=${format}&scale=${scale}`;
    return this.makeRequest(endpoint, config.pat);
  }

  async getFileScreenshot(config: FigmaConfig, scale: number = 2): Promise<string> {
    try {
      // First, get the file to find the root node or a frame
      const fileData = await this.getFile(config);
      
      // Get the document ID (root node)
      const rootNodeId = fileData.document.id;
      
      // If a specific node ID is provided, use it; otherwise use the root
      const nodeId = config.nodeId || rootNodeId;
      
      // Get the image URL for the node
      const imageResponse = await this.getImages(config, [nodeId], 'png', scale);
      
      if (imageResponse.err) {
        throw new Error(`Failed to get image: ${imageResponse.err}`);
      }
      
      const imageUrl = imageResponse.images[nodeId];
      if (!imageUrl) {
        throw new Error('No image URL returned from Figma API');
      }
      
      return imageUrl;
    } catch (error) {
      console.error('Error fetching Figma screenshot:', error);
      throw error;
    }
  }

  // Helper method to extract file ID from Figma URL
  static extractFileId(figmaUrl: string): string {
    // Handle different Figma URL formats:
    // https://www.figma.com/file/cbs1cphwdvmojfpjfzkodu/LoginScreen
    // https://www.figma.com/design/cbs1cphwdvmojfpjfzkodu/LoginScreen
    const match = figmaUrl.match(/\/(?:file|design)\/([a-zA-Z0-9]+)/);
    if (!match) {
      throw new Error('Invalid Figma URL format');
    }
    return match[1];
  }

  // Helper method to extract node ID from Figma URL (if present)
  static extractNodeId(figmaUrl: string): string | undefined {
    const match = figmaUrl.match(/node-id=([^&]+)/);
    if (!match) return undefined;
    
    // Convert from URL format (66-186) to API format (66:186)
    const nodeId = decodeURIComponent(match[1]);
    return nodeId.replace(/-/g, ':');
  }
}

export const figmaService = new FigmaService(); 