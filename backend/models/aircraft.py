"""
Aircraft model representing an aircraft configuration from Paparazzi log files.
"""

from dataclasses import dataclass
from typing import Dict, List, Any, Optional


@dataclass
class MessageField:
    """Represents a field in a message definition"""
    name: str
    field_type: str
    unit: Optional[str] = None
    alt_unit: Optional[str] = None
    alt_unit_coef: Optional[float] = None
    description: Optional[str] = None
    values: Optional[List[str]] = None  # For enum-like fields


@dataclass
class MessageDefinition:
    """Represents a message definition from the log file"""
    name: str
    message_id: int
    fields: List[MessageField]
    description: Optional[str] = None


@dataclass
class Aircraft:
    """Represents an aircraft configuration"""
    ac_id: int
    name: str
    airframe: str
    radio: str
    telemetry: str
    flight_plan: str
    settings: str
    gui_color: str
    message_definitions: Dict[str, MessageDefinition]
    
    def get_message_definition(self, message_name: str) -> Optional[MessageDefinition]:
        """Get message definition by name"""
        return self.message_definitions.get(message_name)
    
    def get_message_definition_by_id(self, message_id: int) -> Optional[MessageDefinition]:
        """Get message definition by ID"""
        for msg_def in self.message_definitions.values():
            if msg_def.message_id == message_id:
                return msg_def
        return None


@dataclass
class AircraftConfig:
    """Container for all aircraft configurations"""
    aircraft: List[Aircraft]
    
    def get_aircraft_by_id(self, ac_id: int) -> Optional[Aircraft]:
        """Get aircraft by ID"""
        for aircraft in self.aircraft:
            if aircraft.ac_id == ac_id:
                return aircraft
        return None
