import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertLeadSchema,
  insertSalesRepSchema,
  insertSettingsSchema,
} from "@shared/schema";
import { usdExchangeService } from "./usd-exchange-service";
import { handleAIQuery } from "./routes/ai-advanced";
import multer from "multer";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import path from "path";
import { generateReportPDF } from './pdfReport';
import express from 'express';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Enhanced function to extract both project name and lead type from WebForm Notu
function extractDataFromWebForm(webFormNote: string | undefined): {
  projectName?: string;
  leadType?: string;
} {
  if (!webFormNote || typeof webFormNote !== "string") return {};

  const originalNote = webFormNote.trim();

  // --- Lead Type Extraction (Best Practice) ---
  let leadType: string | undefined;
  // Regex to extract value after 'Ilgilendigi Gayrimenkul Tipi :' and before next '/' or end
  const leadTypeMatch = originalNote.match(/Ilgilendigi\s+Gayrimenkul\s+Tipi\s*:\s*([^/\n]*)/i);
  if (leadTypeMatch) {
    let extracted = leadTypeMatch[1].trim();
    // Normalize Turkish and English i's, remove accents, lowercase
    extracted = extracted
      .replace(/İ/g, 'i')
      .replace(/ı/g, 'i')
      .replace(/I/g, 'i')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    if (extracted === 'kiralık' || extracted === 'kiralik') {
      leadType = 'kiralama';
    } else if (extracted === 'satılık' || extracted === 'satilik') {
      leadType = 'satis';
    } else {
      leadType = 'Tanımsız';
    }
    console.log(`WebForm Notu: '${originalNote}' => Extracted: '${extracted}' => leadType: '${leadType}'`);
  } else {
    leadType = 'Tanımsız';
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
    /\b(Beşiktaş\s+Tower)\b/gi,
  ];

  // Try each project pattern
  for (const pattern of projectPatterns) {
    const execResult = pattern.exec(originalNote);
    if (execResult) {
      // Get the first capture group if it exists, otherwise use full match and clean it
      let candidate = execResult[1] || execResult[0];

      // Clean up slashes and whitespace if using full match
      if (!execResult[1]) {
        candidate = candidate
          .replace(/^\/\s*/, "")
          .replace(/\s*\/$/, "")
          .trim();
      }

      // Remove common noise words and clean up
      candidate = candidate
        .replace(/\b(?:için|hakkında|ile|ilgili|ve|or|and)\b/gi, "")
        .trim();
      candidate = candidate.replace(/\s+/g, " "); // Normalize spaces

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
    const fallbackKeywords = [
      "proje",
      "konut",
      "residence",
      "plaza",
      "tower",
      "city",
      "park",
      "sitesi",
      "daire",
      "ev",
      "villa",
    ];

    for (const keyword of fallbackKeywords) {
      const regex = new RegExp(
        `\\b([A-ZÇĞIŞÖÜİ][A-Za-zçğışöüi]+)\\s+${keyword}\\b`,
        "gi"
      );
      const matches = originalNote.match(regex);
      if (matches && matches.length > 0) {
        projectName = matches[0].trim();
        break;
      }

      // Try reverse pattern
      const reverseRegex = new RegExp(
        `\\b${keyword}\\s+([A-ZÇĞIŞÖÜİ][A-Za-zçğışöüi]+)\\b`,
        "gi"
      );
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
function extractProjectNameFromWebForm(
  webFormNote: string | undefined
): string | undefined {
  const result = extractDataFromWebForm(webFormNote);
  return result.projectName;
}

const upload = multer({ storage: multer.memoryStorage() });

// Helper function to map row data to lead schema with comprehensive Turkish column support
function mapRowToLead(row: any): any {
  // Enhanced date parsing function to handle multiple formats
  const parseDate = (dateValue: any): string => {
    if (!dateValue || dateValue === "") return "";

    const dateStr = String(dateValue).trim();

    // Try DD.MM.YYYY format (Turkish standard)
    if (dateStr.match(/^\d{1,2}\.\d{1,2}\.\d{4}$/)) {
      const [day, month, year] = dateStr.split(".");
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }

    // Try DD/MM/YYYY format
    if (dateStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
      const [day, month, year] = dateStr.split("/");
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }

    // Try MM.DD.YYYY format (check if first number > 12 to distinguish from DD.MM.YYYY)
    if (dateStr.match(/^\d{1,2}\.\d{1,2}\.\d{4}$/)) {
      const [first, second, year] = dateStr.split(".");
      if (parseInt(first) > 12) {
        // First number is likely day, so DD.MM.YYYY
        return `${year}-${second.padStart(2, "0")}-${first.padStart(2, "0")}`;
      } else {
        // MM.DD.YYYY format
        return `${year}-${first.padStart(2, "0")}-${second.padStart(2, "0")}`;
      }
    }

    // Try YYYY-MM-DD format (already correct)
    if (dateStr.match(/^\d{4}-\d{1,2}-\d{1,2}$/)) {
      const parts = dateStr.split("-");
      return `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(
        2,
        "0"
      )}`;
    }

    // Try parsing as Date object for other formats
    const parsedDate = new Date(dateStr);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate.toISOString().split("T")[0];
    }

    return ""; // Return empty if no valid date format found
  };

  // Core required fields with Turkish mapping and enhanced date parsing
  const customerName =
    row["Müşteri Adı Soyadı"] ||
    row["Müşteri Adı"] ||
    row.customerName ||
    row.name ||
    row.Name ||
    "";
  const requestDate = parseDate(
    row["Talep Geliş Tarihi"] ||
      row["Talep Tarihi"] ||
      row.requestDate ||
      row.date
  );
  const assignedPersonnel =
    row["Atanan Personel"] ||
    row["Satış Temsilcisi"] ||
    row.assignedPersonnel ||
    row.salesRep ||
    "";

  // Enhanced lead type detection from WebForm Notu and other columns
  let leadType = "Tanımsız"; // Default to Tanımsız

  // First try the Lead Tipi column if it exists
  const leadTypeValue = row["Lead Tipi"] || row.leadType || "";
  if (typeof leadTypeValue === "string") {
    const normalized = leadTypeValue.toLowerCase().trim();
    if (
      normalized.includes("satış") ||
      normalized.includes("satis") ||
      normalized.includes("sale")
    ) {
      leadType = "satis";
    } else if (
      normalized.includes("kiralık") ||
      normalized.includes("kiralik")
    ) {
      leadType = "kiralama";
    }
  }

  // Enhanced: Extract lead type from WebForm Notu if not found in Lead Tipi
  const webFormNote =
    row["WebForm Notu"] || row["Web Form Notu"] || row.webFormNote || "";
  const webFormData = extractDataFromWebForm(webFormNote);
  if (webFormData.leadType && webFormData.leadType !== "Tanımsız") {
    leadType = webFormData.leadType; // Override with WebForm detected type
    console.log(
      `✓ WebForm lead type detected: "${leadType}" from: "${webFormNote.substring(
        0,
        60
      )}..."`
    );
  }

  // Enhanced project name extraction
  let projectName = "";
  if (webFormData.projectName) {
    projectName = webFormData.projectName;
    console.log(`✓ Project name extracted: "${projectName}" from WebForm`);
  } else {
    // Try to extract from other project-related columns
    projectName =
      row["Proje Adı"] ||
      row["Project Name"] ||
      row.projectName ||
      "Model Sanayi Merkezi";
  }
  // console.log(`WebForm Extraction - Project: "${webFormData.projectName || 'None'}", Type: "${webFormData.leadType || 'None'}"`);

  // FIXED: Status derivation EXCLUSIVELY from SON GORUSME SONUCU column
  let status = "Tanımsız"; // Default to undefined status if no SON GORUSME SONUCU
  const sonGorusmeSonucu =
    row["SON GORUSME SONUCU"] ||
    row["SON GÖRÜŞME SONUCU"] ||
    row["Son Görüşme Sonucu"] ||
    row.lastMeetingResult ||
    "";

  // Primary and ONLY status determination from SON GORUSME SONUCU
  if (sonGorusmeSonucu && sonGorusmeSonucu.trim()) {
    // Use the exact value from SON GORUSME SONUCU as dynamic status
    status = sonGorusmeSonucu.trim();
  }
  // NO fallback to other fields - if SON GORUSME SONUCU is empty, status remains "Tanımsız"

  // Helper function to safely get value or undefined
  const getValue = (val: any) => {
    if (val === null || val === undefined || val === "") return undefined;
    return val;
  };

  const getIntValue = (val: any) => {
    if (val === null || val === undefined || val === "") return undefined;
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
    customerId: getValue(row["Müşteri ID"]) || getValue(row.customerId),
    contactId: getValue(row["İletişim ID"]) || getValue(row.contactId),
    firstCustomerSource:
      getValue(row["İlk Müşteri Kaynağı"]) || getValue(row.firstCustomerSource),
    formCustomerSource:
      getValue(row["Form Müşteri Kaynağı"]) || getValue(row.formCustomerSource),
    webFormNote:
      getValue(row["WebForm Notu"]) ||
      getValue(row["Web Form Notu"]) ||
      getValue(row.webFormNote),
    projectName:
      projectName ||
      webFormData.projectName ||
      extractProjectNameFromWebForm(
        getValue(row["WebForm Notu"]) ||
          getValue(row["Web Form Notu"]) ||
          getValue(row.webFormNote)
      ) ||
      "Model Sanayi Merkezi",
    infoFormLocation1:
      getValue(row["İnfo Form Geliş Yeri"]) || getValue(row.infoFormLocation1),
    infoFormLocation2:
      getValue(row["İnfo Form Geliş Yeri 2"]) ||
      getValue(row.infoFormLocation2),
    infoFormLocation3:
      getValue(row["İnfo Form Geliş Yeri 3"]) ||
      getValue(row.infoFormLocation3),
    infoFormLocation4:
      getValue(row["İnfo Form Geliş Yeri 4"]) ||
      getValue(row.infoFormLocation4),
    reminderPersonnel:
      getValue(row["Hatıırlatma Personeli"]) || getValue(row.reminderPersonnel),
    wasCalledBack:
      getValue(row["GERİ DÖNÜŞ YAPILDI MI? (Müşteri Arandı mı?)"]) ||
      getValue(row.wasCalledBack),
    webFormPoolDate:
      getValue(row["Web Form Havuz Oluşturma Tarihi"]) ||
      getValue(row.webFormPoolDate),
    formSystemDate:
      getValue(row["Form Sistem Olusturma Tarihi"]) ||
      getValue(row.formSystemDate),
    assignmentTimeDiff:
      getValue(row["Atama Saat Farkı"]) || getValue(row.assignmentTimeDiff),
    responseTimeDiff:
      getValue(row["Dönüş Saat Farkı"]) || getValue(row.responseTimeDiff),
    outgoingCallSystemDate:
      getValue(row["Giden Arama Sistem Oluşturma Tarihi"]) ||
      getValue(row.outgoingCallSystemDate),
    customerResponseDate:
      getValue(row["Müşteri Geri Dönüş Tarihi (Giden Arama)"]) ||
      getValue(row.customerResponseDate),
    wasEmailSent:
      getValue(row["GERİ DÖNÜŞ YAPILDI MI? (Müşteriye Mail Gönderildi mi?)"]) ||
      getValue(row.wasEmailSent),
    customerEmailResponseDate:
      getValue(row["Müşteri Mail Geri Dönüş Tarihi"]) ||
      getValue(row.customerEmailResponseDate),
    unreachableByPhone:
      getValue(row["Telefonla Ulaşılamayan Müşteriler"]) ||
      getValue(row.unreachableByPhone),
    daysWaitingResponse:
      getIntValue(row["Kaç Gündür Geri Dönüş Bekliyor"]) ||
      getIntValue(row.daysWaitingResponse),
    daysToResponse:
      getIntValue(row["Kaç Günde Geri Dönüş Yapılmış (Süre)"]) ||
      getIntValue(row.daysToResponse),
    callNote:
      getValue(row["GERİ DÖNÜŞ NOTU (Giden Arama Notu)"]) ||
      getValue(row["Arama Notu"]) ||
      getValue(row.callNote),
    emailNote:
      getValue(row["GERİ DÖNÜŞ NOTU (Giden Mail Notu)"]) ||
      getValue(row.emailNote),
    oneOnOneMeeting:
      getValue(row["Birebir Görüşme Yapıldı mı ?"]) ||
      getValue(row["Birebir Görüşme Yapıldı mı?"]) ||
      getValue(row.oneOnOneMeeting),
    meetingDate:
      getValue(row["Birebir Görüşme Tarihi"]) || getValue(row.meetingDate),
    responseResult:
      getValue(row["Dönüş Görüşme Sonucu"]) || getValue(row.responseResult),
    negativeReason:
      getValue(row["Dönüş Olumsuzluk Nedeni"]) || getValue(row.negativeReason),
    wasSaleMade:
      getValue(row["Müşteriye Satış Yapıldı Mı ?"]) ||
      getValue(row["Müşteriye Satış Yapıldı Mı?"]) ||
      getValue(row.wasSaleMade),
    saleCount: getIntValue(row["Satış Adedi"]) || getIntValue(row.saleCount),
    appointmentDate:
      getValue(row["Randevu Tarihi"]) || getValue(row.appointmentDate),
    lastMeetingNote:
      getValue(row["SON GORUSME NOTU"]) ||
      getValue(row["Son Görüşme Notu"]) ||
      getValue(row.lastMeetingNote),
    lastMeetingResult:
      getValue(row["SON GORUSME SONUCU"]) ||
      getValue(row["Son Görüşme Sonucu"]) ||
      getValue(row.lastMeetingResult),
  };
}

import { sampleLeads } from './sample-data';

export async function registerRoutes(app: Express): Promise<Server> {
  // Load sample data for testing
  app.get("/api/load-sample-data", async (req, res) => {
    try {
      // Clear existing leads
      await storage.clearAllLeads();
      
      // Add sample leads
      for (const lead of sampleLeads) {
        await storage.createLead(lead);
      }
      
      res.json({ success: true, message: "Sample data loaded successfully", count: sampleLeads.length });
    } catch (error) {
      console.error("Failed to load sample data:", error);
      res.status(500).json({ message: "Failed to load sample data" });
    }
  });

  // Leads endpoints
  app.get("/api/leads", async (req, res) => {
    try {
      const { startDate, endDate, salesRep, leadType, status, month, year } =
        req.query;

      // Enhanced filtering with automatic month logic
      let finalStartDate = startDate as string;
      let finalEndDate = endDate as string;

      // Auto-select full month logic
      if (month && year) {
        const monthNum = parseInt(month as string);
        const yearNum = parseInt(year as string);
        finalStartDate = `${yearNum}-${monthNum
          .toString()
          .padStart(2, "0")}-01`;
        const lastDay = new Date(yearNum, monthNum, 0).getDate();
        finalEndDate = `${yearNum}-${monthNum
          .toString()
          .padStart(2, "0")}-${lastDay}`;
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
        details: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // File upload endpoint
  app.post(
    "/api/leads/import",
    upload.single("file"),
    async (req: any, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({ message: "No file uploaded" });
        }

        const { buffer, mimetype, originalname } = req.file;
        let leads: any[] = [];

        if (
          mimetype ===
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
          originalname.endsWith(".xlsx")
        ) {
          // Parse Excel file
          const workbook = XLSX.read(buffer, { type: "buffer" });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          leads = XLSX.utils.sheet_to_json(worksheet);
        } else if (mimetype === "text/csv" || originalname.endsWith(".csv")) {
          // Parse CSV file
          const csvText = buffer.toString("utf-8");
          const result = Papa.parse(csvText, { header: true });
          leads = result.data;
        } else if (
          mimetype === "application/json" ||
          originalname.endsWith(".json")
        ) {
          // Parse JSON file
          const jsonText = buffer.toString("utf-8");
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
          imported: 0,
        };

        // Extract unique sales personnel names and auto-create them
        const uniquePersonnel = new Set<string>();
        leads.forEach((lead) => {
          const mappedData = mapRowToLead(lead);
          if (
            mappedData.assignedPersonnel &&
            mappedData.assignedPersonnel.trim()
          ) {
            uniquePersonnel.add(mappedData.assignedPersonnel.trim());
          }
        });

        // Auto-create sales reps for any new personnel
        for (const personnelName of Array.from(uniquePersonnel)) {
          try {
            await storage.createSalesRepByName(personnelName);
          } catch (error) {
            console.log(
              `Note: Sales rep ${personnelName} already exists or could not be created`
            );
          }
        }

        // Enhanced validation and warnings
        const createdLeads = [];
        const errors = [];
        const validationWarnings = {
          dateFormatIssues: 0,
          missingStatusCount: 0,
          totalRecords: leads.length,
          supportedDateFormats: [
            "DD.MM.YYYY",
            "DD/MM/YYYY",
            "MM.DD.YYYY",
            "YYYY-MM-DD",
          ],
          statusColumnPresent: false,
          dateColumnPresent: false,
        };

        // Check if critical columns are present
        if (leads.length > 0) {
          const firstRow = leads[0];
          validationWarnings.dateColumnPresent = !!(
            firstRow["Talep Geliş Tarihi"] ||
            firstRow["Talep Tarihi"] ||
            firstRow["requestDate"] ||
            firstRow["date"]
          );

          validationWarnings.statusColumnPresent = !!(
            firstRow["SON GORUSME SONUCU"] ||
            firstRow["SON GÖRÜŞME SONUCU"] ||
            firstRow["Son Görüşme Sonucu"] ||
            firstRow["lastMeetingResult"]
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
            const isDuplicate = existingLeads.some((existing) => {
              // Primary check: Customer ID and Contact ID
              if (
                mappedData.customerId &&
                existing.customerId &&
                mappedData.customerId === existing.customerId
              ) {
                duplicateInfo.byCustomerId++;
                return true;
              }

              if (
                mappedData.contactId &&
                existing.contactId &&
                mappedData.contactId === existing.contactId
              ) {
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
              console.log(
                `⚠️ Duplicate detected and skipped: ${mappedData.customerName} (ID: ${mappedData.customerId})`
              );
              continue;
            }

            // Track validation issues
            if (!mappedData.requestDate || mappedData.requestDate === "") {
              validationWarnings.dateFormatIssues++;
            }

            if (!mappedData.status || mappedData.status === "Tanımsız") {
              validationWarnings.missingStatusCount++;
            }

            const leadData = insertLeadSchema.parse(mappedData);

            // Auto-create sales rep if doesn't exist
            if (leadData.assignedPersonnel) {
              const existingSalesReps = await storage.getSalesReps();
              const salesRepExists = existingSalesReps.some(
                (rep) => rep.name === leadData.assignedPersonnel
              );

              if (!salesRepExists) {
                try {
                  await storage.createSalesRep({
                    name: leadData.assignedPersonnel,
                    monthlyTarget: 10, // Default target
                    isActive: true,
                  });
                  console.log(
                    `✅ Auto-created sales rep: ${leadData.assignedPersonnel}`
                  );
                } catch (error) {
                  console.log(
                    `⚠️ Could not auto-create sales rep ${leadData.assignedPersonnel}:`,
                    error
                  );
                }
              }
            }

            const lead = await storage.createLead(leadData);
            createdLeads.push(lead);
            duplicateInfo.imported++;
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            errors.push({ row: i + 1, error: errorMessage });
          }
        }

        duplicateInfo.total =
          duplicateInfo.byCustomerId +
          duplicateInfo.byContactId +
          duplicateInfo.byName;

        res.json({
          message: `Successfully imported ${createdLeads.length} leads${
            errors.length > 0 ? ` with ${errors.length} errors` : ""
          }${
            duplicateInfo.skipped > 0
              ? `. Skipped ${duplicateInfo.skipped} duplicates`
              : ""
          }`,
          imported: createdLeads.length,
          errors: errors.length,
          errorDetails: errors,
          validationWarnings,
          duplicateInfo: {
            ...duplicateInfo,
            message:
              duplicateInfo.skipped > 0
                ? `Found ${duplicateInfo.skipped} duplicate records: ${duplicateInfo.byCustomerId} by Customer ID, ${duplicateInfo.byContactId} by Contact ID, ${duplicateInfo.byName} by Name`
                : "No duplicates found",
          },
        });
      } catch (error) {
        res.status(500).json({
          message: "Failed to import file",
          error: (error as Error).message,
        });
      }
    }
  );

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

  // Takipte (Follow-up) data endpoints
  let takipteStorage: any[] = [];

  // Initialize takipteStorage with data from JSON file
  const initializeTakipteStorage = () => {
    try {
      const takipteDataPath = path.join(__dirname, '../takipte_response.json');
      if (fs.existsSync(takipteDataPath)) {
        const rawData = fs.readFileSync(takipteDataPath, 'utf8');
        takipteStorage = JSON.parse(rawData);
        console.log(`Loaded ${takipteStorage.length} takipte records from file`);
      } else {
        console.log('No takipte data file found, starting with empty storage');
        takipteStorage = [];
      }
    } catch (error) {
      console.error('Error loading takipte data:', error);
      takipteStorage = [];
    }
  };

  // Initialize storage on startup
  initializeTakipteStorage();

  // Function to save takipteStorage to JSON file
  function saveTakipteStorage() {
    try {
      const takipteDataPath = path.join(__dirname, "../takipte_response.json");
      fs.writeFileSync(takipteDataPath, JSON.stringify(takipteStorage, null, 2));
      console.log(`Saved ${takipteStorage.length} takipte records to file`);
    } catch (error) {
      console.error("Error saving takipte data:", error);
    }
  }

  app.post("/api/takipte/import", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      console.log(`Processing Takipte file: ${req.file.originalname}`);

      // Parse the takipte file
      const jsonData: any[] = [];
      const extension = req.file.originalname.split(".").pop()?.toLowerCase();

      if (extension === "xlsx" || extension === "xls") {
        const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        jsonData.push(...XLSX.utils.sheet_to_json(worksheet));
      } else if (extension === "csv") {
        const csvText = req.file.buffer.toString("utf8");
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            jsonData.push(...results.data);
          },
        });
      }

      // Debug: log first few items to see the structure
      console.log(
        "Sample data structure:",
        JSON.stringify(jsonData.slice(0, 1), null, 2)
      );
      console.log("Available columns:", Object.keys(jsonData[0] || {}));

      // Store in memory (in production, this would go to database)
      // More flexible filtering - accept any row that has at least one meaningful column
      takipteStorage = jsonData.filter((item) => {
        const hasCustomerInfo =
          item["Müşteri Adı Soyadı"] ||
          item["Müşteri Adı"] ||
          item.customerName ||
          item["Customer Name"];
        const hasId =
          item["Müşteri ID"] ||
          item["İletişim ID"] ||
          item.customerId ||
          item.contactId;
        const hasAnyData = Object.keys(item).some(
          (key) => item[key] && item[key].toString().trim() !== ""
        );

        return hasCustomerInfo || hasId || hasAnyData;
      });

      console.log(`Processed ${takipteStorage.length} takipte records`);

      // Save to JSON file
      saveTakipteStorage();

      res.json({
        message: "Takipte file imported successfully",
        imported: takipteStorage.length,
        sampleData: takipteStorage.slice(0, 3), // Return sample for verification
      });
    } catch (error) {
      console.error("Error importing takipte file:", error);
      res.status(500).json({
        message: "Failed to import takipte file",
        error: (error as Error).message,
      });
    }
  });

  // Excel-style takipte data import
  app.post("/api/takipte/import-excel", async (req, res) => {
    try {
      const { data } = req.body;

      if (!data || !Array.isArray(data)) {
        return res.status(400).json({ error: "Invalid data format" });
      }

      // Filter out empty rows
      const validData = data.filter((row) => {
        return Object.values(row).some(
          (value) => value && value.toString().trim() !== ""
        );
      });

      console.log(
        `Excel takipte data:`,
        JSON.stringify(validData.slice(0, 2), null, 2)
      );
      console.log(`Processed ${validData.length} Excel takipte records`);

      // Store takipte data
      takipteStorage = validData;

      // Save to JSON file
      saveTakipteStorage();

      res.json({
        message: "Excel takipte data imported successfully",
        recordCount: validData.length,
      });
    } catch (error) {
      console.error("Excel takipte import error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Main lead data import from Excel Input tab
  app.post("/api/leads/import-main", async (req, res) => {
    try {
      const { data } = req.body;

      if (!data || !Array.isArray(data)) {
        return res.status(400).json({ error: "Invalid data format" });
      }

      // Filter out empty rows
      const validData = data.filter((row) => {
        return Object.values(row).some(
          (value) => value && value.toString().trim() !== ""
        );
      });

      console.log(
        `Excel main lead data:`,
        JSON.stringify(validData.slice(0, 2), null, 2)
      );
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
          console.error("Error processing lead row:", error);
        }
      }

      res.json({
        message: "Excel main lead data imported successfully",
        recordCount: leads.length,
      });
    } catch (error) {
      console.error("Excel main lead import error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Main lead data mapping function for Excel input
  function mapMainDataToLead(row: any): any {
    const parseDate = (dateStr: string): string => {
      if (!dateStr || dateStr.trim() === "") return "";

      try {
        // Try DD/MM/YYYY format (Turkish standard)
        if (dateStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
          const [day, month, year] = dateStr.split("/");
          return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
        }

        // Try DD.MM.YYYY format
        if (dateStr.match(/^\d{1,2}\.\d{1,2}\.\d{4}$/)) {
          const [day, month, year] = dateStr.split(".");
          return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
        }

        // Try YYYY-MM-DD format (already correct)
        if (dateStr.match(/^\d{4}-\d{1,2}-\d{1,2}$/)) {
          const parts = dateStr.split("-");
          return `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(
            2,
            "0"
          )}`;
        }

        // Try parsing as Date object for other formats
        const parsedDate = new Date(dateStr);
        if (!isNaN(parsedDate.getTime())) {
          return parsedDate.toISOString().split("T")[0];
        }

        return "";
      } catch {
        return "";
      }
    };

    // Extract project name from WebForm Notu
    function extractProjectFromWebForm(
      webFormNote: string
    ): string | undefined {
      if (!webFormNote) return undefined;

      const projectPatterns = [
        /proje[:\s]+([^\n,]+)/i,
        /project[:\s]+([^\n,]+)/i,
        /([A-Z][a-zA-ZğüşıöçĞÜŞİÖÇ\s]+(?:Residence|Rezidans|Plaza|Tower|Park|Sitesi|Projesi))/i,
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
      if (!webFormNote) return "kiralama";

      const normalized = webFormNote.toLowerCase();
      if (
        normalized.includes("satış") ||
        normalized.includes("satis") ||
        normalized.includes("sale")
      ) {
        return "satis";
      }
      return "kiralama";
    }

    const customerName = row["Müşteri Adı Soyadı"] || "";
    const requestDate = parseDate(row["Talep Geliş Tarihi"] || "");
    const assignedPersonnel = row["Atanan Personel"] || "";
    const webFormNote = row["WebForm Notu"] || "";
    const lastMeetingResult = row["SON GORUSME SONUCU"] || "";

    // Extract project and lead type
    const projectName = extractProjectFromWebForm(webFormNote);
    const leadType = determineLeadType(webFormNote);

    // Determine status from last meeting result
    let status = "Tanımsız";
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
      customerId: row["Müşteri ID"] || undefined,
      contactId: row["İletişim ID"] || undefined,
      firstCustomerSource: row["İlk Müşteri Kaynağı"] || undefined,
      formCustomerSource: row["Form Müşteri Kaynağı"] || undefined,
      webFormNote,
      infoFormLocation1: row["İnfo Form Geliş Yeri"] || undefined,
      infoFormLocation2: row["İnfo Form Geliş Yeri 2"] || undefined,
      infoFormLocation3: row["İnfo Form Geliş Yeri 3"] || undefined,
      infoFormLocation4: row["İnfo Form Geliş Yeri 4"] || undefined,
      reminderPersonnel: row["Hatırlatma Personeli"] || undefined,
      wasCalledBack:
        row["GERİ DÖNÜŞ YAPILDI MI? (Müşteri Arandı mı?)"] || undefined,
      webFormPoolDate: row["Web Form Havuz Oluşturma Tarihi"] || undefined,
      formSystemDate: row["Form Sistem Olusturma Tarihi"] || undefined,
      assignmentTimeDiff: row["Atama Saat Farkı"] || undefined,
      responseTimeDiff: row["Dönüş Saat Farkı"] || undefined,
      outgoingCallSystemDate:
        row["Giden Arama Sistem Oluşturma Tarihi"] || undefined,
      customerResponseDate:
        row["Müşteri Geri Dönüş Tarihi (Giden Arama)"] || undefined,
      wasEmailSent:
        row["GERİ DÖNÜŞ YAPILDI MI? (Müşteriye Mail Gönderildi mi?)"] ||
        undefined,
      customerEmailResponseDate:
        row["Müşteri Mail Geri Dönüş Tarihi"] || undefined,
      unreachableByPhone: row["Telefonla Ulaşılamayan Müşteriler"] || undefined,
      daysWaitingResponse:
        parseInt(row["Kaç Gündür Geri Dönüş Bekliyor"]) || undefined,
      daysToResponse:
        parseInt(row["Kaç Günde Geri Dönüş Yapılmış (Süre)"]) || undefined,
      callNote: row["GERİ DÖNÜŞ NOTU (Giden Arama Notu)"] || undefined,
      emailNote: row["GERİ DÖNÜŞ NOTU (Giden Mail Notu)"] || undefined,
      oneOnOneMeeting: row["Birebir Görüşme Yapıldı mı ?"] || undefined,
      meetingDate: row["Birebir Görüşme Tarihi"] || undefined,
      responseResult: row["Dönüş Görüşme Sonucu"] || undefined,
      negativeReason: row["Dönüş Olumsuzluk Nedeni"] || undefined,
      wasSaleMade: row["Müşteriye Satış Yapıldı Mı ?"] || undefined,
      saleCount: parseInt(row["Satış Adedi"]) || undefined,
      appointmentDate: row["Randevu Tarihi"] || undefined,
      lastMeetingNote: row["SON GORUSME NOTU"] || undefined,
      lastMeetingResult: row["SON GORUSME SONUCU"] || undefined,
    };
  }

  app.get("/api/takipte", async (req, res) => {
    try {
      const { startDate, endDate, month, year } = req.query;

      let filteredData = takipteStorage;

      // Apply date filtering if parameters are provided
      if (startDate || endDate || month || year) {
        filteredData = takipteStorage.filter((item) => {
          const dateStr = item.Tarih || item.date || "";
          if (!dateStr) return true; // Include items without dates

          const itemDate = new Date(dateStr);
          if (isNaN(itemDate.getTime())) return true; // Include items with invalid dates

          // Year filter
          if (year && itemDate.getFullYear().toString() !== year) return false;

          // Month filter (1-12 to 01-12)
          if (
            month &&
            (itemDate.getMonth() + 1).toString().padStart(2, "0") !== month
          )
            return false;

          // Date range filter
          if (startDate && itemDate < new Date(startDate as string))
            return false;
          if (endDate && itemDate > new Date(endDate as string)) return false;

          return true;
        });
      }

      res.json(filteredData);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch takipte data" });
    }
  });

  // Update individual cell in takipte data
  app.put("/api/takipte/update-cell", async (req, res) => {
    try {
      const { rowIndex, columnId, value } = req.body;

      if (rowIndex < 0 || rowIndex >= takipteStorage.length) {
        return res.status(400).json({ message: "Invalid row index" });
      }

      if (!columnId) {
        return res.status(400).json({ message: "Column ID is required" });
      }

      // Update the cell value
      takipteStorage[rowIndex][columnId] = value;

      // Save to JSON file
      saveTakipteStorage();

      res.json({ 
        message: "Cell updated successfully", 
        rowIndex, 
        columnId, 
        value 
      });
    } catch (error) {
      console.error("Error updating cell:", error);
      res.status(500).json({ 
        message: "Failed to update cell", 
        error: (error as Error).message 
      });
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
        filteredTakipte = takipteStorage.filter((item) => {
          const dateStr = item.Tarih || item.date || "";
          if (!dateStr) return true; // Include items without dates

          const itemDate = new Date(dateStr);
          if (isNaN(itemDate.getTime())) return true; // Include items with invalid dates

          // Year filter
          if (year && itemDate.getFullYear().toString() !== year) return false;

          // Month filter (1-12 to 01-12)
          if (
            month &&
            (itemDate.getMonth() + 1).toString().padStart(2, "0") !== month
          )
            return false;

          // Date range filter
          if (startDate && itemDate < new Date(startDate as string))
            return false;
          if (endDate && itemDate > new Date(endDate as string)) return false;

          return true;
        });
      }

      // Enhanced stats combining both data sources with date filtering applied
      const enhancedStats = {
        leads: {
          total: leads.length,
          byStatus: leads.reduce((acc, lead) => {
            acc[lead.status || "yeni"] = (acc[lead.status || "yeni"] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
          byType: leads.reduce((acc, lead) => {
            acc[lead.leadType] = (acc[lead.leadType] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
          byPersonnel: leads.reduce((acc, lead) => {
            const rep = lead.assignedPersonnel || "Belirtilmemiş";
            acc[rep] = (acc[rep] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
        },
        takipte: {
          total: filteredTakipte.length,
          hasData: filteredTakipte.length > 0,
          byKriter: filteredTakipte.reduce((acc, item) => {
            const kriter = item["Kriter"] || item.kriter || "Belirtilmemiş";
            acc[kriter] = (acc[kriter] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
          bySource: filteredTakipte.reduce((acc, item) => {
            const source =
              item["İrtibat Müşteri Kaynağı"] ||
              item["Müşteri Kaynağı"] ||
              "Bilinmiyor";
            acc[source] = (acc[source] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
          byMeetingType: filteredTakipte.reduce((acc, item) => {
            const meetingType =
              item["Görüşme Tipi"] || item.gorusmeTipi || "Belirtilmemiş";
            acc[meetingType] = (acc[meetingType] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
          byOffice: filteredTakipte.reduce((acc, item) => {
            const office = item["Ofis"] || item.ofis || "Ana Ofis";
            acc[office] = (acc[office] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
          byPersonnel: filteredTakipte.reduce((acc, item) => {
            // Debug: Log available fields in the first record
            if (Object.keys(acc).length === 0) {
              console.log("Available takipte fields:", Object.keys(item));
              console.log("Sample item:", JSON.stringify(item, null, 2));
            }

            // Try multiple possible field names for personnel
            const personnel =
              item["Personel Adı(11,908)"] ||
              item["Personel Adı"] ||
              item["Personnel"] ||
              item["personel"] ||
              "Belirtilmemiş";

            // Check "Son Sonuç Adı" for takipte status
            const sonSonuc = item["Son Sonuç Adı"] || "";
            const isTakipte =
              sonSonuc.toLowerCase().includes("takipte") ||
              sonSonuc.toLowerCase().includes("takide");

            // Only count if it's a takipte record
            if (isTakipte) {
              const normalizedPersonnel = personnel.trim();
              acc[normalizedPersonnel] = (acc[normalizedPersonnel] || 0) + 1;
            }
            return acc;
          }, {} as Record<string, number>),
        },
        combined: {
          hasSecondaryData: filteredTakipte.length > 0,
          personnelPerformance: {} as Record<string, any>,
        },
      };

      res.json(enhancedStats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch enhanced stats" });
    }
  });

  // New endpoint for meetings analytics
  app.get("/api/meeting-analytics", async (req, res) => {
    try {
      const { startDate, endDate, salesRep, leadType, month, year, project } = req.query;

      // Enhanced filtering with automatic month logic
      let finalStartDate = startDate as string;
      let finalEndDate = endDate as string;

      if (month && year) {
        const monthNum = parseInt(month as string);
        const yearNum = parseInt(year as string);
        finalStartDate = `${yearNum}-${monthNum
          .toString()
          .padStart(2, "0")}-01`;
        const lastDay = new Date(yearNum, monthNum, 0).getDate();
        finalEndDate = `${yearNum}-${monthNum
          .toString()
          .padStart(2, "0")}-${lastDay}`;
      }

      const leads = await storage.getLeadsByFilter({
        startDate: finalStartDate,
        endDate: finalEndDate,
        salesRep: salesRep as string,
        leadType: leadType as string,
        project: project as string,
      });

      // Meeting analytics statistics
      const totalLeads = leads.length;
      let totalMeetings = 0;
      let meetingsWithDates = 0;
      const meetingsByPersonnel: Record<string, number> = {};
      const meetingTimeDiffs: number[] = [];
      let maxTimeDiff = 0;
      let minTimeDiff = Infinity;
      let totalTimeDiff = 0;

      leads.forEach((lead) => {
        const hasMeeting =
          lead.oneOnOneMeeting?.toLowerCase() === "evet" ||
          lead.oneOnOneMeeting?.toLowerCase() === "yes";

        if (hasMeeting) {
          totalMeetings++;
          const personnel = lead.assignedPersonnel || "Belirtilmemiş";
          meetingsByPersonnel[personnel] =
            (meetingsByPersonnel[personnel] || 0) + 1;

          // Calculate time difference if meeting date is available
          if (lead.meetingDate && lead.requestDate) {
            const meetingDate = new Date(lead.meetingDate);
            const requestDate = new Date(lead.requestDate);

            if (
              !isNaN(meetingDate.getTime()) &&
              !isNaN(requestDate.getTime())
            ) {
              meetingsWithDates++;
              const timeDiff = Math.floor(
                (meetingDate.getTime() - requestDate.getTime()) /
                  (1000 * 60 * 60 * 24)
              ); // days

              if (timeDiff >= 0) {
                // Only count positive differences (meeting after request)
                meetingTimeDiffs.push(timeDiff);
                totalTimeDiff += timeDiff;
                maxTimeDiff = Math.max(maxTimeDiff, timeDiff);
                minTimeDiff = Math.min(minTimeDiff, timeDiff);
              }
            }
          }
        }
      });

      // Distribution of time to meeting
      const timeRanges = {
        "0-3 days": 0,
        "4-7 days": 0,
        "8-14 days": 0,
        "15-30 days": 0,
        "31+ days": 0,
      };

      meetingTimeDiffs.forEach((days) => {
        if (days <= 3) timeRanges["0-3 days"]++;
        else if (days <= 7) timeRanges["4-7 days"]++;
        else if (days <= 14) timeRanges["8-14 days"]++;
        else if (days <= 30) timeRanges["15-30 days"]++;
        else timeRanges["31+ days"]++;
      });

      const avgMeetingTime =
        meetingsWithDates > 0
          ? (totalTimeDiff / meetingsWithDates).toFixed(1)
          : "0";

      res.json({
        totalLeads,
        totalMeetings,
        meetingsPercentage:
          totalLeads > 0 ? Math.round((totalMeetings / totalLeads) * 100) : 0,
        avgDaysToMeeting: avgMeetingTime,
        minDaysToMeeting: minTimeDiff === Infinity ? 0 : minTimeDiff,
        maxDaysToMeeting: maxTimeDiff,
        meetingsByPersonnel: Object.entries(meetingsByPersonnel)
          .map(([personnel, count]) => ({
            personnel,
            count,
            percentage:
              totalMeetings > 0 ? Math.round((count / totalMeetings) * 100) : 0,
          }))
          .sort((a, b) => b.count - a.count),
        meetingTimeDistribution: Object.entries(timeRanges).map(
          ([range, count]) => ({
            range,
            count,
            percentage:
              meetingsWithDates > 0
                ? Math.round((count / meetingsWithDates) * 100)
                : 0,
          })
        ),
      });
    } catch (error) {
      console.error("Error calculating meeting analytics:", error);
      res.status(500).json({
        message: "Failed to calculate meeting analytics",
        error: (error as Error).message,
      });
    }
  });

  // Target audience analytics endpoint
  app.get("/api/target-audience-analytics", async (req, res) => {
    try {
      const { startDate, endDate, salesRep, leadType, month, year } = req.query;

      // Enhanced filtering with automatic month logic
      let finalStartDate = startDate as string;
      let finalEndDate = endDate as string;

      if (month && year) {
        const monthNum = parseInt(month as string);
        const yearNum = parseInt(year as string);
        finalStartDate = `${yearNum}-${monthNum
          .toString()
          .padStart(2, "0")}-01`;
        const lastDay = new Date(yearNum, monthNum, 0).getDate();
        finalEndDate = `${yearNum}-${monthNum
          .toString()
          .padStart(2, "0")}-${lastDay}`;
      }

      const leads = await storage.getLeadsByFilter({
        startDate: finalStartDate,
        endDate: finalEndDate,
        salesRep: salesRep as string,
        leadType: leadType as string,
        status: req.query.status as string,
        project: req.query.project as string,
      });

      // Target audience analytics from infoFormLocation2
      const audienceCounts: Record<string, number> = {};
      const audienceSuccess: Record<
        string,
        { total: number; meetings: number; sales: number }
      > = {};
      let totalWithAudience = 0;

      leads.forEach((lead) => {
        const audience = lead.infoFormLocation2 || "Belirtilmemiş";
        const hasMeeting =
          lead.oneOnOneMeeting?.toLowerCase() === "evet" ||
          lead.oneOnOneMeeting?.toLowerCase() === "yes";
        const hasSale =
          lead.wasSaleMade?.toLowerCase() === "evet" ||
          lead.wasSaleMade?.toLowerCase() === "yes";

        // Count by audience
        audienceCounts[audience] = (audienceCounts[audience] || 0) + 1;

        // Track success metrics by audience
        if (!audienceSuccess[audience]) {
          audienceSuccess[audience] = { total: 0, meetings: 0, sales: 0 };
        }

        audienceSuccess[audience].total++;
        if (hasMeeting) audienceSuccess[audience].meetings++;
        if (hasSale) audienceSuccess[audience].sales++;

        if (audience !== "Belirtilmemiş") {
          totalWithAudience++;
        }
      });

      const audienceAnalysis = Object.entries(audienceCounts)
        .map(([audience, count]) => ({
          audience,
          count,
          percentage:
            leads.length > 0 ? Math.round((count / leads.length) * 100) : 0,
          meetingRate:
            audienceSuccess[audience].total > 0
              ? Math.round(
                  (audienceSuccess[audience].meetings /
                    audienceSuccess[audience].total) *
                    100
                )
              : 0,
          salesRate:
            audienceSuccess[audience].total > 0
              ? Math.round(
                  (audienceSuccess[audience].sales /
                    audienceSuccess[audience].total) *
                    100
                )
              : 0,
          meetings: audienceSuccess[audience].meetings,
          sales: audienceSuccess[audience].sales,
        }))
        .sort((a, b) => b.count - a.count);

      res.json({
        totalLeads: leads.length,
        totalWithAudience,
        audienceAnalysis,
        audienceCoverage:
          leads.length > 0
            ? Math.round((totalWithAudience / leads.length) * 100)
            : 0,
      });
    } catch (error) {
      console.error("Error calculating target audience analytics:", error);
      res.status(500).json({
        message: "Failed to calculate target audience analytics",
        error: (error as Error).message,
      });
    }
  });

  // Artwork analytics endpoint
  app.get("/api/artwork-analytics", async (req, res) => {
    try {
      const { startDate, endDate, salesRep, leadType, month, year } = req.query;

      // Enhanced filtering with automatic month logic
      let finalStartDate = startDate as string;
      let finalEndDate = endDate as string;

      if (month && year) {
        const monthNum = parseInt(month as string);
        const yearNum = parseInt(year as string);
        finalStartDate = `${yearNum}-${monthNum
          .toString()
          .padStart(2, "0")}-01`;
        const lastDay = new Date(yearNum, monthNum, 0).getDate();
        finalEndDate = `${yearNum}-${monthNum
          .toString()
          .padStart(2, "0")}-${lastDay}`;
      }

      const leads = await storage.getLeadsByFilter({
        startDate: finalStartDate,
        endDate: finalEndDate,
        salesRep: salesRep as string,
        leadType: leadType as string,
        status: req.query.status as string,
        project: req.query.project as string,
      });

      // Artwork analytics from infoFormLocation3
      const artworkCounts: Record<string, number> = {};
      const artworkSuccess: Record<
        string,
        { total: number; meetings: number; sales: number }
      > = {};
      let totalWithArtwork = 0;

      leads.forEach((lead) => {
        const artwork = lead.infoFormLocation3 || "Belirtilmemiş";
        const hasMeeting =
          lead.oneOnOneMeeting?.toLowerCase() === "evet" ||
          lead.oneOnOneMeeting?.toLowerCase() === "yes";
        const hasSale =
          lead.wasSaleMade?.toLowerCase() === "evet" ||
          lead.wasSaleMade?.toLowerCase() === "yes";

        // Count by artwork
        artworkCounts[artwork] = (artworkCounts[artwork] || 0) + 1;

        // Track success metrics by artwork
        if (!artworkSuccess[artwork]) {
          artworkSuccess[artwork] = { total: 0, meetings: 0, sales: 0 };
        }

        artworkSuccess[artwork].total++;
        if (hasMeeting) artworkSuccess[artwork].meetings++;
        if (hasSale) artworkSuccess[artwork].sales++;

        if (artwork !== "Belirtilmemiş") {
          totalWithArtwork++;
        }
      });

      const artworkAnalysis = Object.entries(artworkCounts)
        .map(([artwork, count]) => ({
          artwork,
          count,
          percentage:
            leads.length > 0 ? Math.round((count / leads.length) * 100) : 0,
          meetingRate:
            artworkSuccess[artwork].total > 0
              ? Math.round(
                  (artworkSuccess[artwork].meetings /
                    artworkSuccess[artwork].total) *
                    100
                )
              : 0,
          salesRate:
            artworkSuccess[artwork].total > 0
              ? Math.round(
                  (artworkSuccess[artwork].sales /
                    artworkSuccess[artwork].total) *
                    100
                )
              : 0,
          meetings: artworkSuccess[artwork].meetings,
          sales: artworkSuccess[artwork].sales,
        }))
        .sort((a, b) => b.count - a.count);

      // Combined audience + artwork analysis
      const combinedAnalysis: any[] = [];

      leads.forEach((lead) => {
        const audience = lead.infoFormLocation2 || "Belirtilmemiş";
        const artwork = lead.infoFormLocation3 || "Belirtilmemiş";
        const hasMeeting =
          lead.oneOnOneMeeting?.toLowerCase() === "evet" ||
          lead.oneOnOneMeeting?.toLowerCase() === "yes";
        const hasSale =
          lead.wasSaleMade?.toLowerCase() === "evet" ||
          lead.wasSaleMade?.toLowerCase() === "yes";

        const key = `${audience}|${artwork}`;

        let found = combinedAnalysis.find((item) => item.key === key);
        if (!found) {
          found = {
            key,
            audience,
            artwork,
            count: 0,
            meetings: 0,
            sales: 0,
          };
          combinedAnalysis.push(found);
        }

        found.count++;
        if (hasMeeting) found.meetings++;
        if (hasSale) found.sales++;
      });

      // Calculate rates for combined analysis
      combinedAnalysis.forEach((item) => {
        item.meetingRate =
          item.count > 0 ? Math.round((item.meetings / item.count) * 100) : 0;
        item.salesRate =
          item.count > 0 ? Math.round((item.sales / item.count) * 100) : 0;
        item.percentage =
          leads.length > 0 ? Math.round((item.count / leads.length) * 100) : 0;
      });

      // Sort by count descending
      combinedAnalysis.sort((a, b) => b.count - a.count);

      res.json({
        totalLeads: leads.length,
        totalWithArtwork,
        artworkAnalysis,
        combinedAnalysis: combinedAnalysis.slice(0, 20), // Limit to top 20 combinations
        artworkCoverage:
          leads.length > 0
            ? Math.round((totalWithArtwork / leads.length) * 100)
            : 0,
      });
    } catch (error) {
      console.error("Error calculating artwork analytics:", error);
      res.status(500).json({
        message: "Failed to calculate artwork analytics",
        error: (error as Error).message,
      });
    }
  });

  // Combined marketing analytics endpoint
  app.get("/api/marketing-analytics", async (req, res) => {
    try {
      const { startDate, endDate, salesRep, leadType, month, year } = req.query;

      // Enhanced filtering with automatic month logic
      let finalStartDate = startDate as string;
      let finalEndDate = endDate as string;

      if (month && year) {
        const monthNum = parseInt(month as string);
        const yearNum = parseInt(year as string);
        finalStartDate = `${yearNum}-${monthNum
          .toString()
          .padStart(2, "0")}-01`;
        const lastDay = new Date(yearNum, monthNum, 0).getDate();
        finalEndDate = `${yearNum}-${monthNum
          .toString()
          .padStart(2, "0")}-${lastDay}`;
      }

      const leads = await storage.getLeadsByFilter({
        startDate: finalStartDate,
        endDate: finalEndDate,
        salesRep: salesRep as string,
        leadType: leadType as string,
      });

      // Top performing combinations
      const combinedPerformance: Record<
        string,
        {
          audienceType: string;
          artworkType: string;
          total: number;
          meetings: number;
          meetingRate: number;
          sales: number;
          salesRate: number;
        }
      > = {};

      leads.forEach((lead) => {
        const audience = lead.infoFormLocation2 || "Belirtilmemiş";
        const artwork = lead.infoFormLocation3 || "Belirtilmemiş";

        if (audience === "Belirtilmemiş" && artwork === "Belirtilmemiş") {
          return; // Skip entries with no marketing data
        }

        const key = `${audience}|${artwork}`;

        if (!combinedPerformance[key]) {
          combinedPerformance[key] = {
            audienceType: audience,
            artworkType: artwork,
            total: 0,
            meetings: 0,
            meetingRate: 0,
            sales: 0,
            salesRate: 0,
          };
        }

        combinedPerformance[key].total++;

        if (
          lead.oneOnOneMeeting?.toLowerCase() === "evet" ||
          lead.oneOnOneMeeting?.toLowerCase() === "yes"
        ) {
          combinedPerformance[key].meetings++;
        }

        if (
          lead.wasSaleMade?.toLowerCase() === "evet" ||
          lead.wasSaleMade?.toLowerCase() === "yes"
        ) {
          combinedPerformance[key].sales++;
        }
      });

      // Calculate rates and prepare final array
      const marketingPerformance = Object.values(combinedPerformance)
        .map((item) => {
          if (item.total > 0) {
            item.meetingRate = Math.round((item.meetings / item.total) * 100);
            item.salesRate = Math.round((item.sales / item.total) * 100);
          }
          return item;
        })
        .filter((item) => item.total >= 5) // Only include combinations with at least 5 leads
        .sort((a, b) => b.salesRate - a.salesRate);

      res.json({
        totalLeads: leads.length,
        marketingPerformance,
        topPerformingAudiences: marketingPerformance
          .filter(
            (v, i, a) =>
              i === a.findIndex((t) => t.audienceType === v.audienceType)
          )
          .map((item) => ({ audienceType: item.audienceType }))
          .slice(0, 5),
        topPerformingArtworks: marketingPerformance
          .filter(
            (v, i, a) =>
              i === a.findIndex((t) => t.artworkType === v.artworkType)
          )
          .map((item) => ({ artworkType: item.artworkType }))
          .slice(0, 5),
      });
    } catch (error) {
      console.error("Error calculating marketing analytics:", error);
      res.status(500).json({
        message: "Failed to calculate marketing analytics",
        error: (error as Error).message,
      });
    }
  });

  const router = express.Router();

  router.post('/api/export/pdf', async (req, res) => {
    console.log('PDF export endpoint hit');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    try {
      const reportProps = req.body; // Expect company, project, salesperson, data, etc.
      
      // Validate that we have some data to work with
      if (!reportProps) {
        console.error('No report props provided');
        return res.status(400).json({ error: 'Report data is required' });
      }
      
      console.log('Calling generateReportPDF...');
      const pdfBuffer = await generateReportPDF(reportProps);
      console.log('PDF generation completed, buffer size:', pdfBuffer.length);
      
      if (!pdfBuffer || pdfBuffer.length === 0) {
        console.error('Generated PDF buffer is empty or null');
        return res.status(500).json({ error: 'Failed to generate PDF - empty buffer' });
      }
      
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="lead-report.pdf"',
        'Content-Length': pdfBuffer.length.toString(),
      });
      
      console.log('Sending PDF response...');
      res.send(pdfBuffer);
      console.log('PDF response sent successfully');
      
    } catch (err) {
      console.error('PDF export error:', err);
      console.error('Error stack:', err instanceof Error ? err.stack : 'No stack trace');
      
      // Send detailed error information in development
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      const errorStack = err instanceof Error ? err.stack : undefined;
      
      res.status(500).json({ 
        error: 'Failed to generate PDF report',
        message: errorMessage,
        ...(process.env.NODE_ENV === 'development' && { stack: errorStack })
      });
    }
  });

  app.use('/api', router);

  const httpServer = createServer(app);
  return httpServer;
}

// Helper to safely get a string from req.query (handles string | string[] | undefined)
function getQueryString(param: any): string {
  if (Array.isArray(param)) return param[0] || "";
  return param || "";
}
