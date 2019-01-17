workflow "Lint, Build, and Publish" {
  on = "push"
  resolves = [
    "Master",
    "Publish",
  ]
}

action "Install" {
  uses = "actions/npm@master"
  args = "install"
}

action "Lint" {
  needs = "Install"
  uses = "actions/npm@master"
  args = "run lint"
}

action "Build" {
  needs = "Lint"
  uses = "actions/npm@master"
  args = "run build"
}

action "Master" {
  needs = "Build"
  uses = "actions/bin/filter@master"
  args = "branch master"
}

action "Publish" {
  uses = "./.github/action-publish"
  needs = ["Master"]
  secrets = ["GITHUB_TOKEN", "NPM_TOKEN"]
}
