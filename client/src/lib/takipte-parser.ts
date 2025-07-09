import * as XLSX from 'xlsx';
import Papa from 'papaparse';

export interface TakipteData {
  customerName: string;
  kriter: 'Satış Müşterisi' | 'Kira Müşterisi' | string;
  irtibatMusteriKaynagi: string; // Instagram, Facebook, Referans, etc.
  gorusmeTipi: string; // Giden Arama, Yeni Gelen Arama, Kendisi Geldi, etc.
  ofisName: string; // Kapaklı, İkitelli, etc.
  hatirlatmaVarMi: boolean;
  hatirlatmaTarihi?: string;
  hatirlatmaSonMu: boolean;
  konusmaSuresi: number; // in minutes
  meslekAdi: string;
  sonSonuc: string;
  takipSkorları: {
    aramaSkoru: number;
    ilgiSkoru: number;
    potansiyelSkoru: number;
  };
  detayNotlar: string;
  assignedPersonnel: string;
  lastUpdateDate: string;
}

// Field mapping for Turkish Takipte columns
const TAKIPTE_FIELD_MAPPINGS = {
  customerName: [
    'Müşteri Adı Soyadı', 'müşteri adı soyadı', 'Musteri Adi Soyadi', 'musteri adi soyadi',
    'Customer Name', 'customer name', 'Ad Soyad', 'ad soyad', 'İsim', 'isim'
  ],
  kriter: [
    'Kriter', 'kriter', 'Müşteri Tipi', 'müşteri tipi', 'Customer Type', 'customer type',
    'Lead Type', 'lead type', 'Tip', 'tip'
  ],
  irtibatMusteriKaynagi: [
    'İrtibat Müşteri Kaynağı', 'irtibat müşteri kaynağı', 'Müşteri Kaynağı', 'müşteri kaynağı',
    'Customer Source', 'customer source', 'Kaynak', 'kaynak', 'Source', 'source'
  ],
  gorusmeTipi: [
    'Görüşme Tipi', 'görüşme tipi', 'Gorusme Tipi', 'gorusme tipi',
    'Meeting Type', 'meeting type', 'Call Type', 'call type'
  ],
  ofisName: [
    'Ofis', 'ofis', 'Office', 'office', 'Şube', 'şube', 'Branch', 'branch',
    'Ofis Adı', 'ofis adı', 'Office Name', 'office name'
  ],
  hatirlatmaVarMi: [
    'Hatırlatma Var Mı', 'hatırlatma var mı', 'Hatirlatma Var Mi', 'hatirlatma var mi',
    'Has Reminder', 'has reminder', 'Reminder', 'reminder'
  ],
  hatirlatmaTarihi: [
    'Hatırlatma Tarihi', 'hatırlatma tarihi', 'Hatirlatma Tarihi', 'hatirlatma tarihi',
    'Reminder Date', 'reminder date', 'Follow-up Date', 'follow-up date'
  ],
  hatirlatmaSonMu: [
    'Hatırlatma Son Mu', 'hatırlatma son mu', 'Hatirlatma Son Mu', 'hatirlatma son mu',
    'Final Reminder', 'final reminder', 'Last Reminder', 'last reminder'
  ],
  konusmaSuresi: [
    'Konuşma Süresi', 'konuşma süresi', 'Konusma Suresi', 'konusma suresi',
    'Call Duration', 'call duration', 'Duration', 'duration', 'Süre', 'süre'
  ],
  meslekAdi: [
    'Meslek Adı', 'meslek adı', 'Meslek Adi', 'meslek adi',
    'Profession', 'profession', 'Job', 'job', 'Meslek', 'meslek'
  ],
  sonSonuc: [
    'Son Sonuç', 'son sonuç', 'Son Sonuc', 'son sonuc',
    'Final Result', 'final result', 'Result', 'result', 'Sonuç', 'sonuç'
  ],
  aramaSkoru: [
    'Arama Skoru', 'arama skoru', 'Call Score', 'call score',
    'Contact Score', 'contact score'
  ],
  ilgiSkoru: [
    'İlgi Skoru', 'ilgi skoru', 'Interest Score', 'interest score',
    'Engagement Score', 'engagement score'
  ],
  potansiyelSkoru: [
    'Potansiyel Skoru', 'potansiyel skoru', 'Potential Score', 'potential score'
  ],
  detayNotlar: [
    'Detay Notlar', 'detay notlar', 'Notes', 'notes', 'Notlar', 'notlar',
    'Details', 'details', 'Comments', 'comments'
  ],
  assignedPersonnel: [
    'Atanan Personel', 'atanan personel', 'Assigned Personnel', 'assigned personnel',
    'Sorumlu', 'sorumlu', 'Representative', 'representative'
  ],
  lastUpdateDate: [
    'Son Güncelleme', 'son güncelleme', 'Last Update', 'last update',
    'Update Date', 'update date', 'Güncelleme Tarihi', 'güncelleme tarihi'
  ]
};

