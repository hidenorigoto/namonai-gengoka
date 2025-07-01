# Development Guidelines

## Core Principles

- Regularly read and understand CLAUDE.md to ensure all development follows these guidelines.
- Follow Issue/Pull Request driven development - always create and work on feature branches, never directly on main.
- Never commit or push code with any check errors - resolve all linting, type checking, and test failures first.

## Workflow

1. **Before starting work**: Read CLAUDE.md to understand current guidelines
2. **Branch creation**: Create feature branches from main for all work
3. **Environment setup**: Use appropriate local development tools and dependencies
4. **Quality checks**: Run all checks (lint, typecheck, tests) before committing
5. **Clean commits**: Only commit when all checks pass successfully. Use pre-commit hooks to automatically run quality checks before each commit to prevent committing code with errors.