# Contributing to NIST CSF 2.0 MCP Server

We welcome contributions to the NIST CSF 2.0 MCP Server! This guide will help you get started with contributing to this comprehensive cybersecurity assessment platform.

## 🚀 Quick Start for Contributors

### Prerequisites
- **Node.js 18.x+** and **npm**
- **TypeScript 5.x** knowledge
- **Git** for version control
- Basic understanding of cybersecurity frameworks and MCP protocol

### Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/YOUR-USERNAME/nist-csf-2-mcp-server.git
   cd nist-csf-2-mcp-server
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Build Project**
   ```bash
   npm run build
   ```

4. **Initialize Database**
   ```bash
   npm run db:init
   npm run seed:questions  # Optional: Add 424 assessment questions
   ```

5. **Verify Setup**
   ```bash
   npm test              # Run test suite
   npm run test:e2e      # End-to-end tests
   npm run lint          # Code linting
   npm run typecheck     # TypeScript validation
   ```

## 📋 Contribution Guidelines

### Code of Conduct
- Be respectful and inclusive
- Focus on constructive feedback
- Help maintain a welcoming environment for all contributors
- Follow cybersecurity best practices and ethical standards

### What We're Looking For
- **🐛 Bug fixes**: Especially security-related issues
- **✨ New MCP tools**: Additional NIST CSF 2.0 functionality
- **📊 Enhanced reporting**: New report formats and visualizations
- **🔒 Security improvements**: Authentication, validation, monitoring
- **🧪 Better testing**: Improved test coverage and validation
- **📖 Documentation**: API docs, guides, examples
- **🚀 Performance optimizations**: Database queries, caching, algorithms

### What We're NOT Looking For
- Breaking changes without discussion
- Code that compromises security
- Features outside NIST CSF 2.0 scope
- Contributions without tests
- Changes that reduce type safety

## 🏗️ Development Workflow

### 1. Create Feature Branch
```bash
git checkout -b feature/your-feature-name
git checkout -b bugfix/issue-description
git checkout -b security/vulnerability-fix
```

### 2. Development Standards

#### Code Quality Requirements
- **TypeScript Strict Mode**: All code must pass strict type checking
- **Test Coverage**: Maintain 95%+ test coverage for new code
- **ESLint Compliance**: Fix all linting errors
- **Security First**: Follow security patterns outlined in CLAUDE.md
- **Documentation**: Document all public APIs and complex logic

#### Commit Message Format
Follow conventional commits:
```
type(scope): description

feat(tools): add generate_compliance_report tool
fix(database): resolve connection pooling issue
security(auth): prevent JWT token replay attacks
docs(readme): update installation instructions
test(integration): add gap analysis workflow tests
```

### 3. Before Submitting

#### Required Checks
```bash
# Type checking
npm run typecheck

# Linting
npm run lint

# Code formatting
npm run format

# Full test suite
npm test

# End-to-end tests
npm run test:e2e

# Security tests
npm run test:security

# Build verification
npm run build
```

#### Pre-submission Checklist
- [ ] All tests pass
- [ ] No TypeScript errors
- [ ] No ESLint errors
- [ ] Test coverage ≥95%
- [ ] Documentation updated
- [ ] Security review completed
- [ ] Performance impact assessed

## 🛠️ Technical Contribution Areas

### 1. MCP Tool Development

#### Creating New Tools
Follow the tool implementation pattern from CLAUDE.md:

```typescript
import { z } from 'zod';
import { Tool } from '../types';
import Database from '../db/database';
import { logger } from '../utils/enhanced-logger';

// Input validation schema
const NewToolSchema = z.object({
  profile_id: z.string().min(1),
  // ... other parameters
});

type NewToolParams = z.infer<typeof NewToolSchema>;

export async function newTool(params: unknown): Promise<any> {
  try {
    const validatedParams = NewToolSchema.parse(params);
    // Implementation here
    return { success: true, data: result };
  } catch (error) {
    logger.error('Tool execution error', { tool: 'newTool', error });
    return { success: false, error: 'Tool execution failed' };
  }
}

export const newToolDefinition: Tool = {
  name: 'new_tool',
  description: 'Clear description of tool functionality',
  inputSchema: {
    type: 'object',
    properties: {
      profile_id: { type: 'string', description: 'Profile identifier' }
    },
    required: ['profile_id']
  }
};
```

