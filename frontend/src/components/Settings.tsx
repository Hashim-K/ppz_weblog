"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Settings as SettingsIcon, Save, RotateCcw } from "lucide-react";
import axios from "axios";

interface ParserSettings {
	max_message_size: number;
	skip_unknown_messages: boolean;
	parse_debug_messages: boolean;
	time_offset: number;
	aircraft_filter: number[] | null;
	message_type_filter: string[] | null;
}

interface VisualizationSettings {
	max_points_per_plot: number;
	time_window_seconds: number;
	auto_refresh: boolean;
	refresh_interval: number;
}

interface ExportSettings {
	include_raw_data: boolean;
	decimal_places: number;
	time_format: string;
	include_metadata: boolean;
}

interface SettingsData {
	parser: ParserSettings;
	visualization: VisualizationSettings;
	export: ExportSettings;
}

export function Settings() {
	const [settings, setSettings] = useState<SettingsData | null>(null);
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [message, setMessage] = useState<string | null>(null);

	useEffect(() => {
		loadSettings();
	}, []);

	const loadSettings = async () => {
		setLoading(true);
		try {
			const response = await axios.get("http://localhost:8000/settings");
			setSettings(response.data);
		} catch (error) {
			console.error("Failed to load settings:", error);
			setMessage("Failed to load settings");
		} finally {
			setLoading(false);
		}
	};

	const saveSettings = async () => {
		if (!settings) return;

		setSaving(true);
		try {
			await axios.post("http://localhost:8000/settings", settings);
			setMessage("Settings saved successfully");
			setTimeout(() => setMessage(null), 3000);
		} catch (error) {
			console.error("Failed to save settings:", error);
			setMessage("Failed to save settings");
		} finally {
			setSaving(false);
		}
	};

	const resetToDefaults = () => {
		setSettings({
			parser: {
				max_message_size: 1024,
				skip_unknown_messages: true,
				parse_debug_messages: false,
				time_offset: 0.0,
				aircraft_filter: null,
				message_type_filter: null,
			},
			visualization: {
				max_points_per_plot: 10000,
				time_window_seconds: 60.0,
				auto_refresh: false,
				refresh_interval: 1.0,
			},
			export: {
				include_raw_data: false,
				decimal_places: 6,
				time_format: "timestamp",
				include_metadata: true,
			},
		});
	};

	const updateParserSetting = (key: keyof ParserSettings, value: unknown) => {
		if (!settings) return;
		setSettings({
			...settings,
			parser: {
				...settings.parser,
				[key]: value,
			},
		});
	};

	const updateVisualizationSetting = (
		key: keyof VisualizationSettings,
		value: unknown
	) => {
		if (!settings) return;
		setSettings({
			...settings,
			visualization: {
				...settings.visualization,
				[key]: value,
			},
		});
	};

	const updateExportSetting = (key: keyof ExportSettings, value: unknown) => {
		if (!settings) return;
		setSettings({
			...settings,
			export: {
				...settings.export,
				[key]: value,
			},
		});
	};

	if (loading || !settings) {
		return (
			<div className="flex items-center justify-center py-8">
				<div className="text-center">
					<SettingsIcon className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
					<p className="text-gray-500">Loading settings...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="max-w-4xl mx-auto space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-2xl font-bold">Settings</h2>
					<p className="text-gray-600">
						Configure parser and visualization options
					</p>
				</div>
				<div className="flex space-x-2">
					<Button variant="outline" onClick={resetToDefaults}>
						<RotateCcw className="h-4 w-4 mr-2" />
						Reset to Defaults
					</Button>
					<Button onClick={saveSettings} disabled={saving}>
						<Save className="h-4 w-4 mr-2" />
						{saving ? "Saving..." : "Save Settings"}
					</Button>
				</div>
			</div>

			{/* Message */}
			{message && (
				<Card
					className={`border-l-4 ${
						message.includes("success")
							? "border-green-500 bg-green-50"
							: "border-red-500 bg-red-50"
					}`}
				>
					<CardContent className="pt-6">
						<p
							className={
								message.includes("success") ? "text-green-800" : "text-red-800"
							}
						>
							{message}
						</p>
					</CardContent>
				</Card>
			)}

			{/* Parser Settings */}
			<Card>
				<CardHeader>
					<CardTitle>Parser Settings</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div className="space-y-2">
							<label className="text-sm font-medium">
								Max Message Size (bytes)
							</label>
							<Input
								type="number"
								value={settings.parser.max_message_size}
								onChange={(e) =>
									updateParserSetting(
										"max_message_size",
										parseInt(e.target.value)
									)
								}
							/>
						</div>

						<div className="space-y-2">
							<label className="text-sm font-medium">
								Time Offset (seconds)
							</label>
							<Input
								type="number"
								step="0.1"
								value={settings.parser.time_offset}
								onChange={(e) =>
									updateParserSetting("time_offset", parseFloat(e.target.value))
								}
							/>
						</div>
					</div>

					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<div>
								<p className="font-medium">Skip Unknown Messages</p>
								<p className="text-sm text-gray-600">
									Ignore messages that don't match known definitions
								</p>
							</div>
							<Switch
								checked={settings.parser.skip_unknown_messages}
								onCheckedChange={(checked) =>
									updateParserSetting("skip_unknown_messages", checked)
								}
							/>
						</div>

						<div className="flex items-center justify-between">
							<div>
								<p className="font-medium">Parse Debug Messages</p>
								<p className="text-sm text-gray-600">
									Include debug and diagnostic messages
								</p>
							</div>
							<Switch
								checked={settings.parser.parse_debug_messages}
								onCheckedChange={(checked) =>
									updateParserSetting("parse_debug_messages", checked)
								}
							/>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Visualization Settings */}
			<Card>
				<CardHeader>
					<CardTitle>Visualization Settings</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div className="space-y-2">
							<label className="text-sm font-medium">Max Points per Plot</label>
							<Input
								type="number"
								value={settings.visualization.max_points_per_plot}
								onChange={(e) =>
									updateVisualizationSetting(
										"max_points_per_plot",
										parseInt(e.target.value)
									)
								}
							/>
						</div>

						<div className="space-y-2">
							<label className="text-sm font-medium">
								Time Window (seconds)
							</label>
							<Input
								type="number"
								step="0.1"
								value={settings.visualization.time_window_seconds}
								onChange={(e) =>
									updateVisualizationSetting(
										"time_window_seconds",
										parseFloat(e.target.value)
									)
								}
							/>
						</div>

						<div className="space-y-2">
							<label className="text-sm font-medium">
								Refresh Interval (seconds)
							</label>
							<Input
								type="number"
								step="0.1"
								value={settings.visualization.refresh_interval}
								onChange={(e) =>
									updateVisualizationSetting(
										"refresh_interval",
										parseFloat(e.target.value)
									)
								}
							/>
						</div>
					</div>

					<div className="flex items-center justify-between">
						<div>
							<p className="font-medium">Auto Refresh</p>
							<p className="text-sm text-gray-600">
								Automatically refresh data at regular intervals
							</p>
						</div>
						<Switch
							checked={settings.visualization.auto_refresh}
							onCheckedChange={(checked) =>
								updateVisualizationSetting("auto_refresh", checked)
							}
						/>
					</div>
				</CardContent>
			</Card>

			{/* Export Settings */}
			<Card>
				<CardHeader>
					<CardTitle>Export Settings</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div className="space-y-2">
							<label className="text-sm font-medium">Decimal Places</label>
							<Input
								type="number"
								min="0"
								max="10"
								value={settings.export.decimal_places}
								onChange={(e) =>
									updateExportSetting(
										"decimal_places",
										parseInt(e.target.value)
									)
								}
							/>
						</div>

						<div className="space-y-2">
							<label className="text-sm font-medium">Time Format</label>
							<select
								className="w-full p-2 border rounded-md"
								value={settings.export.time_format}
								onChange={(e) =>
									updateExportSetting("time_format", e.target.value)
								}
							>
								<option value="timestamp">Timestamp</option>
								<option value="datetime">DateTime</option>
								<option value="relative">Relative</option>
							</select>
						</div>
					</div>

					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<div>
								<p className="font-medium">Include Raw Data</p>
								<p className="text-sm text-gray-600">
									Include raw binary data in exports
								</p>
							</div>
							<Switch
								checked={settings.export.include_raw_data}
								onCheckedChange={(checked) =>
									updateExportSetting("include_raw_data", checked)
								}
							/>
						</div>

						<div className="flex items-center justify-between">
							<div>
								<p className="font-medium">Include Metadata</p>
								<p className="text-sm text-gray-600">
									Include aircraft and message metadata
								</p>
							</div>
							<Switch
								checked={settings.export.include_metadata}
								onCheckedChange={(checked) =>
									updateExportSetting("include_metadata", checked)
								}
							/>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
