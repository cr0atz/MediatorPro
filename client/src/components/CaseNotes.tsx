import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { CaseNote } from "@shared/schema";

interface CaseNotesProps {
  caseId: string;
}

export default function CaseNotes({ caseId }: CaseNotesProps) {
  const { toast } = useToast();
  const [noteContent, setNoteContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ["/api/cases", caseId, "notes"],
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
        description: "Failed to fetch case notes",
        variant: "destructive",
      });
    },
  });

  const saveNoteMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest('POST', `/api/cases/${caseId}/notes`, { content });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Case note saved successfully",
      });
      setNoteContent('');
      queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId, "notes"] });
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
        description: "Failed to save case note",
        variant: "destructive",
      });
    },
  });

  const handleSaveNote = () => {
    if (!noteContent.trim()) {
      toast({
        title: "Error",
        description: "Please enter some content for the note",
        variant: "destructive",
      });
      return;
    }
    saveNoteMutation.mutate(noteContent.trim());
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatText = (text: string) => {
    return text.split('\n').map((line, index) => (
      <span key={index}>
        {line}
        {index < text.split('\n').length - 1 && <br />}
      </span>
    ));
  };

  const applyFormatting = (format: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = noteContent.substring(start, end);
    
    let formattedText = selectedText;
    switch (format) {
      case 'bold':
        formattedText = `**${selectedText}**`;
        break;
      case 'italic':
        formattedText = `*${selectedText}*`;
        break;
      case 'underline':
        formattedText = `__${selectedText}__`;
        break;
      default:
        return;
    }

    const newContent = noteContent.substring(0, start) + formattedText + noteContent.substring(end);
    setNoteContent(newContent);
    
    // Set focus back to textarea and restore selection
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start, start + formattedText.length);
    }, 0);
  };

  return (
    <div>
      {/* Rich Text Editor */}
      <Card className="mb-8">
        <div className="editor-toolbar border-b border-border p-3 flex items-center space-x-2 bg-card rounded-t-lg">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => applyFormatting('bold')}
            title="Bold"
            data-testid="button-format-bold"
          >
            <i className="fas fa-bold text-sm"></i>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => applyFormatting('italic')}
            title="Italic"
            data-testid="button-format-italic"
          >
            <i className="fas fa-italic text-sm"></i>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => applyFormatting('underline')}
            title="Underline"
            data-testid="button-format-underline"
          >
            <i className="fas fa-underline text-sm"></i>
          </Button>
          <div className="w-px h-6 bg-border"></div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              const textarea = textareaRef.current;
              if (!textarea) return;
              const start = textarea.selectionStart;
              const end = textarea.selectionEnd;
              const newContent = noteContent.substring(0, start) + '\n• ' + noteContent.substring(end);
              setNoteContent(newContent);
              setTimeout(() => {
                textarea.focus();
                textarea.setSelectionRange(start + 3, start + 3);
              }, 0);
            }}
            title="Bullet List"
            data-testid="button-format-bullet"
          >
            <i className="fas fa-list-ul text-sm"></i>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              const textarea = textareaRef.current;
              if (!textarea) return;
              const start = textarea.selectionStart;
              const end = textarea.selectionEnd;
              const newContent = noteContent.substring(0, start) + '\n1. ' + noteContent.substring(end);
              setNoteContent(newContent);
              setTimeout(() => {
                textarea.focus();
                textarea.setSelectionRange(start + 4, start + 4);
              }, 0);
            }}
            title="Numbered List"
            data-testid="button-format-numbered"
          >
            <i className="fas fa-list-ol text-sm"></i>
          </Button>
          <div className="flex-1"></div>
          <Button
            onClick={handleSaveNote}
            disabled={saveNoteMutation.isPending || !noteContent.trim()}
            className="text-sm"
            data-testid="button-save-note"
          >
            {saveNoteMutation.isPending ? 'Saving...' : 'Save Note'}
          </Button>
        </div>
        <CardContent className="p-6">
          <Textarea
            ref={textareaRef}
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            placeholder="Add your private case notes here... These notes are confidential and only visible to you."
            className="min-h-[400px] resize-none focus:ring-2 focus:ring-primary"
            data-testid="textarea-note-content"
          />
        </CardContent>
      </Card>

      {/* Previous Notes */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">Previous Notes</h3>
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : notes.length === 0 ? (
          <div className="text-center p-8" data-testid="text-no-notes">
            <i className="fas fa-sticky-note text-muted-foreground text-4xl mb-4"></i>
            <p className="text-foreground font-medium">No case notes yet</p>
            <p className="text-muted-foreground text-sm">Add your first private note above</p>
          </div>
        ) : (
          <div className="space-y-4" data-testid="list-case-notes">
            {notes.map((note: CaseNote, index: number) => (
              <Card key={note.id} className="border-l-4 border-l-primary">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground" data-testid={`text-note-date-${index}`}>
                      {formatDate(note.createdAt)}
                    </span>
                    <Button size="sm" variant="ghost">
                      <i className="fas fa-ellipsis-v"></i>
                    </Button>
                  </div>
                  <div className="text-sm text-foreground" data-testid={`text-note-content-${index}`}>
                    {formatText(note.content)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
