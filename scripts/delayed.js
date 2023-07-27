// eslint-disable-next-line import/no-cycle
import { sampleRUM } from './lib-franklin.js';

// Core Web Vitals RUM collection
sampleRUM('cwv');

/*
//const loadScript = (url, attrs) => {
async function loadScript (url, attrs) {
  //console.log(url);
  //console.log(attrs);
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
  await loadScript('https://assets.adobedtm.com/6a74768abd57/a692f024da9a/launch-6005424708d4-development.min.js');
} else if (window.location.host.endsWith('.page')) {
  await loadScript('https://assets.adobedtm.com/6a74768abd57/a692f024da9a/launch-166628721e50-staging.min.js');
} else {
  await loadScript('https://assets.adobedtm.com/6a74768abd57/a692f024da9a/launch-3ae9c8b61452.min.js');
}

*/

/*
  * Returns the environment type based on the hostname.
*/
function getEnvType(hostname = window.location.hostname) {
  const fqdnToEnvType = {
    'main--inside-aem--adobe.hlx.page': 'preview',
    'main--inside-aem--adobe.hlx.live': 'live',
    'analytics--inside-aem--adobe.hlx.live': 'live',
  };
  return fqdnToEnvType[hostname] || 'dev';
}

async function loadScript(url, attrs = {}) {
  const script = document.createElement('script');
  script.src = url;
  script.async = true;
  // eslint-disable-next-line no-restricted-syntax
  for (const [name, value] of Object.entries(attrs)) {
    script.setAttribute(name, value);
  }
  const loadingPromise = new Promise((resolve, reject) => {
    script.onload = resolve;
    script.onerror = reject;
  });
  document.head.append(script);
  return loadingPromise;
}

async function loadAdobeLaunch() {
  const adobeotmSrc = {
    dev: 'https://assets.adobedtm.com/6a74768abd57/a692f024da9a/launch-6005424708d4-development.min.js',
    preview: 'https://assets.adobedtm.com/6a74768abd57/a692f024da9a/launch-166628721e50-staging.min.js',
    live: 'https://assets.adobedtm.com/6a74768abd57/a692f024da9a/launch-3ae9c8b61452.min.js',
  };
  await loadScript(adobeotmSrc[getEnvType()]);
}

await loadAdobeLaunch();

