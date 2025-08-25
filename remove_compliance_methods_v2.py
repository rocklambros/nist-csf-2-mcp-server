#!/usr/bin/env python3
"""
Script to remove specific compliance-related methods from database.ts
"""

import re

# Methods to remove (with their exact signatures)
methods_to_remove = [
    'recordComplianceDrift',
    'getComplianceDrifts', 
    'detectComplianceDrift',
    'upsertComplianceMapping',
    'getComplianceMappings',
    'analyzeComplianceCoverage',
    'upsertFrameworkCrosswalk',
    'getFrameworkCrosswalk',
    'recordComplianceCoverage'
]

def remove_methods_from_file(file_path):
    """Remove specific methods from TypeScript class file"""
    with open(file_path, 'r') as f:
        content = f.read()
    
    for method_name in methods_to_remove:
        # Pattern to match method from start to end, accounting for nested braces
        pattern = rf'(\n\s+{re.escape(method_name)}\([^{{]*\)\s*:\s*[^{{]*{{)'
        
        # Find the method start
        match = re.search(pattern, content)
        if match:
            method_start = match.start(1)
            
            # Find the method end by counting braces
            brace_count = 0
            method_end = -1
            pos = match.end(1) - 1  # Position at the opening brace
            
            for i in range(pos, len(content)):
                if content[i] == '{':
                    brace_count += 1
                elif content[i] == '}':
                    brace_count -= 1
                    if brace_count == 0:
                        method_end = i + 1
                        break
            
            if method_end != -1:
                # Remove the method and any trailing newlines
                before = content[:method_start]
                after = content[method_end:]
                
                # Clean up extra newlines
                while after.startswith('\n'):
                    after = after[1:]
                
                content = before + '\n' + after
                print(f"Removed method: {method_name}")
            else:
                print(f"Could not find end of method: {method_name}")
        else:
            print(f"Method not found: {method_name}")
    
    # Write the updated content back
    with open(file_path, 'w') as f:
        f.write(content)
    
    print("Compliance methods removal completed")

if __name__ == '__main__':
    database_file = '/Users/klambros/PycharmProjects/nist-csf-2-mcp-server/src/db/database.ts'
    remove_methods_from_file(database_file)