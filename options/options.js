// Options page controller
class OptionsController {
  constructor() {
    this.defaultSettings = {
      screenshotQuality: 'high',
      waitTime: '3000',
      captureFullPage: true,
      excludeHiddenElements: true,
      documentationFormat: 'markdown',
      includeAccessibility: true,
      maxRoutes: 20,
      segmentationThreshold: 0.7,
      enableBatchProcessing: true,
      enableCaching: true,
    };

    this.init();
  }

  async init() {
    await this.loadSettings();
    this.bindEvents();
    this.updateUI();
  }

  bindEvents() {
    // Form submission
    document.getElementById('settingsForm').addEventListener('submit', e => {
      e.preventDefault();
      this.saveSettings();
    });

    // Reset button
    document.getElementById('resetBtn').addEventListener('click', () => {
      this.resetToDefaults();
    });

    // Threshold slider
    document
      .getElementById('segmentationThreshold')
      .addEventListener('input', e => {
        document.getElementById('thresholdValue').textContent = e.target.value;
      });
  }

  async loadSettings() {
    try {
      const stored = await chrome.storage.sync.get(
        Object.keys(this.defaultSettings)
      );
      this.settings = { ...this.defaultSettings, ...stored };
    } catch (error) {
      console.error('Failed to load settings:', error);
      this.settings = { ...this.defaultSettings };
    }
  }

  async saveSettings() {
    try {
      // Collect form data
      const formData = new FormData(document.getElementById('settingsForm'));
      const newSettings = {};

      // Process form fields
      for (const [key, value] of formData.entries()) {
        if (key === 'maxRoutes' || key === 'waitTime') {
          newSettings[key] = parseInt(value, 10);
        } else if (key === 'segmentationThreshold') {
          newSettings[key] = parseFloat(value);
        } else {
          newSettings[key] = value;
        }
      }

      // Handle checkboxes (unchecked checkboxes don't appear in FormData)
      const checkboxes = [
        'captureFullPage',
        'excludeHiddenElements',
        'includeAccessibility',
        'enableBatchProcessing',
        'enableCaching',
      ];

      checkboxes.forEach(checkbox => {
        newSettings[checkbox] = formData.has(checkbox);
      });

      // Validate settings
      if (!this.validateSettings(newSettings)) {
        return;
      }

      // Save to storage
      await chrome.storage.sync.set(newSettings);
      this.settings = newSettings;

      this.showStatus('Settings saved successfully!', 'success');
    } catch (error) {
      console.error('Failed to save settings:', error);
      this.showStatus('Failed to save settings. Please try again.', 'error');
    }
  }

  validateSettings(settings) {
    // Validate numeric ranges
    if (settings.maxRoutes < 1 || settings.maxRoutes > 100) {
      this.showStatus('Maximum routes must be between 1 and 100.', 'error');
      return false;
    }

    if (
      settings.segmentationThreshold < 0.3 ||
      settings.segmentationThreshold > 0.9
    ) {
      this.showStatus(
        'Segmentation threshold must be between 0.3 and 0.9.',
        'error'
      );
      return false;
    }

    return true;
  }

  resetToDefaults() {
    if (
      confirm(
        'Are you sure you want to reset all settings to their default values?'
      )
    ) {
      this.settings = { ...this.defaultSettings };
      this.populateForm();
      this.showStatus('Settings reset to defaults.', 'success');
    }
  }

  populateForm() {
    const form = document.getElementById('settingsForm');

    // Populate all form fields
    Object.keys(this.settings).forEach(key => {
      const element = form.elements[key];
      if (!element) return;

      if (element.type === 'checkbox') {
        element.checked = this.settings[key];
      } else if (element.type === 'range') {
        element.value = this.settings[key];
        if (key === 'segmentationThreshold') {
          document.getElementById('thresholdValue').textContent =
            this.settings[key];
        }
      } else {
        element.value = this.settings[key];
      }
    });
  }

  updateUI() {
    this.populateForm();
  }

  showStatus(message, type) {
    const statusElement = document.getElementById('statusMessage');
    statusElement.textContent = message;
    statusElement.className = `status-message ${type}`;
    statusElement.style.display = 'block';

    // Auto-hide after 3 seconds
    setTimeout(() => {
      statusElement.style.display = 'none';
    }, 3000);
  }

  // Export settings for backup
  async exportSettings() {
    try {
      const settings = await chrome.storage.sync.get(null);
      const dataStr = JSON.stringify(settings, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });

      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'route-capture-settings.json';
      link.click();

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export settings:', error);
      this.showStatus('Failed to export settings.', 'error');
    }
  }

  // Import settings from backup
  async importSettings(file) {
    try {
      const text = await file.text();
      const settings = JSON.parse(text);

      // Validate imported settings
      const validKeys = Object.keys(this.defaultSettings);
      const filteredSettings = {};

      validKeys.forEach(key => {
        if (Object.prototype.hasOwnProperty.call(settings, key)) {
          filteredSettings[key] = settings[key];
        }
      });

      await chrome.storage.sync.set(filteredSettings);
      this.settings = { ...this.defaultSettings, ...filteredSettings };
      this.populateForm();

      this.showStatus('Settings imported successfully!', 'success');
    } catch (error) {
      console.error('Failed to import settings:', error);
      this.showStatus(
        'Failed to import settings. Please check the file format.',
        'error'
      );
    }
  }
}

// Initialize options controller when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new OptionsController();
});
