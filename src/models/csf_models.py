"""
NIST Cybersecurity Framework 2.0 Data Models

This module provides type-safe data models for the NIST CSF 2.0 framework,
including functions, categories, subcategories, and implementation examples.
"""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field, field_validator, model_validator, ConfigDict
import re


# ============================================================================
# ENUMS
# ============================================================================

class CSFFunction(str, Enum):
    """Core NIST CSF 2.0 Functions"""
    GOVERN = "GV"
    IDENTIFY = "ID"
    PROTECT = "PR"
    DETECT = "DE"
    RESPOND = "RS"
    RECOVER = "RC"
    
    @classmethod
    def from_string(cls, value: str) -> 'CSFFunction':
        """Convert string to CSFFunction enum"""
        value_upper = value.upper()
        for func in cls:
            if func.value == value_upper or func.name == value_upper:
                return func
        raise ValueError(f"Invalid CSF Function: {value}")
    
    def get_full_name(self) -> str:
        """Get the full name of the function"""
        names = {
            self.GOVERN: "GOVERN",
            self.IDENTIFY: "IDENTIFY",
            self.PROTECT: "PROTECT",
            self.DETECT: "DETECT",
            self.RESPOND: "RESPOND",
            self.RECOVER: "RECOVER"
        }
        return names[self]


class ElementType(str, Enum):
    """Types of elements in the CSF framework"""
    FUNCTION = "function"
    CATEGORY = "category"
    SUBCATEGORY = "subcategory"
    IMPLEMENTATION_EXAMPLE = "implementation_example"
    PARTY = "party"
    WITHDRAW_REASON = "withdraw_reason"


class PartyType(str, Enum):
    """Risk party types"""
    FIRST_PARTY = "first"
    THIRD_PARTY = "third"
    
    def get_display_name(self) -> str:
        """Get human-readable party type name"""
        return "1st Party Risk" if self == self.FIRST_PARTY else "3rd Party Risk"


class RelationshipType(str, Enum):
    """Types of relationships between elements"""
    PROJECTION = "projection"
    RELATED_TO = "related_to"
    SUPERSEDES = "supersedes"
    INCORPORATED_INTO = "incorporated_into"


class ImplementationTier(str, Enum):
    """NIST CSF Implementation Tiers"""
    TIER_1_PARTIAL = "Tier 1 - Partial"
    TIER_2_RISK_INFORMED = "Tier 2 - Risk Informed"
    TIER_3_REPEATABLE = "Tier 3 - Repeatable"
    TIER_4_ADAPTIVE = "Tier 4 - Adaptive"


# ============================================================================
# BASE MODELS
# ============================================================================

class CSFDocument(BaseModel):
    """Represents the CSF framework document"""
    doc_identifier: str = Field(..., description="Document identifier")
    name: str = Field(..., description="Document name")
    version: str = Field(..., description="Document version")
    website: str = Field(..., description="Document website URL")
    
    @field_validator('website')
    @classmethod
    def validate_website(cls, v):
        """Validate website URL format"""
        if not v.startswith(('http://', 'https://')):
            raise ValueError('Website must be a valid URL')
        return v


