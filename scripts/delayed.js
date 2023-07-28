// eslint-disable-next-line import/no-cycle
import { sampleRUM } from './lib-franklin.js';

// Core Web Vitals RUM collection
sampleRUM('cwv');

const loadScript = (url, attrs) => {
  const head = document.querySelector('head');
  const script = document.createElement('script');
  script.src = url;
  if (attrs) {
    // eslint-disable-next-line no-restricted-syntax, guard-for-in
    for (const attr in attrs) {
      script.setAttribute(attr, attrs[attr]);
    }
  }
  head.append(script);
  return script;
};

// Load Launch properties (adobedtm)
if (window.location.host.startsWith('localhost')) {
  loadScript('https://assets.adobedtm.com/cd4adbd8cb66/6aa35b5164ee/launch-534da7cdc4a6-development.min.js');
} else if (window.location.host.endsWith('.page')) {
  loadScript('https://assets.adobedtm.com/cd4adbd8cb66/6aa35b5164ee/launch-ded48fdb644c-staging.min.js');
} else {
  loadScript('https://assets.adobedtm.com/cd4adbd8cb66/6aa35b5164ee/launch-355fa8ac70fd.min.js');
}
