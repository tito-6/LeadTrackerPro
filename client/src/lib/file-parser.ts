import * as XLSX from "xlsx";

// Comprehensive field mapping for Turkish real estate lead data
function mapRowToLead(row: any): ParsedLead {
  // Enhanced date parsing function to handle multiple formats
  const parseDate = (dateValue: any): string => {
    if (!dateValue || dateValue === '') return '';
    
    const dateStr = String(dateValue).trim();
    
    // Try DD.MM.YYYY format (Turkish standard)
    if (dateStr.match(/^\d{2}\.\d{2}\.\d{4}$/)) {
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
      return dateStr;
    }
    
    // Try parsing as Date object for other formats
    const parsedDate = new Date(dateStr);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate.toISOString().split('T')[0];
    }
    
    return dateStr; // Return as-is if no format matches
  };

  // Derive lead type from webFormNote or other indicators
  const webFormNote = row['WebForm Notu'] || row['webFormNote'] || '';
  // Advanced lead type detection with project parsing
  let leadType = 'Bilinmeyen';
  let projectName = '';
  
  if (webFormNote) {
    const noteText = webFormNote.toLowerCase();
    // Enhanced lead type detection
    if (noteText.includes('kiralık') || noteText.includes('kiralama') || noteText.includes('kira')) {
      leadType = 'kiralama';
    } else if (noteText.includes('satılık') || noteText.includes('satış') || noteText.includes('satis')) {
      leadType = 'satis';
    } else {
      leadType = 'kiralama'; // default fallback
    }
    
    // Extract project name from WebForm Notu
    const projectPatterns = [
      /model\s+\w+\s+merkezi/i,
      /\w+\s+merkezi/i,
      /\w+\s+projesi/i,
      /\w+\s+plaza/i,
      /\w+\s+residence/i,
      /\w+\s+sitesi/i,
      /\w+\s+complex/i
    ];
    
    for (const pattern of projectPatterns) {
      const match = webFormNote.match(pattern);
      if (match) {
        projectName = match[0].trim();
        break;
      }
    }
    
    // If no pattern match, try to get text after last '/' 
    if (!projectName && webFormNote.includes('/')) {
      const parts = webFormNote.split('/');
      const lastPart = parts[parts.length - 1].trim();
      if (lastPart && lastPart.length > 2) {
        projectName = lastPart;
      }
    }
  } else {
    leadType = 'kiralama'; // default
  }

  // FIXED: Derive status EXCLUSIVELY from SON GORUSME SONUCU column
  let status = 'Tanımsız'; // Default to undefined if no SON GORUSME SONUCU
  const sonGorusmeSonucu = row['SON GORUSME SONUCU'] || row['SON GÖRÜŞME SONUCU'] || row['lastMeetingResult'] || '';
  
  if (sonGorusmeSonucu && sonGorusmeSonucu.trim()) {
    // Use the exact value from SON GORUSME SONUCU as the dynamic status
    status = sonGorusmeSonucu.trim();
  }
  // If SON GORUSME SONUCU is empty, leave status as "Tanımsız" unless settings specify otherwise

  return {
    // Required fields with enhanced date parsing
    customerName: row['Müşteri Adı Soyadı'] || row['customerName'] || row['name'] || '',
    requestDate: parseDate(row['Talep Geliş Tarihi'] || row['requestDate'] || row['date']),
    leadType,
    assignedPersonnel: row['Atanan Personel'] || row['assignedPersonnel'] || row['salesRep'] || '',
    status,
    
    // Optional comprehensive fields
    customerId: row['Müşteri ID'] || row['customerId'] || '',
    contactId: row['İletişim ID'] || row['contactId'] || '',
    projectName,
    firstCustomerSource: row['İlk Müşteri Kaynağı'] || row['firstCustomerSource'] || '',
    formCustomerSource: row['Form Müşteri Kaynağı'] || row['formCustomerSource'] || '',
    webFormNote,
    infoFormLocation1: row['İnfo Form Geliş Yeri'] || row['infoFormLocation1'] || '',
    infoFormLocation2: row['İnfo Form Geliş Yeri 2'] || row['infoFormLocation2'] || '',
    infoFormLocation3: row['İnfo Form Geliş Yeri 3'] || row['infoFormLocation3'] || '',
    infoFormLocation4: row['İnfo Form Geliş Yeri 4'] || row['infoFormLocation4'] || '',
    reminderPersonnel: row['Hatıırlatma Personeli'] || row['reminderPersonnel'] || '',
    wasCalledBack: row['GERİ DÖNÜŞ YAPILDI MI? (Müşteri Arandı mı?)'] || row['wasCalledBack'] || '',
    webFormPoolDate: row['Web Form Havuz Oluşturma Tarihi'] || row['webFormPoolDate'] || '',
    formSystemDate: row['Form Sistem Oluşturma Tarihi'] || row['formSystemDate'] || '',
    assignmentTimeDiff: row['Atama Saat Farkı'] || row['assignmentTimeDiff'] || '',
    responseTimeDiff: row['Dönüş Saat Farkı'] || row['responseTimeDiff'] || '',
    outgoingCallSystemDate: row['Giden Arama Sistem Oluşturma Tarihi'] || row['outgoingCallSystemDate'] || '',
    customerResponseDate: row['Müşteri Geri Dönüş Tarihi (Giden Arama)'] || row['customerResponseDate'] || '',
    wasEmailSent: row['GERİ DÖNÜŞ YAPILDI MI? (Müşteriye Mail Gönderildi mi?)'] || row['wasEmailSent'] || '',
    customerEmailResponseDate: row['Müşteri Mail Geri Dönüş Tarihi'] || row['customerEmailResponseDate'] || '',
    unreachableByPhone: row['Telefonla Ulaşılamayan Müşteriler'] || row['unreachableByPhone'] || '',
    daysWaitingResponse: parseInt(row['Kaç Gündür Geri Dönüş Bekliyor'] || row['daysWaitingResponse'] || '0') || undefined,
    daysToResponse: parseInt(row['Kaç Günde Geri Dönüş Yapılmış (Süre)'] || row['daysToResponse'] || '0') || undefined,
    callNote: row['GERİ DÖNÜŞ NOTU (Giden Arama Notu)'] || row['callNote'] || '',
    emailNote: row['GERİ DÖNÜŞ NOTU (Giden Mail Notu)'] || row['emailNote'] || '',
    oneOnOneMeeting: row['Birebir Görüşme Yapıldı mı?'] || row['oneOnOneMeeting'] || '',
    meetingDate: row['Birebir Görüşme Tarihi'] || row['meetingDate'] || '',
    responseResult: row['Dönüş Görüşme Sonucu'] || row['responseResult'] || '',
    negativeReason: row['Dönüş Olumsuzluk Nedeni'] || row['negativeReason'] || '',
    wasSaleMade: row['Müşteriye Satış Yapıldı mı?'] || row['wasSaleMade'] || '',
    saleCount: parseInt(row['Satış Adedi'] || row['saleCount'] || '0') || undefined,
    appointmentDate: row['Randevu Tarihi'] || row['appointmentDate'] || '',
    lastMeetingNote: row['SON GÖRÜŞME NOTU'] || row['lastMeetingNote'] || '',
    lastMeetingResult: row['SON GÖRÜŞME SONUCU'] || row['lastMeetingResult'] || ''
  };
}

