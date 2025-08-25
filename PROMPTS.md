# NIST CSF 2.0 MCP Server - LLM Prompt Examples

This comprehensive guide provides **optimized prompts** for using the NIST CSF 2.0 MCP Server with large language models like **Claude**, **ChatGPT**, and **Gemini**. These prompts demonstrate best practices for cybersecurity assessments and leverage all **37 MCP tools** available in the server.

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

## 📋 Framework Query & Search Prompts

### Exploring the NIST CSF 2.0 Framework

#### CSF Lookup Tool
```
I need to understand the NIST CSF 2.0 subcategory "GV.OC-01" in detail. Please:
- Look up this subcategory with all available examples and references
- Explain how it relates to organizational cybersecurity governance
- Provide practical implementation examples for a healthcare organization
```

#### Framework Search Tool  
```
Help me find all NIST CSF 2.0 elements related to "incident response" across all functions. I want to:
- Search for all subcategories containing incident response concepts
- Focus on functions DE (Detect), RS (Respond), and RC (Recover)
- Get comprehensive results with implementation guidance
```

#### Related Subcategories
```
I'm working on implementing access control measures. Please:
- Find all subcategories related to "PR.AC-01" (Identity and access management)
- Show me the dependencies and relationships between these controls
- Identify supporting subcategories that should be implemented together
```

## 🏢 Profile Management Prompts

### Organization Profile Creation
```
Create a comprehensive organization profile for our company with these details:
- Organization: "Global Finance Corp"
- Industry: Financial services
- Size: Large (5,000+ employees)
- Assessment type: Current state baseline

Then clone this profile to create a target state profile representing our desired security posture in 18 months.
```

### Profile Management Workflow
```
I have an existing organization profile (PROF-123). Please help me:
1. Review the current profile details and assessment data
2. Clone it to create a comparative profile for benchmarking
3. Update the progress tracking with recent security improvements
4. Generate a trend analysis showing our maturity progression over time
```

## 🔍 Assessment & Analysis Prompts

### Quick Assessment
```
I need to quickly evaluate our organization's cybersecurity posture. Using profile PROF-123, please:

Perform a quick assessment with these simplified answers:
- Govern: We have basic policies but limited governance structure (partial)
- Identify: Asset inventory is incomplete, risk assessments are ad-hoc (partial)  
- Protect: Some access controls and training in place (partial)
- Detect: Basic monitoring but limited threat detection (no)
- Respond: Informal incident response process (partial)
- Recover: No formal disaster recovery plan (no)

Analyze the results and provide immediate recommendations for improvement.
```

### Comprehensive Maturity Assessment
```
Conduct a detailed maturity assessment for organization profile PROF-123. Please:
1. Assess maturity across all 6 NIST CSF functions
2. Include detailed subcategory-level analysis
3. Provide specific recommendations for each function
4. Identify the top 5 priority areas for immediate attention
5. Suggest a maturity improvement roadmap

Focus on practical, actionable recommendations for a medium-sized technology company.
```

### Risk Scoring and Analysis
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

## 📊 Planning & Implementation Prompts

### Gap Analysis Generation
```
Generate a comprehensive gap analysis between our current state (PROF-123) and target state (PROF-456). Please:
1. Identify all significant gaps across the 6 CSF functions
2. Prioritize gaps by business impact and implementation difficulty  
3. Include cost estimates for closing each gap
4. Create a visual priority matrix for stakeholder presentation
5. Provide specific implementation guidance for top priority gaps
```

### Implementation Planning
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

### Cost Estimation
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

## 📈 Progress Tracking & Monitoring Prompts

### Progress Updates
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

### Milestone Management
```
Create project milestones for profile PROF-123 covering the next 6 months:
1. Q1 Security Assessment Completion (assessment milestone)
2. Q2 Access Control Implementation (implementation milestone)  
3. Q2 Mid-year Executive Review (review milestone)

Include deliverables, timelines, and success criteria for each milestone.
```

## 📄 Reporting & Analytics Prompts

### Executive Reporting
```
Generate a comprehensive executive report for profile PROF-123 tailored for:
- Audience: Board of Directors
- Focus: Business risk and strategic recommendations
- Include financial impact analysis and ROI projections
- Highlight regulatory compliance status
- Provide clear action items for leadership approval

Make it suitable for a 15-minute board presentation with key metrics and visual elements.
```

