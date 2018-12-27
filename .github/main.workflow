workflow "Build and lint" {
  on = "push"
  resolves = ["Lint sources", "Build sources"]
}

action "Install dependencies" {
  uses = "actions/npm@e7aaefe"
  args = "ci"
}

action "Lint sources" {
  uses = "actions/npm@e7aaefe"
  args = "run lint"
  needs = ["Install dependencies"]
}

action "Build sources" {
  uses = "actions/npm@e7aaefe"
  needs = ["Install dependencies"]
  args = "run compile"
}
