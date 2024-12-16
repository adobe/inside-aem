const XYZ = localStorage.getItem("gitToken");
export const REPO_OWNER = 'akasjain-helix';
export const REPO_NAME = 'hlxdiscussions';

// Function to send GraphQL requests
export async function sendGraphQLRequest(query, variables = {}) {
    const response = await fetch('https://api.github.com/graphql', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${XYZ}`,
        },
        body: JSON.stringify({ query, variables }),
    });

    const result = await response.json();
    if (result.errors) {
        console.error('GraphQL Errors:', result.errors);
        throw new Error('Failed to complete the GraphQL request');
    }
    return result.data;
}
