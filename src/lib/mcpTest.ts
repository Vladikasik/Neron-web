// MCP Integration Test Suite
import { createMCPClient } from './mcpIntegration';

export interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  toolsUsed: string[];
  responseTime: number;
}

export class MCPTester {
  private client = createMCPClient();
  private results: TestResult[] = [];

  async runAllTests(): Promise<TestResult[]> {
    console.log('🧪 Starting MCP Integration Tests...');
    this.results = [];

    // Test 1: Connection Test
    await this.testConnection();

    // Test 2: Read Graph Tool
    await this.testReadGraph();

    // Test 3: Find Nodes Tool
    await this.testFindNodes();

    // Test 4: Create Entity Tool
    await this.testCreateEntity();

    // Test 5: Validation System
    await this.testValidation();

    return this.results;
  }

  private async testConnection(): Promise<void> {
    const startTime = Date.now();
    try {
      const connected = await this.client.connect();
      const responseTime = Date.now() - startTime;
      
      this.results.push({
        name: 'MCP Connection Test',
        passed: connected,
        message: connected ? 'Successfully connected to MCP server' : 'Failed to connect to MCP server',
        toolsUsed: [],
        responseTime
      });
    } catch (error) {
      this.results.push({
        name: 'MCP Connection Test',
        passed: false,
        message: `Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        toolsUsed: [],
        responseTime: Date.now() - startTime
      });
    }
  }

  private async testReadGraph(): Promise<void> {
    const startTime = Date.now();
    try {
      const response = await this.client.sendMessage('Please use read_graph tool to show me the complete graph');
      const responseTime = Date.now() - startTime;
      
      // Check if response indicates tool usage
      const hasToolIndication = response.includes('read_graph') || response.includes('nodes') || response.includes('entities');
      const isErrorResponse = response.includes('ERROR:') || response.includes('❌');
      
      this.results.push({
        name: 'Read Graph Tool Test',
        passed: hasToolIndication && !isErrorResponse,
        message: isErrorResponse ? 'AI failed to use read_graph tool' : 'Read graph tool appears to have been used',
        toolsUsed: hasToolIndication ? ['read_graph'] : [],
        responseTime
      });
    } catch (error) {
      this.results.push({
        name: 'Read Graph Tool Test',
        passed: false,
        message: `Test error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        toolsUsed: [],
        responseTime: Date.now() - startTime
      });
    }
  }

  private async testFindNodes(): Promise<void> {
    const startTime = Date.now();
    try {
      const response = await this.client.sendMessage('Please use find_nodes tool to find the "Neron Project" node');
      const responseTime = Date.now() - startTime;
      
      // Check if response indicates tool usage
      const hasToolIndication = response.includes('find_nodes') || response.includes('found') || response.includes('highlighted');
      const isErrorResponse = response.includes('ERROR:') || response.includes('❌');
      
      this.results.push({
        name: 'Find Nodes Tool Test',
        passed: hasToolIndication && !isErrorResponse,
        message: isErrorResponse ? 'AI failed to use find_nodes tool' : 'Find nodes tool appears to have been used',
        toolsUsed: hasToolIndication ? ['find_nodes'] : [],
        responseTime
      });
    } catch (error) {
      this.results.push({
        name: 'Find Nodes Tool Test',
        passed: false,
        message: `Test error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        toolsUsed: [],
        responseTime: Date.now() - startTime
      });
    }
  }

  private async testCreateEntity(): Promise<void> {
    const startTime = Date.now();
    try {
      const response = await this.client.sendMessage('Please create a new entity called "Test Entity" of type "Test" with observation "Created during MCP testing"');
      const responseTime = Date.now() - startTime;
      
      // Check if response indicates tool usage
      const hasToolIndication = response.includes('create_entities') || response.includes('created') || response.includes('entity');
      const isErrorResponse = response.includes('ERROR:') || response.includes('❌');
      
      this.results.push({
        name: 'Create Entity Tool Test',
        passed: hasToolIndication && !isErrorResponse,
        message: isErrorResponse ? 'AI failed to use create_entities tool' : 'Create entities tool appears to have been used',
        toolsUsed: hasToolIndication ? ['create_entities'] : [],
        responseTime
      });
    } catch (error) {
      this.results.push({
        name: 'Create Entity Tool Test',
        passed: false,
        message: `Test error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        toolsUsed: [],
        responseTime: Date.now() - startTime
      });
    }
  }

  private async testValidation(): Promise<void> {
    const startTime = Date.now();
    try {
      const response = await this.client.sendMessage('show me the graph');
      const responseTime = Date.now() - startTime;
      
      // This should trigger validation since it's a graph command
      const hasValidationMessage = response.includes('ERROR:') && response.includes('MCP tools');
      const hasCorrectToolUsage = !response.includes('ERROR:') && (response.includes('read_graph') || response.includes('nodes'));
      
      this.results.push({
        name: 'Validation System Test',
        passed: hasValidationMessage || hasCorrectToolUsage,
        message: hasValidationMessage ? 'Validation correctly caught missing tool usage' : 'Tools used correctly or validation working',
        toolsUsed: hasCorrectToolUsage ? ['read_graph'] : [],
        responseTime
      });
    } catch (error) {
      this.results.push({
        name: 'Validation System Test',
        passed: false,
        message: `Test error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        toolsUsed: [],
        responseTime: Date.now() - startTime
      });
    }
  }

  printResults(): void {
    console.log('\n🧪 MCP Integration Test Results:');
    console.log('================================');
    
    let passedCount = 0;
    const totalCount = this.results.length;
    
    this.results.forEach((result, index) => {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      const tools = result.toolsUsed.length > 0 ? ` (Tools: ${result.toolsUsed.join(', ')})` : '';
      
      console.log(`${index + 1}. ${result.name}: ${status}`);
      console.log(`   Message: ${result.message}`);
      console.log(`   Response Time: ${result.responseTime}ms${tools}`);
      console.log('');
      
      if (result.passed) passedCount++;
    });
    
    console.log(`📊 Summary: ${passedCount}/${totalCount} tests passed`);
    
    if (passedCount === totalCount) {
      console.log('🎉 All tests passed! MCP integration is working correctly.');
    } else {
      console.log('⚠️ Some tests failed. Check the system prompt and MCP configuration.');
    }
  }
}

// Export singleton for easy access
export const mcpTester = new MCPTester();

// Add to window for console access
declare global {
  interface Window {
    mcpTester: MCPTester;
  }
}

if (typeof window !== 'undefined') {
  window.mcpTester = mcpTester;
} 