const github = require("@actions/github");
const core = require("@actions/core");
const exec = require("@actions/exec");

const DEFAULT_LABEL_PREFIX = "bump: ";
const ALLOWED_BUMP_LABELS = ["major", "minor", "bump"];

async function run() {
  const token = core.getInput("token");
  const labelPrefix = core.getInput("labelPrefix");
  const octokit = github.getOctokit(token);

  if (!github.context.payload.pull_request) {
    core.error("The action must be run only on pull request close event.");
    core.setFailed();
    return;
  }

  const { repo: repositoryName } = github.context.repo;
  const { number: pullRequestNumber } = github.context.payload.pull_request;

  const pullRequest = await octokit.rest.pulls.get({
    repo: repositoryName,
    pull_number: pullRequestNumber,
  });

  const choosenLabelPrefix = labelPrefix || DEFAULT_LABEL_PREFIX;

  const unfilteredBumpLabels = pullRequest.data.labels.filter((label) =>
    label.name.startsWith(choosenLabelPrefix)
  );

  const bumpLabels = unfilteredBumpLabels.filter((unfilteredBumpLabel) =>
    ALLOWED_BUMP_LABELS.includes(unfilteredBumpLabel.name.replace(choosenLabelPrefix, ""))
  );

  const [hasMajor, hasMinor, hasPatch] = ALLOWED_BUMP_LABELS.map(
    (allowedBumpLabel) =>
      bumpLabels.includes(`${choosenLabelPrefix}${allowedBumpLabel}`)
  );

  if (hasMajor && hasMinor && !hasPatch) {
    await exec("npm version major");
  } else if (!hasMajor && hasMinor && hasPatch) {
    await exec("npm version minor");
  } else if (!hasMajor && !hasMinor && hasPatch) {
    await exec("npm version patch")
  }
}

run();
