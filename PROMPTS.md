# NIST CSF 2.0 MCP Server - LLM Prompt Examples

This comprehensive guide provides **optimized prompts** for using the NIST CSF 2.0 MCP Server with large language models like **Claude**, **ChatGPT**, and **Gemini**. These prompts demonstrate best practices for cybersecurity assessments and leverage all **36 MCP tools** available in the server.

## 🚀 Quick Start Prompts

### Initial Setup and Organization Profile
```
I need to start a cybersecurity assessment for my organization. Please help me:

1. Create an organization profile for "TechCorp Inc" - a medium-sized technology company
2. Perform a quick initial assessment to understand our current security posture
3. Calculate our initial risk score and identify the most critical areas for improvement

Use the NIST CSF 2.0 MCP server tools to guide me through this process step by step.
```

### Comprehensive Assessment Workflow
```
I want to conduct a comprehensive NIST CSF 2.0 assessment for my organization. Please:

1. Create a detailed maturity assessment across all framework functions
2. Generate a gap analysis comparing our current state to industry best practices
3. Create an implementation priority matrix based on risk and business impact
4. Develop a phased implementation plan with timelines and cost estimates
5. Generate an executive summary report for leadership

Walk me through each step and explain the results.
```

## 🔍 Framework Query & Search Tools (3 Tools)

### 1. CSF Lookup Tool (`csf_lookup`)
```
I need to understand the NIST CSF 2.0 subcategory "GV.OC-01" in detail. Please:
- Look up this subcategory with all available examples and references
- Explain how it relates to organizational cybersecurity governance
- Provide practical implementation examples for a healthcare organization
```

### 2. Framework Search Tool (`search_framework`)
```
Help me find all NIST CSF 2.0 elements related to "incident response" across all functions. I want to:
- Search for all subcategories containing incident response concepts
- Focus on functions DE (Detect), RS (Respond), and RC (Recover)
- Get comprehensive results with implementation guidance
```

### 3. Related Subcategories (`get_related_subcategories`)
```
I'm working on implementing access control measures. Please:
- Find all subcategories related to "PR.AC-01" (Identity and access management)
- Show me the dependencies and relationships between these controls
- Identify supporting subcategories that should be implemented together
```

## 🏢 Organization & Profile Management Tools (3 Tools)

### 4. Create Profile (`create_profile`)
```
Create a comprehensive organization profile for our company with these details:
- Organization: "Global Finance Corp"
- Industry: Financial services
- Size: Large (5,000+ employees)
- Assessment type: Current state baseline

Include sector-specific risk considerations and compliance requirements.
```

### 5. Clone Profile (`clone_profile`)
```
I have an existing organization profile (PROF-123). Please:
1. Clone it to create a target state profile representing our desired security posture in 18 months
2. Adjust the maturity levels to reflect industry best practices
3. Include aspirational goals for regulatory compliance
```

### 6. Compare Profiles (`compare_profiles`)
```
Compare our current state profile (PROF-123) with our target state profile (PROF-456):
- Highlight the most significant differences between profiles
- Identify areas where we've exceeded expectations
- Show gaps that require immediate attention
- Provide visual comparison data for executive presentation
```

## 🎯 Assessment & Scoring Tools (8 Tools)

### 7. Quick Assessment (`quick_assessment`)
```
Perform a quick assessment for profile PROF-123 with these simplified responses:
- Govern: We have basic policies but limited governance structure (partial)
- Identify: Asset inventory is incomplete, risk assessments are ad-hoc (partial)  
- Protect: Some access controls and training in place (partial)
- Detect: Basic monitoring but limited threat detection (no)
- Respond: Informal incident response process (partial)
- Recover: No formal disaster recovery plan (no)

Analyze the results and provide immediate recommendations for improvement.
```

### 8. Assess Maturity (`assess_maturity`)
```
Conduct a detailed maturity assessment for organization profile PROF-123. Please:
1. Assess maturity across all 6 NIST CSF functions
2. Include detailed subcategory-level analysis
3. Provide specific recommendations for each function
4. Identify the top 5 priority areas for immediate attention
5. Suggest a maturity improvement roadmap

Focus on practical, actionable recommendations for a medium-sized technology company.
```

### 9. Calculate Risk Score (`calculate_risk_score`)
```
Calculate a comprehensive risk score for profile PROF-123 using these threat weights:
- Govern: 1.5 (high importance for regulatory compliance)
- Identify: 1.4 (critical for asset protection)
- Protect: 1.6 (highest priority for customer data)
- Detect: 1.3 (important for early threat detection)
- Respond: 1.2 (moderate priority)
- Recover: 1.1 (lower priority given other controls)

Include a risk heat map and prioritized remediation recommendations.
```

