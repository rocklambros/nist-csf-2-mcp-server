# Code Style and Conventions

## TypeScript Configuration
- **Target**: ES2022 with modern JavaScript features
- **Modules**: ES2022 module system with node resolution
- **Strict Mode**: Gradually enabled (currently relaxed for compatibility)
- **Source Maps**: Enabled for debugging
- **Declaration Files**: Generated for type definitions

## ESLint Rules
- **Parser**: @typescript-eslint/parser with TypeScript support
- **Base**: eslint:recommended + @typescript-eslint/recommended
- **Key Rules**:
  - `no-explicit-any`: warn (minimize any usage)
  - `no-unused-vars`: error with underscore prefix exception
  - `no-console`: warn (allow warn/error only)
  - `prefer-const`: error (immutability preference)

## Naming Conventions
- **Files**: kebab-case (e.g., `csf-lookup.ts`, `dual-mode-server.ts`)
- **Functions/Variables**: camelCase (e.g., `assessMaturity`, `organizationId`)
- **Types/Interfaces**: PascalCase (e.g., `AssessmentParams`, `OrganizationProfile`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `DEFAULT_PORT`, `AUTH_MODES`)
- **MCP Tools**: snake_case (e.g., `create_profile`, `assess_maturity`)

## File Organization
```
src/
├── index.ts              # Main MCP server entry point
├── types/                # TypeScript type definitions
├── db/                   # Database operations and schema
├── services/             # Business logic services
├── tools/                # MCP tool implementations (38 tools)
├── utils/                # Shared utilities and helpers
├── security/             # Authentication and security
└── middleware/           # Express middleware
```

## Code Patterns
- **Input Validation**: All tools use Zod schemas for type-safe validation
- **Error Handling**: Consistent try-catch with structured logging
- **Database Operations**: Prepared statements with parameter binding
- **Type Safety**: TypeScript interfaces for all data structures
- **Security**: Parameterized queries, input sanitization, error sanitization

## Comments and Documentation
- **JSDoc**: Used for public APIs and complex functions
- **Inline Comments**: Explain business logic and security considerations
- **Type Annotations**: Comprehensive type definitions
- **README Updates**: Keep documentation current with changes

## Testing Patterns
- **File Naming**: `*.test.ts` for unit tests, `*.integration.test.ts` for integration
- **Test Organization**: Mirror source structure in tests/ directory
- **Mocking**: Jest mocks for database and external dependencies
- **Coverage**: Maintain 95%+ test coverage across modules