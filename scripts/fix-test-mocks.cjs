#!/usr/bin/env node

/**
 * Fix Test Mocks Script
 * Adds missing jest.mock statements to generated unit tests
 */

const fs = require('fs');
const path = require('path');

const TESTS_DIR = path.join(__dirname, '..', 'tests', 'tools');

// Get all unit test files
function getUnitTestFiles() {
  return fs.readdirSync(TESTS_DIR)
    .filter(file => file.endsWith('.unit.test.ts'))
    .map(file => path.join(TESTS_DIR, file));
}

// Check if file already has jest.mock statements
function hasMockStatements(content) {
  return content.includes('jest.mock(');
}

// Add missing mock statements to test file
function fixTestMocks(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Skip if already has mock statements
  if (hasMockStatements(content)) {
    return false;
  }
  
  const lines = content.split('\n');
  let importEndIndex = -1;
  
  // Find where imports end
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('import ') || lines[i].startsWith('const ') && lines[i].includes('import')) {
      importEndIndex = i;
    }
  }
  
  if (importEndIndex === -1) {
    console.log(`⚠️  Could not find imports in ${path.basename(filePath)}`);
    return false;
  }
  
  // Check if this test has the wrong import path and fix it
  let updatedContent = content;
  
  // Fix import paths that are incorrect
  updatedContent = updatedContent.replace(
    /from ['"]\.\.\/\.\.\/db\/database\.js['"]/g, 
    "from '../../src/db/database.js'"
  );
  updatedContent = updatedContent.replace(
    /from ['"]\.\.\/\.\.\/services\/framework-loader\.js['"]/g,
    "from '../../src/services/framework-loader.js'" 
  );
  
  // Also fix any other incorrect paths missing src/
  updatedContent = updatedContent.replace(
    /from ['"]\.\.\/\.\.\/(?!src\/)([^'"]+)\.js['"]/g,
    "from '../../src/$1.js'"
  );
  
  // Find where imports end in updated content
  let updatedImportEndIndex = -1;
  for (let i = 0; i < updatedLines.length; i++) {
    if (updatedLines[i].startsWith('import ') || updatedLines[i].startsWith('const ') && updatedLines[i].includes('import')) {
      updatedImportEndIndex = i;
    }
  }
  
  // Add mock statements after imports
  const mockStatements = [
    '',
    '// Mock the database',
    'jest.mock(\'../../src/db/database.js\');'
  ];
  
  // Check if it needs framework loader mocking (framework tools)
  const isFrameworkTool = updatedContent.includes('framework') || updatedContent.includes('search') || updatedContent.includes('csf') || updatedContent.includes('lookup');
  
  if (isFrameworkTool) {
    mockStatements.push('jest.mock(\'../../src/services/framework-loader.js\');');
    mockStatements.push('jest.mock(\'../../src/utils/logger.js\');');
  }
  
  // Insert mock statements
  updatedLines.splice(updatedImportEndIndex + 1, 0, ...mockStatements);
  
  // Write back to file
  fs.writeFileSync(filePath, updatedLines.join('\n'));
  
  return true;
}

// Main execution
function main() {
  console.log('🔧 Fixing Test Mocking Issues\\n');
  
  const testFiles = getUnitTestFiles();
  let fixedCount = 0;
  
  testFiles.forEach(filePath => {
    const fileName = path.basename(filePath);
    
    try {
      if (fixTestMocks(filePath)) {
        console.log(`  ✅ Fixed: ${fileName}`);
        fixedCount++;
      } else {
        console.log(`  ⏭️  Skipped: ${fileName} (already has mocks)`);
      }
    } catch (error) {
      console.error(`  ❌ Failed to fix ${fileName}:`, error.message);
    }
  });
  
  console.log(`\\n🎯 Fix Complete:`);
  console.log(`• Fixed: ${fixedCount} test files`);
  console.log(`• Skipped: ${testFiles.length - fixedCount} test files`);
  console.log(`• Total: ${testFiles.length} test files`);
}

if (require.main === module) {
  main();
}

module.exports = { fixTestMocks };