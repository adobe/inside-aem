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
  loadScript('https://assets.adobedtm.com/6a74768abd57/91fdbbc8bc46/launch-e011f1baf01e-development.min.js');
} else if (window.location.host.endsWith('.page')) {
  loadScript('https://assets.adobedtm.com/6a74768abd57/91fdbbc8bc46/launch-25e27b4ac91e-staging.min.js');
} else {
  loadScript('https://assets.adobedtm.com/6a74768abd57/91fdbbc8bc46/launch-75a87f02bf62.min.js');
}
