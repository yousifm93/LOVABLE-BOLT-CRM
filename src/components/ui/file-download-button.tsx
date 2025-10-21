import { Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatFileName } from "@/utils/formatters";

interface FileDownloadButtonProps {
  filePath: string | null | undefined;
  onDownload?: () => void;
}

export function FileDownloadButton({ filePath, onDownload }: FileDownloadButtonProps) {
  if (!filePath) {
    return <span className="text-muted-foreground text-sm">-</span>;
  }

  const fileName = formatFileName(filePath);

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={(e) => {
        e.stopPropagation();
        if (onDownload) {
          onDownload();
        } else {
          // Default behavior: open file in new tab
          window.open(filePath, '_blank');
        }
      }}
      className="h-8 gap-2 text-xs"
    >
      <FileText className="h-3 w-3" />
      {fileName}
      <Download className="h-3 w-3" />
    </Button>
  );
}
