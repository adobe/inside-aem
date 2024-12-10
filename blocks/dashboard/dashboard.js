export default async function decorate(block) {
    const apiUrl = 'http://saga-desktop:3000/requests'; // Replace with your API endpoint
    const filterUrl = 'http://saga-desktop:3000/filters'

    // Create Filters and Table
    const filterContainer = createFilterContainer(apiUrl);
    block.appendChild(filterContainer);

    const table = createTable();
    block.appendChild(table);

    // Fetch initial data and populate filters
    fetchFilters(filterUrl);
    fetchData(apiUrl);
}

// Create filter container with dropdowns and apply button
function createFilterContainer(apiUrl) {
    const container = document.createElement('div');
    container.classList.add('filter-container');

    // Create "Created By" filter
    const createdByDropdown = createDropdown('Created By', 'createdByFilter');
    container.appendChild(createdByDropdown.label);

    // Create "State" filter
    const stateDropdown = createDropdown('State', 'stateFilter');
    container.appendChild(stateDropdown.label);

    // Create Apply button
    const applyButton = document.createElement('button');
    applyButton.textContent = 'Apply';
    applyButton.addEventListener('click', () => {
        const createdBy = document.getElementById('createdByFilter').value;
        const state = document.getElementById('stateFilter').value;
        const queryParams = new URLSearchParams({ createdBy, state }).toString();
        fetchData(`${apiUrl}?${queryParams}`);
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

    label.appendChild(dropdown);
    return { label, dropdown };
}

// Create table structure
function createTable() {
    const table = document.createElement('table');
    table.id = 'dataTable';
    table.innerHTML = `
        <thead>
            <tr>
                <th>Request Id</th>
                <th>Preview URL</th>
                <th>LHS Score</th>
                <th>Created By</th>
                <th>State</th>
                <th>Approval</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;
    return table;
}

// Fetch unique filter values and populate dropdowns
function fetchFilters(apiUrl) {
    fetch(apiUrl)
        .then(response => response.json())
        .then(data => {
            const createdBySet = new Set(data.createdBy);
            const stateSet = new Set(data.state);

            populateDropdown('createdByFilter', createdBySet);
            populateDropdown('stateFilter', stateSet);
        })
        .catch(error => console.error('Error fetching filters:', error));
}

// Populate a dropdown with options
function populateDropdown(dropdownId, options) {
    const dropdown = document.getElementById(dropdownId);
    dropdown.innerHTML = '<option value="">All</option>'; // Default "All" option

    options.forEach(option => {
        const opt = document.createElement('option');
        opt.value = option;
        opt.textContent = option;
        dropdown.appendChild(opt);
    });
}

// Fetch and populate table data
function fetchData(apiUrl) {
    fetch(apiUrl)
        .then(response => response.json())
        .then(data => populateTable(data))
        .catch(error => console.error('Error fetching data:', error));
}

// Populate the table with data
function populateTable(requestData) {
    const tableBody = document.querySelector('#dataTable tbody');
    tableBody.innerHTML = ''; // Clear existing rows

    requestData.data.forEach(item => {
        const row = document.createElement('tr');

        row.appendChild(createCell(item.id)); // Request Id
        row.appendChild(createLinkCell(item.previewUrl)); // Preview URL
        row.appendChild(createLhsScoreCell(item.previewUrl)); // LHS Score
        row.appendChild(createCell(item.createdBy)); // Created By
        row.appendChild(createCell(item.state)); // State
        row.appendChild(createApprovalCell(item.id)); // Approval Buttons

        tableBody.appendChild(row);
    });
}

// Create a simple table cell
function createCell(content) {
    const cell = document.createElement('td');
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
    cell.textContent = 'Loading...';
    cell.classList.add('lhs-score');
    cell.dataset.previewUrl = previewUrl;

    setTimeout(() => loadLhsScore(cell));
    return cell;
}

// Fetch LHS Score and update the cell
function loadLhsScore(cell) {
    const previewUrl = cell.dataset.previewUrl;
    const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(previewUrl)}`;

    if (cell.textContent !== 'Loading...') return; // Prevent duplicate fetch

    fetch(apiUrl)
        .then(response => response.json())
        .then(data => {
            const score = data.lighthouseResult.categories.performance.score * 100;
            cell.textContent = score.toFixed(2);
        })
        .catch(error => {
            console.error('Error loading LHS score:', error);
            cell.textContent = 'Error';
        });
}

// Create a cell with approval and rejection buttons
function createApprovalCell(requestId) {
    const cell = document.createElement('td');

    const approveButton = createButton('Approve', 'approve', () =>
        handleApproval(requestId, 'approve')
    );
    const rejectButton = createButton('Reject', 'reject', () =>
        handleApproval(requestId, 'reject')
    );

    cell.appendChild(approveButton);
    cell.appendChild(rejectButton);
    return cell;
}

// Create a button with a callback function
function createButton(text, className, onClick) {
    const button = document.createElement('button');
    button.textContent = text;
    button.classList.add(className);
    button.addEventListener('click', onClick);
    return button;
}

// Handle approval/rejection actions
function handleApproval(requestId, action) {
    console.log(`Request ${requestId} has been ${action}`);
}