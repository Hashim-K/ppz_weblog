"use client";

import { useState } from "react";
import { FileUpload } from "@/components/FileUpload";
import { Dashboard } from "@/components/Dashboard";
import { Settings } from "@/components/Settings";
import { Sessions } from "@/components/Sessions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Settings {
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

export default function Home() {
	const [loading, setLoading] = useState(false);
	const [activeTab, setActiveTab] = useState("dashboard");
	const [loadedSessionData, setLoadedSessionData] = useState<unknown>(null);
	const [selectedSessionId, setSelectedSessionId] = useState<string>("");
	const [settings, setSettings] = useState<Settings>({
		ui: {
			theme: "system",
			aircraftSortBy: "id",
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
	});

	const handleUploadSuccess = (data: unknown, sessionName: string) => {
		// Load the session data and switch to dashboard tab
		console.log("Upload successful:", data);
		console.log("Session name:", sessionName);
		
		if (sessionName) {
			// Set the session ID and switch to dashboard
			setSelectedSessionId(sessionName);
			setActiveTab("dashboard");
		} else {
			// Fallback: just switch to dashboard tab
			setActiveTab("dashboard");
		}
	};

	const handleSessionLoad = (data: unknown, sessionId: string) => {
		// Store the loaded session data and ID
		console.log("Session loaded:", data);
		setLoadedSessionData(data);
		setSelectedSessionId(sessionId);
		setActiveTab("dashboard");
	};

	return (
		<div className="min-h-screen bg-background py-8">
			<div className="container mx-auto px-4">
				<div className="text-center mb-8">
					<h1 className="text-4xl font-bold text-foreground mb-2">
						Paparazzi UAV Log Analyzer
					</h1>
					<p className="text-lg text-muted-foreground">
						Analyze your Paparazzi UAV log files with automatic processing
					</p>
				</div>

				<Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
					<TabsList className="grid w-full grid-cols-4 max-w-lg mx-auto mb-8">
						<TabsTrigger value="sessions">Sessions</TabsTrigger>
						<TabsTrigger value="upload">Upload</TabsTrigger>
						<TabsTrigger value="dashboard">Dashboard</TabsTrigger>
						<TabsTrigger value="settings">Settings</TabsTrigger>
					</TabsList>

					<TabsContent value="sessions">
						<Sessions onSessionLoad={handleSessionLoad} />
					</TabsContent>

					<TabsContent value="upload">
						<div className="max-w-2xl mx-auto">
							<Card>
								<CardHeader>
									<CardTitle>Upload Log Files</CardTitle>
									<p className="text-sm text-muted-foreground">
										Upload .log and .data files manually, or drop them in the
										backend/input folder for automatic processing
									</p>
								</CardHeader>
								<CardContent>
									<FileUpload
										onUploadSuccess={handleUploadSuccess}
										loading={loading}
										setLoading={setLoading}
									/>
								</CardContent>
							</Card>
						</div>
					</TabsContent>

					<TabsContent value="dashboard">
						<Dashboard 
							settings={settings} 
							preloadedSessionData={loadedSessionData}
							preloadedSessionId={selectedSessionId}
						/>
					</TabsContent>

					<TabsContent value="settings">
						<Settings onSettingsChange={setSettings} />
					</TabsContent>
				</Tabs>
			</div>
		</div>
	);
}
