"""
Settings configuration for the Paparazzi log parser
"""

from dataclasses import asdict, dataclass
from typing import Any, Dict, List, Optional


@dataclass
class ParserSettings:
    """Parser-specific settings"""

    max_message_size: int = 1024
    skip_unknown_messages: bool = True
    parse_debug_messages: bool = False
    time_offset: float = 0.0
    aircraft_filter: Optional[List[int]] = None
    message_type_filter: Optional[List[str]] = None


@dataclass
class VisualizationSettings:
    """Visualization-specific settings"""

    max_points_per_plot: int = 10000
    time_window_seconds: float = 60.0
    auto_refresh: bool = False
    refresh_interval: float = 1.0


@dataclass
class ExportSettings:
    """Export-specific settings"""

    include_raw_data: bool = False
    decimal_places: int = 6
    time_format: str = "timestamp"  # "timestamp", "datetime", "relative"
    include_metadata: bool = True


class Settings:
    """Main settings class"""

    def __init__(self):
        self.parser = ParserSettings()
        self.visualization = VisualizationSettings()
        self.export = ExportSettings()

    def to_dict(self) -> Dict[str, Any]:
        """Convert settings to dictionary"""
        return {
            "parser": asdict(self.parser),
            "visualization": asdict(self.visualization),
            "export": asdict(self.export),
        }

    def update(self, settings_dict: Dict[str, Any]):
        """Update settings from dictionary"""
        if "parser" in settings_dict:
            parser_settings = settings_dict["parser"]
            for key, value in parser_settings.items():
                if hasattr(self.parser, key):
                    setattr(self.parser, key, value)

        if "visualization" in settings_dict:
            viz_settings = settings_dict["visualization"]
            for key, value in viz_settings.items():
                if hasattr(self.visualization, key):
                    setattr(self.visualization, key, value)

        if "export" in settings_dict:
            export_settings = settings_dict["export"]
            for key, value in export_settings.items():
                if hasattr(self.export, key):
                    setattr(self.export, key, value)
