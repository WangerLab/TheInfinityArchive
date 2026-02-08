import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Feather, Save, X, BookOpen } from 'lucide-react';

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
      <DialogContent className="grimdark-panel border-gold/40 bg-card max-w-md mx-4">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-11 h-11 rounded-lg bg-gold/10 border border-gold/40 flex items-center justify-center glow-gold">
              <Feather className="w-5 h-5 text-gold" />
            </div>
            <div>
              <DialogTitle className="font-display text-base text-gold tracking-wider text-glow-gold">
                REMEMBRANCER'S LOG
              </DialogTitle>
              <p className="text-[10px] text-slate-400 tracking-[0.2em] font-semibold mt-0.5">
                PERSONAL ANNOTATIONS
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 px-3 py-2.5 bg-black/40 rounded-lg border border-gold/20">
            <BookOpen className="w-4 h-4 text-gold/60 shrink-0" />
            <span className="text-sm text-slate-100 font-semibold truncate">
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
              "min-h-[200px] font-data text-sm",
              "bg-black/50 border-gold/20 focus:border-gold/50",
              "placeholder:text-slate-600",
              "text-slate-100 font-medium",
              "resize-none"
            )}
          />
          <div className="flex justify-between items-center mt-2">
            <span className="text-[10px] text-slate-500 font-data">
              {localNotes.length} CHARACTERS
            </span>
            <span className="text-[10px] text-gold/50 font-tactical tracking-widest">
              LOCAL STORAGE
            </span>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleClose}
            className="flex-1 h-12 border-slate-700 hover:border-destructive/50 hover:text-destructive bg-transparent font-semibold"
          >
            <X className="w-4 h-4 mr-2" />
            CANCEL
          </Button>
          <Button
            onClick={handleSave}
            className="flex-1 h-12 bg-gold hover:bg-gold/90 text-black font-bold tracking-wider"
          >
            <Save className="w-4 h-4 mr-2" />
            SAVE LOG
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NotesModal;
