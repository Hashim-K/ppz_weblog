"""
Paparazzi UAV Log Parser Backend

A modular Python backend for parsing Paparazzi UAV log files (.data and .log)
and providing a REST API for frontend visualization.

Architecture:
- FastAPI for REST API
- Pydantic models for data validation
- Modular parser classes for different message types
- Configurable settings from frontend
"""

import json
import threading
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from config.settings import Settings
from file_watcher import FileWatcher
from models.aircraft import Aircraft
from models.message import Message
from parser_version import ParserVersionManager

# Initialize file watcher
file_watcher = FileWatcher()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifespan"""

    # Startup
    def start_watcher():
        file_watcher.start()

    # Start file watcher in a separate thread
    watcher_thread = threading.Thread(target=start_watcher, daemon=True)
    watcher_thread.start()

    yield

    # Shutdown
    file_watcher.stop()


app = FastAPI(
    title="Paparazzi UAV Log Parser API",
    description="REST API for parsing and analyzing Paparazzi UAV log files",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js development server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global state
current_session: Optional[Dict[str, Any]] = None
settings = Settings()


@app.get("/")
async def root():
    """Health check endpoint"""
    return {"message": "Paparazzi UAV Log Parser API", "status": "running"}


@app.get("/sessions")
async def get_processed_sessions():
    """Get list of all processed log sessions"""
    try:
        sessions = file_watcher.get_processed_sessions()
        # Handle case where sessions might be None or empty
        if not sessions:
            return []

        # Extract session names from the session objects
        session_names = [
            session.get("session_name", "")
            for session in sessions
            if isinstance(session, dict) and session.get("session_name")
        ]
        return session_names
    except Exception as e:
        # Return empty array instead of throwing error
        print(f"Warning: Error getting processed sessions: {str(e)}")
        return []


@app.get("/parser-version")
async def get_parser_version():
    """Get current parser version information"""
    parser_manager = ParserVersionManager()
    version_info = parser_manager.get_parser_version_info()
    stored_version = parser_manager.load_stored_version()

    return {
        "current": version_info,
        "stored": stored_version,
        "has_changed": parser_manager.has_parser_changed(),
        "sessions_to_reprocess": (
            parser_manager.get_sessions_to_reprocess("output")
            if parser_manager.has_parser_changed()
            else []
        ),
    }


@app.post("/reprocess-sessions")
async def trigger_reprocessing():
    """Trigger reprocessing of sessions with outdated parser version"""
    try:
        file_watcher.check_and_reprocess_if_needed()
        return {"message": "Reprocessing completed successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Reprocessing failed: {str(e)}")


@app.get("/sessions/{session_name}")
async def get_session_data(session_name: str):
    """Get detailed data for a specific session"""
    global current_session

    # Load session from processed files
    output_path = Path("output") / session_name
    summary_file = output_path / "summary.json"
    aircraft_file = output_path / "aircraft.json"
    messages_file = output_path / "messages.json"

    if not summary_file.exists():
        raise HTTPException(status_code=404, detail="Session not found")

    try:
        # Load summary
        with open(summary_file, "r", encoding="utf-8") as f:
            summary_data = json.load(f)

        # Load aircraft data
        aircraft_data = []
        if aircraft_file.exists():
            with open(aircraft_file, "r", encoding="utf-8") as f:
                aircraft_json = json.load(f)
                aircraft_data = aircraft_json.get("aircraft", [])

        # Load messages data
        messages_data = []
        if messages_file.exists():
            with open(messages_file, "r", encoding="utf-8") as f:
                messages_json = json.load(f)
                messages_data = messages_json.get("messages", [])

        # Combine data for response
        session_data = {
            **summary_data,
            "aircraft": aircraft_data,
            "messages": messages_data,
        }

        # Set as current session for other endpoints
        current_session = {
            "aircraft_config": Aircraft.from_dict_list(aircraft_data),
            "parsed_data": Message.from_dict_list(messages_data),
            "session_name": session_name,
            "stats": summary_data["stats"],
        }

        return session_data

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading session: {str(e)}")


@app.get("/sessions/{session_name}/files")
async def get_session_files(session_name: str):
    """Get list of available files for a session"""
    output_path = Path("output") / session_name
    if not output_path.exists():
        raise HTTPException(status_code=404, detail="Session not found")

    files = {}
    for file_path in output_path.glob("*.json"):
        file_key = file_path.stem
        files[file_key] = {
            "name": file_path.name,
            "size": file_path.stat().st_size,
            "modified": file_path.stat().st_mtime,
        }

    return {"session_name": session_name, "files": files}


@app.get("/sessions/{session_name}/file/{file_name}")
async def get_session_file(session_name: str, file_name: str):
    """Get contents of a specific file from a session"""
    output_path = Path("output") / session_name
    file_path = output_path / f"{file_name}.json"

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading file: {str(e)}")


@app.get("/sessions/{session_name}/info")
async def get_session_info(session_name: str):
    """Get session information including aircraft and message types"""
    try:
        output_path = Path("output") / session_name
        summary_file = output_path / "summary.json"
        aircraft_file = output_path / "aircraft.json"

        if not output_path.exists() or not summary_file.exists():
            raise HTTPException(
                status_code=404, detail=f"Session '{session_name}' not found"
            )

        # Load summary
        with open(summary_file, "r", encoding="utf-8") as f:
            summary_data = json.load(f)

        # Load aircraft data
        aircraft_data = []
        if aircraft_file.exists():
            with open(aircraft_file, "r", encoding="utf-8") as f:
                aircraft_json = json.load(f)
                aircraft_data = aircraft_json.get("aircraft", [])

        # Get aircraft message counts from stats
        aircraft_message_counts = summary_data.get("stats", {}).get(
            "aircraft_message_counts", {}
        )

        # Transform aircraft data for frontend
        aircraft_list = []
        for aircraft in aircraft_data:
            aircraft_id = aircraft.get("ac_id", 0)
            aircraft_list.append(
                {
                    "id": aircraft_id,
                    "name": aircraft.get("name", "Unknown"),
                    "color": f"#{hash(aircraft.get('name', 'unknown')) % 0xFFFFFF:06x}",
                    "total_messages": aircraft_message_counts.get(str(aircraft_id), 0),
                }
            )

        # Get message types from summary - now includes counts
        message_types = []
        if "stats" in summary_data and "message_types" in summary_data["stats"]:
            for msg_type, count in summary_data["stats"]["message_types"].items():
                message_types.append(
                    {
                        "name": msg_type,
                        "count": count,
                        "description": f"Message type {msg_type}",
                    }
                )

        return {
            "session_id": session_name,
            "filename": summary_data.get("filename", session_name),
            "file_size": summary_data.get("file_size", 0),
            "total_messages": summary_data.get("stats", {}).get("total_messages", 0),
            "start_time": summary_data.get("stats", {}).get("start_time", 0),
            "end_time": summary_data.get("stats", {}).get("end_time", 0),
            "duration": summary_data.get("stats", {}).get("duration", 0),
            "datetime_info": summary_data.get("datetime_info", {}),
            "aircraft": aircraft_list,
            "message_types": message_types,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error loading session info: {str(e)}"
        )


@app.get("/sessions/{session_name}/messages")
async def get_session_messages(
    session_name: str,
    aircraft_id: Optional[int] = None,
    message_type: Optional[List[str]] = Query(None),
    limit: Optional[int] = None,
):
    """Get messages for a session with optional filtering"""
    output_path = Path("output") / session_name
    messages_file = output_path / "messages.json"

    if not messages_file.exists():
        raise HTTPException(status_code=404, detail="Messages file not found")

    try:
        # Load messages data
        with open(messages_file, "r", encoding="utf-8") as f:
            messages_json = json.load(f)
            all_messages = messages_json.get("messages", [])

        # Apply filters
        filtered_messages = all_messages

        if aircraft_id is not None:
            filtered_messages = [
                msg
                for msg in filtered_messages
                if msg.get("aircraft_id") == aircraft_id
            ]

        if message_type and len(message_type) > 0:
            filtered_messages = [
                msg
                for msg in filtered_messages
                if msg.get("message_type") in message_type
            ]

        # Apply limit if specified
        if limit:
            filtered_messages = filtered_messages[:limit]

        return filtered_messages

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading messages: {str(e)}")


@app.post("/sessions/{session_name}/load")
async def load_session(session_name: str):
    """Load a session as the current active session"""
    global current_session

    # Load session from processed files
    output_path = Path("output") / session_name
    summary_file = output_path / "summary.json"
    aircraft_file = output_path / "aircraft.json"
    messages_file = output_path / "messages.json"

    if not summary_file.exists():
        raise HTTPException(status_code=404, detail="Session not found")

    try:
        # Load summary
        with open(summary_file, "r", encoding="utf-8") as f:
            summary_data = json.load(f)

        # Load aircraft data
        aircraft_data = []
        if aircraft_file.exists():
            with open(aircraft_file, "r", encoding="utf-8") as f:
                aircraft_json = json.load(f)
                aircraft_data = aircraft_json.get("aircraft", [])

        # Load messages data (limit to first 1000 for performance)
        messages_data = []
        if messages_file.exists():
            with open(messages_file, "r", encoding="utf-8") as f:
                messages_json = json.load(f)
                all_messages = messages_json.get("messages", [])
                # Limit messages for initial load
                messages_data = (
                    all_messages[:1000] if len(all_messages) > 1000 else all_messages
                )

        # Set as current session
        current_session = {
            "aircraft_config": Aircraft.from_dict_list(aircraft_data),
            "parsed_data": Message.from_dict_list(messages_data),
            "session_name": session_name,
            "stats": summary_data["stats"],
        }

        return {
            "message": f"Session {session_name} loaded successfully",
            "stats": summary_data["stats"],
            "loaded_messages": len(messages_data),
            "total_messages": summary_data["stats"]["total_messages"],
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading session: {str(e)}")


@app.post("/upload")
async def upload_files(
    log_file: UploadFile = File(..., description="Paparazzi .log file"),
    data_file: UploadFile = File(..., description="Paparazzi .data file"),
):
    """Upload log and data files to be processed by file watcher"""
    try:
        # Validate file extensions
        if not log_file.filename or not log_file.filename.endswith(".log"):
            raise HTTPException(
                status_code=400, detail="Log file must have .log extension"
            )
        if not data_file.filename or not data_file.filename.endswith(".data"):
            raise HTTPException(
                status_code=400, detail="Data file must have .data extension"
            )

        # Create input directory if it doesn't exist
        input_dir = Path("input")
        input_dir.mkdir(exist_ok=True)

        # Save uploaded files to input directory
        log_content = await log_file.read()
        data_content = await data_file.read()

        # Use the base filename (without extension) for both files
        if not log_file.filename:
            raise HTTPException(status_code=400, detail="Log file name is required")
        base_name = log_file.filename.replace(".log", "")
        log_path = input_dir / f"{base_name}.log"
        data_path = input_dir / f"{base_name}.data"

        # Write files to disk - file watcher will detect and process them
        with open(log_path, "wb") as f:
            f.write(log_content)

        with open(data_path, "wb") as f:
            f.write(data_content)

        return {
            "message": "Files uploaded successfully",
            "session_name": base_name,
            "log_file": log_file.filename,
            "data_file": data_file.filename,
            "status": "Files saved to input directory, file watcher will process them",
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error uploading files: {str(e)}")


@app.delete("/sessions/{session_name}")
async def delete_session(session_name: str):
    """Delete a processed session and its data files"""
    try:
        # Check if session exists
        output_path = Path("output") / session_name
        if not output_path.exists():
            raise HTTPException(
                status_code=404, detail=f"Session '{session_name}' not found"
            )

        # Remove the entire session directory
        import shutil

        shutil.rmtree(output_path)

        return {
            "message": f"Session '{session_name}' deleted successfully",
            "session_name": session_name,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting session: {str(e)}")


@app.get("/aircraft")
async def get_aircraft():
    """Get list of aircraft from current session"""
    if not current_session:
        raise HTTPException(
            status_code=404, detail="No session found. Please upload files first."
        )

    aircraft_config = current_session["aircraft_config"]

    # aircraft_config is a list of Aircraft objects
    return {
        "aircraft": [
            {
                "id": aircraft.ac_id,
                "name": aircraft.name,
                "airframe": aircraft.airframe,
                "message_types": list(aircraft.message_definitions.keys()),
            }
            for aircraft in aircraft_config  # aircraft_config is already a list
        ]
    }


@app.get("/messages/{aircraft_id}")
async def get_messages(
    aircraft_id: int,
    message_type: Optional[str] = None,
    start_time: Optional[float] = None,
    end_time: Optional[float] = None,
    limit: Optional[int] = 1000,
):
    """Get messages for specific aircraft with optional filtering"""
    if not current_session:
        raise HTTPException(status_code=404, detail="No session found")

    parsed_data = current_session["parsed_data"]

    # Filter by aircraft ID
    aircraft_messages = [msg for msg in parsed_data if msg.aircraft_id == aircraft_id]

    # Apply filters
    if message_type:
        aircraft_messages = [
            msg for msg in aircraft_messages if msg.message_type == message_type
        ]

    if start_time is not None:
        aircraft_messages = [
            msg for msg in aircraft_messages if msg.timestamp >= start_time
        ]

    if end_time is not None:
        aircraft_messages = [
            msg for msg in aircraft_messages if msg.timestamp <= end_time
        ]

    # Apply limit
    if limit:
        aircraft_messages = aircraft_messages[:limit]

    return {
        "aircraft_id": aircraft_id,
        "message_count": len(aircraft_messages),
        "messages": [msg.to_dict() for msg in aircraft_messages],
    }


@app.get("/analysis/{aircraft_id}")
async def get_analysis(aircraft_id: int):
    """Get statistical analysis for aircraft data"""
    if not current_session:
        raise HTTPException(status_code=404, detail="No session found")

    # TODO: Implement analysis logic
    return {
        "aircraft_id": aircraft_id,
        "flight_duration": 0,
        "message_statistics": {},
        "trajectory_summary": {},
        "alerts": [],
    }


@app.get("/settings")
async def get_settings():
    """Get current parser settings"""
    return settings.to_dict()


@app.post("/settings")
async def update_settings(new_settings: Dict[str, Any]):
    """Update parser settings"""
    settings.update(new_settings)
    return {"message": "Settings updated successfully", "settings": settings.to_dict()}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
