import CONFIG from './config.js';

// Main application state
const AppState = {
  jiraUrl: '',
  credentials: '',
  projectKey: '',
  currentUser: null,
  isDemoMode: false,
  selectedLabels: [],
  useProxy: true, // Use proxy server to avoid CORS issues
  proxyUrl: 'http://localhost:3001/api/jira',
};

// DOM Elements
const Elements = {
  loginSection: null,
  issueSection: null,
  loginForm: null,
  issueForm: null,
  issueType: null,
  successMessage: null,
  errorMessage: null,
  loadingOverlay: null,
  logoutBtn: null,
  demoBtn: null,
  demoIndicator: null,
  issueDetailsModal: null,
  closeModal: null,
  closeModalFooter: null,
  createAnother: null,
  createdIssueKey: null,
  jiraIssueLink: null,
  issueFieldsContainer: null,
  labelsContainer: null,
  selectedLabelsInput: null,
  selectedLabelsDisplay: null,
};

// === Move helpers / used-by-others FIRST ===

function updateLabelsDisplay() {
  if (Elements.selectedLabelsInput) {
    Elements.selectedLabelsInput.value = AppState.selectedLabels.join(',');
  }

  if (Elements.selectedLabelsDisplay) {
    if (AppState.selectedLabels.length === 0) {
      Elements.selectedLabelsDisplay.textContent = 'No labels selected';
      Elements.selectedLabelsDisplay.style.fontStyle = 'italic';
      Elements.selectedLabelsDisplay.style.color = '#6c757d';
    } else {
      Elements.selectedLabelsDisplay.textContent = AppState.selectedLabels.join(', ');
      Elements.selectedLabelsDisplay.style.fontStyle = 'normal';
      Elements.selectedLabelsDisplay.style.color = '#495057';
    }
  }
}

function hideMessages() {
  Elements.successMessage.classList.add('hidden');
  Elements.errorMessage.classList.add('hidden');
}

function showSuccess(message) {
  hideMessages();
  Elements.successMessage.textContent = message;
  Elements.successMessage.classList.remove('hidden');

  // Auto-hide success message
  setTimeout(() => {
    Elements.successMessage.classList.add('hidden');
  }, CONFIG.UI.SUCCESS_MESSAGE_TIMEOUT);
}

function showError(message) {
  hideMessages();
  Elements.errorMessage.textContent = message;
  Elements.errorMessage.classList.remove('hidden');
}

function showLoading() {
  Elements.loadingOverlay.classList.remove('hidden');
}

function hideLoading() {
  Elements.loadingOverlay.classList.add('hidden');
}

function showLoginSection() {
  Elements.loginSection.classList.remove('hidden');
  Elements.issueSection.classList.add('hidden');
}

function showIssueSection() {
  Elements.loginSection.classList.add('hidden');
  Elements.issueSection.classList.remove('hidden');
}

function updateDemoIndicator() {
  if (AppState.isDemoMode) {
    Elements.demoIndicator.classList.remove('hidden');
  } else {
    Elements.demoIndicator.classList.add('hidden');
  }
}

function populateIssueFields(fields) {
  Elements.issueFieldsContainer.innerHTML = '';

  fields.forEach((field) => {
    const fieldRow = document.createElement('div');
    fieldRow.className = `field-row ${field.userSet ? 'user-set' : ''}`;

    const fieldLabel = document.createElement('div');
    fieldLabel.className = `field-label ${field.userSet ? 'user-set' : ''}`;
    fieldLabel.innerHTML = `${field.name}${field.userSet ? '<span class="user-set-indicator">✦</span>' : ''}`;

    const fieldValue = document.createElement('div');
    fieldValue.className = `field-value ${field.userSet ? 'user-set' : ''}`;

    if (!field.value || field.value === '') {
      fieldValue.textContent = 'None';
      fieldValue.className += ' empty';
    } else if (Array.isArray(field.value)) {
      const list = document.createElement('ul');
      field.value.forEach((item) => {
        const listItem = document.createElement('li');
        listItem.textContent = item;
        list.appendChild(listItem);
      });
      fieldValue.appendChild(list);
    } else if (typeof field.value === 'string' && field.value.includes('\n')) {
      fieldValue.textContent = field.value;
      fieldValue.className += ' multi-line';
    } else {
      fieldValue.textContent = field.value;
    }

    fieldRow.appendChild(fieldLabel);
    fieldRow.appendChild(fieldValue);
    Elements.issueFieldsContainer.appendChild(fieldRow);
  });
}

