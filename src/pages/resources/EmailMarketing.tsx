import FridayNewsletterBuilder from "@/components/admin/FridayNewsletterBuilder";

export default function EmailMarketing() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">Email Marketing Hub</h1>
        <p className="text-muted-foreground">Create and manage email newsletters with customizable sections</p>
      </div>
      
      <FridayNewsletterBuilder />
    </div>
  );
}
