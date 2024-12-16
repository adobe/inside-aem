import { REPO_OWNER, REPO_NAME, sendGraphQLRequest } from '/tools/sidekick/graphql.js';

export const fetchDiscussions = async () => {
    const query = `
    query {
      repository(owner: "akasjain-helix", name: "hlxdiscussions") {
        discussions(first: 100, states: OPEN) {
          nodes {
            id
            title
            body
            createdAt
            comments(first: 1) {
              nodes {
                body
                createdAt
                replies(first: 10) {
                  nodes {
                    body
                    createdAt
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

    const data = await sendGraphQLRequest(query);
    console.log(data);
    return data;
};
