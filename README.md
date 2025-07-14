# İNNO Gayrimenkul Yatırım A.Ş. - Lead Raporlama Sistemi

## 🏠 AI-Powered Real Estate Lead Management Platform

Advanced AI-powered real estate lead automation platform that transforms complex lead data into actionable insights through intelligent analytics and comprehensive performance tracking.

![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Node](https://img.shields.io/badge/node-18+-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6+-blue.svg)

## ⚡ Quick Start (VS Code Local Development)

### Prerequisites

- **Node.js 18+**
- **VS Code**
- **Git**

### 🚀 Installation

```bash
# Clone repository
git clone [your-repo-url]
cd inno-lead-reporter

# Install dependencies
npm install

# Start development server
npm run dev
```

**Access the application:** `http://localhost:5000`

### 🎯 Key Features

#### 🧠 AI-Powered Analytics

- **Intelligent Dashboard**: Real-time KPIs with data completeness scoring
- **Smart Project Detection**: Automatic extraction from WebForm notes
- **Dynamic Status Generation**: Auto-detection from Turkish real estate columns
- **Advanced Duplicate Detection**: Multi-field matching algorithms

#### 📊 Comprehensive Reporting

- **37+ Turkish Columns**: Complete real estate industry standard support
- **Dual File Processing**: Main leads + Takipte follow-up files
- **Interactive 3D Charts**: Enhanced visualizations with Chart.js
- **Multi-Format Export**: PDF with charts, Excel, JSON

#### 🎨 Modern UI/UX

- **Corporate Branding**: İNNO Gayrimenkul Yatırım A.Ş. integration
- **Responsive Design**: Mobile-first approach
- **Dark Mode Support**: System-based theme switching
- **Turkish Language**: Full UTF-8 support

## 📁 Project Structure

```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Utility libraries
│   │   └── main.tsx        # Application entry point
├── server/                 # Express backend
│   ├── index.ts            # Server entry point
│   ├── routes.ts           # API routes
│   ├── storage.ts          # Data storage layer
│   └── vite.ts             # Vite integration
├── shared/                 # Shared types and schemas
│   └── schema.ts           # Database schema definitions
├── .vscode/                # VS Code configuration
├── LOCAL_SETUP.md          # Detailed local setup guide
└── README.md               # This file
```

## 🛠️ Development Environment

### VS Code Configuration

The project includes pre-configured VS Code settings:

- **Launch Configuration**: One-click debugging
- **Extensions**: Recommended VS Code extensions
- **Settings**: Optimized for TypeScript and React development

### Memory Storage

For local development, the application uses in-memory storage:

- ✅ No database setup required
- ✅ Fast startup and development
- ✅ Perfect for testing and feature development
- ⚠️ Data resets on server restart

## 📊 Application Modules

### Core Tabs

1. **🧠 Akıllı Dashboard** - AI-powered overview with dual-source analysis
2. **🧠 Akıllı Veri Girişi** - Smart data entry with dual file upload
3. **📊 Excel Girişi** - Excel-style input with copy/paste support
4. **📈 Raporlar** - Interactive charts and filtered data views
5. **❌ Olumsuz Analizi** - Advanced negative lead analysis
6. **📞 Unified Takip Analizi** - Comprehensive follow-up tracking
7. **🔍 Duplicate Detection** - Advanced duplicate analysis
8. **📤 Veri Aktarımı** - Multi-format export capabilities
9. **⚙️ Ayarlar** - Application configuration
10. **Dynamic Personnel Tabs** - Individual performance tracking

### Advanced Features

#### Data Processing

- **Smart Column Detection**: Automatic mapping of 37+ Turkish columns
- **WebForm Parsing**: Intelligent project name and lead type extraction
- **Date Format Handling**: Multiple Turkish date formats
- **Character Encoding**: Full Turkish character support

#### Export System

- **Section Selection**: 10 comprehensive sections with chart capture
- **PDF Generation**: Embedded charts with canvas-to-image conversion
- **Excel Export**: Structured data with proper formatting
- **JSON Export**: Raw data for external processing

#### Analytics Engine

- **Personnel Performance**: Individual and comparative analysis
- **Project Tracking**: Intelligent project-based insights
- **Status Distribution**: Dynamic status categorization
- **Source Analysis**: Lead source performance tracking

## 🚀 Usage Guide

### 1. Import Data

```
🧠 Akıllı Veri Girişi → Upload Files → Select Main + Takipte Files
```

### 2. Analyze Data

```
🧠 Akıllı Dashboard → Review KPIs and Alerts
📊 Raporlar → Interactive filtering and charts
❌ Olumsuz Analizi → Negative lead breakdown
```

### 3. Export Reports

```
📤 Veri Aktarımı → Kapsamlı İndir → Select Sections → Generate PDF
```

## 🔧 Technical Stack

### Frontend

- **React 18** with TypeScript
- **Vite** for fast development
- **Tailwind CSS** for styling
- **shadcn/ui** component library
- **TanStack Query** for state management
- **Recharts** for data visualization

### Backend

- **Express.js** with TypeScript
- **Multer** for file uploads
- **XLSX & PapaParse** for data processing
- **Drizzle ORM** for database (optional)
- **Memory Storage** for local development

### Development Tools

- **tsx** for TypeScript execution
- **esbuild** for bundling
- **Prettier** for code formatting
- **ESLint** for code quality

## 📈 Performance Features

### Memory Optimization

- Efficient in-memory data structures
- Lazy loading for large datasets
- Optimized chart rendering
- Smart caching strategies

### Turkish Language Support

- UTF-8 character encoding
- Proper sorting and filtering
- Date format localization
- Currency formatting (TRY)

## 🔐 Data Security

### Local Development

- All data stored in application memory
- No external connections required
- No persistent storage by default
- Perfect for sensitive data testing

### Production Ready

- PostgreSQL integration available
- Session-based authentication
- Secure file upload handling
- Environment-based configuration

## 📚 Additional Resources

- **[LOCAL_SETUP.md](LOCAL_SETUP.md)** - Detailed local development guide
- **[replit.md](replit.md)** - Project architecture and preferences
- **VS Code Configuration** - Pre-configured development environment

## 🐛 Troubleshooting

### Common Issues

1. **Port 5000 in use**

   ```bash
   # Kill process using port 5000
   lsof -ti:5000 | xargs kill -9
   ```

2. **Turkish characters not displaying**

   - Ensure UTF-8 encoding in VS Code
   - Check file encoding settings

3. **Charts not rendering**
   - Install canvas dependencies: `npm install canvas`
   - Check browser console for errors

### Development Tips

- Use VS Code's integrated terminal for best experience
- Enable auto-save for faster development
- Use the pre-configured launch configuration for debugging
- Check the Network tab in browser dev tools for API issues

## 📞 Support

For technical support or feature requests:

1. Check the troubleshooting section above
2. Review console logs for error messages
3. Verify Node.js version compatibility (18+)
4. Ensure all dependencies are properly installed

## 🎯 Next Steps

1. **Import Sample Data**: Test with your Excel/CSV files
2. **Explore Analytics**: Navigate through all dashboard tabs
3. **Test Export**: Generate comprehensive PDF reports
4. **Customize Settings**: Configure company branding and preferences

**Ready to transform your real estate lead management!** 🏠📊

#### 🤖 AI Assistant (NEW!)

- **Natural Language Queries**: Ask questions in Turkish about your lead data
- **Automatic Chart Generation**: AI creates appropriate visualizations
- **Smart Pattern Recognition**: Understands real estate terminology
- **Instant Analytics**: Get insights without complex filters
- **Local Processing**: No external APIs required, fast and reliable

**Example Queries:**

- "Kaç adet satılık lead var?"
- "Instagram dan gelen lead analizi"
- "Personel performansı nasıl?"
- "Bu ay trend analizi yap"
