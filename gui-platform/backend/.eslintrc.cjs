module.exports = {
  parser: '@typescript-eslint/parser',
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
  ],
  plugins: ['@typescript-eslint'],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  rules: {
    // Mandatory quality rules
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/prefer-const': 'error',
    'no-var': 'error',
    'prefer-const': 'error',
    'no-console': 'warn',
    
    // Code quality enforcement
    'complexity': ['error', 10],
    'max-lines-per-function': ['error', 50],
    'max-lines': ['error', 500],
    'no-duplicate-imports': 'error',
    'no-unused-expressions': 'error',
    
    // TypeScript specific
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/no-non-null-assertion': 'error',
    '@typescript-eslint/prefer-nullish-coalescing': 'error',
    '@typescript-eslint/prefer-optional-chain': 'error',
  },
  env: {
    node: true,
    jest: true,
    es2022: true
  }
};