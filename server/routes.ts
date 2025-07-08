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
  
  return {
    customerName,
    requestDate,
    leadType,
    assignedPersonnel,
    status,
    // Comprehensive Turkish column mapping - all 37 fields
    customerId: row['Müşteri ID'] || row.customerId || null,
    contactId: row['İletişim ID'] || row.contactId || null,
    firstCustomerSource: row['İlk Müşteri Kaynağı'] || row.firstCustomerSource || null,
    formCustomerSource: row['Form Müşteri Kaynağı'] || row.formCustomerSource || null,
    webFormNote: row['WebForm Notu'] || row['Web Form Notu'] || row.webFormNote || null,
    infoFormLocation1: row['İnfo Form Geliş Yeri'] || row.infoFormLocation1 || null,
    infoFormLocation2: row['İnfo Form Geliş Yeri 2'] || row.infoFormLocation2 || null,
    infoFormLocation3: row['İnfo Form Geliş Yeri 3'] || row.infoFormLocation3 || null,
    infoFormLocation4: row['İnfo Form Geliş Yeri 4'] || row.infoFormLocation4 || null,
    reminderPersonnel: row['Hatıırlatma Personeli'] || row.reminderPersonnel || null,
    wasCalledBack: row['GERİ DÖNÜŞ YAPILDI MI? (Müşteri Arandı mı?)'] || row.wasCalledBack || null,
    webFormPoolDate: row['Web Form Havuz Oluşturma Tarihi'] || row.webFormPoolDate || null,
    formSystemDate: row['Form Sistem Olusturma Tarihi'] || row.formSystemDate || null,
    assignmentTimeDiff: row['Atama Saat Farkı'] || row.assignmentTimeDiff || null,
    responseTimeDiff: row['Dönüş Saat Farkı'] || row.responseTimeDiff || null,
    outgoingCallSystemDate: row['Giden Arama Sistem Oluşturma Tarihi'] || row.outgoingCallSystemDate || null,
    customerResponseDate: row['Müşteri Geri Dönüş Tarihi (Giden Arama)'] || row.customerResponseDate || null,
    wasEmailSent: row['GERİ DÖNÜŞ YAPILDI MI? (Müşteriye Mail Gönderildi mi?)'] || row.wasEmailSent || null,
    customerEmailResponseDate: row['Müşteri Mail Geri Dönüş Tarihi'] || row.customerEmailResponseDate || null,
    unreachableByPhone: row['Telefonla Ulaşılamayan Müşteriler'] || row.unreachableByPhone || null,
    daysWaitingResponse: parseInt(row['Kaç Gündür Geri Dönüş Bekliyor'] || row.daysWaitingResponse || '0') || null,
    daysToResponse: parseInt(row['Kaç Günde Geri Dönüş Yapılmış (Süre)'] || row.daysToResponse || '0') || null,
    callNote: row['GERİ DÖNÜŞ NOTU (Giden Arama Notu)'] || row['Arama Notu'] || row.callNote || null,
    emailNote: row['GERİ DÖNÜŞ NOTU (Giden Mail Notu)'] || row.emailNote || null,
    oneOnOneMeeting: row['Birebir Görüşme Yapıldı mı ?'] || row['Birebir Görüşme Yapıldı mı?'] || row.oneOnOneMeeting || null,
    meetingDate: row['Birebir Görüşme Tarihi'] || row.meetingDate || null,
    responseResult: row['Dönüş Görüşme Sonucu'] || row.responseResult || null,
    negativeReason: row['Dönüş Olumsuzluk Nedeni'] || row.negativeReason || null,
    wasSaleMade: row['Müşteriye Satış Yapıldı Mı ?'] || row['Müşteriye Satış Yapıldı Mı?'] || row.wasSaleMade || null,
    saleCount: parseInt(row['Satış Adedi'] || row.saleCount || '0') || null,
    appointmentDate: row['Randevu Tarihi'] || row.appointmentDate || null,
    lastMeetingNote: row['SON GORUSME NOTU'] || row['Son Görüşme Notu'] || row.lastMeetingNote || null,
    lastMeetingResult: row['SON GORUSME SONUCU'] || row['Son Görüşme Sonucu'] || row.lastMeetingResult || null,
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
