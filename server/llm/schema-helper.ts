// Helper functions to provide schema context to AI
export function generateLeadsTableSchema(): string {
  return `
-- Leads Table Schema (PostgreSQL)
CREATE TABLE leads (
  id SERIAL PRIMARY KEY,
  customerId TEXT,
  contactId TEXT,
  customerName TEXT NOT NULL,
  firstCustomerSource TEXT,  -- Lead source: 'Instagram', 'Facebook', 'Referans', etc.
  formCustomerSource TEXT,
  webFormNote TEXT,          -- Contains project and lead type information
  requestDate TEXT,          -- Date format: YYYY-MM-DD or DD.MM.YYYY
  assignedPersonnel TEXT,    -- Sales rep name
  reminderPersonnel TEXT,
  followUpMade TEXT,         -- 'Evet' or 'Hayır'
  lastContactNote TEXT,
  lastContactResult TEXT,    -- Meeting outcome
  leadType TEXT,             -- 'satis' (sales) or 'kiralama' (rental)
  projectName TEXT,          -- Extracted from webFormNote
  status TEXT,               -- 'yeni', 'arama_yapildi', 'randevu_alindi', 'satis_yapildi', 'olumsuz'
  lastUpdateDate TEXT
);

-- Sample data patterns:
-- leadType: 'satis' = satılık/sales, 'kiralama' = kiralık/rental
-- firstCustomerSource: 'Instagram', 'Facebook', 'Referans', 'Web Sitesi', etc.
-- status: 'yeni', 'arama_yapildi', 'randevu_alindi', 'toplanti_yapildi', 'satis_yapildi', 'olumsuz'
-- assignedPersonnel: 'Alperen Yerlikaya', 'Reçber Özer', etc.
`;
}

export function generateSalesRepsTableSchema(): string {
  return `
-- Sales Representatives Table Schema
CREATE TABLE sales_reps (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,        -- Sales rep full name
  monthlyTarget INTEGER,     -- Monthly sales target
  isActive BOOLEAN DEFAULT true
);
`;
}

export function generateCommonQueries(): string {
  return `
-- Common Query Patterns:

-- 1. Lead count by source
SELECT firstCustomerSource, COUNT(*) as count 
FROM leads 
GROUP BY firstCustomerSource 
ORDER BY count DESC;

-- 2. Sales vs Rental distribution
SELECT 
  CASE 
    WHEN leadType = 'satis' THEN 'Satılık'
    WHEN leadType = 'kiralama' THEN 'Kiralık'
    ELSE 'Bilinmiyor'
  END as type,
  COUNT(*) as count
FROM leads 
GROUP BY leadType;

-- 3. Status distribution
SELECT status, COUNT(*) as count 
FROM leads 
GROUP BY status 
ORDER BY count DESC;

-- 4. Personnel performance
SELECT assignedPersonnel, COUNT(*) as total_leads,
  SUM(CASE WHEN status LIKE '%satis%' THEN 1 ELSE 0 END) as sales_made
FROM leads 
WHERE assignedPersonnel IS NOT NULL
GROUP BY assignedPersonnel
ORDER BY total_leads DESC;

-- 5. Monthly trends
SELECT 
  strftime('%Y-%m', requestDate) as month,
  COUNT(*) as leads_count
FROM leads 
WHERE requestDate IS NOT NULL
GROUP BY month
ORDER BY month;

-- 6. Instagram/Facebook lead analysis
SELECT 
  firstCustomerSource,
  leadType,
  COUNT(*) as count
FROM leads 
WHERE firstCustomerSource IN ('Instagram', 'Facebook')
GROUP BY firstCustomerSource, leadType;
`;
}

export function getTableSummary(): string {
  return `
Database: Real Estate Lead Tracking System (İNNO Gayrimenkul)

Tables:
1. leads - Main lead tracking table with customer info, sources, status, and sales data
2. sales_reps - Sales representative information and targets

Key Turkish Terms:
- satılık/satis = sales/for sale
- kiralık/kiralama = rental/for rent  
- personel = personnel/sales rep
- durum/status = lead status
- kaynak = source
- proje = project
- müşteri = customer
- randevu = appointment
- takip = follow-up
- olumsuz = negative/rejected
`;
}