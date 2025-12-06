# NIST CSF 2.0 MCP Server - User-Friendly Prompt Guide

This comprehensive guide provides **user-friendly prompts** for using the NIST CSF 2.0 MCP Server with large language models like **Claude**, **ChatGPT**, and **Gemini**. All prompts are conversational and require no technical knowledge or JSON formatting.

## 🎯 Assessment Workflows (No JSON Required!)

### 🚀 Quick Assessment Workflow (6 Questions + Visual Dashboards)

**Perfect for:** Initial cybersecurity posture evaluation, executive briefings, rapid organizational insights

**Simple Conversation Starter:**
```
I want to run a quick cybersecurity assessment for my organization using the NIST Cybersecurity Framework. 

Please guide me through 6 key questions covering:
- Governance and risk management
- Asset identification and risk assessment  
- Protection controls and training
- Detection and monitoring capabilities
- Incident response procedures
- Recovery and business continuity

After I answer each question, create visual dashboards showing:
- Maturity scores across all 6 functions
- Priority recommendations for improvement
- Risk heat maps with color-coded areas
- Executive summary charts for leadership

My organization profile is: [your-profile-id] or help me create one first.
```

**Follow-up Prompts During Assessment:**
```
Question 1 Response: "We have basic cybersecurity policies documented, but they're not regularly updated and some staff aren't fully trained on them. I'd say we're partially implemented."

Please record this governance response and show me the next question with updated progress dashboard.
```

### 🏢 Comprehensive Assessment Workflow (740 Questions + Full Analysis)

**Perfect for:** Enterprise assessments, compliance audits, detailed implementation planning

**Conversational Setup:**
```
I need to conduct a complete comprehensive NIST CSF 2.0 assessment, using the nist-csf mcp server, for my organization with complete visual reporting. Here are my organization details:
Company Name: TechCorp Solutions
Industry Sector: Technology Services
Organization Size: Medium (150 employees)
Primary Contact: Sarah Johnson
Email: sarah.johnson@techcorp.com  
Assessment Timeline: 8 weeks
Special Requirements: Need visual dashboards for board presentation

Please start the comprehensive assessment workflow and guide me through:

1. Organization profile setup with authentic data collection
2. All 740 detailed assessment questions across the framework
3. Interactive progress tracking with visual completion dashboards
4. Real-time preliminary scoring as we complete sections
5. Final comprehensive analysis with executive visualizations

Start by setting up my organization profile and explaining what information you'll need from me.
```

**Progress Tracking Prompts:**
```
I've completed the Governance (GV) section questions. Here's a summary of my responses:
- We have formal cybersecurity policies: Yes
- Risk assessments happen regularly: Partially  
- Leadership provides adequate resources: No
- We have clear roles and responsibilities: Partially

Please update my progress dashboard, show preliminary scoring for the Governance function, and guide me to the next section (Identify).
```

**Analysis Generation Prompts:**
```
I've completed all 740 assessment questions! Please generate my comprehensive analysis package with visual dashboards:

📊 EXECUTIVE DASHBOARD PACKAGE:
- Interactive maturity radar chart showing scores across all 6 NIST functions
- Risk heat map with color-coded priority areas for immediate attention  
- Gap analysis visualization comparing current vs. target maturity states
- Implementation roadmap with phased timeline and milestone tracking
- Cost estimation dashboard with ROI projections
- Compliance status overview for our industry regulations

📈 DETAILED ANALYSIS REPORTS:
- Function-by-function breakdown with specific recommendations
- Priority matrix showing high-impact, low-effort improvements
- Resource allocation recommendations with budget estimates
- Timeline visualization for 12-month implementation plan
- Progress tracking dashboard template for ongoing monitoring

Make all visualizations executive-ready for board presentations and include actionable next steps for our IT team.
```

## 🎨 Visual Dashboard Examples

### Dashboard Request Prompts