class BaseCSFElement(BaseModel):
    """Base class for all CSF elements"""
    model_config = ConfigDict(use_enum_values=True)
    
    doc_identifier: str = Field(..., description="Document identifier")
    element_identifier: str = Field(..., description="Unique element identifier")
    element_type: ElementType = Field(..., description="Type of element")
    text: str = Field(default="", description="Element description text")
    title: str = Field(default="", description="Element title")
    
    @model_validator(mode='after')
    def validate_identifier_format(self):
        """Validate element identifier format based on element type"""
        v = self.element_identifier
        element_type = self.element_type
        
        if not v:
            raise ValueError("Element identifier cannot be empty")
        
        if element_type == ElementType.FUNCTION:
            # Functions should be 2 uppercase letters
            if not re.match(r'^[A-Z]{2}$', v):
                raise ValueError(f"Function identifier must be 2 uppercase letters: {v}")
        elif element_type == ElementType.CATEGORY:
            # Categories should be function.category (e.g., GV.OC)
            if not re.match(r'^[A-Z]{2}\.[A-Z]{2}$', v):
                raise ValueError(f"Category identifier must follow XX.YY format: {v}")
        elif element_type == ElementType.SUBCATEGORY:
            # Subcategories should be function.category-number (e.g., GV.OC-01)
            if not re.match(r'^[A-Z]{2}\.[A-Z]{2}-\d{2}$', v):
                raise ValueError(f"Subcategory identifier must follow XX.YY-NN format: {v}")
        elif element_type == ElementType.IMPLEMENTATION_EXAMPLE:
            # Implementation examples have various formats
            if not (re.match(r'^[A-Z]{2}\.[A-Z]{2}-\d{2}\.\d{3}$', v) or 
                    v in ['first', 'third']):
                pass  # Implementation examples have flexible formats
        
        return self
    
    def get_function(self) -> Optional[CSFFunction]:
        """Extract the function from the element identifier"""
        if self.element_type == ElementType.FUNCTION:
            return CSFFunction(self.element_identifier)
        elif '.' in self.element_identifier:
            func_code = self.element_identifier.split('.')[0]
            try:
                return CSFFunction(func_code)
            except ValueError:
                return None
        return None


# ============================================================================
# SPECIFIC ELEMENT MODELS
# ============================================================================

class CSFFunctionElement(BaseCSFElement):
    """Represents a CSF Function (GOVERN, IDENTIFY, etc.)"""
    element_type: Literal[ElementType.FUNCTION] = Field(default=ElementType.FUNCTION)
    
    @field_validator('element_identifier')
    @classmethod
    def validate_function_id(cls, v):
        """Ensure function ID is valid"""
        valid_functions = ["GV", "ID", "PR", "DE", "RS", "RC"]
        if v not in valid_functions:
            raise ValueError(f"Invalid function identifier: {v}")
        return v


class CSFCategory(BaseCSFElement):
    """Represents a CSF Category within a Function"""
    element_type: Literal[ElementType.CATEGORY] = Field(default=ElementType.CATEGORY)
    
    def get_parent_function(self) -> str:
        """Get the parent function identifier"""
        return self.element_identifier.split('.')[0]


class CSFSubcategory(BaseCSFElement):
    """Represents a CSF Subcategory within a Category"""
    element_type: Literal[ElementType.SUBCATEGORY] = Field(default=ElementType.SUBCATEGORY)
    
    def get_parent_category(self) -> str:
        """Get the parent category identifier"""
        parts = self.element_identifier.split('-')
        return parts[0] if parts else ""
    
    def get_parent_function(self) -> str:
        """Get the parent function identifier"""
        return self.element_identifier.split('.')[0]


class CSFImplementationExample(BaseCSFElement):
    """Represents an implementation example for a subcategory"""
    element_type: Literal[ElementType.IMPLEMENTATION_EXAMPLE] = Field(default=ElementType.IMPLEMENTATION_EXAMPLE)
    
    def get_parent_subcategory(self) -> Optional[str]:
        """Extract parent subcategory from implementation example ID"""
        # Format: GV.OC-01.001
        if '.' in self.element_identifier and '-' in self.element_identifier:
            parts = self.element_identifier.rsplit('.', 1)
            if len(parts) == 2:
                return parts[0]
        return None


class CSFParty(BaseCSFElement):
    """Represents a party (1st or 3rd party risk)"""
    element_type: Literal[ElementType.PARTY] = Field(default=ElementType.PARTY)
    
    @field_validator('element_identifier')
    @classmethod
    def validate_party_id(cls, v):
        """Validate party identifier"""
        if v not in ['first', 'third']:
            raise ValueError(f"Party identifier must be 'first' or 'third': {v}")
        return v
    
    def get_party_type(self) -> PartyType:
        """Get the party type enum"""
        return PartyType.FIRST_PARTY if self.element_identifier == 'first' else PartyType.THIRD_PARTY


