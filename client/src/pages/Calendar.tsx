import Layout from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";

export default function Calendar() {
  return (
    <Layout>
      <div className="p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground" data-testid="heading-calendar">Calendar</h1>
          <p className="text-muted-foreground">Manage mediation sessions and appointments</p>
        </div>

        <Card>
          <CardContent className="p-12 text-center">
            <i className="fas fa-calendar-alt text-6xl text-muted-foreground mb-4"></i>
            <h2 className="text-xl font-semibold text-foreground mb-2">Calendar Integration Coming Soon</h2>
            <p className="text-muted-foreground">
              Schedule and manage mediation sessions with automatic calendar invites
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
