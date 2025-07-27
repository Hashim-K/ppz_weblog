"use client";

import { useState } from "react";
import { FileUpload } from "@/components/FileUpload";
import { Dashboard } from "@/components/Dashboard";
import { Settings } from "@/components/Settings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Home() {
  const [sessionData, setSessionData] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);

  const handleUploadSuccess = (data: unknown) => {
    setSessionData(data);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Paparazzi UAV Log Analyzer
          </h1>
          <p className="text-lg text-gray-600">
            Upload and visualize your Paparazzi UAV log files
          </p>
        </div>

        {!sessionData ? (
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>Upload Log Files</CardTitle>
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
        ) : (
          <Tabs defaultValue="dashboard" className="w-full">
            <TabsList className="grid w-full grid-cols-3 max-w-md mx-auto mb-8">
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="analysis">Analysis</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>
            
            <TabsContent value="dashboard">
              <Dashboard sessionData={sessionData} />
            </TabsContent>
            
            <TabsContent value="analysis">
              <div className="text-center py-8">
                <p className="text-gray-500">Analysis features coming soon...</p>
              </div>
            </TabsContent>
            
            <TabsContent value="settings">
              <Settings />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
