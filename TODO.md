# Neron Graph Visualization Project - TODO List

## Project Overview
React-based 3D graph visualization with AI-powered MCP integration featuring interactive node exploration and AI-driven second brain functionality. Built with react-force-graph-3d, Shadcn UI (Mono theme), and Claude API integration.

---

## 🚀 Setup

### Project Initialization
- [ ] Initialize React project with Vite/Next.js
- [ ] Install core dependencies:
  - [ ] `react-force-graph-3d`
  - [ ] `@shadcn/ui` components
  - [ ] `lucide-react` for icons
  - [ ] `tailwindcss` for styling
- [ ] Configure Shadcn UI with Mono theme:
  ```bash
  pnpm dlx shadcn@latest add https://tweakcn.com/r/themes/mono.json
  ```
- [ ] Integrate Matrix-style colors and subtle effects in theme
- [ ] Set up Vercel deployment configuration
- [ ] Create `.env.local` file with required variables:
  - [ ] `ANTHROPIC_API_KEY=sk-ant-api...`
  - [ ] `MCP_URL=https://memory.aynshteyn.dev/sse`

### Development Environment
- [ ] Configure TypeScript for type safety
- [ ] Set up ESLint and Prettier
- [ ] Configure build scripts for Vercel deployment
- [ ] Set up environment variable validation

---

## 📊 Graph Data Flow

### Data Transformation Layer
- [ ] Create data transformer for MCP tool output to graph format
- [ ] Implement parser for MCP response structure:
  ```json
  {
    "entities": [...],
    "relations": [...]
  }
  ```
- [ ] Create type definitions for nodes and edges
- [ ] Implement data validation and error handling

### Caching System
- [ ] Design caching mechanism for graph data persistence
- [ ] Implement cache update strategies
- [ ] Create cache invalidation logic
- [ ] Add cache performance monitoring

### MCP Integration Methods
- [ ] Implement `read_graph()` method:
  - [ ] Fetch complete graph data from MCP
  - [ ] Update cache with new data
  - [ ] Trigger full graph reload
- [ ] Implement `find_nodes()` method:
  - [ ] Accept node name arrays as input
  - [ ] Highlight and center specified nodes
  - [ ] Maintain context for selected nodes

---

## 🌐 Graph Visualization

### 3D Graph Integration
- [ ] Install and configure `react-force-graph-3d`
- [ ] Set up 3D scene with proper lighting and camera controls
- [ ] Configure force simulation parameters
- [ ] Implement responsive graph sizing

### Node Interaction System
- [ ] **Hover Functionality:**
  - [ ] Show "window in window" information card on hover
  - [ ] Implement smooth card animations
  - [ ] Add node highlighting on hover
- [ ] **Click Functionality:**
  - [ ] Single click: Show card + center view on node
  - [ ] Double click: Select card (persistent) + center + highlight connected nodes
  - [ ] Implement node selection state management

### Information Cards
- [ ] Create draggable information card component
- [ ] Implement card positioning and drag constraints
- [ ] Add card minimize/maximize functionality
- [ ] Style cards with Mono theme and Matrix effects
- [ ] Support multiple observations and rich content display

### Graph Controls
- [ ] Add zoom controls and limits
- [ ] Implement graph reset/center functionality
- [ ] Create legend for node types and relations
- [ ] Add search and filter capabilities

---

## 💻 Console UI

### Console Window
- [ ] Create draggable console component positioned in bottom-left
- [ ] Add `</>` toggle button for show/hide functionality
- [ ] Implement console window with:
  - [ ] Minimize icon and functionality
  - [ ] Draggable header
  - [ ] Resizable dimensions
  - [ ] Dark theme styling with Matrix effects

### AI Response Display
- [ ] Stream AI responses in real-time to console
- [ ] Display MCP tool usage and debug information
- [ ] Add syntax highlighting for JSON responses
- [ ] Implement auto-scroll for new content
- [ ] Add copy-to-clipboard functionality

### Console Functionality
- [ ] Redirect all AI requests through console logging
- [ ] Show request/response timestamps
- [ ] Add error handling and display
- [ ] Implement console history and search

---

## 🤖 AI and MCP Integration

### Claude API Connection
- [ ] Set up Claude API client with required headers:
  - [ ] `Content-Type: application/json`
  - [ ] `X-API-Key: ${ANTHROPIC_API_KEY}`
  - [ ] `anthropic-version: 2023-06-01`
  - [ ] `anthropic-beta: mcp-client-2025-04-04` ⚠️ **CRITICAL**
- [ ] Configure model: `claude-sonnet-4-20250514`
- [ ] Set up MCP server configuration:
  ```json
  {
    "type": "url",
    "url": "${MCP_URL}",
    "name": "memory"
  }
  ```

### System Prompt Implementation
- [ ] Initialize model with system prompt:
  ```
  "You are a helpful assistant that can create nodes and relations between them. Through this ability you help people to structuralise their thoughts processes and memories in a fluent ai-graph-based second brain. Help user with whatever is their request and adaptise and conceptually understand which parts of talk you need to write on the graph database depending on context. You can use the mcp tool find_nodes to retrieve nodes and relations between them - notice this would show user the result of this mcp tool immediately so better to use it when you want to highlight contextual step and/or change in the data. You can use tool read_graph to read every node all at once - notice it would reload the whole graph on user device (its not a bad thing just to know the user is up to date after this command). You can write multiple tags for each node and even more observations since the display of them is flexible and can include the whole page of information if needed + interactive information."
  ```

### MCP Tool Integration
- [ ] Implement `find_nodes` tool interaction
- [ ] Implement `read_graph` tool interaction
- [ ] Create error handling for MCP tool failures
- [ ] Add tool usage logging and debugging
- [ ] Implement response parsing and graph updates

---

## 🎨 UI and Shortcuts

### Shadcn UI Integration
- [ ] Install and configure Shadcn UI components
- [ ] Apply Mono theme consistently across components
- [ ] Create custom Matrix-style color palette
- [ ] Add subtle animations and effects
- [ ] Ensure responsive design for all screen sizes

### Keyboard Shortcuts
- [ ] Implement global keyboard event handling
- [ ] **'H' Key:** Toggle hover mode on/off
  - [ ] Show visual indicator of hover mode state
  - [ ] Update cursor styling based on mode
- [ ] **'/' Key:** Show/hide console
  - [ ] Smooth animation for console toggle
  - [ ] Focus management for console input

### Matrix Visual Effects
- [ ] Add subtle Matrix-style background effects
- [ ] Implement glowing borders and shadows
- [ ] Create typing/loading animations
- [ ] Add particle effects for node interactions
- [ ] Ensure effects don't impact performance

---

## 🧪 Testing & Optimization

### Testing
- [ ] Set up unit tests for data transformation
- [ ] Create integration tests for MCP tools
- [ ] Test graph performance with large datasets
- [ ] Validate keyboard shortcuts and interactions

### Performance Optimization
- [ ] Optimize graph rendering for large node counts
- [ ] Implement virtual scrolling for console output
- [ ] Add performance monitoring and metrics
- [ ] Optimize bundle size and loading times

### Production Deployment
- [ ] Configure Vercel deployment settings
- [ ] Set up environment variables in Vercel
- [ ] Test production build and deployment
- [ ] Configure custom domain (if needed)

---

## 📚 Documentation

- [ ] Create README with setup instructions
- [ ] Document API endpoints and MCP integration
- [ ] Add component documentation
- [ ] Create user guide for graph interactions

---

**Priority Order:** Setup → Graph Data Flow → Graph Visualization → AI Integration → Console UI → UI Polish → Testing 