### 10. Calculate Maturity Trend (`calculate_maturity_trend`)
```
Analyze the maturity progression for profile PROF-123 over the past 12 months:
- Show trend lines for each CSF function
- Identify areas of improvement and stagnation
- Predict future maturity trajectory based on current trends
- Highlight success stories and improvement opportunities
```

### 11. Get Assessment Questions (`get_assessment_questions`)
```
Retrieve comprehensive assessment questions for conducting a detailed evaluation:
- Focus on the "Protect" (PR) function
- Include all 4 dimensions: Risk, Maturity, Implementation, Effectiveness
- Provide context and guidance for each question
- Organize questions by subcategory for systematic assessment
```

### 12. Validate Assessment Responses (`validate_assessment_responses`)
```
Validate these assessment responses for profile PROF-123:
- GV.OC-01: Response level 4 with evidence documents attached
- ID.AM-01: Response level 2 with partial asset inventory
- PR.AC-01: Response level 5 with full MFA implementation

Check for consistency, completeness, and supporting evidence quality.
```

### 13. Get Question Context (`get_question_context`)
```
Provide detailed context for assessment question Q-123 including:
- Related NIST CSF subcategories and implementation examples
- Industry-specific guidance and best practices
- Common implementation challenges and solutions
- Scoring criteria and maturity level descriptions
```

### 14. Import Assessment (`import_assessment`)
```
Import assessment data from our previous GRC platform evaluation:
- Profile: PROF-123
- Source: "Previous Annual Security Assessment 2024"
- Data format: CSV with subcategory ratings and evidence references
- Validation: Ensure data integrity and completeness after import
```

## 📊 Planning & Analysis Tools (6 Tools)

### 15. Generate Gap Analysis (`generate_gap_analysis`)
```
Generate a comprehensive gap analysis between our current state (PROF-123) and target state (PROF-456). Please:
1. Identify all significant gaps across the 6 CSF functions
2. Prioritize gaps by business impact and implementation difficulty  
3. Include cost estimates for closing each gap
4. Create a visual priority matrix for stakeholder presentation
5. Provide specific implementation guidance for top priority gaps
```

### 16. Generate Priority Matrix (`generate_priority_matrix`)
```
Create an implementation priority matrix for profile PROF-123 based on:
- Business impact (High/Medium/Low)
- Implementation difficulty (Easy/Medium/Hard)
- Regulatory requirements (Critical/Important/Optional)
- Resource availability (Available/Limited/Constrained)

Include visual representation and recommended implementation sequence.
```

### 17. Create Implementation Plan (`create_implementation_plan`)
```
Based on gap analysis GAP-789, create a detailed implementation plan with:
- 18-month timeline divided into 3 phases
- 8 available team members for implementation
- Risk-based prioritization strategy
- Dependencies between implementation activities
- Milestone markers for progress tracking
- Resource allocation recommendations

Focus on practical, achievable timelines and realistic resource requirements.
```

### 18. Estimate Implementation Cost (`estimate_implementation_cost`)
```
Provide detailed cost estimates for implementing these critical subcategories:
- GV.OC-01 (Cybersecurity governance)
- ID.AM-01 (Asset management)
- PR.AC-01 (Access control)
- DE.CM-01 (Security monitoring)
- RS.CO-01 (Incident response communications)

For a medium-sized healthcare organization, include:
- Initial implementation costs
- Ongoing operational expenses
- Risk-adjusted projections with contingency planning
- ROI analysis and business justification
```

### 19. Get Industry Benchmarks (`get_industry_benchmarks`)
```
Provide industry benchmark data for our financial services organization:
- Compare our maturity scores against industry averages
- Identify areas where we're above or below peer organizations
- Include regulatory compliance benchmarks specific to financial services
- Show trends and improvement opportunities based on industry data
```

### 20. Suggest Next Actions (`suggest_next_actions`)
```
Based on our current assessment results for profile PROF-123, suggest the next logical actions:
- Prioritize top 5 immediate improvements
- Identify quick wins that can be implemented within 30 days
- Recommend long-term strategic initiatives
- Include resource requirements and success metrics for each action
```

## 📈 Progress Tracking & Monitoring Tools (4 Tools)

### 21. Track Progress (`track_progress`)
```
Update the implementation progress for profile PROF-123 with these recent developments:

Subcategory Updates:
1. GV.OC-01: Moved to "largely implemented" with maturity level 4
   - Status: On track  
   - Notes: "New cybersecurity governance committee established, policies approved"

2. ID.AM-01: Now "partially implemented" with maturity level 2
   - Status: Behind schedule
   - Notes: "Asset inventory tool deployed but data quality issues remain"

3. PR.AC-01: Moved to "fully implemented" with maturity level 4
   - Status: Completed ahead of schedule
   - Notes: "Multi-factor authentication deployed organization-wide"

Analyze our progress and recommend next steps.
```