**Executive Dashboard (Board Presentation Ready):**
```
Generate an executive dashboard for our cybersecurity assessment with:
- High-level maturity radar chart showing our organization's scores across all 6 NIST CSF functions
- Color-coded risk heat map highlighting areas needing immediate attention (red), near-term focus (yellow), and well-managed areas (green)
- Compliance status overview showing our readiness for industry regulations
- ROI projections for recommended security investments
- One-page executive summary with key metrics and business impact

Make this suitable for C-level executives and board presentations with clear, non-technical language.
```

**Operational Dashboard (IT Management):**
```
Create an operational cybersecurity dashboard for our IT team showing:
- Detailed function-by-function breakdowns with specific subcategory scores
- Implementation progress tracking with completion percentages
- Priority action items with assigned owners and due dates
- Resource allocation recommendations with estimated costs and timelines
- Technical control status and configuration compliance
- Alert system for critical security gaps requiring immediate action

Focus on actionable insights for day-to-day security operations management.
```

**Technical Dashboard (Security Team):**
```
Build a technical cybersecurity dashboard with:
- Granular subcategory analysis across all 185 NIST CSF controls
- Gap analysis comparing current vs. target implementation states
- Technical control effectiveness measurements and recommendations
- Security tool integration status and coverage maps
- Vulnerability correlation with framework subcategories
- Detailed implementation guidance for each identified gap

Optimize for security professionals who need detailed technical insights and remediation steps.
```

**Custom Progress Tracking Dashboard:**
```
Design a custom dashboard for tracking our cybersecurity improvement program:
- Monthly progress charts showing maturity score improvements over time
- Milestone tracking for our 12-month security roadmap implementation
- Budget vs. actual spending analysis for security investments
- Team performance metrics and training completion status
- Vendor and third-party risk assessment integration
- Quarterly business impact measurements and success stories

Include customizable widgets that we can modify based on changing business priorities.
```

### Visual Chart Examples

**Maturity Radar Chart:**
```
Create an interactive radar chart visualization showing:
- All 6 NIST CSF functions (Govern, Identify, Protect, Detect, Respond, Recover) as axes
- Current maturity scores (0-4 scale) plotted as colored areas
- Target maturity goals shown as overlay outlines
- Industry benchmark comparisons for our sector and company size
- Clickable areas that drill down to specific recommendations
- Color coding: Red (Critical gaps), Yellow (Improvement needed), Green (Well implemented)
```

**Risk Heat Map Matrix:**
```
Generate a risk heat map showing:
- X-axis: Implementation difficulty (Low, Medium, High)
- Y-axis: Business impact (Low, Medium, High, Critical)
- Each NIST subcategory plotted as color-coded bubbles
- Bubble size represents estimated cost of implementation
- Quick wins highlighted in green (High impact, Low difficulty)
- Priority items marked in red (High impact, any difficulty level)
- Interactive tooltips with specific recommendations and timelines
```

**Implementation Timeline:**
```
Build a visual project timeline showing:
- 12-month roadmap with quarterly milestones
- Phase 1 (Months 1-3): Critical security foundations
- Phase 2 (Months 4-6): Core protection and detection capabilities
- Phase 3 (Months 7-9): Advanced response and recovery systems
- Phase 4 (Months 10-12): Optimization and continuous improvement
- Resource allocation bars showing team effort and budget requirements
- Dependency arrows showing prerequisite relationships between initiatives
- Progress indicators that update as milestones are completed
```

## 💬 Conversational Follow-up Prompts

### During Assessment:
```
"I'm not sure how to answer this question about our incident response capabilities. Can you give me some examples of what 'partially implemented' would look like versus 'fully implemented'?"

"We're a small company - are there specific recommendations for organizations our size when it comes to this security control?"

"This section is asking about technical controls I'm not familiar with. Can you explain what this means in business terms and help me evaluate our current state?"
```

### After Assessment:
```
"The dashboard shows our Detect function scored very low. What are the top 3 most cost-effective improvements we could make in the next 6 months?"

"Can you create a one-page executive summary of our results that I can present to our board next week?"

"Our compliance team needs to map these results to SOX requirements. Can you show how our NIST CSF assessment aligns with financial compliance?"
```

