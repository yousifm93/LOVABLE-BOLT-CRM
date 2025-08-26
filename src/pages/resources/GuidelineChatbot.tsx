import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot, MessageCircle } from "lucide-react";

export default function GuidelineChatbot() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Guideline Chatbot</h1>
        <p className="text-muted-foreground">AI-powered mortgage guideline assistance</p>
      </div>

      <Card className="bg-gradient-card shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Bot className="h-5 w-5 mr-2 text-primary" />
            Mortgage Guidelines Assistant
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-start justify-start h-96 pl-4 pt-4">
          <div className="text-left space-y-4">
            <MessageCircle className="h-16 w-16 text-muted-foreground" />
            <p className="text-lg font-medium text-foreground">Guideline Chatbot</p>
            <p className="text-muted-foreground">Coming soon - AI assistant for mortgage guidelines</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}