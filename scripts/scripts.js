import {
  buildBlock,
  createOptimizedPicture,
  loadFooter,
  loadBlock,
  decorateButtons,
  decorateIcons,
  decorateSections,
  decorateBlock,
  decorateBlocks,
  decorateTemplateAndTheme,
  waitForLCP,
  loadBlocks,
  loadCSS,
  getMetadata,
  toClassName,
} from './lib-franklin.js';

const LCP_BLOCKS = []; // add your LCP blocks to the list

/**
 * Builds hero block and prepends to main in a new section.
 * @param {Element} main The container element
 */
function buildHeroBlock(main) {
  const h1 = main.querySelector('h1');
  const picture = main.querySelector('picture');
  // eslint-disable-next-line no-bitwise
  if (h1 && picture && (h1.compareDocumentPosition(picture) & Node.DOCUMENT_POSITION_PRECEDING)) {
    const section = document.createElement('div');
    section.append(buildBlock('hero', { elems: [picture, h1] }));
    main.prepend(section);
  }
}

/**
 * removes formatting from images.
 * @param {Element} mainEl The container element
 */
function removeStylingFromImages(mainEl) {
  // remove styling from images, if any
  const styledImgEls = [...mainEl.querySelectorAll('strong picture'), ...mainEl.querySelectorAll('em picture')];
  styledImgEls.forEach((imgEl) => {
    const parentEl = imgEl.closest('p');
    parentEl.prepend(imgEl);
    parentEl.lastElementChild.remove();
  });
}

let language;
let taxonomy;

const LANG = {
  EN: 'en',
  DE: 'de',
  FR: 'fr',
  KO: 'ko',
  ES: 'es',
  IT: 'it',
  JP: 'jp',
  BR: 'br',
};

const LANG_LOCALE = {
  en: 'en_US',
  de: 'de_DE',
  fr: 'fr_FR',
  ko: 'ko_KR',
  es: 'es_ES',
  it: 'it_IT',
  jp: 'ja_JP',
  br: 'pt_BR',
};

export function getLanguage() {
  if (language) return language;
  language = LANG.EN;
  const segs = window.location.pathname.split('/');
  if (segs && segs.length > 0) {
    // eslint-disable-next-line no-restricted-syntax
    for (const [, value] of Object.entries(LANG)) {
      if (value === segs[1]) {
        language = value;
        break;
      }
    }
  }
  return language;
}

/**
 * Returns the language dependent root path
 * @returns {string} The computed root path
 */
export function getRootPath() {
  const loc = getLanguage();
  return `/${loc}`;
}

/**
 * Returns a link tag with the proper href for the given topic.
 * If the taxonomy is not yet available, the tag is decorated with the topicLink
 * data attribute so that the link can be fixed later.
 * @param {string} topic The topic name
 * @returns {string} A link tag as a string
 */
export function getLinkForTopic(topic, path) {
  // temporary title substitutions
  const titleSubs = {
    'Transformation digitale': 'Transformation numérique',
  };
  let catLink;
  if (taxonomy) {
    const tax = taxonomy.get(topic);
    if (tax) {
      catLink = tax.link;
    } else {
      // eslint-disable-next-line no-console
      console.debug(`Trying to get a link for an unknown topic: ${topic} ${path ? `on page ${path}` : '(current page)'}`);
      catLink = '#';
    }
  }

  return `<a href="${catLink || ''}" ${!catLink ? `data-topic-link="${topic}"` : ''}>${titleSubs[topic] || topic}</a>`;
}

/**
 * returns an image caption of a picture elements
 * @param {Element} picture picture element
 */
function getImageCaption(picture) {
  const parentEl = picture.parentNode;
  const parentSiblingEl = parentEl.nextElementSibling;
  return (parentSiblingEl && parentSiblingEl.firstChild.nodeName === 'EM' ? parentSiblingEl : undefined);
}

export function getLocale() {
  const lang = getLanguage();
  return LANG_LOCALE[lang];
}

/**
 * Add Article to article history for personalization
 */
