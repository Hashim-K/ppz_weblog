"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Settings as SettingsIcon,
	Save,
	RotateCcw,
	Moon,
	Sun,
	Monitor,
} from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
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

interface UISettings {
	theme: "system" | "light" | "dark";
	aircraftSortBy: "id" | "name";
	messageTypeSortBy: "count" | "alphabetical";
}

interface SettingsData {
	ui: UISettings;
	parser: ParserSettings;
	visualization: VisualizationSettings;
	export: ExportSettings;
}

interface SettingsProps {
	onSettingsChange: (settings: SettingsData) => void;
}

const defaultSettings: SettingsData = {
	ui: {
		theme: "system",
		aircraftSortBy: "id",
		messageTypeSortBy: "count",
	},
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
};

const defaultUISettings: UISettings = {
	theme: "system",
	aircraftSortBy: "id",
	messageTypeSortBy: "count",
};

export function Settings({ onSettingsChange }: SettingsProps) {
	const { theme, setTheme } = useTheme();
	const [settings, setSettings] = useState<SettingsData>(defaultSettings);
	const [uiSettings, setUISettings] = useState<UISettings>(defaultUISettings);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [message, setMessage] = useState<string | null>(null);

	// Load everything on mount - NO DEPENDENCIES TO AVOID LOOPS
	useEffect(() => {
		const loadEverything = async () => {
			try {
				// Load backend settings
				const response = await axios.get("http://localhost:8000/settings");
				const loadedSettings = response.data;

				setSettings(loadedSettings || defaultSettings);
			} catch (error) {
				console.error("Failed to load settings:", error);
				setMessage("Failed to load settings");
				setSettings(defaultSettings);
			}

			// Load UI settings from localStorage
			const savedUISettings = localStorage.getItem("ui-settings");
			if (savedUISettings) {
				const parsedUISettings = JSON.parse(savedUISettings);
				setUISettings(parsedUISettings);
				setTheme(parsedUISettings.theme);
			} else {
				setUISettings(defaultUISettings);
			}

			setLoading(false);
		};

		loadEverything();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []); // NO DEPENDENCIES - ONLY RUN ONCE

	// Save UI settings to localStorage when they change (after initial load)
	useEffect(() => {
		if (loading) return; // Don't save during initial load
		localStorage.setItem("ui-settings", JSON.stringify(uiSettings));
	}, [uiSettings, loading]);

	const saveSettings = async () => {
		setSaving(true);
		try {
			await axios.post("http://localhost:8000/settings", settings);
			setMessage("Settings saved successfully");
			onSettingsChange(settings);
			setTimeout(() => setMessage(null), 3000);
		} catch (error) {
			console.error("Failed to save settings:", error);
			setMessage("Failed to save settings");
		} finally {
			setSaving(false);
		}
	};

	const resetToDefaults = () => {
		setSettings(defaultSettings);
		setUISettings(defaultUISettings);
		setTheme("system");
	};

	const updateParserSetting = (key: keyof ParserSettings, value: unknown) => {
		setSettings((prev) => ({
			...prev,
			parser: { ...prev.parser, [key]: value },
		}));
	};

	const updateVisualizationSetting = (
		key: keyof VisualizationSettings,
		value: unknown,
	) => {
		setSettings((prev) => ({
			...prev,
			visualization: { ...prev.visualization, [key]: value },
		}));
	};

	const updateExportSetting = (key: keyof ExportSettings, value: unknown) => {
		setSettings((prev) => ({
			...prev,
			export: { ...prev.export, [key]: value },
		}));
	};

	const updateUISetting = (key: keyof UISettings, value: unknown) => {
		// Update theme immediately for visual feedback
		if (key === "theme") {
			setTheme(value as "system" | "light" | "dark");
		}

		// Update UI settings state (will automatically save to localStorage)
		setUISettings((prev) => ({
			...prev,
			[key]: value,
		}));
	};

	if (loading) {
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
										parseInt(e.target.value),
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
									Ignore messages that don&apos;t match known definitions
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
										parseInt(e.target.value),
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
										parseFloat(e.target.value),
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
										parseFloat(e.target.value),
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
										parseInt(e.target.value),
									)
								}
							/>
						</div>

						<div className="space-y-2">
							<label className="text-sm font-medium text-gray-900 dark:text-gray-100">
								Time Format
							</label>
							<Select
								value={settings.export.time_format}
								onValueChange={(value) =>
									updateExportSetting("time_format", value)
								}
							>
								<SelectTrigger className="w-full">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="timestamp">Timestamp</SelectItem>
									<SelectItem value="datetime">DateTime</SelectItem>
									<SelectItem value="relative">Relative</SelectItem>
								</SelectContent>
							</Select>
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

			{/* UI Settings */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Monitor className="h-5 w-5" />
						User Interface
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-6">
						<div className="space-y-4">
							<div className="flex items-center justify-between">
								<div>
									<p className="font-medium">Theme</p>
									<p className="text-sm text-gray-600">
										Choose your preferred color theme
									</p>
								</div>
								<div className="flex items-center gap-2">
									<Button
										variant={theme === "light" ? "default" : "outline"}
										size="sm"
										onClick={() => updateUISetting("theme", "light")}
										className="flex items-center gap-1"
									>
										<Sun className="h-4 w-4" />
										Light
									</Button>
									<Button
										variant={theme === "dark" ? "default" : "outline"}
										size="sm"
										onClick={() => updateUISetting("theme", "dark")}
										className="flex items-center gap-1"
									>
										<Moon className="h-4 w-4" />
										Dark
									</Button>
									<Button
										variant={theme === "system" ? "default" : "outline"}
										size="sm"
										onClick={() => updateUISetting("theme", "system")}
										className="flex items-center gap-1"
									>
										<Monitor className="h-4 w-4" />
										System
									</Button>
								</div>
							</div>

							<div className="flex items-center justify-between">
								<div>
									<p className="font-medium">Aircraft Sorting</p>
									<p className="text-sm text-gray-600 dark:text-gray-400">
										Default sorting for aircraft dropdown
									</p>
								</div>
								<Select
									value={uiSettings.aircraftSortBy}
									onValueChange={(value) =>
										updateUISetting("aircraftSortBy", value)
									}
								>
									<SelectTrigger className="w-32">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="id">By ID</SelectItem>
										<SelectItem value="name">By Name</SelectItem>
									</SelectContent>
								</Select>
							</div>

							<div className="flex items-center justify-between">
								<div>
									<p className="font-medium">Message Type Sorting</p>
									<p className="text-sm text-gray-600 dark:text-gray-400">
										Default sorting for message type dropdown
									</p>
								</div>
								<Select
									value={uiSettings.messageTypeSortBy}
									onValueChange={(value) =>
										updateUISetting("messageTypeSortBy", value)
									}
								>
									<SelectTrigger className="w-32">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="count">By Count</SelectItem>
										<SelectItem value="alphabetical">Alphabetical</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
