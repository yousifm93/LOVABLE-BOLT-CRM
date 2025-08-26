export default function Email() {
  return (
    <div className="pl-4 pr-0 pt-2 pb-0 space-y-2">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Email</h1>
        <p className="text-xs italic text-muted-foreground/70">Front.com email client integration</p>
      </div>
      
      <div className="w-full h-[calc(100vh-200px)] border border-border rounded-lg overflow-hidden bg-card">
        <iframe
          src="https://app.frontapp.com"
          width="1000"
          height="800"
          className="w-full h-full border-0"
          title="Front Email Client"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
          loading="lazy"
        />
      </div>
    </div>
  );
}