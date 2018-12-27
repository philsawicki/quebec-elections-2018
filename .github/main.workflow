workflow "Install, lint and deploy" {
  on = "push"
  resolves = ["Master"]
}

action "Build" {
  uses = "actions/npm@e7aaefe"
  args = "install"
}

action "Lint" {
  uses = "actions/npm@e7aaefe"
  needs = ["Build"]
  args = "run lint"
}

action "Master" {
  uses = "actions/bin/filter@b2bea07"
  needs = ["Lint"]
  args = "branch master"
}
