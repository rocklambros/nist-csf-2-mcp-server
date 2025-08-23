/**
 * Report Templates and Formatting Utilities
 */

export function generateHTMLReport(data: any, reportType: string): string {
  const timestamp = new Date().toISOString();
  const styles = getHTMLStyles();
  
  let content = '';
  switch (reportType) {
    case 'executive':
      content = generateExecutiveHTML(data);
      break;
    case 'technical':
      content = generateTechnicalHTML(data);
      break;
    case 'audit':
      content = generateAuditHTML(data);
      break;
    case 'progress':
      content = generateProgressHTML(data);
      break;
    default:
      content = '<p>Invalid report type</p>';
  }
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NIST CSF 2.0 ${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report</title>
  <style>${styles}</style>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
  <div class="report-container">
    <header>
      <h1>NIST CSF 2.0 ${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report</h1>
      <p class="timestamp">Generated: ${new Date(timestamp).toLocaleString()}</p>
    </header>
    ${content}
  </div>
</body>
</html>
  `;
}

function getHTMLStyles(): string {
  return `
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 20px;
      background: #f5f5f5;
    }
    .report-container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    header {
      border-bottom: 3px solid #0066cc;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    h1 {
      color: #0066cc;
      margin: 0 0 10px 0;
    }
    h2 {
      color: #333;
      border-bottom: 2px solid #e0e0e0;
      padding-bottom: 10px;
      margin-top: 30px;
    }
    .timestamp {
      color: #666;
      font-size: 14px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #e0e0e0;
    }
    th {
      background: #f8f9fa;
      font-weight: 600;
      color: #333;
    }
    .metric-card {
      display: inline-block;
      padding: 20px;
      margin: 10px;
      background: #f8f9fa;
      border-radius: 8px;
      min-width: 200px;
    }
    .metric-value {
      font-size: 32px;
      font-weight: bold;
      color: #0066cc;
    }
    .metric-label {
      color: #666;
      font-size: 14px;
      margin-top: 5px;
    }
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
    }
    .status-completed { background: #d4edda; color: #155724; }
    .status-on_track { background: #cce5ff; color: #004085; }
    .status-at_risk { background: #fff3cd; color: #856404; }
    .status-blocked { background: #f8d7da; color: #721c24; }
    .chart-container {
      margin: 30px 0;
      height: 400px;
      position: relative;
    }
    .progress-bar {
      width: 100%;
      height: 30px;
      background: #e0e0e0;
      border-radius: 15px;
      overflow: hidden;
      margin: 10px 0;
    }
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #0066cc, #0052a3);
      border-radius: 15px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
    }
  `;
}

function generateExecutiveHTML(data: any): string {
  const functionSummary = JSON.parse(data.function_summary || '[]');
  
  let html = `
    <section class="summary">
      <h2>Executive Summary</h2>
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-value">${data.avg_risk_score?.toFixed(1) || '0'}</div>
          <div class="metric-label">Average Risk Score</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${data.critical_risks || 0}</div>
          <div class="metric-label">Critical Risks</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${data.critical_gaps || 0}</div>
          <div class="metric-label">Critical Gaps</div>
        </div>
      </div>
    </section>
    
    <section class="function-scores">
      <h2>Function Maturity Scores</h2>
      <table>
        <thead>
          <tr>
            <th>Function</th>
            <th>Average Maturity</th>
            <th>Maturity %</th>
            <th>Progress</th>
          </tr>
        </thead>
        <tbody>
  `;
  
  functionSummary.forEach((func: any) => {
    const percentage = func.maturity_percentage || 0;
    html += `
      <tr>
        <td>${func.function_name}</td>
        <td>${func.avg_maturity}</td>
        <td>${percentage}%</td>
        <td>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${percentage}%">
              ${percentage}%
            </div>
          </div>
        </td>
      </tr>
    `;
  });
  
  html += `
        </tbody>
      </table>
    </section>
    
    <section class="charts">
      <h2>Maturity Overview</h2>
      <div class="chart-container">
        <canvas id="maturityChart"></canvas>
      </div>
      <script>
        const ctx = document.getElementById('maturityChart').getContext('2d');
        new Chart(ctx, {
          type: 'radar',
          data: {
            labels: ${JSON.stringify(functionSummary.map((f: any) => f.function_name))},
            datasets: [{
              label: 'Current Maturity',
              data: ${JSON.stringify(functionSummary.map((f: any) => f.avg_maturity))},
              backgroundColor: 'rgba(0, 102, 204, 0.2)',
              borderColor: 'rgba(0, 102, 204, 1)',
              borderWidth: 2
            }]
          },
          options: {
            scales: {
              r: {
                beginAtZero: true,
                max: 5
              }
            }
          }
        });
      </script>
    </section>
  `;
  
  return html;
}

function generateTechnicalHTML(data: any): string {
  const assessments = JSON.parse(data.subcategory_assessments || '[]');
  
  let html = `
    <section class="technical-details">
      <h2>Subcategory Assessment Details</h2>
      <table>
        <thead>
          <tr>
            <th>Subcategory ID</th>
            <th>Name</th>
            <th>Category</th>
            <th>Function</th>
            <th>Implementation</th>
            <th>Maturity</th>
          </tr>
        </thead>
        <tbody>
  `;
  
  assessments.forEach((item: any) => {
    html += `
      <tr>
        <td>${item.subcategory_id}</td>
        <td>${item.subcategory_name}</td>
        <td>${item.category_name}</td>
        <td>${item.function_name}</td>
        <td>${item.implementation_level || 'Not assessed'}</td>
        <td>${item.maturity_score || 0}/5</td>
      </tr>
    `;
  });
  
  html += `
        </tbody>
      </table>
    </section>
  `;
  
  return html;
}

function generateAuditHTML(data: any): string {
  const auditLog = JSON.parse(data.audit_log || '[]');
  const complianceSummary = JSON.parse(data.compliance_summary || '[]');
  
  let html = `
    <section class="audit-trail">
      <h2>Audit Trail</h2>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Activity</th>
            <th>Item</th>
            <th>Performed By</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
  `;
  
  auditLog.slice(0, 20).forEach((entry: any) => {
    html += `
      <tr>
        <td>${new Date(entry.activity_date).toLocaleDateString()}</td>
        <td>${entry.activity_type}</td>
        <td>${entry.item_id}</td>
        <td>${entry.performed_by}</td>
        <td>${entry.details}</td>
      </tr>
    `;
  });
  
  html += `
        </tbody>
      </table>
    </section>
    
    <section class="compliance">
      <h2>Compliance Coverage</h2>
      <table>
        <thead>
          <tr>
            <th>Framework</th>
            <th>Coverage %</th>
            <th>Mapped Controls</th>
            <th>Fully Covered</th>
            <th>Partially Covered</th>
            <th>Not Covered</th>
          </tr>
        </thead>
        <tbody>
  `;
  
  complianceSummary.forEach((comp: any) => {
    html += `
      <tr>
        <td>${comp.framework}</td>
        <td>${comp.coverage_percentage}%</td>
        <td>${comp.mapped_controls}</td>
        <td>${comp.fully_covered}</td>
        <td>${comp.partially_covered}</td>
        <td>${comp.not_covered}</td>
      </tr>
    `;
  });
  
  html += `
        </tbody>
      </table>
    </section>
  `;
  
  return html;
}

function generateProgressHTML(data: any): string {
  const recentUpdates = JSON.parse(data.recent_updates || '[]');
  
  let html = `
    <section class="progress-overview">
      <h2>Progress Overview</h2>
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-value">${Math.round(data.avg_completion || 0)}%</div>
          <div class="metric-label">Overall Completion</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${data.completed || 0}</div>
          <div class="metric-label">Completed Items</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${data.on_track || 0}</div>
          <div class="metric-label">On Track</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${data.blocked || 0}</div>
          <div class="metric-label">Blocked</div>
        </div>
      </div>
    </section>
    
    <section class="recent-updates">
      <h2>Recent Updates</h2>
      <table>
        <thead>
          <tr>
            <th>Subcategory</th>
            <th>Status</th>
            <th>Completion</th>
            <th>Last Updated</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
  `;
  
  recentUpdates.forEach((update: any) => {
    html += `
      <tr>
        <td>${update.subcategory_id}</td>
        <td><span class="status-badge status-${update.status}">${update.status}</span></td>
        <td>${update.completion_percentage}%</td>
        <td>${new Date(update.last_updated).toLocaleDateString()}</td>
        <td>${update.notes || '-'}</td>
      </tr>
    `;
  });
  
  html += `
        </tbody>
      </table>
    </section>
  `;
  
  return html;
}

export function formatDataAsCSV(data: any): string {
  const rows: string[] = [];
  
  // Convert JSON data to CSV rows
  if (data.assessments) {
    const assessments = JSON.parse(data.assessments);
    rows.push('Subcategory ID,Implementation Level,Maturity Score,Notes,Assessed At,Assessed By');
    assessments.forEach((a: any) => {
      rows.push(`"${a.subcategory_id}","${a.implementation_level}",${a.maturity_score},"${a.notes || ''}","${a.assessed_at}","${a.assessed_by || ''}"`);
    });
  }
  
  return rows.join('\n');
}

export function formatDataAsJSON(data: any): string {
  // Parse any stringified JSON fields
  const parsed: any = {};
  for (const key in data) {
    if (typeof data[key] === 'string' && (data[key].startsWith('[') || data[key].startsWith('{'))) {
      try {
        parsed[key] = JSON.parse(data[key]);
      } catch {
        parsed[key] = data[key];
      }
    } else {
      parsed[key] = data[key];
    }
  }
  
  return JSON.stringify(parsed, null, 2);
}