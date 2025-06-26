# Extension Validation Checklist

## Before Testing

1. **Load Extension**: Load the `/extension` folder in Chrome Developer Mode
2. **Open Test Page**: Navigate to `enhanced-test-page.html` in a browser tab
3. **Open Extension**: Click the extension icon to open the popup

## Testing Steps

### Step 1: Route Scanning ✅

- Click "Scan Routes" button
- **Expected**: Should show "Found 1 routes" or "Added current page"
- **No Errors**: No "connection" errors in console

### Step 2: Route Selection ✅

- Check the checkbox next to the detected route
- **Expected**: "Capture Routes" button becomes enabled

### Step 3: Route Processing ✅

- Click "Capture Routes" button
- **Expected**:
  - Progress bar appears
  - Status shows "Processing routes..."
  - Takes 8-10 seconds minimum
  - No quota or iteration errors in console

### Step 4: Documentation Export ✅

- Click "Export Components" button after processing completes
- **Expected**:
  - Downloads 3 files: `sections.md`, `components.md`, `draft.md`
  - Files contain detailed analysis (not empty or error messages)

## Expected File Contents

### sections.md Should Include:

- Page meta information (title, description, viewport)
- DOM structure overview (total elements, depth, dimensions)
- Layout analysis (structure type, responsive design)
- Detailed section breakdown by type
- Content analysis (headings, images, forms, etc.)
- Accessibility information
- Performance metrics

### components.md Should Include:

- Component pattern analysis
- Usage frequency data
- Variation detection
- Styling information
- Cross-route comparisons

## Troubleshooting

### If Connection Errors Occur:

- Check browser console for detailed error messages
- Try refreshing the page and re-opening the extension
- Ensure the extension has necessary permissions

### If Processing Fails:

- Check that the page has loaded completely
- Try with a different page/URL
- Check background script console for detailed errors

### If Downloads Fail:

- Ensure Chrome has download permissions
- Check that files aren't empty (should be detailed markdown)
- Try the export again after re-processing

## Success Criteria

- ✅ No runtime errors in console
- ✅ Route detection works reliably
- ✅ Processing takes adequate time (8-10+ seconds)
- ✅ Generated markdown files are detailed and comprehensive
- ✅ All major page sections and components are identified
- ✅ Analysis includes accessibility and performance data
