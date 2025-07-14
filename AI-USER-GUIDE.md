# 🤖 AI Assistant User Guide

## How to Use the AI Assistant

### Accessing the AI Assistant

1. **Purple Chat Button**: Click the floating purple chat button in the bottom-right corner of the main application
2. **Test Page**: For testing, visit `http://localhost:5000/ai-test` in development mode

### Supported Query Types

#### 📊 Basic Statistics

- **"Kaç adet lead var?"** - Total number of leads
- **"Toplam müşteri sayısı?"** - Total customer count
- **"Satılık lead sayısı?"** - Number of sales leads
- **"Kiralık lead kaç tane?"** - Number of rental leads

#### 📈 Source Analysis

- **"Instagram dan gelen lead sayısı"** - Instagram leads count
- **"Facebook lead analizi"** - Facebook leads analysis
- **"Referans lead dağılımı"** - Referral leads distribution
- **"Kaynak analizi yap"** - Complete source analysis

#### 👥 Personnel Performance

- **"Personel performansı"** - Personnel performance analysis
- **"Satış temsilcisi analizi"** - Sales representative analysis
- **"En iyi personel kim?"** - Best performing personnel
- **"Ahmet'in lead sayısı"** - Specific person's lead count

#### 📋 Status Analysis

- **"Durum analizi"** - Status analysis
- **"Lead durumları dağılımı"** - Lead status distribution
- **"Kaç tane yeni lead var?"** - How many new leads
- **"Satış yapılan lead sayısı"** - Number of sold leads

#### 📅 Time-Based Analysis

- **"Aylık trend analizi"** - Monthly trend analysis
- **"Günlük lead trendi"** - Daily lead trend
- **"Bu ay kaç lead geldi?"** - This month's leads
- **"Bugünkü lead sayısı"** - Today's leads

#### 🔍 Combined Queries

- **"Instagram dan gelen satılık lead sayısı"** - Instagram sales leads
- **"Facebook kiralık lead analizi"** - Facebook rental leads analysis
- **"Ahmet'in bu ay performansı"** - Ahmet's performance this month

### AI Response Features

#### 📊 Automatic Charts

The AI automatically generates appropriate charts based on your query:

- **Pie Charts**: For distributions (lead types, sources)
- **Bar Charts**: For comparisons (personnel, status)
- **Line Charts**: For trends (monthly, daily)

#### 🇹🇷 Turkish Language Support

- Full Turkish language understanding
- Natural conversation flow
- Real estate terminology recognition
- Context-aware responses

#### ⚡ Real-time Streaming

- Instant response streaming
- Live progress updates
- No waiting for complete analysis

### Tips for Better Results

#### 🎯 Be Specific

- **Good**: "Instagram dan gelen satılık lead sayısı"
- **Better**: "Instagram dan gelen satılık lead sayısı bu ay"

#### 📊 Request Visualizations

- Add "analiz" or "dağılım" to get charts
- Example: "Kaynak dağılımı analizi"

#### 🔍 Use Real Estate Terms

- "Satılık" / "Kiralık" for lead types
- "Instagram" / "Facebook" / "Referans" for sources
- "Yeni" / "Arama yapıldı" / "Satış yapıldı" for status

### Troubleshooting

#### Common Issues

1. **No Response**: Check if server is running on port 5000
2. **Error Messages**: Look for specific error details in the response
3. **Unexpected Results**: Try rephrasing your query

#### Getting Help

- Use the test page (`/ai-test`) to experiment with queries
- Check the example queries in the interface
- Review the supported query types above

### Examples with Expected Responses

#### Query: "Kaç adet lead var?"

**Response**: "Toplam 156 adet lead bulunmaktadır. Bunların 89 tanesi satılık, 67 tanesi kiralık lead'dir."
**Chart**: Pie chart showing lead type distribution

#### Query: "Personel performansı analizi"

**Response**: "Personel performansı: Ahmet Yılmaz: 45, Mehmet Kaya: 32, Fatma Demir: 28"
**Chart**: Bar chart showing personnel performance

#### Query: "Instagram dan gelen lead sayısı"

**Response**: "Instagram kaynaklı lead sayısı: 23 adet (%15 oranında)"
**Chart**: Source distribution pie chart

The AI Assistant is designed to make lead analysis intuitive and fast. Just ask your questions naturally in Turkish!
