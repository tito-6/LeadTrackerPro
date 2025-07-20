import {
  leads,
  salesReps,
  settings,
  leadExpenses,
  type Lead,
  type InsertLead,
  type SalesRep,
  type InsertSalesRep,
  type Settings,
  type InsertSettings,
  type LeadExpense,
  type InsertLeadExpense,
} from "@shared/schema";

export interface IStorage {
  // Leads
  getLeads(): Promise<Lead[]>;
  getLeadById(id: number): Promise<Lead | undefined>;
  createLead(lead: InsertLead): Promise<Lead>;
  updateLead(id: number, lead: Partial<InsertLead>): Promise<Lead | undefined>;
  deleteLead(id: number): Promise<boolean>;
  clearAllLeads(): Promise<void>;
  getLeadsByFilter(filters: {
    startDate?: string;
    endDate?: string;
    month?: string;
    year?: string;
    salesRep?: string;
    leadType?: string;
    status?: string;
    project?: string;
  }): Promise<Lead[]>;

  // Sales Reps
  getSalesReps(): Promise<SalesRep[]>;
  getSalesRepById(id: number): Promise<SalesRep | undefined>;
  createSalesRep(salesRep: InsertSalesRep): Promise<SalesRep>;
  createSalesRepByName(name: string): Promise<SalesRep>;
  updateSalesRep(
    id: number,
    salesRep: Partial<InsertSalesRep>
  ): Promise<SalesRep | undefined>;
  deleteSalesRep(id: number): Promise<boolean>;

  // Settings
  getSettings(): Promise<Settings[]>;
  getSetting(key: string): Promise<Settings | undefined>;
  setSetting(setting: InsertSettings): Promise<Settings>;

  // Lead Expenses
  getLeadExpenses(): Promise<LeadExpense[]>;
  getLeadExpenseById(id: number): Promise<LeadExpense | undefined>;
  createLeadExpense(expense: InsertLeadExpense): Promise<LeadExpense>;
  updateLeadExpense(
    id: number,
    expense: Partial<InsertLeadExpense>
  ): Promise<LeadExpense | undefined>;
  deleteLeadExpense(id: number): Promise<boolean>;
  getLeadExpensesByMonth(month: string): Promise<LeadExpense[]>;
  
  // Get all leads or filtered leads
  getLeads(): Promise<Lead[]>;
  getLeadsByFilter(filter: {
    startDate?: string;
    endDate?: string;
    salesRep?: string;
    leadType?: string;
    status?: string;
  }): Promise<Lead[]>;
}

export class MemStorage implements IStorage {
  private leads: Map<number, Lead>;
  private salesReps: Map<number, SalesRep>;
  private settings: Map<string, Settings>;
  private leadExpenses: Map<number, LeadExpense>;
  private takipteData: any[]; // Store takipte/follow-up data
  private currentLeadId: number;
  private currentSalesRepId: number;
  private currentSettingsId: number;
  private currentExpenseId: number;

  constructor() {
    this.leads = new Map();
    this.salesReps = new Map();
    this.settings = new Map();
    this.leadExpenses = new Map();
    this.takipteData = [];
    this.currentLeadId = 1;
    this.currentSalesRepId = 1;
    this.currentSettingsId = 1;
    this.currentExpenseId = 1;

    // Initialize with some default sales reps
    this.initializeDefaults();
  }

  // Takipte data methods for local storage
  async getTakipteData(): Promise<any[]> {
    return this.takipteData;
  }

  async setTakipteData(data: any[]): Promise<void> {
    this.takipteData = data;
  }

  async clearTakipteData(): Promise<void> {
    this.takipteData = [];
  }

  private initializeDefaults() {
    // No default sales reps - all data should come from imported files

    // Default settings only
    const defaultSettings = [
      { key: "companyName", value: "" },
      { key: "currency", value: "TRY" },
      { key: "language", value: "tr" },
      { key: "darkMode", value: "false" },
      { key: "notifications", value: "true" },
      { key: "autoSave", value: "true" },
      { key: "colors.success", value: "#4CAF50" },
      { key: "colors.error", value: "#F44336" },
      { key: "colors.primary", value: "#1976D2" },
      { key: "colors.warning", value: "#FF9800" },
    ];

    defaultSettings.forEach((setting) => {
      const settingObj: Settings = { ...setting, id: this.currentSettingsId++ };
      this.settings.set(setting.key, settingObj);
    });
  }

  // Leads
  async getLeads(): Promise<Lead[]> {
    return Array.from(this.leads.values());
  }

  async getLeadById(id: number): Promise<Lead | undefined> {
    return this.leads.get(id);
  }

