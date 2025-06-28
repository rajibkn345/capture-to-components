// Test script for popup functionality
// Paste this in the popup console to test if everything is working

console.log('=== POPUP FUNCTIONALITY TEST ===');

// Test 1: Check if PopupController is initialized
console.log('1. PopupController instance:', window.popupController ? '✅ FOUND' : '❌ NOT FOUND');

// Test 2: Check if all buttons exist
const buttons = {
  scanBtn: document.getElementById('scanBtn'),
  captureBtn: document.getElementById('captureBtn'),
  exportBtn: document.getElementById('exportBtn'),
  refreshBtn: document.getElementById('refreshBtn'),
  settingsBtn: document.getElementById('settingsBtn'),
  selectAllBtn: document.getElementById('selectAllBtn'),
  deselectAllBtn: document.getElementById('deselectAllBtn')
};

console.log('2. Button Elements:');
Object.entries(buttons).forEach(([name, element]) => {
  console.log(`   ${name}:`, element ? '✅ FOUND' : '❌ MISSING');
});

// Test 3: Check if input elements exist
const inputs = {
  searchInput: document.getElementById('searchInput'),
  filterSelect: document.getElementById('filterSelect'),
  routeList: document.getElementById('routeList')
};

console.log('3. Input Elements:');
Object.entries(inputs).forEach(([name, element]) => {
  console.log(`   ${name}:`, element ? '✅ FOUND' : '❌ MISSING');
});

// Test 4: Test button click handlers (if PopupController exists)
if (window.popupController) {
  console.log('4. Testing button functionality...');
  
  // Test scan button
  if (buttons.scanBtn) {
    console.log('   Testing Scan button click...');
    buttons.scanBtn.click();
  }
  
  // Test other buttons with delay
  setTimeout(() => {
    if (buttons.selectAllBtn) {
      console.log('   Testing Select All button...');
      buttons.selectAllBtn.click();
    }
  }, 1000);
  
} else {
  console.log('4. ❌ Cannot test button functionality - PopupController not found');
}

// Test 5: Check Chrome API availability
console.log('5. Chrome API availability:');
console.log('   chrome.runtime:', typeof chrome?.runtime !== 'undefined' ? '✅ AVAILABLE' : '❌ MISSING');
console.log('   chrome.tabs:', typeof chrome?.tabs !== 'undefined' ? '✅ AVAILABLE' : '❌ MISSING');
console.log('   chrome.storage:', typeof chrome?.storage !== 'undefined' ? '✅ AVAILABLE' : '❌ MISSING');

console.log('=== TEST COMPLETE ===');
console.log('If all items show ✅, the popup should be working correctly!');

// Helper function to manually test capture
window.testCapture = function() {
  if (window.popupController && window.popupController.routes.length > 0) {
    console.log('Testing manual capture...');
    window.popupController.selectedRoutes.add(window.popupController.routes[0].id);
    window.popupController.captureRoutes();
  } else {
    console.log('Please scan routes first, then run testCapture() again');
  }
};

console.log('💡 TIP: After scanning routes, you can run testCapture() to test the capture functionality');