function addArticleToHistory() {
  const locale = getLocale();
  const key = `blog-${locale}-history`;
  const history = JSON.parse(localStorage.getItem(key) || '[]');
  history.unshift({ path: window.location.pathname, tags: getMetadata('article:tag') });
  localStorage.setItem(key, JSON.stringify(history.slice(0, 5)));
}

/**
 * builds article header block from meta and default content.
 * @param {Element} mainEl The container element
 */
function buildArticleHeader(mainEl) {
  const div = document.createElement('div');
  const h1 = mainEl.querySelector('h1');
  const picture = mainEl.querySelector('picture');
  const tags = getMetadata('article:tag', true);
  const category = tags.length > 0 ? tags[0] : '';
  const author = getMetadata('author');
  const authorURL = getMetadata('author-url') || `${getRootPath()}/authors/${toClassName(author)}`;
  const publicationDate = getMetadata('publication-date');

  const categoryTag = getLinkForTopic(category);

  const articleHeaderBlockEl = buildBlock('article-header', [
    [`<p>${categoryTag}</p>`],
    [h1],
    [`<p><a href="${authorURL}">${author}</a></p>
      <p>${publicationDate}</p>`],
    [{ elems: [picture.closest('p'), getImageCaption(picture)] }],
  ]);
  div.append(articleHeaderBlockEl);
  mainEl.prepend(div);
}

function buildTagHeader(mainEl) {
  const div = mainEl.querySelector('div');

  if (div) {
    const heading = div.querySelector(':scope > h1, div > h2');
    const picture = div.querySelector(':scope > p > picture');

    if (picture) {
      const tagHeaderBlockEl = buildBlock('tag-header', [
        [heading],
        [{ elems: [picture.closest('p')] }],
      ]);
      div.prepend(tagHeaderBlockEl);
    }
  }
}

function buildSocialLinks(mainEl) {
  const socialPar = [...mainEl.querySelectorAll('p')].find((p) => p.textContent.trim() === 'Social:');
  if (socialPar && socialPar.nextElementSibling === socialPar.parentNode.querySelector('ul')) {
    const socialLinkList = socialPar.nextElementSibling.outerHTML;
    socialPar.nextElementSibling.remove();
    socialPar.replaceWith(buildBlock('social-links', [[socialLinkList]]));
  }
}

function buildNewsletterModal(mainEl) {
  const $div = document.createElement('div');
  const $newsletterModal = buildBlock('newsletter-modal', []);
  $div.append($newsletterModal);
  mainEl.append($div);
}

function buildArticleFeed(mainEl, type) {
  const div = document.createElement('div');
  const title = mainEl.querySelector('h1, h2').textContent.trim();
  const articleFeedEl = buildBlock('article-feed', [
    [type, title],
  ]);
  div.append(articleFeedEl);
  mainEl.append(div);
}

function buildAuthorHeader(mainEl) {
  const div = mainEl.querySelector('div');
  const heading = mainEl.querySelector('h1, h2');
  const bio = heading.nextElementSibling;
  const picture = mainEl.querySelector('picture');
  const elArr = [[heading]];
  if (picture) {
    elArr.push([{ elems: [picture.closest('p')] }]);
  }
  if (bio && bio.nodeName === 'P') {
    elArr.push([bio]);
  }
  const authorHeaderBlockEl = buildBlock('author-header', elArr);
  div.prepend(authorHeaderBlockEl);
}

/**
 * builds images blocks from default content.
 * @param {Element} mainEl The container element
 */
function buildImageBlocks(mainEl) {
  // select all non-featured, default (non-images block) images
  const imgEls = [...mainEl.querySelectorAll(':scope > div > p > picture')];
  let lastImagesBlock;
  imgEls.forEach((imgEl) => {
    const parentEl = imgEl.parentNode;
    const imagesBlockEl = buildBlock('images', {
      elems: [imgEl.cloneNode(true), getImageCaption(imgEl)],
    });
    if (parentEl.parentNode) {
      parentEl.replaceWith(imagesBlockEl);
      lastImagesBlock = imagesBlockEl;
    } else {
      // same parent, add image to last images block
      lastImagesBlock.firstElementChild.append(imagesBlockEl.firstElementChild.firstElementChild);
    }
  });
}

