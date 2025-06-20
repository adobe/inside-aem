// Configuration constants for the JIRA Issue Creator
const CONFIG = {
  // JIRA API endpoints and settings
  JIRA: {
    API_VERSION: '2',
    // Default JIRA instance settings
    DEFAULT_INSTANCE: 'https://spycher.atlassian.net',
    DEFAULT_PROJECT_KEY: 'KAN',
    DEFAULT_EMAIL: 'subscription@spycher.one',

    ISSUE_TYPES: {
      CO_INNOVATION: 'Co-Innovation',
      EXPERIMENT: 'Experiment',
    },

    // Issue type display names
    ISSUE_TYPE_NAMES: {
      'Co-Innovation': 'Co-Innovation',
      Experiment: 'Experiment',
    },
  },

  // UI Constants
  UI: {
    SUCCESS_MESSAGE_TIMEOUT: 5000, // 5 seconds
    MAX_SLACK_URLS: 10,
  },

  // Validation
  VALIDATION: {
    MIN_TITLE_LENGTH: 3,
    MIN_DESCRIPTION_LENGTH: 10,
    MAX_TITLE_LENGTH: 255,
    MAX_DESCRIPTION_LENGTH: 32767,
  },
};

// Utility function to get API endpoint URL
function getJiraApiUrl(baseUrl, endpoint) {
  const cleanBaseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
  return `${cleanBaseUrl}/rest/api/${CONFIG.JIRA.API_VERSION}/${endpoint}`;
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CONFIG, getJiraApiUrl };
}

export default CONFIG;
