# Paparazzi UAV Log Parser & Visualization System

A comprehensive system for parsing, processing, and visualizing Paparazzi UAV log files with automatic file monitoring and parser version management.

## Architecture Overview

### Backend (Python FastAPI)

- **Main API Server** (`main.py`): FastAPI application with REST endpoints
- **File Watcher** (`file_watcher.py`): Automatic monitoring and processing of log files
- **Parser Version Management** (`parser_version.py`): Hash-based tracking of parser changes
- **Modular Parsers**:
  - `log_parser.py`: XML log file parsing for aircraft configurations
  - `simple_data_parser.py`: Binary data file parsing for telemetry messages
- **Data Models**:
  - `aircraft.py`: Aircraft configuration structures
  - `message.py`: Telemetry message structures
- **Configuration** (`config/settings.py`): Application settings and parsing parameters

### Frontend (Next.js 15 + TypeScript)

- **Modern React Components**: Using shadcn/ui component library
- **Multi-tab Interface**: Dashboard, Sessions, and Settings tabs
- **Real-time Data Loading**: Dynamic session management and visualization
- **TypeScript Integration**: Full type safety with backend API

### File Processing Workflow

#### 1. **Input Monitoring**

- Watches `backend/input/` directory for new `.log` and `.data` file pairs
- Automatic detection when both files of a pair are available
- Processes existing files on startup

#### 2. **Parser Version Control**

- Generates SHA256 hash of all parser and model files
- Detects parser changes and triggers reprocessing of outdated sessions
- Maintains `parser_version.json` with current version metadata

#### 3. **Data Processing Pipeline**

```
Log Pair (*.log + *.data) → Parser → Multiple JSON Outputs
```

#### 4. **Output Structure**

For each processed session `YYMMDD__HHMMSS`:

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

#### 5. **Datetime Extraction**

- Automatically extracts date/time from filename format: `YY_MM_DD__HH_MM_SS`
- Example: `25_07_09__15_38_54.log` → July 9, 2025 at 15:38:54
- Stores parsed datetime information in session metadata

### Key Features

#### Automatic Processing

- File watcher monitors input directory continuously
- Processes new file pairs automatically when both files are present
- Maintains archive of all processed files

#### Parser Version Management

- Tracks changes to parser code using content hashing
- Automatically reprocesses sessions when parser is updated
- Ensures all sessions use the latest parser version

#### Organized Data Output

- Multiple JSON files optimized for different use cases:
  - **summary.json**: Quick overview and metadata
  - **timeline.json**: Optimized for time-series visualization
  - **by_aircraft.json**: Aircraft-specific analysis
  - **by_message_type.json**: Message type analysis

#### REST API Endpoints

- `GET /sessions` - List all processed sessions
- `GET /sessions/{name}` - Get session summary
- `GET /sessions/{name}/file/{file}` - Get specific session data file
- `GET /parser-version` - Current parser version info
- `POST /reprocess-sessions` - Trigger reprocessing for outdated sessions

## Development Setup

### Backend

```bash
cd backend
pip install -r requirements.txt
python main.py
```

### Frontend

```bash
cd frontend
bun install
bun dev
```

## Usage

1. Place Paparazzi log file pairs in `backend/input/`
2. Files are automatically processed when both `.log` and `.data` files are detected
3. Access web interface at `http://localhost:3000`
4. View processed sessions and data through the web interface

## File Format Support

- **Log files** (`.log`): XML format containing aircraft configurations and message definitions
- **Data files** (`.data`): Binary format containing telemetry messages with timestamps
- **Filename convention**: `YY_MM_DD__HH_MM_SS.{log|data}`