### 22. Generate Milestone (`generate_milestone`)
```
Create project milestones for profile PROF-123 covering the next 6 months:
1. Q1 Security Assessment Completion (assessment milestone)
2. Q2 Access Control Implementation (implementation milestone)  
3. Q2 Mid-year Executive Review (review milestone)

Include deliverables, timelines, success criteria, and responsible parties for each milestone.
```

### 23. Upload Evidence (`upload_evidence`)
```
Upload supporting evidence for our cybersecurity implementations:
- Subcategory: PR.AC-01 (Access control)
- Evidence type: Policy document
- File: "Multi-Factor Authentication Policy v2.1"
- Description: "Updated MFA policy covering all user types and applications"
- Compliance mappings: SOX, PCI-DSS

Validate the evidence and link it to relevant assessment responses.
```

### 24. Track Audit Trail (`track_audit_trail`)
```
Generate a comprehensive audit trail report for profile PROF-123 covering:
- All assessment updates and modifications over the past 6 months
- Evidence uploads and validation activities
- User access and modification logs
- Compliance-related activities and documentation
- Export the audit trail in a format suitable for regulatory review
```

## 📄 Reporting & Analytics Tools (8 Tools)

### 25. Generate Report (`generate_report`)
```
Generate a comprehensive cybersecurity assessment report for profile PROF-123:
- Include executive summary with key findings and recommendations
- Detailed analysis by CSF function with maturity scores
- Gap analysis and implementation roadmap
- Risk assessment with heat map visualization
- Format for C-level executive presentation
```

### 26. Generate Executive Report (`generate_executive_report`)
```
Create an executive-level summary report for our board of directors:
- High-level overview of current cybersecurity posture
- Key risk areas and business impact
- Investment recommendations with ROI projections
- Compliance status and regulatory considerations
- 2-page format with visual dashboard elements
```

### 27. Generate Compliance Report (`generate_compliance_report`)
```
Generate multi-framework compliance report for profile PROF-123:
- Map NIST CSF 2.0 implementation to ISO 27001, PCI-DSS, and HIPAA
- Identify compliance gaps and remediation requirements
- Include audit-ready documentation and evidence references
- Provide compliance percentage scores by framework
```

### 28. Generate Audit Report (`generate_audit_report`)
```
Create an audit report suitable for external security audit:
- Document all control implementations with evidence
- Include control effectiveness ratings and testing results
- Map controls to applicable regulatory requirements
- Provide management responses to identified gaps
- Format according to SOC 2 Type II reporting standards
```

### 29. Create Custom Report (`create_custom_report`)
```
Build a custom report for our quarterly security committee meeting:
- Title: "Q2 Cybersecurity Progress Report"
- Sections: Current posture, recent improvements, upcoming initiatives, budget status
- Audience: Security committee (technical and business leaders)
- Format: PowerPoint presentation with detailed appendix
- Include trend analysis and peer comparison data
```

### 30. Generate Dashboard (`generate_dashboard`)
```
Create a real-time cybersecurity dashboard for profile PROF-123:
- Key performance indicators (KPIs) and metrics
- Maturity progression over time
- Risk score trending and heat maps
- Implementation progress tracking
- Compliance status indicators
- Interactive elements for drill-down analysis
```

### 31. Export Data (`export_data`)
```
Export comprehensive assessment data for profile PROF-123:
- Include all assessment responses, evidence, and audit trail
- Format: Excel workbook with multiple sheets
- Purpose: Data backup and external GRC platform integration
- Include data dictionary and field descriptions
```

### 32. Validate Evidence (`validate_evidence`)
```
Validate the quality and completeness of uploaded evidence for profile PROF-123:
- Review all evidence documents for relevance and currency
- Identify missing evidence for implemented controls
- Check evidence against compliance requirements
- Provide recommendations for evidence quality improvement
```

## 🛠️ Template & Policy Tools (4 Tools)

### 33. Get Implementation Guidance (`get_implementation_guidance`)
```
Provide detailed implementation guidance for subcategory "DE.CM-01" (Monitoring):
- Step-by-step implementation approach
- Technology recommendations and vendor options
- Resource requirements and timeline estimates
- Success metrics and measurement criteria
- Industry-specific considerations for healthcare sector
```

### 34. Generate Policy Template (`generate_policy_template`)
```
Generate a cybersecurity policy template for our organization:
- Policy type: Incident Response Policy
- Organization size: Medium (500-1000 employees)
- Industry: Manufacturing
- Include sections for roles, procedures, communication, and recovery
- Align with NIST CSF 2.0 requirements and industry best practices
```

### 35. Get Implementation Template (`get_implementation_template`)
```
Provide implementation templates for establishing a security awareness program:
- Training curriculum outline and content recommendations
- Delivery methods and frequency guidelines
- Metrics and effectiveness measurement approaches
- Budget planning and resource allocation templates
- Customization guidance for different employee roles
```

