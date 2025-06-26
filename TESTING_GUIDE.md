# Extension Testing Guide

## Quick Test Steps

### 1. Test Route Detection

1. Open any website (e.g., https://example.com)
2. Open the extension popup
3. Click "Scan Routes" button
4. You should see at least the current page listed
5. Check browser console (F12) for any error messages

### 2. Test Route Capture

1. Select a route by checking the checkbox
2. Click "Capture Routes" button
3. Wait for processing to complete
4. The status should change to "Routes processed successfully"
5. The "Export Analysis" button should become enabled

### 3. Test Export

1. After capturing routes, click "Export Analysis"
2. Three files should download: `sections.md`, `components.md`, `draft.md`
3. Check the content of these files

## Common Issues & Solutions

### Issue: "No routes found"

- **Solution**: The extension will add the current page as a route automatically
- **Debug**: Check browser console for content script errors

### Issue: "Route capture failed"

- **Solution**: Check browser console for background script errors
- **Note**: The extension now uses mock data for testing

### Issue: "Export failed"

- **Solution**: Ensure routes were captured first
- **Debug**: Check if processed data exists in chrome storage

## Manual Testing Commands

Open browser console (F12) and run:

```javascript
// Check if extension is loaded
chrome.runtime.getManifest();

// Check stored data
chrome.storage.local.get(null).then(console.log);

// Clear stored data (if needed)
chrome.storage.local.clear();
```

## Expected File Contents

### sections.md

Should contain route-by-route breakdown of UI sections

### components.md

Should contain reusable component patterns found across routes

### draft.md

Should contain initial analysis overview

## Debug Mode

The extension now includes extensive console logging. Check:

- **Browser Console**: For popup and content script messages
- **Extension Service Worker**: In Chrome://extensions -> Developer mode -> Service worker logs
