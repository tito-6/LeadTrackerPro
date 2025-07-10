// Standardized color system for consistent theming across all tabs
export const STANDARD_COLORS = {
  // Sales personnel colors (consistent across all tabs)
  PERSONNEL: {
    'Alperen Yerlikaya': '#3b82f6',    // Blue
    'Ahmet Kaya': '#10b981',           // Green  
    'Mehmet Özkan': '#f59e0b',         // Amber
    'Ayşe Demir': '#8b5cf6',           // Purple
    'Fatma Yılmaz': '#ef4444',         // Red
    'Murat Şen': '#06b6d4',            // Cyan
    'Zeynep Aktaş': '#ec4899',         // Pink
    'Ali Vural': '#84cc16',            // Lime
    'Elif Koç': '#f97316',             // Orange
    'Burak Çelik': '#6366f1',          // Indigo
    'Seda Polat': '#14b8a6',           // Teal
    'Emre Kara': '#a855f7',            // Violet
    'Defaut': '#6b7280'                // Gray for unassigned
  },

  // Lead status colors (consistent across all tabs)
  STATUS: {
    'Takipte': '#fbbf24',              // Yellow - Following up
    'Takipde': '#fbbf24',              // Yellow - Following up (alternative spelling)
    'Bilgi Verildi': '#8b5cf6',        // Purple - Information given
    'Olumsuz': '#ef4444',              // Red - Negative
    'Ulaşılamıyor': '#f97316',         // Orange - Unreachable
    'Ulaşılamıyor - Cevap Vermiyor': '#f97316', // Orange - Not answering
    'Toplantı/Birebir Görüşme': '#3b82f6', // Blue - Meeting scheduled
    'Potansiyel Takipte': '#10b981',   // Green - Potential following
    'Satış': '#22c55e',                // Bright Green - Sale
    'Yeni': '#06b6d4',                 // Cyan - New lead
    'Tanımsız': '#6b7280',             // Gray - Undefined
    'Bilinmiyor': '#9ca3af',           // Light Gray - Unknown
    'Arandı - Geri Dönecek': '#f59e0b', // Amber - Will call back
    'Tamamlandı': '#22c55e',           // Green - Completed
    'İptal': '#ef4444'                 // Red - Cancelled
  },

  // Lead type colors
  LEAD_TYPE: {
    'satis': '#3b82f6',               // Blue for sales
    'kiralama': '#ef4444',            // Red for rental
    'kira': '#ef4444',                // Red for rental (alternative)
    'satılık': '#3b82f6',             // Blue for sales (alternative)
    'kiralık': '#ef4444'              // Red for rental (alternative)
  },

  // Customer source colors (for marketing analysis)
  CUSTOMER_SOURCE: {
    'Instagram': '#9b51e0',           // Instagram purple
    'Facebook': '#3498db',            // Facebook blue
    'Referans': '#2ecc71',            // Green for referrals
    'Website': '#e74c3c',             // Red for website
    'Google': '#4285f4',              // Google blue
    'Whatsapp': '#25d366',            // WhatsApp green
    'Telefon': '#f39c12',             // Orange for phone
    'Email': '#95a5a6',               // Gray for email
    'Diğer': '#34495e'                // Dark gray for others
  },

  // Priority levels
  PRIORITY: {
    'Yüksek': '#ef4444',              // Red for high priority
    'Orta': '#f59e0b',                // Amber for medium priority
    'Düşük': '#10b981'                // Green for low priority
  },

  // Impact levels for analysis
  IMPACT: {
    'High': '#ef4444',                // Red for high impact (10%+)
    'Medium': '#f59e0b',              // Amber for medium impact (5-10%)
    'Low': '#10b981'                  // Green for low impact (<5%)
  },

  // Office colors (for multi-office analysis)
  OFFICE: {
    'Merkez': '#3b82f6',              // Blue for main office
    'Şube 1': '#10b981',              // Green for branch 1
    'Şube 2': '#f59e0b',              // Amber for branch 2
    'Şube 3': '#8b5cf6',              // Purple for branch 3
    'Kapaklı': '#22c55e',             // Green for Kapaklı office
    'Diğer': '#6b7280'                // Gray for others
  },

  // Source colors (mapping to CUSTOMER_SOURCE for compatibility)
  SOURCE: {
    'Instagram': '#9b51e0',           // Instagram purple
    'Facebook': '#3498db',            // Facebook blue
    'Referans': '#2ecc71',            // Green for referrals
    'Website': '#e74c3c',             // Red for website
    'Google': '#4285f4',              // Google blue
    'Whatsapp': '#25d366',            // WhatsApp green
    'Telefon': '#f39c12',             // Orange for phone
    'Email': '#95a5a6',               // Gray for email
    'Diğer': '#34495e'                // Dark gray for others
  },

  // Meeting type colors
  MEETING_TYPE: {
    'Giden Arama': '#3b82f6',         // Blue for outgoing calls
    'Gelen Arama': '#10b981',         // Green for incoming calls
    'WhatsApp': '#25d366',            // WhatsApp green
    'Email': '#95a5a6',               // Gray for email
    'Yüz Yüze': '#8b5cf6',            // Purple for face-to-face
    'Diğer': '#6b7280'                // Gray for others
  }
};

