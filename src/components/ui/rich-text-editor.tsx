import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Color from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import Highlight from '@tiptap/extension-highlight';
import { Bold, Italic, UnderlineIcon, List, ListOrdered, CheckSquare, Palette, Highlighter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function RichTextEditor({ value, onChange, placeholder, className }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Color,
      TextStyle,
      Highlight.configure({
        multicolor: true,
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[200px] px-3 py-2',
      },
    },
  });

  if (!editor) {
    return null;
  }

  const textColors = [
    { label: 'Black', value: '#000000' },
    { label: 'Red', value: '#ef4444' },
    { label: 'Orange', value: '#f97316' },
    { label: 'Yellow', value: '#eab308' },
    { label: 'Green', value: '#22c55e' },
    { label: 'Blue', value: '#3b82f6' },
    { label: 'Purple', value: '#a855f7' },
    { label: 'Gray', value: '#6b7280' },
  ];

  const highlightColors = [
    { label: 'Yellow', value: '#fef08a' },
    { label: 'Green', value: '#bbf7d0' },
    { label: 'Blue', value: '#bfdbfe' },
    { label: 'Red', value: '#fecaca' },
    { label: 'Orange', value: '#fed7aa' },
    { label: 'Purple', value: '#e9d5ff' },
  ];

  return (
    <div className={cn('rounded-md border border-input bg-background', className)}>
      <div className="flex items-center gap-1 border-b border-border p-2">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={cn(
            'p-2 rounded hover:bg-accent',
            editor.isActive('bold') && 'bg-accent'
          )}
          title="Bold (Ctrl+B)"
        >
          <Bold className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={cn(
            'p-2 rounded hover:bg-accent',
            editor.isActive('italic') && 'bg-accent'
          )}
          title="Italic (Ctrl+I)"
        >
          <Italic className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={cn(
            'p-2 rounded hover:bg-accent',
            editor.isActive('underline') && 'bg-accent'
          )}
          title="Underline (Ctrl+U)"
        >
          <UnderlineIcon className="h-4 w-4" />
        </button>
        <div className="w-px h-6 bg-border mx-1" />
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={cn(
            'p-2 rounded hover:bg-accent',
            editor.isActive('bulletList') && 'bg-accent'
          )}
          title="Bullet List"
        >
          <List className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={cn(
            'p-2 rounded hover:bg-accent',
            editor.isActive('orderedList') && 'bg-accent'
          )}
          title="Numbered List"
        >
          <ListOrdered className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          className={cn(
            'p-2 rounded hover:bg-accent',
            editor.isActive('taskList') && 'bg-accent'
          )}
          title="Checklist"
        >
          <CheckSquare className="h-4 w-4" />
        </button>
        <div className="w-px h-6 bg-border mx-1" />
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                'p-2 rounded hover:bg-accent',
                editor.isActive('textStyle') && 'bg-accent'
              )}
              title="Text Color"
            >
              <Palette className="h-4 w-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2">
            <div className="flex flex-col gap-2">
              <div className="text-xs font-medium mb-1">Text Color</div>
              <div className="grid grid-cols-4 gap-1">
                {textColors.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => editor.chain().focus().setColor(color.value).run()}
                    className={cn(
                      'w-8 h-8 rounded border-2 hover:scale-110 transition-transform',
                      editor.isActive('textStyle', { color: color.value }) ? 'border-primary' : 'border-transparent'
                    )}
                    style={{ backgroundColor: color.value }}
                    title={color.label}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => editor.chain().focus().unsetColor().run()}
                className="text-xs text-muted-foreground hover:text-foreground mt-1"
              >
                Reset Color
              </button>
            </div>
          </PopoverContent>
        </Popover>
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                'p-2 rounded hover:bg-accent',
                editor.isActive('highlight') && 'bg-accent'
              )}
              title="Highlight"
            >
              <Highlighter className="h-4 w-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2">
            <div className="flex flex-col gap-2">
              <div className="text-xs font-medium mb-1">Highlight Color</div>
              <div className="grid grid-cols-3 gap-1">
                {highlightColors.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => editor.chain().focus().setHighlight({ color: color.value }).run()}
                    className={cn(
                      'w-8 h-8 rounded border-2 hover:scale-110 transition-transform',
                      editor.isActive('highlight', { color: color.value }) ? 'border-primary' : 'border-border'
                    )}
                    style={{ backgroundColor: color.value }}
                    title={color.label}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => editor.chain().focus().unsetHighlight().run()}
                className="text-xs text-muted-foreground hover:text-foreground mt-1"
              >
                Remove Highlight
              </button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
