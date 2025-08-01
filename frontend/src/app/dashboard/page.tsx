"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Dashboard } from "@/components/Dashboard";

interface Settings {
	ui: {
		theme: "system" | "light" | "dark";
		aircraftSortBy: "id" | "name";
		messageTypeSortBy: "count" | "alphabetical";
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

function DashboardContent() {
	const searchParams = useSearchParams();
	const router = useRouter();
	const pathname = usePathname();
	const sessionParam = searchParams.get("session");

	const [selectedSessionId, setSelectedSessionId] = useState<string>("");

	// Update URL when session changes
	const updateSessionInUrl = (sessionId: string) => {
		const params = new URLSearchParams(searchParams);
		if (sessionId) {
			params.set("session", sessionId);
		} else {
			params.delete("session");
		}
		router.replace(`${pathname}?${params.toString()}`);
		setSelectedSessionId(sessionId);
	};
	const [settings, setSettings] = useState<Settings>({
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
	});

	// Load UI settings from localStorage
	useEffect(() => {
		const savedUISettings = localStorage.getItem("ui-settings");
		if (savedUISettings) {
			try {
				const parsedUISettings = JSON.parse(savedUISettings);
				setSettings((prev) => ({
					...prev,
					ui: {
						...prev.ui,
						...parsedUISettings,
					},
				}));
			} catch (error) {
				console.error("Error loading UI settings:", error);
			}
		}
	}, []);

	useEffect(() => {
		if (sessionParam) {
			setSelectedSessionId(sessionParam);
		}
	}, [sessionParam]);

	return (
		<Dashboard
			selectedSessionId={selectedSessionId}
			setSelectedSessionId={updateSessionInUrl}
			settings={settings}
		/>
	);
}

export default function DashboardPage() {
	return (
		<div className="min-h-screen bg-background py-8">
			<div className="container mx-auto px-4">
				<div className="text-center mb-8">
					<h1 className="text-4xl font-bold text-foreground mb-2">Dashboard</h1>
					<p className="text-lg text-muted-foreground">
						Analyze your Paparazzi UAV log data
					</p>
				</div>
				<Suspense fallback={<div>Loading dashboard...</div>}>
					<DashboardContent />
				</Suspense>
			</div>
		</div>
	);
}
