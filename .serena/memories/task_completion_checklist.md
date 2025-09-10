# Task Completion Checklist

## Before Making Changes
- [ ] Run `npm test` to ensure current state is working
- [ ] Create feature branch from main
- [ ] Understand existing patterns and conventions

## During Development
- [ ] Follow TypeScript strict patterns and type safety
- [ ] Use Zod validation for all input parameters
- [ ] Implement proper error handling with structured logging
- [ ] Use parameterized database queries (never string interpolation)
- [ ] Write unit tests for new functionality
- [ ] Update integration tests if needed

## After Implementation
- [ ] Run `npm run lint` and fix all linting errors
- [ ] Run `npm run typecheck` and resolve type errors
- [ ] Run `npm test` and ensure all tests pass
- [ ] Run `npm run test:e2e` for workflow validation
- [ ] Test GUI functionality if changes affect web interface
- [ ] Update documentation if API changes made

## Security Checklist
- [ ] All inputs validated with Zod schemas
- [ ] Database queries use parameterized statements
- [ ] Error messages don't expose sensitive information
- [ ] Authentication requirements properly implemented
- [ ] Rate limiting considerations addressed

## Quality Gates
- [ ] Code coverage maintained above 95%
- [ ] No TypeScript errors or warnings
- [ ] ESLint rules pass without warnings
- [ ] E2E tests demonstrate working workflows
- [ ] Docker build completes successfully

## Documentation Updates
- [ ] Update CLAUDE.md if significant changes made
- [ ] Update README.md for new features
- [ ] Update PROMPTS.md for new MCP tools
- [ ] Add JSDoc comments for public APIs

## Before Committing
- [ ] Review all changes with `git diff`
- [ ] Commit message follows conventional commit format
- [ ] No debugging code or console.log statements
- [ ] No secrets or sensitive data in code
- [ ] Branch builds and tests pass in CI