// Helper function to get color by category and value
export function getStandardColor(category: keyof typeof STANDARD_COLORS, value: string): string {
  if (!category || !value || typeof value !== 'string') {
    return '#6b7280'; // Default gray
  }
  
  const categoryColors = STANDARD_COLORS[category];
  if (!categoryColors) {
    return '#6b7280'; // Default gray
  }
  
  const typedCategoryColors = categoryColors as Record<string, string>;
  return typedCategoryColors[value] || typedCategoryColors['Defaut'] || typedCategoryColors['Diğer'] || '#6b7280';
}

// Helper function to get personnel color
export function getPersonnelColor(personnel: string): string {
  return getStandardColor('PERSONNEL', personnel);
}

// Helper function to get status color
export function getStatusColor(status: string): string {
  return getStandardColor('STATUS', status);
}

// Helper function to get lead type color
export function getLeadTypeColor(leadType: string): string {
  return getStandardColor('LEAD_TYPE', leadType);
}

// Helper function to get source color
export function getSourceColor(source: string): string {
  return getStandardColor('CUSTOMER_SOURCE', source);
}

// Generate color array for charts (mixing all categories for variety)
export function generateChartColors(count: number): string[] {
  const allColors = [
    ...Object.values(STANDARD_COLORS.PERSONNEL),
    ...Object.values(STANDARD_COLORS.STATUS),
    ...Object.values(STANDARD_COLORS.CUSTOMER_SOURCE),
    ...Object.values(STANDARD_COLORS.PRIORITY)
  ];
  
  const colors = [];
  for (let i = 0; i < count; i++) {
    colors.push(allColors[i % allColors.length]);
  }
  return colors;
}

// Project name detection patterns
export const PROJECT_PATTERNS = [
  // Common Turkish real estate project keywords
  /\b(proje|konut|residence|plaza|tower|city|park|garden|bahçe|villa|apart|sitesi|blok)\b/gi,
  /\b[A-ZÇĞIŞÖÜ][a-zçğışöü]+\s+(Residence|Plaza|Tower|City|Park|Konut|Proje|Sitesi)\b/g,
  /\b[A-ZÇĞIŞÖÜ][a-zçğışöü]*\s*[A-ZÇĞIŞÖÜ][a-zçğışöü]+\s+(Residence|Plaza|Tower)\b/g
];

// Helper function to extract project name from WebForm Notu
export function extractProjectName(webFormNote: string): string | null {
  if (!webFormNote || typeof webFormNote !== 'string') return null;
  
  const cleanNote = webFormNote.trim();
  
  // Try each pattern
  for (const pattern of PROJECT_PATTERNS) {
    const matches = cleanNote.match(pattern);
    if (matches && matches.length > 0) {
      return matches[0].trim();
    }
  }
  
  // If no pattern matches, check for specific keywords and extract surrounding text
  const keywords = ['proje', 'konut', 'residence', 'plaza', 'tower', 'city', 'park', 'sitesi'];
  for (const keyword of keywords) {
    const regex = new RegExp(`\\b\\w*${keyword}\\w*\\b`, 'gi');
    const matches = cleanNote.match(regex);
    if (matches && matches.length > 0) {
      return matches[0].trim();
    }
  }
  
  return null;
}

// Default chart colors for different chart types
export const DEFAULT_CHART_COLORS = {
  pie: generateChartColors(10),
  bar: generateChartColors(10),
  line: generateChartColors(5)
};