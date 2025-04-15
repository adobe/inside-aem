/* eslint-disable import/named, import/extensions */

import {
  buildArticleCard,
  getBlogArticle,
} from '../../scripts/scripts.js';

async function decorateFeaturedArticles(featuredArticlesEl, articlePaths, eager = false) {
  // Add the container class for styling
  featuredArticlesEl.classList.add('featured-article-container');

  const tagHeader = document.querySelector('.tag-header-container > div');

  for (const articlePath of articlePaths) {
    const article = await getBlogArticle(articlePath);
    if (article) {
      const card = buildArticleCard(article, 'featured-article', eager);
      card.classList.add('featured-article-card'); // Ensure the card has the correct class
      featuredArticlesEl.append(card);
    } else {
      const { origin } = new URL(window.location.href);
      // eslint-disable-next-line no-console
      console.warn(`Featured article does not exist or is missing in index: ${origin}${articlePath}`);
    }
  }

  if (tagHeader) {
    tagHeader.append(featuredArticlesEl);
  }
}

export default async function decorate(block, blockName, document, eager) {
  const links = block.querySelectorAll('a');
  block.innerHTML = '';

  if (links.length > 0) {
    const paths = Array.from(links).map((a) => new URL(a.href).pathname);
    await decorateFeaturedArticles(block, paths, eager);
  }
}