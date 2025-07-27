"use client";

import React, { useState } from "react";
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
import { ChevronDown, ChevronRight } from "lucide-react";

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

export function MessageTable({ messages }: MessageTableProps) {
	const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

	const toggleRow = (index: number) => {
		const newExpanded = new Set(expandedRows);
		if (newExpanded.has(index)) {
			newExpanded.delete(index);
		} else {
			newExpanded.add(index);
		}
		setExpandedRows(newExpanded);
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
				<CardTitle>Recent Messages</CardTitle>
				<p className="text-sm text-gray-600">
					Showing {messages.length} most recent messages (click to expand
					fields)
				</p>
			</CardHeader>
			<CardContent>
				<div className="rounded-md border max-h-[400px] overflow-auto">
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
							{messages.map((message, index) => {
								const messageKey = `${message.timestamp}-${message.aircraft_id}-${message.message_id}-${index}`;
								return (
									<React.Fragment key={messageKey}>
										<TableRow
											className="cursor-pointer hover:bg-gray-50"
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
											<TableCell className="text-sm text-gray-600">
												{getFieldSummary(message.fields)}
											</TableCell>
										</TableRow>

										{expandedRows.has(index) && (
											<TableRow>
												<TableCell colSpan={5} className="bg-gray-50 p-4">
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
																		className="bg-white p-2 rounded border"
																	>
																		<div className="font-mono text-xs text-gray-600">
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
																<h5 className="font-medium text-xs text-gray-600 mb-1">
																	Raw Data:
																</h5>
																<code className="text-xs bg-gray-100 p-2 rounded block">
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
						<div className="text-center py-8 text-gray-500">
							No messages to display
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
