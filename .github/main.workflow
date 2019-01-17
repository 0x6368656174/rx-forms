workflow "Lint, Build and Publish" {
  on = "push"
  resolves = [
    "Lint, Build and Publish"
  ]
}

action "Lint, Build and Publish" {
  uses = "./.github/action-publish"
  secrets = ["GITHUB_TOKEN", "NPM_TOKEN"]
}