### Ongoing Monitoring:
```
"We implemented the Phase 1 recommendations from our roadmap. How do I update our assessment to reflect these improvements and recalculate our maturity scores?"

"It's been 6 months since our initial assessment. What's the best way to conduct a follow-up evaluation to measure our progress?"

"Can you create a quarterly dashboard template that our IT team can use to track ongoing cybersecurity metrics?"
```

## 🎯 Quick Reference: Essential Commands

### Start Quick Assessment:
```
Run a quick NIST CSF assessment for my organization. Guide me through 6 questions and create visual dashboards showing maturity scores and recommendations.
```

### Start Comprehensive Assessment:
```
Begin a full NIST CSF 2.0 assessment for [Company Name], a [size] [industry] company. Contact: [Name] ([email]). Timeline: [weeks]. Guide me through all 740 questions with visual progress tracking.
```

### Generate Executive Dashboard:
```
Create executive-level visual dashboards from our assessment results with maturity charts, risk heat maps, and board-ready summaries.
```

### Get Implementation Plan:
```
Generate a visual implementation roadmap with phases, timelines, costs, and priority recommendations based on our assessment results.
```

### Track Progress:
```
Update our assessment progress and show visual dashboards comparing before/after improvements we've implemented.
```

## 🚀 Getting Started Template

**Copy-paste this template and customize with your organization details:**

```
Hi! I need help with a NIST Cybersecurity Framework assessment for my organization. Here are our details:

🏢 ORGANIZATION INFO:
- Company Name: [Your Company Name]
- Industry: [Your Industry] 
- Size: [Small/Medium/Large/Enterprise - number of employees]
- Primary Contact: [Your Name]
- Email: [Your Email]
- Assessment Goal: [Quick overview / Full compliance / Board presentation / etc.]

📋 WHAT I NEED:
- [ ] Interactive assessment questions (not technical JSON)
- [ ] Visual dashboards and charts for presentations
- [ ] Priority recommendations for improvements  
- [ ] Implementation timeline and cost estimates
- [ ] Executive summary for leadership

Please guide me through the assessment process step-by-step and create visual dashboards throughout. I prefer conversational guidance over technical interfaces.

Ready to start!
```

**Replace the bracketed sections with your actual information and you're ready to begin your NIST CSF assessment with full visual dashboard support!**
```
I need to start an official NIST CSF 2.0 assessment for my organization that prevents synthetic data and ensures authentic responses. Please help me:

1. Use start_assessment_workflow to begin a comprehensive assessment for:
   - Organization: "Healthcare Solutions Inc"
   - Sector: "Healthcare"
   - Size: "large"
   - Contact: "Sarah Johnson" (sarah.johnson@healthcaresolutions.com)
   - Timeline: 12 weeks for full framework assessment

2. Once started, use check_assessment_workflow_status to monitor progress
3. Guide me through the authentic data collection process
4. Help me understand what real organizational information is needed at each step

This should create a proper audit trail and prevent any fake assessment data.
```

### Multi-Organization Assessment Management
```
I'm a consultant managing multiple client assessments. Help me:

1. Start separate assessment workflows for three different organizations:
   - Small retail company (4-week timeline, specific focus on PR and DE functions)
   - Medium manufacturing company (8-week timeline, full framework)
   - Large financial services firm (16-week timeline, full framework with compliance focus)

2. Show me how to check status on all workflows and track progress
3. Demonstrate how the workflow prevents data contamination between clients
4. Guide me through proper handoff procedures for client-specific assessments
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

## 🏢 Organization & Profile Management Tools (4 Tools)

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

### 7. Reset Organizational Data (`reset_organizational_data`)
```
⚠️ DESTRUCTIVE OPERATION - Use with extreme caution!

I need to completely reset all organizational assessment data while preserving the NIST CSF framework:

