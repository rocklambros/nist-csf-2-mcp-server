"""
Tests for NIST CSF 2.0 Data Models
"""

import json
import pytest
from pathlib import Path
from datetime import datetime
from typing import Dict, Any

# Add src to path for imports
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.models.csf_models import (
    CSFDocument,
    CSFFunctionElement, 
    CSFCategory,
    CSFSubcategory,
    CSFImplementationExample,
    CSFParty,
    CSFRelationship,
    CSFFramework,
    ElementType,
    PartyType,
    RelationshipType,
    ImplementationTier,
    OrganizationProfile,
    SubcategoryImplementation,
    RiskAssessment,
    GapAnalysis,
    create_element_from_dict,
    load_framework_from_json,
    CSFFunction
)


class TestCSFModels:
    """Test CSF data models"""
    
    @pytest.fixture
    def sample_function_data(self) -> Dict[str, Any]:
        """Sample function data"""
        return {
            "doc_identifier": "CSF_2_0_0",
            "element_identifier": "GV",
            "element_type": "function",
            "text": "The organization's cybersecurity risk management strategy",
            "title": "GOVERN"
        }
    
    @pytest.fixture
    def sample_category_data(self) -> Dict[str, Any]:
        """Sample category data"""
        return {
            "doc_identifier": "CSF_2_0_0",
            "element_identifier": "GV.OC",
            "element_type": "category",
            "text": "Organizational Context",
            "title": "Organizational Context"
        }
    
    @pytest.fixture
    def sample_subcategory_data(self) -> Dict[str, Any]:
        """Sample subcategory data"""
        return {
            "doc_identifier": "CSF_2_0_0",
            "element_identifier": "GV.OC-01",
            "element_type": "subcategory",
            "text": "The organizational mission is understood",
            "title": ""
        }
    
    def test_csf_document(self):
        """Test CSF document model"""
        doc = CSFDocument(
            doc_identifier="CSF_2_0_0",
            name="Cybersecurity Framework",
            version="2.0",
            website="https://www.nist.gov/cyberframework"
        )
        assert doc.doc_identifier == "CSF_2_0_0"
        assert doc.version == "2.0"
    
    def test_csf_function(self, sample_function_data):
        """Test CSF function model"""
        func = CSFFunctionElement(**sample_function_data)
        assert func.element_identifier == "GV"
        assert func.element_type == ElementType.FUNCTION
        assert func.title == "GOVERN"
    
    def test_csf_category(self, sample_category_data):
        """Test CSF category model"""
        cat = CSFCategory(**sample_category_data)
        assert cat.element_identifier == "GV.OC"
        assert cat.get_parent_function() == "GV"
    
    def test_csf_subcategory(self, sample_subcategory_data):
        """Test CSF subcategory model"""
        subcat = CSFSubcategory(**sample_subcategory_data)
        assert subcat.element_identifier == "GV.OC-01"
        assert subcat.get_parent_category() == "GV.OC"
        assert subcat.get_parent_function() == "GV"
    
    def test_element_validation(self):
        """Test element identifier validation"""
        # Invalid function ID
        with pytest.raises(ValueError):
            CSFFunctionElement(
                doc_identifier="CSF_2_0_0",
                element_identifier="INVALID",
                element_type="function",
                text="Test",
                title="Test"
            )
        
        # Invalid category ID format
        with pytest.raises(ValueError):
            CSFCategory(
                doc_identifier="CSF_2_0_0",
                element_identifier="INVALID.FORMAT",
                element_type="category",
                text="Test",
                title="Test"
            )
        
        # Invalid subcategory ID format
        with pytest.raises(ValueError):
            CSFSubcategory(
                doc_identifier="CSF_2_0_0",
                element_identifier="GV.OC.INVALID",
                element_type="subcategory",
                text="Test",
                title="Test"
            )
    
    def test_csf_party(self):
        """Test CSF party model"""
        party = CSFParty(
            doc_identifier="CSF_2_0_0",
            element_identifier="first",
            element_type="party",
            text="1st Party Risk",
            title="1st"
        )
        assert party.get_party_type() == PartyType.FIRST_PARTY
        
        # Test invalid party
        with pytest.raises(ValueError):
            CSFParty(
                doc_identifier="CSF_2_0_0",
                element_identifier="invalid",
                element_type="party",
                text="Invalid Party",
                title="Invalid"
            )
    
    def test_csf_relationship(self):
        """Test CSF relationship model"""
        rel = CSFRelationship(
            source_doc_identifier="CSF_2_0_0",
            source_element_identifier="GV",
            dest_doc_identifier="CSF_2_0_0",
            dest_element_identifier="GV.OC",
            relationship_identifier="projection",
            provenance_doc_identifier="CSF_2_0_0"
        )
        assert rel.get_relationship_type() == RelationshipType.PROJECTION
    
    def test_organization_profile(self):
        """Test organization profile model"""
        org = OrganizationProfile(
            org_id="ORG-001",
            org_name="Test Organization",
            industry="Technology",
            size="Large",
            current_tier=ImplementationTier.TIER_2_RISK_INFORMED,
            target_tier=ImplementationTier.TIER_3_REPEATABLE
        )
        assert org.org_id == "ORG-001"
        assert org.current_tier == ImplementationTier.TIER_2_RISK_INFORMED
    
    def test_subcategory_implementation(self):
        """Test subcategory implementation model"""
        impl = SubcategoryImplementation(
            org_id="ORG-001",
            subcategory_id="GV.OC-01",
            implementation_status="Partially Implemented",
            maturity_level=3,
            notes="In progress"
        )
        assert impl.maturity_level == 3
        
        # Test invalid subcategory format
        with pytest.raises(ValueError):
            SubcategoryImplementation(
                org_id="ORG-001",
                subcategory_id="INVALID",
                implementation_status="Partially Implemented",
                maturity_level=3
            )
        
        # Test invalid status
        with pytest.raises(ValueError):
            SubcategoryImplementation(
                org_id="ORG-001",
                subcategory_id="GV.OC-01",
                implementation_status="Invalid Status",
                maturity_level=3
            )
    
    def test_risk_assessment(self):
        """Test risk assessment model"""
        risk = RiskAssessment(
            org_id="ORG-001",
            element_id="GV.OC-01",
            risk_level="High",
            likelihood=4,
            impact=5,
            risk_score=4.0,
            mitigation_status="In Progress"
        )
        assert risk.likelihood == 4
        assert risk.impact == 5
        
        # Test invalid risk level
        with pytest.raises(ValueError):
            RiskAssessment(
                org_id="ORG-001",
                element_id="GV.OC-01",
                risk_level="Invalid",
                likelihood=4,
                impact=5,
                risk_score=4.0,
                mitigation_status="In Progress"
            )
    
    def test_gap_analysis(self):
        """Test gap analysis model"""
        gap = GapAnalysis(
            org_id="ORG-001",
            category_id="GV.OC",
            current_score=2.5,
            target_score=4.0,
            gap_score=1.5,
            priority="High"
        )
        assert gap.current_score == 2.5
        assert gap.gap_score == 1.5
        
        # Test invalid priority
        with pytest.raises(ValueError):
            GapAnalysis(
                org_id="ORG-001",
                category_id="GV.OC",
                current_score=2.5,
                target_score=4.0,
                gap_score=1.5,
                priority="Invalid"
            )
    
    def test_create_element_from_dict(self, sample_function_data, sample_category_data):
        """Test factory function for creating elements"""
        func = create_element_from_dict(sample_function_data)
        assert isinstance(func, CSFFunctionElement)
        
        cat = create_element_from_dict(sample_category_data)
        assert isinstance(cat, CSFCategory)


