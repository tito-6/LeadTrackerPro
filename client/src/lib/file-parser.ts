import * as XLSX from "xlsx";

export interface ParsedLead {
  name: string;
  date: string;
  leadType: string;
  salesRep: string;
  project: string;
  status: string;
  notes?: string;
}

export function parseExcelFile(file: File): Promise<ParsedLead[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        const parsedLeads = jsonData.map((row: any) => ({
          name: row.name || row.Name || row['Lead Adı'] || "",
          date: row.date || row.Date || row.Tarih || new Date().toISOString().split('T')[0],
          leadType: row.leadType || row.LeadType || row['Lead Tipi'] || "kiralama",
          salesRep: row.salesRep || row.SalesRep || row['Satış Temsilcisi'] || "",
          project: row.project || row.Project || row.Proje || "",
          status: row.status || row.Status || row.Durum || "yeni",
          notes: row.notes || row.Notes || row.Notlar || "",
        }));
        
        resolve(parsedLeads);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error("File reading failed"));
    reader.readAsArrayBuffer(file);
  });
}

export function parseCSVFile(file: File): Promise<ParsedLead[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const csvText = e.target?.result as string;
        const lines = csvText.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        
        const parsedLeads = lines.slice(1).filter(line => line.trim()).map(line => {
          const values = line.split(',').map(v => v.trim());
          const row: any = {};
          
          headers.forEach((header, index) => {
            row[header] = values[index] || "";
          });
          
          return {
            name: row.name || row.Name || row['Lead Adı'] || "",
            date: row.date || row.Date || row.Tarih || new Date().toISOString().split('T')[0],
            leadType: row.leadType || row.LeadType || row['Lead Tipi'] || "kiralama",
            salesRep: row.salesRep || row.SalesRep || row['Satış Temsilcisi'] || "",
            project: row.project || row.Project || row.Proje || "",
            status: row.status || row.Status || row.Durum || "yeni",
            notes: row.notes || row.Notes || row.Notlar || "",
          };
        });
        
        resolve(parsedLeads);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error("File reading failed"));
    reader.readAsText(file);
  });
}

export function parseJSONFile(file: File): Promise<ParsedLead[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const jsonText = e.target?.result as string;
        const jsonData = JSON.parse(jsonText);
        const dataArray = Array.isArray(jsonData) ? jsonData : [jsonData];
        
        const parsedLeads = dataArray.map((row: any) => ({
          name: row.name || row.Name || row['Lead Adı'] || "",
          date: row.date || row.Date || row.Tarih || new Date().toISOString().split('T')[0],
          leadType: row.leadType || row.LeadType || row['Lead Tipi'] || "kiralama",
          salesRep: row.salesRep || row.SalesRep || row['Satış Temsilcisi'] || "",
          project: row.project || row.Project || row.Proje || "",
          status: row.status || row.Status || row.Durum || "yeni",
          notes: row.notes || row.Notes || row.Notlar || "",
        }));
        
        resolve(parsedLeads);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error("File reading failed"));
    reader.readAsText(file);
  });
}

export function parseFile(file: File): Promise<ParsedLead[]> {
  const fileExtension = file.name.split('.').pop()?.toLowerCase();
  
  switch (fileExtension) {
    case 'xlsx':
    case 'xls':
      return parseExcelFile(file);
    case 'csv':
      return parseCSVFile(file);
    case 'json':
      return parseJSONFile(file);
    default:
      return Promise.reject(new Error("Unsupported file format"));
  }
}
