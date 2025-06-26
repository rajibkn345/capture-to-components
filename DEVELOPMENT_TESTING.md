# Chrome Extension Development Testing Guide

## 🚀 Quick Start Testing

### 1. **Load Extension in Chrome (First Time Setup)**

```bash
# 1. Open Chrome and navigate to:
chrome://extensions/

# 2. Enable Developer Mode (toggle in top-right)
# 3. Click "Load unpacked"
# 4. Select: /Users/rajib/Desktop/Project/extensions/extension/
```

### 2. **Create Placeholder Icons (Required for loading)**

Since the extension won't load without icons, create quick placeholders:

```bash
# Navigate to icons directory
cd /Users/rajib/Desktop/Project/extensions/extension/assets/icons/

# Create simple colored PNG files (you can use any image editor)
# Required files:
# - icon16.png (16x16px)
# - icon32.png (32x32px)
# - icon48.png (48x48px)
# - icon128.png (128x128px)

# Quick solution: Use online tools like:
# https://favicon.io/favicon-generator/
# https://www.canva.com/create/logos/
```

## 🔄 Development Testing Workflow

### **Step 1: Basic Extension Loading**

```javascript
// Test checklist:
✅ Extension appears in chrome://extensions/
✅ No errors in extension details
✅ Extension icon visible in Chrome toolbar
✅ Can click extension icon without errors
```

### **Step 2: Popup Testing**

```javascript
// Open extension popup and check:
1. Click extension icon in toolbar
2. Popup window opens (400x600px)
3. UI elements render correctly
4. No JavaScript errors in console

// Debug popup:
// Right-click extension icon → Inspect popup
// Console shows any JavaScript errors
```

### **Step 3: Content Script Testing**

```javascript
// Test on different websites:
1. Navigate to any website (e.g., github.com)
2. Open browser DevTools (F12)
3. Check Console tab for messages
4. Look for content script injection logs

// Expected console output:
"RouteDetector initialized"
"Found X routes on page"
```

### **Step 4: Route Detection Testing**

```javascript
// Test route scanning:
1. Open extension popup
2. Click "Scan Routes" button
3. Check if routes appear in list
4. Verify different route types are detected

// Test websites:
- Static sites: wikipedia.org
- SPA sites: github.com, reddit.com
- E-commerce: amazon.com
```

## 🛠 Development Testing Tools

### **Chrome DevTools Integration**

```javascript
// Debugging different components:

// 1. Background Script (Service Worker)
chrome://extensions/ → Extension Details → Service Worker → Inspect

// 2. Popup Script
Right-click extension icon → Inspect popup

// 3. Content Script
F12 on any webpage → Console tab

// 4. Options Page
Right-click extension → Options → F12
```

### **Console Debugging Commands**

```javascript
// Add to your code for debugging:

// In content-script.js
console.log('Routes detected:', this.routes);
console.log('Current URL:', window.location.href);

// In popup.js
console.log('Popup initialized');
console.log('Settings loaded:', this.settings);

// In background.js
console.log('Background script running');
console.log('Message received:', request);
```

## 🧪 Feature Testing Scenarios

### **Route Detection Testing**

```javascript
// Test cases:
const testSites = [
  'https://github.com',          // SPA with React Router
  'https://docs.github.com',     // Static site
  'https://stackoverflow.com',   // Complex navigation
  'https://example.com',         // Simple static site
];

// For each site:
1. Navigate to site
2. Open extension popup
3. Click "Scan Routes"
4. Verify routes are detected
5. Check route types (static, spa, navigation)
```

### **Settings Testing**

```javascript
// Test settings functionality:
1. Right-click extension → Options
2. Try different AI provider settings
3. Change component framework options
4. Save settings and reload extension
5. Verify settings persist

// Test API key validation:
1. Enter invalid API key
2. Verify error message appears
3. Test with valid API key format
```

### **Screenshot Testing** (Once implemented)

