---
name: scan-security
description: Defensive security review of the user's own codebase, run ONLY when the user's message starts with "/ScanSecurity". With no scope after it, scan the whole system; with a scope (such as "login flow" or "uploads"), scan just that part. Do NOT use this skill for general security questions or any message that does not start with "/ScanSecurity". When triggered, map the system, audit authentication, authorization, uploads, injection, secrets, dependencies and configuration, and report prioritized findings without modifying any files.
---

# ScanSecurity

A read-only security audit of the system in the current project, for a system the user owns and is authorized to test.

## Trigger rule (check this first)

The user triggers this skill by typing `/ScanSecurity` at the start of their message (letter case doesn't matter).

- **`/ScanSecurity` on its own (no scope):** scan the **whole system**, covering every area in the checklist.
- **`/ScanSecurity` followed by a scope:** scan only that part, in more depth. Examples: `/ScanSecurity login and sessions`, `/ScanSecurity file uploads`, `/ScanSecurity src/api`.
- **Message does not start with `/ScanSecurity`:** do nothing from this skill. Answer normally, and do not mention the skill.

If the scope doesn't match anything in the project (for example, `/ScanSecurity payments` when there is no payment code), **do not run any scan**. Tell the user briefly what the problem is: which scope they typed and that nothing in the project matches it. Then suggest what they could type instead, such as plain `/ScanSecurity` to scan the whole system, or a scope that does exist (name one or two areas you found). Don't guess a different scope on their behalf.

## Hard rules

1. **Read-only.** Never edit, create, move, or delete project files. Report findings; do not fix them unless the user asks in a later message.
2. **Never stage or commit.** Do not run `git add`, `git commit`, `git stash`, `git reset`, `git checkout`, or anything else that changes the repository state or the index without explicit permission. Read-only git commands (`git log`, `git diff`, `git status`, `git grep`) are fine.
3. **Stay local and non-destructive.** Do not send requests to external or third-party systems, run exploits, brute-force logins, or load-test anything. Read-only audit commands (`npm audit`, `pip-audit`, `grep`) are fine. Ask before installing any tool.
4. **Don't invent findings.** Every finding must point to specific code or configuration you actually read. If something can't be determined from the files, put it under "Could not verify".
5. **Never print full secrets.** If you find a credential or key, show only the file, line, and the first and last 2 characters.

## Workflow

### Step 1: Map the system
Before reporting anything, read the code and build a short map:
- Stack, framework, database, and how the app is run (see `package.json`, `requirements.txt`, Dockerfiles, config)
- Every route/endpoint with its method and whether it requires authentication or a specific role
- How login, registration, password reset, sessions or tokens work
- Every place untrusted input enters (forms, query strings, headers, file uploads, webhooks, internal service calls)
- Where secrets and configuration live

### Step 2: Audit
Work through the checklist in `references/checklist.md`, covering authentication and sessions, authorization, injection, file uploads, secrets, dependencies, configuration, and logging. Skip sections that don't apply to this system (for example, no file uploads) and say they were skipped.

### Step 3: Report
Use exactly this structure:

**System map**: a brief summary from Step 1.

**Findings** (ordered Critical, High, Medium, Low). For each:
1. Title and severity
2. Location (file and line, or endpoint)
3. What is wrong and how it could be exploited (brief, no working exploit code)
4. Recommended fix, with a short code example where useful
5. Confidence: Confirmed in code / Likely / Needs runtime verification

**Prioritized fix list**: the order you would fix things in.

**Done well**: security controls that are implemented correctly.

**Could not verify**: what you couldn't determine and which file or detail would settle it.

Finish by offering next steps: fixing specific findings (only when the user asks), or confirming runtime issues with a dynamic scanner such as OWASP ZAP. Remind the user that AI review produces leads, not proof, and findings should be verified.

Show the report in the chat. Only save it to a file if the user asks, and never inside the repository without permission.