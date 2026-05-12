import {
  buildArticleCard,
  getBlogArticle,
  fetchPlaceholders,
} from '../../scripts/scripts.js';

async function decorateRecommendedArticles(recommendedArticlesEl, paths) {
  if (recommendedArticlesEl.classList.contains('small')) {
    recommendedArticlesEl.parentNode.querySelectorAll('a').forEach((aEl) => {
      aEl.classList.add('button', 'primary', 'small', 'light');
    });
    recommendedArticlesEl.parentNode.classList.add('recommended-articles-small-content-wrapper');
  } else {
    const title = document.createElement('h3');
    const placeholders = await fetchPlaceholders();
    title.textContent = placeholders['recommended-for-you'];
    recommendedArticlesEl.prepend(title);
  }
  const articleCardsContainer = document.createElement('div');
  articleCardsContainer.className = 'article-cards';

  const articles = await Promise.all(paths.map((p) => getBlogArticle(p)));
  articles.forEach((article, i) => {
    if (article) {
      articleCardsContainer.append(buildArticleCard(article));
    } else {
      const { origin } = new URL(window.location.href);
      // eslint-disable-next-line no-console
      console.warn(`Recommended article does not exist or is missing in index: ${origin}${paths[i]}`);
    }
  });

  if (articleCardsContainer.childElementCount > 0) {
    recommendedArticlesEl.append(articleCardsContainer);
  } else {
    recommendedArticlesEl.parentNode.parentNode.remove();
  }
}

export default function decorate(blockEl) {
  const anchors = [...blockEl.querySelectorAll('a')];
  blockEl.innerHTML = '';
  const paths = anchors.map((a) => new URL(a.href).pathname);
  decorateRecommendedArticles(blockEl, paths);
}
