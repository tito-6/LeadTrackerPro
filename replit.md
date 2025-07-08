# Real Estate Lead Report Automation

## Overview

This is a full-stack web application for managing real estate leads and generating automated reports. The system is built as a React single-page application with an Express.js backend, using PostgreSQL with Drizzle ORM for data persistence. The application provides functionality for lead data entry, reporting with charts, data export capabilities, and system settings management.

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
- **Database**: PostgreSQL (configured for Neon serverless)
- **ORM**: Drizzle ORM with Drizzle Kit for migrations
- **Schema Location**: Shared schema definitions in `/shared/schema.ts`
- **Session Storage**: PostgreSQL-based session storage using connect-pg-simple

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
- **Overview Dashboard Tab**: Complete summary table showing each salesperson's performance with interactive 3D charts for lead status distribution, real-time data updates, and chart type switching (Pie, Column, Line)
- **Excel Input Tab**: Dedicated Excel-style input screen with copy & paste functionality from Excel/Google Sheets, automatic total calculations, and comprehensive Turkish column support (37+ fields)
- **🧠 Akıllı Veri Girişi Tab**: Enhanced data entry with intelligent dual file upload capability supporting both main lead files and secondary takip files, smart column detection, automatic project extraction from WebForm notes, and intelligent duplicate prevention
- **Reports Tab**: Interactive charts and filtered data views with Chart.js integration and real-time synchronization
- **Olumsuz Analizi Tab**: Advanced negative lead analysis with breakdown by reasons, personnel, and detailed notes using interactive 3D charts
- **Takipte Analizi Tab**: Follow-up lead tracking with appointment management and urgent alerts
- **📞 Takip Raporu Tab**: Comprehensive follow-up reporting system with SONUÇ, GÖRÜŞME, and GÖRÜŞME TARİHİ column analysis, priority-based lead tracking, personnel performance monitoring, and secondary file processing capabilities
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

### Development
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
- Database URL configured via environment variables
- Separate configurations for development and production
- Session storage integrated with PostgreSQL for scalability

The application is designed to be easily deployable on platforms like Replit while maintaining the flexibility to deploy elsewhere with minimal configuration changes.