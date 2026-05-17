import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { ProjectFilesGrid } from '@/components/jobs/presentation/files/ProjectFilesGrid';
import type { ProjectFile } from '@/lib/schemas/jobs';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

function makeProjectFile(overrides: Partial<ProjectFile>): ProjectFile {
  return {
    id: 'file-1',
    organizationId: 'org-1',
    projectId: 'project-1',
    fileUrl: 'https://example.com/files/default.pdf',
    fileName: 'Default file.pdf',
    fileSize: 2048,
    mimeType: 'application/pdf',
    fileType: 'other',
    description: null,
    siteVisitId: null,
    position: 0,
    createdAt: new Date('2026-01-02T00:00:00Z'),
    updatedAt: new Date('2026-01-02T00:00:00Z'),
    createdBy: null,
    updatedBy: null,
    ...overrides,
  };
}

describe('ProjectFilesGrid preview classification', () => {
  it('renders image thumbnails when project file mime type is image/*', () => {
    render(
      <ProjectFilesGrid
        files={[
          makeProjectFile({
            fileUrl: 'https://example.com/files/site-photo.jpg',
            fileName: 'Site battery install.jpg',
            mimeType: 'image/jpeg',
            fileType: 'photo',
          }),
        ]}
      />
    );

    const image = screen.getByRole('img', { name: 'Site battery install.jpg' });

    expect(image).toHaveAttribute('src', 'https://example.com/files/site-photo.jpg');
  });

  it('keeps non-image files on icon thumbnails', () => {
    render(
      <ProjectFilesGrid
        files={[
          makeProjectFile({
            fileName: 'System commissioning.pdf',
            mimeType: 'application/pdf',
            fileType: 'report',
          }),
        ]}
      />
    );

    expect(screen.queryByRole('img', { name: 'System commissioning.pdf' })).not.toBeInTheDocument();
    expect(screen.getByText('PDF')).toBeInTheDocument();
  });

  it('keeps project file preview classification behind mime type helpers', () => {
    const source = read('src/components/jobs/presentation/files/ProjectFilesGrid.tsx');

    expect(source).toContain("return file.mimeType?.startsWith('image/') === true;");
    expect(source).toContain("return file.mimeType?.includes('pdf') === true;");
    expect(source).toContain('const isImage = isProjectFileImage(file);');
    expect(source).not.toContain('TODO: Detect from mimeType when properly stored');
    expect(source).not.toContain('const isImage = false');
  });
});
