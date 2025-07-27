"""
Data parser for Paparazzi UAV data files (.data)

This module parses the binary data files that contain telemetry messages
using the message definitions from the log file.
"""

import struct
from typing import Any, Dict, List

from ..models.aircraft import AircraftConfig, MessageField
from ..models.message import Message


class DataParser:
    """Parser for Paparazzi .data files"""

    def __init__(self):
        self.aircraft_config: AircraftConfig = None

    def parse_data(
        self, data_content: bytes, aircraft_config: AircraftConfig
    ) -> List[Message]:
        """
        Parse a Paparazzi data file using message definitions from the log file.

        Args:
            data_content: The binary content of the .data file
            aircraft_config: Aircraft configuration with message definitions

        Returns:
            List[Message]: Parsed messages
        """
        self.aircraft_config = aircraft_config
        messages = []
        offset = 0

        while offset < len(data_content):
            try:
                message, bytes_consumed = self._parse_single_message(
                    data_content[offset:]
                )
                if message:
                    messages.append(message)
                    offset += bytes_consumed
                else:
                    # Skip this byte and try next
                    offset += 1
            except Exception as e:
                print(f"Warning: Error parsing message at offset {offset}: {e}")
                offset += 1

        return messages

    def _parse_single_message(self, data: bytes) -> tuple[Message, int]:
        """
        Parse a single message from the data stream.

        Paparazzi data format (simplified):
        - Timestamp (float, 4 bytes)
        - Aircraft ID (int, 4 bytes)
        - Message Name (string)
        - Message Data (variable length)

        Returns:
            Tuple of (Message, bytes_consumed)
        """
        if len(data) < 8:  # Minimum size for timestamp + aircraft_id
            return None, 0

        offset = 0

        # Parse timestamp (4 bytes, float)
        timestamp = struct.unpack("<f", data[offset : offset + 4])[0]
        offset += 4

        # Parse aircraft ID (4 bytes, int)
        aircraft_id = struct.unpack("<I", data[offset : offset + 4])[0]
        offset += 4

        # Find the aircraft configuration
        aircraft = self.aircraft_config.get_aircraft_by_id(aircraft_id)
        if not aircraft:
            print(f"Warning: Unknown aircraft ID {aircraft_id}")
            return None, offset

        # Parse message name (null-terminated string)
        message_name, name_length = self._parse_string(data[offset:])
        if not message_name:
            return None, offset
        offset += name_length

        # Get message definition
        message_def = aircraft.get_message_definition(message_name)
        if not message_def:
            print(f"Warning: Unknown message type {message_name}")
            # Try to skip this message by finding the next timestamp
            return None, offset

        # Parse message fields
        parsed_fields, data_length = self._parse_message_fields(
            data[offset:], message_def.fields
        )

        # Create message object
        message = Message(
            timestamp=timestamp,
            aircraft_id=aircraft_id,
            message_type=message_name,
            message_id=message_def.message_id,
            raw_data=data[: offset + data_length],
            parsed_fields=parsed_fields,
        )

        return message, offset + data_length

    def _parse_string(self, data: bytes) -> tuple[str, int]:
        """Parse a null-terminated string"""
        try:
            null_pos = data.find(b"\0")
            if null_pos == -1:
                # Try to find space or other delimiter
                space_pos = data.find(b" ")
                if space_pos == -1:
                    return "", 0
                null_pos = space_pos

            string_val = data[:null_pos].decode("ascii", errors="ignore")
            return string_val, null_pos + 1
        except Exception:
            return "", 0

    def _parse_message_fields(
        self, data: bytes, fields: List[MessageField]
    ) -> tuple[Dict[str, Any], int]:
        """Parse message fields according to field definitions"""
        parsed_fields = {}
        offset = 0

        for field in fields:
            try:
                value, field_length = self._parse_field_value(data[offset:], field)
                parsed_fields[field.name] = value
                offset += field_length
            except Exception as e:
                print(f"Warning: Error parsing field {field.name}: {e}")
                # Try to continue with next field
                continue

        return parsed_fields, offset

    def _parse_field_value(self, data: bytes, field: MessageField) -> tuple[Any, int]:
        """Parse a single field value based on its type"""
        if not data:
            return None, 0

        field_type = field.field_type.lower()

        # Handle array types
        if field_type.endswith("[]"):
            base_type = field_type[:-2]
            return self._parse_array(data, base_type)

        # Handle basic types
        if field_type in ["float", "float32"]:
            if len(data) < 4:
                return None, 0
            value = struct.unpack("<f", data[:4])[0]
            return value, 4

        elif field_type in ["double", "float64"]:
            if len(data) < 8:
                return None, 0
            value = struct.unpack("<d", data[:8])[0]
            return value, 8

        elif field_type in ["int32", "int"]:
            if len(data) < 4:
                return None, 0
            value = struct.unpack("<i", data[:4])[0]
            return value, 4

        elif field_type in ["uint32", "uint"]:
            if len(data) < 4:
                return None, 0
            value = struct.unpack("<I", data[:4])[0]
            return value, 4

        elif field_type in ["int16", "short"]:
            if len(data) < 2:
                return None, 0
            value = struct.unpack("<h", data[:2])[0]
            return value, 2

        elif field_type in ["uint16", "ushort"]:
            if len(data) < 2:
                return None, 0
            value = struct.unpack("<H", data[:2])[0]
            return value, 2

        elif field_type in ["int8", "char"]:
            if len(data) < 1:
                return None, 0
            value = struct.unpack("<b", data[:1])[0]
            return value, 1

        elif field_type in ["uint8", "uchar"]:
            if len(data) < 1:
                return None, 0
            value = struct.unpack("<B", data[:1])[0]
            return value, 1

        elif field_type.startswith("char["):
            # Parse fixed-length string
            length = int(field_type[5:-1])  # Extract length from char[N]
            if len(data) < length:
                return "", len(data)
            value = data[:length].decode("ascii", errors="ignore").rstrip("\0")
            return value, length

        else:
            print(f"Warning: Unknown field type {field_type}")
            return None, 0

    def _parse_array(self, data: bytes, base_type: str) -> tuple[List[Any], int]:
        """Parse an array of values"""
        # For simplicity, assume arrays are comma-separated in the text representation
        # This is a simplified implementation - actual format may vary

        # Try to parse as space/comma separated values
        try:
            # Convert to string and split
            text = data.decode("ascii", errors="ignore")
            values_str = text.split()[0]  # Get first token

            if "," in values_str:
                value_parts = values_str.split(",")
            else:
                value_parts = values_str.split()

            values = []
            for part in value_parts:
                part = part.strip()
                if not part:
                    continue

                try:
                    if base_type in ["float", "float32", "double"]:
                        values.append(float(part))
                    elif base_type in ["int", "int32", "int16", "int8"]:
                        values.append(int(part))
                    elif base_type in ["uint", "uint32", "uint16", "uint8"]:
                        values.append(int(part))
                    else:
                        values.append(part)
                except ValueError:
                    continue

            # Estimate consumed bytes (this is approximate)
            consumed = len(values_str.encode("ascii"))
            return values, consumed

        except Exception:
            return [], 0
