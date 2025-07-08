import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertLeadSchema, insertSalesRepSchema, insertSettingsSchema } from "@shared/schema";
import multer from "multer";
import * as XLSX from "xlsx";
import Papa from "papaparse";

const upload = multer({ storage: multer.memoryStorage() });

// Helper function to map row data to lead schema with comprehensive Turkish column support
function mapRowToLead(row: any): any {
  // Core required fields with Turkish mapping
  const customerName = row['Müşteri Adı Soyadı'] || row['Müşteri Adı'] || row.customerName || row.name || row.Name || "";
  const requestDate = row['Talep Geliş Tarihi'] || row['Talep Tarihi'] || row.requestDate || row.date || new Date().toISOString().split('T')[0];
  const assignedPersonnel = row['Atanan Personel'] || row['Satış Temsilcisi'] || row.assignedPersonnel || row.salesRep || "";
  
  // Determine lead type from data patterns or default to kiralama
  let leadType = 'kiralama';
  const leadTypeValue = row['Lead Tipi'] || row.leadType || "";
  if (typeof leadTypeValue === 'string') {
    const normalized = leadTypeValue.toLowerCase().trim();
    if (normalized.includes('satış') || normalized.includes('satis') || normalized.includes('sale')) {
      leadType = 'satis';
    }
  }
  
  // Determine status from various indicators
  let status = 'yeni';
  const statusValue = row['Durum'] || row.status || "";
  const negativeReason = row['Dönüş Olumsuzluk Nedeni'] || row['Olumsuz Sebebi'] || "";
  const meetingDone = row['Birebir Görüşme Yapıldı mı ?'] || row['Birebir Görüşme Yapıldı mı?'] || "";
  const saleMade = row['Müşteriye Satış Yapıldı Mı ?'] || row['Müşteriye Satış Yapıldı Mı?'] || "";
  
  if (saleMade && (saleMade.toLowerCase().includes('evet') || saleMade.toLowerCase().includes('yes'))) {
    status = 'satildi';
  } else if (negativeReason && negativeReason.trim()) {
    status = 'olumsuz';
  } else if (meetingDone && (meetingDone.toLowerCase().includes('evet') || meetingDone.toLowerCase().includes('yes'))) {
    status = 'toplanti';
  } else if (statusValue) {
    const normalized = statusValue.toLowerCase().trim();
    if (normalized.includes('olumsuz')) status = 'olumsuz';
    else if (normalized.includes('satıldı') || normalized.includes('satildi')) status = 'satildi';
    else if (normalized.includes('takipte')) status = 'takipte';
    else if (normalized.includes('toplantı')) status = 'toplanti';
    else if (normalized.includes('ulaşılamıyor')) status = 'ulasilamiyor';
  }
  
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
      const { startDate, endDate, salesRep, leadType, status } = req.query;
      
      if (startDate || endDate || salesRep || leadType || status) {
        const filteredLeads = await storage.getLeadsByFilter({
          startDate: startDate as string,
          endDate: endDate as string,
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
      const leadData = insertLeadSchema.parse(req.body);
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

      // Validate and save leads
      const createdLeads = [];
      const errors = [];

      for (let i = 0; i < leads.length; i++) {
        try {
          const mappedData = mapRowToLead(leads[i]);
          
          // Skip empty rows
          if (!mappedData.customerName && !mappedData.assignedPersonnel) {
            continue;
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
        errorDetails: errors
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
  app.get("/api/export/excel", async (req, res) => {
    try {
      const { startDate, endDate, salesRep, leadType } = req.query;
      const leads = await storage.getLeadsByFilter({
        startDate: startDate as string,
        endDate: endDate as string,
        salesRep: salesRep as string,
        leadType: leadType as string,
      });

      // Create workbook
      const workbook = XLSX.utils.book_new();
      
      // Convert leads to worksheet format
      const worksheetData = leads.map(lead => ({
        'Müşteri Adı': lead.customerName,
        'Tarih': lead.requestDate,
        'Lead Tipi': lead.leadType === 'kiralama' ? 'Kiralama' : 'Satış',
        'Atanan Personel': lead.assignedPersonnel,
        'Durum': lead.status,
        'Son Görüşme Notu': lead.lastMeetingNote || '',
        'Web Form Notu': lead.webFormNote || '',
        'Müşteri ID': lead.customerId || '',
        'İletişim ID': lead.contactId || ''
      }));

      const worksheet = XLSX.utils.json_to_sheet(worksheetData);
      XLSX.utils.book_append_sheet(workbook, worksheet, "Leads");

      // Generate Excel buffer
      const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="lead-raporu-${new Date().toISOString().split('T')[0]}.xlsx"`);
      res.send(excelBuffer);
    } catch (error) {
      res.status(500).json({ message: "Failed to export Excel", error: (error as Error).message });
    }
  });

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

  // Statistics endpoint
  app.get("/api/stats", async (req, res) => {
    try {
      const { startDate, endDate, salesRep, leadType } = req.query;
      const leads = await storage.getLeadsByFilter({
        startDate: startDate as string,
        endDate: endDate as string,
        salesRep: salesRep as string,
        leadType: leadType as string,
      });

      const stats = {
        totalLeads: leads.length,
        byStatus: leads.reduce((acc, lead) => {
          acc[lead.status] = (acc[lead.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        byType: leads.reduce((acc, lead) => {
          acc[lead.leadType] = (acc[lead.leadType] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        bySalesRep: leads.reduce((acc, lead) => {
          acc[lead.assignedPersonnel] = (acc[lead.assignedPersonnel] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      };

      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
