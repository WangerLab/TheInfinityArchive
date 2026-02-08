import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { BookOpen, PenTool, Save, X } from 'lucide-react';

export const NotesModal = ({
  isOpen,
  onClose,
  bookTitle,
  notes = '',
  onNotesChange
}) => {
  const [localNotes, setLocalNotes] = useState(notes);

  const handleSave = () => {
    onNotesChange(localNotes);
    onClose();
  };

  const handleClose = () => {
    setLocalNotes(notes); // Reset to original
    onClose();
  };

  // Update local state when notes prop changes
  React.useEffect(() => {
    setLocalNotes(notes);
  }, [notes]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="panel-cogitator border-gold/30 bg-card max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-8 w-8 rounded-sm bg-gold/10 border border-gold/30 flex items-center justify-center">
              <PenTool className="h-4 w-4 text-gold" />
            </div>
            <div>
              <DialogTitle className="font-display text-base text-gold tracking-wider">
                REMEMBRANCER'S LOG
              </DialogTitle>
              <p className="font-tactical text-[9px] text-muted-foreground tracking-widest">
                PERSONAL ANNOTATIONS
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 rounded-sm border border-border/30">
            <BookOpen className="h-4 w-4 text-gold/60" />
            <span className="font-data text-sm text-foreground/90 line-clamp-1">
              {bookTitle}
            </span>
          </div>
        </DialogHeader>

        <div className="py-4">
          <Textarea
            value={localNotes}
            onChange={(e) => setLocalNotes(e.target.value)}
            placeholder="Record your thoughts, memorable quotes, or analysis here..."
            className={cn(
              "min-h-[200px] font-data text-sm",
              "bg-void/50 border-border/30 focus:border-gold/50",
              "placeholder:text-muted-foreground/30 placeholder:font-data",
              "resize-none"
            )}
          />
          <div className="flex justify-between items-center mt-2">
            <span className="font-tactical text-[8px] text-muted-foreground/50 tracking-wider">
              {localNotes.length} CHARACTERS
            </span>
            <span className="font-tactical text-[8px] text-muted-foreground/50 tracking-wider">
              DATA PERSISTS LOCALLY
            </span>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            className="border-border/50 hover:border-destructive/50 hover:text-destructive"
          >
            <X className="h-4 w-4 mr-2" />
            <span className="font-tactical text-xs tracking-wider">CANCEL</span>
          </Button>
          <Button
            onClick={handleSave}
            className="bg-gold/20 border border-gold/50 text-gold hover:bg-gold/30"
          >
            <Save className="h-4 w-4 mr-2" />
            <span className="font-tactical text-xs tracking-wider">SAVE LOG</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NotesModal;
