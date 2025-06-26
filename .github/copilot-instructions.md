# Copilot Instructions for Route Capture & React Component Generator Chrome Extension

## Project Overview

This is a Chrome extension that automatically discovers website routes, captures screenshots, segments them using AI, and generates reusable React components with comprehensive documentation. The project uses Chrome Extension APIs, AI services, and modern web technologies.


**Tech Stack:**
- **Frontend**: Vanilla JavaScript, HTML, CSS (no framework in extension UI)
- **Output**: draft.md, sections.md, components.md
- **AI Integration**: OpenAI GPT Vision, Google Vision AI, AWS Rekognition, Custom APIs
- **Styling**: CSS Modules, Styled Components, Tailwind CSS, SCSS support
- **Documentation**: Markdown generation for comprehensive docs

## Core Features & Workflow

### 1. Route Discovery (`content-script.js`)
- Scans DOM for anchor tags and navigation patterns
- Detects SPA routes (React Router, Vue Router, Angular)
- Parses sitemap.xml for comprehensive route discovery
- Identifies navigation menus and dynamic routes

### 2. Screenshot Capture (`lib/screenshot-capture.js`)
- Full-page screenshot capture with quality settings
- Dynamic content loading with configurable wait times
- Batch processing of multiple routes
- Image optimization for AI analysis

### 3. AI-Powered Segmentation (`lib/ai-segmentation.js`)
- Multiple AI provider support (OpenAI, Google Vision, AWS, Custom)
- UI component detection and classification
- Section boundary identification
- Fallback DOM-based analysis


### 5. Documentation Generation (`lib/markdown-generator.js`)
- `draft.md` - Initial route analysis
- `sections.md` - Detailed section breakdown
- `components.md` - Component library documentation

## File Structure & Conventions

```
extension/
├── manifest.json                    # Chrome extension manifest
├── background.js                   # Service worker - handles processing
├── content-script.js              # Route detection & DOM analysis
├── popup/                         # Extension popup interface
│   ├── popup.html                 # Main popup UI
│   ├── popup.css                  # Styling with modern design
│   └── popup.js                   # Popup controller & route management
├── options/                       # Settings & configuration
│   ├── options.html              # Comprehensive settings form
│   ├── options.css               # Settings page styling
│   └── options.js                # Settings management & validation
├── lib/                          # Core functionality modules
│   ├── ai-segmentation.js        # AI service integration
│   ├── component-generator.js    # React component generation
│   ├── screenshot-capture.js     # Screenshot utilities
│   └── markdown-generator.js     # Documentation generation
├── assets/icons/                 # Extension icons (16x16 to 128x128)
└── .github/
    ├── spec.md                   # Technical specification
    └── prompt/                   # AI assistant prompts
        ├── prd.prompt.md         # Product requirements
        ├── architect.prompt.md   # Architecture design
        └── implementer.prompt.md # Implementation guide
```

## Development Guidelines

### Code Style & Patterns
- **ES6+ JavaScript**: Use modern JavaScript features
- **Async/Await**: Prefer async/await over promises for readability
- **Error Handling**: Comprehensive try-catch blocks with user-friendly messages
- **Modular Design**: Each lib file is a self-contained class
- **Chrome APIs**: Use Chrome Extension APIs correctly with proper permissions

### Chrome Extension Specific
- **Manifest V3**: All code follows Manifest V3 standards
- **Service Worker**: Background.js is a service worker, not a background page
- **Content Security Policy**: All scripts are inline-safe
- **Permissions**: Minimal required permissions only
- **Message Passing**: Use chrome.runtime.sendMessage for communication

### AI Integration Patterns
- **Provider Abstraction**: Support multiple AI providers with unified interface
- **Fallback Mechanisms**: Always have non-AI fallbacks
- **API Key Security**: Store keys securely in chrome.storage.sync
- **Rate Limiting**: Handle API rate limits gracefully
- **Caching**: Cache AI results when appropriate

### Markdown Documentation
- **Consistent Structure**: Use consistent headings and sections
- **Clear Examples**: Provide usage examples for components
- **Detailed Descriptions**: Explain each component and section clearly
- **Linking**: Use relative links for easy navigation between markdown files
- **Markdown Linting**: Use a linter to ensure markdown quality

## Key Classes & Methods

### RouteDetector (content-script.js)
```javascript
class RouteDetector {
  detectRoutes()           // Main route detection
  findStaticRoutes()       // Anchor tag analysis
  findSPARoutes()         // SPA framework detection
  analyzeSitemap()        // Sitemap.xml parsing
  analyzeCurrentRoute()   // Current page analysis
}
```

