import Layout from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";

export default function AIAssistant() {
  return (
    <Layout>
      <div className="p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground" data-testid="heading-ai-assistant">AI Assistant</h1>
          <p className="text-muted-foreground">Get AI-powered insights across all your cases</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" data-testid="card-case-analysis">
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center mb-4">
                <i className="fas fa-brain text-purple-500 text-2xl"></i>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Case Analysis</h3>
              <p className="text-sm text-muted-foreground">Analyze patterns and insights across all cases</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" data-testid="card-document-search">
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center mb-4">
                <i className="fas fa-search text-blue-500 text-2xl"></i>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Document Search</h3>
              <p className="text-sm text-muted-foreground">Search across all documents with AI</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" data-testid="card-legal-research">
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center mb-4">
                <i className="fas fa-gavel text-green-500 text-2xl"></i>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Legal Research</h3>
              <p className="text-sm text-muted-foreground">Get relevant legal precedents and guidance</p>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardContent className="p-12 text-center">
            <i className="fas fa-robot text-6xl text-muted-foreground mb-4"></i>
            <h2 className="text-xl font-semibold text-foreground mb-2">AI Assistant Features Coming Soon</h2>
            <p className="text-muted-foreground">
              Access AI features from individual case pages for now
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
