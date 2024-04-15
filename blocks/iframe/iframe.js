export default function decorate(block) {
  const iframe = document.createElement('iframe');
  iframe.src = new URL(block.textContent.trim());
  iframe.sandbox = 'allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms allow-storage-access-by-user-activation';
  block.innerHTML = '';
  block.append(iframe);
}
