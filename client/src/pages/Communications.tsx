import Layout from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Communications() {
  return (
    <Layout>
      <div className="p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground" data-testid="heading-communications">Communications</h1>
            <p className="text-muted-foreground">Manage all case-related communications</p>
          </div>
          <Button data-testid="button-new-email">
            <i className="fas fa-envelope mr-2"></i>
            New Email
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
                  <i className="fas fa-envelope text-blue-500 text-2xl"></i>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Email Templates</h3>
                  <p className="text-sm text-muted-foreground">Manage reusable email templates</p>
                </div>
              </div>
              <Button variant="outline" className="w-full" data-testid="button-manage-templates">
                Manage Templates
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
                  <i className="fas fa-history text-green-500 text-2xl"></i>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Communication History</h3>
                  <p className="text-sm text-muted-foreground">View all sent communications</p>
                </div>
              </div>
              <Button variant="outline" className="w-full" data-testid="button-view-history">
                View History
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardContent className="p-12 text-center">
            <i className="fas fa-comment-dots text-6xl text-muted-foreground mb-4"></i>
            <h2 className="text-xl font-semibold text-foreground mb-2">Communications Hub</h2>
            <p className="text-muted-foreground">
              Send emails to parties from individual case pages for now
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