class CSFWithdrawReason(BaseCSFElement):
    """Represents a withdrawal reason for deprecated elements"""
    element_type: Literal[ElementType.WITHDRAW_REASON] = Field(default=ElementType.WITHDRAW_REASON)


# ============================================================================
# RELATIONSHIP MODEL
# ============================================================================

class CSFRelationship(BaseModel):
    """Represents a relationship between CSF elements"""
    source_doc_identifier: str = Field(..., description="Source document identifier")
    source_element_identifier: str = Field(..., description="Source element identifier")
    dest_doc_identifier: str = Field(..., description="Destination document identifier")
    dest_element_identifier: str = Field(..., description="Destination element identifier")
    relationship_identifier: str = Field(..., description="Type of relationship")
    provenance_doc_identifier: str = Field(..., description="Provenance document identifier")
    
    @field_validator('relationship_identifier')
    @classmethod
    def validate_relationship_type(cls, v):
        """Validate relationship type"""
        valid_types = ['projection', 'related_to', 'supersedes', 'incorporated_into']
        if v not in valid_types:
            raise ValueError(f"Invalid relationship type: {v}")
        return v
    
    def get_relationship_type(self) -> RelationshipType:
        """Get the relationship type enum"""
        return RelationshipType(self.relationship_identifier)


# ============================================================================
# AGGREGATE MODELS
# ============================================================================

class CSFFramework(BaseModel):
    """Complete CSF 2.0 Framework data model"""
    model_config = ConfigDict(use_enum_values=True, arbitrary_types_allowed=True)
    
    documents: List[CSFDocument] = Field(default_factory=list)
    elements: List[BaseCSFElement] = Field(default_factory=list)
    relationships: List[CSFRelationship] = Field(default_factory=list)
    
    # Cached lookups for performance (using PrivateAttr in Pydantic v2)
    functions_cache: Optional[Dict[str, BaseCSFElement]] = Field(default=None, exclude=True)
    categories_cache: Optional[Dict[str, BaseCSFElement]] = Field(default=None, exclude=True)
    subcategories_cache: Optional[Dict[str, BaseCSFElement]] = Field(default=None, exclude=True)
    
    def __init__(self, **data):
        super().__init__(**data)
        self._build_caches()
    
    def _build_caches(self):
        """Build lookup caches for faster access"""
        self.functions_cache = {}
        self.categories_cache = {}
        self.subcategories_cache = {}
        
        for element in self.elements:
            if element.element_type == ElementType.FUNCTION:
                self.functions_cache[element.element_identifier] = element
            elif element.element_type == ElementType.CATEGORY:
                self.categories_cache[element.element_identifier] = element
            elif element.element_type == ElementType.SUBCATEGORY:
                self.subcategories_cache[element.element_identifier] = element
    
    def get_function(self, function_id: str) -> Optional[BaseCSFElement]:
        """Get a function by ID"""
        return self.functions_cache.get(function_id)
    
    def get_category(self, category_id: str) -> Optional[BaseCSFElement]:
        """Get a category by ID"""
        return self.categories_cache.get(category_id)
    
    def get_subcategory(self, subcategory_id: str) -> Optional[BaseCSFElement]:
        """Get a subcategory by ID"""
        return self.subcategories_cache.get(subcategory_id)
    
    def get_categories_for_function(self, function_id: str) -> List[BaseCSFElement]:
        """Get all categories for a specific function"""
        return [
            cat for cat_id, cat in self.categories_cache.items()
            if cat_id.startswith(f"{function_id}.")
        ]
    
    def get_subcategories_for_category(self, category_id: str) -> List[BaseCSFElement]:
        """Get all subcategories for a specific category"""
        return [
            subcat for subcat_id, subcat in self.subcategories_cache.items()
            if subcat_id.startswith(f"{category_id}-")
        ]
    
    def get_implementation_examples(self, subcategory_id: str) -> List[BaseCSFElement]:
        """Get implementation examples for a subcategory"""
        return [
            elem for elem in self.elements
            if elem.element_type == ElementType.IMPLEMENTATION_EXAMPLE
            and elem.element_identifier.startswith(f"{subcategory_id}.")
        ]
    
    def get_related_elements(self, element_id: str) -> List[tuple[str, BaseCSFElement]]:
        """Get elements related to a given element ID"""
        related = []
        for rel in self.relationships:
            if rel.source_element_identifier == element_id:
                dest_elem = self.get_element_by_id(rel.dest_element_identifier)
                if dest_elem:
                    related.append((rel.relationship_identifier, dest_elem))
            elif rel.dest_element_identifier == element_id:
                source_elem = self.get_element_by_id(rel.source_element_identifier)
                if source_elem:
                    related.append((f"reverse_{rel.relationship_identifier}", source_elem))
        return related
    
    def get_element_by_id(self, element_id: str) -> Optional[BaseCSFElement]:
        """Get any element by its identifier"""
        for element in self.elements:
            if element.element_identifier == element_id:
                return element
        return None
    
    def validate_framework_integrity(self) -> List[str]:
        """Validate the integrity of the framework data"""
        errors = []
        
        # Check for duplicate element IDs
        element_ids = [e.element_identifier for e in self.elements]
        duplicates = [id for id in element_ids if element_ids.count(id) > 1]
        if duplicates:
            errors.append(f"Duplicate element IDs found: {set(duplicates)}")
        
        # Check relationships reference valid elements
        valid_ids = set(element_ids)
        for rel in self.relationships:
            if rel.source_element_identifier not in valid_ids:
                errors.append(f"Relationship references invalid source: {rel.source_element_identifier}")
            if rel.dest_element_identifier not in valid_ids:
                errors.append(f"Relationship references invalid destination: {rel.dest_element_identifier}")
        
        # Check category-subcategory hierarchy
        for subcat in self.subcategories_cache.values():
            parent_cat = subcat.element_identifier.split('-')[0]
            if parent_cat not in self.categories_cache:
                errors.append(f"Subcategory {subcat.element_identifier} references non-existent category {parent_cat}")
        
        return errors