function clearLabelsSelection() {
  AppState.selectedLabels = [];

  // Remove selected class from all label options
  if (Elements.labelsContainer) {
    const labelOptions = Elements.labelsContainer.querySelectorAll('.label-option');
    labelOptions.forEach((option) => {
      option.classList.remove('selected');
    });
  }

  updateLabelsDisplay();
}

function showConditionalFields(issueType) {
  const coInnovationFields = document.getElementById('co-innovation-fields');
  const experimentFields = document.getElementById('experiment-fields');

  // Hide all conditional fields first
  if (coInnovationFields) coInnovationFields.classList.add('hidden');
  if (experimentFields) experimentFields.classList.add('hidden');

  // Show relevant fields based on issue type
  if (issueType === 'Co-Innovation' && coInnovationFields) {
    coInnovationFields.classList.remove('hidden');
  } else if (issueType === 'Experiment' && experimentFields) {
    experimentFields.classList.remove('hidden');
  }
}

function clearIssueForm() {
  Elements.issueForm.reset();
  clearLabelsSelection();
  hideMessages();

  // Hide all conditional fields
  showConditionalFields('');
}

function updateRequiredFields(issueType) {
  // Set required attributes for conditional fields
  const customerNamesField = document.getElementById('customer-names');

  if (issueType === 'Co-Innovation') {
    if (customerNamesField) {
      customerNamesField.setAttribute('required', '');
    }
  } else if (customerNamesField) {
    customerNamesField.removeAttribute('required');
  }
}

function getProxyApiUrl(endpoint) {
  if (AppState.useProxy) {
    return `${AppState.proxyUrl}/${endpoint}`;
  }
  return CONFIG.getJiraApiUrl(AppState.jiraUrl, endpoint);
}

function createFetchHeaders(includeAuth = true) {
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  if (AppState.useProxy) {
    headers['X-JIRA-URL'] = AppState.jiraUrl;
    if (includeAuth && AppState.credentials) {
      headers.Authorization = `Basic ${AppState.credentials}`;
    }
  } else if (includeAuth && AppState.credentials) {
    headers.Authorization = `Basic ${AppState.credentials}`;
  }

  return headers;
}

// === end move helpers ===

function initializeElements() {
  Elements.loginSection = document.getElementById('login-section');
  Elements.issueSection = document.getElementById('issue-section');
  Elements.loginForm = document.getElementById('login-form');
  Elements.issueForm = document.getElementById('issue-form');
  Elements.issueType = document.getElementById('issue-type');
  Elements.successMessage = document.getElementById('success-message');
  Elements.errorMessage = document.getElementById('error-message');
  Elements.loadingOverlay = document.getElementById('loading-overlay');
  Elements.logoutBtn = document.getElementById('logout-btn');
  Elements.demoBtn = document.getElementById('demo-btn');
  Elements.demoIndicator = document.getElementById('demo-indicator');
  Elements.issueDetailsModal = document.getElementById('issue-details-modal');
  Elements.closeModal = document.getElementById('close-modal');
  Elements.closeModalFooter = document.getElementById('close-modal-footer');
  Elements.createAnother = document.getElementById('create-another');
  Elements.createdIssueKey = document.getElementById('created-issue-key');
  Elements.jiraIssueLink = document.getElementById('jira-issue-link');
  Elements.issueFieldsContainer = document.getElementById('issue-fields-container');
  Elements.labelsContainer = document.getElementById('labels-container');
  Elements.selectedLabelsInput = document.getElementById('selected-labels');
  Elements.selectedLabelsDisplay = document.getElementById('selected-labels-display');

  // Initialize labels display
  updateLabelsDisplay();
}

// Check for existing session
function checkExistingSession() {
  const savedCredentials = localStorage.getItem('jira-credentials');
  if (savedCredentials) {
    try {
      const credentials = JSON.parse(savedCredentials);
      AppState.jiraUrl = credentials.jiraUrl;
      AppState.credentials = credentials.auth;
      AppState.projectKey = credentials.projectKey;
      AppState.currentUser = { name: credentials.username };
      AppState.isDemoMode = credentials.isDemoMode || false;
      showIssueSection();
      updateDemoIndicator();
    } catch (e) {
      localStorage.removeItem('jira-credentials');
    }
  }
}