{
  "confirmation": "CONFIRM_RESET_ALL_ORGANIZATIONAL_DATA"
}

This will permanently delete:
- All organization profiles and associated metadata
- All assessment results and maturity scores
- All gap analyses, priority matrices, and implementation plans
- All reports, evidence, and audit trail records
- All custom configurations and organizational settings

This will preserve:
- NIST CSF 2.0 framework structure (functions, categories, subcategories)
- Question bank and assessment templates
- Implementation examples and guidance materials
- System configuration and baseline information

Use only when:
- Migrating to a new organizational structure
- Cleaning test/demo data before production deployment
- Starting fresh after major organizational changes
- Decommissioning old assessment data

⚠️ This action cannot be undone. Ensure you have backups if needed.
```

## 🔄 Comprehensive Assessment Workflow Tools (2 Tools)

### 7. Start Assessment Workflow (`start_assessment_workflow`)
```
Start a comprehensive NIST CSF 2.0 assessment with proper audit trail for my technology startup:

{
  "org_name": "InnovateNow Technologies",
  "sector": "Technology",
  "size": "small",
  "contact_name": "Maria Rodriguez", 
  "contact_email": "maria.rodriguez@innovatenow.tech",
  "description": "Cloud-based software development company with 45 employees",
  "assessment_scope": "full",
  "timeline_weeks": 6
}

Expected outcome: Creates workflow ID, sets up authentic data collection, provides next steps for real assessment data gathering.
```

### 8. Check Assessment Workflow Status (`check_assessment_workflow_status`)
```
Monitor the progress of my assessment workflow:

{
  "workflow_id": "workflow_67890abc"
}

Show me:
- Current completion percentage and questions answered
- What specific information I need to provide next
- Timeline status and expected completion date
- Quality validation status and any data authenticity issues
```

### Advanced Workflow: Multi-Function Assessment
```
Start a targeted assessment focusing only on Identify and Protect functions for a healthcare organization:

{
  "org_name": "Regional Medical Center",
  "sector": "Healthcare", 
  "size": "large",
  "contact_name": "Dr. James Wilson",
  "contact_email": "j.wilson@regionalmedcenter.org",
  "assessment_scope": "specific_functions",
  "target_functions": ["ID", "PR"],
  "timeline_weeks": 4
}

