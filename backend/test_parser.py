#!/usr/bin/env python3
"""
Test script for the Paparazzi log parser backend
"""

import sys
import os

# Add the backend directory to the Python path
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

from parsers.log_parser import LogParser
from parsers.simple_data_parser import SimpleDataParser


def test_parser():
    """Test the parser with the sample files"""

    # Read the log file
    log_file_path = os.path.join("..", "25_07_09__15_38_54.log")
    data_file_path = os.path.join("..", "25_07_09__15_38_54.data")

    if not os.path.exists(log_file_path):
        print(f"Log file not found: {log_file_path}")
        return

    if not os.path.exists(data_file_path):
        print(f"Data file not found: {data_file_path}")
        return

    print("Testing Paparazzi Log Parser...")

    # Parse log file
    print("1. Parsing log file...")
    log_parser = LogParser()

    with open(log_file_path, "r", encoding="utf-8") as f:
        log_content = f.read()

    try:
        aircraft_config = log_parser.parse_log(log_content)
        print(f"   Found {len(aircraft_config.aircraft)} aircraft")

        for aircraft in aircraft_config.aircraft:
            print(f"   Aircraft {aircraft.ac_id}: {aircraft.name}")
            print(f"     Message types: {len(aircraft.message_definitions)}")

            # Show first few message types
            msg_types = list(aircraft.message_definitions.keys())[:5]
            print(f"     Sample messages: {msg_types}")

    except Exception as e:
        print(f"   Error parsing log file: {e}")
        return

    # Parse data file
    print("\n2. Parsing data file...")
    data_parser = SimpleDataParser()

    with open(data_file_path, "rb") as f:
        data_content = f.read()

    try:
        messages = data_parser.parse_data(data_content, aircraft_config)
        print(f"   Parsed {len(messages)} messages")

        if messages:
            # Show some statistics
            aircraft_ids = set(msg.aircraft_id for msg in messages)
            message_types = set(msg.message_type for msg in messages)

            print(f"   Aircraft IDs found: {sorted(aircraft_ids)}")
            print(f"   Message types found: {len(message_types)}")
            print(f"   Sample message types: {list(message_types)[:10]}")

            # Show first few messages
            print(f"\n3. Sample messages:")
            for i, msg in enumerate(messages[:3]):
                print(f"   Message {i+1}:")
                print(f"     Timestamp: {msg.timestamp}")
                print(f"     Aircraft: {msg.aircraft_id}")
                print(f"     Type: {msg.message_type}")
                print(f"     Fields: {len(msg.parsed_fields)}")
                if msg.parsed_fields:
                    sample_fields = dict(list(msg.parsed_fields.items())[:3])
                    print(f"     Sample fields: {sample_fields}")

    except Exception as e:
        print(f"   Error parsing data file: {e}")
        import traceback

        traceback.print_exc()
        return

    print("\nParser test completed successfully!")


if __name__ == "__main__":
    test_parser()
