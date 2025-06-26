# Capture to Component

> Chrome extension that automatically discovers website routes, captures screenshots, segments them
> using AI, and generates detailed component analysis with comprehensive documentation.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Chrome Web Store](https://img.shields.io/badge/Chrome-Web%20Store-brightgreen)](https://chrome.google.com/webstore)
[![Version](https://img.shields.io/badge/version-1.0.0-blue)](package.json)

## 🔒 Security Notice

**IMPORTANT**: This extension **does not include** hardcoded API keys. All AI features are optional
and require user configuration through the extension settings. The extension works fully without API
keys using DOM-based analysis.

## 🚀 Features

- **🔍 Automatic Route Discovery** - Scans websites for static routes, SPA routes, navigation links,
  and sitemap entries
- **📸 Smart Screenshot Capture** - Captures full-page screenshots with customizable quality
  settings
- **🤖 AI-Powered Segmentation** - Uses advanced AI to identify UI components and sections
- **📊 Component Analysis** - Analyzes UI patterns and generates detailed component structure
  documentation
- **📝 Comprehensive Documentation** - Generates detailed markdown files with component
  specifications and analysis
- **�️ Architecture Documentation** - Creates sections.md and components.md files for design system
  planning
- **🔧 Configurable AI Providers** - Works with OpenAI, Google Vision, AWS Rekognition, and custom
  APIs

## 📦 Installation

### Development Setup

1. **Clone and install dependencies**

   ```bash
   git clone https://github.com/rajib/capture-to-component.git
   cd capture-to-component
   npm install
   ```

2. **Generate extension icons**

   ```bash
   npm run icon:generate
   ```

3. **Load extension in Chrome**

   ```bash
   # Open Chrome and navigate to:
   chrome://extensions/

   # Enable Developer mode and click "Load unpacked"
   # Select the 'extension' folder
   ```

4. **Configure AI provider**
   - Click the extension icon in Chrome
   - Go to Settings to configure your preferred AI provider and API keys

### Production Build

```bash
npm run build        # Build extension package
npm run package      # Lint, test, and build
npm run zip          # Create distribution zip file
```

## 🛠️ Development

### Available Scripts

| Script                  | Description                               |
| ----------------------- | ----------------------------------------- |
| `npm start`             | Start development mode with auto-reload   |
| `npm run build`         | Build extension for production            |
| `npm run lint`          | Run ESLint on all JavaScript files        |
| `npm run test`          | Run Jest test suite                       |
| `npm run format`        | Format code with Prettier                 |
| `npm run validate`      | Validate extension manifest and structure |
| `npm run docs:generate` | Generate JSDoc documentation              |

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Code Quality

The project uses ESLint, Prettier, and Husky for code quality:

```bash
# Lint and fix code
npm run lint:fix

# Format all files
npm run format

# Pre-commit hooks will run automatically
git commit -m "Your commit message"
```

## 🏗️ Project Structure

```
capture-to-component/
├── extension/                          # Chrome extension source
│   ├── manifest.json                   # Extension manifest
│   ├── background.js                   # Background service worker
│   ├── content-script.js              # Content script for route detection
│   ├── popup/                         # Extension popup UI
│   │   ├── popup.html
│   │   ├── popup.css
│   │   └── popup.js
│   ├── options/                       # Settings page
│   │   ├── options.html
│   │   ├── options.css
│   │   └── options.js
│   ├── lib/                          # Core functionality
│   │   ├── ai-segmentation.js        # AI-powered image analysis
│   │   ├── component-generator.js    # React component generation
│   │   ├── screenshot-capture.js     # Screenshot utilities
│   │   └── markdown-generator.js     # Documentation generation
│   └── assets/
│       └── icons/                    # Extension icons
├── scripts/                          # Build and utility scripts
├── tests/                           # Test files
├── docs/                           # Generated documentation
└── dist/                           # Build output
```

## ⚙️ Configuration

### API Key Setup (Optional - Extension works without AI)

The extension includes **optional** AI-powered analysis features. **The extension works fully
without any API keys using DOM-based analysis.**

**To enable AI features**:

1. **Get an API Key** (optional):

   - OpenAI: https://platform.openai.com/api-keys
   - Create a new API key and copy it

2. **Configure in Extension**:
   - Click the extension icon in Chrome toolbar
   - Click the settings button (gear icon)
   - Enter your API key in the settings
   - Save settings

**Security Notes**:

- API keys are stored securely in Chrome's sync storage
- Keys are never logged or transmitted except to official AI APIs
- You can use the extension without any API keys

### AI Provider Configuration

If you choose to use AI features, the extension supports:

#### OpenAI GPT Vision

```javascript
{
  "aiProvider": "openai",
  "apiKey": "sk-your-openai-key",
  "model": "gpt-4-vision-preview"
}
```

#### Google Vision AI

```javascript
{
  "aiProvider": "google",
  "apiKey": "your-google-vision-key",
  "projectId": "your-project-id"
}
```

#### AWS Rekognition

```javascript
{
  "aiProvider": "aws",
  "accessKeyId": "your-aws-access-key",
  "secretAccessKey": "your-aws-secret-key",
  "region": "us-east-1"
}
```

### Component Generation Options

```javascript
{
  "componentFramework": "react",     // react | vue | angular | svelte
  "outputFormat": "typescript",     // typescript | javascript
  "stylingFramework": "tailwind",   // css-modules | styled-components | tailwind | scss
  "includeStorybook": true,         // Generate Storybook stories
  "includeTests": true,             // Generate Jest tests
  "includeAccessibility": true      // Include accessibility attributes
}
```

## 📖 Usage

### Basic Workflow

1. **Navigate to a website** you want to analyze
2. **Click the extension icon** to open the popup
3. **Click "Discover Routes"** to automatically find all routes
4. **Select routes** you want to capture and analyze
5. **Configure capture settings** (quality, wait time, etc.)
6. **Start capture process** - the extension will:
   - Take screenshots of each route
   - Analyze images with AI to identify components
   - Generate React components with proper TypeScript interfaces
   - Create comprehensive documentation

### Generated Output

The extension creates three main documentation files:

- **`draft.md`** - Initial route analysis and overview
- **`sections.md`** - Detailed breakdown of UI sections and components
- **`components.md`** - Complete component library with usage examples

### Advanced Features

- **Custom AI Prompts** - Customize how the AI analyzes your screenshots
- **Component Templates** - Use predefined templates for common UI patterns
- **Batch Processing** - Process multiple websites or routes simultaneously
- **Export Options** - Export as npm package, Storybook, or individual files

## 🧪 Testing

The project includes comprehensive testing:

- **Unit Tests** - Jest tests for all core functionality
- **Extension Tests** - Chrome extension API testing with jest-chrome
- **Integration Tests** - End-to-end testing of the complete workflow
- **Visual Regression Tests** - Ensure UI consistency

### Running Specific Tests

```bash
# Test AI segmentation
npm test -- ai-segmentation

# Test component generation
npm test -- component-generator

# Test with coverage
npm run test:coverage
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and add tests
4. Run the test suite: `npm test`
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

### Development Guidelines

- Follow the existing code style (ESLint + Prettier)
- Add tests for new functionality
- Update documentation as needed
- Ensure all tests pass before submitting PR

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **OpenAI** for GPT Vision API
- **Google Cloud** for Vision AI
- **AWS** for Rekognition
- **Chrome Extensions Team** for excellent documentation
- **React Team** for component inspiration

## 📞 Support

- 🐛 [Report Bug](https://github.com/rajib/capture-to-component/issues)
- 💡 [Request Feature](https://github.com/rajib/capture-to-component/issues)
- 📖 [Documentation](https://github.com/rajib/capture-to-component/wiki)
- 💬 [Discussions](https://github.com/rajib/capture-to-component/discussions)

---

**Made with ❤️ by [Rajib](https://github.com/rajib)**
