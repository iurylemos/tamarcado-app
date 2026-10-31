# Create Pull Request

Create a pull request following the team template using GitHub CLI.

## Instructions

You are creating a pull request. Follow these steps:

1. Run `git status` and `git diff` to understand the current branch changes
2. Check if the current branch tracks a remote branch and if it needs to be pushed
3. Run `git log` and `git diff [base-branch]...HEAD` to understand all commits in this branch
4. Analyze ALL changes to draft a comprehensive PR description
5. Push the branch to remote if needed (with `-u` flag for new branches)
6. Create the PR using the template below

## PR Template

```markdown
## Description

<!-- Provide a clear and concise description of what this PR does -->

## Type of Change

<!-- Check the relevant option(s) -->

- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Refactoring (no functional changes)
- [ ] Performance improvement
- [ ] Dependency update

## Changes Made

<!-- List the key changes in this PR -->

-
-
-
```

## Important Notes

- Fill in the Description section with a clear summary of what the PR accomplishes
- Check the appropriate Type of Change checkbox(es) based on the changes
- List specific changes in the Changes Made section (be comprehensive)
- Use `gh pr create` with a HEREDOC for proper formatting
- Return the PR URL when complete
