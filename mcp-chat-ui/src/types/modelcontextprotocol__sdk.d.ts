declare module '@modelcontextprotocol/sdk' {
  export interface MCPConfig {
    mcpServers?: {
      sqlite?: {
        command: string;
        args: string[];
      };
      filesystem?: {
        command: string;
        args: string[];
      };
      postgres?: {
        command: string;
        args: string[];
      };
      github?: {
        command: string;
        args: string[];
      };
    };
  }

  // Add other type declarations as needed
  export function createMCPClient(config: MCPConfig): any;
  export function initializeMCP(config: MCPConfig): Promise<void>;
}
