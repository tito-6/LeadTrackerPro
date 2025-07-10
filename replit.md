# İNNO Gayrimenkul Yatırım A.Ş. - Lead Raporlama Sistemi

## Overview

This is İNNO Gayrimenkul Yatırım A.Ş.'s comprehensive AI-powered real estate lead automation platform that transforms complex lead data into actionable insights through intelligent analytics and comprehensive performance tracking. The system features a mandatory dual-file upload capability for complete lead analysis, processing both main lead files and Takipte (follow-up) files to provide real-time dashboard capabilities, advanced Turkish language support with 37+ columns, and intelligent insights with follow-up metrics. Built as a React single-page application with Express.js backend using PostgreSQL with Drizzle ORM.

### Recent Updates (January 2025)
- **Corporate Branding**: Added İNNO Gayrimenkul Yatırım A.Ş. logo and company branding throughout the application
- **Standardized Color System**: Implemented consistent brand colors for Instagram (purple), Facebook (blue), and Referans (green)
- **Enhanced UI**: Added DateFilter component for consistent date filtering across all tabs
- **Smart Color Mapping**: Replaced hardcoded colors with intelligent color mapping based on data categories
- **Customer-Focused Analytics**: Transformed Personnel Analysis section into Customer Analysis with comprehensive dashboard comparing customer segments rather than personnel performance
- **Cleaned Table Display**: Removed color hex code displays from all tables for professional presentation

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **Routing**: Wouter for lightweight client-side routing
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **State Management**: TanStack Query (React Query) for server state management
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Module System**: ES Modules
- **Development**: tsx for TypeScript execution in development
- **Build**: esbuild for production bundling
- **File Processing**: Multer for file uploads, XLSX and PapaParse for Excel/CSV parsing

### Data Storage
- **Local Development**: In-memory storage (MemStorage) for development and local VS Code setup
- **Production**: PostgreSQL (configured for Neon serverless) when database is available
- **ORM**: Drizzle ORM with Drizzle Kit for migrations (optional for local development)
- **Schema Location**: Shared schema definitions in `/shared/schema.ts`
- **Session Storage**: Memory-based session storage for local development

## Key Components

### Database Schema
Three main entities with comprehensive Turkish real estate data structure:
- **Leads**: Comprehensive lead information supporting all 37+ Turkish real estate columns including customer details, source tracking, response management, meeting notes, appointment scheduling, WebForm parsing, project detection, and outcome tracking
- **Sales Reps**: Sales representative data with monthly targets and active status
- **Settings**: Key-value store for application configuration

### Turkish Column Support (37+ Fields)
Complete mapping for all Turkish real estate industry standard columns:
- **Customer Information**: Müşteri ID, İletişim ID, Müşteri Adı Soyadı
- **Source Tracking**: İlk Müşteri Kaynağı, Form Müşteri Kaynağı, WebForm Notu
- **Form Locations**: İnfo Form Geliş Yeri (1-4), Talep Geliş Tarihi
- **Personnel Management**: Atanan Personel, Hatırlatma Personeli
- **Communication Tracking**: Geri Dönüş tracking for calls and emails, response timing analysis
- **Meeting Management**: Birebir Görüşme, meeting dates and results
- **Outcome Tracking**: SON GORUSME SONUCU (dynamic status), Dönüş Olumsuzluk Nedeni, Satış tracking
- **Advanced Parsing**: Automatic project name extraction, lead type detection (Kiralık/Satılık), date format handling

### Advanced Analytics Features
- **Olumsuz Analizi**: Complete negative lead breakdown with reason categorization, personnel performance analysis, and detailed note tracking
- **Takipte Analizi**: Follow-up management with appointment scheduling, urgent alerts, and response time tracking
- **📞 Takip Raporu**: Comprehensive secondary file processing for follow-up data with SONUÇ, GÖRÜŞME, GÖRÜŞME TARİHİ analysis, priority-based tracking system, and automated status detection from call notes
- **Duplicate Detection**: Advanced matching algorithms across multiple fields (Müşteri ID, İletişim ID) with intelligent resolution recommendations
- **🧠 Intelligent Data Import**: Dual file upload system supporting main lead files + secondary takip files, smart column detection, automatic project extraction, and intelligent duplicate prevention
- **Advanced WebForm Parsing**: Intelligent project name detection and lead type classification from WebForm Notu
- **Dynamic Status Generation**: Automatic status detection from SON GORUSME SONUCU column, avoiding default "Yeni" assignments
- **Real-time Statistics**: Dynamic calculation of lead performance metrics across all categories with interactive 3D charts
- **🎛️ Intelligent Configuration**: Advanced chart settings with 3D effects, animation controls, smart alert thresholds, comprehensive color management, and configuration export/import capabilities

