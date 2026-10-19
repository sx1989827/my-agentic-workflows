---
title: Repo Assist Technical Reference
description: Rehearsal notes for the sandbox, MCP, toolsets, network access, integrity filtering, and protected files in Lab 3.
---

## Keep the Controls Separate

Use these notes alongside the [Lab 3 runsheet](lab-runsheet.md#lab-3-install-repo-assist).
Examples reflect the adapted [demo Repo Assist workflow](https://github.com/shin-akuma/agentic-workflows-demo/blob/main/.github/workflows/repo-assist.md)
and gh-aw v0.92.0. The snippets are excerpts, not complete workflows.

| Control | Question it answers | What it does not establish |
| --- | --- | --- |
| Sandbox | Where can the agent execute commands and make local changes? | That its commands or proposed changes are correct |
| MCP | How does the agent discover and call external tools? | Whether a tool or its returned content is trustworthy |
| `tools.github.toolsets` | Which GitHub API tool groups are available? | Token permissions or permission to write |
| `permissions` and credentials | Which API operations can this job authenticate and authorize? | Whether retrieved text is safe to follow |
| `network.allowed` | Which destinations may the sandbox reach? | Which repositories, API operations, or content are trusted |
| `tools.github.min-integrity` | Which GitHub content passes the configured trust threshold? | Permission to trigger a run or merge a PR |
| `safe-outputs` | Which bounded writes can the output handlers perform? | That every proposed result is correct |
| `protected-files` | How should code-writing outputs handle sensitive file changes? | A universal filesystem lock or GitHub branch protection |

The prompt and [AGENTS.md](../AGENTS.md) guide behaviour. Permissions, gateway
checks, firewall rules, and safe-output handlers enforce their respective controls.
None is a substitute for reviewing the result.

## Sandbox: The Agent's Execution Boundary

The sandbox is the restricted environment where the agent runs commands, reads
checked-out files, and makes local edits. It sits within the GitHub Actions runner;
it is not the entire runner or the model service.

```text
GitHub Actions runner
  Agent sandbox
    Checked-out files and local edits
    Shell commands
    Controlled outbound network access

Separate safe-output job
  Validates and publishes permitted GitHub changes
```

Editing the local checkout is different from changing the remote repository.
Repo Assist can prepare local changes without unrestricted permission to push
them. Its GitHub read credentials and sandbox constrain the agent, while separate
safe-output handlers validate and publish configured writes. A local diff is still
untrusted work to inspect, not evidence that the task was completed correctly.

### How Sandbox Egress Is Restricted

Egress means outbound network connections. gh-aw uses the Agent Workflow Firewall
(AWF) by default. The compiler expands `network.allowed` entries into domain
allowlists, and AWF enforces the effective policy through its proxy and firewall
controls when the sandbox attempts outbound access.

```text
Agent command attempts an outbound connection
  AWF checks the destination against the effective policy
    Allowed destination: connection can proceed
    Denied destination: connection is blocked and logged
```

For example, the demo's `python` entry allows the configured Python ecosystem
hosts. An arbitrary external destination outside the effective allowlist is
blocked. Allowing a destination does not guarantee connectivity or grant API
authorization; the remote service can still reject the request.

This enforcement sits outside the model. An instruction in an issue to ignore
the allowlist does not change the firewall policy. However, an allowed host can
still serve malicious content or accept unwanted data, so domain filtering is
not a complete defence against prompt injection or data leakage.

Runner setup steps and MCP server processes can run outside the agent firewall.
Review those paths separately rather than assuming the sandbox policy covers
every process in the workflow. Disabling AWF removes its egress enforcement.
See [Network Allowed](#network-allowed-reachable-destinations) for the actual
Repo Assist domain bundles and their tradeoffs.

Say aloud:

> The sandbox limits where the agent executes. The firewall limits where it
> connects. Credentials limit what it can access, and safe outputs limit what
> it can publish.

## MCP: The Tool Interface

MCP means Model Context Protocol. An MCP server exposes named tools, descriptions,
and input schemas. The agent chooses a tool, supplies structured arguments, and
receives a result. A GitHub tool can retrieve an issue without the model inventing
an HTTP request itself.

Repo Assist declares `tools.github` without an explicit access mode. In this
version, the default is a local, Docker-based GitHub MCP server in the Actions VM.
gh-aw configures the integration; participants do not need to create an MCP server.
The MCP gateway mediates tool calls and applies the configured GitHub integrity
checks to returned content.

MCP is the interface, not a security guarantee. A tool can return an issue containing
misleading instructions. A custom MCP server also introduces code, credentials,
and potentially its own network access that must be reviewed.

For this workshop, GitHub tools read repository information. Proposed GitHub writes
go through separately configured safe-output handlers. Do not generalize that
read-only arrangement to every MCP server.

Say aloud:

> MCP is how the agent calls tools. It does not make the tool or its answers trusted.
> We still control credentials, returned content, and permitted outputs.

### MCP Allowed Tools Versus Network Allowed Destinations

Custom MCP servers also have an `allowed` field, but it lists tool names, not
network destinations. This illustrative configuration is not part of Repo Assist:

```yaml
mcp-servers:
  docs:
    url: "https://learn.microsoft.com/api/mcp"
    allowed: ["microsoft_docs_search"]

network:
  allowed:
    - defaults
    - learn.microsoft.com
```

* `mcp-servers.docs.allowed` exposes only the named tool through the MCP gateway.
  Using `["*"]` exposes all tools from that server.
* `network.allowed` permits destinations for the agent sandbox's outbound traffic.
  It does not select MCP tools or grant API permissions.

These controls apply at different boundaries. The network entry above permits
sandbox access to that domain; it does not govern the remote MCP server's own
outbound connections. Local MCP processes can also run outside the agent firewall.
Review the server's deployment, credentials, and network controls separately.

Say aloud:

> MCP allowed means which tools; network allowed means which destinations.
> Neither automatically controls what a remote server can reach on our behalf.

See the [versioned MCP guide](https://github.com/github/gh-aw/blob/v0.92.0/docs/src/content/docs/guides/mcps.md#mcp-tool-filtering)
for gateway-level tool filtering.

## Toolsets: Available GitHub Tools

The demo contains:

```yaml
tools:
  github:
    toolsets: [all]
    min-integrity: none
  bash: true
```

`toolsets` selects groups of GitHub tools. For example, `repos` covers repository
reads such as commits and code search, `issues` covers issue reads, and
`pull_requests` covers PR reads. In v0.92.0, `all` expands to all available groups
except `dependabot`, which requires explicit opt-in.

Selecting tools does not grant API permissions. A tool can be available yet fail
because its credential lacks access. Conversely, hiding one GitHub tool is not a
complete restriction on every other execution path: `bash: true` enables shell
execution, still subject to the sandbox, credentials, and network controls.

The general-purpose Repo Assist workflow has broader tools than this lab needs.
Weekly Summary uses the narrower `toolsets: [repos, issues, pull_requests]`.
For a new focused workflow, start with the groups it needs; `tools.github.allowed`
can further restrict individual tools and their call counts.

Say aloud:

> Toolsets choose the available tools; permissions decide what the credential can do.
> All toolsets does not mean administrator access, but it is broader than this exercise needs.

## Network Allowed: Reachable Destinations

The demo contains:

```yaml
network:
  allowed:
    - defaults
    - dotnet
    - node
    - python
    - rust
    - java
    - github
```

These are named bundles of domains, not tool names or package-install permissions.

| Identifier | Examples of what the bundle covers |
| --- | --- |
| `defaults` | Basic infrastructure such as certificates, JSON schema, and package mirrors |
| `dotnet` | NuGet and .NET SDK hosts |
| `node` | npm, yarn, pnpm, Node.js, and Bun hosts |
| `python` | PyPI, conda, and Python package hosting |
| `rust` | Crates and Rust toolchain hosts |
| `java` | Maven Central, Gradle, and Adoptium |
| `github` | GitHub and related content-hosting domains |

With the default Agent Workflow Firewall (AWF) enabled, the sandbox's outbound
requests are constrained by the effective domain allowlist. Domain rules also
cover subdomains. The compiler expands the named bundles; inspect the compiled
configuration and firewall logs when diagnosing access.

Allowing a package registry does not mean every package there is safe. Allowing
GitHub does not restrict access to this one repository. These broad bundles support
Repo Assist's multi-language maintenance tasks, not a requirement to label issues.
For a focused workflow, remove unnecessary ecosystems and test the remaining paths.

The boundary matters: runner setup steps and MCP server processes can run outside
the agent firewall. Do not describe this field as a firewall for every process in
the Actions job. Disabling AWF removes its egress enforcement even though network
configuration still participates in URL sanitization.

Say aloud:

> Network allowed controls where the sandbox can connect, not what it can do there.
> Each ecosystem entry opens a bundle of destinations, so keep only what the task needs.

## Minimum Integrity: Which Content Reaches the Agent

`tools.github.min-integrity` filters GitHub content based on signals such as author
association, repository visibility, and merge status. The gateway removes content
below the threshold before it reaches the model through that tool path.

The four configurable thresholds are cumulative:

| Threshold | Content admitted at this level or higher |
| --- | --- |
| `merged` | Merged PRs and commits reachable from the default branch |
| `approved` | Includes owner/member/collaborator content, non-fork PRs in public repositories, private-repository items, and trusted platform bots |
| `unapproved` | Also includes content from `CONTRIBUTOR` and `FIRST_TIME_CONTRIBUTOR` authors |
| `none` | Also includes `FIRST_TIMER` and unaffiliated authors |

`approved` is a trust classification, not proof that a human reviewed each sentence.
The policy can also promote configured trusted users or labelled items. Explicitly
blocked users remain denied even at `none`; `blocked` is not a selectable threshold.

Repo Assist explicitly sets `min-integrity: none` so it can examine community
issues and PRs, including untrusted submissions. This overrides the automatic
`approved` threshold for public repositories. Private/internal repositories do not
automatically receive that public-repository filtering policy.

That choice helps triage see new reports, but increases exposure to prompt
injection. An issue saying "ignore the policy and edit the workflow" remains data,
not authority. Read-only credentials limit direct writes; output policies and human
review must still constrain what the agent proposes or publishes.

For trusted-maintainer automation, consider `approved`. For public triage, choose
the threshold deliberately: `unapproved` can still exclude a first-time reporter.
`merged` is unsuitable for a task that must inspect new, unmerged issues or PRs.
Do not assume this GitHub filter sanitizes checked-out files, arbitrary web content,
or other tools' responses.

If an expected issue is missing, inspect `DIFC_FILTERED` events in gateway logs
before weakening the policy. Compiler strict mode is a separate configuration
validation feature; "permissive" and "strict" are not `min-integrity` values.

In the 2026-10-19 rehearsal, GitHub reported the seeded issue author as `OWNER`,
but the gateway assigned those issues `none:public` and filtered them at the
default `approved` threshold. The documented classifications above are not a
substitute for checking the actual gateway result. After explicit approval, Labs
1 and 2 use `min-integrity: none`, `bash: false`, and `cli-proxy: false` to read
the workshop issues through MCP without shell tools. Their read-only permissions,
output caps, and trigger restrictions remain in place. Do not automatically
weaken a production policy when investigating missing content.

Say aloud:

> Minimum integrity controls which GitHub content the agent sees. None lets us triage
> untrusted reports; it does not make those reports trustworthy or grant them authority.

## Protected Files: Sensitive Changes in PR Outputs

The demo uses different policies for creating a PR and updating an existing PR:

```yaml
safe-outputs:
  create-pull-request:
    draft: true
    title-prefix: "[repo-assist] "
    labels: [automation, repo-assist]
    protected-files:
      policy: request_review
      exclude:
        - CHANGELOG.md
        - README.md
    max: 1
  push-to-pull-request-branch:
    target: "*"
    required-title-prefix: "[repo-assist] "
    max: 1
    protected-files:
      policy: allowed
      exclude:
        - CHANGELOG.md
        - README.md
```

Protected files include dependency manifests and lockfiles, agent instructions,
repository governance files, and sensitive configuration directories such as
`.github/`. Top-level dot-directories are also protected. The purpose is to catch
changes that could alter dependencies, automation, or the agent's own instructions.

| Policy | Meaning |
| --- | --- |
| `request-review` | Preserve the PR and submit a `REQUEST_CHANGES` review identifying protected changes; `request_review` is an accepted legacy spelling |
| `blocked` | Fail the safe output when protected files are changed |
| `fallback-to-issue` | Create a review issue instead of publishing the protected change through the requested PR operation |
| `allowed` | Do not restrict protected-file changes through this check; other controls still apply |

`exclude` removes matching files from the protected set. It does not forbid editing
them and does not strip them from the patch. Bare filenames match by basename;
a leading slash targets an exact repository path. The PR handlers already exempt
the changelog by default in this version, so that entry is redundant.

In this configuration, PR creation flags protected changes for review except for
the excluded filenames. Follow-up pushes use `allowed`, so the protected-file
check adds no restriction there; the exclusions do not narrow that permission.
The title-prefix requirement and `max: 1` still apply, but a matching title is not
proof that the change was reviewed or that the PR was created by this workflow.

> [!WARNING]
> A review request is not a hard block on publishing changes. GitHub rulesets and
> branch protection determine merge enforcement. The lab's "Task 1 only" prompt
> also does not remove Repo Assist's configured PR-writing capabilities.

For a dedicated labelling workflow, omit PR-writing outputs entirely. For a focused
documentation fixer, consider `blocked` on both code-writing outputs and a narrow
`allowed-files` list. These are hardening options, not changes made to the demo by
these notes. Always recompile and test after changing the configuration.

Say aloud:

> Protected files checks sensitive changes at the output boundary. Our imported
> workflow flags them on PR creation but permits them on follow-up pushes. That is
> a policy choice to review, not a blanket safety guarantee.

## Trigger Authorization: Who Can Start a Run

`on.roles` controls which repository roles may activate a workflow. The default
allowlist is `[admin, maintainer, write]`. It is an exact-match list, not a minimum
privilege threshold: `roles: [write]` excludes administrators and maintainers.

```yaml
on:
  slash_command:
    name: issue-helper
  roles: [admin, maintainer, write]
```

This is separate from `tools.github.min-integrity`. A maintainer can invoke an
agent to inspect an outsider's report without allowing that outsider to invoke
the agent. Setting `min-integrity: none` does not change trigger authorization.
Avoid changing `on.roles` to `all` merely to fix a command that did not start.
Bot authorization is configured separately with `on.bots` and needs its own review.

For paired participants, the repository owner should post the command, or grant
the partner an appropriate repository role. Check activation logs when a valid
command does not reach the agent job.

Say aloud:

> Who can start the agent and whose content it can read are separate decisions.

## Threat Detection: Review Before Publication

When safe outputs are configured, gh-aw enables threat detection by default.
The generated workflow includes a detection job between the main agent and the
safe-output jobs. It examines proposed output and patches for prompt injection,
secret leakage, and suspicious code changes.

```text
Agent prepares output and patches
  Detection examines the artifacts
    Safe-output handlers apply their own checks before publishing
```

Do not describe detection as a guarantee or assume every warning blocks writes.
The v0.92.0 configuration reference documents
`safe-outputs.threat-detection.continue-on-error: true` as the default advisory
behaviour, although other prose on that page describes fail-closed behaviour.
Check the compiled workflow and actual detection conclusion when explaining a
particular run. Explicit blocking configuration should be tested before relying
on it as an enforcement gate.

For example, the following is a policy option, not an edit applied to our demo:

```yaml
safe-outputs:
  create-issue:
    max: 1
  threat-detection:
    continue-on-error: false
```

A detector execution failure or invalid result means the security assessment is
incomplete, not that a threat was proven or the output was cleared. Detection can
also produce diagnostic tracking issues independently of the agent's requested
business outputs. Inspect the detection job and conclusion, not only the final
issue or PR. Human review remains necessary even after a clean result.

Say aloud:

> Detection adds another review layer. Check whether it produced a verdict and
> whether the configured policy warns or blocks; it is not proof of correctness.

## Repo Memory: Persistent Data and Trusted Validators

Repo Assist uses the `memory/repo-assist-memory` branch to carry state across runs.
This is Git-backed storage, not the model remembering a previous conversation.
Its visibility follows the repository: in this public workshop repository, memory
is public too. Never store secrets, personal information, or confidential reports
there. Disabling the workflow does not erase the branch or its history.

The imported validator checks a single JSON file, its permitted keys, value shapes,
and limits. Those checks reduce malformed state, but do not prove a stored note is
true or free from misleading instructions. Treat restored notes as data and check
important claims against current repository evidence.

The validator itself is trusted JavaScript executed by the workflow. Its temporary
copy of the memory directory is not a security sandbox; it retains the runner's
filesystem permissions and follows the runner's network policy. The framework
limits its environment and does not pass GitHub write credentials to the validator,
but that does not make arbitrary imported code safe. Our inspected validator makes
local checks without external calls; do not generalize that to every validator.

Review changes before using `gh aw compile repo-assist --approve`. Approval is not
a security scan. After a run, inspect the memory push job to confirm persistence;
an agent saying it updated memory is not proof the branch update succeeded.

Say aloud:

> Memory is persisted repository data. Its validator checks structure, not truth,
> and the validator code itself must be trusted before we approve it.

## Staged Previews: Optional Rehearsal

Set `safe-outputs.staged: true` to preview built-in outputs in the Actions run
summary without applying those writes:

```yaml
safe-outputs:
  staged: true
  create-issue:
    title-prefix: "[weekly-summary] "
    max: 1
```

For an optional exercise, add this setting to Weekly Summary, recompile, commit,
push, and dispatch it. Inspect the proposed issue in the run summary. Remove the
setting, recompile, and publish again before expecting a real summary issue.
This extension is outside the required lab checkpoints.

The agent still executes, reads data, and consumes inference. Staging is not a
sandbox or a guarantee of zero side effects: custom jobs, external MCP servers,
scripts, memory/cache persistence, and diagnostic exports need separate controls.
Custom safe-output jobs must honour the staging signal themselves. A staged
preview also does not prove a later live write will succeed with GitHub permissions
and repository rules.

Say aloud:

> Staged mode previews built-in writes. It does not stop the agent running or
> automatically neutralize every other effect in the workflow.

## Sanitized Context: Safer Input, Still Untrusted

Lab 2 uses `steps.sanitized.outputs.text` rather than inserting raw event text.
For an issue or PR this contains its title and body; for a comment it contains
the comment body.

Sanitization neutralizes mentions and bot-trigger text, protects against XML
injection, filters URLs, limits content size, and strips ANSI escape sequences.
This reduces formatting and automation hazards. It does not establish the truth
of a report or remove every natural-language attempt to redirect the agent.

Continue to treat the text as task data. An instruction to reveal credentials or
ignore the workflow's scope does not gain authority because it survived sanitization.
Use independent permissions and output controls, not only a prompt asking the
agent to behave safely.

Say aloud:

> Sanitized means processed to reduce specific hazards, not trusted or safe to obey.

## Diagnostics: Inspect the Failing Boundary

Run these commands from your own repository. Replace `RUN_ID` with the numeric
Actions run ID, or provide the full run URL to `audit`:

```bash
gh aw mcp inspect repo-assist
gh aw audit RUN_ID
```

`mcp inspect` checks the workflow's MCP configuration and exposed tools.
`audit` downloads run logs and artifacts and reports evidence such as MCP failures,
blocked network requests, detection results, output summaries, and usage. Missing
artifacts mean missing evidence, not a successful check.

| Symptom | Start here |
| --- | --- |
| Command does not reach the agent | Activation logs, actor role, command position, default-branch workflow |
| Tool is unavailable | MCP configuration, toolsets, and tool allowlist |
| Expected issue is absent | Integrity-filter events and repository access |
| Network request is denied | Firewall analysis and the effective allowlist |
| Agent finishes but nothing is published | Staged mode, detection conclusion, safe-output job, or a legitimate noop |
| Notes are missing next run | Memory validation and push-job results |

Review downloaded reports before sharing them. They can contain repository
content and agent output; do not publish them unexamined or broaden permissions
solely to make an error disappear.

Say aloud:

> Find which boundary rejected the operation before changing its policy.

## Three-Minute Walkthrough

1. Spend 30 seconds on MCP: the tool interface, not the trust decision.
2. Spend 30 seconds on toolsets and permissions: available tools versus authorized operations.
3. Spend 30 seconds on network: destination bundles, not permission to trust downloads.
4. Spend 45 seconds on integrity: `none` admits community input; `approved` filters by trust signals.
5. Spend 45 seconds on protected files: compare the two output policies and explain `exclude`.

Close with:

> What can it read, which tools can it use, where can it connect, and which changes
> need extra protection? Review each control separately, then review the actual result.

## Versioned References

These links point to the documentation shipped with v0.92.0, rather than a moving
latest-version page. Recheck semantics when upgrading the workshop compiler.

* [GitHub tools and toolsets](https://github.com/github/gh-aw/blob/v0.92.0/docs/src/content/docs/reference/github-tools.md)
* [Network configuration and firewall scope](https://github.com/github/gh-aw/blob/v0.92.0/docs/src/content/docs/reference/network.md)
* [Integrity levels and filtering](https://github.com/github/gh-aw/blob/v0.92.0/docs/src/content/docs/reference/integrity.md)
* [PR safe outputs and protected files](https://github.com/github/gh-aw/blob/v0.92.0/docs/src/content/docs/reference/safe-outputs-pull-requests.md)
* [Trigger authorization](https://github.com/github/gh-aw/blob/v0.92.0/docs/src/content/docs/reference/triggers.md)
* [Threat detection configuration](https://github.com/github/gh-aw/blob/v0.92.0/docs/src/content/docs/reference/threat-detection.md)
* [Repo memory and validator execution](https://github.com/github/gh-aw/blob/v0.92.0/docs/src/content/docs/reference/repo-memory.md)
* [Staged previews](https://github.com/github/gh-aw/blob/v0.92.0/docs/src/content/docs/reference/staged-mode.md)
* [Sanitized command context](https://github.com/github/gh-aw/blob/v0.92.0/docs/src/content/docs/reference/command-triggers.md)
* [Run auditing](https://github.com/github/gh-aw/blob/v0.92.0/docs/src/content/docs/reference/audit.md)