  async createLead(insertLead: InsertLead): Promise<Lead> {
    const id = this.currentLeadId++;
    const lead: Lead = {
      ...insertLead,
      id,
      // Ensure all nullable fields have proper null values
      customerId: insertLead.customerId || null,
      contactId: insertLead.contactId || null,
      firstCustomerSource: insertLead.firstCustomerSource || null,
      formCustomerSource: insertLead.formCustomerSource || null,
      webFormNote: insertLead.webFormNote || null,
      infoFormLocation1: insertLead.infoFormLocation1 || null,
      infoFormLocation2: insertLead.infoFormLocation2 || null,
      infoFormLocation3: insertLead.infoFormLocation3 || null,
      infoFormLocation4: insertLead.infoFormLocation4 || null,
      reminderPersonnel: insertLead.reminderPersonnel || null,
      wasCalledBack: insertLead.wasCalledBack || null,
      webFormPoolDate: insertLead.webFormPoolDate || null,
      formSystemDate: insertLead.formSystemDate || null,
      assignmentTimeDiff: insertLead.assignmentTimeDiff || null,
      responseTimeDiff: insertLead.responseTimeDiff || null,
      outgoingCallSystemDate: insertLead.outgoingCallSystemDate || null,
      customerResponseDate: insertLead.customerResponseDate || null,
      wasEmailSent: insertLead.wasEmailSent || null,
      customerEmailResponseDate: insertLead.customerEmailResponseDate || null,
      unreachableByPhone: insertLead.unreachableByPhone || null,
      daysWaitingResponse: insertLead.daysWaitingResponse || null,
      daysToResponse: insertLead.daysToResponse || null,
      callNote: insertLead.callNote || null,
      emailNote: insertLead.emailNote || null,
      oneOnOneMeeting: insertLead.oneOnOneMeeting || null,
      meetingDate: insertLead.meetingDate || null,
      responseResult: insertLead.responseResult || null,
      negativeReason: insertLead.negativeReason || null,
      wasSaleMade: insertLead.wasSaleMade || null,
      saleCount: insertLead.saleCount || null,
      appointmentDate: insertLead.appointmentDate || null,
      lastMeetingNote: insertLead.lastMeetingNote || null,
      lastMeetingResult: insertLead.lastMeetingResult || null,
      projectName: insertLead.projectName || null,
      createdAt: new Date(),
    };
    this.leads.set(id, lead);
    return lead;
  }

  async updateLead(
    id: number,
    updateData: Partial<InsertLead>
  ): Promise<Lead | undefined> {
    const existingLead = this.leads.get(id);
    if (!existingLead) return undefined;

    const updatedLead: Lead = { ...existingLead, ...updateData };
    this.leads.set(id, updatedLead);
    return updatedLead;
  }

  async deleteLead(id: number): Promise<boolean> {
    return this.leads.delete(id);
  }

  async clearAllLeads(): Promise<void> {
    this.leads.clear();
    this.currentLeadId = 1;
  }
  
  async getLeads(): Promise<Lead[]> {
    return Array.from(this.leads.values());
  }
  
  async getLeadsByFilter(filter: {
    startDate?: string;
    endDate?: string;
    salesRep?: string;
    leadType?: string;
    status?: string;
  }): Promise<Lead[]> {
    const allLeads = Array.from(this.leads.values());
    
    return allLeads.filter(lead => {
      // Apply filters if provided
      if (filter.startDate && lead.requestDate && lead.requestDate < filter.startDate) {
        return false;
      }
      
      if (filter.endDate && lead.requestDate && lead.requestDate > filter.endDate) {
        return false;
      }
      
      if (filter.salesRep && lead.assignedPersonnel !== filter.salesRep) {
        return false;
      }
      
      if (filter.leadType && lead.leadType !== filter.leadType) {
        return false;
      }
      
      if (filter.status && lead.status !== filter.status) {
        return false;
      }
      
      return true;
    });
  }

  async getLeadsByFilter(filters: {
    startDate?: string;
    endDate?: string;
    month?: string;
    year?: string;
    salesRep?: string;
    leadType?: string;
    status?: string;
    project?: string;
  }): Promise<Lead[]> {
    let filteredLeads = Array.from(this.leads.values());

    // Date filtering
    if (filters.startDate || filters.endDate || filters.month || filters.year) {
      filteredLeads = filteredLeads.filter((lead) => {
        if (!lead.requestDate) return true; // Include leads without dates

        const leadDate = new Date(lead.requestDate);
        if (isNaN(leadDate.getTime())) return true; // Include leads with invalid dates

        // Year filter
        if (filters.year && leadDate.getFullYear().toString() !== filters.year)
          return false;

        // Month filter (1-12 to 01-12)
        if (
          filters.month &&
          (leadDate.getMonth() + 1).toString().padStart(2, "0") !==
            filters.month
        )
          return false;

        // Date range filter
        if (filters.startDate && leadDate < new Date(filters.startDate))
          return false;
        if (filters.endDate && leadDate > new Date(filters.endDate))
          return false;

        return true;
      });
    }

    if (filters.salesRep) {
      filteredLeads = filteredLeads.filter(
        (lead) => lead.assignedPersonnel === filters.salesRep
      );
    }

    if (filters.leadType) {
      filteredLeads = filteredLeads.filter(
        (lead) => lead.leadType === filters.leadType
      );
    }

    if (filters.status) {
      filteredLeads = filteredLeads.filter(
        (lead) => lead.status === filters.status
      );
    }

    // Project filtering (normalize for robust match)
    if (filters.project && filters.project !== "all") {
      const normalize = (name: string) =>
        (name || "")
          .toLocaleLowerCase("tr-TR")
          .replace(/\s+/g, " ")
          .trim();
      const normalizedProject = normalize(filters.project);
      filteredLeads = filteredLeads.filter((lead) => {
        const projectField = normalize(lead.projectName || (lead as any)?.["Proje"] || "");
        return projectField === normalizedProject;
      });
    }

    return filteredLeads;
  }

