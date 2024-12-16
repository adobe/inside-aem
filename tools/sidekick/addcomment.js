// Replace these with actual values
import { REPO_OWNER, REPO_NAME, sendGraphQLRequest } from '/tools/sidekick/graphql.js';

// Step 1: Find the discussion by title and body
async function findDiscussionByTitleAndBody(title, body) {
    const query = `
    query ($owner: String!, $name: String!) {
      repository(owner: $owner, name: $name) {
        discussions(first: 10) {
          nodes {
            id
            title
            body
            comments(first: 10) {
              nodes {
                id
              }
            }
          }
        }
      }
    }
  `;

    const data = await sendGraphQLRequest(query, {
        owner: REPO_OWNER,
        name: REPO_NAME
    });

    // Filter the discussion based on title and body
    const discussion = data.repository.discussions.nodes.find(
        (d) => d.title === title && d.body === body
    );

    if (!discussion) {
        throw new Error('Discussion not found for comment addition');
    }

    console.log('Found Discussion for comment addition:', discussion);
    return discussion;
}

// Step 2: Add a comment as a reply to the first comment
async function addReplyToComment(discussionId, parentCommentId, replyBody) {
    const mutation = `
    mutation ($parentCommentId: ID!, $body: String!) {
      addDiscussionComment(input: {discussionId: $discussionId, replyToId: $parentCommentId, body: $body}) {
        comment {
          id
          body
        }
      }
    }
  `;

    const response = await sendGraphQLRequest(mutation, {
        discussionId,
        parentCommentId,
        body: replyBody,
    });

    console.log('Reply Added:', response.addDiscussionComment.comment);
    return response.addDiscussionComment.comment;
}

// Main Function
export async function addcomment(title, body, newComment) {
    try {
        // Find the target discussion
        const discussion = await findDiscussionByTitleAndBody(title, body);

        // Get the first comment in the discussion
        const firstComment = discussion.comments.nodes[0];
        if (!firstComment) {
            throw new Error('No comments found in the discussion');
        }

        console.log('First Comment:', firstComment);

        // Add a reply to the first comment
        const replyBody = newComment;
        await addReplyToComment(discussion.id, firstComment.id, replyBody);
    } catch (error) {
        console.error('Error:', error.message);
    }
};