// Handle demo mode activation
function handleDemoMode() {
  // Set demo mode state
  AppState.isDemoMode = true;
  AppState.jiraUrl = 'https://demo.atlassian.net';
  AppState.projectKey = 'DEMO';
  AppState.currentUser = { name: 'demo-user', displayName: 'Demo User' };

  // Save demo session
  localStorage.setItem('jira-credentials', JSON.stringify({
    jiraUrl: AppState.jiraUrl,
    auth: 'demo',
    projectKey: AppState.projectKey,
    username: AppState.currentUser.name,
    isDemoMode: true,
  }));

  // Initialize labels display for demo mode
  updateLabelsDisplay();

  showIssueSection();
  updateDemoIndicator();
  showSuccess('Demo mode activated! You can now explore the interface. No data will be sent to JIRA.');
}

// Handle login form submission
async function handleLogin(event) {
  event.preventDefault();

  const formData = new FormData(Elements.loginForm);
  const jiraUrl = formData.get('jira-url');
  const username = formData.get('username');
  const password = formData.get('password');
  const projectKey = formData.get('project-key');

  // Validate inputs
  if (!jiraUrl || !username || !password || !projectKey) {
    showError('Please fill in all required fields.');
    return;
  }

  showLoading();

  try {
    // Create basic auth credentials
    const credentials = btoa(`${username}:${password}`);
    console.log('🔐 Created credentials for:', username);
    console.log('🔑 Credentials length:', credentials.length);
    console.log('🔑 First 20 chars:', `${credentials.substring(0, 20)}...`);

    // Set credentials in AppState for proxy to use
    AppState.jiraUrl = jiraUrl;
    AppState.credentials = credentials;
    AppState.projectKey = projectKey;

    console.log('🌐 JIRA URL:', jiraUrl);
    console.log('📁 Project Key:', projectKey);

    // Test authentication by getting current user
    const userResponse = await fetch(getProxyApiUrl('myself'), {
      method: 'GET',
      headers: createFetchHeaders(),
    });

    console.log('📊 Auth response status:', userResponse.status);

    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      console.log('❌ Auth error response:', errorText);
      throw new Error('Authentication failed. Please check your credentials.');
    }

    const userData = await userResponse.json();
    console.log('✅ Authenticated user:', userData.displayName);

    // Verify project exists
    const projectResponse = await fetch(getProxyApiUrl(`project/${projectKey}`), {
      method: 'GET',
      headers: createFetchHeaders(),
    });

    if (!projectResponse.ok) {
      throw new Error(`Project "${projectKey}" not found or you don't have access.`);
    }

    // Store user info
    AppState.currentUser = userData;

    // Save to localStorage for session persistence
    localStorage.setItem('jira-credentials', JSON.stringify({
      jiraUrl,
      auth: credentials,
      projectKey,
      username: userData.name,
      isDemoMode: false,
    }));

    hideLoading();
    showIssueSection();
    updateDemoIndicator();
    showSuccess('Successfully logged in!');
  } catch (error) {
    hideLoading();
    showError(error.message);
    // Clear credentials on error
    AppState.jiraUrl = '';
    AppState.credentials = '';
    AppState.projectKey = '';
    AppState.currentUser = null;
  }
}

// Handle logout
function handleLogout() {
  AppState.jiraUrl = '';
  AppState.credentials = '';
  AppState.projectKey = '';
  AppState.currentUser = null;
  AppState.isDemoMode = false;

  localStorage.removeItem('jira-credentials');

  // Reset forms
  Elements.loginForm.reset();
  Elements.issueForm.reset();

  showLoginSection();
  updateDemoIndicator();
  hideMessages();
}

// Handle issue type change
function handleIssueTypeChange(event) {
  const selectedType = event.target.value;

  // Show/hide conditional fields based on issue type
  showConditionalFields(selectedType);
  updateRequiredFields(selectedType);
}

// Update required fields based on issue type
// (moved above)

// Show/hide conditional fields based on issue type
// (moved above)

// Handle label selection
function handleLabelClick(event) {
  if (event.target.classList.contains('label-option')) {
    const { label } = event.target.dataset;
    const isSelected = event.target.classList.contains('selected');

    if (isSelected) {
      // Remove label from selection
      AppState.selectedLabels = AppState.selectedLabels.filter((l) => l !== label);
      event.target.classList.remove('selected');
    } else {
      // Add label to selection
      AppState.selectedLabels.push(label);
      event.target.classList.add('selected');
    }

    updateLabelsDisplay();
  }
}