class TestCSFFrameworkLoading:
    """Test loading and working with the complete framework"""
    
    def test_load_framework_from_json(self):
        """Test loading framework from JSON file"""
        json_path = Path(__file__).parent.parent / "csf-2.0-framework.json"
        
        if not json_path.exists():
            pytest.skip("CSF framework JSON file not found")
        
        framework = load_framework_from_json(str(json_path))
        
        # Verify framework loaded correctly
        assert len(framework.documents) > 0
        assert len(framework.elements) > 0
        assert len(framework.relationships) > 0
        
        # Test functions are loaded
        govern = framework.get_function("GV")
        assert govern is not None
        assert govern.title == "GOVERN"
        
        # Test categories are loaded
        categories = framework.get_categories_for_function("GV")
        assert len(categories) > 0
        
        # Test subcategories
        org_context = framework.get_category("GV.OC")
        if org_context:
            subcategories = framework.get_subcategories_for_category("GV.OC")
            assert len(subcategories) > 0
        
        # Test relationships
        related = framework.get_related_elements("GV")
        assert len(related) > 0
        
        # Validate framework integrity
        errors = framework.validate_framework_integrity()
        # Duplicates are expected in the NIST data (elements repeated for 1st/3rd party)
        assert len(errors) == 0 or all('duplicate' in str(e).lower() for e in errors)


class TestValidationMethods:
    """Test validation methods in models"""
    
    def test_framework_integrity_validation(self):
        """Test framework integrity validation"""
        # Create a framework with issues
        framework = CSFFramework(
            documents=[],
            elements=[
                CSFFunctionElement(
                    doc_identifier="CSF_2_0_0",
                    element_identifier="GV",
                    element_type="function",
                    text="Test",
                    title="GOVERN"
                ),
                CSFSubcategory(
                    doc_identifier="CSF_2_0_0",
                    element_identifier="XX.YY-01",  # References non-existent category
                    element_type="subcategory",
                    text="Test",
                    title="Test"
                )
            ],
            relationships=[
                CSFRelationship(
                    source_doc_identifier="CSF_2_0_0",
                    source_element_identifier="INVALID",  # Invalid reference
                    dest_doc_identifier="CSF_2_0_0",
                    dest_element_identifier="GV",
                    relationship_identifier="projection",
                    provenance_doc_identifier="CSF_2_0_0"
                )
            ]
        )
        
        errors = framework.validate_framework_integrity()
        assert len(errors) > 0
        assert any("invalid source" in error.lower() for error in errors)
        assert any("non-existent category" in error.lower() for error in errors)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])