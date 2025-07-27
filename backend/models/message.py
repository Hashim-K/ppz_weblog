"""
Message model representing parsed telemetry messages from Paparazzi data files.
"""

from dataclasses import dataclass
from typing import Dict, Any, Optional, List
import json


@dataclass
class Message:
    """Represents a parsed telemetry message"""

    timestamp: float
    aircraft_id: int
    message_type: str
    message_id: int
    raw_data: bytes
    parsed_fields: Dict[str, Any]

    def to_dict(self) -> Dict[str, Any]:
        """Convert message to dictionary for JSON serialization"""
        return {
            "timestamp": self.timestamp,
            "aircraft_id": self.aircraft_id,
            "message_type": self.message_type,
            "message_id": self.message_id,
            "fields": self.parsed_fields,
        }

    def to_json(self) -> str:
        """Convert message to JSON string"""
        return json.dumps(self.to_dict())

    def get_field(self, field_name: str) -> Any:
        """Get a specific field value"""
        return self.parsed_fields.get(field_name)

    def has_field(self, field_name: str) -> bool:
        """Check if message has a specific field"""
        return field_name in self.parsed_fields

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Message":
        """Create Message from dictionary representation."""
        return cls(
            timestamp=data["timestamp"],
            aircraft_id=data["aircraft_id"],
            message_type=data["message_type"],
            message_id=data["message_id"],
            raw_data=b"",  # Raw data not stored in JSON
            parsed_fields=data["fields"],
        )

    @classmethod
    def from_dict_list(cls, data_list: List[Dict[str, Any]]) -> List["Message"]:
        """Create list of Messages from list of dictionaries."""
        return [cls.from_dict(data) for data in data_list]
