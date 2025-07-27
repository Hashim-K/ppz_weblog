# Paparazzi UAV Log Parser & Visualization System

A comprehensive web-based system for parsing, processing, and visualizing Paparazzi UAV log files with automatic file monitoring, real-time processing, and advanced filtering capabilities.

## 🚀 Key Features

### ✨ User Interface
- **Modern React Web App**: Built with Next.js 15, TypeScript, and Radix UI components
- **Dark/Light Mode**: Full theming support with system detection
- **URL-Based Navigation**: Shareable session links with persistent state
- **Real-time Processing**: Live upload progress with automatic file processing
- **Advanced Filtering**: Multi-select message types, aircraft filtering, and search
- **Configurable Settings**: Persistent user preferences and sorting options

### 🔄 Data Processing
- **Automatic File Monitoring**: Watches for new log files and processes them instantly
- **Parser Version Management**: Hash-based change detection with automatic reprocessing
- **Smart Caching**: Efficient data storage with multiple optimized JSON outputs
- **File Size Tracking**: Comprehensive session statistics including file sizes
- **Error Handling**: Robust processing with detailed error reporting

### 📊 Visualization & Analysis
- **Session Management**: Complete CRUD operations with confirmation dialogs
- **Message Analysis**: Interactive message tables with filtering and search
- **Aircraft Insights**: Per-aircraft message counts and filtering
- **Time-based Navigation**: Session timeline with duration information
- **Export Capabilities**: Configurable data export with multiple formats

## Architecture Overview

### Backend (Python FastAPI)

- **Main API Server** (`main.py`): RESTful API with comprehensive endpoints
- **File Watcher** (`file_watcher.py`): Real-time file monitoring and processing
- **Parser System**: Modular parsers for XML logs and binary data
- **Data Models**: Type-safe data structures for aircraft and messages
- **Settings Management**: Configurable parsing and export parameters

### Frontend (Next.js 15 + TypeScript)

- **Component Architecture**: Modern React with shadcn/ui components
- **State Management**: URL-based navigation with persistent settings
- **Real-time Updates**: Live processing status and progress tracking
- **Responsive Design**: Mobile-friendly interface with dark mode support
- **Type Safety**: Full TypeScript integration with backend API

### File Processing Workflow

#### 1. **Upload & Monitoring**
- Drag-and-drop file upload with progress tracking
- Automatic detection of log/data file pairs
- Real-time processing status updates with polling

#### 2. **Parser Version Control**
- SHA256 hash tracking of all parser components
- Automatic reprocessing when parser code changes
- Version metadata storage for audit trails

#### 3. **Data Processing Pipeline**
```
Upload → File Watcher → Parser → Multiple JSON Outputs → Web Interface
```

#### 4. **Output Structure**
For each processed session `YYMMDD__HHMMSS`:

```
output/
├── {session_name}/              # Main output directory
│   ├── summary.json            # Session metadata, statistics, and file sizes
│   ├── aircraft.json           # Aircraft configurations and message counts
│   ├── messages.json           # All messages chronologically sorted
│   ├── timeline.json           # Time-series data optimized for visualization
│   ├── by_aircraft.json        # Messages grouped by aircraft ID
│   └── by_message_type.json    # Messages grouped by message type
└── processed_logs/             # Archive of original files
    └── {session_name}/
        ├── {session_name}.log  # Original XML log file
        └── {session_name}.data # Original binary data file
```

```
output/
├── {session_name}/              # Main output directory
│   ├── summary.json            # Session metadata and statistics
│   ├── aircraft.json           # Aircraft configurations
│   ├── messages.json           # All messages chronologically
│   ├── timeline.json           # Time-series data for plotting
│   ├── by_aircraft.json        # Messages grouped by aircraft
│   └── by_message_type.json    # Messages grouped by type
└── processed_logs/             # Archive of processed files
    └── {session_name}/
        ├── {session_name}.log  # Original log file
        └── {session_name}.data # Original data file
```

### Advanced Features

#### 🎯 Smart Filtering & Search
- **Multi-select Message Types**: Filter by one or multiple message types simultaneously
- **Aircraft Filtering**: View messages from specific aircraft with active aircraft detection
- **Real-time Search**: Instant search across message content and metadata
- **Persistent Filters**: URL-based filter state for shareable analysis

#### ⚙️ Configurable Settings
- **UI Preferences**: Aircraft and message type sorting (alphabetical or by count)
- **Theme Management**: Light, dark, or system-based theming
- **Export Settings**: Configurable time formats, decimal places, and metadata inclusion
- **Parser Settings**: Customizable message filtering and parsing parameters

#### 🔄 Session Management
- **CRUD Operations**: Create, view, and delete sessions with confirmation dialogs
- **File Upload**: Drag-and-drop interface with real-time processing feedback
- **Processing Status**: Live updates during file processing with polling
- **Archive Management**: Automatic organization of processed files

