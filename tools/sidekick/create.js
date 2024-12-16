import { REPO_OWNER, REPO_NAME, sendGraphQLRequest } from '/tools/sidekick/graphql.js';

// 1. Create a new discussion
async function createNewDiscussion(title, body) {
    const createDiscussionQuery = `
    mutation ($repositoryId: ID!, $title: String!, $body: String!, $categoryId: ID!) {
      createDiscussion(input: {repositoryId: $repositoryId, title: $title, body: $body, categoryId: $categoryId}) {
        discussion {
          id
          title
        }
      }
    }
  `;

    // Fetch the repository ID and a category ID
    const repositoryInfoQuery = `
    query ($owner: String!, $name: String!) {
      repository(owner: $owner, name: $name) {
        id
        discussionCategories(first: 10) {
          nodes {
            id
            name
          }
        }
      }
    }
  `;

    // Fetch repository info
    const repositoryInfo = await sendGraphQLRequest(repositoryInfoQuery, {
        owner: REPO_OWNER,
        name: REPO_NAME,
    });

    const repositoryId = repositoryInfo.repository.id;
    // TODO - Fetch General category
    console.log(`Categories ${JSON.stringify(repositoryInfo.repository.discussionCategories.nodes)}`);
    const generalCategory = repositoryInfo.repository.discussionCategories.nodes.find(category => category.name === 'General');
    const categoryId = generalCategory ? generalCategory.id : null; // Assign the id if found, otherwise null
    //const categoryId = repositoryInfo.repository.discussionCategories.nodes[0].id; // Using the first category

    // Create a new discussion
    const newDiscussion = await sendGraphQLRequest(createDiscussionQuery, {
        repositoryId,
        title,
        body,
        categoryId,
    });

    console.log('Discussion created:', newDiscussion.createDiscussion.discussion);
    return newDiscussion.createDiscussion.discussion.id;
}

// 2. Add a comment to the discussion
export async function addComment(discussionId, body) {
    const addCommentQuery = `
    mutation ($discussionId: ID!, $body: String!) {
      addDiscussionComment(input: {discussionId: $discussionId, body: $body}) {
        comment {
          id
          body
        }
      }
    }
  `;

    const newComment = await sendGraphQLRequest(addCommentQuery, {
        discussionId,
        body,
    });

    console.log('Comment added:', newComment.addDiscussionComment.comment);
}

// Main execution
export async function createDiscussion (pageUrl, selector, comment)  {
    try {
        const discussionId = await createNewDiscussion(pageUrl, selector);
        await addComment(discussionId, comment);
        return discussionId;
    } catch (error) {
        console.error('Error:', error.message);
    }
}