/**
 * Builds all synthetic blocks in a container element.
 * @param {Element} main The container element
 */
function buildAutoBlocks(main) {
  removeStylingFromImages(main);
  try {
    buildHeroBlock(main);
    if (getMetadata('publication-date') && !main.querySelector('.article-header')) {
      buildArticleHeader(main);
      addArticleToHistory();
    }
    if (window.location.pathname.includes('/topics/')) {
      buildTagHeader(main);
      if (!main.querySelector('.article-feed')) {
        buildArticleFeed(main, 'tags');
      }
    }
    if (window.location.pathname.includes('/authors/')) {
      buildAuthorHeader(main);
      buildSocialLinks(main);
      if (!document.querySelector('.article-feed')) {
        buildArticleFeed(main, 'author');
      }
    }
    buildImageBlocks(main);
    buildNewsletterModal(main);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Auto Blocking failed', error);
  }
}

function unwrapBlock(block) {
  const section = block.parentNode;
  const els = [...section.children];
  const blockSection = document.createElement('div');
  const postBlockSection = document.createElement('div');
  const nextSection = section.nextElementSibling;
  section.parentNode.insertBefore(blockSection, nextSection);
  section.parentNode.insertBefore(postBlockSection, nextSection);

  let appendTo;
  els.forEach((el) => {
    if (el === block) appendTo = blockSection;
    if (appendTo) {
      appendTo.appendChild(el);
      appendTo = postBlockSection;
    }
  });
  if (section.childElementCount === 0) {
    section.remove();
  }
  if (blockSection.childElementCount === 0) {
    blockSection.remove();
  }
  if (postBlockSection.childElementCount === 0) {
    postBlockSection.remove();
  }
}

function splitSections() {
  document.querySelectorAll('main > div > div').forEach((block) => {
    const blocksToSplit = ['article-header', 'article-feed', 'recommended-articles', 'video', 'carousel'];
    if (blocksToSplit.includes(block.className)) {
      unwrapBlock(block);
    }
  });
}

function removeEmptySections() {
  document.querySelectorAll('main > div').forEach((div) => {
    if (div.innerHTML.trim() === '') {
      div.remove();
    }
  });
}

/**
 * Decorates the main element.
 * @param {Element} main The main element
 */
// eslint-disable-next-line import/prefer-default-export
export function decorateMain(main) {
  // hopefully forward compatible button decoration
  decorateButtons(main);
  decorateIcons(main);
  buildAutoBlocks(main);
  splitSections();
  removeEmptySections();
  decorateSections(main);
  decorateBlocks(main);
}

/**
 * For the given list of topics, returns the corresponding computed taxonomy:
 * - category: main topic
 * - topics: tags as an array
 * - visibleTopics: list of visible topics, including parents
 * - allTopics: list of all topics, including parents
 * @param {Array} topics List of topics
 * @returns {Object} Taxonomy object
 */
function computeTaxonomyFromTopics(topics, path) {
  // no topics: default to a randomly choosen category
  const category = topics?.length > 0 ? topics[0] : 'news';
  if (taxonomy && topics) {
    const allTopics = [];
    const visibleTopics = [];
    // if taxonomy loaded, we can compute more
    topics.forEach((tag) => {
      const tax = taxonomy.get(tag);
      if (tax) {
        if (!allTopics.includes(tag) && !tax.skipMeta) {
          allTopics.push(tag);
          if (tax.isUFT) visibleTopics.push(tag);
          const parents = taxonomy.getParents(tag);
          if (parents) {
            parents.forEach((parent) => {
              const ptax = taxonomy.get(parent);
              if (!allTopics.includes(parent)) {
                allTopics.push(parent);
                if (ptax.isUFT) visibleTopics.push(parent);
              }
            });
          }
        }
      } else {
        // eslint-disable-next-line no-console
        console.debug(`Unknown topic in tags list: ${tag} ${path ? `on page ${path}` : '(current page)'}`);
      }
    });
    return {
      category, topics, visibleTopics, allTopics,
    };
  }
  return {
    category, topics,
  };
}

