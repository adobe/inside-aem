import { sendGraphQLRequest } from '/tools/sidekick/graphql.js';

async function closeDiscussion(discussionId) {
    const mutation = `
    mutation ($discussionId: ID!) {
      closeDiscussion(input: {discussionId: $discussionId}) {
        discussion {
          id
          title
        }
      }
    }
  `;

    const data = await sendGraphQLRequest(mutation, { discussionId });

    console.log('Discussion Closed:', data.closeDiscussion.discussion);
}

export async function resolveDiscussion(discussionId) {
    try {
        await closeDiscussion(discussionId);
    } catch (error) {
        console.error('Error:', error.message);
    }
};
