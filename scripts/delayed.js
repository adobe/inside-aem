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
/*
if (window.location.host.endsWith('.page') || window.location.host.startsWith('localhost')) {
      loadScript(`https://assets.adobedtm.com/868c1e78d208/${previewLib}.min.js`);
} else {
      loadScript(`https://assets.adobedtm.com/868c1e78d208/${productionLib}.min.js`);
}*/

// Development
loadScript(`https://assets.adobedtm.com/6a74768abd57/a692f024da9a/launch-6005424708d4-development.min.js`);