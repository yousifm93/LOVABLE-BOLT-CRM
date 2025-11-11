import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { X, ExternalLink } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DebugScreenshot {
  step: string;
  description: string;
  url: string;
  timestamp: string;
}

interface DebugHTML {
  step: string;
  description: string;
  url: string;
  timestamp: string;
}

interface ButtonScanResult {
  index: number;
  tag: string;
  text: string;
  type?: string;
  className: string;
  id?: string;
  visible: boolean;
  enabled: boolean;
}

interface DebugViewerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  screenshots?: DebugScreenshot[];
  htmlSnapshots?: DebugHTML[];
  buttonScanResults?: ButtonScanResult[];
  debugLogs?: string[];
  errorMessage?: string;
}

export function DebugViewerModal({
  open,
  onOpenChange,
  screenshots,
  htmlSnapshots,
  buttonScanResults,
  debugLogs,
  errorMessage
}: DebugViewerModalProps) {
  const ss = Array.isArray(screenshots) ? screenshots : [];
  const hs = Array.isArray(htmlSnapshots) ? htmlSnapshots : [];
  const bs = Array.isArray(buttonScanResults) ? buttonScanResults : [];
  const dl = Array.isArray(debugLogs) ? debugLogs : [];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Debug Data Viewer</span>
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="screenshots" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="screenshots">
              Screenshots ({ss.length})
            </TabsTrigger>
            <TabsTrigger value="html">
              HTML Snapshots ({hs.length})
            </TabsTrigger>
            <TabsTrigger value="buttons">
              Button Scan ({bs.length})
            </TabsTrigger>
            <TabsTrigger value="logs">
              Debug Logs
            </TabsTrigger>
          </TabsList>

          {/* Screenshots Tab */}
          <TabsContent value="screenshots" className="mt-4">
            <ScrollArea className="h-[60vh]">
              {ss.length === 0 ? (
                <Card className="p-8 text-center text-muted-foreground">
                  No screenshots available. Enable debug mode when creating a pricing run.
                </Card>
              ) : (
                <div className="space-y-4">
                  {ss.map((screenshot, idx) => (
                    <Card key={idx} className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <Badge variant="outline">{screenshot.step}</Badge>
                          <p className="text-sm font-medium mt-1">{screenshot.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(screenshot.timestamp).toLocaleString()}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(screenshot.url, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                      <img
                        src={screenshot.url}
                        alt={screenshot.description}
                        className="w-full rounded border cursor-pointer hover:opacity-90"
                        onClick={() => window.open(screenshot.url, '_blank')}
                      />
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* HTML Snapshots Tab */}
          <TabsContent value="html" className="mt-4">
            <ScrollArea className="h-[60vh]">
              {hs.length === 0 ? (
                <Card className="p-8 text-center text-muted-foreground">
                  No HTML snapshots available.
                </Card>
              ) : (
                <div className="space-y-3">
                  {hs.map((html, idx) => (
                    <Card key={idx} className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Badge variant="outline">{html.step}</Badge>
                          <p className="text-sm font-medium mt-1">{html.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(html.timestamp).toLocaleString()}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(html.url, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          View HTML
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Button Scan Tab */}
          <TabsContent value="buttons" className="mt-4">
            <ScrollArea className="h-[60vh]">
              {bs.length === 0 ? (
                <Card className="p-8 text-center text-muted-foreground">
                  No button scan data available. This is captured when "View Rates" button fails.
                </Card>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground mb-4">
                    {bs.length} buttons found on page when "View Rates" button failed:
                  </p>
                  {bs.map((button) => (
                    <Card key={button.index} className="p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="secondary">{button.tag}</Badge>
                            {button.type && <Badge variant="outline">{button.type}</Badge>}
                            {!button.visible && <Badge variant="destructive">Hidden</Badge>}
                            {!button.enabled && <Badge variant="destructive">Disabled</Badge>}
                          </div>
                          <p className="text-sm font-mono">{button.text || '(no text)'}</p>
                          {button.className && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Class: {button.className}
                            </p>
                          )}
                          {button.id && (
                            <p className="text-xs text-muted-foreground">
                              ID: {button.id}
                            </p>
                          )}
                        </div>
                        <Badge variant="outline" className="ml-2">
                          #{button.index}
                        </Badge>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Debug Logs Tab */}
          <TabsContent value="logs" className="mt-4">
            <ScrollArea className="h-[60vh]">
              {errorMessage && (
                <Card className="p-4 mb-4 bg-destructive/10 border-destructive/20">
                  <p className="text-sm font-semibold text-destructive mb-2">Error Message:</p>
                  <p className="text-sm font-mono">{errorMessage}</p>
                </Card>
              )}
              {dl.length === 0 ? (
                <Card className="p-8 text-center text-muted-foreground">
                  No debug logs available.
                </Card>
              ) : (
                <Card className="p-4 bg-muted/30">
                  <pre className="text-xs font-mono whitespace-pre-wrap">
                    {dl.join('\n')}
                  </pre>
                </Card>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
