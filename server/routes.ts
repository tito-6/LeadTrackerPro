import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertLeadSchema, insertSalesRepSchema, insertSettingsSchema } from "@shared/schema";
import { usdExchangeService } from "./usd-exchange-service";
import { handleAIQuery } from "./routes/ai";
import multer from "multer";
import * as XLSX from "xlsx";
import Papa from "papaparse";

// Enhanced function to extract both project name and lead type from WebForm Notu
function extractDataFromWebForm(webFormNote: string | undefined): { projectName?: string; leadType?: string } {
  if (!webFormNote || typeof webFormNote !== 'string') return {};
  
  const originalNote = webFormNote.trim();
  
  // Extract lead type (Satılık/Kiralık) - Enhanced for your specific format
  let leadType: string | undefined;
  
  // Specific pattern for your format: "/ Ilgilendigi Gayrimenkul Tipi :Satılık /" or ":Kiralık /"
  const specificPatterns = [
    // Match ":Kiralık" in the Ilgilendigi Gayrimenkul Tipi format
    {
      regex: /Ilgilendigi\s+Gayrimenkul\s+Tipi\s*:?\s*Kiralık/i,
      type: 'kiralama'
    },
    // Match ":Satılık" in the Ilgilendigi Gayrimenkul Tipi format  
    {
      regex: /Ilgilendigi\s+Gayrimenkul\s+Tipi\s*:?\s*Satılık/i,
      type: 'satis'
    },
    // Additional general patterns for KIRALIK (all common variations)
    { 
      regex: /kiralık|kiraliq|kiralik|kırala|kıralı|krala|krali|kerala|keralı/i, 
      type: 'kiralama' 
    },
    // Additional general patterns for SATILIK (all common variations)  
    { 
      regex: /satılık|satıliq|satilik|satlik|satlık|satılk|satlk|satış|satis/i, 
      type: 'satis' 
    }
  ];
  
  for (const pattern of specificPatterns) {
    if (pattern.regex.test(originalNote)) {
      leadType = pattern.type;
      console.log(`Lead type detected: "${leadType}" from pattern: ${pattern.regex} in: "${originalNote.substring(0, 100)}..."`);
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
    console.log(`✓ WebForm lead type detected: "${leadType}" from: "${webFormNote.substring(0, 60)}..."`);
  }
  
  // Enhanced project name extraction
  let projectName = '';
  if (webFormData.projectName) {
    projectName = webFormData.projectName;
    console.log(`✓ Project name extracted: "${projectName}" from WebForm`);
  } else {
    // Try to extract from other project-related columns
    projectName = row['Proje Adı'] || row['Project Name'] || row.projectName || 'Model Sanayi Merkezi';
  }
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
    projectName: projectName || webFormData.projectName || extractProjectNameFromWebForm(getValue(row['WebForm Notu']) || getValue(row['Web Form Notu']) || getValue(row.webFormNote)) || 'Model Sanayi Merkezi',
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

  // Clear all cache (leads + takipte data)
  app.delete("/api/cache/clear", async (req, res) => {
    try {
      await storage.clearAllLeads();
      await storage.clearTakipteData();
      res.json({ message: "All cache cleared successfully" });
    } catch (error) {
      console.error("Error clearing cache:", error);
      res.status(500).json({ 
        error: "Failed to clear cache",
        details: error instanceof Error ? error.message : String(error)
      });
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

      // Get existing leads to check for duplicates
      const existingLeads = await storage.getLeads();
      const duplicateInfo = {
        byCustomerId: 0,
        byContactId: 0,
        byName: 0,
        total: 0,
        skipped: 0,
        imported: 0
      };

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

          // Check for duplicates before creating
          const isDuplicate = existingLeads.some(existing => {
            // Primary check: Customer ID and Contact ID
            if (mappedData.customerId && existing.customerId && 
                mappedData.customerId === existing.customerId) {
              duplicateInfo.byCustomerId++;
              return true;
            }
            
            if (mappedData.contactId && existing.contactId && 
                mappedData.contactId === existing.contactId) {
              duplicateInfo.byContactId++;
              return true;
            }
            
            // Secondary check: Customer name (normalized)
            if (mappedData.customerName && existing.customerName) {
              const nameA = mappedData.customerName.toLowerCase().trim();
              const nameB = existing.customerName.toLowerCase().trim();
              if (nameA === nameB && nameA.length > 3) {
                duplicateInfo.byName++;
                return true;
              }
            }
            
            return false;
          });

          if (isDuplicate) {
            duplicateInfo.skipped++;
            console.log(`⚠️ Duplicate detected and skipped: ${mappedData.customerName} (ID: ${mappedData.customerId})`);
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
          duplicateInfo.imported++;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          errors.push({ row: i + 1, error: errorMessage });
        }
      }

      duplicateInfo.total = duplicateInfo.byCustomerId + duplicateInfo.byContactId + duplicateInfo.byName;

      res.json({
        message: `Successfully imported ${createdLeads.length} leads${errors.length > 0 ? ` with ${errors.length} errors` : ''}${duplicateInfo.skipped > 0 ? `. Skipped ${duplicateInfo.skipped} duplicates` : ''}`,
        imported: createdLeads.length,
        errors: errors.length,
        errorDetails: errors,
        validationWarnings,
        duplicateInfo: {
          ...duplicateInfo,
          message: duplicateInfo.skipped > 0 ? `Found ${duplicateInfo.skipped} duplicate records: ${duplicateInfo.byCustomerId} by Customer ID, ${duplicateInfo.byContactId} by Contact ID, ${duplicateInfo.byName} by Name` : 'No duplicates found'
        }
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

  // Advanced Export endpoints with comprehensive filtering
  app.get("/api/export/:format", async (req, res) => {
    try {
      const { format } = req.params;
      const { 
        startDate, endDate, salesRep, month, year, leadType,
        reportType, includeCharts, includeAnalytics, includeRawData, customTitle,
        projects, statuses
      } = req.query;
      
      console.log('Export query params:', req.query);
      
      // Start with all leads
      let filteredLeads = await storage.getLeads();
      console.log('Total leads available:', filteredLeads.length);
      
      // Debug: Show unique personnel names
      const uniquePersonnel = [...new Set(filteredLeads.map(lead => lead.assignedPersonnel).filter(Boolean))];
      console.log('Unique personnel in data:', uniquePersonnel);

      // Apply basic date/type filters only if specified
      if (startDate || endDate || month || year || (salesRep && !salesRep.includes(',')) || leadType) {
        filteredLeads = await storage.getLeadsByFilter({
          startDate: startDate as string,
          endDate: endDate as string,
          month: month as string,
          year: year as string,
          salesRep: (salesRep && !salesRep.includes(',')) ? salesRep as string : undefined,
          leadType: leadType as string,
        });
      }

      console.log('After basic filtering:', filteredLeads.length, 'leads');

      // Apply advanced multi-select personnel filter
      if (salesRep && salesRep.includes(',')) {
        // Fix Turkish character encoding issue
        const personnelList = (salesRep as string).split(',').map(p => {
          let decoded = decodeURIComponent(p.trim());
          // Fix common Turkish character encoding issues
          decoded = decoded.replace(/ReÃ§ber/g, 'Reçber');
          decoded = decoded.replace(/Ã§/g, 'ç');
          decoded = decoded.replace(/Ã¼/g, 'ü');
          decoded = decoded.replace(/Ã¶/g, 'ö');
          decoded = decoded.replace(/Ä±/g, 'ı');
          decoded = decoded.replace(/Ä°/g, 'İ');
          decoded = decoded.replace(/Å/g, 'Ş');
          decoded = decoded.replace(/ÅŸ/g, 'ş');
          decoded = decoded.replace(/Äž/g, 'Ğ');
          decoded = decoded.replace(/ÄŸ/g, 'ğ');
          return decoded;
        });
        console.log('Filtering by personnel (corrected):', personnelList);
        console.log('Original personnel param:', salesRep);
        console.log('Personnel in leads:', filteredLeads.map(lead => lead.assignedPersonnel).slice(0, 10));
        
        filteredLeads = filteredLeads.filter(lead => 
          lead.assignedPersonnel && personnelList.includes(lead.assignedPersonnel.trim())
        );
        console.log('After personnel filtering:', filteredLeads.length, 'leads');
      }

      // Apply project filtering
      if (projects && projects !== 'all') {
        const projectList = (projects as string).split(',').map(p => decodeURIComponent(p.trim()));
        console.log('Filtering by projects:', projectList);
        filteredLeads = filteredLeads.filter(lead => 
          lead.projectName && projectList.includes(lead.projectName.trim())
        );
        console.log('After project filtering:', filteredLeads.length, 'leads');
      }

      // Apply status filtering
      if (statuses && statuses !== 'all') {
        const statusList = (statuses as string).split(',').map(s => decodeURIComponent(s.trim()));
        console.log('Filtering by statuses:', statusList);
        filteredLeads = filteredLeads.filter(lead => 
          lead.status && statusList.includes(lead.status.trim())
        );
        console.log('After status filtering:', filteredLeads.length, 'leads');
      }

      // Apply lead type filtering if specified
      if (leadType && leadType !== 'all') {
        console.log('Filtering by lead type:', leadType);
        if (leadType === 'satis') {
          filteredLeads = filteredLeads.filter(lead => lead.leadType !== 'kiralik');
        } else if (leadType === 'kiralik') {
          filteredLeads = filteredLeads.filter(lead => lead.leadType === 'kiralik');
        }
        console.log('After lead type filtering:', filteredLeads.length, 'leads');
      }

      console.log('Final filtered leads count:', filteredLeads.length);
      
      const salesReps = await storage.getSalesReps();
      const allLeads = await storage.getLeads(); // For comprehensive analytics
      // Generate comprehensive analytics if requested
      let analytics = {};
      if (includeAnalytics === 'true' || reportType === 'comprehensive' || reportType === 'analytics-only') {
        // Calculate comprehensive statistics
        const statusCounts = filteredLeads.reduce((acc, lead) => {
          const status = lead.status || 'Tanımsız';
          acc[status] = (acc[status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const personnelStats = filteredLeads.reduce((acc, lead) => {
          const personnel = lead.assignedPersonnel || 'Atanmamış';
          if (!acc[personnel]) {
            acc[personnel] = { total: 0, satis: 0, takipte: 0, olumsuz: 0 };
          }
          acc[personnel].total++;
          if (lead.status?.toLowerCase().includes('satış') || lead.status?.toLowerCase().includes('satis')) {
            acc[personnel].satis++;
          }
          if (lead.status?.toLowerCase().includes('takip')) {
            acc[personnel].takipte++;
          }
          if (lead.status?.toLowerCase().includes('olumsuz')) {
            acc[personnel].olumsuz++;
          }
          return acc;
        }, {} as Record<string, any>);

        const projectStats = filteredLeads.reduce((acc, lead) => {
          const project = lead.projectName || 'Belirtilmemiş';
          acc[project] = (acc[project] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const leadTypeStats = filteredLeads.reduce((acc, lead) => {
          const type = lead.leadType || 'Belirtilmemiş';
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        analytics = {
          totalLeads: filteredLeads.length,
          statusBreakdown: statusCounts,
          personnelPerformance: personnelStats,
          projectDistribution: projectStats,
          leadTypeDistribution: leadTypeStats,
          conversionRate: filteredLeads.length > 0 ? 
            Math.round((Object.entries(statusCounts).filter(([status]) => 
              status.toLowerCase().includes('satış')).reduce((sum, [, count]) => sum + count, 0) / filteredLeads.length) * 100) : 0,
          filterSummary: {
            dateRange: startDate && endDate ? `${startDate} - ${endDate}` : 'Tümü',
            personnel: salesRep === 'all' || !salesRep ? 'Tümü' : salesRep,
            projects: projects === 'all' || !projects ? 'Tümü' : projects,
            leadType: leadType === 'all' || !leadType ? 'Tümü' : leadType,
            statuses: statuses === 'all' || !statuses ? 'Tümü' : statuses
          }
        };
      }

      if (format === 'json') {
        const exportData: any = {
          reportType: reportType || 'comprehensive',
          exportDate: new Date().toISOString(),
          customTitle: customTitle || 'İNNO Gayrimenkul Lead Raporu',
          filterSummary: (analytics as any).filterSummary || {}
        };

        if (includeRawData === 'true' || reportType === 'comprehensive' || reportType === 'leads-only') {
          exportData.leads = filteredLeads;
          exportData.salesReps = salesReps;
        }

        if (includeAnalytics === 'true' || reportType === 'comprehensive' || reportType === 'analytics-only') {
          exportData.analytics = analytics;
        }

        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        
        // Add total leads count to the response
        exportData.totalLeads = filteredLeads.length;
        
        res.json(exportData);
      } else if (format === 'excel') {
        const XLSX = require('xlsx');
        
        // Create workbook and worksheets
        const wb = XLSX.utils.book_new();
        
        // Add comprehensive title page
        const titleData = [
          { 'İNNO Gayrimenkul Yatırım A.Ş.': '' },
          { 'İNNO Gayrimenkul Yatırım A.Ş.': customTitle || 'Kapsamlı Lead Raporu' },
          { 'İNNO Gayrimenkul Yatırım A.Ş.': '' },
          { 'İNNO Gayrimenkul Yatırım A.Ş.': `Rapor Tarihi: ${new Date().toLocaleDateString('tr-TR')}` },
          { 'İNNO Gayrimenkul Yatırım A.Ş.': `Toplam Lead Sayısı: ${filteredLeads.length}` },
          { 'İNNO Gayrimenkul Yatırım A.Ş.': '' },
          { 'İNNO Gayrimenkul Yatırım A.Ş.': 'Filtre Özeti:' },
          { 'İNNO Gayrimenkul Yatırım A.Ş.': `Tarih Aralığı: ${(analytics as any).filterSummary?.dateRange || 'Tümü'}` },
          { 'İNNO Gayrimenkul Yatırım A.Ş.': `Personel: ${(analytics as any).filterSummary?.personnel || 'Tümü'}` },
          { 'İNNO Gayrimenkul Yatırım A.Ş.': `Projeler: ${(analytics as any).filterSummary?.projects || 'Tümü'}` },
          { 'İNNO Gayrimenkul Yatırım A.Ş.': `Lead Tipi: ${(analytics as any).filterSummary?.leadType || 'Tümü'}` },
          { 'İNNO Gayrimenkul Yatırım A.Ş.': `Durumlar: ${(analytics as any).filterSummary?.statuses || 'Tümü'}` }
        ];
        
        const titleWS = XLSX.utils.json_to_sheet(titleData);
        XLSX.utils.book_append_sheet(wb, titleWS, 'Rapor Bilgileri');

        // Add analytics if requested
        if (includeAnalytics === 'true' || reportType === 'comprehensive' || reportType === 'analytics-only') {
          const analyticsData = analytics as any;
          
          // Status breakdown sheet
          const statusData = Object.entries(analyticsData.statusBreakdown || {}).map(([status, count]) => ({
            'Durum': status,
            'Sayı': count,
            'Yüzde': filteredLeads.length > 0 ? Math.round(((count as number) / filteredLeads.length) * 100) : 0
          }));
          const statusWS = XLSX.utils.json_to_sheet(statusData);
          XLSX.utils.book_append_sheet(wb, statusWS, 'Durum Analizi');

          // Personnel performance sheet
          const personnelData = Object.entries(analyticsData.personnelPerformance || {}).map(([personnel, stats]: [string, any]) => ({
            'Personel': personnel,
            'Toplam Lead': stats.total,
            'Satış': stats.satis,
            'Takipte': stats.takipte,
            'Olumsuz': stats.olumsuz,
            'Başarı Oranı %': stats.total > 0 ? Math.round((stats.satis / stats.total) * 100) : 0
          }));
          const personnelWS = XLSX.utils.json_to_sheet(personnelData);
          XLSX.utils.book_append_sheet(wb, personnelWS, 'Personel Performansı');

          // Project distribution sheet
          const projectData = Object.entries(analyticsData.projectDistribution || {}).map(([project, count]) => ({
            'Proje': project,
            'Lead Sayısı': count,
            'Yüzde': filteredLeads.length > 0 ? Math.round(((count as number) / filteredLeads.length) * 100) : 0
          }));
          const projectWS = XLSX.utils.json_to_sheet(projectData);
          XLSX.utils.book_append_sheet(wb, projectWS, 'Proje Dağılımı');

          // Lead type distribution sheet
          const leadTypeData = Object.entries(analyticsData.leadTypeDistribution || {}).map(([type, count]) => ({
            'Lead Tipi': type,
            'Sayı': count,
            'Yüzde': filteredLeads.length > 0 ? Math.round(((count as number) / filteredLeads.length) * 100) : 0
          }));
          const leadTypeWS = XLSX.utils.json_to_sheet(leadTypeData);
          XLSX.utils.book_append_sheet(wb, leadTypeWS, 'Lead Tipi Analizi');
        }
        
        // Prepare leads data for Excel if requested
        if (includeRawData === 'true' || reportType === 'comprehensive' || reportType === 'leads-only') {
          const leadsData = filteredLeads.map(lead => ({
            'Müşteri ID': lead.customerId || '',
            'İletişim ID': lead.contactId || '',
            'Müşteri Adı Soyadı': lead.customerName || '',
            'İlk Müşteri Kaynağı': lead.firstCustomerSource || '',
            'Form Müşteri Kaynağı': lead.formCustomerSource || '',
            'WebForm Notu': lead.webFormNote || '',
            'Talep Geliş Tarihi': lead.requestDate || '',
            'İnfo Form Geliş Yeri 1': lead.infoFormLocation1 || '',
            'İnfo Form Geliş Yeri 2': lead.infoFormLocation2 || '',
            'İnfo Form Geliş Yeri 3': lead.infoFormLocation3 || '',
            'İnfo Form Geliş Yeri 4': lead.infoFormLocation4 || '',
            'Atanan Personel': lead.assignedPersonnel || '',
            'Hatırlatma Personeli': lead.reminderPersonnel || '',
            'Geri Dönüş Var mı': lead.wasCalledBack ? 'Evet' : 'Hayır',
            'WebForm İletişim Telefon': lead.webFormContactPhone || '',
            'WebForm İletişim Email': lead.webFormContactEmail || '',
            'WebForm Telefon Dönüşü': lead.webFormPhoneCallback ? 'Evet' : 'Hayır',
            'WebForm Email Dönüşü': lead.webFormEmailCallback ? 'Evet' : 'Hayır',
            'Birebir Görüşme': lead.oneOnOneMeeting ? 'Evet' : 'Hayır',
            'Birebir Görüşme Tarihi': lead.oneOnOneMeetingDate || '',
            'Birebir Görüşme Sonucu': lead.oneOnOneMeetingResult || '',
            'Son Görüşme Sonucu': lead.lastMeetingResult || '',
            'Müşteri Cevap Tarihi': lead.customerResponseDate || '',
            'Görüşme Notu': lead.callNote || '',
            'Satış': lead.sale ? 'Evet' : 'Hayır',
            'Dönüş Olumsuzluk Nedeni': lead.negativeReason || '',
            'Randevu': lead.appointment ? 'Evet' : 'Hayır',
            'Proje Adı': lead.projectName || '',
            'Lead Tipi': lead.leadType || '',
            'Status': lead.status || ''
          }));
          
          // Create leads worksheet
          const leadsWS = XLSX.utils.json_to_sheet(leadsData);
          XLSX.utils.book_append_sheet(wb, leadsWS, 'Lead Verileri');
        }
        
        // Generate Excel buffer
        const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="İNNO-Kapsamlı-Lead-Raporu-${new Date().toISOString().split('T')[0]}.xlsx"`);
        res.send(excelBuffer);
      } else if (format === 'pdf') {
        // Return comprehensive data for frontend PDF generation using jsPDF
        const exportData: any = {
          format: 'pdf',
          reportType: reportType || 'comprehensive',
          customTitle: customTitle || 'İNNO Gayrimenkul Lead Raporu',
          exportDate: new Date().toISOString(),
          filterSummary: (analytics as any).filterSummary || {}
        };

        if (includeRawData === 'true' || reportType === 'comprehensive' || reportType === 'leads-only') {
          exportData.data = { leads: filteredLeads, salesReps };
        }

        if (includeAnalytics === 'true' || reportType === 'comprehensive' || reportType === 'analytics-only') {
          exportData.analytics = analytics;
        }

        res.setHeader('Content-Type', 'application/json');
        res.json(exportData);
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
        'Proje Adı': lead.projectName || '',
        'Görüşme Notu': lead.callNote || '',
        'Satış': lead.sale ? 'Evet' : 'Hayır',
        'Randevu': lead.appointment ? 'Evet' : 'Hayır',
        'Birebir Görüşme': lead.oneOnOneMeeting ? 'Evet' : 'Hayır',
        'Olumsuzluk Nedeni': lead.negativeReason || ''
      }));
      
      const worksheet = XLSX.utils.json_to_sheet(worksheetData);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Lead Verileri');
      
      // Create summary worksheet
      const statusCounts = leads.reduce((acc, lead) => {
        const status = lead.status || 'Belirtilmemiş';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const summaryData = [
        { 'Bilgi': 'Rapor Özeti', 'Değer': `İNNO Gayrimenkul Yatırım A.Ş. - ${periodInfo}` },
        { 'Bilgi': 'Toplam Lead Sayısı', 'Değer': leads.length },
        { 'Bilgi': 'Dışa Aktarma Tarihi', 'Değer': new Date().toLocaleDateString('tr-TR') },
        { 'Bilgi': 'Filtreleme Kriteri', 'Değer': salesRep === 'all' || !salesRep ? 'Tüm Personel' : salesRep },
        { 'Bilgi': '', 'Değer': '' },
        { 'Bilgi': 'STATUS DAĞILIMI', 'Değer': '' },
        ...Object.entries(statusCounts).map(([status, count]) => ({
          'Bilgi': status,
          'Değer': count
        }))
      ];
      
      const summaryWS = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summaryWS, 'Rapor Özeti');
      
      // Write the workbook to buffer
      const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      
      // Set proper headers
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="İNNO_Lead_Raporu_${periodInfo}.xlsx"`);
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
      // Match exactly how enhanced-stats counts "Olumsuz" leads
      const negativeLeads = leads.filter(lead => 
        lead.status?.includes('Olumsuz') ||
        lead.status?.toLowerCase().includes('olumsuz')
      );

      const reasonCounts: { [key: string]: number } = {};
      const personnelCounts: { [key: string]: number } = {};

      negativeLeads.forEach(lead => {
        // Comprehensive reason extraction - check multiple fields
        let reason = 'Belirtilmemiş';
        if (lead.negativeReason && lead.negativeReason.trim() !== '') {
          reason = lead.negativeReason.trim();
        } else if (lead.lastMeetingNote && lead.lastMeetingNote.trim() !== '') {
          reason = lead.lastMeetingNote.trim();
        } else if (lead.responseResult && lead.responseResult.trim() !== '') {
          reason = lead.responseResult.trim();
        } else if (lead.status) {
          reason = lead.status;
        }
        
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

  // Excel-style takipte data import
  app.post('/api/takipte/import-excel', async (req, res) => {
    try {
      const { data } = req.body;
      
      if (!data || !Array.isArray(data)) {
        return res.status(400).json({ error: 'Invalid data format' });
      }

      // Filter out empty rows
      const validData = data.filter(row => {
        return Object.values(row).some(value => value && value.toString().trim() !== '');
      });

      console.log(`Excel takipte data:`, JSON.stringify(validData.slice(0, 2), null, 2));
      console.log(`Processed ${validData.length} Excel takipte records`);

      // Store takipte data
      takipteStorage = validData;

      res.json({ 
        message: 'Excel takipte data imported successfully', 
        recordCount: validData.length
      });
    } catch (error) {
      console.error('Excel takipte import error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Main lead data import from Excel Input tab
  app.post('/api/leads/import-main', async (req, res) => {
    try {
      const { data } = req.body;
      
      if (!data || !Array.isArray(data)) {
        return res.status(400).json({ error: 'Invalid data format' });
      }

      // Filter out empty rows
      const validData = data.filter(row => {
        return Object.values(row).some(value => value && value.toString().trim() !== '');
      });

      console.log(`Excel main lead data:`, JSON.stringify(validData.slice(0, 2), null, 2));
      console.log(`Processed ${validData.length} Excel main lead records`);

      // Convert to standard lead format and save
      const leads = [];
      for (const row of validData) {
        try {
          const lead = mapMainDataToLead(row);
          if (lead.customerName || lead.customerId) {
            const savedLead = await storage.createLead(lead);
            leads.push(savedLead);
          }
        } catch (error) {
          console.error('Error processing lead row:', error);
        }
      }

      res.json({ 
        message: 'Excel main lead data imported successfully', 
        recordCount: leads.length
      });
    } catch (error) {
      console.error('Excel main lead import error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Main lead data mapping function for Excel input
  function mapMainDataToLead(row: any): any {
    const parseDate = (dateStr: string): string => {
      if (!dateStr || dateStr.trim() === '') return '';
      
      try {
        // Try DD/MM/YYYY format (Turkish standard)
        if (dateStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
          const [day, month, year] = dateStr.split('/');
          return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
        
        // Try DD.MM.YYYY format
        if (dateStr.match(/^\d{1,2}\.\d{1,2}\.\d{4}$/)) {
          const [day, month, year] = dateStr.split('.');
          return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
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
        
        return '';
      } catch {
        return '';
      }
    };

    // Extract project name from WebForm Notu
    function extractProjectFromWebForm(webFormNote: string): string | undefined {
      if (!webFormNote) return undefined;
      
      const projectPatterns = [
        /proje[:\s]+([^\n,]+)/i,
        /project[:\s]+([^\n,]+)/i,
        /([A-Z][a-zA-ZğüşıöçĞÜŞİÖÇ\s]+(?:Residence|Rezidans|Plaza|Tower|Park|Sitesi|Projesi))/i
      ];
      
      for (const pattern of projectPatterns) {
        const match = webFormNote.match(pattern);
        if (match) {
          return match[1].trim();
        }
      }
      
      return undefined;
    }

    // Determine lead type from WebForm Notu
    function determineLeadType(webFormNote: string): string {
      if (!webFormNote) return 'kiralama';
      
      const normalized = webFormNote.toLowerCase();
      if (normalized.includes('satış') || normalized.includes('satis') || normalized.includes('sale')) {
        return 'satis';
      }
      return 'kiralama';
    }

    const customerName = row['Müşteri Adı Soyadı'] || '';
    const requestDate = parseDate(row['Talep Geliş Tarihi'] || '');
    const assignedPersonnel = row['Atanan Personel'] || '';
    const webFormNote = row['WebForm Notu'] || '';
    const lastMeetingResult = row['SON GORUSME SONUCU'] || '';
    
    // Extract project and lead type
    const projectName = extractProjectFromWebForm(webFormNote);
    const leadType = determineLeadType(webFormNote);
    
    // Determine status from last meeting result
    let status = 'Tanımsız';
    if (lastMeetingResult && lastMeetingResult.trim()) {
      status = lastMeetingResult.trim();
    }

    return {
      customerName,
      requestDate,
      assignedPersonnel,
      leadType,
      status,
      projectName,
      customerId: row['Müşteri ID'] || undefined,
      contactId: row['İletişim ID'] || undefined,
      firstCustomerSource: row['İlk Müşteri Kaynağı'] || undefined,
      formCustomerSource: row['Form Müşteri Kaynağı'] || undefined,
      webFormNote,
      infoFormLocation1: row['İnfo Form Geliş Yeri'] || undefined,
      infoFormLocation2: row['İnfo Form Geliş Yeri 2'] || undefined,
      infoFormLocation3: row['İnfo Form Geliş Yeri 3'] || undefined,
      infoFormLocation4: row['İnfo Form Geliş Yeri 4'] || undefined,
      reminderPersonnel: row['Hatırlatma Personeli'] || undefined,
      wasCalledBack: row['GERİ DÖNÜŞ YAPILDI MI? (Müşteri Arandı mı?)'] || undefined,
      webFormPoolDate: row['Web Form Havuz Oluşturma Tarihi'] || undefined,
      formSystemDate: row['Form Sistem Olusturma Tarihi'] || undefined,
      assignmentTimeDiff: row['Atama Saat Farkı'] || undefined,
      responseTimeDiff: row['Dönüş Saat Farkı'] || undefined,
      outgoingCallSystemDate: row['Giden Arama Sistem Oluşturma Tarihi'] || undefined,
      customerResponseDate: row['Müşteri Geri Dönüş Tarihi (Giden Arama)'] || undefined,
      wasEmailSent: row['GERİ DÖNÜŞ YAPILDI MI? (Müşteriye Mail Gönderildi mi?)'] || undefined,
      customerEmailResponseDate: row['Müşteri Mail Geri Dönüş Tarihi'] || undefined,
      unreachableByPhone: row['Telefonla Ulaşılamayan Müşteriler'] || undefined,
      daysWaitingResponse: parseInt(row['Kaç Gündür Geri Dönüş Bekliyor']) || undefined,
      daysToResponse: parseInt(row['Kaç Günde Geri Dönüş Yapılmış (Süre)']) || undefined,
      callNote: row['GERİ DÖNÜŞ NOTU (Giden Arama Notu)'] || undefined,
      emailNote: row['GERİ DÖNÜŞ NOTU (Giden Mail Notu)'] || undefined,
      oneOnOneMeeting: row['Birebir Görüşme Yapıldı mı ?'] || undefined,
      meetingDate: row['Birebir Görüşme Tarihi'] || undefined,
      responseResult: row['Dönüş Görüşme Sonucu'] || undefined,
      negativeReason: row['Dönüş Olumsuzluk Nedeni'] || undefined,
      wasSaleMade: row['Müşteriye Satış Yapıldı Mı ?'] || undefined,
      saleCount: parseInt(row['Satış Adedi']) || undefined,
      appointmentDate: row['Randevu Tarihi'] || undefined,
      lastMeetingNote: row['SON GORUSME NOTU'] || undefined,
      lastMeetingResult: row['SON GORUSME SONUCU'] || undefined,
    };
  }

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

  // USD Exchange Rate API endpoints
  app.get("/api/exchange-rate/usd", async (req, res) => {
    try {
      const rate = await usdExchangeService.getCurrentRate();
      const fullRateInfo = await usdExchangeService.getUSDToTRYRate();
      
      res.json({
        rate: rate,
        buyingRate: fullRateInfo.buyingRate,
        sellingRate: fullRateInfo.sellingRate,
        lastUpdated: fullRateInfo.lastUpdated,
        source: "Turkey Central Bank (TCMB)"
      });
    } catch (error) {
      console.error("Error fetching USD exchange rate:", error);
      res.status(500).json({ 
        message: "Failed to fetch exchange rate", 
        error: (error as Error).message 
      });
    }
  });

  // Convert TL to USD endpoint
  app.post("/api/exchange-rate/convert-tl-to-usd", async (req, res) => {
    try {
      const { tlAmount } = req.body;
      
      if (!tlAmount || isNaN(parseFloat(tlAmount))) {
        return res.status(400).json({ error: "Valid TL amount is required" });
      }
      
      const usdAmount = await usdExchangeService.convertTLToUSD(parseFloat(tlAmount));
      const currentRate = await usdExchangeService.getCurrentRate();
      
      res.json({
        tlAmount: parseFloat(tlAmount),
        usdAmount: Math.round(usdAmount * 100) / 100, // Round to 2 decimal places
        exchangeRate: currentRate,
        convertedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error converting TL to USD:", error);
      res.status(500).json({ 
        message: "Failed to convert currency", 
        error: (error as Error).message 
      });
    }
  });

  // Lead expenses statistics endpoint
  app.get("/api/lead-expenses/stats", async (req, res) => {
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

      // Calculate total expenses in TL
      let totalAgencyFees = 0;
      let totalAdsExpenses = 0;
      let leadCount = 0;

      leads.forEach(lead => {
        if (lead.agencyMonthlyFees) {
          totalAgencyFees += parseFloat(lead.agencyMonthlyFees.toString());
        }
        if (lead.adsExpenses) {
          totalAdsExpenses += parseFloat(lead.adsExpenses.toString());
        }
        leadCount++;
      });

      const totalExpensesTL = totalAgencyFees + totalAdsExpenses;
      
      // Convert to USD
      const totalExpensesUSD = await usdExchangeService.convertTLToUSD(totalExpensesTL);
      const avgCostPerLeadUSD = leadCount > 0 ? totalExpensesUSD / leadCount : 0;
      const currentRate = await usdExchangeService.getCurrentRate();

      res.json({
        leadCount,
        expenses: {
          tl: {
            totalAgencyFees: Math.round(totalAgencyFees * 100) / 100,
            totalAdsExpenses: Math.round(totalAdsExpenses * 100) / 100,
            totalExpenses: Math.round(totalExpensesTL * 100) / 100
          },
          usd: {
            totalExpenses: Math.round(totalExpensesUSD * 100) / 100,
            avgCostPerLead: Math.round(avgCostPerLeadUSD * 100) / 100
          }
        },
        exchangeRate: {
          rate: currentRate,
          lastUpdated: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error("Error calculating lead expenses:", error);
      res.status(500).json({ 
        message: "Failed to calculate lead expenses", 
        error: (error as Error).message 
      });
    }
  });

  const httpServer = createServer(app);
  // Lead Expenses CRUD API
  app.get("/api/lead-expenses", async (req, res) => {
    try {
      const expenses = await storage.getLeadExpenses();
      res.json(expenses);
    } catch (error) {
      console.error('Error fetching lead expenses:', error);
      res.status(500).json({ error: 'Failed to fetch lead expenses' });
    }
  });

  app.get("/api/lead-expenses/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const expense = await storage.getLeadExpenseById(id);
      if (!expense) {
        return res.status(404).json({ error: 'Lead expense not found' });
      }
      res.json(expense);
    } catch (error) {
      console.error('Error fetching lead expense:', error);
      res.status(500).json({ error: 'Failed to fetch lead expense' });
    }
  });

  app.get("/api/lead-expenses/month/:month", async (req, res) => {
    try {
      const month = req.params.month;
      const expenses = await storage.getLeadExpensesByMonth(month);
      res.json(expenses);
    } catch (error) {
      console.error('Error fetching lead expenses by month:', error);
      res.status(500).json({ error: 'Failed to fetch lead expenses by month' });
    }
  });

  app.post("/api/lead-expenses", async (req, res) => {
    try {
      const { insertLeadExpenseSchema } = await import("@shared/schema");
      const expenseData = insertLeadExpenseSchema.parse(req.body);
      const expense = await storage.createLeadExpense(expenseData);
      res.status(201).json(expense);
    } catch (error) {
      console.error('Error creating lead expense:', error);
      res.status(400).json({ error: 'Failed to create lead expense', details: error });
    }
  });

  app.put("/api/lead-expenses/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { insertLeadExpenseSchema } = await import("@shared/schema");
      const expenseData = insertLeadExpenseSchema.partial().parse(req.body);
      const expense = await storage.updateLeadExpense(id, expenseData);
      if (!expense) {
        return res.status(404).json({ error: 'Lead expense not found' });
      }
      res.json(expense);
    } catch (error) {
      console.error('Error updating lead expense:', error);
      res.status(400).json({ error: 'Failed to update lead expense', details: error });
    }
  });

  app.delete("/api/lead-expenses/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteLeadExpense(id);
      if (!success) {
        return res.status(404).json({ error: 'Lead expense not found' });
      }
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting lead expense:', error);
      res.status(500).json({ error: 'Failed to delete lead expense' });
    }
  });

  // AI Query endpoint
  app.post("/api/ai/query", handleAIQuery);

  return httpServer;
}
