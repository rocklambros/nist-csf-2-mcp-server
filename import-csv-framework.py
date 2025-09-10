#!/usr/bin/env python3
"""
Import definitive NIST CSF 2.0 framework from CSV file
Uses the official nist_csf_function_category_subcategory_only.csv
"""

import csv
import sqlite3
import re
from datetime import datetime

def clear_database(db_path):
    """Clear existing framework data"""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Clear in dependency order
    cursor.execute('DELETE FROM subcategories')
    cursor.execute('DELETE FROM categories') 
    cursor.execute('DELETE FROM functions')
    
    conn.commit()
    conn.close()
    print("✅ Database cleared")

def import_csv_framework(csv_path, db_path):
    """Import framework from CSV file"""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    functions = {}
    categories = {}
    subcategories = {}
    
    with open(csv_path, 'r', encoding='utf-8-sig') as f:
        reader = csv.reader(f)
        next(reader)  # skip header
        
        for row in reader:
            if len(row) >= 3:
                function_text = row[0].strip().strip('"')
                category_text = row[1].strip().strip('"')
                subcategory_text = row[2].strip().strip('"')
                
                # Extract function ID (e.g., "GV" from "GOVERN (GV):")
                func_match = re.search(r'\(([A-Z]{2})\)', function_text)
                if func_match:
                    function_id = func_match.group(1)
                    function_name = function_text.split('(')[0].strip()
                    functions[function_id] = {
                        'id': function_id,
                        'name': function_name,
                        'description': function_text
                    }
                
                # Extract category ID (e.g., "GV.OC" from "Organizational Context (GV.OC):")
                cat_match = re.search(r'\(([A-Z]{2}\.[A-Z]{2})\)', category_text)
                if cat_match:
                    category_id = cat_match.group(1)
                    category_name = category_text.split('(')[0].strip()
                    categories[category_id] = {
                        'id': category_id,
                        'function_id': category_id[:2],
                        'name': category_name,
                        'description': category_text
                    }
                
                # Extract subcategory ID (e.g., "GV.OC-01" from "GV.OC-01: The organizational mission...")
                subcat_match = re.search(r'^([A-Z]{2}\.[A-Z]{2}-\d{2})', subcategory_text)
                if subcat_match:
                    subcategory_id = subcat_match.group(1)
                    subcategory_desc = subcategory_text.split(':', 1)[1].strip() if ':' in subcategory_text else subcategory_text
                    subcategories[subcategory_id] = {
                        'id': subcategory_id,
                        'category_id': subcategory_id[:5],  # GV.OC from GV.OC-01
                        'description': subcategory_desc
                    }
    
    print(f"📊 Parsed: {len(functions)} functions, {len(categories)} categories, {len(subcategories)} subcategories")
    
    # Insert functions
    for func in functions.values():
        cursor.execute('''
            INSERT INTO functions (id, name, description, created_at) 
            VALUES (?, ?, ?, ?)
        ''', (func['id'], func['name'], func['description'], datetime.now().isoformat()))
    
    # Insert categories
    for cat in categories.values():
        cursor.execute('''
            INSERT INTO categories (id, function_id, name, description, created_at) 
            VALUES (?, ?, ?, ?, ?)
        ''', (cat['id'], cat['function_id'], cat['name'], cat['description'], datetime.now().isoformat()))
    
    # Insert subcategories
    for subcat in subcategories.values():
        cursor.execute('''
            INSERT INTO subcategories (id, category_id, name, description, created_at) 
            VALUES (?, ?, ?, ?, ?)
        ''', (subcat['id'], subcat['category_id'], '', subcat['description'], datetime.now().isoformat()))
    
    conn.commit()
    conn.close()
    
    print(f"✅ Imported {len(functions)} functions, {len(categories)} categories, {len(subcategories)} subcategories")
    return len(subcategories)

if __name__ == "__main__":
    csv_file = "nist_csf_function_category_subcategory_only.csv"
    db_file = "nist_csf.db"
    
    print("🧹 Clearing database...")
    clear_database(db_file)
    
    print("📊 Importing CSV framework...")
    count = import_csv_framework(csv_file, db_file)
    
    print(f"🎉 Import complete! {count} subcategories loaded")