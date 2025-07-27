"""
Simple text-based data parser for Paparazzi UAV data files

This parser handles the text-based format visible in the sample data file.
"""

import re
from typing import List, Dict, Any, Optional
from models.message import Message
from models.aircraft import AircraftConfig


class SimpleDataParser:
    """Simple parser for text-based Paparazzi data format"""

    def __init__(self):
        self.aircraft_config: Optional[AircraftConfig] = None

    def parse_data(
        self, data_content: bytes, aircraft_config: AircraftConfig
    ) -> List[Message]:
        """
        Parse text-based Paparazzi data file.

        Format appears to be:
        timestamp aircraft_id MESSAGE_NAME field1,field2,field3,...

        Args:
            data_content: The content of the .data file as bytes
            aircraft_config: Aircraft configuration with message definitions

        Returns:
            List[Message]: Parsed messages
        """
        self.aircraft_config = aircraft_config

        try:
            # Decode as text
            text_content = data_content.decode("utf-8", errors="ignore")
        except UnicodeDecodeError:
            # Try latin-1 as fallback
            text_content = data_content.decode("latin-1", errors="ignore")

        messages = []

        for line_no, line in enumerate(text_content.splitlines()):
            line = line.strip()
            if not line or line.startswith("#"):
                continue

            try:
                message = self._parse_line(line)
                if message:
                    messages.append(message)
            except Exception as e:
                print(f"Warning: Error parsing line {line_no + 1}: {e}")
                continue

        return messages

    def _parse_line(self, line: str) -> Optional[Message]:
        """Parse a single line of data"""
        # Split by whitespace, but be careful with message content
        parts = line.split()
        if len(parts) < 3:
            return None

        try:
            # Parse timestamp
            timestamp = float(parts[0])

            # Parse aircraft ID
            aircraft_id = int(parts[1])

            # Parse message name
            message_name = parts[2]

            # Parse message data (everything after message name)
            if len(parts) > 3:
                # Join remaining parts and split by commas/spaces
                data_part = " ".join(parts[3:])
                parsed_fields = self._parse_message_data(data_part, message_name)
            else:
                parsed_fields = {}

            # Get message definition for ID
            message_id = 0
            if self.aircraft_config:
                aircraft = self.aircraft_config.get_aircraft_by_id(aircraft_id)
                if aircraft:
                    msg_def = aircraft.get_message_definition(message_name)
                    if msg_def:
                        message_id = msg_def.message_id

            return Message(
                timestamp=timestamp,
                aircraft_id=aircraft_id,
                message_type=message_name,
                message_id=message_id,
                raw_data=line.encode("utf-8"),
                parsed_fields=parsed_fields,
            )

        except (ValueError, IndexError) as e:
            print(f"Warning: Could not parse line: {line[:100]}... Error: {e}")
            return None

    def _parse_message_data(self, data_part: str, message_name: str) -> Dict[str, Any]:
        """Parse the data portion of a message"""
        parsed_fields = {}

        # Get field definitions if available
        field_names = []
        if self.aircraft_config:
            for aircraft in self.aircraft_config.aircraft:
                msg_def = aircraft.get_message_definition(message_name)
                if msg_def:
                    field_names = [field.name for field in msg_def.fields]
                    break

        # Try to parse as comma-separated or space-separated values
        if "," in data_part:
            values = [v.strip() for v in data_part.split(",")]
        else:
            values = data_part.split()

        # Convert values to appropriate types
        converted_values = []
        for value in values:
            converted_values.append(self._convert_value(value))

        # Map to field names if available
        if field_names:
            for i, field_name in enumerate(field_names):
                if i < len(converted_values):
                    parsed_fields[field_name] = converted_values[i]
        else:
            # Use generic field names
            for i, value in enumerate(converted_values):
                parsed_fields[f"field_{i}"] = value

        # Also store raw values for debugging
        parsed_fields["_raw_values"] = converted_values
        parsed_fields["_raw_data"] = data_part

        return parsed_fields

    def _convert_value(self, value_str: str) -> Any:
        """Convert a string value to appropriate Python type"""
        value_str = value_str.strip()

        if not value_str or value_str == "-":
            return None

        # Try to convert to number
        try:
            # Check if it's an integer
            if "." not in value_str and "e" not in value_str.lower():
                return int(value_str)
            else:
                return float(value_str)
        except ValueError:
            pass

        # Check for special values
        if value_str.lower() in ["true", "yes", "1"]:
            return True
        elif value_str.lower() in ["false", "no", "0"]:
            return False
        elif value_str.lower() in ["nan", "null", "none"]:
            return None

        # Return as string
        return value_str