// Validate issue form
function validateIssueForm(formData) {
  const issueType = formData.get('issue-type');
  const title = formData.get('title');
  const description = formData.get('description');

  if (!issueType) {
    return { isValid: false, error: 'Please select an issue type.' };
  }

  if (!title || title.trim().length < CONFIG.VALIDATION.MIN_TITLE_LENGTH) {
    return { isValid: false, error: `Title must be at least ${CONFIG.VALIDATION.MIN_TITLE_LENGTH} characters long.` };
  }

  if (title.length > CONFIG.VALIDATION.MAX_TITLE_LENGTH) {
    return { isValid: false, error: `Title must be less than ${CONFIG.VALIDATION.MAX_TITLE_LENGTH} characters.` };
  }

  if (!description || description.trim().length < CONFIG.VALIDATION.MIN_DESCRIPTION_LENGTH) {
    return { isValid: false, error: `Description must be at least ${CONFIG.VALIDATION.MIN_DESCRIPTION_LENGTH} characters long.` };
  }

  if (description.length > CONFIG.VALIDATION.MAX_DESCRIPTION_LENGTH) {
    return { isValid: false, error: `Description must be less than ${CONFIG.VALIDATION.MAX_DESCRIPTION_LENGTH} characters.` };
  }

  // Validate issue-type specific fields
  if (issueType === CONFIG.JIRA.ISSUE_TYPES.CO_INNOVATION) {
    const customerNames = formData.get('customer-names');
    if (!customerNames || customerNames.trim().length === 0) {
      return { isValid: false, error: 'Customer Names is required for Co-Innovation issues.' };
    }
  }

  return { isValid: true };
}

// Build issue data for JIRA API
function buildIssueData(formData) {
  const issueType = formData.get('issue-type');
  const title = formData.get('title');
  let description = formData.get('description');

  // Get the proper issue type name for JIRA
  const issueTypeName = CONFIG.JIRA.ISSUE_TYPE_NAMES[issueType] || issueType;

  // Add conditional field data to description
  if (issueType === 'Co-Innovation') {
    const customerNames = formData.get('customer-names');
    if (customerNames && customerNames.trim()) {
      description += `\n\n*Customer Names:* ${customerNames.trim()}`;
    }
  } else if (issueType === 'Experiment') {
    const hypothesis = formData.get('hypothesis');
    const successCriteria = formData.get('success-criteria');

    if (hypothesis && hypothesis.trim()) {
      description += `\n\n*Hypothesis:* ${hypothesis.trim()}`;
    }
    if (successCriteria && successCriteria.trim()) {
      description += `\n\n*Success Criteria:* ${successCriteria.trim()}`;
    }
  }

  // Get current user name safely
  let assigneeName;
  if (AppState.currentUser) {
    if (typeof AppState.currentUser === 'string') {
      assigneeName = AppState.currentUser;
    } else if (AppState.currentUser.name) {
      assigneeName = AppState.currentUser.name;
    }
  }

  // Base issue data structure
  const issueData = {
    fields: {
      project: { key: AppState.projectKey },
      summary: title.trim(),
      description: description.trim(),
      issuetype: { name: issueTypeName },
    },
  };

  // Only add assignee if we have a valid user
  if (assigneeName) {
    issueData.fields.assignee = { name: assigneeName };
  }

  // Add labels if any are selected
  if (AppState.selectedLabels.length > 0) {
    issueData.fields.labels = AppState.selectedLabels;
  }

  return issueData;
}

// Clear issue form for next creation
// (moved above)

// Clear labels selection
// (moved above)

// UI Helper Functions
// (all moved above)

// Update demo indicator visibility
// (moved above)