// eslint-disable-next-line no-unused-vars
async function loadTaxonomy() {
  const mod = await import('./taxonomy.js');
  taxonomy = await mod.default(getLanguage());
  if (taxonomy) {
    // taxonomy loaded, post loading adjustments
    // fix the links which have been created before the taxonomy has been loaded
    // (pre lcp or in lcp block).
    document.querySelectorAll('[data-topic-link]').forEach((a) => {
      const topic = a.dataset.topicLink;
      const tax = taxonomy.get(topic);
      if (tax) {
        a.href = tax.link;
      } else {
        // eslint-disable-next-line no-console
        console.log(`Trying to get a link for an unknown topic: ${topic} (current page)`);
        a.href = '#';
      }
      delete a.dataset.topicLink;
    });

    // adjust meta article:tag

    const currentTags = getMetadata('article:tag', true);
    const articleTax = computeTaxonomyFromTopics(currentTags);

    const allTopics = articleTax.allTopics || [];
    allTopics.forEach((topic) => {
      if (!currentTags.includes(topic)) {
        // computed topic (parent...) is not in meta -> add it
        const newMetaTag = document.createElement('meta');
        newMetaTag.setAttribute('property', 'article:tag');
        newMetaTag.setAttribute('content', topic);
        document.head.append(newMetaTag);
      }
    });

    currentTags.forEach((tag) => {
      const tax = taxonomy.get(tag);
      if (tax && tax.skipMeta) {
        // if skipMeta, remove from meta "article:tag"
        const meta = document.querySelector(`[property="article:tag"][content="${tag}"]`);
        if (meta) {
          meta.remove();
        }
        // but add as meta with name
        const newMetaTag = document.createElement('meta');
        newMetaTag.setAttribute('name', tag);
        newMetaTag.setAttribute('content', 'true');
        document.head.append(newMetaTag);
      }
    });
  }
}

export function getTaxonomy() {
  return taxonomy;
}

/**
 * Loads everything needed to get to LCP.
 * @param {Element} doc The container element
 */
async function loadEager(doc) {
  document.documentElement.lang = 'en';
  decorateTemplateAndTheme();
  const main = doc.querySelector('main');
  if (main) {
    decorateMain(main);
    document.body.classList.add('appear');
    await waitForLCP(LCP_BLOCKS);
  }

  // application is very dependant on taxonomy being present, moving to loadEager
  // to make sure that the taxonomy is loaded
  await loadTaxonomy();
}

/**
 * Adds the favicon.
 * @param {string} href The favicon URL
 */

export function addFavIcon(href) {
  const link = document.createElement('link');
  link.rel = 'icon';
  link.href = href;
  const existingLink = document.querySelector('head link[rel="icon"]');
  if (existingLink) {
    existingLink.parentElement.replaceChild(link, existingLink);
  } else {
    document.getElementsByTagName('head')[0].appendChild(link);
  }
}

/**
 * fetches blog article index.
 * @returns {object} index with data and path lookup
 */
export async function fetchBlogArticleIndex() {
  const pageSize = 400;
  window.blogIndex = window.blogIndex || {
    data: [],
    byPath: {},
    offset: 0,
    complete: false,
  };
  if (window.blogIndex.complete) return (window.blogIndex);
  const index = window.blogIndex;
  const resp = await fetch(`${getRootPath()}/query-index.json?limit=${pageSize}&offset=${index.offset}`);
  const json = await resp.json();
  const complete = (json.limit + json.offset) === json.total;
  json.data.forEach((post) => {
    index.data.push(post);
    index.byPath[post.path.split('.')[0]] = post;
  });
  index.complete = complete;
  index.offset = json.offset + pageSize;
  return (index);
}

/**
 * Loads (i.e. sets on object) the taxonmoy properties for the given article.
 * @param {Object} article The article to enhance with the taxonomy data
 */
