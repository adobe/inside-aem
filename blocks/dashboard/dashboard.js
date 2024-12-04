export default async function decorate(block) {
    const apiUrl = 'https://main--inside-aem--jindaliiita.hlx.live/en/review-list.json';  // Replace with your API endpoint

    // Create and insert the table into the body
    const table = document.createElement('table');
    table.setAttribute('id', 'dataTable');
    table.innerHTML = `
        <thead>
            <tr>
                <th>Request Id</th>
                <th>Preview URL</th>
                <th>Approval</th>
                <th>LHS Score</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;
    block.appendChild(table);
    fetchData(apiUrl);
}

function populateTable(requestData) {
    const tableBody = document.querySelector('#dataTable tbody');
    tableBody.innerHTML = ''; // Clear any existing rows
    
    // Loop through the API data and insert rows
    requestData.data.forEach(item => {
        const row = document.createElement('tr');
        
        // Request Id
        const requestIdCell = document.createElement('td');
        requestIdCell.textContent = item.requestId;
        row.appendChild(requestIdCell);
        
        // Preview URL
        const previewUrlCell = document.createElement('td');
        const previewLink = document.createElement('a');
        previewLink.href = item.previewUrl;
        previewLink.target = '_blank';
        previewLink.textContent = item.previewUrl;
        previewUrlCell.appendChild(previewLink);
        row.appendChild(previewUrlCell);
        
        // Approval buttons
        const approvalCell = document.createElement('td');
        const approveButton = document.createElement('button');
        approveButton.classList.add('approve');
        approveButton.textContent = 'Approve';
        approveButton.onclick = () => handleApproval(item.requestId, 'approve');
        
        const rejectButton = document.createElement('button');
        rejectButton.classList.add('reject');
        rejectButton.textContent = 'Reject';
        rejectButton.onclick = () => handleApproval(item.requestId, 'reject');
        
        approvalCell.appendChild(approveButton);
        approvalCell.appendChild(rejectButton);
        row.appendChild(approvalCell);

        const lhsScoreCell = document.createElement('td');
        lhsScoreCell.textContent = 'Loading...';  // Initially show loading text
        lhsScoreCell.setAttribute('data-preview-url', item.previewUrl);  // Store Preview URL for later
        lhsScoreCell.classList.add('lhs-score');
        lhsScoreCell.onclick = () => loadLhsScore(lhsScoreCell);  // Load score on click
        row.appendChild(lhsScoreCell);
        
        tableBody.appendChild(row);
    });
}

function loadLhsScore(lhsScoreCell) {
    const previewUrl = lhsScoreCell.getAttribute('data-preview-url');
    const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(previewUrl)}`;

    // Prevent loading the score more than once
    if (lhsScoreCell.textContent !== 'Loading...') return;

    fetch(apiUrl)
        .then(response => response.json())
        .then(data => {
            const score = data.lighthouseResult.categories.performance.score * 100;  // Score is between 0 and 1, multiply by 100
            lhsScoreCell.textContent = score.toFixed(2);  // Show the score with two decimal places
        })
        .catch(error => {
            console.error('Error fetching LHS score:', error);
            lhsScoreCell.textContent = 'Error loading score';
        });
}

// Function to handle approval/rejection
function handleApproval(requestId, action) {
    console.log(`Request ${requestId} has been ${action}`);
    // You can implement logic here for approval/rejection, like updating the server
}

function fetchData(apiUrl) {
    fetch(apiUrl)
        .then(response => response.json())
        .then(data => {
            populateTable(data);
        })
        .catch(error => {
            console.error('Error fetching data:', error);
        });
}