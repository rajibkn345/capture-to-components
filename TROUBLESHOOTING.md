# Extension Troubleshooting Guide

## Issues Fixed

### 1. Service Worker Registration Failed (Status Code: 15)

**Fixed**: Removed `importScripts('lib/ai-segmentation.js')` from background.js that was causing
browser-specific code to run in service worker context.

### 2. "window is not defined" Error

**Fixed**: Updated ai-segmentation.js to use `globalThis` instead of `window` for service worker
compatibility.

### 3. "Could not establish connection" Error

**Fixed**: Added automatic content script injection when the initial message fails.

## Updated Testing Steps

### 1. Reload Extension

1. Go to `chrome://extensions/`
2. Click the refresh button on your extension
3. Check that there are no errors in the service worker console

### 2. Test with Provided Test Page

1. Open the `test-page.html` file in Chrome
2. Open the extension popup
3. Click "Scan Routes" - should find the navigation links
4. Select a route and click "Capture Routes"
5. Click "Export Analysis" to download files

### 3. Test on Real Website

1. Navigate to any website (e.g., https://example.com)
2. Open extension popup
3. Click "Scan Routes"
4. If no routes found, it will add current page automatically

## Debug Console Commands

### Check Extension Status

```javascript
// In any webpage console
chrome.runtime.sendMessage('YOUR_EXTENSION_ID', { action: 'getSettings' });
```

### Check Service Worker

1. Go to `chrome://extensions/`
2. Find your extension
3. Click "service worker" link
4. Check for any error messages

### Check Content Script

```javascript
// In webpage console where extension should be working
console.log('Content script check:', typeof RouteDetector);
```

## Expected Behavior

### After Scanning Routes:

- Should see at least one route (current page if nothing else)
- Status should show "Found X routes" or "No routes detected, added current page"

### After Capturing Routes:

- Status should change to "Routes processed successfully"
- Export button should become enabled
- Processing progress should be visible

### After Export:

- Three files should download: `sections.md`, `components.md`, `draft.md`
- Files should contain mock component analysis data

## Common Issues

### Extension Icon Grayed Out

- Check that the extension is enabled
- Refresh the webpage and try again

### No Routes Found

- This is normal for many sites
- Extension will automatically add current page as a route

### Content Script Not Loading

- Extension now automatically injects content script if needed
- Check browser console for any script errors

### Download Not Working

- Ensure downloads permission is granted
- Check Chrome's download settings

## File Contents Preview

The exported files should contain structured data like:

**sections.md**: Route-by-route breakdown of UI sections **components.md**: Reusable component
patterns  
**draft.md**: Initial analysis overview

All files currently use mock data but have realistic structure for testing the export workflow.

## Next Steps After Testing

Once basic functionality is confirmed:

1. Re-enable AI processing for real analysis
2. Remove debug console logs
3. Add user-friendly error messages
4. Implement progress indicators