Then monitor with check_assessment_workflow_status and guide through function-specific data collection.
```

## 🎯 Assessment & Scoring Tools (8 Tools)

### 9. Quick Assessment (`quick_assessment`)
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

### 9. Assess Maturity (`assess_maturity`)
```
Conduct a comprehensive maturity assessment for profile PROF-456. I want to:
- Evaluate maturity across all 6 NIST CSF functions
- Use our detailed assessment responses from the question bank
- Calculate maturity scores with confidence intervals
- Identify areas of strength and weakness
- Provide benchmarking against industry standards
```

### 10. Calculate Risk Score (`calculate_risk_score`)
```
Calculate the overall cybersecurity risk score for our organization using profile PROF-123:
- Assess risk across all framework subcategories
- Weight risks based on business impact and threat likelihood
- Include industry-specific risk factors for financial services
- Provide both quantitative scores and qualitative risk descriptions
```

### 11. Calculate Maturity Trend (`calculate_maturity_trend`)
```
I want to track our cybersecurity maturity progress over time. Please:
- Calculate maturity trends across the last 12 months using multiple assessment points
- Identify which functions are improving and which are stagnating
- Show velocity of improvement and projected timeline to target maturity
- Highlight any concerning downward trends that need attention
```

### 12. Generate Priority Matrix (`generate_priority_matrix`)
```
Create a comprehensive priority matrix for our cybersecurity improvements:
- Rank all gap areas by business impact and implementation difficulty
- Consider budget constraints of $500K for the next fiscal year
- Factor in regulatory compliance requirements (SOX, PCI DSS)
- Provide clear implementation sequencing recommendations
```

### 13. Estimate Implementation Cost (`estimate_implementation_cost`)
```
I need detailed cost estimates for implementing priority cybersecurity improvements:
- Focus on the top 10 gaps identified in our assessment
- Include both technology costs and human resources
- Break down costs by implementation phases over 18 months
- Consider ROI and cost savings from improved security posture
```

 Suggest Next Actions (`suggest_next_actions`)
```
Based on our current assessment results, what should be our immediate next actions? Please:
- Identify the top 5 most critical actions for the next 30 days
- Suggest medium-term initiatives for the next quarter
- Recommend long-term strategic improvements for the next year
- Prioritize based on risk reduction and quick wins
```

 Track Progress (`track_progress`)
```
Help me track our cybersecurity improvement progress for profile PROF-123:
- Compare current scores against our baseline from 6 months ago
- Identify completed initiatives and their impact on maturity scores
- Track progress toward our target state objectives
- Generate progress metrics for monthly leadership reporting
```

## 📊 Analysis & Planning Tools (4 Tools)

 Generate Gap Analysis (`generate_gap_analysis`)
```
Perform a comprehensive gap analysis between our current and target security posture:
- Compare current maturity levels against industry best practices
- Identify critical gaps that pose the highest risk
- Analyze resource requirements to close priority gaps
- Provide actionable recommendations with implementation timelines
```

 Create Implementation Plan (`create_implementation_plan`)
```
Create a detailed cybersecurity implementation plan based on our assessment results:
- Develop a 24-month phased approach to address all critical gaps
- Include resource allocation, budget requirements, and success metrics
- Consider dependencies between different security initiatives
- Align with business objectives and compliance requirements
```

 Get Industry Benchmarks (`get_industry_benchmarks`)
```
I need to understand how our cybersecurity maturity compares to industry peers:
- Provide benchmarking data for technology companies with 1,000-5,000 employees
- Show percentile rankings for each NIST CSF function
- Identify areas where we're leading or lagging behind industry averages
- Include regional and sector-specific benchmarking insights
```

 Generate Test Scenarios (`generate_test_scenarios`)
```
Generate comprehensive test scenarios to validate our cybersecurity controls:
- Create test scenarios for each NIST CSF function we've implemented
- Include both technical tests and tabletop exercises
- Design scenarios that test integration between different controls
- Provide success criteria and evaluation metrics for each test
```

## 📋 Assessment Question Tools (4 Tools)

 Get Assessment Questions (`get_assessment_questions`)
```
I need comprehensive assessment questions for a detailed cybersecurity evaluation:
- Provide questions for all subcategories under the PROTECT function
- Include questions across all maturity dimensions (risk, implementation, effectiveness)
- Tailor questions for a healthcare organization with specific compliance needs
- Include guidance on evidence collection for each question
```

 Get Question Context (`get_question_context`)
```
Help me understand the context and intent behind assessment question Q-GV-001:
- Explain why this question is important for cybersecurity governance
- Show how responses impact overall maturity scoring
- Provide examples of good and poor responses
- Suggest evidence that would support a high-quality answer
```

 Validate Assessment Responses (`validate_assessment_responses`)
```
Please validate our assessment responses for consistency and completeness:
- Review responses for the IDENTIFY function across all subcategories
- Flag any inconsistent or contradictory responses
- Identify areas where additional evidence is needed
- Ensure responses align with our stated maturity goals
```

 Import Assessment (`import_assessment`)
```
I have assessment data from our previous security audit that I'd like to import:
- Import assessment results from our external security assessment
- Map findings to appropriate NIST CSF subcategories
- Integrate external assessment scores with our internal evaluation
- Reconcile any differences between internal and external assessments
```

## 🔒 Evidence & Audit Tools (4 Tools)

 Upload Evidence (`upload_evidence`)
```
I need to upload supporting evidence for our cybersecurity assessment:
- Upload policy documents supporting our governance maturity claims
- Add incident response plan documentation for RS subcategories
- Include security training records and awareness materials
- Organize evidence by subcategory for easy audit trail review
```

 Validate Evidence (`validate_evidence`)
```
Please validate the evidence we've uploaded for our assessment:
- Check that evidence adequately supports our maturity claims
- Identify gaps where additional evidence is needed
- Verify evidence currency and relevance to current operations
- Ensure evidence meets audit and compliance requirements
```

 Track Audit Trail (`track_audit_trail`)
```
Generate a comprehensive audit trail for our cybersecurity assessment process:
- Document all assessment activities, changes, and decisions
- Track who performed assessments and when they were completed
- Include evidence of review and approval processes
- Create audit-ready documentation for compliance purposes
```

 Get Implementation Guidance (`get_implementation_guidance`)
```
I need detailed implementation guidance for improving our cybersecurity posture:
- Provide specific guidance for implementing PR.AC controls (access management)
- Include step-by-step implementation procedures
- Suggest tools, technologies, and best practices
- Address common implementation challenges and how to overcome them
```

## 📊 Reporting Tools (7 Tools)

 Generate Report (`generate_report`)
```
Generate a comprehensive cybersecurity assessment report for our organization:
- Include executive summary with key findings and recommendations
- Provide detailed analysis of each NIST CSF function
- Include gap analysis, risk scoring, and improvement recommendations
- Format for presentation to the board of directors
```

 Generate Executive Report (`generate_executive_report`)
```
Create an executive-level cybersecurity report for our CEO and board:
- Focus on business impact and strategic cybersecurity positioning
- Include high-level metrics and key performance indicators
- Highlight major risks and recommended investments
- Present cybersecurity as a business enabler, not just a cost center
```

 Generate Compliance Report (`generate_compliance_report`)
```
Generate a comprehensive compliance report showing our adherence to regulatory requirements:
- Map our NIST CSF implementation to SOC 2, ISO 27001, and GDPR requirements
- Identify compliance gaps and remediation requirements
- Include evidence citations and audit trail references
- Format for submission to regulators and auditors
```

 Generate Audit Report (`generate_audit_report`)
```
Create a detailed audit report of our cybersecurity program:
- Document all assessment findings and supporting evidence
- Include detailed gap analysis and risk assessments
- Provide comprehensive recommendations with implementation timelines
- Ensure report meets internal audit and external audit requirements
```

 Generate Dashboard (`generate_dashboard`)
```
Create a cybersecurity dashboard for ongoing monitoring and reporting:
- Include key metrics and KPIs for each NIST CSF function
- Show trend analysis and progress toward target maturity
- Highlight areas requiring immediate attention
- Design for monthly executive reporting and operational monitoring
```

 Create Custom Report (`create_custom_report`)
```
I need a custom report tailored for our specific stakeholder needs:
- Create a technical report for our IT security team focusing on implementation details
- Include specific recommendations for tools and technologies
- Highlight technical gaps and remediation procedures
- Format for technical audience with detailed technical specifications
```

 Generate Milestone (`generate_milestone`)
```
Generate project milestones for our cybersecurity improvement initiative:
- Create milestones based on our 18-month implementation plan
- Include success criteria and key deliverables for each milestone
- Align milestones with budget cycles and business planning
- Provide progress tracking mechanisms and reporting schedules
```

## 🔧 Utility & Integration Tools (5 Tools)

 Export Data (`export_data`)
```
Export our cybersecurity assessment data for integration with other systems:
- Export assessment results in CSV format for analysis in Excel
- Include all assessment data, scores, and evidence references
- Format data for import into our GRC platform
- Ensure exported data maintains referential integrity
```

 Get Implementation Template (`get_implementation_template`)
```
Provide implementation templates for cybersecurity control deployment:
- Generate templates for implementing access control procedures
- Include policy templates, procedure documentation, and checklists
- Provide customizable templates that can be adapted to our environment
- Include examples and best practices from similar organizations
```

 Generate Policy Template (`generate_policy_template`)
```
Generate comprehensive cybersecurity policy templates based on our assessment:
- Create policy templates addressing our identified gaps
- Include policies for data governance, incident response, and access management
- Ensure policies align with NIST CSF requirements and industry best practices
- Provide guidance on policy implementation and maintenance
```

## 🏭 Industry-Specific Prompt Examples

### Healthcare Organization
```
I'm conducting a NIST CSF 2.0 assessment for a 500-bed hospital system. Please help me:

