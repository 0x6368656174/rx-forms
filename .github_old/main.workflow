workflow "Lint, Build and Publish" {
  on = "push"
  resolves = [
    "Run lint, build and publish"
  ]
}

action "Run lint, build and publish" {
  uses = "./.github/action-publish"
  secrets = ["GITHUB_TOKEN", "NPM_TOKEN"]
}
