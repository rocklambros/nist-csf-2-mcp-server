#!/usr/bin/env python3
"""
Example script demonstrating how to load and work with the NIST CSF 2.0 Framework data
"""

import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.models.csf_models import load_framework_from_json, CSFFunction


def main():
    """Main function to demonstrate framework loading and usage"""
    
    # Load the framework from JSON
    json_path = Path(__file__).parent.parent / "csf-2.0-framework.json"
    
    print("Loading NIST CSF 2.0 Framework...")
    framework = load_framework_from_json(str(json_path))
    
    print(f"\nFramework loaded successfully!")
    print(f"- Documents: {len(framework.documents)}")
    print(f"- Elements: {len(framework.elements)}")
    print(f"- Relationships: {len(framework.relationships)}")
    
    # Display all functions
    print("\n=== NIST CSF 2.0 Functions ===")
    for func_id in ["GV", "ID", "PR", "DE", "RS", "RC"]:
        func = framework.get_function(func_id)
        if func:
            print(f"\n{func.element_identifier}: {func.title}")
            print(f"  Description: {func.text[:100]}..." if len(func.text) > 100 else f"  Description: {func.text}")
            
            # Get categories for this function
            categories = framework.get_categories_for_function(func_id)
            print(f"  Categories: {len(categories)}")
            
            for cat in categories[:3]:  # Show first 3 categories
                print(f"    - {cat.element_identifier}: {cat.title}")
    
    # Example: Get all subcategories for a specific category
    print("\n=== Example: Subcategories for GV.OC (Organizational Context) ===")
    subcategories = framework.get_subcategories_for_category("GV.OC")
    for subcat in subcategories[:5]:  # Show first 5
        print(f"  {subcat.element_identifier}: {subcat.text[:80]}..." if len(subcat.text) > 80 else f"  {subcat.element_identifier}: {subcat.text}")
    
    # Example: Find implementation examples
    print("\n=== Example: Implementation Examples for GV.OC-01 ===")
    examples = framework.get_implementation_examples("GV.OC-01")
    for ex in examples[:3]:  # Show first 3
        print(f"  {ex.element_identifier}: {ex.text[:100]}..." if len(ex.text) > 100 else f"  {ex.element_identifier}: {ex.text}")
    
    # Example: Working with relationships
    print("\n=== Example: Related Elements to GV ===")
    related = framework.get_related_elements("GV")
    for rel_type, elem in related[:5]:  # Show first 5
        print(f"  {rel_type}: {elem.element_identifier} ({elem.element_type})")
    
    # Validate framework integrity
    print("\n=== Framework Integrity Check ===")
    errors = framework.validate_framework_integrity()
    if errors:
        # Note: Duplicates are expected in NIST data (elements repeated for party associations)
        duplicate_errors = [e for e in errors if 'duplicate' in e.lower()]
        other_errors = [e for e in errors if 'duplicate' not in e.lower()]
        
        if duplicate_errors:
            print(f"Note: {len(duplicate_errors)} duplicate element warnings (expected for party associations)")
        
        if other_errors:
            print(f"Errors found: {len(other_errors)}")
            for error in other_errors[:3]:  # Show first 3
                print(f"  - {error}")
    else:
        print("No integrity issues found!")


if __name__ == "__main__":
    main()