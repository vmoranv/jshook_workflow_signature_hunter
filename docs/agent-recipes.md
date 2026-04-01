# Agent Recipes for `jshook_workflow_template`

## Core rule

- parallelize reads, not shared page state mutations
- let the main agent keep the active browser session
- use subagents for sidecar analysis and report drafting

## Recipe 1: run workflow, then delegate analysis

Recommended split:

- main agent
  - `run_extension_workflow`
  - optional `network_get_response_body`
- subagent
  - classify endpoints
  - summarize auth and session artifacts
  - draft report output

## Recipe 2: main agent navigates, subagent reviews outputs

Recommended split:

- main agent
  - `page_navigate`
  - page actions
  - `network_get_requests`
- subagent
  - endpoint matrix
  - auth header and signature review
  - next-step probing suggestions

## Recipe 3: when to use parallel tool calls

Good read-only candidates:

- `extensions_list`
- `search_tools`
- `page_get_local_storage`
- `page_get_cookies`
- `console_get_logs`

Avoid parallelizing any action that changes the current page state.