// Create demo issue data
function createDemoIssueData(formData, issueKey) {
  const issueType = formData.get('issue-type');
  const title = formData.get('title');
  const description = formData.get('description');

  // Get the proper issue type display name
  const issueTypeDisplayName = CONFIG.JIRA.ISSUE_TYPE_NAMES[issueType] || issueType;

  // Base demo fields that all issues have
  const demoFields = [
    { name: 'Key', value: issueKey, userSet: false },
    { name: 'Project', value: 'KAN Project (KAN)', userSet: false },
    { name: 'Issue Type', value: issueTypeDisplayName, userSet: true },
    { name: 'Summary', value: title, userSet: true },
    { name: 'Description', value: description, userSet: true },
    { name: 'Status', value: 'To Do', userSet: false },
    { name: 'Priority', value: 'Medium', userSet: false },
    { name: 'Assignee', value: 'Demo User (demo-user)', userSet: false },
    { name: 'Reporter', value: 'Demo User (demo-user)', userSet: false },
    { name: 'Created', value: new Date().toLocaleString(), userSet: false },
    { name: 'Updated', value: new Date().toLocaleString(), userSet: false },
    { name: 'Labels', value: AppState.selectedLabels.length > 0 ? AppState.selectedLabels.join(', ') : 'None', userSet: AppState.selectedLabels.length > 0 },
    { name: 'Components', value: 'None', userSet: false },
    { name: 'Fix Version/s', value: 'None', userSet: false },
    { name: 'Affects Version/s', value: 'None', userSet: false },
  ];

  // Add some demo-specific fields based on issue type
  if (issueType === 'Co-Innovation') {
    const customerNames = formData.get('customer-names') || 'Customer A, Customer B';
    demoFields.push({ name: 'Customer Names', value: customerNames, userSet: !!formData.get('customer-names') });
    demoFields.push({ name: 'Innovation Status', value: 'In Progress', userSet: false });
    demoFields.push({ name: 'Expected Outcome', value: 'Proof of Concept', userSet: false });
  } else if (issueType === 'Experiment') {
    const hypothesis = formData.get('hypothesis') || 'Testing new approach';
    const successCriteria = formData.get('success-criteria') || 'Metric improvement by 20%';
    demoFields.push({ name: 'Hypothesis', value: hypothesis, userSet: !!formData.get('hypothesis') });
    demoFields.push({ name: 'Success Criteria', value: successCriteria, userSet: !!formData.get('success-criteria') });
    demoFields.push({ name: 'Experiment Duration', value: '2 weeks', userSet: false });
  }

  return { fields: demoFields };
}

// Parse JIRA issue data into our display format
function parseJiraIssueData(jiraIssue) {
  const { fields } = jiraIssue;
  // Fields that user directly set
  // not used, so comment out for linting pass
  // const userSetFields = ['summary', 'description', 'issuetype'];

  const displayFields = [
    { name: 'Key', value: jiraIssue.key, userSet: false },
    { name: 'Project', value: fields.project ? `${fields.project.name} (${fields.project.key})` : 'Unknown', userSet: false },
    { name: 'Issue Type', value: fields.issuetype ? fields.issuetype.name : 'Unknown', userSet: true },
    { name: 'Summary', value: fields.summary || '', userSet: true },
    { name: 'Description', value: fields.description || '', userSet: true },
    { name: 'Status', value: fields.status ? fields.status.name : 'Unknown', userSet: false },
    { name: 'Priority', value: fields.priority ? fields.priority.name : 'None', userSet: false },
    { name: 'Assignee', value: fields.assignee ? `${fields.assignee.displayName} (${fields.assignee.name})` : 'Unassigned', userSet: false },
    { name: 'Reporter', value: fields.reporter ? `${fields.reporter.displayName} (${fields.reporter.name})` : 'Unknown', userSet: false },
    { name: 'Created', value: fields.created ? new Date(fields.created).toLocaleString() : 'Unknown', userSet: false },
    { name: 'Updated', value: fields.updated ? new Date(fields.updated).toLocaleString() : 'Unknown', userSet: false },
  ];

  // Add custom fields if they exist
  Object.keys(fields).forEach((fieldKey) => {
    if (fieldKey.startsWith('customfield_')) {
      const fieldValue = fields[fieldKey];
      if (fieldValue !== null && fieldValue !== undefined && fieldValue !== '') {
        const isUserSet = Object.values(CONFIG.JIRA.CUSTOM_FIELDS).includes(fieldKey);
        displayFields.push({
          name: `Custom Field (${fieldKey})`,
          value: typeof fieldValue === 'object' ? JSON.stringify(fieldValue) : fieldValue,
          userSet: isUserSet,
        });
      }
    }
  });

  return { fields: displayFields };
}