#### Tool Development Checklist
- [ ] Zod schema validation for all inputs
- [ ] Comprehensive error handling
- [ ] Database operations use prepared statements
- [ ] Proper logging with context
- [ ] Unit tests with edge cases
- [ ] Integration tests with database
- [ ] Security tests for input validation
- [ ] Documentation with examples
- [ ] Update README.md and PROMPTS.md

### 2. Database Schema Changes

#### Schema Modification Process
1. **Update schema in `src/db/database.ts`**
2. **Create migration script if needed**
3. **Update TypeScript interfaces**
4. **Add comprehensive tests**
5. **Verify with `npm run db:verify`**

#### Database Contribution Guidelines
- Use parameterized queries only
- Add appropriate indexes for performance
- Include foreign key constraints
- Follow existing naming conventions
- Test with large datasets

### 3. Security Contributions

#### Security Enhancement Areas
- **Authentication mechanisms**: OAuth 2.1, JWT validation
- **Input validation**: Zod schemas, sanitization
- **Rate limiting**: DDoS protection, resource management
- **Audit logging**: Security event tracking
- **Encryption**: Data at rest, key management

#### Security Review Process
- All security changes require security review
- Run comprehensive security test suite
- Document security implications
- Follow OWASP security guidelines
- Test with penetration testing tools

### 4. Performance Optimizations

#### Performance Contribution Areas
- Database query optimization
- Caching strategies
- Memory usage optimization
- Response time improvements
- Concurrent request handling

#### Performance Testing
```bash
npm run test:performance  # Benchmark existing performance
# Make changes
npm run test:performance  # Verify improvements
```

## 🧪 Testing Guidelines

### Test Types and Coverage

#### 1. Unit Tests (`tests/tools/`)
- Test individual tool functionality
- Mock database interactions
- Test error conditions and edge cases
- Validate input/output formats

```typescript
describe('NewTool', () => {
  it('should validate input parameters', () => {
    expect(() => newTool({})).toThrow();
    expect(() => newTool({ profile_id: '' })).toThrow();
  });

  it('should process valid requests', async () => {
    const result = await newTool({ profile_id: 'PROF-123' });
    expect(result.success).toBe(true);
  });
});
```

#### 2. Integration Tests (`tests/integration/`)
- Test database interactions
- Test service integrations
- Test complete workflows
- Verify data consistency

#### 3. Security Tests (`tests/security/`)
- Input validation testing
- SQL injection prevention
- XSS protection validation
- Authentication bypass attempts

#### 4. Performance Tests (`tests/performance/`)
- Response time benchmarks
- Memory usage monitoring
- Concurrent request testing
- Database query performance

#### 5. End-to-End Tests (`tests/e2e/`)
- Complete workflow validation
- Multi-tool integration testing
- Real-world scenario testing

### Writing Quality Tests

#### Test Structure
```typescript
describe('Feature/Tool Name', () => {
  beforeEach(() => {
    // Test setup
  });

  afterEach(() => {
    // Cleanup
  });

  describe('happy path', () => {
    it('should handle valid input correctly', () => {
      // Test implementation
    });
  });

  describe('error handling', () => {
    it('should handle invalid input gracefully', () => {
      // Test implementation
    });
  });

  describe('edge cases', () => {
    it('should handle boundary conditions', () => {
      // Test implementation
    });
  });
});
```

## 📚 Documentation Standards

### Documentation Requirements

#### 1. Code Documentation
- **JSDoc comments** for all public functions
- **Inline comments** for complex logic
- **Type definitions** with descriptions
- **Error handling** documentation

