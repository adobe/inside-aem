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

// add more delayed functionality here

// Load Launch properties (adobedtm)
if (window.location.host.startsWith('localhost')) {
  loadScript('https://assets.adobedtm.com/6a74768abd57/a692f024da9a/launch-6005424708d4-development.min.js');
} else if (window.location.host.endsWith('.page')) {
  loadScript('https://assets.adobedtm.com/6a74768abd57/a692f024da9a/launch-166628721e50-staging.min.js');
} else {
  loadScript('https://assets.adobedtm.com/6a74768abd57/a692f024da9a/launch-3ae9c8b61452.min.js');
}