// Fetch real issue details from JIRA
async function fetchIssueDetails(issueKey) {
  try {
    const response = await fetch(getProxyApiUrl(`issue/${issueKey}`), {
      method: 'GET',
      headers: createFetchHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch issue details');
    }

    const issueData = await response.json();
    return parseJiraIssueData(issueData);
  } catch (error) {
    console.error('Error fetching issue details:', error);
    // Return basic structure if fetch fails
    return {
      fields: [
        { name: 'Key', value: issueKey, userSet: false },
        { name: 'Status', value: 'Created', userSet: false },
      ],
    };
  }
}

// Show issue details modal
function showIssueDetailsModal(issueData, issueKey, isDemo = false) {
  // Set issue key
  Elements.createdIssueKey.textContent = issueKey;

  // Set JIRA link
  if (isDemo) {
    Elements.jiraIssueLink.href = '#';
    Elements.jiraIssueLink.style.opacity = '0.6';
    Elements.jiraIssueLink.title = 'Demo mode - no actual JIRA link';
  } else {
    Elements.jiraIssueLink.href = `${AppState.jiraUrl}/browse/${issueKey}`;
    Elements.jiraIssueLink.style.opacity = '1';
    Elements.jiraIssueLink.title = 'Open issue in JIRA';
  }

  // Populate fields
  populateIssueFields(issueData.fields);

  // Show modal
  Elements.issueDetailsModal.classList.remove('hidden');

  // Clear form for next issue
  clearIssueForm();
}

// Populate issue fields in modal
// (moved above)

// Close issue details modal
function closeIssueModal() {
  Elements.issueDetailsModal.classList.add('hidden');
}

// Create another issue (close modal and clear form)
function createAnotherIssue() {
  closeIssueModal();
  // Form is already cleared by showIssueDetailsModal
}

// Handle demo issue creation (no API call)
async function handleDemoIssueCreation(formData) {
  // Simulate API delay
  await new Promise((resolve) => {
    setTimeout(resolve, 1500);
  });

  // const title = formData.get('title'); // not used, so commented out for linting pass
  // const issueType = formData.get('issue-type'); // not used, so commented out for linting pass

  // Generate a fake issue key
  const issueNumber = Math.floor(Math.random() * 900) + 100; // Random 3-digit number
  const fakeIssueKey = `DEMO-${issueNumber}`;

  hideLoading();

  // Create fake issue data for demo
  const demoIssueData = createDemoIssueData(formData, fakeIssueKey);

  // Show issue details modal
  showIssueDetailsModal(demoIssueData, fakeIssueKey, true);
}

// Handle real JIRA issue creation
async function handleRealIssueCreation(formData) {
  // Build issue data
  const issueData = buildIssueData(formData);

  // Create issue via JIRA API
  const response = await fetch(getProxyApiUrl('issue'), {
    method: 'POST',
    headers: createFetchHeaders(),
    body: JSON.stringify(issueData),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.errorMessages
      ? errorData.errorMessages.join(', ')
      : `Failed to create issue: ${response.status}`);
  }

  const result = await response.json();

  // Get full issue details
  const issueDetails = await fetchIssueDetails(result.key);

  hideLoading();

  // Show issue details modal
  showIssueDetailsModal(issueDetails, result.key, false);
}

// Handle issue creation
async function handleIssueCreation(event) {
  event.preventDefault();

  const formData = new FormData(Elements.issueForm);

  // Validate form
  const validationResult = validateIssueForm(formData);
  if (!validationResult.isValid) {
    showError(validationResult.error);
    return;
  }

  showLoading();
  hideMessages();

  try {
    if (AppState.isDemoMode) {
      // Handle demo mode - simulate success without API call
      await handleDemoIssueCreation(formData);
    } else {
      // Real JIRA API call
      await handleRealIssueCreation(formData);
    }
  } catch (error) {
    hideLoading();
    showError(`Failed to create issue: ${error.message}`);
  }
}

// Bind event listeners
function bindEventListeners() {
  Elements.loginForm.addEventListener('submit', handleLogin);
  Elements.issueForm.addEventListener('submit', handleIssueCreation);
  Elements.issueType.addEventListener('change', handleIssueTypeChange);
  Elements.logoutBtn.addEventListener('click', handleLogout);
  Elements.demoBtn.addEventListener('click', handleDemoMode);
  Elements.closeModal.addEventListener('click', closeIssueModal);
  Elements.closeModalFooter.addEventListener('click', closeIssueModal);
  Elements.createAnother.addEventListener('click', createAnotherIssue);

  // Label selection event listeners
  if (Elements.labelsContainer) {
    Elements.labelsContainer.addEventListener('click', handleLabelClick);
  }

  // Close modal when clicking outside
  Elements.issueDetailsModal.addEventListener('click', (e) => {
    if (e.target === Elements.issueDetailsModal) {
      closeIssueModal();
    }
  });

  // Close modal with Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !Elements.issueDetailsModal.classList.contains('hidden')) {
      closeIssueModal();
    }
  });
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  initializeElements();
  bindEventListeners();
  checkExistingSession();
});
