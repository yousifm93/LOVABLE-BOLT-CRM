import * as React from "react";
import { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import DOMPurify from 'dompurify';

interface TeamMember {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface MentionableInlineEditNotesProps {
  value: string | null;
  onValueChange: (value: string) => void;
  contextType?: 'lead' | 'lender' | 'agent' | 'contact' | 'task';
  contextId?: string;
  contextName?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  maxLength?: number;
}

export function MentionableInlineEditNotes({
  value,
  onValueChange,
  contextType,
  contextId,
  contextName,
  placeholder = "Add notes... (use @ to mention)",
  className,
  disabled = false,
  maxLength = 2000
}: MentionableInlineEditNotesProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || "");
  const [showMentionPopover, setShowMentionPopover] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<TeamMember[]>([]);
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load team members on mount
  useEffect(() => {
    const loadTeamMembers = async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, email')
        .eq('is_active', true)
        .order('first_name');
      
      if (!error && data) {
        setTeamMembers(data);
        setFilteredMembers(data);
      }
    };
    loadTeamMembers();
  }, []);

  // Filter members based on search
  useEffect(() => {
    if (mentionSearch) {
      const search = mentionSearch.toLowerCase();
      const filtered = teamMembers.filter(member =>
        member.first_name.toLowerCase().includes(search) ||
        member.last_name.toLowerCase().includes(search) ||
        member.email.toLowerCase().includes(search)
      );
      setFilteredMembers(filtered);
    } else {
      setFilteredMembers(teamMembers);
    }
  }, [mentionSearch, teamMembers]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    setEditValue(newValue);
    setCursorPosition(cursorPos);

    // Detect @ symbol
    const textBeforeCursor = newValue.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const afterAt = textBeforeCursor.substring(lastAtIndex + 1);
      // Check if we're in the middle of typing a mention (no space after @)
      const hasSpace = afterAt.includes(' ');
      
      if (!hasSpace && afterAt.length < 20) {
        setMentionSearch(afterAt);
        setShowMentionPopover(true);
      } else {
        setShowMentionPopover(false);
      }
    } else {
      setShowMentionPopover(false);
    }
  };

  const insertMention = useCallback(async (member: TeamMember) => {
    const textBeforeCursor = editValue.substring(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const beforeAt = editValue.substring(0, lastAtIndex);
      const afterCursor = editValue.substring(cursorPosition);
      const mentionText = `@${member.first_name} ${member.last_name}`;
      const newValue = beforeAt + mentionText + ' ' + afterCursor;
      
      setEditValue(newValue);
      setShowMentionPopover(false);
      setMentionSearch('');

      // Focus back on textarea
      setTimeout(() => {
        textareaRef.current?.focus();
        const newCursorPos = beforeAt.length + mentionText.length + 1;
        textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    }
  }, [editValue, cursorPosition]);

  const handleSave = async () => {
    onValueChange(editValue);
    setIsEditing(false);

    // Parse mentions and send notifications
    const mentionPattern = /@(\w+)\s+(\w+)/g;
    let match;
    const mentionedNames: string[] = [];
    
    while ((match = mentionPattern.exec(editValue)) !== null) {
      mentionedNames.push(`${match[1]} ${match[2]}`);
    }

    // Find mentioned team members and send notifications
    const mentionedMembers = teamMembers.filter(member => 
      mentionedNames.some(name => 
        `${member.first_name} ${member.last_name}`.toLowerCase() === name.toLowerCase()
      )
    );

    if (mentionedMembers.length > 0 && contextType && contextId) {
      try {
        await supabase.functions.invoke('send-mention-notification', {
          body: {
            mentionedUserIds: mentionedMembers.map(m => m.id),
            contextType,
            contextId,
            contextName: contextName || 'a record',
            commentText: editValue.substring(0, 200),
          }
        });
      } catch (error) {
        console.error('Error sending mention notifications:', error);
      }
    }
  };

  const handleCancel = () => {
    setEditValue(value || "");
    setIsEditing(false);
    setShowMentionPopover(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancel();
    }
    // Ctrl/Cmd + Enter to save
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      handleSave();
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase();
  };

  // Render display value with highlighted mentions
  const renderDisplayValue = (text: string) => {
    if (!text) return null;
    
    // Highlight @mentions
    const mentionPattern = /@(\w+\s+\w+)/g;
    const parts = text.split(mentionPattern);
    
    return parts.map((part, i) => {
      if (i % 2 === 1) {
        return (
          <span key={i} className="text-primary font-medium">
            @{part}
          </span>
        );
      }
      return part;
    });
  };

  if (disabled) {
    return (
      <div 
        className={cn("text-sm leading-tight p-1 rounded-md bg-muted/30 line-clamp-2 overflow-hidden w-full break-words", className)}
        title={value || undefined}
      >
        {value ? renderDisplayValue(value) : <span className="text-muted-foreground">{placeholder}</span>}
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="relative flex flex-col gap-2">
        <Textarea
          ref={textareaRef}
          value={editValue}
          onChange={handleTextChange}
          onBlur={() => {
            // Delay to allow click on mention popover
            setTimeout(() => {
              if (!showMentionPopover) {
                handleSave();
              }
            }, 200);
          }}
          onKeyDown={handleKeyDown}
          className={cn("min-h-[100px] max-h-[250px] resize-y overflow-y-auto", className)}
          placeholder={placeholder}
          maxLength={maxLength}
          autoFocus
        />
        
        {/* Mention Dropdown */}
        {showMentionPopover && (
          <div className="absolute top-full left-0 mt-1 z-50 w-64 bg-popover border rounded-md shadow-md">
            <Command>
              <CommandList>
                <CommandEmpty>No team members found.</CommandEmpty>
                <CommandGroup heading="Team Members">
                  {filteredMembers.slice(0, 5).map((member) => (
                    <CommandItem
                      key={member.id}
                      value={`${member.first_name} ${member.last_name}`}
                      onSelect={() => insertMention(member)}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                          {getInitials(member.first_name, member.last_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {member.first_name} {member.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {member.email}
                        </p>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </div>
        )}
        
        <div className="flex items-center justify-between text-xs text-muted-foreground bg-background py-1">
          <span>Press Ctrl+Enter to save, Esc to cancel • Type @ to mention</span>
          <span>{editValue.length}/{maxLength}</span>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        setIsEditing(true);
        setEditValue(value || "");
      }}
      className={cn(
        "text-sm text-left leading-tight w-full p-1 rounded-md hover:bg-muted/50 transition-colors border border-transparent hover:border-border line-clamp-2 overflow-hidden break-words",
        className
      )}
      title={value || undefined}
    >
      {value ? renderDisplayValue(value) : <span className="text-muted-foreground">{placeholder}</span>}
    </button>
  );
}
