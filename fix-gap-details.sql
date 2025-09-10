-- This is what the getGapAnalysisDetails should return instead
-- Return detailed subcategory-level gap calculations, not category aggregates

WITH current_assessments AS (
  SELECT 
    subcategory_id,
    implementation_level,
    maturity_score,
    confidence_level
  FROM assessments
  WHERE profile_id = ? -- current_profile_id
),
target_assessments AS (
  SELECT 
    subcategory_id,
    implementation_level,
    maturity_score,
    confidence_level
  FROM assessments
  WHERE profile_id = ? -- target_profile_id (could be same as current)
),
gap_calculations AS (
  SELECT 
    COALESCE(c.subcategory_id, t.subcategory_id) as subcategory_id,
    SUBSTR(COALESCE(c.subcategory_id, t.subcategory_id), 1, 2) as function_id,
    SUBSTR(COALESCE(c.subcategory_id, t.subcategory_id), 1, 5) as category_id,
    COALESCE(c.maturity_score, 0) as current_maturity,
    COALESCE(t.maturity_score, 5) as target_maturity,
    COALESCE(t.maturity_score, 5) - COALESCE(c.maturity_score, 0) as gap_score,
    CASE 
      WHEN COALESCE(c.maturity_score, 0) = 0 THEN 9
      WHEN COALESCE(t.maturity_score, 5) - COALESCE(c.maturity_score, 0) >= 3 THEN 8
      WHEN COALESCE(t.maturity_score, 5) - COALESCE(c.maturity_score, 0) >= 2 THEN 6
      ELSE 3
    END as effort_score,
    CASE SUBSTR(COALESCE(c.subcategory_id, t.subcategory_id), 1, 2)
      WHEN 'GV' THEN 1.5
      WHEN 'ID' THEN 1.3
      WHEN 'PR' THEN 1.4
      WHEN 'DE' THEN 1.2
      WHEN 'RS' THEN 1.1
      WHEN 'RC' THEN 1.0
      ELSE 1.0
    END * (COALESCE(t.maturity_score, 5) - COALESCE(c.maturity_score, 0)) as risk_score,
    c.implementation_level as current_implementation,
    t.implementation_level as target_implementation,
    s.name as subcategory_name
  FROM current_assessments c
  FULL OUTER JOIN target_assessments t 
    ON c.subcategory_id = t.subcategory_id
  LEFT JOIN subcategories s ON COALESCE(c.subcategory_id, t.subcategory_id) = s.subcategory_id
)
SELECT 
  *,
  ROW_NUMBER() OVER (ORDER BY risk_score DESC) as priority_rank
FROM gap_calculations
WHERE gap_score >= 0  -- Include all gaps, including zero gaps
ORDER BY risk_score DESC;