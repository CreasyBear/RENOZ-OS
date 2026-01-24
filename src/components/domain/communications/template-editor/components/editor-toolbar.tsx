/**
 * Editor Toolbar Component
 *
 * Formatting toolbar for the rich text editor.
 *
 * @see DOM-COMMS-007
 */

'use client';

import {
  Bold,
  Italic,
  Underline,
  Link,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { ToolbarButtonProps } from '../types';

// ============================================================================
// TOOLBAR BUTTON
// ============================================================================

function ToolbarButton({ icon: Icon, label, onClick }: ToolbarButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onClick}
          aria-label={label}
        >
          <Icon className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

// ============================================================================
// EDITOR TOOLBAR
// ============================================================================

interface EditorToolbarProps {
  execCommand: (command: string, value?: string) => void;
}

export function EditorToolbar({ execCommand }: EditorToolbarProps) {
  return (
    <div
      className="bg-muted/30 flex flex-wrap gap-1 rounded-t-md border border-b-0 p-2"
      role="toolbar"
      aria-label="formatting-toolbar"
    >
      <ToolbarButton icon={Bold} label="Bold (Ctrl+B)" onClick={() => execCommand('bold')} />
      <ToolbarButton icon={Italic} label="Italic (Ctrl+I)" onClick={() => execCommand('italic')} />
      <ToolbarButton
        icon={Underline}
        label="Underline (Ctrl+U)"
        onClick={() => execCommand('underline')}
      />
      <div className="bg-border mx-1 h-6 w-px" />
      <ToolbarButton
        icon={AlignLeft}
        label="Align Left"
        onClick={() => execCommand('justifyLeft')}
      />
      <ToolbarButton
        icon={AlignCenter}
        label="Align Center"
        onClick={() => execCommand('justifyCenter')}
      />
      <ToolbarButton
        icon={AlignRight}
        label="Align Right"
        onClick={() => execCommand('justifyRight')}
      />
      <div className="bg-border mx-1 h-6 w-px" />
      <ToolbarButton
        icon={List}
        label="Bullet List"
        onClick={() => execCommand('insertUnorderedList')}
      />
      <ToolbarButton
        icon={ListOrdered}
        label="Numbered List"
        onClick={() => execCommand('insertOrderedList')}
      />
      <div className="bg-border mx-1 h-6 w-px" />
      <ToolbarButton
        icon={Link}
        label="Insert Link"
        onClick={() => {
          const url = prompt('Enter URL:');
          if (url) execCommand('createLink', url);
        }}
      />
    </div>
  );
}