```typescript
/**
 * Generates comprehensive gap analysis between current and target states
 * @param params - Gap analysis parameters
 * @param params.current_profile_id - Current state profile identifier
 * @param params.target_profile_id - Target state profile identifier
 * @param params.include_priority_matrix - Whether to include priority matrix
 * @returns Gap analysis results with recommendations
 * @throws {ValidationError} When input parameters are invalid
 * @throws {DatabaseError} When database operations fail
 */
export async function generateGapAnalysis(params: GapAnalysisParams): Promise<GapAnalysisResult> {
  // Implementation
}
```

#### 2. API Documentation
- Update README.md with new tools
- Add examples to PROMPTS.md
- Document input/output schemas
- Include usage examples

#### 3. Architecture Documentation
- Update CLAUDE.md for structural changes
- Document design decisions
- Explain security implications
- Update data flow diagrams

## 🔒 Security Guidelines

### Security-First Development

#### Input Validation
```typescript
// Always use Zod schemas
const schema = z.object({
  profile_id: z.string().min(1).max(50),
  options: z.object({
    include_sensitive: z.boolean().default(false)
  }).optional()
});

// Validate all inputs
const validated = schema.parse(params);
```

#### Database Security
```typescript
// Always use parameterized queries
const query = 'SELECT * FROM profiles WHERE id = ? AND user_id = ?';
const result = db.prepare(query).get(profileId, userId);

// NEVER use string interpolation
// const query = `SELECT * FROM profiles WHERE id = '${profileId}'`; // ❌ NO!
```

#### Error Handling
```typescript
// Don't expose internal errors
try {
  // Operation
} catch (error) {
  logger.error('Internal error', { error, context });
  return { success: false, error: 'Operation failed' }; // Generic message
}
```

### Security Review Process
1. **Code review** by security-aware contributor
2. **Security test suite** execution
3. **Penetration testing** for authentication changes
4. **Static analysis** with security-focused tools

## 🚀 Performance Guidelines

### Performance Best Practices

#### Database Optimization
- Use appropriate indexes
- Optimize query patterns
- Implement connection pooling
- Monitor query performance

#### Memory Management
- Clean up resources properly
- Use streaming for large datasets
- Implement caching strategically
- Monitor memory usage patterns

#### Response Time Targets
- **Tool responses**: <100ms average
- **Report generation**: <2s for standard reports
- **Database queries**: <50ms for simple queries
- **Complex analysis**: <5s for gap analysis

### Performance Testing
```bash
# Benchmark before changes
npm run test:performance

# Make optimizations
# ...

# Verify improvements
npm run test:performance

# Compare results and document improvements
```

## 📋 Pull Request Process

### 1. Pre-PR Checklist
- [ ] Feature branch created from main
- [ ] All tests pass locally
- [ ] Code follows style guidelines
- [ ] Documentation updated
- [ ] Security review completed
- [ ] Performance impact assessed

### 2. PR Template
When creating a pull request, include:

```markdown
## Description
Brief description of changes and motivation.

## Type of Change
- [ ] Bug fix (non-breaking change fixing an issue)
- [ ] New feature (non-breaking change adding functionality)
- [ ] Breaking change (fix or feature causing existing functionality to change)
- [ ] Security fix
- [ ] Performance improvement
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Security tests added/updated
- [ ] Performance tests run
- [ ] All tests pass

## Security Review
- [ ] Input validation reviewed
- [ ] Authentication/authorization impact assessed
- [ ] No sensitive information exposed
- [ ] Security tests pass

## Documentation
- [ ] README.md updated
- [ ] PROMPTS.md examples added
- [ ] API documentation updated
- [ ] Code comments added for complex logic

## Performance Impact
- [ ] Performance benchmarks run
- [ ] Memory usage assessed
- [ ] Database query performance evaluated
- [ ] No performance regressions introduced
```

### 3. PR Review Process
1. **Automated checks**: Tests, linting, type checking
2. **Code review**: Logic, style, security considerations
3. **Security review**: For security-related changes
4. **Performance review**: For performance-impacting changes
5. **Documentation review**: Completeness and accuracy
6. **Final approval**: Maintainer approval required

