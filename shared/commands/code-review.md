# Code Review

Perform a comprehensive code review of changes in the current branch or a specified GitHub PR.

## Instructions

You are performing a code review. Follow these steps carefully:

1. **Determine the review scope:**
   - If a GitHub PR URL is provided, use `gh pr view <number> --json title,body,url,files` to get PR details
   - If no PR URL is provided, review the current branch changes using `git diff` and `git status`

2. **Gather context:**
   - Read the PR description (if reviewing a PR) to understand the intended changes
   - If a task/issue URL is provided, fetch and analyze the task requirements
   - Run `git log` to see commit messages and understand the change history
   - Run `git diff [base-branch]...HEAD` to see all changes in the branch

3. **Review all changed files:**
   - Use the Read tool to examine each modified file
   - Analyze the code for:
     - Bugs and logic errors
     - Code quality and best practices
     - Performance issues
     - Security vulnerabilities
     - Test coverage
     - Documentation completeness
     - Consistency with existing codebase patterns
     - Edge cases and error handling

4. **Cross-reference with requirements:**
   - Verify changes align with the PR description
   - If a task URL was provided, confirm all requirements are met
   - Check if any requirements are missing or incomplete

5. **Provide structured feedback:**
   - Organize findings by severity: Critical, High, Medium, Low
   - For each issue, provide:
     - File name and line number reference (e.g., `src/app.ts:42`)
     - Clear description of the problem
     - Suggested fix or improvement
   - Highlight what was done well
   - Provide an overall assessment

## Review Output Format

```markdown
# Code Review Summary

## Overview

[Brief summary of what was reviewed and overall assessment]

## PR/Task Alignment

- ✅ Meets requirements: [Yes/No/Partial]
- [List any missing or incomplete requirements]

## Critical Issues

[Issues that must be fixed before merging]

## High Priority

[Important issues that should be addressed]

## Medium Priority

[Issues that would improve code quality]

## Low Priority / Suggestions

[Nice-to-have improvements and suggestions]

## Positive Observations

[What was done well]

## Overall Recommendation

[Approve / Request Changes / Needs Discussion]
```

## Important Notes

- Be thorough but constructive in your feedback
- Always reference specific file paths and line numbers
- If reviewing a GitHub PR, use `gh pr view` and `gh pr diff` commands
- For task URLs, use WebFetch to retrieve and analyze requirements
- Consider the broader context of the codebase, not just isolated changes
- Balance finding issues with acknowledging good practices
