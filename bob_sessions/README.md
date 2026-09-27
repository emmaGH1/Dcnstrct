# IBM Bob session evidence

Task 01, task 02 and task 02B session consumption summaries are saved below, alongside task 01 completion-report screenshots. Task 02B's updated IDE summary confirms the corrected analyses and 6.20 Bobcoins. The source-tool fallback is documented in docs/REVIEW-03.md.

Every participant saves ALL relevant IDE task session consumption summaries here: Tasks -> select task -> click header -> capture summary; PNG preferred. Filename includes product/team, task number, member alias when needed and description. Example dcnstrct_task01_core_summary.png. Include relevant retries/reviews. Confirm workspace; select All for cross-workspace tasks.

| Task | Member alias | Actual contribution | Commit/files | Summary PNG | Status |
| --- | --- | --- | --- | --- | --- |
| 01 | | Execution core, 7.55 Bobcoins | | `dcnstrct_task01_core_summary_part1.png`, `dcnstrct_task01_core_summary_part2.png` | Captured; task ID adcb99016f90c206574a176019f779f |
| 02 | | Core review fixes and MCP implementation; genuine Bob tool use still pending, 22.95 Bobcoins | See docs/REVIEW-02.md | `dcnstrct_task02_mcp_summary.png` | Captured and inspected; task ID ec493d91c8e1d51a59dd6be74991a973 |
| 02B | | Genuine Bob inspection, two corrected saved analyses; final summary shows 6.20 Bobcoins | See docs/REVIEW-03.md; unmodified records in `task02b/original-records.json` | `dcnstrct_task02b_bob_analysis_summary_final.png.png` | Final summary captured and inspected; task ID 97e135f8b290f41a602bf35b18247040; Bob's get_source failed and its read_file fallback is disclosed |
| 03 | | UI | | | Pending |

Task 01 completion-report pages remain separately saved as `dcnstrct_task01_completion_report_part1.png` and `dcnstrct_task01_completion_report_part2.png`. The task-summary screenshots include the task ID, workspace, context and Bobcoin total; two overlapping images preserve the report beneath the header.

Task 02B continuation produced reviewed corrected analyses `ana_xXlmH_gNhP_65l701tq` and `ana_kvqcWMxMEB_7anise9a`, preserved in `task02b/corrected-records.json`. The earlier summary showed 4.64 Bobcoins; the updated final summary shows 6.20 for the task. Treat the latter as the final displayed total; do not add the earlier amount again.

The supplied correction report is preserved in `task02b/correction-report.md`: get_source still failed with a missing sourceRevision argument; Bob used read_file instead. Successful Bob get_source use remains unverified. Proceed with the reviewed content and disclose the fallback. The updated final summary screenshot shows the task completed and 6.20 Bobcoins.

Check readability, participant coverage, tracked status/public visibility and secrets before submission. Subscription screenshot and optional Shell use do not replace IDE summaries.

Source: https://lablab-ibm-bob-2-hackathon-guide.s3.us.cloud-object-storage.appdomain.cloud/index.html
