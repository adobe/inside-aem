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

await loadScript('https://assets.adobedtm.com/6a74768abd57/c0bd9b640f04/launch-b931dfcb8fba.min.js', 'head', { async: true });

