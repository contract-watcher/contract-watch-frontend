module.exports = {
  errorMsg:
    "Branch name must match: main or <type>/<kebab-case-name> (feat|feature|fix|hotfix|chore|refactor|test|docs|ci)",
  pattern: "^(main|(feat|feature|fix|hotfix|chore|refactor|test|docs|ci)/[a-z0-9]+(-[a-z0-9]+)*)$",
};
