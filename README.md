# Divengine.com - VSCode-Inspired Static Site

A VSCode-inspired static website showcasing Divengine Software Solutions' open-source projects. Built with vanilla HTML, CSS, and JavaScript - no frameworks or build tools needed.

## 🎯 Features

- **VSCode-Like Interface**: Complete IDE shell with activity bar, explorer, tabs, editor, panel, and status bar
- **Dark Theme**: VSCode-inspired dark theme with proper fonts and colors
- **Project Explorer**: Navigate through featured repositories
- **Markdown Rendering**: README files rendered with syntax highlighting
- **Quick Open**: Ctrl+P to quickly search and open projects
- **Responsive Design**: Works on desktop and mobile devices
- **GitHub Integration**: Fetches live data from GitHub API with smart caching
- **Hash Routing**: Clean URLs without server dependencies

## 🏗️ Architecture

### Core Files

- `index.html` - Main HTML structure
- `config.json` - Site configuration and project definitions
- `CNAME` - Domain configuration for GitHub Pages

### CSS Modules

- `layout.css` - Grid system and responsive layout
- `vscode.css` - VSCode-inspired UI components and theme
- `editor.css` - Editor area and markdown content styling

### JavaScript Modules

- `app.js` - Application bootstrap and routing
- `state.js` - Global state management with event system
- `ui.js` - UI rendering and interaction handling
- `data.js` - GitHub API integration with caching
- `renderers.js` - Markdown processing and sanitization

### Assets

- `assets/` - SVG icons matching VSCode's icon set

## 🚀 Development

### Local Development

1. Clone the repository
2. Serve the files using any static server:
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Using Node.js
   npx serve .
   
   # Using PHP
   php -S localhost:8000
   ```
3. Open `http://localhost:8000`

### Configuration

Edit `config.json` to:
- Add new projects to the explorer
- Modify theme colors and fonts
- Configure GitHub API settings
- Customize navigation and layout

### Adding Projects

Add items to the `explorer.sections[].items` array:

```json
{
  "slug": "project-name",
  "label": "Project Name",
  "type": "repo",
  "repo": "repository-name",
  "branch": "main",
  "readmePath": "README.md",
  "description": "Project description",
  "tags": ["tag1", "tag2"]
}
```

## 📁 Project Structure

```
divengine.github.io/
├── index.html              # Main HTML file
├── config.json            # Site configuration
├── CNAME                  # Domain configuration
├── README.md              # Documentation
├── layout.css             # Layout and grid system
├── vscode.css             # VSCode UI components
├── editor.css             # Editor styling
├── app.js                 # Application entry point
├── state.js               # State management
├── ui.js                  # UI rendering
├── data.js                # Data fetching
├── renderers.js           # Content processing
└── assets/                # Icons and images
    ├── explorer.svg
    ├── search.svg
    ├── source-control.svg
    ├── run.svg
    ├── settings.svg
    ├── git-branch.svg
    ├── cloud.svg
    └── database.svg
```

## 🎨 Theming

The site uses CSS custom properties for theming:

```css
:root {
  --color-bg: #1e1e1e;
  --color-panel: #252526;
  --color-editor-bg: #1e1e1e;
  --color-border: #3c3c3c;
  --color-text: #d4d4d4;
  --color-muted: #9da1a6;
  --color-accent: #4fc1ff;
  /* ... */
}
```

## 🌐 Deployment

### GitHub Pages

1. Push to the `main` branch
2. Go to repository Settings → Pages
3. Set source to "Deploy from a branch" → `main` → `/` (root)
4. Custom domain: `divengine.com` (already configured in CNAME)

### Custom Domain Setup

1. Add CNAME record: `divengine.com` → `divengine.github.io`
2. Enable "Enforce HTTPS" in GitHub Pages settings

## 🔧 API Integration

### GitHub API Features

- Repository metadata (stars, description, last update)
- README content fetching with branch fallback
- Recent commits display
- Rate limit monitoring

### Caching Strategy

- localStorage cache with TTL (30 minutes default)
- Cache keys: `divengine.cache.{repo}.{type}`
- Automatic cache invalidation

## 🎮 User Interactions

### Keyboard Shortcuts

- `Ctrl+P` / `Cmd+P` - Open Quick Open modal
- `Escape` - Close modals

### Navigation

- Click activity bar icons to toggle panels
- Click explorer items to open README files
- Use tabs to switch between open files
- Panel tabs switch between Output and Commits

## 🔍 Hash Routing

- `#/` - Welcome view
- `#/repo/{slug}` - Open specific repository README

## 📝 Content Management

### README Processing

1. Fetch from GitHub raw content API
2. Process with marked.js for Markdown parsing
3. Sanitize HTML with DOMPurify
4. Apply syntax highlighting with highlight.js
5. Render in editor area

### Error Handling

- Graceful fallbacks for network issues
- Cache-first approach for offline resilience
- User-friendly error messages

## 🔒 Security

- Content Security Policy headers (configure in hosting)
- HTML sanitization for user-generated content
- HTTPS enforcement
- No external script injection

## 📊 Performance

- Lazy loading of repository data
- Efficient caching strategy
- Minimal external dependencies
- Optimized for Core Web Vitals

## 🤝 Contributing

1. Fork the repository
2. Make your changes
3. Test locally
4. Submit a pull request

## 📄 License

This project is open source. See individual repository licenses for details.

## 🏢 About Divengine

Divengine is an open-source initiative, not a company or legal entity. We create tools and libraries for web development, focusing on PHP, JavaScript, and modern web technologies.