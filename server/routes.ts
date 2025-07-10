import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertLeadSchema, insertSalesRepSchema, insertSettingsSchema } from "@shared/schema";
import multer from "multer";
import * as XLSX from "xlsx";
import Papa from "papaparse";

// Enhanced function to extract both project name and lead type from WebForm Notu
function extractDataFromWebForm(webFormNote: string | undefined): { projectName?: string; leadType?: string } {
  if (!webFormNote || typeof webFormNote !== 'string') return {};
  
  const originalNote = webFormNote.trim();
  
  // Extract lead type (Satılık/Kiralık)
  let leadType: string | undefined;
  
  // Simplified and comprehensive lead type detection patterns
  const leadTypePatterns = [
    // KIRALIK patterns - check first for priority (all common variations)
    { 
      regex: /kiralık|kiraliq|kiralik|kırala|kıralı|krala|krali|kerala|keralı/i, 
      type: 'kiralama' 
    },
    // SATILIK patterns (all common variations)  
    { 
      regex: /satılık|satıliq|satilik|satlik|satlık|satılk|satlk|satış|satis/i, 
      type: 'satis' 
    }
  ];
  
  for (const pattern of leadTypePatterns) {
    if (pattern.regex.test(originalNote)) {
      leadType = pattern.type;
      break;
    }
    // Reset the regex lastIndex for global patterns
    pattern.regex.lastIndex = 0;
  }
  
  // Enhanced project name extraction patterns
  let projectName: string | undefined;
  
  // Real WebForm patterns - handles actual format: "/ Ilgilendigi Gayrimenkul Tipi :Satılık / Model Sanayi Merkezi"
  const projectPatterns = [
    // Specific pattern for "Model Sanayi Merkezi" - highest priority
    /\/\s*(Model\s+Sanayi\s+Merkezi)\s*$/gi,
    
    // General pattern for any "X Sanayi Merkezi" format
    /\/\s*([A-Za-zÇĞIŞÖÜİçğışöüi]+\s+Sanayi\s+Merkezi)\s*$/gi,
    
    // Pattern for project names ending with common Turkish real estate terms
    /\/\s*([A-Za-zÇĞIŞÖÜİçğışöüi][A-Za-zÇĞIŞÖÜİçğışöüi\s]*(?:Merkezi|Center|Residence|Plaza|Tower|City|Park|Proje|Konut|Sitesi|Complex|Mall|AVM))\s*$/gi,
    
    // Pattern after the last slash: "/ Project Name"
    /\/\s*([A-Za-zÇĞIŞÖÜİçğışöüi][A-Za-zÇĞIŞÖÜİçğışöüi\s]{2,40})\s*$/gi,
    
    // Legacy patterns for older format support
    /\b(Vadi\s+İstanbul\s+Residence)\b/gi,
    /\b(İstanbul\s+Park\s+Residence)\b/gi,
    /\b(Beşiktaş\s+Tower)\b/gi
  ];
  
  // Try each project pattern
  for (const pattern of projectPatterns) {
    const execResult = pattern.exec(originalNote);
    if (execResult) {
      // Get the first capture group if it exists, otherwise use full match and clean it
      let candidate = execResult[1] || execResult[0];
      
      // Clean up slashes and whitespace if using full match
      if (!execResult[1]) {
        candidate = candidate.replace(/^\/\s*/, '').replace(/\s*\/$/, '').trim();
      }
      
      // Remove common noise words and clean up
      candidate = candidate.replace(/\b(?:için|hakkında|ile|ilgili|ve|or|and)\b/gi, '').trim();
      candidate = candidate.replace(/\s+/g, ' '); // Normalize spaces
      
      if (candidate.length > 2) {
        projectName = candidate;
        break;
      }
    }
    // Reset the regex lastIndex for global patterns
    pattern.lastIndex = 0;
  }
  
  // Fallback: extract any capitalized words near real estate keywords
  if (!projectName) {
    const fallbackKeywords = ['proje', 'konut', 'residence', 'plaza', 'tower', 'city', 'park', 'sitesi', 'daire', 'ev', 'villa'];
    
    for (const keyword of fallbackKeywords) {
      const regex = new RegExp(`\\b([A-ZÇĞIŞÖÜİ][A-Za-zçğışöüi]+)\\s+${keyword}\\b`, 'gi');
      const matches = originalNote.match(regex);
      if (matches && matches.length > 0) {
        projectName = matches[0].trim();
        break;
      }
      
      // Try reverse pattern
      const reverseRegex = new RegExp(`\\b${keyword}\\s+([A-ZÇĞIŞÖÜİ][A-Za-zçğışöüi]+)\\b`, 'gi');
      const reverseMatches = originalNote.match(reverseRegex);
      if (reverseMatches && reverseMatches.length > 0) {
        projectName = reverseMatches[0].trim();
        break;
      }
    }
  }
  
  return { projectName, leadType };
}

// Legacy function for backward compatibility
function extractProjectNameFromWebForm(webFormNote: string | undefined): string | undefined {
  const result = extractDataFromWebForm(webFormNote);
  return result.projectName;
}

const upload = multer({ storage: multer.memoryStorage() });

