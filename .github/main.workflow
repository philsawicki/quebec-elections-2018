workflow "Build and lint" {
  on = "push"
  resolves = ["Build"]
}

action "Filter branch" {
  uses = "actions/bin/filter@b2bea07"
  args = "branch master"
}

action "Install" {
  uses = "actions/npm@e7aaefe"
  args = "install"
  needs = ["Filter branch"]
}

action "Lint" {
  uses = "actions/npm@e7aaefe"
  args = "run lint"
  needs = ["Install"]
}

action "Build" {
  uses = "actions/npm@e7aaefe"
  args = "run compile"
  needs = ["Lint"]
}