### Compliance Reporting
```
Create a multi-framework compliance report for profile PROF-123 covering:
- ISO 27001 alignment and gaps
- PCI DSS compliance status (we process credit cards)
- HIPAA requirements (we handle healthcare data)
- GDPR data protection compliance

Include a remediation roadmap with timelines and resource requirements for achieving full compliance.
```

### Custom Report Generation
```
Build a custom quarterly security report with these sections:
1. Executive Summary with key metrics and trends
2. Risk Assessment with heat maps and priority rankings
3. Implementation Progress with milestone tracking
4. Compliance Status across multiple frameworks
5. Industry Benchmarking against technology sector peers
6. Next Quarter Recommendations with resource requirements

Format for both technical and business stakeholders.
```

### Real-time Dashboard
```
Create a real-time cybersecurity dashboard for profile PROF-123 with:
- Executive-level KPIs and trend indicators
- Security metrics with 5-minute refresh intervals
- Implementation progress tracking
- Risk score trending over time
- Compliance status indicators
- Alert notifications for significant changes

Optimize for wall display in our security operations center.
```

## 🔍 Audit & Evidence Management Prompts

### Evidence Upload and Management
```
Help me manage evidence for our NIST CSF implementation. Please:
1. Upload policy documentation for subcategory GV.OC-01
2. Associate security procedure documents with PR.AC-01
3. Link incident response test results to RS.CO-01
4. Organize evidence by implementation tier and compliance framework
5. Validate completeness of our evidence collection

Ensure all evidence meets audit requirements and is properly categorized.
```

### Audit Trail Tracking
```
Generate a comprehensive audit trail report for profile PROF-123 covering:
- Date range: January 1, 2024 to December 31, 2024
- Event types: All assessment updates, report generation, and profile modifications
- Filter for high-impact changes and administrative actions
- Include user attribution and change justification
- Format for regulatory compliance review

Ensure the audit trail meets SOC 2 Type II requirements.
```

### Audit Report Generation
```
Create a comprehensive audit report for profile PROF-123 with:
- Audit type: Full compliance audit
- Regulatory framework: NIST CSF 2.0 with ISO 27001 alignment  
- Include exception analysis and management letter
- Provide certification readiness assessment
- Generate remediation recommendations with timelines
- Include control effectiveness evaluation

Target this for external auditor review and regulatory submission.
```

## 💡 Assessment Questions & Validation Prompts

### Question Bank Utilization
```
I need to conduct a detailed assessment using your 424-question bank. Please:
1. Retrieve questions for the Govern (GV) function focusing on maturity assessment
2. Filter for medium-sized technology companies  
3. Include scoring guidance and implementation examples
4. Organize by subcategory with clear assessment dimensions
5. Estimate completion time for comprehensive evaluation

I want to ensure we cover all aspects of organizational governance maturity.
```

### Response Validation
```
Please validate these assessment responses for profile PROF-123:

Sample responses:
1. GV.OC-01 Risk Assessment: Response value 3, Risk level: Medium, Maturity: Defined
2. ID.AM-01 Asset Management: Response value 2, Risk level: High, Maturity: Initial  
3. PR.AC-01 Access Control: Response value 4, Risk level: Low, Maturity: Managed

Use comprehensive validation to check:
- Cross-dimensional consistency
- Completeness across all required areas
- Logical alignment between risk and maturity levels
- Evidence requirements for each response
```

### Question Context and Guidance
```
I need detailed context for assessing subcategory "PR.AC-01" focusing on:
- Assessment dimension: Implementation effectiveness
- Organization context: Medium-sized healthcare provider
- Include specific scoring guidance for each response option
- Provide industry-specific implementation examples
- Show relationships to other access control subcategories

Help me understand how to properly evaluate our access control implementation.
```

## 🔧 Policy & Implementation Guidance Prompts

### Policy Template Generation
```
Generate comprehensive policy templates for these subcategories:
- GV.OC-01: Organizational cybersecurity governance policy
- GV.PO-01: Cybersecurity supply chain risk management policy
- PR.AC-01: Identity and access management policy

Tailor for:
- Organization size: Medium (500-1000 employees)
- Industry: Healthcare
- Template format: Detailed with implementation guidance
- Include compliance mapping to HIPAA and state regulations
```

### Implementation Templates and Guidance
```
Provide detailed implementation guidance for subcategory "ID.AM-01" (Asset Management) for:
- Organization size: Large enterprise
- Sector: Financial services  
- Implementation approach: Phased rollout over 12 months
- Include step-by-step checklists
- Provide vendor evaluation criteria
- Include success metrics and KPIs
- Show integration with existing IT service management
```

