"""
File watcher for automatic processing of Paparazzi log files.
Monitors the input directory for new files and processes them automatically.
"""

import json
import shutil
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

from parsers.log_parser import LogParser
from parsers.simple_data_parser import SimpleDataParser
from parser_version import ParserVersionManager, extract_datetime_from_filename


class LogFileHandler(FileSystemEventHandler):
    def __init__(self, input_dir: str, output_dir: str):
        self.input_dir = Path(input_dir)
        self.output_dir = Path(output_dir)
        self.log_parser = LogParser()
        self.processing = set()  # Track files currently being processed
        self.parser_version_manager = ParserVersionManager()

        # Create processed logs directory
        self.processed_logs_dir = self.output_dir / "processed_logs"
        self.processed_logs_dir.mkdir(exist_ok=True)

    def on_created(self, event):
        if not event.is_directory:
            self.process_file(event.src_path)

    def on_moved(self, event):
        if not event.is_directory:
            self.process_file(event.dest_path)

    def process_file(self, file_path: str):
        """Process a new file in the input directory."""
        file_path = Path(file_path)

        # Skip if already processing or not a log/data file
        if file_path in self.processing:
            return

        if not (file_path.suffix.lower() in [".log", ".data"]):
            return

        # Wait a moment to ensure file is fully written
        time.sleep(1)

        self.processing.add(file_path)

        try:
            # Look for matching log/data pair
            if file_path.suffix.lower() == ".log":
                log_file = file_path
                data_file = file_path.with_suffix(".data")
            else:  # .data file
                data_file = file_path
                log_file = file_path.with_suffix(".log")

            # Check if both files exist
            if log_file.exists() and data_file.exists():
                self.process_log_pair(log_file, data_file)
            else:
                print(f"Waiting for matching pair for {file_path.name}")

        except Exception as e:
            print(f"Error processing {file_path}: {e}")
        finally:
            self.processing.discard(file_path)

    def process_log_pair(self, log_file: Path, data_file: Path):
        """Process a complete log/data file pair."""
        print(f"Processing log pair: {log_file.name} + {data_file.name}")

        try:
            # Extract datetime from filename
            datetime_info = extract_datetime_from_filename(log_file.name)

            # Get parser version information
            parser_version = self.parser_version_manager.get_parser_version_info()

            # Parse the files
            with open(log_file, "r", encoding="utf-8") as f:
                log_content = f.read()

            aircraft_list = self.log_parser.parse_log(log_content)

            # Create data parser and parse data
            data_parser = SimpleDataParser()
            with open(data_file, "rb") as f:
                data_content = f.read()
            messages = data_parser.parse_data(data_content, aircraft_list)

            # Create output directory for this log session
            session_name = log_file.stem
            session_dir = self.output_dir / session_name
            session_dir.mkdir(exist_ok=True)

            # Copy processed logs to processed_logs directory
            processed_session_dir = self.processed_logs_dir / session_name
            processed_session_dir.mkdir(exist_ok=True)

            # Copy original files to processed_logs (only if they're not already there)
            try:
                source_log = log_file
                source_data = data_file
                dest_log = processed_session_dir / log_file.name
                dest_data = processed_session_dir / data_file.name

                # Only copy if source and destination are different
                if source_log.resolve() != dest_log.resolve():
                    shutil.copy2(source_log, dest_log)
                if source_data.resolve() != dest_data.resolve():
                    shutil.copy2(source_data, dest_data)

            except Exception as e:
                print(f"Warning: Could not copy files to processed_logs: {e}")

            # Calculate session statistics
            message_type_counts = {}
            aircraft_message_counts = {}

            for msg in messages:
                # Count messages per type
                msg_type = msg.message_type
                message_type_counts[msg_type] = message_type_counts.get(msg_type, 0) + 1

                # Count messages per aircraft
                aircraft_id = msg.aircraft_id
                aircraft_message_counts[aircraft_id] = (
                    aircraft_message_counts.get(aircraft_id, 0) + 1
                )

            stats = {
                "total_aircraft": len(aircraft_list.aircraft),
                "total_messages": len(messages),
                "aircraft_ids": sorted(list(set(msg.aircraft_id for msg in messages))),
                "message_types": message_type_counts,  # Now includes counts
                "aircraft_message_counts": aircraft_message_counts,  # Message counts per aircraft
                "duration": (
                    max([msg.timestamp for msg in messages])
                    - min([msg.timestamp for msg in messages])
                    if messages
                    else 0
                ),
                "start_time": (
                    min([msg.timestamp for msg in messages]) if messages else 0
                ),
                "end_time": max([msg.timestamp for msg in messages]) if messages else 0,
            }

            # Calculate file sizes
            log_file_size = log_file.stat().st_size if log_file.exists() else 0
            data_file_size = data_file.stat().st_size if data_file.exists() else 0
            total_file_size = log_file_size + data_file_size

            # 1. Create summary.json for quick overview
            summary_data = {
                "session_name": session_name,
                "processed_at": datetime.now().isoformat(),
                "log_file": log_file.name,
                "data_file": data_file.name,
                "file_size": data_file_size,
                "datetime_info": datetime_info,
                "parser_version": parser_version,
                "stats": stats,
                "files": {
                    "aircraft": "aircraft.json",
                    "messages": "messages.json",
                    "timeline": "timeline.json",
                    "by_aircraft": "by_aircraft.json",
                    "by_message_type": "by_message_type.json",
                },
            }

            with open(session_dir / "summary.json", "w", encoding="utf-8") as f:
                json.dump(summary_data, f, indent=2)

            # 2. Create aircraft.json - aircraft configurations
            aircraft_data = {
                "aircraft": [aircraft.to_dict() for aircraft in aircraft_list.aircraft],
                "count": len(aircraft_list.aircraft),
            }

            with open(session_dir / "aircraft.json", "w", encoding="utf-8") as f:
                json.dump(aircraft_data, f, indent=2)

            # 3. Create messages.json - all messages in chronological order
            messages_data = {
                "messages": [
                    msg.to_dict() for msg in sorted(messages, key=lambda x: x.timestamp)
                ],
                "count": len(messages),
                "time_range": {
                    "start": stats["start_time"],
                    "end": stats["end_time"],
                    "duration": stats["duration"],
                },
            }

            with open(session_dir / "messages.json", "w", encoding="utf-8") as f:
                json.dump(messages_data, f, indent=2)

            # 4. Create timeline.json - messages grouped by time intervals (for plotting)
            timeline_data = self._create_timeline_data(messages)
            with open(session_dir / "timeline.json", "w", encoding="utf-8") as f:
                json.dump(timeline_data, f, indent=2)

            # 5. Create by_aircraft.json - messages grouped by aircraft
            by_aircraft_data = self._group_messages_by_aircraft(messages)
            with open(session_dir / "by_aircraft.json", "w", encoding="utf-8") as f:
                json.dump(by_aircraft_data, f, indent=2)

            # 6. Create by_message_type.json - messages grouped by type
            by_message_type_data = self._group_messages_by_type(messages)
            with open(session_dir / "by_message_type.json", "w", encoding="utf-8") as f:
                json.dump(by_message_type_data, f, indent=2)

            # Move original files to output directory (only if they're in input directory)
            try:
                if str(log_file.parent) == str(self.input_dir):
                    shutil.move(str(log_file), str(session_dir / log_file.name))
                if str(data_file.parent) == str(self.input_dir):
                    shutil.move(str(data_file), str(session_dir / data_file.name))
            except Exception as e:
                print(f"Warning: Could not move files: {e}")

            print(f"Successfully processed {session_name}")
            print(f"  - Aircraft: {len(aircraft_list.aircraft)}")
            print(f"  - Messages: {len(messages)}")
            print(f"  - Output directory: {session_dir}")
            print(
                f"  - Generated files: summary.json, aircraft.json, messages.json, timeline.json, by_aircraft.json, by_message_type.json"
            )

        except Exception as e:
            print(f"Error processing log pair {log_file.name}: {e}")
            import traceback

            traceback.print_exc()

    def _create_timeline_data(self, messages: List) -> Dict[str, Any]:
        """Create timeline data for plotting - messages grouped by time intervals."""
        if not messages:
            return {"intervals": [], "message_counts": [], "interval_duration": 1.0}

        # Sort messages by timestamp
        sorted_messages = sorted(messages, key=lambda x: x.timestamp)
        start_time = sorted_messages[0].timestamp
        end_time = sorted_messages[-1].timestamp
        duration = end_time - start_time

        # Create 100 time intervals for plotting
        num_intervals = min(100, len(messages))
        if num_intervals < 1:
            num_intervals = 1

        interval_duration = duration / num_intervals if duration > 0 else 1.0

        intervals = []
        message_counts = []
        message_types_per_interval = []

        for i in range(num_intervals):
            interval_start = start_time + (i * interval_duration)
            interval_end = interval_start + interval_duration

            # Count messages in this interval
            interval_messages = [
                msg
                for msg in sorted_messages
                if interval_start <= msg.timestamp < interval_end
            ]

            # Count by message type
            type_counts = {}
            for msg in interval_messages:
                type_counts[msg.message_type] = type_counts.get(msg.message_type, 0) + 1

            intervals.append(
                {
                    "start": interval_start,
                    "end": interval_end,
                    "center": interval_start + (interval_duration / 2),
                }
            )
            message_counts.append(len(interval_messages))
            message_types_per_interval.append(type_counts)

        return {
            "intervals": intervals,
            "message_counts": message_counts,
            "message_types_per_interval": message_types_per_interval,
            "interval_duration": interval_duration,
            "total_duration": duration,
            "start_time": start_time,
            "end_time": end_time,
        }

    def _group_messages_by_aircraft(self, messages: List) -> Dict[str, Any]:
        """Group messages by aircraft for analysis."""
        by_aircraft = {}

        for msg in messages:
            aircraft_id = msg.aircraft_id
            if aircraft_id not in by_aircraft:
                by_aircraft[aircraft_id] = {
                    "aircraft_id": aircraft_id,
                    "messages": [],
                    "message_count": 0,
                    "message_types": set(),
                    "time_range": {"start": None, "end": None},
                }

            aircraft_data = by_aircraft[aircraft_id]
            aircraft_data["messages"].append(msg.to_dict())
            aircraft_data["message_count"] += 1
            aircraft_data["message_types"].add(msg.message_type)

            # Update time range
            if (
                aircraft_data["time_range"]["start"] is None
                or msg.timestamp < aircraft_data["time_range"]["start"]
            ):
                aircraft_data["time_range"]["start"] = msg.timestamp
            if (
                aircraft_data["time_range"]["end"] is None
                or msg.timestamp > aircraft_data["time_range"]["end"]
            ):
                aircraft_data["time_range"]["end"] = msg.timestamp

        # Convert sets to lists for JSON serialization
        for aircraft_data in by_aircraft.values():
            aircraft_data["message_types"] = sorted(
                list(aircraft_data["message_types"])
            )
            aircraft_data["duration"] = (
                aircraft_data["time_range"]["end"]
                - aircraft_data["time_range"]["start"]
                if aircraft_data["time_range"]["start"] is not None
                else 0
            )

        return {
            "aircraft": by_aircraft,
            "aircraft_count": len(by_aircraft),
            "aircraft_ids": sorted(by_aircraft.keys()),
        }

    def _group_messages_by_type(self, messages: List) -> Dict[str, Any]:
        """Group messages by message type for analysis."""
        by_type = {}

        for msg in messages:
            msg_type = msg.message_type
            if msg_type not in by_type:
                by_type[msg_type] = {
                    "message_type": msg_type,
                    "messages": [],
                    "message_count": 0,
                    "aircraft_ids": set(),
                    "time_range": {"start": None, "end": None},
                    "frequency": 0,  # messages per second
                }

            type_data = by_type[msg_type]
            type_data["messages"].append(msg.to_dict())
            type_data["message_count"] += 1
            type_data["aircraft_ids"].add(msg.aircraft_id)

            # Update time range
            if (
                type_data["time_range"]["start"] is None
                or msg.timestamp < type_data["time_range"]["start"]
            ):
                type_data["time_range"]["start"] = msg.timestamp
            if (
                type_data["time_range"]["end"] is None
                or msg.timestamp > type_data["time_range"]["end"]
            ):
                type_data["time_range"]["end"] = msg.timestamp

        # Convert sets to lists and calculate frequency
        for type_data in by_type.values():
            type_data["aircraft_ids"] = sorted(list(type_data["aircraft_ids"]))
            duration = (
                type_data["time_range"]["end"] - type_data["time_range"]["start"]
                if type_data["time_range"]["start"] is not None
                else 1
            )
            type_data["duration"] = duration
            type_data["frequency"] = (
                type_data["message_count"] / duration if duration > 0 else 0
            )

        return {
            "message_types": by_type,
            "type_count": len(by_type),
            "type_names": sorted(by_type.keys()),
        }


