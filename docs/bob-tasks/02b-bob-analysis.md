# Bob task 02B — genuine Dcnstrct trace analysis

Read this task and the “MCP setup” section of `docs/BUILD_GUIDE.md` only. This is a short Bob IDE verification task; do not edit application files, resume the old 100-turn task, reread the build/review history, or work on the UI.

1. In Bob Settings → MCP, make sure **Use MCP Servers** is checked and `dcnstrct` is enabled. The project root must be this repository because `.bob/mcp.json` uses `cwd: "."` and a relative SQLite path. If the server does not connect, report the displayed error; do not simulate tool calls.
2. Start the API from the Bob IDE terminal if it is not already running: `npm run dev -w packages/api`. Create one fresh synthetic run for each scenario via the actual app/API: `cancel_preparing` and `cancel_shipped`. Use those new run IDs; older runs may be stale after the source fixes.
3. Use the connected MCP tools `list_runs`, `get_run`, and `get_source`. Inspect both completed run IDs. For each source read, copy `sourceRevision` and the exact allowlisted citation range from that run's event; never guess line numbers.
4. Use `save_analysis` for both runs. Cite only event IDs owned by that run and source ranges you actually read. Explain observed state changes and the branch reason separately from interpretation; include uncertainty where appropriate. Use `delivery: "recorded"` and the actual Bob task ID or title visible in this task for `provenance.taskReference`. Do not claim the schema proves Bob authorship.
5. Report which tools actually ran, both analysis IDs, and any errors. Make no claim of completion if either analysis fails. Stop for Codex review and capture this task's Bob session-consumption summary as `bob_sessions/dcnstrct_task02b_bob_analysis_summary.png`.
