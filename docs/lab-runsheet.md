---
title: Lab Runsheet
description: Shared timing, facilitator prompts, and participant checkpoints for the three workshop labs.
---

## How to Follow Along

Participants: use the [lab guide](../README.md) for the exact commands and workflow
content. This runsheet tells you when to start, what to check, and when to ask for help.

Facilitator: use the prompts below to introduce each task, check progress, and
debrief. Keep the [completed demo](https://github.com/shin-akuma/agentic-workflows-demo)
open for recovery. Do not type the whole workflow on screen while participants wait.

All times are elapsed from the start of the 90-minute workshop. Workflow execution
time varies; a queued or running job is not a completed checkpoint.

## Session at a Glance

| Time | Facilitator | Participants | Checkpoint |
| --- | --- | --- | --- |
| 0:00-0:10 | Introduce the idea and demonstrate issue to draft PR | Observe the task, permissions, and proposed change | Understand the outcome |
| 0:10-0:20 | Explain Markdown to YAML compilation; check setup | Finish repository, authentication, and issue setup | Ready to compile and push |
| 0:20-0:35 | Lead Lab 1 | Create and run Weekly Summary | Summary issue with source links |
| 0:35-0:55 | Lead Lab 2 | Add command-triggered comments and follow-up issues | Comment and requested follow-up |
| 0:55-1:10 | Lead Lab 3 | Install, constrain, and invoke Repo Assist | Exercise issues labelled |
| 1:10-1:20 | Coach the design exercise | Write a four-line workflow spec | Trigger, job, outputs, guardrails |
| 1:20-1:30 | Debrief and answer questions | Share evidence and clean up | Know what to review and disable |

For the opening demo, use the demo repository's
[code-fix rehearsal](https://github.com/shin-akuma/agentic-workflows-demo#rehearsal).
Show the deliberate 08:00 UTC test failure, the proposed code diff, and a manual
test run for the reviewed PR commit. Keep a completed rehearsal available; do not
wait for a new agent run and CI run to finish within the ten-minute introduction.

## Readiness Gate

Complete the guide's [preflight](../README.md#preflight),
[repository](../README.md#your-repository), and
[setup](../README.md#setup) sections before Lab 1. Prefer completing setup before
the session; use 0:10-0:20 to resolve remaining blockers.

* [ ] Working in your own template copy, not the shared template
* [ ] Git and GitHub CLI work in the chosen Bash environment; Git commit name and email are configured
* [ ] `gh auth status` succeeds and `gh aw version` shows v0.92.0
* [ ] GitHub Actions and Issues enabled; Actions PR creation permitted
* [ ] Workflow authentication configured in this repository
* [ ] Two exercise issues created in this repository
* [ ] Able to commit and push to its default branch

> Raise your hand if setup is blocked. Do not show your token. Tell us which step
> failed so we can check the configuration together.

If setup cannot be resolved quickly, pair with someone whose repository is ready.
Do not share credentials. Template copies do not inherit secrets, issues, or settings.

Warn participants that **Support hours tests** can be red by design: the starter
has 11 passing tests and one opening-time failure. Check the workflow name before
debugging. This is separate from the three agentic workflows and does not block
the required labs; preserve it for the optional code-fix exercise.

## Lab 1: Your First Workflow

Follow [Lab 1 instructions](../README.md#lab-1-your-first-workflow).

### Introduce at 0:20

> Your goal is one working workflow. Write the task in Markdown, compile it,
> push the source and generated YAML, then start it manually.

### Lab 1 Checkpoints

| Time | Participant action | Facilitator check |
| --- | --- | --- |
| 0:20-0:25 | Create Weekly Summary from the guide and compile it | Check indentation, filename, and compiler errors |
| 0:25-0:28 | Inspect the lock file, commit, push, and dispatch | Confirm both files reached the default branch |
| 0:28-0:33 | Inspect Actions while the run completes | Help with authentication failures; avoid duplicate dispatches |
| 0:33-0:35 | Open the summary issue and follow its source links | Ask one participant to explain the job separation |

Success: a successful run and one summary issue grounded in the seeded activity.
The issue should contain progress, open questions, and next steps, not invented events.

Check the content, not only the run status: it must actually reference the seeded
issues. The workshop uses `min-integrity: none` with `bash: false` and
`cli-proxy: false` because the default integrity filter hid seeded issues in
rehearsal. Explain this deliberate untrusted-input choice; it does not grant
write permissions. See the [integrity reference](repo-assist-reference.md#minimum-integrity-which-content-reaches-the-agent).

During the Actions inspection, point out the
[threat-detection job](repo-assist-reference.md#threat-detection-review-before-publication)
between agent execution and safe outputs. Check its verdict and enforcement policy;
a warning is not necessarily a blocked write. Mention
[staged previews](repo-assist-reference.md#staged-previews-optional-rehearsal)
as an optional later exercise, not a required checkpoint or a zero-side-effect mode.

### Lab 1 Debrief

> Which file does GitHub Actions execute? Why can a read-only agent still request
> an issue to be created?

Expected answers: the compiled lock YAML executes; a separate permission-controlled
safe-output job publishes the requested issue.

If the run is still pending, record its URL, begin Lab 2, and revisit the result.
If compilation is blocked, compare with the completed demo's Weekly Summary source.

## Lab 2: Safe Outputs and Command Triggers

Follow [Lab 2 instructions](../README.md#lab-2-safe-outputs-and-command-triggers).

### Introduce at 0:35

> Now give the agent an event to respond to and a small write budget. We will ask
> for a comment first, then explicitly request a follow-up issue.

Before the first command, explain
[trigger authorization](repo-assist-reference.md#trigger-authorization-who-can-start-a-run):
the default roles are `admin`, `maintainer`, and `write`. In pairs, use an authorized
account; do not widen access to `all` to resolve a failure. When showing the prompt,
explain that [sanitized context](repo-assist-reference.md#sanitized-context-safer-input-still-untrusted)
reduces specific input hazards but remains untrusted text, not instructions to obey.

### Lab 2 Checkpoints

| Time | Participant action | Facilitator check |
| --- | --- | --- |
| 0:35-0:41 | Create Issue Helper, compile, commit, and push | Keep one `on` and one `safe-outputs` section; replace the old prompt |
| 0:41-0:46 | Post `/issue-helper` on the escalation-contact issue | Command is first in a new comment; source and lock file are already pushed |
| 0:46-0:52 | After completion, post `/issue-helper create-follow-up` | Inspect the comment and the single requested follow-up issue |
| 0:52-0:55 | Compare the frontmatter limits with the published outputs | Separate framework status comments from the agent comment cap |

Success: one substantive triage comment per run, and at most one follow-up issue
when explicitly requested. No file changes or PRs are expected from this workflow.

### Lab 2 Debrief

> What enforces the output limit: the prompt or the frontmatter? Why might this
> workflow appear as a skipped check on a PR?

Expected answers: safe-output configuration enforces the cap; the default command
trigger includes PR events, even when the command does not match.

If time is short, get the first comment working and leave the follow-up run as an
extension. Mark that checkpoint incomplete rather than treating a status comment
as the agent's answer. Do not queue repeated commands while debugging.

## Lab 3: Install Repo Assist

Follow [Lab 3 instructions](../README.md#lab-3-install-repo-assist).

### Introduce at 0:55

> Reuse an existing workflow, but inspect it before running it. We will remove its
> schedule, reduce its write limits, and ask only for issue labelling.

Use three minutes of the existing 0:55-1:04 walkthrough for the
[Repo Assist technical reference](repo-assist-reference.md#three-minute-walkthrough).
Keep the workflow open while pointing to each setting:

* MCP is the tool interface; `toolsets` selects GitHub tool groups, not permissions.
* `network.allowed` lists reachable destination bundles, not trusted content.
* `min-integrity: none` admits untrusted GitHub submissions for triage.
* `protected-files` flags sensitive changes on PR creation here, but follow-up
  pushes use `allowed`; `exclude` removes protection rather than preventing edits.

> What can it read, which tools can it use, where can it connect, and which changes
> need extra protection? The Task 1-only prompt does not remove configured PR outputs.

### Lab 3 Checkpoints

| Time | Participant action | Facilitator check |
| --- | --- | --- |
| 0:55-1:01 | Create the labels, install the pinned source, and apply the guide's edits | No schedule, no optional web-fetch, 15-minute timeout, lower output caps |
| 1:01-1:04 | Review, compile, commit, and push | Explain the memory-validator review before any `--approve` use |
| 1:04-1:08 | Post the Task 1-only command from the guide | Check the selected task and issue-label results |
| 1:08-1:10 | Inspect labels and discuss the broader workflow | Do not expect a Monthly Activity report in command mode |

Before any validator approval, explain
[repo memory and validator trust](repo-assist-reference.md#repo-memory-persistent-data-and-trusted-validators):
memory survives runs on a branch and is public in this public repository. Store no
secrets there. The validator is trusted executable code, not a sandbox; inspect it
before approving it, and distinguish valid JSON from trustworthy content.

The pinned upstream install may report the documented `web-fetch` compilation
error after downloading the source. Apply the guide's edits, then recompile.
For a different error, inspect it rather than assuming installation succeeded.

Success: Repo Assist applies appropriate labels to the exercise issues. This
command should not change files or open a PR. The draft-PR task is optional.

Point interested participants to the [optional code fix](../README.md#optional-code-fix)
after the required lab. It needs Node.js 22 or later and a separate code issue.
The starter has 11 passing tests and one deliberate opening-time failure; the
completed fix must pass all 12. Review the agent's evidence and manually test the
exact PR head, since an agent-created PR may not start ordinary PR CI.

### Lab 3 Debrief

> What did you review before trusting the imported workflow? What is the difference
> between instructions in AGENTS.md and a configured permission or output cap?

Expected answers: triggers, tools, permissions, memory behaviour, and output limits;
AGENTS.md guides behaviour, while permissions and safe-output caps enforce controls.

If time is short, use the adapted source from the demo repository, inspect it,
compile it locally, and push. A slow run can finish during the design exercise.

## Design and Wrap-Up

At 1:10, ask participants to write their [four-line spec](../README.md#design-your-own-agent).
Give them five minutes, then ask pairs to challenge each other's scope and write limits.

> What is the smallest useful outcome? What should happen when the agent finds
> nothing to do? Which decision must remain with a human?

At 1:20, ask two participants to share one real run, output, or blocker. Recap:

* Markdown describes the work; compiled YAML runs it
* Agent reads and safe-output writes have separate permissions
* Review the evidence and every proposed diff
* Command mode and autonomous task selection have different behaviour

Finish with [cleanup](../README.md#finish): disable exercise workflows and revoke
unneeded workshop tokens. Never ask participants to display credentials.

## When Someone Is Blocked

Ask for the lab number, workflow name, run URL, and failing job or step. Use the
[recovery table](../README.md#recovery) before changing permissions or retrying.

Use the [diagnostic reference](repo-assist-reference.md#diagnostics-inspect-the-failing-boundary)
from the participant's repository:

```bash
gh aw mcp inspect repo-assist
gh aw audit RUN_ID
```

Substitute the affected workflow name and replace `RUN_ID` with the run ID or URL.
Check activation, MCP tools, firewall denials, detection, and safe-output results.
Review downloaded logs and reports for sensitive content before sharing them.

Do not spend the whole group's time on one environment. Pair the participant,
show a clearly identified rehearsal result, or return to the failure after the lab.
Track pending runs and incomplete checkpoints so they are not mistaken for success.