class FileWatcher:
    def __init__(self, input_dir: str = "input", output_dir: str = "output"):
        self.input_dir = input_dir
        self.output_dir = output_dir
        self.observer = Observer()
        self.event_handler = LogFileHandler(self.input_dir, self.output_dir)

        # Ensure directories exist
        Path(input_dir).mkdir(exist_ok=True)
        Path(output_dir).mkdir(exist_ok=True)

    def start(self):
        """Start watching the input directory."""
        self.observer.schedule(self.event_handler, self.input_dir, recursive=False)
        self.observer.start()

        # Check and reprocess if parser has changed (after observer is started)
        self.check_and_reprocess_if_needed()

        # Process existing files on startup
        self._process_existing_files(self.event_handler)

        print(f"File watcher started. Monitoring {self.input_dir} for new log files...")

    def _process_existing_files(self, event_handler):
        """Process files that already exist in the input directory."""
        input_path = Path(self.input_dir)
        existing_files = list(input_path.glob("*.log")) + list(
            input_path.glob("*.data")
        )

        if existing_files:
            print(f"Found {len(existing_files)} existing files, processing...")

            # Group files by base name
            file_pairs = {}
            for file_path in existing_files:
                base_name = file_path.stem
                if base_name not in file_pairs:
                    file_pairs[base_name] = {}

                if file_path.suffix.lower() == ".log":
                    file_pairs[base_name]["log"] = file_path
                elif file_path.suffix.lower() == ".data":
                    file_pairs[base_name]["data"] = file_path

            # Process complete pairs
            for base_name, files in file_pairs.items():
                if "log" in files and "data" in files:
                    print(f"Processing existing pair: {base_name}")
                    event_handler.process_log_pair(files["log"], files["data"])
                else:
                    print(
                        f"Incomplete pair for {base_name} - waiting for matching file"
                    )

    def stop(self):
        """Stop the file watcher."""
        if self.observer.is_alive():
            self.observer.stop()
            self.observer.join()

    def get_processed_sessions(self) -> List[Dict[str, Any]]:
        """Get list of all processed sessions."""
        sessions = []
        output_path = Path(self.output_dir)

        for session_dir in output_path.iterdir():
            if session_dir.is_dir():
                summary_file = session_dir / "summary.json"
                if summary_file.exists():
                    try:
                        with open(summary_file, "r", encoding="utf-8") as f:
                            session_data = json.load(f)
                            sessions.append(session_data)
                    except Exception as e:
                        print(f"Error reading {summary_file}: {e}")

        # Sort by processed time (most recent first)
        sessions.sort(key=lambda x: x.get("processed_at", ""), reverse=True)
        return sessions

    def check_and_reprocess_if_needed(self):
        """Check if parser has changed and reprocess sessions if needed."""
        if not self.event_handler.parser_version_manager.has_parser_changed():
            print("Parser hasn't changed - no reprocessing needed")
            return

        print("Parser has changed - checking for sessions to reprocess...")
        sessions_to_reprocess = (
            self.event_handler.parser_version_manager.get_sessions_to_reprocess(
                self.output_dir
            )
        )

        if not sessions_to_reprocess:
            print("No sessions need reprocessing")
            # Save current parser version
            self.event_handler.parser_version_manager.save_current_version()
            return

        print(f"Found {len(sessions_to_reprocess)} sessions to reprocess:")
        for session in sessions_to_reprocess:
            print(f"  - {session}")

        # Reprocess sessions
        processed_logs_path = self.event_handler.processed_logs_dir

        for session_name in sessions_to_reprocess:
            session_processed_dir = processed_logs_path / session_name

            if not session_processed_dir.exists():
                print(
                    f"Warning: Processed logs not found for {session_name} - skipping"
                )
                continue

            # Find log and data files
            log_files = list(session_processed_dir.glob("*.log"))
            data_files = list(session_processed_dir.glob("*.data"))

            if not log_files or not data_files:
                print(
                    f"Warning: Missing log or data files for {session_name} - skipping"
                )
                continue

            log_file = log_files[0]  # Should only be one
            data_file = data_files[0]  # Should only be one

            print(f"Reprocessing {session_name}...")
            try:
                self.event_handler.process_log_pair(log_file, data_file)
                print(f"  ✓ Successfully reprocessed {session_name}")
            except Exception as e:
                print(f"  ✗ Error reprocessing {session_name}: {e}")

        # Save updated parser version
        print("Saving new parser version...")
        self.event_handler.parser_version_manager.save_current_version()
        print("Reprocessing complete!")


if __name__ == "__main__":
    # For testing
    watcher = FileWatcher()
    try:
        watcher.start()
        # Keep the script running
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        watcher.stop()
        print("File watcher stopped.")
