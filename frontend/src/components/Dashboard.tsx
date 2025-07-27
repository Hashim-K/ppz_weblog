"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2, Plane, Calendar, Hash, Search, Trash2 } from "lucide-react";
import axios from "axios";
import { MessageTable } from "./MessageTable";

interface Aircraft {
	id: number;
	name: string;
	color: string;
	total_messages: number;
}

interface MessageType {
	name: string;
	count: number;
	description: string;
}

interface SessionInfo {
	session_id: string;
	filename: string;
	file_size: number;
	total_messages: number;
	start_time: string;
	end_time: string;
	duration: number;
	aircraft: Aircraft[];
	message_types: MessageType[];
}

interface Message {
	aircraft_id: number;
	message_type: string;
	timestamp: number;
	source: number;
	destination: number;
	message_id: number;
	fields: Record<string, unknown>;
}

interface Settings {
	ui: {
		aircraftSortBy: "id" | "name";
	};
}

interface DashboardProps {
	settings?: Settings;
	preloadedSessionData?: unknown;
	preloadedSessionId?: string;
}

export function Dashboard({ settings, preloadedSessionData, preloadedSessionId }: DashboardProps) {
	const [sessions, setSessions] = useState<string[]>([]);
	const [selectedSession, setSelectedSession] = useState<string>("");
	const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
	const [messages, setMessages] = useState<Message[]>([]);
	const [loading, setLoading] = useState(false);
	const [messagesLoading, setMessagesLoading] = useState(false);
	const [selectedAircraft, setSelectedAircraft] = useState<number | null>(null);
	const [messageTypeFilter, setMessageTypeFilter] = useState<string>("all");
	const [searchQuery, setSearchQuery] = useState<string>("");
	const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
	const [deletingSession, setDeletingSession] = useState<boolean>(false);

	const loadSessions = async () => {
		setLoading(true);
		try {
			const response = await axios.get("http://localhost:8000/sessions");
			setSessions(response.data || []);
			if (response.data && response.data.length > 0) {
				setSelectedSession(response.data[0]);
			}
		} catch (error) {
			console.error("Failed to load sessions:", error);
		} finally {
			setLoading(false);
		}
	};

	const deleteCurrentSession = async () => {
		if (!selectedSession) return;
		
		setDeletingSession(true);
		try {
			await axios.delete(`http://localhost:8000/sessions/${selectedSession}`);
			
			// Remove from sessions list
			setSessions(prev => prev.filter(session => session !== selectedSession));
			
			// Clear current session data
			setSelectedSession("");
			setSessionInfo(null);
			setMessages([]);
			
			// Select first available session if any
			const remainingSessions = sessions.filter(session => session !== selectedSession);
			if (remainingSessions.length > 0) {
				setSelectedSession(remainingSessions[0]);
			}
			
			console.log(`Session ${selectedSession} deleted successfully`);
		} catch (error) {
			console.error(`Failed to delete session ${selectedSession}:`, error);
		} finally {
			setDeletingSession(false);
		}
	};	const loadSessionInfo = async (sessionId: string) => {
		try {
			const response = await axios.get(
				`http://localhost:8000/sessions/${sessionId}/info`
			);
			setSessionInfo(response.data);
		} catch (error) {
			console.error("Failed to load session info:", error);
		}
	};

	const loadMessages = useCallback(async () => {
		if (!selectedSession) return;

		setMessagesLoading(true);
		try {
			const params = new URLSearchParams();
			if (selectedAircraft !== null) {
				params.append("aircraft_id", selectedAircraft.toString());
			}
			if (messageTypeFilter && messageTypeFilter !== "all") {
				params.append("message_type", messageTypeFilter);
			}

			// First, load the first 1000 messages quickly
			const fastParams = new URLSearchParams(params);
			fastParams.append("limit", "1000");

			const fastResponse = await axios.get(
				`http://localhost:8000/sessions/${selectedSession}/messages?${fastParams.toString()}`
			);
			const fastMessages = fastResponse.data;
			setMessages(fastMessages);
			setMessagesLoading(false); // Hide spinner immediately after fast load

			// Then, load all messages in the background if there might be more
			if (fastMessages.length === 1000) {
				setIsLoadingMore(true);
				try {
					const fullResponse = await axios.get(
						`http://localhost:8000/sessions/${selectedSession}/messages?${params.toString()}`
					);
					setMessages(fullResponse.data);
				} catch (error) {
					console.error("Failed to load full messages:", error);
				} finally {
					setIsLoadingMore(false);
				}
			}
		} catch (error) {
			console.error("Failed to load messages:", error);
			setMessagesLoading(false);
		}
	}, [selectedSession, selectedAircraft, messageTypeFilter]);

	useEffect(() => {
		// If we have preloaded session data, use it directly
		if (preloadedSessionId && preloadedSessionData) {
			setSelectedSession(preloadedSessionId);
			// Parse the preloaded data to extract messages
			const data = preloadedSessionData as { messages?: Message[] };
			if (data.messages) {
				setMessages(data.messages);
			}
			// Load session info and list for dropdown
			loadSessionInfo(preloadedSessionId);
			loadSessions();
		} else {
			// Default behavior - load sessions and select first one
			loadSessions();
		}
	}, [preloadedSessionId, preloadedSessionData]);

	useEffect(() => {
		if (selectedSession) {
			loadSessionInfo(selectedSession);
		}
	}, [selectedSession]);

	useEffect(() => {
		if (selectedSession) {
			loadMessages();
		}
	}, [selectedSession, selectedAircraft, messageTypeFilter, loadMessages]);

	const filteredMessages = messages.filter((message) => {
		if (!searchQuery) return true;
		const searchLower = searchQuery.toLowerCase();
		return (
			message.message_type.toLowerCase().includes(searchLower) ||
			message.aircraft_id.toString().includes(searchLower) ||
			JSON.stringify(message.fields).toLowerCase().includes(searchLower)
		);
	});

	const formatFileSize = (bytes: number) => {
		const units = ["B", "KB", "MB", "GB"];
		let size = bytes;
		let unitIndex = 0;
		while (size >= 1024 && unitIndex < units.length - 1) {
			size /= 1024;
			unitIndex++;
		}
		return `${size.toFixed(1)} ${units[unitIndex]}`;
	};

	const formatDuration = (seconds: number) => {
		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		return `${mins}:${secs.toString().padStart(2, "0")}`;
	};

	// Get active aircraft (those with messages)
	const activeAircraftIds =
		sessionInfo?.aircraft
			.filter((a) => a.total_messages > 0)
			.map((a) => a.id) || [];

	// Sort aircraft based on settings
	const sortedAircraft =
		sessionInfo?.aircraft.slice().sort((a, b) => {
			if (settings?.ui?.aircraftSortBy === "name") {
				return a.name.localeCompare(b.name);
			}
			return a.id - b.id; // default to ID sorting
		}) || [];

	if (loading) {
		return (
			<div className="flex items-center justify-center h-64">
				<Loader2 className="h-8 w-8 animate-spin" />
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Session Selection */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Calendar className="h-5 w-5" />
						Session Selection
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="flex items-center gap-2">
						<div className="flex-1">
							<Select value={selectedSession} onValueChange={setSelectedSession}>
								<SelectTrigger className="w-full">
									<SelectValue placeholder="Select a session" />
								</SelectTrigger>
								<SelectContent>
									{sessions.map((session) => (
										<SelectItem key={session} value={session}>
											{session}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						{selectedSession && (
							<AlertDialog>
								<AlertDialogTrigger asChild>
									<Button
										variant="outline"
										size="sm"
										disabled={deletingSession}
										className="text-red-600 hover:text-red-700 hover:bg-red-50"
									>
										{deletingSession ? (
											<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
										) : (
											<Trash2 className="h-4 w-4" />
										)}
									</Button>
								</AlertDialogTrigger>
								<AlertDialogContent>
									<AlertDialogHeader>
										<AlertDialogTitle>Delete Session</AlertDialogTitle>
										<AlertDialogDescription>
											Are you sure you want to delete the session &ldquo;{selectedSession}&rdquo;? 
											This action cannot be undone and will permanently remove all session data.
										</AlertDialogDescription>
									</AlertDialogHeader>
									<AlertDialogFooter>
										<AlertDialogCancel>Cancel</AlertDialogCancel>
										<AlertDialogAction
											onClick={deleteCurrentSession}
											className="bg-red-600 hover:bg-red-700"
										>
											Delete
										</AlertDialogAction>
									</AlertDialogFooter>
								</AlertDialogContent>
							</AlertDialog>
						)}
					</div>
				</CardContent>
			</Card>

			{/* Session Info */}
			{sessionInfo && (
				<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
					<Card>
						<CardHeader>
							<CardTitle className="text-lg">Session Details</CardTitle>
						</CardHeader>
						<CardContent className="space-y-2">
							<div className="flex justify-between">
								<span className="text-gray-600">File:</span>
								<span className="font-mono text-sm">
									{sessionInfo.filename}
								</span>
							</div>
							<div className="flex justify-between">
								<span className="text-gray-600">Size:</span>
								<span>{formatFileSize(sessionInfo.file_size)}</span>
							</div>
							<div className="flex justify-between">
								<span className="text-gray-600">Duration:</span>
								<span>{formatDuration(sessionInfo.duration)}</span>
							</div>
							<div className="flex justify-between">
								<span className="text-gray-600">Messages:</span>
								<Badge variant="secondary">
									{sessionInfo.total_messages.toLocaleString()}
								</Badge>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Plane className="h-5 w-5" />
								Aircraft ({sessionInfo.aircraft.length})
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="space-y-2">
								{/* Quick Access Buttons for Active Aircraft */}
								{activeAircraftIds.length > 0 && (
									<div className="mb-4">
										<p className="text-sm text-gray-600 mb-2">Quick Access:</p>
										<div className="flex flex-wrap gap-1">
											{activeAircraftIds.map((id) => {
												const aircraft = sessionInfo.aircraft.find(
													(a) => a.id === id
												);
												return aircraft ? (
													<Button
														key={id}
														variant={
															selectedAircraft === id ? "default" : "outline"
														}
														size="sm"
														onClick={() =>
															setSelectedAircraft(
																selectedAircraft === id ? null : id
															)
														}
														className="h-8 px-2 text-xs"
													>
														{aircraft.name} ({aircraft.total_messages})
													</Button>
												) : null;
											})}
										</div>
									</div>
								)}

								{/* Aircraft Dropdown */}
								<Select
									value={selectedAircraft?.toString() || "all"}
									onValueChange={(value) =>
										setSelectedAircraft(
											value === "all" ? null : parseInt(value)
										)
									}
								>
									<SelectTrigger className="w-full">
										<SelectValue placeholder="All Aircraft" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">All Aircraft</SelectItem>
										{sortedAircraft.map((aircraft) => (
											<SelectItem
												key={aircraft.id}
												value={aircraft.id.toString()}
											>
												{aircraft.name} (ID: {aircraft.id}) -{" "}
												{aircraft.total_messages} msgs
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Hash className="h-5 w-5" />
								Message Types ({sessionInfo.message_types.length})
							</CardTitle>
						</CardHeader>
						<CardContent>
							<Select
								value={messageTypeFilter}
								onValueChange={setMessageTypeFilter}
							>
								<SelectTrigger className="w-full">
									<SelectValue placeholder="All Message Types" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Message Types</SelectItem>
									{sessionInfo.message_types
										.sort((a, b) => b.count - a.count)
										.map((messageType) => (
											<SelectItem
												key={messageType.name}
												value={messageType.name}
											>
												{messageType.name} ({messageType.count})
											</SelectItem>
										))}
								</SelectContent>
							</Select>
						</CardContent>
					</Card>
				</div>
			)}

			{/* Messages */}
			{sessionInfo && (
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Hash className="h-5 w-5" />
							Messages ({filteredMessages.length.toLocaleString()})
						</CardTitle>
						<div className="flex items-center gap-2 mt-2">
							<div className="relative flex-1">
								<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
								<Input
									placeholder="Search messages..."
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									className="pl-10"
								/>
							</div>
						</div>
					</CardHeader>
					<CardContent className="p-0">
						{messagesLoading ? (
							<div className="flex items-center justify-center h-32">
								<Loader2 className="h-6 w-6 animate-spin" />
								<span className="ml-2">Loading first 1000 messages...</span>
							</div>
						) : (
							<div className="w-full">
								<MessageTable messages={filteredMessages} />
								{isLoadingMore && (
									<div className="p-4 border-t bg-blue-50 text-center">
										<div className="flex items-center justify-center text-blue-600">
											<Loader2 className="h-4 w-4 animate-spin mr-2" />
											Loading remaining messages in background...
										</div>
									</div>
								)}
							</div>
						)}
					</CardContent>
				</Card>
			)}
		</div>
	);
}
