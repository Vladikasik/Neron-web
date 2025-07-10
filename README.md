# Neron Graph Visualization Project

A React-based 3D graph visualization application with AI-powered MCP integration, featuring interactive node exploration and AI-driven second brain functionality.

![Matrix-style 3D Graph Visualization](https://img.shields.io/badge/Status-Complete-brightgreen) ![React](https://img.shields.io/badge/React-18+-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5+-blue) ![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3+-blue)

## ✨ Features

### 🌐 3D Graph Visualization
- **Interactive 3D Graph**: Built with `react-force-graph-3d` for smooth 3D node visualization
- **Smart Interactions**: 
  - Single click: Select node + center view + show info card
  - Double click: Persistent selection + highlight connected nodes + center on network
  - Hover: Window-in-window information cards (when hover mode enabled)
- **Visual Effects**: Matrix-style theme with green glow effects and smooth animations

### 📋 Comprehensive Node Cards
- **Draggable Information Cards**: Fully draggable and resizable node detail windows
- **Rich Connection Data**:
  - Incoming links with relationship types
  - Outgoing links with relationship types  
  - Total connection count summaries
  - Clickable connected nodes for navigation
- **Detailed Information**:
  - All node observations
  - Extracted tags from observations (#hashtags)
  - Connection summaries and network statistics
- **Card Management**: Minimize/maximize and persistent selections

### 💻 Interactive Console
- **AI Integration**: Direct Claude API communication with MCP server integration
- **Debugging Features**: 
  - Real-time AI response streaming
  - MCP tool usage logging
  - Request/response timestamps
  - Copy-to-clipboard functionality
- **Draggable Interface**: Positioned in bottom-left with minimize/maximize controls
- **Message History**: Full conversation history with syntax highlighting

### ⌨️ Keyboard Shortcuts
- **H**: Toggle hover mode on/off (shows/hides hover information cards)
- **/** (slash): Show/hide console (focus input when shown)
- **Navigation**: Click background to clear selections, maintain persistent selections

### 🔄 Data Management
- **Caching System**: Intelligent caching with TTL and performance monitoring
- **MCP Integration**: 
  - `read_graph()`: Fetch complete graph data from MCP server
  - `find_nodes()`: Search and highlight specific nodes
  - Real-time graph updates from AI interactions
- **Data Transformation**: Robust parsing of MCP tool outputs to graph format

## 🛠 Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: TailwindCSS + Shadcn UI (Mono theme) + Matrix-style effects
- **3D Graphics**: react-force-graph-3d + Three.js
- **AI Integration**: Claude API with MCP (Model Context Protocol)
- **Icons**: Lucide React
- **Deployment**: Vercel-ready configuration

## 🚀 Quick Start

### Prerequisites
- Node.js 20+ 
- npm or pnpm

### Installation

1. **Clone and install dependencies:**
```bash
git clone <repository>
cd neron
npm install
```

2. **Configure environment variables:**

**For Local Development:**
```bash
# Copy the example file
cp env.example .env.local

# Edit .env.local and add your API keys:
ANTHROPIC_API_KEY=sk-ant-api...
MCP_URL=https://memory.aynshteyn.dev/sse
VITE_MCP_URL=https://memory.aynshteyn.dev/sse
```

**For Vercel Deployment:**
Set these environment variables in your Vercel dashboard:
- `ANTHROPIC_API_KEY` - Your Claude API key
- `MCP_URL` - Your MCP server URL

3. **Start development server:**
```bash
npm run dev
```

4. **Build for production:**
```bash
npm run build
```

## 📖 Usage Guide

### Basic Navigation
1. **Explore the Graph**: Use mouse to rotate, zoom, and pan the 3D view
2. **Select Nodes**: Click any node to see detailed information
3. **Highlight Networks**: Double-click nodes to highlight connected networks
4. **Toggle Console**: Press `/` to open the AI console
5. **Control Hover**: Press `H` to toggle hover information cards

### AI Interaction
1. **Open Console**: Press `/` or click the console button (bottom-left)
2. **Send Messages**: Type messages to interact with Claude AI
3. **Graph Commands**: 
   - "read graph" - Refresh the entire graph from MCP server
   - "find nodes [names]" - Search and highlight specific nodes
4. **Monitor Tools**: Watch MCP tool usage in real-time

### Node Information
- **Connection Summary**: See incoming/outgoing connection counts
- **Relationship Details**: View all connected nodes with relationship types
- **Rich Observations**: Read detailed node descriptions and tags
- **Network Navigation**: Click connected nodes to explore the graph

## 🎨 Matrix Theme

The application features a custom Matrix-style dark theme with:
- **Green Glow Effects**: Subtle glowing borders and shadows
- **Dark Background**: Deep black background with matrix-style patterns
- **Typography**: Matrix-green text with glow effects
- **Interactive Elements**: Smooth hover transitions and animations

## 🏗 Architecture

### Component Structure
```
src/
├── components/
│   ├── Graph3D.tsx          # Main 3D graph visualization
│   ├── NodeCard.tsx         # Draggable node information cards
│   └── Console.tsx          # AI interaction console
├── lib/
│   ├── dataTransformer.ts   # MCP data parsing and transformation
│   ├── graphCache.ts        # Caching system with TTL
│   ├── mcpIntegration.ts    # Claude API and MCP client
│   └── utils.ts             # Utility functions
├── types/
│   └── graph.ts             # TypeScript interfaces
└── App.tsx                  # Main application orchestrator
```

### State Management
- **GraphState**: Centralized state for graph data, selections, and interactions
- **Node Selections**: Support for both temporary and persistent selections
- **Highlighting**: Dynamic highlighting of connected nodes and links
- **UI State**: Console visibility, loading states, and error handling

### Data Flow
1. **MCP Integration** → **Data Transformer** → **Graph Cache** → **3D Visualization**
2. **User Interactions** → **State Updates** → **Visual Feedback**
3. **AI Messages** → **MCP Tools** → **Graph Updates** → **Real-time Sync**

## 🚢 Deployment

### Vercel (Recommended)
1. **Connect Repository**: Link your GitHub repository to Vercel
2. **Environment Variables**: Add your API keys in Vercel dashboard
3. **Deploy**: Automatic deployment on push to main branch

### Manual Deployment
```bash
npm run build
# Upload dist/ folder to your hosting provider
```

## 🔧 Configuration

### MCP Server Setup
The application connects to MCP servers for AI-powered graph management. Configure your MCP server URL in environment variables:

```
VITE_MCP_URL=https://your-mcp-server.com/sse
```

### MCP Integration Details

The project uses the **official Anthropic MCP connector** for seamless AI-graph integration:

**API Configuration:**
- Model: `claude-sonnet-4-20250514` (official MCP connector model)
- Beta header: `"anthropic-beta": "mcp-client-2025-04-04"` ⚠️ **REQUIRED**
- API version: `2023-06-01`

**MCP Tools Available:**
- `read_graph()`: Fetch complete graph structure with all nodes and relationships
- `find_nodes(names)`: Search for specific nodes by name and return details
- `create_entities(entities)`: Create new entities in the graph
- `create_relations(relations)`: Create new relationships between entities  
- `add_observations(observations)`: Add observations to existing entities

**Connection Monitoring:**
- Real-time connection status tracking
- Tool usage analytics and performance metrics
- Response time monitoring with ping tests
- Comprehensive error reporting and debug logs

**Debugging Features:**
- Categorized logging: Connection, Request, Response, MCP Tools
- Tool usage tracking with server identification
- Request/response time profiling
- Debug information included in all API responses
- Console integration for real-time MCP monitoring

### Claude API
Requires Claude API access with MCP client headers:
- `anthropic-version: 2023-06-01`
- `anthropic-beta: mcp-client-2025-04-04` ⚠️ **CRITICAL**

## 📋 TODO Checklist Status

✅ **Completed Tasks:**
- [x] React project initialization with Vite + TypeScript
- [x] TailwindCSS + Shadcn UI with Matrix theme
- [x] 3D graph visualization with react-force-graph-3d
- [x] Node interaction system (hover/click/double-click)
- [x] Draggable information cards with comprehensive data
- [x] Interactive console with AI integration
- [x] Keyboard shortcuts (H for hover, / for console)
- [x] MCP client integration with Claude API
- [x] Caching system with performance monitoring
- [x] Matrix-style visual effects and animations
- [x] Production build and Vercel deployment configuration

🔄 **In Progress:**
- [ ] Performance optimization for large datasets
- [ ] Advanced graph filters and search
- [ ] User guide and documentation improvements

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is open source. See [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

- **react-force-graph-3d**: Excellent 3D graph visualization library
- **Shadcn UI**: Beautiful and accessible component library
- **Claude AI**: Powerful AI integration capabilities
- **TailwindCSS**: Utility-first CSS framework

---

**Built with ❤️ and ⚡ for the future of AI-powered knowledge graphs**