function getFieldValue(row: any, possibleNames: string[]): string {
  for (const name of possibleNames) {
    if (row[name] !== undefined && row[name] !== null && row[name] !== '') {
      return String(row[name]).trim();
    }
  }
  return '';
}

function parseNumericValue(value: string): number {
  if (!value || value.trim() === '') return 0;
  const numericValue = parseFloat(value.replace(/[^\d.,]/g, '').replace(',', '.'));
  return isNaN(numericValue) ? 0 : numericValue;
}

function parseBooleanValue(value: string): boolean {
  if (!value) return false;
  const normalized = value.toLowerCase().trim();
  return normalized === 'evet' || normalized === 'yes' || normalized === 'true' || 
         normalized === 'var' || normalized === '1' || normalized === 'hayır' === false;
}

function mapRowToTakipteData(row: any): TakipteData {
  const customerName = getFieldValue(row, TAKIPTE_FIELD_MAPPINGS.customerName);
  const kriter = getFieldValue(row, TAKIPTE_FIELD_MAPPINGS.kriter) || 'Belirtilmemiş';
  const irtibatMusteriKaynagi = getFieldValue(row, TAKIPTE_FIELD_MAPPINGS.irtibatMusteriKaynagi) || 'Bilinmiyor';
  const gorusmeTipi = getFieldValue(row, TAKIPTE_FIELD_MAPPINGS.gorusmeTipi) || 'Belirtilmemiş';
  const ofisName = getFieldValue(row, TAKIPTE_FIELD_MAPPINGS.ofisName) || 'Ana Ofis';
  
  const hatirlatmaVarMiStr = getFieldValue(row, TAKIPTE_FIELD_MAPPINGS.hatirlatmaVarMi);
  const hatirlatmaVarMi = parseBooleanValue(hatirlatmaVarMiStr);
  
  const hatirlatmaTarihi = getFieldValue(row, TAKIPTE_FIELD_MAPPINGS.hatirlatmaTarihi);
  
  const hatirlatmaSonMuStr = getFieldValue(row, TAKIPTE_FIELD_MAPPINGS.hatirlatmaSonMu);
  const hatirlatmaSonMu = parseBooleanValue(hatirlatmaSonMuStr);
  
  const konusmaSuresiStr = getFieldValue(row, TAKIPTE_FIELD_MAPPINGS.konusmaSuresi);
  const konusmaSuresi = parseNumericValue(konusmaSuresiStr);
  
  const meslekAdi = getFieldValue(row, TAKIPTE_FIELD_MAPPINGS.meslekAdi) || 'Belirtilmemiş';
  const sonSonuc = getFieldValue(row, TAKIPTE_FIELD_MAPPINGS.sonSonuc) || 'Devam Ediyor';
  
  const aramaSkoru = parseNumericValue(getFieldValue(row, TAKIPTE_FIELD_MAPPINGS.aramaSkoru));
  const ilgiSkoru = parseNumericValue(getFieldValue(row, TAKIPTE_FIELD_MAPPINGS.ilgiSkoru));
  const potansiyelSkoru = parseNumericValue(getFieldValue(row, TAKIPTE_FIELD_MAPPINGS.potansiyelSkoru));
  
  const detayNotlar = getFieldValue(row, TAKIPTE_FIELD_MAPPINGS.detayNotlar) || '';
  const assignedPersonnel = getFieldValue(row, TAKIPTE_FIELD_MAPPINGS.assignedPersonnel) || 'Atanmamış';
  const lastUpdateDate = getFieldValue(row, TAKIPTE_FIELD_MAPPINGS.lastUpdateDate) || new Date().toISOString();

  return {
    customerName,
    kriter,
    irtibatMusteriKaynagi,
    gorusmeTipi,
    ofisName,
    hatirlatmaVarMi,
    hatirlatmaTarihi: hatirlatmaTarihi || undefined,
    hatirlatmaSonMu,
    konusmaSuresi,
    meslekAdi,
    sonSonuc,
    takipSkorları: {
      aramaSkoru,
      ilgiSkoru,
      potansiyelSkoru
    },
    detayNotlar,
    assignedPersonnel,
    lastUpdateDate
  };
}