### Next Actions Recommendations
```
Based on profile PROF-123's current state, provide AI-powered recommendations for:
- Focus area: Identity and Access Management
- Urgency level: High (regulatory audit in 6 months)
- Include quick wins that can be implemented in 30 days
- Prioritize actions with highest risk reduction impact
- Consider available budget of $250K for implementations
- Account for limited staff resources (2 security professionals)
```

## 🔄 Data Management & Integration Prompts

### Data Export and Analysis
```
Export comprehensive data for profile PROF-123 in JSON format including:
- All assessment results and maturity scores
- Implementation progress tracking over time
- Gap analysis results and priority rankings
- Cost estimates and budget allocations
- Compliance mapping across multiple frameworks

I need this data for integration with our GRC platform and business intelligence tools.
```

### External Assessment Import
```
Import assessment data from our external security consulting engagement:
- Data format: CSV export from third-party tool
- Source: External penetration testing and vulnerability assessment
- Target profile: PROF-123
- Enable validation on import to ensure data quality
- Map external findings to NIST CSF subcategories
- Integrate with existing assessment data
```

### Industry Benchmarking
```
Compare our organization against industry benchmarks:
- Organization size: Medium (500-1000 employees)
- Sector: Technology/Software
- Include peer comparisons for maturity levels
- Show industry average implementation timelines
- Provide cost benchmarks for similar organizations
- Use NIST industry data as the benchmark source
- Highlight areas where we exceed/lag industry averages
```

### Profile Comparison Analysis
```
Perform detailed comparison between multiple profiles:
- Primary profile: PROF-123 (current state)
- Comparison profiles: PROF-456 (target state), PROF-789 (industry benchmark)
- Comparison type: Comprehensive maturity analysis
- Include visualization of differences
- Generate specific recommendations for closing gaps
- Show progression pathways from current to target state
```

## 🧪 Testing & Development Support Prompts

### Test Scenario Generation
```
Generate comprehensive test scenarios for development and validation:
- Scenario types: Assessment workflows, gap analysis, implementation planning
- Create 3 different organization profiles representing various industries
- Include edge cases and boundary conditions
- Generate realistic assessment data for each scenario
- Provide expected outcomes for validation testing

This will support our development team's testing efforts and QA validation.
```

## 🎯 Advanced Workflow Examples

### Complete Assessment Lifecycle
```
Walk me through a complete cybersecurity assessment lifecycle using the MCP server:

1. **Initial Setup**: Create organization profile for "RegionalBank" (medium-sized financial services)
2. **Quick Assessment**: Perform rapid risk evaluation to identify critical areas
3. **Detailed Analysis**: Comprehensive maturity assessment across all functions  
4. **Gap Analysis**: Compare current state to industry best practices
5. **Planning**: Create implementation roadmap with cost estimates
6. **Tracking**: Set up progress monitoring and milestone tracking
7. **Reporting**: Generate executive summary and compliance reports
8. **Continuous Improvement**: Establish ongoing assessment and improvement cycle

Provide specific tool calls and parameters for each step.
```

### Regulatory Compliance Workflow
```
Help me achieve regulatory compliance using NIST CSF 2.0 as the foundation:

Target compliance frameworks:
- SOC 2 Type II (primary requirement)
- PCI DSS Level 1 (we process credit cards)
- State data protection regulations

Steps needed:
1. Map current NIST CSF implementation to compliance requirements
2. Identify gaps specific to each regulatory framework
3. Create compliance-focused implementation plan
4. Generate audit-ready documentation and evidence
5. Establish continuous monitoring for ongoing compliance
6. Prepare for external audit and certification

Focus on practical steps and realistic timelines for a medium-sized organization.
```

### Merger & Acquisition Assessment
```
Our company is acquiring a smaller technology firm. Help me assess their cybersecurity posture:

1. **Baseline Assessment**: Create profiles for both organizations
2. **Risk Analysis**: Identify cybersecurity risks in the acquisition
3. **Gap Analysis**: Compare security maturity levels
4. **Integration Planning**: Develop security integration roadmap
5. **Cost Analysis**: Estimate cybersecurity integration costs
6. **Due Diligence Report**: Generate executive summary for leadership
7. **Post-Merger Tracking**: Plan ongoing security monitoring

Consider regulatory requirements and business continuity during integration.
```

## 📊 Industry-Specific Prompt Examples

