import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

interface ManualMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ManualMeetingModal({ isOpen, onClose }: ManualMeetingModalProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    caseNumber: '',
    mediationNumber: '',
    mediationType: 'Remote',
    mediationDate: '',
    mediationTime: '',
    premises: '',
    disputeBackground: '',
    issuesForDiscussion: '',
  });

  const createMeetingMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      // Combine date and time
      const mediationDateTime = data.mediationDate && data.mediationTime 
        ? new Date(`${data.mediationDate}T${data.mediationTime}`)
        : null;

      const caseData = {
        caseNumber: data.caseNumber,
        mediationNumber: data.mediationNumber || undefined,
        mediationType: data.mediationType,
        mediationDate: mediationDateTime,
        premises: data.premises || undefined,
        disputeBackground: data.disputeBackground || undefined,
        issuesForDiscussion: data.issuesForDiscussion 
          ? data.issuesForDiscussion.split('\n').filter(issue => issue.trim())
          : [],
        status: 'active'
      };

      const response = await apiRequest('POST', '/api/cases', caseData);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create meeting');
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: `Meeting created successfully: ${data.caseNumber}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      onClose();
      // Reset form
      setFormData({
        caseNumber: '',
        mediationNumber: '',
        mediationType: 'Remote',
        mediationDate: '',
        mediationTime: '',
        premises: '',
        disputeBackground: '',
        issuesForDiscussion: '',
      });
    },
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
        description: error.message || "Failed to create meeting",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.caseNumber.trim()) {
      toast({
        title: "Validation Error",
        description: "Case number is required",
        variant: "destructive",
      });
      return;
    }
    createMeetingMutation.mutate(formData);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <i className="fas fa-calendar-plus text-primary"></i>
            <span>Create New Meeting</span>
          </DialogTitle>
          <DialogDescription>
            Create a new mediation case/meeting manually by filling in the details below.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="caseNumber">Case Number *</Label>
              <Input
                id="caseNumber"
                value={formData.caseNumber}
                onChange={(e) => handleInputChange('caseNumber', e.target.value)}
                placeholder="e.g., MED-2025-001"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mediationNumber">Mediation Number</Label>
              <Input
                id="mediationNumber"
                value={formData.mediationNumber}
                onChange={(e) => handleInputChange('mediationNumber', e.target.value)}
                placeholder="e.g., M2025-001"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="mediationType">Mediation Type</Label>
            <Select value={formData.mediationType} onValueChange={(value) => handleInputChange('mediationType', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Remote">Remote</SelectItem>
                <SelectItem value="In-Person">In-Person</SelectItem>
                <SelectItem value="Hybrid">Hybrid</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="mediationDate">Mediation Date</Label>
              <Input
                id="mediationDate"
                type="date"
                value={formData.mediationDate}
                onChange={(e) => handleInputChange('mediationDate', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mediationTime">Mediation Time</Label>
              <Input
                id="mediationTime"
                type="time"
                value={formData.mediationTime}
                onChange={(e) => handleInputChange('mediationTime', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="premises">Premises/Location</Label>
            <Input
              id="premises"
              value={formData.premises}
              onChange={(e) => handleInputChange('premises', e.target.value)}
              placeholder="e.g., Zoom Meeting Room, 123 Main St, etc."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="disputeBackground">Dispute Background</Label>
            <Textarea
              id="disputeBackground"
              value={formData.disputeBackground}
              onChange={(e) => handleInputChange('disputeBackground', e.target.value)}
              placeholder="Brief description of the dispute..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="issuesForDiscussion">Issues for Discussion</Label>
            <Textarea
              id="issuesForDiscussion"
              value={formData.issuesForDiscussion}
              onChange={(e) => handleInputChange('issuesForDiscussion', e.target.value)}
              placeholder="Enter each issue on a new line..."
              rows={4}
            />
            <p className="text-xs text-muted-foreground">Enter each issue on a separate line</p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createMeetingMutation.isPending}
              className="flex items-center space-x-2"
            >
              {createMeetingMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <i className="fas fa-plus"></i>
                  <span>Create Meeting</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
