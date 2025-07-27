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

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import json
import asyncio
from pathlib import Path

from parsers.log_parser import LogParser
from parsers.simple_data_parser import SimpleDataParser
from models.aircraft import Aircraft
from models.message import Message
from config.settings import Settings

app = FastAPI(
    title="Paparazzi UAV Log Parser API",
    description="REST API for parsing and analyzing Paparazzi UAV log files",
    version="1.0.0"
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

@app.post("/upload")
async def upload_files(
    log_file: UploadFile = File(..., description="Paparazzi .log file"),
    data_file: UploadFile = File(..., description="Paparazzi .data file")
):
    """Upload and parse log and data files"""
    global current_session
    
    try:
        # Save uploaded files temporarily
        log_content = await log_file.read()
        data_content = await data_file.read()
        
        # Parse the files
        log_parser = LogParser()
        data_parser = SimpleDataParser()
        
        # Parse log file to get message definitions
        aircraft_config = log_parser.parse_log(log_content.decode('utf-8'))
        
        # Parse data file using the schema from log
        parsed_data = data_parser.parse_data(data_content, aircraft_config)
        
        # Store in session
        current_session = {
            "aircraft_config": aircraft_config,
            "parsed_data": parsed_data,
            "log_filename": log_file.filename,
            "data_filename": data_file.filename
        }
        
        return {
            "message": "Files uploaded and parsed successfully",
            "aircraft_count": len(aircraft_config.aircraft),
            "message_count": len(parsed_data),
            "session_id": id(current_session)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error parsing files: {str(e)}")

@app.get("/aircraft")
async def get_aircraft():
    """Get list of aircraft from current session"""
    if not current_session:
        raise HTTPException(status_code=404, detail="No session found. Please upload files first.")
    
    aircraft_config = current_session["aircraft_config"]
    return {
        "aircraft": [
            {
                "id": aircraft.ac_id,
                "name": aircraft.name,
                "airframe": aircraft.airframe,
                "message_types": list(aircraft.message_definitions.keys())
            }
            for aircraft in aircraft_config.aircraft
        ]
    }

@app.get("/messages/{aircraft_id}")
async def get_messages(
    aircraft_id: int,
    message_type: Optional[str] = None,
    start_time: Optional[float] = None,
    end_time: Optional[float] = None,
    limit: Optional[int] = 1000
):
    """Get messages for specific aircraft with optional filtering"""
    if not current_session:
        raise HTTPException(status_code=404, detail="No session found")
    
    parsed_data = current_session["parsed_data"]
    
    # Filter by aircraft ID
    aircraft_messages = [msg for msg in parsed_data if msg.aircraft_id == aircraft_id]
    
    # Apply filters
    if message_type:
        aircraft_messages = [msg for msg in aircraft_messages if msg.message_type == message_type]
    
    if start_time is not None:
        aircraft_messages = [msg for msg in aircraft_messages if msg.timestamp >= start_time]
    
    if end_time is not None:
        aircraft_messages = [msg for msg in aircraft_messages if msg.timestamp <= end_time]
    
    # Apply limit
    if limit:
        aircraft_messages = aircraft_messages[:limit]
    
    return {
        "aircraft_id": aircraft_id,
        "message_count": len(aircraft_messages),
        "messages": [msg.to_dict() for msg in aircraft_messages]
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
        "alerts": []
    }

@app.get("/settings")
async def get_settings():
    """Get current parser settings"""
    return settings.to_dict()

@app.post("/settings")
async def update_settings(new_settings: Dict[str, Any]):
    """Update parser settings"""
    global settings
    settings.update(new_settings)
    return {"message": "Settings updated successfully", "settings": settings.to_dict()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
