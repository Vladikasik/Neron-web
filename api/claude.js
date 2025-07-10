export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { message, systemPrompt, mcpServers } = req.body;

    if (!message) {
      res.status(400).json({ error: 'Message is required' });
      return;
    }

    // Debug logging
    console.log('=== MCP API Request ===');
    console.log('Message:', message);
    console.log('System Prompt:', systemPrompt?.substring(0, 100) + '...');
    console.log('MCP URL:', process.env.MCP_URL);
    console.log('API Key present:', !!process.env.ANTHROPIC_API_KEY);

    // Configure MCP servers according to official documentation
    const defaultMcpServers = mcpServers || [{
      type: "url", 
      url: process.env.MCP_URL || 'https://memory.aynshteyn.dev/sse',
      name: "memory",
      tool_configuration: {
        enabled: true,
        allowed_tools: ["find_nodes", "read_graph", "create_entities", "create_relations", "add_observations"]
      }
    }];

    console.log('MCP Servers Config:', JSON.stringify(defaultMcpServers, null, 2));

    const requestPayload = {
      model: 'claude-sonnet-4-20250514', // Official model from docs
      max_tokens: 4000,
      messages: [{ role: 'user', content: message }],
      system: systemPrompt,
      mcp_servers: defaultMcpServers
    };

    console.log('Request Payload:', JSON.stringify(requestPayload, null, 2));

    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'mcp-client-2025-04-04' // Required beta header
      },
      body: JSON.stringify(requestPayload)
    });

    console.log('Claude Response Status:', claudeResponse.status);
    console.log('Claude Response Headers:', Object.fromEntries(claudeResponse.headers.entries()));

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text();
      console.error('=== Claude API Error ===');
      console.error('Status:', claudeResponse.status);
      console.error('Response:', errorText);
      
      res.status(claudeResponse.status).json({ 
        error: `Claude API Error: ${claudeResponse.status}`,
        details: errorText,
        debug: {
          mcpUrl: process.env.MCP_URL,
          hasApiKey: !!process.env.ANTHROPIC_API_KEY
        }
      });
      return;
    }

    const data = await claudeResponse.json();
    
    console.log('=== Claude API Success ===');
    console.log('Response Content Types:', data.content?.map(c => c.type) || []);
    
    // Log MCP tool usage for debugging
    const mcpToolUses = data.content?.filter(c => c.type === 'mcp_tool_use') || [];
    const mcpToolResults = data.content?.filter(c => c.type === 'mcp_tool_result') || [];
    
    console.log('MCP Tool Uses:', mcpToolUses.length);
    console.log('MCP Tool Results:', mcpToolResults.length);
    
    if (mcpToolUses.length > 0) {
      console.log('MCP Tools Used:', mcpToolUses.map(t => `${t.name} (${t.server_name})`));
    }

    // Add debug information to response
    const responseWithDebug = {
      ...data,
      debug: {
        mcpToolsUsed: mcpToolUses.length,
        mcpToolResults: mcpToolResults.length,
        mcpServers: defaultMcpServers.map(s => s.name),
        timestamp: new Date().toISOString()
      }
    };

    res.status(200).json(responseWithDebug);

  } catch (error) {
    console.error('=== Server Error ===');
    console.error('Error:', error);
    console.error('Stack:', error.stack);
    
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      debug: {
        timestamp: new Date().toISOString(),
        mcpUrl: process.env.MCP_URL,
        hasApiKey: !!process.env.ANTHROPIC_API_KEY
      }
    });
  }
} 