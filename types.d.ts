// Chrome Extension API types for better TypeScript support
declare global {
  interface Window {
    MarkdownGenerator: any;
  }

  var chrome: {
    runtime: {
      getManifest(): any;
      sendMessage(message: any): Promise<any>;
      onMessage: {
        addListener(callback: (request: any, sender: any, sendResponse: any) => void): void;
      };
      onInstalled: {
        addListener(callback: (details: any) => void): void;
      };
      openOptionsPage(): void;
    };
    tabs: {
      query(queryInfo: any): Promise<any[]>;
      sendMessage(tabId: number, message: any): Promise<any>;
      create(createProperties: { url: string; active?: boolean }): Promise<any>;
      update(tabId: number, updateProperties: any): Promise<any>;
      remove(tabId: number | number[]): Promise<void>;
      captureVisibleTab(windowId?: number, options?: any): Promise<string>;
      onUpdated: {
        addListener(callback: (tabId: number, changeInfo: any, tab: any) => void): void;
        removeListener(callback: (tabId: number, changeInfo: any, tab: any) => void): void;
      };
    };
    scripting: {
      executeScript(details: any): Promise<any>;
    };
    storage: {
      local: {
        get(keys: string[]): Promise<any>;
        set(items: any): Promise<void>;
      };
      sync: {
        get(keys: string[]): Promise<any>;
        set(items: any): Promise<void>;
      };
    };
    downloads: {
      download(options: {
        url: string;
        filename?: string;
        conflictAction?: string;
      }): Promise<number>;
    };
  };
}

// DOM element type extensions
interface HTMLElement {
  disabled?: boolean;
  checked?: boolean;
  value?: string;
  dataset?: DOMStringMap;
}

interface HTMLButtonElement {
  disabled: boolean;
}

interface HTMLInputElement {
  checked: boolean;
  value: string;
}

interface HTMLSelectElement {
  value: string;
}

export {};
