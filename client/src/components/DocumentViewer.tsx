import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import type { Document } from "@shared/schema";

interface DocumentViewerProps {
  document: Document | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function DocumentViewer({ document, isOpen, onClose }: DocumentViewerProps) {
  const { toast } = useToast();
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [viewerType, setViewerType] = useState<'pdf' | 'word' | 'excel' | 'unsupported'>('unsupported');

  useEffect(() => {
    if (!document || !isOpen) {
      setContent("");
      return;
    }

    const mimeType = document.mimeType.toLowerCase();
    
    if (mimeType.includes('pdf')) {
      setViewerType('pdf');
      setContent("");
    } else if (mimeType.includes('word') || mimeType.includes('msword') || mimeType.includes('document')) {
      setViewerType('word');
      loadWordDocument();
    } else if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) {
      setViewerType('excel');
      loadExcelDocument();
    } else {
      setViewerType('unsupported');
      setContent("");
    }
  }, [document, isOpen]);

  const loadWordDocument = async () => {
    if (!document?.objectPath) return;
    
    setLoading(true);
    try {
      const docUrl = document.objectPath.startsWith('/objects/') 
        ? document.objectPath 
        : `/objects/${document.objectPath}`;
      
      const response = await fetch(docUrl);
      const arrayBuffer = await response.arrayBuffer();
      
      const result = await mammoth.convertToHtml({ arrayBuffer });
      setContent(result.value);
      
      if (result.messages.length > 0) {
        console.warn('Mammoth conversion warnings:', result.messages);
      }
    } catch (error) {
      console.error('Error loading Word document:', error);
      toast({
        title: "Error",
        description: "Failed to load Word document",
        variant: "destructive",
      });
      setContent("<p>Error loading document. Please try downloading it instead.</p>");
    } finally {
      setLoading(false);
    }
  };

  const loadExcelDocument = async () => {
    if (!document?.objectPath) return;
    
    setLoading(true);
    try {
      const docUrl = document.objectPath.startsWith('/objects/') 
        ? document.objectPath 
        : `/objects/${document.objectPath}`;
      
      const response = await fetch(docUrl);
      const arrayBuffer = await response.arrayBuffer();
      
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      let html = '<div class="excel-viewer">';
      
      workbook.SheetNames.forEach((sheetName, index) => {
        const worksheet = workbook.Sheets[sheetName];
        const htmlTable = XLSX.utils.sheet_to_html(worksheet, { 
          header: '<div class="sheet-tab">' + sheetName + '</div>',
        });
        html += htmlTable;
        if (index < workbook.SheetNames.length - 1) {
          html += '<div class="sheet-divider"></div>';
        }
      });
      
      html += '</div>';
      setContent(html);
    } catch (error) {
      console.error('Error loading Excel document:', error);
      toast({
        title: "Error",
        description: "Failed to load Excel document",
        variant: "destructive",
      });
      setContent("<p>Error loading document. Please try downloading it instead.</p>");
    } finally {
      setLoading(false);
    }
  };

  const getPdfUrl = () => {
    if (!document?.objectPath) return '';
    return document.objectPath.startsWith('/objects/') 
      ? document.objectPath 
      : `/objects/${document.objectPath}`;
  };

  const downloadDocument = () => {
    if (document?.objectPath) {
      const downloadUrl = document.objectPath.startsWith('/objects/') 
        ? document.objectPath 
        : `/objects/${document.objectPath}`;
      window.open(downloadUrl, '_blank');
    }
  };

  if (!document) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center space-x-2">
              <i className="fas fa-file-alt text-primary"></i>
              <span>{document.originalName}</span>
            </DialogTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={downloadDocument}
              data-testid="button-download-viewer"
            >
              <i className="fas fa-download mr-2"></i>
              Download
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {loading && (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          )}

          {!loading && viewerType === 'pdf' && (
            <iframe
              src={getPdfUrl()}
              className="w-full h-full min-h-[600px] border-0"
              title={document.originalName}
              data-testid="iframe-pdf-viewer"
            />
          )}

          {!loading && viewerType === 'word' && (
            <div 
              className="prose prose-sm max-w-none p-6 bg-white dark:bg-gray-900 word-viewer"
              dangerouslySetInnerHTML={{ __html: content }}
              data-testid="div-word-viewer"
            />
          )}

          {!loading && viewerType === 'excel' && (
            <div 
              className="p-6 excel-container"
              dangerouslySetInnerHTML={{ __html: content }}
              data-testid="div-excel-viewer"
            />
          )}

          {!loading && viewerType === 'unsupported' && (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <i className="fas fa-file text-muted-foreground text-6xl mb-4"></i>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Preview not available
              </h3>
              <p className="text-muted-foreground mb-4">
                This file type cannot be previewed. Please download it to view.
              </p>
              <Button onClick={downloadDocument} data-testid="button-download-unsupported">
                <i className="fas fa-download mr-2"></i>
                Download File
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