// Helper function to map row data to lead schema with comprehensive Turkish column support
function mapRowToLead(row: any): any {
  // Enhanced date parsing function to handle multiple formats
  const parseDate = (dateValue: any): string => {
    if (!dateValue || dateValue === '') return '';
    
    const dateStr = String(dateValue).trim();
    
    // Try DD.MM.YYYY format (Turkish standard)
    if (dateStr.match(/^\d{1,2}\.\d{1,2}\.\d{4}$/)) {
      const [day, month, year] = dateStr.split('.');
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    // Try DD/MM/YYYY format
    if (dateStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
      const [day, month, year] = dateStr.split('/');
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    // Try MM.DD.YYYY format (check if first number > 12 to distinguish from DD.MM.YYYY)
    if (dateStr.match(/^\d{1,2}\.\d{1,2}\.\d{4}$/)) {
      const [first, second, year] = dateStr.split('.');
      if (parseInt(first) > 12) {
        // First number is likely day, so DD.MM.YYYY
        return `${year}-${second.padStart(2, '0')}-${first.padStart(2, '0')}`;
      } else {
        // MM.DD.YYYY format
        return `${year}-${first.padStart(2, '0')}-${second.padStart(2, '0')}`;
      }
    }
    
    // Try YYYY-MM-DD format (already correct)
    if (dateStr.match(/^\d{4}-\d{1,2}-\d{1,2}$/)) {
      const parts = dateStr.split('-');
      return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    }
    
    // Try parsing as Date object for other formats
    const parsedDate = new Date(dateStr);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate.toISOString().split('T')[0];
    }
    
    return ''; // Return empty if no valid date format found
  };

  // Core required fields with Turkish mapping and enhanced date parsing
  const customerName = row['Müşteri Adı Soyadı'] || row['Müşteri Adı'] || row.customerName || row.name || row.Name || "";
  const requestDate = parseDate(row['Talep Geliş Tarihi'] || row['Talep Tarihi'] || row.requestDate || row.date);
  const assignedPersonnel = row['Atanan Personel'] || row['Satış Temsilcisi'] || row.assignedPersonnel || row.salesRep || "";
  
  // Enhanced lead type detection from WebForm Notu and other columns
  let leadType = 'kiralama'; // Default to kiralama
  
  // First try the Lead Tipi column if it exists
  const leadTypeValue = row['Lead Tipi'] || row.leadType || "";
  if (typeof leadTypeValue === 'string') {
    const normalized = leadTypeValue.toLowerCase().trim();
    if (normalized.includes('satış') || normalized.includes('satis') || normalized.includes('sale')) {
      leadType = 'satis';
    }
  }
  
  // Enhanced: Extract lead type from WebForm Notu if not found in Lead Tipi
  const webFormNote = row['WebForm Notu'] || row['Web Form Notu'] || row.webFormNote || "";
  const webFormData = extractDataFromWebForm(webFormNote);
  if (webFormData.leadType) {
    leadType = webFormData.leadType; // Override with WebForm detected type
  }
  
  // Optional: Debug logging for WebForm extraction during file imports
  // console.log(`WebForm Extraction - Project: "${webFormData.projectName || 'None'}", Type: "${webFormData.leadType || 'None'}"`);  
  
  // FIXED: Status derivation EXCLUSIVELY from SON GORUSME SONUCU column
  let status = 'Tanımsız'; // Default to undefined status if no SON GORUSME SONUCU
  const sonGorusmeSonucu = row['SON GORUSME SONUCU'] || row['SON GÖRÜŞME SONUCU'] || row['Son Görüşme Sonucu'] || row.lastMeetingResult || "";
  
  // Primary and ONLY status determination from SON GORUSME SONUCU
  if (sonGorusmeSonucu && sonGorusmeSonucu.trim()) {
    // Use the exact value from SON GORUSME SONUCU as dynamic status
    status = sonGorusmeSonucu.trim();
  }
  // NO fallback to other fields - if SON GORUSME SONUCU is empty, status remains "Tanımsız"
  
  // Helper function to safely get value or undefined
  const getValue = (val: any) => {
    if (val === null || val === undefined || val === '') return undefined;
    return val;
  };

  const getIntValue = (val: any) => {
    if (val === null || val === undefined || val === '') return undefined;
    const parsed = parseInt(val);
    return isNaN(parsed) ? undefined : parsed;
  };

  return {
    customerName,
    requestDate,
    leadType,
    assignedPersonnel,
    status,
    // Comprehensive Turkish column mapping - all 37 fields
    customerId: getValue(row['Müşteri ID']) || getValue(row.customerId),
    contactId: getValue(row['İletişim ID']) || getValue(row.contactId),
    firstCustomerSource: getValue(row['İlk Müşteri Kaynağı']) || getValue(row.firstCustomerSource),
    formCustomerSource: getValue(row['Form Müşteri Kaynağı']) || getValue(row.formCustomerSource),
    webFormNote: getValue(row['WebForm Notu']) || getValue(row['Web Form Notu']) || getValue(row.webFormNote),
    projectName: webFormData.projectName || extractProjectNameFromWebForm(getValue(row['WebForm Notu']) || getValue(row['Web Form Notu']) || getValue(row.webFormNote)),
    infoFormLocation1: getValue(row['İnfo Form Geliş Yeri']) || getValue(row.infoFormLocation1),
    infoFormLocation2: getValue(row['İnfo Form Geliş Yeri 2']) || getValue(row.infoFormLocation2),
    infoFormLocation3: getValue(row['İnfo Form Geliş Yeri 3']) || getValue(row.infoFormLocation3),
    infoFormLocation4: getValue(row['İnfo Form Geliş Yeri 4']) || getValue(row.infoFormLocation4),
    reminderPersonnel: getValue(row['Hatıırlatma Personeli']) || getValue(row.reminderPersonnel),
    wasCalledBack: getValue(row['GERİ DÖNÜŞ YAPILDI MI? (Müşteri Arandı mı?)']) || getValue(row.wasCalledBack),
    webFormPoolDate: getValue(row['Web Form Havuz Oluşturma Tarihi']) || getValue(row.webFormPoolDate),
    formSystemDate: getValue(row['Form Sistem Olusturma Tarihi']) || getValue(row.formSystemDate),
    assignmentTimeDiff: getValue(row['Atama Saat Farkı']) || getValue(row.assignmentTimeDiff),
    responseTimeDiff: getValue(row['Dönüş Saat Farkı']) || getValue(row.responseTimeDiff),
    outgoingCallSystemDate: getValue(row['Giden Arama Sistem Oluşturma Tarihi']) || getValue(row.outgoingCallSystemDate),
    customerResponseDate: getValue(row['Müşteri Geri Dönüş Tarihi (Giden Arama)']) || getValue(row.customerResponseDate),
    wasEmailSent: getValue(row['GERİ DÖNÜŞ YAPILDI MI? (Müşteriye Mail Gönderildi mi?)']) || getValue(row.wasEmailSent),
    customerEmailResponseDate: getValue(row['Müşteri Mail Geri Dönüş Tarihi']) || getValue(row.customerEmailResponseDate),
    unreachableByPhone: getValue(row['Telefonla Ulaşılamayan Müşteriler']) || getValue(row.unreachableByPhone),
    daysWaitingResponse: getIntValue(row['Kaç Gündür Geri Dönüş Bekliyor']) || getIntValue(row.daysWaitingResponse),
    daysToResponse: getIntValue(row['Kaç Günde Geri Dönüş Yapılmış (Süre)']) || getIntValue(row.daysToResponse),
    callNote: getValue(row['GERİ DÖNÜŞ NOTU (Giden Arama Notu)']) || getValue(row['Arama Notu']) || getValue(row.callNote),
    emailNote: getValue(row['GERİ DÖNÜŞ NOTU (Giden Mail Notu)']) || getValue(row.emailNote),
    oneOnOneMeeting: getValue(row['Birebir Görüşme Yapıldı mı ?']) || getValue(row['Birebir Görüşme Yapıldı mı?']) || getValue(row.oneOnOneMeeting),
    meetingDate: getValue(row['Birebir Görüşme Tarihi']) || getValue(row.meetingDate),
    responseResult: getValue(row['Dönüş Görüşme Sonucu']) || getValue(row.responseResult),
    negativeReason: getValue(row['Dönüş Olumsuzluk Nedeni']) || getValue(row.negativeReason),
    wasSaleMade: getValue(row['Müşteriye Satış Yapıldı Mı ?']) || getValue(row['Müşteriye Satış Yapıldı Mı?']) || getValue(row.wasSaleMade),
    saleCount: getIntValue(row['Satış Adedi']) || getIntValue(row.saleCount),
    appointmentDate: getValue(row['Randevu Tarihi']) || getValue(row.appointmentDate),
    lastMeetingNote: getValue(row['SON GORUSME NOTU']) || getValue(row['Son Görüşme Notu']) || getValue(row.lastMeetingNote),
    lastMeetingResult: getValue(row['SON GORUSME SONUCU']) || getValue(row['Son Görüşme Sonucu']) || getValue(row.lastMeetingResult),
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Leads endpoints
  app.get("/api/leads", async (req, res) => {
    try {
      const { startDate, endDate, salesRep, leadType, status, month, year } = req.query;
      
      // Enhanced filtering with automatic month logic
      let finalStartDate = startDate as string;
      let finalEndDate = endDate as string;
      
      // Auto-select full month logic
      if (month && year) {
        const monthNum = parseInt(month as string);
        const yearNum = parseInt(year as string);
        finalStartDate = `${yearNum}-${monthNum.toString().padStart(2, '0')}-01`;
        const lastDay = new Date(yearNum, monthNum, 0).getDate();
        finalEndDate = `${yearNum}-${monthNum.toString().padStart(2, '0')}-${lastDay}`;
      }
      
      if (finalStartDate || finalEndDate || salesRep || leadType || status) {
        const filteredLeads = await storage.getLeadsByFilter({
          startDate: finalStartDate,
          endDate: finalEndDate,
          salesRep: salesRep as string,
          leadType: leadType as string,
          status: status as string,
        });
        res.json(filteredLeads);
      } else {
        const leads = await storage.getLeads();
        res.json(leads);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch leads" });
    }
  });

  app.post("/api/leads", async (req, res) => {
    try {
      let leadData = insertLeadSchema.parse(req.body);
      
      // Apply WebForm extraction if webFormNote is present
      if (leadData.webFormNote) {
        const webFormData = extractDataFromWebForm(leadData.webFormNote);
        
        // Override project name if extracted from WebForm
        if (webFormData.projectName) {
          leadData.projectName = webFormData.projectName;
        }
        
        // Always override lead type if extracted from WebForm (WebForm detection has priority)
        if (webFormData.leadType) {
          leadData.leadType = webFormData.leadType;
        }
      }
      
      const lead = await storage.createLead(leadData);
      res.status(201).json(lead);
    } catch (error) {
      res.status(400).json({ message: "Invalid lead data", error });
    }
  });

  app.put("/api/leads/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const leadData = insertLeadSchema.partial().parse(req.body);
      const lead = await storage.updateLead(id, leadData);
      
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }
      
      res.json(lead);
    } catch (error) {
      res.status(400).json({ message: "Invalid lead data", error });
    }
  });

  app.delete("/api/leads/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteLead(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Lead not found" });
      }
      
      res.json({ message: "Lead deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete lead" });
    }
  });

  // Clear all leads endpoint
  app.delete("/api/leads/clear", async (req, res) => {
    try {
      await storage.clearAllLeads();
      res.json({ message: "All leads cleared successfully" });
    } catch (error) {
      res.status(500).json({ message: "Error clearing leads" });
    }
  });

  // File upload endpoint
  app.post("/api/leads/import", upload.single("file"), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const { buffer, mimetype, originalname } = req.file;
      let leads: any[] = [];

      if (mimetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" || 
          originalname.endsWith('.xlsx')) {
        // Parse Excel file
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        leads = XLSX.utils.sheet_to_json(worksheet);
      } else if (mimetype === "text/csv" || originalname.endsWith('.csv')) {
        // Parse CSV file
        const csvText = buffer.toString('utf-8');
        const result = Papa.parse(csvText, { header: true });
        leads = result.data;
      } else if (mimetype === "application/json" || originalname.endsWith('.json')) {
        // Parse JSON file
        const jsonText = buffer.toString('utf-8');
        leads = JSON.parse(jsonText);
      } else {
        return res.status(400).json({ message: "Unsupported file format" });
      }

      // Log successful file processing
      console.log(`Processing ${originalname}: ${leads.length} leads found`);

      // Extract unique sales personnel names and auto-create them
      const uniquePersonnel = new Set<string>();
      leads.forEach(lead => {
        const mappedData = mapRowToLead(lead);
        if (mappedData.assignedPersonnel && mappedData.assignedPersonnel.trim()) {
          uniquePersonnel.add(mappedData.assignedPersonnel.trim());
        }
      });

      // Auto-create sales reps for any new personnel
      for (const personnelName of Array.from(uniquePersonnel)) {
        try {
          await storage.createSalesRepByName(personnelName);
        } catch (error) {
          console.log(`Note: Sales rep ${personnelName} already exists or could not be created`);
        }
      }

      // Enhanced validation and warnings
      const createdLeads = [];
      const errors = [];
      const validationWarnings = {
        dateFormatIssues: 0,
        missingStatusCount: 0,
        totalRecords: leads.length,
        supportedDateFormats: ['DD.MM.YYYY', 'DD/MM/YYYY', 'MM.DD.YYYY', 'YYYY-MM-DD'],
        statusColumnPresent: false,
        dateColumnPresent: false
      };

      // Check if critical columns are present
      if (leads.length > 0) {
        const firstRow = leads[0];
        validationWarnings.dateColumnPresent = !!(
          firstRow['Talep Geliş Tarihi'] || 
          firstRow['Talep Tarihi'] || 
          firstRow['requestDate'] || 
          firstRow['date']
        );
        
        validationWarnings.statusColumnPresent = !!(
          firstRow['SON GORUSME SONUCU'] || 
          firstRow['SON GÖRÜŞME SONUCU'] || 
          firstRow['Son Görüşme Sonucu'] || 
          firstRow['lastMeetingResult']
        );
      }

      for (let i = 0; i < leads.length; i++) {
        try {
          const mappedData = mapRowToLead(leads[i]);
          
          // Skip empty rows
          if (!mappedData.customerName && !mappedData.assignedPersonnel) {
            continue;
          }

          // Track validation issues
          if (!mappedData.requestDate || mappedData.requestDate === '') {
            validationWarnings.dateFormatIssues++;
          }
          
          if (!mappedData.status || mappedData.status === 'Tanımsız') {
            validationWarnings.missingStatusCount++;
          }
          
          const leadData = insertLeadSchema.parse(mappedData);
          const lead = await storage.createLead(leadData);
          createdLeads.push(lead);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          errors.push({ row: i + 1, error: errorMessage });
        }
      }

      res.json({
        message: `Successfully imported ${createdLeads.length} leads`,
        imported: createdLeads.length,
        errors: errors.length,
        errorDetails: errors,
        validationWarnings
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to import file", error: (error as Error).message });
    }
  });

  // Sales reps endpoints
  app.get("/api/sales-reps", async (req, res) => {
    try {
      const salesReps = await storage.getSalesReps();
      res.json(salesReps);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch sales reps" });
    }
  });

  app.post("/api/sales-reps", async (req, res) => {
    try {
      const salesRepData = insertSalesRepSchema.parse(req.body);
      const salesRep = await storage.createSalesRep(salesRepData);
      res.status(201).json(salesRep);
    } catch (error) {
      res.status(400).json({ message: "Invalid sales rep data", error });
    }
  });

  app.put("/api/sales-reps/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const salesRepData = insertSalesRepSchema.partial().parse(req.body);
      const salesRep = await storage.updateSalesRep(id, salesRepData);
      
      if (!salesRep) {
        return res.status(404).json({ message: "Sales rep not found" });
      }
      
      res.json(salesRep);
    } catch (error) {
      res.status(400).json({ message: "Invalid sales rep data", error });
    }
  });

  // Export endpoints
  app.get("/api/export/:format", async (req, res) => {
    try {
      const { format } = req.params;
      const { startDate, endDate, salesRep } = req.query;
      
      const leads = await storage.getLeadsByFilter({
        startDate: startDate as string,
        endDate: endDate as string,
        salesRep: salesRep as string,
      });
      
      const salesReps = await storage.getSalesReps();
      
      if (format === 'json') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="lead-report-${new Date().toISOString().split('T')[0]}.json"`);
        res.json({ leads, salesReps, exportDate: new Date().toISOString() });
      } else if (format === 'excel') {
        // For Excel export, we'll send structured data that the frontend can convert
        res.setHeader('Content-Type', 'application/json');
        res.json({ 
          format: 'excel',
          data: { leads, salesReps },
          exportDate: new Date().toISOString()
        });
      } else if (format === 'pdf') {
        // For PDF export, send structured data for frontend rendering
        res.setHeader('Content-Type', 'application/json');
        res.json({ 
          format: 'pdf',
          data: { leads, salesReps },
          exportDate: new Date().toISOString()
        });
      } else {
        res.status(400).json({ message: "Unsupported export format" });
      }
    } catch (error) {
      res.status(500).json({ message: "Export failed", error: (error as Error).message });
    }
  });

  // Settings endpoints
  app.get("/api/settings", async (req, res) => {
    try {
      const settings = await storage.getSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  app.post("/api/settings", async (req, res) => {
    try {
      const settingData = insertSettingsSchema.parse(req.body);
      const setting = await storage.setSetting(settingData);
      res.json(setting);
    } catch (error) {
      res.status(400).json({ message: "Invalid setting data", error });
    }
  });

  // Export endpoints
  // Enhanced Export endpoint with comprehensive data and dynamic status support
  app.get("/api/export/excel", async (req, res) => {
    try {
      const { startDate, endDate, salesRep, leadType, month, year } = req.query;
      
      // Enhanced filtering with automatic month logic
      let finalStartDate = startDate as string;
      let finalEndDate = endDate as string;
      
      if (month && year) {
        const monthNum = parseInt(month as string);
        const yearNum = parseInt(year as string);
        finalStartDate = `${yearNum}-${monthNum.toString().padStart(2, '0')}-01`;
        const lastDay = new Date(yearNum, monthNum, 0).getDate();
        finalEndDate = `${yearNum}-${monthNum.toString().padStart(2, '0')}-${lastDay}`;
      }
      
      const leads = await storage.getLeadsByFilter({
        startDate: finalStartDate,
        endDate: finalEndDate,
        salesRep: salesRep as string,
        leadType: leadType as string,
      });

      // Create workbook with comprehensive data
      const workbook = XLSX.utils.book_new();
      
      // Generate filename with period information
      const periodInfo = month && year ? 
        `${getMonthName(parseInt(month as string))}_${year}` : 
        finalStartDate && finalEndDate ? 
          `${finalStartDate}_to_${finalEndDate}` : 
          new Date().toISOString().split('T')[0];
      
      // Main leads worksheet with all comprehensive data
      const worksheetData = leads.map(lead => ({
        'Müşteri ID': lead.customerId || '',
        'İletişim ID': lead.contactId || '',
        'Müşteri Adı Soyadı': lead.customerName,
        'İlk Müşteri Kaynağı': lead.firstCustomerSource || '',
        'Form Müşteri Kaynağı': lead.formCustomerSource || '',
        'WebForm Notu': lead.webFormNote || '',
        'Talep Geliş Tarihi': lead.requestDate,
        'İnfo Form Geliş Yeri': lead.infoFormLocation1 || '',
        'İnfo Form Geliş Yeri 2': lead.infoFormLocation2 || '',
        'İnfo Form Geliş Yeri 3': lead.infoFormLocation3 || '',
        'İnfo Form Geliş Yeri 4': lead.infoFormLocation4 || '',
        'Atanan Personel': lead.assignedPersonnel,
        'Lead Tipi': lead.leadType === 'kiralama' ? 'Kiralama' : 'Satış',
        'Son Görüşme Sonucu (Durum)': lead.status,
        'Müşteri Geri Dönüş Tarihi': lead.customerResponseDate || '',
        'Birebir Görüşme Yapıldı mı?': lead.oneOnOneMeeting || '',
        'Birebir Görüşme Tarihi': lead.meetingDate || '',
        'Dönüş Görüşme Sonucu': lead.responseResult || '',
        'Dönüş Olumsuzluk Nedeni': lead.negativeReason || '',
        'Müşteriye Satış Yapıldı Mı?': lead.wasSaleMade || '',
        'Satış Adedi': lead.saleCount || 0,
        'Randevu Tarihi': lead.appointmentDate || '',
        'Son Görüşme Notu': lead.lastMeetingNote || '',
        'Geri Dönüş Notu (Arama)': lead.callNote || '',
        'Geri Dönüş Notu (Mail)': lead.emailNote || ''
      }));

      const worksheet = XLSX.utils.json_to_sheet(worksheetData);
      
      // Add summary statistics worksheet
      const stats = leads.reduce((acc, lead) => {
        acc[lead.status] = (acc[lead.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const summaryData = Object.entries(stats).map(([status, count]) => ({
        'Durum': status,
        'Adet': count,
        'Yüzde': `${((count / leads.length) * 100).toFixed(1)}%`
      }));
      
      const summaryWorksheet = XLSX.utils.json_to_sheet(summaryData);
      
      XLSX.utils.book_append_sheet(workbook, worksheet, "Detaylar");
      XLSX.utils.book_append_sheet(workbook, summaryWorksheet, "Özet");

      // Generate buffer
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="LeadRaporu_${periodInfo}.xlsx"`);
      res.send(excelBuffer);
    } catch (error) {
      res.status(500).json({ message: "Failed to export Excel", error: (error as Error).message });
    }
  });

  function getMonthName(month: number): string {
    const months = [
      'Ocak', 'Subat', 'Mart', 'Nisan', 'Mayis', 'Haziran',
      'Temmuz', 'Agustos', 'Eylul', 'Ekim', 'Kasim', 'Aralik'
    ];
    return months[month - 1] || 'Bilinmiyor';
  }

  app.get("/api/export/json", async (req, res) => {
    try {
      const { startDate, endDate, salesRep, leadType } = req.query;
      const leads = await storage.getLeadsByFilter({
        startDate: startDate as string,
        endDate: endDate as string,
        salesRep: salesRep as string,
        leadType: leadType as string,
      });

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="lead-raporu-${new Date().toISOString().split('T')[0]}.json"`);
      res.json(leads);
    } catch (error) {
      res.status(500).json({ message: "Failed to export JSON", error: (error as Error).message });
    }
  });

  // Enhanced Statistics endpoint with dynamic status grouping and date filtering
  app.get("/api/stats", async (req, res) => {
    try {
      const { startDate, endDate, salesRep, leadType, month, year } = req.query;
      
      // Enhanced filtering with automatic month logic
      let finalStartDate = startDate as string;
      let finalEndDate = endDate as string;
      
      // Auto-select full month logic
      if (month && year) {
        const monthNum = parseInt(month as string);
        const yearNum = parseInt(year as string);
        finalStartDate = `${yearNum}-${monthNum.toString().padStart(2, '0')}-01`;
        const lastDay = new Date(yearNum, monthNum, 0).getDate();
        finalEndDate = `${yearNum}-${monthNum.toString().padStart(2, '0')}-${lastDay}`;
      }
      
      const leads = await storage.getLeadsByFilter({
        startDate: finalStartDate,
        endDate: finalEndDate,
        salesRep: salesRep as string,
        leadType: leadType as string,
      });

      // Dynamic status grouping based on SON GORUSME SONUCU values
      const byStatus = leads.reduce((acc, lead) => {
        const status = lead.status || 'yeni';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Enhanced statistics with percentage calculations
      const totalLeads = leads.length;
      const stats = {
        totalLeads,
        byStatus,
        byStatusWithPercentages: Object.keys(byStatus).map(status => ({
          status,
          count: byStatus[status],
          percentage: totalLeads > 0 ? Math.round((byStatus[status] / totalLeads) * 100) : 0
        })),
        byType: leads.reduce((acc, lead) => {
          acc[lead.leadType] = (acc[lead.leadType] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        bySalesRep: leads.reduce((acc, lead) => {
          const rep = lead.assignedPersonnel || 'Belirtilmemiş';
          acc[rep] = (acc[rep] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        dateRange: {
          startDate: finalStartDate,
          endDate: finalEndDate,
          isMonthFilter: !!(month && year)
        }
      };

      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // New endpoint for getting all unique status values from data
  app.get("/api/status-values", async (req, res) => {
    try {
      const leads = await storage.getLeads();
      const statusSet = new Set(leads.map(lead => lead.status));
      const uniqueStatuses = Array.from(statusSet).filter(Boolean);
      res.json(uniqueStatuses);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch status values" });
    }
  });

  // Duplicate detection endpoint
  app.get("/api/duplicates", async (_req, res) => {
    try {
      const leads = await storage.getLeads();
      const duplicates: { [key: string]: any[] } = {};
      const duplicateStats = {
        totalLeads: leads.length,
        duplicateGroups: 0,
        duplicateCount: 0,
        duplicatePercentage: 0
      };

      // Group by customer ID and contact ID
      const customerIdGroups: { [key: string]: any[] } = {};
      const contactIdGroups: { [key: string]: any[] } = {};

      leads.forEach(lead => {
        if (lead.customerId) {
          if (!customerIdGroups[lead.customerId]) {
            customerIdGroups[lead.customerId] = [];
          }
          customerIdGroups[lead.customerId].push(lead);
        }
        
        if (lead.contactId) {
          if (!contactIdGroups[lead.contactId]) {
            contactIdGroups[lead.contactId] = [];
          }
          contactIdGroups[lead.contactId].push(lead);
        }
      });

      // Find duplicates
      Object.entries(customerIdGroups).forEach(([id, group]) => {
        if (group.length > 1) {
          duplicates[`customer_${id}`] = group;
          duplicateStats.duplicateGroups++;
          duplicateStats.duplicateCount += group.length - 1;
        }
      });

      Object.entries(contactIdGroups).forEach(([id, group]) => {
        if (group.length > 1 && !duplicates[`customer_${id}`]) {
          duplicates[`contact_${id}`] = group;
          duplicateStats.duplicateGroups++;
          duplicateStats.duplicateCount += group.length - 1;
        }
      });

      duplicateStats.duplicatePercentage = leads.length > 0 
        ? Math.round((duplicateStats.duplicateCount / leads.length) * 100) 
        : 0;

      res.json({ duplicates, stats: duplicateStats });
    } catch (error) {
      console.error("Error detecting duplicates:", error);
      res.status(500).json({ error: "Failed to detect duplicates" });
    }
  });

  // Negative lead analysis endpoint
  app.get("/api/negative-analysis", async (_req, res) => {
    try {
      const leads = await storage.getLeads();
      const negativeLeads = leads.filter(lead => 
        lead.status?.toLowerCase().includes('olumsuz') || 
        lead.negativeReason
      );

      const reasonCounts: { [key: string]: number } = {};
      const personnelCounts: { [key: string]: number } = {};

      negativeLeads.forEach(lead => {
        const reason = lead.negativeReason || 'Belirtilmemiş';
        const personnel = lead.assignedPersonnel || 'Atanmamış';
        
        reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
        personnelCounts[personnel] = (personnelCounts[personnel] || 0) + 1;
      });

      const totalNegative = negativeLeads.length;
      const reasonAnalysis = Object.entries(reasonCounts).map(([reason, count]) => ({
        reason,
        count,
        percentage: totalNegative > 0 ? Math.round((count / totalNegative) * 100) : 0
      }));

      const personnelAnalysis = Object.entries(personnelCounts).map(([personnel, count]) => ({
        personnel,
        count,
        percentage: totalNegative > 0 ? Math.round((count / totalNegative) * 100) : 0
      }));

      res.json({
        totalNegative,
        totalLeads: leads.length,
        negativePercentage: leads.length > 0 ? Math.round((totalNegative / leads.length) * 100) : 0,
        reasonAnalysis: reasonAnalysis.sort((a, b) => b.count - a.count),
        personnelAnalysis: personnelAnalysis.sort((a, b) => b.count - a.count),
        negativeLeads
      });
    } catch (error) {
      console.error("Error in negative analysis:", error);
      res.status(500).json({ error: "Failed to perform negative analysis" });
    }
  });

  // Project analysis endpoint
  app.get("/api/project-analysis", async (_req, res) => {
    try {
      const leads = await storage.getLeads();
      const projectCounts: { [key: string]: number } = {};
      const projectLeadTypes: { [key: string]: { kiralama: number, satis: number } } = {};

      leads.forEach(lead => {
        const project = lead.projectName || 'Proje Belirtilmemiş';
        projectCounts[project] = (projectCounts[project] || 0) + 1;
        
        if (!projectLeadTypes[project]) {
          projectLeadTypes[project] = { kiralama: 0, satis: 0 };
        }
        
        if (lead.leadType === 'kiralama') {
          projectLeadTypes[project].kiralama++;
        } else if (lead.leadType === 'satis') {
          projectLeadTypes[project].satis++;
        }
      });

      const projectAnalysis = Object.entries(projectCounts).map(([project, count]) => ({
        project,
        count,
        percentage: leads.length > 0 ? Math.round((count / leads.length) * 100) : 0,
        kiralama: projectLeadTypes[project].kiralama,
        satis: projectLeadTypes[project].satis
      }));

      res.json({
        totalProjects: Object.keys(projectCounts).length,
        projectAnalysis: projectAnalysis.sort((a, b) => b.count - a.count)
      });
    } catch (error) {
      console.error("Error in project analysis:", error);
      res.status(500).json({ error: "Failed to perform project analysis" });
    }
  });

  // Takipte (Follow-up) data endpoints
  let takipteStorage: any[] = [];

  app.post("/api/takipte/import", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      console.log(`Processing Takipte file: ${req.file.originalname}`);

      // Parse the takipte file
      const jsonData: any[] = [];
      const extension = req.file.originalname.split('.').pop()?.toLowerCase();

      if (extension === 'xlsx' || extension === 'xls') {
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        jsonData.push(...XLSX.utils.sheet_to_json(worksheet));
      } else if (extension === 'csv') {
        const csvText = req.file.buffer.toString('utf8');
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            jsonData.push(...results.data);
          }
        });
      }
      
      // Debug: log first few items to see the structure
      console.log('Sample data structure:', JSON.stringify(jsonData.slice(0, 1), null, 2));
      console.log('Available columns:', Object.keys(jsonData[0] || {}));
      
      // Store in memory (in production, this would go to database)
      // More flexible filtering - accept any row that has at least one meaningful column
      takipteStorage = jsonData.filter(item => {
        const hasCustomerInfo = item['Müşteri Adı Soyadı'] || item['Müşteri Adı'] || item.customerName || item['Customer Name'];
        const hasId = item['Müşteri ID'] || item['İletişim ID'] || item.customerId || item.contactId;
        const hasAnyData = Object.keys(item).some(key => item[key] && item[key].toString().trim() !== '');
        
        return hasCustomerInfo || hasId || hasAnyData;
      });
      
      console.log(`Processed ${takipteStorage.length} takipte records`);
      
      res.json({
        message: "Takipte file imported successfully",
        imported: takipteStorage.length,
        sampleData: takipteStorage.slice(0, 3) // Return sample for verification
      });
    } catch (error) {
      console.error("Error importing takipte file:", error);
      res.status(500).json({ 
        message: "Failed to import takipte file", 
        error: (error as Error).message 
      });
    }
  });

  app.get("/api/takipte", async (req, res) => {
    try {
      const { startDate, endDate, month, year } = req.query;
      
      let filteredData = takipteStorage;
      
      // Apply date filtering if parameters are provided
      if (startDate || endDate || month || year) {
        filteredData = takipteStorage.filter(item => {
          const dateStr = item.Tarih || item.date || '';
          if (!dateStr) return true; // Include items without dates
          
          const itemDate = new Date(dateStr);
          if (isNaN(itemDate.getTime())) return true; // Include items with invalid dates
          
          // Year filter
          if (year && itemDate.getFullYear().toString() !== year) return false;
          
          // Month filter (1-12 to 01-12)
          if (month && (itemDate.getMonth() + 1).toString().padStart(2, '0') !== month) return false;
          
          // Date range filter
          if (startDate && itemDate < new Date(startDate as string)) return false;
          if (endDate && itemDate > new Date(endDate as string)) return false;
          
          return true;
        });
      }
      
      res.json(filteredData);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch takipte data" });
    }
  });

  app.get("/api/enhanced-stats", async (req, res) => {
    try {
      const { startDate, endDate, month, year, salesRep, leadType } = req.query;
      
      // Get regular lead data with all possible filters
      const leads = await storage.getLeadsByFilter({
        startDate: startDate as string,
        endDate: endDate as string,
        month: month as string,
        year: year as string,
        salesRep: salesRep as string,
        leadType: leadType as string,
      });

      // Apply date filtering to takipte data as well
      let filteredTakipte = takipteStorage;
      if (startDate || endDate || month || year) {
        filteredTakipte = takipteStorage.filter(item => {
          const dateStr = item.Tarih || item.date || '';
          if (!dateStr) return true; // Include items without dates
          
          const itemDate = new Date(dateStr);
          if (isNaN(itemDate.getTime())) return true; // Include items with invalid dates
          
          // Year filter
          if (year && itemDate.getFullYear().toString() !== year) return false;
          
          // Month filter (1-12 to 01-12)
          if (month && (itemDate.getMonth() + 1).toString().padStart(2, '0') !== month) return false;
          
          // Date range filter
          if (startDate && itemDate < new Date(startDate as string)) return false;
          if (endDate && itemDate > new Date(endDate as string)) return false;
          
          return true;
        });
      }

      // Enhanced stats combining both data sources with date filtering applied
      const enhancedStats = {
        leads: {
          total: leads.length,
          byStatus: leads.reduce((acc, lead) => {
            acc[lead.status || 'yeni'] = (acc[lead.status || 'yeni'] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
          byType: leads.reduce((acc, lead) => {
            acc[lead.leadType] = (acc[lead.leadType] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
          byPersonnel: leads.reduce((acc, lead) => {
            const rep = lead.assignedPersonnel || 'Belirtilmemiş';
            acc[rep] = (acc[rep] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
        },
        takipte: {
          total: filteredTakipte.length,
          hasData: filteredTakipte.length > 0,
          byKriter: filteredTakipte.reduce((acc, item) => {
            const kriter = item['Kriter'] || item.kriter || 'Belirtilmemiş';
            acc[kriter] = (acc[kriter] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
          bySource: filteredTakipte.reduce((acc, item) => {
            const source = item['İrtibat Müşteri Kaynağı'] || item['Müşteri Kaynağı'] || 'Bilinmiyor';
            acc[source] = (acc[source] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
          byMeetingType: filteredTakipte.reduce((acc, item) => {
            const meetingType = item['Görüşme Tipi'] || item.gorusmeTipi || 'Belirtilmemiş';
            acc[meetingType] = (acc[meetingType] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
          byOffice: filteredTakipte.reduce((acc, item) => {
            const office = item['Ofis'] || item.ofis || 'Ana Ofis';
            acc[office] = (acc[office] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
          byPersonnel: filteredTakipte.reduce((acc, item) => {
            const personnel = item['Personel Adı(203)'] || item['Atanan Personel'] || 'Belirtilmemiş';
            acc[personnel] = (acc[personnel] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)
        },
        combined: {
          hasSecondaryData: filteredTakipte.length > 0,
          personnelPerformance: {} as Record<string, any>
        }
      };

      res.json(enhancedStats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch enhanced stats" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
