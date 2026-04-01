import {
  createWorkflow,
  type WorkflowExecutionContext,
  SequenceNodeBuilder,
  toolNode,
} from '@jshookmcp/extension-sdk/workflow';

const workflowId = 'workflow.template-capture.v1';

export default createWorkflow(workflowId, 'Template Capture Workflow')
  .description(
    'TypeScript-first MVP workflow that enables network capture, navigates to a page, collects surface data in parallel, extracts auth, and emits a summary.',
  )
  .tags(['workflow', 'template', 'parallel', 'capture'])
  .timeoutMs(10 * 60_000)
  .defaultMaxConcurrency(4)
  .buildGraph((ctx: WorkflowExecutionContext) => {
    const prefix = 'workflows.templateCapture';
    const url = String(ctx.getConfig(`${prefix}.url`, 'https://example.com'));
    const waitUntil = String(ctx.getConfig(`${prefix}.waitUntil`, 'domcontentloaded'));
    const requestTail = Number(ctx.getConfig(`${prefix}.requestTail`, 20));
    const maxConcurrency = Number(ctx.getConfig(`${prefix}.parallel.maxConcurrency`, 4));
    const collectConsoleLogs = Boolean(ctx.getConfig(`${prefix}.collectConsoleLogs`, true));
    const logLimit = Number(ctx.getConfig(`${prefix}.consoleLogLimit`, 50));

    const root = new SequenceNodeBuilder('template-capture-root');

    root
      .tool('enable-network', 'network_enable', { input: { enableExceptions: true } })
      .tool('navigate', 'page_navigate', { input: { url, waitUntil } })
      .parallel('collect-surface', (p) => {
        p.maxConcurrency(maxConcurrency)
          .failFast(false)
          .tool('collect-local-storage', 'page_get_local_storage')
          .tool('collect-cookies', 'page_get_cookies')
          .tool('collect-requests', 'network_get_requests', { input: { tail: requestTail } })
          .tool('collect-links', 'page_get_all_links');

        if (collectConsoleLogs) {
          p.tool('collect-console-logs', 'console_get_logs', { input: { limit: logLimit } });
        }
      })
      .tool('extract-auth', 'network_extract_auth', { input: { minConfidence: 0.4 } })
      .tool('emit-summary', 'console_execute', {
        input: {
          expression: `(${JSON.stringify({
            status: 'template_capture_complete',
            workflowId,
            url,
            waitUntil,
            requestTail,
            maxConcurrency,
            collectConsoleLogs,
          })})`,
        },
      });

    return root;
  })
  .onStart((ctx) => {
    ctx.emitMetric('workflow_runs_total', 1, 'counter', { workflowId, stage: 'start' });
  })
  .onFinish((ctx) => {
    ctx.emitMetric('workflow_runs_total', 1, 'counter', { workflowId, stage: 'finish' });
  })
  .onError((ctx, error) => {
    ctx.emitMetric('workflow_errors_total', 1, 'counter', {
      workflowId,
      stage: 'error',
      error: error.name,
    });
  })
  .build();
