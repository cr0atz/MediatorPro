import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ObjectUploader } from "./ObjectUploader";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { Document } from "@shared/schema";
import type { UploadResult } from '@uppy/core';

interface DocumentManagerProps {
  caseId: string;
}

export default function DocumentManager({ caseId }: DocumentManagerProps) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["/api/cases", caseId, "documents"],
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to fetch documents",
        variant: "destructive",
      });
    },
  });

  const handleGetUploadParameters = async () => {
    try {
      const response = await apiRequest('POST', '/api/objects/upload', {});
      const data = await response.json();
      return {
        method: 'PUT' as const,
        url: data.uploadURL,
      };
    } catch (error) {
      console.error('Error getting upload parameters:', error);
      throw error;
    }
  };

  const handleUploadComplete = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    try {
      if (result.successful.length > 0) {
        const uploadedFile = result.successful[0];
        const uploadURL = uploadedFile.uploadURL;
        
        // Call the backend to process the uploaded document
        const formData = new FormData();
        formData.append('uploadURL', uploadURL);
        formData.append('category', 'General');
        
        await apiRequest('POST', `/api/cases/${caseId}/documents/process-upload`, {
          uploadURL: uploadURL,
          fileName: uploadedFile.name,
          fileSize: uploadedFile.size,
          mimeType: uploadedFile.type,
          category: 'General',
        });

        toast({
          title: "Success",
          description: "Document uploaded and processed successfully",
        });

        queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId, "documents"] });
      }
    } catch (error) {
      console.error('Error processing upload:', error);
      toast({
        title: "Error",
        description: "Failed to process uploaded document",
        variant: "destructive",
      });
    }
  };

  const downloadDocument = (document: Document) => {
    if (document.objectPath) {
      const downloadUrl = document.objectPath.startsWith('/objects/') 
        ? document.objectPath 
        : `/objects/${document.objectPath}`;
      window.open(downloadUrl, '_blank');
    }
  };

  const getDocumentIcon = (mimeType: string) => {
    if (mimeType.includes('pdf')) return 'fas fa-file-pdf text-red-500';
    if (mimeType.includes('word') || mimeType.includes('msword')) return 'fas fa-file-word text-blue-500';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'fas fa-file-excel text-green-500';
    if (mimeType.includes('image')) return 'fas fa-file-image text-purple-500';
    return 'fas fa-file-alt text-gray-500';
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Legal Document':
        return 'bg-blue-100 text-blue-800';
      case 'Evidence':
        return 'bg-purple-100 text-purple-800';
      case 'Correspondence':
        return 'bg-orange-100 text-orange-800';
      case 'Financial':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const filteredDocuments = documents.filter((doc: Document) => {
    const matchesSearch = doc.originalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (doc.category && doc.category.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = categoryFilter === 'All Categories' || doc.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = ['All Categories', 'Legal Document', 'Evidence', 'Correspondence', 'Financial', 'General'];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <ObjectUploader
            maxNumberOfFiles={5}
            maxFileSize={50 * 1024 * 1024} // 50MB
            onGetUploadParameters={handleGetUploadParameters}
            onComplete={handleUploadComplete}
            buttonClassName="bg-primary text-primary-foreground hover:opacity-90"
          >
            <div className="flex items-center space-x-2">
              <i className="fas fa-upload"></i>
              <span>Upload Document</span>
            </div>
          </ObjectUploader>
          
          <div className="relative">
            <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm"></i>
            <Input
              type="text"
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-document-search"
            />
          </div>
        </div>
        
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48" data-testid="select-category-filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="text-center p-8" data-testid="text-no-documents">
          <i className="fas fa-file-alt text-muted-foreground text-4xl mb-4"></i>
          <p className="text-foreground font-medium">
            {searchTerm || categoryFilter !== 'All Categories' ? 'No matching documents' : 'No documents uploaded'}
          </p>
          <p className="text-muted-foreground text-sm">
            {searchTerm || categoryFilter !== 'All Categories' 
              ? 'Try adjusting your search or filter criteria'
              : 'Upload your first document to get started'
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="grid-documents">
          {filteredDocuments.map((document: Document) => (
            <Card key={document.id} className="hover:shadow-md transition-shadow">
              <div className="document-preview h-40 bg-gradient-to-br from-muted/50 to-muted flex items-center justify-center">
                <i className={`${getDocumentIcon(document.mimeType)} text-5xl`}></i>
              </div>
              <CardContent className="p-4">
                <h4 className="text-sm font-semibold text-foreground mb-1 truncate" title={document.originalName}>
                  {document.originalName}
                </h4>
                <p className="text-xs text-muted-foreground mb-3">
                  Uploaded {formatDate(document.createdAt)} • {formatFileSize(document.fileSize)}
                </p>
                <div className="flex items-center justify-between">
                  <Badge className={`text-xs ${getCategoryColor(document.category || 'General')}`}>
                    {document.category || 'General'}
                  </Badge>
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => downloadDocument(document)}
                      title="Download"
                      data-testid={`button-download-${document.id}`}
                    >
                      <i className="fas fa-download"></i>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (document.objectPath) {
                          const viewUrl = document.objectPath.startsWith('/objects/') 
                            ? document.objectPath 
                            : `/objects/${document.objectPath}`;
                          window.open(viewUrl, '_blank');
                        }
                      }}
                      title="View"
                      data-testid={`button-view-${document.id}`}
                    >
                      <i className="fas fa-eye"></i>
                    </Button>
                  </div>
                </div>
                {document.isProcessed && (
                  <div className="mt-2 flex items-center space-x-1 text-xs text-green-600">
                    <i className="fas fa-check-circle"></i>
                    <span>AI Processed</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
