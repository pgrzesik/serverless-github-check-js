const octonode = require("octonode");

const isEventOpened = eventBody => eventBody.action === "opened";
const isEventPullRequest = event =>
  event.headers["X-GitHub-Event"] === "pull_request";

const TASK_LINK_PATTERN = "Related task: https://www.meistertask.com";

const doesBodyStartWithTaskLink = eventBody =>
  eventBody.pull_request.body.startsWith(TASK_LINK_PATTERN);

const getRepositoryName = eventBody => eventBody.repository.full_name;
const getCommitSHA = eventBody => eventBody.pull_request.head.sha;

const SUCCESS_STATUS = {
  state: "success",
  description: "Pull request contains correct task reference.",
  context: "serverless-github-check",
};

const FAILURE_STATUS = {
  state: "failure",
  description: `Pull request does not contains correct task reference. Description should start with "${TASK_LINK_PATTERN}"`,
  context: "serverless-github-check",
};

const getGithubClient = () => octonode.client(process.env.GITHUB_TOKEN);

const pushStatusUpdate = async (eventBody, status) => {
  const commitSha = getCommitSHA(eventBody);
  const repositoryName = getRepositoryName(eventBody);
  const path = `/repos/${repositoryName}/statuses/${commitSha}`;
  const githubClient = getGithubClient();

  await githubClient.postAsync(path, status);
};

module.exports.checker = async (event, context) => {
  const githubClient = getGithubClient();
  const eventBody = JSON.parse(event.body);
  try {
    if (isEventPullRequest(event) && isEventOpened(eventBody)) {
      if (doesBodyStartWithTaskLink(eventBody)) {
        await pushStatusUpdate(eventBody, SUCCESS_STATUS);
      } else {
        await pushStatusUpdate(eventBody, FAILURE_STATUS);
      }
    }
  } catch (e) {
    console.log("Error while processing request", e);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Internal server error",
      }),
    };
  }
  return {
    statusCode: 200,
  };
};
