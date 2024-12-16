/* eslint-disable no-shadow */
/* eslint-disable no-use-before-define */
const apiUrl = 'http://localhost:3001/requests/search'; // Replace with your API endpoint
const filterUrl = 'http://localhost:3001/requests/states';

// Fetch and populate table data
// eslint-disable-next-line no-shadow
function fetchData(apiUrl, queryParams) {
  if (!queryParams) {
    // eslint-disable-next-line no-param-reassign
    queryParams = new URLSearchParams({ sort: 'DESC' }).toString();
  } else {
    const newQueryParams = new URLSearchParams();
    // eslint-disable-next-line no-restricted-syntax
    for (const [key, value] of queryParams) {
      newQueryParams.append(key, value);
    }
    // eslint-disable-next-line no-param-reassign
    queryParams = newQueryParams.toString();
  }
  // eslint-disable-next-line no-param-reassign
  const modifiedApiUrl = `${apiUrl}?${queryParams}`;
  fetch(modifiedApiUrl)
    .then((response) => response.json())
    // eslint-disable-next-line no-use-before-define
    .then((data) => populateTable(data))
    .catch((error) => console.error('Error fetching data:', error));
}

// Fetch unique filter values and populate dropdowns
// eslint-disable-next-line no-shadow
function fetchFilters(filterUrl) {
  fetch(filterUrl)
    .then((response) => response.json())
    .then((data) => {
      // const createdBySet = new Set(data.createdBy);
      const stateSet = new Set(data);

      // populateDropdown('createdByFilter', createdBySet);
      // eslint-disable-next-line no-use-before-define
      populateDropdown('stateFilter', stateSet);
    })
    .catch((error) => console.error('Error fetching filters:', error));
}

export default async function decorate(block) {
  document.querySelector('header').remove();
  document.querySelector('footer').remove();

  // Create Filters and Table
  // eslint-disable-next-line no-use-before-define
  const filterContainer = createFilterContainer(apiUrl);
  block.appendChild(filterContainer);

  // eslint-disable-next-line no-use-before-define
  const table = createTable();
  block.appendChild(table);

  // Fetch initial data and populate filters
  fetchFilters(filterUrl);
  fetchData(apiUrl);
}

// Create filter container with dropdowns and apply button
// eslint-disable-next-line no-shadow
function createFilterContainer(apiUrl) {
  const container = document.createElement('div');
  container.classList.add('filter-container');

  // // Create "Created By" filter
  // const createdByDropdown = createDropdown('Created By', 'createdByFilter');
  // container.appendChild(createdByDropdown.label);

  // Create "State" filter
  // eslint-disable-next-line no-use-before-define
  const stateDropdown = createDropdown('State', 'stateFilter');
  container.appendChild(stateDropdown.label);
  container.appendChild(stateDropdown.dropdown);

  // Create Apply button
  const applyButton = document.createElement('button');
  applyButton.textContent = 'Apply';
  applyButton.addEventListener('click', () => {
    // const createdBy = document.getElementById('createdByFilter').value;
    const state = document.getElementById('stateFilter').value;
    const queryParams = new URLSearchParams({ state });
    fetchData(apiUrl, queryParams);
  });
  container.appendChild(applyButton);

  return container;
}

// Create a single dropdown with label
function createDropdown(labelText, id) {
  const label = document.createElement('label');
  label.textContent = `${labelText}: `;

  const dropdown = document.createElement('select');
  dropdown.id = id;
  return { label, dropdown };
}

