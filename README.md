# Neron - AI-Powered Graph Visualization System

## 🚀 Overview

Neron is a React-based 3D graph visualization system with AI-powered MCP (Model Context Protocol) integration. It provides interactive node exploration and AI-driven second brain functionality using Neo4j knowledge graphs.

## ✨ Key Features

- **3D Graph Visualization**: Interactive 3D nodes and relationships using react-force-graph-3d
- **AI Integration**: Claude API with MCP protocol for dynamic graph management
- **Real-time Updates**: Automatic graph updates when AI uses MCP tools
- **Interactive Console**: Draggable console with Matrix-style UI for AI interaction
- **Node Interactions**: Hover, click, and double-click interactions with information cards
- **Keyboard Shortcuts**: `H` for hover mode, `/` for console toggle

## 🔧 Technical Stack

- **Frontend**: React 18, TypeScript, Vite
- **UI**: Shadcn UI with Mono theme, Matrix-style effects
- **3D Graphics**: react-force-graph-3d
- **AI**: Claude API (claude-sonnet-4-20250514) with MCP integration
- **Database**: Neo4j knowledge graph via MCP server
- **Deployment**: Vercel

## 🚨 Current Status

### ✅ COMPLETED
- **MCP Integration**: Enhanced system prompt to force tool usage
- **Automatic Updates**: Graph reloads when `read_graph` tool succeeds
- **Auto Highlighting**: Node highlighting when `find_nodes` tool succeeds
- **Event System**: Custom events for graph updates (`mcpGraphReload`, `mcpNodeHighlight`)
- **Console System**: Draggable console with real-time AI interaction
- **Graph Visualization**: Complete 3D graph with interactions
- **Project Tracking**: NEO4J storage for project progress

### 🟡 CRITICAL ISSUE
**Problem**: AI sometimes responds with text only instead of using MCP tools
**Impact**: Graph doesn't update automatically when AI should use tools
**Solution**: Enhanced system prompt implemented, needs testing

### 🎯 NEXT STEPS
1. **Test MCP Tool Usage**: Verify AI consistently uses MCP tools
2. **Add Tool Validation**: Reject responses without MCP tool usage
3. **Implement Retry Logic**: Retry when AI doesn't use tools
4. **Add Error Recovery**: Handle MCP tool failures gracefully

## 🛠️ Setup

### Prerequisites
- Node.js 18+
- NPM or Yarn
- Anthropic API key
- MCP server access

### Environment Variables
```bash
VITE_ANTHROPIC_API_KEY=sk-ant-api...
VITE_MCP_URL=https://memory.aynshteyn.dev/sse
```

### Installation
```bash
npm install
npm run dev
```

## 🎮 Usage

### Basic Commands
- **"read graph"**: Loads complete graph structure
- **"find nodes [names]"**: Highlights specific nodes
- **"create entity [name]"**: Adds new nodes
- **"add relation [source] [target]"**: Creates relationships

### Keyboard Shortcuts
- `H`: Toggle hover mode
- `/`: Toggle console
- `ESC`: Close dialogs

### UI Interactions
- **Single Click**: Show node info card
- **Double Click**: Persistent selection + highlight connections
- **Hover**: Show quick info (when hover mode enabled)

## 🏗️ Architecture

### MCP Integration Flow
1. User sends message to console
2. Message sent to Claude API with MCP configuration
3. AI processes and uses appropriate MCP tools
4. Tool results automatically update graph via events
5. UI reflects changes in real-time

### Event System
- `mcpGraphReload`: Triggered when read_graph succeeds
- `mcpNodeHighlight`: Triggered when find_nodes succeeds
- Custom events ensure automatic UI updates

### Data Flow
```
User Input → Console → MCP Client → Claude API → MCP Tools → Graph Update
```

## 🔬 Development

### Debug Logging
The system includes comprehensive logging:
- `[MCP Connection]`: Connection status and testing
- `[MCP Request]`: API requests and responses
- `[MCP Tool Detection]`: Tool usage analysis
- `[MCP Process]`: Tool result processing

### Testing MCP Integration
1. Open console with `/`
2. Type "read graph"
3. Check console logs for MCP tool usage
4. Verify graph updates automatically

## 📊 Project Progress

Stored in NEO4J graph:
- **Neron Project Session January 2025**: Current development session
- **MCP System Enhancement**: Technical improvements
- **Console System**: UI components
- **Graph Visualization Core**: 3D graph system
- **Next Critical Tasks**: Upcoming priorities

## 🐛 Known Issues

1. **MCP Tool Usage**: AI sometimes responds with text instead of using tools
2. **TypeScript Types**: Some complex MCP response types need refinement
3. **Performance**: Large graphs may need optimization

## 🗺️ Roadmap

### Phase 1: MCP Stability
- [ ] Fix tool usage enforcement
- [ ] Add retry mechanisms
- [ ] Implement tool validation

### Phase 2: Advanced Features
- [ ] Graph export/import
- [ ] Advanced search and filtering
- [ ] Real-time collaboration

### Phase 3: Performance
- [ ] Large graph optimization
- [ ] Virtual scrolling
- [ ] Bundle size reduction

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with comprehensive logging
4. Test MCP integration thoroughly
5. Submit pull request

## 📝 License

MIT License - see LICENSE file for details

---

**Status**: 🟡 Development - MCP integration needs testing and refinement
**Last Updated**: January 2025
**Next Priority**: Fix MCP tool usage consistency