export function parseTakipteExcelFile(file: File): Promise<TakipteData[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        const takipteData = jsonData
          .map(mapRowToTakipteData)
          .filter(item => item.customerName && item.customerName.trim() !== '');
        
        resolve(takipteData);
      } catch (error) {
        reject(new Error(`Excel parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    };
    reader.onerror = () => reject(new Error('File reading failed'));
    reader.readAsArrayBuffer(file);
  });
}

export function parseTakipteCSVFile(file: File): Promise<TakipteData[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      encoding: 'UTF-8',
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const takipteData = results.data
            .map(mapRowToTakipteData)
            .filter(item => item.customerName && item.customerName.trim() !== '');
          
          resolve(takipteData);
        } catch (error) {
          reject(new Error(`CSV parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      },
      error: (error) => {
        reject(new Error(`CSV parsing failed: ${error.message}`));
      }
    });
  });
}

export function parseTakipteJSONFile(file: File): Promise<TakipteData[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonData = JSON.parse(e.target?.result as string);
        const dataArray = Array.isArray(jsonData) ? jsonData : [jsonData];
        
        const takipteData = dataArray
          .map(mapRowToTakipteData)
          .filter(item => item.customerName && item.customerName.trim() !== '');
        
        resolve(takipteData);
      } catch (error) {
        reject(new Error(`JSON parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    };
    reader.onerror = () => reject(new Error('File reading failed'));
    reader.readAsText(file, 'UTF-8');
  });
}

export function parseTakipteFile(file: File): Promise<TakipteData[]> {
  const extension = file.name.split('.').pop()?.toLowerCase();
  
  switch (extension) {
    case 'xlsx':
    case 'xls':
      return parseTakipteExcelFile(file);
    case 'csv':
      return parseTakipteCSVFile(file);
    case 'json':
      return parseTakipteJSONFile(file);
    default:
      return Promise.reject(new Error(`Unsupported file type: ${extension}`));
  }
}

// Analytics helper functions
export function analyzeTakipteData(takipteData: TakipteData[]) {
  const analytics = {
    totalRecords: takipteData.length,
    byKriter: {} as Record<string, number>,
    bySource: {} as Record<string, number>,
    byMeetingType: {} as Record<string, number>,
    byOffice: {} as Record<string, number>,
    byPersonnel: {} as Record<string, number>,
    averageCallDuration: 0,
    reminderStats: {
      hasReminders: 0,
      finalReminders: 0,
      overdueReminders: 0
    },
    scoreAverages: {
      aramaSkoru: 0,
      ilgiSkoru: 0,
      potansiyelSkoru: 0
    }
  };

  if (takipteData.length === 0) return analytics;

  let totalCallDuration = 0;
  let totalAramaSkoru = 0;
  let totalIlgiSkoru = 0;
  let totalPotansiyelSkoru = 0;

  takipteData.forEach(item => {
    // Count by categories
    analytics.byKriter[item.kriter] = (analytics.byKriter[item.kriter] || 0) + 1;
    analytics.bySource[item.irtibatMusteriKaynagi] = (analytics.bySource[item.irtibatMusteriKaynagi] || 0) + 1;
    analytics.byMeetingType[item.gorusmeTipi] = (analytics.byMeetingType[item.gorusmeTipi] || 0) + 1;
    analytics.byOffice[item.ofisName] = (analytics.byOffice[item.ofisName] || 0) + 1;
    analytics.byPersonnel[item.assignedPersonnel] = (analytics.byPersonnel[item.assignedPersonnel] || 0) + 1;

    // Accumulate for averages
    totalCallDuration += item.konusmaSuresi;
    totalAramaSkoru += item.takipSkorları.aramaSkoru;
    totalIlgiSkoru += item.takipSkorları.ilgiSkoru;
    totalPotansiyelSkoru += item.takipSkorları.potansiyelSkoru;

    // Reminder statistics
    if (item.hatirlatmaVarMi) analytics.reminderStats.hasReminders++;
    if (item.hatirlatmaSonMu) analytics.reminderStats.finalReminders++;
    
    // Check for overdue reminders
    if (item.hatirlatmaTarihi && new Date(item.hatirlatmaTarihi) < new Date()) {
      analytics.reminderStats.overdueReminders++;
    }
  });

  // Calculate averages
  analytics.averageCallDuration = Math.round(totalCallDuration / takipteData.length);
  analytics.scoreAverages.aramaSkoru = Math.round((totalAramaSkoru / takipteData.length) * 10) / 10;
  analytics.scoreAverages.ilgiSkoru = Math.round((totalIlgiSkoru / takipteData.length) * 10) / 10;
  analytics.scoreAverages.potansiyelSkoru = Math.round((totalPotansiyelSkoru / takipteData.length) * 10) / 10;

  return analytics;
}