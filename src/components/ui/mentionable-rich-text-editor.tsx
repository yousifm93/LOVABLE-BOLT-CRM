import { useState, useEffect, useRef, useCallback } from 'react';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface TeamMember {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface MentionableRichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onMentionsChange?: (mentions: TeamMember[]) => void;
}

export function MentionableRichTextEditor({
  value,
  onChange,
  placeholder,
  onMentionsChange,
}: MentionableRichTextEditorProps) {
  const [showMentionPopover, setShowMentionPopover] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<TeamMember[]>([]);
  const [mentions, setMentions] = useState<TeamMember[]>([]);
  const editorRef = useRef<HTMLDivElement>(null);

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

  // Detect @ symbol in content
  const handleContentChange = useCallback((newValue: string) => {
    onChange(newValue);

    // Simple detection of @ symbol followed by text
    const lastAtIndex = newValue.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const afterAt = newValue.substring(lastAtIndex + 1);
      // Check if we're in the middle of typing a mention (no space after @)
      const spaceIndex = afterAt.indexOf(' ');
      const isTypingMention = spaceIndex === -1 || afterAt.length === 0;
      
      // Check if it's a completed mention (has closing tag or identifier)
      const hasCompletedMention = afterAt.includes('</span>') || afterAt.match(/^\w+\s/);
      
      if (isTypingMention && !hasCompletedMention && afterAt.length < 20) {
        setMentionSearch(afterAt.replace(/<[^>]*>/g, '').trim());
        setShowMentionPopover(true);
      } else {
        setShowMentionPopover(false);
      }
    } else {
      setShowMentionPopover(false);
    }
  }, [onChange]);

  const insertMention = (member: TeamMember) => {
    // Find the last @ and replace it with the mention
    const lastAtIndex = value.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const beforeAt = value.substring(0, lastAtIndex);
      const mentionHtml = `<span class="mention" data-user-id="${member.id}" style="color: #2563eb; font-weight: 500;">@${member.first_name} ${member.last_name}</span>&nbsp;`;
      const newValue = beforeAt + mentionHtml;
      onChange(newValue);
      
      // Track this mention
      const newMentions = [...mentions, member];
      setMentions(newMentions);
      onMentionsChange?.(newMentions);
    }
    setShowMentionPopover(false);
    setMentionSearch('');
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase();
  };

  return (
    <div ref={editorRef} className="relative">
      <RichTextEditor
        value={value}
        onChange={handleContentChange}
        placeholder={placeholder}
      />
      
      {/* Mention Dropdown */}
      {showMentionPopover && (
        <div className="absolute bottom-full left-0 mb-1 z-50 w-64 bg-popover border rounded-md shadow-md">
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
    </div>
  );
}