### 36. Generate Test Scenarios (`generate_test_scenarios`)
```
Create comprehensive test scenarios for validating our cybersecurity controls:
- Focus on "Respond" (RS) function capabilities
- Include tabletop exercises and technical testing approaches
- Provide scenarios for different threat types and severity levels
- Include success criteria and evaluation methods
- Design scenarios appropriate for our retail industry context
```

## 🎯 Advanced Workflow Patterns

### Complete Assessment Workflow
```
Walk me through a complete cybersecurity assessment for a new client:
1. Create organization profile → profile_id
2. Quick assessment → initial_scores  
3. Detailed maturity assessment → comprehensive_analysis
4. Risk scoring → risk_profile
5. Gap analysis → improvement_areas
6. Priority matrix → implementation_sequence
7. Implementation planning → roadmap
8. Executive reporting → stakeholder_communication

Provide specific recommendations and next steps at each stage.
```

### Continuous Monitoring Pattern
```
Set up a continuous monitoring and improvement process:
1. Quarterly progress tracking → trend_analysis
2. Evidence validation → quality_assurance
3. Benchmark comparison → competitive_analysis
4. Risk reassessment → threat_landscape_updates
5. Plan adjustments → adaptive_management
6. Stakeholder reporting → communication_cadence

Include automation recommendations and efficiency improvements.
```

### Compliance Audit Preparation
```
Prepare for an upcoming SOC 2 audit using our NIST CSF 2.0 assessment:
1. Gap analysis against SOC 2 requirements → compliance_mapping
2. Evidence collection and validation → audit_readiness
3. Control effectiveness testing → assurance_activities
4. Documentation review and completion → audit_trail
5. Management response preparation → remediation_planning
6. Audit report generation → regulatory_submission

Ensure all activities are audit-ready and properly documented.
```

### Strategic Planning Integration
```
Integrate cybersecurity assessment results into strategic business planning:
1. Risk impact analysis → business_continuity
2. Investment prioritization → budget_planning
3. Resource allocation → capacity_management
4. Timeline integration → program_management
5. Success metrics → performance_measurement
6. Stakeholder alignment → governance_integration

Connect cybersecurity improvements to business objectives and outcomes.
```

## 📝 Best Practices for Effective Prompts

### Prompt Structure Template
```
**Objective**: [What you want to accomplish]

**Context**: [Organization details, constraints, requirements]

**Tools to Use**: 
1. [Primary tool] - [specific purpose]
2. [Secondary tool] - [how it builds on first]
3. [Additional tools] - [final analysis/reporting]

**Parameters**: [Specific values for tool inputs]

**Output Requirements**: [Format, audience, detail level]

**Success Criteria**: [How you'll measure success]

Please walk through this process step-by-step and explain the results and recommendations.
```

### Optimization Tips
1. **Be Specific**: Include organization size, industry, and specific requirements
2. **Sequence Tools**: Use logical tool sequences for complex workflows
3. **Define Context**: Provide relevant background information and constraints
4. **Specify Outputs**: Clearly define desired format, audience, and detail level
5. **Include Validation**: Ask for validation and quality checks of results

### Common Workflow Patterns
- **Assessment → Analysis → Planning → Implementation → Monitoring**
- **Current State → Gap Analysis → Target State → Roadmap → Execution**
- **Risk Assessment → Control Selection → Implementation → Testing → Reporting**

---

## 🎯 Success Metrics and KPIs

### Measuring Assessment Effectiveness
```
Help me establish KPIs for our cybersecurity assessment program:
1. Assessment coverage metrics (% of subcategories evaluated)
2. Maturity progression tracking over time
3. Risk reduction quantification
4. Implementation timeline adherence
5. Budget utilization efficiency
6. Stakeholder satisfaction scores

Use our historical data from profile PROF-123 to establish baselines and targets.
```

### ROI Calculation and Business Justification
```
Calculate ROI for our cybersecurity investments using:
- Implementation costs from our estimates
- Risk reduction valuations from assessments
- Compliance cost avoidance from gap remediation
- Business continuity improvements from resilience measures
- Insurance premium reductions from risk mitigation

Generate business case presentation for executive approval.
```

---

**Remember**: These prompts are designed to leverage the full power of the NIST CSF 2.0 MCP Server's 36 specialized tools. Customize them based on your specific organizational needs, industry requirements, and regulatory environment. The server's comprehensive tool suite supports everything from quick risk assessments to complex compliance reporting and long-term cybersecurity program management.

**Get Started**: Begin with the Quick Start prompts and gradually explore more advanced workflows as you become familiar with the server's capabilities. The combination of NIST CSF 2.0 framework guidance and AI-powered analysis provides unprecedented support for cybersecurity professionals at all levels.