### Healthcare Organization
```
Conduct a NIST CSF 2.0 assessment specifically tailored for healthcare:
- Organization: Regional medical center (1,200 employees)
- Focus on HIPAA compliance and patient data protection
- Include medical device cybersecurity considerations
- Address telehealth and remote patient monitoring risks
- Generate compliance report covering both NIST CSF and HIPAA requirements
- Provide implementation guidance for healthcare-specific challenges
```

### Financial Services Firm
```
Perform comprehensive cybersecurity assessment for financial services:
- Organization: Community bank with online banking platform
- Emphasize PCI DSS and banking regulations compliance
- Focus on customer data protection and fraud prevention
- Include third-party risk management assessment
- Address regulatory examination readiness
- Generate board-ready report with risk quantification
```

### Manufacturing Company
```
Assess cybersecurity for manufacturing environment:
- Organization: Mid-size manufacturer with OT/IT convergence
- Include industrial control systems and IoT device risks
- Address supply chain cybersecurity challenges
- Focus on business continuity and operational resilience
- Consider international compliance requirements
- Generate implementation plan for OT security improvements
```

## 🔍 Troubleshooting & Optimization Prompts

### Performance Optimization
```
Help optimize our cybersecurity program performance:
1. Analyze current implementation efficiency using our assessment data
2. Identify bottlenecks in our security processes
3. Recommend automation opportunities to improve effectiveness
4. Calculate ROI for proposed security investments
5. Benchmark our security spending against industry averages
6. Provide recommendations for budget optimization

Focus on measurable improvements and quantified business impact.
```

### Gap Remediation Strategy
```
Our last assessment identified critical gaps. Help prioritize remediation:
- High-risk gaps: Incident response (RS function), Asset management (ID.AM)
- Medium-risk gaps: Access control (PR.AC), Security monitoring (DE.CM)
- Available budget: $500K over 12 months
- Limited resources: 3 security staff, 1 part-time consultant

Create a phased remediation strategy with:
- Risk-based prioritization
- Resource allocation optimization  
- Quick wins for immediate risk reduction
- Long-term strategic improvements
- Progress milestones and success metrics
```

## 💡 Best Practices for LLM Integration

### Prompt Optimization Tips

#### 1. Be Specific with Parameters
```
✅ Good: "Create profile for TechCorp (medium, technology sector, current state)"
❌ Vague: "Create a profile for my company"
```

#### 2. Chain Multiple Tools
```
✅ Good: "First create profile, then run quick assessment, then calculate risk score"
❌ Limited: "Just create a profile"
```

#### 3. Specify Output Requirements
```
✅ Good: "Generate executive report suitable for board presentation"
❌ Generic: "Create a report"
```

#### 4. Include Context and Constraints
```
✅ Good: "For healthcare organization with HIPAA requirements and $100K budget"  
❌ Missing: "Generate implementation plan"
```

### Common Prompt Patterns

#### Sequential Workflow Pattern
```
Please help me with a multi-step cybersecurity assessment:
1. [First tool] with parameters X, Y, Z
2. [Second tool] using results from step 1
3. [Third tool] to analyze and report findings
4. Provide summary and recommendations

Walk through each step and explain the results.
```

#### Comparative Analysis Pattern
```
I need to compare multiple aspects of our cybersecurity program:
- Compare current vs. target state using [tools]
- Benchmark against industry standards using [tools]
- Analyze trends over time using [tools]
- Generate comprehensive comparison report

Highlight key differences and provide actionable recommendations.
```

#### Decision Support Pattern
```
Help me make informed cybersecurity investment decisions:
- Analyze current risk exposure using [assessment tools]
- Evaluate potential solutions using [cost estimation tools]  
- Compare alternatives using [gap analysis tools]
- Generate business case using [reporting tools]

Provide clear recommendations with supporting data and ROI analysis.
```

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

## 📝 Template for Custom Prompts

Use this template to create your own optimized prompts:

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

---

**Remember**: These prompts are designed to leverage the full power of the NIST CSF 2.0 MCP Server. Customize them based on your specific organizational needs, industry requirements, and regulatory environment. The server's comprehensive tool suite can support everything from quick risk assessments to complex compliance reporting and long-term cybersecurity program management.

**Get Started**: Begin with the Quick Start prompts and gradually explore more advanced workflows as you become familiar with the server's capabilities. The combination of NIST CSF 2.0 framework guidance and AI-powered analysis provides unprecedented support for cybersecurity professionals at all levels.