  // Sales Reps
  async getSalesReps(): Promise<SalesRep[]> {
    return Array.from(this.salesReps.values()).filter((rep) => rep.isActive);
  }

  async getSalesRepById(id: number): Promise<SalesRep | undefined> {
    return this.salesReps.get(id);
  }

  async createSalesRep(insertSalesRep: InsertSalesRep): Promise<SalesRep> {
    const id = this.currentSalesRepId++;
    const salesRep: SalesRep = {
      ...insertSalesRep,
      id,
      monthlyTarget: insertSalesRep.monthlyTarget ?? 10,
      isActive: insertSalesRep.isActive ?? true,
    };
    this.salesReps.set(id, salesRep);
    return salesRep;
  }

  async createSalesRepByName(name: string): Promise<SalesRep> {
    // Check if salesperson already exists
    const existing = Array.from(this.salesReps.values()).find(
      (rep) => rep.name === name
    );
    if (existing) return existing;

    // Create new salesperson with default target
    return this.createSalesRep({
      name,
      monthlyTarget: 50,
      isActive: true,
    });
  }

  async updateSalesRep(
    id: number,
    updateData: Partial<InsertSalesRep>
  ): Promise<SalesRep | undefined> {
    const existingSalesRep = this.salesReps.get(id);
    if (!existingSalesRep) return undefined;

    const updatedSalesRep: SalesRep = { ...existingSalesRep, ...updateData };
    this.salesReps.set(id, updatedSalesRep);
    return updatedSalesRep;
  }

  async deleteSalesRep(id: number): Promise<boolean> {
    const salesRep = this.salesReps.get(id);
    if (!salesRep) return false;

    const updatedSalesRep = { ...salesRep, isActive: false };
    this.salesReps.set(id, updatedSalesRep);
    return true;
  }

  // Settings
  async getSettings(): Promise<Settings[]> {
    return Array.from(this.settings.values());
  }

  async getSetting(key: string): Promise<Settings | undefined> {
    return this.settings.get(key);
  }

  async setSetting(insertSetting: InsertSettings): Promise<Settings> {
    const existing = this.settings.get(insertSetting.key);
    if (existing) {
      const updated: Settings = { ...existing, value: insertSetting.value };
      this.settings.set(insertSetting.key, updated);
      return updated;
    } else {
      const id = this.currentSettingsId++;
      const setting: Settings = { ...insertSetting, id };
      this.settings.set(insertSetting.key, setting);
      return setting;
    }
  }

  // Lead Expenses CRUD Methods
  async getLeadExpenses(): Promise<LeadExpense[]> {
    return Array.from(this.leadExpenses.values());
  }

  async getLeadExpenseById(id: number): Promise<LeadExpense | undefined> {
    return this.leadExpenses.get(id);
  }

  async createLeadExpense(
    insertExpense: InsertLeadExpense
  ): Promise<LeadExpense> {
    const id = this.currentExpenseId++;
    const now = new Date();
    const expense: LeadExpense = {
      ...insertExpense,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.leadExpenses.set(id, expense);
    return expense;
  }

  async updateLeadExpense(
    id: number,
    updateData: Partial<InsertLeadExpense>
  ): Promise<LeadExpense | undefined> {
    const existingExpense = this.leadExpenses.get(id);
    if (!existingExpense) return undefined;

    const updatedExpense: LeadExpense = {
      ...existingExpense,
      ...updateData,
      updatedAt: new Date(),
    };
    this.leadExpenses.set(id, updatedExpense);
    return updatedExpense;
  }

  async deleteLeadExpense(id: number): Promise<boolean> {
    return this.leadExpenses.delete(id);
  }

  async getLeadExpensesByMonth(month: string): Promise<LeadExpense[]> {
    return Array.from(this.leadExpenses.values()).filter(
      (expense) => expense.month === month
    );
  }
}

export const storage = new MemStorage();
