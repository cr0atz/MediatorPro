import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Document } from "@shared/schema";

export default function Documents() {
  const { data: documents } = useQuery<Document[]>({
    queryKey: ["/api/documents/all"],
  });

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

  return (
    <Layout>
      <div className="p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground" data-testid="heading-documents">All Documents</h1>
          <p className="text-muted-foreground">View and manage all case documents</p>
        </div>

        <div className="grid gap-4">
          {documents && documents.length > 0 ? (
            documents.map((doc) => (
              <Card key={doc.id} data-testid={`document-${doc.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                        <i className="fas fa-file-pdf text-primary text-xl"></i>
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{doc.originalName}</h3>
                        <p className="text-sm text-muted-foreground">
                          {new Date(doc.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Badge className={getCategoryColor(doc.category || 'Other')}>
                        {doc.category}
                      </Badge>
                      <Badge variant={doc.isProcessed ? "default" : "secondary"}>
                        {doc.isProcessed ? 'Processed' : 'Processing'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <i className="fas fa-folder-open text-4xl text-muted-foreground mb-4"></i>
                <p className="text-muted-foreground">No documents found</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
}
