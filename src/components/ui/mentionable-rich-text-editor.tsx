import { useState, useEffect, useRef, useCallback } from 'react';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';

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

    // Strip HTML tags to get plain text for @ detection
    const plainText = newValue.replace(/<[^>]*>/g, '');
    const lastAtIndex = plainText.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const afterAt = plainText.substring(lastAtIndex + 1);
      // Check if we're in the middle of typing a mention (no space after @)
      const spaceIndex = afterAt.indexOf(' ');
      const newlineIndex = afterAt.indexOf('\n');
      const firstBreak = Math.min(
        spaceIndex === -1 ? Infinity : spaceIndex,
        newlineIndex === -1 ? Infinity : newlineIndex
      );
      
      // Get the search text (characters between @ and next space/newline)
      const searchText = afterAt.substring(0, firstBreak === Infinity ? afterAt.length : firstBreak);
      
      // Only show popover if we're actively typing after @ and text is short
      if (searchText.length < 20) {
        // Check if this specific @ is NOT already inside a completed mention span
        // Find the position of the last @ in the HTML and check context
        const atPositionInHtml = newValue.lastIndexOf('@');
        if (atPositionInHtml !== -1) {
          const precedingHtml = newValue.substring(Math.max(0, atPositionInHtml - 100), atPositionInHtml);
          const isInsideMentionSpan = precedingHtml.includes('<span class="mention"') && 
                                       !precedingHtml.includes('</span>');
          
          if (!isInsideMentionSpan) {
            setMentionSearch(searchText.trim());
            setShowMentionPopover(true);
          } else {
            setShowMentionPopover(false);
          }
        } else {
          setShowMentionPopover(false);
        }
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
      
      {/* Mention dropdown - positioned below toolbar area */}
      {showMentionPopover && (
        <div 
          className="absolute left-2 z-[9999] w-64 bg-popover border border-border rounded-md shadow-lg"
          style={{ top: '50px' }}
        >
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
