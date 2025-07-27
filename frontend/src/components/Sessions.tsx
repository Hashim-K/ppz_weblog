"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
	Calendar,
	Clock,
	Plane,
	MessageSquare,
	PlayCircle,
} from "lucide-react";
import axios from "axios";

interface SessionStats {
	total_aircraft: number;
	total_messages: number;
	aircraft_ids: number[];
	message_types: string[];
	duration: number;
	start_time: number;
	end_time: number;
}

interface ProcessedSession {
	session_name: string;
	processed_at: string;
	log_file: string;
	data_file: string;
	stats: SessionStats;
}

interface SessionsProps {
	onSessionLoad: (sessionData: unknown) => void;
}

export function Sessions({ onSessionLoad }: SessionsProps) {
	const [sessions, setSessions] = useState<ProcessedSession[]>([]);
	const [loading, setLoading] = useState(true);
	const [loadingSession, setLoadingSession] = useState<string | null>(null);

	const loadSessions = async () => {
		try {
			const response = await axios.get("http://localhost:8000/sessions");
			setSessions(response.data.sessions);
		} catch (error) {
			console.error("Failed to load sessions:", error);
		} finally {
			setLoading(false);
		}
	};

	const loadSession = async (sessionName: string) => {
		setLoadingSession(sessionName);
		try {
			await axios.post(`http://localhost:8000/sessions/${sessionName}/load`);
			const sessionData = await axios.get(
				`http://localhost:8000/sessions/${sessionName}`
			);

			// Call the callback to notify parent component
			onSessionLoad(sessionData.data);

			console.log(`Session ${sessionName} loaded successfully`);
		} catch (error) {
			console.error(`Failed to load session ${sessionName}:`, error);
		} finally {
			setLoadingSession(null);
		}
	};

	useEffect(() => {
		loadSessions();
	}, []);

	const formatDuration = (seconds: number): string => {
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		const secs = Math.floor(seconds % 60);

		if (hours > 0) {
			return `${hours}h ${minutes}m ${secs}s`;
		} else if (minutes > 0) {
			return `${minutes}m ${secs}s`;
		} else {
			return `${secs}s`;
		}
	};

	const formatDate = (isoString: string): string => {
		const date = new Date(isoString);
		return date.toLocaleDateString() + " " + date.toLocaleTimeString();
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center h-64">
				<div className="text-center">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
					<p className="text-gray-600">Loading processed sessions...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-2xl font-bold">Processed Log Sessions</h2>
					<p className="text-gray-600">
						Found {sessions.length} processed log session
						{sessions.length !== 1 ? "s" : ""}
					</p>
				</div>
				<Button onClick={loadSessions} variant="outline">
					Refresh
				</Button>
			</div>

			{sessions.length === 0 ? (
				<Card>
					<CardContent className="py-8">
						<div className="text-center">
							<Plane className="h-12 w-12 text-gray-400 mx-auto mb-4" />
							<h3 className="text-lg font-medium text-gray-900 mb-2">
								No processed sessions found
							</h3>
							<p className="text-gray-600 mb-4">
								Drop your .log and .data files in the backend/input folder to
								automatically process them.
							</p>
							<div className="bg-gray-50 p-4 rounded-lg text-left">
								<p className="text-sm text-gray-700 font-mono">
									cp your_file.log your_file.data /path/to/backend/input/
								</p>
							</div>
						</div>
					</CardContent>
				</Card>
			) : (
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
					{sessions.map((session) => (
						<Card
							key={session.session_name}
							className="hover:shadow-lg transition-shadow"
						>
							<CardHeader className="pb-3">
								<div className="flex items-center justify-between">
									<CardTitle className="text-lg truncate">
										{session.session_name}
									</CardTitle>
									<Button
										onClick={() => loadSession(session.session_name)}
										disabled={loadingSession === session.session_name}
										size="sm"
										className="ml-2"
									>
										{loadingSession === session.session_name ? (
											<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
										) : (
											<PlayCircle className="h-4 w-4" />
										)}
									</Button>
								</div>
								<p className="text-sm text-gray-600 flex items-center">
									<Calendar className="h-3 w-3 mr-1" />
									{formatDate(session.processed_at)}
								</p>
							</CardHeader>

							<CardContent className="space-y-3">
								{/* File info */}
								<div className="space-y-1">
									<p className="text-xs text-gray-500">Files:</p>
									<p className="text-sm font-mono truncate">
										{session.log_file}
									</p>
									<p className="text-sm font-mono truncate">
										{session.data_file}
									</p>
								</div>

								{/* Stats */}
								<div className="grid grid-cols-2 gap-3">
									<div className="text-center p-2 bg-blue-50 rounded">
										<div className="flex items-center justify-center mb-1">
											<Plane className="h-4 w-4 text-blue-600" />
										</div>
										<p className="text-lg font-bold text-blue-600">
											{session.stats.total_aircraft}
										</p>
										<p className="text-xs text-gray-600">Aircraft</p>
									</div>

									<div className="text-center p-2 bg-green-50 rounded">
										<div className="flex items-center justify-center mb-1">
											<MessageSquare className="h-4 w-4 text-green-600" />
										</div>
										<p className="text-lg font-bold text-green-600">
											{session.stats.total_messages.toLocaleString()}
										</p>
										<p className="text-xs text-gray-600">Messages</p>
									</div>
								</div>

								{/* Duration */}
								<div className="flex items-center justify-center p-2 bg-gray-50 rounded">
									<Clock className="h-4 w-4 text-gray-600 mr-2" />
									<span className="text-sm font-medium">
										{formatDuration(session.stats.duration)}
									</span>
								</div>

								{/* Aircraft IDs */}
								<div>
									<p className="text-xs text-gray-500 mb-1">Aircraft IDs:</p>
									<div className="flex flex-wrap gap-1">
										{session.stats.aircraft_ids.slice(0, 5).map((id) => (
											<Badge key={id} variant="outline" className="text-xs">
												{id}
											</Badge>
										))}
										{session.stats.aircraft_ids.length > 5 && (
											<Badge variant="outline" className="text-xs">
												+{session.stats.aircraft_ids.length - 5}
											</Badge>
										)}
									</div>
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			)}
		</div>
	);
}
