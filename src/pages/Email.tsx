export default function Email() {
  return (
    <div className="h-full w-full">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-foreground">Email</h1>
        <p className="text-sm text-muted-foreground">Front.com email client integration</p>
      </div>
      
      <div className="w-full h-[calc(100vh-200px)] border border-border rounded-lg overflow-hidden bg-card">
        <iframe
          src="https://app.frontapp.com"
          className="w-full h-full border-0"
          title="Front Email Client"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
          loading="lazy"
        />
      </div>
    </div>
  );
}