#### 📈 Data Visualization
- **Interactive Tables**: Sortable message tables with pagination
- **Statistics Overview**: Session duration, message counts, and file sizes
- **Aircraft Analytics**: Per-aircraft message distribution and filtering
- **Timeline Analysis**: Time-based message analysis and navigation

### REST API Endpoints

#### Session Management
- `GET /sessions` - List all processed sessions
- `GET /sessions/{name}/info` - Get detailed session metadata
- `DELETE /sessions/{name}` - Delete session and associated files
- `POST /upload` - Upload new log files for processing

#### Data Access
- `GET /sessions/{name}/messages` - Get session messages with filtering
- `GET /sessions/{name}/file/{file}` - Access specific session data files
- `GET /parser-version` - Current parser version information
- `POST /reprocess-sessions` - Trigger reprocessing for outdated sessions

#### Configuration
- `GET /settings` - Get current parser and export settings
- `POST /settings` - Update parser and export settings

## 🚀 Quick Start

### Prerequisites
- Python 3.9+ with pip
- Node.js 18+ with bun (recommended) or npm
- Git for version control

### Backend Setup
```bash
cd backend
pip install -r requirements.txt
python main.py
```
*Backend will start on `http://localhost:8000`*

### Frontend Setup
```bash
cd frontend
bun install          # or npm install
bun dev             # or npm run dev
```
*Frontend will start on `http://localhost:3000`*

### File Upload
1. Access the web interface at `http://localhost:3000`
2. Navigate to the "Sessions" tab
3. Drag and drop your `.log` and `.data` file pairs
4. Watch real-time processing progress
5. View processed data in the "Dashboard" tab

## 📁 File Format Support

### Input Files
- **Log Files** (`.log`): XML format with aircraft configurations and message definitions
- **Data Files** (`.data`): Binary format with timestamped telemetry messages
- **Naming Convention**: `YY_MM_DD__HH_MM_SS.{log|data}`
- **File Pairs**: Both `.log` and `.data` files required for processing

### Output Data
- **JSON Format**: Structured data optimized for web consumption
- **Multiple Views**: Different JSON files for various analysis needs
- **Metadata Rich**: Comprehensive session information and statistics
- **Export Ready**: Configurable export formats and options

## 🛠️ Development

### Technology Stack
- **Backend**: Python 3.9+, FastAPI, asyncio, watchdog
- **Frontend**: Next.js 15, React 18, TypeScript 5, Tailwind CSS
- **UI Components**: Radix UI, shadcn/ui, Lucide React icons
- **Build Tools**: Bun (recommended), Vite, ESBuild

### Project Structure
```
ppz_weblog/
├── backend/                    # Python FastAPI server
│   ├── main.py                # Main API server
│   ├── file_watcher.py        # File monitoring service
│   ├── log_parser.py          # XML log parser
│   ├── simple_data_parser.py  # Binary data parser
│   ├── parser_version.py      # Version management
│   ├── models/                # Data models
│   ├── config/                # Configuration files
│   ├── input/                 # Upload directory
│   └── output/                # Processed data
└── frontend/                  # Next.js React app
    ├── src/
    │   ├── app/               # Next.js app router
    │   ├── components/        # React components
    │   └── lib/               # Utilities and helpers
    ├── public/                # Static assets
    └── package.json           # Dependencies
```

## 🔧 Configuration

### Parser Settings
- **Message Size Limits**: Configurable maximum message sizes
- **Debug Messages**: Toggle debug message parsing
- **Time Offsets**: Adjust timestamp parsing
- **Filtering**: Aircraft and message type filters

### UI Settings
- **Sorting Preferences**: Default sort orders for dropdowns
- **Theme Selection**: Light, dark, or system themes
- **Display Options**: Configurable data display formats

### Export Settings
- **Time Formats**: Timestamp, datetime, or relative formats
- **Precision**: Configurable decimal places
- **Metadata**: Include/exclude raw data and metadata

## 🐳 Docker & Development

### Quick Development Setup
```bash
# One-command setup for development environment
./setup-dev.sh
```

### Quick Start with Docker
```bash
# Production build
docker-compose up --build

# Development mode with hot reload
docker-compose -f docker-compose.dev.yml up --build
```

### Access Points
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **Health Checks**: `/api/health` (frontend), `/health` (backend)

For comprehensive Docker, CI/CD, and deployment instructions, see [DEVELOPMENT.md](./DEVELOPMENT.md).

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Set up pre-commit hooks (see [DEVELOPMENT.md](./DEVELOPMENT.md))
4. Commit your changes (`git commit -m 'Add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

### Development Setup
See [DEVELOPMENT.md](./DEVELOPMENT.md) for detailed setup instructions including:
- Docker development workflows
- Git hooks configuration
- CI/CD pipeline details
- Deployment strategies

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
