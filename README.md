# jshook_workflow_template

TypeScript-first template repository for building a reusable `jshook` workflow.

This template focuses on one thing:

- codify an existing built-in tool chain into a reusable workflow contract
- keep TypeScript source in Git and generated JavaScript out of Git

## Included in the template

- `workflow.ts`: workflow source entrypoint
- `docs/agent-recipes.md`: recipes for orchestration, parallel reads, and subagent-assisted analysis
- `dist/workflow.js`: generated locally by `pnpm run build` and ignored by Git

## What the MVP workflow demonstrates

The sample workflow runs this shape:

1. `network_enable`
2. `page_navigate`
3. parallel surface collection
   - `page_get_local_storage`
   - `page_get_cookies`
   - `network_get_requests`
   - `page_get_all_links`
   - optional `console_get_logs`
4. `network_extract_auth`
5. `console_execute` summary output

## Dependency model

This template uses the published npm package:

```json
{
  "@jshookmcp/extension-sdk": "^0.1.3"
}
```

## Install and build

```bash
pnpm install
pnpm run build
pnpm run check
```

## Loading behavior

`jshook` discovers both `workflow.ts` and `dist/workflow.js`, but when both exist it prefers the generated JavaScript entry.

Recommended workflow:

1. edit `workflow.ts`
2. run `pnpm run build`
3. let `jshook` load `dist/workflow.js`

Do **not** commit `dist/`.

## Load the workflow into jshook

Set:

```bash
MCP_WORKFLOW_ROOTS=<path-to-cloned-jshook_workflow_template>
```

Then run inside `jshook`:

1. `extensions_reload`
2. `extensions_list`
3. `list_extension_workflows`
4. `run_extension_workflow`

## Configuration prefix

The template uses:

```text
workflows.templateCapture.*
```

Rename that prefix early when adapting the template for real use.

## Git hygiene

Keep this repo focused on source and docs.
Do not commit:

- `dist/`
- `node_modules/`
- `.env`
- runtime artifacts
- screenshots
- local sessions
- host-specific temp output

## What to change first

1. replace `workflowId` and `displayName`
2. rename the config prefix
3. keep state-mutating steps serialized
4. keep read-only collection steps parallel where safe
5. validate the workflow through `extensions_reload` and `list_extension_workflows`