function loadArticleTaxonomy(article) {
  if (!article.allTopics) {
    // for now, we can only compute the category
    const { tags, path } = article;

    if (tags) {
      const topics = tags
        .replace(/[["\]]/gm, '')
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t && t !== '');

      const articleTax = computeTaxonomyFromTopics(topics, path);

      article.category = articleTax.category;

      // topics = tags as an array
      article.topics = topics;

      // visibleTopics = visible topics including parents
      article.visibleTopics = articleTax.allVisibleTopics;

      // allTopics = all topics including parents
      article.allTopics = articleTax.allTopics;
    } else {
      article.category = 'News';
      article.topics = [];
      article.visibleTopics = [];
      article.allTopics = [];
    }
  }
}

/**
 * Get the taxonomy of the given article. Object can be composed of:
 * - category: main topic
 * - topics: tags as an array
 * - visibleTopics: list of visible topics, including parents
 * - allTopics: list of all topics, including parents
 * Note: to get the full object, taxonomy must be loaded
 * @param {Object} article The article
 * @returns The taxonomy object
 */
export function getArticleTaxonomy(article) {
  if (!article.allTopics) {
    loadArticleTaxonomy(article);
  }

  const {
    category,
    topics,
    visibleTopics,
    allTopics,
  } = article;

  return {
    category, topics, visibleTopics, allTopics,
  };
}

// eslint-disable-next-line no-unused-vars
function buildTagsBlock(mainEl) {
  const topics = getMetadata('article:tag', true);
  if (taxonomy && topics.length > 0) {
    const articleTax = computeTaxonomyFromTopics(topics);
    const tagsForBlock = articleTax.visibleTopics.map((topic) => getLinkForTopic(topic));

    const tagsBlock = buildBlock('tags', [
      [`<p>${tagsForBlock.join('')}</p>`],
    ]);
    const recBlock = mainEl.querySelector('.recommended-articles-container');
    if (recBlock) {
      recBlock.previousElementSibling.lastElementChild.append(tagsBlock);
    } else if (mainEl.lastElementChild.firstElementChild) {
      // insert in div of the last element
      mainEl.lastElementChild.firstElementChild.append(tagsBlock);
    }
    decorateBlock(tagsBlock);
    loadBlock(tagsBlock);
  }
}

function getDateLocale() {
  let dateLocale = getLanguage();
  if (dateLocale === LANG.EN) {
    dateLocale = 'en-US'; // default to US date format
  }
  if (dateLocale === LANG.BR) {
    dateLocale = 'pt-BR';
  }
  if (dateLocale === LANG.JP) {
    dateLocale = 'ja-JP';
  }
  const pageName = window.location.pathname.split('/').pop().split('.')[0];
  if (pageName === 'uk' || pageName === 'apac') {
    dateLocale = 'en-UK'; // special handling for UK and APAC landing pages
  }
  return dateLocale;
}

/**
 * Build figcaption element
 * @param {Element} pEl The original element to be placed in figcaption.
 * @returns figCaptionEl Generated figcaption
 */
export function buildCaption(pEl) {
  const figCaptionEl = document.createElement('figcaption');
  pEl.classList.add('caption');
  figCaptionEl.append(pEl);
  return figCaptionEl;
}

/**
 * Build figure element
 * @param {Element} blockEl The original element to be placed in figure.
 * @returns figEl Generated figure
 */
export function buildFigure(blockEl) {
  const figEl = document.createElement('figure');
  figEl.classList.add('figure');
  Array.from(blockEl.children).forEach((child) => {
    const clone = child.cloneNode(true);
    // picture, video, or embed link is NOT wrapped in P tag
    if (clone.nodeName === 'PICTURE' || clone.nodeName === 'VIDEO' || clone.nodeName === 'A') {
      figEl.prepend(clone);
    } else {
      // content wrapped in P tag(s)
      const picture = clone.querySelector('picture');
      if (picture) {
        figEl.prepend(picture);
      }
      const video = clone.querySelector('video');
      if (video) {
        figEl.prepend(video);
      }
      const caption = clone.querySelector('em');
      if (caption) {
        const figElCaption = buildCaption(caption);
        figEl.append(figElCaption);
      }
      const link = clone.querySelector('a');
      if (link) {
        const img = figEl.querySelector('picture') || figEl.querySelector('video');
        if (img) {
          // wrap picture or video in A tag
          link.textContent = '';
          link.append(img);
        }
        figEl.prepend(link);
      }
    }
  });
  return figEl;
}

/**
 * Formats the article date for the card using the date locale
 * matching the content displayed.
 * @param {number} date The date to format
 * @returns {string} The formatted card date
 */
export function formatLocalCardDate(date) {
  let jsDate = date;
  if (!date.includes('-')) {
    // number case, coming from Excel
    // 1/1/1900 is day 1 in Excel, so:
    // - add this
    // - add days between 1/1/1900 and 1/1/1970
    // - add one more day for Excel's leap year bug
    jsDate = new Date(Math.round((date - (1 + 25567 + 1)) * 86400 * 1000));
  } else {
    // Safari won't accept '-' as a date separator
    jsDate = date.replace(/-/g, '/');
  }
  const dateLocale = getDateLocale();

  let dateString = new Date(jsDate).toLocaleDateString(dateLocale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  });
  if (dateLocale === 'en-US') {
    // stylize US date format with dashes instead of slashes
    dateString = dateString.replace(/\//g, '-');
  }
  return dateString;
}

/**
 * Build article card
 * @param {Element} article The article data to be placed in card.
 * @returns card Generated card
 */
export function buildArticleCard(article, type = 'article', eager = false) {
  const {
    title, description, image, imageAlt, date,
  } = article;

  const path = article.path.split('.')[0];

  const picture = createOptimizedPicture(image, imageAlt || title, eager, [{ width: '750' }]);
  const pictureTag = picture.outerHTML;
  const card = document.createElement('a');
  card.className = `${type}-card`;
  card.href = path;

  const articleTax = getArticleTaxonomy(article);
  const categoryTag = getLinkForTopic(articleTax.category, path);

  card.innerHTML = `<div class="${type}-card-image">
      ${pictureTag}
    </div>
    <div class="${type}-card-body">
      <p class="${type}-card-category">
        ${categoryTag}
      </p>
      <h3>${title}</h3>
      <p class="${type}-card-description">${description}</p>
      <p class="${type}-card-date">${formatLocalCardDate(date)}
    </div>`;
  return card;
}

/**
 * fetches the string variables.
 * @returns {object} localized variables
 */
export async function fetchPlaceholders() {
  if (!window.placeholders) {
    const resp = await fetch(`${getRootPath()}/placeholders.json`);
    const json = await resp.json();
    window.placeholders = {};
    json.data.forEach((placeholder) => {
      window.placeholders[placeholder.Key] = placeholder.Text;
    });
  }
  return window.placeholders;
}

/**
 * loads a script by adding a script tag to the head.
 * @param {string} url URL of the js file
 * @param {Function} callback callback on load
 * @param {string} type type attribute of script tag
 * @returns {Element} script element
 */

export function loadScript(url, callback, type) {
  const head = document.querySelector('head');
  const script = document.createElement('script');
  script.setAttribute('src', url);
  if (type) {
    script.setAttribute('type', type);
  }
  head.append(script);
  script.onload = callback;
  return script;
}

/**
 * forward looking *.metadata.json experiment
 * fetches metadata.json of page
 * @param {path} path to *.metadata.json
 * @returns {Object} containing sanitized meta data
 */
async function getMetadataJson(path) {
  let resp;
  try {
    resp = await fetch(`${path.split('.')[0]}?noredirect`);
  } catch {
    // eslint-disable-next-line no-console
    console.debug(`Could not retrieve metadata for ${path}`);
  }

  if (resp && resp.ok) {
    const text = await resp.text();
    const headStr = text.split('<head>')[1].split('</head>')[0];
    const head = document.createElement('head');
    head.innerHTML = headStr;
    const metaTags = head.querySelectorAll(':scope > meta');
    const meta = {};
    metaTags.forEach((metaTag) => {
      const name = metaTag.getAttribute('name') || metaTag.getAttribute('property');
      const value = metaTag.getAttribute('content');
      if (meta[name]) {
        meta[name] += `, ${value}`;
      } else {
        meta[name] = value;
      }
    });
    return meta;
  }
  return null;
}

/**
 * gets a blog article index information by path.
 * @param {string} path indentifies article
 * @returns {object} article object (or null if article does not exist)
 */

export async function getBlogArticle(path) {
  const meta = await getMetadataJson(`${path}.metadata.json`);

  if (meta) {
    let title = meta['og:title'].trim();
    const trimEndings = ['|Adobe', '| Adobe', '| Adobe Blog', '|Adobe Blog'];
    trimEndings.forEach((ending) => {
      if (title.endsWith(ending)) title = title.substr(0, title.length - ending.length);
    });

    const articleMeta = {
      description: meta.description,
      title,
      author: meta.author,
      image: meta['og:image'],
      imageAlt: meta['og:image:alt'],
      date: meta['publication-date'],
      path,
      tags: meta['article:tag'],
    };
    loadArticleTaxonomy(articleMeta);
    return articleMeta;
  }
  return null;
}

export function debug(message, ...args) {
  // const { hostname } = window.location;
  // const env = getHelixEnv();
  // if (env.name !== 'prod' || hostname === 'localhost') {
  // eslint-disable-next-line no-console
  console.log(message, ...args);
  // }
}

function createHighlightSection() {
  const bodyHasFactBoxClass = document.body.classList.contains('fact-box');
  if (bodyHasFactBoxClass) {
    const highlightContainer = document.createElement('div');
    highlightContainer.id = 'highlight';

    const highlightContentContainer = document.createElement('div');
    highlightContentContainer.id = 'highlight-content';

    const h1Headings = document.querySelectorAll('h1');
    h1Headings.forEach((h1) => {
      const spanWithSVG = h1.querySelector('span.icon-new svg');

      if (spanWithSVG) {
        const h1Content = h1.textContent.trim();

        const speakerIconStart = document.createElement('span');
        speakerIconStart.innerHTML = '&#128266;';

        const rocketIcon = document.createElement('span');
        rocketIcon.innerHTML = '&#128640;';

        highlightContentContainer.appendChild(speakerIconStart);
        highlightContentContainer.appendChild(document.createTextNode(' New Post Alert! '));
        highlightContentContainer.appendChild(rocketIcon);
        highlightContentContainer.appendChild(document.createTextNode(` Check out the latest addition in the "${h1Content}" section this week. Dive into valuable insights now!`));

        highlightContainer.classList.add('animate-entry');
      }
    });

    highlightContainer.appendChild(highlightContentContainer);

    const mainElement = document.querySelector('main');
    if (mainElement) {
      mainElement.insertBefore(highlightContainer, mainElement.firstChild);
    } else {
      document.body.appendChild(highlightContainer);
    }
  }
}

/**
 * Loads everything that doesn't need to be delayed.
 * @param {Element} doc The container element
 */
async function loadLazy(doc) {
  const main = doc.querySelector('main');

  // post LCP actions go here
  const { hash } = window.location;
  const element = hash ? doc.getElementById(hash.substring(1)) : false;
  if (hash && element) element.scrollIntoView();

  /* load gnav */
  const header = document.querySelector('header');
  const gnavPath = getMetadata('gnav') || `${getRootPath()}/gnav`;
  header.setAttribute('data-block-name', 'gnav');
  header.setAttribute('data-gnav-source', gnavPath);
  loadBlock(header);

  await loadBlocks(main);
  loadFooter(doc.querySelector('footer'));

  /* taxonomy dependent */
  buildTagsBlock(main); // TODO

  createHighlightSection();

  loadCSS(`${window.hlx.codeBasePath}/styles/lazy-styles.css`);
  addFavIcon(`${window.hlx.codeBasePath}/styles/favicon.svg`);
}

/**
 * Loads everything that happens a lot later,
 * without impacting the user experience.
 */
function loadDelayed() {
  // eslint-disable-next-line import/no-cycle
  window.setTimeout(() => import('./delayed.js'), 3000);
  // load anything that can be postponed to the latest here
}

async function loadPage() {
  await loadEager(document);
  await loadLazy(document);
  loadDelayed();
}

loadPage();

/*
 * lighthouse performance instrumentation helper
 * (needs a refactor)
 */

export function stamp(message) {
  if (window.name.includes('performance')) {
    // eslint-disable-next-line no-console
    console.debug(`${new Date() - performance.timing.navigationStart}:${message}`);
  }
}
