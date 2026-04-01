import {
  createWorkflow,
  type WorkflowExecutionContext,
  SequenceNodeBuilder,
} from '@jshookmcp/extension-sdk/workflow';

const workflowId = 'workflow.signature-hunter.v1';

/**
 * Signature Hunter — Reverse Mission Workflow
 *
 * Given a target URL and an optional parameter name (e.g. "sign", "token", "sig"),
 * this workflow automatically:
 *   1. Opens the page with network capture enabled
 *   2. Collects requests and identifies signature-bearing parameters
 *   3. Searches scripts for crypto/signing logic in parallel
 *   4. Extracts the function tree around candidate functions
 *   5. Sets hooks on the signing path to capture args/return values
 *   6. Extracts auth surface for context
 *   7. Records all findings into the evidence graph + instrumentation session
 *   8. Emits a structured session insight summarising the signing chain
 */
export default createWorkflow(workflowId, 'Signature Hunter')
  .description(
    'Automatically locates request signature generation functions, hooks the signing chain, and produces an evidence graph linking request → initiator → script → function → hook → captured data.',
  )
  .tags([
    'reverse',
    'signature',
    'crypto',
    'hook',
    'request',
    'auth',
    'mission',
  ])
  .timeoutMs(8 * 60_000)
  .defaultMaxConcurrency(4)
  .buildGraph((ctx: WorkflowExecutionContext) => {
    const prefix = 'workflows.signatureHunter';

    // ── Config ──────────────────────────────────────────────────────
    const url = String(ctx.getConfig(`${prefix}.url`, 'https://example.com'));
    const waitUntil = String(ctx.getConfig(`${prefix}.waitUntil`, 'networkidle0'));
    const targetParam = String(ctx.getConfig(`${prefix}.targetParam`, 'sign'));
    const requestTail = Number(ctx.getConfig(`${prefix}.requestTail`, 30));
    const searchKeywords = String(
      ctx.getConfig(`${prefix}.searchKeywords`, 'sign,signature,encrypt,hmac,md5,sha,token,hash'),
    );
    const hookTimeout = Number(ctx.getConfig(`${prefix}.hookTimeoutMs`, 30_000));
    const minAuthConfidence = Number(ctx.getConfig(`${prefix}.minAuthConfidence`, 0.3));
    const maxConcurrency = Number(ctx.getConfig(`${prefix}.parallel.maxConcurrency`, 4));

    const root = new SequenceNodeBuilder('signature-hunter-root');

    root
      // ── Phase 1: Browser & Network Setup ──────────────────────────
      .tool('enable-network', 'network_enable', {
        input: { enableExceptions: true },
      })
      .tool('navigate', 'page_navigate', {
        input: { url, waitUntil },
      })

      // ── Phase 2: Capture Requests ─────────────────────────────────
      .tool('capture-requests', 'network_get_requests', {
        input: { tail: requestTail },
      })

      // ── Phase 3: Parallel Analysis ────────────────────────────────
      .parallel('analyse-scripts', (p) => {
        p.maxConcurrency(maxConcurrency)
          .failFast(false)
          // Search for signing-related keywords across loaded scripts
          .tool('search-signing-keywords', 'search_in_scripts', {
            input: {
              query: searchKeywords,
              matchType: 'any',
            },
          })
          // Detect known crypto algorithms (AES, RSA, HMAC, MD5, SHA-*)
          .tool('detect-crypto', 'detect_crypto', {
            input: {},
          })
          // Detect obfuscation patterns that might hide signing logic
          .tool('detect-obfuscation', 'detect_obfuscation', {
            input: {},
          })
          // Collect all cookies & storage for auth context
          .tool('collect-cookies', 'page_get_cookies')
          .tool('collect-storage', 'page_get_local_storage');
      })

      // ── Phase 4: Function Tree Extraction ─────────────────────────
      .tool('extract-function-tree', 'extract_function_tree', {
        input: {
          targetParam,
          depth: 3,
        },
      })

      // ── Phase 5: Hook the Signing Chain ───────────────────────────
      .tool('set-hooks', 'manage_hooks', {
        input: {
          action: 'add',
          targetParam,
          captureArgs: true,
          captureReturn: true,
          timeoutMs: hookTimeout,
        },
      })

      // ── Phase 6: Auth Surface Extraction ──────────────────────────
      .tool('extract-auth', 'network_extract_auth', {
        input: { minConfidence: minAuthConfidence },
      })

      // ── Phase 7: Evidence Recording ───────────────────────────────
      .tool('create-evidence-session', 'instrumentation_session_create', {
        input: {
          name: `signature-hunter-${targetParam}`,
          metadata: { url, targetParam, workflowId },
        },
      })
      .tool('record-artifact', 'instrumentation_artifact_record', {
        input: {
          type: 'signature_chain',
          label: `Signing chain for "${targetParam}" on ${url}`,
          metadata: { url, targetParam },
        },
      })

      // ── Phase 8: Session Insight ──────────────────────────────────
      .tool('emit-insight', 'append_session_insight', {
        input: {
          insight: JSON.stringify({
            status: 'signature_hunter_complete',
            workflowId,
            url,
            targetParam,
            searchKeywords,
            hookTimeout,
          }),
        },
      });

    return root;
  })
  .onStart((ctx) => {
    ctx.emitMetric('workflow_runs_total', 1, 'counter', {
      workflowId,
      mission: 'signature_hunter',
      stage: 'start',
    });
  })
  .onFinish((ctx) => {
    ctx.emitMetric('workflow_runs_total', 1, 'counter', {
      workflowId,
      mission: 'signature_hunter',
      stage: 'finish',
    });
  })
  .onError((ctx, error) => {
    ctx.emitMetric('workflow_errors_total', 1, 'counter', {
      workflowId,
      mission: 'signature_hunter',
      stage: 'error',
      error: error.name,
    });
  })
  .build();