## 🐛 Bug Reports

### Reporting Bugs

#### Security Vulnerabilities
**DO NOT** open public issues for security vulnerabilities. Instead:
1. Email security details to: security@rockcyber.com
2. Include detailed reproduction steps
3. Provide impact assessment
4. Allow time for patching before disclosure

#### Regular Bugs
Use the GitHub issue template:

```markdown
## Bug Description
Clear description of the bug.

## Environment
- Node.js version:
- TypeScript version:
- Operating System:
- Database version:

## Steps to Reproduce
1. Step 1
2. Step 2
3. Step 3

## Expected Behavior
What should happen.

## Actual Behavior
What actually happens.

## Error Messages/Logs
Include relevant error messages or log entries.

## Additional Context
Any other context about the problem.
```

## 💡 Feature Requests

### Requesting New Features

#### Before Requesting
- Check existing issues and PRs
- Review project roadmap
- Ensure alignment with NIST CSF 2.0 scope

#### Feature Request Template
```markdown
## Feature Description
Clear description of the proposed feature.

## Use Case
Why is this feature needed? What problem does it solve?

## Proposed Implementation
High-level implementation approach.

## NIST CSF 2.0 Alignment
How does this align with NIST CSF 2.0 framework?

## Additional Context
Any other context or screenshots about the feature request.
```

## 🏷️ Release Process

### Versioning
We follow [Semantic Versioning](https://semver.org/):
- **MAJOR**: Breaking changes
- **MINOR**: New features, backwards compatible
- **PATCH**: Bug fixes, backwards compatible

### Release Workflow
1. **Feature freeze** for upcoming release
2. **Testing phase** with comprehensive validation
3. **Documentation update** for new features
4. **Security review** for all changes
5. **Performance validation** against benchmarks
6. **Release notes** preparation
7. **Version tagging** and release

## 🎯 Areas of Focus

### High Priority Contributions
1. **Security enhancements**: Authentication, validation, monitoring
2. **Performance optimizations**: Database queries, response times
3. **Test coverage improvements**: Especially integration and security tests
4. **Documentation**: API examples, integration guides
5. **Bug fixes**: Particularly security-related issues

### Medium Priority Contributions
1. **New MCP tools**: Additional NIST CSF 2.0 functionality
2. **Report enhancements**: New formats, visualizations
3. **Database optimizations**: Indexing, query performance
4. **Monitoring improvements**: Metrics, alerting
5. **Developer experience**: Tooling, debugging

### Future Roadmap Items
1. **Advanced analytics**: Machine learning, predictions
2. **Multi-tenant support**: SaaS architecture
3. **External integrations**: GRC platforms, SIEM systems
4. **Mobile API**: REST endpoints for mobile apps
5. **Cloud deployment**: Container orchestration, scaling

## 📞 Getting Help

### Community Support
- **GitHub Discussions**: General questions and discussions
- **GitHub Issues**: Bug reports and feature requests
- **Code Review**: Request feedback on contributions

### Development Help
- **CLAUDE.md**: Technical implementation guidelines
- **README.md**: Project overview and setup
- **Test files**: Examples of testing patterns
- **Existing tools**: Implementation patterns and examples

### Enterprise Support
- **Email**: enterprise@rockcyber.com
- **Security issues**: security@rockcyber.com

## 🙏 Recognition

### Contributors
We recognize contributions through:
- **GitHub contributors list**
- **Release notes acknowledgments**
- **Community highlights**
- **Maintainer nominations** for significant contributors

### Types of Recognition
- **Code contributors**: Feature development, bug fixes
- **Security researchers**: Vulnerability discoveries and fixes  
- **Documentation writers**: Guides, examples, tutorials
- **Testers**: Quality assurance, edge case discovery
- **Community managers**: Support, issue triage, discussions

---

Thank you for contributing to the NIST CSF 2.0 MCP Server! Your contributions help organizations worldwide implement better cybersecurity practices. 🛡️

**Questions?** Open a GitHub discussion or reach out to our community!