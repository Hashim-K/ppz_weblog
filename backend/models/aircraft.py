"""
Aircraft model representing an aircraft configuration from Paparazzi log files.
"""

from dataclasses import dataclass
from typing import Any, Dict, List, Optional


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

    def to_dict(self) -> Dict[str, Any]:
        """Convert message field to dictionary representation."""
        return {
            "name": self.name,
            "field_type": self.field_type,
            "unit": self.unit,
            "alt_unit": self.alt_unit,
            "alt_unit_coef": self.alt_unit_coef,
            "description": self.description,
            "values": self.values,
        }


@dataclass
class MessageDefinition:
    """Represents a message definition from the log file"""

    name: str
    message_id: int
    fields: List[MessageField]
    description: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert message definition to dictionary representation."""
        return {
            "name": self.name,
            "message_id": self.message_id,
            "fields": [
                field.to_dict() if hasattr(field, "to_dict") else field.__dict__
                for field in self.fields
            ],
            "description": self.description,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "MessageDefinition":
        """Create MessageDefinition from dictionary representation."""
        return cls(
            name=data["name"],
            message_id=data["message_id"],
            fields=[
                MessageField(**field) if isinstance(field, dict) else field
                for field in data["fields"]
            ],
            description=data.get("description"),
        )


@dataclass
@dataclass
class Aircraft:
    """Represents an aircraft configuration from the log file."""

    ac_id: int
    name: str
    airframe: str
    message_definitions: Dict[str, MessageDefinition]

    def to_dict(self) -> Dict[str, Any]:
        """Convert aircraft to dictionary representation."""
        return {
            "ac_id": self.ac_id,
            "name": self.name,
            "airframe": self.airframe,
            "message_definitions": {
                name: msg_def.to_dict()
                for name, msg_def in self.message_definitions.items()
            },
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Aircraft":
        """Create Aircraft from dictionary representation."""
        return cls(
            ac_id=data["ac_id"],
            name=data["name"],
            airframe=data["airframe"],
            message_definitions={
                name: MessageDefinition.from_dict(msg_def)
                for name, msg_def in data["message_definitions"].items()
            },
        )

    def get_message_definition(self, message_name: str) -> Optional[MessageDefinition]:
        """Get message definition by name."""
        return self.message_definitions.get(message_name)

    @classmethod
    def from_dict_list(cls, data_list: List[Dict[str, Any]]) -> List["Aircraft"]:
        """Create list of Aircraft from list of dictionaries."""
        return [cls.from_dict(data) for data in data_list]


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
