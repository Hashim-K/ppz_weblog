"use client";

import { Settings } from "@/components/Settings";

interface SettingsData {
	ui: {
		theme: "system" | "light" | "dark";
		aircraftSortBy: "id" | "name";
	};
	parser: {
		max_message_size: number;
		skip_unknown_messages: boolean;
		parse_debug_messages: boolean;
		time_offset: number;
		aircraft_filter: number[] | null;
		message_type_filter: string[] | null;
	};
	visualization: {
		max_points_per_plot: number;
		time_window_seconds: number;
		auto_refresh: boolean;
		refresh_interval: number;
	};
	export: {
		include_raw_data: boolean;
		decimal_places: number;
		time_format: string;
		include_metadata: boolean;
	};
}

export default function SettingsPage() {
	const handleSettingsChange = (newSettings: SettingsData) => {
		console.log("Settings changed:", newSettings);
		// Additional handling can be added here if needed
	};

	return (
		<div className="min-h-screen bg-background py-8">
			<div className="container mx-auto px-4">
				<div className="text-center mb-8">
					<h1 className="text-4xl font-bold text-foreground mb-2">Settings</h1>
					<p className="text-lg text-muted-foreground">
						Configure your Paparazzi UAV Log Analyzer preferences
					</p>
				</div>
				<div className="max-w-4xl mx-auto">
					<Settings onSettingsChange={handleSettingsChange} />
				</div>
			</div>
		</div>
	);
}
