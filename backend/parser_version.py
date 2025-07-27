"""
Parser version tracking system for Paparazzi log files.
Generates hash of parser code to detect changes and trigger reprocessing.
"""

import hashlib
import json
from pathlib import Path
from typing import Any, Dict


class ParserVersionManager:
    """Manages parser versions and detects when reprocessing is needed."""

    def __init__(self, parsers_dir: str = "parsers", models_dir: str = "models"):
        self.parsers_dir = Path(parsers_dir)
        self.models_dir = Path(models_dir)
        self.version_file = Path("parser_version.json")

    def get_current_parser_hash(self) -> str:
        """Generate hash of all parser and model files."""
        hash_content = ""

        # Include all Python files in parsers directory
        for py_file in self.parsers_dir.glob("*.py"):
            if py_file.name != "__init__.py":
                with open(py_file, "r", encoding="utf-8") as f:
                    hash_content += f.read()

        # Include all Python files in models directory
        for py_file in self.models_dir.glob("*.py"):
            if py_file.name != "__init__.py":
                with open(py_file, "r", encoding="utf-8") as f:
                    hash_content += f.read()

        # Create SHA256 hash
        return hashlib.sha256(hash_content.encode("utf-8")).hexdigest()[:16]

    def get_parser_version_info(self) -> Dict[str, Any]:
        """Get current parser version information."""
        current_hash = self.get_current_parser_hash()

        return {
            "version_hash": current_hash,
            "parser_files": [
                str(f.name)
                for f in self.parsers_dir.glob("*.py")
                if f.name != "__init__.py"
            ],
            "model_files": [
                str(f.name)
                for f in self.models_dir.glob("*.py")
                if f.name != "__init__.py"
            ],
            "generated_at": self._get_current_timestamp(),
        }

    def load_stored_version(self) -> Dict[str, Any]:
        """Load previously stored parser version."""
        if not self.version_file.exists():
            return {}

        try:
            with open(self.version_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}

    def save_current_version(self) -> Dict[str, Any]:
        """Save current parser version to file."""
        version_info = self.get_parser_version_info()

        with open(self.version_file, "w", encoding="utf-8") as f:
            json.dump(version_info, f, indent=2)

        return version_info

    def has_parser_changed(self) -> bool:
        """Check if parser has changed since last processing."""
        current_hash = self.get_current_parser_hash()
        stored_version = self.load_stored_version()
        stored_hash = stored_version.get("version_hash", "")

        return current_hash != stored_hash

    def get_sessions_to_reprocess(self, output_dir: str) -> list:
        """Get list of sessions that need reprocessing due to parser changes."""
        if not self.has_parser_changed():
            return []

        sessions_to_reprocess = []
        output_path = Path(output_dir)

        if not output_path.exists():
            return []

        # Check all session directories
        for session_dir in output_path.iterdir():
            if session_dir.is_dir():
                summary_file = session_dir / "summary.json"
                if summary_file.exists():
                    try:
                        with open(summary_file, "r", encoding="utf-8") as f:
                            summary = json.load(f)

                        # Check if session was processed with old parser version
                        session_parser_hash = summary.get("parser_version", {}).get(
                            "version_hash", ""
                        )
                        current_hash = self.get_current_parser_hash()

                        if session_parser_hash != current_hash:
                            sessions_to_reprocess.append(session_dir.name)

                    except Exception as e:
                        print(f"Error reading session {session_dir.name}: {e}")
                        sessions_to_reprocess.append(session_dir.name)

        return sessions_to_reprocess

    def _get_current_timestamp(self) -> str:
        """Get current timestamp in ISO format."""
        from datetime import datetime

        return datetime.now().isoformat()


def extract_datetime_from_filename(filename: str) -> Dict[str, Any]:
    """
    Extract date and time from Paparazzi log filename.
    Expected format: YY_MM_DD__HH_MM_SS.log
    Example: 25_07_09__15_38_54.log
    """
    import re
    from datetime import datetime

    # Remove file extension
    name_without_ext = filename.split(".")[0]

    # Pattern: YY_MM_DD__HH_MM_SS
    pattern = r"(\d{2})_(\d{2})_(\d{2})__(\d{2})_(\d{2})_(\d{2})"
    match = re.match(pattern, name_without_ext)

    if not match:
        return {
            "datetime": None,
            "date_string": None,
            "time_string": None,
            "timestamp": None,
            "parsed": False,
            "raw_filename": filename,
        }

    year, month, day, hour, minute, second = match.groups()

    # Assume 20XX for year (2000 + YY)
    full_year = 2000 + int(year)

    try:
        dt = datetime(
            year=full_year,
            month=int(month),
            day=int(day),
            hour=int(hour),
            minute=int(minute),
            second=int(second),
        )

        return {
            "datetime": dt.isoformat(),
            "date_string": f"{full_year}-{month}-{day}",
            "time_string": f"{hour}:{minute}:{second}",
            "timestamp": dt.timestamp(),
            "year": full_year,
            "month": int(month),
            "day": int(day),
            "hour": int(hour),
            "minute": int(minute),
            "second": int(second),
            "parsed": True,
            "raw_filename": filename,
        }

    except ValueError as e:
        return {
            "datetime": None,
            "date_string": None,
            "time_string": None,
            "timestamp": None,
            "parsed": False,
            "error": str(e),
            "raw_filename": filename,
        }
