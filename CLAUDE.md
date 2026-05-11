# CLAUDE.md
This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Role
- This file is not the source of local rules — it is a thin shared adapter that causes a session to re-read `AGENTS.md` in the correct order.
- The SSOT for all project facts, commands, paths, templates, gold standards, and Done criteria is always `AGENTS.md`.
- This file does not replace, summarize, or duplicate `AGENTS.md`.
- When explaining repository rules or providing rationale, cite the relevant `AGENTS.md` — not this file.

## Reading Strategy
- Always read the root `AGENTS.md` first and treat it as the base.
- Once the task topic is identified at session start, open the **"Task-Type Entry Map"** section in `AGENTS.md` first to pinpoint the relevant contract documents, files, and QA commands.
- Only read `AGENTS.md` top-to-bottom in full when the current task type is not covered by the Entry Map.
- When work scope moves into a subdirectory, additionally read the nearest child `AGENTS.md`.
- Treat a child `AGENTS.md` as a delta that applies only to its own subtree.
- Use `AGENTS.md` as a table of contents for reopening the contract documents and anchors needed for the current task — do not re-narrate it like an encyclopedia.
- If a file path, command name, or contract document reference in a child `AGENTS.md` differs from the same item in the root, do not self-adjust. Instead, list each conflicting item with its source file and halt, reporting it as a documentation conflict.

## Re-read Triggers
- When work scope moves into a new subdirectory.
- When the task topic switches to a different subsystem.
- When files listed under **"UX High-Risk Zones"** in `AGENTS.md` are included in the change set.
- Immediately before explaining any repository rule or its rationale.
- When the session has grown long enough that in-memory state may have drifted from the current file state.
- In any of the above cases, reopen the relevant `AGENTS.md`, verify, then proceed.
- When entering a **"UX High-Risk Zone"**, reopen that section, fill in the UX-related fields of Template A or B (covering whichever of usability, accessibility, responsiveness, performance, and design consistency apply), and obtain approval before continuing.

## Anti-Drift
- Do not duplicate rules that appear to be needed across multiple tool files here — promote them to `AGENTS.md` instead.
- Keep in this file only the referencing habits that are repeatedly easy to get wrong: entry order, re-read timing, and where to cite rationale.
- If a task depends on an item in `AGENTS.md` that is marked `[TEMP]`, `[NEEDS ADDITION]`, or `[NEEDS VERIFICATION]`, do not use that item as a basis. Instead, surface the marker along with its content, request user confirmation, and halt.
