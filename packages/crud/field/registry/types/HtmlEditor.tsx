import React, { useCallback, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';

interface HtmlEditorProps {
  id?: string;
  name?: string;
  value: string;
  disabled?: boolean;
  readOnly?: boolean;
  hasError?: boolean;
  onChange: (html: string) => void;
}

interface ToolbarButtonProps {
  active?: boolean;
  disabled?: boolean;
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}

function ToolbarButton({ active, disabled, title, onClick, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      className={`nb-html-editor__btn${active ? ' nb-html-editor__btn--active' : ''}`}
      onMouseDown={(e) => {
        // Prevent the editor from losing focus on toolbar click
        e.preventDefault();
        onClick();
      }}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <span className="nb-html-editor__divider" aria-hidden />;
}

export function HtmlEditor({ id, name, value, disabled, readOnly, hasError, onChange }: HtmlEditorProps) {
  const editable = !disabled && !readOnly;

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false, autolink: true }),
    ],
    content: value,
    editable,
    onUpdate: ({ editor: e }) => {
      const html = e.isEmpty ? '' : e.getHTML();
      onChange(html);
    },
  });

  // Sync external value changes (e.g. form reset, programmatic setFieldValue)
  useEffect(() => {
    if (!editor) return;
    const current = editor.isEmpty ? '' : editor.getHTML();
    if (current !== value) {
      editor.commands.setContent(value ?? '');
    }
  }, [value, editor]);

  // Sync editable flag
  useEffect(() => {
    editor?.setEditable(editable);
  }, [editable, editor]);

  const handleLinkToggle = useCallback(() => {
    if (!editor) return;
    if (editor.isActive('link')) {
      editor.chain().focus().unsetLink().run();
    } else {
      const url = window.prompt('URL');
      if (url) editor.chain().focus().setLink({ href: url }).run();
    }
  }, [editor]);

  const errorClass = hasError ? ' nb-html-editor--error' : '';

  return (
    <div className={`nb-html-editor${errorClass}${!editable ? ' nb-html-editor--readonly' : ''}`}>
      {editable && (
        <div className="nb-html-editor__toolbar" role="toolbar" aria-label="Text formatting">
          <ToolbarButton
            title="Bold (Ctrl+B)"
            active={editor?.isActive('bold')}
            onClick={() => editor?.chain().focus().toggleBold().run()}
          >
            <strong>B</strong>
          </ToolbarButton>
          <ToolbarButton
            title="Italic (Ctrl+I)"
            active={editor?.isActive('italic')}
            onClick={() => editor?.chain().focus().toggleItalic().run()}
          >
            <em>I</em>
          </ToolbarButton>
          <ToolbarButton
            title="Strikethrough"
            active={editor?.isActive('strike')}
            onClick={() => editor?.chain().focus().toggleStrike().run()}
          >
            <s>S</s>
          </ToolbarButton>

          <ToolbarDivider />

          <ToolbarButton
            title="Heading 2"
            active={editor?.isActive('heading', { level: 2 })}
            onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
          >
            H2
          </ToolbarButton>
          <ToolbarButton
            title="Heading 3"
            active={editor?.isActive('heading', { level: 3 })}
            onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
          >
            H3
          </ToolbarButton>

          <ToolbarDivider />

          <ToolbarButton
            title="Bullet list"
            active={editor?.isActive('bulletList')}
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
          >
            ≡
          </ToolbarButton>
          <ToolbarButton
            title="Ordered list"
            active={editor?.isActive('orderedList')}
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          >
            1.
          </ToolbarButton>

          <ToolbarDivider />

          <ToolbarButton
            title="Blockquote"
            active={editor?.isActive('blockquote')}
            onClick={() => editor?.chain().focus().toggleBlockquote().run()}
          >
            &ldquo;
          </ToolbarButton>
          <ToolbarButton
            title={editor?.isActive('link') ? 'Remove link' : 'Add link'}
            active={editor?.isActive('link')}
            onClick={handleLinkToggle}
          >
            🔗
          </ToolbarButton>

          <ToolbarDivider />

          <ToolbarButton
            title="Undo (Ctrl+Z)"
            disabled={!editor?.can().undo()}
            onClick={() => editor?.chain().focus().undo().run()}
          >
            ↩
          </ToolbarButton>
          <ToolbarButton
            title="Redo (Ctrl+Y)"
            disabled={!editor?.can().redo()}
            onClick={() => editor?.chain().focus().redo().run()}
          >
            ↪
          </ToolbarButton>
        </div>
      )}

      {/* Hidden input so the field participates in native form serialization */}
      <input type="hidden" id={id} name={name} value={value} readOnly />

      <EditorContent
        editor={editor}
        className="nb-html-editor__content"
      />
    </div>
  );
}
