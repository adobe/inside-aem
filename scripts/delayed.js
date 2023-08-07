// eslint-disable-next-line import/no-cycle
import { sampleRUM } from './lib-franklin.js';

// Core Web Vitals RUM collection
sampleRUM('cwv');

async function loadScript(src, parent, attrs) {
  return new Promise((resolve, reject) => {
    if (!document.querySelector(`${parent} > script[src="${src}"]`)) {
      const script = document.createElement('script');
      script.src = src;
      if (attrs) {
        // eslint-disable-next-line no-restricted-syntax, guard-for-in
        for (const attr in attrs) {
          script.setAttribute(attr, attrs[attr]);
        }
      }
      script.onload = resolve;
      script.onerror = reject;
      document.head.append(script);
    } else {
      resolve();
    }
  });
}


// Load Launch properties (adobedtm)
if (window.location.host.startsWith('localhost')) {
  await loadScript('https://assets.adobedtm.com/6a74768abd57/a692f024da9a/launch-6005424708d4-development.min.js');
} else if (window.location.host.endsWith('.page')) {
  await loadScript('https://assets.adobedtm.com/6a74768abd57/a692f024da9a/launch-166628721e50-staging.min.js');
} else {
  await loadScript('https://assets.adobedtm.com/6a74768abd57/ebbe34171c73/launch-9476d77cdb4e.min.js');
}