### ScreenshotCapture (lib/screenshot-capture.js)
```javascript
class ScreenshotCapture {
  captureRoute(route)                    // Single route capture
  captureMultipleRoutes(routes, onProgress) // Batch processing
  captureFullPageScreenshot()            // Full page capture
  optimizeForAI()                       // AI-ready optimization
}
```

### AISegmentation (lib/ai-segmentation.js)
```javascript
class AISegmentation {
  segmentImage(imageData, route)         // Main segmentation
  segmentWithOpenAI()                   // OpenAI GPT Vision
  segmentWithGoogleVision()             // Google Vision AI
  analyzeComponents(segments)           // Component analysis
  fallbackSegmentation()               // DOM-based fallback
}
```

### ComponentGenerator (lib/component-generator.js)
```javascript
class ComponentGenerator {
  generateComponent(sectionData)        // Single component generation
  generateReactComponent()              // React-specific generation
  createComponentLibrary()              // Full library generation
  generatePropsInterface()              // TypeScript interfaces
}
```

### MarkdownGenerator (lib/markdown-generator.js)
```javascript
class MarkdownGenerator {
  generateDraftMarkdown()               // draft.md generation
  generateSectionsMarkdown()            // sections.md generation
  generateComponentsMarkdown()          // components.md generation
  generateUsageExamples()              // Component usage examples
}
```

## Configuration & Settings

### Extension Settings (chrome.storage.sync)
```javascript
{
  aiProvider: 'openai|google|aws|custom',
  apiKey: 'encrypted_api_key',
  componentFramework: 'react|vue|angular|svelte',
  outputFormat: 'typescript|javascript',
  stylingFramework: 'css-modules|styled-components|tailwind|scss',
  screenshotQuality: 'high|medium|low',
  includeStorybook: boolean,
  includeTests: boolean,
  includeAccessibility: boolean
}
```



## Common Tasks & Patterns

### Adding New AI Provider
1. Add provider option to `options.html` settings
2. Implement provider method in `AISegmentation` class
3. Add provider-specific configuration handling
4. Update settings validation in `options.js`


### Adding New File Types
1. Extend `MarkdownGenerator` with new file type
2. Add export handling in `background.js`
3. Update popup UI to show new file type
4. Add download functionality

## Error Handling Patterns

### Chrome Extension Errors
```javascript
try {
  const response = await chrome.tabs.sendMessage(tabId, message);
} catch (error) {
  if (error.message.includes('Could not establish connection')) {
    // Handle content script not loaded
  }
}
```

### AI Service Errors
```javascript
try {
  const result = await aiProvider.analyze(image);
} catch (error) {
  console.error('AI analysis failed:', error);
  return this.fallbackAnalysis(image);
}
```

### User-Facing Errors
- Always show user-friendly error messages
- Provide actionable solutions when possible
- Log detailed errors to console for debugging
- Use status indicators in UI to show current state

## Testing Considerations

### Manual Testing
- Test on various website types (SPA, static, e-commerce)
- Verify route detection accuracy
- Test AI provider integrations

### Extension-Specific Testing
- Test popup functionality across different screen sizes
- Verify content script injection on various sites
- Test background script message handling
- Validate file download functionality

## Performance Optimization

### Screenshot Capture
- Implement progressive capture for large pages
- Use configurable quality settings
- Add image compression options
- Cache screenshots when appropriate

### AI Processing
- Batch process multiple routes
- Implement request rate limiting
- Cache AI analysis results
- Use background processing for large jobs

### Memory Management
- Clean up large image data after processing
- Use efficient data structures for route storage
- Implement proper cleanup in background script

## Security Considerations

### API Key Management
- Store API keys encrypted in chrome.storage.sync
- Never log API keys in console
- Validate API keys before use
- Provide clear instructions for key setup

### Content Security Policy
- All scripts must be CSP-compliant
- No eval() or inline script execution
- Use chrome.scripting API for dynamic content

### Data Privacy
- Process screenshots locally when possible
- Clear temporary data after processing
- Respect user privacy settings
- No data collection or tracking

## Extension Deployment

### Development Setup
1. Load unpacked extension in Chrome
2. Configure AI provider API keys
3. Test on sample websites
4. Verify all features work correctly

### Production Deployment
- Prepare extension package
- Create Chrome Web Store listing
- Include privacy policy
- Set up user support channels

## Troubleshooting Common Issues

### Route Detection Issues
- Check if content script is injected properly
- Verify site doesn't block extension scripts
- Test different route detection methods
- Use fallback detection when needed

### AI Integration Issues
- Validate API key configuration
- Check API service status
- Implement proper error handling
- Use fallback analysis methods

### Component Generation Issues
- Verify template syntax is correct
- Test with different component types
- Check TypeScript compilation
- Validate generated file structure

### Documentation Generation Issues
- Ensure markdown files are generated correctly
- Check for missing sections or components
- Validate markdown formatting
- Test file download functionality  