### API Structure
RESTful API endpoints:
- `/api/leads` - CRUD operations for leads with filtering capabilities
- `/api/sales-reps` - Sales representative management
- `/api/settings` - Application settings management
- `/api/stats` - Statistics and analytics endpoints
- `/api/export` - Data export functionality

### Frontend Features
- **🧠 Akıllı Dashboard**: Enhanced AI-powered overview with dual-source data analysis, requiring both main lead files and Takipte follow-up files for complete functionality, featuring real-time KPIs, data completeness scores, and intelligent warnings when second file is missing
- **Excel Input Tab**: Dedicated Excel-style input screen with copy & paste functionality from Excel/Google Sheets, automatic total calculations, and comprehensive Turkish column support (37+ fields)
- **🧠 Akıllı Veri Girişi Tab**: Enhanced data entry with mandatory dual file upload capability supporting both main lead files and secondary takip files, smart column detection, automatic project extraction from WebForm notes, and intelligent duplicate prevention
- **Reports Tab**: Interactive charts and filtered data views with Chart.js integration and real-time synchronization
- **Olumsuz Analizi Tab**: Advanced negative lead analysis with breakdown by reasons, personnel, and detailed notes using interactive 3D charts
- **📞 Unified Takip Analizi**: Comprehensive merged analysis combining original Takipte Analizi and Takip Raporu tabs, featuring customer criteria analysis (Satış vs Kira), source analysis (Instagram, Facebook), meeting type distribution, office performance, and advanced follow-up tracking with real-time metrics
- **Duplicate Detection Tab**: Advanced duplicate analysis with collapsible group views and intelligent matching recommendations
- **Export Tab**: Multi-format export capabilities (Excel, JSON) with comprehensive field mapping and Turkish column support
- **🎛️ Akıllı Ayarlar Tab**: Intelligent settings panel with advanced chart configuration (3D effects, animations, colors), smart alert system with performance thresholds, comprehensive color management for statuses and personnel, and exportable configuration profiles
- **Settings Tab**: Basic application configuration and sales rep target management
- **Dynamic Salesperson Tabs**: Individual performance tabs for each salesperson with separate sales and rental lead breakdowns, pie charts, and recent activity tracking

### Storage Implementation
The application includes both memory-based storage (for development) and database storage interfaces, allowing for flexible deployment scenarios.

## Data Flow

1. **Lead Entry**: Users input lead data through forms or file uploads
2. **Processing**: Server validates and stores lead data in PostgreSQL
3. **Analytics**: Statistics are calculated on-demand from stored lead data
4. **Reporting**: Charts and reports are generated using Chart.js on the frontend
5. **Export**: Data can be exported in multiple formats for external use

## External Dependencies

### UI and Visualization
- Radix UI primitives for accessible component foundation
- Chart.js for data visualization
- Lucide React for consistent iconography
- Date-fns for date manipulation

### Data Processing
- XLSX for Excel file processing
- PapaParse for CSV parsing
- Zod for runtime type validation
- Drizzle Zod for schema-to-validation integration

### Development Tools
- Replit-specific plugins for development environment integration
- TypeScript for type safety across the entire stack
- ESLint configuration for code quality

## Deployment Strategy

### Local Development (VS Code)
- **Quick Setup**: See `LOCAL_SETUP.md` for complete local development guide
- **Memory Storage**: All data stored in application memory (no database required)
- **Hot Reloading**: tsx runs the Express server with automatic restart
- **VS Code Integration**: Pre-configured launch settings and extensions
- **Data Persistence**: Data persists during session, resets on server restart

### Development (Replit)
- Vite dev server serves the React application
- tsx runs the Express server with hot reloading
- Drizzle Kit handles database migrations
- Environment variables manage database connection

### Production
- Vite builds the frontend to static assets
- esbuild bundles the backend into a single file
- Static files are served by Express
- PostgreSQL database runs on Neon serverless platform

### Environment Configuration
- **Local**: Memory storage, no environment variables required
- **Development**: Database URL configured via environment variables
- **Production**: Separate configurations for scalability
- Session storage integrated with PostgreSQL for scalability

The application is designed to work seamlessly in three environments:
1. **Local VS Code**: Memory storage for development
2. **Replit**: Cloud development with database
3. **Production**: Scalable deployment with PostgreSQL