1. Create an organization profile tailored for healthcare with HIPAA considerations
2. Assess our current maturity with focus on patient data protection
3. Generate a compliance report mapping NIST CSF to HIPAA requirements
4. Develop an implementation plan that addresses both cybersecurity and patient safety
5. Create test scenarios specific to healthcare environments and medical device security
```

### Financial Services
```
Our regional bank needs a comprehensive cybersecurity assessment. Please:

1. Establish a baseline assessment considering regulatory requirements (SOX, GLBA, FFIEC)
2. Calculate risk scores with emphasis on financial crime and fraud prevention
3. Generate a compliance report showing alignment with banking regulations
4. Create an implementation plan that addresses both cybersecurity and operational risk
5. Provide industry benchmarking against other regional banks
```

### Manufacturing
```
I'm assessing cybersecurity for our smart manufacturing facility. Help me:

1. Create a profile that addresses both IT and OT (operational technology) environments
2. Assess maturity across both corporate networks and industrial control systems
3. Generate test scenarios for both cyber and physical security controls
4. Develop implementation guidance for securing IoT devices and manufacturing systems
5. Create reporting that addresses both cybersecurity and operational continuity
```

## 🔄 Continuous Improvement Workflows

### Monthly Assessment Review
```
It's time for our monthly cybersecurity posture review. Please:

1. Update our progress tracking against established milestones
2. Review any new assessment responses or evidence uploaded
3. Calculate updated maturity and risk scores
4. Generate a monthly dashboard for executive review
5. Suggest next actions based on current progress and emerging threats
```

### Annual Strategic Assessment
```
We're conducting our annual strategic cybersecurity assessment. Please help me:

1. Compare this year's maturity scores against last year's baseline
2. Update our target state profile based on new business objectives and threat landscape
3. Generate a comprehensive gap analysis identifying new priorities
4. Create a new implementation plan for the upcoming fiscal year
5. Generate an executive report showing ROI from cybersecurity investments
```

### Incident-Driven Assessment Update
```
We recently experienced a cybersecurity incident. Please help me:

1. Update our assessment to reflect lessons learned from the incident
2. Recalculate risk scores considering the realized threat
3. Generate updated implementation priorities based on incident findings
4. Create test scenarios to validate our response capabilities
5. Update our audit trail to document incident-driven improvements
```

## 💡 Pro Tips for Effective Usage

### Maximizing Assessment Accuracy
- Start with quick assessments to establish baseline understanding
- Use comprehensive assessments for detailed analysis and planning
- Regularly validate evidence to ensure assessment accuracy
- Import external assessment data to provide comprehensive coverage

### Effective Planning and Implementation
- Use priority matrices to focus on high-impact, achievable improvements
- Generate detailed implementation plans with realistic timelines
- Track progress regularly and adjust plans based on actual results
- Leverage industry benchmarks to set realistic maturity targets

### Stakeholder Communication
- Generate executive reports for leadership focusing on business impact
- Create technical reports for implementation teams with detailed guidance
- Use dashboards for ongoing monitoring and regular check-ins
- Customize reports based on audience needs and technical expertise

### Compliance and Audit Readiness
- Maintain comprehensive audit trails for all assessment activities
- Upload and validate evidence regularly to support assessment claims
- Generate compliance reports mapping to relevant regulatory frameworks
- Keep documentation current and ensure evidence remains relevant

---

*This prompt guide covers all 36 tools available in the NIST CSF 2.0 MCP Server. For additional examples and advanced usage patterns, refer to the technical documentation and implementation guides.*