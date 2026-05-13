import { CheckCircle2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export interface ProjectTaskCompletionCtaProps {
  onCompleteProjectClick: () => void;
}

export function ProjectTaskCompletionCta({
  onCompleteProjectClick,
}: ProjectTaskCompletionCtaProps) {
  return (
    <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30">
      <CardContent className="p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-500" />
          <div>
            <p className="font-medium text-green-900 dark:text-green-100">
              All tasks complete
            </p>
            <p className="text-sm text-green-700 dark:text-green-300">
              Ready to complete this project?
            </p>
          </div>
        </div>
        <Button onClick={onCompleteProjectClick} size="sm">
          <CheckCircle2 className="mr-2 h-4 w-4" />
          Complete project
        </Button>
      </CardContent>
    </Card>
  );
}
