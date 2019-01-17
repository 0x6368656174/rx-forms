workflow "Lint, Build, and Publish" {
  on = "push"
  resolves = [
    "Publish"
  ]
}

action "Publish" {
  needs = "Tag"
  uses = "actions/npm@master"
  args = "publish --access public"
  secrets = ["GITHUB_TOKEN"]
}

action "Master" {
  needs = "Build"
  uses = "actions/bin/filter@master"
  args = "branch master"
}

action "Tag" {
  needs = "Master"
  uses = "actions/bin/filter@master"
  args = "tag"
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