# ============================================================================
# ORGANIZATIONAL DATA MODELS (Dynamic/User Data)
# ============================================================================

class OrganizationProfile(BaseModel):
    """Organization's CSF implementation profile"""
    org_id: str = Field(..., description="Organization identifier")
    org_name: str = Field(..., description="Organization name")
    industry: str = Field(..., description="Industry sector")
    size: str = Field(..., description="Organization size category")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    # CSF Implementation details
    current_tier: Optional[ImplementationTier] = None
    target_tier: Optional[ImplementationTier] = None
    
    @model_validator(mode='before')
    @classmethod
    def update_timestamp(cls, values):
        """Update the updated_at timestamp"""
        if isinstance(values, dict):
            values['updated_at'] = datetime.now(timezone.utc)
        return values


class SubcategoryImplementation(BaseModel):
    """Organization's implementation status for a specific subcategory"""
    org_id: str = Field(..., description="Organization identifier")
    subcategory_id: str = Field(..., description="CSF Subcategory identifier")
    implementation_status: str = Field(..., description="Implementation status")
    maturity_level: int = Field(ge=0, le=5, description="Maturity level (0-5)")
    notes: Optional[str] = Field(None, description="Implementation notes")
    evidence: Optional[List[str]] = Field(default_factory=list, description="Evidence/documentation links")
    last_assessed: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    assessed_by: Optional[str] = Field(None, description="Assessor identifier")
    
    @field_validator('subcategory_id')
    @classmethod
    def validate_subcategory_format(cls, v):
        """Validate subcategory ID format"""
        if not re.match(r'^[A-Z]{2}\.[A-Z]{2}-\d{2}$', v):
            raise ValueError(f"Invalid subcategory ID format: {v}")
        return v
    
    @field_validator('implementation_status')
    @classmethod
    def validate_status(cls, v):
        """Validate implementation status"""
        valid_statuses = ['Not Implemented', 'Partially Implemented', 'Largely Implemented', 'Fully Implemented']
        if v not in valid_statuses:
            raise ValueError(f"Invalid implementation status: {v}")
        return v


