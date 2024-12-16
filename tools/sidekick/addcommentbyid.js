import { REPO_OWNER, REPO_NAME, sendGraphQLRequest } from '/tools/sidekick/graphql.js';

async function findDiscussionById(id) {
    const query = `
    query ($owner: String!, $name: String!) {
      repository(owner: $owner, name: $name) {
        discussions(first: 100, states: OPEN) {
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

    const discussion = data.repository.discussions.nodes.find(
        (d) => d.id === id
    );

    if (!discussion) {
        throw new Error('Discussion not found for comment addition');
    }

    console.log('Found Discussion for comment addition:', discussion);
    return discussion;
}

async function addReplyToComment(discussionId, parentCommentId, replyBody) {
    const mutation = `
    mutation ($discussionId: ID!, $parentCommentId: ID!, $body: String!) {
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
export async function addCommentById(id, newComment) {
    try {
        const discussion = await findDiscussionById(id);

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