// Create table structure
function createTable() {
  const table = document.createElement('table');
  table.id = 'dataTable';
  table.innerHTML = `
        <thead>
            <tr>
                <th>Live URL</th>
                <th>Preview URL</th>
                <th>LHS Score</th>
                <th>Request Created By</th>
                <th>State</th>
                <th>Approval</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;
  return table;
}

// Populate a dropdown with options
function populateDropdown(dropdownId, options) {
  const dropdown = document.getElementById(dropdownId);
  dropdown.innerHTML = '<option value="">All</option>'; // Default "All" option

  options.forEach((option) => {
    const opt = document.createElement('option');
    opt.value = option;
    opt.textContent = option;
    dropdown.appendChild(opt);
  });
}

function createDataAttributes(element, requestId, previewUrl, createdBy, createdAt, state) {
  element.setAttribute('data-request-id', requestId);
  element.setAttribute('data-preview-url', previewUrl);
  element.setAttribute('data-created-by', createdBy);
  element.setAttribute('data-created-at', createdAt);
  element.setAttribute('data-state', state);
}

function getLiveUrl(previewUrl) {
  return previewUrl.replace('.page', '.live');
}

// Populate the table with data
function populateTable(requestData) {
  const tableBody = document.querySelector('#dataTable tbody');
  tableBody.innerHTML = ''; // Clear existing rows

  requestData.forEach((item) => {
    const row = document.createElement('tr');

    row.appendChild(createLinkCell(getLiveUrl(item.previewUrl))); // Preview URL
    row.appendChild(createLinkCell(item.previewUrl)); // Preview URL
    row.appendChild(createLhsScoreCell(item.previewUrl)); // LHS Score
    row.appendChild(createCell(item.createdBy)); // Created By
    row.appendChild(createStateCell(item.state)); // State
    row.appendChild(createApprovalCell(item.id, item.state)); // Approval Buttons

    createDataAttributes(row, item.id, item.previewUrl, item.createdBy, item.createdAt, item.state);
    tableBody.appendChild(row);
  });
}

// Create a simple table cell
function createCell(content) {
  const cell = document.createElement('td');
  cell.textContent = content;
  return cell;
}

function createStateCell(content) {
  const cell = document.createElement('td');
  cell.classList.add('state');
  cell.textContent = content;
  return cell;
}

// Create a table cell with a clickable link
function createLinkCell(url) {
  const cell = document.createElement('td');
  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.textContent = url;
  cell.appendChild(link);
  return cell;
}

// Create a table cell for LHS Score with loading logic
function createLhsScoreCell(previewUrl) {
  const cell = document.createElement('td');
  const div = document.createElement('div');
  const span = document.createElement('span');
  div.classList.add('loading-container');
  span.classList.add('dots');
  div.textContent = 'Loading';
  cell.classList.add('lhs-score');
  cell.dataset.previewUrl = previewUrl;

  div.appendChild(span);
  cell.appendChild(div);

  setTimeout(() => loadLhsScore(cell));
  return cell;
}

// Fetch LHS Score and update the cell
function loadLhsScore(cell) {
  const { previewUrl } = cell.dataset; // URL from the dataset attribute
  const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(previewUrl)}`;

  if (cell.textContent !== 'Loading') return; // Prevent duplicate fetch

  fetch(apiUrl)
    .then((response) => response.json())
    .then((data) => {
      const score = data.lighthouseResult.categories.performance.score * 100;
      const pageSpeedUrl = `https://pagespeed.web.dev/report?url=${encodeURIComponent(previewUrl)}`; // URL for visualization

      // Create a link element to redirect users
      const link = document.createElement('a');
      link.href = pageSpeedUrl;
      link.textContent = score.toFixed(2);
      link.target = '_blank'; // Open in a new tab
      link.style.color = 'blue'; // Optional: Ensure it looks like a link
      link.style.textDecoration = 'underline'; // Optional: Add underline for visibility

      cell.replaceChild(link, cell.querySelector('.loading-container'));
    })
    .catch((error) => {
      console.error('Error loading LHS score:', error);
      cell.textContent = 'Error';
    });
}

// Create a cell with approval and rejection buttons
function createApprovalCell(requestId, state) {
  const cell = document.createElement('td');

  const approveButton = createButton('Approve', state, 'approve', () => handleApproval(requestId, 'approved'));
  const rejectButton = createButton('Reject', state, 'reject', () => handleApproval(requestId, 'rejected'));

  cell.appendChild(approveButton);
  cell.appendChild(rejectButton);
  return cell;
}

// Create a button with a callback function
function createButton(text, state, className, onClick) {
  const button = document.createElement('button');
  button.textContent = text;
  button.classList.add(className);
  if (state === 'approved' || state === 'rejected') {
    button.classList.add('disabled');
  } else {
    button.addEventListener('click', onClick);
  }
  return button;
}

function getPostData(requestId, action) {
  const data = {};
  const row = document.querySelector(`tr[data-request-id="${requestId}"]`);
  data.requestData = {};
  data.requestData.requestId = requestId;
  data.requestData.previewUrl = row.getAttribute('data-preview-url');
  data.requestData.createdBy = row.getAttribute('data-created-by');
  data.requestData.createdAt = row.getAttribute('data-created-at');
  data.requestData.state = row.getAttribute('data-state');
  data.action = action;

  return data;
}

// Handle approval/rejection actions
function handleApproval(requestId, action) {
  const submitUrl = 'http://localhost:3001/requests/submit';
  const data = getPostData(requestId, action);
  const options = {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json', // Tells the server we're sending JSON
    },
    body: JSON.stringify(data), // Converts the JavaScript object to a JSON string
  };

  // Making the POST request
  fetch(submitUrl, options)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json(); // Parse JSON from the response
    })
    .then((data) => {
      console.log('Success:', data); // Handle the response data
      updateState(requestId, data.state[0]);
    })
    .catch((error) => {
      console.error('Error:', error); // Handle errors
    });
}

function updateState(requestId, state) {
  const row = document.querySelector(`tr[data-request-id="${requestId}"]`);
  const currentState = row.querySelector('.state');
  currentState.textContent = state;
  updateButtons(row, state);
}

function updateButtons(row, state) {
  const buttons = row.querySelectorAll('button');
  buttons.forEach((button) => {
    if (state === 'approved' || state === 'rejected') {
      button.classList.add('disabled');
    }
  });
}