```javascript
// Test screenshot capture:
1. Select routes in popup
2. Click "Capture Selected Routes"
3. Monitor progress indicator
4. Check browser Downloads folder
5. Verify screenshots are captured
```

## 🔄 Live Reload During Development

### **Manual Reload Process**

```bash
# After making code changes:
1. Go to chrome://extensions/
2. Find your extension
3. Click reload button (circular arrow)
4. Test the changes
```

### **Quick Testing Script**

```javascript
// Add to package.json scripts:
{
  "scripts": {
    "test:basic": "echo 'Open chrome://extensions/ and reload extension'",
    "test:routes": "echo 'Test route detection on github.com'",
    "test:popup": "echo 'Right-click extension icon and inspect popup'",
    "test:content": "echo 'Check console on test websites'"
  }
}
```

## 📊 Testing Checklist by Development Phase

### **Phase 1: Foundation Testing**

```javascript
✅ Extension loads without errors
✅ Icons display correctly
✅ Popup opens and renders
✅ Settings page accessible
✅ Content script injects on websites
✅ No console errors in any component
```

### **Phase 2: Route Detection Testing**

```javascript
✅ Static routes detected from anchor tags
✅ SPA routes detected (React Router, etc.)
✅ Navigation menus analyzed
✅ Sitemap.xml parsing works
✅ Route deduplication works
✅ Search/filter functionality works
```

### **Phase 3: Screenshot Testing**

```javascript
✅ Single route screenshot capture
✅ Multiple route batch processing
✅ Full-page screenshot capture
✅ Quality settings work
✅ Progress tracking accurate
✅ Error handling for failed captures
```

### **Phase 4: AI Integration Testing**

```javascript
✅ OpenAI API integration works
✅ Fallback analysis when AI fails
✅ API key validation
✅ Rate limiting handling
✅ Image preprocessing works
✅ Component detection accuracy
```

## 🐛 Common Issues & Solutions

### **Extension Won't Load**

```javascript
// Issue: Extension not appearing in chrome://extensions/
// Solutions:
1. Check manifest.json syntax (use JSON validator)
2. Ensure all required icon files exist
3. Verify folder structure is correct
4. Check Chrome console for specific errors
```

### **Popup Won't Open**

```javascript
// Issue: Clicking extension icon does nothing
// Solutions:
1. Check popup.html syntax
2. Verify popup.js has no syntax errors
3. Check if popup files are in correct directory
4. Inspect popup for console errors
```

### **Content Script Not Working**

```javascript
// Issue: No route detection happening
// Solutions:
1. Check manifest.json content_scripts configuration
2. Verify content-script.js syntax
3. Test on different websites
4. Check if site blocks extension scripts
```

### **Settings Not Saving**

```javascript
// Issue: Settings don't persist after reload
// Solutions:
1. Verify chrome.storage permission in manifest
2. Check options.js save/load logic
3. Test with simple values first
4. Check browser storage in DevTools
```

## 📈 Performance Testing

### **Memory Usage Monitoring**

```javascript
// Monitor extension memory usage:
1. Go to chrome://extensions/
2. Click "Details" on your extension
3. Check memory usage in task manager
4. Test with large websites
5. Verify no memory leaks during batch processing
```

### **Speed Testing**

```javascript
// Test processing speed:
1. Time route detection on large sites
2. Measure screenshot capture duration
3. Monitor AI processing time
4. Test batch processing performance
```

## 🔄 Automated Testing Setup (Future)

```javascript
// For future development, consider:
{
  "devDependencies": {
    "jest": "^29.0.0",
    "puppeteer": "^19.0.0",  // For automated browser testing
    "selenium-webdriver": "^4.0.0"
  },
  "scripts": {
    "test:unit": "jest",
    "test:e2e": "node tests/e2e.js"
  }
}
```

This testing guide provides a comprehensive approach to testing your Chrome extension during
development. Start with the basic loading tests and progressively test more complex features as you
implement them.
