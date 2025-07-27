"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, ChevronLeft, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Input } from "@/components/ui/input";

interface Message {
	timestamp: number;
	aircraft_id: number;
	message_type: string;
	message_id: number;
	fields: Record<string, unknown>;
}

interface MessageTableProps {
	messages: Message[];
}

const MESSAGES_PER_PAGE = 100; // Show 100 messages per page

export function MessageTable({ messages }: MessageTableProps) {
	const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
	const [currentPage, setCurrentPage] = useState(0);
	const [pageInput, setPageInput] = useState("");

	// Calculate pagination
	const totalPages = Math.ceil(messages.length / MESSAGES_PER_PAGE);
	const startIndex = currentPage * MESSAGES_PER_PAGE;
	const endIndex = Math.min(startIndex + MESSAGES_PER_PAGE, messages.length);
	
	// Get current page messages
	const currentMessages = useMemo(() => {
		return messages.slice(startIndex, endIndex);
	}, [messages, startIndex, endIndex]);

	const toggleRow = (index: number) => {
		const newExpanded = new Set(expandedRows);
		if (newExpanded.has(index)) {
			newExpanded.delete(index);
		} else {
			newExpanded.add(index);
		}
		setExpandedRows(newExpanded);
	};

	// Reset to first page when messages change
	React.useEffect(() => {
		setCurrentPage(0);
		setExpandedRows(new Set());
	}, [messages]);

	const goToPage = (page: number) => {
		setCurrentPage(Math.max(0, Math.min(page, totalPages - 1)));
		setExpandedRows(new Set()); // Clear expanded rows when changing pages
	};

	const handlePageInputChange = (value: string) => {
		setPageInput(value);
	};

	const handlePageInputSubmit = () => {
		const pageNumber = parseInt(pageInput);
		if (!isNaN(pageNumber) && pageNumber >= 1 && pageNumber <= totalPages) {
			goToPage(pageNumber - 1); // Convert to 0-based index
			setPageInput(""); // Clear input after successful navigation
		}
	};

	const handlePageInputKeyPress = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter') {
			handlePageInputSubmit();
		}
	};

	const formatValue = (value: unknown): string => {
		if (value === null || value === undefined) return "null";
		if (typeof value === "number") return value.toFixed(3);
		if (typeof value === "string") return value;
		if (typeof value === "boolean") return value.toString();
		if (Array.isArray(value))
			return `[${value.slice(0, 3).join(", ")}${
				value.length > 3 ? "..." : ""
			}]`;
		return JSON.stringify(value);
	};

	const getFieldSummary = (fields: Record<string, unknown>): string => {
		const fieldNames = Object.keys(fields).filter(
			(key) => !key.startsWith("_")
		);
		return (
			fieldNames.slice(0, 3).join(", ") + (fieldNames.length > 3 ? "..." : "")
		);
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle>Messages</CardTitle>
				<div className="flex items-center justify-between">
					<p className="text-sm text-gray-600">
						Showing {startIndex + 1}-{endIndex} of {messages.length} messages
					</p>
					
					{/* Pagination Controls */}
					<div className="flex items-center gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={() => goToPage(0)}
							disabled={currentPage === 0}
						>
							<ChevronsLeft className="h-4 w-4" />
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={() => goToPage(currentPage - 1)}
							disabled={currentPage === 0}
						>
							<ChevronLeft className="h-4 w-4" />
						</Button>
						<div className="flex items-center gap-1">
							<span className="text-sm">Page</span>
							<Input
								type="number"
								min="1"
								max={totalPages}
								value={pageInput}
								onChange={(e) => handlePageInputChange(e.target.value)}
								onKeyPress={handlePageInputKeyPress}
								onBlur={handlePageInputSubmit}
								placeholder={(currentPage + 1).toString()}
								className="w-16 h-8 text-center text-sm"
							/>
							<span className="text-sm">of {totalPages}</span>
						</div>
						<Button
							variant="outline"
							size="sm"
							onClick={() => goToPage(currentPage + 1)}
							disabled={currentPage >= totalPages - 1}
						>
							<ChevronRight className="h-4 w-4" />
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={() => goToPage(totalPages - 1)}
							disabled={currentPage >= totalPages - 1}
						>
							<ChevronsRight className="h-4 w-4" />
						</Button>
					</div>
				</div>
			</CardHeader>
			<CardContent>
				<div className="rounded-md border max-h-[500px] overflow-auto">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="w-[50px]"></TableHead>
								<TableHead>Time</TableHead>
								<TableHead>Type</TableHead>
								<TableHead>Aircraft</TableHead>
								<TableHead>Fields Preview</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{currentMessages.map((message, index) => {
								const messageKey = `${message.timestamp}-${message.aircraft_id}-${message.message_id}-${index}`;
								return (
									<React.Fragment key={messageKey}>
										<TableRow
											className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
											onClick={() => toggleRow(index)}
										>
											<TableCell>
												<Button
													variant="ghost"
													size="sm"
													className="h-6 w-6 p-0"
												>
													{expandedRows.has(index) ? (
														<ChevronDown className="h-4 w-4" />
													) : (
														<ChevronRight className="h-4 w-4" />
													)}
												</Button>
											</TableCell>
											<TableCell className="font-mono text-sm">
												{message.timestamp.toFixed(3)}s
											</TableCell>
											<TableCell>
												<Badge variant="secondary" className="text-xs">
													{message.message_type}
												</Badge>
											</TableCell>
											<TableCell>{message.aircraft_id}</TableCell>
											<TableCell className="text-sm text-gray-600 dark:text-gray-400">
												{getFieldSummary(message.fields)}
											</TableCell>
										</TableRow>

										{expandedRows.has(index) && (
											<TableRow>
												<TableCell colSpan={5} className="bg-gray-50 dark:bg-gray-800 p-4">
													<div className="space-y-2">
														<h4 className="font-medium text-sm">
															Message Fields:
														</h4>
														<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
															{Object.entries(message.fields)
																.filter(([key]) => !key.startsWith("_"))
																.map(([key, value]) => (
																	<div
																		key={key}
																		className="bg-white dark:bg-gray-700 p-2 rounded border dark:border-gray-600"
																	>
																		<div className="font-mono text-xs text-gray-600 dark:text-gray-400">
																			{key}
																		</div>
																		<div className="font-mono text-sm">
																			{formatValue(value)}
																		</div>
																	</div>
																))}
														</div>

														{/* Raw data if available */}
														{message.fields._raw_data ? (
															<div className="mt-3">
																<h5 className="font-medium text-xs text-gray-600 dark:text-gray-400 mb-1">
																	Raw Data:
																</h5>
																<code className="text-xs bg-gray-100 dark:bg-gray-600 p-2 rounded block">
																	{String(message.fields._raw_data)}
																</code>
															</div>
														) : null}
													</div>
												</TableCell>
											</TableRow>
										)}
									</React.Fragment>
								);
							})}
						</TableBody>
					</Table>

					{messages.length === 0 && (
						<div className="text-center py-8 text-gray-500 dark:text-gray-400">
							No messages to display
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
