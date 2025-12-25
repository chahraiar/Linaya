/**
 * Polyfill for import.meta on web
 * This allows modules using import.meta to work in the browser
 */

if (typeof globalThis.importMeta === 'undefined') {
  globalThis.importMeta = {
    url: typeof document !== 'undefined' 
      ? document.currentScript?.src || window.location.href 
      : '',
    env: {},
  };
}

// Polyfill for import.meta itself
if (typeof window !== 'undefined' && typeof window.importMeta === 'undefined') {
  Object.defineProperty(window, 'importMeta', {
    value: globalThis.importMeta,
    writable: false,
    configurable: false,
  });
}

