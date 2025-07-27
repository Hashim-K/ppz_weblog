"""
Log parser for Paparazzi UAV log files (.log)

This module parses the XML-formatted log files that contain aircraft configurations
and message definitions.
"""

import xml.etree.ElementTree as ET
from typing import Dict, List, Optional
from models.aircraft import Aircraft, AircraftConfig, MessageDefinition, MessageField


class LogParser:
    """Parser for Paparazzi .log files"""

    def __init__(self):
        self.message_classes: Dict[str, Dict[str, MessageDefinition]] = {}

    def parse_log(self, log_content: str) -> AircraftConfig:
        """
        Parse a Paparazzi log file and extract aircraft configurations
        and message definitions.

        Args:
            log_content: The content of the .log file as a string

        Returns:
            AircraftConfig: Parsed aircraft configurations
        """
        try:
            # Clean up the XML content first
            cleaned_content = self._clean_xml_content(log_content)

            # Parse XML
            root = ET.fromstring(cleaned_content)

            # Extract aircraft configurations
            aircraft_list = []
            for aircraft_elem in root.findall(".//aircraft"):
                aircraft = self._parse_aircraft(aircraft_elem)
                if aircraft:
                    aircraft_list.append(aircraft)

            # Extract message definitions
            self._parse_message_definitions(root)

            # Assign message definitions to aircraft
            for aircraft in aircraft_list:
                aircraft.message_definitions = self.message_classes.get("telemetry", {})

            return AircraftConfig(aircraft=aircraft_list)

        except ET.ParseError as e:
            raise ValueError(f"Invalid XML in log file: {e}") from e
        except Exception as e:
            raise ValueError(f"Error parsing log file: {e}") from e

    def _clean_xml_content(self, content: str) -> str:
        """Clean XML content to handle common issues"""
        import re

        # Remove or escape problematic characters in attribute values
        # Handle ampersands that aren't part of entities
        content = re.sub(r"&(?![a-zA-Z0-9#][a-zA-Z0-9]*;)", "&amp;", content)

        # Handle less-than signs in attribute values
        content = re.sub(
            r'(<[^>]*=")([^"]*<[^"]*)(");',
            lambda m: m.group(1) + m.group(2).replace("<", "&lt;") + m.group(3),
            content,
        )

        return content

    def _parse_aircraft(self, aircraft_elem: ET.Element) -> Optional[Aircraft]:
        """Parse an aircraft element from the XML"""
        try:
            ac_id = int(aircraft_elem.get("ac_id", 0))
            name = aircraft_elem.get("name", "Unknown")
            airframe = aircraft_elem.get("airframe", "")

            return Aircraft(
                ac_id=ac_id,
                name=name,
                airframe=airframe,
                message_definitions={},  # Will be populated later
            )
        except (ValueError, AttributeError) as e:
            print(f"Warning: Could not parse aircraft element: {e}")
            return None

    def _parse_message_definitions(self, root: ET.Element):
        """Parse message class definitions from the XML"""
        for msg_class in root.findall(".//msg_class"):
            class_name = msg_class.get("NAME", "unknown")
            class_id = int(msg_class.get("ID", 0))

            messages = {}
            for message_elem in msg_class.findall("message"):
                message_def = self._parse_message_definition(message_elem)
                if message_def:
                    messages[message_def.name] = message_def

            self.message_classes[class_name] = messages

    def _parse_message_definition(
        self, message_elem: ET.Element
    ) -> Optional[MessageDefinition]:
        """Parse a single message definition"""
        try:
            name = message_elem.get("NAME", "")
            message_id = int(message_elem.get("ID", 0))

            # Parse description
            desc_elem = message_elem.find("description")
            description = desc_elem.text if desc_elem is not None else None

            # Parse fields
            fields = []
            for field_elem in message_elem.findall("field"):
                field = self._parse_field(field_elem)
                if field:
                    fields.append(field)

            return MessageDefinition(
                name=name, message_id=message_id, fields=fields, description=description
            )
        except (ValueError, AttributeError) as e:
            print(f"Warning: Could not parse message definition: {e}")
            return None

    def _parse_field(self, field_elem: ET.Element) -> Optional[MessageField]:
        """Parse a field definition"""
        try:
            name = field_elem.get("NAME", "")
            field_type = field_elem.get("TYPE", "")
            unit = field_elem.get("UNIT")
            alt_unit = field_elem.get("ALT_UNIT")
            alt_unit_coef = field_elem.get("ALT_UNIT_COEF")
            description = field_elem.text
            values_str = field_elem.get("VALUES")

            # Parse alternative unit coefficient
            if alt_unit_coef:
                try:
                    alt_unit_coef = float(alt_unit_coef)
                except ValueError:
                    alt_unit_coef = None

            # Parse enum values
            values = None
            if values_str:
                values = [v.strip() for v in values_str.split("|")]

            return MessageField(
                name=name,
                field_type=field_type,
                unit=unit,
                alt_unit=alt_unit,
                alt_unit_coef=alt_unit_coef,
                description=description,
                values=values,
            )
        except Exception as e:
            print(f"Warning: Could not parse field: {e}")
            return None
