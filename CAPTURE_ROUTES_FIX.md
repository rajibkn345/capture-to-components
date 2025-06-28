# 🔧 Capture Routes - Debugging Guide

## ✅ FIXES APPLIED

### 1. **Missing Message Handler** - FIXED ✅
- **Issue**: Background script didn't handle `processAndCaptureRoute` action
- **Fix**: Added case for `processAndCaptureRoute` in `background.js`
- **Location**: `handleMessage()` method in `background.js`

### 2. **Missing processSingleRoute Method** - FIXED ✅
- **Issue**: Background script was missing the method to process individual routes
- **Fix**: Added `processSingleRoute()` method in `background.js`
- **Features**: Validates route, processes with error handling, returns structured data

### 3. **Missing captureScreenshot Method** - FIXED ✅
- **Issue**: Background script was missing screenshot capture functionality
- **Fix**: Added `captureScreenshot()` method in `background.js`
- **Features**: Rate limiting, permission error handling, database storage

### 4. **Enhanced Debugging** - ADDED ✅
- **Issue**: Insufficient logging for troubleshooting
- **Fix**: Added comprehensive console logging throughout the capture process
- **Features**: Route validation, message tracking, result logging

## 🧪 TESTING STEPS

### 1. Load Extension and Test Basic Flow
```javascript
// Open Chrome DevTools (F12) and follow these steps:

// 1. Navigate to any website (e.g., https://example.com)
// 2. Open extension popup
// 3. Click "Scan Routes" - should detect at least current page
// 4. Select at least one route by checking the checkbox
// 5. Click "Capture Routes" - watch console for detailed logs
```

### 2. Console Monitoring
Check for these log messages in the popup console:

```
=== CAPTURE ROUTES STARTED ===
Selected route IDs: ["current-page-1234567890"]
Available routes: [{id: "current-page-1234567890", url: "...", ...}]
Looking for route with ID current-page-1234567890: {id: "...", url: "...", ...}
Selected routes for capture: [{...}]
Valid routes after filtering: [{...}]
Processing route 1/1: {id: "...", url: "...", ...}
Sending processAndCaptureRoute message for: {id: "...", url: "...", ...}
```

And in the background console:
```
Background: received message: processAndCaptureRoute
Background: handling processAndCaptureRoute
Processing single route: {id: "...", url: "...", ...}
```

### 3. Common Issues & Solutions

#### Issue: "No routes selected for capture"
- **Check**: Are any checkboxes checked in the route list?
- **Fix**: Click on route checkboxes to select them

#### Issue: "No valid routes found after filtering"  
- **Check**: Do routes have `url` property?
- **Debug**: Check `Available routes:` log for route structure

#### Issue: "Background: received message: undefined"
- **Check**: Message sending failed from popup
- **Debug**: Check popup console for Chrome API errors

#### Issue: "Could not establish connection"
- **Check**: Background script not responding
- **Fix**: Reload extension at `chrome://extensions/`

#### Issue: Processing succeeds but no data stored
- **Check**: `chrome.storage.local.set()` errors
- **Debug**: Manual storage check:
```javascript
chrome.storage.local.get(['processedRoutes']).then(console.log);
```

### 4. Verification Steps

#### Step 1: Verify Route Selection
```javascript
// In popup console, check selected routes:
console.log('Selected route IDs:', Array.from(popupController.selectedRoutes));
console.log('Available routes:', popupController.routes);
```

#### Step 2: Verify Message Sending
```javascript
// Test message sending manually:
chrome.runtime.sendMessage({
  action: 'processAndCaptureRoute',
  route: {id: 'test', url: 'https://example.com', title: 'Test'}
}).then(console.log);
```

#### Step 3: Verify Data Storage
```javascript
// Check if data was stored:
chrome.storage.local.get(['processedRoutes', 'processingStatus']).then(console.log);
```

#### Step 4: Verify Export Button
```javascript
// Check if export button is enabled after capture:
console.log('Export button disabled:', document.getElementById('exportBtn').disabled);
```

## 🚨 Troubleshooting Commands

### Clear Storage (if data seems stuck)
```javascript
chrome.storage.local.clear().then(() => console.log('Storage cleared'));
```

### Check Extension Manifest
```javascript
chrome.runtime.getManifest();
```

### Reload Extension Background Script
- Go to `chrome://extensions/`
- Find your extension
- Click "Reload" button

### Check Permission Errors
```javascript
// Check if activeTab permission is working:
chrome.tabs.query({active: true, currentWindow: true}).then(console.log);
```

## ✅ Expected Behavior After Fix

1. **Route Selection**: Routes show up with checkboxes, can be selected
2. **Capture Button**: Becomes enabled when routes are selected
3. **Processing**: Shows progress, detailed console logs
4. **Storage**: Data saved to `chrome.storage.local` under `processedRoutes` key
5. **Export Button**: Becomes enabled after successful capture
6. **Error Handling**: Graceful fallback with meaningful error messages

## 🎯 Success Indicators

- ✅ Console shows detailed processing logs
- ✅ Background script responds to messages
- ✅ Routes are processed without errors
- ✅ Data is stored in chrome.storage.local
- ✅ Export button becomes enabled
- ✅ Status message shows "Analysis complete! Ready to export."

If all these indicators are met, the "Capture Routes" functionality is working correctly!

## 🔧 Next Steps

After confirming capture works:
1. Test the "Export Analysis" functionality
2. Verify all 4 markdown files are generated
3. Test with multiple routes
4. Test with different types of websites

The core capture issue has been resolved with proper message handling, route processing, and screenshot functionality!
