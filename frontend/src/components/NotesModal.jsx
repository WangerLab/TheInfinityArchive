import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { PenLine, Save, X, Book } from 'lucide-react';

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
    setLocalNotes(notes);
    onClose();
  };

  useEffect(() => {
    setLocalNotes(notes);
  }, [notes]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="oled-panel border-primary/30 bg-black max-w-md mx-4">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center">
              <PenLine className="w-5 h-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="font-display text-base text-primary tracking-wider">
                REMEMBRANCER'S LOG
              </DialogTitle>
              <p className="text-[10px] text-slate-500 tracking-widest font-semibold mt-0.5">
                PERSONAL NOTES
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-lg border border-white/10">
            <Book className="w-4 h-4 text-primary/60" />
            <span className="text-sm text-slate-200 font-medium truncate">
              {bookTitle}
            </span>
          </div>
        </DialogHeader>

        <div className="py-4">
          <Textarea
            value={localNotes}
            onChange={(e) => setLocalNotes(e.target.value)}
            placeholder="Record your thoughts, memorable quotes, or analysis..."
            className={cn(
              "min-h-[180px] font-sans text-base",
              "bg-black border-white/10 focus:border-primary/50",
              "placeholder:text-slate-600",
              "text-slate-100",
              "resize-none"
            )}
          />
          <div className="flex justify-between items-center mt-2">
            <span className="text-[10px] text-slate-600 font-mono">
              {localNotes.length} CHARACTERS
            </span>
            <span className="text-[10px] text-slate-600 font-semibold tracking-wider">
              SAVED LOCALLY
            </span>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleClose}
            className="flex-1 h-12 border-white/20 hover:border-destructive/50 hover:text-destructive bg-transparent"
          >
            <X className="w-4 h-4 mr-2" />
            <span className="font-semibold">CANCEL</span>
          </Button>
          <Button
            onClick={handleSave}
            className="flex-1 h-12 bg-primary hover:bg-primary/90 text-black font-semibold"
          >
            <Save className="w-4 h-4 mr-2" />
            <span>SAVE</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NotesModal;
