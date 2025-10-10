import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

interface AIChatProps {
  caseId: string;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  sources?: string[];
}

export default function AIChat({ caseId }: AIChatProps) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'ai',
      content: "Hello! I'm your AI case assistant. I've analyzed all documents in this case. You can ask me questions about the dispute, parties, or any specific details from the uploaded documents.",
      timestamp: new Date(),
    }
  ]);
  const [question, setQuestion] = useState('');
  const [selectedIssue, setSelectedIssue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: caseData } = useQuery({
    queryKey: ["/api/cases", caseId],
  });

  const questionMutation = useMutation({
    mutationFn: async (question: string) => {
      return apiRequest('POST', `/api/cases/${caseId}/ai/question`, { question });
    },
    onSuccess: (response) => {
      const data = response.json();
      const newMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'ai',
        content: data.answer,
        timestamp: new Date(),
        sources: data.sources,
      };
      setMessages(prev => [...prev, newMessage]);
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
        description: "Failed to get AI response",
        variant: "destructive",
      });
    },
  });

  const summaryMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', `/api/cases/${caseId}/ai/summary`, {});
    },
    onSuccess: (response) => {
      const data = response.json();
      const newMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'ai',
        content: data.summary,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, newMessage]);
      toast({
        title: "Success",
        description: "Case summary generated successfully",
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
        description: "Failed to generate case summary",
        variant: "destructive",
      });
    },
  });

  const iracMutation = useMutation({
    mutationFn: async (legalIssue: string) => {
      return apiRequest('POST', `/api/cases/${caseId}/ai/irac`, { legalIssue });
    },
    onSuccess: (response) => {
      const data = response.json();
      const newMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'ai',
        content: data.iracAnalysis,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, newMessage]);
      toast({
        title: "Success",
        description: "IRAC analysis generated successfully",
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
        description: "Failed to generate IRAC analysis",
        variant: "destructive",
      });
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if (!question.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: question,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    questionMutation.mutate(question);
    setQuestion('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleGenerateSummary = () => {
    summaryMutation.mutate();
  };

  const handleGenerateIRAC = () => {
    if (!selectedIssue) {
      toast({
        title: "Error",
        description: "Please select a legal issue first",
        variant: "destructive",
      });
      return;
    }
    iracMutation.mutate(selectedIssue);
  };

  const suggestedQuestions = [
    "What are the key terms of the lease agreement?",
    "Summarize the applicant's position",
    "What evidence supports the compensation claim?",
    "What are the main issues in dispute?",
  ];

  const legalIssues = [
    "Exclusive Use Clause",
    "Force Majeure Provisions", 
    "Compensation Claims",
    "Breach of Contract",
    "Lease Termination",
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* AI Chat Interface */}
      <div className="lg:col-span-2">
        <Card className="flex flex-col h-[600px]">
          <div className="bg-gradient-to-r from-purple-500 to-blue-500 p-4 text-white rounded-t-lg">
            <h3 className="text-lg font-semibold flex items-center">
              <i className="fas fa-robot mr-2"></i>
              AI Case Assistant
            </h3>
            <p className="text-sm text-white/90 mt-1">
              Ask questions about case documents using RAG-powered analysis
            </p>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-muted/20">
            {messages.map((message) => (
              <div key={message.id} className="chat-message">
                {message.type === 'ai' ? (
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <i className="fas fa-robot text-white text-sm"></i>
                    </div>
                    <div className="flex-1 bg-card rounded-lg p-4 shadow-sm border border-border">
                      <div className="text-sm text-foreground whitespace-pre-wrap">
                        {message.content}
                      </div>
                      {message.sources && message.sources.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                          <p className="text-xs text-muted-foreground">
                            Sources: {message.sources.join(', ')}
                          </p>
                          <Button variant="link" size="sm" className="text-xs p-0 h-auto">
                            View Sources
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start space-x-3 justify-end">
                    <div className="flex-1 bg-primary rounded-lg p-4 shadow-sm max-w-md ml-auto">
                      <p className="text-sm text-primary-foreground whitespace-pre-wrap">
                        {message.content}
                      </p>
                    </div>
                    <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-semibold text-secondary-foreground">
                        {caseData?.mediatorName?.[0] || 'U'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input */}
          <div className="border-t border-border p-4 bg-card rounded-b-lg">
            <div className="flex items-center space-x-3">
              <Input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask a question about this case..."
                className="flex-1"
                disabled={questionMutation.isPending}
                data-testid="input-ai-question"
              />
              <Button 
                onClick={handleSendMessage}
                disabled={questionMutation.isPending || !question.trim()}
                className="flex items-center space-x-2"
                data-testid="button-send-message"
              >
                <span>{questionMutation.isPending ? 'Thinking...' : 'Send'}</span>
                <i className="fas fa-paper-plane"></i>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              <i className="fas fa-info-circle mr-1"></i>
              Powered by FAISS vector search and GPT-4
            </p>
          </div>
        </Card>
      </div>

      {/* AI Tools Sidebar */}
      <div className="space-y-6">
        {/* Generate Summary */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center">
              <i className="fas fa-file-alt text-primary mr-2"></i>
              Case Summary
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Generate AI-powered neutral summary of the entire case
            </p>
            <Button 
              className="w-full"
              onClick={handleGenerateSummary}
              disabled={summaryMutation.isPending}
              data-testid="button-generate-summary"
            >
              <i className="fas fa-magic mr-2"></i>
              {summaryMutation.isPending ? 'Generating...' : 'Generate Summary'}
            </Button>
          </CardContent>
        </Card>

        {/* IRAC Analysis */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center">
              <i className="fas fa-gavel text-green-500 mr-2"></i>
              IRAC Analysis
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Generate Issue, Rule, Application, Conclusion analysis
            </p>
            <Select value={selectedIssue} onValueChange={setSelectedIssue}>
              <SelectTrigger className="w-full mb-3" data-testid="select-legal-issue">
                <SelectValue placeholder="Select Legal Issue" />
              </SelectTrigger>
              <SelectContent>
                {legalIssues.map((issue) => (
                  <SelectItem key={issue} value={issue}>
                    {issue}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              className="w-full bg-green-500 hover:bg-green-600"
              onClick={handleGenerateIRAC}
              disabled={iracMutation.isPending || !selectedIssue}
              data-testid="button-generate-irac"
            >
              <i className="fas fa-brain mr-2"></i>
              {iracMutation.isPending ? 'Generating...' : 'Generate IRAC'}
            </Button>
          </CardContent>
        </Card>

        {/* Document Insights */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center">
              <i className="fas fa-chart-bar text-blue-500 mr-2"></i>
              Document Insights
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-md">
                <span className="text-sm text-foreground">Total Documents</span>
                <span className="text-sm font-semibold text-foreground" data-testid="text-total-documents">
                  {caseData?.documents?.length || 0}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-md">
                <span className="text-sm text-foreground">AI Processed</span>
                <span className="text-sm font-semibold text-foreground" data-testid="text-processed-documents">
                  {caseData?.documents?.filter((d: any) => d.isProcessed)?.length || 0}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-md">
                <span className="text-sm text-foreground">Issues Identified</span>
                <span className="text-sm font-semibold text-foreground" data-testid="text-issues-count">
                  {caseData?.issuesForDiscussion?.length || 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Suggested Questions */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-3">Suggested Questions</h3>
            <div className="space-y-2">
              {suggestedQuestions.map((suggestedQuestion, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className="w-full text-left justify-start h-auto p-3 whitespace-normal"
                  onClick={() => setQuestion(suggestedQuestion)}
                  data-testid={`button-suggested-question-${index}`}
                >
                  {suggestedQuestion}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
