"use client";

import { useState } from "react";
import { FileUpload } from "@/components/FileUpload";
import { Dashboard } from "@/components/Dashboard";
import { Settings } from "@/components/Settings";
import { Sessions } from "@/components/Sessions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SessionData {
	aircraft: Array<{
		id: number;
		name: string;
		airframe: string;
		message_types: string[];
	}>;
	messages: unknown[];
	session_name?: string;
	stats?: {
		total_aircraft: number;
		total_messages: number;
		aircraft_ids: number[];
		message_types: string[];
		duration: number;
	};
	aircraft_count?: number;
	message_count?: number;
	session_id?: number;
}

export default function Home() {
	const [sessionData, setSessionData] = useState<SessionData | null>(null);
	const [loading, setLoading] = useState(false);
	const [activeTab, setActiveTab] = useState("sessions");

	const handleUploadSuccess = (data: unknown) => {
		// Transform upload response to SessionData format
		const uploadData = data as {
			aircraft_count: number;
			message_count: number;
			session_id: number;
		};

		const sessionData: SessionData = {
			aircraft: [],
			messages: [],
			aircraft_count: uploadData.aircraft_count,
			message_count: uploadData.message_count,
			session_id: uploadData.session_id,
		};

		setSessionData(sessionData);
		setActiveTab("dashboard");
	};

	const handleSessionLoad = (data: unknown) => {
		// Transform session load response to SessionData format
		const sessionLoad = data as {
			aircraft: Array<{ ac_id: number; name: string; airframe: string }>;
			messages: unknown[];
			stats: {
				total_aircraft: number;
				total_messages: number;
				aircraft_ids: number[];
				message_types: string[];
				duration: number;
			};
		};

		const sessionData: SessionData = {
			aircraft: sessionLoad.aircraft.map((a) => ({
				id: a.ac_id,
				name: a.name,
				airframe: a.airframe,
				message_types: [],
			})),
			messages: sessionLoad.messages,
			stats: sessionLoad.stats,
			aircraft_count: sessionLoad.stats.total_aircraft,
			message_count: sessionLoad.stats.total_messages,
			session_id: 1, // dummy session id
		};

		setSessionData(sessionData);
		setActiveTab("dashboard");
	};

	return (
		<div className="min-h-screen bg-gray-50 py-8">
			<div className="container mx-auto px-4">
				<div className="text-center mb-8">
					<h1 className="text-4xl font-bold text-gray-900 mb-2">
						Paparazzi UAV Log Analyzer
					</h1>
					<p className="text-lg text-gray-600">
						Analyze your Paparazzi UAV log files with automatic processing
					</p>
				</div>

				<Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
					<TabsList className="grid w-full grid-cols-4 max-w-lg mx-auto mb-8">
						<TabsTrigger value="sessions">Sessions</TabsTrigger>
						<TabsTrigger value="upload">Upload</TabsTrigger>
						<TabsTrigger value="dashboard" disabled={!sessionData}>
							Dashboard
						</TabsTrigger>
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
									<p className="text-sm text-gray-600">
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
						{sessionData &&
						sessionData.aircraft_count !== undefined &&
						sessionData.message_count !== undefined &&
						sessionData.session_id !== undefined ? (
							<Dashboard
								sessionData={{
									aircraft_count: sessionData.aircraft_count,
									message_count: sessionData.message_count,
									session_id: sessionData.session_id,
								}}
							/>
						) : (
							<div className="text-center py-8">
								<p className="text-gray-500">
									Please load a session or upload files to view the dashboard.
								</p>
							</div>
						)}
					</TabsContent>

					<TabsContent value="settings">
						<Settings />
					</TabsContent>
				</Tabs>
			</div>
		</div>
	);
}