class RiskAssessment(BaseModel):
    """Risk assessment for a specific CSF element"""
    org_id: str = Field(..., description="Organization identifier")
    element_id: str = Field(..., description="CSF element identifier")
    risk_level: str = Field(..., description="Risk level")
    likelihood: int = Field(ge=1, le=5, description="Likelihood score (1-5)")
    impact: int = Field(ge=1, le=5, description="Impact score (1-5)")
    risk_score: float = Field(..., description="Calculated risk score")
    mitigation_status: str = Field(..., description="Mitigation status")
    mitigation_plan: Optional[str] = Field(None, description="Mitigation plan description")
    assessment_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    next_review_date: Optional[datetime] = None
    
    @field_validator('risk_level')
    @classmethod
    def validate_risk_level(cls, v):
        """Validate risk level"""
        valid_levels = ['Low', 'Medium', 'High', 'Critical']
        if v not in valid_levels:
            raise ValueError(f"Invalid risk level: {v}")
        return v
    
    @model_validator(mode='after')
    def calculate_risk_score(self):
        """Calculate risk score from likelihood and impact"""
        self.risk_score = self.likelihood * self.impact / 5.0  # Normalize to 0-5 scale
        return self


class GapAnalysis(BaseModel):
    """Gap analysis between current and target states"""
    org_id: str = Field(..., description="Organization identifier")
    category_id: str = Field(..., description="CSF Category identifier")
    current_score: float = Field(ge=0, le=5, description="Current maturity score")
    target_score: float = Field(ge=0, le=5, description="Target maturity score")
    gap_score: float = Field(..., description="Gap between current and target")
    priority: str = Field(..., description="Priority level for addressing gap")
    estimated_effort: Optional[str] = Field(None, description="Estimated effort to close gap")
    target_date: Optional[datetime] = None
    analysis_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    @model_validator(mode='after')
    def calculate_gap(self):
        """Calculate gap score"""
        self.gap_score = self.target_score - self.current_score
        return self
    
    @field_validator('priority')
    @classmethod
    def validate_priority(cls, v):
        """Validate priority level"""
        valid_priorities = ['Low', 'Medium', 'High', 'Critical']
        if v not in valid_priorities:
            raise ValueError(f"Invalid priority level: {v}")
        return v


# ============================================================================
# FACTORY FUNCTIONS
# ============================================================================

def create_element_from_dict(data: Dict[str, Any]) -> BaseCSFElement:
    """Factory function to create appropriate element type from dictionary"""
    element_type = data.get('element_type')
    
    if element_type == 'function':
        return CSFFunctionElement(**data)
    elif element_type == 'category':
        return CSFCategory(**data)
    elif element_type == 'subcategory':
        return CSFSubcategory(**data)
    elif element_type == 'implementation_example':
        return CSFImplementationExample(**data)
    elif element_type == 'party':
        return CSFParty(**data)
    elif element_type == 'withdraw_reason':
        return CSFWithdrawReason(**data)
    else:
        return BaseCSFElement(**data)


def load_framework_from_json(json_path: str) -> CSFFramework:
    """Load CSF framework from JSON file"""
    import json
    
    with open(json_path, 'r') as f:
        data = json.load(f)
    
    framework_data = data['response']['elements']
    
    # Create framework object
    framework = CSFFramework(
        documents=[CSFDocument(**doc) for doc in framework_data.get('documents', [])],
        elements=[create_element_from_dict(elem) for elem in framework_data.get('elements', [])],
        relationships=[CSFRelationship(**rel) for rel in framework_data.get('relationships', [])]
    )
    
    # Validate integrity
    errors = framework.validate_framework_integrity()
    if errors:
        print(f"Warning: Framework integrity issues found: {errors}")
    
    return framework