export interface ParsedLead {
  customerName: string;
  requestDate: string;
  leadType: string;
  assignedPersonnel: string;
  status: string;
  // Optional comprehensive fields
  customerId?: string;
  contactId?: string;
  projectName?: string;
  firstCustomerSource?: string;
  formCustomerSource?: string;
  webFormNote?: string;
  infoFormLocation1?: string;
  infoFormLocation2?: string;
  infoFormLocation3?: string;
  infoFormLocation4?: string;
  reminderPersonnel?: string;
  wasCalledBack?: string;
  webFormPoolDate?: string;
  formSystemDate?: string;
  assignmentTimeDiff?: string;
  responseTimeDiff?: string;
  outgoingCallSystemDate?: string;
  customerResponseDate?: string;
  wasEmailSent?: string;
  customerEmailResponseDate?: string;
  unreachableByPhone?: string;
  daysWaitingResponse?: number;
  daysToResponse?: number;
  callNote?: string;
  emailNote?: string;
  oneOnOneMeeting?: string;
  meetingDate?: string;
  responseResult?: string;
  negativeReason?: string;
  wasSaleMade?: string;
  saleCount?: number;
  appointmentDate?: string;
  lastMeetingNote?: string;
  lastMeetingResult?: string;
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
        
        const parsedLeads = jsonData.map(mapRowToLead);
        
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
          
          return mapRowToLead(row);
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
        
        const parsedLeads = dataArray.map(mapRowToLead);
        
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
